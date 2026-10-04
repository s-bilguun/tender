import { supabase, supabaseAdmin } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { TenderStructuredData } from './llm-extractor';
import fs from 'fs';
import path from 'path';

export interface PastWinnerInfo {
  supplierName: string;
  registerNumber?: string;
  winningAmount: number;
  discountPercent: number;
  commentText?: string;
  noticeDate?: string;
}

export interface SimilarTenderWithWinner {
  invitationId: string | number;
  tenderCode: string;
  tenderName: string;
  budgetEntityName: string;
  totalBudget: number;
  publishDate: string;
  docStatusName: string;
  sector?: string;
  matchScore: number;
  matchReason: string;
  winner?: PastWinnerInfo;
  biddersCount?: number;
}

export interface MarketIntelligenceSummary {
  topPastWinners: Array<{ name: string; winCount: number; totalWonAmount: number }>;
  avgDiscountPercent: number;
  historicalTendersCount: number;
  avgBiddersCount: number;
  estimatedCompetitionLevel: 'low' | 'medium' | 'high';
  pricingRecommendation: string;
}

const STOP_WORDS = new Set([
  'төрөл', 'бүрийн', 'бүх', 'нийт', 'тусгай', 'зориулалтын', 'хэрэгцээний',
  'шаардлагатай', 'жилийн', 'оны', 'дахь', 'дэх', 'багц', 'арга', 'хэмжээ',
  'худалдан', 'авах', 'нийлүүлэх', 'сонгон', 'шалгаруулалт', 'төсөл', 'ажил',
  'үйлчилгээ', 'бараа', 'гэрээ', 'тендер', 'болон', 'газар', 'хэлтэс', 'төв'
]);

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

// In-memory bundle cache for fast lookup of bidders & winners
let cachedBundles: Record<string, any> | null = null;

function getCachedLiveBundles(): Record<string, any> {
  if (cachedBundles) return cachedBundles;
  try {
    const bundlePath = path.join(process.cwd(), 'lib', 'live-bundles.json');
    if (fs.existsSync(bundlePath)) {
      const content = fs.readFileSync(bundlePath, 'utf8');
      cachedBundles = JSON.parse(content);
      return cachedBundles || {};
    }
  } catch (e) {
    console.warn('Could not read live-bundles.json:', e);
  }
  return {};
}

/**
 * Тухайн тендерийн ялагчийн мэдээллийг liveBundle-ээс шүүж авах
 */
function extractWinnerFromBundle(bundle: any, budget: number): { winner?: PastWinnerInfo; biddersCount: number } {
  if (!bundle || !Array.isArray(bundle.bidders)) {
    return { biddersCount: 0 };
  }

  const bidders = bundle.bidders;
  const biddersCount = bidders.length;

  const winnerBidder = bidders.find(
    (b: any) =>
      b.wfmStatusCode === 'DISTINGUISHED_STATUS' ||
      b.wfmStatusName === 'Шалгарсан' ||
      (b.wfmStatusName || '').includes('шалгарс') ||
      (b.commentText || '').includes('шалгарсан')
  );

  if (winnerBidder) {
    const price = Number(winnerBidder.discountedAmount || winnerBidder.openedBidderPrice) || 0;
    let discountPercent = 0;
    if (budget > 0 && price > 0 && price <= budget) {
      discountPercent = Math.round(((budget - price) / budget) * 1000) / 10;
    }

    return {
      winner: {
        supplierName: winnerBidder.supplierName || 'Шалгарсан нийлүүлэгч',
        registerNumber: winnerBidder.registerNumber,
        winningAmount: price,
        discountPercent,
        commentText: winnerBidder.commentText,
        noticeDate: winnerBidder.noticeDateString,
      },
      biddersCount,
    };
  }

  return { biddersCount };
}

/**
 * Шинээр орж ирсэн PDF-ийн өгөгдлөөр төстэй өмнөх тендерүүд болон ялагчдыг олох
 */
export async function findSimilarTendersAndWinners(
  extracted: TenderStructuredData
): Promise<{
  similarTenders: SimilarTenderWithWinner[];
  marketIntelligence: MarketIntelligenceSummary;
}> {
  const title = extracted.project_title || (extracted as any).project_title_mn || '';
  const keywords = extractKeywords(title);
  const buyerKeywords = extractKeywords(extracted.buyer_name);
  const bundles = getCachedLiveBundles();

  let candidates: any[] = [];
  const seenIds = new Set<string>();

  // 1. Supabase / Postgres хайлт
  try {
    const client = supabaseAdmin || supabase;
    if (keywords.length > 0) {
      const orClause = keywords.slice(0, 4).map((k) => `tender_name.ilike.%${k}%`).join(',');
      const { data } = await client
        .from('tenders')
        .select('*')
        .or(orClause)
        .limit(20);

      if (data && data.length > 0) {
        data.forEach((row) => {
          candidates.push(row);
          seenIds.add(String(row.invitation_id || row.invitationId));
        });
      }
    }
  } catch (e) {
    // Supabase холбогдоогүй үед local fallback ажиллана
  }

  // 2. Local tenderStore fallback хайлт
  try {
    const localTenders = tenderStore.getAllTenders();
    for (const item of localTenders) {
      const id = String(item.invitationId);
      if (seenIds.has(id)) continue;

      const title = (item.tenderName || '').toLowerCase();
      const entity = (item.budgetEntityName || '').toLowerCase();

      let isMatch = false;
      for (const kw of keywords) {
        if (title.includes(kw)) {
          isMatch = true;
          break;
        }
      }
      if (!isMatch && buyerKeywords.length > 0) {
        for (const bkw of buyerKeywords) {
          if (entity.includes(bkw)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        candidates.push(item);
        seenIds.add(id);
        if (candidates.length >= 25) break;
      }
    }
  } catch (e) {
    console.warn('Local tender store lookup error:', e);
  }

  // 3. Оноо өгч эрэмбэлэх & Ялагчийг холбох
  const scoredItems: SimilarTenderWithWinner[] = [];

  for (const item of candidates) {
    const id = String(item.invitation_id || item.invitationId);
    const title = item.tender_name || item.tenderName || '';
    const titleLower = title.toLowerCase();
    const entity = item.budget_entity_name || item.budgetEntityName || '';
    const budget = Number(item.total_budget || item.totalBudget) || 0;
    const publishDate = item.publish_date || item.publishDate || '';
    const statusName = item.doc_status_name || item.docStatusName || 'Тендер зарлагдсан';
    const tenderCode = item.tender_code || item.tenderCode || item.invitation_number || id;

    let score = 0;
    const matchedWords: string[] = [];

    // Түлхүүр үгийн тааралт
    for (const kw of keywords) {
      if (titleLower.includes(kw)) {
        score += 25;
        matchedWords.push(kw);
      }
    }

    // Захиалагчийн тааралт
    if (extracted.buyer_name && entity && entity.toLowerCase().includes(extracted.buyer_name.toLowerCase().slice(0, 6))) {
      score += 35;
      matchedWords.push('Ижил захиалагч');
    }

    // Төсвийн ойролцоо байдал
    if (extracted.estimated_budget_mnt > 0 && budget > 0) {
      const ratio = budget / extracted.estimated_budget_mnt;
      if (ratio >= 0.5 && ratio <= 2.0) {
        score += 15;
      }
    }

    // LiveBundle-ээс ялагч & оролцогчийн мэдээлэл авах
    const bundle = bundles[id] || (item.raw_data?.liveBundle);
    const { winner, biddersCount } = extractWinnerFromBundle(bundle, budget);

    if (winner) {
      score += 10; // Ялагч тодорхой түүхэн тендерүүдийг дээгүүр гаргах
    }

    const matchReason = matchedWords.length > 0
      ? `Таарсан: ${matchedWords.join(', ')}`
      : 'Төстэй худалдан авалтын салбар';

    scoredItems.push({
      invitationId: id,
      tenderCode,
      tenderName: title,
      budgetEntityName: entity,
      totalBudget: budget,
      publishDate: publishDate ? publishDate.split('T')[0] : '',
      docStatusName: statusName,
      sector: extracted.sector,
      matchScore: score,
      matchReason,
      winner,
      biddersCount: biddersCount || (winner ? 3 : 1),
    });
  }

  // Хамгийн өндөр оноотой 5 тендерийг авах
  scoredItems.sort((a, b) => b.matchScore - a.matchScore);
  const topSimilar = scoredItems.slice(0, 5);

  // 4. Зах зээлийн аналитик (Market Intelligence Summary) тооцоолох
  const winnerMap = new Map<string, { winCount: number; totalWonAmount: number }>();
  let totalDiscounts = 0;
  let discountCount = 0;
  let totalBidders = 0;

  for (const item of topSimilar) {
    if (item.biddersCount) {
      totalBidders += item.biddersCount;
    }
    if (item.winner) {
      const w = item.winner;
      const existing = winnerMap.get(w.supplierName) || { winCount: 0, totalWonAmount: 0 };
      existing.winCount += 1;
      existing.totalWonAmount += w.winningAmount;
      winnerMap.set(w.supplierName, existing);

      if (w.discountPercent > 0) {
        totalDiscounts += w.discountPercent;
        discountCount += 1;
      }
    }
  }

  const topPastWinners = Array.from(winnerMap.entries())
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.winCount - a.winCount || b.totalWonAmount - a.totalWonAmount);

  const avgDiscount = discountCount > 0 ? Math.round((totalDiscounts / discountCount) * 10) / 10 : 3.5;
  const avgBidders = topSimilar.length > 0 ? Math.round((totalBidders / topSimilar.length) * 10) / 10 : 3;

  const estimatedCompetitionLevel: 'low' | 'medium' | 'high' =
    avgBidders > 4 ? 'high' : avgBidders >= 2 ? 'medium' : 'low';

  const pricingRecommendation =
    avgDiscount > 0
      ? `Түүхэн төстэй тендерүүдэд ялагчид төсөвт өртгөөс дунджаар ${avgDiscount}% хямдарч шалгарсан байна.`
      : 'Төсөвт өртөгт ойр үнийн санал өгөх нь зохимжтой.';

  return {
    similarTenders: topSimilar,
    marketIntelligence: {
      topPastWinners,
      avgDiscountPercent: avgDiscount,
      historicalTendersCount: topSimilar.length,
      avgBiddersCount: avgBidders,
      estimatedCompetitionLevel,
      pricingRecommendation,
    },
  };
}

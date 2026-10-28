import { supabase } from './supabase';
import { tenderStore } from './tender-client';
import { LIVE_BUNDLE_SCHEMA_VERSION, TenderItem } from './types';
import { fetchTenderLiveBundle, isGarbledPdfText, cleanTechnicalSectionText } from './live-fetcher';
import { analyzeChinaBidderEligibility } from './china-bidder-analyzer';

function generateBDS(_tender: any) {
  return {
    evidenceStatus: 'not_processed' as 'not_processed' | 'partial' | 'complete',
    requiredLicenses: [] as string[],
    keyPersonnel: [] as any[],
    machinery: [] as string[],
    generalRequirements: [] as string[],
    evaluationCriteria: null,
    bidSecurityAmount: null as number | null,
    bidSecurity1Pct: null as number | null,
    bidSecurity2Pct: null as number | null,
  };
}

function generateTechnicalSpecs(_tender: any) {
  return {
    evidenceStatus: 'not_processed' as 'not_processed' | 'partial' | 'complete',
    deliveryLocation: null as string | null,
    deliveryPeriodDays: null as number | null,
    warrantyMonths: null as number | null,
    standards: [] as string[],
    sampleItems: [] as any[],
    paymentTerms: null as any,
    penaltyClause: null as any,
    submissionChecklist: [] as any[],
    documents: [] as any[],
  };
}
export function generateResults(tender: any) {
  const isConcluded = (tender.doc_status_name || tender.docStatusName || '').includes('Үр дүн') ||
    (tender.doc_status_name || tender.docStatusName || '').includes('Дууссан');

  const invitationId = tender.invitation_id || tender.invitationId;
  const officialDetailUrl = `https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`;
  const officialSupplierUrl = `https://user.tender.gov.mn/mn/supplier/available/${invitationId}/detail`;

  if (!isConcluded) {
    return {
      status: 'ACTIVE' as const,
      isConcluded: false,
      message: 'Тендер шалгаруулалт одоогоор нээлттэй эсвэл үнэлгээний шатандаа явагдаж байна. Нээлт хийгдэж үнэлгээний хороо шийдвэрээ гаргасны дараа албан ёсны үр дүн нийтлэгдэнэ.',
      officialUrl: officialDetailUrl,
      supplierUrl: officialSupplierUrl
    };
  }

  return {
    status: 'CONCLUDED' as const,
    isConcluded: true,
    message: 'Энэхүү тендер шалгаруулалт дуусаж, үр дүн албан ёсоор гарсан байна. Үнэлгээний хорооны албан ёсны шийдвэр, шалгарсан болон татгалзсан оролцогчдын протокол tender.gov.mn дээр баталгаажсан байна.',
    officialUrl: officialDetailUrl,
    supplierUrl: officialSupplierUrl,
    note: 'Үнэлгээний хорооны албан ёсны протокол болон шалгарсан оролцогчийн дэлгэрэнгүйг tender.gov.mn дээрх албан ёсны хуудсаас шалгана уу.'
  };
}

const MONGOLIAN_PROCUREMENT_STOP_WORDS = new Set([
  'төрөл', 'бүрийн', 'бүх', 'нийт', 'тусгай', 'зориулалтын', 'зориулалттай', 'хэрэгцээний',
  'шаардлагатай', 'хэрэгцээт', 'жилийн', 'оны', 'дахь', 'дэх', 'багц', 'арга', 'хэмжээ',
  'худалдан', 'авах', 'нийлүүлэх', 'хийх', 'гүйцэтгэх', 'сонгон', 'шалгаруулалт', 'шалгаруулах',
  'төсөл', 'ажил', 'үйлчилгээ', 'бараа', 'бүтээгдэхүүн', 'гэрээ', 'тендер', 'болон', 'хамт',
  'тухай', 'газар', 'хэлтэс', 'алба', 'төв', 'аймаг', 'сум', 'дүүрэг', 'хот', 'улсын',
  'байгууллага', 'хувь', 'нийлүүлсэн', 'нийгэмлэг', 'үйл', 'ажиллагаа', 'ажлын', 'даалгавар',
  'албан', 'хэрэгцээнд', 'шаардагдах', 'хүрээнд', 'зориулсан'
]);

function extractSubstantiveKeywords(title: string): string[] {
  if (!title) return [];
  const rawWords = title
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(w));

  const stems: string[] = [];
  for (const w of rawWords) {
    let stem = w;
    if (stem.endsWith('ийн') || stem.endsWith('ний')) stem = stem.slice(0, -3);
    else if (stem.endsWith('ын') || stem.endsWith('ны') || stem.endsWith('аар') || stem.endsWith('ээр') || stem.endsWith('оор') || stem.endsWith('өөр')) stem = stem.slice(0, -2);
    else if (stem.endsWith('ууд') || stem.endsWith('үүд') || stem.endsWith('тай') || stem.endsWith('тэй') || stem.endsWith('той')) stem = stem.slice(0, -3);

    if (stem === 'автомаши') stem = 'автомашин';
    if (stem === 'суудл') stem = 'суудал';
    if (stem === 'эмнэлг') stem = 'эмнэлэг';
    if (stem === 'хэрэгсл') stem = 'хэрэгсэл';

    if (stem.length >= 3 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(stem)) {
      stems.push(stem);
    }
    if (w.length >= 3 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(w)) {
      stems.push(w);
    }
  }
  return Array.from(new Set(stems));
}

function isBoilerplateItem(item: any): boolean {
  if (!item || !item.name) return true;
  const n = String(item.name).toLowerCase().trim();
  if (n.length < 3) return true;
  return /худалдан авах ажиллагааны|сангийн сайдын|оролцогчдод өгөх|жишиг баримт|хууль тогтоомж|төрийн болон орон|тшз-|гэрээний ерөнхий|тогтоомж\s*\d/i.test(n);
}

async function findSimilarTenders(tenderItem: any, currentId: string | number) {
  const keywords = extractSubstantiveKeywords(tenderItem.tenderName);
  let candidates: any[] = [];
  const numericId = tenderItem.invitationId && /^\d+$/.test(String(tenderItem.invitationId))
    ? String(tenderItem.invitationId)
    : (/^\d+$/.test(String(currentId)) ? String(currentId) : null);

  // Step 1: Query Supabase with substantive keywords
  if (keywords.length > 0) {
    const orClause = keywords.slice(0, 5).map(k => `tender_name.ilike.%${k}%`).join(',');
    try {
      let simQuery = supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_code, tender_type_name, doc_status_name, publish_date');

      if (numericId) {
        simQuery = simQuery.neq('invitation_id', numericId);
      }

      const { data } = await simQuery.or(orClause).limit(30);
      if (data && data.length > 0) {
        candidates = data;
      }
    } catch (e) {
      console.warn('Keyword search in Supabase failed:', e);
    }
  }

  // Step 2: Fallback to local tenderStore if candidates are empty or low
  if (candidates.length < 5) {
    try {
      const allStoreTenders = tenderStore.getAllTenders();
      const existingIds = new Set([String(currentId), String(tenderItem.invitationId), ...candidates.map(c => String(c.invitation_id || c.invitationId))]);
      
      for (const item of allStoreTenders) {
        if (existingIds.has(String(item.invitationId))) continue;
        const itemTitle = (item.tenderName || '').toLowerCase();
        let matches = false;
        for (const kw of keywords) {
          if (itemTitle.includes(kw)) {
            matches = true;
            break;
          }
        }
        if (matches) {
          candidates.push({
            invitation_id: item.invitationId,
            tender_code: item.tenderCode,
            tender_name: item.tenderName,
            total_budget: item.totalBudget,
            budget_entity_name: item.budgetEntityName,
            tender_type_code: item.tenderTypeCode,
            tender_type_name: item.tenderTypeName,
            doc_status_name: item.docStatusName,
            publish_date: item.publishDate
          });
          existingIds.add(String(item.invitationId));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Step 3: Augment by same category / tender_type_code if still < 5
  if (candidates.length < 5) {
    try {
      const existingIds = new Set([String(currentId), String(tenderItem.invitationId), ...candidates.map(c => String(c.invitation_id || c.invitationId))]);
      let catQuery = supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_code, tender_type_name, doc_status_name, publish_date')
        .eq('tender_type_code', tenderItem.tenderTypeCode || 'PRODUCT');

      if (numericId) {
        catQuery = catQuery.neq('invitation_id', numericId);
      }

      const { data: fallbackData } = await catQuery
        .order('publish_date', { ascending: false })
        .limit(10);

      if (fallbackData) {
        for (const item of fallbackData) {
          if (!existingIds.has(String(item.invitation_id))) {
            candidates.push(item);
            existingIds.add(String(item.invitation_id));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Step 4: Intelligent Scoring & Ranking
  const scored = candidates.map(item => {
    const itemTitle = (item.tender_name || item.tenderName || '').toLowerCase();
    let score = 0;
    const matchedKws: string[] = [];

    for (const kw of keywords) {
      if (itemTitle.includes(kw)) {
        score += 20;
        matchedKws.push(kw);
      }
    }

    if (item.tender_type_code === tenderItem.tenderTypeCode) {
      score += 10;
    }

    const itemBudget = Number(item.total_budget || item.totalBudget) || 0;
    const currentBudget = Number(tenderItem.totalBudget) || 0;
    if (currentBudget > 0 && itemBudget > 0) {
      const ratio = itemBudget / currentBudget;
      if (ratio >= 0.2 && ratio <= 5.0) {
        score += 5;
      }
    }

    const matchReason = matchedKws.length > 0
      ? `Түлхүүр үг: ${matchedKws.slice(0, 3).join(', ')}`
      : 'Ижил төрлийн худалдан авалт';

    return {
      invitationId: item.invitation_id || item.invitationId,
      tenderCode: item.tender_code || item.tenderCode || '',
      tenderName: item.tender_name || item.tenderName || '',
      totalBudget: itemBudget,
      budgetEntityName: item.budget_entity_name || item.budgetEntityName || '',
      tenderTypeCode: item.tender_type_code || item.tenderTypeCode || '',
      tenderTypeName: item.tender_type_name || item.tenderTypeName || '',
      docStatusName: item.doc_status_name || item.docStatusName || '',
      publishDate: item.publish_date || item.publishDate || '',
      matchReason,
      matchedKeywords: matchedKws,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

export interface BudgetEstimate {
  median: number;
  low: number;
  high: number;
  count: number;
  basis: 'same_buyer' | 'similar_titles';
  examples: { invitationId: string; tenderName: string; totalBudget: number; publishDate: string | null }[];
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

/**
 * For tenders whose budget we don't have (announcement-only), estimate a range
 * from past tenders with budgets: same buyer + overlapping title words first,
 * otherwise tenders with similar titles. Returns null when evidence is thin.
 */
async function estimateBudgetFromHistory(title: string, buyer: string | null, excludeId: string): Promise<BudgetEstimate | null> {
  const GENERIC = /^(үйлчилгээ|үзүүлэх|үзүүл|худалдан|авах|нийлүүлэх|нийлүүл|ажил|хийх|материал|бараа|төхөөрөмж|тоног|хэрэгсэл|хэрэгцээт|шаардлагатай|зориулалт|зориулалтт|зориулалттай|байгууллага|төв|газар|сум|аймаг|дүүрэг|хот|оны|онд|2025|2026)$/;
  // Distinct roots only: drop a keyword when a shorter one is its prefix (stem + full form).
  const raw = Array.from(new Set(extractSubstantiveKeywords(title).filter((k) => !GENERIC.test(k))));
  const keywords = raw.filter((k) => !raw.some((o) => o !== k && o.length < k.length && k.startsWith(o))).slice(0, 5);
  if (keywords.length === 0) return null;
  const matchCount = (name: string) => {
    const n = (name || '').toLowerCase();
    return keywords.filter((k) => n.includes(k)).length;
  };
  const titleFilter = keywords.map((k) => `tender_name.ilike.%${k}%`).join(',');
  const columns = 'invitation_id, tender_name, total_budget, publish_date';

  const summarize = (rows: any[], basis: BudgetEstimate['basis']): BudgetEstimate | null => {
    const needed = Math.min(basis === 'same_buyer' ? 2 : 3, keywords.length);
    const usable = rows.filter((r) => Number(r.total_budget) > 0 && String(r.invitation_id) !== excludeId && matchCount(r.tender_name) >= needed);
    if (usable.length < (basis === 'same_buyer' ? 2 : 3)) return null;
    const budgets = usable.map((r) => Number(r.total_budget)).sort((a, b) => a - b);
    return {
      median: quantile(budgets, 0.5),
      low: quantile(budgets, 0.25),
      high: quantile(budgets, 0.75),
      count: usable.length,
      basis,
      examples: usable.slice(0, 3).map((r) => ({
        invitationId: String(r.invitation_id),
        tenderName: r.tender_name,
        totalBudget: Number(r.total_budget),
        publishDate: r.publish_date || null,
      })),
    };
  };

  try {
    if (buyer) {
      const { data } = await supabase
        .from('tenders')
        .select(columns)
        .eq('budget_entity_name', buyer)
        .gt('total_budget', 0)
        .or(titleFilter)
        .order('publish_date', { ascending: false })
        .limit(40);
      const byBuyer = summarize(data || [], 'same_buyer');
      if (byBuyer) return byBuyer;
    }
    const { data } = await supabase
      .from('tenders')
      .select(columns)
      .gt('total_budget', 0)
      .or(titleFilter)
      .order('publish_date', { ascending: false })
      .limit(80);
    return summarize(data || [], 'similar_titles');
  } catch (e) {
    console.warn('Budget estimate failed:', e);
    return null;
  }
}

export async function getTenderDetailData(id: string | number, options: { useStoredLiveBundle?: boolean } = {}) {
  if (!id) return null;

  const rawIdStr = String(id).trim();
  let decodedId = rawIdStr;
  try {
    decodedId = decodeURIComponent(rawIdStr).trim();
  } catch {}

  const isNumeric = /^\d+$/.test(decodedId);

  // 1. Fetch main tender
  let tenderData: any = null;
  try {
    if (isNumeric) {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('invitation_id', decodedId)
        .maybeSingle();
      if (!error && data) {
        tenderData = data;
      }
    }

    if (!tenderData) {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .or(`tender_code.eq."${decodedId}",invitation_number.eq."${decodedId}"`)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        tenderData = data;
      }
    }

    if (!tenderData && decodedId !== rawIdStr) {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .or(`tender_code.eq."${rawIdStr}",invitation_number.eq."${rawIdStr}"`)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        tenderData = data;
      }
    }
  } catch (e) {
    console.warn('Supabase fetch error, fallback to tenderStore:', e);
  }

  if (!tenderData) {
    tenderData = tenderStore.getTenderById(decodedId) || tenderStore.getTenderById(rawIdStr);
  }

  if (!tenderData) {
    return null;
  }

  const tenderItem: TenderItem & { rawData?: any; registrationNumber?: string; yearBudget?: number } = {
    invitationId: tenderData.invitation_id || tenderData.invitationId,
    invitationNumber: tenderData.invitation_number || tenderData.invitationNumber || '',
    tenderCode: tenderData.tender_code || tenderData.tenderCode || '',
    tenderName: tenderData.tender_name || tenderData.tenderName || '',
    budgetEntityName: tenderData.budget_entity_name || tenderData.budgetEntityName || '',
    clientCode: tenderData.client_code || tenderData.clientCode || '',
    positionName: tenderData.position_name || tenderData.positionName || '',
    totalBudget: Number(tenderData.total_budget || tenderData.totalBudget) || 0,
    tenderTypeCode: tenderData.tender_type_code || tenderData.tenderTypeCode || 'OTHER',
    tenderTypeName: tenderData.tender_type_name || tenderData.tenderTypeName || 'Бусад',
    ruleName: tenderData.rule_name || tenderData.ruleName || '',
    fundName: tenderData.fund_name || tenderData.fundName || '',
    publishDate: tenderData.publish_date || tenderData.publishDate || '',
    openDate: tenderData.open_date || tenderData.openDate || '',
    receiveDate: tenderData.receive_date || tenderData.receiveDate || '',
    docStatusCode: tenderData.doc_status_code || tenderData.docStatusCode || '',
    docStatusName: tenderData.doc_status_name || tenderData.docStatusName || '',
    isPackage: 0,
    rawData: tenderData.raw_data || tenderData.rawData,
    raw_data: tenderData.raw_data || tenderData.rawData,
    full_scope_of_work: tenderData.full_scope_of_work || tenderData.raw_data?.full_scope_of_work || tenderData.raw_data?.liveBundle?.fullScopeOfWork || tenderData.raw_data?.liveBundle?.structuredSpecs?.rawSpecText,
    eligibility_requirements: tenderData.eligibility_requirements || tenderData.raw_data?.eligibility_requirements || tenderData.raw_data?.liveBundle?.structuredSpecs?.keyRequirements,
    registrationNumber: tenderData.registration_number || (tenderData.raw_data?.registrationNumber) || '',
    yearBudget: Number(tenderData.raw_data?.yearBudget || tenderData.total_budget || tenderData.totalBudget) || 0
  };

  const numericInvitationId = tenderItem.invitationId && /^\d+$/.test(String(tenderItem.invitationId))
    ? String(tenderItem.invitationId)
    : null;

  // 2. Fetch related tenders from same entity
  let relatedByEntity: any[] = [];
  if (tenderItem.budgetEntityName) {
    try {
      let relQuery = supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, tender_type_code, tender_type_name, doc_status_name, publish_date')
        .eq('budget_entity_name', tenderItem.budgetEntityName);

      if (numericInvitationId) {
        relQuery = relQuery.neq('invitation_id', numericInvitationId);
      }

      const { data: relData } = await relQuery
        .order('publish_date', { ascending: false })
        .limit(5);

      if (relData) {
        relatedByEntity = relData
          .filter(r => String(r.invitation_id) !== String(tenderItem.invitationId))
          .map(r => ({
            invitationId: r.invitation_id,
            tenderCode: r.tender_code,
            tenderName: r.tender_name,
            totalBudget: Number(r.total_budget) || 0,
            tenderTypeCode: r.tender_type_code,
            tenderTypeName: r.tender_type_name,
            docStatusName: r.doc_status_name,
            publishDate: r.publish_date
          }));
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fetch smart similar tenders in category / substantive keywords
  const similarTenders = await findSimilarTenders(tenderItem, id);

  // 4. Fetch live data from tender.gov.mn or re-parse stored Supabase PDF if schemaVersion < LIVE_BUNDLE_SCHEMA_VERSION
  let liveBundle: any = null;
  const rawData = tenderData.raw_data || tenderData.rawData;
  const hasStoredBundle = Boolean(
    rawData?.liveBundle &&
    rawData.liveBundle.schemaVersion === LIVE_BUNDLE_SCHEMA_VERSION &&
    (rawData.liveBundle.documents?.length || rawData.liveBundle.structuredSpecs || rawData.liveBundle.bidders?.length)
  );

  if (options.useStoredLiveBundle && rawData?.liveBundle) {
    liveBundle = rawData.liveBundle;
  } else if (hasStoredBundle) {
    liveBundle = rawData.liveBundle;
  } else if (rawData?.source === 'telegram') {
    // Announcement-only rows: tender.gov.mn blocks automated detail fetches.
    liveBundle = null;
  } else {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Live bundle fetch timeout (5.0s exceeded)')), 5000)
      );
      liveBundle = await Promise.race([
        fetchTenderLiveBundle(
          tenderItem.invitationId || id,
          rawData?.tenderId,
          Boolean(rawData?.pdfUrl && rawData?.liveBundle?.schemaVersion !== LIVE_BUNDLE_SCHEMA_VERSION)
        ),
        timeoutPromise
      ]);
    } catch (liveErr) {
      console.warn('Live bundle fetch failed or timed out:', liveErr);
      liveBundle = rawData?.liveBundle || null;
    }
  }

  // Fallback to stored liveBundle if live fetch returned nothing or failed
  if (!liveBundle || !liveBundle.documents || liveBundle.documents.length === 0) {
    if (rawData?.liveBundle?.documents && rawData.liveBundle.documents.length > 0) {
      liveBundle = rawData.liveBundle;
    }
  }

  // 5. Generate structured BDS & Specs & Results
  const bds = generateBDS(tenderData);
  const technicalSpecs = generateTechnicalSpecs(tenderData);
  const results = generateResults(tenderData);

  // 6. Enrich with real live data if available
  if (liveBundle) {
    // Official attached files
    if (liveBundle.documents && liveBundle.documents.length > 0) {
      technicalSpecs.documents = liveBundle.documents.map((d: any) => {
        let extractedSummary: string | undefined = undefined;
        const documentIdentifier = d.id || d.fileId;
        const idMarker = `--- DOCUMENT ${documentIdentifier}:`;
        const legacyMarker = `--- БАРИМТ БИЧИГ: ${d.fileName} ---`;
        const docMarker = liveBundle.pdfText?.includes(idMarker) ? idMarker : legacyMarker;
        if (liveBundle.pdfText && liveBundle.pdfText.includes(docMarker)) {
          const start = liveBundle.pdfText.indexOf(docMarker) + docMarker.length;
          const nextIdMarker = liveBundle.pdfText.indexOf('--- DOCUMENT ', start);
          const nextLegacyMarker = liveBundle.pdfText.indexOf('--- БАРИМТ БИЧИГ:', start);
          const candidates = [nextIdMarker, nextLegacyMarker].filter((marker) => marker !== -1);
          const nextMarker = candidates.length ? Math.min(...candidates) : -1;
          const rawSection = nextMarker !== -1
            ? liveBundle.pdfText.substring(start, nextMarker).trim()
            : liveBundle.pdfText.substring(start).trim();
          if (rawSection.length > 20) {
            extractedSummary = rawSection.substring(0, 40000);
          }
        }

        const storedDoc = rawData?.liveBundle?.documents?.find((sd: any) => 
          String(sd.fileId) === String(d.fileId) || sd.fileName === d.fileName
        );
        const resolvedUrl = storedDoc?.downloadUrl || d.downloadUrl;
        const isStored = Boolean(d.isStored || storedDoc?.isStored || resolvedUrl?.includes('supabase.co'));

        return {
          id: String(documentIdentifier || d.fileName),
          fileId: d.fileId,
          name: d.fileName,
          fileExtention: d.fileExtention || 'pdf',
          category: d.category || (d.isPrimary ? 'Тендер шалгаруулалтын баримт бичиг (ТШББ)' : 'Хавсралт баримт бичиг'),
          type: `${(d.fileExtention || 'pdf').toUpperCase()} Баримт`,
          date: d.createdDate ? d.createdDate.substring(0, 16) : (tenderItem.publishDate || '').substring(0, 10),
          url: resolvedUrl,
          downloadUrl: resolvedUrl,
          isStored,
          officialNotice: isStored
            ? 'Supabase хадгалагдсан ТШЗ баримт'
            : d.source === 'manual_upload'
            ? 'Гараар оруулсан PDF; задласан текстийг эх файлтай тулгана уу.'
            : 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
          source: isStored ? 'stored_cdn' : (d.source || 'official'),
          isScannedOcr: !!d.isScannedOcr,
          ocrModel: d.ocrModel,
          extractionStatus: d.extractionStatus || (extractedSummary ? 'text_extracted' : 'not_extracted'),
          extractedPageCount: d.extractedPageCount || storedDoc?.pageCount,
          totalPageCount: d.totalPageCount || storedDoc?.pageCount,
          ocrSampleCount: d.ocrSampleCount,
          extractedSummary: extractedSummary || storedDoc?.extractedSummary || rawData?.liveBundle?.fullScopeOfWork
        };
      });
      (technicalSpecs as any).isScannedOcr = !!liveBundle.isScannedOcr;
    }
  }

  // Extracted PDF text & structured criteria from liveBundle or raw_data
  const specsSource = liveBundle?.structuredSpecs || rawData?.structuredSpecs || rawData?.liveBundle?.structuredSpecs;
  if (specsSource) {
      // Real BDS requirements from official PDF
      if (specsSource.licenses && specsSource.licenses.length > 0) {
        bds.requiredLicenses = specsSource.licenses;
      }
      if (specsSource.personnel && specsSource.personnel.length > 0) {
        bds.keyPersonnel = specsSource.personnel;
      }
      if (specsSource.machinery && specsSource.machinery.length > 0) {
        bds.machinery = specsSource.machinery;
      }
      if (specsSource.bidSecurityReq) {
        (bds as any).bidSecurityReq = specsSource.bidSecurityReq;
        if (specsSource.bidSecurityReq.includes('Шаардахгүй')) {
          bds.bidSecurityAmount = 0;
          bds.bidSecurity1Pct = 0;
          bds.bidSecurity2Pct = 0;
        } else {
          const amtNum = Number(String(specsSource.bidSecurityReq).replace(/[^\d]/g, ''));
          if (amtNum > 0) bds.bidSecurityAmount = amtNum;
        }
      }
      if (typeof specsSource.foreignEligible === 'boolean') {
        (bds as any).foreignEligible = specsSource.foreignEligible;
      }
      if (specsSource.turnoverReq) {
        (bds as any).turnoverReq = specsSource.turnoverReq;
      }
      if (specsSource.similarExpReq) {
        (bds as any).similarExpReq = specsSource.similarExpReq;
      }
      if (specsSource.liquidAssetsReq) {
        (bds as any).liquidAssetsReq = specsSource.liquidAssetsReq;
      }

      const rawCandidateText = specsSource.fullScopeOfWork || specsSource.rawSpecText || '';
      const cleanedSpecText = isGarbledPdfText(rawCandidateText) ? '' : cleanTechnicalSectionText(rawCandidateText);

      (technicalSpecs as any).extractedSpecs = specsSource;
      (technicalSpecs as any).realSpecsText = cleanedSpecText || undefined;
      (technicalSpecs as any).extractedQualifications = specsSource.keyRequirements || specsSource.qualifications;
      (technicalSpecs as any).pdfPageCount = liveBundle?.pdfPageCount || rawData?.pdfPageCount;
      (technicalSpecs as any).rawPdfText = liveBundle?.pdfText && !isGarbledPdfText(liveBundle.pdfText)
        ? liveBundle.pdfText.substring(0, 30000)
        : undefined;

      if (cleanedSpecText) {
        tenderItem.full_scope_of_work = cleanedSpecText;
      }
      if (Array.isArray(specsSource.keyRequirements) && specsSource.keyRequirements.length > 0) {
        tenderItem.eligibility_requirements = specsSource.keyRequirements;
      }

      // Real Special Conditions of Contract (ГТН / SCC)
      if (specsSource.specialConditions && specsSource.specialConditions.length > 0) {
        const validScc = specsSource.specialConditions.filter((c: any) => {
          if (!c.content) return false;
          const str = c.content.trim();
          if (str.length === 0 || str.endsWith(':')) return false;
          const cleanedText = str.replace(/[\[\]\"\'„“”\(\)]/g, '').trim();
          if (/^(?:он[\,\s]*сар[\,\s]*өдөр|мөнгөн\s*дүн\s*бич|ажлын\s*хоног\s*бичих|сонгох|бичих|тогтоож\s*бичих|нэрлэн\s*бичих|хүртэл\s*хувиар\s*тогтоож\s*бичих|хоног\s*тутамд\s*0\.5\s*хүртэл\s*хувиар\s*тогтоож\s*бичих)$/i.test(cleanedText)) return false;
          return true;
        });

        if (validScc.length > 0) {
          (technicalSpecs as any).specialConditions = validScc;
          (bds as any).specialConditions = validScc;

          const locClause = validScc.find((c: any) => c.clause.includes('2.5') || c.title.includes('газар') || c.content.includes('газар'));
          if (locClause) {
            const cleanedLoc = locClause.content.replace(/^Бараа нийлүүлэх газар\s*:\s*/i, '').trim();
            if (cleanedLoc) technicalSpecs.deliveryLocation = cleanedLoc;
          }

          const timeClause = validScc.find((c: any) =>
            (c.clause.includes('2.6') || c.title.toLowerCase().includes('нийлүүлэх хугацаа') || c.content.toLowerCase().includes('нийлүүлэх хугацаа') || c.title.toLowerCase().includes('ажил эхлэх')) &&
            !c.title.toLowerCase().includes('баталгаат') &&
            !c.content.toLowerCase().includes('баталгаат хугацаа')
          );
          if (timeClause) {
            const cleanedTime = timeClause.content.replace(/^Бараа нийлүүлэх хугацаа\s*:\s*/i, '').trim();
            if (cleanedTime) (technicalSpecs as any).deliveryPeriodText = cleanedTime;
          }

          const incoClause = validScc.find((c: any) => c.clause.includes('2.10') || c.title.includes('хүлээлгэн өгөх'));
          if (incoClause) {
            (technicalSpecs as any).deliveryConditionText = incoClause.content;
          }

          const adjClause = validScc.find((c: any) => c.clause.includes('3.8') || c.title.includes('Үнийн тохируулга'));
          if (adjClause) {
            (technicalSpecs as any).priceAdjustmentText = adjClause.content;
          }

          const payClause = validScc.find((c: any) => c.clause.includes('3.9') || c.title.includes('Төлбөр'));
          if (payClause) {
            const cleanedPay = payClause.content.replace(/^Төлбөр төлөх хугацаа\s*:\s*/i, '').trim();
            if (cleanedPay) {
              technicalSpecs.paymentTerms = {
                ...(technicalSpecs.paymentTerms || {}),
                progressPayment: cleanedPay,
              };
            }
          }

          const warClause = validScc.find((c: any) => c.clause.includes('4.10') || c.title.includes('Баталгаат'));
          if (warClause) {
            (technicalSpecs as any).warrantyText = warClause.content;
          }

          const penClause = validScc.find((c: any) => c.clause.includes('4.17') || c.title.includes('алданги'));
          if (penClause) {
            (technicalSpecs as any).penaltyText = penClause.content;
            const rateMatch = penClause.content.match(/(\d+(?:\.\d+)?)\s*хүртэл\s*хувь|(\d+(?:\.\d+)?)\s*хувь/);
            if (rateMatch) {
              technicalSpecs.penaltyClause = {
                ...(technicalSpecs.penaltyClause || {}),
                dailyRate: `${rateMatch[1] || rateMatch[2]}% / хоног тутамд`,
              };
            }
          }

          const advClause = validScc.find((c: any) => c.clause.includes('5.4') || c.title.includes('Урьдчилгаа'));
          if (advClause) {
            (technicalSpecs as any).advancePaymentText = advClause.content;
            const advMatch = advClause.content.match(/(\d+(?:\.\d+)?)\s*хувь/);
            if (advMatch) {
              technicalSpecs.paymentTerms = {
                ...(technicalSpecs.paymentTerms || {}),
                advancePaymentPct: parseFloat(advMatch[1])
              };
            }
          }
        }
      }

      // Direct mapping from structuredSpecs if not already mapped from SCC
      if (specsSource.deliveryPeriod && !(technicalSpecs as any).deliveryPeriodText) {
        (technicalSpecs as any).deliveryPeriodText = specsSource.deliveryPeriod;
      }
      if (!(technicalSpecs as any).deliveryPeriodText && specsSource.deliverySchedule?.[0]?.deadline) {
        (technicalSpecs as any).deliveryPeriodText = specsSource.deliverySchedule[0].deadline;
      }
      if (specsSource.warrantyPeriod && !(technicalSpecs as any).warrantyText) {
        (technicalSpecs as any).warrantyText = specsSource.warrantyPeriod;
      }
      if (specsSource.keyRequirements && specsSource.keyRequirements.length > 0) {
        bds.generalRequirements = specsSource.keyRequirements;
        if (!(technicalSpecs as any).extractedQualifications || (technicalSpecs as any).extractedQualifications.length === 0) {
          (technicalSpecs as any).extractedQualifications = specsSource.keyRequirements;
        }
      }
      if (!technicalSpecs.deliveryLocation) {
        technicalSpecs.deliveryLocation = specsSource.deliverySchedule?.[0]?.location || tenderItem.budgetEntityName || 'Улаанбаатар хот / Захиалагчийн заасан байршил';
      }

      // Real Itemized BoQ Table: Filter out boilerplate items and prefer real goods or delivery schedule
      const rawItems = Array.isArray(specsSource.items) ? specsSource.items : [];
      const cleanItems = rawItems.filter((it: any) => !isBoilerplateItem(it));

      if (cleanItems.length > 0) {
        technicalSpecs.sampleItems = cleanItems.map((it: any) => ({
          name: it.name,
          quantity: it.quantity || it.qty || 1,
          unit: it.unit || 'ширхэг',
          spec: it.spec || it.specs || 'Техникийн тодорхойлолтын дагуу',
          isRealExtracted: true
        }));
        (technicalSpecs as any).isRealExtracted = true;
      } else if (specsSource.deliverySchedule && specsSource.deliverySchedule.length > 0) {
        const cleanSched = specsSource.deliverySchedule.filter((it: any) => !isBoilerplateItem(it));
        if (cleanSched.length > 0) {
          technicalSpecs.sampleItems = cleanSched.map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            spec: `Хүргэх газар: ${it.location} | Хугацаа: ${it.deadline}`,
            isRealExtracted: true
          }));
          (technicalSpecs as any).isRealExtracted = true;
        }
      }

      // If sampleItems is still empty after both checks, run the intelligent fallback synthesis
      if (!technicalSpecs.sampleItems || technicalSpecs.sampleItems.length === 0) {
        // Fallback intelligent BoQ item synthesis from rawSpecText or tenderName
        const specText = specsSource.rawSpecText || tenderItem.full_scope_of_work || '';
        const bulletLines = specText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.startsWith('-') || l.startsWith('•') || l.startsWith('*'));

        const specSummary = bulletLines.length > 0
          ? bulletLines.join(' | ')
          : (specText.substring(0, 300) || 'Тендерийн техникийн тодорхойлолтын дагуу');

        let cleanItemName = (tenderItem.tenderName || '')
          .replace(/худалдан\s*авах|нийлүүлэх|гүйцэтгэх|сонгон\s*шалгаруулах/gi, '')
          .replace(/^(?:Хан-Уул|Баянзүрх|Сүхбаатар|Чингэлтэй|Сонгинохайрхан|Баянгол|Налайх|Багануур|Багахангай)\s*дүүргийн\s*/gi, '')
          .replace(/^(?:Улаанбаатар|Дорноговь|Өмнөговь|Дархан-Уул|Сэлэнгэ|Орхон|Хөвсгөл|Архангай|Төв)\s*аймгийн\s*/gi, '')
          .trim();

        if (!cleanItemName) cleanItemName = tenderItem.tenderName;

        let estimatedQty = 1;
        const qtyMatch = specText.match(/(\d+)\s*(?:ширхэг|ком|ш|тоо|багц|метр|м|м2|м3|тн|тонн)/i);
        if (qtyMatch) {
          estimatedQty = parseInt(qtyMatch[1], 10);
        } else if (tenderItem.totalBudget > 200_000_000 && /компьютер|ноут/i.test(tenderItem.tenderName)) {
          estimatedQty = Math.max(1, Math.round(tenderItem.totalBudget / 3_500_000));
        }

        let detectedUnit = 'ширхэг';
        const unitMatch = specText.match(/(?:ширхэг|ш|ком|комплект|м2|м3|метр|м|тн|тонн|кг|литр|л|багц)/i);
        if (unitMatch) {
          detectedUnit = unitMatch[0].toLowerCase();
        } else if (/ажил|үйлчилгээ/i.test(tenderItem.tenderTypeName)) {
          detectedUnit = 'багц';
        }

        technicalSpecs.sampleItems = [{
          name: cleanItemName,
          quantity: estimatedQty,
          unit: detectedUnit,
          spec: specSummary,
          isRealExtracted: Boolean(specText)
        }];
        (technicalSpecs as any).isRealExtracted = Boolean(specText);
      }

      // Generate dynamic Submission Checklist if empty
      if (!technicalSpecs.submissionChecklist || technicalSpecs.submissionChecklist.length === 0) {
        const checklist = [
          {
            id: 'form-1',
            title: 'Маягт 1: Тендерийн маягт ба Үнийн санал',
            desc: 'Тендерийн нийт үнэ, нийлүүлэх хугацаа, хүчинтэй байх хугацааг (30+ хоног) баталгаажуулсан маягт',
            required: true
          },
          {
            id: 'company-cert',
            title: 'Хуулийн этгээдийн улсын бүртгэлийн гэрчилгээ',
            desc: 'Улсын бүртгэлийн ерөнхий газрын лавлагаа эсвэл гэрчилгээний хуулбар',
            required: true
          },
          {
            id: 'tax-clearance',
            title: 'Татварын цахим тодорхойлолт',
            desc: 'Татварын албаны хугацаа хэтэрсэн өр төлбөргүйг нотлох цахим лавлагаа',
            required: true
          },
          {
            id: 'financials',
            title: 'Санхүүгийн тайлан & Аудитын дүгнэлт',
            desc: (bds as any).turnoverReq || 'Сүүлийн 2 жилийн санхүүгийн баталгаажсан тайлан',
            required: true
          },
          {
            id: 'similar-exp',
            title: 'Ижил төстэй ажлын гэрээ, хүлээлцсэн акт',
            desc: (bds as any).similarExpReq || 'Сүүлийн жилүүдэд гүйцэтгэсэн ижил төстэй нийлүүлэлтийн гэрээ, акт',
            required: true
          },
          {
            id: 'tech-spec-compliance',
            title: 'Техникийн тодорхойлолт ба Үйлдвэрлэгчийн каталог',
            desc: 'Санал болгож буй барааны зураг, үзүүлэлт, гарал үүслийн гэрчилгээ',
            required: true
          }
        ];

        if (bds.requiredLicenses && bds.requiredLicenses.length > 0) {
          checklist.push({
            id: 'licenses',
            title: `Тусгай зөвшөөрөл: ${bds.requiredLicenses.join(', ')}`,
            desc: 'Холбогдох төрийн захиргааны байгууллагаас олгосон хүчин төгөлдөр тусгай зөвшөөрөл',
            required: true
          });
        }

        const isExempt = (bds as any).bidSecurityReq?.includes('Шаардахгүй') || bds.bidSecurityAmount === 0;
        if (!isExempt) {
          checklist.push({
            id: 'bid-bond',
            title: 'Тендерийн баталгаа (Банкны баталгаа / Үнэт цаас)',
            desc: `Төсвийн 1-2%-ийн банкны баталгаа (хугацаа 30+ хоног)`,
            required: true
          });
        }

        technicalSpecs.submissionChecklist = checklist;
      }

      // Real Delivery Schedule from official PDF
      if (specsSource.deliverySchedule && specsSource.deliverySchedule.length > 0) {
        (technicalSpecs as any).deliverySchedule = specsSource.deliverySchedule;
      }
    }

    if (liveBundle) {
      // Sub-tenders / Packages & Official Status
      if (liveBundle.subTenders && liveBundle.subTenders.length > 0) {
      (results as any).subTenders = liveBundle.subTenders;
      (tenderItem as any).subTenders = liveBundle.subTenders;

      const allFailed = liveBundle.subTenders.every(
        (st: any) => st.wfmStatusCode === 'TENDER_FAILED' || (st.wfmStatusName || '').includes('Амжилтгүй')
      );
      if (allFailed) {
        (results as any).status = 'FAILED';
        (results as any).isFailed = true;
        (results as any).isConcluded = true;
        results.message = 'Энэхүү тендерийн сонгон шалгаруулалт амжилтгүй болсон тул гэрээ байгуулах оролцогч шалгараагүй байна (шаардлага хангасан санал ирээгүй эсвэл үнэлгээний хорооноос татгалзсан).';
        tenderItem.docStatusName = 'Амжилтгүй болсон';
        tenderItem.docStatusCode = 'TENDER_FAILED';
      }
    }

    // Real Bidders & Winners
    if (liveBundle.bidders && liveBundle.bidders.length > 0) {
      (results as any).bidders = liveBundle.bidders;
      const winner = liveBundle.bidders.find((b: any) => b.wfmStatusCode === 'DISTINGUISHED_STATUS' || b.wfmStatusName === 'Шалгарсан');
      if (winner) {
        (results as any).winner = winner;
        (results as any).isConcluded = true;
        (results as any).status = 'CONCLUDED';
      }
    }

    if (liveBundle.announcementHtml) {
      (tenderItem as any).announcementHtml = liveBundle.announcementHtml;
    }

    const hasDocumentText = typeof liveBundle.pdfText === 'string' && liveBundle.pdfText.trim().length > 0;
    const evidenceStatus = !hasDocumentText
      ? 'not_processed'
      : liveBundle.extractionStatus === 'complete' && !liveBundle.stale
        ? 'complete'
        : 'partial';
    bds.evidenceStatus = evidenceStatus;
    technicalSpecs.evidenceStatus = evidenceStatus;
  }

  // Fallback if documents array is still empty but raw_data has stored PDF
  if ((!technicalSpecs.documents || technicalSpecs.documents.length === 0) && rawData?.pdfUrl) {
    technicalSpecs.documents = [{
      id: 'stored-primary-pdf',
      name: rawData.pdfFileName || 'ТШББ_баримт.pdf',
      fileExtention: 'pdf',
      category: 'Тендер шалгаруулалтын баримт бичиг (ТШББ)',
      type: 'PDF Баримт',
      date: (tenderItem.publishDate || '').substring(0, 10),
      url: rawData.pdfUrl,
      downloadUrl: rawData.pdfUrl,
      isStored: true,
      source: 'stored_cdn',
      extractionStatus: 'text_extracted',
      extractedPageCount: rawData.pdfPageCount || 1,
      totalPageCount: rawData.pdfPageCount || 1,
      extractedSummary: rawData.liveBundle?.fullScopeOfWork || '',
      officialNotice: 'Supabase хадгалагдсан албан ёсны ТШЗ баримт'
    }];
  }

  const chinaBidderAnalysis = analyzeChinaBidderEligibility({
    ...tenderItem,
    bds,
    liveBundleSummary: liveBundle ? {
      hasBundle: true,
      docCount: liveBundle.documents?.length || 0,
      hasOcr: !!liveBundle.isScannedOcr,
      isBidSecurityExempt: bds.bidSecurityAmount === 0 || bds.bidSecurity1Pct === 0,
      topItems: technicalSpecs.sampleItems?.map((i: any) => ({ name: i.name, qty: i.quantity, unit: i.unit })),
    } : undefined
  });
  (tenderItem as any).chinaBidderAnalysis = chinaBidderAnalysis;

  const budgetEstimate = rawData?.source === 'telegram' && !(Number(tenderItem.totalBudget) > 0)
    ? await estimateBudgetFromHistory(tenderItem.tenderName, tenderItem.budgetEntityName || null, String(tenderItem.invitationId || id))
    : null;

  return {
    success: true,
    tender: tenderItem,
    budgetEstimate,
    bds,
    technicalSpecs,
    results,
    liveBundle,
    relatedByEntity,
    similarTenders,
    chinaBidderAnalysis
  };
}

export { generateBDS, generateTechnicalSpecs };

export function getStructuredTenderSummary(tender: any) {
  const bds = generateBDS(tender);
  const technicalSpecs = generateTechnicalSpecs(tender);
  const results = generateResults(tender);
  return { bds, technicalSpecs, results };
}


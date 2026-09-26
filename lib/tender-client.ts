import { TenderItem, TenderFilterParams, TenderStats } from './types';
import { classifyIndustry } from './taxonomy';
import { generateBidRequirements } from './bid-requirements';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

export function parseSafeTimestamp(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const ts = Date.parse(normalized.endsWith('Z') || normalized.includes('+') ? normalized : `${normalized}+08:00`);
  return isNaN(ts) ? null : ts;
}

class TenderStore {
  private tenders: Map<string, TenderItem> = new Map();
  private lastSyncedAt: Date | null = null;
  private isSyncing = false;

  constructor() {
    this.loadFromDisk();
  }

  private enrichItem(item: TenderItem): TenderItem {
    const entity = item.budgetEntityName || (item as any).uusgesenEntityName || item.positionName || '';
    const classification = classifyIndustry(item.tenderName, item.tenderTypeCode, entity);
    const bidReqs = generateBidRequirements(item);
    return {
      ...item,
      totalBudget: typeof item.totalBudget === 'number' ? item.totalBudget : Number(item.totalBudget) || 0,
      industry: item.industry || classification.id,
      industryName: item.industryName || classification.labelMn,
      bidRequirements: item.bidRequirements || bidReqs,
    };
  }

  public loadFromDisk() {
    try {
      const livePath = path.join(process.cwd(), 'lib', 'live-tenders.json');
      if (fs.existsSync(livePath)) {
        const liveData: TenderItem[] = JSON.parse(fs.readFileSync(livePath, 'utf8'));
        if (Array.isArray(liveData) && liveData.length > 0) {
          liveData.forEach(item => {
            this.tenders.set(String(item.invitationId), this.enrichItem(item));
          });
        }
      }
    } catch (e) {
      console.warn('Could not read live-tenders.json; no local snapshot is available.');
    }
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncedAt;
  }

  public getAllTenders(): TenderItem[] {
    this.loadFromDisk();
    return Array.from(this.tenders.values());
  }

  public getTenderById(id: string | number): TenderItem | undefined {
    return this.tenders.get(String(id));
  }

  public async fetchLiveTenders(searchQuery?: string, page = 1, year?: string | number): Promise<{
    items: TenderItem[];
    totalCount: number;
    source: 'live' | 'source_error';
    error?: string;
  }> {
    return new Promise((resolve) => {
      const yearParam = year && year !== 'all' ? `&year=${year}` : '';
      const url = `https://www.tender.gov.mn/mn/invitation?${searchQuery ? `search=${encodeURIComponent(searchQuery)}&` : ''}page=${page}${yearParam}`;
      
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      execFile(curlCmd, [
        '-s', '-L',
        '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '-H', 'Accept-Language: mn,en-US;q=0.7,en;q=0.3',
        url
      ], { maxBuffer: 30 * 1024 * 1024, timeout: 10000 }, (err, stdout) => {
        if (err || !stdout) {
          const error = err?.message || 'The source returned an empty response.';
          console.warn('Direct live tender fetch failed:', error);
          return resolve({ items: [], totalCount: 0, source: 'source_error', error });
        }

        try {
          // Extract Next.js Server Components JSON payload
          let idx = stdout.indexOf('invitationId');
          if (idx === -1) idx = stdout.indexOf('uusgesenClientId');

          if (idx !== -1) {
            let start = -1;
            for (let i = idx; i >= 0; i--) {
              if (stdout[i] === '[') {
                start = i;
                break;
              }
            }

            if (start !== -1) {
              let depth = 0;
              let end = -1;
              let inString = false;
              let escape = false;
              for (let i = start; i < stdout.length; i++) {
                const char = stdout[i];
                if (escape) {
                  escape = false;
                  continue;
                }
                if (char === '\\') {
                  escape = true;
                  continue;
                }
                if (char === '"') {
                  inString = !inString;
                  continue;
                }
                if (!inString) {
                  if (char === '[') depth++;
                  else if (char === ']') {
                    depth--;
                    if (depth === 0) {
                      end = i;
                      break;
                    }
                  }
                }
              }

              if (end !== -1) {
                let raw = stdout.substring(start, end + 1);
                if (raw.includes('\\"')) {
                  raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                }
                const parsed: TenderItem[] = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.every((item) => item && item.invitationId != null)) {
                  // Upsert into memory store with enrichment
                  parsed.forEach(item => {
                    this.tenders.set(String(item.invitationId), this.enrichItem(item));
                  });
                  this.lastSyncedAt = new Date();
                  return resolve({ items: parsed.map(p => this.enrichItem(p)), totalCount: parsed.length, source: 'live' });
                }
              }
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse Next.js payload from live tender.gov.mn', parseErr);
          return resolve({ items: [], totalCount: 0, source: 'source_error', error: 'The source response could not be parsed.' });
        }

        resolve({ items: [], totalCount: 0, source: 'source_error', error: 'The source page did not contain a valid tender list.' });
      });
    });
  }

  public filterTenders(params: TenderFilterParams): { items: TenderItem[]; totalCount: number } {
    this.loadFromDisk();
    let result = Array.from(this.tenders.values());

    // Multi-field tokenized search keyword
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);
      result = result.filter(item => {
        const name = (item.tenderName || '').toLowerCase();
        const code = (item.tenderCode || '').toLowerCase();
        const entity = (item.budgetEntityName || (item as any).uusgesenEntityName || '').toLowerCase();
        const position = (item.positionName || '').toLowerCase();
        const invNum = (item.invitationNumber || '').toLowerCase();
        const client = (item.clientCode || '').toLowerCase();
        const fullContent = `${name} ${code} ${entity} ${position} ${invNum} ${client}`;
        return terms.every(term => fullContent.includes(term));
      });
    }

    // Category filter (PRODUCT, JOB, SERVICE)
    if (params.category && params.category !== 'all' && params.category !== 'ALL') {
      result = result.filter(item => item.tenderTypeCode === params.category);
    }

    // B2B Industry Vertical Filter
    if (params.industry && params.industry !== 'all') {
      result = result.filter(item => item.industry === params.industry);
    }

    // Budget range filter (numeric safe)
    if (params.minBudget !== undefined && !isNaN(params.minBudget) && params.minBudget > 0) {
      result = result.filter(item => (Number(item.totalBudget) || 0) >= params.minBudget!);
    }
    if (params.maxBudget !== undefined && !isNaN(params.maxBudget) && params.maxBudget > 0) {
      result = result.filter(item => (Number(item.totalBudget) || 0) <= params.maxBudget!);
    }

    // Status & Active Tab filter
    const nowTs = Date.now();
    if (params.tabMode === 'closing_soon') {
      result = result.filter(item => {
        const isActive = item.docStatusCode === 'RECEIVE_TENDER' || item.docStatusName?.includes('хүлээн') || (item as any).isReceiving === 1;
        if (!isActive) return false;
        const deadlineTs = parseSafeTimestamp(item.receiveDate || item.openDate);
        if (!deadlineTs) return false;
        const diffHours = (deadlineTs - nowTs) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 48;
      });
    } else if (params.tabMode === 'result') {
      result = result.filter(item => {
        const status = (item.docStatusName || '').toLowerCase();
        return status.includes('үр дүн') || status.includes('дууссан') || (item.docStatusCode || '').includes('CLOSED');
      });
    } else if (params.tabMode === 'active') {
      result = result.filter(item => {
        return item.docStatusCode === 'RECEIVE_TENDER' || item.docStatusName?.includes('хүлээн') || (item as any).isReceiving === 1;
      });
    } else if (params.tabMode === 'no_guarantee') {
      result = result.filter(item =>
        item.liveBundleSummary?.isBidSecurityExempt === true &&
        (item.docStatusCode === 'RECEIVE_TENDER' || item.docStatusName?.includes('хүлээн') || (item as any).isReceiving === 1),
      );
    } else if (params.status && params.status !== 'all') {
      if (params.status === 'receiving') {
        result = result.filter(item => item.docStatusCode === 'RECEIVE_TENDER' || item.docStatusName?.includes('хүлээн') || (item as any).isReceiving === 1);
      } else if (params.status === 'published') {
        result = result.filter(item => item.docStatusCode === 'PUBLISHING_STATUS' || item.docStatusName?.includes('Нийтлэгдсэн'));
      } else if (params.status === 'result') {
        result = result.filter(item => (item.docStatusName || '').toLowerCase().includes('үр дүн'));
      }
    }

    // Urgency Presets
    if (params.urgency && params.urgency !== 'all') {
    if (params.urgency === 'urgent_48h') {
        result = result.filter(item => {
          const deadlineTs = parseSafeTimestamp(item.receiveDate || item.openDate);
          if (!deadlineTs) return false;
          const diffHours = (deadlineTs - nowTs) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= 48;
        });
      } else if (params.urgency === 'new_48h') {
        result = result.filter(item => {
          const pubTs = parseSafeTimestamp(item.publishDate || item.actionDate);
          if (!pubTs) return false;
          const diffHours = (nowTs - pubTs) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 48;
        });
      } else if (params.urgency === 'high_budget') {
        result = result.filter(item => (Number(item.totalBudget) || 0) >= 500_000_000);
      }
    }

    // Year filter (if present)
    if ((params as any).year && (params as any).year !== 'all') {
      const yStr = String((params as any).year);
      result = result.filter(item => {
        const pub = item.publishDate || item.actionDate;
        const pubYear = pub ? new Date(pub).getFullYear().toString() : '';
        const code = item.tenderCode || '';
        return pubYear === yStr || code.includes(`/${yStr}`);
      });
    }

    // Date range filter (if present)
    if ((params as any).dateFrom) {
      const fromTime = parseSafeTimestamp((params as any).dateFrom);
      if (fromTime) {
        result = result.filter(item => {
          const pubTs = parseSafeTimestamp(item.publishDate || item.actionDate);
          return pubTs ? pubTs >= fromTime : false;
        });
      }
    }
    if ((params as any).dateTo) {
      const toTime = parseSafeTimestamp(`${(params as any).dateTo}T23:59:59`);
      if (toTime) {
        result = result.filter(item => {
          const pubTs = parseSafeTimestamp(item.publishDate || item.actionDate);
          return pubTs ? pubTs <= toTime : false;
        });
      }
    }

    // Sorting (robust numeric & date parsing)
    const sortBy = params.tabMode === 'closing_soon' ? 'deadline_asc' : (params.sortBy || 'date_desc');
    result.sort((a, b) => {
      if (sortBy === 'budget_desc') {
        const budgetA = typeof a.totalBudget === 'number' ? a.totalBudget : Number(a.totalBudget) || 0;
        const budgetB = typeof b.totalBudget === 'number' ? b.totalBudget : Number(b.totalBudget) || 0;
        return budgetB - budgetA;
      } else if (sortBy === 'budget_asc') {
        const budgetA = typeof a.totalBudget === 'number' ? a.totalBudget : Number(a.totalBudget) || 0;
        const budgetB = typeof b.totalBudget === 'number' ? b.totalBudget : Number(b.totalBudget) || 0;
        return budgetA - budgetB;
      } else if (sortBy === 'deadline_asc') {
        const dateA = parseSafeTimestamp(a.receiveDate || a.openDate) ?? Infinity;
        const dateB = parseSafeTimestamp(b.receiveDate || b.openDate) ?? Infinity;
        return dateA - dateB;
      } else {
        // date_desc default
        const dateA = parseSafeTimestamp(a.publishDate || a.actionDate) ?? 0;
        const dateB = parseSafeTimestamp(b.publishDate || b.actionDate) ?? 0;
        return dateB - dateA;
      }
    });

    const totalCount = result.length;
    const page = Math.max(1, Number(params.page) || 1);
    const perPage = Math.max(1, Math.min(100, Number(params.perPage) || 15));
    const startIndex = (page - 1) * perPage;
    const pagedItems = result.slice(startIndex, startIndex + perPage);

    return { items: pagedItems, totalCount };
  }

  public getStats(): TenderStats {
    const all = Array.from(this.tenders.values());
    let totalBudgetSum = 0;
    let productCount = 0;
    let jobCount = 0;
    let serviceCount = 0;
    let hasUnknownBudget = false;
    let hasUnknownActiveBudget = false;
    const unknownIndustryBudget = new Set<string>();
    const unknownActiveIndustryBudget = new Set<string>();
    const ministryMap: Record<string, { count: number; budget: number; budgetKnown: boolean }> = {};
    const industryCounts: Record<string, number> = {};

    let activeCount = 0;
    let activeBudgetSum = 0;
    let closingSoonCount = 0;
    let newCount = 0;
    let totalResultCount = 0;
    const now = Date.now();

    const statsByIndustry: Record<string, { totalCount: number; totalBudgetSum: number; activeCount: number; activeBudgetSum: number; resultCount: number; closingSoonCount: number }> = {
      mining: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      it: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      construction: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      medical: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      food: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      transport: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      facility: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      stationery: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
      consulting: { totalCount: 0, totalBudgetSum: 0, activeCount: 0, activeBudgetSum: 0, resultCount: 0, closingSoonCount: 0 },
    };

    all.forEach(t => {
      const budget = Number.isFinite(t.totalBudget) && t.totalBudget > 0 ? t.totalBudget : null;
      if (budget == null) hasUnknownBudget = true;
      else totalBudgetSum += budget;
      if (t.tenderTypeCode === 'PRODUCT') productCount++;
      else if (t.tenderTypeCode === 'JOB') jobCount++;
      else if (t.tenderTypeCode === 'SERVICE') serviceCount++;

      const isResult = t.docStatusName?.includes('Үр дүн') || (t.docStatusName?.toLowerCase().includes('үр дүн') ?? false);
      if (isResult) {
        totalResultCount++;
      }

      const isActive = t.docStatusCode === 'RECEIVE_TENDER' || t.docStatusName?.includes('хүлээн') || (t as any).isReceiving === 1;
      if (isActive) {
        activeCount++;
        if (budget == null) hasUnknownActiveBudget = true;
        else activeBudgetSum += budget;

        if (t.industry) {
          industryCounts[t.industry] = (industryCounts[t.industry] || 0) + 1;
        }

        const deadline = t.receiveDate || t.openDate;
        if (deadline) {
          const diffHours = (new Date(deadline).getTime() - now) / (1000 * 60 * 60);
          if (diffHours > 0 && diffHours <= 48) {
            closingSoonCount++;
          }
        }

        const pubDate = t.publishDate || t.actionDate;
        if (pubDate) {
          const diffHours = (now - new Date(pubDate).getTime()) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours <= 96) {
            newCount++;
          }
        }
      }

      if (t.industry && statsByIndustry[t.industry]) {
        const indStat = statsByIndustry[t.industry];
        indStat.totalCount++;
        if (budget == null) unknownIndustryBudget.add(t.industry);
        else indStat.totalBudgetSum += budget;
        if (isActive) {
          indStat.activeCount++;
          if (budget == null) unknownActiveIndustryBudget.add(t.industry);
          else indStat.activeBudgetSum += budget;
          const deadline = t.receiveDate || t.openDate;
          if (deadline) {
            const diffHours = (new Date(deadline).getTime() - now) / (1000 * 60 * 60);
              if (diffHours > 0 && diffHours <= 48) {
              indStat.closingSoonCount++;
            }
          }
        }
        if (isResult) {
          indStat.resultCount++;
        }
      }

      const ministry = t.positionName || 'Бусад захиалагч';
      if (!ministryMap[ministry]) {
        ministryMap[ministry] = { count: 0, budget: 0, budgetKnown: true };
      }
      ministryMap[ministry].count++;
      if (budget == null) ministryMap[ministry].budgetKnown = false;
      else ministryMap[ministry].budget += budget;
    });

    const topMinistries = Object.entries(ministryMap)
      .map(([name, val]) => ({ name, count: val.count, budget: val.budgetKnown ? val.budget : null }))
      .sort((a, b) => (b.budget || 0) - (a.budget || 0))
      .slice(0, 5);
    const safeIndustryStats = Object.fromEntries(Object.entries(statsByIndustry).map(([industry, stat]) => [industry, {
      ...stat,
      totalBudgetSum: unknownIndustryBudget.has(industry) ? null : stat.totalBudgetSum,
      activeBudgetSum: unknownActiveIndustryBudget.has(industry) ? null : stat.activeBudgetSum,
    }]));

    return {
      totalCount: all.length,
      totalBudgetSum: hasUnknownBudget ? null : totalBudgetSum,
      activeTendersCount: activeCount,
      activeBudgetSum: hasUnknownActiveBudget ? null : activeBudgetSum,
      closingSoonCount,
      resultCount: totalResultCount,
      newCount,
      categoryCounts: {
        product: productCount,
        job: jobCount,
        service: serviceCount,
      },
      industryCounts,
      statsByIndustry: safeIndustryStats,
      topMinistries,
      lastUpdatedAt: this.lastSyncedAt?.toISOString(),
    };
  }
}

export const tenderStore = new TenderStore();

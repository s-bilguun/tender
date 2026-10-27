import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { supabase, supabaseAdmin } from './supabase';
import { LIVE_BUNDLE_SCHEMA_VERSION, SpecialConditionClause, DeliveryScheduleItem, LiveSubTender } from './types';
import { fetchVerifiedAttachment } from './source-attachment';
import {
  extractJpegImagesFromPdfBuffer,
  isScannedPdf,
  extractScannedPdfWithVision
} from './pdf-vision-extractor';

export interface LiveTenderDocument {
  id?: string;
  fileId?: number;
  fileName: string;
  createdDate?: string;
  fileExtention?: string;
  downloadUrl: string;
  source?: 'official' | 'manual_upload';
  storagePath?: string;
  isPrimary?: boolean;
  category?: string;
  isScannedOcr?: boolean;
  ocrModel?: string;
  extractionStatus?: 'not_extracted' | 'source_error' | 'scanned_not_processed' | 'text_extracted' | 'partial' | 'ocr_partial';
  extractedPageCount?: number;
  totalPageCount?: number;
  ocrSampleCount?: number;
}

export interface LiveBidder {
  bidderTenderId?: number;
  bidderId?: number;
  supplierId?: number;
  supplierName: string;
  registerNumber?: string;
  openedBidderPrice?: number;
  discountedAmount?: number;
  wfmStatusCode?: string;
  wfmStatusName: string;
  wfmStatusColor?: string;
  commentText?: string;
  noticeDateString?: string;
  guaranteeText?: string;
  fileId?: number;
  fileName?: string;
  decisionDownloadUrl?: string;
}

export interface StructuredSpecs {
  rawSpecText?: string;
  fullScopeOfWork?: string;
  keyRequirements?: string[];
  items?: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
  qualifications?: string[];
  turnoverReq?: string;
  similarExpReq?: string;
  liquidAssetsReq?: string;
  warrantyMonths?: number;
  warrantyPeriod?: string;
  deliveryPeriod?: string;
  deliveryLocation?: string;
  foreignEligible?: boolean | null;
  incoterms?: string;
  licenses?: string[];
  personnel?: Array<{ role: string; count: number; qualification: string; experience?: string }>;
  machinery?: string[];
  bidSecurityReq?: string;
  specialConditions?: SpecialConditionClause[];
  deliverySchedule?: DeliveryScheduleItem[];
}

export interface ParsedPdfResult extends StructuredSpecs {
  rawSpecText: string;
  fullScopeOfWork: string;
  keyRequirements: string[];
  items: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
  qualifications: string[];
  licenses: string[];
  personnel: Array<{ role: string; count: number; qualification: string; experience?: string }>;
  machinery: string[];
  specialConditions: SpecialConditionClause[];
  deliverySchedule: DeliveryScheduleItem[];
}

export interface LiveExtractionResult {
  schemaVersion?: number;
  tenderDocumentId?: number;
  tenderId?: number;
  documents: LiveTenderDocument[];
  bidders: LiveBidder[];
  announcementHtml?: string;
  pdfText?: string;
  pdfPageCount?: number;
  structuredSpecs?: StructuredSpecs;
  subTenders?: LiveSubTender[];
  isFailed?: boolean;
  isScannedOcr?: boolean;
  fetchedAt?: string;
  extractionStatus?: 'complete' | 'partial' | 'unavailable';
  stale?: boolean;
  lastFetchAttemptAt?: string;
}

// In-memory cache for fast sub-millisecond retrieval
const liveCache = new Map<string, { timestamp: number; data: LiveExtractionResult }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function cacheTenderLiveBundle(invitationId: string | number, bundle: LiveExtractionResult) {
  liveCache.set(String(invitationId), { timestamp: Date.now(), data: bundle });
}

function hasFreshFetch(bundle?: LiveExtractionResult | null): bundle is LiveExtractionResult {
  if (!bundle?.fetchedAt || bundle.schemaVersion !== LIVE_BUNDLE_SCHEMA_VERSION) return false;
  const fetchedAt = Date.parse(bundle.fetchedAt);
  const hasManualUpload = bundle.documents?.some((doc) => doc.source === 'manual_upload');
  const ttl = hasManualUpload
    ? 60 * 1000
    : bundle.extractionStatus === 'complete'
    ? CACHE_TTL_MS
    : bundle.extractionStatus === 'partial'
      ? 60 * 60 * 1000
      : 15 * 60 * 1000;
  return Number.isFinite(fetchedAt) && Date.now() - fetchedAt < ttl;
}

function hasPriorExtractedText(bundle?: LiveExtractionResult): bundle is LiveExtractionResult {
  return bundle?.schemaVersion === LIVE_BUNDLE_SCHEMA_VERSION &&
    typeof bundle.pdfText === 'string' && bundle.pdfText.trim().length > 30;
}

function preserveMissingStructuredSpecs(current: any, previous: any) {
  const merged = { ...(current || {}) };
  for (const [key, value] of Object.entries(previous || {})) {
    const currentValue = merged[key];
    const isEmpty = currentValue == null || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0);
    if (isEmpty && value != null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      merged[key] = value;
    }
  }
  return merged;
}

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

/** OCR sparse pages from scanned PDFs when Poppler is available (the daily worker installs it). */
export async function ocrSparsePdfPages(
  pdfBuffer: Buffer,
  pageCount: number,
  pageNumbers: number[],
): Promise<Array<{ page: number; text: string }> | null> {
  const requestedPages = Array.from(new Set(pageNumbers.filter((page) => page >= 1 && page <= Math.min(pageCount, 100))));
  if (requestedPages.length === 0) return [];

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tender-pdf-ocr-'));
  let worker: any = null;
  try {
    const inputPath = path.join(tempDir, 'source.pdf');
    const outputPrefix = path.join(tempDir, 'page');
    await fs.promises.writeFile(inputPath, pdfBuffer);
    const pdftoppm = process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm';
    await new Promise<void>((resolve, reject) => {
      execFile(pdftoppm, [
        '-jpeg', '-jpegopt', 'quality=82', '-r', '120',
        '-f', String(Math.min(...requestedPages)),
        '-l', String(Math.max(...requestedPages)),
        inputPath, outputPrefix,
      ], { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const pageFiles = (await fs.promises.readdir(tempDir))
      .map((fileName) => {
        const match = fileName.match(/^page-(\d+)\.jpg$/i);
        return match ? { fileName, page: Number(match[1]) } : null;
      })
      .filter((entry): entry is { fileName: string; page: number } => !!entry && requestedPages.includes(entry.page))
      .sort((a, b) => a.page - b.page);
    if (pageFiles.length === 0) return null;

    const { createWorker } = require('tesseract.js');
    worker = await createWorker('mon+eng');
    const recognized: Array<{ page: number; text: string }> = [];
    for (const pageFile of pageFiles) {
      const image = await fs.promises.readFile(path.join(tempDir, pageFile.fileName));
      const result = await worker.recognize(image);
      const text = String(result?.data?.text || '').trim();
      if (text.length > 20) recognized.push({ page: pageFile.page, text });
    }
    return recognized;
  } catch (error) {
    console.warn('Full-page PDF OCR unavailable; will try the labeled sampled fallback:', error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch { /* ignore worker cleanup errors */ }
    }
    try { await fs.promises.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore temp cleanup errors */ }
  }
}

// Helper to run curl safely with standard browser headers
function curlGet(url: string, asBuffer = false, referer = 'https://www.tender.gov.mn/'): Promise<string | Buffer> {
  const browserTransport = (globalThis as any).__TENDER_SOURCE_BROWSER__;
  if (browserTransport?.getText) {
    return browserTransport.getText(url, 'GET');
  }

  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      '--connect-timeout', '12',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
      '-H', 'Accept-Language: mn,en-US;q=0.7,en;q=0.3',
      '-H', `Referer: ${referer}`,
      url
    ];

    execFile(curlCmd, args, {
      encoding: asBuffer ? 'buffer' : 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 25000
    }, async (err, stdout) => {
      const isEmpty = !stdout || (asBuffer ? (stdout as Buffer).length === 0 : stdout.toString().trim().length === 0);
      if (err || isEmpty) {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
              'Referer': referer
            }
          });
          if (res.ok) {
            if (asBuffer) {
              const ab = await res.arrayBuffer();
              return resolve(Buffer.from(ab));
            } else {
              const text = await res.text();
              return resolve(text);
            }
          }
        } catch {
          // ignore fallback error
        }
        resolve(asBuffer ? Buffer.from([]) : '');
      } else {
        resolve(stdout);
      }
    });
  });
}

function curlPostJson(url: string, body: any): Promise<string> {
  const browserTransport = (globalThis as any).__TENDER_SOURCE_BROWSER__;
  if (browserTransport?.getText) {
    return browserTransport.getText(url, 'POST', body);
  }

  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      url,
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-d', JSON.stringify(body)
    ];

    execFile(curlCmd, args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 25000
    }, (err, stdout) => {
      if (err || !stdout) {
        resolve('');
      } else {
        resolve(stdout);
      }
    });
  });
}


export function extractSubTendersFromHtml(html: string): LiveSubTender[] {
  if (!html) return [];
  let fullText = '';
  const regex = /self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)(?:;|<\/script>)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      fullText += m[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    } catch {
      fullText += m[1];
    }
  }

  const subMatch = fullText.match(/"subTenders"\s*:\s*(\[[^\]]+\])/);
  if (subMatch) {
    try {
      const parsed = JSON.parse(subMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          subTenderId: Number(item.subTenderId) || 0,
          subTenderName: String(item.subTenderName || '').replace(/\s+/g, ' ').trim(),
          subTenderCode: String(item.subTenderCode || '').trim(),
          totalBudget: Number(item.totalBudget) || 0,
          wfmStatusId: Number(item.wfmStatusId) || 0,
          wfmStatusName: String(item.wfmStatusName || 'Бүртгэгдсэн').trim(),
          wfmStatusColor: String(item.wfmStatusColor || '#94A3B8').trim(),
          wfmStatusCode: String(item.wfmStatusCode || '').trim(),
          noticeDate: item.noticeDate && item.noticeDate !== 'null' ? String(item.noticeDate) : undefined
        }));
      }
    } catch (e) {
      console.warn('Failed to parse subTenders JSON:', e);
    }
  }
  return [];
}

export function isClauseEmptyOrTemplate(content: string): boolean {
  if (!content) return true;
  const c = content.trim();
  if (c.length === 0) return true;
  if (c.endsWith(':')) return true;

  const cleanedText = c.replace(/[\[\]\"\'„“”\(\)]/g, '').trim();
  if (
    /^(?:он[\,\s]*сар[\,\s]*өдөр|мөнгөн\s*дүн\s*бич|ажлын\s*хоног\s*бичих|сонгох|бичих|тогтоож\s*бичих|нэрлэн\s*бичих|хүртэл\s*хувиар\s*тогтоож\s*бичих|хоног\s*тутамд\s*0\.5\s*хүртэл\s*хувиар\s*тогтоож\s*бичих)$/i.test(cleanedText) ||
    /^(?:“?Тийм”?[\,\s]*“?Үгүй”?\s*аль\s*нэгийг\s*сонгох|“?Хийнэ”?[\,\s]*“?Хийхгүй”?\s*аль\s*нэгийг\s*сонгох)$/i.test(cleanedText)
  ) {
    return true;
  }
  return false;
}

export function parseSCC(fullText: string): SpecialConditionClause[] {
  if (!fullText) return [];
  const sccIdx = fullText.lastIndexOf('ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ');
  if (sccIdx === -1) return [];

  const text = fullText.substring(sccIdx);
  const endIdx = text.search(/ГЭРЭЭ БАТАЛГААЖУУЛАХ МАЯГТ|ТЕНДЕР ШАЛГАРУУЛАЛТЫН ЗАРЛАЛ/);
  const sccSection = endIdx !== -1 ? text.substring(0, endIdx) : text.substring(0, 10000);

  const regex = /(?:^|\n)\s*(ГЕН|ГТН)\s*([\d\.]+)\.?\s*([^\n\:]*?)[\:\.]?\s*([\s\S]*?)(?=(?:\n\s*(?:ГЕН|ГТН)\s*[\d\.]+|\n\s*ГЭРЭЭ|$))/g;
  let m;
  const list: SpecialConditionClause[] = [];
  while ((m = regex.exec(sccSection)) !== null) {
    const prefix = m[1];
    const num = m[2];
    let rawTitle = m[3].replace(/\s+/g, ' ').trim();
    let content = m[4].replace(/\s+/g, ' ').trim();

    // If content begins with a prompt before colon (e.g. "Ажил эхлэх хугацаа: ...")
    const colonIdx = content.indexOf(':');
    if (colonIdx !== -1 && colonIdx < 80 && (!rawTitle || rawTitle.length < 5)) {
      rawTitle = content.substring(0, colonIdx).trim();
      content = content.substring(colonIdx + 1).trim();
    }

    // Unpack brackets if they enclose real content, e.g. [5%] or [Ханбогд сум]
    if (content.startsWith('[') && content.endsWith(']')) {
      content = content.slice(1, -1).trim();
    }

    if (isClauseEmptyOrTemplate(content)) {
      continue;
    }

    let title = rawTitle;
    if (!title || title.startsWith('Тусгай нөхцөл')) {
      if (num === '2.5') title = 'Бараа нийлүүлэх газар';
      else if (num === '2.6') title = 'Бараа нийлүүлэх хугацаа';
      else if (num === '2.10') title = 'Бараа хүлээлгэн өгөх нөхцөл';
      else if (num === '2.14') title = 'Баглаа, боодол';
      else if (num === '3.8' || num === '5.2') title = 'Үнийн тохируулга';
      else if (num === '3.9' || num === '5.6') title = 'Төлбөр төлөх хугацаа';
      else if (num === '4.1') title = 'Ажил эхлэх хугацаа';
      else if (num === '4.2' || num === '7.5') title = 'Даатгал';
      else if (num === '4.9') title = 'Ажлын явцын тайлан';
      else if (num === '4.10' || num === '6.14') title = 'Баталгаат хугацаа';
      else if (num === '4.11' || num === '6.8') title = 'Чанарын баталгаа';
      else if (num === '4.17' || num === '10.22') title = 'Гүйцэтгэгчийн төлөх алданги';
      else if (num === '4.18' || num === '10.21') title = 'Захиалагчийн төлөх алданги';
      else if (num === '5.4') title = 'Урьдчилгаа төлбөр';
      else if (num === '5.5') title = 'Урьдчилгаа олгох хугацаа';
      else if (num === '6.1') title = 'Урьдчилгаа төлбөрийн баталгаа';
      else title = `Тусгай нөхцөл ${num}`;
    }

    list.push({
      clause: `${prefix} ${num}`,
      title,
      content
    });
  }

  return list;
}

/** Detect broken custom-font / mojibake PDF text (e.g. "SATJIAB X9U-mrV11h") */
export function isGarbledPdfText(text?: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 40) return false;
  const cyrillicMatches = trimmed.match(/[\u0400-\u04FF]/g) || [];
  const latinMatches = trimmed.match(/[A-Za-z]/g) || [];
  const totalAlpha = cyrillicMatches.length + latinMatches.length;
  if (totalAlpha < 30) return true;
  return cyrillicMatches.length / totalAlpha < 0.15;
}

/** Check if an extracted BoQ item is legal/instruction boilerplate or a broken regex artifact */
export function isBoilerplateSpecItem(item: { name?: string; qty?: string | number; quantity?: string | number; unit?: string; specs?: string }): boolean {
  if (!item || !item.name) return true;
  const n = String(item.name).replace(/\s+/g, ' ').trim();
  const u = String(item.unit || '').trim();
  const q = String(item.qty ?? item.quantity ?? '').trim();

  if (n.length < 3 || n.length > 260) return true;
  if (q === '00' || q === '0' || /^00(?:ширхэг|ш|м|м2|м3)?$/i.test(`${q}${u}`)) return true;
  if (/^[\d\.\)\-\s]+$/.test(n)) return true;

  const badPatterns = [
    /Худалдан\s*авах\s*ажиллагааны\s*цахим/i,
    /Захиалагчийн\s*тогтоосон\s*техникийн\s*үзүүлэлт/i,
    /Техникийн\s*тодорхойлолт\s*болон\s*тавигдах\s*шаардлаг/i,
    /Уг\s*санамж\s*нь\s*хэм\s*хэмжээ/i,
    /баримт\s*бичгийн\s*хэсэг\s*болохгүй/i,
    /Барааны\s*нэрийг\s*бичих/i,
    /Техникийн\s*үзүүлэлтийг\s*бичих/i,
    /тоо\s*бичих/i,
    /хэмжих\s*нэгжийг\s*бичих/i,
    /Бараа\s*нийлүүлэлтийн\s*хуваарийг\s*дараах/i,
    /Тусгай\s*шаардлага\s*шаардах\s*бол/i,
    /Холбогдох\s*техникийн\s*зураг/i,
    /Барааны\s*гарал\s*үүслийн\s*улс/i,
    /ТЕНДЕРТ\s*ОРОЛЦОГЧДОД\s*ӨГӨХ\s*ЗААВАРЧИЛГАА/i,
    /ТЕНДЕРИЙН\s*ӨГӨГДЛИЙН\s*ХҮСНЭГТ/i,
    /ГЭРЭЭНИЙ\s*ЕРӨНХИЙ\s*НӨХЦӨЛ/i,
    /ГЭРЭЭНИЙ\s*ТУСГАЙ\s*НӨХЦӨЛ/i,
    /ҮНИЙН\s*САНАЛЫН\s*МАЯГТ/i,
    /Тендер\s*шалгаруулалтын\s*баримт\s*бичгийн/i,
    /Тендерт\s*оролцогч\s*нь\s*дараах/i,
    /Хөдөлмөрийн\s*аюулгүй\s*байдал,\s*эрүүл\s*ахуйн/i,
    /Шугамаар\s*ус\s*хангах\s*албанд/i,
    /^Барааны\s*нэр$/i,
    /^Ажлын\s*нэр$/i,
    /^Тоо\s*хэмжээ$/i,
    /^Хэмжих\s*нэгж$/i,
    /^Техникийн\s*тодорхойлолт$/i,
    /^Санхүүжилтийн\s*эх/i,
    /^Чадавхын\s*болон/i,
    /^Тендер\s*шалгаруулалтын\s*төрөл/i,
    /^Нийт\s*төсөвт\s*өртөг/i,
    /^дүйцэх\)?$/i,
    /^Борлуулалтын\s*орлог/i,
    /^Ижил\s*төстэй/i,
    /^Түргэн\s*хөрвөх/i,
    /татгалзах\s*үндэслэл\s*болно/i,
    /шаардлага\s*хангаагүй\s*гэж/i,
    /^Маягт\s*\d/i,
    /^ШААРДЛАГА$/i,
    /ТЕНДЕРИЙН\s*ҮНЭЛГЭЭНИЙ\s*ШАЛГУУР/i,
  ];
  return badPatterns.some((re) => re.test(n));
}

/** Isolate Chapter II (BDS), Chapter III (Technical Specs), or Delivery Schedule without hitting Table of Contents or Contract Form */
export function isolateChapterSection(fullText: string, sectionType: 'bds' | 'tech' | 'schedule' | 'invitation'): string {
  if (!fullText) return '';

  const tsz1Idx = fullText.search(/ТШЗ\s*1\.1\b/);

  if (sectionType === 'bds') {
    // Find actual Chapter II body (where ТШЗ 1.1 begins), skipping Table of Contents
    if (tsz1Idx !== -1) {
      const start = Math.max(0, tsz1Idx - 300);
      const after = fullText.slice(start);
      const endMatch = after.search(/\n\s*III\s*БҮЛЭГ|\n\s*3\s*БҮЛЭГ|\n\s*IV\s*БҮЛЭГ/i);
      return endMatch !== -1 ? after.slice(0, endMatch) : after.slice(0, 35000);
    }
    const ch2Idx = fullText.indexOf('II БҮЛЭГ', 15000);
    if (ch2Idx !== -1) {
      const after = fullText.slice(ch2Idx);
      const endMatch = after.search(/\n\s*III\s*БҮЛЭГ|\n\s*IV\s*БҮЛЭГ/i);
      return endMatch !== -1 ? after.slice(0, endMatch) : after.slice(0, 30000);
    }
    return '';
  }

  if (sectionType === 'tech') {
    // Chapter III is ALWAYS after Chapter II (ТШЗ 1.1). Starting after ТШЗ 1.1 skips both the ToC and Chapter I Clause 6.1!
    let searchFrom = tsz1Idx !== -1 ? tsz1Idx + 500 : Math.min(18000, Math.floor(fullText.length * 0.25));
    let foundIdx = -1;
    while (searchFrom < fullText.length) {
      const sub = fullText.slice(searchFrom);
      const m = sub.match(/(?:III\s*БҮЛЭГ[\.\:\s]*|3\s*БҮЛЭГ[\.\:\s]*)(?:ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ|АЖЛЫН\s*ДААЛГАВАР|ТЕХНИКИЙН\s*ДААЛГАВАР)?|(?:\n|^)\s*(?:ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ|АЖЛЫН\s*ДААЛГАВАР|БАРААНЫ\s*ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ)\s*(?:\n|$)/i);
      if (!m || m.index === undefined) break;
      const absIdx = searchFrom + m.index;
      const beforeSlice = fullText.slice(Math.max(0, absIdx - 45), absIdx);
      const next400 = fullText.slice(absIdx, absIdx + 450);

      // Skip contract form bullet "3.6. Техникийн тодорхойлолт;" and Table of Contents
      const isContractFormRef = /3\.\d\.?\s*$/.test(beforeSlice) || /бүрдүүлнэ[\s\S]{0,120}$/i.test(beforeSlice);
      const isTocEntry = /IV\s*БҮЛЭГ[\s\S]{0,250}V\s*БҮЛЭГ/i.test(next400);

      if (!isContractFormRef && !isTocEntry) {
        foundIdx = absIdx;
        break;
      }
      searchFrom = absIdx + (m[0].length || 20);
    }

    if (foundIdx !== -1) {
      const after = fullText.slice(foundIdx);
      const endMatch = after.search(/(?:\n|\s{2,})(?:IV\s*БҮЛЭГ|V\s*БҮЛЭГ|VI\s*БҮЛЭГ|ТЕНДЕРИЙН\s*ЖИШИГ\s*МАЯГТ|ГЭРЭЭНИЙ\s*ЕРӨНХИЙ\s*НӨХЦӨЛ|ТЕНДЕР\s*ШАЛГАРУУЛАЛТЫН\s*ЗАРЛАЛ)/i);
      return endMatch !== -1 ? after.slice(0, endMatch) : after.slice(0, 45000);
    }
    return '';
  }

  if (sectionType === 'schedule') {
    const techSec = isolateChapterSection(fullText, 'tech');
    const sourceText = techSec || fullText;
    let searchFrom = 0;
    while (searchFrom < sourceText.length) {
      const sub = sourceText.slice(searchFrom);
      const m = sub.match(/(?:БАРАА\s*НИЙЛҮҮЛЭЛТИЙН\s*ХУВААРЬ|АЖИЛ\s*ГҮЙЦЭТГЭХ\s*ХУВААРЬ|НИЙЛҮҮЛЭЛТИЙН\s*ХУВААРЬ|БАРАА\s*МАТЕРИАЛ\s*НИЙЛҮҮЛЭХ\s*ХУВААРЬ)/i);
      if (!m || m.index === undefined) break;
      const absIdx = searchFrom + m.index;
      const beforeSlice = sourceText.slice(Math.max(0, absIdx - 30), absIdx);
      // Skip "3.7. Бараа нийлүүлэлтийн хуваарь." in the contract form and ToC
      if (!/3\.\d\.?\s*$/.test(beforeSlice) && !/ТШЗ\s*17\.3/i.test(beforeSlice)) {
        const after = sourceText.slice(absIdx);
        const endMatch = after.search(/\n\s*(?:IV\s*БҮЛЭГ|V\s*БҮЛЭГ|ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ|ГЭРЭЭНИЙ\s*ЕРӨНХИЙ\s*НӨХЦӨЛ|ТЕНДЕРИЙН\s*ЖИШИГ\s*МАЯГТ)/i);
        return endMatch !== -1 ? after.slice(0, endMatch) : after.slice(0, 12000);
      }
      searchFrom = absIdx + (m[0].length || 20);
    }
    return '';
  }

  if (sectionType === 'invitation') {
    const invIdx = fullText.lastIndexOf('ТЕНДЕР ШАЛГАРУУЛАЛТЫН ЗАРЛАЛ');
    if (invIdx !== -1) {
      return fullText.slice(invIdx, invIdx + 8000);
    }
    return '';
  }

  return '';
}

/** Strip Ministry of Finance САНАМЖ disclaimer, bracketed template instructions, and sample risk forms */
export function cleanTechnicalSectionText(rawSection: string): string {
  if (!rawSection) return '';
  if (isGarbledPdfText(rawSection)) return '';

  let cleaned = rawSection
    // Remove page markers
    .replace(/\[Page\s*\d+\]/gi, '\n')
    // Remove САНАМЖ block up to "баримт бичгийн хэсэг болохгүй."
    .replace(/САНАМЖ\s*[\:\.]?[\s\S]{0,2200}?баримт\s*бичгийн\s*хэсэг\s*болохгүй\.?/gi, '')
    // Remove standard Chapter III template bullet paragraphs if they remain after САНАМЖ
    .replace(/Техникийн\s*тодорхойлолт\s*болон\s*тавигдах\s*шаардлагыг\s*захиалагчаас\s*бэлтгэж[\s\S]{0,1600}?(?:жишээ\s*болно\.|баримт\s*бичгийн\s*хэсэг\s*болохгүй\.)/gi, '')
    .replace(/Захиалагч\s*техникийн\s*тодорхойлолтыг\s*бэлтгэхдээ\s*тендер\s*шалгаруулалтын\s*онцлогт[\s\S]{0,600}?оруулж\s*болно\./gi, '')
    .replace(/Уг\s*санамж\s*нь\s*хэм\s*хэмжээ\s*тогтоохгүй[\s\S]{0,250}?болохгүй\./gi, '')
    // Remove bracketed template prompts like [Шаардлагатай бол...], [Захиалагч...], [Барааны нэрийг бичих]
    .replace(/\[\s*(?:Шаардлагатай\s*бол|Захиалагч|Энэ\s*хэсэгт|Хэрэв\s*тендер|Тендерт\s*оролцогч|Барааны\s*нэрийг|Техникийн\s*үзүүлэлт|тоо\s*бичих|хэмжих\s*нэгж|бараа\s*хүргэх|нийлүүлэлтийн\s*хугацаа|Тохирохыг)[\s\S]*?\]/gi, '')
    // Remove template instruction sentences
    .replace(/Техникийн\s*тодорхойлолтыг\s*дараах\s*хүснэгтийн\s*дагуу\s*бэлтгэнэ\.?/gi, '')
    .replace(/Бараа\s*нийлүүлэлтийн\s*хуваарийг\s*дараах\s*хүснэгтийн\s*дагуу\s*бэлтгэнэ\.?/gi, '')
    .replace(/Тусгай\s*шаардлага\s*шаардах\s*бол\s*дараах\s*хүснэгтийн\s*дагуу\s*бэлтгэнэ\.?/gi, '')
    // Remove sample water-pipe risk assessment form ("Жишээ: Шугамаар ус хангах албанд...")
    .replace(/(?:4\.\s*Хөдөлмөрийн\s*аюулгүй\s*байдал[\s\S]{0,400}?)?Жишээ\s*:\s*Шугамаар\s*ус\s*хангах\s*албанд[\s\S]{0,2500}?(?:Ажлын\s*байран\s*дээр\s*хог\s*хаягдал\s*үүсэх\.?|гарын\s*үсэг\s*зурж\s*баталгаажуулна\.?)/gi, '')
    // Remove empty template table headers
    .replace(/№\s+Барааны\s+нэр\s+Техникийн\s+ерөнхий\s+үзүүлэлт\s+Тавигдах\s+шаардлага\s+Хангах\s+тухай\s+тайлбар\s*(?:1\.)?/gi, '')
    .replace(/Д\/д\s+Барааны\s+нэр\s+Тоо\s+хэмжээ\s+Хэмжих\s+нэгж\s+Бараа\s+нийлүүлэх\s+газар\s+Нийлүүлэлтийн\s+хугацаа\s*(?:1\.)?/gi, '');

  // Clean lines that are purely template placeholders or single numbers left behind
  const lines = cleaned
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => {
      if (!l) return false;
      if (/^(?:1\.|2\.|3\.|4\.)$/.test(l)) return false;
      if (/^---\s*DOCUMENT\s+\d+/i.test(l)) return false;
      return true;
    });

  cleaned = lines.join('\n').trim();

  // If after stripping boilerplate only section titles remain (< 90 chars of substance), return empty string
  const withoutHeadings = cleaned
    .replace(/III\s*БҮЛЭГ[\.\:\s]*|ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ\s*БА\s*ТАВИГДАХ\s*ШААРДЛАГА|ТЕХНИКИЙН\s*ТОДОРХОЙЛОЛТ|БАРАА\s*НИЙЛҮҮЛЭЛТИЙН\s*ХУВААРЬ|1\.\s*Захиалагчийн\s*тогтоосон\s*техникийн\s*үзүүлэлт[\:\.]?|2\.\s*Бараа\s*нийлүүлэлтийн\s*хуваарь[\:\.]?|3\.\s*Тусгай\s*шаардлага[\:\.]?|4\.\s*Хөдөлмөрийн\s*аюулгүй\s*байдал[^\n]*/gi, '')
    .trim();

  if (withoutHeadings.length < 25) return '';
  return cleaned;
}

export function parseDeliverySchedule(fullText: string): DeliveryScheduleItem[] {
  if (!fullText || isGarbledPdfText(fullText)) return [];
  const schedSection = isolateChapterSection(fullText, 'schedule');
  if (!schedSection) return [];

  const list: DeliveryScheduleItem[] = [];
  const unitPattern = 'М3|м3|М2|м2|Тонн|тонн|тн|ширхэг|ш|ком|комплект|багц|метр|м|кг|литр|л|хоног|сар';

  // Supports both spaced ("150 м2") and concatenated ("5000.00м", "2.00ширхэг", "4408м3") quantities+units
  const rowRegex = new RegExp(
    `(?:^|\\n)\\s*(\\d{1,3})[\\.\\)]?\\s*(?:\\n|\\s+)([А-ЯЁа-яёA-Za-z0-9\\s\\-–\\/\\.\\,\\(\\)\\"\\“\\”]+?)(?:\\s+|\\n)(\\d+(?:[\\,\\.]\\d+)?)\\s*(${unitPattern})(?![А-ЯЁа-яёA-Za-z0-9])([\\s\\S]*?)(?=(?:\\n\\s*\\d{1,3}[\\.\\)]?\\s*(?:\\n|\\s+)[А-ЯЁа-яёA-Za-z]|\\n\\s*(?:IV\\s*БҮЛЭГ|V\\s*БҮЛЭГ|ТЕХНИКИЙН|3\\.\\s*Тусгай)|$))`,
    'gi'
  );

  let m;
  while ((m = rowRegex.exec(schedSection)) !== null) {
    const rowNum = m[1];
    let name = m[2].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();
    name = name.replace(/^[0-9\.\)\s]+/, '').replace(/^No\s*/i, '').trim();
    const rawQtyNum = parseFloat(m[3].replace(',', '.'));
    const qty = Number.isFinite(rawQtyNum) ? String(rawQtyNum) : m[3].trim();
    const unit = m[4].trim();
    const rest = m[5].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();

    if (isBoilerplateSpecItem({ name, qty, unit })) continue;

    let deadline = '';
    let location = '';
    const dateMatch = rest.match(/(\d{4}\s*оны[^\.]*?(?:дотор|хүртэл)|\d{4}[\-\.]\d{2}[\-\.]\d{2}[^\s]*|[0-9]{1,3}\s*(?:ажлын\s*|календарийн\s*)?(?:хоног|сар|өдөр)[^\.]*?(?:дотор|хүртэл|нийлүүлнэ)?)/i);
    if (dateMatch) {
      deadline = dateMatch[0].trim();
      location = rest.replace(dateMatch[0], '').replace(/\[[^\]]*\]/g, '').trim();
    } else {
      location = rest.replace(/\[[^\]]*\]/g, '').trim();
    }

    list.push({
      number: rowNum,
      name,
      quantity: qty,
      unit,
      location: location || 'Захиалагчийн заасан байршилд',
      deadline: deadline || 'Гэрээнд заасан хугацаанд',
    });
  }

  return list;
}

export function parseTechnicalSpecsTable(
  fullText: string,
  deliverySchedule: DeliveryScheduleItem[] = []
): Array<{ name: string; specs: string; unit: string; qty: string | number }> {
  const items: Array<{ name: string; specs: string; unit: string; qty: string | number }> = [];
  if (!fullText || isGarbledPdfText(fullText)) return items;

  const rawTechSection = isolateChapterSection(fullText, 'tech');
  if (!rawTechSection) return items;

  const targetSection = cleanTechnicalSectionText(rawTechSection);
  if (!targetSection) return items;

  // Format A: Erdenet / SOE / e-procurement "Бараа: 1." or "<Name> Бараа:1." blocks (e.g. 1789440095401, 1789954037794)
  if (/Бараа\s*:\s*\d+/i.test(targetSection)) {
    const parts = targetSection.split(/(?=Бараа\s*:\s*\d+\.?)/i);
    for (let idx = 1; idx < parts.length; idx++) {
      const block = parts[idx];
      const prevBlock = parts[idx - 1] || '';
      const numMatch = block.match(/^Бараа\s*:\s*(\d+)\.?\s*([^\n]*)/i);
      const itemNum = numMatch ? numMatch[1] : String(idx);

      // Item name can be at the end of prevBlock (just before "Бараа:1.") or on the same line after "Бараа: 1."
      const prevLines = prevBlock
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^(?:№|Барааны нэр|Техникийн ерөнхий|Тавигдах шаардлага|Хангах тухай|ТЕХНИКИЙН ТОДОРХОЙЛОЛТ|III БҮЛЭГ)/i.test(l));
      let candidateBefore = prevLines[prevLines.length - 1] || '';
      if (
        prevLines.length >= 2 &&
        (/^дүйцэх\)?$/i.test(candidateBefore) || /^түүнтэй\s*дүйцэх\)?$/i.test(candidateBefore) || (/^[а-яёa-z]/i.test(candidateBefore) && candidateBefore.endsWith(')')))
      ) {
        candidateBefore = `${prevLines[prevLines.length - 2]} ${candidateBefore}`.trim();
      }
      const candidateAfter = (numMatch?.[2] || '').trim();

      let itemName = candidateBefore.length >= 4 && !/^\d+$/.test(candidateBefore) ? candidateBefore : candidateAfter;
      const bodyLines = block
        .replace(/^Бараа\s*:\s*\d+\.?\s*/i, '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // If itemName was on the last line of bodyLines (because the next item's name is at the end of this block), strip next item's name from bodyLines
      if (idx < parts.length - 1 && bodyLines.length > 1) {
        bodyLines.pop();
      }
      if (!itemName && bodyLines.length > 0) {
        itemName = bodyLines.shift() || '';
      }

      const specText = bodyLines
        .filter((l) => !/^(?:№|Барааны нэр|Техникийн ерөнхий|Тавигдах шаардлага|Хангах тухай)$/i.test(l))
        .join(' | ')
        .replace(/\s+/g, ' ')
        .trim();

      const matchedSched =
        deliverySchedule.find((s) => s.number === itemNum) ||
        deliverySchedule.find((s) => itemName && (s.name.includes(itemName.slice(0, 15)) || itemName.includes(s.name.slice(0, 15)))) ||
        deliverySchedule[idx - 1];

      const candidate = {
        name: itemName.replace(/\s+/g, ' ').trim(),
        specs: specText || (matchedSched ? `Хүргэх газар: ${matchedSched.location} | Хугацаа: ${matchedSched.deadline}` : 'Техникийн тодорхойлолтын дагуу'),
        unit: matchedSched?.unit || 'ширхэг',
        qty: matchedSched?.quantity || 1,
      };

      if (!isBoilerplateSpecItem(candidate)) {
        items.push(candidate);
      }
    }
    if (items.length > 0) return items;
  }

  // Format B: Multi-line BoQ / Work Volume table ("1 \n <Work Name> \n <unit> <qty> \n <notes>", e.g. 1789954035036)
  const unitWord = '(?:м3|м2|тн|тонн|ширхэг|ш|ком|комплект|багц|метр|м|кг|литр|л)';
  const lines = targetSection.split('\n').map((l) => l.trim()).filter(Boolean);
  const multiLineItems: Array<{ name: string; specs: string; unit: string; qty: string | number }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^\d{1,2}$/.test(lines[i])) {
      const rowNum = parseInt(lines[i], 10);
      if (rowNum >= 1 && rowNum <= 100 && i + 2 < lines.length) {
        const nextLine1 = lines[i + 1];
        const nextLine2 = lines[i + 2];
        const unitQtyRegex = new RegExp(`^(${unitWord})\\s+(\\d+(?:[\\.,]\\d+)?)$|^(\\d+(?:[\\.,]\\d+)?)\\s*(${unitWord})$`, 'i');
        const m2 = nextLine2.match(unitQtyRegex);
        if (m2 && !/^\d+$/.test(nextLine1)) {
          const unit = (m2[1] || m2[4] || 'ш').toLowerCase();
          const qty = parseFloat((m2[2] || m2[3] || '1').replace(',', '.'));
          const specParts: string[] = [];
          let j = i + 3;
          while (j < lines.length && !/^\d{1,2}$/.test(lines[j]) && !/^(?:Хийгдэх ажлын|Тайлбар|IV БҮЛЭГ)/i.test(lines[j])) {
            specParts.push(lines[j]);
            j++;
          }
          const candidate = {
            name: nextLine1,
            specs: specParts.join(' ').trim() || 'Ажлын тоо хэмжээний дагуу',
            unit,
            qty,
          };
          if (!isBoilerplateSpecItem(candidate)) {
            multiLineItems.push(candidate);
            i = j - 1;
          }
        }
      }
    }
  }
  if (multiLineItems.length > 0) return multiLineItems;

  // If explicit Delivery Schedule rows exist and Format A/B didn't match, use the Delivery Schedule rows directly
  // rather than guessing from numbered requirement paragraphs in Chapter III.
  if (deliverySchedule.length > 0) {
    return deliverySchedule.map((s) => ({
      name: s.name,
      specs: `Хүргэх газар: ${s.location} | Хугацаа: ${s.deadline}`,
      unit: s.unit,
      qty: s.quantity,
    }));
  }

  // Format C: Explicit "Худалдан авах тоо хэмжээ \n 4408м3" or "<qty> ширхэг <equipment name> нийлүүлэх" (e.g. 1789954037772, 1789954035593)
  const explicitQtyMatch = targetSection.match(new RegExp(`(?:Худалдан\\s*авах\\s*тоо\\s*хэмжээ|Нийт\\s*тоо\\s*хэмжээ)[\\s\\:\\n]*(\\d+(?:[\\.,]\\d+)?)\\s*(${unitWord})`, 'i'));
  if (explicitQtyMatch) {
    const qty = parseFloat(explicitQtyMatch[1].replace(',', '.'));
    const unit = explicitQtyMatch[2].toLowerCase();
    const headingLine = lines.find((l) => l.length > 8 && !/^(?:III БҮЛЭГ|ТЕХНИКИЙН|ТАВИГДАХ|1\.)/i.test(l)) || 'Тендерийн үндсэн бараа / материал';
    const candidate = {
      name: headingLine,
      specs: lines.slice(0, 12).join(' | ').substring(0, 400),
      unit,
      qty,
    };
    if (!isBoilerplateSpecItem(candidate)) {
      return [candidate];
    }
  }

  // Format D: Standard numbered rows inside cleaned Chapter III
  let currentItem: { number?: number; name: string; specs: string; unit: string; qty: number | string } | null = null;
  const numRowRegex = /^(\d{1,3})[\.\)]\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:No|№|Д\/д|Барааны нэр|Захиалагчийн|Техникийн тодорхойлолт|Хэмжих нэгж|Тоо хэмжээ|Тавигдах шаардлага|Санамж|Тайлбар)/i.test(line)) {
      continue;
    }
    if (/ҮНИЙН САНАЛЫН МАЯГТ|ТЕНДЕР БЭЛТГЭХ ЗААВАР|IV БҮЛЭГ/i.test(line)) {
      break;
    }

    const match = line.match(numRowRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      const rowTitle = match[2].trim();
      if (num >= 1 && num <= 200 && !isBoilerplateSpecItem({ name: rowTitle })) {
        if (currentItem && !isBoilerplateSpecItem(currentItem)) {
          items.push(currentItem);
        }
        currentItem = {
          number: num,
          name: rowTitle,
          specs: '',
          unit: 'ш',
          qty: 1,
        };
        continue;
      }
    }

    if (currentItem) {
      currentItem.specs = currentItem.specs ? `${currentItem.specs} ${line}` : line;
    }
  }

  if (currentItem && !isBoilerplateSpecItem(currentItem)) {
    items.push(currentItem);
  }

  return items
    .map((item, idx) => {
      let qty: number | string = item.qty || 1;
      let unit = item.unit || 'ш';
      const specs = (item.specs || '').substring(0, 500);
      const textToSearch = `${item.name} ${specs}`;
      const qtyUnitMatch = textToSearch.match(
        new RegExp(`(?<!\\d[\\.,])(\\d+(?:[\\,\\.]\\d+)?)\\s*(?:хүртэл\\s*)?(${unitWord})(?![А-ЯЁа-яёA-Za-z0-9])`, 'i')
      );
      if (qtyUnitMatch) {
        const parsedQty = parseFloat(qtyUnitMatch[1].replace(',', '.'));
        if (parsedQty > 0) {
          qty = parsedQty;
          unit = qtyUnitMatch[2].toLowerCase();
        }
      } else if (deliverySchedule[idx]) {
        qty = deliverySchedule[idx].quantity;
        unit = deliverySchedule[idx].unit;
      }

      return {
        name: item.name,
        specs: specs.trim() || 'Техникийн тодорхойлолтын дагуу',
        unit,
        qty,
      };
    })
    .filter((it) => !isBoilerplateSpecItem(it));
}

// Extract structured specifications and requirements from raw Mongolian PDF text
export function parsePdfContent(fullText: string): ParsedPdfResult {
  const result: ParsedPdfResult = {
    rawSpecText: '',
    fullScopeOfWork: '',
    keyRequirements: [],
    items: [],
    qualifications: [],
    licenses: [],
    personnel: [],
    machinery: [],
    bidSecurityReq: '',
    specialConditions: [],
    deliverySchedule: [],
    foreignEligible: null,
  };

  if (!fullText || isGarbledPdfText(fullText)) return result;

  const bdsSection = isolateChapterSection(fullText, 'bds') || fullText;
  const invitationSection = isolateChapterSection(fullText, 'invitation');
  const rawTechSection = isolateChapterSection(fullText, 'tech');
  const cleanedTechText = cleanTechnicalSectionText(rawTechSection);

  // Extract Special Conditions of Contract (ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ - ГТН)
  result.specialConditions = parseSCC(fullText);

  // Extract Delivery Schedule (БАРАА НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ)
  result.deliverySchedule = parseDeliverySchedule(fullText);

  // Extract Itemized BoQ Table from Technical Specifications (ТЕХНИКИЙН ТОДОРХОЙЛОЛТ)
  const techItems = parseTechnicalSpecsTable(fullText, result.deliverySchedule);
  if (techItems.length > 0) {
    result.items = techItems;
  } else if (result.deliverySchedule.length > 0) {
    result.items = result.deliverySchedule.map((s) => ({
      name: s.name,
      specs: `Хүргэх газар: ${s.location} | Хугацаа: ${s.deadline}`,
      unit: s.unit,
      qty: s.quantity,
    }));
  }

  // 0. Foreign Bidder Eligibility (ТШЗ 12.2 or Invitation Notice #5)
  const tsz12Match = bdsSection.match(/ТШЗ\s*12\.2[\s\S]{0,200}?(Гадаадын\s*этгээд[^\n\.]+)/i);
  const invForeignMatch = (invitationSection || fullText).match(/Гадаадын\s*этгээд\s*тендер\s*ирүүлэх\s*эрхтэй\s*эсэх\s*[\:\-]?\s*(Эрхтэй|Эрхгүй|Тийм|Үгүй)/i);
  if (invForeignMatch) {
    const val = invForeignMatch[1].toLowerCase();
    result.foreignEligible = val.includes('эрхтэй') || val.includes('тийм');
  } else if (tsz12Match) {
    const val = tsz12Match[1].toLowerCase();
    if (val.includes('эрхгүй') || val.includes('оролцохгүй')) result.foreignEligible = false;
    else if (val.includes('эрхтэй')) result.foreignEligible = true;
  }

  // 1. Licenses (ТШЗ 18.4 in 2025/2026 Order A/103, ТШЗ 17.4 in 2023/2024, ТШЗ 16.2 for framework agreements)
  const tsz184Match = bdsSection.match(/ТШЗ\s*18\.4\b([\s\S]{1,1500}?)(?=\n\s*ТШЗ\s*(?:18\.5|19\.|20\.)|$)/i);
  if (tsz184Match) {
    const sec184 = tsz184Match[1].replace(/\[Page\s*\d+\]/gi, ' ').trim();
    if (/Шаардахгүй/i.test(sec184) && !/Шаардана/i.test(sec184)) {
      result.licenses.push('Тусгай зөвшөөрөл шаардахгүй (ТШЗ 18.4)');
    } else {
      const cleanedLic = sec184
        .replace(/^Зөвшөөрөл[\,\s]*эсхүл\s*гэрчилгээ\s*:\s*/i, '')
        .replace(/^Шаардана\.?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedLic.length > 4) {
        result.licenses.push(cleanedLic.substring(0, 350));
      }
    }
  }

  if (result.licenses.length === 0) {
    let licIdx = bdsSection.indexOf('ТШЗ 17.4');
    let isFrameworkLic = false;
    if (licIdx === -1) {
      licIdx = bdsSection.indexOf('ТШЗ 16.2');
      if (licIdx !== -1) isFrameworkLic = true;
    }

    if (licIdx !== -1) {
      const licSection = bdsSection.substring(licIdx, licIdx + 2500);
      const afterFirst = licSection.substring(15);
      const nextTsz = afterFirst.search(/ТШЗ\s*1[789]\./);
      const relevant = nextTsz !== -1 ? afterFirst.substring(0, nextTsz) : afterFirst;
      if (/Шаардахгүй/i.test(relevant) && !/Шаардана/i.test(relevant)) {
        result.licenses.push('Тусгай зөвшөөрөл шаардахгүй');
      } else {
        const lines = relevant.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const l of lines) {
          if (/^\d+[\.\)]\s+/.test(l)) {
            const item = l.replace(/^\d+[\.\)]\s+/, '').trim();
            if (item.length > 5 && !item.toLowerCase().includes('шаардана') && !item.toLowerCase().includes('зөвшөөрөл')) {
              result.licenses.push(item);
            }
          } else if (l.startsWith('•') || l.startsWith('-')) {
            const item = l.replace(/^[•\-]\s*/, '').trim();
            if (item.length > 5) result.licenses.push(item);
          } else if (!isFrameworkLic && l.length > 5 && !l.includes('Шаардана') && !l.includes('Зөвшөөрөл') && !l.includes('ТШЗ')) {
            result.licenses.push(l);
          }
        }
      }
    }
  }

  // 2. Personnel — standard format (Хүний нөөц / "Албан тушаал   Хүний тоо")
  const hrIdx = bdsSection.search(/(?:хүний нөөцийн шаардлага|Албан тушаал\s+Хүний тоо)/i);
  if (hrIdx !== -1) {
    const hrSection = bdsSection.substring(hrIdx, hrIdx + 1400);
    const endHr = hrSection.search(/ТШЗ\s*1[789]\.[12345]/);
    const relevant = endHr !== -1 ? hrSection.substring(0, endHr) : hrSection;
    if (!/Хүний нөөц[\s\:\-]*Шаардахгүй/i.test(relevant)) {
      const rawLines = relevant.split('\n').map((l) => l.trim()).filter(Boolean);
      let startLineIdx = 0;
      for (let i = 0; i < rawLines.length; i++) {
        if (rawLines[i].includes('Мэргэжил') || rawLines[i].includes('туршлага')) {
          startLineIdx = i + 1;
        }
      }
      const bodyLines = rawLines.slice(startLineIdx).join(' ');
      const splitRegex = /(\d{1,2})\s+(\d{1,2}\s*жил(?:ээс доошгүй)?)/g;
      let match;
      const markers: Array<{ index: number; length: number; count: number; exp: string }> = [];
      while ((match = splitRegex.exec(bodyLines)) !== null) {
        markers.push({
          index: match.index,
          length: match[0].length,
          count: parseInt(match[1], 10),
          exp: match[2],
        });
      }

      for (let i = 0; i < markers.length; i++) {
        const cur = markers[i];
        const prevEnd = i === 0 ? 0 : markers[i - 1].index + markers[i - 1].length;
        const roleAndPrevQual = bodyLines.substring(prevEnd, cur.index).trim();

        let role = roleAndPrevQual;
        if (i > 0 && result.personnel.length > 0) {
          const words = roleAndPrevQual.split(' ');
          if (words.length > 2) {
            const splitPoint = Math.max(1, words.length - 2);
            const prevQual = words.slice(0, splitPoint).join(' ');
            role = words.slice(splitPoint).join(' ');
            result.personnel[result.personnel.length - 1].qualification =
              (result.personnel[result.personnel.length - 1].qualification + ' ' + prevQual).trim();
          }
        }

        const nextStart = i + 1 < markers.length ? markers[i + 1].index : bodyLines.length;
        const remaining = bodyLines.substring(cur.index + cur.length, nextStart).trim();

        const cleanRole = role.replace(/Албан тушаал|Хүний тоо|Ажлын туршлага|Мэргэжил|Шаардана/gi, '').replace(/\s+/g, ' ').trim();
        if (cleanRole.length > 1) {
          result.personnel.push({
            role: cleanRole,
            count: cur.count,
            experience: cur.exp,
            qualification: remaining.replace(/\s+/g, ' ').trim(),
          });
        }
      }
    }
  }

  // 3. Machinery & Equipment (ТШЗ 18.1 / 19.1)
  const machIdx = bdsSection.indexOf('ТШЗ 19.1');
  if (machIdx !== -1) {
    const machSection = bdsSection.substring(machIdx, machIdx + 1500);
    const afterFirst = machSection.substring(15);
    const endMach = afterFirst.search(/ТШЗ\s*2[0-9]\./);
    const relevant = endMach !== -1 ? afterFirst.substring(0, endMach) : afterFirst;

    const numItemRegex = /(?:^|\n)\s*(\d+)[\.\)]\s+([\s\S]+?)(?=(?:\n\s*\d+[\.\)]\s+|$))/g;
    let nm;
    const machKeywords = /(автомашин|чиргүүл|кран|механизм|төхөөрөмж|экскаватор|бульдозер|машин|трактор|самосвал|тээврийн хэрэгсэл|грейдер|миксер|конг)/i;
    const docExcludes = /(хөдөлмөр хамгаалал|хувцас|танилцуулга|ажиллах хүч|хуваарь|тшм|маягт|зөвшөөрсөн|гэрээний ерөнхий)/i;

    while ((nm = numItemRegex.exec(relevant)) !== null) {
      const fullItem = nm[2].replace(/\s+/g, ' ').trim();
      if (machKeywords.test(fullItem) && !docExcludes.test(fullItem)) {
        result.machinery.push(fullItem);
      }
    }

    if (result.machinery.length === 0) {
      const lines = relevant.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const l of lines) {
        if (machKeywords.test(l) && !docExcludes.test(l) && !l.includes('ТШЗ') && !l.includes('нотлох баримт') && l.length > 5) {
          result.machinery.push(l.replace(/\s+/g, ' ').trim());
        }
      }
    }
  }

  // 4. Bid Security (ТШЗ 24.1 in 2025/2026 Order A/103, ТШЗ 23.1 in 2023/2024, ТШЗ 22.1, or Invitation #7)
  const sec24Match = bdsSection.match(/ТШЗ\s*2[34]\.1\b([\s\S]{1,500}?)(?=\n\s*ТШЗ\s*2[345]\.|$)/i);
  if (sec24Match) {
    const secBody = sec24Match[1].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (/Шаардахгүй|Үгүй/i.test(secBody) && !/\d[\d\s\,\.]+\s*төгрөг/i.test(secBody)) {
      result.bidSecurityReq = 'Шаардахгүй (Тендерийн баталгаа шаардагдахгүй)';
    } else {
      const amtMatch = secBody.match(/(\d[\d\s\,\.]*\d)\s*төгрөг/i);
      if (amtMatch) {
        const cleanAmt = amtMatch[1].replace(/\s+/g, ',').replace(/,+$/, '').trim();
        result.bidSecurityReq = `${cleanAmt} төгрөг`;
      }
    }
  }
  if (!result.bidSecurityReq && invitationSection) {
    const invSecMatch = invitationSection.match(/Тендерийн\s*баталгаа\s*шаардах\s*эсэх\s*[\:\-]?\s*(Тийм|Үгүй|Шаардахгүй)([\s\S]{0,200})/i);
    if (invSecMatch) {
      if (/Үгүй|Шаардахгүй/i.test(invSecMatch[1])) {
        result.bidSecurityReq = 'Шаардахгүй (Тендерийн баталгаа шаардагдахгүй)';
      } else {
        const amtMatch = invSecMatch[2].match(/(\d[\d\s\,\.]*\d)\s*төгрөг/i);
        if (amtMatch) {
          result.bidSecurityReq = `${amtMatch[1].trim()} төгрөг`;
        }
      }
    }
  }
  if (!result.bidSecurityReq) {
    const sec22Idx = bdsSection.indexOf('ТШЗ 22.1');
    if (sec22Idx !== -1) {
      const sec22Section = bdsSection.substring(sec22Idx, sec22Idx + 500);
      if (sec22Section.includes('Шаардахгүй') || sec22Section.includes('/Шаардахгүй/')) {
        result.bidSecurityReq = 'Шаардахгүй (ТШЗ 22.1 дагуу тендерийн баталгаа шаардагдахгүй)';
      } else if (sec22Section.includes('баталгааны мэдэгдэл') || sec22Section.includes('тоон гарын үсгээр')) {
        result.bidSecurityReq = 'Тендерийн баталгааны мэдэгдэл (Тоон гарын үсгээр баталгаажуулсан цахим мэдэгдэл)';
      }
    }
  }

  // 4b. License & Equipment exemption check
  if (result.licenses.length === 0) {
    if (/ТШЗ\s*1[78]\.[46](?:\.1)?[\s\S]{1,120}?Шаардахгүй/i.test(bdsSection)) {
      result.licenses.push('Тусгай зөвшөөрөл шаардахгүй');
    }
  }
  if (result.machinery.length === 0) {
    if (/(?:ТШЗ\s*17\.6\.3|Техник[\,\s]*тоног\s*төхөөрөмж\s*:)[\s\S]{1,80}?Шаардахгүй/i.test(bdsSection)) {
      result.machinery.push('Үндсэн тоног төхөөрөмж шаардахгүй');
    }
  }

  // 5. Financial & Experience criteria inside bdsSection (NEVER matching Chapter I Table of Contents!)
  const tsz181Idx = bdsSection.search(/ТШЗ\s*1[78]\.[12]\b/);
  const finSearchRegion = tsz181Idx !== -1 ? bdsSection.slice(tsz181Idx, tsz181Idx + 3500) : bdsSection;

  const turnoverSpecific =
    finSearchRegion.match(/Борлуулалтын\s+орлогын\s+хэмжээ\s*[\:\-]\s*([^\n]+(?:\n(?!(?:Түргэн|Ижил|Хүний|Техник|ТШЗ))[^\n]+)*)/i) ||
    finSearchRegion.match(/Борлуулалтын\s+орлого[\s\S]{1,180}?(?:хувиас\s*багагүй[^\n\.]*|Шаардахгүй)/i);
  if (turnoverSpecific) {
    const cleaned = (turnoverSpecific[1] || turnoverSpecific[0])
      .replace(/\[Page\s*\d+\]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!/^Борлуулалтын орлогын хэмжээ[\,\s]*ижил төстэй ажил$/i.test(cleaned)) {
      result.turnoverReq = cleaned.startsWith('Борлуулалтын') ? cleaned : `Борлуулалтын орлого: ${cleaned}`;
    }
  }

  const liquidSpecific =
    finSearchRegion.match(/Түргэн\s+хөрвөх\s+чадвартай\s+хөрөнгө[^\:\n]*[\:\-]\s*([^\n]+(?:\n(?!(?:Борлуулалтын|Ижил|Хүний|Техник|ТШЗ))[^\n]+)*)/i) ||
    finSearchRegion.match(/Түргэн\s+хөрвөх\s+чадвартай[\s\S]{1,160}?(?:хувиас\s*багагүй[^\n\.]*|Шаардахгүй)/i);
  if (liquidSpecific) {
    const cleaned = (liquidSpecific[1] || liquidSpecific[0])
      .replace(/\[Page\s*\d+\]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    result.liquidAssetsReq = cleaned.startsWith('Түргэн') ? cleaned : `Түргэн хөрвөх хөрөнгө: ${cleaned}`;
  }

  const similarSpecific =
    finSearchRegion.match(/Ижил\s+төстэй\s+(?:ажил|бараа)[^\:\n]*[\:\-]\s*([^\n]+(?:\n(?!(?:Борлуулалтын|Түргэн|Хүний|Техник|ТШЗ))[^\n]+)*)/i) ||
    finSearchRegion.match(/ТШЗ\s*17\.6[\s\S]{1,250}?(?:ажил\s*гүйцэтгэсэн\s*байна[^\n]*|гүйцэтгэсэн\s*байх[^\n]*)/i);
  if (similarSpecific) {
    const cleaned = (similarSpecific[1] || similarSpecific[0])
      .replace(/\[Page\s*\d+\]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    result.similarExpReq = cleaned.startsWith('Ижил') ? cleaned : `Ижил төстэй туршлага: ${cleaned}`;
  }

  // 5b. Delivery Period (ТШЗ 17.3), Warranty Period (ТШЗ 17.6), Delivery Location & Incoterms (ТШЗ 21.6)
  const tsz173Match = bdsSection.match(/ТШЗ\s*17\.3\b[\s\S]{0,80}?(?:хуваарь|хугацаа)\s*[\:\-]?\s*([^\n]+(?:\n(?!ТШЗ)[^\n]+)?)/i);
  if (tsz173Match) {
    const cleaned = tsz173Match[1].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned && !isClauseEmptyOrTemplate(cleaned)) {
      result.deliveryPeriod = cleaned;
    }
  }
  if (!result.deliveryPeriod && result.deliverySchedule[0]?.deadline) {
    result.deliveryPeriod = result.deliverySchedule[0].deadline;
  }

  const tsz176Match = bdsSection.match(/ТШЗ\s*17\.6\b[\s\S]{0,60}?Баталгаат\s*хугацаа\s*[\:\-]?\s*([^\n]+)/i);
  if (tsz176Match) {
    const cleaned = tsz176Match[1].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned && !isClauseEmptyOrTemplate(cleaned)) {
      result.warrantyPeriod = cleaned;
    }
  }

  const tsz216Match = bdsSection.match(/ТШЗ\s*21\.6\b[\s\S]{0,80}?Инкотермсийн\s*нөхцөл\s*[\:\-]?\s*([^\n]+(?:\n(?!ТШЗ)[^\n]+)?)/i);
  if (tsz216Match) {
    const cleaned = tsz216Match[1].replace(/\[Page\s*\d+\]/gi, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned && !isClauseEmptyOrTemplate(cleaned)) {
      result.incoterms = cleaned;
      result.deliveryLocation = cleaned;
    }
  }
  if (!result.deliveryLocation && result.deliverySchedule[0]?.location) {
    result.deliveryLocation = result.deliverySchedule[0].location;
  }

  // 6. Build structured keyRequirements & Executive Summary (fullScopeOfWork / rawSpecText)
  const keyReqs: string[] = [];
  if (result.bidSecurityReq) keyReqs.push(`Тендерийн баталгаа: ${result.bidSecurityReq}`);
  if (result.turnoverReq) keyReqs.push(result.turnoverReq);
  if (result.liquidAssetsReq) keyReqs.push(result.liquidAssetsReq);
  if (result.similarExpReq) keyReqs.push(result.similarExpReq);
  if (result.deliveryPeriod) keyReqs.push(`Нийлүүлэх / Гүйцэтгэх хугацаа: ${result.deliveryPeriod}`);
  if (result.warrantyPeriod) keyReqs.push(`Баталгаат хугацаа: ${result.warrantyPeriod}`);
  if (result.deliveryLocation) keyReqs.push(`Хүргэх нөхцөл ба байршил: ${result.deliveryLocation}`);
  if (result.licenses.length > 0) keyReqs.push(`Тусгай зөвшөөрөл: ${result.licenses.join('; ')}`);
  if (result.foreignEligible !== null && result.foreignEligible !== undefined) {
    keyReqs.push(`Гадаадын этгээд оролцох эрх: ${result.foreignEligible ? 'Эрхтэй (Шууд оролцоно)' : 'Эрхгүй (Дотоодын ААН)'}`);
  }
  result.keyRequirements = keyReqs;
  result.qualifications = keyReqs;

  const summaryBlocks: string[] = [];
  if (result.items.length > 0) {
    const itemLines = result.items.slice(0, 15).map((it, idx) => {
      const qtyStr = it.qty ? `${it.qty} ${it.unit || ''}`.trim() : '';
      const specSnippet = it.specs && it.specs !== 'Техникийн тодорхойлолтын дагуу' ? ` — ${it.specs.substring(0, 180)}` : '';
      return `${idx + 1}. ${it.name}${qtyStr ? ` (${qtyStr})` : ''}${specSnippet}`;
    });
    summaryBlocks.push(`📦 НИЙЛҮҮЛЭХ БАРАА / АЖЛЫН ТОО ХЭМЖЭЭ (${result.items.length} нэр төрөл):\n${itemLines.join('\n')}`);
  }

  if (keyReqs.length > 0) {
    summaryBlocks.push(`📋 ТШЗ-ИЙН ГОЛ ШАЛГУУР БА НӨХЦӨЛҮҮД:\n${keyReqs.map((r) => `• ${r}`).join('\n')}`);
  }

  if (cleanedTechText) {
    summaryBlocks.push(`📄 ТЕХНИКИЙН ТОДОРХОЙЛОЛТ / АЖЛЫН ДААЛГАВАР:\n${cleanedTechText.substring(0, 5000)}`);
  } else if (result.specialConditions.length > 0) {
    const sccLines = result.specialConditions.slice(0, 8).map((c) => `• ${c.clause} ${c.title}: ${c.content}`);
    summaryBlocks.push(`⚖️ ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ (ГТН):\n${sccLines.join('\n')}`);
  }

  const finalSummary = summaryBlocks.join('\n\n').trim();
  result.rawSpecText = finalSummary;
  result.fullScopeOfWork = finalSummary;

  return result;
}
let diskBundles: Record<string, LiveExtractionResult> | null = null;

export function loadDiskBundle(invId: string): LiveExtractionResult | undefined {
  if (diskBundles === null) {
    diskBundles = {};
    try {
      const p = path.join(process.cwd(), 'lib', 'live-bundles.json');
      if (fs.existsSync(p)) {
        diskBundles = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {
      console.warn('Could not read lib/live-bundles.json:', e);
    }
  }
  return diskBundles ? diskBundles[invId] : undefined;
}

export function saveDiskBundle(invId: string, bundle: LiveExtractionResult) {
  try {
    const p = path.join(process.cwd(), 'lib', 'live-bundles.json');
    if (diskBundles === null) {
      loadDiskBundle(invId);
    }
    if (diskBundles) {
      diskBundles[invId] = {
        ...bundle,
        pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 30000) : ''
      };
      fs.writeFileSync(p, JSON.stringify(diskBundles, null, 2), 'utf8');
    }
  } catch (e) {
    // ignore on read-only environments
  }
}

export async function fetchTenderLiveBundle(
  invitationId: string | number,
  tenderIdHint?: string | number,
  forceRefresh = false
): Promise<LiveExtractionResult> {
  const invIdStr = String(invitationId);

  if (!forceRefresh) {
    // 1. Check in-memory cache
    const cached = liveCache.get(invIdStr);
    if (cached && hasFreshFetch(cached.data)) {
      return cached.data;
    }

    // 1.5. Check persistent disk bundles (fast, 0ms, works in serverless Vercel)
    const diskBundle = loadDiskBundle(invIdStr);
    if (hasFreshFetch(diskBundle) && diskBundle.documents && diskBundle.documents.length > 0) {
      liveCache.set(invIdStr, { timestamp: Date.now(), data: diskBundle });
      return diskBundle;
    }
  }

  // 2. Check Supabase raw_data
  let tenderDocumentId: number | undefined = undefined;
  let tenderId: number | undefined = tenderIdHint ? Number(tenderIdHint) : undefined;
  let existingRawData: any = null;

  try {
    const reader = supabaseAdmin || supabase;
    const { data: dbRow } = await reader
      .from('tenders')
      .select('raw_data')
      .eq('invitation_id', invitationId)
      .single();

    if (dbRow?.raw_data) {
      existingRawData = dbRow.raw_data;
      if (existingRawData.tenderId) tenderId = Number(existingRawData.tenderId);
      if (
        existingRawData.tenderDocumentId &&
        Number(existingRawData.tenderDocumentId) > 1600000000000 &&
        Number(existingRawData.tenderDocumentId) !== Number(existingRawData.templateId)
      ) {
        tenderDocumentId = Number(existingRawData.tenderDocumentId);
      }
      
      // If already has complete live bundle in raw_data, return directly
      if (
        !forceRefresh &&
        hasFreshFetch(existingRawData.liveBundle) &&
        existingRawData.liveBundle &&
        existingRawData.liveBundle.documents &&
        existingRawData.liveBundle.documents.length > 0
      ) {
        liveCache.set(invIdStr, { timestamp: Date.now(), data: existingRawData.liveBundle });
        return existingRawData.liveBundle;
      }
    }
  } catch (err) {
    // continue on error
  }

  // 3. Scrape tenderDocumentId, tenderId, and subTenders from Next.js RSC detail page
  let subTenders: LiveSubTender[] = [];
  let isFailed = false;

  const detailHtml = (await curlGet(`https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`)) as string;
  if (detailHtml) {
    if (!tenderDocumentId) {
      const docMatch = detailHtml.match(/tenderDocumentId[^\d]{1,20}(\d+)/i);
      if (docMatch) tenderDocumentId = Number(docMatch[1]);
    }

    if (!tenderId) {
      const tenderIdMatch = detailHtml.match(/tenderId[^\d]{1,20}(\d+)/i);
      if (tenderIdMatch) tenderId = Number(tenderIdMatch[1]);
    }

    subTenders = extractSubTendersFromHtml(detailHtml);
    if (subTenders.length > 0) {
      const allFailed = subTenders.every(
        (st) => st.wfmStatusCode === 'TENDER_FAILED' || st.wfmStatusName.includes('Амжилтгүй')
      );
      if (allFailed) {
        isFailed = true;
      }
    }
  }

  const result: LiveExtractionResult = {
    schemaVersion: LIVE_BUNDLE_SCHEMA_VERSION,
    tenderDocumentId,
    tenderId,
    documents: [],
    bidders: [],
    announcementHtml: '',
    subTenders,
    isFailed,
    extractionStatus: 'unavailable',
  };

  // 4. Concurrently fetch:
  // A. Official Documents (gw/153 + gw/88 + gw/106 aggregated)
  // B. Real Bidders Evaluation List (/api/invitation-bidders)
  // C. Official Announcement HTML (/api/get-invitation-by-document-id)
  const promises: Promise<void>[] = [];

  // A. Documents — aggregate all 3 endpoints
  promises.push((async () => {
    const seenFileIds = new Set<number>();
    const allDocs: LiveTenderDocument[] = [];

    // A1. gw/153 — Primary ТШББ
    if (tenderDocumentId) {
      try {
        const docJsonStr = (await curlGet(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocumentId}&offset=1&limit=9999`)) as string;
        if (docJsonStr && docJsonStr.trim().startsWith('[')) {
          const rawDocs = JSON.parse(docJsonStr);
          if (Array.isArray(rawDocs)) {
            for (let idx = 0; idx < rawDocs.length; idx++) {
              const d = rawDocs[idx];
              if (!seenFileIds.has(d.fileId)) {
                seenFileIds.add(d.fileId);
                allDocs.push({
                  fileId: d.fileId,
                  fileName: d.fileName,
                  createdDate: d.createdDate,
                  fileExtention: d.fileExtention || 'pdf',
                  downloadUrl: `/api/download?fileId=${d.fileId}&name=${encodeURIComponent(d.fileName || 'tender.pdf')}${['png', 'jpg', 'jpeg'].includes(String(d.fileExtention || '').toLowerCase()) ? '&allowImage=1' : ''}`,
                  category: 'Тендер шалгаруулалтын үндсэн баримт бичиг (ТШББ)',
                  isPrimary: idx === 0 || (d.fileName && (d.fileName.toLowerCase().includes('тшбб') || d.fileName.toLowerCase().includes('хоолой')))
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch gw/153 documents:', tenderDocumentId, e);
      }
    }

    // A2. gw/88 — Technical addenda / feasibility
    if (tenderDocumentId) {
      try {
        const docJsonStr88 = (await curlGet(`https://www.tender.gov.mn/api/gw/88/list?tenderDocumentId=${tenderDocumentId}`)) as string;
        if (docJsonStr88 && docJsonStr88.trim().startsWith('[')) {
          const rawDocs88 = JSON.parse(docJsonStr88);
          if (Array.isArray(rawDocs88)) {
            for (const d of rawDocs88) {
              if (!seenFileIds.has(d.fileId)) {
                seenFileIds.add(d.fileId);
                allDocs.push({
                  fileId: d.fileId,
                  fileName: d.fileName,
                  createdDate: d.createdDate,
                  fileExtention: d.fileExtention || 'pdf',
                  downloadUrl: `/api/download?fileId=${d.fileId}&name=${encodeURIComponent(d.fileName || 'addendum.pdf')}${['png', 'jpg', 'jpeg'].includes(String(d.fileExtention || '').toLowerCase()) ? '&allowImage=1' : ''}`,
                  category: 'ТЭЗҮ / Техникийн даалгавар (ТД)',
                  isPrimary: false
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch gw/88 documents:', tenderDocumentId, e);
      }
    }

    // A3. gw/106 — Clarification Q&A answer files
    try {
      const docJsonStr106 = (await curlGet(`https://www.tender.gov.mn/api/gw/106/list?invitationId=${invitationId}`)) as string;
      if (docJsonStr106 && docJsonStr106.trim().startsWith('[')) {
        const rawItems106 = JSON.parse(docJsonStr106);
        if (Array.isArray(rawItems106)) {
          for (const item of rawItems106) {
            if (Array.isArray(item.files)) {
              for (const f of item.files) {
                if (!seenFileIds.has(f.fileId)) {
                  seenFileIds.add(f.fileId);
                  allDocs.push({
                    fileId: f.fileId,
                    fileName: f.fileName,
                    createdDate: f.createdDate,
                    fileExtention: f.fileExtention || 'pdf',
                    downloadUrl: `/api/download?fileId=${f.fileId}&name=${encodeURIComponent(f.fileName || 'clarification.pdf')}${['png', 'jpg', 'jpeg'].includes(String(f.fileExtention || '').toLowerCase()) ? '&allowImage=1' : ''}`,
                    category: 'Тодруулгын хариу / Нэмэлт баримт',
                    isPrimary: false
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch gw/106 clarification files:', invitationId, e);
    }

    if (allDocs.length > 0) {
      result.documents = allDocs;
    }
  })());

  // B. Bidders
  if (tenderId && invitationId) {
    promises.push((async () => {
      try {
        const biddersJsonStr = await curlPostJson('https://www.tender.gov.mn/api/invitation-bidders', {
          tenderId,
          invitationId: Number(invitationId)
        });
        if (biddersJsonStr) {
          const parsed = JSON.parse(biddersJsonStr);
          if (Array.isArray(parsed?.data)) {
            result.bidders = parsed.data.map((b: any) => ({
              bidderTenderId: b.bidderTenderId,
              bidderId: b.bidderId,
              supplierId: b.supplierId,
              supplierName: b.supplierName || 'Нэргүй оролцогч',
              registerNumber: b.registerNumber || '',
              openedBidderPrice: Number(b.openedBidderPrice) || 0,
              discountedAmount: Number(b.discountedAmount) || Number(b.openedBidderPrice) || 0,
              wfmStatusCode: b.wfmStatusCode || '',
              wfmStatusName: b.wfmStatusName || 'Шалгагдаж буй',
              wfmStatusColor: b.wfmStatusColor || (b.wfmStatusName === 'Шалгарсан' ? '#40C240' : '#fc0362'),
              commentText: b.commentText || '',
              noticeDateString: b.noticeDateString || '',
              guaranteeText: b.guaranteeText || '',
              fileId: b.fileId,
              fileName: b.fileName,
              decisionDownloadUrl: b.fileId ? `/api/download?fileId=${b.fileId}&name=${encodeURIComponent(b.fileName || 'decision.pdf')}` : undefined
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch bidders for tenderId:', tenderId, e);
      }
    })());
  }

  // C. Announcement HTML
  if (tenderDocumentId) {
    promises.push((async () => {
      try {
        const annJsonStr = (await curlGet(`https://www.tender.gov.mn/api/get-invitation-by-document-id?tenderDocumentId=${tenderDocumentId}&invitationTypeId=1`)) as string;
        if (annJsonStr) {
          const parsed = JSON.parse(annJsonStr);
          if (parsed?.data?.body) {
            result.announcementHtml = parsed.data.body;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch announcement HTML:', e);
      }
    })());
  }

  await Promise.all(promises);

  // 5. Download and extract text from attached dossier documents (ТШББ + ТД / Техникийн даалгавар)
  let combinedPdfText = '';
  let verbatimPdfText = '';
  let totalPageCount = 0;
  const docsToParse = result.documents.filter((doc) => {
    if (!doc.fileId) return false;
    const ext = (doc.fileExtention || '').toLowerCase();
    return ext === 'pdf' || !ext || ['png', 'jpg', 'jpeg'].includes(ext);
  });

  for (const doc of docsToParse) {
    if (!doc.fileId) continue;
    try {
      const ext = (doc.fileExtention || '').toLowerCase();
      const { buffer: fileBuffer, contentType } = await fetchVerifiedAttachment(doc.fileId, true);
      if (contentType !== 'application/pdf') {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('mon+eng');
        try {
          const ocrRes = await worker.recognize(fileBuffer);
          const ocrText = String(ocrRes?.data?.text || '').trim();
          if (ocrText.length > 20) {
            doc.isScannedOcr = true;
            doc.ocrModel = 'Tesseract OCR';
            doc.extractionStatus = 'text_extracted';
            doc.extractedPageCount = 1;
            doc.totalPageCount = 1;
            result.isScannedOcr = true;
            totalPageCount += 1;
            const marker = `--- DOCUMENT ${doc.fileId}: ${doc.fileName} ---`;
            verbatimPdfText += `\n\n${marker}\n[Image OCR; page 1]\n${ocrText}`;
            combinedPdfText += `\n\n${marker}\n[Image OCR; page 1]\n${ocrText}`;
          } else {
            doc.extractionStatus = 'partial';
            doc.extractedPageCount = 0;
            doc.totalPageCount = 1;
          }
        } finally {
          await worker.terminate();
        }
        continue;
      }

      const pageTexts: string[] = [];
      const parsedPdf = await pdf(fileBuffer, {
        pagerender: async (page: any) => {
          const pageData = await page.getTextContent();
          let lastY: number | null = null;
          let text = '';
          for (const item of pageData.items || []) {
            const str = typeof item?.str === 'string' ? item.str : '';
            const y = Array.isArray(item?.transform) ? item.transform[5] : null;
            if (lastY === null || y === null || Math.abs(y - lastY) <= 2) {
              text += (text && !text.endsWith('\n') && !text.endsWith(' ') ? ' ' : '') + str;
            } else {
              text += '\n' + str;
            }
            if (y !== null) lastY = y;
          }
          const pageText = text
            .split('\n')
            .map((l) => l.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join('\n');
          pageTexts.push(pageText);
          return pageText;
        },
      });
      const pageCount = Number(parsedPdf.numpages) || pageTexts.length || 0;
      totalPageCount += pageCount;
      doc.totalPageCount = pageCount;
      const extractedPages = pageTexts.map((text, index) => ({ text, page: index + 1 }));
      const makePageText = () => extractedPages
        .filter((page) => page.text.length > 0)
        .map((page) => `[Page ${page.page}]\n${page.text}`)
        .join('\n\n');
      let extractedDocText = makePageText();
      let textPageCount = extractedPages.filter((page) => page.text.length > 20).length;
      doc.extractedPageCount = textPageCount;

      if (extractedDocText.length > 30) {
        doc.extractionStatus = textPageCount >= pageCount ? 'text_extracted' : 'partial';
      }

      const sparsePageNumbers = extractedPages
        .filter((page) => page.text.length < 200)
        .map((page) => page.page);
      const hasEmbeddedImages = [
        '/Subtype /Image', '/Subtype/Image', 'DCTDecode', 'CCITTFaxDecode',
      ].some((marker) => fileBuffer.includes(Buffer.from(marker, 'latin1')));
      const mayContainScannedPages = isScannedPdf(fileBuffer, extractedDocText.length) || (hasEmbeddedImages && sparsePageNumbers.length > 0);

      if (mayContainScannedPages) {
        doc.extractionStatus = 'scanned_not_processed';
        try {
          const renderedOcr = await ocrSparsePdfPages(fileBuffer, pageCount, sparsePageNumbers);
          if (renderedOcr && renderedOcr.length > 0) {
            for (const pageResult of renderedOcr) {
              const page = extractedPages[pageResult.page - 1];
              if (page && pageResult.text) {
                page.text = [page.text, `[OCR: Tesseract.js]\n${pageResult.text}`].filter(Boolean).join('\n');
              }
            }

            textPageCount = extractedPages.filter((page) => page.text.length > 20).length;
            doc.extractedPageCount = textPageCount;
            doc.isScannedOcr = true;
            doc.ocrModel = 'Tesseract.js + Poppler page rendering';
            doc.extractionStatus = textPageCount >= pageCount ? 'text_extracted' : 'ocr_partial';
            result.isScannedOcr = true;
            extractedDocText = makePageText();
          }

          // If native page rendering is unavailable, retain the explicitly labeled
          // sampled vision fallback; never describe those image indexes as PDF pages.
          if (!renderedOcr || renderedOcr.length === 0) {
            const pageImages = extractJpegImagesFromPdfBuffer(fileBuffer, 3);
            if (pageImages.length > 0) {
              const visionResult = await extractScannedPdfWithVision(pageImages, doc.fileName);
              if (visionResult?.text) {
                const ocrText = `[AI OCR excerpt; sampled ${pageImages.length} embedded image(s); physical PDF page mapping unavailable]\n${visionResult.text}`;
                extractedDocText = extractedDocText
                  ? `${extractedDocText}\n\n${ocrText}`
                  : ocrText;
                doc.isScannedOcr = true;
                doc.ocrModel = visionResult.modelUsed;
                doc.extractionStatus = 'ocr_partial';
                doc.ocrSampleCount = pageImages.length;
                result.isScannedOcr = true;
              }
            }
          }
        } catch (visionErr) {
          console.warn(`Vision OCR extraction error for ${doc.fileName}:`, visionErr);
        }
      }

      if (extractedDocText.length > 30) {
        const marker = `--- DOCUMENT ${doc.fileId}: ${doc.fileName} ---`;
        const section = `\n\n${marker}\n${extractedDocText}`;
        combinedPdfText += section;
        // Page-labeled source text and page-rendered OCR are safe for extraction;
        // sampled vision OCR stays in the raw evidence only because its pages are unmapped.
        const directText = extractedPages
          .filter((page) => page.text.length > 0)
          .map((page) => `[Page ${page.page}]\n${page.text}`)
          .join('\n\n');
        if (directText.length > 30) verbatimPdfText += `\n\n${marker}\n${directText}`;
      } else if (!doc.extractionStatus) {
        doc.extractionStatus = 'not_extracted';
      }
    } catch (pdfErr) {
      doc.extractionStatus = 'source_error';
      console.warn(`File parsing error for ${doc.fileName} (${doc.fileId}):`, pdfErr);
    }
  }

  const priorBundle = existingRawData?.liveBundle as LiveExtractionResult | undefined;

  // 5b. Fallback: If tender.gov.mn was blocked by Cloudflare (no PDF text extracted),
  // download and parse directly from stored Supabase Storage PDF URL if available.
  const storedSupabasePdfUrl =
    existingRawData?.pdfUrl ||
    priorBundle?.documents?.find((d: any) => typeof d?.downloadUrl === 'string' && d.downloadUrl.includes('supabase.co'))?.downloadUrl;

  if (combinedPdfText.trim().length <= 30 && storedSupabasePdfUrl && typeof storedSupabasePdfUrl === 'string' && storedSupabasePdfUrl.startsWith('http')) {
    try {
      const resp = await fetch(storedSupabasePdfUrl);
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        const fileBuffer = Buffer.from(ab);
        const parsedPdf = await pdf(fileBuffer);
        const rawText = String(parsedPdf?.text || '').trim();
        const pageCount = Number(parsedPdf?.numpages) || 1;
        totalPageCount = pageCount;
        const storedFileName =
          existingRawData?.pdfFileName ||
          priorBundle?.documents?.[0]?.fileName ||
          `ТШББ_${invitationId}.pdf`;

        const isGarbled = isGarbledPdfText(rawText);
        if (!isGarbled && rawText.length > 30) {
          combinedPdfText = rawText;
          verbatimPdfText = rawText;
        }
        result.documents = [
          {
            fileId: priorBundle?.documents?.[0]?.fileId || Number(invitationId),
            fileName: storedFileName,
            createdDate: priorBundle?.documents?.[0]?.createdDate,
            fileExtention: 'pdf',
            downloadUrl: storedSupabasePdfUrl,
            category: 'Тендер шалгаруулалтын үндсэн баримт бичиг (ТШББ)',
            isPrimary: true,
            extractionStatus: !isGarbled && rawText.length > 30 ? 'text_extracted' : 'scanned_not_processed',
            extractedPageCount: !isGarbled && rawText.length > 30 ? pageCount : 0,
            totalPageCount: pageCount,
          },
        ];
      }
    } catch (storedErr) {
      console.warn(`Stored Supabase PDF parse error for ${invitationId}:`, storedErr);
    }
  }

  if (combinedPdfText.trim().length > 30) {
    result.pdfText = combinedPdfText.trim();
    const parsedFromText = parsePdfContent(verbatimPdfText.trim());
    result.structuredSpecs = parsedFromText;
    (result as any).fullScopeOfWork = parsedFromText.fullScopeOfWork;
  }

  const priorManualDocs = priorBundle?.documents?.filter((doc) => doc.source === 'manual_upload') || [];
  if (priorManualDocs.length > 0 && priorBundle) {
    const manualIds = new Set(priorManualDocs.map((doc) => String(doc.id || doc.fileId || '')));
    const manualSections = String(priorBundle.pdfText || '')
      .split(/(?=---\s*DOCUMENT\s+[^:]+:)/i)
      .filter((section) => Array.from(manualIds).some((id) => id && section.startsWith(`--- DOCUMENT ${id}:`)))
      .join('\n\n')
      .trim();
    result.documents = [
      ...result.documents,
      ...priorManualDocs.filter((manualDoc) => !result.documents.some((doc) => doc.id && doc.id === manualDoc.id)),
    ];
    if (manualSections) {
      result.pdfText = [manualSections, result.pdfText].filter(Boolean).join('\n\n');
    }
    totalPageCount += priorManualDocs.reduce((sum, doc) => sum + (Number(doc.totalPageCount) || 0), 0);
    result.structuredSpecs = preserveMissingStructuredSpecs(result.structuredSpecs, priorBundle.structuredSpecs);
    result.isScannedOcr = Boolean(result.isScannedOcr || priorBundle.isScannedOcr);
  }
  if (totalPageCount > 0) result.pdfPageCount = totalPageCount;

  const processedDocs = result.documents.filter((doc) => ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus || ''));
  result.extractionStatus = result.documents.length === 0
    ? 'unavailable'
    : processedDocs.length === result.documents.length && result.documents.every((doc) => doc.extractionStatus === 'text_extracted')
      ? 'complete'
      : processedDocs.length > 0
        ? 'partial'
        : 'unavailable';
  result.fetchedAt = new Date().toISOString();
  // Keep the last good extraction visible if the source portal temporarily denies a refresh.
  const readableDocumentCount = result.documents.filter((doc) =>
    ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus || '')
  ).length;
  const priorReadableDocumentCount = priorBundle?.documents?.filter((doc) =>
    ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus || '')
  ).length || (hasPriorExtractedText(priorBundle) ? 1 : 0);
  const priorHasBetterCoverage = hasPriorExtractedText(priorBundle) && (
    result.documents.length === 0 ||
    readableDocumentCount === 0 ||
    (priorBundle.extractionStatus === 'complete' && result.extractionStatus !== 'complete') ||
    (priorReadableDocumentCount > readableDocumentCount &&
      (result.pdfText?.length || 0) < (priorBundle.pdfText?.length || 0) * 0.75)
  );
  if (priorHasBetterCoverage && priorBundle) {
    return { ...priorBundle, stale: true, lastFetchAttemptAt: result.fetchedAt };
  }

  // Vercel filesystems are ephemeral/read-only at runtime; Supabase is the durable bundle store.
  liveCache.set(invIdStr, { timestamp: Date.now(), data: result });

  // 7. Persist to Supabase raw_data (store structured text, not heavy binary)
  try {
    if (!supabaseAdmin) {
      console.warn('Live bundle was extracted but not persisted: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return result;
    }
    // Retain page-labelled text for source-aware detail and AI retrieval.
    const dbSafeResult = {
      ...result,
      pdfText: result.pdfText ? result.pdfText.substring(0, 300000) : ''
    };
    const { data: updatedRows, error } = await supabaseAdmin.rpc('merge_tender_live_bundle', {
      p_invitation_id: String(invitationId),
      p_live_bundle: dbSafeResult,
      p_tender_document_id: result.tenderDocumentId ?? null,
      p_tender_id: result.tenderId ?? null,
    });
    if (error) console.warn('Could not persist liveBundle to Supabase:', error.message);
    else if (updatedRows === 0) console.warn(`Could not persist liveBundle: tender ${invitationId} was not found in Supabase.`);
  } catch (dbErr) {
    console.warn('Could not persist liveBundle to Supabase:', dbErr);
  }

  return result;
}

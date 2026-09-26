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
  items?: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
  qualifications?: string[];
  turnoverReq?: string;
  similarExpReq?: string;
  liquidAssetsReq?: string;
  warrantyMonths?: number;
  licenses?: string[];
  personnel?: Array<{ role: string; count: number; qualification: string; experience?: string }>;
  machinery?: string[];
  bidSecurityReq?: string;
  specialConditions?: SpecialConditionClause[];
  deliverySchedule?: DeliveryScheduleItem[];
}

export interface ParsedPdfResult extends StructuredSpecs {
  rawSpecText: string;
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

export function parseDeliverySchedule(fullText: string): DeliveryScheduleItem[] {
  if (!fullText) return [];
  const schedIdx = fullText.lastIndexOf('БАРАА НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ');
  if (schedIdx === -1) return [];

  const text = fullText.substring(schedIdx);
  const endIdx = text.search(/IV БҮЛЭГ|ТЕХНИКИЙН ТОДОРХОЙЛОЛТ|ГЭРЭЭНИЙ НӨХЦӨЛ/);
  const schedSection = endIdx !== -1 ? text.substring(0, endIdx) : text.substring(0, 6000);

  const rowRegex = /(?:^|\n)\s*(\d{1,2})\s*\n\s*([А-ЯЁа-яёA-Za-z0-9\s\-–\/\.\(\)]+?)\s+([\d\s\,\.]+)\s+(М3|м3|М2|м2|Тонн|тн|ш|ширхэг|ком|багц|метр|м|комплект|кг|литр|л)\b([\s\S]*?)(?=(?:\n\s*\d{1,2}\s*\n\s*[А-ЯЁа-яё]|\n\s*IV БҮЛЭГ|$))/gi;
  
  const list: DeliveryScheduleItem[] = [];
  let m;
  while ((m = rowRegex.exec(schedSection)) !== null) {
    const rowNum = m[1];
    let name = m[2].replace(/\s+/g, ' ').trim();
    name = name.replace(/^[0-9\s]+/, '').replace(/^No\s*/i, '').trim();
    const qty = m[3].replace(/\s+/g, '').replace(',', '.');
    const unit = m[4].trim();
    const rest = m[5].replace(/\s+/g, ' ').trim();

    if (name.includes('Барааны нэр') || name.includes('Тоо хэмжээ') || name.length < 2) continue;

    let deadline = '';
    let location = '';
    const dateMatch = rest.match(/(\d{4}\s*оны[^\.]*?(?:дотор|хүртэл)|[0-9]{1,3}\s*хоног[^\.]*?(?:дотор|хүртэл))/i);
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
      deadline: deadline || 'Гэрээнд заасан хугацаанд'
    });
  }

  return list;
}

// Extract structured specifications and requirements from raw Mongolian PDF text
export function parsePdfContent(fullText: string): ParsedPdfResult {
  const result: ParsedPdfResult = {
    rawSpecText: '',
    items: [],
    qualifications: [],
    licenses: [],
    personnel: [],
    machinery: [],
    bidSecurityReq: '',
    specialConditions: [],
    deliverySchedule: [],
  };

  if (!fullText) return result;

  // Extract Special Conditions of Contract (ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ - ГТН)
  result.specialConditions = parseSCC(fullText);

  // Extract Delivery Schedule (БАРАА НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ)
  result.deliverySchedule = parseDeliverySchedule(fullText);
  if (result.deliverySchedule.length > 0) {
    result.items = result.deliverySchedule.map(s => ({
      name: s.name,
      specs: `Хүргэх газар: ${s.location} | Хугацаа: ${s.deadline}`,
      unit: s.unit,
      qty: s.quantity
    }));
  }

  // 1. Licenses (ТШЗ 17.4 for standard tenders, ТШЗ 16.2 for framework agreements)
  let licIdx = fullText.indexOf('ТШЗ 17.4');
  let isFrameworkLic = false;
  if (licIdx === -1) {
    licIdx = fullText.indexOf('ТШЗ 16.2');
    if (licIdx !== -1) isFrameworkLic = true;
  }

  if (licIdx !== -1) {
    const licSection = fullText.substring(licIdx, licIdx + 2500);
    const afterFirst = licSection.substring(15);
    const nextTsz = afterFirst.search(/ТШЗ\s*1[789]\./);
    const relevant = nextTsz !== -1 ? afterFirst.substring(0, nextTsz) : afterFirst;
    const lines = relevant.split('\n').map(l => l.trim()).filter(Boolean);
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

  // 2. Personnel — standard format (Хүний нөөц / "Албан тушаал   Хүний тоо")
  const hrIdx = fullText.search(/(?:хүний нөөцийн шаардлага|Албан тушаал\s+Хүний тоо)/i);
  if (hrIdx !== -1) {
    const hrSection = fullText.substring(hrIdx, hrIdx + 1200);
    const endHr = hrSection.search(/ТШЗ\s*17\.1/);
    const relevant = endHr !== -1 ? hrSection.substring(0, endHr) : hrSection;
    const rawLines = relevant.split('\n').map(l => l.trim()).filter(Boolean);
    
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
          qualification: remaining.replace(/\s+/g, ' ').trim()
        });
      }
    }
  }

  // 2b. Personnel — framework agreement format ("Албан тушаал ... Орон тоо ... Боловсрол")
  if (result.personnel.length === 0) {
    const altHrIdx = fullText.search(/Албан\s*тушаал[\s\S]{1,100}Орон\s*тоо/i);
    if (altHrIdx !== -1) {
      const hrSection = fullText.substring(altHrIdx, altHrIdx + 1200);
      const endHr = hrSection.search(/ТШЗ\s*1[6789]\./);
      const relevant = endHr !== -1 ? hrSection.substring(0, endHr) : hrSection;
      const lines = relevant.split('\n').map(l => l.trim()).filter(Boolean);

      let dataStartIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/(?:ур чадвар|хүний тоо|орон тоо)/i.test(lines[i])) {
          dataStartIdx = i + 1;
        }
      }

      if (dataStartIdx !== -1 && dataStartIdx < lines.length) {
        const dataLines = lines.slice(dataStartIdx);
        const roleParts: string[] = [];
        let count = 0;
        const qualParts: string[] = [];
        let state: 'role' | 'qual' = 'role';

        for (const l of dataLines) {
          // Skip row-number + "Бүх багц" header-like lines
          if (/^\d+\s+(?:Бүх багц|\d+)/i.test(l) || /^(?:Бүх багц)\s*$/i.test(l)) continue;
          if (/^\d+$/.test(l)) {
            count = parseInt(l, 10);
            state = 'qual';
            continue;
          }
          if (state === 'role') {
            roleParts.push(l);
          } else if (state === 'qual') {
            qualParts.push(l);
          }
        }

        if (roleParts.length > 0 && count > 0) {
          result.personnel.push({
            role: roleParts.join(' ').replace(/\s+/g, ' ').trim(),
            count,
            qualification: qualParts.join(' ').replace(/ТШЗ[\s\S]*$/, '').replace(/\s+/g, ' ').trim(),
            experience: 'Шаардлагын дагуу'
          });
        }
      }
    }
  }

  // 3. Machinery & Equipment (ТШЗ 19.1)
  const machIdx = fullText.indexOf('ТШЗ 19.1');
  if (machIdx !== -1) {
    const machSection = fullText.substring(machIdx, machIdx + 1500);
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

    // Fallback if no numbered items found
    if (result.machinery.length === 0) {
      const lines = relevant.split('\n').map(l => l.trim()).filter(Boolean);
      for (const l of lines) {
        if (machKeywords.test(l) && !docExcludes.test(l) && !l.includes('ТШЗ') && !l.includes('нотлох баримт') && l.length > 5) {
          result.machinery.push(l.replace(/\s+/g, ' ').trim());
        }
      }
    }
  }

  // 3b. Food/logistics storage requirements (for framework agreement food tenders)
  if (result.machinery.length === 0) {
    if (fullText.includes('зориулалтын тээврийн хэрэгсэл') || fullText.includes('тээврийн хэрэгсэл')) {
      result.machinery.push('Ариун цэвэр, эрүүл ахуйн шаардлага хангасан зориулалтын тээврийн хэрэгсэл');
    }
    if (fullText.includes('хадгалах агуулах') || fullText.includes('агуулахтай байх')) {
      result.machinery.push('Зориулалтын хүнс хадгалах агуулах (Эзэмшил эсхүл түрээсийн гэрээтэй)');
    }
  }

  // 4. Bid Security (ТШЗ 23.1 amount or ТШЗ 22.1 digital declaration / exemption)
  const secIdx = fullText.indexOf('ТШЗ 23.1');
  if (secIdx !== -1) {
    const secSection = fullText.substring(secIdx, secIdx + 500);
    const secMatch = secSection.match(/([\d\s\,\.]+)\s*төгрөг/);
    if (secMatch) {
      const rawNumberStr = secMatch[1].trim();
      const parts = rawNumberStr.split(/\s{2,}|\n/);
      const cleanAmt = parts.pop()?.trim() || rawNumberStr;
      result.bidSecurityReq = `${cleanAmt} төгрөг`;
    }
  }
  if (!result.bidSecurityReq) {
    const sec22Idx = fullText.indexOf('ТШЗ 22.1');
    if (sec22Idx !== -1) {
      const sec22Section = fullText.substring(sec22Idx, sec22Idx + 500);
      if (sec22Section.includes('Шаардахгүй') || sec22Section.includes('/Шаардахгүй/')) {
        result.bidSecurityReq = 'Шаардахгүй (ТШЗ 22.1 дагуу тендерийн баталгаа шаардагдахгүй)';
      } else if (sec22Section.includes('баталгааны мэдэгдэл') || sec22Section.includes('тоон гарын үсгээр')) {
        result.bidSecurityReq = 'Тендерийн баталгааны мэдэгдэл (Тоон гарын үсгээр баталгаажуулсан цахим мэдэгдэл)';
      }
    }
  }
  if (!result.bidSecurityReq) {
    const noBidSec = fullText.match(/(?:Тендерийн\s+баталгаа|ТШЗ\s*22\.1)[\s\S]{1,100}?(?:Шаардахгүй|\/Шаардахгүй\/|"Шаардахгүй")/i);
    if (noBidSec) {
      result.bidSecurityReq = 'Шаардахгүй (ТШЗ 22.1 дагуу тендерийн баталгаа шаардагдахгүй)';
    }
  }

  // 4b. License & Equipment exemption check (ТШЗ 17.6.1 & 17.6.3)
  if (result.licenses.length === 0) {
    const noLicMatch = fullText.match(/ТШЗ\s*17\.6\.1[\s\S]{1,120}?Шаардахгүй/i);
    if (noLicMatch) {
      result.licenses.push('Тусгай зөвшөөрөл шаардахгүй (ТШЗ 17.6.1-ийн дагуу ямар нэг тусгай зөвшөөрөл шаардагдахгүй)');
    }
  }
  if (result.machinery.length === 0) {
    const noMachMatch = fullText.match(/ТШЗ\s*17\.6\.3[\s\S]{1,120}?Шаардахгүй/i);
    if (noMachMatch) {
      result.machinery.push('Үндсэн тоног төхөөрөмж шаардахгүй (ТШЗ 17.6.3-ын дагуу)');
    }
  }

  // 5. Financial criteria (ТШЗ 17.2.4 & 17.2.5 / 17.1 & 18.1)
  const turnoverMatch = fullText.match(/Борлуулалтын\s+орлого[\s\S]{1,150}?(?:хувиас\s*багагүй|байна)/i) ||
                        fullText.match(/Борлуулалтын\s+орлогын\s+хэмжээ[^\.\n;]+(?:[0-9]{1,3}\s*хувиас|[^\.\n;]+)/i) ||
                        fullText.match(/борлуулалтын\s+орлого[^\.\n;]+/i);
  if (turnoverMatch) {
    result.turnoverReq = turnoverMatch[0].replace(/\s+/g, ' ').trim();
  }

  const similarMatch = fullText.match(/ТШЗ\s*17\.6[\s\S]{1,250}?(?:ажил\s*гүйцэтгэсэн\s*байна[^\n]*|гүйцэтгэсэн\s*байх[^\n]*)/i) ||
                       fullText.match(/Ижил төстэй ажил[^\.\n;]+/i) ||
                       fullText.match(/Ижил төстэй бараа[^\.\n;]+/i) ||
                       fullText.match(/Ижил төстэй[^\.\n;]+/i);
  if (similarMatch) {
    result.similarExpReq = similarMatch[0].replace(/\s+/g, ' ').trim();
  }

  const liquidMatch = fullText.match(/Түргэн\s+хөрвөх\s+чадвартай[\s\S]{1,150}?(?:хувиас\s*багагүй|багагүй\s*байх)/i) ||
                      fullText.match(/Түргэн хөрвөх чадвартай хөрөнгө[^\.\n;]+/i);
  if (liquidMatch) {
    result.liquidAssetsReq = liquidMatch[0].replace(/\s+/g, ' ').trim();
  }

  // 6. Look for Chapter III / Technical Specifications section
  const specKeywords = [
    'БАРАА МАТЕРИАЛ НИЙЛҮҮЛЭХ ХУГАЦАА',
    'БАРАА МАТЕРИАЛЫН ҮЗҮҮЛЭЛТ',
    'Барааны техникийн үзүүлэлт',
    'ТЕХНИКИЙН ҮЗҮҮЛЭЛТ',
    'НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ',
    'Бараа нийлүүлэлтийн хуваарь',
    'ТЕХНИКИЙН ТОДОРХОЙЛОЛТ',
    'III БҮЛЭГ',
    'АЖЛЫН ДААЛГАВАР'
  ];

  let specStart = -1;
  let bestSection = '';
  for (const kw of specKeywords) {
    const pos = fullText.lastIndexOf(kw);
    if (pos !== -1) {
      if (specStart === -1 || pos > specStart) {
        specStart = pos;
      }
      const slice = fullText.substring(pos, pos + 25000);
      if (slice.length > bestSection.length) {
        bestSection = slice;
      }
    }
  }

  if (specStart !== -1) {
    const candidateSlice = fullText.substring(specStart, specStart + 6000);
    const endPos = candidateSlice.search(/(IV БҮЛЭГ|V БҮЛЭГ|VI БҮЛЭГ|ГЭРЭЭНИЙ НӨХЦӨЛ)/);
    result.rawSpecText = (endPos !== -1 ? candidateSlice.substring(0, endPos) : candidateSlice).trim();
  }

  // Do not guess line items from arbitrary paragraphs with quantity-like numbers.
  // Only the separately parsed, explicitly titled delivery schedule is kept.
  return result;

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
          const pageText = (pageData.items || [])
            .map((item: any) => typeof item?.str === 'string' ? item.str : '')
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
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
  if (combinedPdfText.trim().length > 30) {
    result.pdfText = combinedPdfText.trim();
    const parsedFromText = parsePdfContent(verbatimPdfText.trim());
    result.structuredSpecs = parsedFromText;
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

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { supabaseAdmin as supabase } from './supabase';
import { SpecialConditionClause, DeliveryScheduleItem, LiveSubTender } from './types';
import {
  extractJpegImagesFromPdfBuffer,
  isScannedPdf,
  extractScannedPdfWithVision
} from './pdf-vision-extractor';

export interface LiveTenderDocument {
  fileId: number;
  fileName: string;
  createdDate?: string;
  fileExtention?: string;
  downloadUrl: string;
  isPrimary?: boolean;
  category?: string;
  isScannedOcr?: boolean;
  ocrModel?: string;
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
}

// In-memory cache for fast sub-millisecond retrieval
const liveCache = new Map<string, { timestamp: number; data: LiveExtractionResult }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

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
    }, (err, stdout) => {
      if (err || !stdout) {
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
    const rawTitle = m[3].replace(/\s+/g, ' ').trim();
    let content = m[4].replace(/\s+/g, ' ').trim();

    content = content.replace(/\[[^\]]*\]/g, '').trim();

    let title = rawTitle;
    if (!title) {
      if (num === '2.5') title = 'Бараа нийлүүлэх газар';
      else if (num === '2.6') title = 'Бараа нийлүүлэх хугацаа';
      else if (num === '2.10') title = 'Бараа хүлээлгэн өгөх нөхцөл';
      else if (num === '2.14') title = 'Баглаа, боодол';
      else if (num === '3.8') title = 'Үнийн тохируулга';
      else if (num === '3.9') title = 'Төлбөр төлөх хугацаа';
      else if (num === '4.2') title = 'Даатгал';
      else if (num === '4.10') title = 'Баталгаат хугацаа';
      else if (num === '4.11') title = 'Чанарын баталгаа';
      else if (num === '4.17') title = 'Нийлүүлэгчийн төлөх алданги';
      else if (num === '4.18') title = 'Захиалагчийн төлөх алданги';
      else title = `Тусгай нөхцөл ${num}`;
    }

    if (content.length > 0) {
      list.push({
        clause: `${prefix} ${num}`,
        title,
        content
      });
    }
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

  // 4. Bid Security (ТШЗ 23.1 amount or ТШЗ 22.1 digital declaration)
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
  } else {
    const sec22Idx = fullText.indexOf('ТШЗ 22.1');
    if (sec22Idx !== -1) {
      const sec22Section = fullText.substring(sec22Idx, sec22Idx + 500);
      if (sec22Section.includes('баталгааны мэдэгдэл') || sec22Section.includes('тоон гарын үсгээр')) {
        result.bidSecurityReq = 'Тендерийн баталгааны мэдэгдэл (Тоон гарын үсгээр баталгаажуулсан цахим мэдэгдэл)';
      }
    }
  }

  // 5. Financial criteria (ТШЗ 17.1 & 18.1)
  const turnoverMatch = fullText.match(/Борлуулалтын орлогын хэмжээ[^\.\n;]+(?:[0-9]{1,3}\s*хувиас|[^\.\n;]+)/i) ||
                        fullText.match(/борлуулалтын орлого[^\.\n;]+/i);
  if (turnoverMatch) {
    result.turnoverReq = turnoverMatch[0].replace(/\s+/g, ' ').trim();
  }

  const similarMatch = fullText.match(/Ижил төстэй ажил[^\.\n;]+/i) ||
                       fullText.match(/Ижил төстэй бараа[^\.\n;]+/i) ||
                       fullText.match(/Ижил төстэй[^\.\n;]+/i);
  if (similarMatch) {
    result.similarExpReq = similarMatch[0].replace(/\s+/g, ' ').trim();
  }

  const liquidMatch = fullText.match(/Түргэн хөрвөх чадвартай хөрөнгө[^\.\n;]+/i);
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

  // 7. Delivery schedule items
  const schedIdx = fullText.indexOf('Бараа нийлүүлэлтийн хуваарь');
  if (schedIdx !== -1) {
    const schedSection = fullText.substring(schedIdx, schedIdx + 2000);
    const rowRegex = /(?:^|\n)\s*(\d+)?\s*([А-ЯЁа-яё0-9\s\-№No]+(?:багц[^\n]*)?)  \s+([\d\s\,\.]+)\s+(Тонн|тн|ш|ширхэг|ком|багц|метр|м|комплект|удаа|хүн)\s+([^\n]+)/gi;
    let rm;
    while ((rm = rowRegex.exec(schedSection)) !== null) {
      const name = rm[2].replace(/\s+/g, ' ').trim();
      if (!name.includes('Барааны нэр') && !name.includes('Тоо хэмжээ') && name.length > 2 && !name.includes('хүснэгт')) {
        result.items.push({
          name,
          specs: `Нийлүүлэх газар: ${rm[5].trim()}`,
          unit: rm[4].trim(),
          qty: rm[3].trim()
        });
      }
    }
  }

  // 8. Standard row pattern (numbered item tables in spec sections)
  if (result.items.length === 0) {
    const textToSearch = bestSection || fullText;
    const unitPattern = '(?:ширхэг|метр|тоо|ш|м|ком|хос|багц|тонн|тн|т|кг|г|литр|л|боодол|уут|хайрцаг|м2|м3|комплект|цаг|удаа|хүн|өдөр)';
    const rowStartRegex = new RegExp(`(?:^|\\n)\\s*(\\d{1,3})[\\.\\s]+([^\\n]+(?:\\n[^\\n]+){0,4}?)\\s+(${unitPattern})\\s+(\\d+(?:[\\.,]\\d+)?)\\b`, 'gi');
    let match;
    const rawItems: any[] = [];

    while ((match = rowStartRegex.exec(textToSearch)) !== null) {
      const rawContent = match[2].trim();
      const unit = match[3].trim();
      const qty = parseFloat(match[4].replace(',', '.'));

      const contentLines = rawContent
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && !/^[0-9\s\.\,\-]+$/.test(l));

      if (contentLines.length === 0) continue;

      let nameParts: string[] = [];
      let specParts: string[] = [];
      let isSpec = false;

      for (const line of contentLines) {
        if (line.match(/(ISO|MNS|стандарт|диаметр|зузаан|даралт|материал|чанарын|загвар|хэмжээ|хүчин|баталгаат|зориулалт|савалгаа)/i)) {
          isSpec = true;
        }
        if (!isSpec && nameParts.length < 3) {
          nameParts.push(line);
        } else {
          specParts.push(line);
        }
      }

      let name = nameParts.join(' ').replace(/\s+/g, ' ').trim();
      name = name.replace(/^[\d\.\-\s]+/, '').trim();

      const lowerName = name.toLowerCase();
      if (
        name.length < 2 ||
        name.length > 180 ||
        lowerName.includes('хуулийн') ||
        lowerName.includes('тшз') ||
        lowerName.includes('журам') ||
        lowerName.includes('заасан') ||
        lowerName.includes('давуу эрх') ||
        lowerName.includes('оролцогч') ||
        lowerName.includes('захиалагч бараа хүлээн') ||
        lowerName.includes('баталгаа') ||
        lowerName.includes('гэрээ байгуулснаас')
      ) {
        continue;
      }

      const spec = specParts.join(' ').replace(/\s+/g, ' ').trim() || `Үзүүлэлт: ${name}`;

      rawItems.push({
        name,
        unit,
        qty,
        specs: spec
      });
    }

    result.items = rawItems.slice(0, 100);
  }

  // 9. Framework agreement package list (ТШЗ 1.3) — fallback when no items found yet
  if (result.items.length === 0) {
    const pkgIdx = fullText.indexOf('ТШЗ 1.3');
    if (pkgIdx !== -1) {
      const pkgSection = fullText.substring(pkgIdx, pkgIdx + 15000);
      const endPkg = pkgSection.search(/ТШЗ\s*1\.[4-9]|ТШЗ\s*2\./);
      const relevant = endPkg !== -1 ? pkgSection.substring(0, endPkg) : pkgSection;

      const rawLines = relevant.split('\n').map((l: string) => l.trim()).filter(Boolean);
      let pendingNum: string | null = null;

      for (const line of rawLines) {
        if (line.includes('ТШЗ') || line.includes('Багцын дугаар') || line.includes('Багцын нэр')) continue;

        const singleNumMatch = line.match(/^(\d{1,3})$/);
        if (singleNumMatch) {
          pendingNum = singleNumMatch[1];
          continue;
        }

        const numAndTextMatch = line.match(/^(\d{1,3})\s+([\u0400-\u04FF0-9\s\-\,\/\.\(\)±]+)$/);
        if (numAndTextMatch) {
          result.items.push({
            name: `Багц ${numAndTextMatch[1]}: ${numAndTextMatch[2].trim()}`,
            specs: `Ерөнхий гэрээний багц №${numAndTextMatch[1]} (${numAndTextMatch[2].trim()})`,
            unit: 'багц',
            qty: 1
          });
          pendingNum = null;
          continue;
        }

        if (pendingNum && /^[\u0400-\u04FF]/.test(line)) {
          result.items.push({
            name: `Багц ${pendingNum}: ${line.trim()}`,
            specs: `Ерөнхий гэрээний багц №${pendingNum} (${line.trim()})`,
            unit: 'багц',
            qty: 1
          });
          pendingNum = null;
        }
      }
    }
  }

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
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // 1.5. Check persistent disk bundles (fast, 0ms, works in serverless Vercel)
    const diskBundle = loadDiskBundle(invIdStr);
    if (diskBundle && diskBundle.documents && diskBundle.documents.length > 0) {
      liveCache.set(invIdStr, { timestamp: Date.now(), data: diskBundle });
      return diskBundle;
    }
  }

  // 2. Check Supabase raw_data
  let tenderDocumentId: number | undefined = undefined;
  let tenderId: number | undefined = tenderIdHint ? Number(tenderIdHint) : undefined;
  let existingRawData: any = null;

  try {
    const { data: dbRow } = await supabase
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
    tenderDocumentId,
    tenderId,
    documents: [],
    bidders: [],
    announcementHtml: '',
    subTenders,
    isFailed
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
                  downloadUrl: `/api/download?fileId=${d.fileId}&name=${encodeURIComponent(d.fileName || 'tender.pdf')}`,
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
                  downloadUrl: `/api/download?fileId=${d.fileId}&name=${encodeURIComponent(d.fileName || 'addendum.pdf')}`,
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
                    downloadUrl: `/api/download?fileId=${f.fileId}&name=${encodeURIComponent(f.fileName || 'clarification.pdf')}`,
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
  let totalPageCount = 0;
  const docsToParse = result.documents.filter(d => d.fileId && (d.fileExtention === 'pdf' || !d.fileExtention)).slice(0, 3);

  for (const doc of docsToParse) {
    if (!doc.fileId) continue;
    try {
      const pdfBuffer = (await curlGet(`https://user.tender.gov.mn/mn/download/${doc.fileId}`, true)) as Buffer;
      if (pdfBuffer && pdfBuffer.length > 500 && pdfBuffer.slice(0, 5).toString().includes('%PDF')) {
        let extractedDocText = '';
        try {
          const parsedPdf = await pdf(pdfBuffer);
          totalPageCount += parsedPdf.numpages || 0;
          if (parsedPdf.text && parsedPdf.text.trim().length > 30) {
            extractedDocText = parsedPdf.text.trim();
          }
        } catch (pdfErr) {
          console.warn(`PDF text parse library error for ${doc.fileName}:`, pdfErr);
        }

        // If standard text extraction yielded nothing/little and buffer has scanned images, run Vision OCR
        if (extractedDocText.length < 50 && isScannedPdf(pdfBuffer, extractedDocText.length)) {
          try {
            const pageImages = extractJpegImagesFromPdfBuffer(pdfBuffer, 3);
            if (pageImages.length > 0) {
              totalPageCount = Math.max(totalPageCount, pageImages.length);
              console.log(`[OCR] Detected ${pageImages.length} scanned pages in ${doc.fileName} (${doc.fileId}). Running vision extraction...`);
              const visionResult = await extractScannedPdfWithVision(pageImages, doc.fileName);
              if (visionResult?.text) {
                extractedDocText = visionResult.text;
                doc.isScannedOcr = true;
                doc.ocrModel = visionResult.modelUsed;
                result.isScannedOcr = true;

                // Pre-populate structuredSpecs if vision identified items or delivery schedule
                if (!result.structuredSpecs) {
                  result.structuredSpecs = {
                    rawSpecText: visionResult.text,
                    items: visionResult.items || [],
                    deliverySchedule: visionResult.deliverySchedule || [],
                    specialConditions: visionResult.specialConditions || []
                  };
                } else {
                  if (visionResult.items && (!result.structuredSpecs.items || result.structuredSpecs.items.length === 0)) {
                    result.structuredSpecs.items = visionResult.items;
                  }
                  if (visionResult.deliverySchedule && (!result.structuredSpecs.deliverySchedule || result.structuredSpecs.deliverySchedule.length === 0)) {
                    result.structuredSpecs.deliverySchedule = visionResult.deliverySchedule;
                  }
                }
              }
            }
          } catch (visionErr) {
            console.warn(`Vision OCR extraction error for ${doc.fileName}:`, visionErr);
          }
        }

        if (extractedDocText.length > 30) {
          combinedPdfText += `\n\n--- БАРИМТ БИЧИГ: ${doc.fileName} ---\n` + extractedDocText;
        }
      }
    } catch (pdfErr) {
      console.warn(`PDF parsing error for ${doc.fileName} (${doc.fileId}):`, pdfErr);
    }
  }

  if (totalPageCount > 0) {
    result.pdfPageCount = totalPageCount;
  }
  if (combinedPdfText.trim().length > 30) {
    result.pdfText = combinedPdfText.trim();
    const parsedFromText = parsePdfContent(result.pdfText);
    
    // Preserve existing items or delivery schedules if vision OCR already extracted them
    if (result.structuredSpecs) {
      result.structuredSpecs = {
        ...parsedFromText,
        items: (result.structuredSpecs.items && result.structuredSpecs.items.length > 0)
          ? result.structuredSpecs.items
          : parsedFromText.items,
        deliverySchedule: (result.structuredSpecs.deliverySchedule && result.structuredSpecs.deliverySchedule.length > 0)
          ? result.structuredSpecs.deliverySchedule
          : parsedFromText.deliverySchedule,
        rawSpecText: result.structuredSpecs.rawSpecText || parsedFromText.rawSpecText
      };
    } else {
      result.structuredSpecs = parsedFromText;
    }
  }

  // 6. Cache into memory and persistent disk
  liveCache.set(invIdStr, { timestamp: Date.now(), data: result });
  if (result.documents && result.documents.length > 0) {
    saveDiskBundle(invIdStr, result);
  }

  // 7. Persist to Supabase raw_data asynchronously (store structured text, not heavy binary)
  (async () => {
    try {
      // Truncate raw full pdf text to safe limit (~50KB) for DB storage while keeping structured specs
      const dbSafeResult = {
        ...result,
        pdfText: result.pdfText ? result.pdfText.substring(0, 50000) : ''
      };
      await supabase
        .from('tenders')
        .update({
          raw_data: {
            ...(existingRawData || {}),
            tenderDocumentId: result.tenderDocumentId || existingRawData?.tenderDocumentId,
            tenderId: result.tenderId || existingRawData?.tenderId,
            liveBundle: dbSafeResult
          },
          updated_at: new Date().toISOString()
        })
        .eq('invitation_id', invitationId);
    } catch (dbErr) {
      console.warn('Could not persist liveBundle to Supabase:', dbErr);
    }
  })();

  return result;
}

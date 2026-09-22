import { execFile } from 'child_process';
const pdf = require('pdf-parse/lib/pdf-parse.js');
import { supabaseAdmin as supabase } from './supabase';

export interface LiveTenderDocument {
  fileId: number;
  fileName: string;
  createdDate?: string;
  fileExtention?: string;
  downloadUrl: string;
  isPrimary?: boolean;
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
}

export interface ParsedPdfResult extends StructuredSpecs {
  rawSpecText: string;
  items: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
  qualifications: string[];
  licenses: string[];
  personnel: Array<{ role: string; count: number; qualification: string; experience?: string }>;
  machinery: string[];
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
}

// In-memory cache for fast sub-millisecond retrieval
const liveCache = new Map<string, { timestamp: number; data: LiveExtractionResult }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

// Helper to run curl safely with User-Agent
function curlGet(url: string, asBuffer = false): Promise<string | Buffer> {
  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      url,
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: application/json, text/html, */*'
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
  };

  if (!fullText) return result;

  // 1. Licenses (ТШЗ 17.4)
  const licIdx = fullText.indexOf('ТШЗ 17.4');
  if (licIdx !== -1) {
    const licSection = fullText.substring(licIdx, licIdx + 1000);
    const afterFirst = licSection.substring(15);
    const nextTsz = afterFirst.search(/ТШЗ\s*1[78]\./);
    const relevant = nextTsz !== -1 ? afterFirst.substring(0, nextTsz) : afterFirst;
    const lines = relevant.split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of lines) {
      if (/^\d+[\.\)]\s+/.test(l)) {
        result.licenses.push(l.replace(/^\d+[\.\)]\s+/, '').trim());
      } else if (l.length > 5 && !l.includes('Шаардана') && !l.includes('Зөвшөөрөл') && !l.includes('ТШЗ')) {
        result.licenses.push(l);
      }
    }
  }

  // 2. Personnel (Хүний нөөц)
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

  // 4. Bid Security (ТШЗ 23.1)
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

  // 6. Look for Chapter III / Technical Specifications
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

  // Delivery schedule items
  const schedIdx = fullText.indexOf('Бараа нийлүүлэлтийн хуваарь');
  if (schedIdx !== -1) {
    const schedSection = fullText.substring(schedIdx, schedIdx + 2000);
    const rowRegex = /(?:^|\n)\s*(\d+)?\s*([А-ЯЁа-яё0-9\s\-№No]+(?:багц[^\n]*)?)\s+([\d\s\,\.]+)\s+(Тонн|тн|ш|ширхэг|ком|багц|метр|м|комплект|удаа|хүн)\s+([^\n]+)/gi;
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

  // If no items extracted from schedule, try standard row pattern
  if (result.items.length === 0) {
    const textToSearch = bestSection || fullText;
    const unitPattern = '(?:ширхэг|метр|тоо|ш|м|ком|хос|багц|тонн|тн|т|кг|г|литр|л|боодол|уут|хайрцаг|м2|м3|комплект|цаг|удаа|хүн|өдөр)';
    const rowStartRegex = new RegExp(`(?:^|\\n)\\s*(\\d{1,3})[\\.\\s]+([^\\n]+(?:\\n[^\\n]+){0,4}?)\\s+(${unitPattern})\\s+(\\d+(?:[\\.,]\\d+)?)\\b`, 'gi');
    let match;
    const rawItems: any[] = [];

    while ((match = rowStartRegex.exec(textToSearch)) !== null) {
      const num = parseInt(match[1], 10);
      const rawContent = match[2].trim();
      const unit = match[3].trim();
      const qty = parseFloat(match[4].replace(',', '.'));

      const contentLines = rawContent
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !/^[0-9\s\.\,\-]+$/.test(l));

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

  return result;
}

export async function fetchTenderLiveBundle(
  invitationId: string | number,
  tenderIdHint?: string | number
): Promise<LiveExtractionResult> {
  const invIdStr = String(invitationId);

  // 1. Check in-memory cache
  const cached = liveCache.get(invIdStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
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
      
      // If already has live bundle in raw_data with documents, return directly
      if (
        existingRawData.liveBundle &&
        existingRawData.liveBundle.documents?.length > 0 &&
        tenderDocumentId
      ) {
        liveCache.set(invIdStr, { timestamp: Date.now(), data: existingRawData.liveBundle });
        return existingRawData.liveBundle;
      }
    }
  } catch (err) {
    // continue on error
  }

  // 3. Always scrape tenderDocumentId and tenderId from Next.js RSC detail page if missing
  if (!tenderDocumentId || !tenderId) {
    const detailHtml = (await curlGet(`https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`)) as string;
    if (detailHtml) {
      const docMatch = detailHtml.match(/tenderDocumentId[\\"]*:\s*(\d+)/);
      if (docMatch) tenderDocumentId = Number(docMatch[1]);

      const tenderIdMatch = detailHtml.match(/tenderId[\\"]*:\s*(\d+)/);
      if (tenderIdMatch) tenderId = Number(tenderIdMatch[1]);
    }
  }

  const result: LiveExtractionResult = {
    tenderDocumentId,
    tenderId,
    documents: [],
    bidders: [],
    announcementHtml: ''
  };

  // 4. Concurrently fetch:
  // A. Official Documents List (/api/gw/153/list)
  // B. Real Bidders Evaluation List (/api/invitation-bidders)
  // C. Official Announcement HTML (/api/get-invitation-by-document-id)
  const promises: Promise<void>[] = [];

  // A. Documents
  if (tenderDocumentId) {
    promises.push((async () => {
      try {
        const docJsonStr = (await curlGet(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocumentId}&offset=1&limit=9999`)) as string;
        if (docJsonStr && docJsonStr.trim().startsWith('[')) {
          const rawDocs = JSON.parse(docJsonStr);
          if (Array.isArray(rawDocs)) {
            result.documents = rawDocs.map((d: any, idx: number) => ({
              fileId: d.fileId,
              fileName: d.fileName,
              createdDate: d.createdDate,
              fileExtention: d.fileExtention || 'pdf',
              downloadUrl: `/api/download?fileId=${d.fileId}&name=${encodeURIComponent(d.fileName || 'tender.pdf')}`,
              isPrimary: idx === 0 || d.fileName.toLowerCase().includes('тшбб') || d.fileName.toLowerCase().includes('хоолой')
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch documents for tenderDocumentId:', tenderDocumentId, e);
      }
    })());
  }

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

  // 5. Download primary specification PDF and extract text
  const primaryDoc = result.documents.find(d => d.isPrimary) || result.documents[0];
  if (primaryDoc && primaryDoc.fileId) {
    try {
      const pdfBuffer = (await curlGet(`https://user.tender.gov.mn/mn/download/${primaryDoc.fileId}`, true)) as Buffer;
      if (pdfBuffer && pdfBuffer.length > 1000) {
        const parsedPdf = await pdf(pdfBuffer);
        result.pdfPageCount = parsedPdf.numpages;
        result.pdfText = parsedPdf.text;
        result.structuredSpecs = parsePdfContent(parsedPdf.text);
      }
    } catch (pdfErr) {
      console.warn('PDF parsing error for fileId:', primaryDoc.fileId, pdfErr);
    }
  }

  // 6. Cache into memory
  liveCache.set(invIdStr, { timestamp: Date.now(), data: result });

  // 7. Persist to Supabase raw_data asynchronously (store structured text, not heavy binary)
  if (existingRawData) {
    (async () => {
      try {
        // Truncate raw full pdf text to safe limit (~60KB) for DB storage while keeping structured specs
        const dbSafeResult = {
          ...result,
          pdfText: result.pdfText ? result.pdfText.substring(0, 50000) : ''
        };
        await supabase
          .from('tenders')
          .update({
            raw_data: {
              ...existingRawData,
              liveBundle: dbSafeResult
            },
            updated_at: new Date().toISOString()
          })
          .eq('invitation_id', invitationId);
      } catch (dbErr) {
        console.warn('Could not persist liveBundle to Supabase:', dbErr);
      }
    })();
  }

  return result;
}

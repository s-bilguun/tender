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

export interface LiveExtractionResult {
  tenderDocumentId?: number;
  tenderId?: number;
  documents: LiveTenderDocument[];
  bidders: LiveBidder[];
  announcementHtml?: string;
  pdfText?: string;
  pdfPageCount?: number;
  structuredSpecs?: {
    rawSpecText?: string;
    items?: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
    qualifications?: string[];
    turnoverReq?: string;
    similarExpReq?: string;
    liquidAssetsReq?: string;
    warrantyMonths?: number;
  };
}

// In-memory cache for fast sub-millisecond retrieval
const liveCache = new Map<string, { timestamp: number; data: LiveExtractionResult }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Helper to run curl safely with User-Agent
function curlGet(url: string, asBuffer = false): Promise<string | Buffer> {
  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      url,
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: application/json, text/html, */*'
    ];

    execFile('curl.exe', args, {
      encoding: asBuffer ? 'buffer' : 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 15000
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

    execFile('curl.exe', args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 15000
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
export function parsePdfContent(fullText: string) {
  const result: NonNullable<LiveExtractionResult['structuredSpecs']> = {
    rawSpecText: '',
    items: [],
    qualifications: [],
  };

  if (!fullText) return result;

  // 1. Look for Chapter III / Technical Specifications
  const specKeywords = [
    'БАРАА МАТЕРИАЛ НИЙЛҮҮЛЭХ ХУГАЦАА',
    'БАРАА МАТЕРИАЛЫН ҮЗҮҮЛЭЛТ',
    'Барааны техникийн үзүүлэлт',
    'ТЕХНИКИЙН ҮЗҮҮЛЭЛТ',
    'НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ',
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
    // Find where next major chapter or contract starts
    const endPos = candidateSlice.search(/(IV БҮЛЭГ|V БҮЛЭГ|VI БҮЛЭГ|ГЭРЭЭНИЙ НӨХЦӨЛ)/);
    result.rawSpecText = (endPos !== -1 ? candidateSlice.substring(0, endPos) : candidateSlice).trim();
  }

  // Extract structured specification item rows
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
      lowerName.includes('гэрээ байгуулснаас') ||
      String(match[4]).includes('.')
    ) {
      continue;
    }

    const spec = specParts.join(' ').replace(/\s+/g, ' ').trim() || `Үзүүлэлт: ${name}`;

    rawItems.push({
      num,
      name,
      unit,
      quantity: qty,
      qty,
      spec,
      specs: spec
    });
  }

  // Deduplicate and sort by item number
  const uniqueItems: any[] = [];
  const seenKeys = new Set<string>();
  for (const item of rawItems) {
    const normName = item.name.toLowerCase().replace(/[^а-яa-z0-9]/g, '');
    const key = `${item.num}_${normName.substring(0, 15)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  }

  uniqueItems.sort((a, b) => (a.num || 0) - (b.num || 0));
  result.items = uniqueItems.slice(0, 100);

  // 2. Extract Qualification Requirements (Chapter I ТШӨХ)
  const qualKeywords = [
    'ТШЗ 18.1',
    'ТШЗ 18.',
    'ТШЗ 19.1',
    'Борлуулалтын орлого',
    'Ижил төстэй',
    'Түргэн хөрвөх'
  ];

  for (const kw of qualKeywords) {
    const idx = fullText.indexOf(kw);
    if (idx !== -1) {
      const snippet = fullText.substring(idx, idx + 600).replace(/\s+/g, ' ').trim();
      if (!result.qualifications?.some(q => q.includes(snippet.substring(0, 50)))) {
        result.qualifications?.push(snippet);
      }
    }
  }

  // Parse turnover
  const turnoverMatch = fullText.match(/Борлуулалтын орлогын хэмжээ[^\.\n;]+[0-9]{2,3}\s*хувиас/i) ||
                        fullText.match(/борлуулалтын орлого[^\.\n;]+/i);
  if (turnoverMatch) {
    result.turnoverReq = turnoverMatch[0].trim();
  }

  // Parse similar experience
  const similarMatch = fullText.match(/Ижил төстэй бараа[^\.\n;]+(?:100|80|60|50)\s*хувиас[^;\n\.]+/i) ||
                       fullText.match(/Ижил төстэй[^\.\n;]+/i);
  if (similarMatch) {
    result.similarExpReq = similarMatch[0].trim();
  }

  // Parse liquid assets
  const liquidMatch = fullText.match(/Түргэн хөрвөх чадвартай хөрөнгө[^\.\n;]+/i);
  if (liquidMatch) {
    result.liquidAssetsReq = liquidMatch[0].trim();
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
    announcementHtml: '',
    structuredSpecs: {}
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

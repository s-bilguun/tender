/**
 * PDF Vision Extractor for Scanned / Non-Text Procurement Documents
 *
 * Extracts raster JPEG page images directly from raw PDF buffers without native C++ canvas dependencies,
 * and uses OpenRouter multimodal vision models (e.g. Qwen 2.5 VL, Gemini 2.5 Flash) to transcribe
 * technical specifications, delivery schedule tables, and special contract conditions into structured Mongolian data.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { DeliveryScheduleItem, SpecialConditionClause } from './types';
import { cleanThoughtBlocks } from './ai-cleaner';

function getOpenRouterApiKey(): string | undefined {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/OPENROUTER_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
      if (match && match[1]) {
        process.env.OPENROUTER_API_KEY = match[1].trim();
        return process.env.OPENROUTER_API_KEY;
      }
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

export interface ExtractedVisionResult {
  text: string;
  items?: Array<{ name: string; specs: string; unit: string; qty: string | number }>;
  deliverySchedule?: DeliveryScheduleItem[];
  specialConditions?: SpecialConditionClause[];
  modelUsed?: string;
}

const VALID_JPEG_MARKERS = [0xe0, 0xe1, 0xdb, 0xc0, 0xc2, 0xc4, 0xee];

/**
 * Extracts raw JPEG image pages directly from a PDF buffer by locating DCTDecode streams.
 * Handles both direct uncompressed JPEG streams and zlib-compressed streams ([ /FlateDecode /DCTDecode ]).
 */
export function extractJpegImagesFromPdfBuffer(pdfBuffer: Buffer, maxImages = 4): Buffer[] {
  const images: Buffer[] = [];
  if (!pdfBuffer || pdfBuffer.length < 1000) return images;

  // Method 1: Check for zlib-compressed image streams ([ /FlateDecode /DCTDecode ])
  const pdfStr = pdfBuffer.toString('latin1');
  const flateStreamRegex = /\[\s*\/FlateDecode\s*\/DCTDecode\s*\][\s\S]*?stream\r?\n([\s\S]*?)endstream/g;
  let m;
  while ((m = flateStreamRegex.exec(pdfStr)) !== null && images.length < maxImages) {
    try {
      const streamBuf = Buffer.from(m[1], 'latin1');
      const inflated = zlib.inflateSync(streamBuf);
      if (
        inflated.length >= 20 * 1024 &&
        inflated[0] === 0xff && inflated[1] === 0xd8 && inflated[2] === 0xff &&
        VALID_JPEG_MARKERS.includes(inflated[3])
      ) {
        images.push(inflated);
      }
    } catch (e) {
      // ignore
    }
  }

  if (images.length >= maxImages) return images;

  // Method 2: Check for direct uncompressed DCTDecode streams (raw JPEG binary in PDF)
  let offset = 0;
  while (offset < pdfBuffer.length - 4 && images.length < maxImages) {
    const soi = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), offset);
    if (soi === -1) break;

    const marker = pdfBuffer[soi + 3];
    if (VALID_JPEG_MARKERS.includes(marker)) {
      // Find the proper EOI marker bounded by the next SOI
      const nextSoi = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]), soi + 4);
      const searchEnd = nextSoi !== -1 ? nextSoi : Math.min(pdfBuffer.length, soi + 10 * 1024 * 1024);
      const searchSlice = pdfBuffer.subarray(soi, searchEnd);
      const eoi = searchSlice.lastIndexOf(Buffer.from([0xff, 0xd9]));

      if (eoi !== -1 && eoi >= 20 * 1024) {
        images.push(searchSlice.subarray(0, eoi + 2));
        offset = soi + eoi + 2;
        continue;
      }
    }

    offset = soi + 4;
  }

  return images;
}

/**
 * Checks if a PDF buffer represents a scanned photocopy document
 * (i.e. minimal or zero extractable text from pdftotext / pdf-parse, but contains raster image streams).
 */
export function isScannedPdf(pdfBuffer: Buffer, extractedTextLength: number): boolean {
  if (extractedTextLength > 200) return false;
  if (!pdfBuffer || pdfBuffer.length < 30 * 1024) return false;

  const bufStr = pdfBuffer.subarray(0, Math.min(pdfBuffer.length, 50000)).toString('latin1');
  return (
    bufStr.includes('DCTDecode') ||
    bufStr.includes('CCITTFaxDecode') ||
    bufStr.includes('/Image') ||
    bufStr.includes('/XObject')
  );
}

/**
 * Sends extracted scanned page images to OpenRouter Vision models
 * and returns structured Mongolian procurement markdown and extracted items.
 */
let openRouterVisionUnavailable = process.env.ENABLE_VISION_OCR !== 'true';

export async function extractScannedPdfWithVision(
  images: Buffer[],
  tenderName = 'Төрийн худалдан авах ажиллагаа',
  apiKey?: string
): Promise<ExtractedVisionResult | null> {
  if (openRouterVisionUnavailable) {
    return null;
  }

  const key = apiKey || getOpenRouterApiKey();
  if (!key || images.length === 0) {
    console.warn(`[OCR] No OPENROUTER_API_KEY found or no images (images: ${images.length})`);
    return null;
  }

  // Cap total image payload to ~5MB to prevent API body size errors (HTTP 400)
  let totalBytes = 0;
  const targetPages: Buffer[] = [];
  for (const img of images) {
    if (totalBytes + img.length < 5 * 1024 * 1024 && targetPages.length < 3) {
      targetPages.push(img);
      totalBytes += img.length;
    }
  }
  if (targetPages.length === 0 && images.length > 0) {
    targetPages.push(images[0]); // At least take the first page
  }

  const candidateModels = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen-2-vl-72b-instruct:free',
    'openrouter/free',
    'nex-agi/nex-n2.5-mini:free',
    'google/gemini-2.5-flash-image',
    'qwen/qwen2.5-vl-72b-instruct',
    'google/gemini-3.1-flash-lite-image',
    'qwen/qwen3-vl-8b-instruct',
  ];

  const contentArray: any[] = [
    {
      type: 'text',
      text: `Та бол Монгол Улсын төрийн худалдан авах ажиллагааны тендерийн баримт бичгийг шалгадаг шинжээч. Энэхүү тендерийн ("${tenderName}") сканердсан албан баримтын хуудсуудыг сайтар уншиж, дараах бүтцээр монгол хэлээр бүрэн гаргаж өгнө үү:\n\n` +
        `1. ### Техникийн тодорхойлолт & Бараа бүтээгдэхүүний жагсаалт (хүснэгт хэлбэрээр: Бараа/Ажлын нэр | Тоо хэмжээ | Хэмжих нэгж | Техникийн үндсэн үзүүлэлт, стандарт)\n` +
        `2. ### Ерөнхий ба тусгай шаардлага (MNS, ISO стандарт, чанарын гэрчилгээ, туршлага, тусгай зөвшөөрөл)\n` +
        `3. ### Нийлүүлэлтийн хуваарь & Байршил (Хугацаа, хүргэх байршил, нөхцөл)\n` +
        `4. ### Гэрээний тусгай нөхцөл (Урьдчилгаа төлбөр, санхүүжилтийн үе шат, баталгаат хугацаа, алданги тооцох хувь)\n\n` +
        `Төрийн худалдан авалтад шууд ашиглах боломжтой, үнэн зөв, тодорхой хүснэгт болон цэгцтэй markdown жагсаалтаар бичнэ үү.`
    }
  ];

  for (const pageBuf of targetPages) {
    contentArray.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${pageBuf.toString('base64')}`
      }
    });
  }

  for (const model of candidateModels) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tender.mn',
          'X-Title': 'TenderHub-OCR',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: contentArray
            }
          ],
          max_tokens: 2500,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(10000), // Prevent hanging
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Vision model ${model} returned HTTP ${res.status}:`, errText.substring(0, 150));
        // If account has no credits (402), don't waste time retrying other paid models
        if (res.status === 402) {
          console.warn('[OCR] OpenRouter account has no credits, skipping further vision model calls.');
          openRouterVisionUnavailable = true;
          break;
        }
        continue;
      }

      const data = await res.json();
      const rawOutput = data.choices?.[0]?.message?.content;
      const outputText = cleanThoughtBlocks(rawOutput || '');
      if (outputText && outputText.trim().length > 50) {
        // Parse structured items from markdown table
        const items = parseTableItemsFromMarkdown(outputText);
        const deliverySchedule = parseDeliveryScheduleFromMarkdown(outputText);

        return {
          text: outputText.trim(),
          items: items.length > 0 ? items : undefined,
          deliverySchedule: deliverySchedule.length > 0 ? deliverySchedule : undefined,
          modelUsed: model
        };
      }
    } catch (err: any) {
      console.warn(`Vision model ${model} error:`, err.message);
    }
  }

  return null;
}

/**
 * Cleans degenerate repetitive character sequences occasionally produced by vision models
 */
function cleanRepetitiveTokens(text: string): string {
  if (!text) return '';
  return text.replace(/(.)\1{8,}/g, '$1$1');
}

/**
 * Extracts structured items from markdown tables produced by vision LLMs
 */
function parseTableItemsFromMarkdown(md: string): Array<{ name: string; specs: string; unit: string; qty: string | number }> {
  const items: Array<{ name: string; specs: string; unit: string; qty: string | number }> = [];
  const lines = md.split('\n');
  let inTable = false;
  let headers: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const rawCols = trimmed.slice(1, -1).split('|').map(c => c.trim().replace(/\*\*/g, ''));
      if (rawCols.some(c => c.includes('---'))) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        headers = rawCols.map(c => c.toLowerCase());
        continue;
      }

      if (rawCols.length >= 2) {
        const isFirstColNumber = /^\d+$/.test(rawCols[0]) || /^[№#]/.test(rawCols[0]);
        const rawName = (isFirstColNumber ? rawCols[1] : rawCols[0]).trim();
        const qtyCol = isFirstColNumber ? rawCols[2] : rawCols[1];
        const unitCol = isFirstColNumber ? rawCols[3] : rawCols[2];
        const specCols = isFirstColNumber ? rawCols.slice(4) : rawCols.slice(3);

        const cleanName = rawName.replace(/^[0-9\.\s\-–]+/, '').trim();
        if (cleanName && cleanName.length > 1 && !cleanName.toLowerCase().includes('нэр') && !cleanName.toLowerCase().includes('бараа/ажлын')) {
          items.push({
            name: cleanName,
            qty: qtyCol || '1',
            unit: unitCol || 'ширхэг',
            specs: cleanRepetitiveTokens(specCols.join('; ').replace(/<br\s*\/?>/gi, ' '))
          });
        }
      }
    } else {
      if (inTable && trimmed === '') {
        inTable = false;
      }
    }
  }

  return items;
}

/**
 * Extracts structured delivery schedule items from markdown tables
 */
function parseDeliveryScheduleFromMarkdown(md: string): DeliveryScheduleItem[] {
  const schedule: DeliveryScheduleItem[] = [];
  const lines = md.split('\n');
  let inScheduleSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('нийлүүлэлтийн хуваарь') || trimmed.toLowerCase().includes('нийлүүлэх хугацаа')) {
      inScheduleSection = true;
      continue;
    }

    if (inScheduleSection && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cols.some(c => c.includes('---'))) continue;

      if (cols.length >= 4) {
        const itemNumber = String(schedule.length + 1);
        const name = cols[1] || cols[0];
        const qty = cols[2] || '1';
        const location = cols[3] || 'Захиалагчийн заасан байршил';
        const deadline = cols[4] || cols[3] || 'Гэрээний дагуу';

        if (name && !name.toLowerCase().includes('нэр') && !name.toLowerCase().includes('бараа')) {
          schedule.push({
            number: itemNumber,
            name,
            quantity: String(qty),
            unit: 'багц',
            location,
            deadline
          });
        }
      }
    }
  }

  return schedule;
}

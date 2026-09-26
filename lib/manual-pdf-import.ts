import path from 'path';
import { extractJpegImagesFromPdfBuffer, extractScannedPdfWithVision, isScannedPdf } from './pdf-vision-extractor';
import { parsePdfContent, type LiveTenderDocument } from './live-fetcher';

const pdf = require('pdf-parse/lib/pdf-parse.js');

export const MANUAL_PDF_BUCKET = 'manual-tender-pdfs';
export const MAX_MANUAL_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_MANUAL_PDF_PAGES = 100;
export const MAX_LIVE_PDF_TEXT_CHARS = 300_000;

export function cleanPdfFileName(value: unknown): string {
  const baseName = path.basename(String(value || 'tender.pdf').replace(/\\/g, '/'));
  const safeName = baseName
    .replace(/[\u0000-\u001f<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  return /\.pdf$/i.test(safeName) ? safeName : `${safeName || 'tender'}.pdf`;
}

export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, Math.min(buffer.length, 1024)).includes(Buffer.from('%PDF-'));
}

export async function extractUploadedPdf(
  buffer: Buffer,
  fileName: string,
  tenderName: string,
  options: { allowVision?: boolean } = {},
) {
  if (!looksLikePdf(buffer)) throw new Error('Uploaded file is not a valid PDF.');

  const pageTexts: string[] = [];
  const parsedPdf = await pdf(buffer, {
    max: MAX_MANUAL_PDF_PAGES + 1,
    pagerender: async (page: any) => {
      const pageData = await page.getTextContent();
      const text = (pageData.items || [])
        .map((item: any) => typeof item?.str === 'string' ? item.str : '')
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageTexts.push(text);
      return text;
    },
  });

  const pageCount = Number(parsedPdf.numpages) || pageTexts.length || 0;
  if (pageCount < 1) throw new Error('No pages could be read from this PDF.');
  if (pageCount > MAX_MANUAL_PDF_PAGES) {
    throw new Error(`This PDF has ${pageCount} pages. Manual web imports are limited to ${MAX_MANUAL_PDF_PAGES} pages.`);
  }

  const directText = pageTexts
    .map((text, index) => text.length > 0 ? `[Page ${index + 1}]\n${text}` : '')
    .filter(Boolean)
    .join('\n\n');
  const directTextPageCount = pageTexts.filter((text) => text.length > 20).length;
  const sparsePageCount = pageTexts.filter((text) => text.length < 200).length;
  const mayContainScans = isScannedPdf(buffer, directText.length) || (
    sparsePageCount > 0 && ['/Subtype /Image', '/Subtype/Image', 'DCTDecode', 'CCITTFaxDecode']
      .some((marker) => buffer.includes(Buffer.from(marker, 'latin1')))
  );

  let visionText = '';
  let ocrModel: string | undefined;
  let ocrSampleCount: number | undefined;
  if (options.allowVision !== false && mayContainScans && process.env.ENABLE_VISION_OCR === 'true') {
    const pageImages = extractJpegImagesFromPdfBuffer(buffer, 3);
    if (pageImages.length > 0) {
      const visionResult = await extractScannedPdfWithVision(pageImages, tenderName);
      if (visionResult?.text) {
        visionText = `[AI OCR excerpt; sampled ${pageImages.length} embedded image(s); physical PDF page mapping unavailable]\n${visionResult.text}`;
        ocrModel = visionResult.modelUsed;
        ocrSampleCount = pageImages.length;
      }
    }
  }

  const combinedText = [directText, visionText].filter(Boolean).join('\n\n').slice(0, MAX_LIVE_PDF_TEXT_CHARS);
  const extractionStatus: LiveTenderDocument['extractionStatus'] = directTextPageCount === pageCount
    ? 'text_extracted'
    : directTextPageCount > 0
      ? 'partial'
      : visionText
        ? 'ocr_partial'
        : mayContainScans
          ? 'scanned_not_processed'
          : 'not_extracted';

  return {
    pageCount,
    pageTexts,
    sparsePageNumbers: pageTexts
      .map((text, index) => text.length < 200 ? index + 1 : null)
      .filter((page): page is number => page !== null),
    directTextPageCount,
    directText,
    combinedText,
    parsedSpecs: directText.length > 30 ? parsePdfContent(directText) : null,
    extractionStatus,
    isScannedOcr: Boolean(visionText),
    ocrModel,
    ocrSampleCount,
  };
}

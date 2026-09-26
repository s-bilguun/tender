import { supabaseAdmin } from '../lib/supabase';
import { fetchTenderLiveBundle, ocrSparsePdfPages, parsePdfContent, type LiveExtractionResult } from '../lib/live-fetcher';
import { extractUploadedPdf, MANUAL_PDF_BUCKET, MAX_LIVE_PDF_TEXT_CHARS } from '../lib/manual-pdf-import';

const CONCURRENCY = Math.max(1, Math.min(Number(process.env.PDF_JOB_CONCURRENCY) || 3, 10));

function isSupportedDocument(doc: any): boolean {
  const extension = String(doc.fileExtention || doc.fileExtension || doc.fileName?.split('.').pop() || '').toLowerCase();
  return ['pdf', 'png', 'jpg', 'jpeg'].includes(extension);
}

function removeDocumentSection(text: string, markerId: string): string {
  return text.split(/(?=---\s*DOCUMENT\s+[^:]+:)/i)
    .filter((section) => !section.startsWith(`--- DOCUMENT ${markerId}:`))
    .join('\n\n')
    .trim();
}

function mergeParsedSpecs(previous: any, next: any) {
  if (!next) return previous;
  const merged = { ...(previous || {}) };
  for (const [key, value] of Object.entries(next)) {
    if (Array.isArray(value)) {
      if (value.length > 0) merged[key] = value;
    } else if (value !== undefined && value !== null && value !== '') {
      merged[key] = value;
    }
  }
  return merged;
}

async function processManualScannedDocuments(invitationId: string, bundle: LiveExtractionResult): Promise<void> {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to process manual PDFs.');
  let updated = false;

  for (const document of bundle.documents || []) {
    if (document.source !== 'manual_upload' || !document.storagePath || document.extractionStatus === 'text_extracted') continue;

    const { data: file, error } = await supabaseAdmin.storage
      .from(MANUAL_PDF_BUCKET)
      .download(document.storagePath);
    if (error || !file) throw new Error(`Could not load uploaded PDF ${document.fileName}: ${error?.message || 'file missing'}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractUploadedPdf(buffer, document.fileName, 'Тендер', { allowVision: false });
    const ocrPages = await ocrSparsePdfPages(buffer, extraction.pageCount, extraction.sparsePageNumbers);
    const ocrByPage = new Map((ocrPages || []).map((page) => [page.page, page.text]));
    const pageText = extraction.pageTexts
      .map((text, index) => {
        const ocrText = ocrByPage.get(index + 1);
        return [text, ocrText ? `[OCR: Tesseract.js + Poppler]\n${ocrText}` : '']
          .filter(Boolean)
          .join('\n');
      })
      .map((text, index) => text ? `[Page ${index + 1}]\n${text}` : '')
      .filter(Boolean)
      .join('\n\n');

    if (pageText.length > 30) {
      const docId = String(document.id || document.fileId || '');
      const marker = `--- DOCUMENT ${docId}: ${document.fileName} ---`;
      bundle.pdfText = [
        marker + '\n' + pageText,
        removeDocumentSection(String(bundle.pdfText || ''), docId),
      ].filter(Boolean).join('\n\n').slice(0, MAX_LIVE_PDF_TEXT_CHARS);
      bundle.structuredSpecs = mergeParsedSpecs(bundle.structuredSpecs, parsePdfContent(pageText));
    }

    const readablePages = extraction.pageTexts.filter((text, index) => `${text} ${ocrByPage.get(index + 1) || ''}`.trim().length > 20).length;
    document.extractedPageCount = readablePages;
    document.totalPageCount = extraction.pageCount;
    if (ocrByPage.size > 0) {
      document.isScannedOcr = true;
      document.ocrModel = 'Tesseract.js + Poppler page rendering';
      document.extractionStatus = readablePages >= extraction.pageCount ? 'text_extracted' : 'ocr_partial';
      bundle.isScannedOcr = true;
    } else {
      document.extractionStatus = extraction.extractionStatus;
    }
    updated = true;
    console.log(`${document.fileName}: ${readablePages}/${extraction.pageCount} pages readable with local PDF OCR.`);
  }

  if (!updated) return;
  const supportedDocuments = (bundle.documents || []).filter(isSupportedDocument);
  const readableDocuments = supportedDocuments.filter((doc: any) =>
    ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus || ''),
  );
  bundle.extractionStatus = supportedDocuments.length === 0
    ? 'unavailable'
    : readableDocuments.length === supportedDocuments.length && supportedDocuments.every((doc: any) => doc.extractionStatus === 'text_extracted')
      ? 'complete'
      : readableDocuments.length > 0
        ? 'partial'
        : 'unavailable';
  bundle.fetchedAt = new Date().toISOString();
  bundle.stale = false;

  const { data: updatedRows, error: saveError } = await supabaseAdmin.rpc('merge_tender_live_bundle', {
    p_invitation_id: invitationId,
    p_live_bundle: bundle,
    p_tender_document_id: bundle.tenderDocumentId ?? null,
    p_tender_id: bundle.tenderId ?? null,
  });
  if (saveError) throw new Error(`Could not save local OCR results: ${saveError.message}`);
  if (updatedRows === 0) throw new Error('Tender was not found while saving local OCR results.');
}

async function processTender(invitationId: string): Promise<boolean> {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to process the PDF job queue.');

  try {
    const bundle = await fetchTenderLiveBundle(invitationId, undefined, true);
    const hasUploadedPdf = bundle.documents?.some((doc) => doc.source === 'manual_upload' && doc.storagePath);
    if (bundle.stale && !hasUploadedPdf) throw new Error('Tender source refresh failed; the previous extraction was retained as stale.');
    await processManualScannedDocuments(invitationId, bundle);

    const documents = Array.isArray(bundle.documents) ? bundle.documents : [];
    const supportedDocuments = documents.filter(isSupportedDocument);
    const failedDocuments = supportedDocuments.filter((doc: any) =>
      ['source_error', 'scanned_not_processed', 'not_extracted'].includes(doc.extractionStatus || ''),
    );
    if (failedDocuments.length > 0) {
      const details = failedDocuments
        .map((doc: any) => `${doc.fileName || doc.fileId}: ${doc.extractionStatus}`)
        .join('; ');
      throw new Error(`Some supported attachments remain unread: ${details}`);
    }

    const processedPages = supportedDocuments.reduce((sum: number, doc: any) => sum + (Number(doc.extractedPageCount) || 0), 0);
    const totalPages = supportedDocuments.reduce((sum: number, doc: any) => sum + (Number(doc.totalPageCount) || 0), 0);
    console.log(`${invitationId}: ${documents.length} attachments, ${processedPages}/${totalPages} readable pages, ${bundle.extractionStatus || 'unavailable'}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${invitationId}: ${message}`);
    return false;
  }
}

async function main() {
  const admin = supabaseAdmin;
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to process the PDF job queue.');

  const { data: queuedCount, error: enqueueError } = await admin.rpc('enqueue_stale_tender_pdf_jobs');
  if (enqueueError) throw new Error(`Could not enqueue stale tenders: ${enqueueError.message}. Apply the tender PDF jobs migration first.`);
  console.log(`Enqueued or refreshed ${queuedCount || 0} stale tender PDF jobs.`);

  let completed = 0;
  let failed = 0;
  while (true) {
    const { data, error } = await admin.rpc('claim_tender_pdf_jobs', { p_limit: CONCURRENCY });
    if (error) throw new Error(`Could not claim tender PDF jobs: ${error.message}`);
    const invitationIds = (Array.isArray(data) ? data : [])
      .map((row: any) => String(row.invitation_id || ''))
      .filter((id: string) => /^\d{1,24}$/.test(id));
    if (invitationIds.length === 0) break;

    await Promise.all(invitationIds.map(async (invitationId: string) => {
      const succeeded = await processTender(invitationId);
      const { error: finishError } = await admin.rpc('finish_tender_pdf_job', {
        p_invitation_id: invitationId,
        p_success: succeeded,
        p_error: succeeded ? null : 'PDF extraction failed; see workflow logs for details.',
      });
      if (finishError) throw new Error(`Could not record PDF job result for ${invitationId}: ${finishError.message}`);
      if (succeeded) completed += 1;
      else failed += 1;
    }));
  }

  console.log(`PDF queue run finished: ${completed} processed, ${failed} failed; failures remain queued for retry.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('PDF queue worker failed:', error);
  process.exitCode = 1;
});

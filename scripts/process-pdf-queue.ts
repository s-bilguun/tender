import { supabaseAdmin } from '../lib/supabase';
import { fetchTenderLiveBundle } from '../lib/live-fetcher';

const CONCURRENCY = Math.max(1, Math.min(Number(process.env.PDF_JOB_CONCURRENCY) || 3, 10));

function isSupportedDocument(doc: any): boolean {
  const extension = String(doc.fileExtention || doc.fileExtension || doc.fileName?.split('.').pop() || '').toLowerCase();
  return ['pdf', 'png', 'jpg', 'jpeg'].includes(extension);
}

async function processTender(invitationId: string): Promise<boolean> {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to process the PDF job queue.');

  try {
    const bundle = await fetchTenderLiveBundle(invitationId, undefined, true);
    if (bundle.stale) throw new Error('Tender source refresh failed; the previous extraction was retained as stale.');

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

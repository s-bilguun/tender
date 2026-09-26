import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LIVE_BUNDLE_SCHEMA_VERSION } from '@/lib/types';
import { cacheTenderLiveBundle } from '@/lib/live-fetcher';
import { extractUploadedPdf, MANUAL_PDF_BUCKET, MAX_MANUAL_PDF_BYTES, MAX_LIVE_PDF_TEXT_CHARS } from '@/lib/manual-pdf-import';
import { ensureManualPdfBucket, manualPdfImportAuthResponse, manualPdfImportAuthStatus } from '@/lib/manual-pdf-import-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function removeDocumentSection(text: string, markerId: string): string {
  const sections = text.split(/(?=---\s*DOCUMENT\s+[^:]+:)/i);
  return sections
    .filter((section) => !section.startsWith(`--- DOCUMENT ${markerId}:`))
    .join('\n\n')
    .trim();
}

function mergeParsedSpecs(previous: any, next: any) {
  if (!next) return previous;
  const result = { ...(previous || {}) };
  for (const [key, value] of Object.entries(next)) {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value;
    } else if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authStatus = manualPdfImportAuthStatus(request);
  if (authStatus !== 'ok') {
    const response = manualPdfImportAuthResponse(authStatus);
    return NextResponse.json(response.body, { status: response.status });
  }

  const invitationId = params.id;
  if (!/^\d{1,24}$/.test(invitationId)) {
    return NextResponse.json({ success: false, error: 'A valid tender ID is required.' }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY must be configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const storagePath = String(body.path || '');
    const pathPattern = new RegExp(`^manual-imports/${invitationId}/[0-9a-f-]{36}\\.pdf$`, 'i');
    if (!pathPattern.test(storagePath)) {
      return NextResponse.json({ success: false, error: 'Invalid uploaded file reference.' }, { status: 400 });
    }
    const fileName = String(body.fileName || 'tender.pdf').slice(0, 200);

    const { data: tender, error: tenderError } = await supabaseAdmin
      .from('tenders')
      .select('tender_name, raw_data')
      .eq('invitation_id', invitationId)
      .maybeSingle();
    if (tenderError) throw new Error(`Could not load tender: ${tenderError.message}`);
    if (!tender) return NextResponse.json({ success: false, error: 'Tender not found.' }, { status: 404 });

    await ensureManualPdfBucket();
    const { data: storedFile, error: downloadError } = await supabaseAdmin.storage
      .from(MANUAL_PDF_BUCKET)
      .download(storagePath);
    if (downloadError || !storedFile) {
      return NextResponse.json({ success: false, error: 'Uploaded PDF is missing or expired. Please upload it again.' }, { status: 404 });
    }
    if (storedFile.size > MAX_MANUAL_PDF_BYTES) {
      return NextResponse.json({ success: false, error: 'PDF must be 20 MB or smaller.' }, { status: 413 });
    }
    const fileBuffer = Buffer.from(await storedFile.arrayBuffer());
    const extraction = await extractUploadedPdf(fileBuffer, fileName, tender.tender_name || 'Тендер');

    const rawData = tender.raw_data || {};
    const oldBundle = rawData.liveBundle || {};
    const docId = storagePath.split('/').pop()!.replace(/\.pdf$/i, '');
    const document = {
      id: docId,
      source: 'manual_upload',
      storagePath,
      fileName,
      fileExtention: 'pdf',
      downloadUrl: `/api/tenders/${invitationId}/pdf-import/download?documentId=${encodeURIComponent(docId)}`,
      isPrimary: true,
      category: 'Гараар оруулсан тендерийн PDF',
      createdDate: new Date().toISOString(),
      extractionStatus: extraction.extractionStatus,
      extractedPageCount: extraction.directTextPageCount,
      totalPageCount: extraction.pageCount,
      isScannedOcr: extraction.isScannedOcr,
      ocrModel: extraction.ocrModel,
      ocrSampleCount: extraction.ocrSampleCount,
    };

    const previousDocuments = Array.isArray(oldBundle.documents) ? oldBundle.documents : [];
    const replacedDocuments = previousDocuments.filter((doc: any) =>
      doc.source === 'manual_upload' && String(doc.fileName || '').toLowerCase() === fileName.toLowerCase(),
    );
    const retainedDocuments = previousDocuments.filter((doc: any) => !replacedDocuments.includes(doc));
    const oldText = String(oldBundle.pdfText || '');
    const retainedText = replacedDocuments.reduce((text: string, doc: any) =>
      removeDocumentSection(text, String(doc.id || doc.fileId || '')), oldText,
    );
    const newSection = extraction.combinedText.length > 30
      ? `--- DOCUMENT ${docId}: ${fileName} ---\n${extraction.combinedText}`
      : '';
    const pdfText = [newSection, retainedText].filter(Boolean).join('\n\n').slice(0, MAX_LIVE_PDF_TEXT_CHARS);
    const documents = [...retainedDocuments, document];
    const readableDocs = documents.filter((doc: any) => ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus));
    const extractionStatus = documents.length === 0
      ? 'unavailable'
      : readableDocs.length === documents.length && documents.every((doc: any) => doc.extractionStatus === 'text_extracted')
        ? 'complete'
        : readableDocs.length > 0
          ? 'partial'
          : 'unavailable';
    const removedPages = replacedDocuments.reduce((sum: number, doc: any) => sum + (Number(doc.totalPageCount) || 0), 0);
    const previousPageCount = Number(oldBundle.pdfPageCount) || 0;
    const liveBundle = {
      ...oldBundle,
      schemaVersion: LIVE_BUNDLE_SCHEMA_VERSION,
      documents,
      pdfText,
      pdfPageCount: Math.max(0, previousPageCount - removedPages + extraction.pageCount),
      structuredSpecs: mergeParsedSpecs(oldBundle.structuredSpecs, extraction.parsedSpecs),
      extractionStatus,
      isScannedOcr: Boolean(oldBundle.isScannedOcr || extraction.isScannedOcr),
      fetchedAt: new Date().toISOString(),
      stale: false,
    };

    const { data: updatedRows, error: persistError } = await supabaseAdmin.rpc('merge_tender_live_bundle', {
      p_invitation_id: invitationId,
      p_live_bundle: liveBundle,
      p_tender_document_id: rawData.tenderDocumentId ?? null,
      p_tender_id: rawData.tenderId ?? null,
    });
    if (persistError) throw new Error(`Could not save extracted PDF text: ${persistError.message}`);
    if (updatedRows === 0) throw new Error('Tender was not found while saving the extracted PDF text.');
    cacheTenderLiveBundle(invitationId, liveBundle);

    let workerOcrQueued = false;
    if (extraction.extractionStatus !== 'text_extracted') {
      const { error: queueError } = await supabaseAdmin.from('tender_pdf_jobs').upsert({
        invitation_id: invitationId,
        status: 'pending',
        priority: 1000,
        attempt_count: 0,
        available_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'invitation_id' });
      if (queueError) console.warn('Could not queue local OCR for imported PDF:', queueError.message);
      else workerOcrQueued = true;
    }

    const oldStoragePaths = replacedDocuments
      .map((doc: any) => doc.storagePath)
      .filter((value: unknown): value is string => typeof value === 'string' && value.startsWith(`manual-imports/${invitationId}/`));
    if (oldStoragePaths.length > 0) {
      await supabaseAdmin.storage.from(MANUAL_PDF_BUCKET).remove(oldStoragePaths);
    }

    return NextResponse.json({
      success: true,
      fileName,
      extractionStatus: extraction.extractionStatus,
      extractedPageCount: extraction.directTextPageCount,
      totalPageCount: extraction.pageCount,
      hasReadableText: extraction.combinedText.length > 30,
      workerOcrQueued,
    });
  } catch (error: any) {
    const message = error?.message || 'Could not process this PDF.';
    const status = /valid PDF|pages could be read|limited to/i.test(message) ? 422 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

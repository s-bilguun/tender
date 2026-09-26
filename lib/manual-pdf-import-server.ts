import { timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';
import { MANUAL_PDF_BUCKET, MAX_MANUAL_PDF_BYTES } from './manual-pdf-import';

export function manualPdfImportAuthStatus(request: NextRequest): 'ok' | 'missing_secret' | 'unauthorized' {
  const expected = process.env.TENDER_PDF_IMPORT_SECRET;
  if (!expected) return 'missing_secret';
  const authorization = request.headers.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (providedBuffer.length !== expectedBuffer.length) return 'unauthorized';
  return timingSafeEqual(providedBuffer, expectedBuffer) ? 'ok' : 'unauthorized';
}

export async function ensureManualPdfBucket() {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured to import PDFs.');

  const { error: getError } = await supabaseAdmin.storage.getBucket(MANUAL_PDF_BUCKET);
  if (!getError) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(MANUAL_PDF_BUCKET, {
    public: false,
    fileSizeLimit: MAX_MANUAL_PDF_BYTES,
    allowedMimeTypes: ['application/pdf'],
  });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Could not prepare private PDF storage: ${createError.message}`);
  }
}

export function manualPdfImportAuthResponse(status: 'missing_secret' | 'unauthorized') {
  return {
    status: status === 'missing_secret' ? 503 : 401,
    body: {
      success: false,
      error: status === 'missing_secret' ? 'TENDER_PDF_IMPORT_SECRET is not configured.' : 'Unauthorized',
    },
  };
}

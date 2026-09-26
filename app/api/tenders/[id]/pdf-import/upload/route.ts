import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cleanPdfFileName, MANUAL_PDF_BUCKET, MAX_MANUAL_PDF_BYTES } from '@/lib/manual-pdf-import';
import { ensureManualPdfBucket, manualPdfImportAuthResponse, manualPdfImportAuthStatus } from '@/lib/manual-pdf-import-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const fileName = cleanPdfFileName(body.fileName);
    const size = Number(body.size);
    const type = String(body.type || '').toLowerCase();
    if (!Number.isFinite(size) || size <= 0 || size > MAX_MANUAL_PDF_BYTES) {
      return NextResponse.json({ success: false, error: 'PDF must be 20 MB or smaller.' }, { status: 413 });
    }
    if (type && !['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Only PDF files are supported.' }, { status: 415 });
    }

    const { data: tender, error: tenderError } = await supabaseAdmin
      .from('tenders')
      .select('invitation_id')
      .eq('invitation_id', invitationId)
      .maybeSingle();
    if (tenderError) throw new Error(`Could not verify tender: ${tenderError.message}`);
    if (!tender) return NextResponse.json({ success: false, error: 'Tender not found.' }, { status: 404 });

    await ensureManualPdfBucket();
    const storagePath = `manual-imports/${invitationId}/${randomUUID()}.pdf`;
    const { data, error } = await supabaseAdmin.storage
      .from(MANUAL_PDF_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data) throw new Error(`Could not create a private upload: ${error?.message || 'No upload token returned.'}`);

    return NextResponse.json({
      success: true,
      bucket: MANUAL_PDF_BUCKET,
      path: data.path,
      token: data.token,
      fileName,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Could not prepare PDF upload.' }, { status: 500 });
  }
}

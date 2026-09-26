import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MANUAL_PDF_BUCKET } from '@/lib/manual-pdf-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const invitationId = params.id;
  const documentId = request.nextUrl.searchParams.get('documentId') || '';
  if (!/^\d{1,24}$/.test(invitationId) || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    return NextResponse.json({ success: false, error: 'PDF file not found.' }, { status: 404 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'PDF download is unavailable.' }, { status: 503 });
  }

  try {
    const { data: tender, error } = await supabaseAdmin
      .from('tenders')
      .select('raw_data')
      .eq('invitation_id', invitationId)
      .maybeSingle();
    if (error) throw error;
    const documents = tender?.raw_data?.liveBundle?.documents || [];
    const document = documents.find((item: any) =>
      item.source === 'manual_upload' && item.id === documentId &&
      typeof item.storagePath === 'string' && item.storagePath.startsWith(`manual-imports/${invitationId}/`),
    );
    if (!document) return NextResponse.json({ success: false, error: 'PDF file not found.' }, { status: 404 });

    const { data, error: signedUrlError } = await supabaseAdmin.storage
      .from(MANUAL_PDF_BUCKET)
      .createSignedUrl(document.storagePath, 60, { download: document.fileName || 'tender.pdf' });
    if (signedUrlError || !data?.signedUrl) throw signedUrlError || new Error('Could not create a download link.');
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.warn('Manual tender PDF download failed:', error);
    return NextResponse.json({ success: false, error: 'PDF download is temporarily unavailable.' }, { status: 500 });
  }
}

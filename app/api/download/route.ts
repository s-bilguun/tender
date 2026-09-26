import { NextRequest, NextResponse } from 'next/server';
import { fetchVerifiedAttachment } from '@/lib/source-attachment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const nameParam = searchParams.get('name') || 'tender_document.pdf';

  if (!fileId || !/^\d+$/.test(fileId)) {
    return NextResponse.json({ error: 'A numeric fileId is required.' }, { status: 400 });
  }

  try {
    // The portal sometimes supplies an extension separately from the displayed
    // filename. The source host and returned file signature are still verified.
    const allowImage = searchParams.get('allowImage') === '1' || /\.(?:png|jpe?g)$/i.test(nameParam);
    const { buffer, contentType } = await fetchVerifiedAttachment(fileId, allowImage);
    let safeFileName = nameParam.replace(/[^\w\s.\-\u0400-\u04FF]/g, '_').trim().slice(0, 180);
    if (!safeFileName) safeFileName = 'tender_document.pdf';
    const expectedExtension = contentType === 'application/pdf' ? '.pdf' : contentType === 'image/png' ? '.png' : '.jpg';
    if (!safeFileName.toLowerCase().endsWith(expectedExtension)) {
      safeFileName = `${safeFileName.replace(/\.[^.]*$/, '')}${expectedExtension}`;
    }

    const asciiFallback = safeFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.warn('Tender attachment download failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'The official source did not return a valid PDF. Please try the official tender page.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

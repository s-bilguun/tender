import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';

export const dynamic = 'force-dynamic';

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

function curlDownloadPdf(fileId: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      `https://user.tender.gov.mn/mn/download/${fileId}`,
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: application/pdf,application/octet-stream,*/*',
    ];

    execFile(curlCmd, args, {
      encoding: 'buffer',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 30000,
    }, (err, stdout) => {
      if (err || !stdout || stdout.length === 0) {
        resolve(null);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const nameParam = searchParams.get('name') || 'tender_document.pdf';

  if (!fileId || !/^\d+$/.test(fileId)) {
    return NextResponse.json({ error: 'Valid numeric fileId is required' }, { status: 400 });
  }

  const pdfBuffer = await curlDownloadPdf(fileId);
  if (!pdfBuffer || pdfBuffer.length < 50) {
    return NextResponse.json({ error: 'Failed to download document from official portal' }, { status: 502 });
  }

  // Ensure safe clean filename
  let safeFileName = nameParam.replace(/[^\w\s\.\-\u0400-\u04FF]/gi, '_').trim();
  if (!safeFileName.toLowerCase().endsWith('.pdf') && !safeFileName.includes('.')) {
    safeFileName += '.pdf';
  }

  const asciiFallback = safeFileName.replace(/[^\x20-\x7E]/g, '_');
  const encodedName = encodeURIComponent(safeFileName);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdfBuffer.length),
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}

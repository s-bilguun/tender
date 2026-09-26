const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024;
const SOURCE_ORIGIN = 'https://user.tender.gov.mn';

export class AttachmentFetchError extends Error {}

function isAllowedSourceUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'user.tender.gov.mn' ? url : null;
  } catch {
    return null;
  }
}

function looksLikePdf(bytes: Buffer): boolean {
  return bytes.subarray(0, Math.min(bytes.length, 1024)).includes(Buffer.from('%PDF-'));
}

function looksLikeImage(bytes: Buffer): boolean {
  return (
    (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
  );
}

/** Fetches a portal attachment only after checking its origin, size, status and file signature. */
export async function fetchVerifiedAttachment(
  fileId: string | number,
  allowImage = false,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!/^\d+$/.test(String(fileId))) throw new AttachmentFetchError('Invalid attachment id');

  let url = new URL(`/mn/download/${fileId}`, SOURCE_ORIGIN);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    if (!isAllowedSourceUrl(url.toString())) throw new AttachmentFetchError('Unexpected attachment host');
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(25_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TenderHub/1.0)',
        Accept: allowImage ? 'application/pdf,image/jpeg,image/png,application/octet-stream' : 'application/pdf,application/octet-stream',
        Referer: 'https://www.tender.gov.mn/',
      },
      cache: 'no-store',
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirectCount === 3) throw new AttachmentFetchError('Attachment redirect could not be followed safely');
      const nextUrl = new URL(location, url);
      if (!isAllowedSourceUrl(nextUrl.toString())) throw new AttachmentFetchError('Attachment redirected outside the official source');
      url = nextUrl;
      continue;
    }

    if (!response.ok || !response.body) throw new AttachmentFetchError(`Attachment source returned HTTP ${response.status}`);
    const advertisedLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(advertisedLength) && advertisedLength > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentFetchError('Attachment exceeds the size limit');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_ATTACHMENT_BYTES) {
          await reader.cancel();
          throw new AttachmentFetchError('Attachment exceeds the size limit');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    if (!looksLikePdf(buffer) && !(allowImage && looksLikeImage(buffer))) {
      throw new AttachmentFetchError('Source response is not a supported PDF or image');
    }
    const contentType = looksLikePdf(buffer)
      ? 'application/pdf'
      : (buffer[0] === 0xff ? 'image/jpeg' : 'image/png');
    return { buffer, contentType };
  }

  throw new AttachmentFetchError('Attachment redirect limit exceeded');
}

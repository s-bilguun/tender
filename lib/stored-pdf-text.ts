// Read only PDFs hosted by this deployment's Supabase Storage. Page labels are
// produced by the PDF parser, not inferred from text separators.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const cache = new Map<string, { text: string; pageCount: number; extractedPages: number }>();
const MAX_BYTES = 20 * 1024 * 1024;

export async function readStoredPdfText(url: string, name: string, id: string) {
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  let target: URL;
  try {
    target = new URL(url);
    if (target.protocol !== 'https:' || target.origin !== new URL(base).origin ||
        !target.pathname.startsWith('/storage/v1/object/public/')) return null;
  } catch { return null; }
  const cached = cache.get(url);
  if (cached) return cached;
  const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_BYTES) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return null;
  const pages: string[] = [];
  const parsed = await pdfParse(bytes, { pagerender: async (page: any) => {
    const content = await page.getTextContent();
    let previousY: number | null = null;
    let text = '';
    for (const item of content.items || []) {
      const y = item.transform?.[5];
      if (previousY !== null && y != null && Math.abs(y - previousY) > 2) text += '\n';
      else if (text && !text.endsWith('\n')) text += ' ';
      text += typeof item.str === 'string' ? item.str : '';
      if (y != null) previousY = y;
    }
    pages.push(text.trim());
    return text;
  }});
  const extractedPages = pages.filter((page) => page.trim().length > 20).length;
  const text = pages.map((page, index) => page.length > 20 ? `[Page ${index + 1}]\n${page}` : '').filter(Boolean).join('\n\n');
  const result = { text: text ? `--- DOCUMENT ${id}: ${name.replace(/[\r\n]/g, ' ')} ---\n${text}` : '', pageCount: parsed.numpages || pages.length, extractedPages };
  if (cache.size >= 50) cache.delete(cache.keys().next().value!);
  cache.set(url, result);
  return result;
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readStoredPdfText } from '../lib/stored-pdf-text';

async function main() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  let calls = 0;
  const pdf = readFileSync('Tender_MN_v0.1.0_Summary.pdf');
  globalThis.fetch = (async (input: any) => {
    calls++;
    return new Response(String(input).includes('challenge') ? '<html>Just a moment</html>' : pdf, { status: 200 });
  }) as typeof fetch;
  const text = await readStoredPdfText('https://example.supabase.co/storage/v1/object/public/test/sample.pdf', 'sample.pdf', '42');
  assert.ok(text && text.pageCount > 0 && text.extractedPages > 0);
  assert.match(text.text, /--- DOCUMENT 42: sample.pdf ---\n\[Page 1\]/);
  assert.equal(await readStoredPdfText('https://example.supabase.co.evil.test/storage/v1/object/public/test/file.pdf', 'x', '1'), null);
  assert.equal(await readStoredPdfText('https://example.supabase.co/storage/v1/object/public/test/challenge.pdf', 'x', '1'), null);
  assert.equal(calls, 2);
  console.log('Stored PDF extraction checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

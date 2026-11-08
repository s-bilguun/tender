import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchVerifiedAttachment } from '../lib/source-attachment';

async function main() {
  process.env.ZENROWS_API_KEY = 'test-key';
  const pdf = readFileSync('Tender_MN_v0.1.0_Summary.pdf');
  let returnHtml = false;
  globalThis.fetch = (async (input: any) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, 'api.zenrows.com');
    assert.equal(url.searchParams.get('url'), 'https://user.tender.gov.mn/mn/download/123');
    return new Response(returnHtml ? '<html>Just a moment</html>' : pdf, { status: 200 });
  }) as typeof fetch;
  const result = await fetchVerifiedAttachment('123');
  assert.equal(result.contentType, 'application/pdf');
  assert.ok(result.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-')));
  returnHtml = true;
  await assert.rejects(() => fetchVerifiedAttachment('123'), /not a supported PDF/);
  await assert.rejects(() => fetchVerifiedAttachment('https://example.com'), /Invalid attachment id/);
  console.log('Provider attachment verification checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

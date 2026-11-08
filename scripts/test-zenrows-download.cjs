const { URLSearchParams } = require('url');
(async () => {
  const fileId = process.argv[2] || '1793628518651';
  if (!/^\d+$/.test(fileId)) throw new Error('Invalid attachment ID.');
  const params = new URLSearchParams({ apikey: process.env.ZENROWS_API_KEY || '', url: `https://user.tender.gov.mn/mn/download/${fileId}`, antibot: 'true', premium_proxy: 'true' });
  console.log('Testing one official PDF through ZenRows. This can take a minute.');
  const response = await fetch(`https://api.zenrows.com/v1/?${params}`, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
  if (Number(response.headers.get('content-length')) > 40 * 1024 * 1024 || !response.body) throw new Error('File exceeds 40 MB or is unavailable.');
  const reader = response.body.getReader();
  let size = 0; const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 40 * 1024 * 1024) { await reader.cancel(); throw new Error('File exceeds 40 MB.'); } chunks.push(value); }
  const bytes = Buffer.concat(chunks);
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Provider returned a response that is not a PDF.');
  console.log(`PASS: downloaded an official PDF (${bytes.length} bytes).`);
})().catch(error => { console.error('PDF test failed:', error.name === 'TimeoutError' ? 'request timed out' : error.message); process.exitCode = 1; });

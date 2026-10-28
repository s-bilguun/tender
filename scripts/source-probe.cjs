#!/usr/bin/env node
// Read-only check: does tender.gov.mn answer a plain request from this machine
// without a Cloudflare challenge? Exit 0 = open, 2 = challenged/blocked, 1 = error.
const https = require('https');

const url = 'https://www.tender.gov.mn/mn/invitation?page=1';
const req = https.request(url, {
  method: 'GET',
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    Accept: 'text/html',
  },
}, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (c) => { if (body.length < 20000) body += c; });
  res.on('end', () => {
    const challenged = res.headers['cf-mitigated'] === 'challenge' || /<title>Just a moment/i.test(body);
    if (res.statusCode === 200 && !challenged) {
      console.log(`tender.gov.mn is open to plain requests (HTTP ${res.statusCode}).`);
      process.exit(0);
    }
    console.log(`tender.gov.mn is still blocking automated requests (HTTP ${res.statusCode}${challenged ? ', Cloudflare challenge' : ''}). Skipping the PDF sync; listings come from the Telegram feed.`);
    process.exit(2);
  });
});
req.on('timeout', () => req.destroy(new Error('timeout')));
req.on('error', (e) => { console.log(`Source probe failed: ${e.message}`); process.exit(1); });
req.end();

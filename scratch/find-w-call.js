const { execFile } = require('child_process');

execFile('curl.exe', [
  '-s', '-L',
  'https://www.tender.gov.mn/_next/static/chunks/app/%5Blocale%5D/invitation/detail/%5Bid%5D/page-7dc07fd8b6c6d7ac.js'
], { maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  if (err) return console.error(err);

  const idx = stdout.indexOf('(w,{');
  if (idx !== -1) {
    console.log('w call:', stdout.substring(idx - 100, idx + 250));
  }
});

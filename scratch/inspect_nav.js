const { execFile } = require('child_process');

execFile('curl.exe', [
  '-s', '-L',
  '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'https://www.tender.gov.mn/mn/invitation'
], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
  if (err) { console.error(err); return; }
  const regex = /"(\/mn\/[^"]+)"/g;
  let m;
  const links = new Set();
  while ((m = regex.exec(stdout)) !== null) {
    if (m[1].length < 60) links.add(m[1]);
  }
  console.log('Links in /mn/invitation:');
  console.log(Array.from(links));
});

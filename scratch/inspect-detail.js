const { execFile } = require('child_process');
const fs = require('fs');

const id = '1789954037328';
const url = `https://www.tender.gov.mn/mn/invitation/detail/${id}`;

execFile('curl.exe', [
  '-s', '-L',
  '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  url
], { maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  if (err || !stdout) {
    console.error('Error fetching detail:', err);
    return;
  }

  fs.writeFileSync('scratch/detail-dump.txt', stdout);
  console.log('Saved dump of length:', stdout.length);

  // Search for filenames or links
  const fileRegex = /([a-zA-Z0-9_\-\u0400-\u04FF\s\(\)]+\.(?:pdf|png|jpe?g|docx?|xlsx?))/gi;
  const files = new Set();
  let m;
  while ((m = fileRegex.exec(stdout)) !== null) {
    if (!m[1].includes('chunk') && !m[1].includes('next') && !m[1].includes('.js')) {
      files.add(m[1].trim());
    }
  }
  console.log('Found files:', Array.from(files));

  // Search for download URLs or API endpoints
  const linkRegex = /(https?:\/\/[^\s"']+(?:\/download|\/file|\/uploads|\/attachment)[^\s"']*)/gi;
  const links = new Set();
  while ((m = linkRegex.exec(stdout)) !== null) {
    links.add(m[1]);
  }
  console.log('Found download links:', Array.from(links));
});

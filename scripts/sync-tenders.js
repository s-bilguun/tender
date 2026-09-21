const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function fetchPage(page) {
  return new Promise((resolve) => {
    const url = `https://www.tender.gov.mn/mn/invitation?page=${page}`;
    execFile('curl.exe', [
      '-s', '-L',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml',
      url
    ], { maxBuffer: 40 * 1024 * 1024, timeout: 20000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve([]);
      }
      const idx = stdout.indexOf('uusgesenClientId');
      if (idx === -1) return resolve([]);
      const start = stdout.lastIndexOf('[', idx);
      const end = stdout.indexOf(']', idx);
      if (start === -1 || end === -1) return resolve([]);
      try {
        let raw = stdout.substring(start, end + 1);
        if (raw.includes('\\"')) {
          raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        const parsed = JSON.parse(raw);
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

async function run() {
  console.log('Ingesting large dataset of active tenders from tender.gov.mn...');
  const outPath = path.join(__dirname, '..', 'lib', 'live-tenders.json');
  
  // Load existing tenders if any
  let existingMap = new Map();
  if (fs.existsSync(outPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      current.forEach(t => existingMap.set(String(t.invitationId), t));
    } catch (e) {}
  }

  // Fetch 15 pages in parallel chunks of 3
  const totalPages = 15;
  for (let i = 1; i <= totalPages; i += 3) {
    const batch = [i, i + 1, i + 2].filter(p => p <= totalPages);
    console.log(`Fetching pages ${batch.join(', ')}...`);
    const results = await Promise.all(batch.map(p => fetchPage(p)));
    results.flat().forEach(t => existingMap.set(String(t.invitationId), t));
  }

  const allTenders = Array.from(existingMap.values());
  console.log(`Total accumulated active tenders: ${allTenders.length}`);
  fs.writeFileSync(outPath, JSON.stringify(allTenders, null, 2), 'utf-8');
  console.log(`Saved ${allTenders.length} tenders to ${outPath}`);
}

run().catch(console.error);

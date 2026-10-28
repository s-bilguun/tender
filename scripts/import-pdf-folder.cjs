#!/usr/bin/env node
/**
 * Import tender PDFs you downloaded yourself from tender.gov.mn.
 *
 * Put each PDF in pdf-inbox/ either
 *   - named with the tender ID:   pdf-inbox/1792928904122.pdf  (or 1792928904122_TSHZ.pdf)
 *   - or inside a folder per ID:  pdf-inbox/1792928904122/anything.pdf
 * The tender ID is the number at the end of the tender.gov.mn / TenderHub URL.
 *
 * Each file is uploaded to Supabase Storage, its text is read on the server and the
 * summary appears on the tender page. Imported files move to pdf-inbox/done/.
 *
 * Needs in .env.local: TENDER_PDF_IMPORT_SECRET, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Optional: TENDERHUB_URL (default https://tender-mu-five.vercel.app)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env.local')) ? fs.readFileSync(path.join(root, '.env.local'), 'utf8') : '').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SITE = (process.env.TENDERHUB_URL || 'https://tender-mu-five.vercel.app').replace(/\/$/, '');
const SECRET = process.env.TENDER_PDF_IMPORT_SECRET;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SECRET || !SB_URL || !SB_ANON) {
  console.error('Missing TENDER_PDF_IMPORT_SECRET / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SB_URL, SB_ANON);
const inbox = path.join(root, 'pdf-inbox');
const done = path.join(inbox, 'done');
fs.mkdirSync(done, { recursive: true });

function collect() {
  const jobs = [];
  for (const entry of fs.readdirSync(inbox, { withFileTypes: true })) {
    if (entry.name === 'done') continue;
    const full = path.join(inbox, entry.name);
    if (entry.isDirectory() && /^\d{6,24}$/.test(entry.name)) {
      for (const f of fs.readdirSync(full)) if (/\.pdf$/i.test(f)) jobs.push({ id: entry.name, file: path.join(full, f) });
    } else if (entry.isFile() && /\.pdf$/i.test(entry.name)) {
      const id = (entry.name.match(/(\d{10,24})/) || [])[1];
      if (id) jobs.push({ id, file: full });
      else console.warn(`Skipped ${entry.name}: put the tender ID in the file name (e.g. 1792928904122.pdf).`);
    }
  }
  return jobs;
}

async function importOne({ id, file }) {
  const buffer = fs.readFileSync(file);
  const fileName = path.basename(file);
  const auth = { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' };
  const prep = await fetch(`${SITE}/api/tenders/${id}/pdf-import/upload`, {
    method: 'POST', headers: auth, body: JSON.stringify({ fileName, type: 'application/pdf', size: buffer.length }),
  });
  const up = await prep.json();
  if (!prep.ok) throw new Error(up.error || `upload prepare HTTP ${prep.status}`);
  const { error } = await supabase.storage.from(up.bucket).uploadToSignedUrl(up.path, up.token, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`storage upload: ${error.message}`);
  const proc = await fetch(`${SITE}/api/tenders/${id}/pdf-import/process`, {
    method: 'POST', headers: auth, body: JSON.stringify({ path: up.path, fileName: up.fileName || fileName }),
  });
  const result = await proc.json();
  if (!proc.ok) throw new Error(result.error || `process HTTP ${proc.status}`);
  return result;
}

(async () => {
  const jobs = collect();
  if (!jobs.length) {
    console.log(`No PDFs found in ${inbox}`);
    return;
  }
  let ok = 0;
  for (const job of jobs) {
    process.stdout.write(`${job.id}  ${path.basename(job.file)} ... `);
    try {
      const r = await importOne(job);
      const target = path.join(done, `${job.id}__${path.basename(job.file)}`);
      fs.renameSync(job.file, target);
      ok += 1;
      console.log(r.hasReadableText ? `OK, read ${r.extractedPageCount}/${r.totalPageCount} pages` : `saved, but no readable text (${r.extractionStatus || 'scanned?'})`);
      console.log(`   ${SITE}/tender/${job.id}`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok}/${jobs.length} imported.`);
})();

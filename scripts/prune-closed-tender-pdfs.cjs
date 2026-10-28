#!/usr/bin/env node
/**
 * Keep PDFs only for live tenders.
 *
 * - Database: strips full PDF text / announcement HTML from closed tenders
 *   (via the prune_closed_tender_documents SQL function).
 * - Storage: deletes stored PDF files for closed tenders from the
 *   `tender-documents` and `manual-tender-pdfs` buckets.
 *
 * Dry run by default: it only reports. Add --apply to actually delete.
 *
 *   node scripts/prune-closed-tender-pdfs.cjs            # report only
 *   node scripts/prune-closed-tender-pdfs.cjs --apply    # delete
 *
 * Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY,
 * read from .env.tender-worker or .env.local. Requires the migration
 * supabase/migrations/20261028_live_only_pdfs.sql to have been run first.
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

for (const file of ['.env.tender-worker', '.env.local']) {
  const full = path.join(__dirname, '..', file);
  if (fs.existsSync(full)) dotenv.config({ path: full, quiet: true });
}

const APPLY = process.argv.includes('--apply');
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.tender-worker or .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const BUCKETS = [
  { name: 'tender-documents', prefix: 'tenders' },
  { name: 'manual-tender-pdfs', prefix: 'manual-imports' },
];
const DAY_MS = 24 * 60 * 60 * 1000;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function isLive(row) {
  if (!row) return false; // tender no longer in the table: treat as closed
  if (row.receive_date) return new Date(row.receive_date).getTime() >= Date.now() - DAY_MS;
  return Number(row.is_receiving) === 1;
}

async function listAll(bucket, prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) {
      if (/not found/i.test(error.message)) return out;
      throw new Error(`${bucket}/${prefix}: ${error.message}`);
    }
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function tenderStatus(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await db
      .from('tenders')
      .select('invitation_id, receive_date, is_receiving')
      .in('invitation_id', chunk);
    if (error) throw new Error(`tenders lookup: ${error.message}`);
    for (const row of data) map.set(String(row.invitation_id), row);
  }
  return map;
}

async function pruneDatabase() {
  const { data: report, error } = await db.rpc('prune_closed_tender_documents', { p_apply: false });
  if (error) {
    throw new Error(
      `prune_closed_tender_documents failed (${error.message}). ` +
        'Run supabase/migrations/20261028_live_only_pdfs.sql in the Supabase SQL editor first.'
    );
  }
  console.log(
    `Database: ${report.closedTendersWithDocuments} closed tenders still hold PDF text ` +
      `(~${mb(report.approxBytes)} compressed).`
  );
  if (!APPLY || !report.closedTendersWithDocuments) return;

  let remaining = report.closedTendersWithDocuments;
  let done = 0;
  while (remaining > 0) {
    const { data, error: err } = await db.rpc('prune_closed_tender_documents', { p_apply: true, p_batch: 500 });
    if (err) throw new Error(`prune batch failed: ${err.message}`);
    done += data.updatedThisBatch;
    remaining = data.remaining;
    process.stdout.write(`  stripped ${done} tenders, ${remaining} left\r`);
    if (data.updatedThisBatch === 0) break;
  }
  console.log(`\n  Database cleanup done: ${done} tenders stripped.`);
}

async function pruneStorage() {
  for (const { name, prefix } of BUCKETS) {
    const folders = (await listAll(name, prefix)).filter((entry) => !entry.id); // folders have no id
    if (folders.length === 0) {
      console.log(`Storage ${name}: empty.`);
      continue;
    }
    const status = await tenderStatus(folders.map((f) => f.name));
    const closed = folders.filter((f) => !isLive(status.get(f.name)));

    let files = 0;
    let bytes = 0;
    const toDelete = [];
    for (const folder of closed) {
      const entries = await listAll(name, `${prefix}/${folder.name}`);
      for (const file of entries.filter((e) => e.id)) {
        files += 1;
        bytes += Number(file.metadata?.size) || 0;
        toDelete.push(`${prefix}/${folder.name}/${file.name}`);
      }
    }
    console.log(
      `Storage ${name}: ${folders.length} tender folders, ${closed.length} closed ` +
        `-> ${files} files, ${mb(bytes)} ${APPLY ? 'to delete' : 'would be deleted'}.`
    );
    if (!APPLY) continue;
    for (let i = 0; i < toDelete.length; i += 100) {
      const { error } = await db.storage.from(name).remove(toDelete.slice(i, i + 100));
      if (error) throw new Error(`${name} delete failed: ${error.message}`);
      process.stdout.write(`  deleted ${Math.min(i + 100, toDelete.length)}/${toDelete.length}\r`);
    }
    if (toDelete.length) console.log(`\n  Storage ${name}: deleted ${toDelete.length} files.`);
  }
}

(async () => {
  console.log(APPLY ? 'APPLY mode: closed-tender PDFs will be deleted.\n' : 'Dry run (nothing is changed). Add --apply to delete.\n');
  await pruneDatabase();
  await pruneStorage();
  if (APPLY) {
    console.log(
      '\nDone. To give the freed database space back, run this once in the Supabase SQL editor:\n' +
        '  vacuum full public.tenders;'
    );
  } else {
    console.log('\nNothing was changed. Re-run with --apply to delete.');
  }
})().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});

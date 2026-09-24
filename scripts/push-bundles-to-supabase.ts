import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../lib/supabase';

async function main() {
  console.log('=== PUSHING LOCAL BUNDLES TO SUPABASE ===');
  const bundlesPath = path.join(process.cwd(), 'lib', 'live-bundles.json');
  if (!fs.existsSync(bundlesPath)) {
    console.error('live-bundles.json not found!');
    return;
  }

  const bundles = JSON.parse(fs.readFileSync(bundlesPath, 'utf8'));
  const ids = Object.keys(bundles);
  console.log(`Found ${ids.length} bundles to sync to Supabase...`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches of 20 concurrent updates
  const batchSize = 20;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);

    // Fetch existing raw_data for this batch
    const { data: rows, error: selectErr } = await supabase
      .from('tenders')
      .select('invitation_id, raw_data')
      .in('invitation_id', chunk.map(id => Number(id) || id));

    if (selectErr) {
      console.warn('Batch select error:', selectErr.message);
    }

    const rowMap = new Map();
    rows?.forEach(r => rowMap.set(String(r.invitation_id), r));

    await Promise.all(
      chunk.map(async (id) => {
        const bundle = bundles[id];
        if (!bundle || !bundle.documents || bundle.documents.length === 0) {
          skipped++;
          return;
        }

        const existingRow = rowMap.get(id);
        const existingRaw = existingRow?.raw_data || {};

        // DB-safe bundle (cap raw text to 40KB)
        const dbSafeBundle = {
          ...bundle,
          pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 40000) : ''
        };

        const { error: updErr, count } = await supabase
          .from('tenders')
          .update({
            raw_data: {
              ...existingRaw,
              tenderDocumentId: bundle.tenderDocumentId || existingRaw.tenderDocumentId,
              tenderId: bundle.tenderId || existingRaw.tenderId,
              liveBundle: dbSafeBundle
            },
            updated_at: new Date().toISOString()
          })
          .eq('invitation_id', Number(id) || id);

        if (updErr) {
          console.warn(`Failed to update ${id}:`, updErr.message);
          errors++;
        } else {
          updated++;
        }
      })
    );

    console.log(`[${Math.min(i + batchSize, ids.length)}/${ids.length}] Updated: ${updated}, Errors: ${errors}`);
  }

  console.log(`\nFinished! Successfully synced ${updated} bundles to Supabase database!`);
}

main().catch(console.error);

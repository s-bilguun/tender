import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../lib/supabase';

async function main() {
  const admin = supabase;
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to write tender bundles.');
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

    await Promise.all(
      chunk.map(async (id) => {
        const bundle = bundles[id];
        if (!bundle || !bundle.documents || bundle.documents.length === 0) {
          skipped++;
          return;
        }

        // DB-safe bundle (cap raw text to 40KB)
        const dbSafeBundle = {
          ...bundle,
          pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 40000) : ''
        };

        const { data: updatedRows, error: updErr } = await admin.rpc('merge_tender_live_bundle', {
          p_invitation_id: id,
          p_live_bundle: dbSafeBundle,
          p_tender_document_id: bundle.tenderDocumentId ?? null,
          p_tender_id: bundle.tenderId ?? null,
        });

        if (updErr || updatedRows === 0) {
          console.warn(`Failed to update ${id}:`, updErr?.message || 'Tender row was not found.');
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

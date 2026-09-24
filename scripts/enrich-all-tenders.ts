import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { fetchTenderLiveBundle } from '../lib/live-fetcher';

// Concurrency pool helper
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        console.error(`Error processing item ${idx}:`, err);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('=== TENDER BULK ENRICHMENT PIPELINE ===');
  console.log('1. Loading existing live-bundles.json...');

  const bundlesPath = path.join(process.cwd(), 'lib', 'live-bundles.json');
  let currentBundles: Record<string, any> = {};
  if (fs.existsSync(bundlesPath)) {
    try {
      currentBundles = JSON.parse(fs.readFileSync(bundlesPath, 'utf8'));
    } catch {
      currentBundles = {};
    }
  }

  console.log(`Currently cached bundles in file: ${Object.keys(currentBundles).length}`);

  console.log('\n2. Querying all active receiving tenders (is_receiving = 1) from Supabase...');
  const { data: receivingTenders, error: recErr } = await supabase
    .from('tenders')
    .select('invitation_id, tender_code, tender_name, publish_date, raw_data')
    .eq('is_receiving', 1)
    .order('publish_date', { ascending: false });

  if (recErr || !receivingTenders) {
    console.error('Failed to query receiving tenders:', recErr);
    process.exit(1);
  }

  console.log(`Found ${receivingTenders.length} active receiving tenders.`);

  // Also query latest 100 tenders regardless of receiving status (e.g. freshly concluded or published)
  const { data: latestTenders } = await supabase
    .from('tenders')
    .select('invitation_id, tender_code, tender_name, publish_date, raw_data')
    .order('publish_date', { ascending: false })
    .limit(100);

  const tenderMap = new Map<string, any>();
  receivingTenders.forEach(t => tenderMap.set(String(t.invitation_id), t));
  latestTenders?.forEach(t => {
    const id = String(t.invitation_id);
    if (!tenderMap.has(id)) tenderMap.set(id, t);
  });

  const allTargets = Array.from(tenderMap.values());
  console.log(`Total target tenders to enrich: ${allTargets.length}`);

  // Filter those that need enrichment vs those already fully enriched in Supabase or disk
  const queue: Array<{ id: string; name: string; code: string; hasSupabaseBundle: boolean }> = [];
  let alreadyEnrichedCount = 0;

  for (const t of allTargets) {
    const id = String(t.invitation_id);
    const dbBundle = t.raw_data?.liveBundle;
    const diskBundle = currentBundles[id];

    const isDbComplete = dbBundle?.documents?.length > 0 && (
      (dbBundle.pdfText && dbBundle.pdfText.length > 50) ||
      (dbBundle.structuredSpecs?.items && dbBundle.structuredSpecs.items.length > 0) ||
      (dbBundle.structuredSpecs?.specialConditions && dbBundle.structuredSpecs.specialConditions.length > 0)
    );

    const isDiskComplete = diskBundle?.documents?.length > 0 && (
      (diskBundle.pdfText && diskBundle.pdfText.length > 50) ||
      (diskBundle.structuredSpecs?.items && diskBundle.structuredSpecs.items.length > 0) ||
      (diskBundle.structuredSpecs?.specialConditions && diskBundle.structuredSpecs.specialConditions.length > 0)
    );

    if (isDbComplete) {
      alreadyEnrichedCount++;
      // Sync to disk if missing
      if (!currentBundles[id]) {
        currentBundles[id] = {
          ...dbBundle,
          pdfText: dbBundle.pdfText ? dbBundle.pdfText.substring(0, 30000) : ''
        };
      }
    } else if (isDiskComplete) {
      // Sync disk bundle to Supabase
      console.log(`Syncing existing disk bundle to Supabase for ${id}...`);
      try {
        await supabase
          .from('tenders')
          .update({
            raw_data: {
              ...(t.raw_data || {}),
              liveBundle: diskBundle
            },
            updated_at: new Date().toISOString()
          })
          .eq('invitation_id', id);
        alreadyEnrichedCount++;
      } catch (e) {
        queue.push({ id, name: t.tender_name || '', code: t.tender_code || '', hasSupabaseBundle: false });
      }
    } else {
      queue.push({ id, name: t.tender_name || '', code: t.tender_code || '', hasSupabaseBundle: false });
    }
  }

  // Save updated disk bundles
  fs.writeFileSync(bundlesPath, JSON.stringify(currentBundles, null, 2), 'utf8');

  console.log(`\nStatus check:`);
  console.log(`- Already fully enriched: ${alreadyEnrichedCount}`);
  console.log(`- Need live extraction & sync: ${queue.length}`);

  if (queue.length === 0) {
    console.log('All target tenders are already enriched! Done.');
    return;
  }

  console.log(`\n3. Starting concurrent extraction (6 parallel workers) for ${queue.length} tenders...`);

  let completed = 0;
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  await mapConcurrent(queue, 6, async (item, idx) => {
    const itemStart = Date.now();
    try {
      const bundle = await fetchTenderLiveBundle(item.id, undefined, false);
      const docsCount = bundle?.documents?.length || 0;
      const textLen = bundle?.pdfText?.length || 0;
      const sccCount = bundle?.structuredSpecs?.specialConditions?.length || 0;
      const schedCount = bundle?.structuredSpecs?.deliverySchedule?.length || 0;
      const itemsCount = bundle?.structuredSpecs?.items?.length || 0;

      if (docsCount > 0) {
        successCount++;
        currentBundles[item.id] = {
          ...bundle,
          pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 30000) : ''
        };
      } else {
        failCount++;
      }

      completed++;
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const itemMs = Date.now() - itemStart;
      console.log(
        `[${completed}/${queue.length}] ${item.id} | ${docsCount} docs | ${textLen} chars | ${sccCount} SCC | ${schedCount || itemsCount} items | ${itemMs}ms (total: ${elapsedSec}s)`
      );

      // Periodically flush disk cache every 10 items
      if (completed % 10 === 0) {
        fs.writeFileSync(bundlesPath, JSON.stringify(currentBundles, null, 2), 'utf8');
      }
    } catch (err: any) {
      failCount++;
      completed++;
      console.warn(`[${completed}/${queue.length}] FAILED ${item.id}:`, err.message);
    }
  });

  // Final flush to disk
  fs.writeFileSync(bundlesPath, JSON.stringify(currentBundles, null, 2), 'utf8');

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== ENRICHMENT COMPLETED ===');
  console.log(`Total processed: ${completed}`);
  console.log(`Successful: ${successCount}`);
  console.log(`No docs / failed: ${failCount}`);
  console.log(`Total duration: ${totalTimeSec}s`);
  console.log(`Updated lib/live-bundles.json with ${Object.keys(currentBundles).length} total bundles.`);
}

main().catch(console.error);

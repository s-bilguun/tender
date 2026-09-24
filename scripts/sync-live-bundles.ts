import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '../lib/supabase';
import { fetchTenderLiveBundle } from '../lib/live-fetcher';

async function main() {
  const bundlesPath = path.join(process.cwd(), 'lib', 'live-bundles.json');
  let currentBundles: Record<string, any> = {};
  if (fs.existsSync(bundlesPath)) {
    try {
      currentBundles = JSON.parse(fs.readFileSync(bundlesPath, 'utf8'));
    } catch (e) {
      currentBundles = {};
    }
  }

  // Target critical tenders first
  const targetIds = [
    '1789954047805', // ХУДХААА Боловсролын байгууллагын багш нарт зөөврийн компьютер (1. ТШББ.pdf + ажлын даалгавар.pdf)
    '1789954038947', // Хоол хүнс (User's specific reported tender with 3 scanned PDFs)
    '1789954035593', // МТЗ Дохиолол холбооны сэлбэг хэрэгсэл (ТББ.pdf + ТД.pdf)
    '1787266442855', // Хоол хүнс (Failed tender with 4 subTenders, delivery schedule & SCC)
  ];

  // Fetch newest tenders directly from Supabase
  try {
    const { data: latestTenders } = await supabase
      .from('tenders')
      .select('invitation_id')
      .order('publish_date', { ascending: false })
      .limit(50);

    if (Array.isArray(latestTenders)) {
      for (const t of latestTenders) {
        const invId = String(t.invitation_id || '');
        if (invId && !targetIds.includes(invId)) {
          targetIds.push(invId);
        }
      }
    }
  } catch (err: any) {
    console.warn('Could not query newest tenders from Supabase:', err.message);
  }

  console.log(`Syncing live bundles for ${targetIds.length} tenders...`);

  for (let i = 0; i < targetIds.length; i++) {
    const id = targetIds[i];
    const existing = currentBundles[id];
    // If already fully extracted with rich text or structured specs, skip re-fetching
    const hasCompleteData = existing && existing.documents?.length > 0 && existing.pdfText && existing.pdfText.length > 200;
    if (hasCompleteData) {
      console.log(`[${i + 1}/${targetIds.length}] Bundle for ${id} already has complete extracted data (${existing.documents.length} docs, ${existing.pdfText.length} chars). Skipping.`);
      continue;
    }

    // If existing has docs but 0 text, it might be scanned PDFs needing Vision OCR
    const forceOcr = existing && existing.documents?.length > 0 && (!existing.pdfText || existing.pdfText.length < 50);

    console.log(`[${i + 1}/${targetIds.length}] Fetching bundle for ${id} (forceRefresh: ${!!forceOcr})...`);
    try {
      const bundle = await fetchTenderLiveBundle(id, undefined, !!forceOcr);
      if (bundle && bundle.documents && bundle.documents.length > 0) {
        currentBundles[id] = {
          ...bundle,
          // Limit heavy pdfText in bundles.json
          pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 30000) : ''
        };
        console.log(`  -> SUCCESS: ${bundle.documents.length} docs, isScannedOcr: ${bundle.isScannedOcr}, specs: ${bundle.structuredSpecs?.items?.length || 0} items`);
      } else {
        console.log(`  -> No documents returned for ${id}`);
      }
    } catch (err: any) {
      console.warn(`  -> Error fetching ${id}:`, err.message);
    }

    // Save incrementally
    fs.writeFileSync(bundlesPath, JSON.stringify(currentBundles, null, 2), 'utf8');
  }

  console.log(`\nFinished! Total saved bundles in lib/live-bundles.json: ${Object.keys(currentBundles).length}`);
}

main().catch(console.error);

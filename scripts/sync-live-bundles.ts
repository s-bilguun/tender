import fs from 'fs';
import path from 'path';
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
    '1789954038947', // Хоол хүнс (User's specific reported tender with 3 PDFs)
    '1789954035593', // МТЗ Дохиолол холбооны сэлбэг хэрэгсэл (ТББ.pdf + ТД.pdf)
    '1787266442855', // Хоол хүнс (Failed tender with 4 subTenders, delivery schedule & SCC)
  ];

  // Also read active tenders from live-tenders.json if available
  const liveTendersPath = path.join(process.cwd(), 'lib', 'live-tenders.json');
  if (fs.existsSync(liveTendersPath)) {
    try {
      const liveList = JSON.parse(fs.readFileSync(liveTendersPath, 'utf8'));
      if (Array.isArray(liveList)) {
        liveList.slice(0, 30).forEach((t: any) => {
          if (t.invitationId && !targetIds.includes(String(t.invitationId))) {
            targetIds.push(String(t.invitationId));
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  console.log(`Syncing live bundles for ${targetIds.length} tenders...`);

  for (let i = 0; i < targetIds.length; i++) {
    const id = targetIds[i];
    console.log(`[${i + 1}/${targetIds.length}] Fetching bundle for ${id}...`);
    try {
      const bundle = await fetchTenderLiveBundle(id);
      if (bundle && bundle.documents && bundle.documents.length > 0) {
        currentBundles[id] = {
          ...bundle,
          // Limit heavy pdfText in bundles.json
          pdfText: bundle.pdfText ? bundle.pdfText.substring(0, 30000) : ''
        };
        console.log(`  -> SUCCESS: ${bundle.documents.length} docs, ${bundle.subTenders?.length || 0} subTenders`);
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

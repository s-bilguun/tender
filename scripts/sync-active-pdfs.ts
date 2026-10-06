/**
 * TenderHub MN — Active Tenders PDF Ingestion & Storage Worker
 * 
 * Flow:
 * 1. Queries Supabase for active tenders (is_receiving = 1) needing PDFs
 * 2. Fetches tenderDocumentId from official portal
 * 3. Discovers attached ТШББ documents from gw/153
 * 4. Downloads official PDF using native curl (bypassing Cloudflare seamlessly)
 * 5. Uploads PDF to Supabase Storage bucket ('tender-documents')
 * 6. Extracts text and specs with pdf-parse
 * 7. Automatically updates tender in Supabase database with permanent CDN link
 * 
 * Usage:
 *   npx tsx scripts/sync-active-pdfs.ts --limit 5
 *   npx tsx scripts/sync-active-pdfs.ts --limit 50
 *   npx tsx scripts/sync-active-pdfs.ts --all
 */

import { execFile } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const BUCKET_NAME = 'tender-documents';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

function curlGet(url: string, asBuffer = false): Promise<string | Buffer | null> {
  return new Promise((resolve) => {
    const args = [
      '-s', '-L',
      '--connect-timeout', '15',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      '-H', 'Accept: application/pdf,application/json,text/html,*/*',
      '-H', 'Accept-Language: mn,en-US;q=0.9,en;q=0.8',
      '-H', 'Referer: https://www.tender.gov.mn/',
      url,
    ];

    execFile(curlCmd, args, {
      encoding: asBuffer ? 'buffer' : 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 35000,
    }, (err, stdout) => {
      if (err || !stdout) {
        return resolve(null);
      }
      resolve(stdout);
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
    console.log(`📦 Creating Supabase storage bucket '${BUCKET_NAME}'...`);
    await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  }
}

export async function processActiveTenders(limit = 10) {
  await ensureBucketExists();

  console.log(`\n🔍 Fetching active tenders needing PDF sync (limit: ${limit})...`);

  // Query active tenders
  const { data: activeTenders, error } = await supabase
    .from('tenders')
    .select('invitation_id, invitation_number, tender_code, tender_name, total_budget, budget_entity_name, raw_data')
    .eq('is_receiving', 1)
    .order('publish_date', { ascending: false })
    .limit(limit * 3); // fetch more to filter candidates

  if (error || !activeTenders) {
    console.error('❌ Could not query tenders from Supabase:', error?.message);
    return;
  }

  // Filter tenders that don't have stored PDF yet
  const candidates = activeTenders.filter((t) => {
    const docs = t.raw_data?.liveBundle?.documents;
    const hasStoredPdf = docs?.some((d: any) => d.isStored || (d.downloadUrl && d.downloadUrl.includes('supabase.co')));
    return !hasStoredPdf;
  }).slice(0, limit);

  console.log(`✨ Found ${candidates.length} active tenders ready for PDF download.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const tender = candidates[i];
    const invId = String(tender.invitation_id);
    const title = tender.tender_name || 'Тендер';
    console.log(`[${i + 1}/${candidates.length}] 📄 Processing: ${tender.tender_code || invId} — "${title.slice(0, 50)}..."`);

    try {
      // 1. Discover tenderDocumentId
      let tenderDocId = tender.raw_data?.tenderDocumentId;
      if (!tenderDocId) {
        const detailHtml = (await curlGet(`https://www.tender.gov.mn/mn/invitation/detail/${invId}`, false)) as string;
        if (detailHtml) {
          const docMatch = detailHtml.match(/tenderDocumentId[^\d]{1,20}(\d+)/i);
          if (docMatch) {
            tenderDocId = Number(docMatch[1]);
          }
        }
      }

      if (!tenderDocId) {
        console.warn(`   ⚠️ No tenderDocumentId found on detail page.`);
        failCount++;
        continue;
      }

      // 2. Discover document list from official gateway gw/153
      const listJsonStr = (await curlGet(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocId}&offset=1&limit=20`, false)) as string;
      if (!listJsonStr || !listJsonStr.trim().startsWith('[')) {
        console.warn(`   ⚠️ No documents returned from gateway (gw/153).`);
        failCount++;
        continue;
      }

      const docs = JSON.parse(listJsonStr);
      if (!Array.isArray(docs) || docs.length === 0) {
        console.warn(`   ⚠️ Empty document array.`);
        failCount++;
        continue;
      }

      const primaryDoc = docs[0];
      const fileId = primaryDoc.fileId;
      const fileName = primaryDoc.fileName || `${tender.tender_code || invId}_ТШББ.pdf`;

      // 3. Download official PDF via user.tender.gov.mn
      const downloadSrcUrl = `https://user.tender.gov.mn/mn/download/${fileId}`;
      console.log(`   ⬇️ Downloading PDF from portal [File ID: ${fileId}]...`);
      const pdfBuffer = (await curlGet(downloadSrcUrl, true)) as Buffer;

      if (!pdfBuffer || pdfBuffer.length < 500) {
        console.warn(`   ⚠️ Downloaded buffer too small or empty (${pdfBuffer?.length || 0} bytes).`);
        failCount++;
        continue;
      }

      // 4. Upload to Supabase Storage (Using ASCII-safe key for object storage)
      const storagePath = `tenders/${invId}/doc_${fileId}.pdf`;
      
      console.log(`   ☁️ Uploading to Supabase Storage (${(pdfBuffer.length / 1024).toFixed(1)} KB)...`);
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadErr) {
        console.error(`   ❌ Supabase Storage upload failed:`, uploadErr.message);
        failCount++;
        continue;
      }

      // 5. Get Public Permanent CDN URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // 6. Extract text with pdf-parse
      let extractedText = '';
      let pageCount = 1;
      try {
        const parsed = await pdfParse(pdfBuffer);
        extractedText = parsed.text || '';
        pageCount = parsed.numpages || 1;
      } catch (parseErr: any) {
        console.warn(`   ⚠️ pdf-parse text extraction warning:`, parseErr.message);
      }

      // Extract brief scope / BoQ summary
      const cleanLines = extractedText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 3);
      const scopeSummary = cleanLines.slice(0, 30).join('\n').slice(0, 1500);

      // 7. Update database record with linked PDF and structured data
      const updatedRawData = {
        ...(tender.raw_data || {}),
        tenderDocumentId: tenderDocId,
        pdfUrl: publicUrl,
        pdfFileName: fileName,
        pdfPageCount: pageCount,
        hasPdf: true,
        liveBundle: {
          schemaVersion: 2,
          tenderDocumentId: tenderDocId,
          pdfPageCount: pageCount,
          fullScopeOfWork: scopeSummary,
          documents: [
            {
              fileId,
              fileName,
              isPrimary: true,
              downloadUrl: publicUrl,
              storagePath,
              fileSize: pdfBuffer.length,
              isStored: true,
              storedAt: new Date().toISOString(),
              pageCount,
              extractedSummary: scopeSummary,
            },
            ...docs.slice(1).map((d: any) => ({
              fileId: d.fileId,
              fileName: d.fileName,
              isPrimary: false,
              downloadUrl: `https://user.tender.gov.mn/mn/download/${d.fileId}`,
            })),
          ],
          structuredSpecs: {
            rawSpecText: scopeSummary,
            fullScopeOfWork: scopeSummary,
            keyRequirements: [
              'Монгол Улсын Төрийн болон орон нутгийн өмчийн хөрөнгөөр бараа, ажил, үйлчилгээ худалдан авах тухай хуулийн шаардлага',
              'Албан ёсны ТШББ баримт бичиг бүрэн хавсаргагдсан',
            ],
          },
        },
      };

      const { error: updateErr } = await supabase
        .from('tenders')
        .update({
          raw_data: updatedRawData,
          updated_at: new Date().toISOString(),
        })
        .eq('invitation_id', tender.invitation_id);

      if (updateErr) {
        console.error(`   ❌ Failed to update Supabase row:`, updateErr.message);
        failCount++;
      } else {
        console.log(`   ✅ Success! Stored and permanently linked to tender:`);
        console.log(`      🔗 ${publicUrl}`);
        successCount++;
      }

      // Small delay between downloads to be polite to the host
      await sleep(1500);
    } catch (itemErr: any) {
      console.error(`   ❌ Error processing tender ${invId}:`, itemErr.message);
      failCount++;
    }
  }

  console.log(`\n🎉 Ingestion completed! Successfully synced: ${successCount}, Failed: ${failCount}\n`);
}

// CLI Runner
const args = process.argv.slice(2);
let limit = 5;
if (args.includes('--all')) {
  limit = 200;
} else {
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10) || 5;
  }
}

processActiveTenders(limit).catch((e) => {
  console.error('Fatal sync error:', e);
  process.exit(1);
});

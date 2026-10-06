/**
 * TenderHub MN — Active Tenders PDF Ingestion & Storage Worker
 * 
 * Flow:
 * 1. Queries Supabase for active tenders (is_receiving = 1) needing stored PDFs
 * 2. Fetches tenderDocumentId from official portal
 * 3. Discovers attached ТШББ documents from gw/153 gateway
 * 4. Downloads official PDF using native curl / verified attachment stream
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

export function curlGet(url: string, asBuffer = false): Promise<string | Buffer | null> {
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
    }, async (err, stdout) => {
      if (err || !stdout || (asBuffer && (stdout as Buffer).length === 0)) {
        // Fallback to fetch
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              'Accept': asBuffer ? 'application/pdf,*/*' : 'application/json,text/html,*/*',
              'Referer': 'https://www.tender.gov.mn/',
            },
          });
          if (res.ok) {
            if (asBuffer) {
              const ab = await res.arrayBuffer();
              return resolve(Buffer.from(ab));
            } else {
              const text = await res.text();
              return resolve(text);
            }
          }
        } catch {}
        return resolve(null);
      }
      resolve(stdout);
    });
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
    console.log(`📦 Creating Supabase storage bucket '${BUCKET_NAME}'...`);
    await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  }
}

export interface SyncPdfResult {
  success: boolean;
  invitationId: string | number;
  tenderCode?: string;
  publicUrl?: string;
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  error?: string;
}

/**
 * Syncs and stores official PDF for a single tender into Supabase Storage & updates row
 */
export async function syncSingleTenderPdf(tender: any): Promise<SyncPdfResult> {
  const invId = String(tender.invitation_id || tender.invitationId);
  const tenderCode = tender.tender_code || tender.tenderCode || invId;

  try {
    // 1. Discover tenderDocumentId
    let tenderDocId = tender.raw_data?.tenderDocumentId || tender.raw_data?.liveBundle?.tenderDocumentId;
    if (!tenderDocId) {
      const detailHtml = (await curlGet(`https://www.tender.gov.mn/mn/invitation/detail/${invId}`, false)) as string;
      if (detailHtml) {
        const docMatch = detailHtml.match(/tenderDocumentId(?:&quot;|"|\\\"|'|:|\s|=)*(\d+)/i);
        if (docMatch) {
          tenderDocId = Number(docMatch[1]);
        }
      }
    }

    if (!tenderDocId) {
      return { success: false, invitationId: invId, tenderCode, error: 'No tenderDocumentId found' };
    }

    // 2. Discover document list from official gateway gw/153
    const listJsonStr = (await curlGet(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocId}&offset=1&limit=20`, false)) as string;
    if (!listJsonStr || !listJsonStr.trim().startsWith('[')) {
      return { success: false, invitationId: invId, tenderCode, error: 'No documents returned from gw/153' };
    }

    const docs = JSON.parse(listJsonStr);
    if (!Array.isArray(docs) || docs.length === 0) {
      return { success: false, invitationId: invId, tenderCode, error: 'Empty document list' };
    }

    const primaryDoc = docs[0];
    const fileId = primaryDoc.fileId;
    const fileName = primaryDoc.fileName || `${tenderCode}_ТШББ.pdf`;

    // 3. Download official PDF via user.tender.gov.mn
    const downloadSrcUrl = `https://user.tender.gov.mn/mn/download/${fileId}`;
    const pdfBuffer = (await curlGet(downloadSrcUrl, true)) as Buffer;

    if (!pdfBuffer || pdfBuffer.length < 500) {
      return { success: false, invitationId: invId, tenderCode, error: `Invalid buffer (${pdfBuffer?.length || 0} bytes)` };
    }

    // 4. Upload to Supabase Storage (tenders/${invId}/doc_${fileId}.pdf)
    const storagePath = `tenders/${invId}/doc_${fileId}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      return { success: false, invitationId: invId, tenderCode, error: `Storage upload error: ${uploadErr.message}` };
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
    } catch {
      // ignore parse text warning
    }

    // Extract brief scope summary
    const cleanLines = extractedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3);
    const scopeSummary = cleanLines.slice(0, 30).join('\n').slice(0, 1500);

    // 7. Update database record with linked PDF and structured data
    const existingRaw = tender.raw_data || {};
    const existingLiveBundle = existingRaw.liveBundle || {};

    const updatedRawData = {
      ...existingRaw,
      tenderDocumentId: tenderDocId,
      pdfUrl: publicUrl,
      pdfFileName: fileName,
      pdfPageCount: pageCount,
      hasPdf: true,
      liveBundle: {
        ...existingLiveBundle,
        schemaVersion: 2,
        tenderDocumentId: tenderDocId,
        pdfPageCount: pageCount,
        fullScopeOfWork: scopeSummary || existingLiveBundle.fullScopeOfWork,
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
          ...(existingLiveBundle.structuredSpecs || {}),
          rawSpecText: scopeSummary || existingLiveBundle.structuredSpecs?.rawSpecText,
          fullScopeOfWork: scopeSummary || existingLiveBundle.structuredSpecs?.fullScopeOfWork,
        },
      },
    };

    const { error: updateErr } = await supabase
      .from('tenders')
      .update({
        raw_data: updatedRawData,
        updated_at: new Date().toISOString(),
      })
      .eq('invitation_id', tender.invitation_id || invId);

    if (updateErr) {
      return { success: false, invitationId: invId, tenderCode, error: `DB update error: ${updateErr.message}` };
    }

    return {
      success: true,
      invitationId: invId,
      tenderCode,
      publicUrl,
      fileName,
      fileSize: pdfBuffer.length,
      pageCount,
    };
  } catch (err: any) {
    return { success: false, invitationId: invId, tenderCode, error: err.message };
  }
}

/**
 * Fetch candidates among active tenders that need a stored PDF
 */
export async function getMissingPdfCandidates(maxCandidates = 1000): Promise<any[]> {
  const { data: activeTenders, error } = await supabase
    .from('tenders')
    .select('invitation_id, invitation_number, tender_code, tender_name, total_budget, budget_entity_name, raw_data')
    .eq('is_receiving', 1)
    .order('publish_date', { ascending: false })
    .limit(1000);

  if (error || !activeTenders) {
    console.error('❌ Could not query active tenders:', error?.message);
    return [];
  }

  return activeTenders.filter((t) => {
    const rawData = t.raw_data;
    if (rawData?.pdfUrl && typeof rawData.pdfUrl === 'string' && rawData.pdfUrl.includes('supabase.co')) {
      return false;
    }
    const docs = rawData?.liveBundle?.documents;
    const hasStoredPdf = docs?.some((d: any) => d.isStored || (d.downloadUrl && typeof d.downloadUrl === 'string' && d.downloadUrl.includes('supabase.co')));
    return !hasStoredPdf;
  }).slice(0, maxCandidates);
}

/**
 * Batch processor for all active tenders
 */
export async function processActiveTenders(limit = 10, concurrency = 2) {
  await ensureBucketExists();

  console.log(`\n🔍 Scanning active tenders needing official PDF sync (target: ${limit})...`);
  const candidates = await getMissingPdfCandidates(limit);

  if (candidates.length === 0) {
    console.log(`🎉 All active tenders already have official PDFs stored in Supabase Storage!`);
    return;
  }

  console.log(`✨ Found ${candidates.length} active tenders ready for PDF ingestion.`);
  console.log(`⚡ Concurrency: ${concurrency} workers\n`);

  let successCount = 0;
  let failCount = 0;
  let processedIndex = 0;

  // Worker loop
  async function worker(workerId: number) {
    while (processedIndex < candidates.length) {
      const currentIndex = processedIndex++;
      const tender = candidates[currentIndex];
      const invId = String(tender.invitation_id);
      const title = tender.tender_name || 'Тендер';
      const progressPct = (((currentIndex + 1) / candidates.length) * 100).toFixed(1);

      console.log(`[W${workerId}][${currentIndex + 1}/${candidates.length} - ${progressPct}%] 📄 Processing: ${tender.tender_code || invId} — "${title.slice(0, 42)}..."`);

      const result = await syncSingleTenderPdf(tender);

      if (result.success) {
        successCount++;
        const sizeKb = ((result.fileSize || 0) / 1024).toFixed(0);
        console.log(`  ✅ [W${workerId}] Stored: ${result.fileName} (${sizeKb} KB, ${result.pageCount}p)`);
        console.log(`     🔗 ${result.publicUrl}`);
      } else {
        failCount++;
        console.warn(`  ⚠️ [W${workerId}] Skipped: ${result.error}`);
      }

      // Small respectful delay
      await sleep(1200);
    }
  }

  // Launch workers
  const workers = Array.from({ length: Math.min(concurrency, candidates.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`🏁 Ingestion finished: ${successCount} stored successfully, ${failCount} skipped/failed.`);
  console.log(`══════════════════════════════════════════════════════════\n`);
}

// CLI Execution
if (typeof process !== 'undefined' && process.argv && (require.main === module || (process.argv[1] && process.argv[1].endsWith('sync-active-pdfs.ts')))) {
  const args = process.argv.slice(2);
  let limit = 10;
  let concurrency = 2;

  if (args.includes('--all')) {
    limit = 1000;
  } else {
    const limitIdx = args.indexOf('--limit');
    if (limitIdx !== -1 && args[limitIdx + 1]) {
      limit = parseInt(args[limitIdx + 1], 10) || 10;
    }
  }

  const concIdx = args.indexOf('--concurrency');
  if (concIdx !== -1 && args[concIdx + 1]) {
    concurrency = parseInt(args[concIdx + 1], 10) || 2;
  }

  processActiveTenders(limit, concurrency).catch((e) => {
    console.error('Fatal sync error:', e);
    process.exit(1);
  });
}

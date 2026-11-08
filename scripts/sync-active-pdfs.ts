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
import { fetchVerifiedAttachment } from '../lib/source-attachment';
import { parsePdfContent, isGarbledPdfText } from '../lib/live-fetcher';
import { LIVE_BUNDLE_SCHEMA_VERSION } from '../lib/types';
import { fetchStealthHtml, hasScrapingProvider } from '../lib/ingestion/stealth-fetcher';
import { mergeLegacyAttachments, replacePdfDocumentSections } from '../lib/legacy-attachment-merge';
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

dotenv.config({ path: process.env.TENDER_WORKER_ENV_FILE || '.env.tender-worker' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
const BUCKET_NAME = 'tender-documents';

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : new Proxy({} as ReturnType<typeof createClient>, { get() { throw new Error('Missing Supabase URL or service-role key'); } });

const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

export function curlGet(url: string, asBuffer = false): Promise<string | Buffer | null> {
  const browserTransport = (globalThis as any).__TENDER_SOURCE_BROWSER__;
  if (!asBuffer && browserTransport?.getText) return browserTransport.getText(url);
  if (hasScrapingProvider() && !asBuffer) {
    return fetchStealthHtml(url);
  }
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

function sourceChallenged(body: unknown): boolean {
  return typeof body === 'string' && /just a moment|performing security verification|cf-chl-|challenge-platform/i.test(body);
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
  warnings?: string[];
  discoveryOnly?: boolean;
  skipped?: boolean;
  unchanged?: boolean;
}

/**
 * Syncs and stores official PDF for a single tender into Supabase Storage & updates row
 */
export async function syncSingleTenderPdf(tender: any, options: { discoveryOnly?: boolean } = {}): Promise<SyncPdfResult> {
  const invId = String(tender.invitation_id || tender.invitationId);
  const tenderCode = tender.tender_code || tender.tenderCode || invId;

  const lastDiscovery = Date.parse(tender.raw_data?.liveBundle?.attachmentDiscoveredAt || '');
  if (options.discoveryOnly && Number.isFinite(lastDiscovery) && lastDiscovery <= Date.now() && Date.now() - lastDiscovery < 24 * 60 * 60 * 1000) {
    return { success: true, invitationId: invId, tenderCode, discoveryOnly: true, skipped: true };
  }

  // Store PDFs only for live tenders (deadline not passed).
  const receiveDate = tender.receive_date || tender.receiveDate;
  if (receiveDate && new Date(receiveDate).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return { success: false, invitationId: invId, tenderCode, error: 'Tender closed; PDF not stored' };
  }

  try {
    // The legacy public detail page lists attachment IDs in server-rendered
    // HTML, even when the newer site's JSON gateways are unavailable.
    let tenderDocId = tender.raw_data?.tenderDocumentId || tender.raw_data?.liveBundle?.tenderDocumentId;
    let docs: any[] = [];
    const discoveryErrors: string[] = [];
    const browserTransport = (globalThis as any).__TENDER_SOURCE_BROWSER__;
    if (browserTransport?.getLegacyDocuments) {
      const legacy = await browserTransport.getLegacyDocuments(invId);
      tenderDocId = legacy.tenderDocumentId || tenderDocId;
      docs = legacy.documents;
    } else {
    if (!tenderDocId) {
      const detailHtml = (await curlGet(`https://www.tender.gov.mn/mn/invitation/detail/${invId}`, false)) as string;
      if (sourceChallenged(detailHtml)) return { success: false, invitationId: invId, tenderCode, error: 'Source access challenged by Cloudflare' };
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
    const listJsonStr = (await curlGet(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocId}&offset=1&limit=9999`, false)) as string;
    if (sourceChallenged(listJsonStr)) return { success: false, invitationId: invId, tenderCode, error: 'Source access challenged by Cloudflare' };
    if (!listJsonStr || !listJsonStr.trim().startsWith('[')) {
      return { success: false, invitationId: invId, tenderCode, error: 'No documents returned from gw/153' };
    }

    docs = JSON.parse(listJsonStr);
    if (!Array.isArray(docs)) {
      return { success: false, invitationId: invId, tenderCode, error: 'Empty document list' };
    }

    // Other official lists contain technical documents and clarifications.
    // Keep a failed list visible in the result; it must not mean zero files.
    for (const [kind, url] of [
      ['technical', `https://www.tender.gov.mn/api/gw/88/list?tenderDocumentId=${tenderDocId}`],
      ['clarifications', `https://www.tender.gov.mn/api/gw/106/list?invitationId=${invId}`],
    ]) {
      try {
        const body = await curlGet(url, false);
        const list = typeof body === 'string' ? JSON.parse(body) : null;
        if (!Array.isArray(list)) throw new Error('Invalid response');
        const files = kind === 'clarifications' ? list.flatMap((item: any) => Array.isArray(item.files) ? item.files : []) : list;
        for (const file of files) {
          if (file?.fileId && !docs.some((doc: any) => String(doc.fileId) === String(file.fileId))) docs.push(file);
        }
      } catch { discoveryErrors.push(`${kind} attachment list unavailable`); }
    }
    }

    if (!docs.length) return { success: false, invitationId: invId, tenderCode, error: discoveryErrors.length ? discoveryErrors.join('; ') : 'No attachments found' };

    // Keep the official attachment list even if a subsequent PDF download is
    // blocked. Merge with the latest row so existing uploaded or stored files
    // remain available, and never label a discovered file as already read.
    if (browserTransport?.getLegacyDocuments) {
      const { data: latest, error: readError } = await supabase.from('tenders').select('raw_data').eq('invitation_id', tender.invitation_id || invId).maybeSingle();
      if (readError || !latest) throw new Error(`Could not read tender before saving attachment list: ${readError?.message || 'not found'}`);
      const raw: any = latest.raw_data || {};
      const bundle: any = raw.liveBundle || {};
      const previous: any[] = Array.isArray(bundle.documents) ? bundle.documents : [];
      const merged = mergeLegacyAttachments(previous, docs);
      const pdfDocs = docs.filter((doc: any) => String(doc.fileExtention || '').toLowerCase() === 'pdf' || !doc.fileName || !/\.[a-z0-9]{2,5}$/i.test(doc.fileName) || /\.pdf$/i.test(doc.fileName));
      const allVerified = pdfDocs.length > 0 && pdfDocs.every((doc: any) => previous.some((old: any) => String(old.fileId) === String(doc.fileId) && old.isStored && old.verifiedPdf && old.downloadUrl));
      const nextRaw = { ...raw, tenderDocumentId: tenderDocId || raw.tenderDocumentId, liveBundle: {
        ...bundle, schemaVersion: LIVE_BUNDLE_SCHEMA_VERSION, documents: merged.documents,
        extractionStatus: bundle.extractionStatus === 'complete' && merged.newlyDiscovered ? 'partial' : (bundle.extractionStatus || 'unavailable'),
        attachmentDiscoverySource: 'legacy_public_page',
        attachmentDiscoveryVersion: 1,
        attachmentDiscoveredAt: new Date().toISOString(),
        acquisitionErrors: allVerified ? [] : (bundle.acquisitionErrors || []),
      } };
      const { error: saveError } = await supabase.from('tenders').update({ raw_data: nextRaw, updated_at: new Date().toISOString() }).eq('invitation_id', tender.invitation_id || invId);
      if (saveError) throw new Error(`Could not save discovered attachments: ${saveError.message}`);
      tender.raw_data = nextRaw;
      if (allVerified && !options.discoveryOnly) return { success: true, invitationId: invId, tenderCode, unchanged: true };
    }
    if (options.discoveryOnly) return { success: true, invitationId: invId, tenderCode, discoveryOnly: true };
    // Prefer a PDF when the source lists spreadsheets or other formats first.
    const firstPdf = docs.findIndex((doc: any) => String(doc.fileExtention || '').toLowerCase() === 'pdf' || !doc.fileName || !/\.[a-z0-9]{2,5}$/i.test(doc.fileName) || /\.pdf$/i.test(doc.fileName));
    if (firstPdf < 0) return { success: false, invitationId: invId, tenderCode, error: 'No PDF attachment found' };
    if (firstPdf > 0) docs.unshift(docs.splice(firstPdf, 1)[0]);

    const primaryDoc = docs[0];
    const fileId = primaryDoc.fileId;
    const fileName = primaryDoc.fileName || `${tenderCode}_ТШББ.pdf`;

    // 3. Download official PDF via user.tender.gov.mn
    const { buffer: pdfBuffer } = await fetchVerifiedAttachment(fileId);

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
    let pageCount = 0;
    const pageTexts: string[] = [];
    try {
      const parsed = await pdfParse(pdfBuffer, { pagerender: async (page: any) => {
        const content = await page.getTextContent();
        let y: number | null = null;
        let text = '';
        for (const item of content.items || []) {
          const nextY = item.transform?.[5];
          text += y !== null && nextY != null && Math.abs(nextY - y) > 2 ? '\n' : ' ';
          text += typeof item.str === 'string' ? item.str : '';
          if (nextY != null) y = nextY;
        }
        pageTexts.push(text.trim());
        return text;
      }});
      extractedText = parsed.text || '';
      pageCount = parsed.numpages || 0;
    } catch {
      // ignore parse text warning
    }

    // Extract substantive scope summary using smart BDS extraction
    let scopeSummary = '';
    const bdsIdx = extractedText.lastIndexOf('ӨГӨГДЛИЙН ХҮСНЭГТ');
    if (bdsIdx !== -1) {
      const excerpt = extractedText.slice(bdsIdx, bdsIdx + 4000);
      const match = excerpt.match(/(?:ТШЗ\s*1\.\d|A\.\s*ЕРӨНХИЙ ЗҮЙЛ|ТШЗ\s*17\.|ТШЗ\s*18\.)[\s\S]{100,2000}/i);
      scopeSummary = (match ? match[0] : excerpt.slice(0, 1500)).trim();
    }
    if (!scopeSummary) {
      const cleanLines = extractedText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 3);
      scopeSummary = cleanLines.slice(0, 30).join('\n').slice(0, 1500);
    }

    // 7. Update database record with linked PDF and structured data
    const existingRaw = tender.raw_data || {};
    const existingLiveBundle = existingRaw.liveBundle || {};
    const extraDocuments: any[] = [];
    const extraText: string[] = [];
    for (const doc of docs.slice(1)) {
      const old = existingLiveBundle.documents?.find((item: any) => String(item.fileId) === String(doc.fileId));
      if (old?.isStored && old?.verifiedPdf && old?.downloadUrl) { extraDocuments.push(old); continue; }
      const name = doc.fileName || `${doc.fileId}.pdf`;
      const ext = String(doc.fileExtention || name.split('.').pop() || '').toLowerCase();
      if (ext && ext !== 'pdf' && /\.[a-z0-9]{2,5}$/i.test(name)) {
        extraDocuments.push({ ...doc, downloadUrl: `https://user.tender.gov.mn/mn/download/${doc.fileId}`, extractionStatus: 'not_extracted' });
        continue;
      }
      try {
        const { buffer } = await fetchVerifiedAttachment(doc.fileId);
        const path = `tenders/${invId}/doc_${doc.fileId}.pdf`;
        const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, buffer, { contentType: 'application/pdf', upsert: true });
        if (error) throw error;
        const url = supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
        const pages: string[] = [];
        let count = 0;
        try {
          const result = await pdfParse(buffer, { pagerender: async (page: any) => {
            const content = await page.getTextContent();
            const text = (content.items || []).map((item: any) => item.str || '').join(' ');
            pages.push(text.trim());
            return text;
          }});
          count = result.numpages || 0;
        } catch { /* The file is stored; text extraction can be retried. */ }
        const readable = pages.filter((page) => page.length > 20).length;
        if (readable) extraText.push(`--- DOCUMENT ${doc.fileId}: ${name} ---\n` + pages.map((page, i) => page.length > 20 ? `[Page ${i + 1}]\n${page}` : '').filter(Boolean).join('\n\n'));
        extraDocuments.push({ ...doc, fileName: name, downloadUrl: url, storagePath: path, isStored: true, verifiedPdf: true, fileSize: buffer.length,
          extractionStatus: readable ? (readable >= count ? 'text_extracted' : 'partial') : (count ? 'scanned_not_processed' : 'not_extracted'),
          extractedPageCount: readable, totalPageCount: count });
      } catch (error: any) {
        discoveryErrors.push(`Attachment ${doc.fileId}: ${error.message}`);
        extraDocuments.push({ ...old, ...doc, downloadUrl: `https://user.tender.gov.mn/mn/download/${doc.fileId}`, extractionStatus: 'source_error' });
      }
    }
    const readable = extractedText.length > 30 && !isGarbledPdfText(extractedText);
    const readablePages = readable ? pageTexts.filter((page) => page.length > 20).length : 0;
    const documentText = readable ? `--- DOCUMENT ${fileId}: ${fileName} ---\n` + pageTexts.map((page, i) => page.length > 20 ? `[Page ${i + 1}]\n${page}` : '').filter(Boolean).join('\n\n') : '';
    const allReadableText = [readable ? extractedText : '', ...extraText].filter(Boolean).join('\n\n');
    const parsedSpecs = allReadableText ? parsePdfContent(allReadableText) : {};
    const mergedSpecs: any = { ...(existingLiveBundle.structuredSpecs || {}) };
    for (const [key, value] of Object.entries(parsedSpecs)) {
      if (value != null && value !== '' && (!Array.isArray(value) || value.length)) mergedSpecs[key] = value;
    }
    const preservedDocs = (existingLiveBundle.documents || []).filter((old: any) => !docs.some((doc: any) => String(doc.fileId) === String(old.fileId)));

    const updatedRawData = {
      ...existingRaw,
      tenderDocumentId: tenderDocId,
      pdfUrl: publicUrl,
      pdfFileName: fileName,
      pdfPageCount: pageCount,
      hasPdf: true,
      full_scope_of_work: scopeSummary || existingRaw.full_scope_of_work || existingLiveBundle.fullScopeOfWork,
      liveBundle: {
        ...existingLiveBundle,
        schemaVersion: LIVE_BUNDLE_SCHEMA_VERSION,
        tenderDocumentId: tenderDocId,
        pdfPageCount: pageCount,
        pdfText: replacePdfDocumentSections(existingLiveBundle.pdfText, [documentText, ...extraText]),
        extractionStatus: readablePages && readablePages >= pageCount && extraDocuments.every((doc) => doc.extractionStatus === 'text_extracted') && preservedDocs.every((doc: any) => doc.extractionStatus === 'text_extracted') && !discoveryErrors.length ? 'complete' : 'partial',
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
            verifiedPdf: true,
            storedAt: new Date().toISOString(),
            pageCount,
            totalPageCount: pageCount,
            extractedPageCount: readablePages,
            extractionStatus: readablePages ? (readablePages >= pageCount ? 'text_extracted' : 'partial') : (pageCount ? 'scanned_not_processed' : 'not_extracted'),
            extractedSummary: scopeSummary,
          },
          ...extraDocuments,
          ...preservedDocs,
        ],
        acquisitionErrors: discoveryErrors,
        attachmentDiscoveryVersion: 1,
        attachmentDiscoverySource: browserTransport?.getLegacyDocuments ? 'legacy_public_page' : 'gateway',
        structuredSpecs: {
          ...mergedSpecs,
          rawSpecText: mergedSpecs.rawSpecText || scopeSummary,
          fullScopeOfWork: mergedSpecs.fullScopeOfWork || scopeSummary,
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
      warnings: discoveryErrors,
    };
  } catch (err: any) {
    return { success: false, invitationId: invId, tenderCode, error: err.message };
  }
}

/**
 * Fetch candidates among active tenders that need a stored PDF
 */
export async function getMissingPdfCandidates(maxCandidates = 1000): Promise<any[]> {
  const candidates: any[] = [];
  const pageSize = 100;
  let page = 0;

  while (candidates.length < maxCandidates) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data: batch, error } = await supabase
      .from('tenders')
      .select('invitation_id, invitation_number, tender_code, tender_name, total_budget, budget_entity_name, receive_date, raw_data')
      .eq('is_receiving', 1)
      .order('publish_date', { ascending: false })
      .order('invitation_id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Could not query active tenders: ${error.message}`);
    }

    if (!batch || batch.length === 0) {
      break;
    }

    for (const t of batch) {
      if (t.receive_date && Number.isFinite(Date.parse(t.receive_date)) && Date.parse(t.receive_date) < Date.now()) continue;
      const rawData = t.raw_data;
      const docs = rawData?.liveBundle?.documents;
      const hasStoredPdf = Boolean(rawData?.pdfUrl?.includes('supabase.co') || docs?.some((d: any) => d.isStored));
      const missingKnownPdf = docs?.some((d: any) => d.fileId && !d.isStored && !String(d.downloadUrl || '').includes('supabase.co') && (!d.fileName || /\.pdf$/i.test(d.fileName)));
      const incompleteDiscovery = rawData?.liveBundle?.attachmentDiscoveryVersion !== 1 || rawData?.liveBundle?.acquisitionErrors?.length > 0;
      const lastDiscovery = Date.parse(rawData?.liveBundle?.attachmentDiscoveredAt || '');
      const staleDiscovery = !Number.isFinite(lastDiscovery) || lastDiscovery > Date.now() || Date.now() - lastDiscovery >= 24 * 60 * 60 * 1000;
      if (!hasStoredPdf || missingKnownPdf || incompleteDiscovery || staleDiscovery) {
        candidates.push(t);
        if (candidates.length >= maxCandidates) break;
      }
    }

    if (batch.length < pageSize) break;
    page++;
  }

  return candidates;
}

/**
 * Batch processor for all active tenders
 */
export async function processActiveTenders(limit = 10, concurrency = 2) {
  await ensureBucketExists();

  console.log(`\n🔍 Scanning active tenders needing official PDF sync (target: ${limit})...`);
  const candidates = await getMissingPdfCandidates(limit);

  if (candidates.length === 0) {
    console.log('No active tenders currently matched the PDF acquisition queue.');
    return;
  }

  console.log(`✨ Found ${candidates.length} active tenders ready for PDF ingestion.`);
  console.log(`⚡ Concurrency: ${concurrency} workers\n`);

  let successCount = 0;
  let failCount = 0;
  let discoveryCount = 0;
  let processedIndex = 0;
  let sourceDownloadBlocked = false;
  let stopWork = false;

  // Worker loop
  async function worker(workerId: number) {
    while (processedIndex < candidates.length && !stopWork) {
      const currentIndex = processedIndex++;
      const tender = candidates[currentIndex];
      const invId = String(tender.invitation_id);
      const title = tender.tender_name || 'Тендер';
      const progressPct = (((currentIndex + 1) / candidates.length) * 100).toFixed(1);

      console.log(`[W${workerId}][${currentIndex + 1}/${candidates.length} - ${progressPct}%] 📄 Processing: ${tender.tender_code || invId} — "${title.slice(0, 42)}..."`);

      const discoveryOnly = sourceDownloadBlocked && !!(globalThis as any).__TENDER_SOURCE_BROWSER__?.getLegacyDocuments;
      const result = await syncSingleTenderPdf(tender, { discoveryOnly });

      if (result.success) {
        if (result.discoveryOnly) {
          if (!result.skipped) discoveryCount++;
          console.log(result.skipped ? '  ↪ Attachment list was checked recently.' : '  📋 Saved the attachment list; PDF download remains blocked.');
          await sleep(1200);
          continue;
        }
        if (result.unchanged) {
          successCount++;
          console.log('  ↪ Verified attachments are unchanged.');
          await sleep(1200);
          continue;
        }
        if (result.warnings?.some((warning) => /Attachment access failed: HTTP (403|429)|source access challenged/i.test(warning))) sourceDownloadBlocked = true;
        if (result.warnings?.length) failCount++; else successCount++;
        const sizeKb = ((result.fileSize || 0) / 1024).toFixed(0);
        console.log(`  ✅ [W${workerId}] Stored: ${result.fileName} (${sizeKb} KB, ${result.pageCount}p)`);
        console.log(`     🔗 ${result.publicUrl}`);
        if (result.warnings?.length) console.warn(`     ⚠ Incomplete: ${result.warnings.join('; ')}`);
      } else {
        failCount++;
        const downloadBlocked = /Attachment access failed: HTTP (403|429)|source access challenged/i.test(result.error || '');
        if (downloadBlocked && !discoveryOnly && (globalThis as any).__TENDER_SOURCE_BROWSER__?.getLegacyDocuments) {
          sourceDownloadBlocked = true;
          console.warn('Source blocked PDF downloads; continuing with attachment discovery only.');
        } else if (/challenge|HTTP 403|HTTP 429|blocked response/i.test(result.error || '')) {
          stopWork = true;
        }
        console.warn(`  ⚠️ [W${workerId}] Skipped: ${result.error}`);
      }

      // Small respectful delay
      await sleep(1200);
    }
  }

  // Launch workers
  const workers = Array.from({ length: Math.min(concurrency, candidates.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  if (sourceDownloadBlocked || stopWork) console.warn('PDF access was blocked; retry downloads after access is restored.');

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`🏁 Ingestion finished: ${successCount} stored successfully, ${discoveryCount} attachment lists saved, ${failCount} skipped/failed.`);
  console.log(`══════════════════════════════════════════════════════════\n`);
  if (failCount) process.exitCode = 1;
}

// CLI Execution
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('sync-active-pdfs.ts')) {
  const args = process.argv.slice(2);
  let limit = 10;
  let concurrency = 2;

  if (args.includes('--all')) {
    limit = Number.MAX_SAFE_INTEGER;
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

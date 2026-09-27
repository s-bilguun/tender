const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = process.env.TENDER_WORKER_ENV_FILE || path.join(REPO_ROOT, '.env.tender-worker');
const ALLOWED_HOSTS = new Set(['www.tender.gov.mn', 'user.tender.gov.mn']);
const CHALLENGE_PATTERN = /attention required|cloudflare|verify you are human|captcha|access denied|just a moment|checking your browser/i;

function loadWorkerEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  const contents = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function validateSourceUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing source request outside tender.gov.mn: ${url.origin}`);
  }
  return url;
}

function looksLikeChallenge(status, body, title = '') {
  return status === 403 || CHALLENGE_PATTERN.test(`${title}\n${String(body || '').slice(0, 3000)}`);
}

async function pageText(page) {
  try {
    return {
      title: await page.title(),
      body: await page.locator('body').innerText({ timeout: 2500 }).catch(() => ''),
    };
  } catch {
    return { title: '', body: '' };
  }
}

async function waitForHumanBrowserCheck(page, targetUrl) {
  console.warn(`\nEdge needs a human source-site check for ${new URL(targetUrl).hostname}. Complete it in the visible Edge window; waiting up to 90 seconds.`);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(3000);
    const current = await pageText(page);
    if (!looksLikeChallenge(200, current.body, current.title)) return true;
  }
  return false;
}

async function run() {
  loadWorkerEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(`Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to ${ENV_FILE}.`);
  }

  const localData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const profileDir = process.env.TENDER_EDGE_PROFILE || path.join(localData, 'TenderMN', 'EdgeSourceProfile');
  fs.mkdirSync(profileDir, { recursive: true });

  console.log('Starting a visible Microsoft Edge session for the official source.');
  console.log('The worker uses this separate Edge profile; it does not read your everyday Edge profile or saved passwords.');
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'msedge',
    headless: false,
    acceptDownloads: true,
    timeout: 60_000,
    viewport: { width: 1440, height: 1000 },
  });

  const pagesByOrigin = new Map();
  const pendingPagesByOrigin = new Map();
  let failureCount = 0;

  async function ensureOriginPage(origin) {
    let page = pagesByOrigin.get(origin);
    if (page && !page.isClosed()) return page;
    if (pendingPagesByOrigin.has(origin)) return pendingPagesByOrigin.get(origin);

    const pendingPage = (async () => {
      page = await context.newPage();
      const response = await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null);
      const current = await pageText(page);
      if (looksLikeChallenge(response?.status() || 200, current.body, current.title)) {
        const cleared = await waitForHumanBrowserCheck(page, `${origin}/`);
        if (!cleared) throw new Error(`Edge could not pass the source access check for ${origin}. No data was changed by this worker run.`);
      }
      pagesByOrigin.set(origin, page);
      return page;
    })();
    pendingPagesByOrigin.set(origin, pendingPage);
    try {
      return await pendingPage;
    } finally {
      pendingPagesByOrigin.delete(origin);
    }
  }

  async function browserRequestText(rawUrl, method = 'GET', body = undefined) {
    const url = validateSourceUrl(rawUrl);
    const page = await ensureOriginPage(url.origin);
    const send = () => page.evaluate(async ({ requestUrl, requestMethod, requestBody }) => {
      const response = await fetch(requestUrl, {
        method: requestMethod,
        credentials: 'include',
        cache: 'no-store',
        headers: requestBody === undefined ? { Accept: '*/*' } : { Accept: '*/*', 'Content-Type': 'application/json' },
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
      });
      return { status: response.status, text: await response.text() };
    }, { requestUrl: url.toString(), requestMethod: method, requestBody: body });

    try {
      let response = await send();
      if (looksLikeChallenge(response.status, response.text)) {
        await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null);
        const cleared = await waitForHumanBrowserCheck(page, url.toString());
        if (cleared) response = await send();
      }
      if (response.status < 200 || response.status >= 300 || looksLikeChallenge(response.status, response.text)) {
        throw new Error(`Official source returned HTTP ${response.status} to Edge for ${url.pathname}.`);
      }
      if (url.pathname.startsWith('/api/') && !/^\s*[\[{]/.test(response.text)) {
        throw new Error(`Official API returned a non-JSON response to Edge for ${url.pathname}.`);
      }
      return response.text;
    } catch (error) {
      if (/^\/mn\/invitation\/detail\//.test(url.pathname) || /^\/api\/gw\/(153|88|106)\//.test(url.pathname)) {
        failureCount += 1;
      }
      throw error;
    }
  }

  async function browserDownload(rawUrl, allowImage = false) {
    const url = validateSourceUrl(rawUrl);
    if (url.hostname !== 'user.tender.gov.mn' || !/^\/mn\/download\/\d+$/.test(url.pathname)) {
      throw new Error('Refusing an unexpected attachment URL.');
    }

    const page = await context.newPage();
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tender-edge-download-'));
    try {
      const tryDownload = async () => {
        let download = null;
        let resolveDownload;
        const downloadEvent = new Promise((resolve) => { resolveDownload = resolve; });
        page.once('download', (event) => {
          download = event;
          resolveDownload(event);
        });
        let response = null;
        let navigationError = null;
        await page.setExtraHTTPHeaders({ Referer: 'https://www.tender.gov.mn/' });
        try {
          response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        } catch (error) {
          navigationError = error;
        }
        if (!download) download = await Promise.race([downloadEvent, page.waitForTimeout(750).then(() => null)]);
        if (download) {
          const filePath = path.join(tempDir, download.suggestedFilename() || 'attachment.pdf');
          await download.saveAs(filePath);
          return { status: 200, contentType: '', buffer: await fs.promises.readFile(filePath) };
        }
        if (navigationError) throw navigationError;
        if (!response) throw new Error('Edge did not return a PDF response or a browser download.');
        return {
          status: response.status(),
          contentType: response.headers()['content-type'] || '',
          buffer: await response.body(),
        };
      };

      let result = await tryDownload();
      if (looksLikeChallenge(result.status, result.buffer.toString('utf8', 0, 3000))) {
        const cleared = await waitForHumanBrowserCheck(page, url.toString());
        if (cleared) result = await tryDownload();
      }
      const buffer = Buffer.from(result.buffer);
      const isPdf = buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
      const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      if (result.status < 200 || result.status >= 300 || !(isPdf || (allowImage && (isPng || isJpeg)))) {
        throw new Error(`Edge did not receive a supported attachment from ${url.pathname} (HTTP ${result.status}, ${result.contentType || 'unknown content type'}).`);
      }
      return { buffer, contentType: isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png' };
    } catch (error) {
      failureCount += 1;
      throw error;
    } finally {
      await page.close().catch(() => {});
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  globalThis.__TENDER_SOURCE_BROWSER__ = {
    get failureCount() { return failureCount; },
    getText: browserRequestText,
    getBuffer: browserDownload,
  };

  try {
    if (process.env.TENDER_WORKER_DIAGNOSTICS_ONLY === 'true') {
      const invitationId = process.env.TENDER_WORKER_DIAGNOSTIC_TENDER_ID || '1789954037772';
      console.log(`Read-only Edge diagnostic for tender ${invitationId}. No Supabase rows are modified.`);
      const detailUrl = `https://www.tender.gov.mn/mn/invitation/detail/${encodeURIComponent(invitationId)}`;
      const detailHtml = await browserRequestText(detailUrl);
      const documentMatch = detailHtml.match(/tenderDocumentId[^\d]{1,20}(\d+)/i);
      const storedTender = await require('@supabase/supabase-js')
        .createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
        .from('tenders')
        .select('raw_data')
        .eq('invitation_id', invitationId)
        .maybeSingle();
      if (storedTender.error) throw new Error(`Could not read the diagnostic tender from Supabase: ${storedTender.error.message}`);
      const tenderDocumentId = Number(documentMatch?.[1] || storedTender.data?.raw_data?.tenderDocumentId);
      if (!Number.isSafeInteger(tenderDocumentId) || tenderDocumentId <= 0) {
        throw new Error('Edge opened the tender page, but no tenderDocumentId was found in the page or Supabase row.');
      }
      const docsText = await browserRequestText(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocumentId}&offset=1&limit=9999`);
      const docs = JSON.parse(docsText);
      if (!Array.isArray(docs)) throw new Error('The official document list did not return an array.');
      const pdfDoc = docs.find((doc) => String(doc.fileExtention || doc.fileExtension || 'pdf').toLowerCase() === 'pdf');
      if (!pdfDoc?.fileId) throw new Error(`The tender page loaded, but no PDF was listed in the primary document list (${docs.length} files).`);
      const attachment = await browserDownload(`https://user.tender.gov.mn/mn/download/${pdfDoc.fileId}`);
      console.log(`PASS: Edge downloaded ${pdfDoc.fileName || `file ${pdfDoc.fileId}`} (${attachment.buffer.length} bytes, ${attachment.contentType}).`);
      console.log('The read-only diagnostic completed; no tender, queue, or PDF data was written to Supabase.');
      return;
    }

    const maxPages = Math.max(1, Number(process.env.TENDER_MAX_SYNC_PAGES) || 3000);
    if (process.env.TENDER_SKIP_LISTING_SYNC === 'true') {
      console.log('Skipping tender listing sync because TENDER_SKIP_LISTING_SYNC=true.');
    } else {
      console.log(`Syncing up to ${maxPages} listing pages to Supabase through Edge.`);
      const { syncPages } = require('./sync-to-supabase.js');
      await syncPages(1, maxPages);
    }

    console.log('Processing the Supabase PDF queue through Edge, including scanned-page OCR where Poppler is installed.');
    process.env.TENDER_PDF_QUEUE_LIBRARY = 'true';
    process.env.PDF_JOB_CONCURRENCY = process.env.PDF_JOB_CONCURRENCY || '1';
    require.extensions['.ts'] = (module, filename) => {
      const ts = require('typescript');
      const source = fs.readFileSync(filename, 'utf8');
      const compiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filename,
      });
      module._compile(compiled.outputText, filename);
    };
    const { processPdfQueue } = require('./process-pdf-queue.ts');
    await processPdfQueue();
    console.log('Browser-based tender sync and PDF extraction completed.');
  } finally {
    delete globalThis.__TENDER_SOURCE_BROWSER__;
    await context.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error('Browser tender worker failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

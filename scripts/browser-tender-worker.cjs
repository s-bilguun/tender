const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { classifySourceResponse, visibleText } = require('./source-response.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = process.env.TENDER_WORKER_ENV_FILE || path.join(REPO_ROOT, '.env.tender-worker');
const ALLOWED_HOSTS = new Set(['www.tender.gov.mn', 'user.tender.gov.mn']);

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

function findEdgeExecutable() {
  const candidates = [
    process.env.TENDER_EDGE_EXECUTABLE,
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'msedge.exe';
}

async function launchEdgeForWorker(profileDir) {
  const debugPort = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  const edgeProcess = spawn(findEdgeExecutable(), [
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: false });
  let launchError;
  edgeProcess.once('error', (error) => { launchError = error; });

  try {
    const deadline = Date.now() + 30_000;
    let browser;
    while (Date.now() < deadline) {
      if (launchError) throw launchError;
      if (edgeProcess.exitCode !== null) throw new Error(`Microsoft Edge exited before enabling its local debugging endpoint (code ${edgeProcess.exitCode}).`);
      let version;
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(500) });
        if (response.ok) version = await response.json();
      } catch {}
      if (version && !String(version.Browser || '').startsWith('Edg/')) {
        throw new Error(`The loopback debugging port ${debugPort} belongs to ${version.Browser || 'an unknown browser'}, not this Edge worker.`);
      }
      if (version) {
        try {
          browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`, { timeout: 5_000 });
          break;
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!browser) throw new Error('Microsoft Edge did not expose its local debugging endpoint within 30 seconds.');
    const context = browser.contexts()[0];
    if (!context) throw new Error('Microsoft Edge started without a browser context.');
    return { browser, context, edgeProcess };
  } catch (error) {
    edgeProcess.kill();
    throw error;
  }
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
  const outputDir = path.join(REPO_ROOT, 'scratch', 'browser-worker');
  fs.mkdirSync(outputDir, { recursive: true });
  const report = {
    checkedAt: new Date().toISOString(),
    diagnosticsOnly: process.env.TENDER_WORKER_DIAGNOSTICS_ONLY === 'true',
    sourceAttempts: [],
    result: 'running',
  };

  console.log('Starting visible Microsoft Edge without Playwright launch flags; attaching over a loopback-only debugging port.');
  console.log('The worker uses this separate Edge profile; it does not read your everyday Edge profile or saved passwords.');
  const { browser, context, edgeProcess } = await launchEdgeForWorker(profileDir);

  const pagesByOrigin = new Map();
  const pendingPagesByOrigin = new Map();
  const navigationResponses = new WeakMap();
  let lastFailurePage = null;
  let failureCount = 0;

  async function newSourcePage() {
    const page = await context.newPage();
    page.on('response', (response) => {
      if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) {
        navigationResponses.set(page, response);
      }
    });
    return page;
  }

  function recordResponse(url, response, stage, title = '') {
    const kind = classifySourceResponse({ ...response, title });
    report.sourceAttempts.push({
      stage, url, status: response.status, title,
      kind, rayId: response.rayId || '', mitigated: response.mitigated || '',
      ...(kind !== 'ok' ? { visibleText: visibleText(response.body || '').slice(0, 1500) } : {}),
    });
    if (report.sourceAttempts.length > 50) report.sourceAttempts.shift();
    return kind;
  }

  async function inspectNavigation(page, targetUrl, response, stage) {
    const current = await pageText(page);
    const navigation = response || navigationResponses.get(page);
    const headers = navigation?.headers() || {};
    const state = {
      status: navigation?.status() || 200, body: current.body,
      mitigated: headers['cf-mitigated'], rayId: headers['cf-ray'],
    };
    const kind = recordResponse(targetUrl, state, stage, current.title);
    if (kind !== 'ok') {
      lastFailurePage = page;
      console.warn(`Source ${kind}: HTTP ${state.status}, title ${JSON.stringify(current.title)}, Ray ID ${state.rayId || 'not supplied'}.`);
    }
    return kind;
  }

  async function checkNavigation(page, targetUrl, response, stage) {
    let kind = await inspectNavigation(page, targetUrl, response, stage);
    if (kind === 'challenge') {
      throw new Error(`Microsoft Edge received a Cloudflare challenge for ${targetUrl}. No manual verification was attempted. See scratch/browser-worker/report.json and source-page.png.`);
    }
    if (kind !== 'ok') {
      throw new Error(`Edge received a ${kind} response for ${targetUrl}. A 403 block may have no human-verification control. See scratch/browser-worker/report.json and source-page.png.`);
    }
  }

  async function ensureOriginPage(url) {
    const origin = url.origin;
    let page = pagesByOrigin.get(origin);
    if (page && !page.isClosed()) return page;
    if (pendingPagesByOrigin.has(origin)) return pendingPagesByOrigin.get(origin);

    const pendingPage = (async () => {
      page = await newSourcePage();
      // Test the page the user actually needs, rather than assuming the root
      // homepage has the same access rules. API calls bootstrap the listing UI.
      const targetUrl = url.pathname.startsWith('/api/') ? `${origin}/mn/invitation` : url.toString();
      lastFailurePage = page;
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await checkNavigation(page, targetUrl, response, 'initial-navigation');
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
    let page;
    try {
      page = await ensureOriginPage(url);
      const send = () => page.evaluate(async ({ requestUrl, requestMethod, requestBody }) => {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          credentials: 'include',
          cache: 'no-store',
          headers: requestBody === undefined ? { Accept: '*/*' } : { Accept: '*/*', 'Content-Type': 'application/json' },
          body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
        });
        return {
          status: response.status, text: await response.text(),
          mitigated: response.headers.get('cf-mitigated'), rayId: response.headers.get('cf-ray'),
        };
      }, { requestUrl: url.toString(), requestMethod: method, requestBody: body });

      let response = await send();
      let kind = recordResponse(url.toString(), { ...response, body: response.text }, 'browser-fetch');
      if (kind === 'challenge') {
        lastFailurePage = page;
        throw new Error(`Microsoft Edge received a Cloudflare challenge for ${url.pathname}. No manual verification was attempted.`);
      }
      if (kind !== 'ok') {
        lastFailurePage = page;
        throw new Error(`Official source returned HTTP ${response.status} (${kind}) to Edge for ${url.pathname}.`);
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

    const page = await newSourcePage();
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tender-edge-download-'));
    try {
      const tryDownload = async () => {
        let download = null;
        let resolveDownload;
        const downloadEvent = new Promise((resolve) => { resolveDownload = resolve; });
        const onDownload = (event) => {
          download = event;
          resolveDownload(event);
        };
        page.once('download', onDownload);
        let response = null;
        let navigationError = null;
        await page.setExtraHTTPHeaders({ Referer: 'https://www.tender.gov.mn/' });
        try {
          response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
        } catch (error) {
          navigationError = error;
        }
        if (!download) download = await Promise.race([downloadEvent, page.waitForTimeout(750).then(() => null)]);
        page.removeListener('download', onDownload);
        if (download) {
          const filePath = path.join(tempDir, 'attachment.bin');
          await download.saveAs(filePath);
          return { status: 200, contentType: '', buffer: await fs.promises.readFile(filePath) };
        }
        if (navigationError) throw navigationError;
        if (!response) throw new Error('Edge did not return a PDF response or a browser download.');
        return {
          status: response.status(),
          contentType: response.headers()['content-type'] || '',
          mitigated: response.headers()['cf-mitigated'],
          rayId: response.headers()['cf-ray'],
          buffer: await response.body(),
        };
      };

      let result = await tryDownload();
      let kind = recordResponse(url.toString(), {
        ...result,
        body: /text\/html/i.test(result.contentType) ? result.buffer.toString('utf8') : '',
      }, 'attachment-navigation');
      if (kind === 'challenge') {
        lastFailurePage = page;
        throw new Error(`Microsoft Edge received a Cloudflare challenge for ${url.pathname}. No manual verification was attempted.`);
      }
      if (kind !== 'ok') throw new Error(`Attachment access failed: HTTP ${result.status} (${kind}).`);
      const buffer = Buffer.from(result.buffer);
      if (buffer.length > 40 * 1024 * 1024) throw new Error('Attachment exceeds the 40 MB limit.');
      const isPdf = buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
      const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      if (result.status < 200 || result.status >= 300 || !(isPdf || (allowImage && (isPng || isJpeg)))) {
        throw new Error(`Edge did not receive a supported attachment from ${url.pathname} (HTTP ${result.status}, ${result.contentType || 'unknown content type'}).`);
      }
      return { buffer, contentType: isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png' };
    } catch (error) {
      failureCount += 1;
      await page.screenshot({ path: path.join(outputDir, 'source-page.png') }).catch(() => {});
      report.failureScreenshot = 'source-page.png';
      throw error;
    } finally {
      await page.close().catch(() => {});
      if (path.dirname(path.resolve(tempDir)) === path.resolve(os.tmpdir()) && path.basename(tempDir).startsWith('tender-edge-download-')) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  globalThis.__TENDER_SOURCE_BROWSER__ = {
    get failureCount() { return failureCount; },
    getText: browserRequestText,
    getBuffer: browserDownload,
  };

  try {
    report.edgeVersion = browser.version();
    report.edgeLaunchMode = 'normal-edge-with-loopback-cdp-nonzero-port';
    report.webdriverFlag = await context.pages()[0]?.evaluate(() => navigator.webdriver).catch(() => undefined);
    if (process.env.TENDER_WORKER_DIAGNOSTICS_ONLY === 'true') {
      const invitationId = process.env.TENDER_WORKER_DIAGNOSTIC_TENDER_ID || '1789954037772';
      if (!/^\d{1,24}$/.test(invitationId)) throw new Error('Invalid diagnostic tender ID.');
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
      const sourcePage = await ensureOriginPage(new URL(detailUrl));
      await sourcePage.locator('a[href*="user.tender.gov.mn/mn/download/"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
      const links = await sourcePage.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => ({
        fileName: anchor.textContent.trim(), url: anchor.href,
      })).filter((link) => /^https:\/\/user\.tender\.gov\.mn\/mn\/download\/\d+$/.test(link.url)));
      let selectedPdf = links.find((link) => /\.pdf\b/i.test(link.fileName)) || links[0];
      report.publicAttachmentLinkCount = links.length;
      if (!selectedPdf) {
        const tenderDocumentId = Number(documentMatch?.[1] || storedTender.data?.raw_data?.tenderDocumentId);
        if (!Number.isSafeInteger(tenderDocumentId) || tenderDocumentId <= 0) {
          throw new Error('No public attachment links or tenderDocumentId were found in the tender page.');
        }
        const docsText = await browserRequestText(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${tenderDocumentId}&offset=1&limit=9999`);
        const docs = JSON.parse(docsText);
        if (!Array.isArray(docs)) throw new Error('The official document list did not return an array.');
        const pdfDoc = docs.find((doc) => String(doc.fileExtention || doc.fileExtension || 'pdf').toLowerCase() === 'pdf');
        if (!pdfDoc?.fileId) throw new Error(`No PDF was listed in the primary document list (${docs.length} files).`);
        selectedPdf = { fileName: pdfDoc.fileName, url: `https://user.tender.gov.mn/mn/download/${pdfDoc.fileId}` };
      }
      const attachment = await browserDownload(selectedPdf.url);
      const parsedPdf = await require('pdf-parse/lib/pdf-parse.js')(attachment.buffer);
      report.pdf = { fileName: selectedPdf.fileName, bytes: attachment.buffer.length, pages: parsedPdf.numpages, nativeTextCharacters: parsedPdf.text.length };
      report.result = 'pass';
      console.log(`PASS: Edge downloaded ${selectedPdf.fileName} (${attachment.buffer.length} bytes, ${parsedPdf.numpages} pages, ${parsedPdf.text.length} text characters).`);
      console.log('The read-only diagnostic completed; no tender, queue, or PDF data was written to Supabase.');
      console.log('This verifies one PDF download only. Listing sync and the full PDF queue still need a separate run.');
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
    report.result = process.exitCode ? 'failed' : 'completed';
    console.log(process.exitCode ? 'Browser worker finished with failed PDF jobs; see logs.' : 'Browser-based tender sync and PDF extraction completed.');
  } catch (error) {
    report.result = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
    if (lastFailurePage && !lastFailurePage.isClosed()) {
      await lastFailurePage.screenshot({ path: path.join(outputDir, 'source-page.png') }).catch(() => {});
      report.failureScreenshot = 'source-page.png';
    }
    throw error;
  } finally {
    try {
      await fs.promises.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
      console.log('Report saved to scratch/browser-worker/report.json (no keys or cookies).');
    } finally {
      delete globalThis.__TENDER_SOURCE_BROWSER__;
      await browser.close().catch(() => {});
      edgeProcess.kill();
    }
  }
}

run().catch((error) => {
  console.error('Browser tender worker failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

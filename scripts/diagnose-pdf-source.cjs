// Read-only cloud diagnostic: no tender or queue records are changed.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const parsePdf = require('pdf-parse/lib/pdf-parse.js');

async function main() {
  const invitationId = process.env.DIAGNOSTIC_TENDER_ID || '1789954037772';
  if (!/^\d{1,24}$/.test(invitationId)) throw new Error('Invalid public invitation ID');
  const sourceUrl = `https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`;
  const outputDir = path.join(process.cwd(), 'scratch', 'source-diagnostic');
  await fs.mkdir(outputDir, { recursive: true });
  const report = { invitationId, checkedAt: new Date().toISOString() };
  let browser;
  let page;

  try {
    const databaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    report.database = { configured: Boolean(databaseUrl && key) };
    if (databaseUrl && key) {
      const database = createClient(databaseUrl, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      for (const table of ['tenders', 'tender_pdf_jobs']) {
        const { error } = await database.from(table).select('invitation_id').limit(1);
        report.database[table] = error ? { ok: false, error: error.message } : { ok: true };
      }
    }

    try {
      const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
      const text = await response.text();
      report.http = {
        status: response.status,
        challenge: /Just a moment|cf-chl|challenge-platform/i.test(text),
      };
    } catch (error) {
      report.http = { error: error.message };
    }
    console.log('Direct HTTP:', JSON.stringify(report.http));
    console.log('Database readiness:', JSON.stringify(report.database));

    // Use a clean browser session. No copied personal cookies, stealth plugins,
    // proxy rotation, or CAPTCHA solving: this tests normal unattended access.
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    page = await context.newPage();
    const navigation = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    report.browser = { status: navigation?.status(), title: await page.title() };
    await page.waitForSelector('a[href*="user.tender.gov.mn/mn/download/"]', { timeout: 30000 });
    const attachments = await page.locator('a[href]').evaluateAll((links) => links.map((link) => ({
      name: link.textContent.trim(), url: link.href,
    })).filter((link) => /^https:\/\/user\.tender\.gov\.mn\/mn\/download\/\d+$/.test(link.url)));
    report.browser.attachments = attachments;
    if (!attachments.length) throw new Error('No public attachment links found in the rendered page');
    console.log(`Browser discovered ${attachments.length} attachment links.`);

    const downloadPage = await context.newPage();
    const downloadPromise = downloadPage.waitForEvent('download', { timeout: 45000 });
    // Attach a handler immediately so a navigation error cannot create an unhandled rejection.
    downloadPromise.catch(() => {});
    try {
      await downloadPage.goto(attachments[0].url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (error) {
      if (!/ERR_ABORTED|Download is starting/i.test(error.message)) throw error;
    }
    const download = await downloadPromise;
    const filePath = path.join(outputDir, 'source.pdf');
    await download.saveAs(filePath);
    const bytes = await fs.readFile(filePath);
    if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Downloaded response is not a PDF');
    const parsed = await parsePdf(bytes);
    report.pdf = { bytes: bytes.length, pages: parsed.numpages, nativeTextCharacters: parsed.text.length };
    report.sourceAccessSucceeded = true;
    console.log('Verified PDF:', JSON.stringify(report.pdf));
  } catch (error) {
    report.sourceAccessSucceeded = false;
    report.error = error.message;
    if (page) {
      report.finalPageTitle = await page.title().catch(() => 'unavailable');
      await page.screenshot({ path: path.join(outputDir, 'source-page.png') }).catch(() => {});
    }
    console.error('Source diagnostic failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log('Report saved to scratch/source-diagnostic/report.json');
    if (!report.database?.tenders?.ok || !report.database?.tender_pdf_jobs?.ok) process.exitCode = 1;
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

// Read-only provider smoke test. No Supabase writes or secret values are logged.
import * as dotenv from 'dotenv';
import { fetchStealthHtml, hasScrapingProvider } from '../lib/ingestion/stealth-fetcher';
import { fetchVerifiedAttachment } from '../lib/source-attachment';
dotenv.config({ path: process.env.TENDER_WORKER_ENV_FILE || '.env.tender-worker', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const invitationId = process.argv[2] || '1789954037772';
  const fileId = process.argv[3] || '1789954037652';
  if (!/^\d+$/.test(invitationId) || !/^\d+$/.test(fileId)) throw new Error('Expected numeric invitation and file IDs');
  if (!hasScrapingProvider()) throw new Error('No scraping provider key is configured in .env.tender-worker');
  const html = await fetchStealthHtml(`https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`);
  if (/just a moment|performing security verification|cf-chl-|challenge-platform/i.test(html)) throw new Error('The provider returned a source challenge for the tender page');
  const match = html.match(/tenderDocumentId(?:&quot;|"|\\\"|'|:|\s|=)*(\d+)/i);
  if (!match) throw new Error('The provider returned a page but no tenderDocumentId could be identified');
  const list = JSON.parse(await fetchStealthHtml(`https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=${match[1]}&offset=1&limit=9999`));
  if (!Array.isArray(list)) throw new Error('Attachment listing was not an array');
  const file = await fetchVerifiedAttachment(fileId);
  console.log(`PASS: tender page and attachment list accessible (${list.length} files); sample PDF verified (${file.buffer.length} bytes).`);
}
main().catch((error) => { console.error(`Provider test failed: ${error.message}`); process.exitCode = 1; });

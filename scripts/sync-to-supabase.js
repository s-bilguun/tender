const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('child_process');

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before syncing.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function findBalancedArrayEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (character === '[') depth += 1;
      if (character === ']' && --depth === 0) return index;
    }
  }
  return -1;
}

function fetchPage(page, retries = 2) {
  return new Promise((resolve, reject) => {
    const url = `https://www.tender.gov.mn/mn/invitation?page=${page}`;
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
    execFile(curlCmd, [
      '-s', '-L',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml',
      '-w', '\n__HTTP_STATUS__:%{http_code}',
      url
    ], { maxBuffer: 40 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
      const statusMatch = String(stdout || '').match(/\n__HTTP_STATUS__:(\d{3})\s*$/);
      const responseBody = statusMatch ? String(stdout).replace(/\n__HTTP_STATUS__:\d{3}\s*$/, '') : '';
      if (err || !responseBody || statusMatch?.[1] !== '200') {
        if (retries > 0) {
          return setTimeout(() => fetchPage(page, retries - 1).then(resolve, reject), 1000);
        }
        return reject(new Error(`Tender source page ${page} fetch failed (HTTP ${statusMatch?.[1] || 'unknown'}).`));
      }
      if (/captcha|cloudflare|access denied|too many requests/i.test(responseBody)) {
        return reject(new Error(`Tender source blocked the sync request on page ${page}.`));
      }
      let idx = responseBody.indexOf('uusgesenClientId');
      if (idx === -1) idx = responseBody.indexOf('invitationId');
      if (idx === -1) return resolve([]);
      const start = responseBody.lastIndexOf('[', idx);
      const end = start === -1 ? -1 : findBalancedArrayEnd(responseBody, start);
      if (start === -1 || end === -1) return reject(new Error(`Could not parse tender source page ${page}.`));
      try {
        let raw = responseBody.substring(start, end + 1);
        if (raw.includes('\\"')) {
          raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        const parsed = JSON.parse(raw);
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        reject(new Error(`Could not decode tender source page ${page}: ${e.message || e}`));
      }
    });
  });
}

function mapToRecord(item, existingRawData = {}) {
  return {
    invitation_id: item.invitationId,
    invitation_number: item.invitationNumber || '',
    tender_name: item.tenderName || 'Гарчиггүй тендер',
    tender_code: item.tenderCode || '',
    tender_type_code: item.tenderTypeCode || 'OTHER',
    tender_type_name: item.tenderTypeName || 'Бусад',
    total_budget: Number(item.totalBudget) || 0,
    budget_entity_name: item.budgetEntityName || item.uusgesenEntityName || '',
    client_code: item.clientCode || '',
    position_name: item.positionName || '',
    fund_name: item.fundName || '',
    rule_name: item.ruleName || '',
    publish_date: item.publishDate ? new Date(item.publishDate).toISOString() : null,
    open_date: item.openDate ? new Date(item.openDate).toISOString() : null,
    receive_date: item.receiveDate ? new Date(item.receiveDate).toISOString() : null,
    doc_status_code: item.docStatusCode || '',
    doc_status_name: item.docStatusName || '',
    is_receiving: item.isReceiving ?? (String(item.docStatusName || '').toLowerCase().includes('хүлээн авч') ? 1 : 0),
    raw_data: {
      ...existingRawData,
      ...item,
      ...(existingRawData.liveBundle ? { liveBundle: existingRawData.liveBundle } : {}),
      tenderDocumentId: item.tenderDocumentId ?? existingRawData.tenderDocumentId,
      tenderId: item.tenderId ?? existingRawData.tenderId,
    },
    updated_at: new Date().toISOString()
  };
}

async function syncPages(startPage = 1, maxPages = 50) {
  console.log(`Starting sync from page ${startPage} for up to ${maxPages} pages...`);
  let totalInserted = 0;
  
  const batchSize = 5;
  for (let p = startPage; p < startPage + maxPages; p += batchSize) {
    const pageBatch = [];
    for (let b = 0; b < batchSize && (p + b) < startPage + maxPages; b++) {
      pageBatch.push(p + b);
    }
    
    console.log(`Fetching batch: pages ${pageBatch.join(', ')}...`);
    const results = await Promise.all(pageBatch.map(page => fetchPage(page)));
    const allItems = results.flat();
    
    if (allItems.length === 0) {
      if (p === startPage) {
        throw new Error(`Tender source returned no records on the first requested page (${p}); refusing to report an empty sync as successful.`);
      }
      console.log('No more items found. Stopping.');
      break;
    }
    
    const uniqueMap = new Map();
    allItems.forEach(item => {
      if (item.invitationId) {
        uniqueMap.set(String(item.invitationId), item);
      }
    });
    const items = Array.from(uniqueMap.values());
    const invitationIds = items.map((item) => item.invitationId).filter(Boolean);
    const { data: existingRows, error: readError } = await supabase
      .from('tenders')
      .select('invitation_id, raw_data')
      .in('invitation_id', invitationIds);
    if (readError) {
      console.error('Could not read existing raw_data before sync; refusing to replace stored PDF bundles:', readError.message);
      process.exitCode = 1;
      continue;
    }
    const existingRawDataById = new Map((existingRows || []).map((row) => [String(row.invitation_id), row.raw_data || {}]));
    const records = items
      .map((item) => mapToRecord(item, existingRawDataById.get(String(item.invitationId)) || {}))
      .filter(r => r.invitation_id);
    
    const { data, error } = await supabase
      .from('tenders')
      .upsert(records, { onConflict: 'invitation_id' });
      
    if (error) {
      console.error('Supabase upsert error:', error.message);
      process.exitCode = 1;
      if (error.message.includes('Could not find the table')) {
        console.error('\n--> АНХААР: Supabase дээр "tenders" хүснэгт үүсээгүй байна! SQL Editor-т SQL-ээ ажиллуулна уу.\n');
        process.exit(1);
      }
    } else {
      totalInserted += records.length;
      console.log(`[Batch ${p}-${p + pageBatch.length - 1} / ${startPage + maxPages}] Upserted ${records.length} records. (Total run: ${totalInserted})`);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  
  console.log(`Finished! Total upserted: ${totalInserted}`);
}

// Check command line arguments: e.g. node sync-to-supabase.js 1 100
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const maxPages = parseInt(args[1]) || 3000;

syncPages(startPage, maxPages).catch((error) => {
  console.error('Tender sync failed:', error);
  process.exitCode = 1;
});

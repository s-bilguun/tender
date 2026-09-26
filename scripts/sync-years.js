const { execFile } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before syncing.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

function findBalancedArrayEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (character === '"') { inString = !inString; continue; }
    if (!inString) {
      if (character === '[') depth += 1;
      if (character === ']' && --depth === 0) return index;
    }
  }
  return -1;
}

function fetchLiveYear(year, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `https://www.tender.gov.mn/mn/invitation?years=${year}&page=${page}`;
    execFile(curlCmd, [
      '-s', '-L',
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml',
      '-w', '\n__HTTP_STATUS__:%{http_code}',
      url,
    ], { maxBuffer: 50 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
      const statusMatch = String(stdout || '').match(/\n__HTTP_STATUS__:(\d{3})\s*$/);
      const body = statusMatch ? String(stdout).replace(/\n__HTTP_STATUS__:\d{3}\s*$/, '') : '';
      if (err || !body || statusMatch?.[1] !== '200') {
        return reject(new Error(`Tender source year ${year} page ${page} fetch failed (HTTP ${statusMatch?.[1] || 'unknown'}).`));
      }
      if (/captcha|cloudflare|access denied|too many requests/i.test(body)) {
        return reject(new Error(`Tender source blocked the sync request for year ${year}, page ${page}.`));
      }

      let idx = body.indexOf('invitationId');
      if (idx === -1) idx = body.indexOf('uusgesenClientId');
      if (idx === -1) return reject(new Error(`Could not locate tender records for year ${year}, page ${page}.`));
      const start = body.lastIndexOf('[', idx);
      const end = start === -1 ? -1 : findBalancedArrayEnd(body, start);
      if (start === -1 || end === -1) return reject(new Error(`Could not parse tender source year ${year}, page ${page}.`));

      try {
        let raw = body.substring(start, end + 1);
        if (raw.includes('\\"')) {
          raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        const parsed = JSON.parse(raw);
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        reject(new Error(`Could not decode tender source year ${year}, page ${page}: ${e.message || e}`));
      }
    });
  });
}

function mapToRecord(item, existingRawData = {}) {
  const rawData = { ...existingRawData, ...item };
  if (existingRawData.liveBundle) rawData.liveBundle = existingRawData.liveBundle;
  rawData.tenderDocumentId = item.tenderDocumentId ?? existingRawData.tenderDocumentId;
  rawData.tenderId = item.tenderId ?? existingRawData.tenderId;
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
    raw_data: rawData,
    updated_at: new Date().toISOString()
  };
}

async function syncYear(year, maxPages = 15) {
  console.log(`\n================ Syncing Year ${year} (up to ${maxPages} pages) ================`);
  let totalSaved = 0;
  for (let page = 1; page <= maxPages; page++) {
    const rawItems = await fetchLiveYear(year, page);
    if (!rawItems || rawItems.length === 0) {
      if (page === 1) throw new Error(`Tender source returned no records for year ${year} on the first page.`);
      console.log(`Page ${page}: No more items for year ${year}.`);
      break;
    }

    const invitationIds = rawItems.map((item) => item.invitationId).filter(Boolean);
    const { data: existingRows, error: readError } = await supabase
      .from('tenders')
      .select('invitation_id, raw_data')
      .in('invitation_id', invitationIds);
    if (readError) throw new Error(`Could not read existing PDF data for year ${year} page ${page}: ${readError.message}`);
    const existingRawById = new Map((existingRows || []).map((row) => [String(row.invitation_id), row.raw_data || {}]));
    const records = rawItems.map((item) => mapToRecord(item, existingRawById.get(String(item.invitationId)) || {}));

    // Deduplicate by invitation_id within the batch
    const uniqueRecords = [];
    const seenIds = new Set();
    for (const r of records) {
      const idKey = String(r.invitation_id);
      if (r.invitation_id && !seenIds.has(idKey)) {
        seenIds.add(idKey);
        uniqueRecords.push(r);
      }
    }

    const { error } = await supabase
      .from('tenders')
      .upsert(uniqueRecords, { onConflict: 'invitation_id' });

    if (error) throw new Error(`Page ${page} database write failed for year ${year}: ${error.message}`);
    totalSaved += uniqueRecords.length;
    console.log(`Page ${page}: Saved ${uniqueRecords.length} tenders for year ${year} (Total: ${totalSaved})`);
  }
  return totalSaved;
}

async function main() {
  // Sync 2024, 2023, 2022
  for (const yr of [2024, 2023, 2022]) {
    await syncYear(yr, 10); // 10 pages * 20 = ~200 tenders per year
  }
  console.log('\nSync finished successfully!');
}

main().catch((error) => {
  console.error('Historical tender sync failed:', error);
  process.exitCode = 1;
});

const fs = require('fs');
const { execFile } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rufnrfwghtgicecnzljj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchLiveYear(year, page = 1) {
  return new Promise(resolve => {
    const url = `https://www.tender.gov.mn/mn/invitation?years=${year}&page=${page}`;
    execFile('curl.exe', [
      '-s', '-L', url,
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml'
    ], { maxBuffer: 50 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      
      let idx = stdout.indexOf('invitationId');
      if (idx === -1) idx = stdout.indexOf('uusgesenClientId');
      if (idx === -1) return resolve([]);

      let start = -1;
      for (let i = idx; i >= 0; i--) {
        if (stdout[i] === '[') {
          start = i;
          break;
        }
      }
      if (start === -1) return resolve([]);

      let depth = 0;
      let end = -1;
      let inString = false;
      let escape = false;
      for (let i = start; i < stdout.length; i++) {
        const char = stdout[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '[') depth++;
          else if (char === ']') {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
      }

      if (end === -1) return resolve([]);

      try {
        let raw = stdout.substring(start, end + 1);
        if (raw.includes('\\"')) {
          raw = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        const parsed = JSON.parse(raw);
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        resolve([]);
      }
    });
  });
}

function mapToRecord(item) {
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
    is_receiving: (item.docStatusName || '').includes('хүлээн') ? 1 : 0,
    raw_data: item,
    updated_at: new Date().toISOString()
  };
}

async function syncYear(year, maxPages = 15) {
  console.log(`\n================ Syncing Year ${year} (up to ${maxPages} pages) ================`);
  let totalSaved = 0;
  for (let page = 1; page <= maxPages; page++) {
    const rawItems = await fetchLiveYear(year, page);
    if (!rawItems || rawItems.length === 0) {
      console.log(`Page ${page}: No more items for year ${year}.`);
      break;
    }

    const records = rawItems.map(mapToRecord);
    
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

    if (error) {
      console.error(`Page ${page} DB error:`, error.message);
    } else {
      totalSaved += records.length;
      console.log(`Page ${page}: Saved ${records.length} tenders for year ${year} (Total: ${totalSaved})`);
    }
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

main();

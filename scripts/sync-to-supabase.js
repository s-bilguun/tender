const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('child_process');

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rufnrfwghtgicecnzljj.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  'sb_secret_EhqjXHXl6q60WG0V8rYWyg_0XTO-AHa';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function fetchPage(page) {
  return new Promise((resolve) => {
    const url = `https://www.tender.gov.mn/mn/invitation?page=${page}`;
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
    execFile(curlCmd, [
      '-s', '-L',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml',
      url
    ], { maxBuffer: 40 * 1024 * 1024, timeout: 25000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve([]);
      }
      const idx = stdout.indexOf('uusgesenClientId');
      if (idx === -1) return resolve([]);
      const start = stdout.lastIndexOf('[', idx);
      const end = stdout.indexOf(']', idx);
      if (start === -1 || end === -1) return resolve([]);
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
    is_receiving: item.isReceiving ?? 1,
    raw_data: item,
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
      console.log('No more items found. Stopping.');
      break;
    }
    
    const uniqueMap = new Map();
    allItems.forEach(item => {
      if (item.invitationId) {
        uniqueMap.set(String(item.invitationId), item);
      }
    });
    const records = Array.from(uniqueMap.values()).map(mapToRecord).filter(r => r.invitation_id);
    
    const { data, error } = await supabase
      .from('tenders')
      .upsert(records, { onConflict: 'invitation_id' });
      
    if (error) {
      console.error('Supabase upsert error:', error.message);
      if (error.message.includes('Could not find the table')) {
        console.error('\n--> АНХААР: Supabase дээр "tenders" хүснэгт үүсээгүй байна! SQL Editor-т SQL-ээ ажиллуулна уу.\n');
        process.exit(1);
      }
    } else {
      totalInserted += records.length;
      console.log(`Successfully upserted ${records.length} records. (Total so far: ${totalInserted})`);
    }
  }
  
  console.log(`Finished! Total upserted: ${totalInserted}`);
}

// Check command line arguments: e.g. node sync-to-supabase.js 1 100
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const maxPages = parseInt(args[1]) || 50;

syncPages(startPage, maxPages).catch(console.error);

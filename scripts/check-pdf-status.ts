import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Total active tenders in DB
  const { count: totalActive, error: err1 } = await supabase
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .eq('is_receiving', 1);

  // 2. Total tenders in DB
  const { count: totalAll, error: err2 } = await supabase
    .from('tenders')
    .select('*', { count: 'exact', head: true });

  // 3. Tenders with pdfUrl in raw_data
  const { data: storedTenders, count: withPdfCount, error: err3 } = await supabase
    .from('tenders')
    .select('invitation_id, tender_code, tender_name, raw_data', { count: 'exact' })
    .eq('is_receiving', 1)
    .not('raw_data->pdfUrl', 'is', null);

  // 4. Check Supabase Storage bucket 'tender-documents'
  const { data: bucketFolders, error: err4 } = await supabase
    .storage
    .from('tender-documents')
    .list('tenders', { limit: 1000 });

  console.log('--- SUPABASE ACTIVE TENDER & PDF STATUS ---');
  console.log(`Total tenders in database: ${totalAll}`);
  console.log(`Total active tenders (is_receiving = 1): ${totalActive}`);
  console.log(`Active tenders with stored Supabase PDF: ${withPdfCount || 0}`);
  console.log(`Folders in 'tender-documents' storage: ${bucketFolders?.length || 0}`);

  if (storedTenders && storedTenders.length > 0) {
    console.log(`\nSample stored PDFs (${Math.min(5, storedTenders.length)}):`);
    for (const t of storedTenders.slice(0, 5)) {
      console.log(`- [${t.tender_code || t.invitation_id}] ${t.tender_name?.slice(0, 40)}...`);
      console.log(`  URL: ${t.raw_data?.pdfUrl}`);
      console.log(`  File: ${t.raw_data?.pdfFileName}`);
    }
  }
}

main().catch(console.error);

import { NextRequest, NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTenderLiveBundle } from '@/lib/live-fetcher';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.TENDER_SYNC_SECRET;
  const authorization = request.headers.get('authorization') || '';
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

async function performSync(search?: string, page = 1) {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured before the sync API can write tenders.');

  // 1. Fetch live tenders from tender.gov.mn portal
  const result = await tenderStore.fetchLiveTenders(search, page);
  if (result.source !== 'live') {
    throw new Error(`Tender source refresh failed: ${result.error || 'source response was invalid'}`);
  }

  const newlyEnriched: (string | number)[] = [];

  // 2. Persist live items to Supabase
  if (result.items && result.items.length > 0) {
    try {
      const invIds = result.items.map((item) => item.invitationId);
      const { data: existingRows, error: readError } = await supabaseAdmin
        .from('tenders')
        .select('invitation_id, raw_data')
        .in('invitation_id', invIds);
      if (readError) throw new Error(`Could not read existing tender metadata before sync: ${readError.message}`);
      const existingById = new Map((existingRows || []).map((row) => [String(row.invitation_id), row.raw_data || {}]));

      const records = result.items.map((item) => ({
        invitation_id: item.invitationId,
        invitation_number: item.invitationNumber || '',
        tender_name: item.tenderName || 'Гарчиггүй тендер',
        tender_code: item.tenderCode || '',
        tender_type_code: item.tenderTypeCode || 'OTHER',
        tender_type_name: item.tenderTypeName || 'Бусад',
        total_budget: Number(item.totalBudget) || 0,
        budget_entity_name: item.budgetEntityName || (item as any).uusgesenEntityName || '',
        client_code: item.clientCode || '',
        position_name: item.positionName || '',
        rule_name: item.ruleName || '',
        fund_name: item.fundName || '',
        publish_date: item.publishDate ? new Date(item.publishDate).toISOString() : null,
        open_date: item.openDate ? new Date(item.openDate).toISOString() : null,
        receive_date: item.receiveDate ? new Date(item.receiveDate).toISOString() : null,
        doc_status_code: item.docStatusCode || '',
        doc_status_name: item.docStatusName || '',
        is_receiving: (item as any).isReceiving ?? (item.docStatusName?.toLowerCase().includes('хүлээн авч') ? 1 : 0),
        raw_data: {
          ...(existingById.get(String(item.invitationId)) || {}),
          ...(item as any).rawData,
          ...(existingById.get(String(item.invitationId))?.liveBundle
            ? { liveBundle: existingById.get(String(item.invitationId))?.liveBundle }
            : {}),
          tenderDocumentId: (item as any).rawData?.tenderDocumentId ?? existingById.get(String(item.invitationId))?.tenderDocumentId,
          tenderId: (item as any).tenderId ?? (item as any).rawData?.tenderId ?? existingById.get(String(item.invitationId))?.tenderId,
        },
        updated_at: new Date().toISOString()
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('tenders')
        .upsert(records, { onConflict: 'invitation_id' });
      if (upsertError) throw new Error(`Could not sync tender listing rows: ${upsertError.message}`);

      // 3. Immediately auto-enrich tenders that don't have full PDF / liveBundle yet!
      const { data: syncedRows, error: syncedRowsError } = await supabaseAdmin
        .from('tenders')
        .select('invitation_id, raw_data')
        .in('invitation_id', invIds);
      if (syncedRowsError) throw new Error(`Could not read tender rows after sync: ${syncedRowsError.message}`);

      const rowMap = new Map(syncedRows?.map((r) => [String(r.invitation_id), r]) || []);
      const toEnrich: (string | number)[] = [];

      for (const item of result.items) {
        const row = rowMap.get(String(item.invitationId));
        const hasLiveBundle = !!row?.raw_data?.liveBundle?.documents?.length;
        if (!hasLiveBundle) {
          toEnrich.push(item.invitationId);
        }
      }

      // Concurrently enrich a batch of new tenders (up to 4 per sync run to guarantee speed)
      const batchToEnrich = toEnrich.slice(0, 4);
      for (const id of batchToEnrich) {
        try {
          const item = result.items.find((i) => i.invitationId === id);
          const bundle = await fetchTenderLiveBundle(id, (item as any)?.tenderId);
          if (bundle?.documents && bundle.documents.length > 0) {
            newlyEnriched.push(id);
          }
        } catch (enrichErr: any) {
          console.warn(`[Auto-Sync] Live bundle enrichment warning for ${id}:`, enrichErr.message);
        }
      }
    } catch (sbErr) {
      throw sbErr;
    }
  }

  return {
    success: true,
    newFetchedCount: result.items.length,
    newlyEnrichedCount: newlyEnriched.length,
    newlyEnrichedIds: newlyEnriched,
    totalStoredCount: tenderStore.getAllTenders().length,
    lastSyncedAt: tenderStore.getLastSyncTime(),
    stats: tenderStore.getStats(),
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: process.env.TENDER_SYNC_SECRET ? 'Unauthorized' : 'TENDER_SYNC_SECRET is not configured.' },
      { status: process.env.TENDER_SYNC_SECRET ? 401 : 503 },
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const data = await performSync(search, page);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: process.env.TENDER_SYNC_SECRET ? 'Unauthorized' : 'TENDER_SYNC_SECRET is not configured.' },
      { status: process.env.TENDER_SYNC_SECRET ? 401 : 503 },
    );
  }
  try {
    const body = await request.json().catch(() => ({}));
    const search = body.search || undefined;
    const page = body.page || 1;
    const data = await performSync(search, page);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

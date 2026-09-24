import { NextRequest, NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTenderLiveBundle } from '@/lib/live-fetcher';

async function performSync(search?: string, page = 1) {
  // 1. Fetch live tenders from tender.gov.mn portal
  const result = await tenderStore.fetchLiveTenders(search, page);

  const newlyEnriched: (string | number)[] = [];

  // 2. Persist live items to Supabase
  if (result.items && result.items.length > 0) {
    try {
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
        is_receiving: item.docStatusName?.includes('хүлээн') ? 1 : 0,
        raw_data: item,
        updated_at: new Date().toISOString()
      }));

      await supabaseAdmin
        .from('tenders')
        .upsert(records, { onConflict: 'invitation_id' });

      // 3. Immediately auto-enrich tenders that don't have full PDF / liveBundle yet!
      const invIds = result.items.map((i) => i.invitationId);
      const { data: existingRows } = await supabaseAdmin
        .from('tenders')
        .select('invitation_id, raw_data')
        .in('invitation_id', invIds);

      const rowMap = new Map(existingRows?.map((r) => [r.invitation_id, r]) || []);
      const toEnrich: (string | number)[] = [];

      for (const item of result.items) {
        const row = rowMap.get(item.invitationId);
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
      console.warn('Sync to Supabase warning:', sbErr);
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

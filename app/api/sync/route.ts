import { NextRequest, NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const search = body.search || undefined;
    const page = body.page || 1;

    const result = await tenderStore.fetchLiveTenders(search, page);

    // Also persist live items to Supabase
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
          budget_entity_name: item.budgetEntityName || item.uusgesenEntityName || '',
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
          updated_at: new Date().toISOString()
        }));

        await supabaseAdmin
          .from('tenders')
          .upsert(records, { onConflict: 'invitation_id' });
      } catch (sbErr) {
        console.warn('Sync to Supabase warning:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      newFetchedCount: result.items.length,
      totalStoredCount: tenderStore.getAllTenders().length,
      lastSyncedAt: tenderStore.getLastSyncTime(),
      stats: tenderStore.getStats(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

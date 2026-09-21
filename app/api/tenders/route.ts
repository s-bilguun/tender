import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { TenderFilterParams, TenderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const minBudget = searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined;
    const maxBudget = searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = (searchParams.get('sortBy') as TenderFilterParams['sortBy']) || 'date_desc';
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const perPage = searchParams.get('perPage') ? Number(searchParams.get('perPage')) : 15;

    // Try querying Supabase first
    try {
      let query = supabase.from('tenders').select('*', { count: 'exact' });

      if (category && category !== 'ALL') {
        query = query.eq('tender_type_code', category);
      }
      if (minBudget !== undefined) {
        query = query.gte('total_budget', minBudget);
      }
      if (maxBudget !== undefined) {
        query = query.lte('total_budget', maxBudget);
      }
      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(`tender_name.ilike.%${term}%,budget_entity_name.ilike.%${term}%,invitation_number.ilike.%${term}%`);
      }

      // Sorting
      switch (sortBy) {
        case 'budget_desc':
          query = query.order('total_budget', { ascending: false });
          break;
        case 'budget_asc':
          query = query.order('total_budget', { ascending: true });
          break;
        case 'deadline_asc':
          query = query.order('open_date', { ascending: true });
          break;
        case 'date_desc':
        default:
          query = query.order('publish_date', { ascending: false });
          break;
      }

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data && data.length > 0) {
        const items: TenderItem[] = data.map((row) => ({
          invitationId: row.invitation_id,
          invitationNumber: row.invitation_number,
          tenderCode: row.tender_code,
          tenderName: row.tender_name,
          budgetEntityName: row.budget_entity_name,
          clientCode: row.client_code,
          positionName: row.position_name,
          totalBudget: Number(row.total_budget) || 0,
          tenderTypeCode: row.tender_type_code,
          tenderTypeName: row.tender_type_name,
          ruleName: row.rule_name,
          fundName: row.fund_name,
          publishDate: row.publish_date,
          openDate: row.open_date,
          receiveDate: row.receive_date,
          docStatusCode: row.doc_status_code,
          docStatusName: row.doc_status_name,
          isPackage: 0,
        }));

        const totalCount = count || items.length;
        return NextResponse.json({
          success: true,
          items,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
          source: 'supabase',
          stats: tenderStore.getStats(),
        });
      }
    } catch (sbError) {
      // Fallback silently if table does not exist yet
      console.warn('Supabase query failed, falling back to local store:', sbError);
    }

    // Fallback: In-memory/file-based store
    const { items, totalCount } = tenderStore.filterTenders({
      search,
      category,
      minBudget,
      maxBudget,
      status,
      sortBy,
      page,
      perPage,
    });

    const stats = tenderStore.getStats();

    return NextResponse.json({
      success: true,
      items,
      totalCount,
      page,
      perPage,
      totalPages: Math.ceil(totalCount / perPage),
      source: 'local_cache',
      stats,
    });
  } catch (error: any) {
    console.error('API /api/tenders error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

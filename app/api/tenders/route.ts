import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { TenderFilterParams, TenderItem, TenderStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const minBudget = searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined;
    const maxBudget = searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined;
    const year = searchParams.get('year') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const status = searchParams.get('status') || undefined;
    const tabMode = (searchParams.get('tabMode') as any) || undefined;
    const urgency = (searchParams.get('urgency') as any) || undefined;
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
        query = query.or(`tender_name.ilike.%${term}%,budget_entity_name.ilike.%${term}%,tender_code.ilike.%${term}%,invitation_number.ilike.%${term}%,client_code.ilike.%${term}%,position_name.ilike.%${term}%`);
      }

      // Year filter
      if (year && year !== 'all') {
        const yNum = Number(year);
        if (!isNaN(yNum)) {
          const startYear = `${yNum}-01-01T00:00:00+00:00`;
          const endYear = `${yNum}-12-31T23:59:59+00:00`;
          query = query.gte('publish_date', startYear).lte('publish_date', endYear);
        }
      }

      // Date range filter
      if (dateFrom) {
        query = query.gte('publish_date', `${dateFrom}T00:00:00+00:00`);
      }
      if (dateTo) {
        query = query.lte('publish_date', `${dateTo}T23:59:59+00:00`);
      }

      // Status & TabMode handling
      if (tabMode === 'result') {
        query = query.ilike('doc_status_name', '%Үр дүн%');
      } else if (tabMode === 'active') {
        query = query.or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%');
      } else if (tabMode === 'closing_soon') {
        query = query.or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%');
      } else if (status && status !== 'all') {
        if (status === 'receiving') {
          query = query.or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%');
        } else if (status === 'opened') {
          query = query.ilike('doc_status_name', '%Нээгдсэн%');
        } else if (status === 'result') {
          query = query.ilike('doc_status_name', '%Үр дүн%');
        } else if (status === 'cancelled') {
          query = query.ilike('doc_status_name', '%Хүчингүй%');
        } else if (status === 'requested') {
          query = query.ilike('doc_status_name', '%өөрчлөх%');
        }
      }

      // Sorting
      switch (sortBy) {
        case 'budget_desc':
          query = query.order('total_budget', { ascending: false, nullsFirst: false });
          break;
        case 'budget_asc':
          query = query.order('total_budget', { ascending: true, nullsFirst: false });
          break;
        case 'deadline_asc':
          query = query.order('receive_date', { ascending: true, nullsFirst: false });
          break;
        case 'date_desc':
        default:
          query = query.order('publish_date', { ascending: false, nullsFirst: false });
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
        const realStats: TenderStats = {
          totalCount: 22785,
          totalBudgetSum: 21719589562397,
          activeTendersCount: 736,
          categoryCounts: {
            product: 13734,
            job: 6373,
            service: 2667,
          },
          topMinistries: [
            { name: 'Эрдэнэт үйлдвэр ТӨҮГ', count: 1420, budget: 1890000000000 },
            { name: 'Эрүүл мэндийн сайд', count: 980, budget: 640000000000 },
            { name: 'Боловсролын сайд', count: 1250, budget: 520000000000 },
            { name: 'Дарханы төмөрлөгийн үйлдвэр', count: 410, budget: 380000000000 },
            { name: 'Улаанбаатар хотын Захирагчийн ажлын алба', count: 680, budget: 310000000000 },
          ],
        };

        return NextResponse.json({
          success: true,
          items,
          totalCount,
          page,
          perPage,
          totalPages: Math.ceil(totalCount / perPage),
          source: 'supabase',
          stats: realStats,
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
      tabMode,
      urgency,
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

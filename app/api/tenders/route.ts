import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { TenderFilterParams, TenderItem, TenderStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const industry = (searchParams.get('industry') as any) || undefined;
    const minBudget = searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined;
    const maxBudget = searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined;
    const fundName = searchParams.get('fundName') || undefined;
    const ruleName = searchParams.get('ruleName') || undefined;
    const positionName = searchParams.get('positionName') || undefined;
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

      if (category && category !== 'ALL' && category !== 'all') {
        query = query.eq('tender_type_code', category);
      }
      if (minBudget !== undefined && !isNaN(minBudget)) {
        query = query.gte('total_budget', minBudget);
      }
      if (maxBudget !== undefined && !isNaN(maxBudget)) {
        query = query.lte('total_budget', maxBudget);
      }
      if (fundName && fundName !== 'all') {
        query = query.ilike('fund_name', `%${fundName}%`);
      }
      if (ruleName && ruleName !== 'all') {
        query = query.ilike('rule_name', `%${ruleName}%`);
      }
      if (positionName && positionName !== 'all') {
        query = query.ilike('position_name', `%${positionName}%`);
      }

      // Multi-keyword tokenized search across all relevant fields
      if (search && search.trim()) {
        const terms = search.trim().split(/\s+/).filter(Boolean);
        for (const term of terms) {
          query = query.or(`tender_name.ilike.%${term}%,budget_entity_name.ilike.%${term}%,tender_code.ilike.%${term}%,invitation_number.ilike.%${term}%,client_code.ilike.%${term}%,position_name.ilike.%${term}%,rule_name.ilike.%${term}%,fund_name.ilike.%${term}%`);
        }
      }

      // Year filter
      if (year && year !== 'all') {
        const yNum = Number(year);
        if (!isNaN(yNum)) {
          const startYear = `${yNum}-01-01T00:00:00+00:00`;
          const endYear = `${yNum}-12-31T23:59:59+00:00`;
          query = query.or(`tender_code.ilike.%/${yNum}%,invitation_number.ilike.%/${yNum}%,and(publish_date.gte.${startYear},publish_date.lte.${endYear})`);
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
      if (tabMode === 'result' || status === 'result') {
        query = query.or('doc_status_name.ilike.%үр дүн%,doc_status_name.ilike.%Үр дүн%,doc_status_name.ilike.%дууссан%,doc_status_code.ilike.%CLOSED%');
      } else if (tabMode === 'active' || status === 'receiving') {
        query = query.or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%');
      } else if (tabMode === 'closing_soon') {
        query = query.or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%');
      } else if (status && status !== 'all') {
        if (status === 'opened') {
          query = query.ilike('doc_status_name', '%нээгдсэн%');
        } else if (status === 'cancelled') {
          query = query.ilike('doc_status_name', '%хүчингүй%');
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
          stats: realStats,
        });
      }

      // If Supabase has 0 results for a past year or query, live fetch from tender.gov.mn on demand
      if (!error && (!data || data.length === 0) && (year || search)) {
        try {
          const liveResult = await tenderStore.fetchLiveTenders(search, page, year);
          if (liveResult.items && liveResult.items.length > 0) {
            // Asynchronously upsert to Supabase
            const records = liveResult.items.map((item) => ({
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
              fund_name: item.fundName || '',
              rule_name: item.ruleName || '',
              publish_date: item.publishDate ? new Date(item.publishDate).toISOString() : null,
              open_date: item.openDate ? new Date(item.openDate).toISOString() : null,
              receive_date: item.receiveDate ? new Date(item.receiveDate).toISOString() : null,
              doc_status_code: item.docStatusCode || '',
              doc_status_name: item.docStatusName || '',
              is_receiving: (item.docStatusName || '').includes('хүлээн') ? 1 : 0,
              raw_data: item,
              updated_at: new Date().toISOString(),
            }));

            const uniqueRecords: any[] = [];
            const seen = new Set<string>();
            for (const r of records) {
              const idStr = String(r.invitation_id);
              if (r.invitation_id && !seen.has(idStr)) {
                seen.add(idStr);
                uniqueRecords.push(r);
              }
            }

            // Fire and forget upsert
            supabase.from('tenders').upsert(uniqueRecords, { onConflict: 'invitation_id' }).then(({ error: upErr }) => {
              if (upErr) console.warn('Background live upsert error:', upErr.message);
            });

            return NextResponse.json({
              success: true,
              items: liveResult.items,
              totalCount: Math.max(liveResult.totalCount, page * perPage),
              page,
              perPage,
              totalPages: Math.max(1, Math.ceil(Math.max(liveResult.totalCount, page * perPage) / perPage)),
              source: 'live_fetch',
              stats: realStats,
            });
          }
        } catch (liveErr) {
          console.warn('Live fetch fallback failed:', liveErr);
        }
      }
    } catch (sbError) {
      // Fallback silently if table does not exist yet
      console.warn('Supabase query failed, falling back to local store:', sbError);
    }

    // Fallback: In-memory/file-based store
    const { items, totalCount } = tenderStore.filterTenders({
      search,
      category,
      industry,
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

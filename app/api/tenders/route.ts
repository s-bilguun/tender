import { NextRequest, NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';
import { TenderFilterParams } from '@/lib/types';

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
    const fetchLive = searchParams.get('live') === 'true';

    // Optionally trigger a live query if requested
    if (fetchLive || (search && search.length > 2)) {
      await tenderStore.fetchLiveTenders(search, page);
    }

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
      lastSyncedAt: tenderStore.getLastSyncTime(),
      stats,
    });
  } catch (error: any) {
    console.error('API /api/tenders error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const search = body.search || undefined;
    const page = body.page || 1;

    const result = await tenderStore.fetchLiveTenders(search, page);

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

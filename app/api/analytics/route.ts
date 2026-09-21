import { NextResponse } from 'next/server';
import { tenderStore } from '@/lib/tender-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = tenderStore.getStats();
    return NextResponse.json({
      success: true,
      stats,
      lastSyncedAt: tenderStore.getLastSyncTime(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { LIVE_BUNDLE_SCHEMA_VERSION, TenderStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_tender_analytics');
    if (!error && data) {
      return NextResponse.json({
        success: true,
        stats: data as TenderStats,
        lastSyncedAt: data.lastUpdatedAt || null,
        source: 'supabase',
      });
    }

    // Keep useful exact row counts available before the optional aggregate migration is applied.
    const now = new Date();
    const closingDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const [total, product, job, service, active, closingSoon, noGuarantee] = await Promise.all([
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true }),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true }).eq('tender_type_code', 'PRODUCT'),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true }).eq('tender_type_code', 'JOB'),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true }).eq('tender_type_code', 'SERVICE'),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true }).or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%'),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true })
        .or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%')
        .gte('receive_date', now.toISOString())
        .lte('receive_date', closingDeadline.toISOString()),
      supabase.from('tenders').select('invitation_id', { count: 'exact', head: true })
        .or('is_receiving.eq.1,doc_status_name.ilike.%хүлээн авч%')
        .eq('raw_data->liveBundle->>schemaVersion', String(LIVE_BUNDLE_SCHEMA_VERSION))
        .filter('raw_data->liveBundle->structuredSpecs->>bidSecurityReq', 'ilike', '%Шаардахгүй%'),
    ]);
    if ([total, product, job, service, active, closingSoon, noGuarantee].some((result) => result.error)) {
      throw error || new Error('Tender aggregate query failed.');
    }

    const stats: TenderStats = {
      totalCount: total.count || 0,
      totalBudgetSum: null,
      activeTendersCount: active.count || 0,
      closingSoonCount: closingSoon.count || 0,
      noGuaranteeCount: noGuarantee.count || 0,
      categoryCounts: {
        product: product.count || 0,
        job: job.count || 0,
        service: service.count || 0,
      },
      topMinistries: [],
    };
    return NextResponse.json({ success: true, stats, lastSyncedAt: null, source: 'supabase_counts' });
  } catch (error) {
    console.warn('Analytics query failed:', error);
    const stats = tenderStore.getStats();
    return NextResponse.json({
      success: true,
      stats,
      lastSyncedAt: tenderStore.getLastSyncTime()?.toISOString() || null,
      source: 'local_cache',
    });
  }
}

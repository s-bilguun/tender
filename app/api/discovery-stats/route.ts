import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Stats = { openCount: number; yearCount: number; yearBudget: number };
const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 30 * 60 * 1000;

function parseList(value: string | null, max: number): string[] {
  return (value || '')
    .split('|')
    .map((v) => v.replace(/[%_\\]/g, ' ').trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Live counts for the dashboard "Buyers and sectors" table:
 * open tenders now, tenders and published budget over the last 12 months.
 * GET /api/discovery-stats?buyers=Эрдэнэт үйлдвэр|...&sectors=mining|...
 */
export async function GET(request: NextRequest) {
  const buyers = parseList(request.nextUrl.searchParams.get('buyers'), 12);
  const sectors = parseList(request.nextUrl.searchParams.get('sectors'), 12);
  const key = JSON.stringify([buyers, sectors]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  }
  try {
    const { data, error } = await supabase.rpc('get_discovery_stats', { p_buyers: buyers, p_sectors: sectors });
    if (error) throw error;
    const body = { success: true, ...(data as { buyers: Record<string, Stats>; sectors: Record<string, Stats>; generatedAt: string }) };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'unavailable' }, { status: 503 });
  }
}

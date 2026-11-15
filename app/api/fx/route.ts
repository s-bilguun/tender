import { NextResponse } from 'next/server';
import { DEFAULT_MNT_PER_RMB } from '@/lib/fx-rate';

interface CachedRate {
  mntPerRmb: number;
  rateDate: string;
  source: string;
  isLive: boolean;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedRate: CachedRate | null = null;

async function fetchFromBankOfMongolia(): Promise<Omit<CachedRate, 'cachedAt'> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://monxansh.appspot.com/xansh.json?currency=CNY', {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : data;
    const rate = Number(entry?.rate_float);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return {
      mntPerRmb: Number(rate.toFixed(2)),
      rateDate: typeof entry?.rate_date === 'string' ? entry.rate_date : new Date().toISOString().slice(0, 10),
      source: 'Bank of Mongolia',
      isLive: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromOpenErApi(): Promise<Omit<CachedRate, 'cachedAt'> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY', {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data?.rates?.MNT);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    const utcStr = typeof data?.time_last_update_utc === 'string' ? data.time_last_update_utc : '';
    const parsedDate = utcStr ? new Date(utcStr) : null;
    const rateDate =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return {
      mntPerRmb: Number(rate.toFixed(2)),
      rateDate,
      source: 'Open ER API',
      isLive: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  if (cachedRate && Date.now() - cachedRate.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      mntPerRmb: cachedRate.mntPerRmb,
      currency: 'CNY',
      base: 'MNT',
      rateDate: cachedRate.rateDate,
      source: cachedRate.source,
      isLive: cachedRate.isLive,
    });
  }

  const bom = await fetchFromBankOfMongolia();
  const resolved =
    bom ||
    (await fetchFromOpenErApi()) || {
      mntPerRmb: DEFAULT_MNT_PER_RMB,
      rateDate: new Date().toISOString().slice(0, 10),
      source: 'Default',
      isLive: false,
    };

  cachedRate = {
    ...resolved,
    cachedAt: Date.now(),
  };

  return NextResponse.json({
    mntPerRmb: resolved.mntPerRmb,
    currency: 'CNY',
    base: 'MNT',
    rateDate: resolved.rateDate,
    source: resolved.source,
    isLive: resolved.isLive,
  });
}

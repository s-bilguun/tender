'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_MNT_PER_RMB,
  getActiveMntPerRmb,
  setActiveMntPerRmb,
  subscribeExchangeRate,
} from './fx-rate';

export interface ExchangeRateState {
  mntPerRmb: number;
  rateDate: string;
  source: string;
  isLive: boolean;
}

const SESSION_CACHE_KEY = 'tenderhub_fx_cny_v1';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedFxPayload {
  mntPerRmb: number;
  rateDate: string;
  source: string;
  isLive: boolean;
  cachedAt: number;
}

let inflightPromise: Promise<ExchangeRateState> | null = null;

async function fetchLiveFxOnce(): Promise<ExchangeRateState> {
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedFxPayload;
        if (
          parsed &&
          Number.isFinite(parsed.mntPerRmb) &&
          parsed.mntPerRmb > 0 &&
          Date.now() - parsed.cachedAt < CACHE_TTL_MS
        ) {
          setActiveMntPerRmb(parsed.mntPerRmb);
          return {
            mntPerRmb: parsed.mntPerRmb,
            rateDate: parsed.rateDate || '',
            source: parsed.source || 'Bank of Mongolia',
            isLive: Boolean(parsed.isLive),
          };
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  if (!inflightPromise) {
    inflightPromise = fetch('/api/fx', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FX API status ${res.status}`);
        const data = await res.json();
        const rate = Number(data?.mntPerRmb);
        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error('Invalid FX rate payload');
        }
        const next: ExchangeRateState = {
          mntPerRmb: rate,
          rateDate: typeof data?.rateDate === 'string' ? data.rateDate : '',
          source: typeof data?.source === 'string' ? data.source : 'Bank of Mongolia',
          isLive: Boolean(data?.isLive),
        };
        setActiveMntPerRmb(next.mntPerRmb);
        if (typeof window !== 'undefined') {
          try {
            const payload: CachedFxPayload = {
              ...next,
              cachedAt: Date.now(),
            };
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
          } catch {
            // Ignore storage write errors
          }
        }
        return next;
      })
      .catch(() => ({
        mntPerRmb: getActiveMntPerRmb(),
        rateDate: '',
        source: 'Fallback',
        isLive: false,
      }))
      .finally(() => {
        inflightPromise = null;
      });
  }

  return inflightPromise;
}

export function useExchangeRate(): ExchangeRateState {
  const [state, setState] = useState<ExchangeRateState>(() => ({
    mntPerRmb: getActiveMntPerRmb(),
    rateDate: '',
    source: 'Bank of Mongolia',
    isLive: false,
  }));

  useEffect(() => {
    const unsubscribe = subscribeExchangeRate((rate) => {
      setState((prev) => (prev.mntPerRmb === rate ? prev : { ...prev, mntPerRmb: rate }));
    });

    let active = true;
    fetchLiveFxOnce().then((res) => {
      if (!active) return;
      setState({
        mntPerRmb: res.mntPerRmb > 0 ? res.mntPerRmb : DEFAULT_MNT_PER_RMB,
        rateDate: res.rateDate,
        source: res.source,
        isLive: res.isLive,
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}

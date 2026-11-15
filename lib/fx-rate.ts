import type { Locale } from './types';

export const DEFAULT_MNT_PER_RMB = 540.2;
export const DEFAULT_MNT_PER_USD = 3450;

let currentMntPerRmb = DEFAULT_MNT_PER_RMB;
const listeners = new Set<(rate: number) => void>();

export function getActiveMntPerRmb(): number {
  return currentMntPerRmb > 0 ? currentMntPerRmb : DEFAULT_MNT_PER_RMB;
}

export function setActiveMntPerRmb(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) return;
  if (Math.abs(rate - currentMntPerRmb) < 0.0001) return;
  currentMntPerRmb = rate;
  listeners.forEach((listener) => {
    try {
      listener(currentMntPerRmb);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function subscribeExchangeRate(listener: (rate: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatRmbShort(
  amountMnt: number,
  mntPerRmb: number = currentMntPerRmb,
  locale: Locale = 'zh'
): string {
  const num = Number(amountMnt);
  if (!num || !Number.isFinite(num) || num <= 0) return '¥0';
  const rate = mntPerRmb > 0 ? mntPerRmb : DEFAULT_MNT_PER_RMB;
  const rmb = num / rate;

  if (rmb >= 1e8) {
    return locale === 'en'
      ? `¥${(rmb / 1e8).toFixed(2)}B`
      : `¥${(rmb / 1e8).toFixed(2)} 亿`;
  }
  if (rmb >= 1e4) {
    return locale === 'en'
      ? `¥${(rmb / 1e3).toFixed(1)}k`
      : `¥${(rmb / 1e4).toFixed(1)} 万`;
  }
  return `¥${Math.round(rmb).toLocaleString('en-US')}`;
}

'use client';

import React from 'react';
import { TenderStats, TenderFilterParams, Locale } from '@/lib/types';
import { ArrowUpRight } from 'lucide-react';

interface DashboardKPICardsProps {
  stats?: TenderStats;
  locale: Locale;
  onApplyFilter?: (filters: Partial<TenderFilterParams>) => void;
}

const MNT_PER_RMB = 470;

function formatMoney(amount: number | null | undefined, locale: Locale): string {
  const num = Number(amount);
  if (!num || Number.isNaN(num)) return '—';
  if (locale === 'zh') {
    const rmb = num / MNT_PER_RMB;
    return rmb >= 1e8 ? `¥${(rmb / 1e8).toFixed(1)} 亿` : `¥${Math.round(rmb / 1e4).toLocaleString()} 万`;
  }
  if (num >= 1e12) return `₮${(num / 1e12).toFixed(2)}${locale === 'mn' ? ' их наяд' : 'T'}`;
  if (num >= 1e9) return `₮${(num / 1e9).toFixed(1)}${locale === 'mn' ? ' тэрбум' : 'B'}`;
  return `₮${Math.round(num / 1e6).toLocaleString()}${locale === 'mn' ? ' сая' : 'M'}`;
}

const t = (locale: Locale, mn: string, en: string, zh: string) => (locale === 'zh' ? zh : locale === 'en' ? en : mn);

/**
 * One ruled strip of live figures from /api/analytics. Each figure is real;
 * when a number isn't available yet it shows a dash rather than a guess.
 */
export const DashboardKPICards: React.FC<DashboardKPICardsProps> = ({ stats, locale, onApplyFilter }) => {
  const active = stats?.activeTendersCount;
  const activeBudget = stats?.activeBudgetSum ?? stats?.totalActiveBudget ?? null;
  const cells: {
    label: string;
    value: string;
    note: string;
    filter?: Partial<TenderFilterParams>;
  }[] = [
    {
      label: t(locale, 'Нээлттэй тендер', 'Open tenders', '正在招标'),
      value: active != null ? active.toLocaleString() : '—',
      note: t(locale, 'Санал хүлээн авч буй', 'Accepting bids now', '正在接受投标'),
      filter: { status: 'receiving', tabMode: 'active', urgency: 'all', page: 1 },
    },
    {
      label: t(locale, 'Нээлттэй тендерийн төсөв', 'Budget of open tenders', '在招项目预算'),
      value: formatMoney(activeBudget, locale),
      note: locale === 'zh' ? `按 1 元 ≈ ${MNT_PER_RMB} ₮ 折算` : t(locale, 'Төсөвт өртгийн нийлбэр', 'Sum of estimated budgets', ''),
    },
    {
      label: t(locale, '48 цагт хаагдах', 'Closing within 48 h', '48 小时内截标'),
      value: stats?.closingSoonCount != null ? stats.closingSoonCount.toLocaleString() : '—',
      note: t(locale, 'Яаралтай бэлтгэх', 'Prepare bids now', '需尽快准备'),
      filter: { status: 'receiving', tabMode: 'active', urgency: 'urgent_48h', page: 1 },
    },
    {
      label: t(locale, 'Баталгаа шаардахгүй', 'No bid security', '无需投标保证金'),
      value: stats?.noGuaranteeCount != null ? stats.noGuaranteeCount.toLocaleString() : '—',
      note: t(locale, 'Тендерийн баталгаагүй оролцох', 'Bid without a guarantee', '可免保函参与'),
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-slate-200 dark:divide-zinc-800 [&>*]:border-slate-200 dark:[&>*]:border-slate-800">
      {cells.map((cell, i) => {
        const clickable = Boolean(cell.filter && onApplyFilter);
        const Tag = clickable ? 'button' : 'div';
        return (
          <Tag
            key={cell.label}
            {...(clickable ? { type: 'button' as const, onClick: () => onApplyFilter!(cell.filter!) } : {})}
            className={`group text-left px-4 py-3.5 sm:px-5 sm:py-4 min-w-0
              ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t xl:border-t-0' : ''} ${i === 2 ? 'xl:border-l' : ''}
              ${clickable ? 'hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span className="truncate">{cell.label}</span>
              {clickable && (
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-zinc-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              )}
            </div>
            <div className="mt-1.5 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
              {cell.value}
            </div>
            {cell.note && <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 truncate">{cell.note}</div>}
          </Tag>
        );
      })}
    </div>
  );
};

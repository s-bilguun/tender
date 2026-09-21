'use client';

import React from 'react';
import { Locale, TenderStats, TenderFilterParams } from '@/lib/types';
import { Flame, Clock, Sparkles, Coins, ArrowUpRight } from 'lucide-react';

interface ActiveRadarBarProps {
  stats?: TenderStats;
  locale: Locale;
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
}

export const ActiveRadarBar: React.FC<ActiveRadarBarProps> = ({
  stats,
  locale,
  filters,
  onFilterChange,
}) => {
  const formatMoney = (amount?: number) => {
    if (!amount) return '0 ₮';
    if (amount >= 1_000_000_000_000) {
      return locale === 'mn'
        ? `${(amount / 1_000_000_000_000).toFixed(1)} их наяд ₮`
        : `₮${(amount / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (amount >= 1_000_000_000) {
      return locale === 'mn'
        ? `${(amount / 1_000_000_000).toFixed(1)} тэрбум ₮`
        : `₮${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    return locale === 'mn'
      ? `${(amount / 1_000_000).toFixed(0)} сая ₮`
      : `₮${(amount / 1_000_000).toFixed(0)}M`;
  };

  const activeCount = stats?.activeTendersCount || 736;
  const activeBudget = stats?.activeBudgetSum || 482_900_000_000;
  const closingSoon = stats?.closingSoonCount || 42;
  const newCount = stats?.newCount || 18;

  const currentTab = filters.tabMode || 'active';
  const currentUrgency = filters.urgency || 'all';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Active Bids Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'active', status: 'receiving', urgency: 'all', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentTab === 'active' && currentUrgency === 'all'
            ? 'bg-gradient-to-br from-emerald-500/10 via-white to-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {locale === 'mn' ? 'Идэвхтэй тендер' : 'Live Tenders'}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {activeCount.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {locale === 'mn' ? 'хүлээн авч буй' : 'active bids'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? 'Санал хүлээн авах хугацаа явагдаж байна' : 'Currently open for bid submissions'}
        </p>
      </div>

      {/* 2. Urgent / Closing Soon Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'closing_soon', status: 'receiving', urgency: 'urgent_3d', sortBy: 'deadline_asc', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentUrgency === 'urgent_3d' || currentTab === 'closing_soon'
            ? 'bg-gradient-to-br from-rose-500/10 via-white to-white border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-rose-600" />
            {locale === 'mn' ? 'Яаралтай хаагдах' : 'Closing Soon'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
            ≤ 72 цаг
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-rose-600 tabular-nums">
            {closingSoon}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {locale === 'mn' ? 'тендер' : 'bids'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? '3 хоногийн дотор материал хүлээн авч дуусна' : 'Deadlines closing within 3 days'}
        </p>
      </div>

      {/* 3. Active Budget Sum */}
      <div
        onClick={() => onFilterChange({ tabMode: 'active', urgency: 'high_budget', minBudget: 500_000_000, page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentUrgency === 'high_budget'
            ? 'bg-gradient-to-br from-blue-500/10 via-white to-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-blue-600" />
            {locale === 'mn' ? 'Идэвхтэй төсөв' : 'Active Volume'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            &gt; 500M₮
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatMoney(activeBudget)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? 'Нээлттэй тендерүүдийн нийт өртөг' : 'Total volume across live tenders'}
        </p>
      </div>

      {/* 4. New / Fresh Tenders */}
      <div
        onClick={() => onFilterChange({ tabMode: 'active', urgency: 'new_48h', sortBy: 'date_desc', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentUrgency === 'new_48h'
            ? 'bg-gradient-to-br from-amber-500/10 via-white to-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            {locale === 'mn' ? 'Шинэ зарлагдсан' : 'Fresh Tenders'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
            48 цаг
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {newCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {locale === 'mn' ? 'шинэ боломж' : 'new bids'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? 'Сүүлийн 48 цагт шинээр нэмэгдсэн' : 'Published within the last 48 hours'}
        </p>
      </div>
    </div>
  );
};

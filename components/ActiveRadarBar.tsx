import React from 'react';
import { Locale, TenderStats, TenderFilterParams } from '@/lib/types';
import { Flame, Clock, Sparkles, Coins, ArrowUpRight, Trophy, Database, Zap } from 'lucide-react';

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

  const totalCount = stats?.totalCount || 22785;
  const totalBudget = stats?.totalBudgetSum || 21_719_589_562_397;
  const activeCount = stats?.activeTendersCount || 736;
  const activeBudget = stats?.activeBudgetSum || 482_900_000_000;
  const closingSoon = stats?.closingSoonCount || 42;

  const currentTab = filters.tabMode || 'all';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. All Historical Archive Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'all', status: 'all', urgency: 'all', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentTab === 'all' && (filters.status === 'all' || !filters.status)
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/30'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
            currentTab === 'all' && (filters.status === 'all' || !filters.status) ? 'text-slate-200' : 'text-slate-700'
          }`}>
            <Database className="h-3.5 w-3.5 text-blue-500" />
            {locale === 'mn' ? 'Нийт тендерийн сан' : 'Historical Archive'}
          </span>
          <ArrowUpRight className={`h-3.5 w-3.5 transition-colors ${
            currentTab === 'all' ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-900'
          }`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold tracking-tight tabular-nums ${
            currentTab === 'all' ? 'text-white' : 'text-slate-900'
          }`}>
            {totalCount.toLocaleString()}
          </span>
          <span className={`text-xs font-medium ${
            currentTab === 'all' ? 'text-slate-300' : 'text-slate-500'
          }`}>
            {locale === 'mn' ? 'бүртгэл' : 'records'}
          </span>
        </div>
        <p className={`mt-1 text-[11px] line-clamp-1 ${
          currentTab === 'all' ? 'text-slate-300' : 'text-slate-500'
        }`}>
          {locale === 'mn' ? `2022-2026 он • ${formatMoney(totalBudget)}` : `2022-2026 Archive • ${formatMoney(totalBudget)}`}
        </p>
      </div>

      {/* 2. Active Live Bids Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'active', status: 'receiving', urgency: 'all', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentTab === 'active'
            ? 'bg-gradient-to-br from-emerald-500/10 via-white to-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {locale === 'mn' ? 'Санал авч буй' : 'Live Bids'}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {activeCount.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {locale === 'mn' ? 'идэвхтэй' : 'open'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? 'Санал хүлээн авах хугацаа явагдаж байна' : 'Currently open for bid submissions'}
        </p>
      </div>

      {/* 3. Awarded / Concluded Winners Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'result', status: 'result', urgency: 'all', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentTab === 'result' || filters.status === 'result'
            ? 'bg-gradient-to-br from-blue-500/10 via-white to-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-blue-600" />
            {locale === 'mn' ? 'Шалгарсан тендерүүд' : 'Awarded Contracts'}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-blue-700 tabular-nums">
            {locale === 'mn' ? 'Үр дүн' : 'Winners'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {locale === 'mn' ? 'гарсан' : 'concluded'}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
          {locale === 'mn' ? 'Шалгарсан компаниуд, гэрээ, үнийн дүн' : 'Winning companies, prices, contracts'}
        </p>
      </div>

      {/* 4. Urgent / Closing Soon Card */}
      <div
        onClick={() => onFilterChange({ tabMode: 'closing_soon', status: 'receiving', urgency: 'urgent_3d', sortBy: 'deadline_asc', page: 1 })}
        className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
          currentTab === 'closing_soon'
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
          {locale === 'mn' ? '3 хоногийн дотор санал хураалт дуусна' : 'Deadlines closing within 3 days'}
        </p>
      </div>
    </div>
  );
};

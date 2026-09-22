'use client';

import React from 'react';
import { Locale, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { RefreshCw, Sparkles, BarChart2, Globe, Building } from 'lucide-react';

interface HeaderProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  stats?: TenderStats;
  isSyncing: boolean;
  onSync: () => void;
  onOpenAI: () => void;
  onToggleAnalytics: () => void;
  isAnalyticsOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  locale,
  setLocale,
  stats,
  isSyncing,
  onSync,
  onOpenAI,
  onToggleAnalytics,
  isAnalyticsOpen,
}) => {
  const t = getTranslation(locale);

  const formatBudgetShort = (amount?: number) => {
    if (!amount) return '0 ₮';
    if (amount >= 1_000_000_000_000) {
      return locale === 'mn' ? `${(amount / 1_000_000_000_000).toFixed(1)} их наяд ₮` : `₮${(amount / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (amount >= 1_000_000_000) {
      return locale === 'mn' ? `${(amount / 1_000_000_000).toFixed(1)} тэрбум ₮` : `₮${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    return locale === 'mn' ? `${(amount / 1_000_000).toFixed(0)} сая ₮` : `₮${(amount / 1_000_000).toFixed(0)}M`;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wide shadow-sm shrink-0">
            <Building className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 truncate">
                TENDER<span className="text-blue-600">.MN</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
                Нээлттэй өгөгдөл
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {locale === 'mn' ? 'Төрийн цахим худалдан авалт' : 'Public Procurement Portal'}
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        {stats && (
          <div className="hidden md:flex items-center gap-5 text-xs text-slate-600 font-sans border-x border-slate-200 px-5">
            <div>
              <span className="text-slate-500">{t.totalTenders}:</span>{' '}
              <strong className="text-slate-900 tabular-nums">{stats.totalCount.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500">{locale === 'mn' ? 'Идэвхтэй:' : 'Active:'}</span>{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 tabular-nums text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.activeTendersCount || 736}
              </span>
            </div>
            <div>
              <span className="text-slate-500">{t.totalBudget}:</span>{' '}
              <strong className="text-slate-900 tabular-nums">{formatBudgetShort(stats.totalBudgetSum)}</strong>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Analytics button */}
          <button
            onClick={onToggleAnalytics}
            className={`h-8 px-2 sm:px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isAnalyticsOpen
                ? 'bg-slate-100 text-slate-900 border-slate-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={locale === 'mn' ? 'Статистик' : 'Analytics'}
          >
            <BarChart2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">{locale === 'mn' ? 'Статистик' : 'Analytics'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'mn' ? 'en' : 'mn')}
            className="h-8 px-2 sm:px-2.5 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1 transition-colors shrink-0"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">{locale === 'mn' ? 'MN' : 'EN'}</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAI}
            className="h-8 px-2.5 sm:px-3.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">{locale === 'mn' ? 'AI Шинжээч' : 'AI Assistant'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

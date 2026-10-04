'use client';

import React from 'react';
import { TenderFilterParams, Locale } from '@/lib/types';
import { Flame, Clock, Trophy, Star, LayoutGrid, CheckCircle2 } from 'lucide-react';

interface StatusFilterTabsProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  watchlistCount: number;
}

export const StatusFilterTabs: React.FC<StatusFilterTabsProps> = ({
  filters,
  onFilterChange,
  locale,
  watchlistCount,
}) => {
  const currentTab = 
    filters.tabMode === 'watchlist' 
      ? 'watchlist' 
      : filters.urgency === 'urgent' || filters.urgency === 'critical'
      ? 'urgent'
      : filters.sortBy === 'date_desc' && (!filters.urgency || filters.urgency === 'all') && filters.status === 'receiving'
      ? 'new'
      : filters.status === 'awarded'
      ? 'results'
      : 'all';

  const tabs = [
    {
      id: 'all',
      label: locale === 'mn' ? 'Бүх тендер' : 'All Tenders',
      icon: LayoutGrid,
      onClick: () => onFilterChange({ tabMode: 'active', urgency: 'all', status: 'receiving', page: 1 }),
    },
    {
      id: 'new',
      label: locale === 'mn' ? '🔥 Шинэ зарлагдсан' : '🔥 New Postings',
      icon: Flame,
      onClick: () => onFilterChange({ tabMode: 'active', urgency: 'all', status: 'receiving', sortBy: 'date_desc', page: 1 }),
    },
    {
      id: 'urgent',
      label: locale === 'mn' ? '⏳ Хугацаа дөхсөн' : '⏳ Ending Soon (≤3d)',
      icon: Clock,
      onClick: () => onFilterChange({ tabMode: 'active', urgency: 'urgent', status: 'receiving', sortBy: 'deadline_asc', page: 1 }),
    },
    {
      id: 'results',
      label: locale === 'mn' ? '🏆 Үр дүн гарсан' : '🏆 Awarded Results',
      icon: Trophy,
      onClick: () => onFilterChange({ tabMode: 'active', status: 'awarded', urgency: 'all', page: 1 }),
    },
    {
      id: 'watchlist',
      label: locale === 'mn' ? `⭐ Хянаж буй (${watchlistCount})` : `⭐ Watchlist (${watchlistCount})`,
      icon: Star,
      onClick: () => onFilterChange({ tabMode: 'watchlist', page: 1 }),
    },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto snap-x no-scrollbar py-1">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all shrink-0 snap-start cursor-pointer active:scale-95 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

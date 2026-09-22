'use client';

import React from 'react';
import { Locale, TenderFilterParams, ActiveTabMode } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Search, X, Table as TableIcon, LayoutGrid, ArrowUpDown, Flame, Star, Zap, Archive, Calendar, Trophy, Database, Filter } from 'lucide-react';

interface TenderFiltersProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  totalFound: number;
  watchlistCount?: number;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
}

export const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
  watchlistCount = 0,
  viewMode,
  setViewMode,
}) => {
  const t = getTranslation(locale);

  const categories = [
    { id: 'all', label: t.categories.all },
    { id: 'PRODUCT', label: t.categories.product },
    { id: 'JOB', label: t.categories.job },
    { id: 'SERVICE', label: t.categories.service },
  ];

  const statuses = [
    { id: 'all', label: locale === 'mn' ? 'Бүх төлөв' : 'All Statuses' },
    { id: 'receiving', label: locale === 'mn' ? '🟢 Санал авч буй' : '🟢 Receiving' },
    { id: 'result', label: locale === 'mn' ? '🏆 Үр дүн гарсан' : '🏆 Awarded' },
    { id: 'opened', label: locale === 'mn' ? '🟡 Нээгдсэн' : '🟡 Opened' },
    { id: 'cancelled', label: locale === 'mn' ? '🔴 Хүчингүй' : '🔴 Cancelled' },
  ];

  const budgetTiers = [
    { id: 'all', label: t.budgetRanges.all, min: undefined, max: undefined },
    { id: 'under50m', label: t.budgetRanges.under50m, min: 0, max: 50_000_000 },
    { id: 'from50to500m', label: t.budgetRanges.from50to500m, min: 50_000_000, max: 500_000_000 },
    { id: 'from500mto2b', label: t.budgetRanges.from500mto2b, min: 500_000_000, max: 2_000_000_000 },
    { id: 'above2b', label: t.budgetRanges.above2b, min: 2_000_000_000, max: undefined },
  ];

  const currentTab: ActiveTabMode = filters.tabMode || 'all';
  const currentCategory = filters.category || 'all';
  const currentStatus = filters.status || 'all';

  const getActiveBudgetTier = () => {
    if (filters.minBudget === 0 && filters.maxBudget === 50_000_000) return 'under50m';
    if (filters.minBudget === 50_000_000 && filters.maxBudget === 500_000_000) return 'from50to500m';
    if (filters.minBudget === 50_000_000 && filters.maxBudget === 2_000_000_000) return 'from500mto2b';
    if (filters.minBudget === 2_000_000_000 && filters.maxBudget === undefined) return 'above2b';
    return 'all';
  };

  const activeBudgetTier = getActiveBudgetTier();

  const handleTabSelect = (tab: ActiveTabMode) => {
    if (tab === 'all') {
      onFilterChange({ tabMode: 'all', status: 'all', urgency: 'all', page: 1 });
    } else if (tab === 'active') {
      onFilterChange({ tabMode: 'active', status: 'receiving', urgency: 'all', page: 1 });
    } else if (tab === 'result') {
      onFilterChange({ tabMode: 'result', status: 'result', urgency: 'all', page: 1 });
    } else if (tab === 'closing_soon') {
      onFilterChange({ tabMode: 'closing_soon', status: 'receiving', urgency: 'urgent_3d', sortBy: 'deadline_asc', page: 1 });
    } else if (tab === 'watchlist') {
      onFilterChange({ tabMode: 'watchlist', page: 1 });
    }
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
      {/* 1. Primary Workflow Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {/* All History / Archive Tab */}
          <button
            onClick={() => handleTabSelect('all')}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span>{locale === 'mn' ? '📋 Бүх тендерүүд' : '📋 All Tenders'}</span>
          </button>

          {/* Active Live Tab */}
          <button
            onClick={() => handleTabSelect('active')}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{locale === 'mn' ? '⚡ Санал авч буй' : '⚡ Live Bids'}</span>
          </button>

          {/* Awarded / Concluded Winners Tab */}
          <button
            onClick={() => handleTabSelect('result')}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'result'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            <span>{locale === 'mn' ? '🏆 Шалгарсан / Үр дүн' : '🏆 Awarded'}</span>
          </button>

          {/* Closing Soon Tab */}
          <button
            onClick={() => handleTabSelect('closing_soon')}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'closing_soon'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>{locale === 'mn' ? 'Хаагдах дөхсөн (≤ 72ц)' : 'Closing Soon'}</span>
          </button>

          {/* Watchlist Tab */}
          <button
            onClick={() => handleTabSelect('watchlist')}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'watchlist'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${currentTab === 'watchlist' ? 'fill-white' : 'text-amber-500'}`} />
            <span>{locale === 'mn' ? 'Миний хянаж буй' : 'Watchlist'}</span>
            {watchlistCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>
        </div>

        {/* View Mode Toggle: Table / Grid */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 h-7 rounded text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title={locale === 'mn' ? 'Хүснэгтээр харах' : 'Table view'}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'mn' ? 'Хүснэгт' : 'Table'}</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 h-7 rounded text-xs flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title={locale === 'mn' ? 'Картаар харах' : 'Grid view'}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'mn' ? 'Карт' : 'Cards'}</span>
          </button>
        </div>
      </div>

      {/* 2. Comprehensive Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
          placeholder={
            currentTab === 'result'
              ? (locale === 'mn' ? 'Шалгарсан тендер, байгууллага, салбараар хайх...' : 'Search awarded contracts...')
              : currentTab === 'active'
              ? (locale === 'mn' ? 'Идэвхтэй нээлттэй тендерээс хайх (нэр, дугаар, захиалагч)...' : 'Search live tenders...')
              : (locale === 'mn' ? 'Бүх 22,000+ тендерийн түүхээс хайх (нэр, дугаар, яам, байгууллага)...' : 'Search all historical tenders...')
          }
          className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-colors"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: '', page: 1 })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 3. Status, Category & Budget Filter Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 text-xs pt-0.5">
        {/* Category Chips */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto scrollbar-none pb-1 lg:pb-0">
          <span className="text-[11px] font-medium text-slate-400 mr-1 whitespace-nowrap">
            {locale === 'mn' ? 'Салбар:' : 'Category:'}
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ category: cat.id, page: 1 })}
              className={`h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                currentCategory === cat.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown, Budget Tiers & Sort */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          {/* Explicit Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 h-7 text-xs text-slate-700">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={currentStatus}
              onChange={(e) => {
                const val = e.target.value;
                onFilterChange({
                  status: val,
                  tabMode: val === 'receiving' ? 'active' : val === 'result' ? 'result' : 'all',
                  page: 1,
                });
              }}
              className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer font-medium"
            >
              {statuses.map((st) => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Budget Tiers */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {budgetTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => onFilterChange({ minBudget: tier.min, maxBudget: tier.max, page: 1 })}
                className={`h-7 px-2.5 rounded-md text-[11px] whitespace-nowrap transition-colors ${
                  activeBudgetTier === tier.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 h-7 text-xs text-slate-700">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={filters.sortBy || (currentTab === 'closing_soon' ? 'deadline_asc' : 'date_desc')}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="date_desc">{locale === 'mn' ? 'Шинээр зарлагдсанаар' : 'Newest First'}</option>
                <option value="deadline_asc">{locale === 'mn' ? 'Эцсийн хугацаа ойртсоноор' : 'Ending Soonest'}</option>
                <option value="budget_desc">{t.sortOptions.budget_desc}</option>
                <option value="budget_asc">{t.sortOptions.budget_asc}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Year & Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>{locale === 'mn' ? 'Зарласан он:' : 'Year:'}</span>
          </span>

          {['all', '2026', '2025', '2024', '2023', '2022'].map((yr) => {
            const isSelected = (filters.year || 'all') === yr;
            return (
              <button
                key={yr}
                onClick={() => {
                  // When selecting past years, reset status so we don't accidentally block with "receiving"
                  const isPastYear = yr !== 'all' && yr !== '2026';
                  const shouldResetStatus = isPastYear && filters.status === 'receiving';
                  onFilterChange({
                    year: yr === 'all' ? undefined : yr,
                    ...(shouldResetStatus ? { status: 'all', tabMode: 'all' } : {}),
                    page: 1,
                  });
                }}
                className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {yr === 'all' ? (locale === 'mn' ? 'Бүх он' : 'All') : `${yr} он`}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Picker Inputs */}
        <div className="flex items-center gap-1.5 ml-auto text-[11px]">
          <span className="text-slate-400 hidden sm:inline">{locale === 'mn' ? 'Огнооны интервал:' : 'Date Range:'}</span>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({
              dateFrom: e.target.value || undefined,
              ...(filters.status === 'receiving' ? { status: 'all', tabMode: 'all' } : {}),
              page: 1,
            })}
            className="h-6 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
            title={locale === 'mn' ? 'Эхлэх огноо' : 'Start date'}
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange({
              dateTo: e.target.value || undefined,
              ...(filters.status === 'receiving' ? { status: 'all', tabMode: 'all' } : {}),
              page: 1,
            })}
            className="h-6 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
            title={locale === 'mn' ? 'Дуусах огноо' : 'End date'}
          />
          {(filters.dateFrom || filters.dateTo || (filters.year && filters.year !== 'all')) && (
            <button
              onClick={() => onFilterChange({ year: undefined, dateFrom: undefined, dateTo: undefined, page: 1 })}
              className="h-6 px-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Огнооны шүүлтүүр цэвэрлэх"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

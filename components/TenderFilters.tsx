'use client';

import React from 'react';
import { Locale, TenderFilterParams } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Search, X, Table as TableIcon, LayoutGrid, ArrowUpDown } from 'lucide-react';

interface TenderFiltersProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  totalFound: number;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
}

export const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
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

  const budgetTiers = [
    { id: 'all', label: t.budgetRanges.all, min: undefined, max: undefined },
    { id: 'under50m', label: t.budgetRanges.under50m, min: 0, max: 50_000_000 },
    { id: 'from50to500m', label: t.budgetRanges.from50to500m, min: 50_000_000, max: 500_000_000 },
    { id: 'from500mto2b', label: t.budgetRanges.from500mto2b, min: 500_000_000, max: 2_000_000_000 },
    { id: 'above2b', label: t.budgetRanges.above2b, min: 2_000_000_000, max: undefined },
  ];

  const statuses = [
    { id: 'all', label: locale === 'mn' ? 'Бүх төлөв (22k+)' : 'All (22k+)', dot: 'bg-slate-400' },
    { id: 'receiving', label: locale === 'mn' ? 'Хүлээн авч буй (730+)' : 'Receiving (730+)', dot: 'bg-emerald-500' },
    { id: 'opened', label: locale === 'mn' ? 'Нээгдсэн (710+)' : 'Opened (710+)', dot: 'bg-amber-500' },
    { id: 'result', label: locale === 'mn' ? 'Үр дүн гарсан (21k)' : 'Awarded (21k)', dot: 'bg-blue-500' },
    { id: 'cancelled', label: locale === 'mn' ? 'Хүчингүй' : 'Cancelled', dot: 'bg-rose-500' },
  ];

  const currentCategory = filters.category || 'all';

  const getActiveBudgetTier = () => {
    if (filters.minBudget === 0 && filters.maxBudget === 50_000_000) return 'under50m';
    if (filters.minBudget === 50_000_000 && filters.maxBudget === 500_000_000) return 'from50to500m';
    if (filters.minBudget === 500_000_000 && filters.maxBudget === 2_000_000_000) return 'from500mto2b';
    if (filters.minBudget === 2_000_000_000 && filters.maxBudget === undefined) return 'above2b';
    return 'all';
  };

  const activeBudgetTier = getActiveBudgetTier();

  return (
    <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
          placeholder={t.searchPlaceholder}
          className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none rounded-md text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-colors"
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

      {/* Categories & View Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs pt-1">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ category: cat.id, page: 1 })}
              className={`h-7 px-3 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                currentCategory === cat.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Budget Tiers & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Budget Quick Filters */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {budgetTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => onFilterChange({ minBudget: tier.min, maxBudget: tier.max, page: 1 })}
                className={`h-7 px-2.5 rounded text-[11px] whitespace-nowrap transition-colors ${
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
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 h-7 text-xs text-slate-700">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={filters.sortBy || 'date_desc'}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="date_desc">{t.sortOptions.date_desc}</option>
                <option value="deadline_asc">{t.sortOptions.deadline_asc}</option>
                <option value="budget_desc">{t.sortOptions.budget_desc}</option>
                <option value="budget_asc">{t.sortOptions.budget_asc}</option>
              </select>
            </div>

            {/* View Mode Toggle: Table / Grid */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 h-7">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={locale === 'mn' ? 'Хүснэгтээр харах' : 'Table view'}
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title={locale === 'mn' ? 'Картаар харах' : 'Grid view'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto w-full border-t border-slate-100 pt-2.5 text-xs scrollbar-none">
        <span className="text-[11px] font-medium text-slate-400 mr-1 whitespace-nowrap">
          {locale === 'mn' ? 'Төлөв:' : 'Status:'}
        </span>
        {statuses.map((st) => (
          <button
            key={st.id}
            onClick={() => onFilterChange({ status: st.id, page: 1 })}
            className={`h-6 px-2.5 rounded-full text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              (filters.status || 'all') === st.id
                ? 'bg-slate-900 text-white font-medium shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            <span>{st.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

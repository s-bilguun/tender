'use client';

import React, { useState, useMemo } from 'react';
import { Locale, TenderFilterParams, ActiveTabMode, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { INDUSTRIES } from '@/lib/taxonomy';
import {
  X, ArrowUpDown, Flame, Star, Calendar, Trophy, Database,
  SlidersHorizontal, RotateCcw, ShieldCheck, FileSpreadsheet,
  FileText, ChevronDown, Globe2, Layers,
} from 'lucide-react';

interface TenderFiltersProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  totalFound: number;
  watchlistCount?: number;
  viewMode?: 'table' | 'grid';
  setViewMode?: (mode: 'table' | 'grid') => void;
  stats?: TenderStats;
  onExportCSV?: () => void;
}

export const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
  watchlistCount = 0,
  stats,
  onExportCSV,
}) => {
  const t = getTranslation(locale);
  const tr = (mn: string, en: string, zh: string) =>
    locale === 'zh' ? zh : locale === 'en' ? en : mn;

  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

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

  const fundSources = [
    { id: 'all', label: tr('Бүх санхүүжилт', 'All Funds', '全部资金来源') },
    { id: 'Улсын төсөв', label: tr('Улсын төсөв', 'State Budget', '国家预算') },
    { id: 'Орон нутгийн төсөв', label: tr('Орон нутгийн төсөв', 'Local Budget', '地方预算') },
    { id: 'Өөрийн хөрөнгө', label: tr('Өөрийн хөрөнгө', 'Own Capital', '自有资金') },
    { id: 'Гадаадын зээл', label: tr('Гадаадын зээл, тусламж', 'Foreign Loan/Grant', '外国贷款/援助') },
  ];

  const procurementRules = [
    { id: 'all', label: tr('Бүх арга', 'All Methods', '全部方式') },
    { id: 'Нээлттэй', label: tr('Нээлттэй тендер', 'Open Bidding', '公开招标') },
    { id: 'Харьцуулалт', label: tr('Харьцуулалтын арга', 'Comparison', '对比方式') },
    { id: 'Зөвлөх', label: tr('Зөвлөх үйлчилгээ', 'Consulting', '咨询服务') },
    { id: 'Шууд', label: tr('Шууд худалдан авалт', 'Direct', '直接采购') },
  ];

  const chinaEligibilityOptions = [
    { id: 'all', label: tr('Бүх ААН (Дотоод/Гадаад)', 'All Bidders', '全部投标人') },
    { id: 'direct', label: tr('Шууд оролцох (Direct)', 'Direct Foreign Bid', '可独立投标 (Direct)') },
    { id: 'joint_venture', label: tr('Түншлэл (JV)', 'Local JV Required', '需联合体 (JV)') },
    { id: 'domestic_only', label: tr('Зөвхөн дотоодын', 'Domestic Only', '仅限本土') },
  ];

  const currentTab: ActiveTabMode = filters.tabMode || 'active';
  const currentCategory = filters.category || 'all';
  const currentIndustry = filters.industry || 'all';
  const currentEligibility = filters.chinaEligibility || 'all';

  const getActiveBudgetTier = () => {
    if (filters.minBudget === 0 && filters.maxBudget === 50_000_000) return 'under50m';
    if (filters.minBudget === 50_000_000 && filters.maxBudget === 500_000_000) return 'from50to500m';
    if (filters.minBudget === 500_000_000 && filters.maxBudget === 2_000_000_000) return 'from500mto2b';
    if (filters.minBudget === 2_000_000_000 && filters.maxBudget === undefined) return 'above2b';
    return 'all';
  };

  const activeBudgetTier = getActiveBudgetTier();

  const activeAdvancedCount = [
    filters.fundName && filters.fundName !== 'all',
    filters.ruleName && filters.ruleName !== 'all',
    filters.positionName && filters.positionName !== 'all',
    (filters.minBudget !== undefined || filters.maxBudget !== undefined) && activeBudgetTier === 'all',
    filters.dateFrom || filters.dateTo,
  ].filter(Boolean).length;

  const handleTabSelect = (tab: ActiveTabMode) => {
    if (tab === 'active') {
      onFilterChange({ tabMode: 'active', status: 'receiving', urgency: 'all', page: 1 });
    } else if (tab === 'closing_soon') {
      onFilterChange({ tabMode: 'closing_soon', status: 'receiving', urgency: 'urgent_48h', sortBy: 'deadline_asc', page: 1 });
    } else if (tab === 'no_guarantee') {
      onFilterChange({ tabMode: 'no_guarantee', status: 'receiving', urgency: 'all', page: 1 });
    } else if (tab === 'result') {
      onFilterChange({ tabMode: 'result', status: 'result', urgency: 'all', page: 1 });
    } else if (tab === 'all') {
      onFilterChange({ tabMode: 'all', status: 'all', urgency: 'all', page: 1 });
    } else if (tab === 'watchlist') {
      onFilterChange({ tabMode: 'watchlist', page: 1 });
    }
  };

  const handleResetAll = () => {
    onFilterChange({
      search: undefined,
      category: 'all',
      industry: 'all',
      status: 'receiving',
      tabMode: 'active',
      urgency: 'all',
      hasDocs: undefined,
      minBudget: undefined,
      maxBudget: undefined,
      year: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      fundName: undefined,
      ruleName: undefined,
      positionName: undefined,
      chinaEligibility: undefined,
      sortBy: 'date_desc',
      page: 1,
    });
  };

  const activeIndustryStats = currentIndustry !== 'all' ? stats?.statsByIndustry?.[currentIndustry] : null;

  const hasSubFilters = Boolean(
    filters.search ||
    filters.hasDocs ||
    (filters.category && filters.category !== 'all') ||
    (filters.year && filters.year !== 'all') ||
    activeBudgetTier !== 'all' ||
    Boolean(filters.fundName && filters.fundName !== 'all') ||
    Boolean(filters.ruleName && filters.ruleName !== 'all') ||
    Boolean(filters.chinaEligibility && filters.chinaEligibility !== 'all') ||
    Boolean(filters.dateFrom || filters.dateTo)
  );

  const tabMetrics = useMemo((): { all: number | null; active: number | null; result: number | null; closing: number | null } => {
    const known = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);
    if (hasSubFilters) {
      return {
        all: currentTab === 'all' ? totalFound : null,
        active: currentTab === 'active' ? totalFound : null,
        result: currentTab === 'result' ? totalFound : null,
        closing: currentTab === 'closing_soon' ? totalFound : null,
      };
    }
    if (currentIndustry !== 'all') {
      return {
        all: known(activeIndustryStats?.totalCount),
        active: known(activeIndustryStats?.activeCount ?? stats?.industryCounts?.[currentIndustry]),
        result: known(activeIndustryStats?.resultCount),
        closing: known(activeIndustryStats?.closingSoonCount),
      };
    }
    return {
      all: known(stats?.totalCount),
      active: known(stats?.activeTendersCount),
      result: known(stats?.resultCount),
      closing: known(stats?.closingSoonCount),
    };
  }, [hasSubFilters, currentIndustry, currentTab, activeIndustryStats, stats, totalFound]);

  const isCustomFiltered =
    Boolean(filters.search) ||
    Boolean(filters.hasDocs) ||
    (filters.category && filters.category !== 'all') ||
    currentIndustry !== 'all' ||
    (filters.year && filters.year !== 'all') ||
    activeBudgetTier !== 'all' ||
    Boolean(filters.fundName && filters.fundName !== 'all') ||
    Boolean(filters.ruleName && filters.ruleName !== 'all') ||
    Boolean(filters.chinaEligibility && filters.chinaEligibility !== 'all') ||
    Boolean(filters.dateFrom || filters.dateTo) ||
    activeAdvancedCount > 0;

  const chipClass =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700';

  const selectBoxClass =
    'relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md px-2.5 h-8 text-xs text-slate-700 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors';

  const getSectorLabel = (id: string) => {
    const info = INDUSTRIES.find((i) => i.id === id);
    if (!info) return id;
    return locale === 'zh' ? (info.labelZh || info.labelEn) : locale === 'en' ? info.labelEn : info.labelMn;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden">
      {/* Row 1: Primary Status Tabs (Left) & Category Switcher + Export CSV (Right) */}
      <div className="px-3 sm:px-4 flex flex-col xl:flex-row xl:items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar -mx-1 px-1 min-w-0">
          <button
            type="button"
            onClick={() => handleTabSelect('active')}
            className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'active'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{tr('Санал авч буй', 'Live Bids', '正在招投标')}</span>
            {tabMetrics.active != null && (
              <span className="text-[11px] tabular-nums opacity-60">{tabMetrics.active.toLocaleString('en-US')}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('closing_soon')}
            className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'closing_soon'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{tr('Хаагдах дөхсөн', 'Closing Soon', '即将截标')}</span>
            {tabMetrics.closing != null && (
              <span className="text-[11px] tabular-nums opacity-60">{tabMetrics.closing.toLocaleString('en-US')}</span>
            )}
          </button>

          {(stats?.noGuaranteeCount !== 0 || currentTab === 'no_guarantee') && (
            <button
              type="button"
              onClick={() => handleTabSelect('no_guarantee')}
              className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                currentTab === 'no_guarantee'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{tr('Баталгаагүй', 'No Bid Bond', '免保函')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabSelect('result')}
            className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'result'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>{tr('Үр дүн', 'Awarded', '中标结果')}</span>
            {tabMetrics.result != null && (
              <span className="text-[11px] tabular-nums opacity-60">{tabMetrics.result.toLocaleString('en-US')}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('all')}
            className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'all'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>{tr('Бүх сан', 'All Tenders', '全部标段')}</span>
            {tabMetrics.all != null && (
              <span className="text-[11px] tabular-nums opacity-60">{tabMetrics.all.toLocaleString('en-US')}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect('watchlist')}
            className={`h-11 -mb-px border-b-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'watchlist'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            <span>{tr('Хянаж буй', 'Watchlist', '关注')}</span>
            {watchlistCount > 0 && (
              <span className="text-[11px] tabular-nums opacity-60">{watchlistCount}</span>
            )}
          </button>
        </div>

        {/* Right Utility Controls: Category Segmented Control + Export CSV */}
        <div className="flex items-center justify-between xl:justify-end gap-2 py-2 shrink-0">
          <div className="flex items-center bg-slate-100/90 dark:bg-zinc-800 p-0.5 rounded-md border border-slate-200 dark:border-zinc-700 h-8 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onFilterChange({ category: cat.id, page: 1 })}
                className={`h-7 px-2.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  currentCategory === cat.id
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="h-8 px-2.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={tr('Excel / CSV файлаар татах', 'Export to CSV / Excel', '导出 Excel / CSV 表格')}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden md:inline">{tr('CSV', 'Export CSV', '导出')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Compact Inline Filter Strip */}
      <div className="px-3 sm:px-4 py-2 bg-slate-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center gap-2">
        {/* Sector Select */}
        <div className={selectBoxClass}>
          <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 mr-1.5 shrink-0" />
          <select
            value={currentIndustry}
            onChange={(e) => onFilterChange({ industry: e.target.value as any, page: 1 })}
            aria-label={tr('Салбар', 'Sector', '行业')}
            className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4 appearance-none max-w-[165px]"
          >
            <option value="all" className="dark:bg-zinc-900 dark:text-white">
              {tr('Бүх салбар', 'All Sectors', '全部行业')}
            </option>
            {INDUSTRIES.map((ind) => (
              <option key={ind.id} value={ind.id} className="dark:bg-zinc-900 dark:text-white">
                {locale === 'zh' ? (ind.labelZh || ind.labelEn) : locale === 'en' ? ind.labelEn : ind.labelMn}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Foreign Eligibility Select */}
        <div className={selectBoxClass}>
          <Globe2 className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 mr-1.5 shrink-0" />
          <select
            value={currentEligibility}
            onChange={(e) => onFilterChange({ chinaEligibility: e.target.value as any, page: 1 })}
            aria-label={tr('Гадаад оролцогч', 'Foreign Eligibility', '外企准入')}
            className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            {chinaEligibilityOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="dark:bg-zinc-900 dark:text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Budget Tier Select */}
        <div className={selectBoxClass}>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 mr-1 shrink-0">
            {tr('Төсөв:', 'Budget:', '预算:')}
          </span>
          <select
            value={activeBudgetTier}
            onChange={(e) => {
              const selected = budgetTiers.find((b) => b.id === e.target.value);
              onFilterChange({ minBudget: selected?.min, maxBudget: selected?.max, page: 1 });
            }}
            aria-label={tr('Төсөв', 'Budget', '预算')}
            className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            {budgetTiers.map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-zinc-900 dark:text-white">
                {b.label}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Year Select */}
        <div className={selectBoxClass}>
          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 mr-1.5 shrink-0" />
          <select
            value={filters.year || 'all'}
            onChange={(e) => {
              const yr = e.target.value;
              const isPastYear = yr !== 'all' && yr !== '2026';
              const shouldResetStatus = isPastYear && filters.status === 'receiving';
              onFilterChange({
                year: yr === 'all' ? undefined : yr,
                ...(shouldResetStatus ? { status: 'all', tabMode: 'all' } : {}),
                page: 1,
              });
            }}
            aria-label={tr('Он', 'Year', '年份')}
            className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            <option value="all" className="dark:bg-zinc-900 dark:text-white">
              {tr('Бүх он', 'All years', '全部年份')}
            </option>
            {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'].map((yr) => (
              <option key={yr} value={yr} className="dark:bg-zinc-900 dark:text-white">
                {locale === 'mn' ? `${yr} он` : locale === 'zh' ? `${yr} 年` : yr}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Sort Select */}
        <div className={selectBoxClass}>
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 mr-1.5 shrink-0" />
          <select
            value={filters.sortBy || (currentTab === 'closing_soon' ? 'deadline_asc' : 'date_desc')}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
            aria-label={tr('Эрэмбэ', 'Sort', '排序')}
            className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            <option value="date_desc" className="dark:bg-zinc-900 dark:text-white">
              {tr('Шинээр зарлагдсан', 'Newest', '最新发布')}
            </option>
            <option value="deadline_asc" className="dark:bg-zinc-900 dark:text-white">
              {tr('Хугацаа ойртсон', 'Ending Soon', '即将截止')}
            </option>
            <option value="budget_desc" className="dark:bg-zinc-900 dark:text-white">
              {t.sortOptions.budget_desc}
            </option>
            <option value="budget_asc" className="dark:bg-zinc-900 dark:text-white">
              {t.sortOptions.budget_asc}
            </option>
          </select>
          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* With PDF / Specs Toggle Pill */}
        <button
          type="button"
          aria-pressed={Boolean(filters.hasDocs)}
          onClick={() => onFilterChange({ hasDocs: filters.hasDocs ? undefined : true, page: 1 })}
          className={`h-8 px-2.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
            filters.hasDocs
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white'
              : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>{tr('PDF / Задаргаатай', 'With PDF / Specs', '含 PDF 规格书')}</span>
        </button>

        {/* Advanced Filters Button */}
        <button
          type="button"
          onClick={() => setIsAdvancedModalOpen(true)}
          className={`h-8 px-2.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ml-auto ${
            activeAdvancedCount > 0
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white'
              : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-800'
          }`}
          title={tr('Нарийвчилсан шүүлтүүр', 'More Filters', '更多筛选')}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span>{tr('Нарийвчилсан', 'Filters', '更多筛选')}</span>
          {activeAdvancedCount > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-white/20 dark:bg-zinc-900/20 text-[10px] font-semibold tabular-nums flex items-center justify-center">
              {activeAdvancedCount}
            </span>
          )}
        </button>
      </div>

      {/* Row 3: Dismissible Active Filter Chips (only when non-default filters are active) */}
      {isCustomFiltered && (
        <div className="px-3 sm:px-4 py-2 border-t border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-slate-400 dark:text-zinc-500 font-medium mr-0.5">
            {tr('Шүүлт:', 'Active:', '已选:')}
          </span>

          {filters.search && (
            <span className={chipClass}>
              <span>
                {tr('Хайлт', 'Search', '搜索')}: <strong>“{filters.search}”</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ search: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.hasDocs && (
            <span className={chipClass}>
              <span>{tr('PDF / Задаргаатай', 'With PDF / Specs', '含 PDF 规格书')}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ hasDocs: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {currentIndustry !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Салбар', 'Sector', '行业')}: <strong>{getSectorLabel(currentIndustry)}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ industry: 'all', page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.chinaEligibility && filters.chinaEligibility !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Оролцогч', 'Eligibility', '准入')}:{' '}
                <strong>{chinaEligibilityOptions.find((o) => o.id === filters.chinaEligibility)?.label}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ chinaEligibility: 'all', page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.category && filters.category !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Төрөл', 'Category', '类别')}: <strong>{categories.find((c) => c.id === filters.category)?.label}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ category: 'all', page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.year && filters.year !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Он', 'Year', '年份')}: <strong>{filters.year}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ year: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {activeBudgetTier !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Төсөв', 'Budget', '预算')}: <strong>{budgetTiers.find((b) => b.id === activeBudgetTier)?.label}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ minBudget: undefined, maxBudget: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.fundName && filters.fundName !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Санхүүжилт', 'Fund', '资金')}: <strong>{filters.fundName}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ fundName: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.ruleName && filters.ruleName !== 'all' && (
            <span className={chipClass}>
              <span>
                {tr('Арга', 'Method', '方式')}: <strong>{filters.ruleName}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ ruleName: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {(filters.dateFrom || filters.dateTo) && (
            <span className={chipClass}>
              <span>
                {tr('Огноо', 'Date', '日期')}: <strong>{filters.dateFrom || '...'} ~ {filters.dateTo || '...'}</strong>
              </span>
              <button
                type="button"
                onClick={() => onFilterChange({ dateFrom: undefined, dateTo: undefined, page: 1 })}
                className="hover:text-slate-950 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetAll}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{tr('Цэвэрлэх', 'Reset all', '清空筛选')}</span>
          </button>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {isAdvancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-zinc-800 overflow-hidden text-slate-900 dark:text-zinc-100">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold">
                  {tr('Нарийвчилсан шүүлтүүр', 'Advanced Filters', '高级筛选条件')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {tr('Санхүүжилтийн эх үүсвэр', 'Funding Source', '资金来源')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {fundSources.map((f) => {
                    const selected = (filters.fundName || 'all') === f.id || (!filters.fundName && f.id === 'all');
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onFilterChange({ fundName: f.id === 'all' ? undefined : f.id, page: 1 })}
                        className={`p-2 rounded-md text-left border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white font-semibold'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {tr('Худалдан авах арга', 'Procurement Method', '采购方式')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {procurementRules.map((r) => {
                    const selected = (filters.ruleName || 'all') === r.id || (!filters.ruleName && r.id === 'all');
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onFilterChange({ ruleName: r.id === 'all' ? undefined : r.id, page: 1 })}
                        className={`p-2 rounded-md text-left border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white font-semibold'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {tr('Зарласан огнооны интервал', 'Published Date Range', '发布日期范围')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined, page: 1 })}
                    className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-xs text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-400">—</span>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined, page: 1 })}
                    className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                  {tr('Төсөвт өртгийн дүн (₮)', 'Custom Budget Range (MNT)', '自定义预算区间 (₮)')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={tr('Доод дүн', 'Min', '最低预算')}
                    value={filters.minBudget !== undefined ? filters.minBudget : ''}
                    onChange={(e) => onFilterChange({ minBudget: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                    className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-xs text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-400">—</span>
                  <input
                    type="number"
                    placeholder={tr('Дээд дүн', 'Max', '最高预算')}
                    value={filters.maxBudget !== undefined ? filters.maxBudget : ''}
                    onChange={(e) => onFilterChange({ maxBudget: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                    className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onFilterChange({
                    fundName: undefined,
                    ruleName: undefined,
                    dateFrom: undefined,
                    dateTo: undefined,
                    minBudget: undefined,
                    maxBudget: undefined,
                    page: 1,
                  });
                }}
                className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {tr('Бүгдийг арилгах', 'Clear all', '清空条件')}
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold rounded-md text-xs transition-colors cursor-pointer"
              >
                {tr(`Хэрэглэх (${activeAdvancedCount})`, `Apply (${activeAdvancedCount})`, `应用 (${activeAdvancedCount})`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

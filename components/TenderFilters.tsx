'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Locale, TenderFilterParams, ActiveTabMode, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { INDUSTRIES } from '@/lib/taxonomy';
import { 
  Search, X, Table as TableIcon, LayoutGrid, ArrowUpDown, 
  Clock, Star, Calendar, Award, Database, Filter, 
  SlidersHorizontal, RotateCcw, Building2, ChevronDown, 
  Check, Sparkles, ShieldCheck, Package, Briefcase, Layers
} from 'lucide-react';

interface TenderFiltersProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  totalFound: number;
  watchlistCount?: number;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  stats?: TenderStats;
}

export const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
  watchlistCount = 0,
  viewMode,
  setViewMode,
  stats,
}) => {
  const t = getTranslation(locale);

  // Search input state with debouncing
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync internal search input when external filters change
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Click outside to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({ search: val.trim() ? val : undefined, page: 1 });
    }, 300);
  };

  const handleApplySuggestion = (text: string) => {
    setSearchTerm(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    onFilterChange({ search: text, page: 1 });
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    onFilterChange({ search: undefined, page: 1 });
  };

  const categories = [
    { id: 'all', label: locale === 'mn' ? 'Бүх төрөл' : 'All Types', icon: <Layers className="h-3.5 w-3.5" /> },
    { id: 'PRODUCT', label: locale === 'mn' ? 'Бараа' : 'Goods', icon: <Package className="h-3.5 w-3.5" /> },
    { id: 'JOB', label: locale === 'mn' ? 'Ажил' : 'Works', icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: 'SERVICE', label: locale === 'mn' ? 'Үйлчилгээ' : 'Services', icon: <Briefcase className="h-3.5 w-3.5" /> },
  ];

  const statuses = [
    { id: 'all', label: locale === 'mn' ? 'Бүх төлөв' : 'All Statuses' },
    { id: 'receiving', label: locale === 'mn' ? 'Санал авч буй' : 'Receiving' },
    { id: 'result', label: locale === 'mn' ? 'Үр дүн гарсан' : 'Awarded' },
    { id: 'opened', label: locale === 'mn' ? 'Нээгдсэн' : 'Opened' },
    { id: 'cancelled', label: locale === 'mn' ? 'Хүчингүй' : 'Cancelled' },
  ];

  const budgetTiers = [
    { id: 'all', label: t.budgetRanges.all, min: undefined, max: undefined },
    { id: 'under50m', label: t.budgetRanges.under50m, min: 0, max: 50_000_000 },
    { id: 'from50to500m', label: t.budgetRanges.from50to500m, min: 50_000_000, max: 500_000_000 },
    { id: 'from500mto2b', label: t.budgetRanges.from500mto2b, min: 500_000_000, max: 2_000_000_000 },
    { id: 'above2b', label: t.budgetRanges.above2b, min: 2_000_000_000, max: undefined },
  ];

  const fundSources = [
    { id: 'all', label: locale === 'mn' ? 'Бүх санхүүжилт' : 'All Funds' },
    { id: 'Улсын төсөв', label: locale === 'mn' ? 'Улсын төсөв' : 'State Budget' },
    { id: 'Орон нутгийн төсөв', label: locale === 'mn' ? 'Орон нутгийн төсөв' : 'Local Budget' },
    { id: 'Өөрийн хөрөнгө', label: locale === 'mn' ? 'Өөрийн хөрөнгө' : 'Own Capital' },
    { id: 'Гадаадын зээл', label: locale === 'mn' ? 'Гадаадын зээл, тусламж' : 'Foreign Loan/Grant' },
  ];

  const procurementRules = [
    { id: 'all', label: locale === 'mn' ? 'Бүх арга' : 'All Methods' },
    { id: 'Нээлттэй', label: locale === 'mn' ? 'Нээлттэй тендер' : 'Open Bidding' },
    { id: 'Харьцуулалт', label: locale === 'mn' ? 'Харьцуулалтын арга' : 'Comparison' },
    { id: 'Зөвлөх', label: locale === 'mn' ? 'Зөвлөх үйлчилгээ' : 'Consulting' },
    { id: 'Шууд', label: locale === 'mn' ? 'Шууд худалдан авалт' : 'Direct' },
  ];

  const popularSuggestions = [
    { label: 'Эрдэнэт үйлдвэр ТӨҮГ', query: 'Эрдэнэт үйлдвэр' },
    { label: 'Эрдэнэс тавантолгой ХК', query: 'Эрдэнэс тавантолгой' },
    { label: 'Эм, эмнэлгийн тоног төхөөрөмж', query: 'эмнэлэг' },
    { label: 'Компьютер, мэдээллийн технологи', query: 'компьютер' },
    { label: 'Сургууль, цэцэрлэгийн засвар', query: 'сургууль цэцэрлэг' },
    { label: 'Зам, дэд бүтцийн ажил', query: 'зам барилга' },
    { label: 'Шатахуун, түлш нийлүүлэх', query: 'шатахуун' },
    { label: 'Улаанбаатар хотын захиргаа', query: 'Улаанбаатар' },
  ];

  const currentTab: ActiveTabMode = filters.tabMode || 'all';
  const currentCategory = filters.category || 'all';
  const currentStatus = filters.status || 'all';

  const getActiveBudgetTier = () => {
    if (filters.minBudget === 0 && filters.maxBudget === 50_000_000) return 'under50m';
    if (filters.minBudget === 50_000_000 && filters.maxBudget === 500_000_000) return 'from50to500m';
    if (filters.minBudget === 500_000_000 && filters.maxBudget === 2_000_000_000) return 'from500mto2b';
    if (filters.minBudget === 2_000_000_000 && filters.maxBudget === undefined) return 'above2b';
    return 'all';
  };

  const activeBudgetTier = getActiveBudgetTier();

  // Active advanced filters counter
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
      onFilterChange({ tabMode: 'closing_soon', status: 'receiving', urgency: 'urgent_3d', sortBy: 'deadline_asc', page: 1 });
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
    setSearchTerm('');
    onFilterChange({
      search: undefined,
      category: 'all',
      status: 'all',
      tabMode: 'all',
      urgency: 'all',
      minBudget: undefined,
      maxBudget: undefined,
      year: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      fundName: undefined,
      ruleName: undefined,
      positionName: undefined,
      sortBy: 'date_desc',
      page: 1,
    });
  };

  // Dynamic Tab Metrics
  const activeIndustryInfo = filters.industry && filters.industry !== 'all' 
    ? INDUSTRIES.find((i) => i.id === filters.industry) 
    : null;
  const activeIndustryStats = filters.industry && filters.industry !== 'all' 
    ? stats?.statsByIndustry?.[filters.industry] 
    : null;

  const hasSubFilters = Boolean(
    filters.search || 
    (filters.category && filters.category !== 'all') || 
    (filters.year && filters.year !== 'all') || 
    activeBudgetTier !== 'all' || 
    Boolean(filters.fundName && filters.fundName !== 'all') || 
    Boolean(filters.ruleName && filters.ruleName !== 'all') || 
    Boolean(filters.dateFrom || filters.dateTo)
  );

  const tabMetrics = useMemo(() => {
    if (hasSubFilters) {
      const allCount = totalFound;
      const activeCount = filters.status === 'receiving' || filters.tabMode === 'active' 
        ? totalFound 
        : Math.min(totalFound, stats?.activeTendersCount || totalFound);
      const resultCount = filters.status === 'result' || filters.tabMode === 'result'
        ? totalFound
        : Math.max(0, totalFound - activeCount);
      const closingCount = Math.max(0, Math.min(activeCount, Math.round(activeCount * 0.2)));

      return {
        all: allCount,
        active: activeCount,
        result: resultCount,
        closing: closingCount,
      };
    }

    if (activeIndustryInfo || activeIndustryStats) {
      const total = activeIndustryStats?.totalCount || activeIndustryInfo?.totalCount || 3120;
      const active = activeIndustryStats?.activeCount || (stats?.industryCounts ? stats.industryCounts[filters.industry!] : undefined) || activeIndustryInfo?.activeCount || 28;
      const result = activeIndustryStats?.resultCount || Math.max(0, total - active);
      const closing = activeIndustryStats?.closingSoonCount || Math.max(1, Math.round(active * 0.15));
      return {
        all: total,
        active,
        result,
        closing,
      };
    }

    return {
      all: stats?.totalCount || totalFound || 22785,
      active: stats?.activeTendersCount || 301,
      result: stats?.resultCount || 21320,
      closing: stats?.closingSoonCount || 42,
    };
  }, [hasSubFilters, filters.industry, filters.status, filters.tabMode, activeIndustryInfo, activeIndustryStats, stats, totalFound]);

  const hasActiveFilters = 
    Boolean(filters.search) || 
    (filters.category && filters.category !== 'all') || 
    (filters.status && filters.status !== 'all') || 
    (filters.year && filters.year !== 'all') || 
    activeBudgetTier !== 'all' || 
    Boolean(filters.fundName && filters.fundName !== 'all') || 
    Boolean(filters.ruleName && filters.ruleName !== 'all') || 
    Boolean(filters.dateFrom || filters.dateTo);

  return (
    <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      {/* 1. Primary Workflow Tabs with Integrated Live Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto -mx-1 px-1">
          {/* 1. Active Live Tab */}
          <button
            onClick={() => handleTabSelect('active')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'active'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{locale === 'mn' ? 'Санал авч буй' : 'Live Bids'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums font-mono ml-0.5 ${
              currentTab === 'active' ? 'bg-slate-800 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}>
              {tabMetrics.active.toLocaleString()}
            </span>
          </button>

          {/* 2. Closing Soon Tab */}
          <button
            onClick={() => handleTabSelect('closing_soon')}
            className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'closing_soon'
                ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>{locale === 'mn' ? 'Хаагдах дөхсөн' : 'Closing Soon'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums font-mono ml-0.5 ${
              currentTab === 'closing_soon' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {tabMetrics.closing.toLocaleString()}
            </span>
          </button>

          {/* 3. No Bid Bond Required Tab */}
          <button
            onClick={() => handleTabSelect('no_guarantee')}
            className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'no_guarantee'
                ? 'bg-teal-700 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>{locale === 'mn' ? 'Баталгаа шаардахгүй' : 'No Bid Bond'}</span>
          </button>

          {/* 4. Awarded / Concluded Winners Tab */}
          <button
            onClick={() => handleTabSelect('result')}
            className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'result'
                ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>{locale === 'mn' ? 'Шалгарсан / Үр дүн' : 'Awarded'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums font-mono ml-0.5 ${
              currentTab === 'result' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {tabMetrics.result.toLocaleString()}
            </span>
          </button>

          {/* 5. All History / Archive Tab */}
          <button
            onClick={() => handleTabSelect('all')}
            className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{locale === 'mn' ? 'Бүх түүхэн сан' : 'All Tenders'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums font-mono ml-0.5 ${
              currentTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {tabMetrics.all.toLocaleString()}
            </span>
          </button>

          {/* 6. Watchlist Tab */}
          <button
            onClick={() => handleTabSelect('watchlist')}
            className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'watchlist'
                ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${currentTab === 'watchlist' ? 'fill-white' : 'text-amber-500'}`} />
            <span>{locale === 'mn' ? 'Миний хянаж буй' : 'Watchlist'}</span>
            {watchlistCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] bg-white/25 font-bold tabular-nums font-mono">
                {watchlistCount}
              </span>
            )}
          </button>
        </div>

        {/* View Mode Toggle: Table / Grid */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
          <span className="text-[11px] text-slate-500 font-medium sm:hidden">
            Илэрц: <strong className="text-slate-900 font-mono tabular-nums">{totalFound.toLocaleString()}</strong>
          </span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8 shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 h-7 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={locale === 'mn' ? 'Хүснэгтээр харах' : 'Table view'}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale === 'mn' ? 'Хүснэгт' : 'Table'}</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 h-7 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={locale === 'mn' ? 'Картаар харах' : 'Grid view'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale === 'mn' ? 'Карт' : 'Cards'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Intelligent Search Bar with Auto-Suggestions */}
      <div className="relative" ref={suggestionsRef}>
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={
              currentTab === 'result'
                ? (locale === 'mn' ? 'Шалгарсан тендер, байгууллага, компани хайх (жишээ: Эрдэнэт, компьютер)...' : 'Search awarded bids, companies, prices...')
                : currentTab === 'active'
                ? (locale === 'mn' ? 'Идэвхтэй тендерээс хайх (жишээ: зам засвар, сургууль, шатахуун)...' : 'Search open active tenders...')
                : (locale === 'mn' ? 'Бүх 22,000+ тендерийн сангаас хайх (нэр, байгууллага, салбар, код)...' : 'Search all historical tenders...')
            }
            className="w-full pl-10 pr-20 py-2.5 bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white focus:outline-none rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all shadow-2xs"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Цэвэрлэх"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsAdvancedModalOpen(true)}
              className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeAdvancedCount > 0
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Нарийвчилсан шүүлтүүр"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Шүүлтүүр</span>
              {activeAdvancedCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Suggestions Popover Dropdown */}
        {showSuggestions && !searchTerm && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-xl border border-slate-200 shadow-xl p-3 animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-600" />
              <span>Түгээмэл хайлтууд & Сэдвүүд</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {popularSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplySuggestion(item.query)}
                  className="p-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{item.label}</span>
                  <Search className="h-3 w-3 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Filter Controls: Category Chips + Status & Sort */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
        {/* Row A: Category Filter + Status & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-slate-400 mr-0.5 whitespace-nowrap shrink-0">
              {locale === 'mn' ? 'Төрөл:' : 'Type:'}
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.id, page: 1 })}
                className={`h-7 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  currentCategory === cat.id
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Status & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 h-7 text-xs text-slate-700 shrink-0 shadow-2xs">
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
                className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                {statuses.map((st) => (
                  <option key={st.id} value={st.id}>{st.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 h-7 text-xs text-slate-700 shrink-0 shadow-2xs">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={filters.sortBy || (currentTab === 'closing_soon' ? 'deadline_asc' : 'date_desc')}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
                className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                <option value="date_desc">{locale === 'mn' ? 'Шинээр зарлагдсанаар' : 'Newest First'}</option>
                <option value="deadline_asc">{locale === 'mn' ? 'Хугацаа ойртсоноор' : 'Ending Soonest'}</option>
                <option value="budget_desc">{t.sortOptions.budget_desc}</option>
                <option value="budget_asc">{t.sortOptions.budget_asc}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row B: Budget Tiers + Clean Year Select & Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
          {/* Budget Tiers */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-slate-400 mr-0.5 whitespace-nowrap shrink-0">
              {locale === 'mn' ? 'Төсөв:' : 'Budget:'}
            </span>
            {budgetTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => onFilterChange({ minBudget: tier.min, maxBudget: tier.max, page: 1 })}
                className={`h-7 px-2.5 rounded-lg text-[11px] whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  activeBudgetTier === tier.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Year & Date Range Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 h-7 text-xs text-slate-700 shrink-0 shadow-2xs">
              <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
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
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">{locale === 'mn' ? 'Бүх он' : 'All Years'}</option>
                <option value="2026">2026 он</option>
                <option value="2025">2025 он</option>
                <option value="2024">2024 он</option>
                <option value="2023">2023 он</option>
                <option value="2022">2022 он</option>
                <option value="2021">2021 он</option>
                <option value="2020">2020 он</option>
                <option value="2019">2019 он</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            <div className="flex items-center gap-1 text-[11px] shrink-0">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onFilterChange({
                  dateFrom: e.target.value || undefined,
                  ...(filters.status === 'receiving' ? { status: 'all', tabMode: 'all' } : {}),
                  page: 1,
                })}
                className="h-7 px-1.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-800 shadow-2xs"
                title="Эхлэх огноо"
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
                className="h-7 px-1.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-800 shadow-2xs"
                title="Дуусах огноо"
              />
              {(filters.dateFrom || filters.dateTo || (filters.year && filters.year !== 'all')) && (
                <button
                  onClick={() => onFilterChange({ year: undefined, dateFrom: undefined, dateTo: undefined, page: 1 })}
                  className="h-7 px-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Огноо цэвэрлэх"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Filters Dismissible Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Идэвхтэй:</span>

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80">
              <span>Хайлт: <strong>"{filters.search}"</strong></span>
              <button onClick={handleClearSearch} className="hover:text-blue-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.category && filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Төрөл: <strong>{categories.find(c => c.id === filters.category)?.label}</strong></span>
              <button onClick={() => onFilterChange({ category: 'all', page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.status && filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Төлөв: <strong>{statuses.find(s => s.id === filters.status)?.label}</strong></span>
              <button onClick={() => onFilterChange({ status: 'all', tabMode: 'all', page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.year && filters.year !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Он: <strong>{filters.year}</strong></span>
              <button onClick={() => onFilterChange({ year: undefined, page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {activeBudgetTier !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Төсөв: <strong>{budgetTiers.find(b => b.id === activeBudgetTier)?.label}</strong></span>
              <button onClick={() => onFilterChange({ minBudget: undefined, maxBudget: undefined, page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.fundName && filters.fundName !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Санхүүжилт: <strong>{filters.fundName}</strong></span>
              <button onClick={() => onFilterChange({ fundName: undefined, page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.ruleName && filters.ruleName !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              <span>Арга: <strong>{filters.ruleName}</strong></span>
              <button onClick={() => onFilterChange({ ruleName: undefined, page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetAll}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Шүүлтүүр цэвэрлэх</span>
          </button>
        </div>
      )}

      {/* 5. Advanced Filter Slide-Over Modal */}
      {isAdvancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Нарийвчилсан шүүлтүүр</h3>
              </div>
              <button
                onClick={() => setIsAdvancedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Fund Source */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Санхүүжилтийн эх үүсвэр
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {fundSources.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onFilterChange({ fundName: f.id === 'all' ? undefined : f.id, page: 1 })}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        (filters.fundName || 'all') === f.id || (!filters.fundName && f.id === 'all')
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Procurement Rule */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Худалдан авах ажиллагааны арга
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {procurementRules.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onFilterChange({ ruleName: r.id === 'all' ? undefined : r.id, page: 1 })}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        (filters.ruleName || 'all') === r.id || (!filters.ruleName && r.id === 'all')
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Budget Range */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Төсөвт өртгийн интервал (₮)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Доод дүн"
                    value={filters.minBudget !== undefined ? filters.minBudget : ''}
                    onChange={(e) => onFilterChange({ minBudget: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                    className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Дээд дүн"
                    value={filters.maxBudget !== undefined ? filters.maxBudget : ''}
                    onChange={(e) => onFilterChange({ maxBudget: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                    className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <button
                onClick={() => {
                  onFilterChange({
                    fundName: undefined,
                    ruleName: undefined,
                    positionName: undefined,
                    minBudget: undefined,
                    maxBudget: undefined,
                    dateFrom: undefined,
                    dateTo: undefined,
                    page: 1,
                  });
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Бүгдийг арилгах
              </button>
              <button
                onClick={() => setIsAdvancedModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs cursor-pointer"
              >
                Шүүлтүүр хэрэгжүүлэх ({totalFound.toLocaleString()} илэрц)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

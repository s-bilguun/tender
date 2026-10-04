'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Locale, TenderFilterParams, ActiveTabMode, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { INDUSTRIES } from '@/lib/taxonomy';
import { IndustryIcon } from '@/components/IndustryIcon';
import { TOP_COMPANIES, COMPANIES_BY_INDUSTRY, CompanyEntity } from '@/components/CompanyDiscoveryBar';
import { 
  Search, X, Table as TableIcon, LayoutGrid, ArrowUpDown, 
  Flame, Star, Calendar, Trophy, Database, 
  SlidersHorizontal, RotateCcw, ShieldCheck, Sparkles,
  FileSpreadsheet, Layers, Building2, ChevronDown, ChevronLeft, ChevronRight
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
  onExportCSV?: () => void;
}

const SHORT_INDUSTRY_NAMES: Record<string, string> = {
  mining: 'Уул уурхай',
  construction: 'Барилга, дэд бүтэц',
  medical: 'Эрүүл мэнд, эм',
  food: 'Хүнс, хоол',
  it: 'Мэдээллийн технологи',
  transport: 'Тээвэр, шатахуун',
  facility: 'Харуул, цэвэрлэгээ',
  stationery: 'Бичиг хэрэг, тавилга',
  consulting: 'Зөвлөх, аудит',
};

const SHORT_INDUSTRY_NAMES_ZH: Record<string, string> = {
  mining: '矿业重工',
  construction: '建筑基建',
  medical: '医疗器械',
  food: '食品餐饮',
  it: '信息技术',
  transport: '交通燃油',
  facility: '物业安保',
  stationery: '办公家具',
  consulting: '咨询审计',
};

export const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
  watchlistCount = 0,
  viewMode,
  setViewMode,
  stats,
  onExportCSV,
}) => {
  const t = getTranslation(locale);

  // Search input state with debouncing
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sector Horizontal Scroll Ref & State
  const sectorScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Company Horizontal Scroll Ref & State
  const companyScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollCompanyLeft, setCanScrollCompanyLeft] = useState(false);
  const [canScrollCompanyRight, setCanScrollCompanyRight] = useState(true);

  const checkSectorScroll = () => {
    if (sectorScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sectorScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const checkCompanyScroll = () => {
    if (companyScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = companyScrollRef.current;
      setCanScrollCompanyLeft(scrollLeft > 4);
      setCanScrollCompanyRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkSectorScroll();
    checkCompanyScroll();
    window.addEventListener('resize', checkSectorScroll);
    window.addEventListener('resize', checkCompanyScroll);
    return () => {
      window.removeEventListener('resize', checkSectorScroll);
      window.removeEventListener('resize', checkCompanyScroll);
    };
  }, []);

  const handleScrollSector = (direction: 'left' | 'right') => {
    if (sectorScrollRef.current) {
      const delta = direction === 'left' ? -240 : 240;
      sectorScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(checkSectorScroll, 250);
    }
  };

  const handleScrollCompany = (direction: 'left' | 'right') => {
    if (companyScrollRef.current) {
      const delta = direction === 'left' ? -220 : 220;
      companyScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(checkCompanyScroll, 250);
    }
  };

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

  const chinaEligibilityOptions = [
    { 
      id: 'all', 
      label: locale === 'mn' ? 'Бүх тендер' : locale === 'zh' ? '全部项目' : 'All Tenders', 
      activeClass: 'bg-slate-900 text-white font-semibold shadow-2xs',
      title: locale === 'mn' ? 'Бүх тендерийг харах' : locale === 'zh' ? '查看全部招标项目' : 'View all tenders'
    },
    { 
      id: 'direct', 
      label: locale === 'mn' ? 'Шууд оролцох (Direct)' : locale === 'zh' ? '🇨🇳 独立投标 (Direct)' : 'Direct Allowed', 
      activeClass: 'bg-emerald-600 text-white font-semibold shadow-2xs',
      title: locale === 'mn' 
        ? 'Монголд охин компани байгуулалгүй шууд санал өгөх боломжтой (Бараа нийлүүлэлт, олон улсын нээлттэй тендер)' 
        : locale === 'zh'
        ? '中企可直接以中国法人资质投标，无须在蒙设立子公司（物资设备采购与国际标）'
        : 'Foreign companies can bid directly without a Mongolian entity (Goods & International Bidding)'
    },
    { 
      id: 'joint_venture', 
      label: locale === 'mn' ? 'Түншлэл шаардлагатай (JV)' : locale === 'zh' ? '🤝 需联合体 (JV)' : 'JV Required', 
      activeClass: 'bg-amber-600 text-white font-semibold shadow-2xs',
      title: locale === 'mn' 
        ? 'Монголын тусгай зөвшөөрөлтэй компанитай Түншлэл (联合体) байгуулах шаардлагатай (Барилга, зам, их засвар)' 
        : locale === 'zh'
        ? '须与蒙古国持证企业组成联合体投标（工程施工、特种资质准入）'
        : 'Must form a Joint Venture with a licensed Mongolian company (Works & Construction)'
    },
    { 
      id: 'domestic_only', 
      label: locale === 'mn' ? 'Зөвхөн дотоодын' : locale === 'zh' ? '🇲🇳 仅限本土 (Domestic)' : 'Domestic Only', 
      activeClass: 'bg-slate-700 text-white font-semibold shadow-2xs',
      title: locale === 'mn' 
        ? 'Зөвхөн Монгол Улсад бүртгэлтэй дотоодын ААН оролцох боломжтой (Бага төсөвтэй харьцуулалт)' 
        : locale === 'zh'
        ? '仅限蒙古国本土注册纳税实体（小型比价与本地专属项目）'
        : 'Restricted to domestic Mongolian registered entities'
    },
  ];

  const currentTab: ActiveTabMode = filters.tabMode || 'active';
  const currentCategory = filters.category || 'all';
  const currentIndustry = filters.industry || 'all';

  // Current Sector-Connected Top Companies
  const currentCompanies: CompanyEntity[] = COMPANIES_BY_INDUSTRY[currentIndustry] || TOP_COMPANIES;
  const currentSearch = (filters.search || '').trim().toLowerCase();

  const activeCompany = currentCompanies.find(
    (c) =>
      currentSearch === c.query.toLowerCase() ||
      (currentSearch && c.query.toLowerCase().includes(currentSearch)) ||
      (currentSearch && currentSearch.includes(c.shortName.toLowerCase()))
  );

  const handleSelectCompany = (comp: CompanyEntity) => {
    if (activeCompany?.id === comp.id) {
      // Toggle off
      onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 });
    } else {
      onFilterChange({ search: comp.query, sortBy: 'date_desc', page: 1 });
    }
  };

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
    setSearchTerm('');
    onFilterChange({
      search: undefined,
      category: 'all',
      industry: 'all',
      status: 'receiving',
      tabMode: 'active',
      urgency: 'all',
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

  // Dynamic Tab Metrics: Sector & Company-aware metrics calculation
  const activeIndustryInfo = currentIndustry !== 'all' 
    ? INDUSTRIES.find((i) => i.id === currentIndustry) 
    : null;
  const activeIndustryStats = currentIndustry !== 'all' 
    ? stats?.statsByIndustry?.[currentIndustry] 
    : null;

  const hasSubFilters = Boolean(
    filters.search || 
    (filters.category && filters.category !== 'all') || 
    (filters.year && filters.year !== 'all') || 
    activeBudgetTier !== 'all' || 
    Boolean(filters.fundName && filters.fundName !== 'all') || 
    Boolean(filters.ruleName && filters.ruleName !== 'all') || 
    Boolean(filters.chinaEligibility && filters.chinaEligibility !== 'all') || 
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
      const active = activeIndustryStats?.activeCount || (stats?.industryCounts ? stats.industryCounts[currentIndustry] : undefined) || activeIndustryInfo?.activeCount || 28;
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
      active: stats?.activeTendersCount || 736,
      result: stats?.resultCount || 21320,
      closing: stats?.closingSoonCount || 42,
    };
  }, [hasSubFilters, currentIndustry, filters.status, filters.tabMode, activeIndustryInfo, activeIndustryStats, stats, totalFound]);

  // Meaningful active filter tags (excludes default active tab)
  const isCustomFiltered = 
    Boolean(filters.search) || 
    (filters.category && filters.category !== 'all') || 
    (currentIndustry !== 'all') ||
    (filters.year && filters.year !== 'all') || 
    activeBudgetTier !== 'all' || 
    Boolean(filters.fundName && filters.fundName !== 'all') || 
    Boolean(filters.ruleName && filters.ruleName !== 'all') || 
    Boolean(filters.chinaEligibility && filters.chinaEligibility !== 'all') || 
    Boolean(filters.dateFrom || filters.dateTo) ||
    activeAdvancedCount > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
      {/* 1. Primary Workflow Status Tabs & Utility Controls */}
      <div className="px-3 sm:px-4 pt-3 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {/* Active Live Tab */}
          <button
            onClick={() => handleTabSelect('active')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'active'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{locale === 'mn' ? 'Санал авч буй' : locale === 'zh' ? '正在招投标' : 'Live Bids'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ml-0.5 ${
              currentTab === 'active' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {tabMetrics.active.toLocaleString()}
            </span>
          </button>

          {/* Closing Soon Tab */}
          <button
            onClick={() => handleTabSelect('closing_soon')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'closing_soon'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>{locale === 'mn' ? 'Хаагдах дөхсөн' : locale === 'zh' ? '即将截标' : 'Closing Soon'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ml-0.5 ${
              currentTab === 'closing_soon' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {tabMetrics.closing.toLocaleString()}
            </span>
          </button>

          {/* No Bid Security Tab */}
          <button
            onClick={() => handleTabSelect('no_guarantee')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'no_guarantee'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
            <span>{locale === 'mn' ? 'Баталгаа шаардахгүй' : locale === 'zh' ? '免投标保函' : 'No Bid Bond'}</span>
          </button>

          {/* Awarded / Concluded Winners Tab */}
          <button
            onClick={() => handleTabSelect('result')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'result'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            <span>{locale === 'mn' ? 'Шалгарсан / Үр дүн' : locale === 'zh' ? '已定标 / 中标结果' : 'Awarded'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ml-0.5 ${
              currentTab === 'result' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {tabMetrics.result.toLocaleString()}
            </span>
          </button>

          {/* All Historical Archive Tab */}
          <button
            onClick={() => handleTabSelect('all')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span>{locale === 'mn' ? 'Бүх сан' : locale === 'zh' ? '全部标段' : 'All Tenders'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ml-0.5 ${
              currentTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {tabMetrics.all.toLocaleString()}
            </span>
          </button>

          {/* Watchlist Tab */}
          <button
            onClick={() => handleTabSelect('watchlist')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
              currentTab === 'watchlist'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${currentTab === 'watchlist' ? 'fill-white' : 'text-amber-500'}`} />
            <span>{locale === 'mn' ? 'Миний хянаж буй' : locale === 'zh' ? '关注收藏' : 'Watchlist'}</span>
            {watchlistCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] bg-white/20 font-bold tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Tools: Export & View Mode */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title={locale === 'mn' ? 'Excel / CSV файлаар татах' : locale === 'zh' ? '导出 Excel / CSV 表格' : 'Export to CSV / Excel'}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden md:inline">{locale === 'mn' ? 'Excel / CSV' : locale === 'zh' ? '导出表格' : 'Export CSV'}</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200 h-8">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 h-7 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={locale === 'mn' ? 'Хүснэгт' : 'Table view'}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale === 'mn' ? 'Хүснэгт' : 'Table'}</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 h-7 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={locale === 'mn' ? 'Карт' : 'Grid view'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale === 'mn' ? 'Карт' : 'Cards'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filter Controls Toolbar Row */}
      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Category Segmented Controls */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200 h-9 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.id, page: 1 })}
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  currentCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Controls: Budget, Year, Sort & Advanced Filters */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 justify-between lg:justify-end">
            {/* Budget Tier Selector Dropdown */}
            <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2.5 h-9 text-xs text-slate-700 shadow-2xs hover:border-slate-300">
              <span className="text-[11px] text-slate-400 font-medium mr-1">{locale === 'mn' ? 'Төсөв:' : 'Budget:'}</span>
              <select
                value={activeBudgetTier}
                onChange={(e) => {
                  const tierId = e.target.value;
                  const selected = budgetTiers.find((b) => b.id === tierId);
                  onFilterChange({ minBudget: selected?.min, maxBudget: selected?.max, page: 1 });
                }}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {budgetTiers.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Year Selector */}
            <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2.5 h-9 text-xs text-slate-700 shadow-2xs hover:border-slate-300">
              <Calendar className="h-3.5 w-3.5 text-blue-600 mr-1 shrink-0" />
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
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
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
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2.5 h-9 text-xs text-slate-700 shadow-2xs hover:border-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
              <select
                value={filters.sortBy || (currentTab === 'closing_soon' ? 'deadline_asc' : 'date_desc')}
                onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                <option value="date_desc">{locale === 'mn' ? 'Шинээр зарлагдсанаар' : 'Newest'}</option>
                <option value="deadline_asc">{locale === 'mn' ? 'Хугацаа ойртсоноор' : 'Ending Soon'}</option>
                <option value="budget_desc">{t.sortOptions.budget_desc}</option>
                <option value="budget_asc">{t.sortOptions.budget_asc}</option>
              </select>
              <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            {/* Advanced Filters Button */}
            <button
              onClick={() => setIsAdvancedModalOpen(true)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                activeAdvancedCount > 0
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
              title="Нарийвчилсан шүүлтүүр"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{locale === 'mn' ? 'Шүүлтүүр' : locale === 'zh' ? '高级筛选' : 'Filters'}</span>
              {activeAdvancedCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-white text-blue-700 text-[10px] font-bold flex items-center justify-center">
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 5. Active Filters Dismissible Chips (ONLY when non-default custom filters applied) */}
        {isCustomFiltered && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-[11px] animate-in fade-in duration-150">
            <span className="text-slate-400 font-semibold mr-1">
              {locale === 'mn' ? 'Идэвхтэй:' : locale === 'zh' ? '已选条件:' : 'Active:'}
            </span>

            {filters.chinaEligibility && filters.chinaEligibility !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                locale === 'zh'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                <span>
                  {locale === 'mn' ? 'Гадаад ААН:' : locale === 'zh' ? '🇨🇳 资格筛选:' : 'Eligibility:'}{' '}
                  <strong>{chinaEligibilityOptions.find(o => o.id === filters.chinaEligibility)?.label}</strong>
                </span>
                <button onClick={() => onFilterChange({ chinaEligibility: 'all', page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                <span>Хайлт / Захиалагч: <strong>"{filters.search}"</strong></span>
                <button onClick={handleClearSearch} className="hover:text-blue-950 p-0.5 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {currentIndustry !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                <span>Салбар: <strong>{INDUSTRIES.find(i => i.id === currentIndustry)?.labelMn}</strong></span>
                <button onClick={() => onFilterChange({ industry: 'all', page: 1 })} className="hover:text-blue-950 p-0.5 cursor-pointer">
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

            {(filters.dateFrom || filters.dateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                <span>Огноо: <strong>{filters.dateFrom || '...'} ~ {filters.dateTo || '...'}</strong></span>
                <button onClick={() => onFilterChange({ dateFrom: undefined, dateTo: undefined, page: 1 })} className="hover:text-slate-950 p-0.5 cursor-pointer">
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
      </div>

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
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
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

              {/* Custom Date Range */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Хугацааны интервал
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => onFilterChange({
                      dateFrom: e.target.value || undefined,
                      page: 1,
                    })}
                    className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    title="Эхлэх огноо"
                  />
                  <span>-</span>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => onFilterChange({
                      dateTo: e.target.value || undefined,
                      page: 1,
                    })}
                    className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    title="Дуусах огноо"
                  />
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
                    dateFrom: undefined,
                    dateTo: undefined,
                    minBudget: undefined,
                    maxBudget: undefined,
                    page: 1,
                  });
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Бүгдийг арилгах
              </button>
              <button
                onClick={() => setIsAdvancedModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Хэрэглэх ({activeAdvancedCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

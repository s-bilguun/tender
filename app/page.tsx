'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Header } from '@/components/Header';
import { DashboardKPICards } from '@/components/DashboardKPICards';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { DiscoveryCardsHub } from '@/components/DiscoveryCardsHub';
import { TenderTable } from '@/components/TenderTable';
import { TenderRow } from '@/components/TenderRow';
import { TenderFilters } from '@/components/TenderFilters';
import { TenderDocAuditModal } from '@/components/TenderDocAuditModal';
import { TenderFinanceModal } from '@/components/TenderFinanceModal';
import { ChinaSupplierModal } from '@/components/ChinaSupplierModal';
import { PricingSubscriptionModal } from '@/components/PricingSubscriptionModal';
import { EmptyState } from '@/components/EmptyState';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { TenderSkeleton } from '@/components/TenderSkeleton';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { exportTendersToCSV } from '@/lib/export';
import {
  ChevronLeft, ChevronRight, Sparkles, 
  Loader2, ArrowDown
} from 'lucide-react';

export default function Home() {
  const [locale, setLocaleState] = useState<Locale>('mn');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') as Locale | null;
      if (urlLang && ['mn', 'en', 'zh'].includes(urlLang)) {
        setLocaleState(urlLang);
        if (urlLang === 'zh') setCurrency('CNY');
        localStorage.setItem('tenderhub_locale', urlLang);
        return;
      }
      const savedLang = localStorage.getItem('tenderhub_locale') as Locale | null;
      if (savedLang && ['mn', 'en', 'zh'].includes(savedLang)) {
        setLocaleState(savedLang);
        if (savedLang === 'zh') setCurrency('CNY');
      }
    } catch {}
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (newLocale === 'zh') {
      setCurrency('CNY');
    }
    try {
      localStorage.setItem('tenderhub_locale', newLocale);
      const url = new URL(window.location.href);
      url.searchParams.set('lang', newLocale);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const t = getTranslation(locale);

  // Active section tracking for sidebar navigation
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Initial state populated with mock tenders for instant rich render
  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<TenderStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Search Input State (Synchronized between Header and Main Filter Center)
  const [searchInputValue, setSearchInputValue] = useState<string>('');


  // Multi-currency display (CNY, USD, MNT) for foreign & domestic suppliers
  const [currency, setCurrency] = useState<'CNY' | 'USD' | 'MNT'>('MNT');

  // Modals (ТББ Шалгагч AI, Баталгаа & Санхүүжилт, Tender2China)
  const [isDocAuditOpen, setIsDocAuditOpen] = useState<boolean>(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState<boolean>(false);
  const [isChinaSupplierOpen, setIsChinaSupplierOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [modalTenderContext, setModalTenderContext] = useState<TenderItem | null>(null);

  // Command Palette & Toasts
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Watchlist LocalStorage State
  const [savedIds, setSavedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tender_watchlist');
      if (stored) {
        setSavedIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn('Could not load watchlist from localStorage', e);
    }
  }, []);

  const handleToggleSave = (id: string | number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      const strId = String(id);
      const isRemoving = next.has(id) || next.has(strId);
      if (isRemoving) {
        next.delete(id);
        next.delete(strId);
        showToast({
          type: 'info',
          title: locale === 'mn' ? 'Хяналтаас хаслаа' : locale === 'zh' ? '已取消关注' : 'Removed from watchlist',
          description: locale === 'mn' ? 'Тендерийг таны хадгалсан жагсаалтаас хаслаа.' : locale === 'zh' ? '已从关注列表移除。' : 'Tender removed from your pinned watchlist.',
        });
      } else {
        next.add(id);
        showToast({
          type: 'success',
          title: locale === 'mn' ? 'Хяналтад хадгаллаа' : locale === 'zh' ? '已加入关注' : 'Saved to watchlist',
          description: locale === 'mn' ? 'Тендерийг "Миний хянаж буй" хэсэгт нэмлээ.' : locale === 'zh' ? '已加入“我的关注”。' : 'Tender pinned to your watchlist tab.',
        });
      }
      try {
        localStorage.setItem('tender_watchlist', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Default Filters
  const [filters, setFilters] = useState<TenderFilterParams>({
    search: '',
    category: 'all',
    industry: 'all',
    status: 'receiving',
    tabMode: 'active',
    urgency: 'all',
    page: 1,
    perPage: 15,
    sortBy: 'date_desc',
  });

  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState<boolean>(false);
  const [aiTenderContext, setAiTenderContext] = useState<TenderItem | null>(null);

  // Sync internal search input with filter
  useEffect(() => {
    setSearchInputValue(filters.search || '');
  }, [filters.search]);

  // Fetch tenders
  const loadTenders = useCallback(async (currentFilters: TenderFilterParams, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.category && currentFilters.category !== 'all') params.append('category', currentFilters.category);
      if (currentFilters.industry && currentFilters.industry !== 'all') params.append('industry', currentFilters.industry);
      if (currentFilters.minBudget !== undefined) params.append('minBudget', String(currentFilters.minBudget));
      if (currentFilters.maxBudget !== undefined) params.append('maxBudget', String(currentFilters.maxBudget));
      if (currentFilters.status && currentFilters.status !== 'all') params.append('status', currentFilters.status);
      if (currentFilters.tabMode) params.append('tabMode', currentFilters.tabMode);
      if (currentFilters.urgency && currentFilters.urgency !== 'all') params.append('urgency', currentFilters.urgency);
      if (currentFilters.sortBy) params.append('sortBy', currentFilters.sortBy);
      if (currentFilters.year && currentFilters.year !== 'all') params.append('year', currentFilters.year);
      if (currentFilters.dateFrom) params.append('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.append('dateTo', currentFilters.dateTo);
      if (currentFilters.fundName && currentFilters.fundName !== 'all') params.append('fundName', currentFilters.fundName);
      if (currentFilters.ruleName && currentFilters.ruleName !== 'all') params.append('ruleName', currentFilters.ruleName);
      if (currentFilters.positionName && currentFilters.positionName !== 'all') params.append('positionName', currentFilters.positionName);
      if (currentFilters.page) params.append('page', String(currentFilters.page));
      if (currentFilters.perPage) params.append('perPage', String(currentFilters.perPage));

      const res = await fetch(`/api/tenders?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.items && data.items.length > 0) {
        if (isLoadMore) {
          setTenders((prev) => {
            const existingIds = new Set(prev.map((p) => String(p.invitationId)));
            const newItems = data.items.filter((item: TenderItem) => !existingIds.has(String(item.invitationId)));
            return [...prev, ...newItems];
          });
        } else {
          setTenders(data.items);
        }
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages || 1);
      } else if (!isLoadMore && (!data.items || data.items.length === 0)) {
        setTenders([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Tender list could not be loaded:', err);
      if (!isLoadMore) {
        setTenders([]);
        setTotalCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Keep the list (filters, "load more" count, scroll) when the user opens a tender and comes back.
  const mainRef = useRef<HTMLElement | null>(null);
  const [listStateReady, setListStateReady] = useState(false);
  const pendingScrollRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('tenderhub_list_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.filters) {
          setFilters((prev) => ({ ...prev, ...parsed.filters }));
          if (parsed.filters.search) setSearchInputValue(parsed.filters.search);
        }
        if (typeof parsed?.scrollTop === 'number') pendingScrollRef.current = parsed.scrollTop;
      }
    } catch {}
    setListStateReady(true);
  }, []);

  useEffect(() => {
    if (!listStateReady) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem('tenderhub_list_state') || '{}');
      sessionStorage.setItem('tenderhub_list_state', JSON.stringify({ ...prev, filters }));
    } catch {}
  }, [filters, listStateReady]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const prev = JSON.parse(sessionStorage.getItem('tenderhub_list_state') || '{}');
          sessionStorage.setItem('tenderhub_list_state', JSON.stringify({ ...prev, scrollTop: el.scrollTop }));
        } catch {}
      }, 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (timer) clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!listStateReady) return;
    loadTenders(filters, false);
  }, [filters, loadTenders, listStateReady]);

  useEffect(() => {
    if (isLoading || pendingScrollRef.current == null || !mainRef.current) return;
    const top = pendingScrollRef.current;
    pendingScrollRef.current = null;
    // Restore after layout settles (cards, KPI strip and buyer table load at different times).
    [50, 400, 1000].forEach((ms) => setTimeout(() => { if (mainRef.current) mainRef.current.scrollTop = top; }, ms));
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        if (!cancelled && data.success && data.stats) {
          setStats(data.stats);
        }
      } catch {
        // fallback
      }
    };
    loadAnalytics();
    return () => { cancelled = true; };
  }, []);

  const handleFilterChange = (newFilters: Partial<TenderFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleGlobalSearchSubmit = () => {
    handleFilterChange({ search: searchInputValue.trim() ? searchInputValue.trim() : undefined, page: 1 });
  };

  const handleSelectSearchSuggestion = (query: string) => {
    if (query === '1000000000') {
      handleFilterChange({ minBudget: 1000000000, search: undefined, page: 1 });
    } else {
      setSearchInputValue(query);
      handleFilterChange({ search: query, page: 1 });
    }
  };

  const handleLoadMore = () => {
    const nextPerPage = (filters.perPage || 15) + 15;
    handleFilterChange({ perPage: nextPerPage });
  };

  // Watchlist View filtering
  const displayedTenders = useMemo(() => {
    if (filters.tabMode === 'watchlist') {
      return tenders.filter((t) => savedIds.has(t.invitationId) || savedIds.has(String(t.invitationId)));
    }
    return tenders;
  }, [tenders, filters.tabMode, savedIds]);

  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);

  const handleAskAI = (tender: TenderItem, prompt?: string) => {
    setAiTenderContext(tender);
    setAiInitialPrompt(prompt);
    setIsAIDrawerOpen(true);
  };

  const handleOpenDocAudit = (tender?: TenderItem) => {
    setModalTenderContext(tender || null);
    setIsDocAuditOpen(true);
  };

  const handleOpenFinance = (tender?: TenderItem) => {
    setModalTenderContext(tender || null);
    setIsFinanceOpen(true);
  };

  const handleOpenChinaSupplier = (tender?: TenderItem) => {
    setModalTenderContext(tender || null);
    setIsChinaSupplierOpen(true);
  };

  const handleExportCSV = () => {
    if (!displayedTenders || displayedTenders.length === 0) return;
    exportTendersToCSV(displayedTenders, `tender_export_${new Date().toISOString().substring(0, 10)}.csv`);
    showToast({
      type: 'success',
      title: locale === 'mn' ? 'CSV амжилттай татагдлаа' : locale === 'zh' ? 'CSV 导出成功' : 'CSV exported successfully',
      description: locale === 'mn' ? `${displayedTenders.length} тендерийн өгөгдлийг Excel файлд хадгаллаа.` : locale === 'zh' ? `已导出 ${displayedTenders.length} 条招标到表格。` : `${displayedTenders.length} items exported to spreadsheet.`,
    });
  };

  const handleResetAllFilters = () => {
    setSearchInputValue('');
    handleFilterChange({
      search: undefined,
      category: 'all',
      industry: 'all',
      minBudget: undefined,
      maxBudget: undefined,
      status: 'receiving',
      tabMode: 'active',
      urgency: 'all',
      year: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      fundName: undefined,
      ruleName: undefined,
      positionName: undefined,
      page: 1,
      perPage: 15,
      sortBy: 'date_desc',
    });
  };

  const handleSidebarSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'watchlist') {
      handleFilterChange({ tabMode: 'watchlist', page: 1 });
    } else if (sectionId === 'database') {
      handleFilterChange({ tabMode: 'active', page: 1 });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      
      {/* 1. Fixed Left Sidebar Navigation Panel (w-[260px]) */}
      <DashboardSidebar
        activeCount={stats?.activeTendersCount}
        lastUpdatedAt={stats?.lastUpdatedAt}
        activeSection={activeSection}
        onSelectSection={handleSidebarSelectSection}
        savedCount={savedIds.size}
        locale={locale}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAI={() => {
          setAiTenderContext(null);
          setIsAIDrawerOpen(true);
        }}
        onOpenDocAudit={() => handleOpenDocAudit()}
        onOpenFinance={() => handleOpenFinance()}
        onOpenChinaSupplier={() => handleOpenChinaSupplier()}
        onOpenPricing={() => setIsPricingOpen(true)}
      />

      {/* 2. Main Independent Scrollable Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        
        {/* Optimized Top Header Bar */}
        <Header
          locale={locale}
          setLocale={setLocale}
          stats={stats}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenPricing={() => setIsPricingOpen(true)}
          onOpenAI={() => {
            setAiTenderContext(null);
            setIsAIDrawerOpen(true);
          }}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          searchValue={searchInputValue}
          onSearchChange={setSearchInputValue}
          onSearchSubmit={handleGlobalSearchSubmit}
          activeSectionTitle={
            activeSection === 'watchlist'
              ? (locale === 'mn' ? 'Хадгалсан төслүүд' : locale === 'zh' ? '我的收藏' : 'My Saved Bids')
              : activeSection === 'buyers'
              ? (locale === 'mn' ? 'Захиалагч байгууллагууд' : locale === 'zh' ? '采购单位' : 'Buyer Intelligence')
              : undefined
          }
        />

        {/* Independently Scrollable Main Viewport (Strict 8px Grid Multiples) */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Section: Dashboard Overview / Top KPI Row */}
          <section id="dashboard" className="space-y-6">
            
            {/* Horizontal Row of Clean KPI Cards */}
            <DashboardKPICards
              stats={stats}
              locale={locale}
              onApplyFilter={(f) => {
                handleFilterChange(f);
                document.getElementById('database')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />


          </section>

          {/* Section: Tender Database Feed & Search Center */}
          <section id="database" className="space-y-4 pt-2">
            
            {/* Primary Search Bar with Quick Presets */}
            <GlobalSearchBar
              value={searchInputValue}
              onChange={setSearchInputValue}
              onSubmit={handleGlobalSearchSubmit}
              onClear={() => handleFilterChange({ search: undefined, page: 1 })}
              locale={locale}
              totalFound={totalCount}
              onSelectSuggestion={handleSelectSearchSuggestion}
            />

            {/* Comprehensive Tender Filters & Workflow Console */}
            <TenderFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              locale={locale}
              totalFound={totalCount}
              watchlistCount={savedIds.size}
              viewMode={viewMode}
              setViewMode={setViewMode}
              stats={stats}
              onExportCSV={handleExportCSV}
            />

            {/* Watchlist anchor target */}
            <div id="watchlist" />

            {/* Tender Result Cards / Table */}
            {!isLoading && displayedTenders.length > 0 && (
              <p className="px-1 text-sm text-slate-600 dark:text-zinc-400">
                {locale === 'zh'
                  ? `共找到 ${totalCount.toLocaleString('en-US')} 个招标`
                  : locale === 'en'
                  ? `${totalCount.toLocaleString('en-US')} tenders found`
                  : `${totalCount.toLocaleString('en-US')} тендер олдлоо`}
                {filters.search ? <span className="text-slate-400 dark:text-zinc-500"> · “{filters.search}”</span> : null}
              </p>
            )}
            {isLoading ? (
              viewMode === 'table' ? (
                <TenderSkeleton count={8} viewMode="table" />
              ) : (
                <TenderSkeleton count={6} viewMode="grid" />
              )
            ) : displayedTenders.length === 0 ? (
              <EmptyState
                onResetFilters={handleResetAllFilters}
                locale={locale}
                onSelectSuggestion={handleSelectSearchSuggestion}
              />
            ) : viewMode === 'table' ? (
              <TenderTable
                tenders={displayedTenders}
                locale={locale}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                onAskAI={handleAskAI}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-zinc-800 overflow-hidden divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {displayedTenders.map((tender) => (
                  <TenderRow
                    key={String(tender.invitationId)}
                    tender={tender}
                    locale={locale}
                    isSaved={savedIds.has(tender.invitationId) || savedIds.has(String(tender.invitationId))}
                    onToggleSave={handleToggleSave}
                    onAskAI={handleAskAI}
                  />
                ))}
              </div>
            )}

            {/* Pagination & Load More Controls */}
            {displayedTenders.length > 0 && totalCount > displayedTenders.length && filters.tabMode !== 'watchlist' && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-zinc-800 pt-6 px-1 gap-4">
                
                <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {locale === 'mn'
                    ? `Нийт ${totalCount.toLocaleString('en-US')} тендерээс ${displayedTenders.length}-ийг харуулж байна`
                    : `Showing ${displayedTenders.length} of ${totalCount.toLocaleString('en-US')} tenders`}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex-1 sm:flex-initial min-h-[40px] px-6 rounded-md text-xs sm:text-sm font-bold bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-blue-500" />
                    )}
                    <span>{locale === 'mn' ? 'Цааш үзэх (+15 нэмэх)' : locale === 'zh' ? '加载更多 (+15)' : 'Load More (+15)'}</span>
                  </button>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-md border border-slate-200 dark:border-zinc-800 shadow-xs">
                      <button
                        onClick={() => handleFilterChange({ page: Math.max(1, (filters.page || 1) - 1) })}
                        disabled={(filters.page || 1) <= 1}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{locale === 'mn' ? 'Өмнөх' : locale === 'zh' ? '上一页' : 'Prev'}</span>
                      </button>

                      <span className="px-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 font-mono tabular-nums">
                        {filters.page} / {totalPages}
                      </span>

                      <button
                        onClick={() => handleFilterChange({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                        disabled={(filters.page || 1) >= totalPages}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="hidden sm:inline">{locale === 'mn' ? 'Дараах' : locale === 'zh' ? '下一页' : 'Next'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </section>

          <section className="pt-2">
            {/* Buyer Intelligence, Industry Verticals & Foreign Routes Hub */}
            <div id="buyers">
              <DiscoveryCardsHub
                filters={filters}
                onFilterChange={handleFilterChange}
                locale={locale}
                totalFound={totalCount}
                stats={stats}
              />
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-zinc-800 py-6 text-xs text-slate-500 dark:text-zinc-400 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
              <span>TenderHub — {locale === 'mn' ? 'Монголын төрийн худалдан авалтын мэдээлэл' : locale === 'zh' ? '蒙古国政府采购信息' : 'Mongolian public procurement data'}</span>
              <span>{locale === 'mn' ? 'Эх сурвалж: tender.gov.mn болон албан ёсны зарын суваг. Албан ёсны баримтыг эх сурвалжаас шалгана уу.' : locale === 'zh' ? '来源：tender.gov.mn 及官方公告频道。请以官方文件为准。' : 'Source: tender.gov.mn and its official announcement channel. Always check the official documents.'}</span>
            </div>
          </footer>

        </main>
      </div>

      {/* Slide-over Full Detail View */}


      {/* ТББ Шалгагч AI Modal */}
      <TenderDocAuditModal
        isOpen={isDocAuditOpen}
        onClose={() => setIsDocAuditOpen(false)}
        tender={modalTenderContext}
      />

      {/* Тендерийн Баталгаа & Санхүүжилт Modal */}
      <TenderFinanceModal
        isOpen={isFinanceOpen}
        onClose={() => setIsFinanceOpen(false)}
        tender={modalTenderContext}
      />

      {/* Tender2China Sourcing Modal */}
      <ChinaSupplierModal
        isOpen={isChinaSupplierOpen}
        onClose={() => setIsChinaSupplierOpen(false)}
        tender={modalTenderContext}
        locale={locale}
      />

      {/* VIP Pricing & Subscription Modal */}
      <PricingSubscriptionModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        locale={locale}
      />

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onFilterChange={handleFilterChange}
        onOpenAI={(t) => {
          if (t) handleAskAI(t);
          else {
            setAiTenderContext(null);
            setIsAIDrawerOpen(true);
          }
        }}
        onExportCSV={handleExportCSV}
        onToggleView={() => setViewMode((prev) => (prev === 'table' ? 'grid' : 'table'))}
        viewMode={viewMode}
        tenders={displayedTenders}
        savedCount={savedIds.size}
      />

      {/* AI Assistant Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => {
          setIsAIDrawerOpen(false);
          setAiInitialPrompt(undefined);
        }}
        selectedTender={aiTenderContext}
        onClearSelectedTender={() => {
          setAiTenderContext(null);
          setAiInitialPrompt(undefined);
        }}
        locale={locale}
        initialPrompt={aiInitialPrompt}
      />

      {/* Global Action Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

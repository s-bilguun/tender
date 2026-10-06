'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { MOCK_MONGOLIAN_TENDERS } from '@/lib/mock-tenders';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Header } from '@/components/Header';
import { DashboardKPICards } from '@/components/DashboardKPICards';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { DiscoveryCardsHub } from '@/components/DiscoveryCardsHub';
import { TenderTable } from '@/components/TenderTable';
import { TenderCard } from '@/components/TenderCard';
import { TenderFilters } from '@/components/TenderFilters';
import { TenderSlideOver } from '@/components/TenderSlideOver';
import { TenderDocAuditModal } from '@/components/TenderDocAuditModal';
import { TenderFinanceModal } from '@/components/TenderFinanceModal';
import { ChinaSupplierModal } from '@/components/ChinaSupplierModal';
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
        localStorage.setItem('tenderhub_locale', urlLang);
        return;
      }
      const savedLang = localStorage.getItem('tenderhub_locale') as Locale | null;
      if (savedLang && ['mn', 'en', 'zh'].includes(savedLang)) {
        setLocaleState(savedLang);
      }
    } catch {}
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
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
  const [tenders, setTenders] = useState<TenderItem[]>(MOCK_MONGOLIAN_TENDERS);
  const [totalCount, setTotalCount] = useState<number>(MOCK_MONGOLIAN_TENDERS.length);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<TenderStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Search Input State (Synchronized between Header and Main Filter Center)
  const [searchInputValue, setSearchInputValue] = useState<string>('');

  // Selected Tender for Slide-over Detailed View
  const [selectedTenderForSlideOver, setSelectedTenderForSlideOver] = useState<TenderItem | null>(null);

  // Multi-currency display (CNY, USD, MNT) for foreign & domestic suppliers
  const [currency, setCurrency] = useState<'CNY' | 'USD' | 'MNT'>('MNT');

  // Modals (ТББ Шалгагч AI, Баталгаа & Санхүүжилт, Tender2China)
  const [isDocAuditOpen, setIsDocAuditOpen] = useState<boolean>(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState<boolean>(false);
  const [isChinaSupplierOpen, setIsChinaSupplierOpen] = useState<boolean>(false);
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
          title: locale === 'mn' ? 'Хяналтаас хаслаа' : 'Removed from watchlist',
          description: locale === 'mn' ? 'Тендерийг таны хадгалсан жагсаалтаас хаслаа.' : 'Tender removed from your pinned watchlist.',
        });
      } else {
        next.add(id);
        showToast({
          type: 'success',
          title: locale === 'mn' ? 'Хяналтад хадгаллаа' : 'Saved to watchlist',
          description: locale === 'mn' ? 'Тендерийг "Миний хянаж буй" хэсэгт нэмлээ.' : 'Tender pinned to your watchlist tab.',
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
        // Fallback local search on mock data
        let filtered = [...MOCK_MONGOLIAN_TENDERS];
        if (currentFilters.search) {
          const q = currentFilters.search.toLowerCase();
          filtered = filtered.filter(t => 
            t.tenderName.toLowerCase().includes(q) || 
            t.budgetEntityName.toLowerCase().includes(q) ||
            (t.tenderCode && t.tenderCode.toLowerCase().includes(q))
          );
        }
        if (currentFilters.industry && currentFilters.industry !== 'all') {
          filtered = filtered.filter(t => t.industry === currentFilters.industry);
        }
        if (currentFilters.urgency && currentFilters.urgency === 'urgent') {
          filtered = filtered.filter(t => t.receiveDate && new Date(t.receiveDate).getTime() - Date.now() < 3 * 24 * 3600 * 1000);
        }
        setTenders(filtered);
        setTotalCount(filtered.length);
      }
    } catch (err) {
      console.warn('Live tender API fetch fallback to mock data:', err);
      setTenders(MOCK_MONGOLIAN_TENDERS);
      setTotalCount(MOCK_MONGOLIAN_TENDERS.length);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadTenders(filters, false);
  }, [filters, loadTenders]);

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
      title: locale === 'mn' ? 'CSV амжилттай татагдлаа' : 'CSV exported successfully',
      description: locale === 'mn' ? `${displayedTenders.length} тендерийн өгөгдлийг Excel файлд хадгаллаа.` : `${displayedTenders.length} items exported to spreadsheet.`,
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* 1. Fixed Left Sidebar Navigation Panel (w-[260px]) */}
      <DashboardSidebar
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
      />

      {/* 2. Main Independent Scrollable Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        
        {/* Optimized Top Header Bar */}
        <Header
          locale={locale}
          setLocale={setLocale}
          stats={stats}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
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
              ? (locale === 'mn' ? 'Хадгалсан төслүүд' : 'My Saved Bids')
              : activeSection === 'buyers'
              ? (locale === 'mn' ? 'Захиалагч байгууллагууд' : 'Buyer Intelligence')
              : undefined
          }
        />

        {/* Independently Scrollable Main Viewport (Strict 8px Grid Multiples) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Section: Dashboard Overview / Top KPI Row */}
          <section id="dashboard" className="space-y-6">
            
            {/* Horizontal Row of Clean KPI Cards */}
            <DashboardKPICards
              locale={locale}
              onFilterActive={() => handleFilterChange({ status: 'receiving', tabMode: 'active', page: 1 })}
              onOpenDocAudit={() => handleOpenDocAudit()}
              onOpenFinance={() => handleOpenFinance()}
              onOpenChinaSupplier={() => handleOpenChinaSupplier()}
            />

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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                {displayedTenders.map((tender) => (
                  <TenderCard
                    key={String(tender.invitationId)}
                    tender={tender}
                    locale={locale}
                    currency={currency}
                    isSaved={savedIds.has(tender.invitationId) || savedIds.has(String(tender.invitationId))}
                    onToggleSave={handleToggleSave}
                    onSelect={(t) => setSelectedTenderForSlideOver(t)}
                    onAskAI={handleAskAI}
                  />
                ))}
              </div>
            )}

            {/* Pagination & Load More Controls */}
            {displayedTenders.length > 0 && totalCount > displayedTenders.length && filters.tabMode !== 'watchlist' && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 px-1 gap-4">
                
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {locale === 'mn'
                    ? `Нийт ${totalCount.toLocaleString()} тендерээс ${displayedTenders.length}-ийг харуулж байна`
                    : `Showing ${displayedTenders.length} of ${totalCount.toLocaleString()} tenders`}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex-1 sm:flex-initial min-h-[40px] px-6 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-blue-500" />
                    )}
                    <span>{locale === 'mn' ? 'Цааш үзэх (+15 нэмэх)' : 'Load More (+15)'}</span>
                  </button>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      <button
                        onClick={() => handleFilterChange({ page: Math.max(1, (filters.page || 1) - 1) })}
                        disabled={(filters.page || 1) <= 1}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{locale === 'mn' ? 'Өмнөх' : 'Prev'}</span>
                      </button>

                      <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                        {filters.page} / {totalPages}
                      </span>

                      <button
                        onClick={() => handleFilterChange({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                        disabled={(filters.page || 1) >= totalPages}
                        className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="hidden sm:inline">{locale === 'mn' ? 'Дараах' : 'Next'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </section>

          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-xs text-slate-500 dark:text-slate-400 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
              <span>TenderHub MN — B2B Procurement Intelligence & Database</span>
              <span>Албан ёсны tender.gov.mn эх сурвалжийн шууд боловсруулалт</span>
            </div>
          </footer>

        </main>
      </div>

      {/* Slide-over Full Detail View */}
      <TenderSlideOver
        tender={selectedTenderForSlideOver}
        isOpen={Boolean(selectedTenderForSlideOver)}
        onClose={() => setSelectedTenderForSlideOver(null)}
        locale={locale}
        onAskAI={handleAskAI}
        onOpenDocAudit={(t) => handleOpenDocAudit(t)}
        onOpenFinance={(t) => handleOpenFinance(t)}
        onOpenChinaSupplier={(t) => handleOpenChinaSupplier(t)}
      />

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

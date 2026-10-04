'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { MOCK_MONGOLIAN_TENDERS } from '@/lib/mock-tenders';
import { Header } from '@/components/Header';
import { EcosystemStatsBanner } from '@/components/EcosystemStatsBanner';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { StatusFilterTabs } from '@/components/StatusFilterTabs';
import { ActiveFilterBar } from '@/components/ActiveFilterBar';
import { TenderTable } from '@/components/TenderTable';
import { TenderCard } from '@/components/TenderCard';
import { TenderFilters } from '@/components/TenderFilters';
import { TenderSlideOver } from '@/components/TenderSlideOver';
import { TenderDocAuditModal } from '@/components/TenderDocAuditModal';
import { TenderFinanceModal } from '@/components/TenderFinanceModal';
import { ChinaSupplierModal } from '@/components/ChinaSupplierModal';
import { EmptyState } from '@/components/EmptyState';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { AnalyticsView } from '@/components/AnalyticsView';
import { CommandPalette } from '@/components/CommandPalette';
import { TenderSkeleton } from '@/components/TenderSkeleton';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { exportTendersToCSV } from '@/lib/export';
import {
  AlertCircle, ChevronLeft, ChevronRight, 
  Star, Sparkles, Loader2, ArrowDown, LayoutGrid, Table
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

  // Initial state populated with mock tenders for instant rich render
  const [tenders, setTenders] = useState<TenderItem[]>(MOCK_MONGOLIAN_TENDERS);
  const [totalCount, setTotalCount] = useState<number>(MOCK_MONGOLIAN_TENDERS.length);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<TenderStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  // Search Input State
  const [searchInputValue, setSearchInputValue] = useState<string>('');

  // Selected Tender for Slide-over Detailed View
  const [selectedTenderForSlideOver, setSelectedTenderForSlideOver] = useState<TenderItem | null>(null);

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
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);

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

  const handleAskAI = (tender: TenderItem) => {
    setAiTenderContext(tender);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <Header
        locale={locale}
        setLocale={setLocale}
        stats={stats}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAI={() => {
          setAiTenderContext(null);
          setIsAIDrawerOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        
        {/* Ecosystem Live Market Pulse Banner */}
        <EcosystemStatsBanner
          locale={locale}
          onOpenDocAudit={() => handleOpenDocAudit()}
          onOpenFinance={() => handleOpenFinance()}
          onOpenChinaSupplier={() => handleOpenChinaSupplier()}
        />

        {/* 1. "Find What You Want" — Hero Control Center */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          
          {/* Smart Search Bar */}
          <GlobalSearchBar
            value={searchInputValue}
            onChange={setSearchInputValue}
            onSubmit={handleGlobalSearchSubmit}
            onClear={() => handleFilterChange({ search: undefined, page: 1 })}
            locale={locale}
            totalFound={totalCount}
            onSelectSuggestion={handleSelectSearchSuggestion}
          />

          {/* Status Filter Tabs (Mobile swipeable) */}
          <StatusFilterTabs
            filters={filters}
            onFilterChange={handleFilterChange}
            locale={locale}
            watchlistCount={savedIds.size}
          />
        </section>

        {/* 2. "Active Filters" Indicator Bar (Шүүлтүүрийн ил тод байдал) */}
        <ActiveFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetAll={handleResetAllFilters}
          totalFound={displayedTenders.length}
          locale={locale}
        />

        {/* Advanced Filters Drawer / Bar (Industry verticals, budget, year) */}
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

        {/* 3. "What Are These Tenders" — High-Clarity Result Cards */}
        {isLoading ? (
          viewMode === 'table' ? (
            <TenderSkeleton count={8} viewMode="table" />
          ) : (
            <TenderSkeleton count={6} viewMode="grid" />
          )
        ) : displayedTenders.length === 0 ? (
          /* 4. Zero-State / Empty State */
          <EmptyState
            onResetFilters={handleResetAllFilters}
            locale={locale}
            onSelectSuggestion={handleSelectSearchSuggestion}
          />
        ) : viewMode === 'table' ? (
          /* Table View */
          <TenderTable
            tenders={displayedTenders}
            locale={locale}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onAskAI={handleAskAI}
          />
        ) : (
          /* High-Clarity Mobile-First Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {displayedTenders.map((tender) => (
              <TenderCard
                key={String(tender.invitationId)}
                tender={tender}
                locale={locale}
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
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-6 px-1 gap-4">
            
            <div className="text-xs text-slate-500 font-medium">
              {locale === 'mn'
                ? `Нийт ${totalCount.toLocaleString()} тендерээс ${displayedTenders.length}-ийг харуулж байна`
                : `Showing ${displayedTenders.length} of ${totalCount.toLocaleString()} tenders`}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] px-6 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs hover:border-slate-400 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isLoadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-blue-600" />
                )}
                <span>{locale === 'mn' ? 'Цааш үзэх (+15 нэмэх)' : 'Load More (+15)'}</span>
              </button>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => handleFilterChange({ page: Math.max(1, (filters.page || 1) - 1) })}
                    disabled={(filters.page || 1) <= 1}
                    className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{locale === 'mn' ? 'Өмнөх' : 'Prev'}</span>
                  </button>

                  <span className="px-2 text-xs font-semibold text-slate-800 font-mono tabular-nums">
                    {filters.page} / {totalPages}
                  </span>

                  <button
                    onClick={() => handleFilterChange({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                    disabled={(filters.page || 1) >= totalPages}
                    className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="hidden sm:inline">{locale === 'mn' ? 'Дараах' : 'Next'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-xs text-slate-500 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TenderHub MN — Монголын худалдан авалтын нэгдсэн экосистем</span>
          <span>Өгөгдлийг албан ёсны tender.gov.mn эх сурвалжаас бодит цагт боловсруулав</span>
        </div>
      </footer>

      {/* Mobile Floating AI Assistant Button */}
      <button
        onClick={() => {
          setAiTenderContext(null);
          setIsAIDrawerOpen(true);
        }}
        className="sm:hidden fixed bottom-5 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900 text-white shadow-xl border border-slate-700 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
        <span>AI Шинжээч</span>
      </button>

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
        onClose={() => setIsAIDrawerOpen(false)}
        selectedTender={aiTenderContext}
        onClearSelectedTender={() => setAiTenderContext(null)}
        locale={locale}
      />

      {/* Global Action Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

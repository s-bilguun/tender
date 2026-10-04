'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Header } from '@/components/Header';
import { TenderTable } from '@/components/TenderTable';
import { TenderCard } from '@/components/TenderCard';
import { TenderFilters } from '@/components/TenderFilters';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { AnalyticsView } from '@/components/AnalyticsView';
import { CommandPalette } from '@/components/CommandPalette';
import { TenderSkeleton } from '@/components/TenderSkeleton';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { exportTendersToCSV } from '@/lib/export';
import {
  AlertCircle, ChevronLeft, ChevronRight, 
  Star, Sparkles, Loader2
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

  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<TenderStats | undefined>(undefined);
  const [statsSource, setStatsSource] = useState<string | undefined>(undefined);
  const [listSource, setListSource] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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

  // Default: Show Active Open Tenders first (immediately actionable opportunities)
  const [filters, setFilters] = useState<TenderFilterParams>({
    search: '',
    category: 'all',
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

  // Fetch tenders
  const loadTenders = useCallback(async (currentFilters: TenderFilterParams) => {
    setIsLoading(true);
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

      if (data.success) {
        setTenders(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages || 1);
        setListSource(data.source || 'unknown');
      }
    } catch (err) {
      console.error('Failed to load tenders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenders(filters);
  }, [filters, loadTenders]);

  useEffect(() => {
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        if (!cancelled && data.success && data.stats) {
          setStats(data.stats);
          setStatsSource(data.source || 'unknown');
        } else if (!cancelled) {
          setStatsSource('unavailable');
        }
      } catch {
        if (!cancelled) setStatsSource('unavailable');
      }
    };
    loadAnalytics();
    return () => { cancelled = true; };
  }, []);

  const handleFilterChange = (newFilters: Partial<TenderFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
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

  const handleExportCSV = () => {
    if (!displayedTenders || displayedTenders.length === 0) return;
    exportTendersToCSV(displayedTenders, `tender_export_${new Date().toISOString().substring(0, 10)}.csv`);
    showToast({
      type: 'success',
      title: locale === 'mn' ? 'CSV амжилттай татагдлаа' : 'CSV exported successfully',
      description: locale === 'mn' ? `${displayedTenders.length} тендерийн өгөгдлийг Excel файлд хадгаллаа.` : `${displayedTenders.length} items exported to spreadsheet.`,
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3">
        {(statsSource === 'local_cache' || statsSource === 'unavailable' || listSource === 'local_cache' || listSource === 'live_fetch_partial') && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
            {listSource === 'live_fetch_partial'
              ? (locale === 'mn'
                ? 'Энэ хайлт эх сайтаас зөвхөн нэг хуудсыг шууд татсан. Бүрэн жагсаалт болон статистикийг өдөр тутмын синкээр шинэчилнэ.'
                : 'This search is a live-source fallback for one page only. The daily sync provides the complete stored archive.')
              : (locale === 'mn'
                ? 'Бүрэн өгөгдлийн сангийн мэдээлэл боломжгүй байна. Жагсаалт эсвэл статистик кэшийн хэсэгчилсэн өгөгдөл байж болно.'
                : 'Complete database data is temporarily unavailable. The list or metrics may reflect only a partial cache.')}
          </div>
        )}

        {/* Collapsible Analytics View */}
        {isAnalyticsOpen && stats && (
          <AnalyticsView
            stats={stats}
            locale={locale}
            onFilterByCompany={(companyQuery) => {
              handleFilterChange({ search: companyQuery, page: 1, sortBy: 'date_desc' });
            }}
            onFilterByIndustry={(industryId) => {
              handleFilterChange({ industry: industryId as any, page: 1, sortBy: 'date_desc' });
            }}
          />
        )}

        {/* Unified Workflow Tabs, Sectors, Search & Filters Hub */}
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

        {/* Results Summary Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              {filters.tabMode === 'watchlist' ? (
                <span>
                  {locale === 'mn' ? 'Хянаж буй:' : 'Watchlist:'}{' '}
                  <strong className="text-slate-900 font-mono tabular-nums">{displayedTenders.length}</strong> {locale === 'mn' ? 'тендер' : 'bids'}
                </span>
              ) : (
                <span>
                  {locale === 'mn' ? 'Нийт олдсон:' : 'Total matches:'}{' '}
                  <strong className="text-slate-900 font-mono tabular-nums">{totalCount.toLocaleString()}</strong> {locale === 'mn' ? 'тендер' : 'bids'}
                </span>
              )}
            </span>
          </div>

          {totalPages > 1 && filters.tabMode !== 'watchlist' && (
            <span className="text-slate-500 font-mono tabular-nums text-[11px]">
              {locale === 'mn' ? 'Хуудас' : 'Page'} <strong className="text-slate-700">{filters.page}</strong> / {totalPages}
            </span>
          )}
        </div>

        {/* Main Content: Table or Grid */}
        {isLoading ? (
          viewMode === 'table' ? (
            <TenderSkeleton count={8} viewMode="table" />
          ) : (
            <TenderSkeleton count={6} viewMode="grid" />
          )
        ) : displayedTenders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            {filters.tabMode === 'watchlist' ? (
              <>
                <Star className="h-8 w-8 text-amber-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-800">
                  {locale === 'mn' ? 'Хянаж буй тендер байхгүй байна' : 'No tracked tenders in watchlist'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {locale === 'mn'
                    ? 'Тендерийн жагсаалтаас од (⭐) дээр дарж сонирхсон тендерүүдээ энд хадгалан хянах боломжтой.'
                    : 'Click the star icon (⭐) on any tender card or table row to pin it here.'}
                </p>
                <button
                  onClick={() => handleFilterChange({ tabMode: 'active', status: 'receiving', page: 1 })}
                  className="h-8 px-4 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  {locale === 'mn' ? 'Идэвхтэй тендерүүд рүү буцах' : 'Back to Active Tenders'}
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-800">{t.noResults}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {t.noResultsTip}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <button
                    onClick={() => handleFilterChange({ search: '', category: 'all', industry: 'all', minBudget: undefined, maxBudget: undefined, status: 'all', tabMode: 'all', urgency: 'all', year: undefined, dateFrom: undefined, dateTo: undefined, page: 1 })}
                    className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {locale === 'mn' ? 'Шүүлтүүр цэвэрлэх' : 'Reset Filters'}
                  </button>
                </div>
              </>
            )}
          </div>
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
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTenders.map((tender) => (
              <TenderCard
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

        {/* Pagination Controls */}
        {totalPages > 1 && filters.tabMode !== 'watchlist' && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1 text-xs">
            <div className="text-slate-500">
              {locale === 'mn' ? 'Хуудас бүрт 15 тендер харуулж байна' : 'Showing 15 tenders per page'}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFilterChange({ page: Math.max(1, (filters.page || 1) - 1) })}
                disabled={(filters.page || 1) <= 1}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{locale === 'mn' ? 'Өмнөх' : 'Previous'}</span>
              </button>

              <span className="px-3 text-slate-700 font-medium tabular-nums">
                {filters.page} / {totalPages}
              </span>

              <button
                onClick={() => handleFilterChange({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                disabled={(filters.page || 1) >= totalPages}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <span>{locale === 'mn' ? 'Дараах' : 'Next'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-xs text-slate-500 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TenderHub — Төрийн цахим худалдан авах ажиллагааны идэвхтэй тендерийн систем</span>
          <span>Өгөгдлийг албан ёсны tender.gov.mn системээс бодит цагт боловсруулав</span>
        </div>
      </footer>

      {/* Mobile Floating AI Assistant Button */}
      <button
        onClick={() => {
          setAiTenderContext(null);
          setIsAIDrawerOpen(true);
        }}
        className="sm:hidden fixed bottom-5 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900 text-white shadow-xl border border-slate-700/80 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
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

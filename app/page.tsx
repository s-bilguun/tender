'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Header } from '@/components/Header';
import { ActiveRadarBar } from '@/components/ActiveRadarBar';
import { TenderTable } from '@/components/TenderTable';
import { TenderCard } from '@/components/TenderCard';
import { TenderFilters } from '@/components/TenderFilters';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { AnalyticsView } from '@/components/AnalyticsView';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Star, Sparkles } from 'lucide-react';

export default function Home() {
  const [locale, setLocale] = useState<Locale>('mn');
  const t = getTranslation(locale);

  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<TenderStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
      if (next.has(id) || next.has(strId)) {
        next.delete(id);
        next.delete(strId);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('tender_watchlist', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Default: Show All Tenders (22,700+ records) by default, with easy tabs for Active & Awarded
  const [filters, setFilters] = useState<TenderFilterParams>({
    search: '',
    category: 'all',
    status: 'all',
    tabMode: 'all',
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
        if (data.stats) setStats(data.stats);
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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: filters.search || undefined, page: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        await loadTenders(filters);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAskAI = (tender: TenderItem) => {
    setAiTenderContext(tender);
    setIsAIDrawerOpen(true);
  };

  const handleExportCSV = () => {
    if (!displayedTenders || displayedTenders.length === 0) return;

    const headers = [
      'Тендерийн дугаар/код',
      'Тендерийн нэр',
      'Захиалагч байгууллага',
      'Төрөл',
      'Төсөвт өртөг (₮)',
      'Төлөв',
      'Зарласан огноо',
      'Эцсийн хугацаа',
      'Албан ёсны холбоос',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = displayedTenders.map((t) => [
      escapeCSV(t.tenderCode || t.invitationNumber),
      escapeCSV(t.tenderName),
      escapeCSV(t.budgetEntityName),
      escapeCSV(t.tenderTypeName),
      escapeCSV(t.totalBudget),
      escapeCSV(t.docStatusName),
      escapeCSV(t.publishDate ? t.publishDate.substring(0, 10) : ''),
      escapeCSV(t.receiveDate ? t.receiveDate.substring(0, 10) : ''),
      escapeCSV(`https://www.tender.gov.mn/mn/invitation/detail/${t.invitationId}`),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `tender_mn_active_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <Header
        locale={locale}
        setLocale={setLocale}
        stats={stats}
        isSyncing={isSyncing}
        onSync={handleSync}
        onOpenAI={() => {
          setAiTenderContext(null);
          setIsAIDrawerOpen(true);
        }}
        onToggleAnalytics={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
        isAnalyticsOpen={isAnalyticsOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Page Title & Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
                {locale === 'mn' ? 'Шуурхай Радар' : 'Live Radar'}
              </span>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                {locale === 'mn' ? 'Идэвхтэй нээлттэй тендерийн систем' : 'Active Tender Command Center'}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
              {locale === 'mn'
                ? 'Санал хүлээн авч буй нээлттэй бүх тендерийг хугацааны яаралтай байдлаар хянах, дүн шинжилгээ хийх, оролцох боломж'
                : 'Monitor active government tenders in real-time, track closing deadlines, and analyze bidding requirements.'}
            </p>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <span>Эх сурвалж: <strong className="text-slate-600">tender.gov.mn</strong></span>
          </div>
        </div>

        {/* Active Radar Quick Metric Cards */}
        <ActiveRadarBar
          stats={stats}
          locale={locale}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Collapsible Analytics View */}
        {isAnalyticsOpen && stats && (
          <AnalyticsView stats={stats} locale={locale} />
        )}

        {/* Workflow Tabs, Search & Filters */}
        <TenderFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          locale={locale}
          totalFound={totalCount}
          watchlistCount={savedIds.size}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {/* Results Count Line */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              {filters.tabMode === 'watchlist' ? (
                <span>
                  {locale === 'mn' ? 'Хянаж буй:' : 'Watchlist:'}{' '}
                  <strong className="text-slate-900 tabular-nums">{displayedTenders.length}</strong> {locale === 'mn' ? 'тендер' : 'bids'}
                </span>
              ) : (
                <span>
                  {locale === 'mn' ? 'Нээлттэй илэрц:' : 'Matching live tenders:'}{' '}
                  <strong className="text-slate-900 tabular-nums">{totalCount.toLocaleString()}</strong> {locale === 'mn' ? 'тендер' : 'bids'}
                </span>
              )}
            </span>

            <button
              onClick={handleExportCSV}
              disabled={displayedTenders.length === 0}
              className="h-6 px-2.5 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium text-[11px] flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              title={locale === 'mn' ? 'Одоогийн жагсаалтыг Excel / CSV файлаар татах' : 'Export current results as CSV / Excel'}
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
              <span>{locale === 'mn' ? 'Excel / CSV татах' : 'Export CSV'}</span>
            </button>
          </div>

          {totalPages > 1 && filters.tabMode !== 'watchlist' && (
            <span className="text-slate-500 tabular-nums text-[11px]">
              {locale === 'mn' ? 'Хуудас' : 'Page'} {filters.page} / {totalPages}
            </span>
          )}
        </div>

        {/* Main Content: Table or Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-500">{locale === 'mn' ? 'Идэвхтэй тендерүүдийг татаж байна...' : 'Loading active tenders...'}</span>
          </div>
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
                  className="h-8 px-4 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
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
                    onClick={() => handleFilterChange({ search: '', category: 'all', minBudget: undefined, maxBudget: undefined, status: 'all', tabMode: 'all', urgency: 'all', year: undefined, dateFrom: undefined, dateTo: undefined, page: 1 })}
                    className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
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
                className="h-8 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
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
                className="h-8 px-3 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
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
          <span>TENDER.MN — Төрийн цахим худалдан авах ажиллагааны идэвхтэй тендерийн систем</span>
          <span>Өгөгдлийг албан ёсны tender.gov.mn системээс бодит цагт боловсруулав</span>
        </div>
      </footer>
 
      {/* Mobile Floating AI Assistant Button (Always Accessible on Mobile) */}
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

      {/* AI Assistant Chat Drawer */}
      <AIChatDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        selectedTender={aiTenderContext}
        onClearSelectedTender={() => setAiTenderContext(null)}
        locale={locale}
      />
    </div>
  );
}

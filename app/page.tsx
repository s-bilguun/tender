'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TenderItem, TenderFilterParams, TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Header } from '@/components/Header';
import { TenderTable } from '@/components/TenderTable';
import { TenderCard } from '@/components/TenderCard';
import { TenderFilters } from '@/components/TenderFilters';
import { TenderDetailModal } from '@/components/TenderDetailModal';
import { AIChatDrawer } from '@/components/AIChatDrawer';
import { AnalyticsView } from '@/components/AnalyticsView';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

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

  const [filters, setFilters] = useState<TenderFilterParams>({
    search: '',
    category: 'all',
    page: 1,
    perPage: 15,
    sortBy: 'date_desc',
  });

  const [selectedTender, setSelectedTender] = useState<TenderItem | null>(null);
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
      if (currentFilters.sortBy) params.append('sortBy', currentFilters.sortBy);
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
    if (!tenders || tenders.length === 0) return;

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

    const rows = tenders.map((t) => [
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
    link.setAttribute('download', `tender_mn_export_${dateStr}.csv`);
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {locale === 'mn' ? 'Төрийн худалдан авах ажиллагааны нээлттэй сан' : 'Public Procurement Tender Repository'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === 'mn'
                ? 'Улсын болон орон нутгийн төсвийн бүх тендерийг нэг дороос хялбар хайж, дүн шинжилгээ хийх нээлттэй сан'
                : 'Search and analyze all national and municipal procurement tenders in one place.'}
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <span>Эх сурвалж: <strong>tender.gov.mn</strong></span>
          </div>
        </div>

        {/* Collapsible Analytics View */}
        {isAnalyticsOpen && stats && (
          <AnalyticsView stats={stats} locale={locale} />
        )}

        {/* Search & Filters */}
        <TenderFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          locale={locale}
          totalFound={totalCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {/* Results Count Line */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              {locale === 'mn' ? 'Нийт илэрц:' : 'Matching tenders:'}{' '}
              <strong className="text-slate-900 tabular-nums">{totalCount.toLocaleString()}</strong> {locale === 'mn' ? 'тендер' : 'bids'}
            </span>

            <button
              onClick={handleExportCSV}
              disabled={tenders.length === 0}
              className="h-6 px-2.5 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium text-[11px] flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              title={locale === 'mn' ? 'Одоогийн жагсаалтыг Excel / CSV файлаар татах' : 'Export current results as CSV / Excel'}
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
              <span>{locale === 'mn' ? 'Excel / CSV татах' : 'Export CSV'}</span>
            </button>
          </div>

          {totalPages > 1 && (
            <span className="text-slate-500 tabular-nums text-[11px]">
              {locale === 'mn' ? 'Хуудас' : 'Page'} {filters.page} / {totalPages}
            </span>
          )}
        </div>

        {/* Main Content: Table or Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs text-slate-500">{locale === 'mn' ? 'Тендерийн мэдээлэл татаж байна...' : 'Loading tenders...'}</span>
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">{t.noResults}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.noResultsTip}</p>
            <button
              onClick={() => handleFilterChange({ search: '', category: 'all', minBudget: undefined, maxBudget: undefined, page: 1 })}
              className="h-8 px-4 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {locale === 'mn' ? 'Шүүлтүүр цэвэрлэх' : 'Reset Filters'}
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <TenderTable
            tenders={tenders}
            locale={locale}
            onSelect={(tender) => setSelectedTender(tender)}
            onAskAI={handleAskAI}
          />
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenders.map((tender) => (
              <TenderCard
                key={String(tender.invitationId)}
                tender={tender}
                locale={locale}
                onSelect={(item) => setSelectedTender(item)}
                onAskAI={handleAskAI}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1 text-xs">
            <div className="text-slate-500">
              {locale === 'mn' ? 'Хуудас бүрт 15 тендер харуулж байна' : 'Showing 15 tenders per page'}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFilterChange({ page: Math.max(1, (filters.page || 1) - 1) })}
                disabled={(filters.page || 1) <= 1}
                className="h-8 px-3 rounded text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
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
                className="h-8 px-3 rounded text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
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
          <span>TENDER.MN — Төрийн цахим худалдан авах ажиллагааны нээлттэй хайлтын систем</span>
          <span>Өгөгдлийг албан ёсны tender.gov.mn системээс боловсруулав</span>
        </div>
      </footer>

      {/* Tender Details Modal */}
      <TenderDetailModal
        tender={selectedTender}
        locale={locale}
        onClose={() => setSelectedTender(null)}
        onAskAI={handleAskAI}
      />

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

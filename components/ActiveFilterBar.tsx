'use client';

import React from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { TenderFilterParams, Locale } from '@/lib/types';

interface ActiveFilterBarProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  onResetAll: () => void;
  totalFound: number;
  locale: Locale;
}

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetAll,
  totalFound,
  locale,
}) => {
  // Collect active filters
  const activeBadges: { id: string; label: string; onRemove: () => void }[] = [];

  if (filters.search && filters.search.trim() !== '') {
    activeBadges.push({
      id: 'search',
      label: `Хайлт: "${filters.search}"`,
      onRemove: () => onFilterChange({ search: undefined, page: 1 }),
    });
  }

  if (filters.industry && filters.industry !== 'all') {
    const industryLabels: Record<string, string> = {
      it: 'Мэдээллийн технологи',
      construction: 'Барилга, дэд бүтэц',
      medical: 'Эрүүл мэнд, эм',
      mining: 'Уул уурхай',
      food: 'Хүнс, хоол',
      transport: 'Тээвэр, шатахуун',
      facility: 'Харуул, цэвэрлэгээ',
      stationery: 'Боловсрол, бичиг хэрэг',
    };
    activeBadges.push({
      id: 'industry',
      label: `Салбар: ${industryLabels[filters.industry] || filters.industry}`,
      onRemove: () => onFilterChange({ industry: 'all', page: 1 }),
    });
  }

  if (filters.category && filters.category !== 'all' && filters.category !== 'ALL') {
    const catLabels: Record<string, string> = {
      PRODUCT: 'Бараа',
      JOB: 'Ажил',
      SERVICE: 'Үйлчилгээ',
    };
    activeBadges.push({
      id: 'category',
      label: `Төрөл: ${catLabels[filters.category] || filters.category}`,
      onRemove: () => onFilterChange({ category: 'all', page: 1 }),
    });
  }

  if (filters.urgency && filters.urgency !== 'all') {
    const urgLabels: Record<string, string> = {
      critical: 'Яаралтай (≤24 цаг)',
      urgent: 'Хугацаа дөхсөн (≤3 өдөр)',
      active: 'Хэвийн хугацаатай',
      closed: 'Хаагдсан',
    };
    activeBadges.push({
      id: 'urgency',
      label: `Хугацаа: ${urgLabels[filters.urgency] || filters.urgency}`,
      onRemove: () => onFilterChange({ urgency: 'all', page: 1 }),
    });
  }

  if (filters.minBudget !== undefined && filters.minBudget > 0) {
    activeBadges.push({
      id: 'minBudget',
      label: `Төсөв: ≥ ₮ ${(filters.minBudget / 1_000_000).toFixed(0)} сая`,
      onRemove: () => onFilterChange({ minBudget: undefined, page: 1 }),
    });
  }

  if (filters.maxBudget !== undefined && filters.maxBudget > 0) {
    activeBadges.push({
      id: 'maxBudget',
      label: `Төсөв: ≤ ₮ ${(filters.maxBudget / 1_000_000).toFixed(0)} сая`,
      onRemove: () => onFilterChange({ maxBudget: undefined, page: 1 }),
    });
  }

  if (filters.tabMode === 'watchlist') {
    activeBadges.push({
      id: 'tabMode',
      label: 'Зөвхөн хянаж буй тендерүүд',
      onRemove: () => onFilterChange({ tabMode: 'active', page: 1 }),
    });
  }

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
      {/* Top Count & Context Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <Filter className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            {locale === 'mn' ? (
              <>
                Нийт <strong className="text-slate-900 font-mono text-sm sm:text-base">{totalFound.toLocaleString()}</strong> тендер олдлоо
              </>
            ) : (
              <>
                Found <strong className="text-slate-900 font-mono text-sm sm:text-base">{totalFound.toLocaleString()}</strong> matching tenders
              </>
            )}
          </span>
        </div>

        {/* Clear All Button if active badges exist */}
        {activeBadges.length > 0 && (
          <button
            onClick={onResetAll}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{locale === 'mn' ? 'Бүгдийг арилгах' : 'Clear All'}</span>
          </button>
        )}
      </div>

      {/* Active Filter Pills List (Wrapped for Mobile Responsiveness) */}
      {activeBadges.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            {locale === 'mn' ? 'Идэвхтэй:' : 'Active:'}
          </span>
          {activeBadges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs animate-in fade-in duration-150"
            >
              <span>{badge.label}</span>
              <button
                onClick={badge.onRemove}
                className="p-0.5 rounded-full hover:bg-blue-200/60 text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                title="Шүүлтүүр хасах"
                aria-label="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

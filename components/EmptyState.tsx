'use client';

import React from 'react';
import { SearchX, RotateCcw, Sparkles, Filter } from 'lucide-react';
import { Locale } from '@/lib/types';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters: () => void;
  locale?: Locale;
  suggestedQueries?: string[];
  onSelectSuggestion?: (query: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onResetFilters,
  locale = 'mn',
  suggestedQueries = ['Барилга', 'Эмнэлэг', 'Цахим систем', 'Шатахуун'],
  onSelectSuggestion,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-2xs border border-slate-200">
        <SearchX className="h-8 w-8" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          {title || (locale === 'mn' ? 'Хайлтын шалгуурт тохирох тендер олдсонгүй' : 'No tenders found matching your criteria')}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          {description ||
            (locale === 'mn'
              ? 'Та хайлтын үгээ өөрчлөх эсвэл салбар, төсвийн шүүлтүүрээ цэвэрлэж үзнэ үү.'
              : 'Try modifying your search keywords or resetting active sector and budget filters.')}
        </p>
      </div>

      {/* Action: Clear Filters Button */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          onClick={onResetFilters}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{locale === 'mn' ? 'Бүх шүүлтүүрийг цэвэрлэх' : 'Reset All Filters'}</span>
        </button>
      </div>

      {/* Suggested Keywords */}
      {suggestedQueries.length > 0 && onSelectSuggestion && (
        <div className="pt-4 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            {locale === 'mn' ? 'Эсвэл эдгээр түлхүүр үгээр хайж үзээрэй:' : 'Or try searching for:'}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {suggestedQueries.map((query, i) => (
              <button
                key={i}
                onClick={() => onSelectSuggestion(query)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

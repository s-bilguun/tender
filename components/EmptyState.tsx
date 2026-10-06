'use client';

import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
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
  suggestedQueries = ['Барилга', 'Эмнэлэг', 'Цахим систем', 'Шатахуун', 'Сургууль'],
  onSelectSuggestion,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto shadow-2xs border border-slate-200 dark:border-slate-700">
        <SearchX className="h-8 w-8 text-slate-500 dark:text-slate-400" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {title || (locale === 'mn' ? 'Таны хайсан шалгуурт тохирох тендер олдсонгүй.' : 'No tenders found matching your criteria.')}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description ||
            (locale === 'mn'
              ? 'Та хайлтын үгээ өөрчлөх эсвэл салбар, төсвийн шүүлтүүрээ цэвэрлэж үзнэ үү.'
              : 'Try modifying your search keywords or resetting active sector and budget filters.')}
        </p>
      </div>

      {/* Action: Clear Filters Button (Full-width on mobile, auto on desktop) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 max-w-xs mx-auto">
        <button
          onClick={onResetFilters}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer border border-transparent dark:border-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          <span>{locale === 'mn' ? 'Шүүлтүүр цэвэрлэх' : 'Reset Filters'}</span>
        </button>
      </div>

      {/* Suggested Keywords */}
      {suggestedQueries.length > 0 && onSelectSuggestion && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-2">
            {locale === 'mn' ? 'Эсвэл эдгээр түлхүүр үгээр хайж үзээрэй:' : 'Or try searching for:'}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {suggestedQueries.map((query, i) => (
              <button
                key={i}
                onClick={() => onSelectSuggestion(query)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer active:scale-95"
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

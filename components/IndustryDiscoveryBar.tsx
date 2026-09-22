'use client';

import React from 'react';
import { Locale, IndustryVertical, TenderFilterParams, TenderStats } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface IndustryDiscoveryBarProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  stats?: TenderStats;
  locale: Locale;
}

export const IndustryDiscoveryBar: React.FC<IndustryDiscoveryBarProps> = ({
  filters,
  onFilterChange,
  stats,
  locale,
}) => {
  const currentIndustry = filters.industry || 'all';
  const industryCounts = stats?.industryCounts || {};

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            {locale === 'mn' ? 'Танай байгууллага юу нийлүүлдэг вэ?' : 'What does your company supply?'}
          </h2>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            {locale === 'mn' ? '— Салбараа сонгон тохирох нээлттэй тендерүүдийг 1 товшилтоор олно уу' : '— 1-click industry discovery'}
          </span>
        </div>

        {currentIndustry !== 'all' && (
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto flex items-center gap-1"
          >
            <span>{locale === 'mn' ? 'Бүх салбарыг харах' : 'View All Industries'}</span>
            <span className="text-slate-400 font-normal">✕</span>
          </button>
        )}
      </div>

      {/* Industry Pills Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {INDUSTRIES.map((ind) => {
          const isSelected = currentIndustry === ind.id;
          const count = industryCounts[ind.id] || 0;

          return (
            <button
              key={ind.id}
              onClick={() => onFilterChange({ industry: isSelected ? 'all' : ind.id, sortBy: 'date_desc', page: 1 })}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">{ind.icon}</span>
                {isSelected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
                {!isSelected && count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 tabular-nums">
                    {count}
                  </span>
                )}
              </div>

              <div>
                <span className={`text-[11px] font-semibold line-clamp-1 block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {locale === 'mn' ? ind.labelMn.split('&')[0].trim() : ind.labelEn.split('&')[0].trim()}
                </span>
                <span className={`text-[10px] line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {locale === 'mn' ? ind.labelMn.split('&')[1]?.trim() || 'Тендерүүд' : ind.labelEn.split('&')[1]?.trim() || 'Tenders'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

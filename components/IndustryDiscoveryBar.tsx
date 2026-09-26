'use client';

import React from 'react';
import { Locale, TenderFilterParams, TenderStats } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
import { IndustryIcon } from '@/components/IndustryIcon';
import { Layers, X } from 'lucide-react';

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
  const statsByIndustry = stats?.statsByIndustry || {};

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 px-3 py-2 shadow-2xs flex items-center gap-2 overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0 pr-2 border-r border-slate-200">
        <Layers className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden sm:inline">{locale === 'mn' ? 'Салбар:' : 'Sector:'}</span>
      </div>

      {/* Horizontal Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full">
        {/* All Sectors Option */}
        <button
          onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
          className={`h-7 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
            currentIndustry === 'all'
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Layers className="h-3 w-3" />
          <span>{locale === 'mn' ? 'Бүх салбар' : 'All Sectors'}</span>
        </button>

        {INDUSTRIES.map((ind) => {
          const isSelected = currentIndustry === ind.id;
          const indStat = statsByIndustry[ind.id];
          const activeCount = indStat?.activeCount || industryCounts[ind.id] || ind.activeCount || 0;

          return (
            <button
              key={ind.id}
              onClick={() => onFilterChange({ industry: isSelected ? 'all' : ind.id, sortBy: 'date_desc', page: 1 })}
              className={`h-7 px-2.5 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs ring-1 ring-blue-500'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300 font-medium'
              }`}
            >
              <IndustryIcon id={ind.id} className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
              <span>{locale === 'mn' ? ind.labelMn : ind.labelEn}</span>
              {activeCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums font-semibold ${
                    isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {activeCount}
                </span>
              )}
              {isSelected && <X className="h-3 w-3 ml-0.5 text-blue-200 hover:text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

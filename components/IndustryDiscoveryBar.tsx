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
  const selectedIndustryObj = INDUSTRIES.find(i => i.id === currentIndustry);

  const statsByIndustry = stats?.statsByIndustry || {};

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
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto flex items-center gap-1 cursor-pointer"
          >
            <span>{locale === 'mn' ? 'Бүх салбарыг харах' : 'View All Industries'}</span>
            <span className="text-slate-400 font-normal">✕</span>
          </button>
        )}
      </div>

      {/* Active Filter Helper Banner */}
      {currentIndustry !== 'all' && selectedIndustryObj && (
        <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/80 rounded-lg px-3 py-1.5 text-xs text-blue-900">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">{locale === 'mn' ? 'Идэвхтэй салбар:' : 'Active Industry:'}</span>
            <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-semibold px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
              <span>{selectedIndustryObj.icon}</span>
              <span>{locale === 'mn' ? selectedIndustryObj.labelMn : selectedIndustryObj.labelEn}</span>
            </span>
          </div>
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Шүүлтүүр арилгах' : 'Clear'}</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Industry Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {INDUSTRIES.map((ind) => {
          const isSelected = currentIndustry === ind.id;
          const indStat = statsByIndustry[ind.id];
          const activeCount = indStat?.activeCount || industryCounts[ind.id] || ind.activeCount || 0;
          const totalCount = indStat?.totalCount || ind.totalCount || 0;

          return (
            <button
              key={ind.id}
              onClick={() => onFilterChange({ industry: isSelected ? 'all' : ind.id, sortBy: 'date_desc', page: 1 })}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                  : 'bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg">{ind.icon}</span>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-blue-700 shadow-2xs tabular-nums">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{activeCount} {locale === 'mn' ? 'идэвхтэй' : 'live'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 tabular-nums group-hover:bg-emerald-100 transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{activeCount} {locale === 'mn' ? 'нээлттэй' : 'live'}</span>
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className={`text-[11px] font-bold line-clamp-1 block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {locale === 'mn' ? ind.labelMn.split('&')[0].trim() : ind.labelEn.split('&')[0].trim()}
                </span>
                <div className={`text-[10px] font-medium flex items-center justify-between gap-1 tabular-nums ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  <span className="line-clamp-1 opacity-90">
                    {locale === 'mn' ? ind.labelMn.split('&')[1]?.trim() || 'Салбар' : ind.labelEn.split('&')[1]?.trim() || 'Sector'}
                  </span>
                  <span className={`font-semibold shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-600'}`}>
                    {totalCount.toLocaleString()} {locale === 'mn' ? 'нийт' : 'total'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

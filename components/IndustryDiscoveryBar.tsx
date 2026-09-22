'use client';

import React from 'react';
import { Locale, IndustryVertical, TenderFilterParams, TenderStats } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
import { Sparkles, CheckCircle2, Layers } from 'lucide-react';

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
  const selectedIndustryObj = INDUSTRIES.find((i) => i.id === currentIndustry);
  const statsByIndustry = stats?.statsByIndustry || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shadow-2xs">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {locale === 'mn' ? 'Танай байгууллага юу нийлүүлдэг вэ?' : 'What does your company supply?'}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 hidden sm:inline-block">
                {locale === 'mn' ? '9 чиглэл' : '9 sectors'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              {locale === 'mn'
                ? 'Салбараа сонгон тохирох нээлттэй тендерүүд болон томоохон худалдан авагчдыг 1 товшилтоор олно уу'
                : 'Select your sector to discover live tenders and matching procuring enterprises in 1 click'}
            </p>
          </div>
        </div>

        {currentIndustry !== 'all' && (
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg"
          >
            <span>{locale === 'mn' ? 'Бүх салбарыг харах' : 'View All Sectors'}</span>
            <span className="text-blue-400 font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Active Filter Helper Banner */}
      {currentIndustry !== 'all' && selectedIndustryObj && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/80 rounded-xl px-3.5 py-2 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              {locale === 'mn' ? 'Сонгосон салбар:' : 'Active Sector:'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold px-3 py-0.5 rounded-full text-[11px] shadow-2xs">
              <span>{selectedIndustryObj.icon}</span>
              <span>{locale === 'mn' ? selectedIndustryObj.labelMn : selectedIndustryObj.labelEn}</span>
            </span>
          </div>
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Шүүлтүүр арилгах' : 'Clear'}</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Modern High-Performance Industry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        {INDUSTRIES.map((ind) => {
          const isSelected = currentIndustry === ind.id;
          const indStat = statsByIndustry[ind.id];
          const activeCount = indStat?.activeCount || industryCounts[ind.id] || ind.activeCount || 0;
          const totalCount = indStat?.totalCount || ind.totalCount || 0;

          return (
            <button
              key={ind.id}
              onClick={() => onFilterChange({ industry: isSelected ? 'all' : ind.id, sortBy: 'date_desc', page: 1 })}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all duration-150 relative overflow-hidden group cursor-pointer select-none ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40 -translate-y-0.5'
                  : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-blue-300 hover:shadow-xs hover:-translate-y-0.5'
              }`}
            >
              {/* Header: Icon + Live Count Badge */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform group-hover:scale-105 ${
                    isSelected ? 'bg-white/20' : 'bg-slate-100 shadow-2xs'
                  }`}
                >
                  {ind.icon}
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-blue-700 shadow-2xs tabular-nums">
                    <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>{activeCount} {locale === 'mn' ? 'нээлттэй' : 'live'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums group-hover:bg-emerald-100/80 transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>{activeCount} {locale === 'mn' ? 'нээлттэй' : 'live'}</span>
                  </span>
                )}
              </div>

              {/* Body: Primary & Secondary Labels */}
              <div className="space-y-0.5 min-w-0">
                <h3
                  className={`text-xs font-bold leading-snug line-clamp-1 transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'
                  }`}
                  title={locale === 'mn' ? ind.labelMn : ind.labelEn}
                >
                  {locale === 'mn' ? ind.labelMn.split('&')[0].trim() : ind.labelEn.split('&')[0].trim()}
                </h3>
                <p
                  className={`text-[10px] font-medium leading-snug line-clamp-1 ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {locale === 'mn' ? ind.labelMn.split('&')[1]?.trim() || 'Салбар' : ind.labelEn.split('&')[1]?.trim() || 'Sector'}
                </p>
              </div>

              {/* Footer: True Historical Archive Volume */}
              <div
                className={`pt-1.5 border-t flex items-center justify-between text-[10px] tabular-nums font-mono ${
                  isSelected ? 'border-white/20 text-blue-100' : 'border-slate-100 text-slate-500'
                }`}
              >
                <span className={isSelected ? 'text-blue-200' : 'text-slate-400 font-sans'}>
                  {locale === 'mn' ? 'Нийт сан:' : 'Archive:'}
                </span>
                <strong className={`font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                  {totalCount.toLocaleString()}
                </strong>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};


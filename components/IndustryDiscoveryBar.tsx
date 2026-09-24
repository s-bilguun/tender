'use client';

import React from 'react';
import { Locale, TenderFilterParams, TenderStats } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
import { Sparkles, CheckCircle2, Layers, ArrowUpRight, X } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {locale === 'mn' ? 'Танай байгууллага юу нийлүүлдэг вэ?' : 'What does your company supply?'}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {locale === 'mn' ? '9 үндсэн салбар' : '9 core sectors'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === 'mn'
                ? 'Өөрийн нийлүүлдэг бараа, ажил үйлчилгээний чиглэлээ сонгож нээлттэй тендерүүдийг 1 товшилтоор шүүнэ үү'
                : 'Select your industry vertical to discover relevant open tenders and matching buyers in 1 click'}
            </p>
          </div>
        </div>

        {currentIndustry !== 'all' && (
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl shrink-0"
          >
            <span>{locale === 'mn' ? 'Бүх салбарыг харах' : 'View All Sectors'}</span>
            <X className="h-3.5 w-3.5 text-blue-500" />
          </button>
        )}
      </div>

      {/* Active Filter Helper Banner */}
      {currentIndustry !== 'all' && selectedIndustryObj && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              {locale === 'mn' ? 'Сонгосон салбар:' : 'Active Sector:'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-2xs">
              <span>{selectedIndustryObj.icon}</span>
              <span>{locale === 'mn' ? selectedIndustryObj.labelMn : selectedIndustryObj.labelEn}</span>
            </span>
          </div>
          <button
            onClick={() => onFilterChange({ industry: 'all', sortBy: 'date_desc', page: 1 })}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Шүүлтүүр арилгах' : 'Clear'}</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3x3 Balanced & Legible Industry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 flex-1">
        {INDUSTRIES.map((ind) => {
          const isSelected = currentIndustry === ind.id;
          const indStat = statsByIndustry[ind.id];
          const activeCount = indStat?.activeCount || industryCounts[ind.id] || ind.activeCount || 0;
          const totalCount = indStat?.totalCount || ind.totalCount || 0;

          return (
            <button
              key={ind.id}
              onClick={() => onFilterChange({ industry: isSelected ? 'all' : ind.id, sortBy: 'date_desc', page: 1 })}
              className={`p-3 sm:p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all duration-150 relative overflow-hidden group cursor-pointer select-none ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50 -translate-y-0.5'
                  : 'bg-white hover:bg-slate-50/80 text-slate-800 border-slate-200/90 hover:border-blue-300 hover:shadow-xs hover:-translate-y-0.5'
              }`}
            >
              {/* Top Row: Icon + Title + Live Badge */}
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-lg transition-transform group-hover:scale-105 shrink-0 ${
                      isSelected ? 'bg-white/20' : 'bg-slate-100 shadow-2xs'
                    }`}
                  >
                    {ind.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-xs sm:text-[13px] font-bold leading-tight transition-colors line-clamp-1 ${
                        isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'
                      }`}
                      title={locale === 'mn' ? ind.labelMn : ind.labelEn}
                    >
                      {locale === 'mn' ? ind.labelMn : ind.labelEn}
                    </h3>
                  </div>
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-blue-700 shadow-2xs tabular-nums shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>{activeCount} {locale === 'mn' ? 'нээлттэй' : 'live'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums group-hover:bg-emerald-100 transition-colors shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>{activeCount} {locale === 'mn' ? 'нээлттэй' : 'live'}</span>
                  </span>
                )}
              </div>

              {/* Middle: Rich Scope / Keywords Description */}
              <p
                className={`text-[11px] leading-relaxed line-clamp-2 ${
                  isSelected ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                {locale === 'mn' ? ind.descriptionMn : ind.descriptionEn}
              </p>

              {/* Footer: Historical Archive Count + Action Prompt */}
              <div
                className={`pt-2 border-t flex items-center justify-between text-xs tabular-nums ${
                  isSelected ? 'border-white/20 text-blue-100' : 'border-slate-100 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={isSelected ? 'text-blue-200' : 'text-slate-400'}>
                    {locale === 'mn' ? 'Нийт бүртгэгдсэн сан:' : 'Total Archive:'}
                  </span>
                  <strong className={`font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {totalCount.toLocaleString()} {locale === 'mn' ? 'тендер' : 'bids'}
                  </strong>
                </div>

                <span
                  className={`text-[11px] font-semibold flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5 ${
                    isSelected ? 'text-white' : 'text-blue-600'
                  }`}
                >
                  <span>{isSelected ? (locale === 'mn' ? 'Сонгогдсон' : 'Active') : (locale === 'mn' ? 'Шүүх' : 'Filter')}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

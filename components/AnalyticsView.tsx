'use client';

import React from 'react';
import { TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { BarChart2, PieChart, Landmark, TrendingUp, Building } from 'lucide-react';

interface AnalyticsViewProps {
  stats: TenderStats;
  locale: Locale;
  onFilterByCompany?: (companyName: string) => void;
  onFilterByIndustry?: (industryId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  locale,
  onFilterByCompany,
  onFilterByIndustry,
}) => {
  const t = getTranslation(locale);

  const formatBudget = (amount?: number | null) => {
    if (amount == null) return '—';
    if (amount === 0) return '0 ₮';
    if (amount >= 1_000_000_000_000) {
      return locale === 'mn'
        ? `${(amount / 1_000_000_000_000).toFixed(2)} их наяд ₮`
        : `₮${(amount / 1_000_000_000_000).toFixed(2)}T`;
    }
    if (amount >= 1_000_000_000) {
      return locale === 'mn'
        ? `${(amount / 1_000_000_000).toFixed(2)} тэрбум ₮`
        : `₮${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    return locale === 'mn'
      ? `${(amount / 1_000_000).toFixed(1)} сая ₮`
      : `₮${(amount / 1_000_000).toFixed(1)}M`;
  };

  const totalCategories =
    (stats.categoryCounts?.product ?? 0) +
    (stats.categoryCounts?.job ?? 0) +
    (stats.categoryCounts?.service ?? 0);

  const prodCount = stats.categoryCounts?.product ?? 0;
  const jobCount = stats.categoryCounts?.job ?? 0;
  const servCount = stats.categoryCounts?.service ?? 0;

  const productPct = totalCategories ? Math.round((prodCount / totalCategories) * 100) : 0;
  const jobPct = totalCategories ? Math.round((jobCount / totalCategories) * 100) : 0;
  const servicePct = totalCategories ? Math.max(0, 100 - productPct - jobPct) : 0;

  const maxMinistryBudget = stats.topMinistries.length > 0
    ? Math.max(...stats.topMinistries.map(m => m.budget ?? 0))
    : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-2xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {locale === 'mn' ? 'Худалдан авах ажиллагааны зах зээлийн нэгдсэн статистик' : 'Procurement Market Analytics'}
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">tender.gov.mn бодит өгөгдөл</span>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium block mb-1">
            {locale === 'mn' ? 'Нийт бүртгэгдсэн төсөв' : 'Total Tracked Budget'}
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatBudget(stats.totalBudgetSum)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {stats.totalBudgetSum == null
              ? (locale === 'mn' ? 'Зарим төсөв тодорхойгүй тул нийлбэрийг харуулахгүй.' : 'Some budgets are unknown, so the total is hidden.')
              : (locale === 'mn' ? 'Өгөгдлийн сангийн хадгалсан мөрүүд' : 'Stored tender records')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium block mb-1">
            {locale === 'mn' ? 'Идэвхтэй нээлттэй тендер' : 'Active Live Bids'}
          </span>
          <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
            {stats.activeTendersCount.toLocaleString()}{' '}
            <span className="text-xs text-slate-500 font-normal">тендер</span>
          </div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
            Одоогоор санал хүлээн авч буй
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium block mb-1">
            {locale === 'mn' ? 'Дундаж төсөвт өртөг' : 'Average Tender Budget'}
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatBudget(stats.totalBudgetSum != null && stats.totalCount > 0 ? stats.totalBudgetSum / stats.totalCount : null)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {stats.totalBudgetSum == null
              ? (locale === 'mn' ? 'Төсөв бүрэн тодорхой үед дундажийг харуулна.' : 'Average shown when all budgets are known.')
              : (locale === 'mn' ? 'Нэг тендерт ногдох хэмжээ' : 'Average per tender')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Category Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-blue-600" />
              <span>{locale === 'mn' ? 'Тендерийн ангилал' : 'Category Breakdown'}</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {stats.totalCount.toLocaleString()} нийт
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-2xs">
            <div
              style={{ width: `${productPct}%` }}
              className="bg-blue-600 transition-all"
              title={`Бараа: ${productPct}% (${prodCount.toLocaleString()})`}
            />
            <div
              style={{ width: `${jobPct}%` }}
              className="bg-amber-500 transition-all"
              title={`Ажил: ${jobPct}% (${jobCount.toLocaleString()})`}
            />
            <div
              style={{ width: `${servicePct}%` }}
              className="bg-emerald-600 transition-all"
              title={`Үйлчилгээ: ${servicePct}% (${servCount.toLocaleString()})`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 text-slate-600 text-[11px] mb-0.5">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Бараа</span>
              </div>
              <div className="font-bold text-slate-900 font-mono text-xs tabular-nums">
                {prodCount.toLocaleString()}{' '}
                <span className="text-slate-400 font-normal">({productPct}%)</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 text-slate-600 text-[11px] mb-0.5">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Ажил</span>
              </div>
              <div className="font-bold text-slate-900 font-mono text-xs tabular-nums">
                {jobCount.toLocaleString()}{' '}
                <span className="text-slate-400 font-normal">({jobPct}%)</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-1 text-slate-600 text-[11px] mb-0.5">
                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                <span>Үйлчилгээ</span>
              </div>
              <div className="font-bold text-slate-900 font-mono text-xs tabular-nums">
                {servCount.toLocaleString()}{' '}
                <span className="text-slate-400 font-normal">({servicePct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Spending Entities with relative progress bars */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-blue-600" />
              <span>{locale === 'mn' ? 'Төсвийн хамгийн том захиалагчид' : 'Top Spending Entities'}</span>
            </span>
            <span className="text-slate-400 text-[11px]">Бүртгэгдсэн төсвийн дүнгээр</span>
          </div>

          <div className="space-y-2 text-xs">
            {stats.topMinistries.map((m, idx) => {
              const pct = m.budget == null || maxMinistryBudget <= 0
                ? 0
                : Math.min(100, Math.round((m.budget / maxMinistryBudget) * 100));
              return (
                <div
                  key={idx}
                  onClick={() => onFilterByCompany && onFilterByCompany(m.name)}
                  className="group p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200/80"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-slate-800 font-medium truncate group-hover:text-blue-600 transition-colors">
                      {idx + 1}. {m.name}
                    </span>
                    <span className="font-mono text-slate-900 font-bold shrink-0 tabular-nums text-xs">
                      {formatBudget(m.budget)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-blue-600 rounded-full group-hover:bg-blue-700 transition-all"
                    />
                  </div>
                </div>
              );
            })}
            {stats.topMinistries.length === 0 && (
              <p className="py-3 text-xs text-slate-500">Захиалагчийн төсвийн нэгтгэл хараахан байхгүй.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

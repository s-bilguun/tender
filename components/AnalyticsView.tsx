'use client';

import React from 'react';
import { TenderStats, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { BarChart2, PieChart, Landmark } from 'lucide-react';

interface AnalyticsViewProps {
  stats: TenderStats;
  locale: Locale;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ stats, locale }) => {
  const t = getTranslation(locale);

  const formatBudget = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2)} тэрбум ₮`;
    }
    return `${(amount / 1_000_000).toFixed(1)} сая ₮`;
  };

  const totalCategories = (stats.categoryCounts.product + stats.categoryCounts.job + stats.categoryCounts.service) || 1;
  const productPct = Math.round((stats.categoryCounts.product / totalCategories) * 100);
  const jobPct = Math.round((stats.categoryCounts.job / totalCategories) * 100);
  const servicePct = Math.round((stats.categoryCounts.service / totalCategories) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4 shadow-2xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            {locale === 'mn' ? 'Худалдан авах ажиллагааны ерөнхий үзүүлэлт' : 'Procurement Market Overview'}
          </h2>
        </div>
        <span className="text-xs text-slate-500">tender.gov.mn нээлттэй өгөгдөл</span>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-0.5">
            {locale === 'mn' ? 'Нийт бүртгэгдсэн төсөв' : 'Total Tracked Budget'}
          </span>
          <div className="text-lg font-bold text-slate-900 tabular-nums">
            {formatBudget(stats.totalBudgetSum)}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-0.5">
            {locale === 'mn' ? 'Идэвхтэй тендерүүд' : 'Active Tenders'}
          </span>
          <div className="text-lg font-bold text-slate-900 tabular-nums">
            {stats.activeTendersCount} <span className="text-xs text-slate-500 font-normal">тендер</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 block mb-0.5">
            {locale === 'mn' ? 'Дундаж төсөвт өртөг' : 'Average Tender Budget'}
          </span>
          <div className="text-lg font-bold text-slate-900 tabular-nums">
            {formatBudget(stats.totalCount > 0 ? stats.totalBudgetSum / stats.totalCount : 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Category Breakdown */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-slate-500" />
              <span>{locale === 'mn' ? 'Тендерийн ангилал' : 'Category Distribution'}</span>
            </span>
            <span className="text-slate-500 font-mono">{totalCategories} нийт</span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
            <div style={{ width: `${productPct}%` }} className="bg-blue-600" title={`Бараа: ${productPct}%`} />
            <div style={{ width: `${jobPct}%` }} className="bg-amber-500" title={`Ажил: ${jobPct}%`} />
            <div style={{ width: `${servicePct}%` }} className="bg-emerald-600" title={`Үйлчилгээ: ${servicePct}%`} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-slate-600">Бараа:</span>
              <strong className="text-slate-900">{productPct}%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-600">Ажил:</span>
              <strong className="text-slate-900">{jobPct}%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-slate-600">Үйлчилгээ:</span>
              <strong className="text-slate-900">{servicePct}%</strong>
            </div>
          </div>
        </div>

        {/* Top Spending Entities */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-slate-500" />
              <span>{locale === 'mn' ? 'Төсвийн ерөнхийлөн захирагчид' : 'Top Spending Entities'}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {stats.topMinistries.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 last:border-none">
                <span className="text-slate-700 truncate max-w-[260px]" title={m.name}>
                  {idx + 1}. {m.name}
                </span>
                <span className="font-mono text-slate-900 font-semibold shrink-0 tabular-nums">
                  {formatBudget(m.budget)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { BidRequirementSummary, Locale } from '@/lib/types';
import { CheckCircle2, Circle, AlertCircle, ShieldCheck, FileCheck, HelpCircle } from 'lucide-react';

interface BidReadinessChecklistProps {
  requirements: BidRequirementSummary;
  totalBudget: number;
  locale: Locale;
}

export const BidReadinessChecklist: React.FC<BidReadinessChecklistProps> = ({
  requirements,
  totalBudget,
  locale,
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = requirements.requiredClearances.length;
  const completedCount = checkedIds.size;
  const progressPercent = Math.round((completedCount / (totalItems || 1)) * 100);

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-4">
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            {locale === 'mn' ? '📋 Оролцох шалгуур & Бэлтгэх баримт бичиг' : '📋 Bid Eligibility & Document Checklist'}
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            {locale === 'mn' ? 'Бэлтгэл хангалт:' : 'Readiness:'} <strong className="text-slate-900 tabular-nums">{completedCount}/{totalItems}</strong>
          </span>
          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : progressPercent >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-bold text-[11px] text-slate-700 tabular-nums">{progressPercent}%</span>
        </div>
      </div>

      {/* Guarantee Alert Box */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-3 flex items-start gap-2.5 text-xs text-blue-900">
        <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">
            {locale === 'mn' ? 'Тендерийн баталгааны тооцоолол (1-2%):' : 'Estimated Bid Security (1-2%):'}
          </span>
          <span className="font-mono font-semibold text-blue-800">
            {requirements.estimatedGuaranteeMin.toLocaleString()} ₮ ~ {requirements.estimatedGuaranteeMax.toLocaleString()} ₮
          </span>
          <span className="text-blue-700/80 block mt-0.5 text-[11px]">
            {totalBudget >= 50_000_000
              ? (locale === 'mn' ? 'Арилжааны банкны баталгаа эсвэл даатгалын гэрчилгээг урьдчилан гаргуулна.' : 'Requires commercial bank guarantee or insurance certificate.')
              : (locale === 'mn' ? 'Бага дүнтэй худалдан авалтад хялбаршуулсан баталгааны мэдэгдэл бөглөх боломжтой.' : 'Simplified bid declaration eligible for low thresholds.')}
          </span>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {requirements.requiredClearances.map((item) => {
          const isChecked = checkedIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3 rounded-lg border text-xs transition-all cursor-pointer flex items-start gap-3 select-none ${
                isChecked
                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <button type="button" className="shrink-0 mt-0.5">
                {isChecked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                )}
              </button>

              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold ${isChecked ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                    {locale === 'mn' ? item.nameMn : item.nameEn}
                  </span>
                  {item.isMandatory && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      {locale === 'mn' ? 'Заавал' : 'Mandatory'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {locale === 'mn' ? item.descriptionMn : item.descriptionEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

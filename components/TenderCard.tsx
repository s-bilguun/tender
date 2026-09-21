'use client';

import React from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Building2, Calendar, Sparkles, ExternalLink } from 'lucide-react';

interface TenderCardProps {
  tender: TenderItem;
  locale: Locale;
  onSelect: (tender: TenderItem) => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({
  tender,
  locale,
  onSelect,
  onAskAI,
}) => {
  const t = getTranslation(locale);

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ₮';
    return `${amount.toLocaleString()} ₮`;
  };

  const getCategoryBadge = (code?: string, name?: string) => {
    switch (code) {
      case 'PRODUCT':
        return { label: locale === 'mn' ? 'Бараа' : 'Goods', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'JOB':
        return { label: locale === 'mn' ? 'Ажил' : 'Works', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'SERVICE':
        return { label: locale === 'mn' ? 'Үйлчилгээ' : 'Services', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: name || (locale === 'mn' ? 'Тендер' : 'Tender'), bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const badge = getCategoryBadge(tender.tenderTypeCode, tender.tenderTypeName);

  const calculateDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysLeft(tender.receiveDate || tender.openDate);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between gap-4 group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${badge.bg}`}>
              {badge.label}
            </span>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px]">
              {tender.tenderCode}
            </span>
          </div>

          {daysLeft !== null && daysLeft > 0 ? (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                daysLeft <= 3
                  ? 'text-rose-700 bg-rose-50 border-rose-200 font-bold'
                  : daysLeft <= 7
                  ? 'text-amber-700 bg-amber-50 border-amber-200 font-semibold'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {daysLeft <= 3 ? `⏰ Шуурхай: ${daysLeft} ${t.daysRemaining}` : `${daysLeft} ${t.daysRemaining}`}
            </span>
          ) : daysLeft !== null && daysLeft <= 0 ? (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {t.closed}
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(tender)}
          className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
        >
          {tender.tenderName}
        </h3>

        {/* Procuring Entity */}
        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span className="line-clamp-1">{tender.budgetEntityName}</span>
        </div>
      </div>

      {/* Budget & Timeline */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            {t.budgetLabel}
          </span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {formatCurrency(tender.totalBudget)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            {t.deadline}
          </span>
          <span className="text-xs text-slate-600 font-mono tabular-nums">
            {tender.receiveDate ? tender.receiveDate.substring(0, 10) : 'Тодорхойгүй'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onSelect(tender)}
          className="h-8 rounded-md text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          {t.viewDetails}
        </button>

        <button
          onClick={() => onAskAI(tender)}
          className="h-8 rounded-md text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>{locale === 'mn' ? 'AI шинжилгээ' : 'AI Analysis'}</span>
        </button>
      </div>
    </div>
  );
};

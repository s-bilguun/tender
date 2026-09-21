'use client';

import React from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { ExternalLink, Sparkles, ChevronRight, Clock } from 'lucide-react';

interface TenderTableProps {
  tenders: TenderItem[];
  locale: Locale;
  onSelect: (tender: TenderItem) => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
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

  const calculateDaysLeft = (dateStr?: string) => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-36">{locale === 'mn' ? 'Дугаар' : 'Code'}</th>
              <th className="py-3 px-4 min-w-[280px]">{locale === 'mn' ? 'Тендерийн нэр' : 'Tender Title'}</th>
              <th className="py-3 px-4 min-w-[200px]">{locale === 'mn' ? 'Захиалагч' : 'Procuring Entity'}</th>
              <th className="py-3 px-4 w-28">{locale === 'mn' ? 'Төрөл' : 'Category'}</th>
              <th className="py-3 px-4 text-right w-36">{locale === 'mn' ? 'Төсөвт өртөг' : 'Budget'}</th>
              <th className="py-3 px-4 w-36">{locale === 'mn' ? 'Эцсийн огноо' : 'Deadline'}</th>
              <th className="py-3 px-4 w-28">{locale === 'mn' ? 'Төлөв' : 'Status'}</th>
              <th className="py-3 px-4 text-center w-28">{locale === 'mn' ? 'Үйлдэл' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenders.map((tender) => {
              const badge = getCategoryBadge(tender.tenderTypeCode, tender.tenderTypeName);
              const days = calculateDaysLeft(tender.receiveDate || tender.openDate);

              return (
                <tr
                  key={String(tender.invitationId)}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelect(tender)}
                >
                  {/* Code */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={tender.tenderCode}>
                      {tender.tenderCode}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {tender.tenderName}
                    </div>
                    {tender.positionName && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                        {tender.positionName}
                      </div>
                    )}
                  </td>

                  {/* Procuring Entity */}
                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    <span className="line-clamp-2">{tender.budgetEntityName}</span>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </td>

                  {/* Budget */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-slate-900 tabular-nums">
                    {formatCurrency(tender.totalBudget)}
                  </td>

                  {/* Deadline */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px] tabular-nums">
                    <div>{tender.receiveDate ? tender.receiveDate.substring(0, 10) : 'Тодорхойгүй'}</div>
                    {days !== null && days > 0 ? (
                      <div className="text-[10px] text-emerald-600 font-medium">
                        {days} {t.daysRemaining}
                      </div>
                    ) : days !== null && days <= 0 ? (
                      <div className="text-[10px] text-slate-400 font-medium">
                        {t.closed}
                      </div>
                    ) : null}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {(() => {
                      const s = (tender.docStatusName || '').toLowerCase();
                      const style = s.includes('хүлээн авч')
                        ? { dot: 'bg-emerald-500', cls: 'text-emerald-700 bg-emerald-50/80 border-emerald-200' }
                        : s.includes('нээгдсэн')
                        ? { dot: 'bg-amber-500', cls: 'text-amber-700 bg-amber-50/80 border-amber-200' }
                        : s.includes('үр дүн')
                        ? { dot: 'bg-blue-500', cls: 'text-blue-700 bg-blue-50/80 border-blue-200' }
                        : s.includes('хүчингүй')
                        ? { dot: 'bg-rose-500', cls: 'text-rose-700 bg-rose-50/80 border-rose-200' }
                        : { dot: 'bg-slate-400', cls: 'text-slate-700 bg-slate-100 border-slate-200' };

                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded font-medium border ${style.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {tender.docStatusName || 'Хүлээн авч буй'}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onAskAI(tender)}
                        className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors"
                        title={locale === 'mn' ? 'AI шинжилгээ' : 'AI Analysis'}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>

                      <a
                        href={`https://user.tender.gov.mn/mn/supplier/available/${tender.invitationId}/detail`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                        title={locale === 'mn' ? 'Tender.gov.mn дээр нээх' : 'Open in tender.gov.mn'}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

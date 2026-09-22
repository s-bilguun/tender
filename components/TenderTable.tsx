'use client';

import React from 'react';
import Link from 'next/link';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { ExternalLink, Sparkles, Star } from 'lucide-react';

interface TenderTableProps {
  tenders: TenderItem[];
  locale: Locale;
  savedIds?: Set<string | number>;
  onToggleSave?: (tenderId: string | number) => void;
  onSelect: (tender: TenderItem) => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  locale,
  savedIds,
  onToggleSave,
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
        <table className="w-full text-left text-xs table-auto">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-2 w-[36px] text-center"></th>
              <th className="py-2.5 px-3 min-w-[260px]">{locale === 'mn' ? 'Тендерийн нэр & дугаар' : 'Tender Title & Code'}</th>
              <th className="py-2.5 px-3 w-[200px] hidden md:table-cell">{locale === 'mn' ? 'Захиалагч' : 'Procuring Entity'}</th>
              <th className="py-2.5 px-3 w-[85px]">{locale === 'mn' ? 'Төрөл' : 'Category'}</th>
              <th className="py-2.5 px-3 text-right w-[130px]">{locale === 'mn' ? 'Төсөвт өртөг' : 'Budget'}</th>
              <th className="py-2.5 px-3 w-[125px] hidden sm:table-cell">{locale === 'mn' ? 'Эцсийн огноо' : 'Deadline'}</th>
              <th className="py-2.5 px-3 w-[135px]">{locale === 'mn' ? 'Төлөв' : 'Status'}</th>
              <th className="py-2.5 px-3 text-center w-[85px]">{locale === 'mn' ? 'Үйлдэл' : 'Action'}</th>
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
                  {/* Star Watchlist */}
                  <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    {onToggleSave && (
                      <button
                        onClick={() => onToggleSave(tender.invitationId)}
                        className={`p-1 rounded transition-colors ${
                          savedIds?.has(tender.invitationId) || savedIds?.has(String(tender.invitationId))
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                        }`}
                        title={locale === 'mn' ? 'Хяналтад авах' : 'Save to watchlist'}
                      >
                        <Star className={`h-3.5 w-3.5 ${
                          savedIds?.has(tender.invitationId) || savedIds?.has(String(tender.invitationId)) ? 'fill-amber-500' : ''
                        }`} />
                      </button>
                    )}
                  </td>

                  {/* Title & Code Combined */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 font-medium"
                        title={tender.tenderCode}
                      >
                        {tender.tenderCode || tender.invitationNumber}
                      </span>
                      {tender.positionName && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {tender.positionName}
                        </span>
                      )}
                    </div>
                    <Link 
                      href={`/tender/${tender.invitationId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-slate-900 line-clamp-2 leading-snug hover:text-blue-600 transition-colors block"
                    >
                      {tender.tenderName}
                    </Link>
                    {/* On mobile, show entity under title */}
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 md:hidden">
                      {tender.budgetEntityName}
                    </div>
                  </td>

                  {/* Procuring Entity */}
                  <td className="py-2.5 px-3 text-slate-600 text-[11px] hidden md:table-cell">
                    <span className="line-clamp-2 leading-snug">{tender.budgetEntityName}</span>
                  </td>

                  {/* Category */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </td>

                  {/* Budget */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-900 tabular-nums">
                    {formatCurrency(tender.totalBudget)}
                  </td>

                  {/* Deadline */}
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px] tabular-nums hidden sm:table-cell">
                    <div>{tender.receiveDate ? tender.receiveDate.substring(0, 10) : 'Тодорхойгүй'}</div>
                    {days !== null && days > 0 ? (
                      <div
                        className={`text-[10px] font-semibold ${
                          days <= 3
                            ? 'text-rose-600 font-bold'
                            : days <= 7
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {days <= 3 ? `⏰ Шуурхай: ${days} ${t.daysRemaining}` : `${days} ${t.daysRemaining}`}
                      </div>
                    ) : days !== null && days <= 0 ? (
                      <div className="text-[10px] text-slate-400 font-medium">
                        {t.closed}
                      </div>
                    ) : null}
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
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

                      const isConcluded = s.includes('үр дүн');
                      const fallbackStatus = tender.receiveDate && new Date(tender.receiveDate) < new Date() ? 'Хугацаа дууссан' : 'Хүлээн авч буй';
                      const label = isConcluded ? `🏆 ${tender.docStatusName}` : (tender.docStatusName || fallbackStatus);

                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded font-medium border ${style.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          <span className="truncate max-w-[120px]">{label}</span>
                        </span>
                      );
                    })()}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onAskAI(tender)}
                        className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-colors"
                        title={locale === 'mn' ? 'AI шинжилгээ' : 'AI Analysis'}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>

                      <a
                        href={`https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                        title={locale === 'mn' ? 'tender.gov.mn дээр үзэх' : 'Open in tender.gov.mn'}
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

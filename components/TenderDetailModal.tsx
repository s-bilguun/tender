'use client';

import React, { useState } from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { X, ExternalLink, Sparkles, Building2, Calendar, ShieldCheck, Tag, FileText, Copy, Check } from 'lucide-react';

interface TenderDetailModalProps {
  tender: TenderItem | null;
  locale: Locale;
  onClose: () => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({
  tender,
  locale,
  onClose,
  onAskAI,
}) => {
  if (!tender) return null;
  const t = getTranslation(locale);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ₮';
    return `${amount.toLocaleString()} ₮`;
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = tender.tenderCode || tender.invitationNumber || '';
    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const publicLink = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;
  const supplierLink = `https://user.tender.gov.mn/mn/supplier/available/${tender.invitationId}/detail`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                <span>{tender.tenderCode || tender.invitationNumber}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Хуулах"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <span className="font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {tender.tenderTypeName || 'Тендер'}
              </span>
              <span className="font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {tender.docStatusName || 'Идэвхтэй'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {tender.tenderName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Key Financial Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] uppercase font-semibold text-slate-500 block mb-1">
                {t.budgetLabel}
              </span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(tender.totalBudget)}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-slate-500 block mb-1">
                {locale === 'mn' ? 'Тухайн онд санхүүжих' : 'Current Year Budget'}
              </span>
              <span className="text-base font-semibold text-slate-700 font-mono tabular-nums">
                {formatCurrency(tender.yearBudget || tender.totalBudget)}
              </span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-xs">
            <h4 className="text-xs uppercase font-semibold text-slate-500">
              {locale === 'mn' ? 'Үндсэн мэдээлэл' : 'Procurement Details'}
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="grid grid-cols-3 p-3 gap-2">
                <span className="text-slate-500">{t.procuringEntity}</span>
                <span className="col-span-2 text-slate-900 font-medium">{tender.budgetEntityName}</span>
              </div>

              {tender.positionName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.ministryGovernor}</span>
                  <span className="col-span-2 text-slate-900 font-medium">{tender.positionName}</span>
                </div>
              )}

              {tender.ruleName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.procurementMethod}</span>
                  <span className="col-span-2 text-slate-800 font-medium">{tender.ruleName}</span>
                </div>
              )}

              {tender.fundName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.fundingSource}</span>
                  <span className="col-span-2 text-slate-800 font-medium">{tender.fundName}</span>
                </div>
              )}

              {tender.registrationNumber && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">Регистрийн дугаар</span>
                  <span className="col-span-2 text-slate-800 font-mono">{tender.registrationNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timelines */}
          <div className="space-y-2 text-xs">
            <h4 className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{locale === 'mn' ? 'Хугацааны хуваарь' : 'Timeline'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">
                  {locale === 'mn' ? 'Зарласан огноо' : 'Published Date'}
                </span>
                <span className="font-mono text-xs text-slate-800 font-medium">
                  {tender.publishDate || tender.actionDate || 'Тодорхойгүй'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">
                  {t.deadline}
                </span>
                <span className="font-mono text-xs text-blue-700 font-bold">
                  {tender.receiveDate || tender.openDate || 'Тодорхойгүй'}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Guarantee & Performance Bond Calculator */}
          {tender.totalBudget > 0 && (
            <div className="space-y-2 text-xs">
              <h4 className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>{locale === 'mn' ? 'Хуулийн дагуу тооцоолсон баталгааны хэмжээ' : 'Calculated Bid Securities'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] text-blue-700 font-medium block mb-0.5">
                    {locale === 'mn' ? 'Тендерийн баталгаа (1%)' : 'Bid Security (1%)'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {formatCurrency(Math.round(tender.totalBudget * 0.01))}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] text-blue-700 font-medium block mb-0.5">
                    {locale === 'mn' ? 'Тендерийн баталгаа (2%)' : 'Bid Security (2%)'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {formatCurrency(Math.round(tender.totalBudget * 0.02))}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 font-medium block mb-0.5">
                    {locale === 'mn' ? 'Гүйцэтгэлийн баталгаа (5%)' : 'Performance Bond (5%)'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {formatCurrency(Math.round(tender.totalBudget * 0.05))}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Төрийн болон орон нутгийн өмчийн хөрөнгөөр бараа, ажил, үйлчилгээ худалдан авах тухай хуулийн дагуу тооцов.
              </p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white sticky bottom-0">
          <button
            onClick={() => {
              onClose();
              onAskAI(tender);
            }}
            className="h-9 w-full sm:w-auto px-3.5 rounded-md text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{locale === 'mn' ? 'AI шинжээчээр дүгнүүлэх' : 'Analyze with AI'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 flex-1 sm:flex-initial px-3.5 rounded-md text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              title="tender.gov.mn албан ёсны зарлал үзэх"
            >
              <span>{locale === 'mn' ? 'Албан ёсны зарлал' : 'Official Notice'}</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>

            <a
              href={supplierLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 flex-1 sm:flex-initial px-3.5 rounded-md text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              title="Ханган нийлүүлэгчийн системээр санал илгээх"
            >
              <span>{t.directApply}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Building2, Sparkles, ExternalLink, Star, Clock, AlertTriangle } from 'lucide-react';

interface TenderCardProps {
  tender: TenderItem;
  locale: Locale;
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onSelect?: (tender: TenderItem) => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({
  tender,
  locale,
  isSaved = false,
  onToggleSave,
  onSelect,
  onAskAI,
}) => {
  const router = useRouter();
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

  const calculateUrgency = (dateStr?: string) => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = deadline - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      return { status: 'closed', label: t.closed, color: 'bg-slate-100 text-slate-500 border-slate-200', isUrgent: false };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'mn' ? `🚨 ${diffHours} цаг үлдсэн` : `🚨 ${diffHours}h left`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold animate-pulse',
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'mn' ? `⏰ ${diffDays} өдөр үлдсэн` : `⏰ ${diffDays} days left`,
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        isUrgent: true,
      };
    }
    if (diffDays <= 7) {
      return {
        status: 'closing',
        label: locale === 'mn' ? `⏳ ${diffDays} өдөр үлдсэн` : `⏳ ${diffDays} days left`,
        color: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
        isUrgent: false,
      };
    }
    return {
      status: 'active',
      label: locale === 'mn' ? `🟢 ${diffDays} өдөр үлдсэн` : `🟢 ${diffDays} days left`,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      isUrgent: false,
    };
  };

  const urgency = calculateUrgency(tender.receiveDate || tender.openDate);

  const getStatusBadge = () => {
    const s = (tender.docStatusName || '').toLowerCase();
    if (s.includes('үр дүн')) {
      return {
        label: '🏆 Үр дүн гарсан',
        color: 'bg-blue-50 text-blue-700 border-blue-300 font-semibold',
      };
    }
    if (s.includes('нээгдсэн')) {
      return {
        label: '🟡 Нээгдсэн',
        color: 'bg-amber-50 text-amber-700 border-amber-300 font-medium',
      };
    }
    if (s.includes('хүчингүй')) {
      return {
        label: '🔴 Хүчингүй',
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-medium',
      };
    }
    return urgency;
  };

  const statusBadge = getStatusBadge();
  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;

  return (
    <div
      onClick={() => (onSelect ? onSelect(tender) : router.push(`/tender/${tender.invitationId}`))}
      className={`bg-white border rounded-xl p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col justify-between gap-4 group relative cursor-pointer hover:border-blue-300 ${
        urgency?.isUrgent ? 'border-rose-300 hover:border-rose-400 ring-1 ring-rose-200/50' : 'border-slate-200'
      }`}
    >
      <div>
        {/* Top Badges & Watchlist Star */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tender.industryName && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {tender.industryName.split('&')[0].trim()}
              </span>
            )}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${badge.bg}`}>
              {badge.label}
            </span>
            <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[150px]">
              {tender.tenderCode || tender.invitationNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {statusBadge && (
              <span className={`text-[11px] px-2 py-0.5 rounded border whitespace-nowrap ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            )}
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(tender.invitationId);
                }}
                className={`p-1 rounded-md transition-colors ${
                  isSaved
                    ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                }`}
                title={isSaved ? (locale === 'mn' ? 'Хянахаа болих' : 'Remove from watchlist') : (locale === 'mn' ? 'Хяналтад авах' : 'Save to watchlist')}
              >
                <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(tender);
            else router.push(`/tender/${tender.invitationId}`);
          }}
          className="text-sm font-semibold text-slate-900 text-left group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug block cursor-pointer"
        >
          {tender.tenderName}
        </button>

        {/* Procuring Entity */}
        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span className="line-clamp-1">{tender.budgetEntityName}</span>
        </div>
      </div>

      {/* Budget & Deadline Urgency Bar */}
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
          <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1 justify-end">
            <Clock className="h-2.5 w-2.5 text-slate-400" />
            {t.deadline}
          </span>
          <span className="text-xs text-slate-700 font-mono font-medium tabular-nums">
            {tender.receiveDate ? tender.receiveDate.substring(0, 16) : 'Тодорхойгүй'}
          </span>
        </div>
      </div>

      {/* Action Buttons: 1. View 2. AI Audit, 3. Bid Now ↗ */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(tender);
            else router.push(`/tender/${tender.invitationId}`);
          }}
          className="h-8 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs"
        >
          {locale === 'mn' ? 'Үзэх' : 'View'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAskAI(tender);
          }}
          className="h-8 rounded-lg text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors flex items-center justify-center gap-1"
          title={locale === 'mn' ? 'AI-аар шалгуур, шаардлага шинжлэх' : 'AI tender analysis'}
        >
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>AI</span>
        </button>

        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="h-8 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-2xs"
          title={locale === 'mn' ? 'tender.gov.mn дээр оролцох' : 'Apply on tender.gov.mn'}
        >
          <span>{locale === 'mn' ? 'Оролцох' : 'Apply'}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

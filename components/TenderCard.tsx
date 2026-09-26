'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { 
  Building2, Sparkles, ExternalLink, Star, Clock, 
  AlertCircle, Loader2, ShieldCheck, Package, FileText,
  Award, Ban, XCircle, ArrowUpRight
} from 'lucide-react';

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
  onAskAI,
}) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const t = getTranslation(locale);

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ₮';
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2)} ${locale === 'mn' ? 'тэрбум ₮' : 'B ₮'}`;
    }
    if (amount >= 10_000_000) {
      return `${(amount / 1_000_000).toFixed(1)} ${locale === 'mn' ? 'сая ₮' : 'M ₮'}`;
    }
    return `${amount.toLocaleString()} ₮`;
  };

  const getCategoryBadge = (code?: string, name?: string) => {
    switch (code) {
      case 'PRODUCT':
        return { label: locale === 'mn' ? 'Бараа' : 'Goods', bg: 'bg-blue-50 text-blue-700 border-blue-200/80' };
      case 'JOB':
        return { label: locale === 'mn' ? 'Ажил' : 'Works', bg: 'bg-amber-50 text-amber-700 border-amber-200/80' };
      case 'SERVICE':
        return { label: locale === 'mn' ? 'Үйлчилгээ' : 'Services', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' };
      default:
        return { label: name || (locale === 'mn' ? 'Тендер' : 'Tender'), bg: 'bg-slate-50 text-slate-700 border-slate-200/80' };
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
      return { 
        status: 'closed', 
        label: t.closed, 
        color: 'bg-slate-100 text-slate-500 border-slate-200', 
        icon: <Clock className="h-3 w-3 text-slate-400" />,
        isUrgent: false 
      };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'mn' ? `${diffHours} цаг үлдсэн` : `${diffHours}h left`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
        icon: <AlertCircle className="h-3 w-3 text-rose-600 animate-pulse" />,
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'mn' ? `${diffDays} өдөр үлдсэн` : `${diffDays} days left`,
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        icon: <Clock className="h-3 w-3 text-rose-600" />,
        isUrgent: true,
      };
    }
    if (diffDays <= 7) {
      return {
        status: 'closing',
        label: locale === 'mn' ? `${diffDays} өдөр үлдсэн` : `${diffDays} days left`,
        color: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
        icon: <Clock className="h-3 w-3 text-amber-600" />,
        isUrgent: false,
      };
    }
    return {
      status: 'active',
      label: locale === 'mn' ? `${diffDays} өдөр үлдсэн` : `${diffDays} days left`,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      icon: <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />,
      isUrgent: false,
    };
  };

  const urgency = calculateUrgency(tender.receiveDate || tender.openDate);

  const getStatusBadge = () => {
    const s = (tender.docStatusName || '').toLowerCase();
    const code = (tender.docStatusCode || '').toUpperCase();
    if (s.includes('амжилтгүй') || code === 'TENDER_FAILED') {
      return {
        label: locale === 'mn' ? 'Амжилтгүй болсон' : 'Failed',
        color: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
        icon: <XCircle className="h-3 w-3 text-slate-500" />,
      };
    }
    if (s.includes('үр дүн')) {
      return {
        label: tender.docStatusName || (locale === 'mn' ? 'Үр дүн гарсан' : 'Awarded'),
        color: 'bg-blue-50 text-blue-700 border-blue-300 font-semibold',
        icon: <Award className="h-3 w-3 text-blue-600" />,
      };
    }
    if (s.includes('нээгдсэн')) {
      return {
        label: locale === 'mn' ? 'Нээгдсэн' : 'Opened',
        color: 'bg-amber-50 text-amber-700 border-amber-300 font-medium',
        icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />,
      };
    }
    if (s.includes('хүчингүй')) {
      return {
        label: locale === 'mn' ? 'Хүчингүй' : 'Cancelled',
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-medium',
        icon: <Ban className="h-3 w-3 text-rose-600" />,
      };
    }
    return urgency;
  };

  const statusBadge = getStatusBadge();
  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;

  return (
    <div
      onClick={() => {
        setIsNavigating(true);
        router.push(`/tender/${tender.invitationId}`);
      }}
      className={`bg-white border rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col justify-between gap-3.5 group relative cursor-pointer hover:border-slate-400 ${
        isNavigating ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-50/50' : ''
      } ${
        urgency?.isUrgent ? 'border-rose-200 hover:border-rose-300 ring-1 ring-rose-200/40' : 'border-slate-200/90'
      }`}
    >
      {isNavigating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-xl z-20 flex items-center justify-center gap-2 text-xs font-bold text-slate-900 shadow-sm animate-in fade-in duration-150">
          <Loader2 className="h-4 w-4 animate-spin text-slate-800" />
          <span>Тендерийг нээж байна...</span>
        </div>
      )}

      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 font-medium">
            {tender.tenderCode || tender.invitationNumber}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(tender.invitationId)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSaved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
              }`}
              title={locale === 'mn' ? 'Хяналтад авах' : 'Save to watchlist'}
            >
              <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>
          )}

          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title={locale === 'mn' ? 'tender.gov.mn дээр нээх' : 'Open in tender.gov.mn'}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Link
          href={`/tender/${tender.invitationId}`}
          className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-blue-600 transition-colors block cursor-pointer"
        >
          {tender.tenderName}
        </Link>

        {/* Procuring Entity */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{tender.budgetEntityName}</span>
        </div>
      </div>

      {/* Extracted Specs / Goods Pills */}
      {tender.liveBundleSummary && (
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          {tender.liveBundleSummary.topItems && tender.liveBundleSummary.topItems.length > 0 && (
            <div className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{tender.liveBundleSummary.topItems[0].name}</span>
              {tender.liveBundleSummary.topItems[0].qty && (
                <strong className="text-slate-900 font-bold font-mono tabular-nums shrink-0 ml-auto">
                  {tender.liveBundleSummary.topItems[0].qty} {tender.liveBundleSummary.topItems[0].unit || ''}
                </strong>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {tender.liveBundleSummary.isBidSecurityExempt ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>{locale === 'mn' ? 'Баталгаа шаардахгүй' : 'No Bid Bond'}</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">
                {locale === 'mn' ? 'Банкны баталгаатай' : 'Bid security required'}
              </span>
            )}

            {tender.liveBundleSummary.docCount > 0 && (
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 ml-auto">
                <FileText className="h-3 w-3 text-slate-400" />
                <span>{tender.liveBundleSummary.docCount} PDF</span>
                {tender.liveBundleSummary.hasOcr && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">OCR</span>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Financials & Status Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2 mt-auto">
        <div>
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            {locale === 'mn' ? 'Төсөвт өртөг' : 'Budget'}
          </div>
          <div className="font-bold text-slate-900 text-sm sm:text-base tabular-nums font-mono">
            {formatCurrency(tender.totalBudget)}
          </div>
        </div>

        {/* Urgency / Status Pill */}
        {statusBadge && (
          <div className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border shrink-0 ${statusBadge.color}`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </div>
        )}
      </div>

      {/* Card Action Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onAskAI(tender)}
          className="h-7 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>{locale === 'mn' ? 'AI шинжээч' : 'AI Analysis'}</span>
        </button>

        <Link
          href={`/tender/${tender.invitationId}`}
          className="h-7 px-3 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
        >
          <span>{locale === 'mn' ? 'Үзэх' : 'View Details'}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { IndustryIcon } from '@/components/IndustryIcon';
import { 
  Building2, Sparkles, ExternalLink, Star, Clock, 
  Loader2, FileText, ArrowUpRight, ShieldCheck, AlertCircle, Calendar
} from 'lucide-react';

interface TenderCardProps {
  tender: TenderItem;
  locale: Locale;
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onSelect?: (tender: TenderItem) => void;
  onAskAI?: (tender: TenderItem) => void;
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
  const [isNavigating, setIsNavigating] = useState(false);
  const t = getTranslation(locale);

  const formatMNT = (amount: number) => {
    if (!amount) return '₮ 0';
    return `₮ ${amount.toLocaleString()}`;
  };

  const getIndustryDetails = (industryId?: string, typeCode?: string) => {
    switch (industryId) {
      case 'it':
        return { label: 'Мэдээллийн технологи', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'construction':
        return { label: 'Барилга, дэд бүтэц', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'medical':
        return { label: 'Эрүүл мэнд, эм', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'mining':
        return { label: 'Уул уурхай', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'food':
        return { label: 'Хүнс, хоол', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'transport':
        return { label: 'Тээвэр, шатахуун', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'facility':
        return { label: 'Харуул, цэвэрлэгээ', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'stationery':
        return { label: 'Боловсрол, бичиг хэрэг', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { 
          label: typeCode === 'PRODUCT' ? 'Бараа нийлүүлэлт' : typeCode === 'JOB' ? 'Ажил гүйцэтгэл' : 'Үйлчилгээ', 
          color: 'bg-slate-50 text-slate-700 border-slate-200' 
        };
    }
  };

  const industry = getIndustryDetails(tender.industry, tender.tenderTypeCode);

  // Calculate deadline urgency
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
        label: locale === 'mn' ? 'Хугацаа дууссан' : 'Closed', 
        color: 'bg-slate-100 text-slate-500 border-slate-200', 
        iconColor: 'text-slate-400',
        isUrgent: false,
      };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'mn' ? `🚨 ${diffHours} цаг үлдсэн` : `🚨 ${diffHours}h left`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold ring-1 ring-rose-300/60 animate-pulse',
        iconColor: 'text-rose-600',
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'mn' ? `⏳ ${diffDays} хоног үлдсэн` : `⏳ ${diffDays} days left`,
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        iconColor: 'text-rose-600',
        isUrgent: true,
      };
    }
    return {
      status: 'active',
      label: locale === 'mn' ? `${diffDays} хоног үлдсэн` : `${diffDays} days left`,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      iconColor: 'text-emerald-600',
      isUrgent: false,
    };
  };

  const urgency = calculateUrgency(tender.receiveDate || tender.openDate);
  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;

  // PDF Extracted Highlight
  const extractedHighlight = 
    tender.full_scope_of_work || 
    tender.raw_data?.llmExtracted?.full_scope_of_work ||
    (tender.liveBundleSummary?.topItems && tender.liveBundleSummary.topItems.length > 0 
      ? `Тендерийн үндсэн нийлүүлэлт: ${tender.liveBundleSummary.topItems.map(i => i.name).join(', ')}` 
      : '') ||
    'Тендер шалгаруулалтын албан ёсны техникийн тодорхойлолт, ажлын даалгавар хавсаргагдсан.';

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(tender);
    } else {
      setIsNavigating(true);
      router.push(`/tender/${tender.invitationId}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group relative cursor-pointer ${
        urgency?.isUrgent 
          ? 'border-rose-300/80 hover:border-rose-400 ring-1 ring-rose-200/50' 
          : 'border-slate-200/90 hover:border-blue-400'
      }`}
    >
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-2xl z-20 flex items-center justify-center gap-2 text-xs font-bold text-slate-900 shadow-sm animate-in fade-in duration-150">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Тендерийг нээж байна...</span>
        </div>
      )}

      {/* 1. Header: Tender ID, Sector Badge & Urgency Indicator */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Sector & Code */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${industry.color}`}>
              <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3" />
              <span>{industry.label}</span>
            </span>

            <span className="font-mono text-[10px] sm:text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium shrink-0">
              {tender.tenderCode || tender.invitationNumber}
            </span>
          </div>

          {/* Right: Urgency Pill & Quick Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
            {urgency && (
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-md border shrink-0 ${urgency.color}`}>
                <Clock className={`h-3 w-3 ${urgency.iconColor}`} />
                <span>{urgency.label}</span>
              </span>
            )}

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {onToggleSave && (
                <button
                  onClick={() => onToggleSave(tender.invitationId)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSaved ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                  }`}
                  title={locale === 'mn' ? 'Хяналтад авах' : 'Save to watchlist'}
                  aria-label="Bookmark tender"
                >
                  <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                </button>
              )}

              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="tender.gov.mn эх сурвалж дээр нээх"
                aria-label="Open on tender.gov.mn"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 2. Project Title */}
        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {tender.tenderName}
        </h3>

        {/* Procuring Entity / Buyer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{tender.budgetEntityName || 'Тодорхойгүй захиалагч'}</span>
        </div>
      </div>

      {/* 3. Quick Metrics Row (Mobile 2-col, Desktop 3-col) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/70">
        {/* Estimated Budget (Standout) */}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Төсөвт өртөг
          </span>
          <span className="text-sm sm:text-base font-extrabold text-blue-900 tracking-tight font-sans block">
            {formatMNT(Number(tender.totalBudget) || 0)}
          </span>
        </div>

        {/* Published Date */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Нийтэлсэн
          </span>
          <span className="text-xs font-semibold text-slate-700 font-mono block">
            {tender.publishDate ? tender.publishDate.split('T')[0] : '—'}
          </span>
        </div>

        {/* Deadline */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Эцсийн хугацаа
          </span>
          <span className={`text-xs font-bold font-mono block ${urgency?.isUrgent ? 'text-rose-700' : 'text-slate-800'}`}>
            {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
          </span>
        </div>
      </div>

      {/* 4. Extracted PDF Highlight (The Differentiator) */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {extractedHighlight}
        </p>
      </div>

      {/* 5. Footer Actions (Touch-friendly minimum 44px height on mobile) */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {onAskAI && (
          <button
            onClick={() => onAskAI(tender)}
            className="w-full sm:w-auto h-11 sm:h-9 px-3 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="AI Шинжилгээ хийлгэх"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>AI Дүгнэлт</span>
          </button>
        )}

        <button
          onClick={handleCardClick}
          className="w-full sm:flex-1 h-11 sm:h-9 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs group-hover:bg-blue-600 cursor-pointer active:scale-98"
        >
          <span>Дэлгэрэнгүй үзэх</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

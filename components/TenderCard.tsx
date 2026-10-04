'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { IndustryIcon } from '@/components/IndustryIcon';
import { 
  Building2, Sparkles, ExternalLink, Star, Clock, 
  Loader2, Package, ArrowUpRight
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
          label: typeCode === 'PRODUCT' ? 'Бараа' : typeCode === 'JOB' ? 'Ажил' : 'Үйлчилгээ', 
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
        isUrgent: false,
        formattedDate: dateStr.split('T')[0]
      };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'mn' ? `Яаралтай: ${diffHours} цаг үлдсэн` : `${diffHours}h left (Urgent)`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold ring-1 ring-rose-300/60',
        isUrgent: true,
        formattedDate: dateStr.split('T')[0]
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'mn' ? `${diffDays} өдөр үлдсэн` : `${diffDays} days left`,
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        isUrgent: true,
        formattedDate: dateStr.split('T')[0]
      };
    }
    return {
      status: 'active',
      label: locale === 'mn' ? `${diffDays} өдөр үлдсэн` : `${diffDays} days left`,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      isUrgent: false,
      formattedDate: dateStr.split('T')[0]
    };
  };

  const urgency = calculateUrgency(tender.receiveDate || tender.openDate);
  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;

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
      className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative cursor-pointer ${
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

      {/* 1. Header: Badges & Actions */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Sector Badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${industry.color}`}>
              <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3" />
              <span>{industry.label}</span>
            </span>

            {/* Tender Code */}
            <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
              {tender.tenderCode || tender.invitationNumber}
            </span>

            {/* China Bidder Analysis Badge if applicable */}
            {tender.chinaBidderAnalysis?.eligibilityStatus === 'direct_allowed' && (
              <span
                className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300"
                title={locale === 'zh' ? tender.chinaBidderAnalysis.eligibilityExplanationZh : tender.chinaBidderAnalysis.eligibilityExplanationMn}
              >
                {locale === 'zh' ? '🇨🇳 独立投标' : locale === 'mn' ? 'Шууд оролцох' : 'Direct Allowed'}
              </span>
            )}
            {tender.chinaBidderAnalysis?.eligibilityStatus === 'joint_venture_required' && (
              <span
                className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300"
                title={locale === 'zh' ? tender.chinaBidderAnalysis.eligibilityExplanationZh : tender.chinaBidderAnalysis.eligibilityExplanationMn}
              >
                {locale === 'zh' ? '🤝 需联合体' : locale === 'mn' ? 'Түншлэлтэй' : 'JV Required'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Save Bookmark */}
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

            {/* Official Source Link */}
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="tender.gov.mn дээр нээх"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* 2. Project Title */}
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {tender.tenderName}
        </h3>

        {/* Procuring Entity / Buyer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{tender.budgetEntityName}</span>
        </div>

        {/* Extracted Key Items / Specs Pill */}
        {tender.liveBundleSummary?.topItems && tender.liveBundleSummary.topItems.length > 0 && (
          <div className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{tender.liveBundleSummary.topItems[0].name}</span>
            {tender.liveBundleSummary.topItems[0].qty && (
              <span className="text-slate-900 font-bold font-mono ml-auto shrink-0">
                {tender.liveBundleSummary.topItems[0].qty} {tender.liveBundleSummary.topItems[0].unit || ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Footer Grid & Actions */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Estimated Budget */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Төсөвт өртөг
            </span>
            <span className="text-sm font-extrabold text-slate-900 tracking-tight font-sans block">
              {formatMNT(Number(tender.totalBudget) || 0)}
            </span>
          </div>

          {/* Deadline */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Хүлээн авах эцсийн хугацаа
            </span>
            {urgency ? (
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${urgency.color}`}>
                <Clock className={`h-3 w-3 ${urgency.isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`} />
                <span>{urgency.label}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-600 font-medium">Тодорхойгүй</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onAskAI && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAskAI(tender);
              }}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="AI Шинжилгээ хийлгэх"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">AI Дүгнэлт</span>
            </button>
          )}

          <button
            onClick={handleCardClick}
            className="flex-1 h-8 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs group-hover:bg-blue-600 cursor-pointer"
          >
            <span>Дэлгэрэнгүй</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

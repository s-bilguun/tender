'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { IndustryIcon } from '@/components/IndustryIcon';
import { formatCurrencyMulti, MNT_TO_RMB_RATE, MNT_TO_USD_RATE } from '@/lib/product-categories';
import { 
  Building2, Sparkles, ExternalLink, Star, Clock, 
  Loader2, FileText, ArrowUpRight, ShieldCheck, AlertCircle, 
  TrendingUp, DollarSign, Handshake, Globe2
} from 'lucide-react';

interface TenderCardProps {
  tender: TenderItem;
  locale: Locale;
  currency?: 'CNY' | 'USD' | 'MNT';
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onSelect?: (tender: TenderItem) => void;
  onAskAI?: (tender: TenderItem) => void;
  onOpenArbitrage?: (tender: TenderItem) => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({
  tender,
  locale,
  currency = 'CNY',
  isSaved = false,
  onToggleSave,
  onSelect,
  onAskAI,
  onOpenArbitrage,
}) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const t = getTranslation(locale);

  const budgetMnt = Number(tender.totalBudget) || 0;
  const budgetRmb = Math.round(budgetMnt / MNT_TO_RMB_RATE);
  const budgetUsd = Math.round(budgetMnt / MNT_TO_USD_RATE);

  const getIndustryDetails = (industryId?: string, typeCode?: string) => {
    switch (industryId) {
      case 'it':
        return { 
          label: locale === 'zh' ? '💻 电脑与软件IT' : 'Мэдээллийн технологи', 
          color: 'bg-blue-50 text-blue-700 border-blue-200' 
        };
      case 'construction':
        return { 
          label: locale === 'zh' ? '🚜 工程建筑与机械' : 'Барилга, дэд бүтэц', 
          color: 'bg-amber-50 text-amber-700 border-amber-200' 
        };
      case 'medical':
        return { 
          label: locale === 'zh' ? '🏥 医疗器械与药品' : 'Эрүүл мэнд, эм', 
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        };
      case 'mining':
        return { 
          label: locale === 'zh' ? '⛏️ 矿山重型设备' : 'Уул уурхай', 
          color: 'bg-slate-100 text-slate-800 border-slate-300' 
        };
      case 'food':
        return { 
          label: locale === 'zh' ? '🥩 粮油肉类食品' : 'Хүнс, хоол', 
          color: 'bg-orange-50 text-orange-700 border-orange-200' 
        };
      case 'transport':
        return { 
          label: locale === 'zh' ? '🚚 交通车辆与燃油' : 'Тээвэр, шатахуун', 
          color: 'bg-cyan-50 text-cyan-700 border-cyan-200' 
        };
      case 'facility':
        return { 
          label: locale === 'zh' ? '🏢 安防安保设施' : 'Харуул, цэвэрлэгээ', 
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200' 
        };
      case 'stationery':
        return { 
          label: locale === 'zh' ? '🪑 办公桌椅与文教' : 'Боловсрол, бичиг хэрэг', 
          color: 'bg-purple-50 text-purple-700 border-purple-200' 
        };
      default:
        return { 
          label: typeCode === 'PRODUCT' 
            ? (locale === 'zh' ? '📦 货物采购' : 'Бараа нийлүүлэлт') 
            : typeCode === 'JOB' 
            ? (locale === 'zh' ? '🏗️ 工程承包' : 'Ажил гүйцэтгэл') 
            : (locale === 'zh' ? '⚙️ 服务采购' : 'Үйлчилгээ'), 
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
        label: locale === 'zh' ? '已截标' : locale === 'mn' ? 'Хугацаа дууссан' : 'Closed', 
        color: 'bg-slate-100 text-slate-500 border-slate-200', 
        iconColor: 'text-slate-400',
        isUrgent: false,
      };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'zh' ? `🚨 仅剩 ${diffHours} 小时截标` : `🚨 ${diffHours} цаг үлдсэн`,
        color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold ring-1 ring-rose-300/60 animate-pulse',
        iconColor: 'text-rose-600',
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'zh' ? `⏳ 剩 ${diffDays} 天截标` : `⏳ ${diffDays} хоног үлдсэн`,
        color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        iconColor: 'text-rose-600',
        isUrgent: true,
      };
    }
    return {
      status: 'active',
      label: locale === 'zh' ? `还剩 ${diffDays} 天` : `${diffDays} хоног үлдсэн`,
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
      ? `采购清单: ${tender.liveBundleSummary.topItems.map(i => i.name).join(', ')}` 
      : '') ||
    '包含完整技术规格书、工程量清单及供货要求，支持出厂报价直接对比。';

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(tender);
    } else {
      setIsNavigating(true);
      router.push(`/tender/${tender.invitationId}`);
    }
  };

  // Determine foreign bidder eligibility
  const isDirectAllowed = 
    tender.chinaBidderAnalysis?.eligibilityStatus === 'direct_allowed' || 
    tender.tenderTypeCode === 'PRODUCT';

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group relative cursor-pointer ${
        urgency?.isUrgent 
          ? 'border-rose-300/80 hover:border-rose-400 ring-1 ring-rose-200/50' 
          : 'border-slate-200/90 hover:border-rose-400'
      }`}
    >
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-2xl z-20 flex items-center justify-center gap-2 text-xs font-bold text-slate-900 shadow-sm animate-in fade-in duration-150">
          <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
          <span>正在打开标段详情...</span>
        </div>
      )}

      {/* 1. Header: Tender ID, Sector Badge & Cross-Border Bidding Eligibility */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Sector & Code */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${industry.color}`}>
              <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3" />
              <span>{industry.label}</span>
            </span>

            {/* Foreign Bidder Badge (The Big Selling Point!) */}
            {isDirectAllowed ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0"
                title="中国企业可使用国内法人资格独立参与"
              >
                <Globe2 className="h-3 w-3 text-emerald-600" />
                <span>{locale === 'zh' ? '🇨🇳 可独立直投' : 'Direct Allowed'}</span>
              </span>
            ) : (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1 shrink-0"
                title="需与蒙古国持有特许施工资质的企业组建联合体"
              >
                <Handshake className="h-3 w-3 text-indigo-600" />
                <span>{locale === 'zh' ? '🤝 可匹配联合体' : 'JV Match'}</span>
              </span>
            )}
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
                  title={locale === 'zh' ? '加入监控' : 'Save to watchlist'}
                  aria-label="Bookmark tender"
                >
                  <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                </button>
              )}

              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="打开蒙古国官方招标网 tender.gov.mn 原文"
                aria-label="Open on tender.gov.mn"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 2. Project Title */}
        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
          {tender.tenderName}
        </h3>

        {/* Procuring Entity / Buyer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">{tender.budgetEntityName || '蒙古国政府采购实体'}</span>
        </div>
      </div>

      {/* 3. The Arbitrage & Financial Metrics Box (Standout Price Opportunity!) */}
      <div className="bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-slate-50 p-3 rounded-xl border border-rose-200/80 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            {locale === 'zh' ? '政府采购总预算' : 'Government Budget'}
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">
            {locale === 'zh' ? '⚡ 预估出厂利润空间: +75%~+130%' : '+85% Margin Gap'}
          </span>
        </div>

        <div className="flex items-baseline justify-between flex-wrap gap-1">
          {/* Main Converted Currency (RMB / USD / MNT) */}
          <div className="text-base sm:text-lg font-black text-rose-700 tracking-tight font-sans">
            {formatCurrencyMulti(budgetMnt, currency)}
          </div>

          {/* Secondary Sub-currency for clarity */}
          <div className="text-[11px] font-mono text-slate-500">
            {currency === 'CNY' ? `≈ $${budgetUsd.toLocaleString()} USD` : `≈ ₮ ${budgetMnt.toLocaleString()}`}
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-rose-100 pt-1.5 font-mono">
          <span>发布: {tender.publishDate ? tender.publishDate.split('T')[0] : '—'}</span>
          <span className={urgency?.isUrgent ? 'text-rose-700 font-bold' : 'text-slate-700'}>
            截标: {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
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
        {onOpenArbitrage && (
          <button
            onClick={() => onOpenArbitrage(tender)}
            className="w-full sm:w-auto h-11 sm:h-9 px-3.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 active:scale-95"
            title="测算我的工厂利润并参标"
          >
            <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
            <span>{locale === 'zh' ? '测算出厂利润 & 参标' : 'Calculate Profit'}</span>
          </button>
        )}

        <button
          onClick={handleCardClick}
          className="w-full sm:flex-1 h-11 sm:h-9 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-rose-600 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs group-hover:bg-rose-600 cursor-pointer active:scale-98"
        >
          <span>{locale === 'zh' ? '查看招标明细' : 'Дэлгэрэнгүй үзэх'}</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

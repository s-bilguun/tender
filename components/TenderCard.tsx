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
  DollarSign, Handshake, Globe2, Layers, Package, CheckCircle2
} from 'lucide-react';

interface TenderCardProps {
  tender: TenderItem;
  locale: Locale;
  currency?: 'CNY' | 'USD' | 'MNT';
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onSelect?: (tender: TenderItem) => void;
  onAskAI?: (tender: TenderItem) => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({
  tender,
  locale,
  currency = 'MNT',
  isSaved = false,
  onToggleSave,
  onSelect,
  onAskAI,
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
          color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
        };
      case 'construction':
        return { 
          label: locale === 'zh' ? '🚜 工程建筑与机械' : 'Барилга, дэд бүтэц', 
          color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
        };
      case 'medical':
        return { 
          label: locale === 'zh' ? '🏥 医疗器械与药品' : 'Эрүүл мэнд, эм', 
          color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
        };
      case 'mining':
        return { 
          label: locale === 'zh' ? '⛏️ 矿山重型设备' : 'Уул уурхай', 
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' 
        };
      case 'food':
        return { 
          label: locale === 'zh' ? '🥩 粮油肉类食品' : 'Хүнс, хоол', 
          color: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' 
        };
      case 'transport':
        return { 
          label: locale === 'zh' ? '🚚 交通车辆与燃油' : 'Тээвэр, шатахуун', 
          color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' 
        };
      case 'facility':
        return { 
          label: locale === 'zh' ? '🏢 安防安保设施' : 'Харуул, цэвэрлэгээ', 
          color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
        };
      case 'stationery':
        return { 
          label: locale === 'zh' ? '🪑 办公桌椅与文教' : 'Боловсрол, бичиг хэрэг', 
          color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
        };
      default:
        return { 
          label: typeCode === 'PRODUCT' 
            ? (locale === 'zh' ? '📦 货物采购' : 'Бараа нийлүүлэлт') 
            : typeCode === 'JOB' 
            ? (locale === 'zh' ? '🏗️ 工程承包' : 'Ажил гүйцэтгэл') 
            : (locale === 'zh' ? '⚙️ 服务采购' : 'Үйлчилгээ'), 
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' 
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
        color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700', 
        iconColor: 'text-slate-400',
        isUrgent: false,
      };
    }
    if (diffHours <= 24) {
      return {
        status: 'critical',
        label: locale === 'zh' ? `🚨 仅剩 ${diffHours} 小时截标` : locale === 'mn' ? `🚨 ${diffHours} цаг үлдсэн` : `🚨 ${diffHours}h left`,
        color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold ring-1 ring-rose-300/60 dark:ring-rose-800/60 animate-pulse',
        iconColor: 'text-rose-600 dark:text-rose-400',
        isUrgent: true,
      };
    }
    if (diffDays <= 3) {
      return {
        status: 'urgent',
        label: locale === 'zh' ? `⏳ 剩 ${diffDays} 天截标` : locale === 'mn' ? `⏳ ${diffDays} хоног үлдсэн` : `⏳ ${diffDays}d left`,
        color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold',
        iconColor: 'text-rose-600 dark:text-rose-400',
        isUrgent: true,
      };
    }
    return {
      status: 'active',
      label: locale === 'zh' ? `还剩 ${diffDays} 天` : locale === 'mn' ? `${diffDays} хоног үлдсэн` : `${diffDays} days left`,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      isUrgent: false,
    };
  };

  const urgency = calculateUrgency(tender.receiveDate || tender.openDate);
  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;

  // PDF & BoQ Extracted Data
  const rawData = tender.raw_data || (tender as any).rawData;
  const storedPdfUrl = rawData?.pdfUrl || rawData?.liveBundle?.documents?.find((d: any) => d.isStored || d.downloadUrl?.includes('supabase.co'))?.downloadUrl;
  const hasStoredPdf = Boolean(storedPdfUrl || rawData?.hasPdf);

  const items = tender.items || rawData?.structuredSpecs?.items || rawData?.items || [];
  const itemCount = Array.isArray(items) ? items.length : 0;
  const licenses = tender.licenses || rawData?.structuredSpecs?.licenses || [];
  const licenseCount = Array.isArray(licenses) ? licenses.length : 0;
  const bidSecurityReq = tender.bidSecurityReq || rawData?.structuredSpecs?.bidSecurityReq;
  const isNoBidSecurity = bidSecurityReq?.includes('Шаардахгүй');

  const extractedHighlight = 
    (itemCount > 0 
      ? `${locale === 'mn' ? `Нийт ${itemCount} нэр төрлийн бараа:` : locale === 'zh' ? `共${itemCount}项物料清单:` : `${itemCount} itemized goods:`} ${items.slice(0, 3).map((i: any) => i.name).join(', ')}${itemCount > 3 ? '...' : ''}`
      : '') ||
    tender.full_scope_of_work || 
    rawData?.llmExtracted?.full_scope_of_work ||
    rawData?.liveBundle?.fullScopeOfWork ||
    'Тендерийн техникийн тодорхойлолт болон ажлын даалгавар баримт бичигт бүрэн тусгагдсан.';

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
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group relative cursor-pointer ${
        urgency?.isUrgent 
          ? 'border-rose-300/80 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700 ring-1 ring-rose-200/50 dark:ring-rose-950/50' 
          : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xs rounded-2xl z-20 flex items-center justify-center gap-2 text-xs font-bold text-slate-900 dark:text-white shadow-sm animate-in fade-in duration-150">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Тендерийн дэлгэрэнгүйг нээж байна...</span>
        </div>
      )}

      {/* 1. Header: Sector, Foreign Bidder Status & Urgency */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Sector & Foreign Bidder Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${industry.color}`}>
              <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3" />
              <span>{industry.label}</span>
            </span>

            {isDirectAllowed ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0"
                title={locale === 'zh' ? '企业可使用法人资格独立参与' : 'Eligible for direct foreign bidding'}
              >
                <Globe2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{locale === 'zh' ? '🇨🇳 可独立直投' : locale === 'mn' ? 'Шууд оролцох' : 'Direct Bidding'}</span>
              </span>
            ) : (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1 shrink-0"
                title={locale === 'zh' ? '需与蒙古国持有特许资质的企业组建联合体' : 'Eligible via Mongolian JV partnership'}
              >
                <Handshake className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>{locale === 'zh' ? '🤝 可匹配联合体' : locale === 'mn' ? 'Түншлэл (JV)' : 'JV Partner Match'}</span>
              </span>
            )}

            {hasStoredPdf && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 shrink-0"
                title={locale === 'zh' ? '已提取官方 ТШЗ 招标文件' : 'ТШЗ Баримт хадгалагдсан'}
              >
                <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span>{locale === 'zh' ? '📄 标书已备' : locale === 'mn' ? '📄 ТШЗ PDF' : '📄 PDF Ready'}</span>
              </span>
            )}

            {itemCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shrink-0"
                title={locale === 'zh' ? `已解析 ${itemCount} 项采购物料` : `${itemCount} нэр төрлийн барааны хүснэгт бэлэн`}
              >
                <Layers className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span>{locale === 'zh' ? `📦 ${itemCount}项物料` : locale === 'mn' ? `📦 ${itemCount} бараа` : `📦 ${itemCount} items`}</span>
              </span>
            )}

            {licenseCount > 0 ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0"
                title={licenses.join(', ')}
              >
                <ShieldCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>{locale === 'zh' ? `${licenseCount}项资质` : `${licenseCount} зөвшөөрөл`}</span>
              </span>
            ) : rawData?.structuredSpecs ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0"
                title="Тусгай зөвшөөрөл шаардагдахгүй"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{locale === 'zh' ? '无特许资质' : locale === 'mn' ? 'Зөвшөөрөлгүй' : 'No License'}</span>
              </span>
            ) : null}

            {isNoBidSecurity && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1 shrink-0"
                title="Тендерийн баталгаа шаардахгүй"
              >
                <span>{locale === 'zh' ? '免保证金' : locale === 'mn' ? 'Баталгаагүй' : 'No Bond'}</span>
              </span>
            )}
          </div>

          {/* Right: Urgency Pill & Watchlist */}
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
                    isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={locale === 'zh' ? '加入监控' : locale === 'mn' ? 'Хадгалах' : 'Save to watchlist'}
                  aria-label="Bookmark tender"
                >
                  <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                </button>
              )}

              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                title="Open tender.gov.mn official source"
                aria-label="Open on tender.gov.mn"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 2. Project Title */}
        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {tender.tenderName}
        </h3>

        {/* Procuring Entity / Buyer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate font-medium">{tender.budgetEntityName || (locale === 'mn' ? 'Захиалагч байгууллага' : 'Procuring Entity')}</span>
        </div>
      </div>

      {/* 3. Budget & Financial Metrics Box */}
      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {locale === 'zh' ? '政府采购总预算' : locale === 'mn' ? 'Төсөвт өртөг' : 'Total Budget'}
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            {currency === 'CNY' ? `≈ ¥${budgetRmb.toLocaleString()} CNY` : `≈ $${budgetUsd.toLocaleString()} USD`}
          </span>
        </div>

        <div className="flex items-baseline justify-between flex-wrap gap-1">
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight font-sans">
            ₮ {budgetMnt.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
            {tender.tenderCode || `INV-${tender.invitationId}`}
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/70 dark:border-slate-800/70 pt-1.5 font-mono">
          <span>{locale === 'mn' ? 'Нийтэлсэн' : 'Published'}: {tender.publishDate ? tender.publishDate.split('T')[0] : '—'}</span>
          <span className={urgency?.isUrgent ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
            {locale === 'mn' ? 'Эцсийн хугацаа' : 'Deadline'}: {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
          </span>
        </div>
      </div>

      {/* 4. Extracted PDF Highlight */}
      <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2">
        <FileText className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${hasStoredPdf ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
        <div className="flex-1 min-w-0">
          {hasStoredPdf && (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mr-1.5 inline-block">
              {locale === 'zh' ? '官方标书' : locale === 'mn' ? 'ТШЗ Бэлэн' : 'Official Spec'}
            </span>
          )}
          <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {extractedHighlight}
          </span>
        </div>
      </div>

      {/* 5. Footer Actions */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleCardClick}
          className="w-full h-10 px-4 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 dark:hover:bg-blue-600 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs group-hover:bg-blue-600 dark:group-hover:bg-blue-600 cursor-pointer active:scale-98 border border-transparent dark:border-slate-700/60"
        >
          <span>{locale === 'zh' ? '查看招标明细' : locale === 'mn' ? 'Дэлгэрэнгүй үзэх' : 'View Tender Details'}</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

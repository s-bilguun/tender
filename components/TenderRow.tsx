'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { IndustryIcon } from '@/components/IndustryIcon';
import { getBilingualTenderInfo } from '@/lib/bilingual-title';
import {
  Building2, ChevronRight, ExternalLink, FileText,
  Loader2, Package, ShieldCheck, Sparkles, Star,
} from 'lucide-react';

interface TenderRowProps {
  tender: TenderItem;
  locale: Locale;
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onAskAI?: (tender: TenderItem) => void;
}

const L = (locale: Locale, mn: string, en: string, zh: string) =>
  locale === 'zh' ? zh : locale === 'en' ? en : mn;

const INDUSTRY: Record<string, [string, string, string]> = {
  it: ['Мэдээллийн технологи', 'IT & Software', '信息技术'],
  construction: ['Барилга, дэд бүтэц', 'Construction', '工程建筑'],
  medical: ['Эрүүл мэнд, эм', 'Medical', '医疗医药'],
  mining: ['Уул уурхай', 'Mining', '矿业'],
  food: ['Хүнс, хоол', 'Food', '食品'],
  transport: ['Тээвэр, шатахуун', 'Transport', '交通燃油'],
  facility: ['Харуул, цэвэрлэгээ', 'Facility', '物业安保'],
  stationery: ['Боловсрол, тавилга', 'Education & Office', '教育办公'],
  consulting: ['Зөвлөх үйлчилгээ', 'Consulting', '咨询服务'],
};

function ubDate(value?: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function moneyPrimary(amount: number, locale: Locale): string {
  if (locale === 'zh') {
    const rmb = amount / 470;
    return rmb >= 1e4
      ? `¥${(rmb / 1e4).toFixed(1)} 万`
      : `¥${Math.round(rmb).toLocaleString('en-US')}`;
  }
  return `₮${amount.toLocaleString('en-US')}`;
}

function moneySecondary(amount: number, locale: Locale): string {
  if (locale === 'zh') {
    return `₮${amount.toLocaleString('en-US')}`;
  }
  const rmb = amount / 470;
  return rmb >= 1e4
    ? `≈ ¥${(rmb / 1e4).toFixed(1)} 万`
    : `≈ ¥${Math.round(rmb).toLocaleString('en-US')}`;
}

export const TenderRow: React.FC<TenderRowProps> = ({
  tender,
  locale,
  isSaved = false,
  onToggleSave,
  onAskAI,
}) => {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const href = `/tender/${tender.invitationId}`;
  const raw: any = (tender as any).raw_data || (tender as any).rawData || {};
  const budget = Number(tender.totalBudget) || 0;

  const items =
    tender.items ||
    raw.structuredSpecs?.items ||
    tender.liveBundleSummary?.topItems ||
    [];
  const itemCount = Array.isArray(items) ? items.length : 0;
  const firstItemName = itemCount > 0 ? String(items[0]?.name || '').trim() : '';

  const licenses = tender.licenses || raw.structuredSpecs?.licenses || [];
  const licenseCount = Array.isArray(licenses) ? licenses.length : 0;

  const isNoBond = Boolean(
    tender.bidSecurityReq?.includes('Шаардахгүй') ||
    tender.liveBundleSummary?.isBidSecurityExempt
  );

  const hasDocs = Boolean(
    raw.hasPdf ||
    raw.pdfUrl ||
    raw.liveBundle?.documents?.length ||
    raw.structuredSpecs ||
    tender.liveBundleSummary?.hasBundle
  );
  const feedOnly = raw.source === 'telegram' && !hasDocs;

  const now = Date.now();
  const deadlineMs = tender.receiveDate ? Date.parse(tender.receiveDate) : NaN;
  const daysLeft = Number.isNaN(deadlineMs)
    ? null
    : Math.ceil((deadlineMs - now) / 86_400_000);
  const closed = daysLeft != null && daysLeft <= 0;
  const publishedMs = tender.publishDate ? Date.parse(tender.publishDate) : NaN;
  const ageHours = Number.isNaN(publishedMs) ? null : (now - publishedMs) / 3_600_000;
  const isNew = ageHours != null && ageHours >= 0 && ageHours < 48;

  const industry = INDUSTRY[tender.industry || ''];
  const typeLabel =
    tender.tenderTypeCode === 'JOB'
      ? L(locale, 'Ажил', 'Works', '工程')
      : tender.tenderTypeCode === 'SERVICE'
      ? L(locale, 'Үйлчилгээ', 'Services', '服务')
      : L(locale, 'Бараа', 'Goods', '货物');
  const sectorLabel = industry ? L(locale, ...industry) : typeLabel;

  const relativePublished = (() => {
    if (ageHours == null || ageHours < 0) return ubDate(tender.publishDate) || '—';
    if (ageHours < 1) return L(locale, 'дөнгөж сая', 'just now', '刚刚');
    if (ageHours < 24) {
      const h = Math.floor(ageHours);
      return L(locale, `${h}ц өмнө`, `${h}h ago`, `${h}小时前`);
    }
    const d = Math.floor(ageHours / 24);
    return d < 14
      ? L(locale, `${d}ө өмнө`, `${d}d ago`, `${d}天前`)
      : ubDate(tender.publishDate) || '—';
  })();

  const bilingual =
    locale === 'zh'
      ? getBilingualTenderInfo(
          tender.tenderName,
          tender.budgetEntityName,
          budget,
          tender.tenderTypeCode
        )
      : null;
  const title = bilingual?.titleZh || tender.tenderName;
  const buyer = bilingual?.entityZh || tender.budgetEntityName;
  const code = tender.tenderCode || tender.invitationNumber;

  const foreignStatus = tender.chinaBidderAnalysis?.eligibilityStatus;

  const open = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    setOpening(true);
    router.push(href);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={tender.tenderName}
      onClick={open}
      onAuxClick={(e) => {
        if (e.button === 1) open(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setOpening(true);
          router.push(href);
        }
      }}
      className="group relative grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_10rem_8.5rem_5rem] items-start md:items-center gap-x-5 gap-y-2.5 px-4 sm:px-5 py-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50/90 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors focus-visible:outline-2"
    >
      {/* Column 1: Code, Meta, Title, Buyer & Extracted Spec Signals */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
          {code && (
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/70 dark:border-zinc-700/80">
              {code}
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-zinc-400">
            <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3 shrink-0" />
            <span>{sectorLabel}</span>
          </span>

          {foreignStatus === 'direct_allowed' && (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {L(locale, 'Шууд оролцох', 'Direct Bid', '可独立直投')}
            </span>
          )}
          {foreignStatus === 'joint_venture_required' && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {L(locale, 'Түншлэл (JV)', 'JV Required', '需联合体 (JV)')}
            </span>
          )}

          {isNew && (
            <span className="px-1.5 py-px rounded bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-medium">
              {L(locale, 'Шинэ', 'New', '新')}
            </span>
          )}

          {feedOnly && (
            <span
              className="px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px]"
              title={L(
                locale,
                'Зөвхөн зарын мэдээлэл; төсөв, хугацааг tender.gov.mn-ээс харна',
                'Announcement only; budget and deadline are on tender.gov.mn',
                '仅有公告信息；预算与截止时间见 tender.gov.mn'
              )}
            >
              {L(locale, 'Зар', 'Feed', '公告')}
            </span>
          )}
        </div>

        <h3 className="mt-1 text-sm sm:text-[15px] font-semibold leading-snug text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 transition-colors">
          {title}
        </h3>
        {bilingual && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
            {tender.tenderName}
          </p>
        )}

        {/* Buyer + Compact Monochrome Spec Signals */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full sm:max-w-md">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
            <span className="truncate">{buyer || '—'}</span>
          </span>

          {hasDocs && (
            <span className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 text-[10px] font-medium shrink-0">
              <FileText className="h-2.5 w-2.5 text-slate-500 dark:text-zinc-400" />
              <span>PDF</span>
            </span>
          )}

          {itemCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 text-[10px] font-medium max-w-[240px] truncate">
              <Package className="h-2.5 w-2.5 shrink-0 text-slate-500 dark:text-zinc-400" />
              <span className="truncate">
                {L(locale, `${itemCount} бараа`, `${itemCount} items`, `${itemCount} 项`)}
                {firstItemName ? `: ${firstItemName}` : ''}
              </span>
            </span>
          )}

          {isNoBond && (
            <span className="inline-flex items-center px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 text-[10px] font-medium shrink-0">
              {L(locale, 'Баталгаагүй', 'No Bid Bond', '免保函')}
            </span>
          )}

          {licenseCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 text-[10px] font-medium shrink-0">
              <ShieldCheck className="h-2.5 w-2.5 text-slate-500 dark:text-zinc-400" />
              <span>{L(locale, `${licenseCount} зөвшөөрөл`, `${licenseCount} licenses`, `${licenseCount} 项许可`)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Column 2 & 3 on mobile side-by-side, separate columns on desktop */}
      <div className="flex items-baseline justify-between gap-4 md:contents">
        {/* Column 2: Budget */}
        <div className="md:text-right tabular-nums">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 md:hidden block">
            {L(locale, 'Төсөв', 'Budget', '预算')}
          </span>
          {budget > 0 ? (
            <>
              <div className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {moneyPrimary(budget, locale)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                {moneySecondary(budget, locale)}
              </div>
            </>
          ) : (
            <a
              href={`https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              <span>tender.gov.mn</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Column 3: Deadline / Published */}
        <div className="text-right tabular-nums">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 md:hidden block">
            {daysLeft != null
              ? L(locale, 'Хугацаа', 'Deadline', '截止')
              : L(locale, 'Нийтэлсэн', 'Published', '发布')}
          </span>
          {daysLeft != null ? (
            <>
              <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                {ubDate(tender.receiveDate)}
              </div>
              <div
                className={`text-[11px] whitespace-nowrap ${
                  closed
                    ? 'text-slate-400 dark:text-zinc-500'
                    : daysLeft <= 3
                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {closed
                  ? L(locale, 'Дууссан', 'Closed', '已截止')
                  : L(locale, `${daysLeft} хоног үлдсэн`, `${daysLeft}d left`, `剩 ${daysLeft} 天`)}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
              {relativePublished}
            </div>
          )}
        </div>
      </div>

      {/* Column 4: Actions */}
      <div
        className="flex items-center justify-end gap-0.5 pt-1 md:pt-0 border-t border-slate-100 dark:border-zinc-800/80 md:border-t-0"
        onClick={(e) => e.stopPropagation()}
      >
        {onAskAI && (
          <button
            type="button"
            onClick={() => onAskAI(tender)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title={L(locale, 'AI-аас асуух', 'Ask AI', '询问 AI')}
            aria-label={L(locale, 'AI-аас асуух', 'Ask AI', '询问 AI')}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        )}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(tender.invitationId)}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors ${
              isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
            }`}
            title={L(locale, 'Хадгалах', 'Save', '收藏')}
            aria-label={L(locale, 'Хадгалах', 'Save', '收藏')}
            aria-pressed={isSaved}
          >
            <Star className={`h-3.5 w-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
          </button>
        )}
        <button
          type="button"
          onClick={open}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 cursor-pointer transition-colors"
          aria-label={L(locale, 'Дэлгэрэнгүй', 'Details', '详情')}
        >
          {opening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      </div>
    </article>
  );
};

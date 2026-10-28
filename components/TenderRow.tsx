'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenderItem, Locale } from '@/lib/types';
import { IndustryIcon } from '@/components/IndustryIcon';
import { getBilingualTenderInfo } from '@/lib/bilingual-title';
import { Building2, ChevronRight, ExternalLink, Loader2, Sparkles, Star } from 'lucide-react';

interface TenderRowProps {
  tender: TenderItem;
  locale: Locale;
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onAskAI?: (tender: TenderItem) => void;
}

const L = (locale: Locale, mn: string, en: string, zh: string) => (locale === 'zh' ? zh : locale === 'en' ? en : mn);

const INDUSTRY: Record<string, [string, string, string]> = {
  it: ['Мэдээллийн технологи', 'IT & software', '信息技术'],
  construction: ['Барилга, дэд бүтэц', 'Construction', '工程建筑'],
  medical: ['Эрүүл мэнд, эм', 'Health & medicine', '医疗医药'],
  mining: ['Уул уурхай', 'Mining', '矿业'],
  food: ['Хүнс, хоол', 'Food', '食品'],
  transport: ['Тээвэр, шатахуун', 'Transport & fuel', '交通燃油'],
  facility: ['Харуул, цэвэрлэгээ', 'Security & cleaning', '安保保洁'],
  stationery: ['Боловсрол, бичиг хэрэг', 'Education & supplies', '教育文具'],
  consulting: ['Зөвлөх үйлчилгээ', 'Consulting', '咨询服务'],
};

/** Ulaanbaatar-time date "YYYY-MM-DD" (same on server and browser). */
function ubDate(value?: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function money(amount: number, locale: Locale): string {
  if (locale === 'zh') {
    const rmb = amount / 470;
    return rmb >= 1e4 ? `¥${(rmb / 1e4).toFixed(1)} 万` : `¥${Math.round(rmb).toLocaleString('en-US')}`;
  }
  return `₮${amount.toLocaleString('en-US')}`;
}

/**
 * One tender as a full-width row: what it is and who buys it on the left,
 * money and dates on the right. The whole row opens the tender page.
 */
export const TenderRow: React.FC<TenderRowProps> = ({ tender, locale, isSaved = false, onToggleSave, onAskAI }) => {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const href = `/tender/${tender.invitationId}`;
  const raw: any = (tender as any).raw_data || (tender as any).rawData || {};
  const budget = Number(tender.totalBudget) || 0;
  const hasDocs = Boolean(raw.hasPdf || raw.pdfUrl || raw.liveBundle?.documents?.length || raw.structuredSpecs);
  const feedOnly = raw.source === 'telegram' && !hasDocs;

  const now = Date.now();
  const deadlineMs = tender.receiveDate ? Date.parse(tender.receiveDate) : NaN;
  const daysLeft = Number.isNaN(deadlineMs) ? null : Math.ceil((deadlineMs - now) / 86_400_000);
  const closed = daysLeft != null && daysLeft <= 0;
  const publishedMs = tender.publishDate ? Date.parse(tender.publishDate) : NaN;
  const ageHours = Number.isNaN(publishedMs) ? null : (now - publishedMs) / 3_600_000;
  const isNew = ageHours != null && ageHours >= 0 && ageHours < 48;

  const industry = INDUSTRY[tender.industry || ''];
  const typeLabel = tender.tenderTypeCode === 'JOB'
    ? L(locale, 'Ажил', 'Works', '工程')
    : tender.tenderTypeCode === 'SERVICE'
    ? L(locale, 'Үйлчилгээ', 'Services', '服务')
    : L(locale, 'Бараа', 'Goods', '货物');
  const sectorLabel = industry ? L(locale, ...industry) : typeLabel;

  const relative = (() => {
    if (ageHours == null || ageHours < 0) return ubDate(tender.publishDate) || '—';
    if (ageHours < 1) return L(locale, 'дөнгөж сая', 'just now', '刚刚');
    if (ageHours < 24) { const h = Math.floor(ageHours); return L(locale, `${h} цагийн өмнө`, `${h}h ago`, `${h} 小时前`); }
    const d = Math.floor(ageHours / 24);
    return d < 14 ? L(locale, `${d} хоногийн өмнө`, `${d}d ago`, `${d} 天前`) : (ubDate(tender.publishDate) || '—');
  })();

  const bilingual = locale === 'zh' ? getBilingualTenderInfo(tender.tenderName, tender.budgetEntityName, budget, tender.tenderTypeCode) : null;
  const title = bilingual?.titleZh || tender.tenderName;
  const buyer = bilingual?.entityZh || tender.budgetEntityName;

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
      onAuxClick={(e) => { if (e.button === 1) open(e); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setOpening(true); router.push(href); } }}
      className="group relative grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_12rem_11rem_auto] gap-x-6 gap-y-3 px-4 sm:px-5 py-4 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors focus-visible:outline-2"
    >
      {/* What and who */}
      <div className="min-w-0 col-span-2 md:col-span-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <IndustryIcon id={tender.industry || 'all'} className="h-3.5 w-3.5" />
            {sectorLabel}
          </span>
          {isNew && (
            <span className="px-1.5 py-px rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
              {L(locale, 'Шинэ', 'New', '新')}
            </span>
          )}
          {feedOnly && (
            <span
              className="px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
              title={L(locale, 'Зөвхөн зарын мэдээлэл; төсөв, хугацааг tender.gov.mn-ээс харна', 'Announcement only; budget and deadline are on tender.gov.mn', '仅有公告信息；预算与截止时间见 tender.gov.mn')}
            >
              {L(locale, 'Зар', 'Announcement', '公告')}
            </span>
          )}
          {hasDocs && (
            <span className="px-1.5 py-px rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {L(locale, 'Баримт уншсан', 'Documents read', '已读取文件')}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-[15px] sm:text-base font-semibold leading-snug text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2">
          {title}
        </h3>
        {bilingual && <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">{tender.tenderName}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400 min-w-0">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
          <span className="truncate">{buyer || '—'}</span>
        </p>
      </div>

      {/* Money */}
      <div className="md:text-right">
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">{L(locale, 'Төсөв', 'Budget', '预算')}</p>
        {budget > 0 ? (
          <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{money(budget, locale)}</p>
        ) : (
          <a
            href={`https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            {L(locale, 'tender.gov.mn-д', 'On tender.gov.mn', '见 tender.gov.mn')}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Dates */}
      <div className="md:text-right">
        {daysLeft != null ? (
          <>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{L(locale, 'Эцсийн хугацаа', 'Deadline', '截止')}</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-900 dark:text-white">{ubDate(tender.receiveDate)}</p>
            <p className={`text-xs ${closed ? 'text-slate-400 dark:text-zinc-500' : daysLeft <= 3 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {closed
                ? L(locale, 'Хугацаа дууссан', 'Closed', '已截止')
                : L(locale, `${daysLeft} хоног үлдсэн`, `${daysLeft} days left`, `剩 ${daysLeft} 天`)}
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{L(locale, 'Нийтэлсэн', 'Published', '发布')}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{relative}</p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2 md:col-span-1 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {L(locale, 'Дэлгэрэнгүй', 'Details', '详情')}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onAskAI && (
            <button
              type="button"
              onClick={() => onAskAI(tender)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              title={L(locale, 'AI-аас асуух', 'Ask AI', '询问 AI')}
              aria-label={L(locale, 'AI-аас асуух', 'Ask AI', '询问 AI')}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(tender.invitationId)}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer ${isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
              title={L(locale, 'Хадгалах', 'Save', '收藏')}
              aria-label={L(locale, 'Хадгалах', 'Save', '收藏')}
              aria-pressed={isSaved}
            >
              <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

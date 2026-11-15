'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Check,
  Clock,
  Copy,
  FileText,
  Globe2,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { Locale, TenderItem, ChinaBidderAnalysis } from '@/lib/types';
import { getBilingualTenderInfo } from '@/lib/bilingual-title';

interface TenderInspectorPaneProps {
  tender: TenderItem | null;
  locale: Locale;
  isSaved?: boolean;
  onToggleSave?: (tenderId: string | number) => void;
  onAskAI?: (tender: TenderItem, prompt?: string) => void;
  onClose?: () => void;
}

interface DetailSnapshot {
  tender?: TenderItem;
  bds?: {
    evidenceStatus?: 'not_processed' | 'partial' | 'complete';
    requiredLicenses?: string[];
    bidSecurityReq?: string;
    bidSecurityAmount?: number | null;
    turnoverReq?: string;
    minAnnualTurnover?: number | string | null;
    similarExpReq?: string;
  };
  technicalSpecs?: {
    evidenceStatus?: 'not_processed' | 'partial' | 'complete';
    deliveryLocation?: string | null;
    deliveryPeriodText?: string | null;
    sampleItems?: Array<{
      name: string;
      quantity?: string | number;
      unit?: string;
      spec?: string;
      isRealExtracted?: boolean;
    }>;
    documents?: Array<{ id?: string; name?: string; url?: string }>;
  };
  liveBundle?: {
    extractionStatus?: string;
    pdfPageCount?: number;
    documents?: Array<{ id?: string; name?: string; url?: string }>;
    fullScopeOfWork?: string;
  };
  chinaBidderAnalysis?: ChinaBidderAnalysis;
}

const MNT_PER_RMB = 470;
const L = (locale: Locale, mn: string, en: string, zh: string) =>
  locale === 'zh' ? zh : locale === 'en' ? en : mn;

function formatDualMoney(amount: number, locale: Locale): { primary: string; secondary: string } {
  if (!amount || Number.isNaN(amount)) return { primary: '—', secondary: '' };
  const rmb = amount / MNT_PER_RMB;
  const rmbStr =
    rmb >= 1e8 ? `¥${(rmb / 1e8).toFixed(2)} 亿` : `¥${Math.round(rmb / 1e4).toLocaleString('en-US')} 万`;
  const mntStr =
    amount >= 1e9
      ? `₮${(amount / 1e9).toFixed(2)}${locale === 'mn' ? ' тэрбум' : 'B'}`
      : `₮${Math.round(amount / 1e6).toLocaleString('en-US')}${locale === 'mn' ? ' сая' : 'M'}`;

  if (locale === 'zh') return { primary: rmbStr, secondary: mntStr };
  return { primary: mntStr, secondary: rmbStr };
}

function getDaysLeft(receiveDate?: string): number | null {
  if (!receiveDate) return null;
  const parsed = new Date(receiveDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getEligibilityBadge(
  analysis: ChinaBidderAnalysis | undefined,
  locale: Locale
): { label: string; toneClass: string } {
  const status = analysis?.eligibilityStatus;
  if (status === 'direct_allowed') {
    return {
      label: L(locale, 'Гадаад шууд оролцоно', 'Direct Foreign Allowed', '外企可直接投标'),
      toneClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    };
  }
  if (status === 'joint_venture_required') {
    return {
      label: L(locale, 'Түншлэл (JV) шаардлагатай', 'JV Partnership Req.', '需联合体 (JV)'),
      toneClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    };
  }
  if (status === 'domestic_only') {
    return {
      label: L(locale, 'Зөвхөн дотоодын ААН', 'Domestic Entities Only', '限蒙古本土企业'),
      toneClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
    };
  }
  if (status === 'conditional') {
    return {
      label: L(locale, 'ТШЗ нөхцөлтэй', 'Conditional Review', '需核查特邀条款'),
      toneClass: 'bg-[#5266eb]/10 text-[#5266eb] dark:text-[#9ea8ff] border-[#5266eb]/25',
    };
  }
  return {
    label: L(locale, 'ТШЗ шалгах', 'Inspect BDS', '待核查准入'),
    toneClass: 'bg-slate-100 text-slate-600 dark:bg-[#1a1d27] dark:text-zinc-400 border-slate-200 dark:border-[#2a2e3d]',
  };
}

export const TenderInspectorPane: React.FC<TenderInspectorPaneProps> = ({
  tender,
  locale,
  isSaved = false,
  onToggleSave,
  onAskAI,
  onClose,
}) => {
  const [detail, setDetail] = useState<DetailSnapshot | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [question, setQuestion] = useState('');

  const tenderId = tender?.invitationId;

  useEffect(() => {
    if (!tenderId) {
      setDetail(null);
      return;
    }

    const controller = new AbortController();
    setLoadingDetail(true);
    setDetail(null);

    fetch(`/api/tenders/${encodeURIComponent(String(tenderId))}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !controller.signal.aborted) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setDetail(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [tenderId]);

  if (!tender) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center text-slate-500 dark:text-zinc-400">
        <FileText className="h-8 w-8 text-slate-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
          {L(locale, 'Тендер сонгоно уу', 'Select a tender to inspect', '选择一条招标查看实时简报')}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 max-w-[240px]">
          {L(
            locale,
            'Жагсаалтаас дурын мөр дээр дарж ТШЗ, тусгай зөвшөөрөл болон барааны задаргааг шууд харна уу.',
            'Click any row in the feed to preview specs, bid security, eligibility, and AI checks.',
            '点击左侧任意标段，即可在此查看外企准入、保证金、资质要求与货物清单。'
          )}
        </p>
      </div>
    );
  }

  const code = tender.invitationNumber || tender.tenderCode || String(tender.invitationId);
  const href = `/tender/${tender.invitationId}`;
  const info = getBilingualTenderInfo(
    tender.tenderName,
    tender.budgetEntityName,
    tender.totalBudget || 0,
    tender.tenderTypeCode || 'PRODUCT'
  );

  const primaryTitle = locale === 'zh' && info.titleZh ? info.titleZh : tender.tenderName;
  const secondaryTitle = locale === 'zh' ? tender.tenderName : info.titleZh || '';
  const buyerLabel =
    locale === 'zh' && info.entityZh ? info.entityZh : tender.budgetEntityName || '—';

  const daysLeft = getDaysLeft(tender.receiveDate);
  const closed = daysLeft !== null && daysLeft < 0;
  const money = formatDualMoney(Number(tender.totalBudget) || 0, locale);

  const chinaAnalysis = detail?.chinaBidderAnalysis || tender.chinaBidderAnalysis;
  const eligibility = getEligibilityBadge(chinaAnalysis, locale);

  const bidSecurityText =
    detail?.bds?.bidSecurityReq ||
    tender.liveBundleSummary?.bidSecurityReq ||
    tender.bidSecurityReq ||
    (tender.liveBundleSummary?.isBidSecurityExempt
      ? L(locale, 'Баталгаа шаардахгүй', 'Exempt (No Bond)', '免投标保证金')
      : tender.bidRequirements?.estimatedGuaranteeMin
      ? `~${formatDualMoney(tender.bidRequirements.estimatedGuaranteeMin, locale).primary}`
      : L(locale, 'ТШЗ-д заасан (1-2%)', 'Per BDS (1-2%)', '按招标书规定 (约1-2%)'));

  const deliveryValue =
    detail?.technicalSpecs?.deliveryPeriodText ||
    detail?.technicalSpecs?.deliveryLocation ||
    (tender.receiveDate ? String(tender.receiveDate).substring(0, 10) : '—');

  const licenses =
    (detail?.bds?.requiredLicenses && detail.bds.requiredLicenses.length > 0
      ? detail.bds.requiredLicenses
      : locale === 'zh' && chinaAnalysis?.licenseRequirementsZh?.length
      ? chinaAnalysis.licenseRequirementsZh
      : tender.licenses) || [];

  const turnoverReq =
    detail?.bds?.turnoverReq ||
    tender.liveBundleSummary?.turnoverReq ||
    tender.turnoverReq ||
    (detail?.bds?.minAnnualTurnover ? String(detail.bds.minAnnualTurnover) : null);

  const docCount =
    detail?.technicalSpecs?.documents?.length ??
    detail?.liveBundle?.documents?.length ??
    tender.liveBundleSummary?.docCount ??
    0;

  const evidenceStatus =
    detail?.bds?.evidenceStatus ||
    detail?.technicalSpecs?.evidenceStatus ||
    (tender.liveBundleSummary?.hasBundle
      ? tender.liveBundleSummary.hasOcr
        ? 'complete'
        : 'partial'
      : 'not_processed');

  const boqItems: Array<{ name: string; quantity?: string | number; unit?: string; spec?: string }> =
    detail?.technicalSpecs?.sampleItems && detail.technicalSpecs.sampleItems.length > 0
      ? detail.technicalSpecs.sampleItems
      : tender.liveBundleSummary?.topItems && tender.liveBundleSummary.topItems.length > 0
      ? tender.liveBundleSummary.topItems.map((it) => ({
          name: it.name,
          quantity: it.qty,
          unit: it.unit,
        }))
      : (tender.items || []).map((it) => ({
          name: it.name,
          quantity: it.qty,
          unit: it.unit,
          spec: it.specs,
        }));

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  const quickPrompts =
    locale === 'zh'
      ? ['外企可直接投标吗？', '保证金和营业额要求是多少？', '核心货物/规格清单是什么？']
      : locale === 'en'
      ? ['Can foreign firms bid directly?', 'Bid bond & turnover threshold?', 'Summarize BOQ & delivery specs']
      : ['Гадаад компани оролцох уу?', 'Баталгаа ба эргэлтийн хөрөнгө?', 'Гол бараа, техникийн шаардлага'];

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !onAskAI) return;
    onAskAI(tender, trimmed);
    setQuestion('');
  };

  return (
    <aside
      aria-label={L(locale, 'Тендерийн хураангуй самбар', 'Live Dossier Inspector', '实时标书简报面板')}
      className="flex flex-col h-full w-full bg-white dark:bg-[#0f1015] text-slate-900 dark:text-zinc-100"
    >
      {/* Top Action Bar */}
      <div className="h-12 px-4 border-b border-slate-200 dark:border-[#23252f] flex items-center justify-between gap-2 shrink-0 bg-slate-50/70 dark:bg-[#11131a]">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono font-medium bg-white dark:bg-[#171a24] border border-slate-200 dark:border-[#282c3a] text-slate-700 dark:text-zinc-200 hover:border-[#5266eb]/50 transition-colors cursor-pointer truncate"
            title={L(locale, 'Код хуулах', 'Copy tender code', '复制标段编号')}
          >
            <span className="truncate">{code}</span>
            {copiedCode ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="h-3 w-3 text-slate-400 shrink-0" />
            )}
          </button>

          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(tender.invitationId)}
              className={`h-7 w-7 inline-flex items-center justify-center rounded-md border transition-colors cursor-pointer shrink-0 ${
                isSaved
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-white dark:bg-[#171a24] border-slate-200 dark:border-[#282c3a] text-slate-400 hover:text-amber-500'
              }`}
              title={L(locale, 'Хадгалах', 'Watchlist', '收藏')}
              aria-pressed={isSaved}
            >
              <Star className={`h-3.5 w-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={href}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#5266eb] hover:bg-[#4356d6] text-white text-xs font-medium shadow-2xs transition-colors whitespace-nowrap"
          >
            <span>{L(locale, 'Дэлгэрэнгүй нээх', 'Full Dossier', '打开完整分析')}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-[#1d202b] transition-colors cursor-pointer"
              aria-label={L(locale, 'Хаах', 'Close inspector', '关闭面板')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Status + Countdown + PDF Extraction Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {daysLeft !== null && (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border tabular-nums ${
                closed
                  ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#181b24] dark:text-zinc-400 dark:border-[#282c3a]'
                  : daysLeft <= 3
                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400'
              }`}
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                {closed
                  ? L(locale, 'Хугацаа дууссан', 'Closed', '已截标')
                  : L(locale, `${daysLeft} хоног үлдсэн`, `${daysLeft}d left`, `剩 ${daysLeft} 天`)}
              </span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              evidenceStatus === 'complete'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                : docCount > 0 || evidenceStatus === 'partial'
                ? 'bg-[#5266eb]/10 text-[#5266eb] dark:text-[#9ea8ff] border-[#5266eb]/25'
                : 'bg-slate-100 text-slate-600 dark:bg-[#181b24] dark:text-zinc-400 border-slate-200 dark:border-[#282c3a]'
            }`}
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span>
              {evidenceStatus === 'complete'
                ? L(locale, `PDF уншигдсан (${docCount || 1})`, `PDF Extracted (${docCount || 1})`, `PDF 已解析 (${docCount || 1})`)
                : docCount > 0
                ? L(locale, `${docCount} баримттай`, `${docCount} Docs`, `${docCount} 份标书`)
                : L(locale, 'ТШЗ төлөв: Хүлээгдэж буй', 'PDF Pending', '待解析附件')}
            </span>
          </span>

          {loadingDetail && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#5266eb] dark:text-[#828fff] ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{L(locale, 'Ачааллаж байна…', 'Syncing…', '同步细节…')}</span>
            </span>
          )}
        </div>

        {/* Bilingual Title & Buyer */}
        <div>
          <h2 className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-zinc-50">
            {primaryTitle}
          </h2>
          {secondaryTitle && secondaryTitle !== primaryTitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
              {secondaryTitle}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{buyerLabel}</span>
          </div>
        </div>

        {/* 4-Cell Key Facts Strip */}
        <div className="grid grid-cols-2 rounded-lg border border-slate-200 dark:border-[#23252f] bg-slate-50/70 dark:bg-[#13151d] divide-x divide-y divide-slate-200 dark:divide-[#23252f] overflow-hidden">
          <div className="p-3 min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {L(locale, 'Төсөвт өртөг', 'Budget', '项目预算')}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white tabular-nums truncate">
              {money.primary}
            </div>
            {money.secondary && (
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums truncate">
                {money.secondary}
              </div>
            )}
          </div>

          <div className="p-3 min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {L(locale, 'Тендерийн баталгаа', 'Bid Security', '投标保证金')}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
              {bidSecurityText}
            </div>
          </div>

          <div className="p-3 min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {L(locale, 'Хугацаа / Байршил', 'Schedule & Delivery', '交货 / 截止日期')}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-800 dark:text-zinc-200 tabular-nums line-clamp-2">
              {deliveryValue}
            </div>
          </div>

          <div className="p-3 min-w-0">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {L(locale, 'Гадаад оролцоо', 'Foreign Eligibility', '外企准入')}
            </div>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${eligibility.toneClass}`}>
                <Globe2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{eligibility.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bid Readiness Scorecard */}
        <div className="rounded-lg border border-slate-200 dark:border-[#23252f] bg-white dark:bg-[#13151d] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-100">
              <ShieldCheck className="h-3.5 w-3.5 text-[#5266eb] dark:text-[#828fff]" />
              <span>{L(locale, 'Шаардлага & Бэлэн байдал', 'Bid Readiness Check', '资质与门槛核查')}</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-zinc-500">
              {tender.ruleName || tender.tenderTypeName}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 dark:text-zinc-400 shrink-0">
                {L(locale, 'Тусгай зөвшөөрөл', 'Licenses', '资质要求')}
              </span>
              <span className="text-right font-medium text-slate-800 dark:text-zinc-200 line-clamp-2">
                {licenses.length > 0
                  ? licenses.slice(0, 3).join(' · ')
                  : L(locale, 'Тусгай шаардлага бүртгэгдээгүй', 'No specific license listed', '未列出特殊资质')}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 dark:text-zinc-400 shrink-0">
                {L(locale, 'Борлуулалтын орлого', 'Turnover Min.', '营业额门槛')}
              </span>
              <span className="text-right font-medium text-slate-800 dark:text-zinc-200 tabular-nums line-clamp-2">
                {turnoverReq || L(locale, 'PDF ТШЗ-с шалгана уу', 'Verify in full BDS', '请在详情页查看 PDF 条款')}
              </span>
            </div>

            {chinaAnalysis && (locale === 'zh' ? chinaAnalysis.eligibilityExplanationZh : chinaAnalysis.eligibilityExplanationMn) && (
              <p className="pt-1.5 border-t border-slate-100 dark:border-[#1f222d] text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                {locale === 'zh' ? chinaAnalysis.eligibilityExplanationZh : chinaAnalysis.eligibilityExplanationMn}
              </p>
            )}
          </div>
        </div>

        {/* Preview BOQ / Technical Items */}
        <div className="rounded-lg border border-slate-200 dark:border-[#23252f] bg-white dark:bg-[#13151d] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-[#23252f] flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#11131a]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-100">
              <Package className="h-3.5 w-3.5 text-[#5266eb] dark:text-[#828fff]" />
              <span>{L(locale, 'Бараа, ажлын задаргаа', 'BOQ & Scope Preview', '采购清单预览')}</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400">
              {boqItems.length > 0 ? `${boqItems.length} ${L(locale, 'мөр', 'items', '项')}` : '—'}
            </span>
          </div>

          {boqItems.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-[#1e212b]">
              {boqItems.slice(0, 6).map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-zinc-200 line-clamp-2">
                      {item.name}
                    </div>
                    {item.spec && (
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                        {item.spec}
                      </div>
                    )}
                  </div>
                  {(item.quantity != null || item.unit) && (
                    <div className="shrink-0 text-right font-mono text-[11px] text-slate-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                      {item.quantity ?? '—'} {item.unit || ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3.5 py-5 text-center text-xs text-slate-500 dark:text-zinc-400">
              {loadingDetail
                ? L(locale, 'PDF болон техникийн тодорхойлолт татаж байна…', 'Loading PDF specifications…', '正在加载采购明细与技术参数…')
                : L(
                    locale,
                    'Урьдчилсан хүснэгт хараахан бүртгэгдээгүй — бүрэн хуудаснаас шалгана уу.',
                    'No structured BOQ preview yet — open Full Dossier to inspect attachments.',
                    '暂无结构化清单预览 — 请打开完整分析查看官方附件。'
                  )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Bottom AI Quick-Prompt Copilot Bar */}
      <div className="p-3.5 border-t border-slate-200 dark:border-[#23252f] bg-[#11131a] text-zinc-100 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-100">
            <Sparkles className="h-3.5 w-3.5 text-[#7c8cff]" />
            <span>{L(locale, 'AI PDF шинжээчээс шууд асуух', 'Ask AI Dossier Analyst', 'AI 标书助手快速提问')}</span>
          </span>
          <Link
            href={href}
            className="text-[11px] text-[#828fff] hover:text-white transition-colors"
          >
            {L(locale, 'Бүтэн PDF →', 'Full PDF →', '进入工作台 →')}
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onAskAI?.(tender, prompt)}
              className="px-2 py-1 rounded-md bg-[#181b24] hover:bg-[#5266eb]/20 border border-[#282c3a] hover:border-[#5266eb]/50 text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handlePromptSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={L(
              locale,
              'PDF болон шаардлагын талаар асуух...',
              'Ask anything about this tender PDF...',
              '输入问题分析 PDF 条款或清单...'
            )}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-[#181b24] border border-[#282c3a] text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#5e6ad2]"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="h-8 px-2.5 rounded-md bg-[#5266eb] hover:bg-[#4356d6] disabled:opacity-45 disabled:hover:bg-[#5266eb] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            aria-label={L(locale, 'Илгээх', 'Send question', '发送')}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};

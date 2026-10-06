'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  X, ExternalLink, Building2, Calendar, Clock, 
  DollarSign, FileText, ListChecks, Trophy, Sparkles, 
  ArrowUpRight, ShieldCheck, Tag, Copy, Check, FileCheck, Globe2,
  TrendingUp, Download, Lock, CheckCircle2, AlertTriangle, Handshake,
  Layers, ArrowRight, Zap, HelpCircle
} from 'lucide-react';
import { TenderItem, Locale } from '@/lib/types';
import { IndustryIcon } from '@/components/IndustryIcon';

interface TenderSlideOverProps {
  tender: TenderItem | null;
  isOpen: boolean;
  onClose: () => void;
  locale?: Locale;
  onAskAI?: (tender: TenderItem) => void;
  onOpenDocAudit?: (tender: TenderItem) => void;
  onOpenFinance?: (tender: TenderItem) => void;
  onOpenChinaSupplier?: (tender: TenderItem) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const TenderSlideOver: React.FC<TenderSlideOverProps> = ({
  tender,
  isOpen,
  onClose,
  locale = 'mn',
  onAskAI,
  onOpenDocAudit,
  onOpenFinance,
  onOpenChinaSupplier,
}) => {
  // Live Countdown Timer
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!tender?.receiveDate) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const target = new Date(tender.receiveDate!).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isExpired: false,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [tender?.receiveDate]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tender) return null;

  const portalUrl = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;
  const rawData = tender.raw_data || (tender as any).rawData;
  const llmExtracted = rawData?.llmExtracted;
  const structuredSpecs = rawData?.liveBundle?.structuredSpecs;

  const storedPdfUrl: string | undefined = 
    rawData?.pdfUrl || 
    rawData?.liveBundle?.documents?.find((d: any) => d.isStored || d.downloadUrl?.includes('supabase.co'))?.downloadUrl;
  const storedPdfFileName: string = 
    rawData?.pdfFileName || 
    rawData?.liveBundle?.documents?.find((d: any) => d.isStored)?.fileName || 
    `${tender.tenderCode || tender.invitationId}_ТШББ.pdf`;
  const hasStoredPdf = Boolean(storedPdfUrl);

  // Extract eligibility requirements
  const eligibilityReqs: string[] = 
    tender.eligibility_requirements ||
    llmExtracted?.eligibility_requirements || 
    llmExtracted?.key_requirements || 
    structuredSpecs?.keyRequirements || 
    (tender.bidRequirements?.requiredClearances?.map(c => c.nameMn) || [
      'Татварын өргүй тодорхойлолт (Цахим лавлагаа)',
      'Шүүхийн шийдвэр гүйцэтгэх газрын өргүй тодорхойлолт',
      'Нийгмийн даатгалын шимтгэл төлөлтийн тайлан',
      'Тендерийн баталгааны маягт (Банкны батлан даалт)'
    ]);

  // Extract full scope of work
  const scopeOfWork: string = 
    tender.full_scope_of_work ||
    llmExtracted?.full_scope_of_work || 
    structuredSpecs?.rawSpecText || 
    structuredSpecs?.fullScopeOfWork ||
    '';

  const budgetMnt = Number(tender.totalBudget) || 0;
  const budgetUsd = Math.round(budgetMnt / 3450);
  const budgetCny = Math.round(budgetMnt / 475);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-4xl bg-slate-950 shadow-2xl border-l border-slate-800 flex flex-col justify-between animate-in slide-in-from-right duration-300 text-slate-100">
          
          {/* 1. Top Header: Title & Buyer on Left, Prominent Countdown Timer on Right */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-900/90 shrink-0">
            
            {/* Top Left: Title, Code, & Buyer */}
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-blue-400 bg-blue-500/15 px-2.5 py-1 rounded-lg font-bold border border-blue-500/30">
                  {tender.tenderCode || tender.invitationNumber || `INV-${tender.invitationId}`}
                </span>
                
                <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
                  <IndustryIcon id={tender.industry || 'all'} className="h-3.5 w-3.5 text-blue-400" />
                  <span>{tender.industryName || tender.tenderTypeName || 'Ерөнхий бараа нийлүүлэлт'}</span>
                </span>

                <span className="text-xs text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {tender.docStatusName || (locale === 'mn' ? 'Санал авч буй' : 'Open for Bidding')}
                </span>

                {hasStoredPdf && (
                  <span className="text-xs text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded-lg font-bold border border-purple-500/30 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    <span>{locale === 'zh' ? '📄 标书已归档' : locale === 'mn' ? '📄 ТШЗ PDF' : '📄 PDF Ready'}</span>
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-xl font-black text-white leading-snug tracking-tight">
                {tender.tenderName}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
                <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-slate-200 font-semibold">{tender.budgetEntityName}</span>
              </div>
            </div>

            {/* Top Right: Prominent Countdown Timer & Close Button */}
            <div className="flex items-start gap-3 shrink-0">
              
              {/* Countdown Timer Box */}
              {timeLeft && (
                <div className={`px-3.5 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[150px] shadow-sm ${
                  timeLeft.isExpired
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : timeLeft.days <= 2
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200 shadow-amber-500/10'
                    : 'bg-slate-900 border-blue-500/40 text-blue-200'
                }`}>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    <Clock className={`h-3 w-3 ${timeLeft.isExpired ? 'text-rose-400' : 'text-amber-400 animate-spin'}`} />
                    <span>{locale === 'mn' ? 'Хугацаа дуусахад:' : locale === 'zh' ? '截标倒计时:' : 'Deadline Remaining:'}</span>
                  </div>

                  {timeLeft.isExpired ? (
                    <span className="text-xs font-bold font-mono text-rose-400">
                      {locale === 'mn' ? 'Хугацаа дууссан' : 'Bidding Closed'}
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1 font-mono font-black text-sm sm:text-base text-white">
                      <span>{String(timeLeft.days).padStart(2, '0')}d</span>
                      <span className="text-slate-500">:</span>
                      <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                      <span className="text-slate-500">:</span>
                      <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                      <span className="text-slate-500">:</span>
                      <span className="text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
                  </span>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer border border-slate-800"
                aria-label="Close slide-over"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          </div>

          {/* 2. Scrollable Body: 2-Column Grid (Raw Specs on Left, AI Summary on Right) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* 2-Column Main Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* === LEFT COLUMN: Raw Tender Specs === */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span>{locale === 'mn' ? 'Тендерийн үндсэн үзүүлэлт (Raw Specs)' : 'Tender Specifications'}</span>
                </div>

                {/* Budget Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {locale === 'mn' ? 'Зарлагдсан төсөвт өртөг (Total Budget)' : 'Declared Total Budget'}
                  </span>
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    ₮ {budgetMnt.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-2">
                    <span>≈ ${(budgetUsd).toLocaleString()} USD</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">≈ ¥{budgetCny.toLocaleString()} CNY</span>
                  </div>
                </div>

                {/* Eligibility & Compliance Checklist */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-blue-400" />
                      <span>{locale === 'mn' ? 'Шалгуур үзүүлэлт & Шаардлага' : 'Eligibility & Clearances'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {eligibilityReqs.length} шаардлага
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {eligibilityReqs.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Scope Preview */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-purple-400" />
                      <span>{locale === 'mn' ? 'Ажлын даалгавар / Техникийн үзүүлэлт' : 'Technical Specifications Scope'}</span>
                    </span>
                    {hasStoredPdf && (
                      <a
                        href={storedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={storedPdfFileName}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        <span>{locale === 'mn' ? 'ТШЗ Татах' : 'Download PDF'}</span>
                      </a>
                    )}
                  </div>
                  
                  {scopeOfWork ? (
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                      {scopeOfWork}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 text-center italic">
                      {hasStoredPdf
                        ? (locale === 'mn' ? 'Тендерийн албан ёсны ТШЗ PDF баримт хадгалагдсан байна. Шууд татаж авна уу.' : 'Official PDF specification ready. Use download button to view.')
                        : (locale === 'mn' ? 'Техникийн тодорхойлолтыг албан ёсны PDF баримтаас татаж үзнэ үү.' : 'Download technical specification document for complete details.')}
                    </div>
                  )}
                </div>
              </div>

              {/* === RIGHT COLUMN: AI Summary & Foreign Supplier Intelligence === */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>{locale === 'mn' ? 'AI Шинжилгээ & Гадаад нийлүүлэгчийн давуу тал' : 'AI Supplier Intelligence'}</span>
                </div>

                {/* Why this tender is good for foreign suppliers */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/30 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg">
                        <Zap className="h-4 w-4 text-amber-300" />
                      </span>
                      <span className="text-xs font-bold text-white">
                        {locale === 'zh' ? '💡 为什么该标段适合跨境参与？' : locale === 'mn' ? '💡 Оролцох боломж & Давуу тал' : '💡 Procurement Opportunity'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {locale === 'mn' ? 'Төрийн худалдан авалт' : 'Direct Gov Budget'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {locale === 'zh'
                      ? `蒙古国本级采购预算为 ₮${(budgetMnt / 1e6).toFixed(1)}M (约 ¥${budgetCny.toLocaleString()} CNY / $${budgetUsd.toLocaleString()} USD)。具备完整官方采购清单，支持工厂直接供货与技术对接。`
                      : locale === 'mn'
                      ? `Энэхүү төсөл нь нийт ₮${budgetMnt.toLocaleString()} өртөгтэй бөгөөд албан ёсны техникийн шаардлагын дагуу шууд нийлүүлэх болон түншлэлээр оролцох бүрэн боломжтой.`
                      : `Total procurement budget volume is ₮${budgetMnt.toLocaleString()} (~$${budgetUsd.toLocaleString()} USD / ~¥${budgetCny.toLocaleString()} CNY) with complete official specifications.`}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Өрсөлдөөний түвшин</span>
                      <span className="text-xs font-bold text-emerald-400 mt-0.5 block">Дундаж (3-4 оролцогч)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Төлбөрийн нөхцөл</span>
                      <span className="text-xs font-bold text-blue-400 mt-0.5 block">100% Төрийн сан</span>
                    </div>
                  </div>
                </div>

                {/* Recommended Winning Strategy */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>{locale === 'mn' ? 'Ялах стратеги & Зөвлөмж' : 'Recommended Bidding Strategy'}</span>
                  </span>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <p className="leading-relaxed"><strong>Төсвийн 88-92% үнийн санал:</strong> Хэт хямд үнэ өгөхгүйгээр чанарын шалгуурт тэнцэх оновчтой интервал.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <p className="leading-relaxed"><strong>Түншлэл & Гаалийн бүрдүүлэлт:</strong> Барааг Замын-Үүд / Улаанбаатар DDP нөхцөлөөр хүргэх түншийг ашиглах.</p>
                    </div>
                  </div>
                </div>

                {/* Quick AI Consultant Action */}
                {onAskAI && (
                  <button
                    onClick={() => {
                      onClose();
                      onAskAI(tender);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span>{locale === 'mn' ? 'AI Шинжээчээр бичиг баримт шалгуулах' : 'Ask AI to analyze this bid in detail'}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

              </div>
            </div>

          </div>

          {/* 3. Sticky Bottom Footer: Split Action Conversion Funnel */}
          <div className="sticky bottom-0 z-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl shrink-0">
            
            {/* Left Info: Trust Guarantee & Official Portal Link */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-300">
                  {locale === 'mn' ? 'Баталгаат тендерийн экосистем' : locale === 'zh' ? '100% 官方合规与本土联合体履约保障' : 'Verified Bidding & Facilitation Service'}
                </span>
              </div>

              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors font-medium sm:ml-2"
                title="Open official tender.gov.mn page"
              >
                <span>tender.gov.mn</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Right: High-Converting Split Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              
              {/* Secondary Button: Download Specs (Self-Serve Option) */}
              <a
                href={hasStoredPdf ? storedPdfUrl : portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={hasStoredPdf ? storedPdfFileName : undefined}
                className={`flex-1 sm:flex-initial h-11 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs ${
                  hasStoredPdf
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border-emerald-500/50'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
                }`}
                title={hasStoredPdf ? 'Supabase CDN-ээс шууд татах' : 'tender.gov.mn албан ёсны портал дээр нээх'}
              >
                <Download className={`h-4 w-4 ${hasStoredPdf ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>
                  {hasStoredPdf
                    ? (locale === 'mn' ? '⚡ ТШЗ Татах (PDF)' : locale === 'zh' ? '⚡ 下载招标文件 (PDF)' : '⚡ Download PDF')
                    : (locale === 'mn' ? 'Материал татах' : locale === 'zh' ? '下载招标文件' : 'Download Specs')}
                </span>
              </a>

              {/* Primary Button: Premium Local Facilitation Service */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenChinaSupplier) onOpenChinaSupplier(tender);
                }}
                className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer border border-blue-400/40"
              >
                <Lock className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span>
                  {locale === 'mn'
                    ? 'Төсөлд хамтран оролцох'
                    : locale === 'zh'
                    ? '申请本地联合体协助投标'
                    : 'Request Local Facilitation'}
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0 ml-0.5" />
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

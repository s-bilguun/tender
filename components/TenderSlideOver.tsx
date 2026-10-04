'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { 
  X, ExternalLink, Building2, Calendar, Clock, 
  DollarSign, FileText, ListChecks, Trophy, Sparkles, 
  ArrowUpRight, ShieldCheck, Tag, Copy, Check, FileCheck, Globe2,
  TrendingUp
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
  onOpenArbitrage?: (tender: TenderItem) => void;
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
  onOpenArbitrage,
}) => {
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

  // Extract eligibility requirements
  const eligibilityReqs: string[] = 
    tender.eligibility_requirements ||
    llmExtracted?.eligibility_requirements || 
    llmExtracted?.key_requirements || 
    structuredSpecs?.keyRequirements || 
    (tender.bidRequirements?.requiredClearances?.map(c => c.nameMn) || []);

  // Extract full scope of work
  const scopeOfWork: string = 
    tender.full_scope_of_work ||
    llmExtracted?.full_scope_of_work || 
    structuredSpecs?.rawSpecText || 
    structuredSpecs?.fullScopeOfWork ||
    '';

  // Extract historical comparison notes
  const historicalNotes: string = 
    tender.historical_flags ||
    llmExtracted?.historical_comparison_flags || 
    llmExtracted?.historical_comparison_notes || 
    structuredSpecs?.historicalNotes || 
    '';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* 1. Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md font-bold border border-blue-200">
                  {tender.tenderCode || tender.invitationNumber}
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                  <IndustryIcon id={tender.industry || 'all'} className="h-3 w-3" />
                  <span>{tender.industryName || tender.tenderTypeName || 'Тендер'}</span>
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                  {tender.docStatusName || 'Идэвхтэй'}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {tender.tenderName}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{tender.budgetEntityName}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm text-slate-700">
            
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Төсөвт өртөг</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 font-sans block">
                  ₮ {(Number(tender.totalBudget) || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Нийтэлсэн огноо</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono block">
                  {tender.publishDate ? tender.publishDate.split('T')[0] : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Эцсийн хугацаа</span>
                <span className="text-xs sm:text-sm font-bold text-rose-700 font-mono block">
                  {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
                </span>
              </div>
            </div>

            {/* Quick Ecosystem Power-Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {onOpenArbitrage && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenArbitrage(tender);
                  }}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                  <span>{locale === 'zh' ? '测算差价' : 'Үнийн зөрүү'}</span>
                </button>
              )}

              {onOpenDocAudit && (
                <button
                  onClick={() => onOpenDocAudit(tender)}
                  className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span>ТББ Шалгагч</span>
                </button>
              )}

              {onOpenFinance && (
                <button
                  onClick={() => onOpenFinance(tender)}
                  className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Баталгаа</span>
                </button>
              )}

              {onOpenChinaSupplier && (
                <button
                  onClick={() => onOpenChinaSupplier(tender)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Globe2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>{locale === 'zh' ? '跨国直投' : 'Түнш олох'}</span>
                </button>
              )}
            </div>

            {/* Eligibility & Technical Requirements */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <ListChecks className="h-4 w-4 text-blue-600" />
                <span>Шалгуур үзүүлэлтүүд (Eligibility & Requirements):</span>
              </div>

              {eligibilityReqs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Энэхүү тендерт тусгайлан заасан шалгуурыг баримт бичгээс бүрэн татаж үзнэ үү.</p>
              ) : (
                <ul className="space-y-2 pl-1">
                  {eligibilityReqs.map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-700 leading-relaxed text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Full Scope of Work / Technical Specifications */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Ажлын даалгавар / Техникийн дэлгэрэнгүй тодорхойлолт (Full Scope of Work):</span>
                </span>
              </div>

              {scopeOfWork ? (
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 max-h-72 overflow-y-auto text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {scopeOfWork}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                  PDF текстийг бүрэн дэлгэрэнгүйгээр албан ёсны эх сурвалж эсвэл дэлгэрэнгүй хуудаснаас үзнэ үү.
                </div>
              )}
            </div>

            {/* Historical Comparison Notes */}
            {historicalNotes && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Түүхэн харьцуулалтын тэмдэглэл (Historical Benchmark):</span>
                </span>
                <p className="text-xs text-amber-950 leading-relaxed">
                  {historicalNotes}
                </p>
              </div>
            )}

          </div>

          {/* 3. Sticky Bottom Action Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>tender.gov.mn эх сурвалж</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div className="flex items-center gap-2">
              {onAskAI && (
                <button
                  onClick={() => {
                    onClose();
                    onAskAI(tender);
                  }}
                  className="h-10 px-3.5 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>AI Зөвлөх</span>
                </button>
              )}

              <Link
                href={`/tender/${tender.invitationId}`}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <span>Бүтэн хуудсаар нээх</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

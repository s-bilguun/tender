'use client';

import React, { useState } from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { 
  X, FileText, Download, ExternalLink, Maximize2, Minimize2, 
  Sparkles, CheckCircle2, ListChecks, Building2, Tag, Copy, Check,
  ChevronRight, ArrowRight, BookOpen, AlertCircle
} from 'lucide-react';

interface TenderPdfReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender: TenderItem | null;
  pdfUrl?: string | null;
  fileName?: string;
  locale?: Locale;
  onAskAI?: (tender: TenderItem, question?: string) => void;
}

export const TenderPdfReaderModal: React.FC<TenderPdfReaderModalProps> = ({
  isOpen,
  onClose,
  tender,
  pdfUrl,
  fileName,
  locale = 'mn',
  onAskAI,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'text' | 'ai'>('pdf');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen || !tender) return null;

  const rawData = (tender as any).rawData || (tender as any).raw_data || {};
  const liveBundle = rawData?.liveBundle || {};
  const storedDoc = liveBundle?.documents?.[0];
  
  const effectivePdfUrl = pdfUrl || rawData?.pdfUrl || storedDoc?.downloadUrl;
  const effectiveFileName = fileName || rawData?.pdfFileName || storedDoc?.fileName || `${tender.tenderCode || tender.invitationNumber || 'ТШББ'}.pdf`;
  const pageCount = rawData?.pdfPageCount || storedDoc?.pageCount || storedDoc?.totalPageCount;
  const fileSizeKb = storedDoc?.fileSize ? Math.round(storedDoc.fileSize / 1024) : null;

  // Extracted scope & eligibility
  const eligibilityReqs: string[] = 
    (tender as any).eligibility_requirements ||
    rawData?.llmExtracted?.eligibility_requirements || 
    liveBundle?.structuredSpecs?.keyRequirements || 
    [];

  const scopeOfWork: string = 
    (tender as any).full_scope_of_work ||
    rawData?.llmExtracted?.full_scope_of_work || 
    liveBundle?.structuredSpecs?.rawSpecText || 
    liveBundle?.fullScopeOfWork ||
    '';

  const handleCopyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleQuickAsk = (questionText: string) => {
    onClose();
    if (onAskAI) {
      onAskAI(tender, questionText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'fixed inset-2 sm:inset-4 rounded-xl z-50' 
            : 'w-full max-w-5xl h-[88vh] rounded-2xl'
        }`}
      >
        
        {/* Top Navigation Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          
          {/* File Title & Status */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  {tender.tenderCode || tender.invitationNumber || `INV-${tender.invitationId}`}
                </span>
                {pageCount && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    • {pageCount} хуудас
                  </span>
                )}
                {fileSizeKb && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    • {fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5" title={effectiveFileName}>
                {effectiveFileName}
              </h2>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="hidden md:flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
              <span>{locale === 'zh' ? '📄 原版 PDF' : locale === 'mn' ? '📄 Эх PDF' : '📄 PDF View'}</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListChecks className="h-3.5 w-3.5 text-blue-500" />
              <span>{locale === 'zh' ? '📋 提取文本' : locale === 'mn' ? '📋 Текст & Үзүүлэлт' : '📋 Extracted Text'}</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{locale === 'zh' ? '🤖 AI 提问' : locale === 'mn' ? '🤖 AI Шинжээч' : '🤖 Ask AI'}</span>
            </button>
          </div>

          {/* Controls: Fullscreen, Download, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {effectivePdfUrl && (
              <a
                href={effectivePdfUrl}
                download={effectiveFileName}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="PDF файлыг татаж авах"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">{locale === 'mn' ? 'Татах' : 'Download'}</span>
              </a>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Багасгах' : 'Бүтэн дэлгэц'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Хаах"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Mode Tabs */}
        <div className="md:hidden flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-semibold p-1">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'pdf' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            Эх PDF
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'text' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            Текст
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'ai' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            AI Шинжээч
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-950 flex flex-col">
          
          {/* TAB 1: Original PDF Viewer (Iframe Native Embed) */}
          {activeTab === 'pdf' && (
            <div className="w-full h-full flex flex-col relative">
              {effectivePdfUrl ? (
                <iframe
                  src={`${effectivePdfUrl}#toolbar=1&navpanes=1`}
                  title={effectiveFileName}
                  className="w-full h-full border-0 bg-slate-200 dark:bg-slate-900"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    Энэ тендерийн PDF баримт ачаалагдаагүй байна
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Төрийн портал дээрээс татаж үзнэ үү.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Extracted Text & Specifications */}
          {activeTab === 'text' && (
            <div className="w-full h-full overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
              
              {/* Tender Quick Summary Header */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Тендерийн нэр & Захиалагч
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {tender.tenderName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                  <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{tender.budgetEntityName}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₮ {Number(tender.totalBudget || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Eligibility Criteria */}
              {eligibilityReqs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-blue-500" />
                      <span>Шалгуур үзүүлэлт & Шаардагдах тусгай зөвшөөрөл</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {eligibilityReqs.length} үзүүлэлт
                    </span>
                  </div>

                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {eligibilityReqs.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Scope / Specifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-purple-500" />
                    <span>Техникийн даалгавар, ажлын тоо хэмжээний задаргаа (BoQ)</span>
                  </span>
                  
                  {scopeOfWork && (
                    <button
                      onClick={() => handleCopyText(scopeOfWork)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                    >
                      {copiedText ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedText ? 'Хуулагдлаа' : 'Текст хуулах'}</span>
                    </button>
                  )}
                </div>

                {scopeOfWork ? (
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto selection:bg-blue-600 selection:text-white border border-slate-800">
                    {scopeOfWork}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Техникийн дэлгэрэнгүй үзүүлэлтийг зүүн талын "Эх PDF" цонхоор бүтнээр нь гүйлгэн харна уу.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: AI PDF Analyst */}
          {activeTab === 'ai' && (
            <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center">
              <div className="max-w-md w-full space-y-4">
                
                <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-8 w-8" />
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {locale === 'zh' ? '关于此标书的 AI 深度问答' : locale === 'mn' ? 'Энэхүү ТШЗ PDF-ийн талаар AI-аас асуух' : 'Ask AI About This Specification'}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {locale === 'zh'
                    ? 'AI 已经分析了该官方招标文件的核心条款，您可以直接提问关于供货要求、资质以及跨境参与资格。'
                    : 'AI шинжээч уг тендерийн албан ёсны PDF баримт бичгийг бүрэн задлан уншсан бөгөөд таны асуултад шууд хариулна.'}
                </p>

                {/* Quick Prompts */}
                <div className="space-y-2 text-left pt-2">
                  <button
                    onClick={() => handleQuickAsk('Энэ тендерийн техникийн гол шаардлага, нийлүүлэх бараа ажлын хэмжээ юу вэ?')}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-blue-300 text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <span>1. Техникийн гол шаардлага, тоо хэмжээ юу вэ?</span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleQuickAsk('Оролцогчдод тавигдах тусгай зөвшөөрөл, борлуулалтын орлого ямар хэмжээтэй заасан бэ?')}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-blue-300 text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <span>2. Тусгай зөвшөөрөл, борлуулалтын орлогын босго?</span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleQuickAsk('Гадаад эсвэл Хятад компани энэ тендерт бие даан оролцох боломжтой юу, эсвэл Монголын компанитай түншлэл (JV) байгуулах ёстой юу?')}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-blue-300 text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                  >
                    <span>3. Гадаад / Хятад компани оролцох боломж, банкны баталгаа?</span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Storage CDN • Албан ёсны ТШББ файл</span>
          </div>

          <div className="flex items-center gap-3">
            {effectivePdfUrl && (
              <a
                href={effectivePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Шинэ цонхонд нээх</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

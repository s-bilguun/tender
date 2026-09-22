'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Building2, Calendar, ShieldCheck, Tag, FileText, 
  Copy, Check, Trophy, Users, CheckCircle2, XCircle, AlertCircle, 
  ExternalLink, Sparkles, Clock, AlertTriangle, Layers, Briefcase, 
  CheckSquare, FileSpreadsheet, Download, RefreshCw, Eye, X
} from 'lucide-react';

interface TenderDetailViewProps {
  initialData: any;
}

export const TenderDetailView: React.FC<TenderDetailViewProps> = ({ initialData }) => {
  const [data, setData] = useState(initialData);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'bds' | 'tech' | 'results' | 'history'>('bds');

  // AI chat question states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ₮';
    return `${amount.toLocaleString()} ₮`;
  };

  const handleCopyCode = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  const [copiedStructuredJson, setCopiedStructuredJson] = useState(false);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [expandedDocSummaries, setExpandedDocSummaries] = useState<Record<string, boolean>>({});

  const handleRunAiAnalysis = async (customPrompt?: string) => {
    if (!data?.tender) return;
    setAiAnalyzing(true);
    const promptText = customPrompt || `Энэ тендерийн ТШББ (I Бүлэг: Өгөгдлийн хүснэгт) болон Техникийн тодорхойлолт (II Бүлэг)-ийн PDF болон баримтуудаас задлан шинжилсэн гол шаардлага, тусгай зөвшөөрөл, санхүүгийн босго, техникийн эрсдэл, өрсөлдөхөд анхаарах зүйлсийг цэгцтэй шинжилж зөвлөнө үү.`;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          tenderContext: {
            ...data.tender,
            bds: data.bds,
            technicalSpecs: data.technicalSpecs,
            results: data.results,
          }
        })
      });
      const resJson = await res.json();
      setAiAnalysis(resJson.reply || resJson.text || 'Шинжилгээ амжилттай хийгдлээ.');
    } catch (e) {
      setAiAnalysis('AI шинжилгээ хийх явцад алдаа гарлаа.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleCopyStructuredJson = () => {
    const payload = {
      tender: {
        code: data.tender.tenderCode,
        name: data.tender.tenderName,
        budget: data.tender.totalBudget,
        agency: data.tender.budgetEntityName,
        deadline: data.tender.receiveDate,
      },
      bdsRequirements: data.bds,
      technicalSpecifications: data.technicalSpecs,
      results: data.results,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedStructuredJson(true);
    setTimeout(() => setCopiedStructuredJson(false), 2000);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDocSummary = (id: string) => {
    setExpandedDocSummaries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { tender, bds, technicalSpecs, results, relatedByEntity, similarTenders } = data;
  const publicLink = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;
  const supplierLink = `https://user.tender.gov.mn/mn/supplier/available/${tender.invitationId}/detail`;

  const isConcluded = tender.docStatusName?.includes('Үр дүн') || tender.docStatusName?.includes('Дууссан');

  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docModalOpen, setDocModalOpen] = useState(false);

  const handleDownloadDocument = (doc: any) => {
    const content = `=====================================================
БАРИМТ БИЧИГ: ${doc.name}
Ангилал: ${doc.category || 'Тендерийн баримт бичиг'}
Огноо: ${doc.date || ''}
Тендерийн код: ${tender.tenderCode || tender.invitationNumber}
Тендерийн нэр: ${tender.tenderName}
Захиалагч байгууллага: ${tender.budgetEntityName}
Нийт төсөвт өртөг: ${formatCurrency(tender.totalBudget)}
=====================================================

${doc.extractedSummary || ''}

-----------------------------------------------------
I БҮЛЭГ. ӨГӨГДЛИЙН ХҮСНЭГТ (ТШӨХ) ШААРДЛАГУУД:
• Борлуулалтын доод орлого: ${formatCurrency(bds.minAnnualTurnover)}
• Түргэн хөрвөх чадвартай хөрөнгө: ${formatCurrency(bds.minLiquidAssets)}
• Ижил төстэй гэрээний дүн: ${formatCurrency(bds.similarContractThreshold)}
• Тендерийн баталгаа: ${formatCurrency(bds.bidSecurityAmount)}

ШААРДЛАГАТАЙ ТУСГАЙ ЗӨВШӨӨРЛҮҮД:
${bds.requiredLicenses.map((lic: string, i: number) => `${i + 1}. ${lic}`).join('\n')}

ГОЛ БОЛОВСОН ХҮЧНИЙ ШААРДЛАГА:
${bds.keyPersonnel.map((p: any) => `• ${p.role}: ${p.count} хүн (${p.qualification})`).join('\n')}

ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & БАРАА, АЖЛЫН ШААРДЛАГА:
${technicalSpecs.sampleItems.map((it: any) => `• ${it.name} | Тоо хэмжээ: ${it.quantity} ${it.unit} | Үзүүлэлт: ${it.spec}`).join('\n')}

Нийлүүлэлтийн байршил: ${technicalSpecs.deliveryLocation}
Хугацаа: ${technicalSpecs.deliveryPeriodDays} хоног
Баталгаат хугацаа: ${technicalSpecs.warrantyMonths} сар
=====================================================
Эх сурвалж: Монгол Улсын Төрийн Худалдан Авах Ажиллагааны Систем (tender.gov.mn)
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\.[a-z0-9]+$/i, '')}_боловсруулсан_өгөгдөл.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Бүх тендер рүү буцах</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
          <span className="text-xs text-slate-500 hidden md:inline font-mono">
            {tender.tenderCode || tender.invitationNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunAiAnalysis()}
            disabled={aiAnalyzing}
            className="h-8 px-3 rounded-md text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>{aiAnalyzing ? 'Шинжилж байна...' : 'AI Шинжээч'}</span>
          </button>
          <a
            href={publicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>tender.gov.mn</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
          <a
            href={supplierLink}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3.5 rounded-md text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Оролцох</span>
            <ExternalLink className="h-3 w-3 text-slate-300" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Header Hero Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
              <span>{tender.tenderCode || tender.invitationNumber}</span>
              <button
                onClick={() => handleCopyCode(tender.tenderCode || tender.invitationNumber)}
                className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                title="Код хуулах"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {tender.tenderTypeName || 'Тендер'}
            </span>
            <span className={`font-semibold px-2 py-0.5 rounded border ${
              isConcluded ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {tender.docStatusName || 'Идэвхтэй'}
            </span>
            {tender.receiveDate && (
              <span className="text-slate-500 font-medium ml-auto flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Эцсийн хугацаа: {tender.receiveDate}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {tender.tenderName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{tender.budgetEntityName}</span>
            </div>
            {tender.positionName && (
              <div className="text-slate-500">
                Харьяалал: <span className="font-medium text-slate-700">{tender.positionName}</span>
              </div>
            )}
            {tender.ruleName && (
              <div className="text-slate-500">
                Арга: <span className="font-medium text-slate-700">{tender.ruleName}</span>
              </div>
            )}
            {tender.fundName && (
              <div className="text-slate-500">
                Эх үүсвэр: <span className="font-medium text-slate-700">{tender.fundName}</span>
              </div>
            )}
          </div>

          {/* Interactive AI Quick Prompts based on Structured PDF Data */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>AI Шинжээчээс асуух:</span>
            </span>
            <button
              onClick={() => handleRunAiAnalysis('Энэ тендерт шаардагдах тусгай зөвшөөрөл, түлхүүр боловсон хүчин, өмнөх туршлагын шалгуурыг нарийвчлан шинжилж, оролцогчдод анхаарах зүйлсийг нэгтгэнэ үү.')}
              disabled={aiAnalyzing}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1"
            >
              <span>🛡️ Тусгай зөвшөөрөл & Шалгуур</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis('Энэ тендерийн борлуулалтын доод орлогын босго, түргэн хөрвөх чадвартай хөрөнгө, тендерийн баталгааны тооцоолол болон санхүүгийн эрсдэлийг тооцож өгнө үү.')}
              disabled={aiAnalyzing}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1"
            >
              <span>💰 Санхүүгийн босго & Баталгаа</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis('Техникийн тодорхойлолт, нийлүүлэлтийн хуваарь, чанарын стандартууд (MNS/ISO), алданги торгуулийн заалт дээр оролцогчдын зүгээс анхаарах гол эрсдэлүүд юу байна вэ?')}
              disabled={aiAnalyzing}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1"
            >
              <span>⚙️ Техникийн үзүүлэлтийн эрсдэл</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis('Тендерт оролцоход бүрдүүлэх баримт бичгийн хяналтын хуудас (Checklist) болон цахим системээр үнийн санал илгээх стратегийг зөвлөнө үү.')}
              disabled={aiAnalyzing}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1"
            >
              <span>📋 Баримт бичгийн хяналт</span>
            </button>
          </div>
        </div>

        {/* AI Analysis Result Callout (if executed) */}
        {aiAnalysis && (
          <div className="bg-gradient-to-r from-amber-50/90 via-blue-50/70 to-slate-50 border border-amber-300/80 rounded-xl p-5 shadow-xs animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>AI Шинжээчийн Дүгнэлт & Зөвлөмж</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiAnalysis);
                    setCopiedAnalysis(true);
                    setTimeout(() => setCopiedAnalysis(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 transition-colors flex items-center gap-1"
                >
                  {copiedAnalysis ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedAnalysis ? 'Хуулагдлаа' : 'Шинжилгээг хуулах'}</span>
                </button>
                <button
                  onClick={() => setAiAnalysis(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                  title="Хаах"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans select-text">
              {aiAnalysis}
            </div>
          </div>
        )}

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Нийт төсөвт өртөг
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-950 block">
              {formatCurrency(tender.totalBudget)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Батлагдсан нийт төсөв</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Тухайн онд санхүүжих
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-800 block">
              {formatCurrency(tender.yearBudget || tender.totalBudget)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Энэ оны хуваарьт санхүүжилт</span>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
              Тендерийн баталгаа (1%-2%)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-blue-950 block">
              {formatCurrency(bds.bidSecurity1Pct)} - {formatCurrency(bds.bidSecurity2Pct)}
            </span>
            <span className="text-[10px] text-blue-600 mt-1 block">Банкны баталгаа эсвэл даатгал</span>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Гүйцэтгэлийн баталгаа (5%)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-950 block">
              {formatCurrency(bds.performanceBond5Pct)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-1 block">Гэрээ байгуулах үед байршуулах</span>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('bds')}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'bds'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>I БҮЛЭГ: ӨГӨГДЛИЙН ХҮСНЭГТ (ТШӨХ)</span>
            </button>

            <button
              onClick={() => setActiveTab('tech')}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'tech'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & ТЭЗҮ</span>
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'results'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>ШАЛГАРУУЛАЛТЫН ҮР ДҮН & ОРОЛЦОГЧИД</span>
              {isConcluded && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold">
                  Үр дүн гарсан
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>ТҮҮХЭН ХОЛБООТОЙ ТЕНДЕРҮҮД</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                {relatedByEntity.length + similarTenders.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 shadow-xs">
          
          {/* TAB 1: I БҮЛЭГ: ӨГӨГДЛИЙН ХҮСНЭГТ (ТШӨХ) */}
          {activeTab === 'bds' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    <span>Тендер Шалгаруулалтын Өгөгдлийн Хүснэгт (ТШӨХ - Bid Data Sheet)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Төрийн худалдан авах ажиллагааны жишиг баримт бичиг болон PDF-ээс задлан бүтцэд оруулсан шалгуурууд.
                  </p>
                </div>
                <button
                  onClick={handleCopyStructuredJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0 shadow-2xs transition-colors"
                  title="Бүх бүтцийн өгөгдлийг JSON хэлбэрээр санах ойд хуулах"
                >
                  {copiedStructuredJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copiedStructuredJson ? 'JSON хуулагдлаа' : 'Бүтцийн өгөгдлийг хуулах (JSON)'}</span>
                </button>
              </div>

              {/* 1. Тусгай зөвшөөрөл */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span>1. Шаардагдах тусгай зөвшөөрөл & Эрхийн бичиг</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Заавал биелүүлэх</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {bds.requiredLicenses.map((lic: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{lic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Санхүүгийн шалгуур үзүүлэлт */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span>2. Санхүүгийн чадавхын босго шаардлага</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Сүүлийн 1-3 жилийн дундаж борлуулалтын доод орлого:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                      {formatCurrency(bds.minAnnualTurnover)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">* Нийт төсөвт өртгийн {tender.tenderTypeCode === 'JOB' ? '80%' : '50%'}-иас доошгүй</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Түргэн хөрвөх чадвартай хөрөнгө / Зээлжих боломж:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                      {formatCurrency(bds.minLiquidAssets)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">* Банкны дансны үлдэгдэл эсвэл зээл авах боломжийн тодорхойлолт</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Ижил төстэй ажил гүйцэтгэсэн гэрээний доод босго:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                      {formatCurrency(bds.similarContractThreshold)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">* Сүүлийн {bds.similarContractYears} жилд 1-ээс доошгүй удаа ижил төстэй ажил хийсэн байх</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Татварын өрийн тодорхойлолт:</span>
                    <span className="text-sm font-bold text-emerald-700 mt-1 block">
                      Хугацаа хэтэрсэн өргүй байх
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">* e-Mongolia эсвэл Татварын ерөнхий газрын цахим лавлагаа</span>
                  </div>
                </div>
              </div>

              {/* 3. Түлхүүр боловсон хүчин */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>3. Түлхүүр боловсон хүчний шаардлага</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Албан тушаал</th>
                        <th className="py-2.5 px-3 text-center">Тоо</th>
                        <th className="py-2.5 px-3">Мэргэжил ба шаардлага</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bds.keyPersonnel.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{p.role}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">{p.count}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.qualification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Машин механизм, техник тоног төхөөрөмж */}
              {bds.machinery && bds.machinery.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <span>4. Шаардагдах машин механизм, тоног төхөөрөмж</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {bds.machinery.map((m: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Хуулийн ерөнхий нөхцөлүүд */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>5. Хугацаа ба Үнэлгээний жин</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Тендер хүчинтэй байх:</span>
                    <span className="font-bold text-slate-900 mt-1 block">{bds.validityDays} хоног</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Тодруулга авах хугацаа:</span>
                    <span className="font-bold text-slate-900 mt-1 block">Нээхээс {bds.clarificationDays} хоногийн өмнө</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Үнийн саналын жин:</span>
                    <span className="font-bold text-blue-700 mt-1 block">{bds.evaluationCriteria.priceWeight}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Чанарын үнэлгээний жин:</span>
                    <span className="font-bold text-blue-700 mt-1 block">{bds.evaluationCriteria.qualityWeight}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & ТЭЗҮ */}
          {activeTab === 'tech' && (
            <div className="space-y-7">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <span>Техникийн тодорхойлолт, ТЭЗҮ ба Нийлүүлэлтийн нөхцөл</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Захиалагч байгууллагаас тавьсан бүтээгдэхүүн, ажлын чанар стандартын шаардлага ба PDF баримтаас задлан бүтцэд оруулсан хүснэгтүүд.
                </p>
              </div>

              {/* 1. БҮТЦЭД ОРУУЛСАН БАРАА / АЖЛЫН ҮЗҮҮЛЭЛТИЙН ХҮСНЭГТ */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <span>Нийлүүлэх бараа, гүйцэтгэх ажлын нарийвчилсан үзүүлэлт ({technicalSpecs.sampleItems.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">PDF-ээс ялгасан бодит үзүүлэлт</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Бараа / Ажлын нэр</th>
                          <th className="py-2.5 px-3 text-center">Тоо хэмжээ</th>
                          <th className="py-2.5 px-3 text-center">Хэмжих нэгж</th>
                          <th className="py-2.5 px-3">Техникийн тодорхойлолт & Чанарын шаардлага</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {technicalSpecs.sampleItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">{item.quantity}</td>
                            <td className="py-3 px-3 text-center text-slate-600">{item.unit}</td>
                            <td className="py-3 px-3 text-slate-700 leading-relaxed max-w-md">{item.spec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Delivery Conditions & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-xs block mb-1">Нийлүүлэх / Гүйцэтгэх газар:</span>
                  <span className="text-xs font-bold text-slate-900 block">{technicalSpecs.deliveryLocation}</span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-xs block mb-1">Нийлүүлэлтийн хугацаа:</span>
                  <span className="text-xs font-bold text-slate-900 block">Гэрээ байгуулснаас хойш {technicalSpecs.deliveryPeriodDays} хоног</span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-xs block mb-1">Баталгаат хугацаа:</span>
                  <span className="text-xs font-bold text-slate-900 block">{technicalSpecs.warrantyMonths} сар</span>
                </div>
              </div>

              {/* 3. Төлбөрийн нөхцөл & Алдангийн заалт */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span>Төлбөрийн нөхцөл ба Алдангийн заалт</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Урьдчилгаа төлбөр:</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {technicalSpecs.paymentTerms?.advancePaymentPct || 20}%
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Гэрээ байгуулж баталгаа гаргаснаар</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Чанарын барьцаа:</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {technicalSpecs.paymentTerms?.retentionBondPct || 5}% ({technicalSpecs.paymentTerms?.retentionPeriodMonths || 12} сар)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Баталгаат хугацаа дуусмагц буцаан олгоно</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Алданги, хариуцлага:</span>
                    <span className="font-bold text-rose-700 mt-1 block">
                      {technicalSpecs.penaltyClause?.dailyRate || '0.1%'} / өдөр бүр (Дээд тал {technicalSpecs.penaltyClause?.maxLimit || '10%'})
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Хугацаа хэтрүүлбэл тооцох хуулийн хэмжээ</span>
                  </div>
                </div>
              </div>

              {/* 4. Standards */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Чанарын шаардлага ба стандартууд</h4>
                <div className="space-y-2 pt-1">
                  {technicalSpecs.standards.map((std: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{std}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. ШААРДАГДАХ БАРИМТ БИЧГИЙН ХЯНАЛТЫН ХУУДАС (CHECKLIST) */}
              {technicalSpecs.submissionChecklist && technicalSpecs.submissionChecklist.length > 0 && (
                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                        <span>Тендерт оролцоход бүрдүүлэх баримт бичгийн хяналтын хуудас (Checklist)</span>
                      </h4>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Бэлтгэсэн баримтуудаа энд тэмдэглэж, шаардлага дутуу эсэхээ хянана уу.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {technicalSpecs.submissionChecklist.map((item: any) => {
                      const isChecked = !!checklistState[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isChecked
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                              : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="h-3 w-3" />}
                            </div>
                            <div>
                              <span className={`text-xs font-bold block ${isChecked ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                                {item.title}
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {item.desc}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {item.required ? 'Заавал' : 'Нэмэлт'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. Official Downloadable Documents with Inline Quick Preview */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Холбогдох баримт бичгүүд & ТЭЗҮ (Боловсруулсан PDF/Excel)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      tender.gov.mn эх сурвалжтай албан ёсны баримт бичгүүдээс задлан шинжилсэн хураангуй ба боловсруулсан файлууд.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {technicalSpecs.documents.map((doc: any, idx: number) => {
                    const isExpanded = !!expandedDocSummaries[doc.id || idx];
                    return (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <FileText className="h-5 w-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{doc.name}</span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {doc.category || 'Баримт бичиг'} • {doc.type} • {doc.size} • {doc.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              onClick={() => toggleDocSummary(doc.id || idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded bg-white text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200 shadow-2xs"
                            >
                              <span>{isExpanded ? 'Хураах' : 'Хураангуй'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setDocModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Үзэх & Задлах</span>
                            </button>

                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                              title="Боловсруулсан өгөгдлийг төхөөрөмж рүү татах"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Татах</span>
                            </button>

                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                              title="Төрийн худалдан авах ажиллагааны эх хуудсаар нээх"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Inline Extracted Summary Preview */}
                        {isExpanded && (
                          <div className="p-3.5 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed border-t border-slate-800 whitespace-pre-wrap select-text">
                            {doc.extractedSummary || 'Хураангуй мэдээлэл олдсонгүй.'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ШАЛГАРУУЛАЛТЫН ҮР ДҮН & ОРОЛЦОГЧИД */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  <span>Шалгаруулалтын Үр Дүн & Оролцогчдын Мэдээлэл</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Үнэлгээний хорооны албан ёсны шийдвэр, оролцогчдын санал болгосон үнийн санал болон татгалзсан шалтгаанууд.
                </p>
              </div>

              {results.status === 'CONCLUDED' && results.winner ? (
                <>
                  {/* Winner Banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 rounded-xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                        <Trophy className="h-5 w-5 text-amber-600" />
                        <span>🏆 ШАЛГАРСАН ОРОЛЦОГЧ (ЯЛАГЧ)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                        Гэрээ байгуулсан
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Шалгарсан аж ахуйн нэгж:</span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">{results.winner.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Регистр: {results.winner.register}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Гэрээ байгуулсан дүн:</span>
                        <span className="text-sm font-bold font-mono text-emerald-800 mt-0.5 block">
                          {formatCurrency(results.winner.bidPrice)}
                        </span>
                        <span className="text-[10px] text-slate-400">Төсөвт өртгөөс хямдарсан</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Төсвөөс хэмнэсэн дүн:</span>
                        <span className="text-sm font-bold font-mono text-blue-700 mt-0.5 block">
                          {formatCurrency(results.winner.savingsAmount)} ({results.winner.savingsPct}%)
                        </span>
                        <span className="text-[10px] text-slate-400">Төрийн төсвийн хэмнэлт</span>
                      </div>
                    </div>
                  </div>

                  {/* Participants Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Бүх оролцогчдын үнийн санал ба үнэлгээ ({results.participants.length})
                      </span>
                      <span className="text-[11px] text-slate-500">Үнэлгээний дүгнэлт баталгаажсан</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Компанийн нэр</th>
                            <th className="py-2.5 px-3 font-mono">Регистр</th>
                            <th className="py-2.5 px-3 font-mono text-right">Санал болгосон үнэ</th>
                            <th className="py-2.5 px-3 text-center">Төлөв</th>
                            <th className="py-2.5 px-3">Татгалзсан / Үнэлгээний шалтгаан</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {results.participants.map((p: any, idx: number) => (
                            <tr key={idx} className={p.isWinner ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50/40'}>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  {p.isWinner && <Trophy className="h-3.5 w-3.5 text-amber-600" />}
                                  <span className="text-slate-900">{p.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-500">{p.register}</td>
                              <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">
                                {formatCurrency(p.price)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  p.isWinner
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 max-w-xs">{p.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-3">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Шалгаруулалт одоогоор идэвхтэй явагдаж байна</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Тендерийн материалыг хүлээн авч дууссаны дараа Үнэлгээний хорооны нээлт хийгдэж, оролцогчдын үнийн санал болон шалгарсан эсэх үр дүн энд нийтлэгдэнэ.
                  </p>
                  <a
                    href={supplierLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-2xs"
                  >
                    <span>Тендерт санал илгээх (user.tender.gov.mn)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ТҮҮХЭН ХОЛБООТОЙ ТЕНДЕРҮҮД */}
          {activeTab === 'history' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <span>Түүхэн Холбоотой Тендерүүд ба Өмнөх Оны Харьцуулалт</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {tender.budgetEntityName} байгууллагын өмнөх онд зарласан тендерүүд болон салбарын зах зээлийн үнийн харьцуулалт.
                </p>
              </div>

              {/* Related by Entity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <span>Тус захиалагчийн бусад тендерүүд ({relatedByEntity.length})</span>
                </h4>

                {relatedByEntity.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Тендерийн код</th>
                            <th className="py-2.5 px-3">Тендерийн нэр</th>
                            <th className="py-2.5 px-3 font-mono text-right">Төсөв</th>
                            <th className="py-2.5 px-3 text-center">Төлөв</th>
                            <th className="py-2.5 px-3 text-right">Үйлдэл</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {relatedByEntity.map((r: any) => (
                            <tr key={r.invitationId} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono text-slate-600">{r.tenderCode}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 max-w-sm truncate">{r.tenderName}</td>
                              <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                                {formatCurrency(r.totalBudget)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {r.docStatusName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Link
                                  href={`/tender/${r.invitationId}`}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Үзэх</span>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Энэ байгууллагын өөр тендер олдсонгүй.</p>
                )}
              </div>

              {/* Similar category tenders */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-slate-500" />
                  <span>Салбарын ижил төстэй бусад тендерүүд ({similarTenders.length})</span>
                </h4>

                {similarTenders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {similarTenders.map((s: any) => (
                      <div key={s.invitationId} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
                            <span>{s.tenderCode}</span>
                            <span className="text-slate-400">{s.publishDate?.substring(0, 10)}</span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                            {s.tenderName}
                          </h5>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            {s.budgetEntityName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {formatCurrency(s.totalBudget)}
                          </span>
                          <Link
                            href={`/tender/${s.invitationId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <span>Дэлгэрэнгүй</span>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Ижил төстэй тендер олдсонгүй.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DOCUMENT PREVIEW & EXTRACTION MODAL */}
      {docModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-blue-100/80 text-blue-700 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {selectedDoc.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedDoc.category || 'Тендерийн албан ёсны баримт бичиг'} • {selectedDoc.size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-blue-50/70 border border-blue-100 text-blue-900 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold">Бүтэцжүүлсэн өгөгдөл:</span>
                  <span>PDF баримтаас ялган боловсруулсан шаардлага</span>
                </div>
                <span className="font-mono text-[10px] text-blue-700 font-semibold uppercase">{selectedDoc.type}</span>
              </div>

              {/* Extracted Structured View */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Баримт бичгийн агуулга ба шаардлагууд
                </span>
                <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap select-text border border-slate-800 shadow-inner">
                  {selectedDoc.extractedSummary || 'Энэ баримт бичгийн хураангуй мэдээлэл одоогоор бэлэн бус байна.'}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 block">💡 Анхаарах:</span>
                <p>
                  Тендерт оролцогч аж ахуйн нэгж нь төрийн худалдан авах ажиллагааны албан ёсны цахим систем (tender.gov.mn)-ийн ТШББ-д заасан шаардлагатай нягтлан танилцаж, үнийн санал болон баталгааг хуулийн хугацаанд ирүүлэх үүрэгтэй.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
              <a
                href={selectedDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <span>tender.gov.mn эх хуудас</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Хаах
                </button>
                <button
                  onClick={() => handleDownloadDocument(selectedDoc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Задлалыг татах (.txt)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

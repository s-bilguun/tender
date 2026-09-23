'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Building2, Calendar, ShieldCheck, Tag, FileText, 
  Copy, Check, Trophy, Users, CheckCircle2, XCircle, AlertCircle, 
  ExternalLink, Sparkles, Clock, AlertTriangle, Layers, Briefcase, 
  CheckSquare, FileSpreadsheet, Download, RefreshCw, Eye, X, Loader2,
  Send, MessageSquare, Bot, User, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { FormattedChatMessage } from './AIChatDrawer';

interface TenderDetailViewProps {
  initialData: any;
}

interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  topic?: string;
}

export const TenderDetailView: React.FC<TenderDetailViewProps> = ({ initialData }) => {
  const [data, setData] = useState(initialData);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'bds' | 'tech' | 'results' | 'history'>('bds');

  // Interactive AI chat question states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalyzingTarget, setAiAnalyzingTarget] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [followupInput, setFollowupInput] = useState('');
  const [isAiCollapsed, setIsAiCollapsed] = useState(false);
  const [aiAnalysisTopic, setAiAnalysisTopic] = useState<string | null>(null);
  const aiAnalysisRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleRunAiAnalysis = async (customPrompt?: string, targetId: string = 'general', topicTitle?: string) => {
    if (!data?.tender) return;
    const promptText = (customPrompt || followupInput).trim() || 
      `Энэ тендерийн ТШББ (I Бүлэг: Өгөгдлийн хүснэгт) болон Техникийн тодорхойлолт (II Бүлэг)-ийн PDF болон баримтуудаас задлан шинжилсэн гол шаардлага, тусгай зөвшөөрөл, санхүүгийн босго, техникийн эрсдэл, өрсөлдөхөд анхаарах зүйлсийг цэгцтэй шинжилж зөвлөнө үү.`;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: topicTitle,
    };

    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setFollowupInput('');
    setIsAiCollapsed(false);
    setAiAnalyzing(true);
    setAiAnalyzingTarget(targetId);
    if (topicTitle) setAiAnalysisTopic(topicTitle);

    // Smoothly scroll to AI analysis container so user immediately sees action
    setTimeout(() => {
      aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          messages: newMessages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          tenderContext: {
            ...data.tender,
            bds: data.bds,
            technicalSpecs: data.technicalSpecs,
            results: data.results,
          }
        })
      });
      const resJson = await res.json();
      const replyText = resJson.reply || resJson.text || 'Шинжилгээ амжилттай хийгдлээ.';

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: topicTitle,
      };

      setAiMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'AI шинжилгээ хийх явцад алдаа гарлаа. Та дахин оролдоно уу.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiAnalyzing(false);
      setAiAnalyzingTarget(null);
    }
  };

  const handleClearChat = () => {
    setAiMessages([]);
    setAiAnalysisTopic(null);
  };

  const handleCopyChatTranscript = () => {
    if (aiMessages.length === 0) return;
    const transcript = aiMessages.map(m => 
      `[${m.timestamp}] ${m.sender === 'user' ? 'Та' : 'AI Шинжээч'}:\n${m.text}`
    ).join('\n\n----------------------------------------\n\n');
    navigator.clipboard.writeText(transcript);
    setCopiedAnalysis(true);
    setTimeout(() => setCopiedAnalysis(false), 2000);
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

  const tender = data?.tender || {};
  const bds = {
    ...data?.bds,
    requiredLicenses: data?.bds?.requiredLicenses || [],
    keyPersonnel: data?.bds?.keyPersonnel || [],
    machinery: data?.bds?.machinery || [],
    generalRequirements: data?.bds?.generalRequirements || [],
  };
  const technicalSpecs = {
    ...data?.technicalSpecs,
    sampleItems: data?.technicalSpecs?.sampleItems || [],
    standards: data?.technicalSpecs?.standards || [],
    submissionChecklist: data?.technicalSpecs?.submissionChecklist || [],
    documents: data?.technicalSpecs?.documents || [],
    extractedQualifications: data?.technicalSpecs?.extractedQualifications || [],
  };
  const results = {
    ...data?.results,
    bidders: data?.results?.bidders || [],
  };
  const relatedByEntity: any[] = Array.isArray(data?.relatedByEntity) ? data.relatedByEntity : [];
  const similarTenders: any[] = Array.isArray(data?.similarTenders) ? data.similarTenders : [];

  const publicLink = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;
  const supplierLink = `https://user.tender.gov.mn/mn/supplier/available/${tender.invitationId}/detail`;

  const subTenders: any[] = data?.results?.subTenders || tender?.subTenders || [];
  const isFailed = 
    data?.results?.isFailed ||
    tender.docStatusName?.includes('Амжилтгүй') ||
    tender.docStatusCode === 'TENDER_FAILED' ||
    (subTenders.length > 0 && subTenders.every((st: any) => st.wfmStatusCode === 'TENDER_FAILED' || (st.wfmStatusName || '').includes('Амжилтгүй')));

  const isConcluded = isFailed || tender.docStatusName?.includes('Үр дүн') || tender.docStatusName?.includes('Дууссан');

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
${(bds.requiredLicenses || []).map((lic: string, i: number) => `${i + 1}. ${lic}`).join('\n')}

ГОЛ БОЛОВСОН ХҮЧНИЙ ШААРДЛАГА:
${(bds.keyPersonnel || []).map((p: any) => `• ${p.role}: ${p.count} хүн (${p.qualification})`).join('\n')}

ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & БАРАА, АЖЛЫН ШААРДЛАГА:
${(technicalSpecs.sampleItems || []).map((it: any) => `• ${it.name} | Тоо хэмжээ: ${it.quantity} ${it.unit} | Үзүүлэлт: ${it.spec}`).join('\n')}

Нийлүүлэлтийн байршил: ${technicalSpecs.deliveryLocation || ''}
Хугацаа: ${technicalSpecs.deliveryPeriodDays || 30} хоног
Баталгаат хугацаа: ${technicalSpecs.warrantyMonths || 12} сар
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
            onClick={() => handleRunAiAnalysis(undefined, 'nav', 'Ерөнхий ТШББ дүгнэлт')}
            disabled={aiAnalyzing}
            className={`h-8 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
              aiAnalyzingTarget === 'nav'
                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
            }`}
          >
            {aiAnalyzingTarget === 'nav' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                <span>Шинжилж байна...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>AI Шинжээч</span>
              </>
            )}
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
              isFailed
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : isConcluded
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {isFailed ? '⚪ Амжилтгүй болсон' : (tender.docStatusName || 'Идэвхтэй')}
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
              onClick={() => handleRunAiAnalysis(
                'Энэ тендерт шаардагдах тусгай зөвшөөрөл, түлхүүр боловсон хүчин, өмнөх туршлагын шалгуурыг нарийвчлан шинжилж, оролцогчдод анхаарах зүйлсийг нэгтгэнэ үү.',
                'quick-license',
                'Тусгай зөвшөөрөл & Шалгуур'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1 cursor-pointer ${
                aiAnalyzingTarget === 'quick-license'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {aiAnalyzingTarget === 'quick-license' && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
              <span>🛡️ Тусгай зөвшөөрөл & Шалгуур</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Энэ тендерийн борлуулалтын доод орлогын босго, түргэн хөрвөх чадвартай хөрөнгө, тендерийн баталгааны тооцоолол болон санхүүгийн эрсдэлийг тооцож өгнө үү.',
                'quick-finance',
                'Санхүүгийн босго & Баталгаа'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1 cursor-pointer ${
                aiAnalyzingTarget === 'quick-finance'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {aiAnalyzingTarget === 'quick-finance' && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
              <span>💰 Санхүүгийн босго & Баталгаа</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Техникийн тодорхойлолт, нийлүүлэлтийн хуваарь, чанарын стандартууд (MNS/ISO), алданги торгуулийн заалт дээр оролцогчдын зүгээс анхаарах гол эрсдэлүүд юу байна вэ?',
                'quick-tech',
                'Техникийн үзүүлэлтийн эрсдэл'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1 cursor-pointer ${
                aiAnalyzingTarget === 'quick-tech'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {aiAnalyzingTarget === 'quick-tech' && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
              <span>⚙️ Техникийн үзүүлэлтийн эрсдэл</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Тендерт оролцоход бүрдүүлэх баримт бичгийн хяналтын хуудас (Checklist) болон цахим системээр үнийн санал илгээх стратегийг зөвлөнө үү.',
                'quick-docs',
                'Баримт бичгийн хяналт'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1 cursor-pointer ${
                aiAnalyzingTarget === 'quick-docs'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {aiAnalyzingTarget === 'quick-docs' && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
              <span>📋 Баримт бичгийн хяналт</span>
            </button>
          </div>
        </div>

        {/* AI Analysis & Multi-turn Conversation Section */}
        <div ref={aiAnalysisRef} className="scroll-mt-24">
          {(aiMessages.length > 0 || aiAnalyzing) ? (
            <div className="bg-gradient-to-r from-amber-50/90 via-blue-50/70 to-slate-50 border-2 border-amber-300 rounded-2xl shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-white/70 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        AI Шинжээчийн Харилцан Яриа
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        PDF & ТШББ Мэдлэгтэй
                      </span>
                      {aiMessages.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                          {aiMessages.length} мессеж
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Энэ тендерийн ТШББ PDF баримт, нийлүүлэлтийн хуваарь, гэрээний тусгай нөхцөлийг шинжилж залгамж асуултад хариулна.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {aiMessages.length > 0 && (
                    <>
                      <button
                        onClick={handleCopyChatTranscript}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Харилцан яриаг бүхлээр нь хуулах"
                      >
                        {copiedAnalysis ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                        <span className="hidden sm:inline">{copiedAnalysis ? 'Хуулагдлаа' : 'Хуулах'}</span>
                      </button>
                      <button
                        onClick={handleClearChat}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Чат цэвэрлэх"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Цэвэрлэх</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsAiCollapsed(!isAiCollapsed)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                    title={isAiCollapsed ? 'Дэлгэх' : 'Хураах'}
                  >
                    {isAiCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Conversation Body */}
              {!isAiCollapsed && (
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Messages stream */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {aiMessages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUser && (
                            <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs mt-1">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                          <div
                            className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 shadow-2xs ${
                              isUser
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-900 border border-amber-200 rounded-tl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5 border-b pb-1 border-current/15 text-[10px] opacity-80">
                              <span className="font-bold flex items-center gap-1">
                                {isUser ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                                <span>{isUser ? 'Таны асуулт' : 'AI Шинжээчийн дүгнэлт'}</span>
                                {msg.topic && (
                                  <span className={`ml-1 px-1.5 py-0.2 rounded font-normal ${isUser ? 'bg-blue-700' : 'bg-amber-100 text-amber-900'}`}>
                                    {msg.topic}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono">{msg.timestamp}</span>
                            </div>

                            <div className="text-xs sm:text-sm select-text">
                              <FormattedChatMessage text={msg.text} isUser={isUser} />
                            </div>
                          </div>
                          {isUser && (
                            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs mt-1">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Thinking indicator */}
                    {aiAnalyzing && (
                      <div className="flex gap-3 justify-start items-start animate-in fade-in">
                        <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <div className="bg-white border border-amber-300 rounded-2xl rounded-tl-none p-4 shadow-2xs space-y-2 max-w-md">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                            <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                            <span>AI Шинжээч хариултыг боловсруулж байна...</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            ТШББ PDF баримтын заалтууд, нийлүүлэлтийн хуваарь болон өмнөх харилцан яриаг боловсруулж байна.
                          </p>
                          <div className="space-y-1.5 pt-1 animate-pulse">
                            <div className="h-2.5 bg-amber-200/60 rounded w-11/12"></div>
                            <div className="h-2.5 bg-amber-200/50 rounded w-4/5"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Follow-up Question Input Form */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (followupInput.trim() && !aiAnalyzing) {
                          handleRunAiAnalysis(followupInput.trim(), 'followup', 'Тодруулга');
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <input
                          ref={chatInputRef}
                          type="text"
                          value={followupInput}
                          onChange={(e) => setFollowupInput(e.target.value)}
                          placeholder="Энэ тендерийн ТШББ, PDF заалт, төсвийн талаар тодруулж асуух... (Enter дарж илгээнэ)"
                          className="w-full bg-white border border-amber-300/90 rounded-xl pl-4 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs transition-all"
                          disabled={aiAnalyzing}
                        />
                        {followupInput && (
                          <button
                            type="button"
                            onClick={() => setFollowupInput('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!followupInput.trim() || aiAnalyzing}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        {aiAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Илгээх</span>
                      </button>
                    </form>

                    {/* Context-aware Quick Follow-up Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="text-slate-400 font-medium">Шуурхай асуулт:</span>
                      {technicalSpecs.deliverySchedule && technicalSpecs.deliverySchedule.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis('Энэ тендерийн бараа нийлүүлэлтийн хуваарь, эцсийн хугацаа, хүргэх цэгийн талаар дэлгэрэнгүй тайлбарлана уу.', 'chip-delivery', 'Нийлүүлэлтийн хуваарь')}
                          disabled={aiAnalyzing}
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          📦 Бараа нийлүүлэлтийн хуваарь?
                        </button>
                      )}
                      {technicalSpecs.specialConditions && technicalSpecs.specialConditions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis('Гэрээний тусгай нөхцөл (ГТН)-д заасан алданги, төлбөрийн нөхцөл, хүлээлцэх нөхцөлүүд ямар байна вэ?', 'chip-scc', 'Гэрээний тусгай нөхцөл')}
                          disabled={aiAnalyzing}
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          📑 Гэрээний тусгай нөхцөл & Алданги?
                        </button>
                      )}
                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis('Энэхүү амжилтгүй болсон тендер яагаад цуцлагдсан бэ, дараа нь дахин зарлагдах уу, оролцоход юуг анхаарах вэ?', 'chip-failed', 'Амжилтгүй болсон шалтгаан')}
                          disabled={aiAnalyzing}
                          className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold transition-colors shadow-2xs cursor-pointer"
                        >
                          ⚠️ Яагаад амжилтгүй болсон бэ?
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRunAiAnalysis('Энэ тендерт шаардагдах тендерийн баталгаа болон банкны тодорхойлолтыг хэрхэн бэлтгэх вэ?', 'chip-guarantee', 'Тендерийн баталгаа')}
                        disabled={aiAnalyzing}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        🛡️ Тендерийн баталгааны шаардлага?
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRunAiAnalysis('Энэ тендерт өрсөлдөхөд оролцогчийн хувьд ямар гол эрсдэл, хасагдах шалтгаан үүсч болох вэ?', 'chip-risk', 'Эрсдэлийн шинжилгээ')}
                        disabled={aiAnalyzing}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        ⚖️ Өрсөлдөхөд анхаарах гол эрсдэл?
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-50/60 via-blue-50/40 to-slate-50 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Тендерийн AI Шинжээчтэй ярилцах
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ТШББ PDF-ийн бодит заалт, нийлүүлэлтийн хуваарь, тусгай нөхцөлөөс хүссэн асуултаа асууж залгамж тодруулга аваарай.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (followupInput.trim()) {
                      handleRunAiAnalysis(followupInput.trim(), 'initial-input', 'Тодруулга');
                    }
                  }}
                  className="flex items-center gap-2 w-full sm:w-80"
                >
                  <input
                    type="text"
                    value={followupInput}
                    onChange={(e) => setFollowupInput(e.target.value)}
                    placeholder="Асуултаа энд бичнэ үү..."
                    className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!followupInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Асуух</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

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
              {tender.yearBudget && tender.yearBudget !== tender.totalBudget ? 'Тухайн онд санхүүжих' : 'Урьдчилгаа төлбөр'}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-800 block">
              {tender.yearBudget && tender.yearBudget !== tender.totalBudget 
                ? formatCurrency(tender.yearBudget)
                : `${technicalSpecs.paymentTerms?.advancePaymentPct || 20}% (${formatCurrency(Math.round((tender.totalBudget * (technicalSpecs.paymentTerms?.advancePaymentPct || 20)) / 100))})`
              }
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {tender.yearBudget && tender.yearBudget !== tender.totalBudget ? 'Энэ оны хуваарьт санхүүжилт' : 'Гэрээ байгуулсны дараа олгогдох'}
            </span>
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

        {/* Responsive Segmented Tab Controls (Zero horizontal scroll) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('bds')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'bds'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="truncate">Шалгуур (ТШӨХ)</span>
          </button>

          <button
            onClick={() => setActiveTab('tech')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'tech'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">Техникийн тодорхойлолт</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'results'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span className="truncate">Үр дүн & Оролцогчид</span>
            {isFailed ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold shrink-0">
                Амжилтгүй
              </span>
            ) : isConcluded ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold shrink-0">
                Гарсан
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/70 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="truncate">Холбоотой тендерүүд</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/70 text-slate-700 font-mono shrink-0">
              {relatedByEntity.length + similarTenders.length}
            </span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          
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
                  {bds.requiredLicenses && bds.requiredLicenses.length > 0 ? (
                    bds.requiredLicenses.map((lic: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{lic}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100 italic">
                      Тусгайлан нэр заасан тусгай зөвшөөрөл шаардаагүй эсвэл улсын бүртгэлийн гэрчилгээний ерөнхий чиглэлийн дагуу байна.
                    </div>
                  )}
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
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {bds.turnoverReq || `* Нийт төсөвт өртгийн ${tender.tenderTypeCode === 'JOB' ? '80%' : '50%'}-иас доошгүй`}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Түргэн хөрвөх чадвартай хөрөнгө / Зээлжих боломж:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                      {formatCurrency(bds.minLiquidAssets)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {bds.liquidAssetsReq || '* Банкны дансны үлдэгдэл эсвэл зээл авах боломжийн тодорхойлолт'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Ижил төстэй ажил гүйцэтгэсэн гэрээний доод босго:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
                      {formatCurrency(bds.similarContractThreshold)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {bds.similarExpReq || `* Сүүлийн ${bds.similarContractYears} жилд 1-ээс доошгүй удаа ижил төстэй ажил хийсэн байх`}
                    </span>
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
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>3. Түлхүүр боловсон хүчний шаардлага</span>
                  </h4>
                  {bds.keyPersonnel && bds.keyPersonnel.length > 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Нийт {bds.keyPersonnel.reduce((acc: number, p: any) => acc + (p.count || 1), 0)} мэргэжилтэн
                    </span>
                  )}
                </div>

                {bds.keyPersonnel && bds.keyPersonnel.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {bds.keyPersonnel.map((p: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs">{p.role}</div>
                          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">{p.qualification || (p.experience ? `${p.experience} туршлагатай` : '')}</div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-mono font-bold text-xs text-blue-700">
                          {p.count} хүн
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100 italic">
                    Тендерийн баримт бичигт тусгайлан нэр заасан түлхүүр ажилтны жагсаалт заагаагүй байна.
                  </div>
                )}
              </div>

              {/* 4. Машин механизм, техник тоног төхөөрөмж */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <span>4. Шаардагдах машин механизм, тоног төхөөрөмж</span>
                </h4>
                {bds.machinery && bds.machinery.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {bds.machinery.map((m: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100 italic">
                    Энэ тендерт тусгайлан нэр заасан техник, машин механизм шаардаагүй эсвэл гүйцэтгэгчийн ерөнхий үүрэгт хамаарна.
                  </div>
                )}
              </div>

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

              {/* 1. БҮТЦЭД ОРУУЛСАН БАРАА / АЖЛЫН ҮЗҮҮЛЭЛТИЙН КАРТУУД */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600" />
                      <span>Нийлүүлэх бараа, гүйцэтгэх ажлын нарийвчилсан үзүүлэлт ({technicalSpecs.sampleItems.length})</span>
                    </span>
                    {(technicalSpecs.isRealExtracted || technicalSpecs.sampleItems?.some((i: any) => i.isRealExtracted)) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        <span>PDF-ээс ялгасан бодит өгөгдөл ({technicalSpecs.sampleItems.length})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <span>Үндсэн худалдан авах чиглэл</span>
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 space-y-3 bg-white">
                    {technicalSpecs.sampleItems.map((item: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-bold text-xs text-blue-700 shadow-2xs">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 text-xs text-slate-600 leading-relaxed text-pretty">
                          <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Техникийн тодорхойлолт & Чанарын шаардлага:</span>
                          {item.spec}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1b. БАРАА НИЙЛҮҮЛЭЛТИЙН АЛБАН ЁСНЫ ХУВААРЬ (DELIVERY SCHEDULE) */}
              {technicalSpecs.deliverySchedule && technicalSpecs.deliverySchedule.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Бараа нийлүүлэлтийн албан ёсны хуваарь & Тоо хэмжээ
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Sparkles className="h-3 w-3" />
                      <span>ТШББ-ээс ялгасан ({technicalSpecs.deliverySchedule.length} нэр төрөл)</span>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50/80 font-bold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">№</th>
                          <th className="py-2.5 px-4 text-left">Барааны нэр</th>
                          <th className="py-2.5 px-4 text-right">Тоо хэмжээ</th>
                          <th className="py-2.5 px-3 text-center">Хэмжих нэгж</th>
                          <th className="py-2.5 px-4 text-left">Хүргэх эцсийн цэг / Газар</th>
                          <th className="py-2.5 px-4 text-left">Нийлүүлэх хугацаа</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {technicalSpecs.deliverySchedule.map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">{row.number || rIdx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 tabular-nums">
                              {Number(row.quantity).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-600">{row.unit}</td>
                            <td className="py-3 px-4 text-slate-700">{row.location}</td>
                            <td className="py-3 px-4 font-semibold text-emerald-800">{row.deadline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 1c. ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ (ГТН / SPECIAL CONDITIONS OF CONTRACT) */}
              {technicalSpecs.specialConditions && technicalSpecs.specialConditions.length > 0 && (
                <div className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-2xs space-y-0">
                  <div className="bg-gradient-to-r from-blue-50/90 to-slate-50 px-4 py-3 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Гэрээний тусгай нөхцөл (ТШББ V Бүлэг — Албан ёсны заалтууд)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {technicalSpecs.specialConditions.length} заалт
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {technicalSpecs.specialConditions.map((sc: any, scIdx: number) => (
                      <div key={scIdx} className="p-3.5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="shrink-0 sm:w-28">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                            {sc.clause}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-slate-900">{sc.title}</div>
                          <div className="text-xs text-slate-700 leading-relaxed text-pretty">{sc.content}</div>
                        </div>
                      </div>
                    ))}
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
                  <span className="text-xs font-bold text-slate-900 block">
                    {technicalSpecs.deliveryPeriodText || `Гэрээ байгуулснаас хойш ${technicalSpecs.deliveryPeriodDays} хоног`}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-xs block mb-1">Баталгаат хугацаа:</span>
                  <span className="text-xs font-bold text-slate-900 block">
                    {technicalSpecs.warrantyText || `${technicalSpecs.warrantyMonths} сар`}
                  </span>
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
                    <span className="text-slate-500 block text-[11px]">Төлбөр төлөх нөхцөл:</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {technicalSpecs.paymentTerms?.progressPayment || 'Нийлүүлэлт бүрээр'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Захиалагчийн албан ёсны нөхцөл</span>
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
                      {technicalSpecs.penaltyText || `${technicalSpecs.penaltyClause?.dailyRate || '0.1%'} / өдөр бүр`}
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

              {/* Live Extracted Technical Specifications from PDF */}
              {(technicalSpecs.realSpecsText || technicalSpecs.extractedSpecs?.rawSpecText) && (
                <div className="border border-blue-200 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span>Албан ёсны ТШББ PDF-ээс автоматаар задлан шинжилсэн бодит үзүүлэлтүүд</span>
                      </h4>
                    </div>
                    {technicalSpecs.pdfPageCount && (
                      <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded border border-blue-200 self-start sm:self-auto font-mono">
                        Нийт {technicalSpecs.pdfPageCount} хуудас баримт бичиг
                      </span>
                    )}
                  </div>

                  {/* Extracted Qualifications if present */}
                  {technicalSpecs.extractedQualifications && technicalSpecs.extractedQualifications.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                        Оролцогчийн чадавхын тухайлсан бодит шаардлагууд (ТШӨХ-ээс):
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {technicalSpecs.extractedQualifications.map((q: string, qIdx: number) => (
                          <div key={qIdx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Extracted Specifications block */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                        III Бүлэг: Бараа материалын техникийн нарийвчилсан үзүүлэлт & Ажлын даалгавар:
                      </span>
                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Энэхүү тендерийн ТШББ PDF дээр заасан техникийн нарийвчилсан үзүүлэлт, бараа материалын төрөл, хэмжээ, стандартуудыг ойлгомжтой нэгтгэн дүгнэж өгнө үү.',
                          'spec-table',
                          'Техникийн нарийвчилсан үзүүлэлтийн нэгтгэл'
                        )}
                        disabled={aiAnalyzing}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {aiAnalyzingTarget === 'spec-table' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span>{aiAnalyzingTarget === 'spec-table' ? 'AI хүснэгтлэж байна...' : 'AI-аар хүснэгтлэх'}</span>
                      </button>
                    </div>
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap selection:bg-blue-500 selection:text-white border border-slate-800">
                      {technicalSpecs.realSpecsText || technicalSpecs.extractedSpecs?.rawSpecText}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Official Documents & Tender Specs */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Албан ёсны баримт бичгүүд & ТШББ (PDF / Excel)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      tender.gov.mn төрийн худалдан авах ажиллагааны албан ёсны эх баримт бичгүүдийг шууд татах боломжтой.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {technicalSpecs.documents.map((doc: any, idx: number) => {
                    const isExpanded = !!expandedDocSummaries[doc.id || idx];
                    const isDirectPdf = !!doc.fileId;
                    const downloadHref = doc.fileId
                      ? `/api/download?fileId=${doc.fileId}&name=${encodeURIComponent(doc.name || 'tender.pdf')}`
                      : (doc.downloadUrl || doc.url || '#');

                    return (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <FileText className="h-5 w-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{doc.name}</span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {doc.category || 'Баримт бичиг'} • {doc.type} {doc.date ? `• ${doc.date}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                            <button
                              onClick={() => toggleDocSummary(doc.id || idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                            >
                              <span>{isExpanded ? 'Хураах' : 'Хуулийн шаардлага'}</span>
                            </button>

                            <button
                              onClick={() => handleRunAiAnalysis(
                                `Энэ тендерийн "${doc.name}" баримт бичиг болон ТШББ-ийн шаардлагыг шинжилж, оролцогчдод анхаарах зүйлсийг зөвлөнө үү.`,
                                `doc-${doc.id || idx}`,
                                `Баримт: ${doc.name}`
                              )}
                              disabled={aiAnalyzing}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                                aiAnalyzingTarget === `doc-${doc.id || idx}`
                                  ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/50 cursor-wait'
                                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-2xs'
                              }`}
                            >
                              {aiAnalyzingTarget === `doc-${doc.id || idx}` ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 text-amber-700 animate-spin" />
                                  <span>AI шинжилж байна...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 text-amber-600" />
                                  <span>AI-аар задлах</span>
                                </>
                              )}
                            </button>

                            {isDirectPdf ? (
                              <a
                                href={downloadHref}
                                download={doc.name || 'tender.pdf'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
                                title="Албан ёсны эх PDF файлыг шууд татах"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Шууд татах (PDF)</span>
                              </a>
                            ) : (
                              <a
                                href={downloadHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors shadow-2xs"
                                title="Албан ёсны портал дээр нээх"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Эх хуудас</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Inline loading or completion notice for this document */}
                        {aiAnalyzingTarget === `doc-${doc.id || idx}` && (
                          <div className="px-3.5 pb-2.5 pt-1 text-[11px] text-amber-800 font-semibold flex items-center justify-between gap-2 bg-amber-50/70 border-t border-amber-200 animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                              <span>Дээр байрлах AI Шинжээчийн самбарт тайлан боловсруулж байна...</span>
                            </span>
                            <button
                              onClick={() => aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                              className="text-amber-900 underline font-bold cursor-pointer hover:text-amber-950"
                            >
                              Дээр очих ↗
                            </button>
                          </div>
                        )}

                        {aiMessages.length > 0 && aiAnalysisTopic?.includes(doc.name) && (
                          <div className="px-3.5 pb-2.5 pt-1 flex items-center justify-between gap-2 text-[11px] text-emerald-800 font-semibold bg-emerald-50 border-t border-emerald-200">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Энэ баримтыг AI амжилттай шинжиллээ.</span>
                            </span>
                            <button
                              onClick={() => aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="text-blue-700 underline font-bold cursor-pointer hover:text-blue-900"
                            >
                              Дээр үзэх ↗
                            </button>
                          </div>
                        )}

                        {/* Inline Extracted Summary Preview */}
                        {isExpanded && (
                          <div className="p-3.5 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed border-t border-slate-800 whitespace-pre-wrap select-text">
                            {doc.extractedSummary ? (
                              doc.extractedSummary
                            ) : (
                              <div className="space-y-2 font-sans text-xs">
                                <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                                  <span>📄 Албан ёсны баримт бичгийн танилцуулга</span>
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed font-normal">
                                  Энэхүү баримт бичиг (<span className="text-white font-medium">{doc.name}</span>) нь tender.gov.mn төрийн худалдан авах ажиллагааны албан ёсны эх баримт болно. Хэрэв сканердсан зурган хуудас агуулсан бол доорх холбоосоор шууд татан авч бүрэн эхээр нь танилцана уу.
                                </p>
                                <div className="pt-1.5 flex items-center gap-2">
                                  <a
                                    href={doc.downloadUrl || doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Эх файлыг шууд татах ({doc.type || 'PDF'})</span>
                                  </a>
                                </div>
                              </div>
                            )}
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

              {/* Real Sub-Tenders Table (Тендерийн багцууд) */}
              {subTenders && subTenders.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <span>Тендерийн багцууд & Албан ёсны төлөв ({subTenders.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Эх сурвалж: tender.gov.mn
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">№</th>
                          <th className="py-2.5 px-3">Багцын нэр</th>
                          <th className="py-2.5 px-3">Багцын код</th>
                          <th className="py-2.5 px-3 text-right">Батлагдсан төсөв</th>
                          <th className="py-2.5 px-3 text-center">Төлөв</th>
                          <th className="py-2.5 px-3 text-center">Шийдвэрийн огноо</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subTenders.map((st: any, idx: number) => {
                          const isStFailed = st.wfmStatusCode === 'TENDER_FAILED' || (st.wfmStatusName || '').includes('Амжилтгүй');
                          const isStSuccess = st.wfmStatusCode === 'DISTINGUISHED_STATUS' || (st.wfmStatusName || '').includes('Шалгарсан');
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isStFailed ? 'bg-rose-50/20' : isStSuccess ? 'bg-emerald-50/20' : ''}`}>
                              <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">{idx + 1}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900">{st.subTenderName || 'Багц'}</td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{st.subTenderCode || '—'}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                {formatCurrency(st.totalBudget)}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isStFailed
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : isStSuccess
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {st.wfmStatusName || 'Бүртгэлтэй'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500 whitespace-nowrap">
                                {st.noticeDate ? st.noticeDate.substring(0, 10) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {results.isConcluded || isConcluded ? (
                <div className="space-y-6">
                  {/* Real Bidder Evaluation Table & Winner Card */}
                  {results.bidders && results.bidders.length > 0 && (
                    <div className="space-y-4">
                      {/* Winner Highlight Banner */}
                      {results.winner && (
                        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xl">
                              🏆
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                                  Шалгарсан гүйцэтгэгч / Нийлүүлэгч
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  Шалгарсан
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                                {results.winner.supplierName} {results.winner.registerNumber ? `(РД: ${results.winner.registerNumber})` : ''}
                              </h3>
                              {results.winner.commentText && (
                                <p className="text-xs text-emerald-900 mt-1 italic leading-relaxed">
                                  Үнэлгээний хорооны дүгнэлт: "{results.winner.commentText}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">Гэрээ байгуулах үнэ</span>
                            <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 block">
                              {formatCurrency(results.winner.discountedAmount || results.winner.openedBidderPrice)}
                            </span>
                            {results.winner.fileId && (
                              <a
                                href={`/api/download?fileId=${results.winner.fileId}&name=${encodeURIComponent(results.winner.fileName || 'winner_decision.pdf')}`}
                                download={results.winner.fileName || 'winner_decision.pdf'}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-1"
                              >
                                <Download className="h-3 w-3" />
                                <span>Шийдвэрийн албан бичиг (PDF)</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bidders Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span>Тендерт оролцсон бүх оролцогчдын санал ба Үнэлгээний хорооны шийдвэр ({results.bidders.length})</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Албан ёсны эх сурвалж: tender.gov.mn
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3 w-10 text-center">№</th>
                                <th className="py-2.5 px-3">Оролцогч байгууллага</th>
                                <th className="py-2.5 px-3 text-right">Санал болгосон үнэ</th>
                                <th className="py-2.5 px-3 text-right">Тооцсон үнэ</th>
                                <th className="py-2.5 px-3 text-center">Төлөв</th>
                                <th className="py-2.5 px-3">Үнэлгээний хорооны дүгнэлт / Шалтгаан</th>
                                <th className="py-2.5 px-3 text-center">Албан бичиг</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {results.bidders.map((bidder: any, bIdx: number) => {
                                const isWinner = bidder.wfmStatusCode === 'DISTINGUISHED_STATUS' || bidder.wfmStatusName === 'Шалгарсан';
                                return (
                                  <tr key={bIdx} className={`hover:bg-slate-50/80 transition-colors ${isWinner ? 'bg-emerald-50/40' : ''}`}>
                                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-medium">{bIdx + 1}</td>
                                    <td className="py-3 px-3">
                                      <span className="font-bold text-slate-900 block">{bidder.supplierName}</span>
                                      {bidder.registerNumber && (
                                        <span className="font-mono text-[10px] text-slate-400 block mt-0.5">РД: {bidder.registerNumber}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                                      {formatCurrency(bidder.openedBidderPrice)}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                      {formatCurrency(bidder.discountedAmount || bidder.openedBidderPrice)}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        isWinner
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        {bidder.wfmStatusName}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 max-w-sm text-slate-600 leading-relaxed">
                                      {bidder.commentText || '—'}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      {bidder.fileId ? (
                                        <a
                                          href={`/api/download?fileId=${bidder.fileId}&name=${encodeURIComponent(bidder.fileName || 'evaluation_decision.pdf')}`}
                                          download={bidder.fileName || 'evaluation_decision.pdf'}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors shadow-2xs"
                                          title={bidder.fileName || 'Албан бичиг шууд татах'}
                                        >
                                          <Download className="h-3 w-3" />
                                          <span>PDF</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Concluded Official Notice Card - Conditional for Failed vs Success */}
                  {isFailed ? (
                    <div className="bg-gradient-to-r from-slate-50 via-rose-50/30 to-slate-100 border border-slate-300/80 rounded-xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                          <AlertTriangle className="h-5 w-5 text-rose-500" />
                          <span>⚠️ ТЕНДЕР ШАЛГАРУУЛАЛТ АМЖИЛТГҮЙ БОЛСОН</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {tender.docStatusName || 'Амжилтгүй болсон'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        Төрийн худалдан авах ажиллагааны tender.gov.mn албан ёсны системийн мэдээллээр энэхүү тендерийн сонгон шалгаруулалт (эсвэл багцууд) хүчингүй болсон буюу амжилтгүй болсон төлөвт шилжсэн байна.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Батлагдсан төсөв</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{formatCurrency(tender.totalBudget)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Сонгон шалгаруулах арга</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{tender.ruleName || 'Нээлттэй'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Санхүүжилтийн эх үүсвэр</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{tender.fundName || 'Төсөв'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Шалгаруулалтын төлөв</span>
                          <span className="font-bold text-rose-600 mt-0.5 block font-mono">
                            Амжилтгүй болсон
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <a
                          href={publicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-2xs"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>tender.gov.mn дээрх албан ёсны протокол харах</span>
                        </a>

                        <button
                          onClick={() => handleRunAiAnalysis(
                            'Энэхүү амжилтгүй болсон тендерийн дараа дахин зарлагдах журам, хууль эрх зүйн үр дагавар болон дахин оролцоход анхаарах зүйлсийг зөвлөнө үү.',
                            'results-ai',
                            'Амжилтгүй болсон тендерийн дүн шинжилгээ'
                          )}
                          disabled={aiAnalyzing}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            aiAnalyzingTarget === 'results-ai'
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/50'
                              : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50 shadow-2xs'
                          }`}
                        >
                          {aiAnalyzingTarget === 'results-ai' ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 text-amber-700 animate-spin" />
                              <span>AI шинжилж байна...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                              <span>AI: Амжилтгүй болсон шалтгаан & дүгнэлт</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-amber-50/80 to-blue-50/60 border border-amber-300/80 rounded-xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                          <Trophy className="h-5 w-5 text-amber-600" />
                          <span>🏆 ШАЛГАРУУЛАЛТЫН ҮР ДҮН НИЙТЛЭГДСЭН</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {tender.docStatusName || 'Үр дүн гарсан'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        Энэхүү тендер нь шалгаруулалтын бүх үе шатыг дуусгаж, Үнэлгээний хорооны албан ёсны шийдвэр (шалгарсан оролцогч, татгалзсан шалтгаан, үнийн саналын харьцуулалт) tender.gov.mn төрийн худалдан авах ажиллагааны цахим систем дээр нийтлэгдсэн байна.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Батлагдсан төсөв</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{formatCurrency(tender.totalBudget)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Сонгон шалгаруулах арга</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{tender.ruleName || 'Нээлттэй'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Санхүүжилтийн эх үүсвэр</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{tender.fundName || 'Төсөв'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Дууссан / Нээсэн огноо</span>
                          <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                            {tender.receiveDate ? tender.receiveDate.substring(0, 10) : 'Бүртгэлтэй'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <a
                          href={publicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
                        >
                          <Users className="h-4 w-4" />
                          <span>tender.gov.mn дээрх албан ёсны үр дүн & протокол үзэх</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          onClick={() => handleRunAiAnalysis(
                            'Энэ тендерийн үр дүнгийн хууль эрх зүйн зохицуулалт, шалгаруулалтын дараах гэрээ байгуулах шаардлага болон гомдол гаргах хугацааны талаар мэдээлэл өгнө үү.',
                            'results-ai',
                            'Үр дүн ба гэрээ байгуулах зохицуулалт'
                          )}
                          disabled={aiAnalyzing}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            aiAnalyzingTarget === 'results-ai'
                              ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/50'
                              : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50 shadow-2xs'
                          }`}
                        >
                          {aiAnalyzingTarget === 'results-ai' ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 text-amber-700 animate-spin" />
                              <span>AI шинжилж байна...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                              <span>AI Шинжээчээс үр дүнгийн талаар асуух</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-3">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">Шалгаруулалт одоогоор идэвхтэй явагдаж байна</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Тендерийн материалыг хүлээн авч дууссаны дараа Үнэлгээний хорооны нээлт хийгдэж, оролцогчдын үнийн санал болон шалгарсан эсэх үр дүн албан ёсоор нийтлэгдэнэ.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
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
                  <span>Тус захиалагчийн бусад тендерүүд ({(relatedByEntity || []).length})</span>
                </h4>

                {(relatedByEntity || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(relatedByEntity || []).map((r: any) => (
                      <div
                        key={r.invitationId}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
                            <span>{r.tenderCode}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {r.docStatusName}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                            {r.tenderName}
                          </h5>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(r.totalBudget)}
                          </span>
                          <Link
                            href={`/tender/${r.invitationId}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                          >
                            <span>Үзэх</span>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Энэ байгууллагын өөр тендер олдсонгүй.</p>
                )}
              </div>

              {/* Similar category tenders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>Салбарын ижил төстэй & Зөвлөмж болгох тендерүүд ({(similarTenders || []).length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Ухаалаг семантик тохирол
                  </span>
                </div>

                {(similarTenders || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(similarTenders || []).map((s: any) => (
                      <div key={s.invitationId} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-subtle transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-mono">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">{s.tenderCode}</span>
                            <span className="text-slate-400">{s.publishDate?.substring(0, 10)}</span>
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {s.tenderName}
                          </h5>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {s.matchReason && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                <Sparkles className="h-2.5 w-2.5" />
                                {s.matchReason}
                              </span>
                            )}
                            {s.budgetEntityName && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                🏛️ {s.budgetEntityName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Төсөвт өртөг</span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">
                              {formatCurrency(s.totalBudget)}
                            </span>
                          </div>
                          <Link
                            href={`/tender/${s.invitationId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors shadow-2xs"
                          >
                            <span>Дэлгэрэнгүй</span>
                            <Eye className="h-3.5 w-3.5" />
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
                {selectedDoc.fileId && (
                  <a
                    href={`/api/download?fileId=${selectedDoc.fileId}&name=${encodeURIComponent(selectedDoc.name || 'tender.pdf')}`}
                    download={selectedDoc.name || 'tender.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Эх PDF татах</span>
                  </a>
                )}
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

      {/* Floating Action Button (FAB) to chat with AI from anywhere on the page */}
      <button
        onClick={() => {
          setIsAiCollapsed(false);
          aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => chatInputRef.current?.focus(), 250);
        }}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 text-xs sm:text-sm font-bold cursor-pointer ring-2 ring-white/80 hover:scale-105 active:scale-95 group"
        title="Тендерийн AI Шинжээчээс асуух"
      >
        <Sparkles className="h-4 w-4 text-amber-200 group-hover:rotate-12 transition-transform" />
        <span>AI Шинжээчээс асуух</span>
        {aiMessages.length > 0 && (
          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-white text-amber-800 text-[11px] font-black flex items-center justify-center shadow-xs">
            {aiMessages.length}
          </span>
        )}
      </button>
    </div>
  );
};

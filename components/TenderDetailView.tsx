'use client';

import { SpecCell } from './SpecText';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { useTheme } from '@/components/ThemeProvider';
import { 
  ArrowLeft, Building2, Calendar, ShieldCheck, Tag, FileText, 
  Copy, Check, Trophy, Users, CheckCircle2, XCircle, AlertCircle, 
  ExternalLink, Sparkles, Clock, AlertTriangle, Layers, Briefcase, 
  CheckSquare, FileSpreadsheet, Download, RefreshCw, Eye, X, Loader2,
  Send, MessageSquare, Bot, User, Trash2, ChevronDown, ChevronUp, Package, Upload, BookOpen,
  Calculator, RotateCcw, Sun, Moon
} from 'lucide-react';
import { FormattedChatMessage } from './AIChatDrawer';
import { TenderPdfReaderModal } from '@/components/TenderPdfReaderModal';
import { ChinaSupplierModal } from '@/components/ChinaSupplierModal';
import { getBilingualTenderInfo } from '@/lib/bilingual-title';
import { Handshake, DollarSign } from 'lucide-react';

interface TenderDetailViewProps {
  initialData: any;
  initialLocale?: Locale;
}

interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  topic?: string;
}

export const TenderDetailView: React.FC<TenderDetailViewProps> = ({ initialData, initialLocale }) => {
  const [data, setData] = useState(initialData);
  const [locale, setLocaleState] = useState<Locale>(initialLocale || 'mn');
  const { theme, toggleTheme } = useTheme();

  const [isChinaSupplierOpen, setIsChinaSupplierOpen] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') as Locale | null;
      if (urlLang && ['mn', 'en', 'zh'].includes(urlLang)) {
        setLocaleState(urlLang);
        if (urlLang === 'zh') {
          setActiveTab('china');
        }
        return;
      }
      const saved = localStorage.getItem('tenderhub_locale') as Locale | null;
      if (saved && ['mn', 'en', 'zh'].includes(saved)) {
        setLocaleState(saved);
        if (saved === 'zh') {
          setActiveTab('china');
        }
      }
    } catch {}
  }, []);

  const setLocale = (newLoc: Locale) => {
    setLocaleState(newLoc);
    if (newLoc === 'zh') {
      setActiveTab('china');
    }
    try {
      localStorage.setItem('tenderhub_locale', newLoc);
      const url = new URL(window.location.href);
      url.searchParams.set('lang', newLoc);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const t = getTranslation(locale);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'bds' | 'tech' | 'results' | 'history' | 'china'>(
    initialLocale === 'zh' ? 'china' : 'bds'
  );

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
    if (!amount) return '—';
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
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [previewModalDoc, setPreviewModalDoc] = useState<{ name: string; text: string } | null>(null);
  const [copiedPreviewText, setCopiedPreviewText] = useState(false);
  const [manualPdfSecret, setManualPdfSecret] = useState('');
  const [manualPdfFile, setManualPdfFile] = useState<File | null>(null);
  const [manualPdfBusy, setManualPdfBusy] = useState(false);
  const [manualPdfMessage, setManualPdfMessage] = useState('');
  const [manualPdfError, setManualPdfError] = useState(false);
  const [isPdfReaderOpen, setIsPdfReaderOpen] = useState(false);
  const [pdfReaderDoc, setPdfReaderDoc] = useState<{ url: string; name: string } | null>(null);
  const [isEstimatorMode, setIsEstimatorMode] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});
  const [userAnnualTurnover, setUserAnnualTurnover] = useState<string>('');
  const [checkedLicenses, setCheckedLicenses] = useState<Record<string, boolean>>({});

  const handleManualPdfImport = async () => {
    if (!manualPdfFile || !manualPdfSecret || !data?.tender?.invitationId) return;
    setManualPdfBusy(true);
    setManualPdfError(false);
    setManualPdfMessage('PDF-г хувийн сан руу оруулж байна...');
    try {
      const authorization = `Bearer ${manualPdfSecret}`;
      const uploadPreparation = await fetch(`/api/tenders/${data.tender.invitationId}/pdf-import/upload`, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: manualPdfFile.name,
          type: manualPdfFile.type,
          size: manualPdfFile.size,
        }),
      });
      const uploadDetails = await uploadPreparation.json();
      if (!uploadPreparation.ok) throw new Error(uploadDetails.error || 'PDF upload бэлтгэж чадсангүй.');

      const { supabaseBrowser } = await import('@/lib/supabase-browser');
      if (!supabaseBrowser) throw new Error('Supabase-ийн нийтэд харагдах тохиргоо байхгүй байна.');
      const { error: storageError } = await supabaseBrowser.storage
        .from(uploadDetails.bucket)
        .uploadToSignedUrl(uploadDetails.path, uploadDetails.token, manualPdfFile, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (storageError) throw new Error(`PDF upload failed: ${storageError.message}`);

      setManualPdfMessage('PDF-ийн хуудсуудыг уншиж, тендерт хадгалж байна...');
      const processResponse = await fetch(`/api/tenders/${data.tender.invitationId}/pdf-import/process`, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: uploadDetails.path, fileName: uploadDetails.fileName }),
      });
      const result = await processResponse.json();
      if (!processResponse.ok) throw new Error(result.error || 'PDF-г боловсруулахад алдаа гарлаа.');

      const outcome = result.workerOcrQueued
        ? `Файл хадгалагдлаа. ${result.hasReadableText ? `${result.extractedPageCount}/${result.totalPageCount} хуудсын текст уншсан; ` : ''}Скан/дутуу хуудсыг OCR хийхийн тулд GitHub Actions дээр “Daily tender listing sync” workflow-г нэг удаа ажиллуулна уу.`
        : result.hasReadableText
          ? `${result.extractedPageCount}/${result.totalPageCount} хуудсын текст уншлаа.`
          : result.extractionStatus === 'scanned_not_processed'
            ? 'Энэ PDF скан зурагтай байна. OCR ажилд ороогүй; tender_pdf_jobs migration болон GitHub Actions worker-ийг шалгана уу.'
            : 'Файл хадгалагдлаа, уншигдах текст олдсонгүй.';
      const refreshed = await fetch(`/api/tenders/${data.tender.invitationId}?source=stored`, { cache: 'no-store' });
      if (refreshed.ok) setData(await refreshed.json());
      setManualPdfSecret('');
      setManualPdfBusy(false);
      setManualPdfMessage(outcome);
    } catch (error: any) {
      setManualPdfError(true);
      setManualPdfMessage(error?.message || 'PDF-г боловсруулахад алдаа гарлаа.');
      setManualPdfBusy(false);
    }
  };


  const handleExportDeliveryCsv = () => {
    const schedule = data?.technicalSpecs?.deliverySchedule || [];
    if (schedule.length === 0) return;
    const headers = ['№', 'Барааны нэр', 'Тоо хэмжээ', 'Хэмжих нэгж', 'Хүргэх газар / Цэг', 'Нийлүүлэх хугацаа'];
    const rows = schedule.map((row: any, rIdx: number) => [
      row.number || rIdx + 1,
      `"${(row.name || '').replace(/"/g, '""')}"`,
      row.quantity || '',
      `"${(row.unit || '').replace(/"/g, '""')}"`,
      `"${(row.location || '').replace(/"/g, '""')}"`,
      `"${(row.deadline || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tender_${data?.tender?.tenderCode || data?.tender?.invitationId}_delivery_schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
  const bilingual = getBilingualTenderInfo(
    tender.tenderName,
    tender.budgetEntityName,
    Number(tender.totalBudget) || 0,
    tender.tenderTypeCode
  );
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

  const budgetMnt = Number(tender?.totalBudget) || 0;
  const sampleItemsList = technicalSpecs.sampleItems || [];

  const totalEstimatedBid = React.useMemo(() => {
    return sampleItemsList.reduce((acc: number, it: any, idx: number) => {
      const rawQty = parseFloat(String(it.quantity || (it as any).qty || 1).replace(/[^\d.]/g, '')) || 1;
      const price = itemPrices[idx] || 0;
      return acc + (rawQty * price);
    }, 0);
  }, [sampleItemsList, itemPrices]);

  const budgetDiff = totalEstimatedBid > 0 && budgetMnt > 0 ? totalEstimatedBid - budgetMnt : 0;
  const budgetDiffPercent = budgetMnt > 0 && totalEstimatedBid > 0 ? ((totalEstimatedBid - budgetMnt) / budgetMnt) * 100 : 0;

  const handlePriceChange = (index: number, val: string) => {
    const num = parseFloat(val.replace(/[^\d.]/g, '')) || 0;
    setItemPrices((prev) => ({ ...prev, [index]: num }));
  };

  const handleAutoDistributeBudget = (percentageMultiplier: number = 1.0) => {
    if (sampleItemsList.length === 0 || budgetMnt <= 0) return;
    const targetTotal = budgetMnt * percentageMultiplier;
    const amountPerItem = targetTotal / sampleItemsList.length;
    const newPrices: Record<number, number> = {};
    sampleItemsList.forEach((it: any, idx: number) => {
      const rawQty = Math.max(1, parseFloat(String(it.quantity || (it as any).qty || 1).replace(/[^\d.]/g, '')) || 1);
      newPrices[idx] = Math.round(amountPerItem / rawQty);
    });
    setItemPrices(newPrices);
  };

  const handleResetPrices = () => {
    setItemPrices({});
  };

  const parsedTurnoverReqMnt = React.useMemo(() => {
    const reqStr = bds.turnoverReq || (bds.minAnnualTurnover ? String(bds.minAnnualTurnover) : '');
    if (!reqStr) return null;
    const str = String(reqStr).toLowerCase();
    const bilMatch = str.match(/([\d.,]+)\s*(тэрбум|billion)/);
    if (bilMatch) return parseFloat(bilMatch[1].replace(/,/g, '')) * 1_000_000_000;
    const milMatch = str.match(/([\d.,]+)\s*(сая|million)/);
    if (milMatch) return parseFloat(milMatch[1].replace(/,/g, '')) * 1_000_000;
    const numMatch = str.replace(/[^\d]/g, '');
    if (numMatch && numMatch.length >= 6) return parseFloat(numMatch);
    return null;
  }, [bds.turnoverReq, bds.minAnnualTurnover]);

  const userTurnoverNum = React.useMemo(() => {
    return parseFloat(userAnnualTurnover.replace(/[^\d.]/g, '')) || 0;
  }, [userAnnualTurnover]);

  const requiredLicensesList: string[] = bds.requiredLicenses || [];

  const licenseMatchCount = React.useMemo(() => {
    if (requiredLicensesList.length === 0) return 0;
    return requiredLicensesList.filter((lic) => checkedLicenses[lic]).length;
  }, [requiredLicensesList, checkedLicenses]);

  const eligibilityVerdict = React.useMemo(() => {
    const hasInputs = userTurnoverNum > 0 || Object.values(checkedLicenses).some(Boolean);
    if (!hasInputs && requiredLicensesList.length === 0) return null;
    
    const allLicensesOk = requiredLicensesList.length === 0 || licenseMatchCount === requiredLicensesList.length;
    const turnoverOk = !parsedTurnoverReqMnt || (userTurnoverNum >= parsedTurnoverReqMnt);
    
    if (allLicensesOk && turnoverOk && (userTurnoverNum > 0 || requiredLicensesList.length > 0)) {
      return {
        status: 'pass',
        title: locale === 'mn' ? '100% Тэнцэх бүрэн боломжтой' : locale === 'zh' ? '100% 完全符合资格' : '100% Fully Eligible to Bid',
        desc: locale === 'mn' ? 'Бүх тусгай зөвшөөрөл болон санхүүгийн босго шаардлага бүрэн хангагдсан байна.' : locale === 'zh' ? '已具备全部所需资质及年度营业额门槛要求。' : 'All required licenses and annual turnover criteria are satisfied.'
      };
    } else if (hasInputs) {
      return {
        status: 'warning',
        title: locale === 'mn' ? 'Түншлэл (JV) эсвэл Туслан гүйцэтгэгч шаардлагатай' : locale === 'zh' ? '建议组成联合体 (JV) 联合投标' : 'Joint Venture (JV) Recommended',
        desc: locale === 'mn' ? `Дутуу шалгуур: ${[!allLicensesOk ? `Зөвшөөрөл (${requiredLicensesList.length - licenseMatchCount} дутуу)` : '', !turnoverOk && parsedTurnoverReqMnt ? 'Борлуулалтын босго хүрэхгүй' : ''].filter(Boolean).join(', ')}. Консорциум үүсгэж оролцохыг зөвлөж байна.` : locale === 'zh' ? '部分资质或财务门槛未达标，建议寻找本地合作伙伴联合投标。' : 'Some criteria are not met. Bidding via a consortium is recommended.'
      };
    }
    return null;
  }, [requiredLicensesList, licenseMatchCount, parsedTurnoverReqMnt, userTurnoverNum, checkedLicenses, locale]);

  const handleExportItemsCsv = () => {
    const items = technicalSpecs.sampleItems || [];
    if (items.length === 0) return;

    if (isEstimatorMode) {
      const headers = ['№', 'Бараа / Ажлын нэр', 'Тоо хэмжээ', 'Хэмжих нэгж', 'Нэгж үнэ (₮)', 'Нийт үнэ (₮)', 'Техникийн тодорхойлолт'];
      const rows = items.map((it: any, idx: number) => {
        const rawQty = parseFloat(String(it.quantity || it.qty || 1).replace(/[^\d.]/g, '')) || 1;
        const unitPrice = itemPrices[idx] || 0;
        const lineTotal = rawQty * unitPrice;
        return [
          idx + 1,
          `"${(it.name || '').replace(/"/g, '""')}"`,
          rawQty,
          `"${(it.unit || '').replace(/"/g, '""')}"`,
          unitPrice,
          lineTotal,
          `"${(it.spec || it.specs || '').replace(/"/g, '""')}"`
        ];
      });
      rows.push([
        '',
        `"НИЙТ САНАЛ БОЛГОХ ДҮН"`,
        '',
        '',
        '',
        totalEstimatedBid,
        `"Зарлагдсан төсөвт өртөг: ₮${budgetMnt.toLocaleString()} (Зөрүү: ${budgetDiffPercent > 0 ? '+' : ''}${budgetDiffPercent.toFixed(1)}%)"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Tender_${data?.tender?.tenderCode || data?.tender?.invitationId}_priced_bid.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = ['№', 'Бараа / Ажлын нэр', 'Тоо хэмжээ', 'Хэмжих нэгж', 'Техникийн үзүүлэлт / Стандарт'];
    const rows = items.map((it: any, idx: number) => [
      idx + 1,
      `"${(it.name || '').replace(/"/g, '""')}"`,
      it.quantity || 1,
      `"${(it.unit || '').replace(/"/g, '""')}"`,
      `"${(it.spec || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tender_${data?.tender?.tenderCode || data?.tender?.invitationId}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tenderRawData = data?.tender?.raw_data || data?.tender?.rawData || data?.rawData;
  let pdfDocuments: any[] = Array.isArray(technicalSpecs.documents) ? [...technicalSpecs.documents] : [];
  if (pdfDocuments.length === 0 && tenderRawData?.pdfUrl) {
    pdfDocuments = [{
      id: 'stored-primary-pdf',
      fileId: tenderRawData.tenderDocumentId || 'primary',
      name: tenderRawData.pdfFileName || `${data?.tender?.tenderCode || data?.tender?.invitationId}_ТШББ.pdf`,
      fileExtention: 'pdf',
      category: 'Тендер шалгаруулалтын баримт бичиг (ТШББ)',
      type: 'PDF Баримт',
      date: (data?.tender?.publishDate || '').substring(0, 10),
      url: tenderRawData.pdfUrl,
      downloadUrl: tenderRawData.pdfUrl,
      isStored: true,
      source: 'stored_cdn',
      extractionStatus: 'text_extracted',
      extractedPageCount: tenderRawData.pdfPageCount || 1,
      totalPageCount: tenderRawData.pdfPageCount || 1,
      extractedSummary: tenderRawData.liveBundle?.fullScopeOfWork || '',
      officialNotice: 'Supabase хадгалагдсан албан ёсны ТШЗ баримт'
    }];
  }
  const storedPrimaryPdf = pdfDocuments.find((d: any) => d.isStored || d.downloadUrl?.includes('supabase.co') || d.url?.includes('supabase.co')) || 
    (tenderRawData?.pdfUrl ? {
      name: tenderRawData.pdfFileName || `${data?.tender?.tenderCode || data?.tender?.invitationId}_ТШББ.pdf`,
      downloadUrl: tenderRawData.pdfUrl,
      url: tenderRawData.pdfUrl
    } : null);
  const readablePdfDocuments = pdfDocuments.filter((doc: any) =>
    ['text_extracted', 'partial', 'ocr_partial'].includes(doc.extractionStatus) || !!doc.extractedSummary,
  );
  const hasPdfTextEvidence = typeof data?.liveBundle?.pdfText === 'string'
    ? data.liveBundle.pdfText.trim().length > 0
    : readablePdfDocuments.length > 0;
  const isTelegramOnly = tenderRawData?.source === 'telegram' && pdfDocuments.length === 0;
  const pdfCoverageNotice = isTelegramOnly
    ? {
        title: locale === 'zh' ? '仅有公告信息' : locale === 'en' ? 'Announcement only' : 'Зөвхөн зарын мэдээлэл',
        message: locale === 'zh'
          ? '此标段来自官方公告频道（标题、采购单位、发布日期）。预算、截止日期和招标文件请在 tender.gov.mn 查看。'
          : locale === 'en'
          ? 'This tender comes from the official announcement feed (title, buyer, publish date). Budget, deadline and documents are on tender.gov.mn.'
          : 'Энэ тендерийг албан ёсны зарын сувгаас авсан (нэр, захиалагч, зарласан огноо). Төсөв, эцсийн хугацаа, баримт бичгийг tender.gov.mn-ээс харна уу.',
        tone: 'blue',
      }
    : pdfDocuments.length === 0
    ? {
        title: 'Эх баримтын файлууд татагдаагүй байна',
        message: 'Энэ тендерийн PDF файлын жагсаалтыг эх сурвалжаас авч чадсангүй. “—” нь шаардлага байхгүй гэсэн үг биш; эх тендерийн баримтаар нягтална уу.',
        tone: 'amber',
      }
    : readablePdfDocuments.length === 0
      ? {
          title: 'PDF-ийн текст уншигдаагүй байна',
          message: 'Баримт байгаа ч текстийг хараахан уншиж чадаагүй. “—” талбарууд баталгаажаагүй утгыг тэмдэглэнэ.',
          tone: 'amber',
        }
      : data?.liveBundle?.stale || data?.liveBundle?.extractionStatus !== 'complete'
        ? {
            title: 'PDF-ийн мэдээлэл хэсэгчлэн уншигдсан',
            message: 'Зарим хуудас эсвэл баримт дутуу байж болно. “—” нь шаардлага байхгүй гэсэн үг биш; эх файлыг шалгана уу.',
            tone: 'amber',
          }
        : {
            title: 'PDF-ийн текст боловсруулагдсан',
            message: 'Эдгээр нь автоматаар уншсан хураангуй. “—” талбаруудыг эх баримтын заалтаар нягтална уу.',
            tone: 'blue',
          };
  const results = {
    ...data?.results,
    bidders: data?.results?.bidders || [],
  };
  const relatedByEntity: any[] = Array.isArray(data?.relatedByEntity) ? data.relatedByEntity : [];
  const similarTenders: any[] = Array.isArray(data?.similarTenders) ? data.similarTenders : [];
  const chinaAnalysis = data?.chinaBidderAnalysis || data?.tender?.chinaBidderAnalysis;

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
    const content = `БАРИМТ БИЧИГ: ${doc.name}\n` +
      `Тендер: ${tender.tenderName}\n` +
      `Боловсруулалтын төлөв: ${doc.extractionStatus || 'not_extracted'}\n` +
      `\n${doc.extractedSummary || 'Энэ баримтаас уншигдах текст одоогоор олдоогүй. Энэ нь PDF-д мэдээлэл байхгүй гэсэн үг биш.'}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.name.replace(/\.[a-z0-9]+$/i, '')}_эх_текст.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="tender-detail-root min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 pb-20 transition-colors duration-150">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {locale === 'mn' ? 'Бүх тендер рүү буцах' : locale === 'zh' ? '返回招标列表' : 'Back to Tenders'}
            </span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 hidden sm:block"></div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 hidden md:inline font-mono">
            {tender.tenderCode || tender.invitationNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer shrink-0"
            aria-label={theme === 'dark' ? 'Гэгээлэг горим руу шилжих' : 'Харанхуй горим руу шилжих'}
            title={theme === 'dark' ? 'Гэгээлэг горим (Light mode)' : 'Харанхуй горим (Dark mode)'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 dark:text-zinc-300 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* 3-Way Language Switcher */}
          <div className="flex items-center bg-slate-100/90 dark:bg-zinc-800 rounded-lg p-0.5 border border-slate-200/80 dark:border-zinc-700 shrink-0">
            <button
              onClick={() => setLocale('mn')}
              className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
 locale === 'mn'
 ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
              title="Монгол хэл"
            >
              MN
            </button>
            <button
              onClick={() => setLocale('en')}
              className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
 locale === 'en'
 ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => setLocale('zh')}
              className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
 locale === 'zh'
 ? 'bg-slate-900 dark:bg-zinc-700 text-white shadow-2xs font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
              title="中文 (Chinese)"
            >
              <span></span>
              <span>中文</span>
            </button>
          </div>

          <button
            onClick={() => handleRunAiAnalysis(undefined, 'nav', locale === 'zh' ? '综合ТШЗ招标文件分析' : 'Ерөнхий ТШББ дүгнэлт')}
            disabled={aiAnalyzing}
            className={`h-8 px-3 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
 aiAnalyzingTarget === 'nav'
 ? 'bg-slate-100 text-slate-900 border-slate-300 ring-2 ring-slate-400/50'
 : 'text-slate-800 bg-slate-50 hover:bg-slate-100 border-slate-200'
 }`}
          >
            {aiAnalyzingTarget === 'nav' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 text-slate-600 animate-spin" />
                <span>{locale === 'mn' ? 'Шинжилж байна...' : locale === 'zh' ? '正在智能分析...' : 'Analyzing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">{locale === 'mn' ? 'AI Шинжээч' : locale === 'zh' ? 'AI 专家分析' : 'AI Analysis'}</span>
              </>
            )}
          </button>
          {storedPrimaryPdf && (
            <>
              <button
                onClick={() => {
                  setPdfReaderDoc({
                    url: storedPrimaryPdf.downloadUrl || storedPrimaryPdf.url,
                    name: storedPrimaryPdf.name || 'ТШББ.pdf'
                  });
                  setIsPdfReaderOpen(true);
                }}
                className="hidden sm:flex h-8 px-3 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="ТШЗ PDF баримтыг вебсайт дээрээс шууд унших"
              >
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                <span>ТШЗ Унших</span>
              </button>
              <a
                href={storedPrimaryPdf.downloadUrl || storedPrimaryPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                download={storedPrimaryPdf.name || 'ТШББ.pdf'}
                className="hidden sm:flex h-8 px-3 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 items-center gap-1.5 transition-colors shadow-2xs"
                title="Supabase CDN-ээс ТШЗ PDF-ийг шууд татах"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>ТШЗ Татах</span>
              </a>
            </>
          )}
          <a
            href={publicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-8 px-3 rounded-md text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>tender.gov.mn</span>
            <ExternalLink className="h-3 w-3 text-slate-400 dark:text-zinc-400" />
          </a>
          <a
            href={supplierLink}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3.5 rounded-md text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>{locale === 'mn' ? 'Оролцох' : locale === 'zh' ? '参与投标' : 'Participate'}</span>
            <ExternalLink className="h-3 w-3 text-slate-300" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Header Hero Banner */}
        <div className="bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
              <span>{tender.tenderCode || tender.invitationNumber}</span>
              <button
                onClick={() => handleCopyCode(tender.tenderCode || tender.invitationNumber)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                title="Код хуулах"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-800">
              {tender.tenderTypeName || 'Тендер'}
            </span>
            <span className={`font-semibold px-2 py-0.5 rounded border ${
 isFailed
 ? 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
 : isConcluded
 ? 'bg-amber-50 dark:bg-zinc-900 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-zinc-800'
 : 'bg-emerald-50 dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-zinc-800'
 }`}>
              {isFailed ? (locale === 'zh' ? '流标 / 终止' : 'Амжилтгүй болсон') : (locale === 'zh' ? (isConcluded ? '已公示' : '投标进行中') : (tender.docStatusName || 'Идэвхтэй'))}
            </span>
            {tender.receiveDate && (
              <span className="text-slate-500 dark:text-zinc-400 font-medium ml-auto flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{locale === 'zh' ? '截止时间: ' : 'Эцсийн хугацаа: '}{tender.receiveDate}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
            {locale === 'zh' ? (
              <span className="flex flex-col gap-1">
                <span className="text-blue-700 dark:text-blue-400 block font-semibold">
                  {bilingual.titleZh}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                  {tender.tenderName}
                </span>
              </span>
            ) : (
              tender.tenderName
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{locale === 'zh' ? bilingual.entityZh : tender.budgetEntityName}</span>
            </div>
            {tender.positionName && (
              <div className="text-slate-500 dark:text-zinc-400">
                {locale === 'zh' ? '隶属管辖: ' : 'Харьяалал: '}<span className="font-medium text-slate-700 dark:text-zinc-300">{tender.positionName}</span>
              </div>
            )}
            {tender.ruleName && (
              <div className="text-slate-500 dark:text-zinc-400">
                {locale === 'zh' ? '采购程序: ' : 'Арга: '}<span className="font-medium text-slate-700 dark:text-zinc-300">{tender.ruleName}</span>
              </div>
            )}
            {tender.fundName && (
              <div className="text-slate-500 dark:text-zinc-400">
                {locale === 'zh' ? '资金来源: ' : 'Эх үүсвэр: '}<span className="font-medium text-slate-700 dark:text-zinc-300">{tender.fundName}</span>
              </div>
            )}
          </div>

          <div className={`flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-lg border px-3.5 py-3 ${
 pdfCoverageNotice.tone === 'blue'
 ? 'bg-blue-50 dark:bg-zinc-900 border-blue-200 dark:border-zinc-800 text-blue-900 dark:text-blue-200'
 : 'bg-amber-50 dark:bg-zinc-900 border-amber-200 dark:border-zinc-800 text-amber-950 dark:text-amber-200'
 }`} role="status">
            <FileText className="h-4 w-4 shrink-0 opacity-80" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">{pdfCoverageNotice.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">{pdfCoverageNotice.message}</p>
            </div>
            <a href={publicLink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold underline underline-offset-2">
              {locale === 'zh' ? '打开官方源网页 ' : 'Эх тендерийг нээх '}
            </a>
          </div>

          {isTelegramOnly && data?.budgetEstimate && (
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {locale === 'zh' ? '预算估算（非官方）' : locale === 'en' ? 'Estimated budget (not official)' : 'Төсвийн урьдчилсан тооцоо (албан бус)'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {data.budgetEstimate.basis === 'same_buyer'
                    ? (locale === 'zh' ? `依据该采购单位 ${data.budgetEstimate.count} 个类似往期标段` : locale === 'en' ? `From ${data.budgetEstimate.count} similar past tenders by this buyer` : `Энэ захиалагчийн ${data.budgetEstimate.count} төстэй өмнөх тендерээс`)
                    : (locale === 'zh' ? `依据 ${data.budgetEstimate.count} 个名称相似的往期标段` : locale === 'en' ? `From ${data.budgetEstimate.count} past tenders with similar titles` : `Төстэй нэртэй ${data.budgetEstimate.count} өмнөх тендерээс`)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  ≈ ₮{data.budgetEstimate.median.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500 dark:text-zinc-400 tabular-nums">
                  {locale === 'zh' ? '常见区间' : locale === 'en' ? 'typical range' : 'ихэвчлэн'} ₮{data.budgetEstimate.low.toLocaleString()} – ₮{data.budgetEstimate.high.toLocaleString()}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-zinc-800 border-t border-slate-100 dark:border-zinc-800">
                {data.budgetEstimate.examples.map((ex: any) => (
                  <li key={ex.invitationId}>
                    <a href={`/tender/${ex.invitationId}`} className="flex items-baseline justify-between gap-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                      <span className="min-w-0 truncate text-slate-700 dark:text-zinc-300">{ex.tenderName}</span>
                      <span className="shrink-0 tabular-nums text-slate-900 dark:text-white">₮{ex.totalBudget.toLocaleString()}{ex.publishDate ? ` · ${String(ex.publishDate).slice(0, 4)}` : ''}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key facts: one ruled strip */}
          {!isTelegramOnly && (
          <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {locale === 'zh' ? '关键信息' : locale === 'mn' ? 'Тендерийн гол үзүүлэлтүүд' : 'Key facts'}
              </h2>
              <div className="flex items-center gap-3">
                {chinaAnalysis && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${chinaAnalysis.eligibilityStatus === 'direct_allowed' ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-zinc-700'}`} />
                    {locale === 'zh' ? (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? '允许外企独立直投' : '建议组建联合体投标') : locale === 'en' ? (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? 'Foreign bidders may apply directly' : 'Joint venture required') : (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? 'Шууд оролцох боломжтой' : 'Түншлэл (JV) шаардлагатай')}
                  </span>
                )}
                <button
                  onClick={() => setIsChinaSupplierOpen(true)}
                  className="h-8 rounded-md border border-slate-300 dark:border-zinc-700 px-3 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {locale === 'zh' ? '对接蒙古本地伙伴' : locale === 'en' ? 'Find a local partner' : 'Түнш хайх'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-zinc-800">
              <div className="px-4 py-3.5">
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{locale === 'zh' ? '主要采购标的物' : locale === 'en' ? 'Main item' : 'Гол нийлүүлэх бараа'}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">
                  {locale === 'zh'
                    ? (bilingual.titleZh.split('] ')[1] || bilingual.titleZh)
                    : (technicalSpecs.sampleItems?.[0]?.name || tender.tenderName)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  {technicalSpecs.sampleItems?.[0]?.quantity
                    ? `${technicalSpecs.sampleItems[0].quantity} ${technicalSpecs.sampleItems[0].unit || ''}`
                    : (locale === 'zh' ? '1 批次' : locale === 'en' ? '1 lot' : '1 багц')}
                  {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 1 && (
                    <span className="ml-1.5 font-mono">(+{technicalSpecs.sampleItems.length - 1})</span>
                  )}
                </p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{locale === 'zh' ? '项目预算' : locale === 'en' ? 'Budget' : 'Төсөвт өртөг'}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100 font-mono">
                  {locale === 'zh' ? bilingual.budgetRmbFormatted : `₮ ${Number(tender.totalBudget).toLocaleString()}`}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                  {locale === 'zh' ? `投标保函(1%): ~${bilingual.guaranteeRmbFormatted}` : `≈ ${bilingual.budgetRmbFormatted}`}
                </p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{locale === 'zh' ? '交付周期与地点' : locale === 'en' ? 'Delivery' : 'Нийлүүлэлтийн хугацаа'}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  {technicalSpecs.deliveryPeriodText || (locale === 'zh' ? '未从PDF读取' : locale === 'en' ? 'Not read from PDF' : 'PDF-ээс уншаагүй')}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {locale === 'zh' ? (bilingual.entityZh || technicalSpecs.deliveryLocation) : (technicalSpecs.deliveryLocation || '—')}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Interactive AI Quick Prompts based on Structured PDF Data */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{locale === 'zh' ? 'AI 专家快速提问:' : 'AI Шинжээчээс асуух:'}</span>
            </span>
            <button
              onClick={() => handleRunAiAnalysis(
                'Энэ тендерт шаардагдах тусгай зөвшөөрөл, түлхүүр боловсон хүчин, өмнөх туршлагын шалгуурыг нарийвчлан шинжилж, оролцогчдод анхаарах зүйлсийг нэгтгэнэ үү.',
                'quick-license',
                'Тусгай зөвшөөрөл & Шалгуур'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
 aiAnalyzingTarget === 'quick-license'
 ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400/50'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
            >
              {aiAnalyzingTarget === 'quick-license' ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
              <span>Тусгай зөвшөөрөл & Шалгуур</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Энэ тендерийн борлуулалтын доод орлогын босго, түргэн хөрвөх чадвартай хөрөнгө, тендерийн баталгааны тооцоолол болон санхүүгийн эрсдэлийг тооцож өгнө үү.',
                'quick-finance',
                'Санхүүгийн босго & Баталгаа'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
 aiAnalyzingTarget === 'quick-finance'
 ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400/50'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
            >
              {aiAnalyzingTarget === 'quick-finance' ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <Tag className="h-3.5 w-3.5 text-blue-600" />}
              <span>Санхүүгийн босго & Баталгаа</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Техникийн тодорхойлолт, нийлүүлэлтийн хуваарь, чанарын стандартууд (MNS/ISO), алданги торгуулийн заалт дээр оролцогчдын зүгээс анхаарах гол эрсдэлүүд юу байна вэ?',
                'quick-tech',
                'Техникийн үзүүлэлтийн эрсдэл'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
 aiAnalyzingTarget === 'quick-tech'
 ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400/50'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
            >
              {aiAnalyzingTarget === 'quick-tech' ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <FileText className="h-3.5 w-3.5 text-blue-600" />}
              <span>Техникийн үзүүлэлтийн эрсдэл</span>
            </button>
            <button
              onClick={() => handleRunAiAnalysis(
                'Тендерт оролцоход бүрдүүлэх баримт бичгийн хяналтын хуудас (Checklist) болон цахим системээр үнийн санал илгээх стратегийг зөвлөнө үү.',
                'quick-docs',
                'Баримт бичгийн хяналт'
              )}
              disabled={aiAnalyzing}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5 cursor-pointer ${
 aiAnalyzingTarget === 'quick-docs'
 ? 'bg-blue-100 text-blue-900 border-blue-300 ring-2 ring-blue-400/50'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
 }`}
            >
              {aiAnalyzingTarget === 'quick-docs' ? <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> : <CheckSquare className="h-3.5 w-3.5 text-blue-600" />}
              <span>Баримт бичгийн хяналт</span>
            </button>
          </div>
        </div>

        {/* AI Analysis & Multi-turn Conversation Section */}
        <div ref={aiAnalysisRef} className="scroll-mt-24">
          {(aiMessages.length > 0 || aiAnalyzing) ? (
            <div className=" bg-slate-50/90 border-2 border-slate-300 rounded-lg shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
              {/* Header */}
              <div className="p-4 sm:p-5 bg-white/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                        AI Шинжээчийн Харилцан Яриа
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-900 border border-slate-300">
                        {hasPdfTextEvidence ? 'PDF-ийн текст бэлэн' : 'PDF-ийн текст уншигдаагүй'}
                      </span>
                      {aiMessages.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                          {aiMessages.length} мессеж
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasPdfTextEvidence
                        ? 'Уншсан эх баримтын эшлэлээр хариулна. Шаардлага бүрийг албан ёсны заалтаар нягтална уу.'
                        : 'Одоогоор уншсан PDF текст алга. AI нөхцөл таамаглахгүй; албан эх баримтаас шалгах шаардлагатайг хэлнэ.'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {aiMessages.length > 0 && (
                    <>
                      <button
                        onClick={handleCopyChatTranscript}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
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
                            <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs mt-1">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                          <div
                            className={`max-w-[88%] sm:max-w-[82%] rounded-lg p-4 shadow-2xs ${
 isUser
 ? 'bg-blue-600 text-white rounded-tr-none'
 : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
 }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5 border-b pb-1 border-current/15 text-[10px] opacity-80">
                              <span className="font-bold flex items-center gap-1">
                                {isUser ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                                <span>{isUser ? 'Таны асуулт' : 'AI Шинжээчийн дүгнэлт'}</span>
                                {msg.topic && (
                                  <span className={`ml-1 px-1.5 py-0.2 rounded font-normal ${isUser ? 'bg-blue-700' : 'bg-slate-100 text-slate-900'}`}>
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
                        <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none p-4 shadow-2xs space-y-2 max-w-md">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                            <span>AI Шинжээч хариултыг боловсруулж байна...</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Уншигдсан баримтын эшлэл болон өмнөх асуултыг боловсруулж байна.
                          </p>
                          <div className="space-y-1.5 pt-1 animate-pulse">
                            <div className="h-2.5 bg-slate-200/60 rounded w-11/12"></div>
                            <div className="h-2.5 bg-slate-200/50 rounded w-4/5"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Follow-up Question Input Form */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
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
                          className="w-full bg-white border border-slate-300/90 rounded-md pl-4 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-2xs transition-all"
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
                        className="px-4 py-2.5 rounded-md bg-slate-900 dark:bg-zinc-700 hover:bg-slate-800 dark:hover:bg-zinc-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
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
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Package className="h-3 w-3 text-blue-600" />
                          <span>Нийлүүлэлтийн хуваарь?</span>
                        </button>
                      )}
                      {technicalSpecs.specialConditions && technicalSpecs.specialConditions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis('Гэрээний тусгай нөхцөл (ГТН)-д заасан алданги, төлбөрийн нөхцөл, хүлээлцэх нөхцөлүүд ямар байна вэ?', 'chip-scc', 'Гэрээний тусгай нөхцөл')}
                          disabled={aiAnalyzing}
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3 text-blue-600" />
                          <span>Гэрээний тусгай нөхцөл & Алданги?</span>
                        </button>
                      )}
                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => handleRunAiAnalysis('Энэхүү амжилтгүй болсон тендер яагаад цуцлагдсан бэ, дараа нь дахин зарлагдах уу, оролцоход юуг анхаарах вэ?', 'chip-failed', 'Амжилтгүй болсон шалтгаан')}
                          disabled={aiAnalyzing}
                          className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          <span>Яагаад амжилтгүй болсон бэ?</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRunAiAnalysis('Энэ тендерт шаардагдах тендерийн баталгаа болон банкны тодорхойлолтыг хэрхэн бэлтгэх вэ?', 'chip-guarantee', 'Тендерийн баталгаа')}
                        disabled={aiAnalyzing}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3 w-3 text-teal-600" />
                        <span>Тендерийн баталгааны шаардлага?</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRunAiAnalysis('Энэ тендерт өрсөлдөхөд оролцогчийн хувьд ямар гол эрсдэл, хасагдах шалтгаан үүсч болох вэ?', 'chip-risk', 'Эрсдэлийн шинжилгээ')}
                        disabled={aiAnalyzing}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3 text-slate-600" />
                        <span>Өрсөлдөхөд анхаарах гол эрсдэл?</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className=" bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Тендерийн AI Шинжээчтэй ярилцах
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    AI нь уншсан эх баримтын эшлэлээр хариулна. Эшлэл байхгүй үед таамаглахгүй гэдгээ шууд хэлнэ.
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
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!followupInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-zinc-700 hover:bg-slate-800 dark:hover:bg-zinc-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
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
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block mb-1">
              {locale === 'zh' ? '项目总预算' : locale === 'mn' ? 'Нийт төсөвт өртөг' : 'Total Budget'}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-950 dark:text-white block">
              {formatCurrency(tender.totalBudget)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
              {locale === 'zh' ? `折合 ~${bilingual.budgetRmbFormatted}` : 'Батлагдсан нийт төсөв'}
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block mb-1">
              {locale === 'zh' ? '当年度预算 / 预付款' : (tender.yearBudget && tender.yearBudget !== tender.totalBudget ? 'Тухайн онд санхүүжих' : 'Урьдчилгаа төлбөр')}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono text-slate-800 dark:text-zinc-200 block">
              {tender.yearBudget && tender.yearBudget !== tender.totalBudget
                ? formatCurrency(tender.yearBudget)
                : (technicalSpecs.paymentTerms?.advancePaymentPct != null
                  ? `${technicalSpecs.paymentTerms.advancePaymentPct}%`
                  : (locale === 'zh' ? '按合同节点' : '—'))}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
              {tender.yearBudget && tender.yearBudget !== tender.totalBudget ? 'Энэ оны хуваарьт санхүүжилт' : (locale === 'zh' ? '依据招标文件进度拨付' : 'Албан ёсны эх баримтаас шалгана уу')}
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block mb-1">
              {locale === 'zh' ? '投标保函要求' : locale === 'mn' ? 'Тендерийн баталгаа' : 'Bid Bond'}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-blue-950 dark:text-blue-200 block">
              {bds.bidSecurityReq?.includes('Шаардахгүй') ? (
                <span className="text-emerald-700 dark:text-emerald-400">{locale === 'zh' ? '免保函 (0₮)' : 'Шаардахгүй'}</span>
              ) : bds.bidSecurityReq ? (
                <span className="text-sm">{bds.bidSecurityReq}</span>
              ) : (
                '—'
              )}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block truncate">
              {bds.bidSecurityReq ? (locale === 'zh' ? '从 ТШЗ 招标文件解析' : 'PDF текстээс автоматаар илрүүлсэн') : (locale === 'zh' ? '未从PDF读取' : locale === 'en' ? 'Not read from PDF' : 'PDF-ээс уншаагүй')}
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-md border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
              {locale === 'zh' ? '履约保证金' : locale === 'mn' ? 'Гүйцэтгэлийн баталгаа' : 'Performance Bond'}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-950 dark:text-emerald-200 block">
              {bds.performanceBondPct != null ? `${bds.performanceBondPct}%` : '—'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              {bds.performanceBondPct != null ? (locale === 'zh' ? '中标签约时缴纳' : 'Гэрээ байгуулахад гаргах баталгаа') : (locale === 'zh' ? '未从PDF读取' : locale === 'en' ? 'Not read from PDF' : 'PDF-ээс уншаагүй')}
            </span>
          </div>
        </div>

        {/* Responsive Segmented Tab Controls (Zero horizontal scroll) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-1.5 bg-slate-100/90 dark:bg-zinc-900/90 rounded-lg border border-slate-200/80 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('bds')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
 activeTab === 'bds'
 ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-zinc-700 font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50'
 }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="truncate">{locale === 'zh' ? '准入与资质 (BDS)' : locale === 'mn' ? 'Шалгуур (ТШӨХ)' : 'BDS Criteria'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tech')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
 activeTab === 'tech'
 ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-zinc-700 font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50'
 }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">{locale === 'zh' ? '采购清单与规格' : locale === 'mn' ? 'Техникийн тодорхойлолт & Бараа' : 'Tech Specs & BoQ'}</span>
            {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-zinc-800 text-blue-800 dark:text-blue-300 font-mono font-bold shrink-0">
                {technicalSpecs.sampleItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
 activeTab === 'results'
 ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-zinc-700 font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50'
 }`}
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span className="truncate">{locale === 'zh' ? '中标结果与投标商' : locale === 'mn' ? 'Үр дүн & Оролцогчид' : 'Results & Bidders'}</span>
            {isFailed ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold shrink-0">
                {locale === 'zh' ? '流标' : 'Амжилтгүй'}
              </span>
            ) : isConcluded ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 font-semibold shrink-0">
                {locale === 'zh' ? '已公示' : 'Гарсан'}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
 activeTab === 'history'
 ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200/70 dark:border-zinc-700 font-bold'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50'
 }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="truncate">{locale === 'zh' ? '历史同类项目' : locale === 'mn' ? 'Холбоотой' : 'Similar & Related'}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/70 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-mono shrink-0">
              {relatedByEntity.length + similarTenders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('china')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
 activeTab === 'china'
 ? locale === 'zh'
 ? 'bg-slate-900 dark:bg-zinc-700 text-white shadow-xs font-bold'
 : 'bg-slate-900 dark:bg-zinc-700 text-white shadow-xs font-bold'
 : locale === 'zh'
 ? 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50 bg-red-50/70 dark:bg-zinc-900 border border-red-200/60 dark:border-zinc-800'
 : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/50 bg-indigo-50/70 dark:bg-zinc-900 border border-indigo-200/60 dark:border-zinc-800'
 }`}
          >
            <span>{locale === 'zh' ? '' : ''}</span>
            <span className="truncate">
              {locale === 'zh' ? '中企投标指南' : locale === 'mn' ? 'Гадаад ААН-ийн заавар' : 'Foreign Bidder Guide'}
            </span>
            {chinaAnalysis && (
              <span className={`hidden xl:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
 activeTab === 'china'
 ? locale === 'zh' ? 'bg-red-800 text-white' : 'bg-indigo-800 text-white'
 : locale === 'zh' ? 'bg-red-100 dark:bg-zinc-800 text-red-800 dark:text-red-300' : 'bg-indigo-100 dark:bg-zinc-800 text-indigo-800 dark:text-indigo-300'
 }`}>
                {locale === 'zh'
                  ? (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? '独立投标' : chinaAnalysis.eligibilityStatus === 'joint_venture_required' ? '需联合体' : '仅限本土')
                  : locale === 'mn'
                  ? (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? 'Шууд' : chinaAnalysis.eligibilityStatus === 'joint_venture_required' ? 'Түншлэл' : 'Дотоод')
                  : (chinaAnalysis.eligibilityStatus === 'direct_allowed' ? 'Direct' : chinaAnalysis.eligibilityStatus === 'joint_venture_required' ? 'JV' : 'Domestic')
                }
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs">
          
          {/* TAB 1: I БҮЛЭГ: ӨГӨГДЛИЙН ХҮСНЭГТ (ТШӨХ) */}
          {activeTab === 'bds' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>Тендерийн шалгуур (PDF-ээс нягтална)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Автоматаар илрүүлсэн заалтуудыг доор харуулна. Албан ёсны PDF-ийн эх заалтаар нягтална уу.
                  </p>
                </div>
                <button
                  onClick={handleCopyStructuredJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold shrink-0 shadow-2xs transition-colors cursor-pointer"
                  title="Бүх бүтцийн өгөгдлийг JSON хэлбэрээр санах ойд хуулах"
                >
                  {copiedStructuredJson ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copiedStructuredJson ? 'JSON хуулагдлаа' : 'Бүтцийн өгөгдлийг хуулах (JSON)'}</span>
                </button>
              </div>

              {/* Highlight Banner: Extracted Items Table */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
                <div className=" bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        ТШЗ PDF-ээс ялгасан бараа, ажлын хүснэгт ({technicalSpecs.sampleItems.length} нэр төрөл)
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                        Тоо хэмжээ, хэмжих нэгж, чанарын техникийн шаардлагууд бүрэн бүтэцчилэгдсэн байна.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('tech')}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  >
                    <span>Хүснэгт үзэх & CSV татах</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* 🎯 Interactive BDS Eligibility Self-Assessment Widget */}
              <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {locale === 'mn' ? 'Шалгуурын үнэлгээ & Нийцлийн тооцоолуур' : locale === 'zh' ? '投标资质自查与匹配评估' : 'BDS Eligibility Self-Assessment'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {locale === 'mn' ? 'Танай байгууллага энэ тендерийн босго шаардлагыг хангаж буй эсэхийг шууд шалгах' : locale === 'zh' ? '立即核对贵公司是否满足本标的资格门槛' : 'Verify if your enterprise meets minimum qualification criteria'}
                      </p>
                    </div>
                  </div>
                  {eligibilityVerdict && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-2xs border self-start sm:self-auto ${
 eligibilityVerdict.status === 'pass'
 ? 'bg-emerald-50 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-zinc-800'
 : 'bg-amber-50 dark:bg-zinc-900 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-zinc-800'
 }`}>
                      {eligibilityVerdict.title}
                    </span>
                  )}
                </div>

                {/* Checklist Section: Required Licenses */}
                {requiredLicensesList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                      <span>1. Шаардагдах тусгай зөвшөөрлийн бэлэн байдал:</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {licenseMatchCount} / {requiredLicensesList.length} хангасан
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {requiredLicensesList.map((lic, idx) => {
                        const isChecked = !!checkedLicenses[lic];
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
 isChecked
 ? 'bg-emerald-50/70 dark:bg-zinc-900 border-emerald-300 dark:border-zinc-800 text-emerald-900 dark:text-emerald-300'
 : 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-600'
 }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => setCheckedLicenses((prev) => ({ ...prev, [lic]: e.target.checked }))}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="font-medium text-pretty leading-tight">{lic}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Turnover Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                      Байгууллагын жилийн борлуулалтын орлого (₮):
                    </label>
                    <input
                      type="text"
                      value={userAnnualTurnover}
                      onChange={(e) => setUserAnnualTurnover(e.target.value)}
                      placeholder={parsedTurnoverReqMnt ? `Босго: ₮${parsedTurnoverReqMnt.toLocaleString()}` : 'Жишээ: 150000000'}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  {parsedTurnoverReqMnt && (
                    <div className="text-xs text-slate-500 dark:text-zinc-400 pb-1">
                      Шаардагдах доод босго: <strong className="text-slate-800 dark:text-zinc-200 font-mono">₮{parsedTurnoverReqMnt.toLocaleString()}</strong>
                      {userTurnoverNum > 0 && (
                        <span className={`ml-2 font-bold ${userTurnoverNum >= parsedTurnoverReqMnt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {userTurnoverNum >= parsedTurnoverReqMnt ? 'Хангаж байна' : 'Хүрэхгүй байна'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Verdict description if available */}
                {eligibilityVerdict && (
                  <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
 eligibilityVerdict.status === 'pass'
 ? 'bg-emerald-50 dark:bg-zinc-900 border-emerald-200 dark:border-zinc-800 text-emerald-800 dark:text-emerald-300'
 : 'bg-amber-50 dark:bg-zinc-900 border-amber-200 dark:border-zinc-800 text-amber-800 dark:text-amber-300'
 }`}>
                    {eligibilityVerdict.desc}
                  </div>
                )}
              </div>

              {/* 1. Тусгай зөвшөөрөл */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>1. Шаардагдах тусгай зөвшөөрөл & Эрхийн бичиг</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-amber-200 dark:border-zinc-800">PDF-ээс нягтална</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {bds.requiredLicenses && bds.requiredLicenses.length > 0 ? (
                    bds.requiredLicenses.map((lic: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-md border border-slate-100 dark:border-zinc-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{lic}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-md border border-slate-100 dark:border-zinc-800 italic">
                      PDF-ээс тусгай зөвшөөрлийн заалт баталгаажуулаагүй байна. Энэ нь зөвшөөрөл шаардахгүй гэсэн дүгнэлт биш.
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Санхүүгийн шалгуур үзүүлэлт */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Санхүүгийн чадавхын босго шаардлага</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px] block">Сүүлийн 1-3 жилийн дундаж борлуулалтын доод орлого:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                      {bds.minAnnualTurnover != null ? formatCurrency(bds.minAnnualTurnover) : (bds.turnoverReq || '—')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">
                      {bds.turnoverReq ? 'Эх баримтын текстээс илрүүлсэн; заалтаар нягтална уу.' : ''}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px] block">Түргэн хөрвөх чадвартай хөрөнгө / Зээлжих боломж:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                      {bds.minLiquidAssets != null ? formatCurrency(bds.minLiquidAssets) : (bds.liquidAssetsReq || '—')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">
                      {bds.liquidAssetsReq ? 'Эх баримтын текстээс илрүүлсэн; заалтаар нягтална уу.' : ''}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px] block">Ижил төстэй ажил гүйцэтгэсэн гэрээний доод босго:</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                      {bds.similarContractThreshold != null ? formatCurrency(bds.similarContractThreshold) : (bds.similarExpReq || '—')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">
                      {bds.similarExpReq ? 'Эх баримтын текстээс илрүүлсэн; заалтаар нягтална уу.' : ''}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px] block">Бүрдүүлэх материалын шалгуур:</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 mt-1 block">PDF-ээс баталгаажаагүй</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">ТШББ-ийн шаардлагуудыг эх баримтаас шалгана уу.</span>
                  </div>
                </div>
              </div>

              {/* 3. Түлхүүр боловсон хүчин */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>3. Түлхүүр боловсон хүчний шаардлага</span>
                  </h4>
                  {bds.keyPersonnel && bds.keyPersonnel.length > 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-blue-200 dark:border-zinc-800">
                      Нийт {bds.keyPersonnel.reduce((acc: number, p: any) => acc + (p.count || 1), 0)} мэргэжилтэн
                    </span>
                  )}
                </div>

                {bds.keyPersonnel && bds.keyPersonnel.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {bds.keyPersonnel.map((p: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50/70 dark:bg-zinc-800/60 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{p.role}</div>
                          <div className="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">{p.qualification || (p.experience ? `${p.experience} туршлагатай` : '')}</div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-blue-50 dark:bg-zinc-900 border border-blue-200 dark:border-zinc-800 font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                          {p.count} хүн
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-md border border-slate-100 dark:border-zinc-800 italic">
                    PDF-ээс түлхүүр ажилтны шаардлага баталгаажаагүй байна. Энэ нь шаардлага байхгүй гэсэн үг биш.
                  </div>
                )}
              </div>

              {/* 4. Машин механизм, техник тоног төхөөрөмж */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>4. Шаардагдах машин механизм, тоног төхөөрөмж</span>
                </h4>
                {bds.machinery && bds.machinery.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {bds.machinery.map((m: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-md border border-slate-100 dark:border-zinc-800">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-md border border-slate-100 dark:border-zinc-800 italic">
                    PDF-ээс техник, тоног төхөөрөмжийн шаардлага баталгаажаагүй байна. Эх баримтыг шалгана уу.
                  </div>
                )}
              </div>

              {/* 5. Хуулийн ерөнхий нөхцөлүүд */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>5. Хугацаа ба Үнэлгээний жин</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Тендер хүчинтэй байх:</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-1 block">{bds.validityDays != null ? `${bds.validityDays} хоног` : '—'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Тодруулга авах хугацаа:</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-1 block">{bds.clarificationDays != null ? `Нээхээс ${bds.clarificationDays} хоногийн өмнө` : '—'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Үнийн саналын жин:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 mt-1 block">{bds.evaluationCriteria?.priceWeight != null ? `${bds.evaluationCriteria.priceWeight}%` : '—'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Чанарын үнэлгээний жин:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 mt-1 block">{bds.evaluationCriteria?.qualityWeight != null ? `${bds.evaluationCriteria.qualityWeight}%` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & ТЭЗҮ */}
          {activeTab === 'tech' && (
            <div className="space-y-7">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Техникийн тодорхойлолт, ТЭЗҮ ба Нийлүүлэлтийн нөхцөл</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Автоматаар илрүүлсэн мөр, нөхцөлийг эх PDF-тэй тулган баталгаажуулна уу.
                </p>
              </div>

              {/* 1. БҮТЦЭД ОРУУЛСАН БАРАА / АЖЛЫН ҮЗҮҮЛЭЛТИЙН КАРТУУД */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (() => {
                const query = itemSearchQuery.toLowerCase().trim();
                const filtered = query
                  ? technicalSpecs.sampleItems.filter((i: any) => 
                      (i.name && i.name.toLowerCase().includes(query)) ||
                      (i.spec && i.spec.toLowerCase().includes(query)) ||
                      (i.unit && i.unit.toLowerCase().includes(query))
                    )
                  : technicalSpecs.sampleItems;

                return (
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                    <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Нийлүүлэх бараа, гүйцэтгэх ажлын нарийвчилсан үзүүлэлт ({technicalSpecs.sampleItems.length})</span>
                        </span>
                        {(technicalSpecs.isRealExtracted || technicalSpecs.sampleItems?.some((i: any) => i.isRealExtracted)) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-zinc-800">
                            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>PDF-ээс ялгасан бодит өгөгдөл ({technicalSpecs.sampleItems.length})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            <span>Үндсэн худалдан авах чиглэл</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <input
                          type="text"
                          value={itemSearchQuery}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                          placeholder="Бараа, үзүүлэлтээс хайх..."
                          className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-40"
                        />
                        <button
                          onClick={() => setIsEstimatorMode(!isEstimatorMode)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
 isEstimatorMode
 ? 'bg-slate-900 dark:bg-zinc-700 text-white border-indigo-600 font-bold'
 : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-700'
 }`}
                          title="Үнийн санал бодох горим"
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          <span>{isEstimatorMode ? 'Тооцоолуур идэвхтэй' : 'Үнийн санал бодох'}</span>
                        </button>
                        <button
                          onClick={handleExportItemsCsv}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title="Барааны жагсаалтыг Excel / CSV форматаар татаж авах"
                        >
                          <Download className="h-3 w-3" />
                          <span>CSV Татах</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Budget Distribute Bar in Estimator Mode */}
                    {isEstimatorMode && (
                      <div className="p-3 bg-white dark:bg-zinc-900 border-b border-indigo-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1 text-[11px]">
                            <span>Төсвөөр жигд хуваарилах:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAutoDistributeBudget(0.90)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
                            >
                              -10% (₮{Math.round(budgetMnt * 0.9).toLocaleString()})
                            </button>
                            <button
                              onClick={() => handleAutoDistributeBudget(0.95)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
                            >
                              -5% (₮{Math.round(budgetMnt * 0.95).toLocaleString()})
                            </button>
                            <button
                              onClick={() => handleAutoDistributeBudget(1.0)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
                            >
                              100% (₮{budgetMnt.toLocaleString()})
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={handleResetPrices}
                          className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Цэвэрлэх</span>
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto bg-white dark:bg-zinc-900">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/90 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">№</th>
                            <th className="py-2.5 px-3 min-w-[200px]">Бараа / Ажлын нэр</th>
                            <th className="py-2.5 px-3 w-32 text-center">Тоо хэмжээ & Нэгж</th>
                            {isEstimatorMode && (
                              <>
                                <th className="py-2.5 px-3 w-36 text-right">Нэгж үнэ (₮)</th>
                                <th className="py-2.5 px-3 w-32 text-right">Нийт дүн (₮)</th>
                              </>
                            )}
                            <th className="py-2.5 px-4 min-w-[300px]">Техникийн тодорхойлолт & Шаардлага</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={isEstimatorMode ? 6 : 4} className="py-8 text-center text-slate-500 dark:text-zinc-400 italic">
                                &quot;{itemSearchQuery}&quot; хайлтад тохирох бараа, үзүүлэлт олдсонгүй.
                              </td>
                            </tr>
                          ) : (
                            filtered.map((item: any, idx: number) => {
                              const rawQty = parseFloat(String(item.quantity || item.qty || 1).replace(/[^\d.]/g, '')) || 1;
                              const unitPrice = itemPrices[idx] || 0;
                              const lineTotal = rawQty * unitPrice;

                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 dark:text-zinc-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                    {item.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-800 inline-block shadow-2xs">
                                      {item.quantity || item.qty || 1} {item.unit || 'ш'}
                                    </span>
                                  </td>
                                  {isEstimatorMode && (
                                    <>
                                      <td className="py-2.5 px-3">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-mono text-[10px]">₮</span>
                                          <input
                                            type="text"
                                            value={itemPrices[idx] != null && itemPrices[idx] > 0 ? itemPrices[idx].toLocaleString() : ''}
                                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-5 pr-2 py-1 text-xs bg-white dark:bg-zinc-950 border border-indigo-200 dark:border-zinc-800 rounded font-mono font-bold text-right text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                                        ₮ {lineTotal.toLocaleString()}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-2.5 px-4 text-slate-600 dark:text-zinc-300 leading-relaxed text-pretty text-[11px] sm:text-xs">
                                    <SpecCell text={item.spec || item.specs} />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Estimator Mode Bottom Summary Bar */}
                    {isEstimatorMode && (
                      <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block ">Нийт санал болгох дүн:</span>
                            <span className="text-base sm:text-lg font-semibold font-mono text-emerald-400">
                              ₮ {totalEstimatedBid.toLocaleString()}
                            </span>
                          </div>
                          {budgetMnt > 0 && totalEstimatedBid > 0 && (
                            <div className="border-l border-slate-700 pl-4">
                              <span className="text-[10px] font-bold text-slate-400 block ">Төсөвтэй харьцуулахад:</span>
                              <span className={`text-xs sm:text-sm font-bold font-mono ${budgetDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {budgetDiffPercent > 0 ? '+' : ''}{budgetDiffPercent.toFixed(1)}% ({budgetDiff <= 0 ? 'Хэмнэлттэй' : 'Төсөв давсан'})
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleExportItemsCsv}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 ml-auto"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Үнийн санал CSV татах</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 1. Хэрэв хүснэгт задлагдаагүй бол PDF үзэх уриалга карт */}
              {(!technicalSpecs.sampleItems || technicalSpecs.sampleItems.length === 0) && (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-5 bg-white dark:bg-zinc-900 text-center space-y-3 shadow-2xs">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-zinc-900 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Бараа, ажлын хүснэгт эх ТШББ баримтад хавсрагдсан
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                      Энэ тендерийн нарийвчилсан тоо хэмжээ, тамгатай хүснэгт болон техникийн даалгаврыг албан ёсны ТШЗ PDF баримтаас шууд унших боломжтой.
                    </p>
                  </div>
                  {storedPrimaryPdf && (
                    <button
                      onClick={() => {
                        setPdfReaderDoc({
                          url: storedPrimaryPdf.downloadUrl || storedPrimaryPdf.url,
                          name: storedPrimaryPdf.name || 'ТШББ.pdf'
                        });
                        setIsPdfReaderOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-zinc-700 hover:bg-slate-800 dark:hover:bg-zinc-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>ТШЗ PDF Уншигчаар үзэх</span>
                    </button>
                  )}
                </div>
              )}

              {/* 1b. БАРАА НИЙЛҮҮЛЭЛТИЙН АЛБАН ЁСНЫ ХУВААРЬ (DELIVERY SCHEDULE) */}
              {technicalSpecs.deliverySchedule && technicalSpecs.deliverySchedule.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                  <div className="bg-slate-50 dark:bg-zinc-800/70 px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 ">
                        Бараа нийлүүлэлтийн албан ёсны хуваарь & Тоо хэмжээ
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-zinc-800">
                        <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>ТШББ-ээс ялгасан ({technicalSpecs.deliverySchedule.length} нэр төрөл)</span>
                      </span>
                      <button
                        onClick={handleExportDeliveryCsv}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                        title="Нийлүүлэлтийн хуваарийг CSV форматаар татаж авах"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV Татах</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800 text-xs">
                      <thead className="bg-slate-50/80 dark:bg-zinc-800/80 font-bold text-slate-600 dark:text-zinc-300">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">№</th>
                          <th className="py-2.5 px-4 text-left">Барааны нэр</th>
                          <th className="py-2.5 px-4 text-right">Тоо хэмжээ</th>
                          <th className="py-2.5 px-3 text-center">Хэмжих нэгж</th>
                          <th className="py-2.5 px-4 text-left">Хүргэх эцсийн цэг / Газар</th>
                          <th className="py-2.5 px-4 text-left">Нийлүүлэх хугацаа</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {technicalSpecs.deliverySchedule.map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/50">
                            <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-zinc-500 font-bold">{row.number || rIdx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                              {Number(row.quantity).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-600 dark:text-zinc-400">{row.unit}</td>
                            <td className="py-3 px-4 text-slate-700 dark:text-zinc-300">{row.location}</td>
                            <td className="py-3 px-4 font-semibold text-emerald-800 dark:text-emerald-400">{row.deadline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 1c. ГЭРЭЭНИЙ ТУСГАЙ НӨХЦӨЛ (ГТН / SPECIAL CONDITIONS OF CONTRACT) */}
              {technicalSpecs.specialConditions && technicalSpecs.specialConditions.length > 0 ? (
                <div className="border border-blue-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs space-y-0">
                  <div className=" bg-white dark:bg-zinc-800 px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-blue-950 dark:text-white ">
                        Гэрээний тусгай нөхцөл (ТШББ V Бүлэг — Албан ёсны заалтууд)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-zinc-900 text-blue-800 dark:text-blue-300">
                      {technicalSpecs.specialConditions.length} заалт
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {technicalSpecs.specialConditions.map((sc: any, scIdx: number) => (
                      <div key={scIdx} className="p-3.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="shrink-0 sm:w-28">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-900 dark:bg-zinc-800 text-white font-mono text-[11px] font-bold">
                            {sc.clause}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{sc.title}</div>
                          <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed text-pretty">{sc.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 flex items-start gap-3 text-xs text-slate-600 dark:text-zinc-300">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Гэрээний нөхцөл ба зохицуулалт:</span>
                    <span>
                      {technicalSpecs.sccStandardNotice || 'Захиалагч ТШББ-д гэрээний тусгай нөхцөлийг жишиг загвараар баталсан бөгөөд хуулийн дагуу Гэрээний ерөнхий нөхцөл (ГЕН), ТӨХ болон нийлүүлэлтийн хуваарийн дагуу хэрэгжинэ.'}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Delivery Conditions & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 text-xs block mb-1">Нийлүүлэх / Гүйцэтгэх газар:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{technicalSpecs.deliveryLocation || '—'}</span>
                </div>
                <div className="p-4 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 text-xs block mb-1">Нийлүүлэлтийн хугацаа:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {technicalSpecs.deliveryPeriodText || (technicalSpecs.deliveryPeriodDays != null ? `Гэрээ байгуулснаас хойш ${technicalSpecs.deliveryPeriodDays} хоног` : '—')}
                  </span>
                </div>
                <div className="p-4 rounded-md bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 text-xs block mb-1">Баталгаат хугацаа:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {technicalSpecs.warrantyText || (technicalSpecs.warrantyMonths != null ? `${technicalSpecs.warrantyMonths} сар` : '—')}
                  </span>
                </div>
              </div>

              {/* 3. Төлбөрийн нөхцөл & Алдангийн заалт */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Төлбөрийн нөхцөл ба Алдангийн заалт</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Төлбөр төлөх нөхцөл:</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-1 block">
                      {technicalSpecs.paymentTerms?.progressPayment || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">PDF-ийн заалттай тулгана уу.</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Чанарын барьцаа:</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-1 block">
                      {technicalSpecs.paymentTerms?.retentionBondPct != null
                        ? `${technicalSpecs.paymentTerms.retentionBondPct}%${technicalSpecs.paymentTerms.retentionPeriodMonths != null ? ` (${technicalSpecs.paymentTerms.retentionPeriodMonths} сар)` : ''}`
                        : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">PDF-ийн заалтаар шалгана уу.</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Алданги, хариуцлага:</span>
                    <span className="font-bold text-rose-700 dark:text-rose-400 mt-1 block">
                      {technicalSpecs.penaltyText || technicalSpecs.penaltyClause?.dailyRate || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">Албан ёсны заалтаар шалгана уу.</span>
                  </div>
                </div>
              </div>

              {/* 4. Standards */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">Чанарын шаардлага ба стандартууд</h4>
                <div className="space-y-2 pt-1">
                  {technicalSpecs.standards.map((std: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{std}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. ШААРДАГДАХ БАРИМТ БИЧГИЙН ХЯНАЛТЫН ХУУДАС (CHECKLIST) */}
              {technicalSpecs.submissionChecklist && technicalSpecs.submissionChecklist.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-950 dark:text-white flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Тендерт оролцоход бүрдүүлэх баримт бичгийн хяналтын хуудас (Checklist)</span>
                      </h4>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
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
 ? 'bg-emerald-50/80 dark:bg-zinc-900 border-emerald-300 dark:border-zinc-800 text-emerald-950 dark:text-emerald-200'
 : 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 text-slate-800 dark:text-zinc-200'
 }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors ${
 isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
 }`}>
                              {isChecked && <Check className="h-3 w-3" />}
                            </div>
                            <div>
                              <span className={`text-xs font-bold block ${isChecked ? 'line-through text-emerald-800 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                {item.title}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                                {item.desc}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 shrink-0">
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
                <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-5 bg-white dark:bg-zinc-900 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 " />
                      <h4 className="text-xs font-bold text-blue-950 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Албан ёсны ТШББ PDF-ээс автоматаар задлан шинжилсэн бодит үзүүлэлтүүд</span>
                      </h4>
                    </div>
                    {technicalSpecs.pdfPageCount && (
                      <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-zinc-900 px-2.5 py-0.5 rounded border border-blue-200 dark:border-zinc-800 self-start sm:self-auto font-mono">
                        Нийт {technicalSpecs.pdfPageCount} хуудас баримт бичиг
                      </span>
                    )}
                  </div>

                  {/* Extracted Qualifications if present */}
                  {technicalSpecs.extractedQualifications && technicalSpecs.extractedQualifications.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">
                        Оролцогчийн чадавхын тухайлсан бодит шаардлагууд (ТШӨХ-ээс):
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {technicalSpecs.extractedQualifications.map((q: string, qIdx: number) => (
                          <div key={qIdx} className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Extracted Specifications block */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">
                        III Бүлэг: Бараа материалын техникийн нарийвчилсан үзүүлэлт & Ажлын даалгавар:
                      </span>
                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Энэхүү тендерийн ТШББ PDF дээр заасан техникийн нарийвчилсан үзүүлэлт, бараа материалын төрөл, хэмжээ, стандартуудыг ойлгомжтой нэгтгэн дүгнэж өгнө үү.',
                          'spec-table',
                          'Техникийн нарийвчилсан үзүүлэлтийн нэгтгэл'
                        )}
                        disabled={aiAnalyzing}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {aiAnalyzingTarget === 'spec-table' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        <span>{aiAnalyzingTarget === 'spec-table' ? 'AI хүснэгтлэж байна...' : 'AI-аар хүснэгтлэх'}</span>
                      </button>
                    </div>
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-md font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap selection:bg-blue-500 selection:text-white border border-slate-800">
                      {technicalSpecs.realSpecsText || technicalSpecs.extractedSpecs?.rawSpecText}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Official Documents & Tender Specs */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-md p-4 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Албан ёсны баримт бичгүүд & ТШББ (PDF / Excel)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      tender.gov.mn төрийн худалдан авах ажиллагааны албан ёсны эх баримт бичгүүдийг шууд татах боломжтой.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {pdfDocuments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-amber-700 bg-white dark:bg-zinc-900 p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-950 dark:text-amber-200">Албан баримтын файл манай системд хараахан алга</p>
                          <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-300/80">
                            Тиймээс энэ хуудсанд PDF-ийн хураангуй болон уншсан текст харагдахгүй. Албан эх дээрх баримтыг нээгээд шалгана уу.
                          </p>
                          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-950 dark:text-amber-300 underline underline-offset-2">
                            Тендерийн албан хуудсыг нээх <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : pdfDocuments.map((doc: any, idx: number) => {
                    const isExpanded = !!expandedDocSummaries[doc.id || idx];
                    const isImageAttachment = /^(?:png|jpe?g)$/i.test(doc.fileExtention || '') || /\.(?:png|jpe?g)$/i.test(doc.name || '');
                    const isStoredCdn = Boolean(doc.isStored || doc.downloadUrl?.includes('supabase.co') || doc.url?.includes('supabase.co'));
                    const downloadHref = isStoredCdn
                      ? (doc.downloadUrl || doc.url)
                      : doc.fileId
                      ? `/api/download?fileId=${encodeURIComponent(doc.fileId)}&name=${encodeURIComponent(doc.name || 'tender.pdf')}${isImageAttachment ? '&allowImage=1' : ''}`
                      : (doc.downloadUrl || doc.url || '#');
                    const extractionLabel = ({
                      text_extracted: `${doc.isScannedOcr ? 'OCR уншсан' : 'Текст уншсан'}${doc.totalPageCount ? ` · ${doc.extractedPageCount || 0}/${doc.totalPageCount} хуудас` : ''}`,
                      partial: `${doc.isScannedOcr ? 'OCR хэсэгчлэн уншсан' : 'Хэсэгчлэн уншсан'}${doc.totalPageCount ? ` · ${doc.extractedPageCount || 0}/${doc.totalPageCount} хуудас` : ''}`,
                      ocr_partial: doc.ocrSampleCount
                        ? `OCR-ийн түүвэр · ${doc.ocrSampleCount} зураг; эх PDF хуудас тодорхойгүй`
                        : `OCR хэсэгчлэн уншсан${doc.totalPageCount ? ` · ${doc.extractedPageCount || 0}/${doc.totalPageCount} хуудас` : ''}`,
                      scanned_not_processed: doc.extractedPageCount
                        ? `Зарим текст уншсан · скан хэсгийн OCR хийгдээгүй${doc.totalPageCount ? ` · ${doc.extractedPageCount}/${doc.totalPageCount} хуудас` : ''}`
                        : 'Скан PDF · OCR ажиллаагүй',
                      source_error: 'Эх PDF татаж чадсангүй',
                      not_extracted: 'Текст хараахан боловсруулаагүй',
                    } as Record<string, string>)[String(doc.extractionStatus || 'not_extracted')] || 'Текст хараахан боловсруулаагүй';

                    return (
                      <div key={idx} className="rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/60 hover:bg-slate-100/80 dark:hover:bg-zinc-800/90 transition-colors overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <FileText className="h-5 w-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">{doc.name}</span>
                                {isStoredCdn && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-zinc-800">
                                    CDN Шууд татах
                                  </span>
                                )}
                                {doc.source === 'manual_upload' && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 dark:bg-zinc-900 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-zinc-800">
                                    Гараар оруулсан
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-600">
                                  {doc.isScannedOcr && <Sparkles className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />}
                                  <span>{extractionLabel}</span>
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                                {doc.category || 'Баримт бичиг'} • {doc.type} {doc.date ? `• ${doc.date}` : ''}{doc.ocrModel ? ` • OCR: ${doc.ocrModel}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                            {(doc.downloadUrl || doc.url) && (
                              <button
                                onClick={() => {
                                  setPdfReaderDoc({
                                    url: doc.downloadUrl || doc.url,
                                    name: doc.name || 'Баримт бичиг.pdf'
                                  });
                                  setIsPdfReaderOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-purple-50 dark:bg-zinc-900 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors border border-purple-200 dark:border-zinc-800 shadow-2xs cursor-pointer"
                                title="PDF баримтыг цонхонд шууд бүтнээр нь унших"
                              >
                                <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                <span>PDF Унших</span>
                              </button>
                            )}

                            <button
                              onClick={() => setPreviewModalDoc({
                                name: doc.name,
                                text: doc.extractedSummary || `Энэ баримтаас уншигдах текст олдоогүй. Төлөв: ${extractionLabel}. Энэ нь PDF-д шаардлага байхгүй гэсэн үг биш.`
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700 transition-colors border border-blue-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                              title="Баримтын текстийг цонхонд шууд бүтнээр нь унших"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Текст унших</span>
                            </button>

                            <button
                              onClick={() => toggleDocSummary(doc.id || idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                            >
                              <span>{isExpanded ? 'Хураах' : doc.extractedSummary ? 'Уншсан текст' : 'Боловсруулалтын төлөв'}</span>
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
 ? 'bg-slate-100 text-slate-900 border-slate-400 ring-2 ring-slate-400/50 cursor-wait'
 : 'bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-200 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900/60 shadow-2xs'
 }`}
                            >
                              {aiAnalyzingTarget === `doc-${doc.id || idx}` ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 text-slate-700 animate-spin" />
                                  <span>AI шинжилж байна...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 text-slate-600 dark:text-zinc-400" />
                                  <span>AI-аар задлах</span>
                                </>
                              )}
                            </button>

                            {isStoredCdn || doc.fileId || doc.source === 'manual_upload' ? (
                              <a
                                href={downloadHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={doc.name || 'tender.pdf'}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-2xs ${
 isStoredCdn
 ? 'bg-emerald-600 text-white hover:bg-emerald-700'
 : 'bg-blue-600 text-white hover:bg-blue-700'
 }`}
                                title={isStoredCdn ? 'Supabase CDN-ээс шууд татах' : doc.source === 'manual_upload' ? 'Оруулсан PDF-г татах' : 'Албан ёсны эх баримтыг шууд татах'}
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>{isStoredCdn ? 'ТШЗ PDF татах' : doc.source === 'manual_upload' ? 'PDF татах' : 'Эх файлыг татах'}</span>
                              </a>
                            ) : (
                              <a
                                href={downloadHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors shadow-2xs"
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
                          <div className="px-3.5 pb-2.5 pt-1 text-[11px] text-amber-800 dark:text-amber-200 font-semibold flex items-center justify-between gap-2 bg-amber-50/70 dark:bg-zinc-900 border-t border-amber-200 dark:border-zinc-800 ">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                              <span>Дээр байрлах AI Шинжээчийн самбарт тайлан боловсруулж байна...</span>
                            </span>
                            <button
                              onClick={() => aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                              className="text-amber-900 dark:text-amber-300 underline font-bold cursor-pointer hover:text-amber-950"
                            >
                              Дээр очих 
                            </button>
                          </div>
                        )}

                        {aiMessages.length > 0 && aiAnalysisTopic?.includes(doc.name) && (
                          <div className="px-3.5 pb-2.5 pt-1 flex items-center justify-between gap-2 text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold bg-emerald-50 dark:bg-zinc-900 border-t border-emerald-200 dark:border-zinc-800">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Энэ баримтыг AI амжилттай шинжиллээ.</span>
                            </span>
                            <button
                              onClick={() => aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="text-blue-700 dark:text-blue-300 underline font-bold cursor-pointer hover:text-blue-900"
                            >
                              Дээр үзэх 
                            </button>
                          </div>
                        )}

                        {/* Inline Extracted Summary Preview */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-900 text-slate-100 font-sans text-xs leading-relaxed border-t border-slate-800 select-text">
                            {doc.extractedSummary ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                                  <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>{doc.isScannedOcr ? 'OCR-ийн үр дүн · эх PDF-тэй тулган баталгаажуулна уу' : 'PDF-ээс шууд уншсан текст · шаардлагыг эх заалтаар шалгана уу'}</span>
                                  </span>
                                  <button
                                    onClick={() => handleRunAiAnalysis(`"${doc.name}" баримтын энэхүү агуулгаас техникийн гол шаардлага болон нийлүүлэлтийн нөхцөлийг тайлбарлана уу:\n\n${doc.extractedSummary}`, `doc-${doc.id || idx}`, `Дүн шинжилгээ: ${doc.name}`)}
                                    className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1 cursor-pointer"
                                  >
                                    AI-аар лавшруулан асуух 
                                  </button>
                                </div>
                                <div className="text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto pr-2">
                                  {doc.extractedSummary}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 font-sans text-xs">
                                <div className="text-blue-400 font-semibold flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-blue-400" />
                                  <span>{extractionLabel}</span>
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed font-normal">
                                  <span className="text-white font-medium">{doc.name}</span> баримтаас одоогоор харуулахуйц текст олдоогүй. Энэ нь PDF-д мэдээлэл байхгүй гэсэн үг биш; татаж аваад шалгана уу.
                                </p>
                                <div className="pt-1.5 flex items-center gap-2">
                                  <a
                                    href={downloadHref}
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span>Шалгаруулалтын Үр Дүн & Оролцогчдын Мэдээлэл</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Үнэлгээний хорооны албан ёсны шийдвэр, оролцогчдын санал болгосон үнийн санал болон татгалзсан шалтгаанууд.
                </p>
              </div>

              {/* Real Sub-Tenders Table (Тендерийн багцууд) */}
              {subTenders && subTenders.length > 0 && (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Тендерийн багцууд & Албан ёсны төлөв ({subTenders.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      Эх сурвалж: tender.gov.mn
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">№</th>
                          <th className="py-2.5 px-3">Багцын нэр</th>
                          <th className="py-2.5 px-3">Багцын код</th>
                          <th className="py-2.5 px-3 text-right">Батлагдсан төсөв</th>
                          <th className="py-2.5 px-3 text-center">Төлөв</th>
                          <th className="py-2.5 px-3 text-center">Шийдвэрийн огноо</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {subTenders.map((st: any, idx: number) => {
                          const isStFailed = st.wfmStatusCode === 'TENDER_FAILED' || (st.wfmStatusName || '').includes('Амжилтгүй');
                          const isStSuccess = st.wfmStatusCode === 'DISTINGUISHED_STATUS' || (st.wfmStatusName || '').includes('Шалгарсан');
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors ${isStFailed ? 'bg-rose-50/20 dark:bg-zinc-900' : isStSuccess ? 'bg-emerald-50/20 dark:bg-zinc-900' : ''}`}>
                              <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-zinc-500 font-medium">{idx + 1}</td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{st.subTenderName || 'Багц'}</td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-zinc-400">{st.subTenderCode || '—'}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                                {formatCurrency(st.totalBudget)}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
 isStFailed
 ? 'bg-rose-100 dark:bg-zinc-900 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-zinc-800'
 : isStSuccess
 ? 'bg-emerald-100 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-zinc-800'
 : 'bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-800'
 }`}>
                                  {st.wfmStatusName || 'Бүртгэлтэй'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
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
                        <div className="p-4 sm:p-5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="h-11 w-11 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xl">
                              <Trophy className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-300 ">
                                  Шалгарсан гүйцэтгэгч / Нийлүүлэгч
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  Шалгарсан
                                </span>
                              </div>
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                                {results.winner.supplierName} {results.winner.registerNumber ? `(РД: ${results.winner.registerNumber})` : ''}
                              </h3>
                              {results.winner.commentText && (
                                <p className="text-xs text-emerald-900 dark:text-emerald-300 mt-1 italic leading-relaxed">
                                  Үнэлгээний хорооны дүгнэлт: "{results.winner.commentText}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200 dark:border-zinc-800">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block">Гэрээ байгуулах үнэ</span>
                            <span className="text-lg sm:text-xl font-semibold font-mono text-emerald-700 dark:text-emerald-400 block">
                              {formatCurrency(results.winner.discountedAmount || results.winner.openedBidderPrice)}
                            </span>
                            {results.winner.fileId && (
                              <a
                                href={`/api/download?fileId=${results.winner.fileId}&name=${encodeURIComponent(results.winner.fileName || 'winner_decision.pdf')}`}
                                download={results.winner.fileName || 'winner_decision.pdf'}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline mt-1"
                              >
                                <Download className="h-3 w-3" />
                                <span>Шийдвэрийн албан бичиг (PDF)</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bidders Table */}
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                        <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/70 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Тендерт оролцсон бүх оролцогчдын санал ба Үнэлгээний хорооны шийдвэр ({results.bidders.length})</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            Албан ёсны эх сурвалж: tender.gov.mn
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold text-[10px]">
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
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                              {results.bidders.map((bidder: any, bIdx: number) => {
                                const isWinner = bidder.wfmStatusCode === 'DISTINGUISHED_STATUS' || bidder.wfmStatusName === 'Шалгарсан';
                                return (
                                  <tr key={bIdx} className={`hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors ${isWinner ? 'bg-emerald-50/40 dark:bg-zinc-900' : ''}`}>
                                    <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-zinc-500 font-medium">{bIdx + 1}</td>
                                    <td className="py-3 px-3">
                                      <span className="font-bold text-slate-900 dark:text-white block">{bidder.supplierName}</span>
                                      {bidder.registerNumber && (
                                        <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">РД: {bidder.registerNumber}</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-zinc-300 tabular-nums">
                                      {formatCurrency(bidder.openedBidderPrice)}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                                      {formatCurrency(bidder.discountedAmount || bidder.openedBidderPrice)}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
 isWinner
 ? 'bg-emerald-100 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-zinc-800'
 : 'bg-rose-50 dark:bg-zinc-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-zinc-800'
 }`}>
                                        {bidder.wfmStatusName}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 max-w-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                                      {bidder.commentText || '—'}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      {bidder.fileId ? (
                                        <a
                                          href={`/api/download?fileId=${bidder.fileId}&name=${encodeURIComponent(bidder.fileName || 'evaluation_decision.pdf')}`}
                                          download={bidder.fileName || 'evaluation_decision.pdf'}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-zinc-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md border border-blue-200 dark:border-zinc-800 transition-colors shadow-2xs"
                                          title={bidder.fileName || 'Албан бичиг шууд татах'}
                                        >
                                          <Download className="h-3 w-3" />
                                          <span>PDF</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-300 dark:text-zinc-600">—</span>
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
                    <div className=" bg-slate-50 dark:bg-zinc-900 border border-slate-300/80 dark:border-zinc-800 rounded-md p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                          <AlertTriangle className="h-5 w-5 text-rose-500" />
                          <span>ТЕНДЕР ШАЛГАРУУЛАЛТ АМЖИЛТГҮЙ БОЛСОН</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-zinc-900 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-zinc-800">
                          {tender.docStatusName || 'Амжилтгүй болсон'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                        Төрийн худалдан авах ажиллагааны tender.gov.mn албан ёсны системийн мэдээллээр энэхүү тендерийн сонгон шалгаруулалт (эсвэл багцууд) хүчингүй болсон буюу амжилтгүй болсон төлөвт шилжсэн байна.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Батлагдсан төсөв</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{formatCurrency(tender.totalBudget)}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Сонгон шалгаруулах арга</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{tender.ruleName || 'Нээлттэй'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Санхүүжилтийн эх үүсвэр</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{tender.fundName || 'Төсөв'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Шалгаруулалтын төлөв</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5 block font-mono">
                            Амжилтгүй болсон
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <a
                          href={publicLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg transition-colors shadow-2xs"
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
 ? 'bg-slate-100 text-slate-900 border-slate-400 ring-2 ring-slate-400/50'
 : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-2xs'
 }`}
                        >
                          {aiAnalyzingTarget === 'results-ai' ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 text-slate-700 animate-spin" />
                              <span>AI шинжилж байна...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
                              <span>AI: Амжилтгүй болсон шалтгаан & дүгнэлт</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className=" bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/60 rounded-md p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-slate-950 dark:text-zinc-200 text-sm">
                          <Trophy className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
                          <span>ШАЛГАРУУЛАЛТЫН ҮР ДҮН НИЙТЛЭГДСЭН</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-zinc-300 border border-slate-300 dark:border-zinc-800">
                          {tender.docStatusName || 'Үр дүн гарсан'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                        Энэхүү тендер нь шалгаруулалтын бүх үе шатыг дуусгаж, Үнэлгээний хорооны албан ёсны шийдвэр (шалгарсан оролцогч, татгалзсан шалтгаан, үнийн саналын харьцуулалт) tender.gov.mn төрийн худалдан авах ажиллагааны цахим систем дээр нийтлэгдсэн байна.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Батлагдсан төсөв</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{formatCurrency(tender.totalBudget)}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Сонгон шалгаруулах арга</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{tender.ruleName || 'Нээлттэй'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Санхүүжилтийн эх үүсвэр</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{tender.fundName || 'Төсөв'}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Дууссан / Нээсэн огноо</span>
                          <span className="font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">
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
 : 'bg-white dark:bg-zinc-800 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-zinc-700 shadow-2xs'
 }`}
                        >
                          {aiAnalyzingTarget === 'results-ai' ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 text-amber-700 animate-spin" />
                              <span>AI шинжилж байна...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              <span>AI Шинжээчээс үр дүнгийн талаар асуух</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-md p-8 text-center space-y-3">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Шалгаруулалт одоогоор идэвхтэй явагдаж байна</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                    Тендерийн материалыг хүлээн авч дууссаны дараа Үнэлгээний хорооны нээлт хийгдэж, оролцогчдын үнийн санал болон шалгарсан эсэх үр дүн албан ёсоор нийтлэгдэнэ.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <a
                      href={supplierLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md transition-colors shadow-2xs"
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Түүхэн Холбоотой Тендерүүд ба Өмнөх Оны Харьцуулалт</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {tender.budgetEntityName} байгууллагын өмнөх онд зарласан тендерүүд болон салбарын зах зээлийн үнийн харьцуулалт.
                </p>
              </div>

              {/* Related by Entity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                  <span>Тус захиалагчийн бусад тендерүүд ({(relatedByEntity || []).length})</span>
                </h4>

                {(relatedByEntity || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(relatedByEntity || []).map((r: any) => (
                      <div
                        key={r.invitationId}
                        className="p-3.5 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex flex-col justify-between space-y-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1 font-mono">
                            <span>{r.tenderCode}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                              {r.docStatusName}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {r.tenderName}
                          </h5>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {formatCurrency(r.totalBudget)}
                          </span>
                          <Link
                            href={`/tender/${r.invitationId}`}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-xs"
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
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Салбарын ижил төстэй & Зөвлөмж болгох тендерүүд ({(similarTenders || []).length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    Ухаалаг семантик тохирол
                  </span>
                </div>

                {(similarTenders || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(similarTenders || []).map((s: any) => (
                      <div key={s.invitationId} className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-subtle transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1.5 font-mono">
                            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[10px] font-semibold">{s.tenderCode}</span>
                            <span className="text-slate-400 dark:text-zinc-500">{s.publishDate?.substring(0, 10)}</span>
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {s.tenderName}
                          </h5>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {s.matchReason && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-zinc-800">
                                <Sparkles className="h-2.5 w-2.5" />
                                {s.matchReason}
                              </span>
                            )}
                            {s.budgetEntityName && (
                              <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[200px] inline-flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{s.budgetEntityName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block font-sans">Төсөвт өртөг</span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(s.totalBudget)}
                            </span>
                          </div>
                          <Link
                            href={`/tender/${s.invitationId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-zinc-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors shadow-2xs"
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

          {/* TAB 5: Гадаад ААН / 中企投标指南 (Foreign / China Bidder Guide Dossier) */}
          {activeTab === 'china' && (
            <div className="space-y-6">
              {/* 1. Header & Hero Eligibility Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-xl">{locale === 'zh' ? '' : ''}</span>
                    <span>
                      {locale === 'zh'
                        ? '中国企业与中资机构投标决策指南'
                        : locale === 'mn'
                        ? 'Гадаадын болон Хятадын ААН-ийн тендерт оролцох заавар'
                        : 'Foreign & Cross-Border Bidder Eligibility Dossier'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {locale === 'zh'
                      ? '根据《蒙古国国家采购法》(ТХААХ)及官方招标文件(ТШЗ)智能判定的投标资格、资质要求与本地化策略。'
                      : locale === 'mn'
                      ? 'Төрийн худалдан авах ажиллагааны хууль (ТХААХ) болон тендерийн ТШЗ-д үндэслэн тодорхойлсон гадаадын ААН-ийн эрх зүйн нөхцөл, тусгай зөвшөөрөл ба түншлэлийн шаардлага.'
                      : 'Regulatory eligibility, licensing constraints, and joint venture guidelines based on Mongolian Procurement Law and official tender documentation.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
 locale === 'zh' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
 }`}>
                    <span>
                      {locale === 'zh'
                        ? '北京时间 / 乌兰巴托 (UTC+8 无时差)'
                        : locale === 'mn'
                        ? 'Улаанбаатарын цаг (UTC+8)'
                        : 'Ulaanbaatar Time (UTC+8)'}
                    </span>
                  </span>
                </div>
              </div>

              {/* 2. Key Verdict Box */}
              {chinaAnalysis && (
                <div className={`p-5 rounded-lg border ${
 chinaAnalysis.eligibilityStatus === 'direct_allowed'
 ? 'bg-emerald-50/80 dark:bg-zinc-900 border-emerald-300 dark:border-zinc-800'
 : chinaAnalysis.eligibilityStatus === 'joint_venture_required'
 ? 'bg-amber-50/80 dark:bg-zinc-900 border-amber-300 dark:border-zinc-800'
 : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-300 dark:border-zinc-700'
 }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
 chinaAnalysis.eligibilityStatus === 'direct_allowed'
 ? 'bg-emerald-600 text-white'
 : chinaAnalysis.eligibilityStatus === 'joint_venture_required'
 ? 'bg-slate-900 dark:bg-zinc-700 text-white'
 : 'bg-slate-700 text-white'
 }`}>
                          {locale === 'zh' ? (
                            <>
                              {chinaAnalysis.eligibilityStatus === 'direct_allowed' && '允许独立投标 (Direct Allowed)'}
                              {chinaAnalysis.eligibilityStatus === 'joint_venture_required' && '需组建联合体 (Joint Venture Required)'}
                              {chinaAnalysis.eligibilityStatus === 'domestic_only' && '仅限蒙古国本土企业 (Domestic Only)'}
                              {chinaAnalysis.eligibilityStatus === 'conditional' && 'ℹ 有条件参与 (Conditional)'}
                            </>
                          ) : locale === 'mn' ? (
                            <>
                              {chinaAnalysis.eligibilityStatus === 'direct_allowed' && 'Шууд оролцох боломжтой (Direct Allowed)'}
                              {chinaAnalysis.eligibilityStatus === 'joint_venture_required' && 'Түншлэл / JV шаардлагатай (Joint Venture Required)'}
                              {chinaAnalysis.eligibilityStatus === 'domestic_only' && 'Зөвхөн дотоодын ААН (Domestic Only)'}
                              {chinaAnalysis.eligibilityStatus === 'conditional' && 'ℹ Нөхцөлтэй оролцох (Conditional)'}
                            </>
                          ) : (
                            <>
                              {chinaAnalysis.eligibilityStatus === 'direct_allowed' && 'Direct Bidding Allowed'}
                              {chinaAnalysis.eligibilityStatus === 'joint_venture_required' && 'Joint Venture Required'}
                              {chinaAnalysis.eligibilityStatus === 'domestic_only' && 'Domestic Bidders Only'}
                              {chinaAnalysis.eligibilityStatus === 'conditional' && 'ℹ Conditional Participation'}
                            </>
                          )}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {locale === 'zh'
                            ? chinaAnalysis.eligibilityTitleZh
                            : chinaAnalysis.eligibilityTitleMn || chinaAnalysis.eligibilityTitleZh}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                        {locale === 'zh'
                          ? chinaAnalysis.eligibilityExplanationZh
                          : chinaAnalysis.eligibilityExplanationMn || chinaAnalysis.eligibilityExplanationZh}
                      </p>
                      {locale === 'zh' && chinaAnalysis.eligibilityExplanationMn && (
                        <div className="pt-1 text-xs text-slate-500 dark:text-zinc-400 italic">
                          <strong>Монгол тайлбар:</strong> {chinaAnalysis.eligibilityExplanationMn}
                        </div>
                      )}
                    </div>
                    {locale === 'zh' && Boolean((chinaAnalysis.estimatedBudgetRMB ?? 0) > 0) && (
                      <div className="bg-white/90 dark:bg-zinc-900/90 p-3.5 rounded-md border border-slate-200/80 dark:border-zinc-700 shadow-2xs shrink-0 sm:text-right min-w-[170px]">
                        <span className="text-[10px] font-bold text-slate-400 block">折合人民币预算</span>
                        <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white block text-red-600 dark:text-red-400">
                          ~¥{chinaAnalysis.estimatedBudgetRMB! >= 10000 
                            ? (chinaAnalysis.estimatedBudgetRMB! / 10000).toFixed(1) + ' 万元' 
                            : chinaAnalysis.estimatedBudgetRMB!.toLocaleString() + ' 元'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          汇率参考 1 CNY ≈ 485 MNT
                        </span>
                      </div>
                    )}
                  </div>

                  {(chinaAnalysis.recommendedActionZh || chinaAnalysis.recommendedActionMn) && (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800 flex items-start gap-2 text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-amber-800 dark:text-amber-400 font-bold">
                          {locale === 'zh' ? '行动建议：' : locale === 'mn' ? 'Зөвлөмж:' : 'Recommendation:'}
                        </span>
                        <span className="ml-1">
                          {locale === 'zh'
                            ? chinaAnalysis.recommendedActionZh
                            : chinaAnalysis.recommendedActionMn || chinaAnalysis.recommendedActionZh}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2b. Itemized BoQ & Delivery Snapshot for Foreign / China Bidders */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
                <div className="p-5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {locale === 'zh'
                          ? `本次招标采购标的物与技术规格明细 (${technicalSpecs.sampleItems.length} 项)`
                          : `Тендерээр худалдан авах бараа бүтээгдэхүүний жагсаалт (${technicalSpecs.sampleItems.length})`}
                      </h4>
                    </div>
                    <button
                      onClick={() => setActiveTab('tech')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <span>{locale === 'zh' ? '查看完整技术规格表 & 报价估算器 →' : 'Дэлгэрэнгүй тодорхойлолт & Үнийн тооцоолуур →'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-50/70 dark:bg-zinc-800/50">
                          <th className="py-2 px-3 w-10 text-center">№</th>
                          <th className="py-2 px-3 min-w-[180px]">{locale === 'zh' ? '标的物名称' : 'Барааны нэр'}</th>
                          <th className="py-2 px-3 w-28 text-center">{locale === 'zh' ? '采购数量' : 'Тоо хэмжээ'}</th>
                          <th className="py-2 px-3 min-w-[240px]">{locale === 'zh' ? '核心技术规格 / 品牌标准 (PDF提取)' : 'Техникийн тодорхойлолт (PDF)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                        {technicalSpecs.sampleItems.slice(0, 5).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-zinc-800 inline-block">
                                {item.quantity || 1} {item.unit || 'ш'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-300">
                              {item.spec || 'Техникийн тодорхойлолтын дагуу'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Delivery & Warranty Snapshot Pill */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px]">
                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                      <span className="text-slate-400 block">{locale === 'zh' ? '交付地点' : 'Нийлүүлэх газар'}</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 block truncate">
                        {locale === 'zh' ? (bilingual.entityZh || technicalSpecs.deliveryLocation) : (technicalSpecs.deliveryLocation || '—')}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                      <span className="text-slate-400 block">{locale === 'zh' ? '交付期限' : 'Нийлүүлэх хугацаа'}</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                        {technicalSpecs.deliveryPeriodText || (locale === 'zh' ? '未从PDF读取' : locale === 'en' ? 'Not read from PDF' : 'PDF-ээс уншаагүй')}
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                      <span className="text-slate-400 block">{locale === 'zh' ? '质保期要求' : 'Баталгаат хугацаа'}</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                        {technicalSpecs.warrantyText || (locale === 'zh' ? '1 年标准质保' : '1 жил')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Detailed Guidance Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A. Bank Guarantee & Financing */}
                <div className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {locale === 'zh'
                        ? '投标保函与资金要求 (Bank Guarantee)'
                        : locale === 'mn'
                        ? 'Тендерийн баталгаа ба санхүүгийн шаардлага (Bank Guarantee)'
                        : 'Bid Guarantee & Financial Requirements (Bank Guarantee)'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {locale === 'zh'
                      ? chinaAnalysis?.bankGuaranteePolicyZh || '根据蒙古国现行法，公开招标通常要求提供项目预算 1% 的投标保函。'
                      : chinaAnalysis?.bankGuaranteePolicyMn || 'Төрийн худалдан авах ажиллагааны хуулийн дагуу ихэвчлэн төсвийн 1%-ийн тендерийн баталгаа шаарддаг.'}
                  </p>
                  <div className="bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-zinc-300 space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-zinc-200">
                      {locale === 'zh' ? '出函路径与银行渠道：' : locale === 'mn' ? 'Баталгаа гаргуулах боломжит сувгууд:' : 'Guarantee Issuance Channels:'}
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {locale === 'zh' ? (
                        <>
                          <li>可咨询中国银行乌兰巴托分行 (Bank of China Ulaanbaatar) 等银行是否可出具当地保函（以银行实际政策为准）。</li>
                          <li>国内银行 (中行/工行/进出口银行) 开立对外转开保函(Counter-Guarantee)至蒙古国商业银行(Khan Bank, TDB)。</li>
                          <li>若标段预算低于5000万图格里克或特殊豁免标段，可享受 0₮ 免保函待遇。</li>
                        </>
                      ) : locale === 'mn' ? (
                        <>
                          <li>Улаанбаатар дахь Хятадын Банк (Bank of China Ulaanbaatar) эсвэл дотоодын арилжааны банкаар баталгаа гаргуулах.</li>
                          <li>Гадаадын банкны сөрөг баталгаа (Counter-Guarantee)-г Монголын банкуудад (Хаан банк, ХХБ) баталгаажуулах.</li>
                          <li>Төсөвт өртөг нь 50 сая ₮-өөс доош бол тендерийн баталгаа шаардахгүй (0₮).</li>
                        </>
                      ) : (
                        <>
                          <li>Direct guarantee via Bank of China Ulaanbaatar or local commercial banks.</li>
                          <li>Foreign bank counter-guarantee confirmed by Mongolian banks (Khan Bank, TDB).</li>
                          <li>If budget is under 50M MNT, no bid bond is required (0₮).</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* B. Qualification & Licenses */}
                <div className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {locale === 'zh'
                        ? '资质证书与特许执照 (Licenses & MCUD)'
                        : locale === 'mn'
                        ? 'Тусгай зөвшөөрөл ба мэргэжлийн шаардлага (Licenses & MCUD)'
                        : 'Licenses & Regulatory Certificates (MCUD)'}
                    </h4>
                  </div>
                  {((locale === 'zh' ? chinaAnalysis?.licenseRequirementsZh : chinaAnalysis?.licenseRequirementsMn) || []).length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                      {(locale === 'zh' ? chinaAnalysis!.licenseRequirementsZh : (chinaAnalysis!.licenseRequirementsMn || chinaAnalysis!.licenseRequirementsZh))!.map((req: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                      {locale === 'zh'
                        ? '本项目未发现强制性特殊工程施工执照限制。常规货物采购仅需提供原产地证明、质量检验报告(CO/CQ)及企业营业执照公证海牙认证件。'
                        : locale === 'mn'
                        ? 'Тусгай зөвшөөрөл шаардагдаагүй эсвэл ердийн бараа нийлүүлэлтийн шаардлага (гарал үүслийн гэрчилгээ, чанарын гэрчилгээ, албан ёсны орчуулга) тавигдсан байна.'
                        : 'No mandatory specialized engineering license detected. Standard goods require CO/CQ certificates and apostilled business registration.'}
                    </p>
                  )}
                  <div className="bg-blue-50/60 dark:bg-zinc-900 p-2.5 rounded-lg border border-blue-200/70 dark:border-zinc-800 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                    <span className="font-bold">
                      {locale === 'zh' ? '认证须知：' : locale === 'mn' ? 'Баталгаажуулалт:' : 'Authentication:'}
                    </span>
                    <span className="ml-1">
                      {locale === 'zh'
                        ? '中国公证处出具的营业执照公证书需附加海牙认证(Apostille)或外交部/领事认证，翻译件需附蒙文或英文版本。'
                        : locale === 'mn'
                        ? 'Гадаадын байгууллагын хуулийн этгээдийн гэрчилгээг Апостиль (Apostille) гэрчилгээ эсвэл консулын баталгаажуулалттай, албан ёсны орчуулгын хамт ирүүлнэ.'
                        : 'Foreign registration documents must include Apostille authentication or consular legalization, accompanied by certified translations.'}
                    </span>
                  </div>
                </div>

                {/* C. Joint Venture & Partner Strategy */}
                <div className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {locale === 'zh'
                        ? '联合体组建与本地化合作 (Consortium / JV)'
                        : locale === 'mn'
                        ? 'Түншлэл / Хамтарсан консорциум ба дотоодын хамтын ажиллагаа'
                        : 'Consortium / Joint Venture Strategy'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {locale === 'zh'
                      ? chinaAnalysis?.jointVentureNotesZh || '如涉及现场施工、工程报建或特种设备安装，建议中方作为主设备供货方，蒙方企业作为施工配合方共同签署《联合体协议书》(Түншлэлийн гэрээ)。'
                      : chinaAnalysis?.jointVentureNotesMn || 'Барилга угсралт, тусгай зөвшөөрөл шаардсан ажлуудад гадаадын ААН нь дотоодын тусгай зөвшөөрөлтэй компанитай Түншлэлийн гэрээ байгуулан оролцох боломжтой.'}
                  </p>
                  <div className="bg-purple-50/60 dark:bg-zinc-900 p-2.5 rounded-lg border border-purple-200/70 dark:border-zinc-800 text-[11px] text-purple-900 dark:text-purple-200 space-y-1">
                    <span className="font-bold">
                      {locale === 'zh' ? '分工推荐：' : locale === 'mn' ? 'Үүрэг хуваарилалт:' : 'Work Allocation:'}
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {locale === 'zh' ? (
                        <>
                          <li>中方成员：设备制造、技术参数保障、DAP口岸运输、安装调试技术指导。</li>
                          <li>蒙方成员：持有蒙古国属地资质、办理海关清关与增值税发票、现场施工与工程验收。</li>
                        </>
                      ) : locale === 'mn' ? (
                        <>
                          <li>Гадаад тал: Тоног төхөөрөмжийн үйлдвэрлэл, техникийн үзүүлэлтийн баталгаа, нийлүүлэлт, угсралт тохируулгын заавар.</li>
                          <li>Дотоод тал: Монгол улсын тусгай зөвшөөрөл, гаалийн бүрдүүлэлт, НӨАТ-ын баримт, талбайн угсралт, улсын комисст хүлээлгэн өгөх.</li>
                        </>
                      ) : (
                        <>
                          <li>Lead / Foreign partner: Manufacturing, specification compliance, shipping, and installation engineering.</li>
                          <li>Domestic partner: Local licenses, customs clearance, VAT invoicing, on-site execution, and acceptance.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* D. Procurement Logistics & Clearance */}
                <div className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {locale === 'zh'
                        ? '物流口岸与清关交货 (Logistics & Customs)'
                        : locale === 'mn'
                        ? 'Тээвэр, хилийн боомт ба гаалийн бүрдүүлэлт'
                        : 'Logistics, Border Ports & Customs Clearance'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {locale === 'zh'
                      ? '蒙古国采购通常采用国际贸易术语解释通则(Incoterms 2020)：'
                      : locale === 'mn'
                      ? 'Монгол Улсын худалдан авалтад Олон улсын худалдааны Инкотермс (Incoterms 2020) нөхцөлийг мөрддөг:'
                      : 'International Commercial Terms (Incoterms 2020) typically applied in Mongolian state tenders:'}
                  </p>
                  <div className="bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-zinc-300 space-y-1">
                    <ul className="list-disc pl-4 space-y-1">
                      {locale === 'zh' ? (
                        <>
                          <li><strong>扎门乌德口岸 (Erlian / Zamiin-Uud)：</strong>公路/铁路主要枢纽，适于机械与日常物资。</li>
                          <li><strong>甘其毛都 / 嘎顺苏海图 (Gashuunsukhait)：</strong>矿山重卡、煤炭与工程设备直达。</li>
                          <li><strong>交货条件：</strong>注意核对招标文件是否为 DAP 乌兰巴托仓库交货（含关税增值税由买方或卖方承担）。</li>
                        </>
                      ) : locale === 'mn' ? (
                        <>
                          <li><strong>Замын-Үүд / Эрээн боомт:</strong> Авто зам ба төмөр замын гол зангилаа, тоног төхөөрөмж ба бараа материалын гол гарц.</li>
                          <li><strong>Гашуунсухайт / Ганцмод боомт:</strong> Уул уурхайн тоног төхөөрөмж, хүнд даацын тээврийн үндсэн коридор.</li>
                          <li><strong>Нийлүүлэлтийн нөхцөл:</strong> DAP Улаанбаатар агуулах эсвэл DDP нөхцөлийн дагуу гааль, татварын хариуцлагыг нарийвчлан шалгах.</li>
                        </>
                      ) : (
                        <>
                          <li><strong>Zamiin-Uud / Erlian Port:</strong> Primary road and rail hub for general equipment and manufactured goods.</li>
                          <li><strong>Gashuunsukhait / Gantsmod Port:</strong> Primary corridor for heavy mining machinery and industrial bulk.</li>
                          <li><strong>Delivery Terms:</strong> Check whether delivery is DAP Ulaanbaatar or DDP regarding import customs and VAT allocation.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 4. Extracted Goods & Specifications Preview */}
              {technicalSpecs.sampleItems && technicalSpecs.sampleItems.length > 0 && (
                <div className="p-4 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>
                        {locale === 'zh'
                          ? '官方提取清单与技术参数 (BOQ & Extracted Specs)'
                          : locale === 'mn'
                          ? 'Тендерийн баримтаас ялгасан ажлын тоо хэмжээ, техникийн үзүүлэлт (BOQ)'
                          : 'Extracted Bill of Quantities & Technical Specifications'}
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                      {locale === 'zh'
                        ? `共 ${technicalSpecs.sampleItems.length} 项清单`
                        : locale === 'mn'
                        ? `Нийт ${technicalSpecs.sampleItems.length} мөр өгөгдөл`
                        : `Total ${technicalSpecs.sampleItems.length} items`}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-zinc-800">
                        <tr>
                          <th className="py-2 px-3 w-12 text-center">#</th>
                          <th className="py-2 px-3">
                            {locale === 'zh' ? '物资/工程名称 (Монгол нэр)' : locale === 'mn' ? 'Бараа / Ажлын нэр' : 'Item / Work Name'}
                          </th>
                          <th className="py-2 px-3 w-28 text-right">
                            {locale === 'zh' ? '数量' : locale === 'mn' ? 'Тоо ширхэг' : 'Quantity'}
                          </th>
                          <th className="py-2 px-3 w-24">
                            {locale === 'zh' ? '单位' : locale === 'mn' ? 'Хэмжих нэгж' : 'Unit'}
                          </th>
                          <th className="py-2 px-3">
                            {locale === 'zh' ? '规格及交货要求' : locale === 'mn' ? 'Техникийн тодорхойлолт ба шаардлага' : 'Technical Specifications'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {technicalSpecs.sampleItems.slice(0, 10).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50">
                            <td className="py-2 px-3 text-center text-slate-400 dark:text-zinc-500 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">{item.quantity || 1}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{item.unit || (locale === 'zh' ? '件/批' : locale === 'mn' ? 'ш / багц' : 'pcs')}</td>
                            <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 text-[11px]">{item.spec || (locale === 'zh' ? '见详细招标文件' : locale === 'mn' ? 'ТШЗ-аас үзнэ үү' : 'See bidding docs')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Chinese / Foreign AI Tender Analyst Quick Prompts */}
              <div className={`p-5 rounded-lg border shadow-xs space-y-3 ${
 locale === 'zh'
 ? ' bg-red-50 dark:bg-zinc-900 border-red-200 dark:border-zinc-800'
 : ' bg-indigo-50 dark:bg-zinc-900 border-indigo-200 dark:border-zinc-800'
 }`}>
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
 locale === 'zh' ? 'bg-slate-900 dark:bg-zinc-700' : 'bg-slate-900 dark:bg-zinc-700'
 }`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {locale === 'zh'
                        ? '中企专属 AI 投标顾问一键咨询'
                        : locale === 'mn'
                        ? 'Тендерийн AI Шинжээчийн нэг товшилтын туслах'
                        : 'AI Cross-Border Tender Advisor & Intelligence'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {locale === 'zh'
                        ? '点击下方预设问题，AI 立即基于官方 PDF 原文与蒙古国现行法规为您生成中文解答与实操方案：'
                        : locale === 'mn'
                        ? 'Доорх бэлэн асуултуудаас сонгож, тендерийн ТШЗ болон холбогдох хууль тогтоомжийн дагуу AI-аас дэлгэрэнгүй зөвлөгөө аваарай:'
                        : 'Select a query below for instant AI analysis against official bidding documents and Mongolian regulations:'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {locale === 'zh' ? (
                    <>
                      <button
                        onClick={() => handleRunAiAnalysis(
                          '作为一家中国企业，如果我们直接参与此标段投标，需要准备哪些企业公证认证材料、制造商授权书(MAF)以及过往类似业绩证明？请详细列出清单。',
                          'zh-eligibility',
                          '中企申报资格与公证清单'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-red-700 dark:hover:text-red-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>中国企业所需公证材料与业绩清单？</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          '该项目的投标保证金金额折合人民币是多少？中国银行乌兰巴托分行或国内银行出具保函的具体流程与格式要求是什么？',
                          'zh-guarantee',
                          '银行保函与资金安排'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-red-700 dark:hover:text-red-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>投标保函金额与国内银行开函路径？</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          '如果需要与蒙古国当地持证企业组建联合体(Joint Venture)参与竞标，中方与蒙方的权责划分、联合体协议公证要点以及付款结算有哪些关键注意事项？',
                          'zh-jv',
                          '联合体组建与合同分工'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-red-700 dark:hover:text-red-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>联合体协议书公证与当地伙伴分工策略？</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          '请详细分析该招标文件的技术规格与供货清单，对于中国制造的产品是否存在标准差异(如GB/ISO/MNS)，交货地点与清关运输有哪些实操风险？',
                          'zh-specs',
                          '技术规格与中国制造适配度'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-red-700 dark:hover:text-red-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>技术规格解析与中国产品适配性？</span>
                      </button>
                    </>
                  ) : locale === 'mn' ? (
                    <>
                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Энэхүү тендерт гадаадын эсвэл Хятадын ААН шууд оролцоход ямар бичиг баримт (Апостиль гэрчилгээ, үйлдвэрлэгчийн эрх MAF, ижил төстэй ажлын туршлага) шаардагдах вэ? Жагсаалтаар гаргаж өгнө үү.',
                          'mn-eligibility',
                          'Гадаадын ААН-ийн бүрдүүлэх баримт бичиг'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Гадаадын / Хятад ААН-ийн бүрдүүлэх бичиг баримтын жагсаалт?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Энэ төслийн тендерийн баталгааны хэмжээ хэд вэ? Гадаадын банкны сөрөг баталгаа эсвэл дотоодын банкаар баталгаа гаргуулах шаардлага юу байна вэ?',
                          'mn-guarantee',
                          'Тендерийн баталгааны шаардлага'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Тендерийн баталгааны дүн ба банкны сувгууд?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Дотоодын тусгай зөвшөөрөлтэй ААН-тэй хамтарсан консорциум / Түншлэлийн гэрээ (JV) байгуулахад хуулийн дагуу эрх үүрэг, хувь хэмжээг хэрхэн зохицуулах вэ?',
                          'mn-jv',
                          'Түншлэлийн гэрээ (JV) ба үүрэг хуваарилалт'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Түншлэлийн гэрээ (JV) байгуулах ба үүрэг хуваарилалт?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Энэхүү тендерийн техникийн тодорхойлолт, нийлүүлэлтийн хуваарь болон импортын барааны стандарт (MNS/ISO/GB) тохирлын эрсдэлийг шинжилж өгнө үү.',
                          'mn-specs',
                          'Техникийн тодорхойлолт ба стандартын нийцэл'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Техникийн тодорхойлолт ба чанарын стандарт?</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRunAiAnalysis(
                          'What legal documents, apostilled certificates, manufacturer authorizations (MAF), and past experience references are required for a foreign entity to participate in this tender?',
                          'en-eligibility',
                          'Foreign Bidder Eligibility & Dossier'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Foreign bidder dossier & apostille checklist?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'What is the exact bid bond amount and required format? Can a foreign bank issue a counter-guarantee to a Mongolian bank?',
                          'en-guarantee',
                          'Bid Guarantee & Banking Channels'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Bid security amount & guarantee channels?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'If forming a Consortium / Joint Venture with a licensed Mongolian entity, what are the legal requirements and work allocation best practices?',
                          'en-jv',
                          'Joint Venture & Consortium Strategy'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Joint Venture agreement & partner allocation?</span>
                      </button>

                      <button
                        onClick={() => handleRunAiAnalysis(
                          'Please analyze the technical specifications, delivery schedule, and compliance with national/international standards (MNS/ISO/GB).',
                          'en-specs',
                          'Technical Specifications & Compliance'
                        )}
                        disabled={aiAnalyzing}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-indigo-700 dark:hover:text-indigo-400 border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
                      >
                        <span>Technical specifications & standards compliance?</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DOCUMENT PREVIEW & EXTRACTION MODAL */}
      {docModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-850">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-blue-100/80 dark:bg-zinc-900 text-blue-700 dark:text-blue-300 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedDoc.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {selectedDoc.category || 'Тендерийн албан ёсны баримт бичиг'} • {selectedDoc.size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-zinc-300">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-blue-50/70 dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 text-blue-900 dark:text-blue-200 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">Боловсруулалтын төлөв:</span>
                  <span>{selectedDoc.extractionStatus || 'not_extracted'}</span>
                </div>
                <span className="font-mono text-[10px] text-blue-700 dark:text-blue-300 font-semibold ">{selectedDoc.type}</span>
              </div>

              {/* Extracted Structured View */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block">
                  Эх баримтаас уншсан текст
                </span>
                <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-sans text-xs leading-relaxed border border-slate-800 shadow-inner select-text">
                  {selectedDoc.extractedSummary ? (
                    <div className="font-mono text-[11.5px] whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
                      {selectedDoc.extractedSummary}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-slate-300">
                        Уншигдах текст хараахан гараагүй байна. Энэ нь PDF-д шаардлага байхгүй гэсэн үг биш; эх файлыг татаж шалгана уу.
                      </p>
                      {selectedDoc.fileId && (
                        <a
                          href={`/api/download?fileId=${encodeURIComponent(selectedDoc.fileId)}&name=${encodeURIComponent(selectedDoc.name || 'tender.pdf')}${/^(?:png|jpe?g)$/i.test(selectedDoc.fileExtention || '') || /\.(?:png|jpe?g)$/i.test(selectedDoc.name || '') ? '&allowImage=1' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={selectedDoc.name || 'tender.pdf'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Эх баримтыг татах</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400 shrink-0" />
                  <span>Анхаарах:</span>
                </div>
                <p>
                  Тендерт оролцогч аж ахуйн нэгж нь төрийн худалдан авах ажиллагааны албан ёсны цахим систем (tender.gov.mn)-ийн ТШББ-д заасан шаардлагатай нягтлан танилцаж, үнийн санал болон баталгааг хуулийн хугацаанд ирүүлэх үүрэгтэй.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-850 flex items-center justify-between gap-2">
              <a
                href={selectedDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
              >
                <span>{selectedDoc.source === 'manual_upload' ? 'Оруулсан PDF-г татах' : 'tender.gov.mn эх хуудас'}</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Хаах
                </button>
                {selectedDoc.fileId && (
                  <a
                    href={`/api/download?fileId=${encodeURIComponent(selectedDoc.fileId)}&name=${encodeURIComponent(selectedDoc.name || 'tender.pdf')}${/^(?:png|jpe?g)$/i.test(selectedDoc.fileExtention || '') || /\.(?:png|jpe?g)$/i.test(selectedDoc.name || '') ? '&allowImage=1' : ''}`}
                    download={selectedDoc.name || 'tender.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Эх файл татах</span>
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

      {/* Modal for Instant Document Text Preview */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{previewModalDoc.name}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">PDF баримтаас ялган авсан албан ёсны текст</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-blue-600 selection:text-white">
              {previewModalDoc.text}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                {previewModalDoc.text.length.toLocaleString()} тэмдэгт
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewModalDoc.text);
                    setCopiedPreviewText(true);
                    setTimeout(() => setCopiedPreviewText(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedPreviewText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copiedPreviewText ? 'Хуулагдлаа' : 'Текстийг хуулах'}</span>
                </button>
                <button
                  onClick={() => setPreviewModalDoc(null)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Хаах
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
        className="fixed bottom-6 right-6 z-40 bg-slate-900 dark:bg-zinc-700 hover:bg-slate-800 dark:hover:bg-zinc-600 text-white px-4 py-3 rounded-full shadow-sm hover:shadow-xl transition-all flex items-center gap-2.5 text-xs sm:text-sm font-bold cursor-pointer ring-2 ring-white/80 active:scale-95 group"
        title="Тендерийн AI Шинжээчээс асуух"
      >
        <Sparkles className="h-4 w-4 text-amber-200 group-hover:rotate-12 transition-transform" />
        <span>AI Шинжээчээс асуух</span>
        {aiMessages.length > 0 && (
          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-white text-amber-800 text-[11px] font-semibold flex items-center justify-center shadow-xs">
            {aiMessages.length}
          </span>
        )}
      </button>

      {/* In-App Embedded PDF Reader Modal */}
      <TenderPdfReaderModal
        isOpen={isPdfReaderOpen}
        onClose={() => {
          setIsPdfReaderOpen(false);
          setPdfReaderDoc(null);
        }}
        tender={data?.tender}
        pdfUrl={pdfReaderDoc?.url || storedPrimaryPdf?.downloadUrl || storedPrimaryPdf?.url}
        fileName={pdfReaderDoc?.name || storedPrimaryPdf?.name}
        locale={locale}
        onAskAI={(_t, q) => {
          setIsAiCollapsed(false);
          if (q) {
            handleRunAiAnalysis(q, 'pdf-modal');
          }
          aiAnalysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* China Cross-Border Matchmaker Modal */}
      <ChinaSupplierModal
        isOpen={isChinaSupplierOpen}
        onClose={() => setIsChinaSupplierOpen(false)}
        tender={data?.tender}
        locale={locale}
      />
    </div>
  );
};

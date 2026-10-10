'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  X, ExternalLink, Building2, Calendar, Clock, 
  DollarSign, FileText, ListChecks, Trophy, Sparkles, 
  ArrowUpRight, ShieldCheck, Tag, Copy, Check, FileCheck, Globe2,
  TrendingUp, Download, Lock, CheckCircle2, AlertTriangle, Handshake,
  Layers, ArrowRight, Zap, HelpCircle, BookOpen, Search, FileSpreadsheet,
  Calculator, RotateCcw
} from 'lucide-react';
import { TenderItem, Locale } from '@/lib/types';
import { IndustryIcon } from '@/components/IndustryIcon';
import { TenderPdfReaderModal } from '@/components/TenderPdfReaderModal';

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
  const [isPdfReaderOpen, setIsPdfReaderOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'bds' | 'items' | 'ai'>('bds');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isEstimatorMode, setIsEstimatorMode] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});
  const [userAnnualTurnover, setUserAnnualTurnover] = useState<string>('');
  const [checkedLicenses, setCheckedLicenses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tender?.invitationId || !isOpen) {
      setDetailData(null);
      return;
    }
    let cancelled = false;
    setIsLoadingDetail(true);
    fetch(`/api/tenders/${tender.invitationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && (data?.tender || data?.success)) {
          setDetailData(data);
        }
      })
      .catch((err) => console.warn('Could not load rich detail in slideover:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tender?.invitationId, isOpen]);

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
  const rawData = detailData?.tender?.raw_data || detailData?.tender?.rawData || tender.raw_data || (tender as any).rawData;
  const liveBundle = detailData?.liveBundle || rawData?.liveBundle;
  const structuredSpecs = detailData?.technicalSpecs?.extractedSpecs || detailData?.technicalSpecs || liveBundle?.structuredSpecs || rawData?.structuredSpecs;
  const bds = detailData?.bds;

  const storedPdfUrl: string | undefined = 
    rawData?.pdfUrl || 
    liveBundle?.documents?.find((d: any) => d.isStored || (typeof d.downloadUrl === 'string' && d.downloadUrl.includes('supabase.co')) || (typeof d.url === 'string' && d.url.includes('supabase.co')))?.downloadUrl ||
    detailData?.technicalSpecs?.documents?.find((d: any) => d.isStored || (typeof d.downloadUrl === 'string' && d.downloadUrl.includes('supabase.co')) || (typeof d.url === 'string' && d.url.includes('supabase.co')))?.downloadUrl ||
    (tender as any).pdfUrl;
  const storedPdfFileName: string = 
    rawData?.pdfFileName || 
    liveBundle?.documents?.find((d: any) => d.isStored)?.fileName || 
    detailData?.technicalSpecs?.documents?.find((d: any) => d.isStored)?.name ||
    `${tender.tenderCode || tender.invitationId}_ТШББ.pdf`;
  const hasStoredPdf = Boolean(storedPdfUrl);

  // Extract structured items
  const items: Array<{ name: string; specs?: string; unit?: string; qty?: string | number }> = 
    detailData?.technicalSpecs?.sampleItems ||
    tender.items ||
    rawData?.structuredSpecs?.items ||
    liveBundle?.structuredSpecs?.items ||
    rawData?.items ||
    [];

  // Extract delivery schedule
  const deliverySchedule: any[] = 
    detailData?.technicalSpecs?.deliverySchedule ||
    tender.deliverySchedule ||
    rawData?.structuredSpecs?.deliverySchedule ||
    liveBundle?.structuredSpecs?.deliverySchedule ||
    [];

  // Extract BDS criteria
  const licenses: string[] = 
    detailData?.bds?.requiredLicenses ||
    tender.licenses ||
    rawData?.structuredSpecs?.licenses ||
    liveBundle?.structuredSpecs?.licenses ||
    [];

  const turnoverReq = 
    detailData?.bds?.turnoverReq ||
    tender.turnoverReq ||
    rawData?.structuredSpecs?.turnoverReq ||
    liveBundle?.structuredSpecs?.turnoverReq;

  const liquidAssetsReq = 
    detailData?.bds?.liquidAssetsReq ||
    tender.liquidAssetsReq ||
    rawData?.structuredSpecs?.liquidAssetsReq ||
    liveBundle?.structuredSpecs?.liquidAssetsReq;

  const similarExpReq = 
    detailData?.bds?.similarExpReq ||
    tender.similarExpReq ||
    rawData?.structuredSpecs?.similarExpReq ||
    liveBundle?.structuredSpecs?.similarExpReq;

  const bidSecurityReq = 
    detailData?.bds?.bidSecurityReq ||
    tender.bidSecurityReq ||
    rawData?.structuredSpecs?.bidSecurityReq ||
    liveBundle?.structuredSpecs?.bidSecurityReq;

  // Extract eligibility requirements
  const eligibilityReqs: string[] = 
    (tender.eligibility_requirements && tender.eligibility_requirements.length > 0 ? tender.eligibility_requirements : null) ||
    (detailData?.tender?.eligibility_requirements && detailData.tender.eligibility_requirements.length > 0 ? detailData.tender.eligibility_requirements : null) ||
    (rawData?.eligibility_requirements && rawData.eligibility_requirements.length > 0 ? rawData.eligibility_requirements : null) ||
    (structuredSpecs?.keyRequirements && structuredSpecs.keyRequirements.length > 0 ? structuredSpecs.keyRequirements : null) ||
    [
      turnoverReq ? `Борлуулалтын орлого: ${turnoverReq}` : null,
      liquidAssetsReq ? `Түргэн хөрвөх чадвар: ${liquidAssetsReq}` : null,
      similarExpReq ? `Ижил төстэй ажил: ${similarExpReq}` : null,
      bidSecurityReq ? `Тендерийн баталгаа: ${bidSecurityReq}` : null,
      licenses.length > 0 ? `Тусгай зөвшөөрөл: ${licenses.slice(0, 2).join(', ')}` : null,
    ].filter(Boolean) as string[];

  const finalEligibilityList: string[] = eligibilityReqs.length > 0 ? eligibilityReqs : [
    locale === 'mn' ? 'Шүүхийн шийдвэрээр төлбөргүй байх (Цахим лавлагаа)' : 'No overdue court-ordered debts',
    locale === 'mn' ? 'Татварын өр төлбөргүй байх (Татварын албаны цахим лавлагаа)' : 'Tax clearance compliance certificate',
    locale === 'mn' ? 'Нийгмийн даатгалын шимтгэл төлөлтийн тайлан' : 'Social insurance clearance certificate',
    locale === 'mn' ? 'Тендерийн баталгаа шаардсан тохиолдолд банкны батлан даалт ирүүлэх' : 'Bank bid guarantee if required'
  ];

  // Extract full scope of work
  const scopeOfWork: string = 
    tender.full_scope_of_work ||
    detailData?.tender?.full_scope_of_work ||
    rawData?.full_scope_of_work ||
    rawData?.llmExtracted?.full_scope_of_work || 
    structuredSpecs?.rawSpecText || 
    structuredSpecs?.fullScopeOfWork ||
    liveBundle?.fullScopeOfWork ||
    '';

  const budgetMnt = Number(tender.totalBudget) || 0;
  const budgetUsd = Math.round(budgetMnt / 3450);
  const budgetCny = Math.round(budgetMnt / 475);

  const totalEstimatedBid = useMemo(() => {
    return items.reduce((acc, it, idx) => {
      const rawQty = parseFloat(String(it.qty || (it as any).quantity || 1).replace(/[^\d.]/g, '')) || 1;
      const price = itemPrices[idx] || 0;
      return acc + (rawQty * price);
    }, 0);
  }, [items, itemPrices]);

  const budgetDiff = totalEstimatedBid > 0 && budgetMnt > 0 ? totalEstimatedBid - budgetMnt : 0;
  const budgetDiffPercent = budgetMnt > 0 && totalEstimatedBid > 0 ? ((totalEstimatedBid - budgetMnt) / budgetMnt) * 100 : 0;

  const handlePriceChange = (index: number, val: string) => {
    const num = parseFloat(val.replace(/[^\d.]/g, '')) || 0;
    setItemPrices((prev) => ({ ...prev, [index]: num }));
  };

  const handleAutoDistributeBudget = (percentageMultiplier: number = 1.0) => {
    if (items.length === 0 || budgetMnt <= 0) return;
    const targetTotal = budgetMnt * percentageMultiplier;
    const amountPerItem = targetTotal / items.length;
    const newPrices: Record<number, number> = {};
    items.forEach((it, idx) => {
      const rawQty = Math.max(1, parseFloat(String(it.qty || (it as any).quantity || 1).replace(/[^\d.]/g, '')) || 1);
      newPrices[idx] = Math.round(amountPerItem / rawQty);
    });
    setItemPrices(newPrices);
  };

  const handleResetPrices = () => {
    setItemPrices({});
  };

  const parsedTurnoverReqMnt = useMemo(() => {
    if (!turnoverReq) return null;
    const str = String(turnoverReq).toLowerCase();
    const bilMatch = str.match(/([\d.,]+)\s*(тэрбум|billion)/);
    if (bilMatch) return parseFloat(bilMatch[1].replace(/,/g, '')) * 1_000_000_000;
    const milMatch = str.match(/([\d.,]+)\s*(сая|million)/);
    if (milMatch) return parseFloat(milMatch[1].replace(/,/g, '')) * 1_000_000;
    const numMatch = str.replace(/[^\d]/g, '');
    if (numMatch && numMatch.length >= 6) return parseFloat(numMatch);
    return null;
  }, [turnoverReq]);

  const userTurnoverNum = useMemo(() => {
    return parseFloat(userAnnualTurnover.replace(/[^\d.]/g, '')) || 0;
  }, [userAnnualTurnover]);

  const licenseMatchCount = useMemo(() => {
    if (licenses.length === 0) return 0;
    return licenses.filter((lic) => checkedLicenses[lic]).length;
  }, [licenses, checkedLicenses]);

  const eligibilityVerdict = useMemo(() => {
    const hasInputs = userTurnoverNum > 0 || Object.values(checkedLicenses).some(Boolean);
    if (!hasInputs && licenses.length === 0) return null;
    
    const allLicensesOk = licenses.length === 0 || licenseMatchCount === licenses.length;
    const turnoverOk = !parsedTurnoverReqMnt || (userTurnoverNum >= parsedTurnoverReqMnt);
    
    if (allLicensesOk && turnoverOk && (userTurnoverNum > 0 || licenses.length > 0)) {
      return {
        status: 'pass',
        title: locale === 'mn' ? '🟢 100% Тэнцэх бүрэн боломжтой' : locale === 'zh' ? '🟢 100% 完全符合资格' : '🟢 100% Fully Eligible to Bid',
        desc: locale === 'mn' ? 'Бүх тусгай зөвшөөрөл болон санхүүгийн босго шаардлага бүрэн хангагдсан байна.' : locale === 'zh' ? '已具备全部所需资质及年度营业额门槛要求。' : 'All required licenses and annual turnover criteria are satisfied.'
      };
    } else if (hasInputs) {
      return {
        status: 'warning',
        title: locale === 'mn' ? '🟡 Түншлэл (JV) эсвэл Туслан гүйцэтгэгч шаардлагатай' : locale === 'zh' ? '🟡 建议组成联合体 (JV) 联合投标' : '🟡 Joint Venture (JV) Recommended',
        desc: locale === 'mn' ? `Дутуу шалгуур: ${[!allLicensesOk ? `Зөвшөөрөл (${licenses.length - licenseMatchCount} дутуу)` : '', !turnoverOk && parsedTurnoverReqMnt ? 'Борлуулалтын босго хүрэхгүй' : ''].filter(Boolean).join(', ')}. Консорциум үүсгэж оролцохыг зөвлөж байна.` : locale === 'zh' ? '部分资质或财务门槛未达标，建议寻找本地合作伙伴联合投标。' : 'Some criteria are not met. Bidding via a consortium is recommended.'
      };
    }
    return null;
  }, [licenses, licenseMatchCount, parsedTurnoverReqMnt, userTurnoverNum, checkedLicenses, locale]);

  const handleExportItemsCsv = () => {
    const listToExport = items.length > 0 ? items : deliverySchedule;
    if (listToExport.length === 0) return;

    if (isEstimatorMode && items.length > 0) {
      const headers = ['№', 'Бараа / Ажлын нэр', 'Тоо хэмжээ', 'Хэмжих нэгж', 'Нэгж үнэ (₮)', 'Нийт үнэ (₮)', 'Техникийн тодорхойлолт'];
      const rows = listToExport.map((it: any, idx: number) => {
        const rawQty = parseFloat(String(it.qty || it.quantity || 1).replace(/[^\d.]/g, '')) || 1;
        const unitPrice = itemPrices[idx] || 0;
        const lineTotal = rawQty * unitPrice;
        return [
          idx + 1,
          `"${(it.name || '').replace(/"/g, '""')}"`,
          rawQty,
          `"${(it.unit || '').replace(/"/g, '""')}"`,
          unitPrice,
          lineTotal,
          `"${(it.specs || it.spec || '').replace(/"/g, '""')}"`
        ];
      });
      rows.push([
        '',
        `"НИЙТ САНАЛ БОЛГОХ ДҮН"`,
        '',
        '',
        '',
        totalEstimatedBid,
        `"Төсөвт өртөг: ₮${budgetMnt.toLocaleString()} (Зөрүү: ${budgetDiffPercent > 0 ? '+' : ''}${budgetDiffPercent.toFixed(1)}%)"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Tender_${tender.tenderCode || tender.invitationId}_priced_bid.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = ['№', 'Бараа / Ажлын нэр', 'Тоо хэмжээ', 'Хэмжих нэгж', 'Техникийн үзүүлэлт / Шаардлага'];
    const rows = listToExport.map((it: any, idx: number) => [
      idx + 1,
      `"${(it.name || '').replace(/"/g, '""')}"`,
      it.quantity || it.qty || 1,
      `"${(it.unit || '').replace(/"/g, '""')}"`,
      `"${(it.specs || it.spec || (it.location ? `Байршил: ${it.location} | Хугацаа: ${it.deadline}` : '')).replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tender_${tender.tenderCode || tender.invitationId}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter((it) => {
    if (!itemSearchQuery.trim()) return true;
    const q = itemSearchQuery.toLowerCase().trim();
    return (
      (it.name && it.name.toLowerCase().includes(q)) ||
      (it.specs && it.specs.toLowerCase().includes(q)) ||
      (it.unit && it.unit.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-4xl bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between animate-in slide-in-from-right duration-300 text-slate-900 dark:text-slate-100">
          
          {/* 1. Top Header: Title, Code, Status & Prominent Countdown */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-slate-50 dark:bg-slate-900/90 shrink-0">
            
            {/* Top Left: Title, Code, & Buyer */}
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 rounded-lg font-bold border border-blue-200 dark:border-blue-500/30">
                  {tender.tenderCode || tender.invitationNumber || `INV-${tender.invitationId}`}
                </span>
                
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
                  <IndustryIcon id={tender.industry || 'all'} className="h-3.5 w-3.5 text-blue-500" />
                  <span>{tender.industryName || tender.tenderTypeName || 'Ерөнхий бараа нийлүүлэлт'}</span>
                </span>

                <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 rounded-lg font-bold border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {tender.docStatusName || (locale === 'mn' ? 'Санал авч буй' : 'Open for Bidding')}
                </span>

                {hasStoredPdf && (
                  <button
                    onClick={() => setIsPdfReaderOpen(true)}
                    className="text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/15 hover:bg-purple-100 dark:hover:bg-purple-500/25 px-2.5 py-1 rounded-lg font-bold border border-purple-200 dark:border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="PDF баримтыг вебсайт дээрээс шууд унших"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{locale === 'zh' ? '📄 标书已归档 (点击阅读)' : locale === 'mn' ? '📄 ТШЗ PDF (Унших)' : '📄 Read PDF'}</span>
                  </button>
                )}

                <Link
                  href={`/tender/${tender.invitationId}`}
                  className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 px-2.5 py-1 rounded-lg font-bold border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ml-auto sm:ml-0"
                  title="Бүрэн хуудас руу шилжих"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{locale === 'zh' ? '完整页面 ↗' : locale === 'mn' ? 'Бүрэн хуудас ↗' : 'Full Page ↗'}</span>
                </Link>
              </div>

              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug tracking-tight">
                {tender.tenderName}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{tender.budgetEntityName}</span>
              </div>
            </div>

            {/* Top Right: Countdown & Close Button */}
            <div className="flex items-start gap-3 shrink-0">
              {timeLeft && (
                <div className={`px-3.5 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[150px] shadow-2xs ${
                  timeLeft.isExpired
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    : timeLeft.days <= 2
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 shadow-amber-500/10'
                    : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-blue-200'
                }`}>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                    <Clock className={`h-3 w-3 ${timeLeft.isExpired ? 'text-rose-500' : 'text-amber-500 animate-spin'}`} />
                    <span>{locale === 'mn' ? 'Хугацаа дуусахад:' : locale === 'zh' ? '截标倒计时:' : 'Deadline Remaining:'}</span>
                  </div>

                  {timeLeft.isExpired ? (
                    <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                      {locale === 'mn' ? 'Хугацаа дууссан' : 'Bidding Closed'}
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1 font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      <span>{String(timeLeft.days).padStart(2, '0')}d</span>
                      <span className="text-slate-400 dark:text-slate-500">:</span>
                      <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                      <span className="text-slate-400 dark:text-slate-500">:</span>
                      <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                      <span className="text-slate-400 dark:text-slate-500">:</span>
                      <span className="text-amber-600 dark:text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                    {tender.receiveDate ? tender.receiveDate.split('T')[0] : '—'}
                  </span>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer border border-slate-200 dark:border-slate-800"
                aria-label="Close slide-over"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('bds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'bds'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListChecks className="h-3.5 w-3.5 text-blue-500" />
              <span>{locale === 'mn' ? 'Шалгуур & ТШЗ' : locale === 'zh' ? '资格与标书' : 'BDS Criteria'}</span>
            </button>

            <button
              onClick={() => setActiveTab('items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'items'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span>{locale === 'mn' ? 'Бараа, ажлын хүснэгт' : locale === 'zh' ? '采购物料清单' : 'BoQ Items Table'}</span>
              {(items.length > 0 || deliverySchedule.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                  {items.length || deliverySchedule.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{locale === 'mn' ? 'AI Шинжилгээ' : locale === 'zh' ? 'AI 智库分析' : 'AI Intelligence'}</span>
            </button>
          </div>

          {/* 2. Scrollable Body: Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950">
            
            {/* TAB 1: BDS CRITERIA & SPECS */}
            {activeTab === 'bds' && (
              <div className="space-y-6">
                {/* Budget Box */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {locale === 'mn' ? 'Зарлагдсан төсөвт өртөг (Total Budget)' : 'Declared Total Budget'}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    ₮ {budgetMnt.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <span>≈ ${(budgetUsd).toLocaleString()} USD</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">≈ ¥{budgetCny.toLocaleString()} CNY</span>
                  </div>
                </div>

                {/* Key BDS Financial & Experience Cards */}
                {(turnoverReq || liquidAssetsReq || similarExpReq || bidSecurityReq) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {turnoverReq && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 block">
                          💰 Борлуулалтын орлого
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {turnoverReq}
                        </p>
                      </div>
                    )}
                    {liquidAssetsReq && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 block">
                          💳 Түргэн хөрвөх чадвар
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {liquidAssetsReq}
                        </p>
                      </div>
                    )}
                    {similarExpReq && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 block">
                          🏆 Ижил төстэй ажил / гэрээ
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {similarExpReq}
                        </p>
                      </div>
                    )}
                    {bidSecurityReq && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400 block">
                          🛡️ Тендерийн баталгаа
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {bidSecurityReq}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Licenses List */}
                {licenses.length > 0 && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>{locale === 'mn' ? 'Шаардагдах тусгай зөвшөөрөл (Licenses)' : 'Required Licenses'}</span>
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {licenses.map((lic, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 font-medium">
                          {lic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🎯 Interactive BDS Eligibility Self-Assessment Widget */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        ⚖️
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {locale === 'mn' ? 'Шалгуурын үнэлгээ & Нийцлийн тооцоолуур' : locale === 'zh' ? '投标资质自查与匹配评估' : 'BDS Eligibility Self-Assessment'}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {locale === 'mn' ? 'Танай байгууллага энэ тендерт тэнцэх боломжтой эсэхийг шалгах' : 'Verify if your enterprise meets minimum criteria'}
                        </p>
                      </div>
                    </div>
                    {eligibilityVerdict && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs border ${
                        eligibilityVerdict.status === 'pass'
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}>
                        {eligibilityVerdict.title}
                      </span>
                    )}
                  </div>

                  {/* Checklist Section: Required Licenses */}
                  {licenses.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>1. Тусгай зөвшөөрлийн бэлэн байдал:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {licenseMatchCount} / {licenses.length} хангасан
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {licenses.map((lic, idx) => {
                          const isChecked = !!checkedLicenses[lic];
                          return (
                            <label
                              key={idx}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                                isChecked
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
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
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        2. Байгууллагын жилийн борлуулалт (₮):
                      </label>
                      <input
                        type="text"
                        value={userAnnualTurnover}
                        onChange={(e) => setUserAnnualTurnover(e.target.value)}
                        placeholder={parsedTurnoverReqMnt ? `Босго: ₮${parsedTurnoverReqMnt.toLocaleString()}` : 'Жишээ: 150000000'}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    {parsedTurnoverReqMnt && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pb-1">
                        Шаардагдах босго: <strong className="text-slate-800 dark:text-slate-200 font-mono">₮{parsedTurnoverReqMnt.toLocaleString()}</strong>
                        {userTurnoverNum > 0 && (
                          <span className={`ml-2 font-bold ${userTurnoverNum >= parsedTurnoverReqMnt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {userTurnoverNum >= parsedTurnoverReqMnt ? '✓ Хангаж байна' : '✗ Хүрэхгүй байна'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verdict description if available */}
                  {eligibilityVerdict && (
                    <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                      eligibilityVerdict.status === 'pass'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}>
                      {eligibilityVerdict.desc}
                    </div>
                  )}
                </div>

                {/* Eligibility & Compliance Checklist */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-blue-500" />
                      <span>{locale === 'mn' ? 'Шалгуур үзүүлэлт & Шаардлага' : 'Eligibility & Clearances'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                      {finalEligibilityList.length} шаардлага
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {finalEligibilityList.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Scope Preview & PDF Document Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-purple-500" />
                      <span>{locale === 'mn' ? 'Ажлын даалгавар / Техникийн үзүүлэлт' : 'Technical Specifications Scope'}</span>
                    </span>
                    {hasStoredPdf && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPdfReaderOpen(true)}
                          className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <BookOpen className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span>{locale === 'mn' ? 'PDF Унших' : 'Read PDF'}</span>
                        </button>
                        <a
                          href={storedPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={storedPdfFileName}
                          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:emerald-500 flex items-center gap-1 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          <span>{locale === 'mn' ? 'Татах' : 'Download'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {scopeOfWork ? (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans">
                      {scopeOfWork}
                    </div>
                  ) : hasStoredPdf ? (
                    <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800/60 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate text-xs">{storedPdfFileName}</div>
                          <div className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                            {locale === 'mn' ? 'Албан ёсны ТШББ баримт хадгалагдсан' : 'Official bidding PDF document ready'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPdfReaderOpen(true)}
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{locale === 'mn' ? '📖 ТШЗ Унших' : '📖 Read PDF'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center italic">
                      {locale === 'mn' ? 'Техникийн тодорхойлолтыг албан ёсны PDF баримтаас татаж үзнэ үү.' : 'Download technical specification document for complete details.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: STRUCTURED ITEMS & BoQ TABLE */}
            {activeTab === 'items' && (
              <div className="space-y-6">
                {items.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    {/* Table Header Controls */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-indigo-500" />
                          <span>Нийлүүлэх бараа, ажлын нарийвчилсан хүснэгт ({items.length})</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                          ТШББ-ээс ялгасан
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <div className="relative flex-1 sm:w-44">
                          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            placeholder="Бараа, үзүүлэлт хайх..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <button
                          onClick={() => setIsEstimatorMode(!isEstimatorMode)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            isEstimatorMode
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20'
                              : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-800'
                          }`}
                          title="Үнийн санал бодох горим"
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          <span>{isEstimatorMode ? 'Тооцоолуур идэвхтэй' : 'Үнийн санал бодох'}</span>
                        </button>

                        <button
                          onClick={handleExportItemsCsv}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title="Барааны хүснэгтийг CSV татаж авах"
                        >
                          <Download className="h-3 w-3" />
                          <span>CSV Татах</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Budget Distribute Bar in Estimator Mode */}
                    {isEstimatorMode && (
                      <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1 text-[11px]">
                            <span>⚡ Төсвөөр жигд хуваарилах:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAutoDistributeBudget(0.90)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer shadow-2xs"
                            >
                              -10% (₮{Math.round(budgetMnt * 0.9).toLocaleString()})
                            </button>
                            <button
                              onClick={() => handleAutoDistributeBudget(0.95)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer shadow-2xs"
                            >
                              -5% (₮{Math.round(budgetMnt * 0.95).toLocaleString()})
                            </button>
                            <button
                              onClick={() => handleAutoDistributeBudget(1.0)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 cursor-pointer shadow-2xs"
                            >
                              100% (₮{budgetMnt.toLocaleString()})
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={handleResetPrices}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Цэвэрлэх</span>
                        </button>
                      </div>
                    )}

                    {/* Table View */}
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">№</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Бараа / Ажлын нэр</th>
                            <th className="py-2.5 px-3 w-28 text-center">Тоо хэмжээ</th>
                            {isEstimatorMode && (
                              <>
                                <th className="py-2.5 px-3 w-36 text-right">Нэгж үнэ (₮)</th>
                                <th className="py-2.5 px-3 w-32 text-right">Нийт дүн (₮)</th>
                              </>
                            )}
                            <th className="py-2.5 px-3 min-w-[220px]">Техникийн тодорхойлолт & Шаардлага</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                          {filteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={isEstimatorMode ? 6 : 4} className="py-8 text-center text-slate-500 italic">
                                &quot;{itemSearchQuery}&quot; хайлтад тохирох бараа олдсонгүй.
                              </td>
                            </tr>
                          ) : (
                            filteredItems.map((it, idx) => {
                              const rawQty = parseFloat(String(it.qty || (it as any).quantity || 1).replace(/[^\d.]/g, '')) || 1;
                              const unitPrice = itemPrices[idx] || 0;
                              const lineTotal = rawQty * unitPrice;

                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                                    {it.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 inline-block">
                                      {it.qty || (it as any).quantity || 1} {it.unit || 'ш'}
                                    </span>
                                  </td>
                                  {isEstimatorMode && (
                                    <>
                                      <td className="py-2.5 px-3">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">₮</span>
                                          <input
                                            type="text"
                                            value={itemPrices[idx] != null && itemPrices[idx] > 0 ? itemPrices[idx].toLocaleString() : ''}
                                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-5 pr-2 py-1 text-xs bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded font-mono font-bold text-right text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                                        ₮ {lineTotal.toLocaleString()}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 leading-relaxed text-pretty">
                                    {it.specs || (it as any).spec || '—'}
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
                      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Нийт санал болгох дүн:</span>
                            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                              ₮ {totalEstimatedBid.toLocaleString()}
                            </span>
                          </div>
                          {budgetMnt > 0 && totalEstimatedBid > 0 && (
                            <div className="border-l border-slate-700 pl-4">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Төсөвтэй харьцуулахад:</span>
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
                ) : deliverySchedule.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-blue-500" />
                        <span>Нийлүүлэлтийн хуваарь & Тоо хэмжээ ({deliverySchedule.length})</span>
                      </span>
                      <button
                        onClick={handleExportItemsCsv}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV Татах</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">№</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Барааны нэр</th>
                            <th className="py-2.5 px-3 w-28 text-center">Тоо хэмжээ</th>
                            <th className="py-2.5 px-3 min-w-[150px]">Хүргэх газар</th>
                            <th className="py-2.5 px-3 min-w-[140px]">Хугацаа</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                          {deliverySchedule.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">{s.number || idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                                  {s.quantity} {s.unit}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{s.location}</td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">{s.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xs">
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {locale === 'mn' ? 'Албан ёсны PDF эх баримт хадгалагдсан' : 'Official PDF Document Available'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {locale === 'mn'
                          ? 'Энэхүү тендерийн нарийвчилсан тоо хэмжээ, техникийн хүснэгт нь албан ёсны ТШББ баримт дотор тамгатай эх хувиар баталгаажсан байна.'
                          : 'Full itemized tables and specifications are available in the official attached PDF.'}
                      </p>
                    </div>
                    {hasStoredPdf && (
                      <button
                        onClick={() => setIsPdfReaderOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>{locale === 'mn' ? '📖 ТШЗ PDF Уншигчаар үзэх' : 'Open PDF Reader'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI & CROSS-BORDER INTELLIGENCE */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* Why this tender is good for foreign suppliers */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-white via-blue-50/30 to-white dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-500/30 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg">
                        <Zap className="h-4 w-4 text-amber-500" />
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {locale === 'zh' ? '💡 为什么该标段适合跨境参与？' : locale === 'mn' ? '💡 Оролцох боломж & Давуу тал' : '💡 Procurement Opportunity'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                      {locale === 'mn' ? 'Төрийн худалдан авалт' : 'Direct Gov Budget'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {locale === 'zh'
                      ? `蒙古国本级采购预算为 ₮${(budgetMnt / 1e6).toFixed(1)}M (约 ¥${budgetCny.toLocaleString()} CNY / $${budgetUsd.toLocaleString()} USD)。具备完整官方采购清单，支持工厂直接供货与技术对接。`
                      : locale === 'mn'
                      ? `Энэхүү төсөл нь нийт ₮${budgetMnt.toLocaleString()} өртөгтэй бөгөөд албан ёсны техникийн шаардлагын дагуу шууд нийлүүлэх болон түншлэлээр оролцох бүрэн боломжтой.`
                      : `Total procurement budget volume is ₮${budgetMnt.toLocaleString()} (~$${budgetUsd.toLocaleString()} USD / ~¥${budgetCny.toLocaleString()} CNY) with complete official specifications.`}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Өрсөлдөөний түвшин</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">Дундаж (3-4 оролцогч)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Төлбөрийн нөхцөл</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">100% Төрийн сан</span>
                    </div>
                  </div>
                </div>

                {/* Recommended Winning Strategy */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>{locale === 'mn' ? 'Ялах стратеги & Зөвлөмж' : 'Recommended Bidding Strategy'}</span>
                  </span>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <p className="leading-relaxed"><strong>Төсвийн 88-92% үнийн санал:</strong> Хэт хямд үнэ өгөхгүйгээр чанарын шалгуурт тэнцэх оновчтой интервал.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <p className="leading-relaxed"><strong>Түншлэл & Гаалийн бүрдүүлэлт:</strong> Барааг Замын-Үүд / Улаанбаатар DDP нөхцөлөөр хүргэх түншийг ашиглах.</p>
                    </div>
                  </div>
                </div>

                {/* Quick AI Action */}
                {onAskAI && (
                  <button
                    onClick={() => {
                      onClose();
                      onAskAI(tender);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-slate-850 border border-purple-200 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>{locale === 'mn' ? 'AI Шинжээчээр бичиг баримт шалгуулах' : 'Ask AI to analyze this bid in detail'}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

          </div>

          {/* 3. Sticky Bottom Footer: Action Conversion Funnel */}
          <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl shrink-0">
            
            {/* Left Info: Trust Guarantee & Link to Full Page */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <Link
                href={`/tender/${tender.invitationId}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                <span>{locale === 'mn' ? '📄 Дэлгэрэнгүй бүрэн хуудас' : locale === 'zh' ? '查看完整页面' : 'View Full Page'}</span>
              </Link>

              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors font-medium sm:ml-2"
              >
                <span>tender.gov.mn</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Right Buttons: Read PDF, Download, Collaborate */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              {hasStoredPdf && (
                <button
                  onClick={() => setIsPdfReaderOpen(true)}
                  className="flex-1 sm:flex-initial h-11 px-4 rounded-xl bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  title="PDF баримтыг вебсайт дээрээс шууд унших"
                >
                  <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>{locale === 'mn' ? 'ТШЗ Унших' : locale === 'zh' ? '阅读标书' : 'Read PDF'}</span>
                </button>
              )}

              <a
                href={hasStoredPdf ? storedPdfUrl : portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={hasStoredPdf ? storedPdfFileName : undefined}
                className="flex-1 sm:flex-initial h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Download className="h-4 w-4 text-emerald-500" />
                <span>{locale === 'mn' ? 'Татах' : locale === 'zh' ? '下载' : 'Download'}</span>
              </a>

              <button
                onClick={() => {
                  onClose();
                  if (onOpenChinaSupplier) onOpenChinaSupplier(tender);
                  else if (onOpenFinance) onOpenFinance(tender);
                }}
                className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer border border-blue-400/40"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{locale === 'zh' ? '跨境联合投标' : locale === 'mn' ? 'Төсөлд хамтран оролцох' : 'Bid Consortium'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Built-in PDF Reader Modal */}
      {hasStoredPdf && (
        <TenderPdfReaderModal
          isOpen={isPdfReaderOpen}
          onClose={() => setIsPdfReaderOpen(false)}
          tender={tender}
          pdfUrl={storedPdfUrl}
          fileName={storedPdfFileName}
          locale={locale}
          onAskAI={onAskAI}
        />
      )}
    </div>
  );
};

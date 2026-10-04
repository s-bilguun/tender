'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Globe, Database, ArrowLeft, Sparkles,
  Building2, Layers, Calendar, DollarSign, ListChecks,
  Copy, Check, ExternalLink, RefreshCw, Eye, Play,
  FileCheck2, ShieldCheck, ChevronRight, HelpCircle
} from 'lucide-react';
import { TenderStructuredData } from '@/lib/ingestion/llm-extractor';
import { IndustryIcon } from '@/components/IndustryIcon';

interface ProcessLog {
  id: string;
  source: string;
  timestamp: string;
  status: 'loading' | 'success' | 'error';
  data?: TenderStructuredData;
  dbSaved?: boolean;
  error?: string;
  duration?: number;
}

export default function AdminIngestPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'urls'>('upload');
  const [urlsInput, setUrlsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ProcessLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalInBatch, setTotalInBatch] = useState(0);

  // Copy JSON to clipboard helper
  const handleCopyJson = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  // Process array of File objects
  const processFiles = async (files: File[]) => {
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('Зөвхөн .pdf өргөтгөлтэй файл оруулна уу.');
      return;
    }

    setIsProcessing(true);
    setTotalInBatch(pdfFiles.length);
    setProcessedCount(0);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const logId = `${Date.now()}-${i}`;
      const startTime = Date.now();

      const newLog: ProcessLog = {
        id: logId,
        source: file.name,
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading',
      };

      setLogs((prev) => [newLog, ...prev]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/admin/ingest', {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();
        const duration = Math.round((Date.now() - startTime) / 100) / 10;

        const updatedLog: ProcessLog = {
          id: logId,
          source: file.name,
          timestamp: new Date().toLocaleTimeString(),
          status: res.ok && result.success ? 'success' : 'error',
          data: result.data,
          dbSaved: result.dbSaved,
          error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
          duration,
        };

        setLogs((prev) => prev.map((l) => (l.id === logId ? updatedLog : l)));
        if (updatedLog.status === 'success') {
          setSelectedLog(updatedLog);
        }
      } catch (err: any) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: 'error',
                  error: err.message || 'Сүлжээний холболт тасарлаа',
                }
              : l
          )
        );
      }
      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
  };

  // Process URLs list
  const handleProcessUrls = async () => {
    const urls = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    if (urls.length === 0) {
      alert('Хамгийн багадаа 1 хүчинтэй PDF URL (http/https) оруулна уу.');
      return;
    }

    setIsProcessing(true);
    setTotalInBatch(urls.length);
    setProcessedCount(0);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const logId = `${Date.now()}-${i}`;
      const startTime = Date.now();

      const newLog: ProcessLog = {
        id: logId,
        source: url.split('/').pop() || url,
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading',
      };

      setLogs((prev) => [newLog, ...prev]);

      try {
        const res = await fetch('/api/admin/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const result = await res.json();
        const duration = Math.round((Date.now() - startTime) / 100) / 10;

        const updatedLog: ProcessLog = {
          id: logId,
          source: url.split('/').pop() || url,
          timestamp: new Date().toLocaleTimeString(),
          status: res.ok && result.success ? 'success' : 'error',
          data: result.data,
          dbSaved: result.dbSaved,
          error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
          duration,
        };

        setLogs((prev) => prev.map((l) => (l.id === logId ? updatedLog : l)));
        if (updatedLog.status === 'success') {
          setSelectedLog(updatedLog);
        }
      } catch (err: any) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: 'error',
                  error: err.message || 'Сүлжээний алдаа',
                }
              : l
          )
        );
      }
      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
  };

  // Quick Demo / Sample Test Handler
  const handleRunSampleDemo = () => {
    setActiveTab('urls');
    setUrlsInput(
      'https://www.tender.gov.mn/documents/tender-spec-example.pdf\nhttps://www.tender.gov.mn/documents/civil-works-road.pdf'
    );
  };

  const totalSuccess = logs.filter((l) => l.status === 'success').length;
  const totalError = logs.filter((l) => l.status === 'error').length;
  const totalBudgetIngested = logs
    .filter((l) => l.status === 'success' && l.data?.estimated_budget_mnt)
    .reduce((acc, curr) => acc + (curr.data?.estimated_budget_mnt || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-900 pb-16 font-sans">
      
      {/* 1. Sleek Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Үндсэн самбар руу буцах</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                TENDER<span className="text-blue-600">HUB</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold tracking-wider uppercase">
                AI Ingestion Pipeline
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>OpenAI & Supabase Ready</span>
            </div>
            <Link
              href="/"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>Сайт дээр харах</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* 2. Visual 3-Step Pipeline Guide */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-medium backdrop-blur-md mb-3 border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Автоматжуулсан дата цуглуулагч</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Төрийн тендерийн PDF баримтыг AI-аар задлан оруулах
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Монгол Улсын Засгийн газрын худалдан авах ажиллагааны цахим баримт бичгийг (PDF) оруулахад AI автоматаар текстийг шинжлэн, төсөв, салбар, захиалагч, шалгуур үзүүлэлтүүдийг ялгаж баазад шууд хадгална.
            </p>
          </div>

          {/* 3 Step Visual Badges */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div>
                <div className="text-xs font-bold text-white">PDF / Холбоос оруулах</div>
                <div className="text-[11px] text-slate-400">Файл чирж эсвэл URL оруулна</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div>
                <div className="text-xs font-bold text-white">OpenAI Structured JSON</div>
                <div className="text-[11px] text-slate-400">10 талбартай стандартын дагуу</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div>
                <div className="text-xs font-bold text-white">Шууд Баазад хадгалах</div>
                <div className="text-[11px] text-slate-400">Supabase & UI дээр шууд харагдана</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ingestion Methods Hub */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>PDF Файл(ууд) хуулах</span>
              </button>
              <button
                onClick={() => setActiveTab('urls')}
                className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'urls'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Олон PDF URL оруулах</span>
              </button>
            </div>

            <button
              onClick={handleRunSampleDemo}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Жишээ туршиж үзэх</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'upload' ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
                }`}
              >
                <div className="h-14 w-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Тендерийн PDF баримтаа энд чирж оруулна уу
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                  Нэг дор хэдэн ч PDF файл сонгож болох бөгөөд систем тус бүрийг дарааллуулан AI-аар боловсруулна.
                </p>

                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl inline-flex items-center gap-2 text-xs shadow-md transition-all active:scale-95">
                  <FileText className="h-4 w-4" />
                  <span>Компьютерээс PDF сонгох</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileInputChange}
                    disabled={isProcessing}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      PDF файлын цахим холбоосууд (Мөр тус бүрт 1 URL):
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Жишээ: tender.gov.mn/file.pdf</span>
                  </div>
                  <textarea
                    rows={5}
                    value={urlsInput}
                    onChange={(e) => setUrlsInput(e.target.value)}
                    placeholder="https://tender.gov.mn/documents/2024-tender-01.pdf&#10;https://tender.gov.mn/documents/2024-tender-02.pdf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                    <span>Систем URL-аас PDF-ийг автоматаар татан авч AI шинжилгээ хийнэ.</span>
                  </p>
                  <button
                    onClick={handleProcessUrls}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>Бүх холбоосыг боловсруулах</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ingestion Batch Progress Bar */}
            {isProcessing && (
              <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Боловсруулж байна: {processedCount} / {totalInBatch}</span>
                  </div>
                  <span>{Math.round((processedCount / (totalInBatch || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((processedCount / (totalInBatch || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Live Stats Overview Cards */}
        {logs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Амжилттай орсон</div>
                <div className="text-xl font-extrabold text-slate-900">{totalSuccess} баримт</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Нийт төсвийн дүн</div>
                <div className="text-lg font-extrabold text-blue-700">{totalBudgetIngested.toLocaleString()} ₮</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Алдаатай гарсан</div>
                <div className="text-xl font-extrabold text-rose-600">{totalError} баримт</div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Logs & Extracted JSON Inspector Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Processed Items History List (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-slate-600" />
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Боловсруулалтын жагсаалт ({logs.length})
                </span>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Цэвэрлэх
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-slate-300" />
                  <p>Одоогоор ямар нэгэн баримт боловсруулаагүй байна.</p>
                  <p className="text-[11px] text-slate-400">Дээрх хэсгээр PDF файл сонгон боловсруулна уу.</p>
                </div>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-4 transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Status Icon */}
                      {log.status === 'loading' && (
                        <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {log.status === 'success' && (
                        <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {log.status === 'error' && (
                        <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">{log.source}</span>
                          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-mono">
                            {log.duration && <span>{log.duration}s</span>}
                            <span>•</span>
                            <span>{log.timestamp}</span>
                          </div>
                        </div>

                        {log.status === 'success' && log.data && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-xs font-semibold text-blue-900 line-clamp-1">
                              {log.data.tender_id}: {log.data.project_title_mn}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                {log.data.buyer_name}
                              </span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                {log.data.estimated_budget_mnt?.toLocaleString()} ₮
                              </span>
                              <span className="font-medium bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded">
                                {log.data.sector}
                              </span>
                            </div>
                          </div>
                        )}

                        {log.error && (
                          <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                            {log.error}
                          </div>
                        )}
                      </div>

                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Inspector Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  AI Шинжилгээний үр дүн
                </span>
              </div>
              {selectedLog?.data && (
                <button
                  onClick={() => handleCopyJson(selectedLog.data, selectedLog.id)}
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedId === selectedLog.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === selectedLog.id ? 'Хуулагдлаа' : 'JSON Хуулах'}</span>
                </button>
              )}
            </div>

            {selectedLog?.data ? (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1 text-xs">
                
                {/* Title & Tender ID Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] font-mono">
                      {selectedLog.data.tender_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {selectedLog.data.sector}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {selectedLog.data.project_title_mn}
                  </h4>
                </div>

                {/* Procuring Entity & Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Захиалагч байгууллага
                    </span>
                    <p className="font-semibold text-slate-800 line-clamp-2">
                      {selectedLog.data.buyer_name}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Төсөвт өртөг
                    </span>
                    <p className="font-black text-emerald-700 text-sm">
                      {selectedLog.data.estimated_budget_mnt?.toLocaleString()} ₮
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedLog.data.budget_category}
                    </span>
                  </div>
                </div>

                {/* Technical Requirements */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ListChecks className="h-4 w-4 text-blue-600" />
                    <span>Шалгуур үзүүлэлтүүд (3-5 Requirements):</span>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {selectedLog.data.key_requirements?.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Historical Comparison */}
                {selectedLog.data.historical_comparison_notes && (
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Түүхэн харьцуулалтын тэмдэглэл
                    </span>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      {selectedLog.data.historical_comparison_notes}
                    </p>
                  </div>
                )}

                {/* Action CTA */}
                <div className="pt-2">
                  <Link
                    href={`/?search=${encodeURIComponent(selectedLog.data.tender_id)}`}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-2xs"
                  >
                    <span>Сайтын үндсэн жагсаалтаас харах</span>
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </Link>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <Eye className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Шинжилсэн өгөгдөл сонгогдоогүй байна</p>
                <p className="text-[11px] max-w-xs">
                  Зүүн талын жагсаалтаас аль нэг амжилттай боловсруулагдсан баримт дээр дарж дэлгэрэнгүй үзүүлэлтүүдийг шалгана уу.
                </p>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

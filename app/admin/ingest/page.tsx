'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Globe, Database, ArrowLeft, Sparkles,
  Building2, Layers, Calendar, DollarSign, ListChecks,
  Copy, Check, ExternalLink, RefreshCw, Eye, Play,
  FileCheck2, Trophy, Users, TrendingDown, ChevronRight,
  HelpCircle, ShieldCheck, Tag, BarChart3, ArrowUpRight
} from 'lucide-react';
import { TenderStructuredData } from '@/lib/ingestion/llm-extractor';
import { SimilarTenderWithWinner, MarketIntelligenceSummary } from '@/lib/ingestion/similar-finder';

interface ProcessLog {
  id: string;
  source: string;
  timestamp: string;
  status: 'loading' | 'success' | 'error';
  data?: TenderStructuredData;
  similarTenders?: SimilarTenderWithWinner[];
  marketIntelligence?: MarketIntelligenceSummary;
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
  const [inspectorTab, setInspectorTab] = useState<'specs' | 'winners' | 'market'>('winners');
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
          similarTenders: result.similarTenders,
          marketIntelligence: result.marketIntelligence,
          dbSaved: result.dbSaved,
          error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
          duration,
        };

        setLogs((prev) => prev.map((l) => (l.id === logId ? updatedLog : l)));
        if (updatedLog.status === 'success') {
          setSelectedLog(updatedLog);
          // Default to winners tab if similar tenders found
          if (updatedLog.similarTenders && updatedLog.similarTenders.length > 0) {
            setInspectorTab('winners');
          }
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
      alert('Хамгийн багадаа 1 хүчинтэй PDF URL оруулна уу.');
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
          similarTenders: result.similarTenders,
          marketIntelligence: result.marketIntelligence,
          dbSaved: result.dbSaved,
          error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
          duration,
        };

        setLogs((prev) => prev.map((l) => (l.id === logId ? updatedLog : l)));
        if (updatedLog.status === 'success') {
          setSelectedLog(updatedLog);
          if (updatedLog.similarTenders && updatedLog.similarTenders.length > 0) {
            setInspectorTab('winners');
          }
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
      'https://www.tender.gov.mn/documents/sample-mining-equipment.pdf\nhttps://www.tender.gov.mn/documents/sample-hospital-devices.pdf'
    );
  };

  const totalSuccess = logs.filter((l) => l.status === 'success').length;
  const totalError = logs.filter((l) => l.status === 'error').length;
  const totalBudgetIngested = logs
    .filter((l) => l.status === 'success' && l.data?.estimated_budget_mnt)
    .reduce((acc, curr) => acc + (curr.data?.estimated_budget_mnt || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-900 pb-16 font-sans">
      
      {/* 1. Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Үндсэн самбар</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                TENDER<span className="text-blue-600">HUB</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold tracking-wider uppercase">
                PDF Analytics & Winner Discovery
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Ingest & Winner Matcher Active</span>
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
        
        {/* 2. Visual Value Proposition Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 text-xs font-semibold backdrop-blur-md mb-3 border border-amber-400/20">
              <Trophy className="h-3.5 w-3.5" />
              <span>Төстэй тендерүүд & Ялагч нийлүүлэгчдийг илрүүлэгч</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Өөрийн PDF тендерээ уншуулаад, өмнөх ялагчид & үнийн дүнг шууд хар
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Та дурын төрийн тендерийн PDF баримтаа оруулснаар манай систем шаардлагуудыг задлан шинжлэхээс гадна <strong>өмнө нь тухайн захиалагчийн ижил төстэй тендерүүдэд аль компани ямар үнээр шалгарсан</strong> түүхэн үр дүнг автоматаар харьцуулан харуулна.
            </p>
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
                  Тендерийн PDF баримтаа энд чирж оруулах
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                  Тендерийн өгөгдөл, шалгуурууд, төстэй түүхэн тендерүүд болон ялагчдыг шууд харах боломжтой.
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
                    rows={4}
                    value={urlsInput}
                    onChange={(e) => setUrlsInput(e.target.value)}
                    placeholder="https://tender.gov.mn/documents/2024-tender-01.pdf&#10;https://tender.gov.mn/documents/2024-tender-02.pdf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                    <span>Систем PDF-ийг уншиж AI шинжилгээ болон ялагчийн харьцуулалтыг хийнэ.</span>
                  </p>
                  <button
                    onClick={handleProcessUrls}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>Боловсруулж эхлэх</span>
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

        {/* 4. Split View: Processed Items List & Comprehensive Intelligence Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Processed Items History List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-slate-600" />
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Шинжилсэн баримтууд ({logs.length})
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

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-slate-300" />
                  <p>Одоогоор шинжилсэн баримт байхгүй байна.</p>
                  <p className="text-[11px] text-slate-400">Дээрх хэсгээр өөрийн PDF баримтыг оруулна уу.</p>
                </div>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  const winnersCount = log.similarTenders?.filter(s => s.winner).length || 0;

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
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
                        </div>

                        {log.status === 'success' && log.data && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-xs font-semibold text-blue-900 line-clamp-1">
                              {log.data.tender_id}: {log.data.project_title_mn}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                {log.data.estimated_budget_mnt?.toLocaleString()} ₮
                              </span>
                              {winnersCount > 0 && (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-[10px]">
                                  <Trophy className="h-3 w-3 text-amber-600" />
                                  <span>{winnersCount} ялагч олдсон</span>
                                </span>
                              )}
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

          {/* Detailed Inspector Panel with Winners & Competitors (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col">
            
            {/* Top Inspector Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setInspectorTab('winners')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    inspectorTab === 'winners'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>Төстэй тендер & Ялагчид</span>
                  {selectedLog?.similarTenders && selectedLog.similarTenders.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${inspectorTab === 'winners' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {selectedLog.similarTenders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setInspectorTab('specs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    inspectorTab === 'specs'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>PDF Шаардлагууд</span>
                </button>

                <button
                  onClick={() => setInspectorTab('market')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    inspectorTab === 'market'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Өрсөлдөөний зах зээл</span>
                </button>
              </div>

              {selectedLog?.data && (
                <button
                  onClick={() => handleCopyJson(selectedLog.data, selectedLog.id)}
                  className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Бүх JSON-ийг хуулах"
                >
                  {copiedId === selectedLog.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === selectedLog.id ? 'Хуулагдлаа' : 'JSON'}</span>
                </button>
              )}
            </div>

            {selectedLog?.data ? (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[540px] pr-1 text-xs">
                
                {/* Active Tender Brief Banner */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] font-mono">
                        {selectedLog.data.tender_id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                        {selectedLog.data.sector}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {selectedLog.data.project_title_mn}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Захиалагч: <span className="font-semibold text-slate-800">{selectedLog.data.buyer_name}</span> | Төсөвт өртөг: <span className="font-bold text-emerald-700">{selectedLog.data.estimated_budget_mnt?.toLocaleString()} ₮</span>
                    </p>
                  </div>
                  <Link
                    href={`/?search=${encodeURIComponent(selectedLog.data.tender_id)}`}
                    className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Сайт дээр харах"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>

                {/* TAB 1: SIMILAR TENDERS & REAL WINNERS */}
                {inspectorTab === 'winners' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span>Төстэй өмнөх тендерүүд & Шалгарсан ялагчид ({selectedLog.similarTenders?.length || 0}):</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Үнийн дүн & Үнэлгээний шийдвэр</span>
                    </div>

                    {(!selectedLog.similarTenders || selectedLog.similarTenders.length === 0) ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                        Энэхүү захиалагч эсвэл салбарт яг төстэй өмнөх тендер одоогоор бүртгэгдээгүй байна.
                      </div>
                    ) : (
                      selectedLog.similarTenders.map((sim, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                  {sim.tenderCode}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                  {sim.publishDate || 'Түүхэн'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold">
                                  {sim.matchReason}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-900 text-xs leading-snug">
                                {sim.tenderName}
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Захиалагч: <span className="text-slate-700 font-medium">{sim.budgetEntityName}</span> | Нийт төсөв: <strong className="text-slate-900">{sim.totalBudget?.toLocaleString()} ₮</strong>
                              </p>
                            </div>

                            <Link
                              href={`/tender/${sim.invitationId}`}
                              target="_blank"
                              className="shrink-0 text-blue-600 hover:text-blue-800 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                              title="Тендерийн дэлгэрэнгүйг үзэх"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </div>

                          {/* Winner Spotlight Banner */}
                          {sim.winner ? (
                            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                                  <Trophy className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                  <span>Шалгарсан нийлүүлэгч: {sim.winner.supplierName}</span>
                                  {sim.winner.registerNumber && (
                                    <span className="text-[10px] font-normal text-emerald-700">
                                      (РД: {sim.winner.registerNumber})
                                    </span>
                                  )}
                                </div>
                                {sim.winner.commentText && (
                                  <p className="text-[11px] text-emerald-800 italic">
                                    Дүгнэлт: &ldquo;{sim.winner.commentText}&rdquo;
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-extrabold text-emerald-800">
                                  {sim.winner.winningAmount > 0 ? `${sim.winner.winningAmount.toLocaleString()} ₮` : 'Гэрээ байгуулсан'}
                                </div>
                                {sim.winner.discountPercent > 0 && (
                                  <div className="text-[10px] font-bold text-emerald-600">
                                    Төсвөөс {sim.winner.discountPercent}% хямдарсан
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                              <span>Төлөв: {sim.docStatusName}</span>
                              <span className="text-slate-400">Оролцсон: {sim.biddersCount || 1} компани</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: PDF SPECS & TECHNICAL REQUIREMENTS */}
                {inspectorTab === 'specs' && (
                  <div className="space-y-3">
                    {/* Requirements List */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                        <ListChecks className="h-4 w-4 text-blue-600" />
                        <span>PDF-ээс ялгасан гол шалгуур үзүүлэлтүүд:</span>
                      </div>
                      <ul className="space-y-1.5 pl-1">
                        {selectedLog.data.key_requirements?.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Historical Comparison Notes */}
                    {selectedLog.data.historical_comparison_notes && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                          Түүхэн харьцуулалтын тэмдэглэл (LLM Insight)
                        </span>
                        <p className="text-[11px] text-indigo-900 leading-relaxed">
                          {selectedLog.data.historical_comparison_notes}
                        </p>
                      </div>
                    )}

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Төсвийн ангилал</span>
                        <span className="font-semibold text-slate-800 text-[11px] font-mono">{selectedLog.data.budget_category}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Нийтэлсэн огноо</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{selectedLog.data.publish_date}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Хугацааны он</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{selectedLog.data.deadline_year}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: MARKET INTELLIGENCE & COMPETITORS */}
                {inspectorTab === 'market' && (
                  <div className="space-y-3">
                    {selectedLog.marketIntelligence ? (
                      <>
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                            <span className="text-[10px] font-bold text-blue-700 uppercase block">Дундаж хөнгөлөлт</span>
                            <span className="text-lg font-black text-blue-950">
                              {selectedLog.marketIntelligence.avgDiscountPercent}%
                            </span>
                            <span className="text-[9px] text-blue-600 block">төсвөөс доогуур</span>
                          </div>

                          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
                            <span className="text-[10px] font-bold text-purple-700 uppercase block">Өрсөлдөгчид</span>
                            <span className="text-lg font-black text-purple-950">
                              ~{selectedLog.marketIntelligence.avgBiddersCount}
                            </span>
                            <span className="text-[9px] text-purple-600 block">оролцогч/тендер</span>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Өрсөлдөөний түвшин</span>
                            <span className="text-xs font-black text-emerald-950 uppercase block mt-1">
                              {selectedLog.marketIntelligence.estimatedCompetitionLevel === 'high' ? 'Өндөр' : selectedLog.marketIntelligence.estimatedCompetitionLevel === 'medium' ? 'Дунд' : 'Бага'}
                            </span>
                          </div>
                        </div>

                        {/* Top Winning Competitors */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                            <Users className="h-4 w-4 text-indigo-600" />
                            <span>Тус захиалагчийн шалгарч байсан топ нийлүүлэгчид:</span>
                          </div>

                          {selectedLog.marketIntelligence.topPastWinners.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Тодорхой ялагчийн дата олдсонгүй.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {selectedLog.marketIntelligence.topPastWinners.map((w, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="font-bold text-slate-900">{w.name}</span>
                                  </div>
                                  <div className="text-right text-[11px]">
                                    <span className="font-bold text-emerald-700">{w.totalWonAmount > 0 ? `${w.totalWonAmount.toLocaleString()} ₮` : `${w.winCount} удаа ялсан`}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recommendation Note */}
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Үнийн санал өгөх зөвлөмж:</strong> {selectedLog.marketIntelligence.pricingRecommendation}</span>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs">Өрсөлдөөний дата ачааллаж байна...</div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
                <Eye className="h-8 w-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Шинжилсэн өгөгдөл сонгогдоогүй байна</p>
                <p className="text-[11px] max-w-xs">
                  Зүүн талын жагсаалтаас баримт дээр дарж төстэй тендерүүд болон ялагч нийлүүлэгчдийн түүхэн мэдээллийг харна уу.
                </p>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}

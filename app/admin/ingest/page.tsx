'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Globe, Database, ArrowLeft, Sparkles,
  Building2, Layers, Calendar, DollarSign, ListChecks
} from 'lucide-react';
import { TenderStructuredData } from '@/lib/ingestion/llm-extractor';

interface ProcessLog {
  id: string;
  source: string;
  timestamp: string;
  status: 'loading' | 'success' | 'error';
  data?: TenderStructuredData;
  dbSaved?: boolean;
  error?: string;
}

export default function AdminIngestPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'urls'>('upload');
  const [urlsInput, setUrlsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderStructuredData | null>(null);

  // PDF File(s) Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const logId = `${Date.now()}-${i}`;

      setLogs((prev) => [
        {
          id: logId,
          source: file.name,
          timestamp: new Date().toLocaleTimeString(),
          status: 'loading',
        },
        ...prev,
      ]);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/admin/ingest', {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();

        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: res.ok && result.success ? 'success' : 'error',
                  data: result.data,
                  dbSaved: result.dbSaved,
                  error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
                }
              : l
          )
        );
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
    }
    setIsProcessing(false);
    // Reset file input
    e.target.value = '';
  };

  // Bulk URLs Ingestion Handler
  const handleProcessUrls = async () => {
    const urls = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    if (urls.length === 0) {
      alert('Хамгийн багадаа нэг зөв PDF URL оруулна уу.');
      return;
    }

    setIsProcessing(true);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const logId = `${Date.now()}-${i}`;

      setLogs((prev) => [
        {
          id: logId,
          source: url,
          timestamp: new Date().toLocaleTimeString(),
          status: 'loading',
        },
        ...prev,
      ]);

      try {
        const res = await fetch('/api/admin/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const result = await res.json();

        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: res.ok && result.success ? 'success' : 'error',
                  data: result.data,
                  dbSaved: result.dbSaved,
                  error: result.error || (result.dbError ? `DB Warning: ${result.dbError}` : undefined),
                }
              : l
          )
        );
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
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                <span>Буцах</span>
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Admin Tool</span>
            </div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-400" />
              <span>TenderHub Data Ingestion Pipeline</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Төрийн худалдан авах ажиллагааны PDF баримтуудаас AI ашиглан бүтэцлэгдсэн өгөгдөл ялгаж баазад хадгалах
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
            <Database className="h-4 w-4 text-emerald-400" />
            <span>Supabase / Postgres Ready</span>
          </div>
        </div>

        {/* Input Methods Card */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-5 shadow-xl backdrop-blur-md">
          {/* Mode Switch Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3 mb-5">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>PDF Файл(ууд) хуулах</span>
            </button>
            <button
              onClick={() => setActiveTab('urls')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'urls'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Олон PDF URL оруулах</span>
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="border-2 border-dashed border-slate-600/80 hover:border-blue-500 rounded-xl p-8 text-center transition-all bg-slate-900/40">
              <Upload className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Тендерийн PDF баримтыг энд чирж оруулах эсвэл сонгоно уу
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Нэг дор олон PDF файл сонгож бөөнөөр боловсруулах боломжтой
              </p>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-2 text-xs shadow-lg transition-transform active:scale-95">
                <FileText className="h-4 w-4" />
                <span>PDF Файл сонгох</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                PDF татах цахим холбоосууд (Мөр тус бүрт 1 URL):
              </label>
              <textarea
                rows={5}
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                placeholder="https://tender.gov.mn/documents/tender-001.pdf&#10;https://tender.gov.mn/documents/tender-002.pdf"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleProcessUrls}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Бүх холбоосыг боловсруулж баазад оруулах</span>
              </button>
            </div>
          )}
        </div>

        {/* Processing Logs & Live Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Logs List (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-800/60 rounded-xl border border-slate-700/60 overflow-hidden shadow-xl">
            <div className="p-3.5 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Боловсруулалтын түүх ({logs.length})</span>
              {isProcessing && (
                <span className="flex items-center gap-1.5 text-blue-400 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Ажиллаж байна...</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-700/40 max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Одоогоор ямар нэгэн баримт боловсруулаагүй байна. Дээрх талбараар PDF файл оруулна уу.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => log.data && setSelectedTender(log.data)}
                    className={`p-3.5 text-xs transition-colors flex items-start gap-3 cursor-pointer ${
                      selectedTender?.tender_id === log.data?.tender_id
                        ? 'bg-blue-950/40 border-l-2 border-blue-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {log.status === 'loading' && (
                      <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                    )}
                    {log.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {log.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200 truncate">{log.source}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                      </div>

                      {log.status === 'success' && log.data && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-blue-300 font-medium truncate">
                            {log.data.tender_id}: {log.data.project_title_mn}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{log.data.buyer_name}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">
                              {log.data.estimated_budget_mnt?.toLocaleString()} ₮
                            </span>
                          </div>
                        </div>
                      )}

                      {log.error && (
                        <p className="mt-1 text-rose-400 text-[11px] bg-rose-950/30 p-1.5 rounded border border-rose-900/50">
                          {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Extracted JSON Preview & Details (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-800/60 rounded-xl border border-slate-700/60 p-4 shadow-xl flex flex-col">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span>Шинжилсэн өгөгдөл (Preview)</span>
              {selectedTender && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {selectedTender.sector}
                </span>
              )}
            </div>

            {selectedTender ? (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] text-xs pr-1">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Тендерийн нэр & Дугаар</span>
                    <p className="font-bold text-slate-100">{selectedTender.project_title_mn}</p>
                    <span className="text-[11px] text-blue-400 font-mono">{selectedTender.tender_id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Захиалагч</span>
                      <p className="text-slate-300 font-medium truncate">{selectedTender.buyer_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Төсөвт өртөг</span>
                      <p className="text-emerald-400 font-bold">
                        {selectedTender.estimated_budget_mnt?.toLocaleString()} ₮
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Нийтэлсэн</span>
                      <p className="text-slate-300">{selectedTender.publish_date}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Ангилал</span>
                      <p className="text-amber-400">{selectedTender.budget_category}</p>
                    </div>
                  </div>
                </div>

                {/* Key requirements */}
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <ListChecks className="h-3 w-3 text-blue-400" />
                    <span>Гол шалгуур үзүүлэлтүүд</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {selectedTender.key_requirements?.map((req, i) => (
                      <li key={i} className="text-[11px] leading-relaxed">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Historical comparison notes */}
                {selectedTender.historical_comparison_notes && (
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Түүхэн харьцуулалтын тэмдэглэл
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedTender.historical_comparison_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-slate-500 text-xs">
                Зүүн талын жагсаалтаас баримт сонгож бүтэн JSON өгөгдлийг харна уу.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

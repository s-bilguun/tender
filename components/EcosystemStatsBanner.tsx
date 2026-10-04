'use client';

import React, { useEffect, useState } from 'react';
import { Locale } from '@/lib/types';
import { 
  Building2, TrendingUp, ShieldCheck, 
  Globe2, Sparkles, FileCheck, ArrowUpRight
} from 'lucide-react';

interface EcosystemStatsBannerProps {
  locale: Locale;
  onOpenDocAudit?: () => void;
  onOpenFinance?: () => void;
  onOpenChinaSupplier?: () => void;
}

export const EcosystemStatsBanner: React.FC<EcosystemStatsBannerProps> = ({
  locale,
  onOpenDocAudit,
  onOpenFinance,
  onOpenChinaSupplier,
}) => {
  const [stats, setStats] = useState({
    companyCount: 1493,
    openTenderCount: 504,
    openTenderAmount: 476966840488,
    financeAmount: 20273607704,
    chineseSuppliers: 19000,
  });

  useEffect(() => {
    // Attempt to fetch fresh live ecosystem figures from gateway
    fetch('https://gateway.tenderhub.mn/services/thcore/public/summary')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.openTenderCount) {
          setStats((prev) => ({
            ...prev,
            companyCount: data.companyCount || prev.companyCount,
            openTenderCount: data.openTenderCount || prev.openTenderCount,
            openTenderAmount: data.openTenderAmount || prev.openTenderAmount,
            financeAmount: data.financeAmount || prev.financeAmount,
          }));
        }
      })
      .catch(() => {
        // Fallback to latest verified figures
      });
  }, []);

  const formatBillion = (amount: number) => {
    const billion = amount / 1_000_000_000;
    return `₮ ${billion.toFixed(1)} тэрбум`;
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden mb-8">
      {/* Glow effect */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Header Tag */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {locale === 'mn' ? 'Монголын Худалдан Авалтын AI Экосистем' : 'Mongolia Procurement AI Ecosystem'}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              ISO 27001
            </span>
          </div>

          {/* Quick Ecosystem Action Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenDocAudit && (
              <button
                onClick={onOpenDocAudit}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/90 hover:bg-purple-600 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-purple-400/30 hover:scale-105"
              >
                <FileCheck className="h-3.5 w-3.5 text-purple-200" />
                <span>ТББ Шалгагч AI</span>
              </button>
            )}

            {onOpenFinance && (
              <button
                onClick={onOpenFinance}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-emerald-400/30 hover:scale-105"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                <span>Баталгаа & Санхүүжилт</span>
              </button>
            )}

            {onOpenChinaSupplier && (
              <button
                onClick={onOpenChinaSupplier}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/90 hover:bg-rose-600 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-rose-400/30 hover:scale-105"
              >
                <Globe2 className="h-3.5 w-3.5 text-rose-200" />
                <span>🇨🇳 Хятадаас нийлүүлэх</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Title & Subtext */}
        <div className="max-w-3xl mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-2">
            Тендерээс бизнесийн экосистем рүү.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Төрийн болон B2B хувийн хэвшлийн тендерийг хиймэл оюунаар шинжлэх, 
            бичиг баримтын зөрүүг шалгах, санхүүжилт ба баталгаа гаргуулах, 19,000+ нийлүүлэгчтэй холбогдох цогц систем.
          </p>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Tenders */}
          <div className="bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Нээлттэй тендерүүд
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.openTenderCount.toLocaleString()}+
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Зарлагдсан төсөв:</span>
              <span className="text-blue-300 font-bold">{formatBillion(stats.openTenderAmount)}</span>
            </div>
          </div>

          {/* Card 2: Registered Companies */}
          <div className="bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Бүртгэлтэй байгууллага
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.companyCount.toLocaleString()}+
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Баталгаажсан нийлүүлэгчид & худалдан авагчид
            </div>
          </div>

          {/* Card 3: Sourcing & Suppliers */}
          <div className="bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Хятад нийлүүлэгчид
              </span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <Globe2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              19,000+
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Tender2China шууд үнийн санал авах сүлжээ
            </div>
          </div>

          {/* Card 4: Guarantees & Trade Finance */}
          <div className="bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Баталгаа & Санхүүжилт
              </span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatBillion(stats.financeAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Тендерийн & Гүйцэтгэлийн баталгааны хүсэлтүүд
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

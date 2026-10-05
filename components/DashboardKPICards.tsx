'use client';

import React, { useEffect, useState } from 'react';
import { Locale } from '@/lib/types';
import { 
  TrendingUp, Building2, Globe2, ShieldCheck, 
  ArrowUpRight, Sparkles, FileCheck, Layers, CheckCircle2
} from 'lucide-react';

interface DashboardKPICardsProps {
  locale: Locale;
  onFilterActive?: () => void;
  onOpenDocAudit?: () => void;
  onOpenFinance?: () => void;
  onOpenChinaSupplier?: () => void;
}

export const DashboardKPICards: React.FC<DashboardKPICardsProps> = ({
  locale,
  onFilterActive,
  onOpenDocAudit,
  onOpenFinance,
  onOpenChinaSupplier,
}) => {
  const [stats, setStats] = useState({
    openTenderCount: 504,
    openTenderAmount: 476966840488,
    companyCount: 1493,
    financeAmount: 20273607704,
    chineseSuppliers: 19000,
  });

  useEffect(() => {
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
        // Fallback gracefully
      });
  }, []);

  const formatBillion = (amount: number) => {
    const billion = amount / 1_000_000_000;
    return `₮ ${billion.toFixed(1)} тэрбум`;
  };

  const formatBillionShort = (amount: number) => {
    const billion = amount / 1_000_000_000;
    return `₮${billion.toFixed(1)}B`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: Live Pulse Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{locale === 'mn' ? 'Монголын Төрийн & B2B Худалдан Авалтын Шууд Самбар' : locale === 'zh' ? '蒙古国政府采购与B2B出海投标实时数据中心' : 'Mongolia Procurement & Sourcing Dashboard'}</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            ISO 27001
          </span>
        </div>

        {/* Quick Trigger Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDocAudit && (
            <button
              onClick={onOpenDocAudit}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 flex items-center gap-1.5 transition-all cursor-pointer hover:border-purple-600"
            >
              <FileCheck className="h-3.5 w-3.5 text-purple-400" />
              <span>ТББ Шалгагч AI</span>
            </button>
          )}

          {onOpenFinance && (
            <button
              onClick={onOpenFinance}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-800/60 flex items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-600"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Баталгаа & Санхүүжилт</span>
            </button>
          )}

          {onOpenChinaSupplier && (
            <button
              onClick={onOpenChinaSupplier}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 flex items-center gap-1.5 transition-all cursor-pointer hover:border-rose-600"
            >
              <Globe2 className="h-3.5 w-3.5 text-rose-400" />
              <span>🇨🇳 Хятад Нийлүүлэгч</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Clean Horizontal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Tenders */}
        <div 
          onClick={onFilterActive}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 transition-all duration-200 group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'mn' ? 'Нээлттэй тендерүүд' : locale === 'zh' ? '正在招标中' : 'Active Tenders'}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {stats.openTenderCount.toLocaleString()}+
            </span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              +18 өнөөдөр
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Зарлагдсан төсөв:</span>
            <span className="text-blue-400 font-bold font-mono">{formatBillionShort(stats.openTenderAmount)}</span>
          </div>
        </div>

        {/* KPI 2: Total Budget Volume */}
        <div className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 group shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'mn' ? 'Нийт төсөвт өртөг' : locale === 'zh' ? '招标总预算规模' : 'Total Budget Volume'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {formatBillion(stats.openTenderAmount)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Байгууллагууд:</span>
            <span className="text-emerald-400 font-bold font-mono">{stats.companyCount.toLocaleString()}+ Захиалагч</span>
          </div>
        </div>

        {/* KPI 3: Cross-Border Suppliers */}
        <div 
          onClick={onOpenChinaSupplier}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all duration-200 group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'mn' ? 'Хятад Нийлүүлэгчид' : locale === 'zh' ? '跨境认证供应商' : 'Cross-Border Suppliers'}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
              <Globe2 className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {stats.chineseSuppliers.toLocaleString()}+
            </span>
            <span className="text-xs font-medium text-rose-400">
              Tender2China
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Шууд үнийн санал:</span>
            <span className="text-rose-400 font-bold">🇨🇳 Үйлдвэрийн үнэ</span>
          </div>
        </div>

        {/* KPI 4: Trade Finance & Guarantee */}
        <div 
          onClick={onOpenFinance}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 transition-all duration-200 group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'mn' ? 'Баталгаа & Санхүүжилт' : locale === 'zh' ? '投标保函与融资' : 'Guarantees & Finance'}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {formatBillion(stats.financeAmount)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Шийдвэрлэх хугацаа:</span>
            <span className="text-purple-400 font-bold font-mono">15 мин (Онлайн)</span>
          </div>
        </div>

      </div>
    </div>
  );
};

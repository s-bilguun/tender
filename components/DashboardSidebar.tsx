'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/types';
import { 
  LayoutDashboard, Database, Building2, Bookmark, 
  FileUp, Sparkles, ShieldCheck, Globe2, 
  FileCheck2, ChevronRight, ChevronLeft, X, ExternalLink,
  Layers, ArrowUpRight, Cpu, CheckCircle2, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface DashboardSidebarProps {
  activeSection?: string;
  onSelectSection?: (section: string) => void;
  savedCount?: number;
  locale: Locale;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAI: () => void;
  onOpenDocAudit?: () => void;
  onOpenFinance?: () => void;
  onOpenChinaSupplier?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeSection = 'dashboard',
  onSelectSection,
  savedCount = 0,
  locale,
  isOpenMobile,
  onCloseMobile,
  onOpenAI,
  onOpenDocAudit,
  onOpenFinance,
  onOpenChinaSupplier,
}) => {
  const pathname = usePathname();
  const isAdminIngest = pathname === '/admin/ingest';
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tenderhub_sidebar_collapsed');
      if (saved === 'true') setIsCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tenderhub_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard',
      labelMn: 'Хяналтын самбар',
      labelEn: 'Dashboard Overview',
      labelZh: '控制台概览',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      href: '#dashboard',
    },
    {
      id: 'database',
      labelMn: 'Тендерийн сан',
      labelEn: 'Tender Database',
      labelZh: '招标项目全库',
      icon: Database,
      badge: '504+',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      href: '#database',
    },
    {
      id: 'buyers',
      labelMn: 'Захиалагч байгууллагууд',
      labelEn: 'Buyer Intelligence',
      labelZh: '采购方大数据',
      icon: Building2,
      badge: '1,493',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      href: '#buyers',
    },
    {
      id: 'watchlist',
      labelMn: 'Миний хянаж буй',
      labelEn: 'My Saved Bids',
      labelZh: '我的关注项目',
      icon: Bookmark,
      badge: savedCount > 0 ? String(savedCount) : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
      href: '#watchlist',
    },
  ];

  const handleNavClick = (id: string, href: string) => {
    onSelectSection?.(id);
    onCloseMobile();
    
    // Smooth scroll to anchor if on page
    if (href.startsWith('#')) {
      const el = document.getElementById(href.substring(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Left Sidebar Panel (Responsive width with collapse toggle) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
        } ${
          isOpenMobile ? 'w-[260px] translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="h-16 px-3 sm:px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
            <Link 
              href="/" 
              className={`flex items-center gap-2.5 group cursor-pointer ${isCollapsed ? 'justify-center w-full' : ''}`}
              onClick={onCloseMobile}
              title="TenderHub MN"
            >
              <Logo className="h-8 w-8 shrink-0 drop-shadow-md group-hover:scale-105 transition-transform" />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                      TENDER<span className="text-blue-500">HUB</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600/15 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-mono">
                      MN
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    B2B SaaS Engine
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Дэлгэх (Expand)' : 'Хураах (Collapse)'}
              aria-label="Toggle sidebar collapse"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Primary Navigation */}
          <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)] no-scrollbar">
            
            {/* Core Views */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {locale === 'mn' ? 'Үндсэн хэсэг' : locale === 'zh' ? '核心导航' : 'Main Navigation'}
                </div>
              )}
              
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = !isAdminIngest && activeSection === item.id;
                const label = locale === 'mn' ? item.labelMn : locale === 'zh' ? item.labelZh : item.labelEn;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id, item.href)}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-500'
                      }`} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                        isActive 
                          ? 'bg-white/20 text-white border-white/30' 
                          : item.badgeColor
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* AI & Automation Suite */}
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{locale === 'mn' ? 'Хиймэл Оюун & Админ' : locale === 'zh' ? '智能分析与管理' : 'AI & Management'}</span>
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
              )}

              {/* Requirement 1: Prominent Link to PDF Ingestion (Admin) */}
              <Link
                href="/admin/ingest"
                onClick={onCloseMobile}
                title={isCollapsed ? (locale === 'mn' ? 'PDF задлан оруулах' : 'AI PDF Ingestion') : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-xs font-semibold transition-all group border ${
                  isAdminIngest
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-lg shadow-blue-600/30'
                    : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-white border-blue-200 dark:border-blue-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300">
                    <FileUp className="h-4 w-4 shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col text-left min-w-0">
                      <span className="truncate font-bold">
                        {locale === 'mn' ? 'PDF задлан оруулах' : locale === 'zh' ? 'PDF智能解析入库' : 'AI PDF Ingestion'}
                      </span>
                      <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 truncate">
                        {locale === 'mn' ? 'Баримт бичиг & Ялагчид' : 'Auto-extract Specs & Bids'}
                      </span>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-400/30">
                    Admin
                  </span>
                )}
              </Link>

              {/* AI Doc Audit Trigger */}
              {onOpenDocAudit && (
                <button
                  onClick={() => {
                    onOpenDocAudit();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'ТББ Шалгагч AI' : 'AI Tender Doc Audit') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform shrink-0" />
                    {!isCollapsed && <span>{locale === 'mn' ? 'ТББ Шалгагч AI' : 'AI Tender Doc Audit'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
                </button>
              )}

              {/* Tender Finance Trigger */}
              {onOpenFinance && (
                <button
                  onClick={() => {
                    onOpenFinance();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'Баталгаа & Санхүүжилт' : 'Bank Guarantees') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
                    {!isCollapsed && <span>{locale === 'mn' ? 'Баталгаа & Санхүүжилт' : 'Bank Guarantees'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
                </button>
              )}

              {/* Sourcing Modal Trigger */}
              {onOpenChinaSupplier && (
                <button
                  onClick={() => {
                    onOpenChinaSupplier();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'Хятадаас нийлүүлэх' : 'Tender2China Sourcing') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
                    {!isCollapsed && <span>{locale === 'mn' ? 'Хятадаас нийлүүлэх' : 'Tender2China Sourcing'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />}
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Profile / Quick Action Card */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-3">
          
          {/* Ask AI Assistant Primary Button */}
          <button
            onClick={() => {
              onOpenAI();
              onCloseMobile();
            }}
            title={isCollapsed ? (locale === 'mn' ? 'AI Шинжээч' : 'Ask AI') : undefined}
            className={`w-full ${isCollapsed ? 'h-10 px-2' : 'h-10 px-3.5'} rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer`}
          >
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse shrink-0" />
            {!isCollapsed && <span>{locale === 'mn' ? 'AI Шинжээчээс асуух' : locale === 'zh' ? '向AI专家提问' : 'Ask AI Specialist'}</span>}
          </button>

          {/* System Status Pill */}
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tender.gov.mn Sync</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">100% OK</span>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};

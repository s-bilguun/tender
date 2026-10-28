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
, Crown } from 'lucide-react';
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
  onOpenPricing?: () => void;
  activeCount?: number;
  lastUpdatedAt?: string | null;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  lastUpdatedAt,
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
  onOpenPricing,
  activeCount,
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
      badge: undefined as string | undefined,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      href: '#dashboard',
    },
    {
      id: 'database',
      labelMn: 'Тендерийн сан',
      labelEn: 'Tender Database',
      labelZh: '招标项目全库',
      icon: Database,
      badge: activeCount ? activeCount.toLocaleString() : undefined,
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      href: '#database',
    },
    {
      id: 'buyers',
      labelMn: 'Захиалагч байгууллагууд',
      labelEn: 'Buyer Intelligence',
      labelZh: '采购方大数据',
      icon: Building2,
      badge: undefined,
      badgeColor: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
      href: '#buyers',
    },
    {
      id: 'watchlist',
      labelMn: 'Миний хянаж буй',
      labelEn: 'My Saved Bids',
      labelZh: '我的关注项目',
      icon: Bookmark,
      badge: savedCount > 0 ? String(savedCount) : undefined,
      badgeColor: 'bg-slate-100 dark:bg-zinc-800 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
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
          className="fixed inset-0 bg-black/80 z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Left Sidebar Panel (Responsive width with collapse toggle) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
 isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
 } ${
 isOpenMobile ? 'w-[260px] translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
 }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="h-16 px-3 sm:px-4 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800/80">
            <Link 
              href="/" 
              className={`flex items-center gap-2.5 group cursor-pointer ${isCollapsed ? 'justify-center w-full' : ''}`}
              onClick={onCloseMobile}
              title="TenderHub MN"
            >
              <Logo className="h-8 w-8 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[15px] tracking-tight text-slate-900 dark:text-white">
                      TenderHub
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 ">
                    {locale === 'zh' ? '蒙古国政府采购' : locale === 'en' ? 'Mongolia public procurement' : 'Төрийн худалдан авалт'}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title={isCollapsed ? (locale === 'mn' ? 'Дэлгэх' : locale === 'zh' ? '展开' : 'Expand') : (locale === 'mn' ? 'Хураах' : locale === 'zh' ? '收起' : 'Collapse')}
              aria-label="Toggle sidebar collapse"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
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
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 ">
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
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-md text-xs font-semibold transition-all group cursor-pointer ${
 isActive
 ? 'bg-slate-200/70 dark:bg-zinc-800 text-slate-900 dark:text-white'
 : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/80'
 }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${
 isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200'
 }`} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
 isActive 
 ? 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700' 
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
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-zinc-800">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>{locale === 'mn' ? 'Хэрэгслүүд' : locale === 'zh' ? '工具' : 'Tools'}</span>
                </div>
              )}

              {/* VIP Subscription Upgrade CTA */}
              {onOpenPricing && (
                <button
                  onClick={() => {
                    onOpenPricing();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'zh' ? '升级 VIP 会员' : 'VIP Membership') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-md text-xs font-medium transition-colors group border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-900 dark:text-white cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Crown className="h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" />
                    {!isCollapsed && (
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate font-semibold">
                          {locale === 'zh' ? '升级 Pro' : locale === 'mn' ? 'Pro багц' : 'Upgrade to Pro'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {locale === 'zh' ? '不限次 AI 标书翻译与导出' : locale === 'mn' ? 'Хязгааргүй AI шинжилгээ, экспорт' : 'Unlimited AI analysis and exports'}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
              )}

              {/* AI Doc Audit Trigger */}
              {onOpenDocAudit && (
                <button
                  onClick={() => {
                    onOpenDocAudit();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'ТББ Шалгагч AI' : locale === 'zh' ? 'AI 标书审核' : 'AI Tender Doc Audit') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-md text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 className="h-4 w-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                    {!isCollapsed && <span>{locale === 'zh' ? '标书合规检查' : locale === 'mn' ? 'Баримт бичиг шалгах' : 'Check bid documents'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />}
                </button>
              )}

              {/* Tender Finance Trigger */}
              {onOpenFinance && (
                <button
                  onClick={() => {
                    onOpenFinance();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'Баталгаа & Санхүүжилт' : locale === 'zh' ? '保函与融资' : 'Bank Guarantees') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-md text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                    {!isCollapsed && <span>{locale === 'zh' ? '投标保函与融资' : locale === 'mn' ? 'Баталгаа, санхүүжилт' : 'Bid guarantees'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />}
                </button>
              )}

              {/* Sourcing Modal Trigger */}
              {onOpenChinaSupplier && (
                <button
                  onClick={() => {
                    onOpenChinaSupplier();
                    onCloseMobile();
                  }}
                  title={isCollapsed ? (locale === 'mn' ? 'Хятадаас нийлүүлэх' : locale === 'zh' ? '从中国采购' : 'Tender2China Sourcing') : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-md text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/80 transition-colors group cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="h-4 w-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                    {!isCollapsed && <span>{locale === 'zh' ? '跨境供货与联合体' : locale === 'mn' ? 'Хятадаас нийлүүлэх' : 'Sourcing from China'}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300" />}
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Profile / Quick Action Card */}
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 space-y-3">
          
          {/* Ask AI Assistant Primary Button */}
          <button
            onClick={() => {
              onOpenAI();
              onCloseMobile();
            }}
            title={isCollapsed ? (locale === 'mn' ? 'AI Шинжээч' : locale === 'zh' ? 'AI 分析' : 'Ask AI') : undefined}
            className={`w-full ${isCollapsed ? 'h-10 px-2' : 'h-10 px-3.5'} rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{locale === 'mn' ? 'AI-аас асуух' : locale === 'zh' ? '询问 AI' : 'Ask AI'}</span>}
          </button>

          {/* System Status Pill */}
          {!isCollapsed && (
            <div className="px-3 py-2 rounded-md bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500 dark:text-zinc-400">{locale === 'zh' ? '数据更新' : locale === 'en' ? 'Updated' : 'Шинэчлэгдсэн'}</span>
              </div>
              <span className="text-slate-700 dark:text-zinc-300 font-medium tabular-nums">
                {lastUpdatedAt && !Number.isNaN(Date.parse(lastUpdatedAt))
                  ? new Date(lastUpdatedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'mn-MN', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
                  : 'tender.gov.mn'}
              </span>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};

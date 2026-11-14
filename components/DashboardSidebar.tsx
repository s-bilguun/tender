'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Locale, TenderFilterParams, IndustryVertical } from '@/lib/types';
import {
  Activity, Flame, FileText, Trophy, Database, Bookmark,
  Sparkles, ShieldCheck, Globe2, FileCheck2, X,
  PanelLeftClose, PanelLeft, Crown, Handshake,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { IndustryIcon } from '@/components/IndustryIcon';

interface DashboardSidebarProps {
  filters?: TenderFilterParams;
  onFilterChange?: (newFilters: Partial<TenderFilterParams>) => void;
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
  closingCount?: number;
  resultCount?: number;
  totalCount?: number;
  lastUpdatedAt?: string | null;
}

const SECTOR_LINKS: { id: IndustryVertical; mn: string; en: string; zh: string }[] = [
  { id: 'mining', mn: 'Уул уурхай', en: 'Mining', zh: '矿业重工' },
  { id: 'construction', mn: 'Барилга, зам', en: 'Construction', zh: '建筑基建' },
  { id: 'medical', mn: 'Эрүүл мэнд', en: 'Medical', zh: '医疗医药' },
  { id: 'it', mn: 'Мэдээллийн тех', en: 'IT & Network', zh: '信息技术' },
  { id: 'stationery', mn: 'Тавилга, сургууль', en: 'Furniture & Edu', zh: '文教家具' },
  { id: 'food', mn: 'Хүнс, хангамж', en: 'Food & Agri', zh: '食品农牧' },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  filters,
  onFilterChange,
  lastUpdatedAt,
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
  closingCount,
  resultCount,
  totalCount,
}) => {
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

  const t = (mn: string, en: string, zh: string) =>
    locale === 'zh' ? zh : locale === 'en' ? en : mn;

  const currentTab = filters?.tabMode || 'active';
  const currentIndustry = filters?.industry || 'all';
  const currentEligibility = filters?.chinaEligibility || 'all';
  const hasDocsActive = Boolean(filters?.hasDocs);

  const applyFilter = (patch: Partial<TenderFilterParams>) => {
    onFilterChange?.(patch);
    onCloseMobile();
    const el = document.getElementById('database');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const viewItems = [
    {
      id: 'active',
      label: t('Санал авч буй', 'Live Bids', '正在招标'),
      icon: Activity,
      active: currentTab === 'active' && !hasDocsActive,
      count: activeCount,
      onClick: () =>
        applyFilter({
          tabMode: 'active',
          status: 'receiving',
          urgency: 'all',
          hasDocs: undefined,
          page: 1,
        }),
    },
    {
      id: 'closing_soon',
      label: t('48 цагт хаагдах', 'Closing <48h', '48h 内截标'),
      icon: Flame,
      active: currentTab === 'closing_soon',
      count: closingCount,
      onClick: () =>
        applyFilter({
          tabMode: 'closing_soon',
          status: 'receiving',
          urgency: 'urgent_48h',
          sortBy: 'deadline_asc',
          page: 1,
        }),
    },
    {
      id: 'has_docs',
      label: t('PDF / Задаргаатай', 'With PDF Specs', '含 PDF 规格书'),
      icon: FileText,
      active: hasDocsActive,
      count: undefined,
      onClick: () =>
        applyFilter({
          hasDocs: hasDocsActive ? undefined : true,
          page: 1,
        }),
    },
    {
      id: 'result',
      label: t('Шалгарсан / Үр дүн', 'Awarded', '中标结果'),
      icon: Trophy,
      active: currentTab === 'result',
      count: resultCount,
      onClick: () =>
        applyFilter({
          tabMode: 'result',
          status: 'result',
          urgency: 'all',
          page: 1,
        }),
    },
    {
      id: 'all',
      label: t('Бүх архив', 'All Archive', '全部归档'),
      icon: Database,
      active: currentTab === 'all' && !hasDocsActive,
      count: totalCount,
      onClick: () =>
        applyFilter({
          tabMode: 'all',
          status: 'all',
          urgency: 'all',
          hasDocs: undefined,
          page: 1,
        }),
    },
    {
      id: 'watchlist',
      label: t('Хадгалсан', 'Watchlist', '我的关注'),
      icon: Bookmark,
      active: currentTab === 'watchlist',
      count: savedCount > 0 ? savedCount : undefined,
      onClick: () => applyFilter({ tabMode: 'watchlist', page: 1 }),
    },
  ];

  const sectionHeading = 'px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500';
  const navBtnClass = (active: boolean) =>
    `w-full flex items-center ${
      isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-2.5 py-1.5'
    } rounded-md text-xs transition-colors cursor-pointer ${
      active
        ? 'bg-slate-100 dark:bg-zinc-800/90 text-slate-900 dark:text-white font-semibold'
        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-900 font-medium'
    }`;

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-all duration-200 lg:static lg:translate-x-0 ${
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-56'
        } ${isOpenMobile ? 'w-56 translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Branding & Navigation */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="h-14 px-3 flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 shrink-0">
            <Link
              href="/"
              className={`flex items-center gap-2 min-w-0 cursor-pointer ${
                isCollapsed ? 'justify-center w-full' : ''
              }`}
              onClick={onCloseMobile}
              title="TenderHub MN"
            >
              <Logo className="h-7 w-7 shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                    TenderHub
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                    {t('Төрийн худалдан авалт', 'Mongolia Procurement', '蒙古国政府采购')}
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isCollapsed ? t('Дэлгэх', 'Expand', '展开') : t('Хураах', 'Collapse', '收起')}
              aria-label="Toggle sidebar collapse"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Filter Sections */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
            {/* Section 1: Views */}
            <div>
              {!isCollapsed && <div className={sectionHeading}>{t('Төлөв', 'Views', '视图')}</div>}
              <div className="space-y-0.5">
                {viewItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      title={isCollapsed ? item.label : undefined}
                      className={navBtnClass(item.active)}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            item.active
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-400 dark:text-zinc-500'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!isCollapsed && item.count != null && (
                        <span className="text-[11px] tabular-nums text-slate-400 dark:text-zinc-500 ml-2">
                          {item.count.toLocaleString('en-US')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Sectors */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900">
              {!isCollapsed && <div className={sectionHeading}>{t('Салбар', 'Sectors', '行业')}</div>}
              <div className="space-y-0.5">
                {SECTOR_LINKS.map((sec) => {
                  const active = currentIndustry === sec.id;
                  const label = locale === 'zh' ? sec.zh : locale === 'en' ? sec.en : sec.mn;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => applyFilter({ industry: active ? 'all' : sec.id, page: 1 })}
                      title={isCollapsed ? label : undefined}
                      className={navBtnClass(active)}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <IndustryIcon
                          id={sec.id}
                          className={`h-3.5 w-3.5 shrink-0 ${
                            active
                              ? 'text-slate-900 dark:text-white'
                              : 'text-slate-400 dark:text-zinc-500'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{label}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Foreign Bidders */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900">
              {!isCollapsed && (
                <div className={sectionHeading}>{t('Гадаад ААН', 'Cross-Border', '外企准入')}</div>
              )}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() =>
                    applyFilter({
                      chinaEligibility: currentEligibility === 'direct' ? 'all' : 'direct',
                      page: 1,
                    })
                  }
                  title={isCollapsed ? t('Шууд оролцох', 'Direct Foreign Bid', '可独立直投') : undefined}
                  className={navBtnClass(currentEligibility === 'direct')}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                    {!isCollapsed && (
                      <span className="truncate">{t('Шууд оролцох', 'Direct Foreign Bid', '可独立直投')}</span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyFilter({
                      chinaEligibility: currentEligibility === 'joint_venture' ? 'all' : 'joint_venture',
                      page: 1,
                    })
                  }
                  title={isCollapsed ? t('Түншлэл (JV)', 'Local JV Required', '需联合体 (JV)') : undefined}
                  className={navBtnClass(currentEligibility === 'joint_venture')}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Handshake className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                    {!isCollapsed && (
                      <span className="truncate">{t('Түншлэл (JV)', 'Local JV Required', '需联合体 (JV)')}</span>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Section 4: Tools */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900">
              {!isCollapsed && <div className={sectionHeading}>{t('Хэрэгсэл', 'Tools', '工具')}</div>}
              <div className="space-y-0.5">
                {onOpenDocAudit && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDocAudit();
                      onCloseMobile();
                    }}
                    title={isCollapsed ? t('Баримт шалгах', 'Check bid documents', '标书合规检查') : undefined}
                    className={navBtnClass(false)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                      {!isCollapsed && (
                        <span className="truncate">
                          {t('Баримт шалгах', 'Check bid documents', '标书合规检查')}
                        </span>
                      )}
                    </span>
                  </button>
                )}
                {onOpenFinance && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFinance();
                      onCloseMobile();
                    }}
                    title={isCollapsed ? t('Баталгаа, санхүү', 'Bid guarantees', '保函与融资') : undefined}
                    className={navBtnClass(false)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                      {!isCollapsed && (
                        <span className="truncate">{t('Баталгаа, санхүү', 'Bid guarantees', '保函与融资')}</span>
                      )}
                    </span>
                  </button>
                )}
                {onOpenChinaSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChinaSupplier();
                      onCloseMobile();
                    }}
                    title={isCollapsed ? t('Түнш & Нийлүүлэлт', 'Sourcing / JV Partner', '跨境供货与合作') : undefined}
                    className={navBtnClass(false)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                      {!isCollapsed && (
                        <span className="truncate">
                          {t('Түнш & Нийлүүлэлт', 'Sourcing / JV Partner', '跨境供货与合作')}
                        </span>
                      )}
                    </span>
                  </button>
                )}
                {onOpenPricing && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPricing();
                      onCloseMobile();
                    }}
                    title={isCollapsed ? t('Багцууд', 'Plans', '会员方案') : undefined}
                    className={navBtnClass(false)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Crown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                      {!isCollapsed && (
                        <span className="truncate">{t('Pro багцууд', 'Plans', '会员方案')}</span>
                      )}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Ask AI & Updated time */}
        <div className="p-2.5 border-t border-slate-200 dark:border-zinc-800 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onOpenAI();
              onCloseMobile();
            }}
            title={isCollapsed ? t('AI-аас асуух', 'Ask AI', '询问 AI') : undefined}
            className={`w-full h-9 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            {!isCollapsed && <span>{t('AI-аас асуух', 'Ask AI', '询问 AI')}</span>}
          </button>

          {!isCollapsed && (
            <div className="px-2 py-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('Шинэчлэл', 'Updated', '同步')}
              </span>
              <span className="tabular-nums">
                {lastUpdatedAt && !Number.isNaN(Date.parse(lastUpdatedAt))
                  ? new Date(lastUpdatedAt).toLocaleString(
                      locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-GB' : 'mn-MN',
                      {
                        timeZone: 'Asia/Ulaanbaatar',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }
                    )
                  : 'tender.gov.mn'}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

'use client';

import React, { useState, useRef } from 'react';
import { Locale, TenderStats } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';
import { Sparkles, Search, Menu, X, Sun, Moon, Crown } from 'lucide-react';

interface HeaderProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  stats?: TenderStats;
  onOpenAI: () => void;
  onOpenPricing?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleMobileSidebar?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onSelectSuggestion?: (query: string) => void;
  activeSectionTitle?: string;
}

const QUICK_SEARCHES: { query: string; mn: string; en: string; zh: string }[] = [
  { query: 'Сургууль', mn: 'Сургууль, цэцэрлэг', en: 'Schools', zh: '学校' },
  { query: 'Мэдээллийн технологи', mn: 'Мэдээллийн технологи', en: 'IT & Network', zh: '信息技术' },
  { query: 'Зам засвар', mn: 'Зам засвар', en: 'Road repair', zh: '道路维修' },
  { query: 'Эмнэлэг', mn: 'Эмнэлэг, эм', en: 'Hospitals', zh: '医院与药品' },
  { query: 'Барилга', mn: 'Барилга', en: 'Construction', zh: '建筑' },
  { query: 'Хоол', mn: 'Хоол, хүнс', en: 'Food', zh: '食品' },
  { query: 'Кабель', mn: 'Кабель', en: 'Cables', zh: '电缆' },
];

export const Header: React.FC<HeaderProps> = ({
  locale,
  setLocale,
  onOpenAI,
  onOpenPricing,
  onOpenCommandPalette,
  onToggleMobileSidebar,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onSelectSuggestion,
  activeSectionTitle,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsSearchFocused(false);
      onSearchSubmit?.();
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    }
  };

  const showSuggestions = isSearchFocused && searchValue.trim() === '' && Boolean(onSelectSuggestion);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 transition-colors">
      {/* Left Section: Mobile Menu Trigger & Breadcrumb */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <span className="font-medium text-slate-600 dark:text-zinc-300">TenderHub</span>
          <span className="text-slate-300 dark:text-zinc-700">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            {activeSectionTitle ||
              (locale === 'mn' ? 'Тендерийн сан' : locale === 'zh' ? '招标库' : 'Tenders')}
          </span>
        </div>
      </div>

      {/* Center Section: Command Search Bar with Inline Quick Suggestions */}
      <div className="relative flex-1 max-w-xl mx-1 sm:mx-4">
        <div
          className={`relative flex items-center h-9 w-full rounded-md bg-slate-100/80 dark:bg-zinc-900 border transition-colors ${
            isSearchFocused
              ? 'border-slate-400 dark:border-zinc-600 bg-white dark:bg-zinc-900'
              : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="pl-2.5 pr-2 flex items-center pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={
              locale === 'mn'
                ? 'Тендерийн нэр, код, захиалагч хайх...'
                : locale === 'zh'
                ? '搜索标讯名称、编号、采购单位...'
                : 'Search tender title, code, buyer...'
            }
            className="w-full text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 bg-transparent focus:outline-hidden"
          />

          <div className="flex items-center gap-1 pr-1.5 shrink-0">
            {searchValue ? (
              <button
                type="button"
                onClick={() => {
                  onSearchChange?.('');
                  onSearchSubmit?.();
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                title="Command Palette (⌘K)"
              >
                <span>⌘K</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Quick Keyword Suggestions Popover (replaces permanent GlobalSearchBar strip) */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-11 z-40 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-2.5">
            <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {locale === 'zh' ? '常用搜索关键词' : locale === 'en' ? 'Quick keywords' : 'Түгээмэл хайлт'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSearchChange?.(item.query);
                    onSelectSuggestion?.(item.query);
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  }}
                  className="h-7 px-2.5 rounded-md text-xs font-medium bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:hover:bg-white dark:hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  {locale === 'zh' ? item.zh : locale === 'en' ? item.en : item.mn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Section: Theme Toggle, Language Switcher, Plans & Ask AI */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="hidden sm:flex h-8 w-8 rounded-md items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer shrink-0"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={
            theme === 'dark'
              ? locale === 'mn'
                ? 'Гэгээлэг горим'
                : locale === 'zh'
                ? '浅色模式'
                : 'Light mode'
              : locale === 'mn'
              ? 'Харанхуй горим'
              : locale === 'zh'
              ? '深色模式'
              : 'Dark mode'
          }
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* 3-Way Language Toggle (MN / EN / ZH) */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-900 rounded-md p-0.5 border border-slate-200 dark:border-zinc-800 shrink-0">
          {(['mn', 'en', 'zh'] as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className={`h-7 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                locale === loc
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={loc === 'mn' ? 'Монгол' : loc === 'en' ? 'English' : '中文'}
            >
              {loc === 'mn' ? 'MN' : loc === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>

        {onOpenPricing && (
          <button
            onClick={onOpenPricing}
            className="hidden sm:flex h-8 px-2.5 rounded-md text-xs font-medium bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Crown className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">
              {locale === 'zh' ? '会员' : locale === 'mn' ? 'Багцууд' : 'Plans'}
            </span>
          </button>
        )}

        <button
          onClick={onOpenAI}
          className="h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">
            {locale === 'mn' ? 'AI-аас асуух' : locale === 'zh' ? '询问 AI' : 'Ask AI'}
          </span>
        </button>
      </div>
    </header>
  );
};

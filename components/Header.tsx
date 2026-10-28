'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Locale, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Sparkles, Globe, Clock, Search, Menu, 
  Command, CornerDownLeft, X, Layers, Sun, Moon, Crown
} from 'lucide-react';

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
  activeSectionTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  locale,
  setLocale,
  stats,
  onOpenAI,
  onOpenPricing,
  onOpenCommandPalette,
  onToggleMobileSidebar,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  activeSectionTitle,
}) => {
  const t = getTranslation(locale);
  const { theme, toggleTheme } = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit?.();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 transition-colors">
      
      {/* Left Section: Mobile Menu Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <span className="text-slate-600 dark:text-zinc-300">TenderHub</span>
          <span className="text-slate-400 dark:text-zinc-600">/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            {activeSectionTitle || (locale === 'mn' ? 'Хяналтын самбар' : locale === 'zh' ? '控制台概览' : 'Dashboard')}
          </span>
        </div>
      </div>

      {/* Center Section: Global Search Bar with Cmd+K Trigger */}
      <div className="flex-1 max-w-xl mx-2 sm:mx-4">
        <div
          className={`relative flex items-center h-10 w-full rounded-md bg-slate-100/90 dark:bg-zinc-900 border transition-all ${
 isSearchFocused
 ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-zinc-900/95'
 : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
 }`}
        >
          {/* Search Icon */}
          <div className="pl-3 pr-2 flex items-center pointer-events-none text-slate-400">
            <Search className={`h-4 w-4 transition-colors ${isSearchFocused ? 'text-blue-500' : 'text-slate-400'}`} />
          </div>

          {/* Search Input */}
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
                ? 'Тендерийн нэр, дугаар, түлхүүр үг (⌘K)...'
                : locale === 'zh'
                ? '搜索标讯名称、编号、关键词 (⌘K)...'
                : 'Search tender title, ID, buyer, or keyword (⌘K)...'
            }
            className="w-full text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 bg-transparent focus:outline-hidden"
          />

          {/* Clear & Cmd+K Shortcut */}
          <div className="flex items-center gap-1.5 pr-2 shrink-0">
            {searchValue ? (
              <button
                onClick={() => {
                  onSearchChange?.('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
                title="Command Palette (⌘K)"
              >
                <kbd className="text-[10px]">⌘</kbd>
                <span>K</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Language Toggle, Theme Toggle & AI Assistant */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Global Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="hidden sm:flex h-8 w-8 rounded-md items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer shrink-0"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? (locale === 'mn' ? 'Гэгээлэг горим' : locale === 'zh' ? '浅色模式' : 'Light mode') : (locale === 'mn' ? 'Харанхуй горим' : locale === 'zh' ? '深色模式' : 'Dark mode')}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* 3-Way Language Toggle (MN / EN / ZH) */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-900 rounded-md p-0.5 border border-slate-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setLocale('mn')}
            className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
 locale === 'mn'
 ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
            title="Монгол хэл (Mongolian)"
          >
            MN
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
 locale === 'en'
 ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
            title="English"
          >
            EN
          </button>
          <button
            onClick={() => setLocale('zh')}
            className={`h-7 px-2 sm:px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
 locale === 'zh'
 ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
 : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
 }`}
            title="中文 (Chinese)"
          >
            <span>中文</span>
          </button>
        </div>

        {/* VIP Subscription / Pricing Button */}
        {onOpenPricing && (
          <button
            onClick={onOpenPricing}
            className="hidden sm:flex h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Crown className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">
              {locale === 'zh' ? '会员方案' : locale === 'mn' ? 'Багцууд' : 'Plans'}
            </span>
          </button>
        )}

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAI}
          className="h-8 px-2.5 sm:px-3.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
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

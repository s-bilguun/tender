'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Locale, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { 
  Sparkles, Globe, Clock, Search, Menu, 
  Command, CornerDownLeft, X, Layers
} from 'lucide-react';

interface HeaderProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  stats?: TenderStats;
  onOpenAI: () => void;
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
  onOpenCommandPalette,
  onToggleMobileSidebar,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  activeSectionTitle,
}) => {
  const t = getTranslation(locale);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit?.();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
      
      {/* Left Section: Mobile Menu Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="text-slate-300">TenderHub</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-bold tracking-tight">
            {activeSectionTitle || (locale === 'mn' ? 'Хяналтын самбар' : locale === 'zh' ? '智选控制台' : 'Dashboard')}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
      </div>

      {/* Center Section: Global Search Bar with Cmd+K Trigger */}
      <div className="flex-1 max-w-xl mx-2 sm:mx-4">
        <div
          className={`relative flex items-center h-10 w-full rounded-xl bg-slate-900 border transition-all ${
            isSearchFocused
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-900/95'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {/* Search Icon */}
          <div className="pl-3 pr-2 flex items-center pointer-events-none text-slate-400">
            <Search className={`h-4 w-4 transition-colors ${isSearchFocused ? 'text-blue-400' : 'text-slate-400'}`} />
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
            className="w-full text-xs sm:text-sm text-slate-100 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />

          {/* Clear & Cmd+K Shortcut */}
          <div className="flex items-center gap-1.5 pr-2 shrink-0">
            {searchValue ? (
              <button
                onClick={() => {
                  onSearchChange?.('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                title="Command Palette (⌘K)"
              >
                <kbd className="text-[10px]">⌘</kbd>
                <span>K</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Language Toggle & AI Assistant */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* 3-Way Language Toggle (MN / EN / ZH) */}
        <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 shrink-0">
          <button
            onClick={() => setLocale('mn')}
            className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              locale === 'mn'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Монгол хэл"
          >
            MN
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              locale === 'en'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="English"
          >
            EN
          </button>
          <button
            onClick={() => setLocale('zh')}
            className={`h-7 px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              locale === 'zh'
                ? 'bg-red-600 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="中文 (Chinese)"
          >
            <span className="hidden sm:inline">🇨🇳</span>
            <span>中文</span>
          </button>
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAI}
          className="h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">
            {locale === 'mn' ? 'AI Шинжээч' : locale === 'zh' ? 'AI 专家' : 'AI Assistant'}
          </span>
        </button>

      </div>
    </header>
  );
};

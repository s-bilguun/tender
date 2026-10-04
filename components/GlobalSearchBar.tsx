'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, CornerDownLeft } from 'lucide-react';
import { Locale } from '@/lib/types';

interface GlobalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  locale: Locale;
  totalFound?: number;
  placeholder?: string;
  onSelectSuggestion?: (query: string) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onClear,
  locale,
  totalFound,
  placeholder,
  onSelectSuggestion,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Preset Chips (One-click suggestions)
  const quickPills = [
    { label: '🏫 Сургууль, цэцэрлэг', query: 'Сургууль' },
    { label: '💻 IT & Програм', query: 'Мэдээллийн технологи' },
    { label: '🛣️ Зам, дэд бүтэц', query: 'Зам засвар' },
    { label: '⚡ 1 тэрбумаас дээш', query: '1000000000', isBudget: true },
    { label: '🏥 Эмнэлэг, эм', query: 'Эмнэлэг' },
    { label: '🏢 Барилга угсралт', query: 'Барилга' },
    { label: '🥩 Үдийн хоол & Хүнс', query: 'Хоол' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Search Input Container */}
      <div
        className={`relative flex items-center bg-white rounded-2xl border transition-all shadow-xs ${
          isFocused
            ? 'border-blue-600 ring-4 ring-blue-500/10 shadow-md'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        {/* Leading Search Icon */}
        <div className="pl-3.5 sm:pl-5 pr-2 flex items-center pointer-events-none text-slate-400">
          <Search className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${isFocused ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>

        {/* Input Field with Mobile Responsive Placeholder */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (locale === 'mn'
              ? 'Тендерийн нэр, дугаар, түлхүүр үг (жишээ: Цэцэрлэг)...'
              : 'Search tender title, ID, buyer, or keyword (e.g., School)...')
          }
          className="w-full py-3 sm:py-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden"
        />

        {/* Clear and Search Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-3 shrink-0">
          {value && (
            <button
              onClick={() => {
                onChange('');
                onClear?.();
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Цэвэрлэх"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Trigger Button (Icon button on phone, labeled button on sm+ screens) */}
          <button
            onClick={onSubmit}
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline">{locale === 'mn' ? 'Хайх' : 'Search'}</span>
            <CornerDownLeft className="h-3.5 w-3.5 opacity-80 hidden sm:inline" />
          </button>
        </div>
      </div>

      {/* Quick Preset Chips (Swipeable horizontally on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto snap-x no-scrollbar pb-1 px-0.5">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1 mr-0.5">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="hidden sm:inline">{locale === 'mn' ? 'Хурдан сонголтууд:' : 'Quick presets:'}</span>
        </span>
        {quickPills.map((pill, i) => (
          <button
            key={i}
            onClick={() => {
              onChange(pill.query);
              onSelectSuggestion?.(pill.query);
            }}
            className="px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors shrink-0 cursor-pointer border border-slate-200/60 hover:border-blue-200 snap-start active:scale-95"
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
};

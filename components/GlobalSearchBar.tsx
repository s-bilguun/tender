'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';
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

  const quickPills = [
    { label: 'Барилга угсралт', query: 'Барилга' },
    { label: 'Програм хангамж / МТ', query: 'Програм хангамж' },
    { label: 'Эм, эмнэлгийн хэрэгсэл', query: 'Эмнэлэг' },
    { label: 'Шатахуун & Тээвэр', query: 'Шатахуун' },
    { label: 'Үдийн цай & Хүнс', query: 'Үдийн хоол' },
    { label: 'Эрдэнэт үйлдвэр', query: 'Эрдэнэт үйлдвэр' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Search Input Box */}
      <div
        className={`relative flex items-center bg-white rounded-2xl border transition-all shadow-xs ${
          isFocused
            ? 'border-blue-600 ring-4 ring-blue-500/10 shadow-md'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        {/* Leading Magnifying Glass Icon */}
        <div className="pl-4 sm:pl-5 pr-2 flex items-center pointer-events-none text-slate-400">
          <Search className={`h-5 w-5 transition-colors ${isFocused ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>

        {/* Input */}
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
              ? 'Тендерийн нэр, дугаар, захиалагч, бараа ажил хайх (жишээ: CAT6 кабель, зам засвар, Эрдэнэт)...'
              : 'Search tender title, ID, procuring entity, products, or specifications...')
          }
          className="w-full py-3.5 sm:py-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
        />

        {/* Action Controls */}
        <div className="flex items-center gap-2 pr-2 sm:pr-3 shrink-0">
          {value && (
            <button
              onClick={() => {
                onChange('');
                onClear?.();
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Цэвэрлэх"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={onSubmit}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Хайх' : 'Search'}</span>
            <CornerDownLeft className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>{locale === 'mn' ? 'Түгээмэл:' : 'Popular:'}</span>
        </span>
        {quickPills.map((pill, i) => (
          <button
            key={i}
            onClick={() => {
              onChange(pill.query);
              onSelectSuggestion?.(pill.query);
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors shrink-0 cursor-pointer border border-transparent hover:border-blue-200"
          >
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
};

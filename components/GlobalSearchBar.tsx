'use client';

import React from 'react';
import { X } from 'lucide-react';
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

// Queries stay in Mongolian because tender titles on tender.gov.mn are Mongolian.
const QUICK_SEARCHES: { query: string; mn: string; en: string; zh: string }[] = [
  { query: 'Сургууль', mn: 'Сургууль, цэцэрлэг', en: 'Schools', zh: '学校' },
  { query: 'Мэдээллийн технологи', mn: 'Мэдээллийн технологи', en: 'IT', zh: '信息技术' },
  { query: 'Зам засвар', mn: 'Зам засвар', en: 'Road repair', zh: '道路维修' },
  { query: 'Эмнэлэг', mn: 'Эмнэлэг, эм', en: 'Hospitals', zh: '医院与药品' },
  { query: 'Барилга', mn: 'Барилга', en: 'Construction', zh: '建筑' },
  { query: 'Хоол', mn: 'Хоол, хүнс', en: 'Food', zh: '食品' },
  { query: 'Кабель', mn: 'Кабель', en: 'Cables', zh: '电缆' },
];

/**
 * Common searches shown above the tender list. The search box itself lives in
 * the header so there is only one place to type a query.
 */
export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  value,
  onChange,
  onClear,
  locale,
  onSelectSuggestion,
}) => {
  const active = value.trim().toLowerCase();
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <span className="text-xs text-slate-500 dark:text-zinc-400 shrink-0 mr-1">
        {locale === 'zh' ? '常用搜索' : locale === 'en' ? 'Common searches' : 'Түгээмэл хайлт'}
      </span>
      {QUICK_SEARCHES.map((item) => {
        const selected = active === item.query.toLowerCase();
        return (
          <button
            key={item.query}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (selected) {
                onChange('');
                onClear?.();
                return;
              }
              onChange(item.query);
              onSelectSuggestion?.(item.query);
            }}
            className={`h-7 px-2.5 rounded-md text-xs shrink-0 whitespace-nowrap border transition-colors cursor-pointer inline-flex items-center gap-1 ${
              selected
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600'
            }`}
          >
            {locale === 'zh' ? item.zh : locale === 'en' ? item.en : item.mn}
            {selected && <X className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
};

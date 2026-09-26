'use client';

import React, { useState, useEffect } from 'react';
import { Locale, TenderStats } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { Sparkles, Globe, Clock } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface HeaderProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  stats?: TenderStats;
  onOpenAI: () => void;
  onOpenCommandPalette?: () => void;
  onToggleAnalytics?: () => void;
  isAnalyticsOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  locale,
  setLocale,
  stats,
  onOpenAI,
  onOpenCommandPalette,
}) => {
  const t = getTranslation(locale);

  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    if (!stats?.lastUpdatedAt) {
      setFormattedTime('');
      return;
    }
    try {
      const d = new Date(stats.lastUpdatedAt);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '';
      setFormattedTime(`${getVal('year')}.${getVal('month')}.${getVal('day')} ${getVal('hour')}:${getVal('minute')}`);
    } catch {
      setFormattedTime('');
    }
  }, [stats?.lastUpdatedAt]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Logo className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-xs" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 truncate">
                TENDER<span className="text-blue-600">HUB</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono uppercase tracking-wider hidden sm:inline-block">
                MN
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 hidden md:inline-block">
                {locale === 'mn' ? 'Нэгдсэн Аналитик' : 'Market Intelligence'}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {locale === 'mn' ? 'Монголын тендерийн нэгдсэн дата & зах зээлийн платформ' : 'Centralized Tender & Market Intelligence Hub'}
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        {stats && (
          <div className="hidden md:flex items-center gap-5 text-xs text-slate-600 font-sans border-x border-slate-200 px-5">
            <div>
              <span className="text-slate-500">{t.totalTenders}:</span>{' '}
              <strong className="text-slate-900 tabular-nums">{stats.totalCount.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500">{locale === 'mn' ? 'Идэвхтэй:' : 'Active:'}</span>{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 tabular-nums text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.activeTendersCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{locale === 'mn' ? 'Сүүлийн шинэчлэл:' : 'Last updated:'}</span>{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] tabular-nums">
                <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                {formattedTime || '—'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Command Palette Trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="h-8 px-2 sm:px-2.5 rounded-md text-xs font-medium bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border border-slate-200/80 flex items-center gap-1.5 transition-colors"
              title="Шуурхай хайлт & комманд (⌘K)"
            >
              <span className="hidden sm:inline text-[11px] text-slate-600 font-medium">Комманд</span>
              <kbd className="px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'mn' ? 'en' : 'mn')}
            className="h-8 px-2 sm:px-2.5 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1 transition-colors shrink-0"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">{locale === 'mn' ? 'MN' : 'EN'}</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAI}
            className="h-8 px-2.5 sm:px-3.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">{locale === 'mn' ? 'AI Шинжээч' : 'AI Assistant'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

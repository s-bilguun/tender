'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, Layers, Download, LayoutGrid, 
  List, Bookmark, ArrowRight, CornerDownLeft, 
  ShieldCheck, Clock, X, Building2, Cpu, Stethoscope, 
  Pickaxe, Utensils, Truck, Shield, BookOpen, Scale
} from 'lucide-react';
import { TenderItem, TenderFilterParams } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
import { IndustryIcon } from './IndustryIcon';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (filters: Partial<TenderFilterParams>) => void;
  onOpenAI: (tender?: TenderItem) => void;
  onExportCSV: () => void;
  onToggleView: () => void;
  viewMode: 'table' | 'grid';
  tenders: TenderItem[];
  savedCount: number;
}

export function CommandPalette({
  isOpen,
  onClose,
  onFilterChange,
  onOpenAI,
  onExportCSV,
  onToggleView,
  viewMode,
  tenders,
  savedCount,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown for ⌘K / Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Command items builder
  const commandItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      category: 'action' | 'filter' | 'tender';
      icon: React.ReactNode;
      onSelect: () => void;
    }> = [];

    // Quick Actions
    items.push({
      id: 'action-ai',
      title: 'AI Зөвлөхөөс асуух',
      subtitle: 'Тендерийн шаардлага, дүн шинжилгээ, зөвлөгөө авах',
      category: 'action',
      icon: <Sparkles className="h-4 w-4 text-purple-600" />,
      onSelect: () => {
        onClose();
        onOpenAI();
      },
    });

    items.push({
      id: 'action-export',
      title: 'Тендерийн өгөгдлийг CSV-ээр татах',
      subtitle: 'Шүүсэн тендерүүдийн жагсаалтыг Excel / CSV файл болгож хадгалах',
      category: 'action',
      icon: <Download className="h-4 w-4 text-blue-600" />,
      onSelect: () => {
        onClose();
        onExportCSV();
      },
    });

    items.push({
      id: 'action-view-toggle',
      title: viewMode === 'table' ? 'Картын харагдац руу шилжих' : 'Хүснэгтийн харагдац руу шилжих',
      subtitle: `Одоогийн горим: ${viewMode === 'table' ? 'Хүснэгт' : 'Карт'}`,
      category: 'action',
      icon: viewMode === 'table' ? <LayoutGrid className="h-4 w-4 text-slate-600" /> : <List className="h-4 w-4 text-slate-600" />,
      onSelect: () => {
        onClose();
        onToggleView();
      },
    });

    items.push({
      id: 'action-watchlist',
      title: `Хадгалсан тендерүүдийг харах (${savedCount})`,
      subtitle: 'Таны хадгалсан болон хянаж буй боломжууд',
      category: 'action',
      icon: <Bookmark className="h-4 w-4 text-amber-600" />,
      onSelect: () => {
        onClose();
        onFilterChange({ tabMode: 'watchlist', page: 1 });
      },
    });

    items.push({
      id: 'filter-urgent',
      title: 'Шуурхай хугацаа (<48 цагт дуусах)',
      subtitle: 'Хугацаа тулсан яаралтай тендерүүд',
      category: 'filter',
      icon: <Clock className="h-4 w-4 text-rose-600" />,
      onSelect: () => {
        onClose();
        onFilterChange({ urgency: 'urgent_3d', status: 'receiving', page: 1 });
      },
    });

    items.push({
      id: 'filter-noguarantee',
      title: 'Дэнчингүй тендерүүд (0₮ БҮ)',
      subtitle: 'Тендерийн баталгаа шаардлагагүй, ЖДҮ-д ээлтэй тендерүүд',
      category: 'filter',
      icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
      onSelect: () => {
        onClose();
        onFilterChange({ maxBudget: 50000000, status: 'receiving', page: 1 });
      },
    });

    // Industries
    INDUSTRIES.forEach((ind) => {
      items.push({
        id: `ind-${ind.id}`,
        title: `${ind.labelMn} салбарын тендерүүд`,
        subtitle: ind.descriptionMn.slice(0, 50) + '...',
        category: 'filter',
        icon: <IndustryIcon id={ind.id} className="h-4 w-4 text-slate-700" />,
        onSelect: () => {
          onClose();
          onFilterChange({ industry: ind.id, page: 1 });
        },
      });
    });

    // Matching tenders if query exists
    if (query.trim()) {
      const qLower = query.toLowerCase();
      const matchedTenders = tenders
        .filter((t) => 
          (t.tenderName && t.tenderName.toLowerCase().includes(qLower)) ||
          (t.tenderCode && t.tenderCode.toLowerCase().includes(qLower)) ||
          (t.budgetEntityName && t.budgetEntityName.toLowerCase().includes(qLower))
        )
        .slice(0, 5);

      matchedTenders.forEach((tender) => {
        items.unshift({
          id: `tender-${tender.invitationId}`,
          title: tender.tenderName,
          subtitle: `${tender.tenderCode} • ${tender.budgetEntityName || 'Захиалагч'} • ₮${(tender.totalBudget || 0).toLocaleString()}`,
          category: 'tender',
          icon: <ArrowRight className="h-4 w-4 text-blue-600" />,
          onSelect: () => {
            onClose();
            window.location.href = `/tender/${tender.invitationId}`;
          },
        });
      });
    }

    // Filter items by query
    if (!query.trim()) return items;
    const qLower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(qLower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(qLower))
    );
  }, [query, tenders, viewMode, savedCount, onClose, onFilterChange, onOpenAI, onExportCSV, onToggleView]);

  // Handle arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % commandItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + commandItems.length) % commandItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commandItems[selectedIndex]) {
        commandItems[selectedIndex].onSelect();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-100">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Тендер, салбар, үйлдлээс хайх... (жишээ: барилга, AI, 0₮ БҮ)"
            className="w-full text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-50 overscroll-contain">
          {commandItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Тохирох үйлдэл эсвэл тендер олдсонгүй.
            </div>
          ) : (
            <div className="space-y-1">
              {commandItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-md shrink-0 ${isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-950' : 'text-slate-900'}`}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1 shrink-0 text-[11px] font-mono text-blue-600">
                        <span>Сонгох</span>
                        <CornerDownLeft className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ шилжих</span>
            <span>↵ сонгох</span>
          </div>
          <span>⌘K хаах</span>
        </div>
      </div>
    </div>
  );
}

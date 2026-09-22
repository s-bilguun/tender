'use client';

import React from 'react';
import { Locale, TenderFilterParams } from '@/lib/types';
import { Building2, CheckCircle2, Landmark, Sparkles, X } from 'lucide-react';

interface CompanyDiscoveryBarProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
}

export interface CompanyEntity {
  id: string;
  name: string;
  shortName: string;
  query: string;
  category: 'mining' | 'state' | 'city' | 'energy' | 'health' | 'education' | 'transport';
  icon: string;
  approxTenders: string;
  budgetEst: string;
}

export const TOP_COMPANIES: CompanyEntity[] = [
  {
    id: 'erdenet',
    name: 'Эрдэнэт үйлдвэр ТӨҮГ',
    shortName: 'Эрдэнэт үйлдвэр',
    query: 'Эрдэнэт үйлдвэр',
    category: 'mining',
    icon: '⛏️',
    approxTenders: '1,420+',
    budgetEst: '1.89 их наяд ₮',
  },
  {
    id: 'ett',
    name: 'Эрдэнэс тавантолгой ХК',
    shortName: 'Эрдэнэс Тавантолгой',
    query: 'Эрдэнэс тавантолгой',
    category: 'mining',
    icon: '⛏️',
    approxTenders: '890+',
    budgetEst: '1.45 их наяд ₮',
  },
  {
    id: 'ub_city',
    name: 'Нийслэлийн Засаг даргын тамгын газар',
    shortName: 'Улаанбаатар хот',
    query: 'Нийслэл',
    category: 'city',
    icon: '🏛️',
    approxTenders: '680+',
    budgetEst: '310 тэрбум ₮',
  },
  {
    id: 'moh',
    name: 'Эрүүл мэндийн яам',
    shortName: 'Эрүүл мэндийн яам',
    query: 'Эрүүл мэнд',
    category: 'health',
    icon: '🏥',
    approxTenders: '980+',
    budgetEst: '640 тэрбум ₮',
  },
  {
    id: 'moes',
    name: 'Боловсролын сайд / БШУЯ',
    shortName: 'Боловсролын яам',
    query: 'Боловсрол',
    category: 'education',
    icon: '🏫',
    approxTenders: '1,250+',
    budgetEst: '520 тэрбум ₮',
  },
  {
    id: 'dts4',
    name: '"ДЦС-4" ТӨХК',
    shortName: 'ДЦС-4 Эрчим хүч',
    query: 'ДЦС',
    category: 'energy',
    icon: '⚡',
    approxTenders: '340+',
    budgetEst: '290 тэрбум ₮',
  },
  {
    id: 'darkhan_steel',
    name: 'Дарханы төмөрлөгийн үйлдвэр ТӨХК',
    shortName: 'Дарханы төмөрлөг',
    query: 'Дархан төмөрлөг',
    category: 'mining',
    icon: '🏭',
    approxTenders: '410+',
    budgetEst: '380 тэрбум ₮',
  },
  {
    id: 'mongolrostsvetmet',
    name: 'Монголросцветмет ТӨҮГ',
    shortName: 'Монголросцветмет',
    query: 'Монголросцветмет',
    category: 'mining',
    icon: '💎',
    approxTenders: '260+',
    budgetEst: '210 тэрбум ₮',
  },
  {
    id: 'ubtz',
    name: 'Улаанбаатар төмөр зам ХНН',
    shortName: 'УБТЗ Төмөр зам',
    query: 'төмөр зам',
    category: 'transport',
    icon: '🚆',
    approxTenders: '320+',
    budgetEst: '280 тэрбум ₮',
  },
  {
    id: 'miat',
    name: 'МИАТ ТӨХК',
    shortName: 'МИАТ Агаарын тээвэр',
    query: 'МИАТ',
    category: 'transport',
    icon: '✈️',
    approxTenders: '190+',
    budgetEst: '140 тэрбум ₮',
  },
];

export const CompanyDiscoveryBar: React.FC<CompanyDiscoveryBarProps> = ({
  filters,
  onFilterChange,
  locale,
}) => {
  const currentSearch = (filters.search || '').trim().toLowerCase();

  const activeCompany = TOP_COMPANIES.find(
    (c) =>
      currentSearch === c.query.toLowerCase() ||
      (currentSearch && c.query.toLowerCase().includes(currentSearch)) ||
      (currentSearch && currentSearch.includes(c.shortName.toLowerCase()))
  );

  const handleSelectCompany = (comp: CompanyEntity) => {
    if (activeCompany?.id === comp.id) {
      // Toggle off
      onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 });
    } else {
      onFilterChange({ search: comp.query, sortBy: 'date_desc', page: 1 });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            {locale === 'mn' ? 'Томоохон захиалагч компаниудаар харах' : 'Browse by Top Procuring Companies'}
          </h2>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            {locale === 'mn'
              ? '— Уул уурхай, эрчим хүч, төрийн томоохон худалдан авагчдын тендерүүдийг 1 товшилтоор шүүх'
              : '— 1-click filter by major state & mining enterprises'}
          </span>
        </div>

        {activeCompany && (
          <button
            onClick={() => onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 })}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors self-start sm:self-auto flex items-center gap-1 cursor-pointer"
          >
            <span>{locale === 'mn' ? 'Бүх захиалагчийг харах' : 'View All Companies'}</span>
            <span className="text-slate-400 font-normal">✕</span>
          </button>
        )}
      </div>

      {/* Active Company Banner */}
      {activeCompany && (
        <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-200/80 rounded-lg px-3 py-1.5 text-xs text-indigo-950">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">
              {locale === 'mn' ? 'Сонгосон захиалагч:' : 'Selected Procuring Entity:'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white font-semibold px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
              <span>{activeCompany.icon}</span>
              <span>{activeCompany.name}</span>
              <span className="opacity-75">({activeCompany.approxTenders} тендер)</span>
            </span>
          </div>
          <button
            onClick={() => onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 })}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Шүүлтүүр арилгах' : 'Clear'}</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Company Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {TOP_COMPANIES.map((comp) => {
          const isSelected = activeCompany?.id === comp.id;

          return (
            <button
              key={comp.id}
              onClick={() => handleSelectCompany(comp)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                  : 'bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base">{comp.icon}</span>
                {isSelected ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 tabular-nums">
                    {comp.approxTenders}
                  </span>
                )}
              </div>

              <div>
                <span
                  className={`text-[11px] font-semibold line-clamp-1 block ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                  title={comp.name}
                >
                  {comp.shortName}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums line-clamp-1 ${
                    isSelected ? 'text-indigo-100' : 'text-slate-400'
                  }`}
                >
                  {comp.budgetEst}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

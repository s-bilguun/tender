'use client';

import React, { useState } from 'react';
import { Locale, TenderFilterParams, IndustryVertical, TenderStats } from '@/lib/types';
import { 
  Building2, Layers, Globe2, Sparkles, CheckCircle2, 
  TrendingUp, ArrowRight, ShieldCheck, Handshake, 
  Flame, Clock, ChevronRight, X, DollarSign, Search
} from 'lucide-react';
import { IndustryIcon } from '@/components/IndustryIcon';

export interface DiscoveryEntityCard {
  id: string;
  name: string;
  shortName: string;
  nameEn: string;
  query: string;
  industryId: IndustryVertical;
  icon: string;
  activeTendersCount: number;
  totalBudgetFormatted: string;
  budgetUsdEst: string;
  topGoodsMn: string[];
  topGoodsEn: string[];
  eligibility: 'direct_allowed' | 'jv_required';
  biddingTipMn: string;
  biddingTipEn: string;
}

export const DISCOVERY_BUYER_CARDS: DiscoveryEntityCard[] = [
  {
    id: 'erdenet',
    name: 'Эрдэнэт үйлдвэр ТӨҮГ',
    shortName: 'Эрдэнэт үйлдвэр',
    nameEn: 'Erdenet Mining Corporation',
    query: 'Эрдэнэт үйлдвэр',
    industryId: 'mining',
    icon: '⛏️',
    activeTendersCount: 1420,
    totalBudgetFormatted: '1.89 их наяд ₮',
    budgetUsdEst: '~$550M USD',
    topGoodsMn: ['10кВ хүчний кабель', 'Экскаваторын сэлбэг', 'Флотацийн урвалж', 'Туузан дамжуурга'],
    topGoodsEn: ['10kV Power Cables', 'Excavator Spare Parts', 'Flotation Reagents', 'Conveyor Belts'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Бараа бүтээгдэхүүний тендерт гадаадын үйлдвэрлэгч шууд оролцох боломжтой',
    biddingTipEn: 'Direct foreign bidding accepted for major industrial commodity supply',
  },
  {
    id: 'ett',
    name: 'Эрдэнэс тавантолгой ХК',
    shortName: 'Эрдэнэс Тавантолгой',
    nameEn: 'Erdenes Tavan Tolgoi JSC',
    query: 'Эрдэнэс тавантолгой',
    industryId: 'mining',
    icon: '⛏️',
    activeTendersCount: 890,
    totalBudgetFormatted: '1.45 их наяд ₮',
    budgetUsdEst: '~$420M USD',
    topGoodsMn: ['Хүнд даацын дугуй', 'Түлш, шатах тослох материал', 'Уурхайн өрөм, механизм'],
    topGoodsEn: ['Heavy Mining Tyres', 'Fuel & Lubricants', 'Drilling Machinery & Fleet'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Олон улсын нээлттэй сонгон шалгаруулалт зарладаг',
    biddingTipEn: 'Regular large-scale open international competitive bidding',
  },
  {
    id: 'moh',
    name: 'Эрүүл мэндийн яам',
    shortName: 'Эрүүл мэндийн яам',
    nameEn: 'Ministry of Health (Mongolia)',
    query: 'Эрүүл мэнд',
    industryId: 'medical',
    icon: '🏥',
    activeTendersCount: 980,
    totalBudgetFormatted: '640 тэрбум ₮',
    budgetUsdEst: '~$185M USD',
    topGoodsMn: ['CT & MRI аппарат', 'Эмнэлгийн цахилгаан ор', 'Оношлуур, урвалж', 'Хамгаалах хэрэгсэл'],
    topGoodsEn: ['CT & MRI Scanners', 'Electric Hospital Beds', 'Diagnostic Reagents', 'Medical Consumables'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Эрүүл мэндийн тусгай лиценз, CE/ISO сертификат шаардлагатай',
    biddingTipEn: 'CE/ISO medical certifications allow direct cross-border supply',
  },
  {
    id: 'moes',
    name: 'Боловсрол, шинжлэх ухааны яам',
    shortName: 'Боловсролын яам',
    nameEn: 'Ministry of Education & Science',
    query: 'Боловсрол',
    industryId: 'stationery',
    icon: '🏫',
    activeTendersCount: 1250,
    totalBudgetFormatted: '520 тэрбум ₮',
    budgetUsdEst: '~$150M USD',
    topGoodsMn: ['Сургуулийн ширээ, сандал', 'Компьютер, зөөврийн төхөөрөмж', 'Лабораторийн тоноглол'],
    topGoodsEn: ['School Desks & Chairs', 'Computers & Laptops', 'STEM Lab Equipment'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Бүх аймаг, сумын сургуулийн тавилга, IT тоног төхөөрөмжийн төвлөрсөн худалдан авалт',
    biddingTipEn: 'Nationwide school furniture & classroom technology procurement packages',
  },
  {
    id: 'ub_city',
    name: 'Нийслэлийн Засаг даргын тамгын газар',
    shortName: 'Улаанбаатар хот / НЗДТГ',
    nameEn: 'Ulaanbaatar City Municipality',
    query: 'Нийслэл',
    industryId: 'construction',
    icon: '🏛️',
    activeTendersCount: 680,
    totalBudgetFormatted: '310 тэрбум ₮',
    budgetUsdEst: '~$90M USD',
    topGoodsMn: ['Гудамжны гэрэлтүүлэг, кабель', 'Зам засварын механизм', 'Камер, хяналтын систем'],
    topGoodsEn: ['Smart Street Lighting & Cables', 'Road Repair Equipment', 'Traffic & CCTV Tech'],
    eligibility: 'jv_required',
    biddingTipMn: 'Хот тохижилт, угсралтын ажилд дотоодын түншлэл (JV) шаардлагатай',
    biddingTipEn: 'Installation & municipal civil works benefit from local JV partner matching',
  },
  {
    id: 'dts4',
    name: '"ДЦС-4" ТӨХК Эрчим хүч',
    shortName: 'ДЦС-4 Эрчим хүч',
    nameEn: 'Thermal Power Plant #4 JSC',
    query: 'ДЦС',
    industryId: 'mining',
    icon: '⚡',
    activeTendersCount: 340,
    totalBudgetFormatted: '290 тэрбум ₮',
    budgetUsdEst: '~$84M USD',
    topGoodsMn: ['Зуухны хоолой, хаалт', 'Турбины сэлбэг хэрэгсэл', 'Өндөр хүчдэлийн трансформатор'],
    topGoodsEn: ['Boiler High-Pressure Pipes', 'Turbine Rotor Spares', 'High-Voltage Transformers'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Олон улсын чанарын стандартын тохирлын гэрчилгээтэй үйлдвэрүүд шалгардаг',
    biddingTipEn: 'Requires strict ISO / ASME technical compliance certification',
  },
];

export interface DiscoverySectorCard {
  id: IndustryVertical;
  nameMn: string;
  nameEn: string;
  nameZh: string;
  icon: string;
  activeCount: number;
  totalBudgetFormatted: string;
  arbitrageGap: string;
  topItemsMn: string[];
  topItemsEn: string[];
}

export const DISCOVERY_SECTOR_CARDS: DiscoverySectorCard[] = [
  {
    id: 'mining',
    nameMn: 'Уул уурхай & Хүнд үйлдвэр',
    nameEn: 'Mining & Heavy Machinery',
    nameZh: '矿业与重型机械',
    icon: '🚜',
    activeCount: 148,
    totalBudgetFormatted: '1.89 их наяд ₮',
    arbitrageGap: '+107%',
    topItemsMn: ['Экскаватор, бульдозер', 'Хүчний кабель', 'Уурхайн дугуй', 'Сэлбэг'],
    topItemsEn: ['Excavators & Bulldozers', '10kV Power Cables', 'Mining Tyres', 'Heavy Spares'],
  },
  {
    id: 'construction',
    nameMn: 'Барилга, зам & Дэд бүтэц',
    nameEn: 'Construction & Civil Works',
    nameZh: '建筑基建与工程',
    icon: '🏗️',
    activeCount: 215,
    totalBudgetFormatted: '2.40 их наяд ₮',
    arbitrageGap: '+85%',
    topItemsMn: ['Ган хоолой, арматур', 'Сантехник, хаалт', 'Замын тоноглол', 'Тусгаарлагч'],
    topItemsEn: ['Steel Pipes & Rebar', 'Valves & Plumbing', 'Road Guardrails', 'Insulation Materials'],
  },
  {
    id: 'medical',
    nameMn: 'Эрүүл мэнд & Эмнэлгийн тоног төхөөрөмж',
    nameEn: 'Healthcare & Medical Devices',
    nameZh: '医疗器械与耗材',
    icon: '🏥',
    activeCount: 92,
    totalBudgetFormatted: '640 тэрбум ₮',
    arbitrageGap: '+122%',
    topItemsMn: ['Эмнэлгийн ор, тавилга', 'Оношилгооны тоног төхөөрөмж', 'Нэг удаагийн хэрэгсэл'],
    topItemsEn: ['Hospital Beds', 'Diagnostic Imaging', 'Surgical Consumables', 'PPE'],
  },
  {
    id: 'it',
    nameMn: 'Мэдээллийн технологи & Харилцаа холбоо',
    nameEn: 'IT Hardware & Networking',
    nameZh: '电脑网络与服务器',
    icon: '💻',
    activeCount: 64,
    totalBudgetFormatted: '380 тэрбум ₮',
    arbitrageGap: '+75%',
    topItemsMn: ['Сервер, сүлжээний төхөөрөмж', 'Компьютер, монитор', 'Хяналтын камер'],
    topItemsEn: ['Server Racks & Switches', 'Desktop PCs & Laptops', 'CCTV & Security Tech'],
  },
  {
    id: 'stationery',
    nameMn: 'Оффис, сургуулийн тавилга & Хэрэгсэл',
    nameEn: 'Furniture & Educational Supplies',
    nameZh: '办公家具与教学设备',
    icon: '🪑',
    activeCount: 78,
    totalBudgetFormatted: '310 тэрбум ₮',
    arbitrageGap: '+138%',
    topItemsMn: ['Сургуулийн партын ширээ, сандал', 'Оффис сандал', 'Ган шүүгээ'],
    topItemsEn: ['School Desks & Chairs', 'Ergonomic Office Chairs', 'Steel Cabinets'],
  },
  {
    id: 'food',
    nameMn: 'Хүнс & Хөдөө аж ахуйн нийлүүлэлт',
    nameEn: 'Food Supplies & Agriculture',
    nameZh: '食品保供与农资',
    icon: '🥩',
    activeCount: 42,
    totalBudgetFormatted: '220 тэрбум ₮',
    arbitrageGap: '+45%',
    topItemsMn: ['Үдийн цайны бүтээгдэхүүн', 'Мах, гурил, будаа', 'Хөдөө аж ахуйн техник'],
    topItemsEn: ['School Meal Supplies', 'Flour, Rice & Meat', 'Agri Machinery & Tools'],
  },
];

interface DiscoveryCardsHubProps {
  filters: TenderFilterParams;
  onFilterChange: (newFilters: Partial<TenderFilterParams>) => void;
  locale: Locale;
  totalFound: number;
  stats?: TenderStats;
}

export const DiscoveryCardsHub: React.FC<DiscoveryCardsHubProps> = ({
  filters,
  onFilterChange,
  locale,
  totalFound,
  stats,
}) => {
  const [activeHubTab, setActiveHubTab] = useState<'buyers' | 'sectors' | 'foreign'>('buyers');
  const currentSearch = (filters.search || '').trim().toLowerCase();

  const handleSelectBuyer = (buyer: DiscoveryEntityCard) => {
    const isSelected = 
      currentSearch === buyer.query.toLowerCase() || 
      currentSearch === buyer.shortName.toLowerCase();

    if (isSelected) {
      onFilterChange({ search: undefined, page: 1 });
    } else {
      onFilterChange({ search: buyer.query, page: 1 });
    }
  };

  const handleSelectSector = (sector: DiscoverySectorCard) => {
    const isSelected = filters.industry === sector.id;
    if (isSelected) {
      onFilterChange({ industry: 'all', page: 1 });
    } else {
      onFilterChange({ industry: sector.id, page: 1 });
    }
  };

  const handleSelectEligibility = (eligibility: 'all' | 'direct' | 'joint_venture') => {
    if (filters.chinaEligibility === eligibility) {
      onFilterChange({ chinaEligibility: 'all', page: 1 });
    } else {
      onFilterChange({ chinaEligibility: eligibility, page: 1 });
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      {/* 1. Header with Mode Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              {locale === 'zh'
                ? '全景采购图谱与重点标段卡片'
                : locale === 'mn'
                ? 'Худалдан авагч байгууллагууд & Салбарын дэлгэрэнгүй картууд'
                : 'Procurement Entities & Market Intelligence Cards'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'zh'
              ? '卡片展示机构采购总额、重点采购清单及外资直接投标权限'
              : locale === 'mn'
              ? 'Томоохон захиалагчдын жилийн төсөв, эрэлттэй бараа бүтээгдэхүүн, гадаад ААН оролцох боломж'
              : 'Detailed entity budgets, high-demand commodities, and direct bidding eligibility'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveHubTab('buyers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'buyers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>{locale === 'zh' ? '🏛️ 重点采购实体' : locale === 'mn' ? '🏛️ Топ захиалагчид' : '🏛️ Top Buyers'}</span>
          </button>

          <button
            onClick={() => setActiveHubTab('sectors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'sectors'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <span>{locale === 'zh' ? '🏭 行业品类行情' : locale === 'mn' ? '🏭 Салбарууд' : '🏭 Sectors & Margins'}</span>
          </button>

          <button
            onClick={() => setActiveHubTab('foreign')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'foreign'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5 text-rose-600" />
            <span>{locale === 'zh' ? '🌐 跨境通道' : locale === 'mn' ? '🌐 Гадаадын ААН' : '🌐 Cross-Border Routes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Full-Info Cards Grid */}
      <div className="p-4 sm:p-6">
        {/* Tab A: Top Buyers Profile Cards */}
        {activeHubTab === 'buyers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {DISCOVERY_BUYER_CARDS.map((buyer) => {
              const isSelected = 
                currentSearch === buyer.query.toLowerCase() || 
                currentSearch === buyer.shortName.toLowerCase();

              return (
                <div
                  key={buyer.id}
                  onClick={() => handleSelectBuyer(buyer)}
                  className={`rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between gap-3.5 cursor-pointer group relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/15 shadow-md'
                      : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl p-1.5 bg-slate-100 rounded-xl">{buyer.icon}</span>
                      
                      <div className="flex items-center gap-1.5">
                        {buyer.eligibility === 'direct_allowed' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span>{locale === 'zh' ? '🇨🇳 可独立直投' : locale === 'mn' ? 'Шууд оролцох' : 'Direct Bidding'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1">
                            <Handshake className="h-3 w-3 text-indigo-600" />
                            <span>{locale === 'zh' ? '🤝 需联合体' : locale === 'mn' ? 'Түншлэл (JV)' : 'JV Required'}</span>
                          </span>
                        )}

                        {isSelected && (
                          <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {locale === 'en' ? buyer.nameEn : buyer.name}
                    </h3>
                  </div>

                  {/* Financial & Volume Metrics Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '年采购预算规模' : locale === 'mn' ? 'Жилийн төсөв' : 'Annual Budget'}
                      </span>
                      <span className="font-extrabold text-slate-900 font-sans block mt-0.5">
                        {buyer.totalBudgetFormatted}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {buyer.budgetUsdEst}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '在办/历史标段' : locale === 'mn' ? 'Тендерийн тоо' : 'Tender Volume'}
                      </span>
                      <span className="font-black text-blue-700 font-mono text-sm sm:text-base block mt-0.5">
                        {buyer.activeTendersCount.toLocaleString()}+
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {locale === 'zh' ? '高频采购' : 'Active Buyer'}
                      </span>
                    </div>
                  </div>

                  {/* Top Needed Commodities */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {locale === 'zh' ? '主要采购商品清单：' : locale === 'mn' ? 'Гол нийлүүлэх бараа:' : 'Primary Commodities:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(locale === 'en' ? buyer.topGoodsEn : buyer.topGoodsMn).map((good, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                        >
                          {good}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Bidding Tip & Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 line-clamp-1 italic">
                      {locale === 'en' ? buyer.biddingTipEn : buyer.biddingTipMn}
                    </span>
                    <span className="text-blue-600 font-bold text-xs flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                      <span>{isSelected ? (locale === 'mn' ? 'Сонгогдсон' : 'Selected') : (locale === 'mn' ? 'Тендер үзэх' : 'View Tenders')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab B: Industrial Sectors Market Intelligence Cards */}
        {activeHubTab === 'sectors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {DISCOVERY_SECTOR_CARDS.map((sector) => {
              const isSelected = filters.industry === sector.id;

              return (
                <div
                  key={sector.id}
                  onClick={() => handleSelectSector(sector)}
                  className={`rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between gap-3.5 cursor-pointer group relative ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-4 ring-emerald-500/15 shadow-md'
                      : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xl p-1.5 bg-slate-100 rounded-xl">{sector.icon}</span>
                      
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                        {sector.arbitrageGap} {locale === 'zh' ? '采购溢价' : 'Margin Gap'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {locale === 'zh' ? sector.nameZh : locale === 'mn' ? sector.nameMn : sector.nameEn}
                    </h3>
                  </div>

                  {/* Metrics */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '总采购资金池' : locale === 'mn' ? 'Салбарын нийт төсөв' : 'Sector Budget Pool'}
                      </span>
                      <span className="font-extrabold text-slate-900 font-sans block mt-0.5">
                        {sector.totalBudgetFormatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '在办招标' : locale === 'mn' ? 'Идэвхтэй тендер' : 'Active Bids'}
                      </span>
                      <span className="font-black text-emerald-700 font-mono text-sm sm:text-base block mt-0.5">
                        {sector.activeCount}
                      </span>
                    </div>
                  </div>

                  {/* In-Demand Goods */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {locale === 'zh' ? '高频采购物资：' : locale === 'mn' ? 'Эрэлттэй бараа бүтээгдэхүүн:' : 'Top Procured Commodities:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(locale === 'en' ? sector.topItemsEn : sector.topItemsMn).map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 ml-auto group-hover:translate-x-0.5 transition-transform">
                      <span>{isSelected ? (locale === 'mn' ? 'Сонгогдсон' : 'Filtered') : (locale === 'mn' ? 'Салбараар шүүх' : 'Filter by Sector')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab C: Cross-Border Foreign Bidding Routes */}
        {activeHubTab === 'foreign' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {/* Direct Foreign Bidding Card */}
            <div
              onClick={() => handleSelectEligibility('direct')}
              className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                filters.chinaEligibility === 'direct'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-4 ring-emerald-500/15'
                  : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xl">🌐</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    100% Direct Margin
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'zh' ? '🇨🇳 独立跨境直投通道' : locale === 'mn' ? 'Гадаадын нийлүүлэгч бие даан оролцох' : 'Direct Foreign Bidding (Direct)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {locale === 'zh'
                    ? '3亿图格里克以上单项商品、设备物资采购，中企可使用中国企业执照与银行反担保函独立投标，无须设立蒙古国子公司。'
                    : locale === 'mn'
                    ? '300 сая төгрөгөөс дээш бараа бүтээгдэхүүн, тоног төхөөрөмжийн тендерт гадаадын компани шууд өөрийн нэрээр оролцох боломжтой.'
                    : 'Direct bidding for goods (>300M MNT) using foreign corporate registration and bank guarantees without local subsidiary setup.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">
                  {locale === 'mn' ? 'Шууд оролцох тендерүүд' : 'View Eligible Tenders'}
                </span>
                <ArrowRight className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            {/* JV Partner Matching Card */}
            <div
              onClick={() => handleSelectEligibility('joint_venture')}
              className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                filters.chinaEligibility === 'joint_venture'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-4 ring-indigo-500/15'
                  : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-indigo-100 text-indigo-800 rounded-xl text-xl">🤝</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Low Risk / Local Compliance
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'zh' ? '🤝 蒙古本土联合体伙伴对接' : locale === 'mn' ? 'Монголын тусгай зөвшөөрөлтэй түншээр хамтрах' : 'Local Joint Venture (JV) Match'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {locale === 'zh'
                    ? '针对建筑工程、道路施工及特种安装项目，平台撮合蒙古国持证合规联合体伙伴，蒙方负责属地资质与报关，您专注货物出厂与技术。'
                    : locale === 'mn'
                    ? 'Барилга угсралт, зам, дэд бүтцийн ажилд Монголын тусгай зөвшөөрөлтэй компаниудтай түншлэл байгуулж оролцох.'
                    : 'Match with certified Mongolian contractors for construction, civil works, and engineering tenders requiring local licenses.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700">
                  {locale === 'mn' ? 'Түншлэлтэй тендерүүд' : 'Explore JV Tenders'}
                </span>
                <ArrowRight className="h-4 w-4 text-indigo-600" />
              </div>
            </div>

            {/* Urgent Closing Soon Card */}
            <div
              onClick={() => onFilterChange({ urgency: 'urgent', tabMode: 'closing_soon', page: 1 })}
              className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between gap-4 cursor-pointer ${
                filters.tabMode === 'closing_soon'
                  ? 'border-rose-600 bg-rose-50/40 ring-4 ring-rose-500/15'
                  : 'border-slate-200 bg-white hover:border-rose-400 hover:shadow-md'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-rose-100 text-rose-800 rounded-xl text-xl">🚨</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 animate-pulse">
                    &lt; 48-72 Hours Left
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'zh' ? '⏳ 48小时内即将截标急单' : locale === 'mn' ? '⏳ Хаагдах дөхсөн яаралтай тендерүүд' : 'Urgent Closing Bids (<48h)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {locale === 'zh'
                    ? '截标时间临近、竞争对手较少的高确定性标段，支持加急报价与技术规范快速匹配。'
                    : locale === 'mn'
                    ? 'Эцсийн хугацаа ойртсон, өрсөлдөөн багатай, хурдан үнийн санал илгээх боломжтой яаралтай төслүүд.'
                    : 'High-urgency bids with impending deadlines, often featuring fewer competitors and rapid quotation opportunities.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700">
                  {locale === 'mn' ? 'Яаралтай тендер үзэх' : 'View Urgent Bids'}
                </span>
                <ArrowRight className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

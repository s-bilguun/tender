'use client';

import React, { useState } from 'react';
import { Locale, TenderFilterParams, IndustryVertical, TenderStats } from '@/lib/types';
import { 
  Building2, Layers, Globe2, Sparkles, CheckCircle2, 
  TrendingUp, ArrowRight, ShieldCheck, Handshake, 
  Flame, Clock, ChevronRight, X, DollarSign, Search,
  ArrowUpRight, Users, History, FileText
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
  trendGrowth: string;
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
    trendGrowth: '+18.4% YoY',
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
    trendGrowth: '+22.1% YoY',
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
    trendGrowth: '+14.7% YoY',
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
    trendGrowth: '+11.3% YoY',
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
    trendGrowth: '+9.5% YoY',
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
    trendGrowth: '+16.2% YoY',
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
    <section className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs overflow-hidden transition-all">
      
      {/* 1. Header with View Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              {locale === 'zh'
                ? '采购方大数据与行业分析模块'
                : locale === 'mn'
                ? 'Захиалагч байгууллагууд & Салбарын аналитик модулиуд'
                : 'Buyer Intelligence Modules & Market Sectors'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {locale === 'zh'
              ? '实时查看重点采购实体年度预算规模、主要采购商品清单及外资直接投标通道'
              : locale === 'mn'
              ? 'Томоохон захиалагчдын жилийн төсөв, эрэлттэй бараа бүтээгдэхүүний жагсаалт, шууд оролцох эрх'
              : 'Detailed entity budgets, commodity pill tags, and direct bidding eligibility status'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl gap-1 border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveHubTab('buyers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'buyers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{locale === 'zh' ? '🏛️ 重点采购实体' : locale === 'mn' ? '🏛️ Топ захиалагчид' : '🏛️ Buyer Intelligence'}</span>
          </button>

          <button
            onClick={() => setActiveHubTab('sectors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'sectors'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{locale === 'zh' ? '🏭 行业品类行情' : locale === 'mn' ? '🏭 Салбарууд' : '🏭 Sectors & Margins'}</span>
          </button>

          <button
            onClick={() => setActiveHubTab('foreign')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeHubTab === 'foreign'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>{locale === 'zh' ? '🌐 跨境通道' : locale === 'mn' ? '🌐 Гадаадын ААН' : '🌐 Cross-Border Routes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Full-Info Cards Grid */}
      <div className="p-4 sm:p-6">
        
        {/* Tab A: Buyer Intelligence Modules */}
        {activeHubTab === 'buyers' && (
          /* Requirement 1: CSS Grid (3 columns on desktop, 1 on mobile) & Standardized Height */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-200">
            {DISCOVERY_BUYER_CARDS.map((buyer) => {
              const isSelected = 
                currentSearch === buyer.query.toLowerCase() || 
                currentSearch === buyer.shortName.toLowerCase();

              return (
                /* Requirement 5: Hoverable with subtle elevation/shadow effect indicating clickable for full procurement history */
                <div
                  key={buyer.id}
                  onClick={() => handleSelectBuyer(buyer)}
                  className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between h-full min-h-[380px] cursor-pointer group relative ${
                    isSelected
                      ? 'border-blue-500 bg-slate-900/95 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/90 hover:border-blue-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1'
                  }`}
                >
                  {/* Top Section: Header Icon, Title & Requirement 4 Status Badges at Top-Right */}
                  <div className="space-y-3">
                    
                    {/* Top Row: Icon + Direct/JV Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2 bg-slate-800/90 border border-slate-700/80 rounded-xl shrink-0 shadow-2xs">
                          {buyer.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                            {buyer.industryId.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-300 font-medium truncate block">
                            {buyer.shortName}
                          </span>
                        </div>
                      </div>

                      {/* Requirement 4: Highly visible status badge at top-right (Green for Direct, Yellow for JV) */}
                      <div className="shrink-0">
                        {buyer.eligibility === 'direct_allowed' ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>
                              {locale === 'zh' ? '🇨🇳 可独立直投' : locale === 'mn' ? 'Шууд оролцох' : 'Direct Bid'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                            <Handshake className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>
                              {locale === 'zh' ? '🤝 需联合体' : locale === 'mn' ? 'Түншлэл (JV)' : 'JV Required'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Official Entity Name */}
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors leading-snug">
                      {locale === 'en' ? buyer.nameEn : buyer.name}
                    </h3>

                    {/* Requirement 2: Annual Budget in prominent, large font with subtle green trend indicator next to it */}
                    <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {locale === 'zh' ? '年采购预算规模' : locale === 'mn' ? 'Жилийн төсөв' : 'Annual Budget'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {buyer.budgetUsdEst}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                          {buyer.totalBudgetFormatted}
                        </span>

                        {/* Subtle Green Trend Indicator */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <TrendingUp className="h-3 w-3" />
                          <span>{buyer.trendGrowth}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-850 pt-2">
                        <span>{locale === 'mn' ? 'Нийт зарласан тендер:' : 'Active & Past Bids:'}</span>
                        <span className="font-bold text-blue-400 font-mono">
                          {buyer.activeTendersCount.toLocaleString()}+ тендер
                        </span>
                      </div>
                    </div>

                    {/* Requirement 3: Turn "Гол нийлүүлэх бараа" into a horizontal row of distinct, color-coded pill tags */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '主要采购商品清单：' : locale === 'mn' ? 'Гол нийлүүлэх бараа:' : 'Primary Commodities:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(locale === 'en' ? buyer.topGoodsEn : buyer.topGoodsMn).map((good, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-100 border border-slate-700/80 font-medium group-hover:border-slate-600 transition-colors shadow-2xs"
                          >
                            {good}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Bottom Procurement History Action Prompt (Click Indication) */}
                  <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <History className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[11px] line-clamp-1 italic">
                        {locale === 'en' ? buyer.biddingTipEn : buyer.biddingTipMn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-blue-400 shrink-0 ml-2 group-hover:text-blue-300">
                      <span>
                        {isSelected
                          ? (locale === 'mn' ? 'Сонгогдсон' : 'Filtered')
                          : (locale === 'mn' ? 'Түүх үзэх' : 'View History')}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Tab B: Industrial Sectors Market Intelligence Cards */}
        {activeHubTab === 'sectors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-200">
            {DISCOVERY_SECTOR_CARDS.map((sector) => {
              const isSelected = filters.industry === sector.id;

              return (
                <div
                  key={sector.id}
                  onClick={() => handleSelectSector(sector)}
                  className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between h-full min-h-[360px] cursor-pointer group relative ${
                    isSelected
                      ? 'border-emerald-500 bg-slate-900/95 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xl p-2 bg-slate-800/90 border border-slate-700/80 rounded-xl shadow-2xs">
                        {sector.icon}
                      </span>
                      
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                        {sector.activeCount}+ {locale === 'mn' ? 'тендер' : 'bids'}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                      {locale === 'zh' ? sector.nameZh : locale === 'mn' ? sector.nameMn : sector.nameEn}
                    </h3>

                    {/* Metrics */}
                    <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {locale === 'zh' ? '总采购资金池' : locale === 'mn' ? 'Салбарын нийт төсөв' : 'Sector Budget Pool'}
                        </span>
                        <span className="text-lg font-black text-white font-mono block mt-0.5">
                          {sector.totalBudgetFormatted}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {locale === 'zh' ? '在办招标' : locale === 'mn' ? 'Идэвхтэй тендер' : 'Active Bids'}
                        </span>
                        <span className="text-lg font-black text-emerald-400 font-mono block mt-0.5">
                          {sector.activeCount}+
                        </span>
                      </div>
                    </div>

                    {/* In-Demand Goods */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'zh' ? '高频采购物资：' : locale === 'mn' ? 'Эрэлттэй бараа бүтээгдэхүүн:' : 'Top Procured Commodities:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(locale === 'en' ? sector.topItemsEn : sector.topItemsMn).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-100 border border-slate-700/80 font-medium group-hover:border-slate-600 transition-colors shadow-2xs"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 ml-auto group-hover:text-emerald-300">
                      <span>{isSelected ? (locale === 'mn' ? 'Сонгогдсон' : 'Filtered') : (locale === 'mn' ? 'Салбараар шүүх' : 'Filter by Sector')}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab C: Cross-Border Foreign Bidding Routes */}
        {activeHubTab === 'foreign' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-200">
            {/* Direct Foreign Bidding Card */}
            <div
              onClick={() => handleSelectEligibility('direct')}
              className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between h-full min-h-[360px] cursor-pointer group ${
                filters.chinaEligibility === 'direct'
                  ? 'border-emerald-500 bg-slate-900/95 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xl">
                    🌐
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    100% Direct Margin
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {locale === 'zh' ? '🇨🇳 独立跨境直投通道' : locale === 'mn' ? 'Гадаадын нийлүүлэгч бие даан оролцох' : 'Direct Foreign Bidding (Direct)'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {locale === 'zh'
                    ? '3亿图格里克以上单项商品、设备物资采购，中企可使用中国企业执照与银行反担保函独立投标，无须设立蒙古国子公司。'
                    : locale === 'mn'
                    ? '300 сая төгрөгөөс дээш бараа бүтээгдэхүүн, тоног төхөөрөмжийн тендерт гадаадын компани шууд өөрийн нэрээр оролцох боломжтой.'
                    : 'Direct bidding for goods (>300M MNT) using foreign corporate registration and bank guarantees without local subsidiary setup.'}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  {locale === 'mn' ? 'Шууд оролцох тендерүүд' : 'View Eligible Tenders'}
                </span>
                <ArrowUpRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* JV Partner Matching Card */}
            <div
              onClick={() => handleSelectEligibility('joint_venture')}
              className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between h-full min-h-[360px] cursor-pointer group ${
                filters.chinaEligibility === 'joint_venture'
                  ? 'border-indigo-500 bg-slate-900/95 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : 'border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-xl text-xl">
                    🤝
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Low Risk / Local Compliance
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {locale === 'zh' ? '🤝 蒙古本土联合体伙伴对接' : locale === 'mn' ? 'Монголын тусгай зөвшөөрөлтэй түншээр хамтрах' : 'Local Joint Venture (JV) Match'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {locale === 'zh'
                    ? '针对建筑工程、道路施工及特种安装项目，平台撮合蒙古国持证合规联合体伙伴，蒙方负责属地资质与报关，您专注货物出厂与技术。'
                    : locale === 'mn'
                    ? 'Барилга угсралт, зам, дэд бүтцийн ажилд Монголын тусгай зөвшөөрөлтэй компаниудтай түншлэл байгуулж оролцох.'
                    : 'Match with certified Mongolian contractors for construction, civil works, and engineering tenders requiring local licenses.'}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">
                  {locale === 'mn' ? 'Түншлэлтэй тендерүүд' : 'Explore JV Tenders'}
                </span>
                <ArrowUpRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* Urgent Closing Soon Card */}
            <div
              onClick={() => onFilterChange({ urgency: 'urgent', tabMode: 'closing_soon', page: 1 })}
              className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between h-full min-h-[360px] cursor-pointer group ${
                filters.tabMode === 'closing_soon'
                  ? 'border-rose-500 bg-slate-900/95 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/10'
                  : 'border-slate-800 bg-slate-900/90 hover:border-rose-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-1'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-xl">
                    🚨
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                    &lt; 48-72 Hours Left
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {locale === 'zh' ? '⏳ 48小时内即将截标急单' : locale === 'mn' ? '⏳ Хаагдах дөхсөн яаралтай тендерүүд' : 'Urgent Closing Bids (<48h)'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {locale === 'zh'
                    ? '截标时间临近、竞争对手较少的高确定性标段，支持加急报价与技术规范快速匹配。'
                    : locale === 'mn'
                    ? 'Эцсийн хугацаа ойртсон, өрсөлдөөн багатай, хурдан үнийн санал илгээх боломжтой яаралтай төслүүд.'
                    : 'High-urgency bids with impending deadlines, often featuring fewer competitors and rapid quotation opportunities.'}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">
                  {locale === 'mn' ? 'Яаралтай тендер үзэх' : 'View Urgent Bids'}
                </span>
                <ArrowUpRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

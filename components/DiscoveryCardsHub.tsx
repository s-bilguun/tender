'use client';

import React, { useState } from 'react';
import { Locale, TenderFilterParams, IndustryVertical, TenderStats } from '@/lib/types';
import { Building2, Layers, Globe2, ChevronRight, Check } from 'lucide-react';
import { IndustryIcon } from '@/components/IndustryIcon';

export interface DiscoveryEntityCard {
  id: string;
  name: string;
  shortName: string;
  nameEn: string;
  nameZh: string;
  shortNameZh: string;
  query: string;
  industryId: IndustryVertical;
  icon: string;
  activeTendersCount: number;
  totalBudgetFormatted: string;
  totalBudgetZh: string;
  budgetUsdEst: string;
  trendGrowth: string;
  topGoodsMn: string[];
  topGoodsEn: string[];
  topGoodsZh: string[];
  eligibility: 'direct_allowed' | 'jv_required';
  biddingTipMn: string;
  biddingTipEn: string;
  biddingTipZh: string;
}

export const DISCOVERY_BUYER_CARDS: DiscoveryEntityCard[] = [
  {
    id: 'erdenet',
    name: 'Эрдэнэт үйлдвэр ТӨҮГ',
    shortName: 'Эрдэнэт үйлдвэр',
    nameEn: 'Erdenet Mining Corporation',
    nameZh: '额尔登特铜钼矿国有企业 (Erdenet Mining)',
    shortNameZh: '额尔登特铜矿',
    query: 'Эрдэнэт үйлдвэр',
    industryId: 'mining',
    icon: '',
    activeTendersCount: 1420,
    totalBudgetFormatted: '1.89 их наяд ₮',
    totalBudgetZh: '¥40.2 亿元 RMB',
    budgetUsdEst: '~$550M USD',
    trendGrowth: '+18.4% YoY',
    topGoodsMn: ['10кВ хүчний кабель', 'Экскаваторын сэлбэг', 'Флотацийн урвалж', 'Туузан дамжуурга'],
    topGoodsEn: ['10kV Power Cables', 'Excavator Spare Parts', 'Flotation Reagents', 'Conveyor Belts'],
    topGoodsZh: ['10kV矿用高压电缆', '挖掘机与球磨机备件', '选矿浮选药剂', '阻燃皮带输送机'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Бараа бүтээгдэхүүний тендерт гадаадын үйлдвэрлэгч шууд оролцох боломжтой',
    biddingTipEn: 'Direct foreign bidding accepted for major industrial commodity supply',
    biddingTipZh: '大宗工业物资与矿山设备采购支持中国源头工厂直接参与投标',
  },
  {
    id: 'ett',
    name: 'Эрдэнэс тавантолгой ХК',
    shortName: 'Эрдэнэс Тавантолгой',
    nameEn: 'Erdenes Tavan Tolgoi JSC',
    nameZh: '珍宝塔温陶勒盖煤炭股份公司 (ETT)',
    shortNameZh: '塔温陶勒盖煤矿',
    query: 'Эрдэнэс тавантолгой',
    industryId: 'mining',
    icon: '',
    activeTendersCount: 890,
    totalBudgetFormatted: '1.45 их наяд ₮',
    totalBudgetZh: '¥30.8 亿元 RMB',
    budgetUsdEst: '~$420M USD',
    trendGrowth: '+22.1% YoY',
    topGoodsMn: ['Хүнд даацын дугуй', 'Түлш, шатах тослох материал', 'Уурхайн өрөм, механизм'],
    topGoodsEn: ['Heavy Mining Tyres', 'Fuel & Lubricants', 'Drilling Machinery & Fleet'],
    topGoodsZh: ['巨型矿用工程轮胎', '工业润滑油与防冻液', '矿山钻探机械与重卡配件'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Олон улсын нээлттэй сонгон шалгаруулалт зарладаг',
    biddingTipEn: 'Regular large-scale open international competitive bidding',
    biddingTipZh: '常年发布大型国际公开招标，紧邻甘其毛都口岸物流便利',
  },
  {
    id: 'moh',
    name: 'Эрүүл мэндийн яам',
    shortName: 'Эрүүл мэндийн яам',
    nameEn: 'Ministry of Health (Mongolia)',
    nameZh: '蒙古国卫生部及国立中心医院',
    shortNameZh: '蒙古国卫生部',
    query: 'Эрүүл мэнд',
    industryId: 'medical',
    icon: '',
    activeTendersCount: 980,
    totalBudgetFormatted: '640 тэрбум ₮',
    totalBudgetZh: '¥13.6 亿元 RMB',
    budgetUsdEst: '~$185M USD',
    trendGrowth: '+14.7% YoY',
    topGoodsMn: ['CT & MRI аппарат', 'Эмнэлгийн цахилгаан ор', 'Оношлуур, урвалж', 'Хамгаалах хэрэгсэл'],
    topGoodsEn: ['CT & MRI Scanners', 'Electric Hospital Beds', 'Diagnostic Reagents', 'Medical Consumables'],
    topGoodsZh: ['CT/DR医学影像设备', '医用电动病床与手术台', '体外诊断试剂(IVD)', '医用耗材与敷料'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Эрүүл мэндийн тусгай лиценз, CE/ISO сертификат шаардлагатай',
    biddingTipEn: 'CE/ISO medical certifications allow direct cross-border supply',
    biddingTipZh: '具备 ISO13485 / CE 认证的中国医疗器械厂商可直接参与供货',
  },
  {
    id: 'moes',
    name: 'Боловсрол, шинжлэх ухааны яам',
    shortName: 'Боловсролын яам',
    nameEn: 'Ministry of Education & Science',
    nameZh: '蒙古国教育部与教育总局',
    shortNameZh: '蒙古国教育部',
    query: 'Боловсрол',
    industryId: 'stationery',
    icon: '',
    activeTendersCount: 1250,
    totalBudgetFormatted: '520 тэрбум ₮',
    totalBudgetZh: '¥11.0 亿元 RMB',
    budgetUsdEst: '~$150M USD',
    trendGrowth: '+11.3% YoY',
    topGoodsMn: ['Сургуулийн ширээ, сандал', 'Компьютер, зөөврийн төхөөрөмж', 'Лабораторийн тоноглол'],
    topGoodsEn: ['School Desks & Chairs', 'Computers & Laptops', 'STEM Lab Equipment'],
    topGoodsZh: ['中小学升降课桌椅', '教师笔记本与台式电脑', '交互式智慧黑板与实验室设备'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Бүх аймаг, сумын сургуулийн тавилга, IT тоног төхөөрөмжийн төвлөрсөн худалдан авалт',
    biddingTipEn: 'Nationwide school furniture & classroom technology procurement packages',
    biddingTipZh: '全国学校办公教学家具与IT设备集中分包采购，批次多、回款稳',
  },
  {
    id: 'ub_city',
    name: 'Нийслэлийн Засаг даргын тамгын газар',
    shortName: 'Улаанбаатар хот / НЗДТГ',
    nameEn: 'Ulaanbaatar City Municipality',
    nameZh: '乌兰巴托市政府采购局及各区政府',
    shortNameZh: '乌兰巴托市政府',
    query: 'Нийслэл',
    industryId: 'construction',
    icon: '',
    activeTendersCount: 680,
    totalBudgetFormatted: '310 тэрбум ₮',
    totalBudgetZh: '¥6.6 亿元 RMB',
    budgetUsdEst: '~$90M USD',
    trendGrowth: '+9.5% YoY',
    topGoodsMn: ['Гудамжны гэрэлтүүлэг, кабель', 'Зам засварын механизм', 'Камер, хяналтын систем'],
    topGoodsEn: ['Smart Street Lighting & Cables', 'Road Repair Equipment', 'Traffic & CCTV Tech'],
    topGoodsZh: ['市政路灯照明与电力电缆', '环卫清扫车与筑路机械', '平安城市高清监控安防系统'],
    eligibility: 'jv_required',
    biddingTipMn: 'Хот тохижилт, угсралтын ажилд дотоодын түншлэл (JV) шаардлагатай',
    biddingTipEn: 'Installation & municipal civil works benefit from local JV partner matching',
    biddingTipZh: '市政施工类项目需联合蒙古持证建筑公司(JV)，纯货物包可直投',
  },
  {
    id: 'dts4',
    name: '"ДЦС-4" ТӨХК Эрчим хүч',
    shortName: 'ДЦС-4 Эрчим хүч',
    nameEn: 'Thermal Power Plant #4 JSC',
    nameZh: '乌兰巴托第四热电厂及国家电网',
    shortNameZh: '第四热电厂 / 能源部',
    query: 'ДЦС',
    industryId: 'mining',
    icon: '',
    activeTendersCount: 340,
    totalBudgetFormatted: '290 тэрбум ₮',
    totalBudgetZh: '¥6.2 亿元 RMB',
    budgetUsdEst: '~$84M USD',
    trendGrowth: '+16.2% YoY',
    topGoodsMn: ['Зуухны хоолой, хаалт', 'Турбины сэлбэг хэрэгсэл', 'Өндөр хүчдэлийн трансформатор'],
    topGoodsEn: ['Boiler High-Pressure Pipes', 'Turbine Rotor Spares', 'High-Voltage Transformers'],
    topGoodsZh: ['电站锅炉高压无缝钢管与阀门', '汽轮机与水泵备件', '35kV/110kV电力变压器与开关柜'],
    eligibility: 'direct_allowed',
    biddingTipMn: 'Олон улсын чанарын стандартын тохирлын гэрчилгээтэй үйлдвэрүүд шалгардаг',
    biddingTipEn: 'Requires strict ISO / ASME technical compliance certification',
    biddingTipZh: '电力与供热管网改造大量采购中国国标(GB)/俄标(GOST)机电产品',
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
  totalBudgetZh: string;
  topItemsMn: string[];
  topItemsEn: string[];
  topItemsZh: string[];
}

export const DISCOVERY_SECTOR_CARDS: DiscoverySectorCard[] = [
  {
    id: 'mining',
    nameMn: 'Уул уурхай & Хүнд үйлдвэр',
    nameEn: 'Mining & Heavy Machinery',
    nameZh: '矿业与重型机械',
    icon: '',
    activeCount: 148,
    totalBudgetFormatted: '1.89 их наяд ₮',
    totalBudgetZh: '¥40.2 亿元',
    topItemsMn: ['Экскаватор, бульдозер', 'Хүчний кабель', 'Уурхайн дугуй', 'Сэлбэг'],
    topItemsEn: ['Excavators & Bulldozers', '10kV Power Cables', 'Mining Tyres', 'Heavy Spares'],
    topItemsZh: ['挖掘机与装载机', '10kV高压电力电缆', '矿用工程轮胎', '钻探设备与水泵备件'],
  },
  {
    id: 'construction',
    nameMn: 'Барилга, зам & Дэд бүтэц',
    nameEn: 'Construction & Civil Works',
    nameZh: '建筑基建与路桥工程',
    icon: '',
    activeCount: 215,
    totalBudgetFormatted: '2.40 их наяд ₮',
    totalBudgetZh: '¥51.0 亿元',
    topItemsMn: ['Ган хоолой, арматур', 'Сантехник, хаалт', 'Замын тоноглол', 'Тусгаарлагч'],
    topItemsEn: ['Steel Pipes & Rebar', 'Valves & Plumbing', 'Road Guardrails', 'Insulation Materials'],
    topItemsZh: ['无缝钢管与螺纹钢', '工业阀门与管件', '沥青道路与路灯照明', '外墙保温与防水建材'],
  },
  {
    id: 'medical',
    nameMn: 'Эрүүл мэнд & Эмнэлгийн тоног төхөөрөмж',
    nameEn: 'Healthcare & Medical Devices',
    nameZh: '医疗器械与医药耗材',
    icon: '',
    activeCount: 92,
    totalBudgetFormatted: '640 тэрбум ₮',
    totalBudgetZh: '¥13.6 亿元',
    topItemsMn: ['Эмнэлгийн ор, тавилга', 'Оношилгооны тоног төхөөрөмж', 'Нэг удаагийн хэрэгсэл'],
    topItemsEn: ['Hospital Beds', 'Diagnostic Imaging', 'Surgical Consumables', 'PPE'],
    topItemsZh: ['医用电动病床与护理床', '彩超/DR医学影像仪', '实验室生化检测试剂', '一次性医用耗材'],
  },
  {
    id: 'it',
    nameMn: 'Мэдээллийн технологи & Харилцаа холбоо',
    nameEn: 'IT Hardware & Networking',
    nameZh: 'IT电脑、网络与安防系统',
    icon: '',
    activeCount: 64,
    totalBudgetFormatted: '380 тэрбум ₮',
    totalBudgetZh: '¥8.1 亿元',
    topItemsMn: ['Сервер, сүлжээний төхөөрөмж', 'Компьютер, монитор', 'Хяналтын камер'],
    topItemsEn: ['Server Racks & Switches', 'Desktop PCs & Laptops', 'CCTV & Security Tech'],
    topItemsZh: ['机架服务器与交换机', '商用台式机与笔记本电脑', '高清网络视频监控(CCTV)'],
  },
  {
    id: 'stationery',
    nameMn: 'Оффис, сургуулийн тавилга & Хэрэгсэл',
    nameEn: 'Furniture & Educational Supplies',
    nameZh: '办公家具与学校教学设备',
    icon: '',
    activeCount: 78,
    totalBudgetFormatted: '310 тэрбум ₮',
    totalBudgetZh: '¥6.6 亿元',
    topItemsMn: ['Сургуулийн партын ширээ, сандал', 'Оффис сандал', 'Ган шүүгээ'],
    topItemsEn: ['School Desks & Chairs', 'Ergonomic Office Chairs', 'Steel Cabinets'],
    topItemsZh: ['学生升降课桌椅与宿舍床', '办公桌椅与会议桌', '钢制文件柜与密集架'],
  },
  {
    id: 'food',
    nameMn: 'Хүнс & Хөдөө аж ахуйн нийлүүлэлт',
    nameEn: 'Food Supplies & Agriculture',
    nameZh: '食品粮油与农牧业机械',
    icon: '',
    activeCount: 42,
    totalBudgetFormatted: '220 тэрбум ₮',
    totalBudgetZh: '¥4.7 亿元',
    topItemsMn: ['Үдийн цайны бүтээгдэхүүн', 'Мах, гурил, будаа', 'Хөдөө аж ахуйн техник'],
    topItemsEn: ['School Meal Supplies', 'Flour, Rice & Meat', 'Agri Machinery & Tools'],
    topItemsZh: ['学校营养配餐食材', '大米、面粉与食用油', '农牧业机械与冷链设备'],
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

  const t = (mn: string, en: string, zh: string) => (locale === 'zh' ? zh : locale === 'en' ? en : mn);

  const budgetLabel = (mnValue: string, zhValue: string, usdValue?: string) => {
    if (locale === 'zh') return `≈ ${zhValue.replace(/\s*RMB\s*$/i, '').replace(/\s*亿元/, ' 亿')}`;
    if (locale === 'en' && usdValue) return `≈ ${usdValue.replace(/^~\s*/, '').replace(/\s*USD$/i, '')}`;
    return `≈ ${mnValue}`;
  };

  const tabs: { id: 'buyers' | 'sectors' | 'foreign'; label: string; Icon: typeof Building2 }[] = [
    { id: 'buyers', label: t('Захиалагчид', 'Buyers', '采购单位'), Icon: Building2 },
    { id: 'sectors', label: t('Салбарууд', 'Sectors', '行业'), Icon: Layers },
    { id: 'foreign', label: t('Гадаадын оролцогч', 'Foreign bidders', '外国投标人'), Icon: Globe2 },
  ];

  const rowClass = (selected: boolean) =>
    `group grid items-center gap-x-4 gap-y-1 px-4 sm:px-5 py-3 text-left w-full border-l-2 transition-colors cursor-pointer ${
      selected
        ? 'border-l-blue-600 bg-blue-50/70 dark:bg-blue-500/10'
        : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`;

  const Eligibility = ({ value }: { value: 'direct_allowed' | 'jv_required' }) => (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${value === 'direct_allowed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {value === 'direct_allowed'
        ? t('Шууд оролцож болно', 'Can bid directly', '可独立投标')
        : t('Түншлэл шаардлагатай', 'Local partner needed', '需组建联合体')}
    </span>
  );

  const headCell = 'text-[11px] font-medium text-slate-500 dark:text-slate-400';

  return (
    <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('Захиалагч ба салбар', 'Buyers and sectors', '采购单位与行业')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              'Мөр сонгоход доорх тендерийн жагсаалт шүүгдэнэ.',
              'Select a row to filter the tender list below.',
              '选择任意一行，即可筛选下方的招标列表。'
            )}
          </p>
        </div>

        <div role="tablist" className="flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar shrink-0">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeHubTab === id}
              onClick={() => setActiveHubTab(id)}
              className={`h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeHubTab === id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeHubTab === 'buyers' && (
        <div>
          <div className={`hidden md:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_9rem_11rem_1rem] gap-x-4 px-5 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 ${headCell}`}>
            <span>{t('Захиалагч', 'Buyer', '采购单位')}</span>
            <span>{t('Гол худалдан авалт', 'Main purchases', '主要采购')}</span>
            <span className="text-right">{t('Жилийн төсөв*', 'Annual budget*', '年度预算*')}</span>
            <span>{t('Гадаадын компани', 'Foreign companies', '外国企业')}</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {DISCOVERY_BUYER_CARDS.map((buyer) => {
              const selected =
                currentSearch === buyer.query.toLowerCase() || currentSearch === buyer.shortName.toLowerCase();
              const goods = locale === 'zh' ? buyer.topGoodsZh : locale === 'en' ? buyer.topGoodsEn : buyer.topGoodsMn;
              const name = locale === 'zh' ? buyer.nameZh : locale === 'en' ? buyer.nameEn : buyer.name;
              const secondary = locale === 'mn' ? buyer.nameEn : buyer.name;
              return (
                <li key={buyer.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleSelectBuyer(buyer)}
                    className={`${rowClass(selected)} grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_9rem_11rem_1rem]`}
                  >
                    <span className="min-w-0 flex items-start gap-2.5">
                      <IndustryIcon id={buyer.industryId} className="h-4 w-4 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{secondary}</span>
                      </span>
                    </span>
                    <span className="hidden md:block text-xs text-slate-600 dark:text-slate-300 truncate">{goods.join(', ')}</span>
                    <span className="text-sm text-slate-900 dark:text-white tabular-nums text-right whitespace-nowrap">
                      {budgetLabel(buyer.totalBudgetFormatted, buyer.totalBudgetZh, buyer.budgetUsdEst)}
                    </span>
                    <span className="hidden md:block"><Eligibility value={buyer.eligibility} /></span>
                    <span className="hidden md:flex justify-end">
                      {selected ? (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />
                      )}
                    </span>
                    <span className="md:hidden col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[26px]">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">{goods.slice(0, 2).join(', ')}</span>
                      <Eligibility value={buyer.eligibility} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-5 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            {t(
              '* Өмнөх жилүүдийн зарласан тендерт үндэслэсэн урьдчилсан тооцоо.',
              '* Indicative estimate based on tenders published in previous years.',
              '* 根据往年已发布招标估算，仅供参考。'
            )}
          </p>
        </div>
      )}

      {activeHubTab === 'sectors' && (
        <div>
          <div className={`hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_9rem_1rem] gap-x-4 px-5 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 ${headCell}`}>
            <span>{t('Салбар', 'Sector', '行业')}</span>
            <span>{t('Эрэлттэй бараа, ажил', 'In demand', '需求品类')}</span>
            <span className="text-right">{t('Төсөв*', 'Budget*', '预算*')}</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {DISCOVERY_SECTOR_CARDS.map((sector) => {
              const selected = filters.industry === sector.id;
              const items = locale === 'zh' ? sector.topItemsZh : locale === 'en' ? sector.topItemsEn : sector.topItemsMn;
              return (
                <li key={sector.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleSelectSector(sector)}
                    className={`${rowClass(selected)} grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_9rem_1rem]`}
                  >
                    <span className="min-w-0 flex items-center gap-2.5">
                      <IndustryIcon id={sector.id} className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {locale === 'zh' ? sector.nameZh : locale === 'en' ? sector.nameEn : sector.nameMn}
                      </span>
                    </span>
                    <span className="hidden md:block text-xs text-slate-600 dark:text-slate-300 truncate">{items.join(', ')}</span>
                    <span className="text-sm text-slate-900 dark:text-white tabular-nums text-right whitespace-nowrap">
                      {budgetLabel(sector.totalBudgetFormatted, sector.totalBudgetZh)}
                    </span>
                    <span className="hidden md:flex justify-end">
                      {selected ? (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />
                      )}
                    </span>
                    <span className="md:hidden col-span-2 pl-[26px] text-xs text-slate-500 dark:text-slate-400 truncate">
                      {items.slice(0, 3).join(', ')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="px-5 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            {t('* Урьдчилсан тооцоо.', '* Indicative estimate.', '* 估算值，仅供参考。')}
          </p>
        </div>
      )}

      {activeHubTab === 'foreign' && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {[
            {
              key: 'direct',
              selected: filters.chinaEligibility === 'direct',
              onClick: () => handleSelectEligibility('direct'),
              dot: 'bg-emerald-500',
              title: t('Шууд оролцох боломжтой тендер', 'Tenders open to direct foreign bids', '外国企业可独立投标的标段'),
              body: t(
                'Бараа, тоног төхөөрөмжийн томоохон тендерт гадаадын компани өөрийн нэрээр, банкны баталгаатай оролцож болно.',
                'For larger goods and equipment tenders, a foreign company can bid under its own registration with a bank guarantee.',
                '较大金额的货物与设备采购，外国企业可凭本国营业执照及银行保函独立投标，无需在蒙设立子公司。'
              ),
            },
            {
              key: 'jv',
              selected: filters.chinaEligibility === 'joint_venture',
              onClick: () => handleSelectEligibility('joint_venture'),
              dot: 'bg-amber-500',
              title: t('Монгол түнш шаардлагатай тендер', 'Tenders that need a Mongolian partner', '需与蒙古企业组成联合体的标段'),
              body: t(
                'Барилга, зам, угсралтын ажилд Монголын тусгай зөвшөөрөлтэй компанитай түншлэх шаардлагатай.',
                'Construction, roads and installation work require a licensed Mongolian company in a joint venture.',
                '建筑、道路及安装工程需与持有蒙古国许可证的本地企业组成联合体。'
              ),
            },
            {
              key: 'urgent',
              selected: filters.tabMode === 'closing_soon',
              onClick: () => onFilterChange({ urgency: 'urgent', tabMode: 'closing_soon', page: 1 }),
              dot: 'bg-rose-500',
              title: t('Удахгүй хаагдах тендер', 'Closing soon', '即将截标'),
              body: t(
                'Санал хүлээн авах хугацаа дуусахад ойрхон тендерүүд.',
                'Tenders whose bid deadline is close.',
                '投标截止时间临近的标段。'
              ),
            },
          ].map((row) => (
            <li key={row.key}>
              <button type="button" aria-pressed={row.selected} onClick={row.onClick} className={`${rowClass(row.selected)} grid-cols-[1fr_auto]`}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${row.dot}`} />
                    {row.title}
                  </span>
                  <span className="block mt-0.5 pl-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">{row.body}</span>
                </span>
                {row.selected ? (
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

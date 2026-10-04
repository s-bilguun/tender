export interface ProductCategory {
  id: string;
  emoji: string;
  nameZh: string;
  nameEn: string;
  nameMn: string;
  keywordsZh: string[];
  keywordsMn: string[];
  factoryPriceUsd: number;
  govPriceUsd: number;
  unitZh: string;
  unitEn: string;
  unitMn: string;
  arbitrageMargin: string; // e.g. "+100%"
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'heavy-machinery',
    emoji: '🚜',
    nameZh: '挖掘机 / 推土机 / 工程机械',
    nameEn: 'Excavators & Heavy Machinery',
    nameMn: 'Экскаватор, индүү, хүнд механизм',
    keywordsZh: ['挖掘机', '推土机', '压路机', '装载机', '吊车', '自卸车', '重型机械'],
    keywordsMn: ['экскаватор', 'бульдозер', 'индүү', 'кран', 'ачигч', 'механизм', 'машин'],
    factoryPriceUsd: 28000,
    govPriceUsd: 58000,
    unitZh: '台',
    unitEn: 'unit',
    unitMn: 'ш',
    arbitrageMargin: '+107%',
  },
  {
    id: 'cables',
    emoji: '🔌',
    nameZh: '电力电缆 / 变压器 / 输变电设备',
    nameEn: 'Power Cables & Transformers',
    nameMn: 'Хүчний кабель, утас, трансформатор',
    keywordsZh: ['电缆', '电线', '变压器', '开关柜', '绝缘导线', '配电箱'],
    keywordsMn: ['кабель', 'утас', 'трансформатор', 'щит', 'цахилгаан дамжуулах'],
    factoryPriceUsd: 6.5,
    govPriceUsd: 14.2,
    unitZh: '米',
    unitEn: 'meter',
    unitMn: 'метр',
    arbitrageMargin: '+118%',
  },
  {
    id: 'furniture',
    emoji: '🪑',
    nameZh: '办公桌椅 / 学生课桌 / 钢制家具',
    nameEn: 'Office Chairs & School Desks',
    nameMn: 'Оффис сандал, ширээ, сургуулийн тавилга',
    keywordsZh: ['桌椅', '办公椅', '课桌椅', '文件柜', '病床', '宿舍床', '家具'],
    keywordsMn: ['сандал', 'ширээ', 'тавилга', 'шүүгээ', 'ор', 'партын'],
    factoryPriceUsd: 26,
    govPriceUsd: 62,
    unitZh: '套/把',
    unitEn: 'set/piece',
    unitMn: 'ком/ш',
    arbitrageMargin: '+138%',
  },
  {
    id: 'it-hardware',
    emoji: '💻',
    nameZh: '电脑设备 / 笔记本 / 打印机 / 服务器',
    nameEn: 'Laptops, Desktops & IT Hardware',
    nameMn: 'Компьютер, зөөврийн компьютер, сервер',
    keywordsZh: ['电脑', '笔记本', '显示器', '打印机', '服务器', '网络设备', '摄像头'],
    keywordsMn: ['компьютер', 'нөүтбүүк', 'хэвлэгч', 'принтер', 'сервер', 'дэлгэц', 'камер'],
    factoryPriceUsd: 420,
    govPriceUsd: 780,
    unitZh: '台',
    unitEn: 'unit',
    unitMn: 'ш',
    arbitrageMargin: '+85%',
  },
  {
    id: 'medical',
    emoji: '🏥',
    nameZh: '医疗器械 / 监护仪 / 耗材 / 试剂',
    nameEn: 'Medical Devices & Hospital Supplies',
    nameMn: 'Эмнэлгийн тоног төхөөрөмж, хэрэгсэл',
    keywordsZh: ['医疗器械', '监护仪', '呼吸机', '超声', '病床', '医用手套', '注射器', '生化试剂'],
    keywordsMn: ['эмнэлэг', 'тоног төхөөрөмж', 'монитор', 'эм', 'хэрэгсэл', 'урвалж', 'оношлуур'],
    factoryPriceUsd: 2100,
    govPriceUsd: 4600,
    unitZh: '台/套',
    unitEn: 'set',
    unitMn: 'ком',
    arbitrageMargin: '+119%',
  },
  {
    id: 'food',
    emoji: '🥩',
    nameZh: '粮油食品 / 冻肉 / 学生配餐原料',
    nameEn: 'Food, Meat, Flour & Agro Products',
    nameMn: 'Хүнс, гурил, будаа, мах, үдийн цай',
    keywordsZh: ['食品', '大米', '面粉', '食用油', '冻肉', '蔬菜', '调味品', '学生餐'],
    keywordsMn: ['хүнс', 'хоол', 'мах', 'гурил', 'будаа', 'тос', 'ногоо', 'үдийн цай'],
    factoryPriceUsd: 1.2,
    govPriceUsd: 2.4,
    unitZh: '公斤',
    unitEn: 'kg',
    unitMn: 'кг',
    arbitrageMargin: '+100%',
  },
  {
    id: 'steel-pipes',
    emoji: '🏗️',
    nameZh: '钢材 / PE给排水管 / 沥青 / 建材',
    nameEn: 'Steel, PE Pipes, Asphalt & Materials',
    nameMn: 'Төмөр, арматур, хуванцар хоолой, асфальт',
    keywordsZh: ['钢材', '螺纹钢', 'PE管', '无缝钢管', '沥青', '水泥', '防水卷材'],
    keywordsMn: ['арматур', 'төмөр', 'хоолой', 'асфальт', 'цемент', 'панель', 'хуванцар'],
    factoryPriceUsd: 520,
    govPriceUsd: 910,
    unitZh: '吨',
    unitEn: 'ton',
    unitMn: 'тн',
    arbitrageMargin: '+75%',
  },
  {
    id: 'workwear',
    emoji: '🧥',
    nameZh: '劳保工装 / 矿山反光服 / 安全鞋帽',
    nameEn: 'Workwear, Mining Suits & Safety Shoes',
    nameMn: 'Ажлын хувцас, хамгаалалтын гутал, малгай',
    keywordsZh: ['工装', '劳保服', '反光背心', '安全帽', '安全鞋', '防护服'],
    keywordsMn: ['ажлын хувцас', 'гутал', 'малгай', 'хантааз', 'хамгаалалт'],
    factoryPriceUsd: 9.5,
    govPriceUsd: 22.0,
    unitZh: '套',
    unitEn: 'suit',
    unitMn: 'хос',
    arbitrageMargin: '+131%',
  },
];

export const MNT_TO_RMB_RATE = 485;
export const MNT_TO_USD_RATE = 3450;

export function formatCurrencyMulti(amountMnt: number, currency: 'MNT' | 'CNY' | 'USD' = 'MNT') {
  if (!amountMnt) return currency === 'CNY' ? '¥ 0' : currency === 'USD' ? '$ 0' : '₮ 0';
  
  if (currency === 'CNY') {
    const rmb = amountMnt / MNT_TO_RMB_RATE;
    if (rmb >= 10000) {
      return `¥ ${(rmb / 10000).toFixed(1)}万 人民币`;
    }
    return `¥ ${Math.round(rmb).toLocaleString()}`;
  }
  
  if (currency === 'USD') {
    const usd = amountMnt / MNT_TO_USD_RATE;
    if (usd >= 10000) {
      return `$ ${(usd / 1000).toFixed(0)}k USD`;
    }
    return `$ ${Math.round(usd).toLocaleString()}`;
  }

  return `₮ ${amountMnt.toLocaleString()}`;
}

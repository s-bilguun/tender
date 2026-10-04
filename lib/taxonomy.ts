import { IndustryVertical, IndustryInfo } from './types';

export const INDUSTRIES: IndustryInfo[] = [
  {
    id: 'mining',
    slug: 'mining',
    labelMn: 'Уул уурхай & Хүнд үйлдвэр',
    labelEn: 'Mining & Heavy Industry',
    labelZh: '矿业与重工业',
    icon: 'mining',
    descriptionMn: 'Уул уурхайн тоног төхөөрөмж, баяжуулах, өрөмдлөг, хүнд машин механизм, геологи, эрдэс баялаг',
    descriptionEn: 'Mining equipment, heavy machinery, mineral processing, drilling, geological services',
    descriptionZh: '矿山采掘设备、选矿加工、钻探爆破、重型机械、地质勘探及矿产开发',
  },
  {
    id: 'construction',
    slug: 'construction',
    labelMn: 'Барилга, дэд бүтэц & Засвар',
    labelEn: 'Construction & Civil Works',
    labelZh: '建筑工程与基础设施',
    icon: 'construction',
    descriptionMn: 'Барилга угсралт, их болон урсгал засвар, зам гүүр, инженерийн шугам сүлжээ',
    descriptionEn: 'Building construction, major renovation, civil works, utilities',
    descriptionZh: '房屋建筑安装、大修与改造、道路桥梁、市政公用与工程管网建设',
  },
  {
    id: 'medical',
    slug: 'medical',
    labelMn: 'Эрүүл мэнд & Эм, урвалж',
    labelEn: 'Medical & Healthcare',
    labelZh: '医疗卫生与医药器械',
    icon: 'medical',
    descriptionMn: 'Эм, эмнэлгийн хэрэгсэл, лабораторийн оношлуур, урвалж, тоног төхөөрөмж',
    descriptionEn: 'Pharmaceuticals, medical devices, laboratory reagents, hospital equipment',
    descriptionZh: '药品耗材、医疗器械、检验试剂与诊断设备、医院设施供应',
  },
  {
    id: 'food',
    slug: 'food',
    labelMn: 'Хүнс, хоол үйлдвэрлэл & Үдийн цай',
    labelEn: 'Food & Catering Services',
    labelZh: '食品采购与餐饮供应',
    icon: 'food',
    descriptionMn: 'Сургууль цэцэрлэгийн үдийн хоол, мах, сүү, хүнсний түүхий эд, бэлтгэл',
    descriptionEn: 'School meal catering, raw food supplies, dairy, meat products',
    descriptionZh: '学校配餐服务、肉奶蛋品、大宗食品原料与食材供应',
  },
  {
    id: 'it',
    slug: 'it',
    labelMn: 'Мэдээллийн технологи & Цахимжилт',
    labelEn: 'IT & Software Systems',
    labelZh: '信息技术与数字化系统',
    icon: 'it',
    descriptionMn: 'Програм хангамж, сервер, сүлжээ, компьютерийн тоног төхөөрөмж, цахим систем',
    descriptionEn: 'Software, servers, network equipment, computers, digital platforms',
    descriptionZh: '软件系统开发、服务器网络设备、计算机硬件及数字化平台',
  },
  {
    id: 'transport',
    slug: 'transport',
    labelMn: 'Тээвэр, шатахуун & Авто засвар',
    labelEn: 'Transport & Fuel Fleet',
    labelZh: '交通运输、燃油与汽配',
    icon: 'transport',
    descriptionMn: 'Бензин, дизель түлш, автомашин, сэлбэг хэрэгсэл, тээврийн үйлчилгээ',
    descriptionEn: 'Fuel supply, vehicles, auto spare parts, transportation services',
    descriptionZh: '汽柴油燃料、整车及汽摩配件供应、物流运输与车辆维保',
  },
  {
    id: 'facility',
    slug: 'facility',
    labelMn: 'Харуул, цэвэрлэгээ & Ашиглалт',
    labelEn: 'Facility & Security',
    labelZh: '物业保洁与安保服务',
    icon: 'facility',
    descriptionMn: 'Харуул хамгаалалт, байрны цэвэрлэгээ, ариутгал, хог хаягдал, ашиглалт',
    descriptionEn: 'Security services, janitorial cleaning, disinfection, facility management',
    descriptionZh: '保安保卫服务、综合保洁消毒、固体废物处理与楼宇物业运营',
  },
  {
    id: 'stationery',
    slug: 'stationery',
    labelMn: 'Бичиг хэрэг, хэвлэл & Тавилга',
    labelEn: 'Stationery, Furniture & Print',
    labelZh: '办公文教、印刷与家具',
    icon: 'stationery',
    descriptionMn: 'Албан тасалгааны бичиг хэрэг, хэвлэл, дүрэмт хувцас, оффисын тавилга',
    descriptionEn: 'Office stationery, book printing, uniforms, office furniture',
    descriptionZh: '办公文化用品、书刊出版印刷、制服工装及办公家具采购',
  },
  {
    id: 'consulting',
    slug: 'consulting',
    labelMn: 'Зөвлөх, аудит & Сургалт',
    labelEn: 'Consulting, Audit & Legal',
    labelZh: '专业咨询、审计与培训',
    icon: 'consulting',
    descriptionMn: 'Зөвлөх үйлчилгээ, зураг төсөл боловсруулах, аудит, сургалт судалгаа',
    descriptionEn: 'Consulting services, engineering blueprints, financial audit, training',
    descriptionZh: '工程可行性研究与勘察设计、财务审计、法律合规与专业技能培训',
  },
];

export const KEYWORDS_MAP: Record<IndustryVertical, string[]> = {
  all: [],
  mining: [
    'уул уурхай', 'уурхай', 'баяжуулах', 'өрөмдлөг', 'нүүрс', 'хүнд үйлдвэр', 'эрдэс',
    'геологи', 'металл', 'экскаватор', 'хөрс хуулалт', 'тэсэлгээ', 'багана', 'конвейер',
    'тээрэм', 'автосамосвал', 'дамжлага', 'эрдэнэт үйлдвэр', 'эрдэнэс тавантолгой', 'тавантолгой',
    'баяжмал', 'хүдэр', 'хөвүүлэн баяжуулах', 'шаар', 'бульдозер', 'грейдер', 'хүнд машин'
  ],
  it: [
    'програм', 'систем', 'сервер', 'сүлжээ', 'компьютер', 'мт ', 'принтер', 'веб',
    'цахим', 'лиценз', 'cloud', 'software', 'hardware', 'программ', 'техник хангамж',
    'дата', 'мэдээллийн', 'өгөгдөл', 'камер', 'хяналтын камер', 'код'
  ],
  construction: [
    'барилга', 'засвар', 'зам', 'шугам', 'инженер', 'фасад', 'дулаан', 'цэвэр ус',
    'бохир', 'угсралт', 'дээвэр', 'гүүр', 'хашаа', 'тохижилт', 'гэрэлтүүлэг',
    'хучилт', 'бетон', 'хоолой', 'өрлөг', 'будаг', 'инженерийн'
  ],
  medical: [
    'эм ', 'эмнэлэг', 'урвалж', 'оношлуур', 'эмнэлгийн', 'вакцин', 'шүд', 'эмийн',
    'рентген', 'эрүүл мэнд', 'хамгаалах хэрэгсэл', 'ариутгал', 'боолт', 'лаборатори'
  ],
  food: [
    'хоол', 'хүнс', 'сүү', 'мах', 'гурил', 'ногоо', 'үдийн цай', 'үдийн хоол',
    'хүнсний', 'унд', 'талх', 'ундаа', 'махны', 'цагаан идээ', 'хүнсээр'
  ],
  transport: [
    'тээвэр', 'шатахуун', 'бензин', 'дизель', 'автомашин', 'авто', 'дугуй',
    'сэлбэг', 'машин', 'жолооч', 'аи-92', 'дизелийн', 'түлш'
  ],
  facility: [
    'цэвэрлэгээ', 'харуул', 'хамгаалалт', 'хог', 'халдваргүйжүүлэлт',
    'цахилгаан шат', 'ашиглалт', 'угаалга', 'цэвэрлэгээний', 'ажил үйлчилгээ'
  ],
  stationery: [
    'бичиг хэрэг', 'хэвлэл', 'тавилга', 'цаас', 'сурах бичиг', 'ном', 'маягт',
    'оффис', 'сандал', 'ширээ', 'хувцас', 'дүрэмт хувцас', 'хэвлэх', 'дэвтэр'
  ],
  consulting: [
    'зөвлөх', 'аудит', 'сургалт', 'судалгаа', 'үнэлгээ', 'төсөл', 'тэзү',
    'зураг төсөв', 'зураг төсөл', 'шинжээч', 'хөгжлийн төлөвлөгөө'
  ],
};

export function classifyIndustry(name?: string, typeCode?: string, entityName?: string): { id: IndustryVertical; labelMn: string; labelEn: string; icon: string } {
  const combined = `${name || ''} ${entityName || ''}`.toLowerCase().trim();
  if (!combined) {
    return { id: 'consulting', labelMn: 'Бусад үйлчилгээ', labelEn: 'General Services', icon: 'consulting' };
  }

  for (const ind of INDUSTRIES) {
    const keywords = KEYWORDS_MAP[ind.id] || [];
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        return {
          id: ind.id,
          labelMn: ind.labelMn,
          labelEn: ind.labelEn,
          icon: ind.icon,
        };
      }
    }
  }

  // Fallback by tenderTypeCode
  if (typeCode === 'JOB') {
    return { id: 'construction', labelMn: 'Барилга, дэд бүтэц', labelEn: 'Construction & Civil Works', icon: 'construction' };
  }
  if (typeCode === 'PRODUCT') {
    return { id: 'stationery', labelMn: 'Бичиг хэрэг & Бараа', labelEn: 'Supplies & Equipment', icon: 'stationery' };
  }

  return { id: 'consulting', labelMn: 'Зөвлөх, аудит & Сургалт', labelEn: 'Consulting & Services', icon: 'consulting' };
}

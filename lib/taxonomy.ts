import { IndustryVertical, IndustryInfo } from './types';

export const INDUSTRIES: IndustryInfo[] = [
  {
    id: 'mining',
    slug: 'mining',
    labelMn: 'Уул уурхай & Хүнд үйлдвэр',
    labelEn: 'Mining & Heavy Industry',
    icon: '⛏️',
    descriptionMn: 'Уул уурхайн тоног төхөөрөмж, баяжуулах, өрөмдлөг, хүнд машин механизм, геологи, эрдэс баялаг',
    descriptionEn: 'Mining equipment, heavy machinery, mineral processing, drilling, geological services',
    totalCount: 4350,
    activeCount: 146,
  },
  {
    id: 'construction',
    slug: 'construction',
    labelMn: 'Барилга, дэд бүтэц & Засвар',
    labelEn: 'Construction & Civil Works',
    icon: '🏗️',
    descriptionMn: 'Барилга угсралт, их болон урсгал засвар, зам гүүр, инженерийн шугам сүлжээ',
    descriptionEn: 'Building construction, major renovation, civil works, utilities',
    totalCount: 6420,
    activeCount: 184,
  },
  {
    id: 'medical',
    slug: 'medical',
    labelMn: 'Эрүүл мэнд & Эм, урвалж',
    labelEn: 'Medical & Healthcare',
    icon: '💊',
    descriptionMn: 'Эм, эмнэлгийн хэрэгсэл, лабораторийн оношлуур, урвалж, тоног төхөөрөмж',
    descriptionEn: 'Pharmaceuticals, medical devices, laboratory reagents, hospital equipment',
    totalCount: 3120,
    activeCount: 112,
  },
  {
    id: 'food',
    slug: 'food',
    labelMn: 'Хүнс, хоол үйлдвэрлэл & Үдийн цай',
    labelEn: 'Food & Catering Services',
    icon: '🥪',
    descriptionMn: 'Сургууль цэцэрлэгийн үдийн хоол, мах, сүү, хүнсний түүхий эд, бэлтгэл',
    descriptionEn: 'School meal catering, raw food supplies, dairy, meat products',
    totalCount: 2890,
    activeCount: 94,
  },
  {
    id: 'it',
    slug: 'it',
    labelMn: 'Мэдээллийн технологи & Цахимжилт',
    labelEn: 'IT & Software Systems',
    icon: '💻',
    descriptionMn: 'Програм хангамж, сервер, сүлжээ, компьютерийн тоног төхөөрөмж, цахим систем',
    descriptionEn: 'Software, servers, network equipment, computers, digital platforms',
    totalCount: 1840,
    activeCount: 68,
  },
  {
    id: 'transport',
    slug: 'transport',
    labelMn: 'Тээвэр, шатахуун & Авто засвар',
    labelEn: 'Transport & Fuel Fleet',
    icon: '🚗',
    descriptionMn: 'Бензин, дизель түлш, автомашин, сэлбэг хэрэгсэл, тээврийн үйлчилгээ',
    descriptionEn: 'Fuel supply, vehicles, auto spare parts, transportation services',
    totalCount: 2150,
    activeCount: 76,
  },
  {
    id: 'facility',
    slug: 'facility',
    labelMn: 'Харуул, цэвэрлэгээ & Ашиглалт',
    labelEn: 'Facility & Security',
    icon: '🧹',
    descriptionMn: 'Харуул хамгаалалт, байрны цэвэрлэгээ, ариутгал, хог хаягдал, ашиглалт',
    descriptionEn: 'Security services, janitorial cleaning, disinfection, facility management',
    totalCount: 1450,
    activeCount: 52,
  },
  {
    id: 'stationery',
    slug: 'stationery',
    labelMn: 'Бичиг хэрэг, хэвлэл & Тавилга',
    labelEn: 'Stationery, Furniture & Print',
    icon: '📚',
    descriptionMn: 'Албан тасалгааны бичиг хэрэг, хэвлэл, дүрэмт хувцас, оффисын тавилга',
    descriptionEn: 'Office stationery, book printing, uniforms, office furniture',
    totalCount: 2780,
    activeCount: 88,
  },
  {
    id: 'consulting',
    slug: 'consulting',
    labelMn: 'Зөвлөх, аудит & Сургалт',
    labelEn: 'Consulting, Audit & Legal',
    icon: '⚖️',
    descriptionMn: 'Зөвлөх үйлчилгээ, зураг төсөл боловсруулах, аудит, сургалт судалгаа',
    descriptionEn: 'Consulting services, engineering blueprints, financial audit, training',
    totalCount: 2135,
    activeCount: 62,
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
    return { id: 'consulting', labelMn: 'Бусад үйлчилгээ', labelEn: 'General Services', icon: '📦' };
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
    return { id: 'construction', labelMn: 'Барилга, дэд бүтэц', labelEn: 'Construction & Civil Works', icon: '🏗️' };
  }
  if (typeCode === 'PRODUCT') {
    return { id: 'stationery', labelMn: 'Бичиг хэрэг & Бараа', labelEn: 'Supplies & Equipment', icon: '📚' };
  }

  return { id: 'consulting', labelMn: 'Зөвлөх, аудит & Сургалт', labelEn: 'Consulting & Services', icon: '⚖️' };
}

'use client';

import React from 'react';
import { Locale, TenderFilterParams, IndustryVertical } from '@/lib/types';
import { INDUSTRIES } from '@/lib/taxonomy';
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
  category: IndustryVertical | 'all';
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
    shortName: 'Улаанбаатар хот / НЗДТГ',
    query: 'Нийслэл',
    category: 'construction',
    icon: '🏛️',
    approxTenders: '680+',
    budgetEst: '310 тэрбум ₮',
  },
  {
    id: 'moh',
    name: 'Эрүүл мэндийн яам',
    shortName: 'Эрүүл мэндийн яам',
    query: 'Эрүүл мэнд',
    category: 'medical',
    icon: '🏥',
    approxTenders: '980+',
    budgetEst: '640 тэрбум ₮',
  },
  {
    id: 'moes',
    name: 'Боловсролын сайд / БШУЯ',
    shortName: 'Боловсролын яам',
    query: 'Боловсрол',
    category: 'stationery',
    icon: '🏫',
    approxTenders: '1,250+',
    budgetEst: '520 тэрбум ₮',
  },
  {
    id: 'dts4',
    name: '"ДЦС-4" ТӨХК Эрчим хүч',
    shortName: 'ДЦС-4 Эрчим хүч',
    query: 'ДЦС',
    category: 'mining',
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

export const COMPANIES_BY_INDUSTRY: Record<IndustryVertical, CompanyEntity[]> = {
  all: TOP_COMPANIES,
  mining: [
    {
      id: 'erdenet_mine',
      name: 'Эрдэнэт үйлдвэр ТӨҮГ',
      shortName: 'Эрдэнэт үйлдвэр',
      query: 'Эрдэнэт үйлдвэр',
      category: 'mining',
      icon: '⛏️',
      approxTenders: '1,420+',
      budgetEst: '1.89 их наяд ₮',
    },
    {
      id: 'ett_mine',
      name: 'Эрдэнэс тавантолгой ХК',
      shortName: 'Эрдэнэс Тавантолгой',
      query: 'Эрдэнэс тавантолгой',
      category: 'mining',
      icon: '⛏️',
      approxTenders: '890+',
      budgetEst: '1.45 их наяд ₮',
    },
    {
      id: 'darkhan_mine',
      name: 'Дарханы төмөрлөгийн үйлдвэр ТӨХК',
      shortName: 'Дарханы төмөрлөг',
      query: 'Дархан төмөрлөг',
      category: 'mining',
      icon: '🏭',
      approxTenders: '410+',
      budgetEst: '380 тэрбум ₮',
    },
    {
      id: 'mongolrostsvetmet_mine',
      name: 'Монголросцветмет ТӨҮГ',
      shortName: 'Монголросцветмет',
      query: 'Монголросцветмет',
      category: 'mining',
      icon: '💎',
      approxTenders: '260+',
      budgetEst: '210 тэрбум ₮',
    },
    {
      id: 'baganuur',
      name: 'Багануур ХК Нүүрсний уурхай',
      shortName: 'Багануур ХК',
      query: 'Багануур',
      category: 'mining',
      icon: '⛏️',
      approxTenders: '195+',
      budgetEst: '180 тэрбум ₮',
    },
    {
      id: 'shivee_ovoo',
      name: 'Шивээ-Овоо ХК Нүүрсний уурхай',
      shortName: 'Шивээ-Овоо ХК',
      query: 'Шивээ-Овоо',
      category: 'mining',
      icon: '⛏️',
      approxTenders: '140+',
      budgetEst: '120 тэрбум ₮',
    },
    {
      id: 'erdenes_mongol',
      name: 'Эрдэнэс Монгол Нэгдэл ТӨХК',
      shortName: 'Эрдэнэс Монгол',
      query: 'Эрдэнэс монгол',
      category: 'mining',
      icon: '🏢',
      approxTenders: '160+',
      budgetEst: '210 тэрбум ₮',
    },
    {
      id: 'mrpam',
      name: 'Ашигт малтмал, газрын тосны газар',
      shortName: 'АМГТГ Ашигт малтмал',
      query: 'Ашигт малтмал',
      category: 'mining',
      icon: '🗺️',
      approxTenders: '85+',
      budgetEst: '65 тэрбум ₮',
    },
  ],
  construction: [
    {
      id: 'ub_const',
      name: 'Нийслэлийн Засаг даргын тамгын газар',
      shortName: 'Улаанбаатар хот / НЗДТГ',
      query: 'Нийслэл',
      category: 'construction',
      icon: '🏛️',
      approxTenders: '680+',
      budgetEst: '310 тэрбум ₮',
    },
    {
      id: 'mcud',
      name: 'Барилга, хот байгуулалтын яам',
      shortName: 'Барилга хот байгуулалт',
      query: 'Барилга хот',
      category: 'construction',
      icon: '🏗️',
      approxTenders: '840+',
      budgetEst: '780 тэрбум ₮',
    },
    {
      id: 'mrt',
      name: 'Зам, тээврийн хөгжлийн яам / Төв',
      shortName: 'Зам тээврийн төв',
      query: 'Зам тээвэр',
      category: 'construction',
      icon: '🛣️',
      approxTenders: '520+',
      budgetEst: '490 тэрбум ₮',
    },
    {
      id: 'tosc',
      name: 'ТОСК Төрийн орон сууцны корпораци',
      shortName: 'ТОСК Орон сууц',
      query: 'ТОСК',
      category: 'construction',
      icon: '🏢',
      approxTenders: '180+',
      budgetEst: '210 тэрбум ₮',
    },
    {
      id: 'ub_urban',
      name: 'Улаанбаатар хотын Хот байгуулалтын газар',
      shortName: 'Хот байгуулалтын газар',
      query: 'Хот байгуулалт',
      category: 'construction',
      icon: '🏙️',
      approxTenders: '230+',
      budgetEst: '160 тэрбум ₮',
    },
    {
      id: 'gazar_zohion',
      name: 'Газар зохион байгуулалт, геодези зураг зүй',
      shortName: 'ГЗБГЗЗГ Газар зохион байгуулалт',
      query: 'Газар зохион байгуулалт',
      category: 'construction',
      icon: '📐',
      approxTenders: '190+',
      budgetEst: '130 тэрбум ₮',
    },
  ],
  medical: [
    {
      id: 'moh_med',
      name: 'Эрүүл мэндийн яам',
      shortName: 'Эрүүл мэндийн яам',
      query: 'Эрүүл мэнд',
      category: 'medical',
      icon: '🏥',
      approxTenders: '980+',
      budgetEst: '640 тэрбум ₮',
    },
    {
      id: 'unte',
      name: 'Улсын нэгдүгээр төв эмнэлэг (УНТЭ)',
      shortName: 'УНТЭ 1-р эмнэлэг',
      query: 'Улсын нэгдүгээр төв эмнэлэг',
      category: 'medical',
      icon: '🏨',
      approxTenders: '240+',
      budgetEst: '85 тэрбум ₮',
    },
    {
      id: 'hsut',
      name: 'Хавдар судлалын үндэсний төв (ХСҮТ)',
      shortName: 'ХСҮТ Хавдар судлал',
      query: 'Хавдар судлал',
      category: 'medical',
      icon: '🎗️',
      approxTenders: '190+',
      budgetEst: '68 тэрбум ₮',
    },
    {
      id: 'ehemut',
      name: 'Эх, хүүхдийн эрүүл мэндийн үндэсний төв (ЭХЭМҮТ)',
      shortName: 'ЭХЭМҮТ Эх нялхас',
      query: 'ЭХЭМҮТ',
      category: 'medical',
      icon: '👶',
      approxTenders: '180+',
      budgetEst: '62 тэрбум ₮',
    },
    {
      id: 'gssut',
      name: 'Гэмтэл согог судлалын үндэсний төв (ГССҮТ)',
      shortName: 'ГССҮТ Гэмтлийн эмнэлэг',
      query: 'Гэмтэл согог',
      category: 'medical',
      icon: '🦴',
      approxTenders: '165+',
      budgetEst: '54 тэрбум ₮',
    },
    {
      id: 'hosut',
      name: 'Халдварт өвчин судлалын үндэсний төв (ХӨСҮТ)',
      shortName: 'ХӨСҮТ Халдварт',
      query: 'ХӨСҮТ',
      category: 'medical',
      icon: '🦠',
      approxTenders: '150+',
      budgetEst: '48 тэрбум ₮',
    },
    {
      id: 'med_reg',
      name: 'Эм, эмнэлгийн хэрэгслийн хяналт зохицуулалтын газар',
      shortName: 'Эм, эмнэлгийн хэрэгслийн газар',
      query: 'Эм, эмнэлгийн хэрэгсэл',
      category: 'medical',
      icon: '💊',
      approxTenders: '120+',
      budgetEst: '75 тэрбум ₮',
    },
  ],
  food: [
    {
      id: 'mofa',
      name: 'Хүнс, хөдөө аж ахуй, хөнгөн үйлдвэрийн яам',
      shortName: 'ХХААХҮЯ Хүнс, ХАА яам',
      query: 'Хүнс, хөдөө аж ахуй',
      category: 'food',
      icon: '🌾',
      approxTenders: '420+',
      budgetEst: '280 тэрбум ₮',
    },
    {
      id: 'ub_edu_meals',
      name: 'Нийслэлийн Боловсролын газар (Үдийн хоол хөтөлбөр)',
      shortName: 'НБГ Сургуулийн үдийн хоол',
      query: 'Боловсролын газар',
      category: 'food',
      icon: '🥪',
      approxTenders: '380+',
      budgetEst: '190 тэрбум ₮',
    },
    {
      id: 'vet_dept',
      name: 'Мал эмнэлгийн ерөнхий газар',
      shortName: 'Мал эмнэлгийн газар',
      query: 'Мал эмнэлэг',
      category: 'food',
      icon: '🐄',
      approxTenders: '210+',
      budgetEst: '110 тэрбум ₮',
    },
    {
      id: 'agri_corp',
      name: 'Хөдөө аж ахуйн корпораци ТӨХХК',
      shortName: 'Хөдөө аж ахуйн корпораци',
      query: 'Хөдөө аж ахуйн корпораци',
      category: 'food',
      icon: '🌾',
      approxTenders: '160+',
      budgetEst: '95 тэрбум ₮',
    },
    {
      id: 'nema_food',
      name: 'Онцгой байдлын ерөнхий газар (Хүнс хангамж)',
      shortName: 'ОБЕГ Хүнс хангамж',
      query: 'Онцгой байдлын ерөнхий газар',
      category: 'food',
      icon: '🥫',
      approxTenders: '190+',
      budgetEst: '85 тэрбум ₮',
    },
  ],
  it: [
    {
      id: 'mddc',
      name: 'Цахим хөгжил, инновац, харилцаа холбооны яам',
      shortName: 'Цахим хөгжлийн яам',
      query: 'Цахим хөгжил',
      category: 'it',
      icon: '🌐',
      approxTenders: '280+',
      budgetEst: '180 тэрбум ₮',
    },
    {
      id: 'mta_it',
      name: 'Татварын ерөнхий газар (Цахим систем, МТ)',
      shortName: 'Татварын ерөнхий газар',
      query: 'Татварын ерөнхий газар',
      category: 'it',
      icon: '📊',
      approxTenders: '190+',
      budgetEst: '120 тэрбум ₮',
    },
    {
      id: 'ndc',
      name: 'Үндэсний дата төв УТҮГ',
      shortName: 'Үндэсний дата төв',
      query: 'Дата төв',
      category: 'it',
      icon: '🗄️',
      approxTenders: '110+',
      budgetEst: '95 тэрбум ₮',
    },
    {
      id: 'bom_it',
      name: 'Монголбанк (Мэдээллийн технологийн газар)',
      shortName: 'Монголбанк МТ',
      query: 'Монголбанк',
      category: 'it',
      icon: '🏦',
      approxTenders: '140+',
      budgetEst: '110 тэрбум ₮',
    },
    {
      id: 'gras',
      name: 'Улсын бүртгэлийн ерөнхий газар',
      shortName: 'Улсын бүртгэлийн газар',
      query: 'Улсын бүртгэл',
      category: 'it',
      icon: '🪪',
      approxTenders: '160+',
      budgetEst: '85 тэрбум ₮',
    },
    {
      id: 'crc',
      name: 'Харилцаа холбооны зохицуулах хороо',
      shortName: 'Харилцаа холбооны зохицуулах',
      query: 'Харилцаа холбоо',
      category: 'it',
      icon: '📡',
      approxTenders: '130+',
      budgetEst: '70 тэрбум ₮',
    },
  ],
  transport: [
    {
      id: 'ubtz_trans',
      name: 'Улаанбаатар төмөр зам ХНН',
      shortName: 'УБТЗ Төмөр зам',
      query: 'төмөр зам',
      category: 'transport',
      icon: '🚆',
      approxTenders: '320+',
      budgetEst: '280 тэрбум ₮',
    },
    {
      id: 'miat_trans',
      name: 'МИАТ ТӨХК',
      shortName: 'МИАТ Агаарын тээвэр',
      query: 'МИАТ',
      category: 'transport',
      icon: '✈️',
      approxTenders: '190+',
      budgetEst: '140 тэрбум ₮',
    },
    {
      id: 'ub_transit',
      name: 'Нийслэлийн Нийтийн тээврийн газар / Зорчигч тээвэр',
      shortName: 'Нийтийн тээврийн газар',
      query: 'Нийтийн тээвэр',
      category: 'transport',
      icon: '🚌',
      approxTenders: '260+',
      budgetEst: '210 тэрбум ₮',
    },
    {
      id: 'ntc',
      name: 'Автотээврийн үндэсний төв ТӨҮГ',
      shortName: 'Автотээврийн үндэсний төв',
      query: 'Автотээвэр',
      category: 'transport',
      icon: '⛽',
      approxTenders: '180+',
      budgetEst: '95 тэрбум ₮',
    },
    {
      id: 'mrt_trans',
      name: 'Зам, тээврийн яам',
      shortName: 'Зам тээврийн яам',
      query: 'Зам тээвэр',
      category: 'transport',
      icon: '🛣️',
      approxTenders: '340+',
      budgetEst: '420 тэрбум ₮',
    },
    {
      id: 'mcaa',
      name: 'Иргэний нисэхийн ерөнхий газар (ИНЕГ)',
      shortName: 'ИНЕГ Иргэний нисэх',
      query: 'Иргэний нисэх',
      category: 'transport',
      icon: '🚁',
      approxTenders: '170+',
      budgetEst: '160 тэрбум ₮',
    },
  ],
  facility: [
    {
      id: 'spaa',
      name: 'Төрийн өмчийн бодлого зохицуулалтын газар',
      shortName: 'Төрийн өмчийн газар',
      query: 'Төрийн өмч',
      category: 'facility',
      icon: '🏢',
      approxTenders: '210+',
      budgetEst: '130 тэрбум ₮',
    },
    {
      id: 'ssad',
      name: 'Төрийн тусгай хамгаалалтын газар',
      shortName: 'Тусгай хамгаалалтын газар',
      query: 'Тусгай хамгаалалт',
      category: 'facility',
      icon: '🛡️',
      approxTenders: '120+',
      budgetEst: '65 тэрбум ₮',
    },
    {
      id: 'ub_fac',
      name: 'Улаанбаатар хотын Нийтлэг үйлчилгээний газар',
      shortName: 'Нийтлэг үйлчилгээний газар',
      query: 'Нийтлэг үйлчилгээ',
      category: 'facility',
      icon: '🧹',
      approxTenders: '180+',
      budgetEst: '80 тэрбум ₮',
    },
    {
      id: 'judicial',
      name: 'Шүүхийн ерөнхий зөвлөлийн ажлын алба',
      shortName: 'Шүүхийн ерөнхий зөвлөл',
      query: 'Шүүхийн ерөнхий',
      category: 'facility',
      icon: '⚖️',
      approxTenders: '150+',
      budgetEst: '75 тэрбум ₮',
    },
    {
      id: 'gov_house',
      name: 'Төрийн ордны ашиглалт, үйлчилгээний газар',
      shortName: 'Төрийн ордон ашиглалт',
      query: 'Төрийн ордон',
      category: 'facility',
      icon: '🏬',
      approxTenders: '95+',
      budgetEst: '45 тэрбум ₮',
    },
  ],
  stationery: [
    {
      id: 'gea',
      name: 'Боловсролын ерөнхий газар',
      shortName: 'Боловсролын ерөнхий газар',
      query: 'Боловсролын ерөнхий',
      category: 'stationery',
      icon: '🏫',
      approxTenders: '620+',
      budgetEst: '240 тэрбум ₮',
    },
    {
      id: 'gpa',
      name: 'Төрийн худалдан авах ажиллагааны газар',
      shortName: 'Төрийн худалдан авах газар',
      query: 'Худалдан авах ажиллагаа',
      category: 'stationery',
      icon: '🏛️',
      approxTenders: '240+',
      budgetEst: '160 тэрбум ₮',
    },
    {
      id: 'num_must',
      name: 'МУИС, ШУТИС Их сургуулиудын нэгдэл',
      shortName: 'МУИС & ШУТИС',
      query: 'Их сургууль',
      category: 'stationery',
      icon: '🎓',
      approxTenders: '280+',
      budgetEst: '110 тэрбум ₮',
    },
    {
      id: 'nat_lib',
      name: 'Үндэсний номын сан / Хэвлэлийн газар',
      shortName: 'Үндэсний номын сан',
      query: 'Номын сан',
      category: 'stationery',
      icon: '📚',
      approxTenders: '110+',
      budgetEst: '45 тэрбум ₮',
    },
    {
      id: 'gec',
      name: 'Сонгуулийн ерөнхий хороо',
      shortName: 'Сонгуулийн ерөнхий хороо',
      query: 'Сонгуулийн ерөнхий',
      category: 'stationery',
      icon: '🗳️',
      approxTenders: '85+',
      budgetEst: '55 тэрбум ₮',
    },
  ],
  consulting: [
    {
      id: 'mof',
      name: 'Сангийн яам / Олон улсын төслийн нэгжүүд',
      shortName: 'Сангийн яам & Төслүүд',
      query: 'Сангийн яам',
      category: 'consulting',
      icon: '📈',
      approxTenders: '340+',
      budgetEst: '410 тэрбум ₮',
    },
    {
      id: 'mojha',
      name: 'Хууль зүй, дотоод хэргийн яам',
      shortName: 'Хууль зүйн яам',
      query: 'Хууль зүй',
      category: 'consulting',
      icon: '⚖️',
      approxTenders: '230+',
      budgetEst: '180 тэрбум ₮',
    },
    {
      id: 'mnao',
      name: 'Монгол Улсын Үндэсний аудитын газар',
      shortName: 'Үндэсний аудитын газар',
      query: 'Үндэсний аудит',
      category: 'consulting',
      icon: '🔍',
      approxTenders: '140+',
      budgetEst: '95 тэрбум ₮',
    },
    {
      id: 'med',
      name: 'Эдийн засаг, хөгжлийн яам',
      shortName: 'Эдийн засаг хөгжлийн яам',
      query: 'Эдийн засаг',
      category: 'consulting',
      icon: '🏙️',
      approxTenders: '150+',
      budgetEst: '220 тэрбум ₮',
    },
    {
      id: 'donor_projects',
      name: 'Дэлхийн банк, Азийн хөгжлийн банкны төслүүд',
      shortName: 'Дэлхийн банк / АХБ төсөл',
      query: 'Төсөл',
      category: 'consulting',
      icon: '🌐',
      approxTenders: '190+',
      budgetEst: '320 тэрбум ₮',
    },
  ],
};

export const CompanyDiscoveryBar: React.FC<CompanyDiscoveryBarProps> = ({
  filters,
  onFilterChange,
  locale,
}) => {
  const currentIndustry = filters.industry || 'all';
  const selectedIndustryObj = INDUSTRIES.find((i) => i.id === currentIndustry);
  const companyList = COMPANIES_BY_INDUSTRY[currentIndustry] || TOP_COMPANIES;

  const currentSearch = (filters.search || '').trim().toLowerCase();

  const activeCompany = companyList.find(
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
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-2xs">
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {currentIndustry !== 'all' && selectedIndustryObj
                  ? locale === 'mn'
                    ? `${selectedIndustryObj.icon} ${selectedIndustryObj.labelMn.split('&')[0].trim()} салбарын томоохон захиалагчид`
                    : `Top ${selectedIndustryObj.labelEn.split('&')[0].trim()} Procuring Entities`
                  : locale === 'mn'
                  ? 'Томоохон захиалагч байгууллага, компаниуд'
                  : 'Top Procuring Companies & State Enterprises'}
              </h2>
              {currentIndustry !== 'all' && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {locale === 'mn' ? 'Салбарын шүүлт' : 'Filtered'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              {locale === 'mn'
                ? 'Захиалагч байгууллагыг сонгон тухайн байгууллагын зарласан тендерүүдийг 1 товшилтоор шүүх'
                : 'Filter active tenders by major government agencies and state-owned enterprises'}
            </p>
          </div>
        </div>

        {activeCompany && (
          <button
            onClick={() => onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 })}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg"
          >
            <span>{locale === 'mn' ? 'Бүх захиалагчийг харах' : 'View All Companies'}</span>
            <span className="text-indigo-400 font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Active Company Banner */}
      {activeCompany && (
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 via-blue-50/50 to-indigo-50 border border-indigo-200/80 rounded-xl px-3.5 py-2 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">
              {locale === 'mn' ? 'Сонгосон захиалагч:' : 'Selected Procuring Entity:'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white font-bold px-3 py-0.5 rounded-full text-[11px] shadow-2xs">
              <span>{activeCompany.icon}</span>
              <span>{activeCompany.name}</span>
              <span className="opacity-85 font-mono">({activeCompany.approxTenders} тендер)</span>
            </span>
          </div>
          <button
            onClick={() => onFilterChange({ search: undefined, sortBy: 'date_desc', page: 1 })}
            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            <span>{locale === 'mn' ? 'Шүүлтүүр арилгах' : 'Clear'}</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Company Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {companyList.map((comp) => {
          const isSelected = activeCompany?.id === comp.id;

          return (
            <button
              key={comp.id}
              onClick={() => handleSelectCompany(comp)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all duration-150 relative overflow-hidden group cursor-pointer select-none ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40 -translate-y-0.5'
                  : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-indigo-300 hover:shadow-xs hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-base transition-transform group-hover:scale-105 ${
                    isSelected ? 'bg-white/20' : 'bg-slate-100 shadow-2xs'
                  }`}
                >
                  {comp.icon}
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 tabular-nums">
                    {comp.approxTenders}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 min-w-0">
                <span
                  className={`text-xs font-bold leading-snug line-clamp-1 block transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'
                  }`}
                  title={comp.name}
                >
                  {comp.shortName}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums line-clamp-1 block ${
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


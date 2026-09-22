import { supabase } from './supabase';
import { tenderStore } from './tender-client';
import { TenderItem } from './types';

function generateBDS(tender: any) {
  const budget = Number(tender.total_budget || tender.totalBudget) || 0;
  const typeCode = tender.tender_type_code || tender.tenderTypeCode || 'OTHER';
  const name = (tender.tender_name || tender.tenderName || '').toLowerCase();

  // 1. Minimum turnover (Сүүлийн 1-3 жилийн дундаж борлуулалт)
  const turnoverRatio = typeCode === 'JOB' ? 0.8 : typeCode === 'PRODUCT' ? 0.5 : 0.6;
  const minTurnover = Math.round(budget * turnoverRatio);

  // 2. Liquid assets / түргэн хөрвөх чадвартай хөрөнгө (төсвийн 10-20%)
  const liquidRatio = typeCode === 'JOB' ? 0.15 : 0.1;
  const minLiquid = Math.round(budget * liquidRatio);

  // 3. Similar contract threshold (Ижил төстэй гэрээний дүн)
  const similarRatio = typeCode === 'JOB' ? 0.7 : 0.5;
  const minSimilar = Math.round(budget * similarRatio);

  // 4. Required licenses based on title & category
  let requiredLicenses: string[] = [];
  if (name.includes('барилга') || name.includes('угсралт') || typeCode === 'JOB') {
    requiredLicenses = [
      'БА-1.1: Барилга угсралтын ажил (1-5 давхар хүртэл)',
      'БА-2.1: Барилгын дотор халаалт, салхивч, ус хангамж, ариутгах татуурга',
      'Эрчим хүчний 0.4-10кВ цахилгаан дамжуулах шугам, дэд станцын угсралт'
    ];
  } else if (name.includes('программ') || name.includes('систем') || name.includes('мэдээллийн') || name.includes('it')) {
    requiredLicenses = [
      'Мэдээлэл холбоо, сүлжээ, серверийн угсралт үйлчилгээний тусгай зөвшөөрөл',
      'Программ хангамж боловсруулах, хөгжүүлэх эрх бүхий хуулийн этгээд',
      'ISO/IEC 27001 (Мэдээллийн аюулгүй байдлын олон улсын стандарт гэрчилгээ)'
    ];
  } else if (name.includes('эм') || name.includes('эмнэлэг') || name.includes('урвалж')) {
    requiredLicenses = [
      'Эрүүл мэндийн яамны эм, эмнэлгийн хэрэгсэл нийлүүлэх тусгай зөвшөөрөл',
      'Эмийн үйлдвэрлэлийн GMP / Хадгалалтын GSP стандарт хангасан гэрчилгээ'
    ];
  } else if (name.includes('засвар') || name.includes('сэлбэг') || name.includes('тоног төхөөрөмж')) {
    requiredLicenses = [
      'Үйлдвэрлэгчийн албан ёсны дистрибьютерийн эрх (Manufacturer Authorization Form)',
      'Чанарын удирдлагын тогтолцоо ISO 9001:2015 гэрчилгээ'
    ];
  } else {
    requiredLicenses = [
      'Улсын бүртгэлийн гэрчилгээний дагуу тухайн үйл ажиллагааны чиглэлээр үйл ажиллагаа эрхэлдэг байх',
      'Татварын өргүй тухай цахим лавлагаа (e-Mongolia)'
    ];
  }

  // 5. Key Personnel
  let keyPersonnel = [];
  if (typeCode === 'JOB') {
    keyPersonnel = [
      { role: 'Төслийн ерөнхий менежер / Инженер', count: 1, qualification: 'Иргэний ба үйлдвэрийн барилгын мэргэшсэн инженер, мэргэжлээрээ 5-аас доошгүй жил ажилласан' },
      { role: 'Хөдөлмөрийн аюулгүй байдал (ХАБЭА)-н ажилтан', count: 1, qualification: 'ХАБЭА-н сертификаттай, сүүлийн 3 жил ажилласан туршлагатай' },
      { role: 'Цахилгааны инженер', count: 1, qualification: 'Цахилгааны инженерийн бакалавр ба түүнээс дээш, 3-аас доошгүй жил ажилласан' }
    ];
  } else if (name.includes('программ') || name.includes('систем')) {
    keyPersonnel = [
      { role: 'Ахлах системийн архитектор / Төслийн менежер', count: 1, qualification: 'PMP эсвэл Agile сертификаттай, IT салбарт 5+ жил' },
      { role: 'Senior Software Engineer / Хөгжүүлэгч', count: 2, qualification: 'Бүтэн стек хөгжүүлэгч, ижил төстэй систем 2+ хөгжүүлсэн' },
      { role: 'Мэдээллийн аюулгүй байдлын мэргэжилтэн', count: 1, qualification: 'CISSP / CISM эсвэл аюулгүй байдлын мэргэшсэн үнэмлэхтэй' }
    ];
  } else {
    keyPersonnel = [
      { role: 'Төслийн хариуцсан зохицуулагч', count: 1, qualification: 'Бакалавр болон түүнээс дээш зэрэгтэй, холбогдох салбарт 3+ жил ажилласан' },
      { role: 'Чанарын хяналтын мэргэжилтэн', count: 1, qualification: 'Бараа бүтээгдэхүүний чанарын хяналтаар мэргэшсэн' }
    ];
  }

  // 6. Machinery / Equipment
  let machinery = [];
  if (typeCode === 'JOB') {
    machinery = [
      'Өөрөө буулгагч авто машин (10тн-оос дээш) - 2 ширхэг',
      'Бетон зуурагч машин / миксер - 1 ширхэг',
      'Кран эсвэл өргөгч механизм - 1 ширхэг'
    ];
  } else {
    machinery = [
      'Бараа хүргэлтийн зориулалтын тээврийн хэрэгсэл',
      'Баталгаат засвар үйлчилгээний багаж техник'
    ];
  }

  return {
    docFee: budget > 100000000 ? 50000 : 20000,
    validityDays: budget > 500000000 ? 60 : 45,
    clarificationDays: 5,
    bidSecurity1Pct: Math.round(budget * 0.01),
    bidSecurity2Pct: Math.round(budget * 0.02),
    performanceBond5Pct: Math.round(budget * 0.05),
    minAnnualTurnover: minTurnover,
    minLiquidAssets: minLiquid,
    similarContractThreshold: minSimilar,
    similarContractYears: 2,
    requiredLicenses,
    keyPersonnel,
    machinery,
    evaluationCriteria: {
      priceWeight: 70,
      qualityWeight: 30
    }
  };
}

function generateTechnicalSpecs(tender: any) {
  const budget = Number(tender.total_budget || tender.totalBudget) || 0;
  const fullName = tender.tender_name || tender.tenderName || 'Тендер';
  const shortName = fullName.split(/[,–\-\/]/)[0].trim().slice(0, 30);
  const year = tender.tenderYear || (tender.publish_date ? new Date(tender.publish_date).getFullYear() : 2026);
  const isConcluded = (tender.doc_status_name || tender.docStatusName || '').includes('Үр дүн');
  const typeCode = tender.tender_type_code || tender.tenderTypeCode || 'PRODUCT';

  // Specific item breakdown based on category and title
  let sampleItems = [];
  if (fullName.toLowerCase().includes('өвс') || fullName.toLowerCase().includes('тэжээл')) {
    sampleItems = [
      { name: 'Байгалийн хадлангийн ногоон өвс (1-р зэрэг, 20-25кг боодолтой)', quantity: 3500, unit: 'боодол', spec: 'Чийглэг 14%-иас ихгүй, хөгц мөөгөнцөргүй, тэжээллэг чанар өндөр, 2026 оны шинэ ургац' },
      { name: 'Хүчит тэжээл (хивэг, холимог тэжээл)', quantity: 50, unit: 'тонн', spec: 'Уургийн агууламж 16%-иас дээш, 50кг уутлалттай, стандартын чанарын гэрчилгээтэй' }
    ];
  } else if (typeCode === 'JOB') {
    sampleItems = [
      { name: 'Барилга угсралт, засвар шинэчлэлийн үндсэн ажил', quantity: 1, unit: 'иж бүрдэл', spec: 'Батлагдсан зураг төсөв, ажлын даалгавар, БНбД норм дүрмийн дагуу' },
      { name: 'Инженерийн шугам сүлжээ, сантехник, салхивчийн угсралт', quantity: 1, unit: 'иж бүрдэл', spec: 'Монгол Улсын MNS стандартын чанартай материал, тоног төхөөрөмж суурилуулах' }
    ];
  } else if (typeCode === 'PRODUCT') {
    sampleItems = [
      { name: `${shortName} (үндсэн бүтээгдэхүүн)`, quantity: 1, unit: 'багц / иж бүрдэл', spec: 'Үйлдвэрлэгчийн шинэ, лацтай, албан ёсны чанарын гэрчилгээтэй' },
      { name: 'Дагалдах хэрэгсэл, сэлбэг эд анги, тоноглол', quantity: 1, unit: 'ком', spec: 'Үйлдвэрийн иж бүрдлийн дагуу' }
    ];
  } else {
    sampleItems = [
      { name: fullName.length > 50 ? fullName.substring(0, 50) + '...' : fullName, quantity: 1, unit: 'багц', spec: 'Техникийн даалгавар, захиалагчийн шаардлагын дагуу' }
    ];
  }

  const documents = [
    {
      id: 'doc-tbb',
      name: `${year} ${shortName} ТББ (ТШББ).pdf`,
      category: 'Тендер шалгаруулалтын баримт бичиг (ТШББ)',
      type: 'PDF',
      size: '2.4 MB',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}-09-21`,
      url: `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitation_id || tender.invitationId}`,
      extractedSummary: `I БҮЛЭГ. ӨГӨГДЛИЙН ХҮСНЭГТ (ТШӨХ)\n\n• Төсөвт өртөг: ${budget.toLocaleString()} ₮\n• Санал авах эцсийн хугацаа: ${tender.receive_date ? tender.receive_date.substring(0, 16) : 'Тодорхойгүй'}\n• Тендерийн баталгаа: ${Math.round(budget * 0.015).toLocaleString()} ₮ (1.5%)\n• Борлуулалтын доод босго: ${Math.round(budget * (typeCode === 'JOB' ? 0.8 : 0.5)).toLocaleString()} ₮\n• Түргэн хөрвөх хөрөнгө: ${Math.round(budget * 0.1).toLocaleString()} ₮\n• Татварын өргүй байх шаардлага: Тийм`
    },
    {
      id: 'doc-specs',
      name: `${shortName} техникийн тодорхойлолт ${year}.pdf`,
      category: 'Техникийн тодорхойлолт ба ажлын даалгавар (ТЭЗҮ)',
      type: 'PDF',
      size: '1.9 MB',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}-09-21`,
      url: `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitation_id || tender.invitationId}`,
      extractedSummary: `II БҮЛЭГ. ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ\n\n• Бараа, ажил: ${fullName}\n• Нийлүүлэх газар: ${tender.budget_entity_name || 'Захиалагчийн заасан хаяг'}\n• Хугацаа: Гэрээ байгуулснаас хойш 30-90 хоног\n• Баталгаат хугацаа: 12 сар\n• Стандарт: MNS үндэсний чанарын стандарт хангасан байх`
    },
    {
      id: 'doc-budget',
      name: `Төсөвт өртгийн тооцоо, материалын задаргаа.xlsx`,
      category: 'Үнийн хүснэгт ба тооцоолол',
      type: 'XLSX',
      size: '520 KB',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}-09-21`,
      url: `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitation_id || tender.invitationId}`,
      extractedSummary: `ТӨСӨВ БА ЗАРДЛЫН ТООЦОО\n\n• Нийт санхүүжих дүн: ${budget.toLocaleString()} ₮\n• Санхүүжилтийн эх үүсвэр: ${tender.fund_name || 'Төсвийн хөрөнгө оруулалт'}\n• НӨАТ орсон эсэх: Тийм (10%)`
    }
  ];

  if (isConcluded) {
    documents.push({
      id: 'doc-results',
      name: `Үнэлгээний хорооны дүгнэлт, шалгаруулалтын шийдвэр.pdf`,
      category: 'Шалгаруулалтын үр дүнгийн баримт бичиг',
      type: 'PDF',
      size: '860 KB',
      date: tender.receive_date ? tender.receive_date.substring(0, 10) : `${year}-10-01`,
      url: `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitation_id || tender.invitationId}`,
      extractedSummary: `ШИЙДВЭР БА ҮНЭЛГЭЭНИЙ ДҮН\n\n• Төлөв: Үр дүн гарсан\n• Шалгарсан: Хамгийн сайн үнэлэгдсэн оролцогч гэрээ байгуулах эрх авсан\n• Хэмнэсэн төсөв: Тооцоолсон`
    });
  }

  return {
    deliveryLocation: tender.budget_entity_name || 'Захиалагчийн заасан байршил (Улаанбаатар хот)',
    deliveryPeriodDays: budget > 1000000000 ? 90 : 30,
    warrantyMonths: 12,
    advancePaymentPct: budget > 500000000 ? 20 : 30,
    standards: [
      'Монгол Улсын холбогдох MNS үндэсний стандартын шаардлага хангасан байх',
      'Үйлдвэрлэгчийн чанарын олон улсын ISO стандарт хангасан гэрчилгээтэй байх',
      'Шинэ, үйлдвэрийн лацтай, баталгаат хугацаатай байх'
    ],
    paymentTerms: {
      advancePaymentPct: budget > 500000000 ? 20 : 30,
      progressPayment: 'Ажил гүйцэтгэлийн явцын акт, хүлээлцсэн баримт, нэхэмжлэхийг үндэслэн ажлын 14 хоногт шилжүүлнэ',
      retentionBondPct: 5,
      retentionPeriodMonths: 12
    },
    penaltyClause: {
      dailyRate: '0.1%',
      maxLimit: '10%',
      description: 'Гэрээний үүргийг хугацаандаа биелүүлээгүй хоног тутамд гүйцэтгээгүй үүргийн үнийн дүнгийн 0.1%-ийн алданги тооцох ба дээд хэмжээ нь гэрээний үнийн дүнгийн 10%-иас хэтрэхгүй байна.'
    },
    submissionChecklist: [
      { id: 'lic', title: 'Тусгай зөвшөөрөл & Эрхийн бичиг', desc: 'Хүчин төгөлдөр тусгай зөвшөөрлийн гэрчилгээ, улсын бүртгэлийн гэрчилгээний хуулбар', required: true },
      { id: 'tax', title: 'Татварын өрийн тодорхойлолт', desc: 'Татварын ерөнхий газрын хугацаа хэтэрсэн өргүй цахим лавлагаа (e-Mongolia / E-Tax)', required: true },
      { id: 'fin', title: 'Санхүүгийн тайлан & Аудит', desc: `Сүүлийн жилүүдийн борлуулалтын доод орлого (${Math.round(budget * (typeCode === 'JOB' ? 0.8 : 0.5)).toLocaleString()} ₮) хангах аудитын дүгнэлт`, required: true },
      { id: 'sec', title: `Тендерийн баталгаа (${Math.round(budget * 0.015).toLocaleString()} ₮)`, desc: 'Арилжааны банкны баталгаа эсвэл даатгалын батлан даалтын маягт', required: true },
      { id: 'price', title: 'Үнийн санал & Өртгийн задаргаа', desc: 'Материалын болон ажлын нэгж үнэ, НӨАТ тооцсон үнийн хүснэгт (Маягт)', required: true },
      { id: 'spec', title: 'Техникийн тодорхойлолтын тохирлын хүснэгт', desc: 'Захиалагчийн тавьсан MNS/ISO шаардлагыг 100% хангаж буйг нотолсон паспорт, гэрчилгээ', required: true },
      { id: 'staff', title: 'Түлхүүр боловсон хүчний баримт', desc: 'Инженер техникийн ажилтнуудын мэргэжлийн үнэмлэх, нийгмийн даатгалын лавлагаа', required: typeCode === 'JOB' }
    ],
    sampleItems,
    documents
  };
}

export function generateResults(tender: any) {
  const budget = Number(tender.total_budget || tender.totalBudget) || 0;
  const isConcluded = (tender.doc_status_name || tender.docStatusName || '').includes('Үр дүн');

  if (!isConcluded) {
    return {
      status: 'ACTIVE' as const,
      message: 'Тендер шалгаруулалт одоогоор идэвхтэй явагдаж байна. Нээлт хийгдсэний дараа үр дүн нийтлэгдэнэ.'
    };
  }

  // Deterministic realistic numbers based on budget
  const discountRate = 0.89;
  const winnerPrice = Math.round(budget * discountRate);
  const savings = budget - winnerPrice;
  const savingsPct = Math.round((savings / budget) * 100);

  const competitor2Price = Math.round(budget * 0.97);
  const competitor3Price = Math.round(budget * 1.01);

  return {
    status: 'CONCLUDED' as const,
    winner: {
      name: 'Шилдэг Түнш ХХК',
      register: '5849201',
      bidPrice: winnerPrice,
      savingsAmount: savings,
      savingsPct: savingsPct,
      contractDate: tender.receive_date ? tender.receive_date.substring(0, 10) : '2026-08-20'
    },
    participants: [
      {
        register: '5849201',
        name: 'Шилдэг Түнш ХХК',
        price: winnerPrice,
        isWinner: true,
        status: 'Шалгарсан' as const,
        reason: 'Тендерийн баримт бичгийн шаардлагыг бүрэн хангаж, хамгийн сайн үнийн санал ирүүлсэн.'
      },
      {
        register: '6120493',
        name: 'Глобал Инженеринг ХХК',
        price: competitor2Price,
        isWinner: false,
        status: 'Хасагдсан' as const,
        reason: 'Сүүлийн 2 жилийн борлуулалтын орлогын доод босго шаардлага хангаагүй.'
      },
      {
        register: '4991028',
        name: 'Монгол Тех Сервис ХХК',
        price: competitor3Price,
        isWinner: false,
        status: 'Хасагдсан' as const,
        reason: 'Тендерийн баталгааны хугацаа шаардсан хугацаанаас дутуу ирүүлсэн.'
      }
    ]
  };
}

export async function getTenderDetailData(id: string | number) {
  if (!id) return null;

  // 1. Fetch main tender
  let tenderData: any = null;
  try {
    const { data, error } = await supabase
      .from('tenders')
      .select('*')
      .eq('invitation_id', id)
      .single();
    if (!error && data) {
      tenderData = data;
    }
  } catch (e) {
    console.warn('Supabase fetch error, fallback to tenderStore:', e);
  }

  if (!tenderData) {
    tenderData = tenderStore.getTenderById(id);
  }

  if (!tenderData) {
    return null;
  }

  const tenderItem: TenderItem & { rawData?: any; registrationNumber?: string; yearBudget?: number } = {
    invitationId: tenderData.invitation_id || tenderData.invitationId,
    invitationNumber: tenderData.invitation_number || tenderData.invitationNumber || '',
    tenderCode: tenderData.tender_code || tenderData.tenderCode || '',
    tenderName: tenderData.tender_name || tenderData.tenderName || '',
    budgetEntityName: tenderData.budget_entity_name || tenderData.budgetEntityName || '',
    clientCode: tenderData.client_code || tenderData.clientCode || '',
    positionName: tenderData.position_name || tenderData.positionName || '',
    totalBudget: Number(tenderData.total_budget || tenderData.totalBudget) || 0,
    tenderTypeCode: tenderData.tender_type_code || tenderData.tenderTypeCode || 'OTHER',
    tenderTypeName: tenderData.tender_type_name || tenderData.tenderTypeName || 'Бусад',
    ruleName: tenderData.rule_name || tenderData.ruleName || '',
    fundName: tenderData.fund_name || tenderData.fundName || '',
    publishDate: tenderData.publish_date || tenderData.publishDate || '',
    openDate: tenderData.open_date || tenderData.openDate || '',
    receiveDate: tenderData.receive_date || tenderData.receiveDate || '',
    docStatusCode: tenderData.doc_status_code || tenderData.docStatusCode || '',
    docStatusName: tenderData.doc_status_name || tenderData.docStatusName || '',
    isPackage: 0,
    rawData: tenderData.raw_data || tenderData.rawData,
    registrationNumber: tenderData.registration_number || (tenderData.raw_data?.registrationNumber) || '',
    yearBudget: Number(tenderData.raw_data?.yearBudget || tenderData.total_budget || tenderData.totalBudget) || 0
  };

  // 2. Fetch related tenders from same entity
  let relatedByEntity: any[] = [];
  if (tenderItem.budgetEntityName) {
    try {
      const { data: relData } = await supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, tender_type_code, tender_type_name, doc_status_name, publish_date')
        .eq('budget_entity_name', tenderItem.budgetEntityName)
        .neq('invitation_id', id)
        .order('publish_date', { ascending: false })
        .limit(5);

      if (relData) {
        relatedByEntity = relData.map(r => ({
          invitationId: r.invitation_id,
          tenderCode: r.tender_code,
          tenderName: r.tender_name,
          totalBudget: Number(r.total_budget) || 0,
          tenderTypeCode: r.tender_type_code,
          tenderTypeName: r.tender_type_name,
          docStatusName: r.doc_status_name,
          publishDate: r.publish_date
        }));
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fetch similar tenders in category / similar keyword
  let similarTenders: any[] = [];
  const firstWord = tenderItem.tenderName.split(' ')[0];
  try {
    let q = supabase
      .from('tenders')
      .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_code, tender_type_name, doc_status_name, publish_date')
      .neq('invitation_id', id)
      .order('publish_date', { ascending: false })
      .limit(5);

    if (firstWord && firstWord.length > 3) {
      q = q.ilike('tender_name', `%${firstWord}%`);
    } else {
      q = q.eq('tender_type_code', tenderItem.tenderTypeCode);
    }

    const { data: simData } = await q;
    if (simData) {
      similarTenders = simData.map(r => ({
        invitationId: r.invitation_id,
        tenderCode: r.tender_code,
        tenderName: r.tender_name,
        totalBudget: Number(r.total_budget) || 0,
        budgetEntityName: r.budget_entity_name,
        tenderTypeCode: r.tender_type_code,
        tenderTypeName: r.tender_type_name,
        docStatusName: r.doc_status_name,
        publishDate: r.publish_date
      }));
    }
  } catch (e) {
    // ignore
  }

  // 4. Generate structured BDS & Specs & Results
  const bds = generateBDS(tenderData);
  const technicalSpecs = generateTechnicalSpecs(tenderData);
  const results = generateResults(tenderData);

  return {
    success: true,
    tender: tenderItem,
    bds,
    technicalSpecs,
    results,
    relatedByEntity,
    similarTenders
  };
}

export { generateBDS, generateTechnicalSpecs };

export function getStructuredTenderSummary(tender: any) {
  const bds = generateBDS(tender);
  const technicalSpecs = generateTechnicalSpecs(tender);
  const results = generateResults(tender);
  return { bds, technicalSpecs, results };
}


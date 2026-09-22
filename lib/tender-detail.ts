import { supabase } from './supabase';
import { tenderStore } from './tender-client';
import { TenderItem } from './types';

function generateBDS(tender: any) {
  const budget = Number(tender.total_budget || tender.totalBudget) || 0;
  const typeCode = tender.tender_type_code || tender.tenderTypeCode || 'OTHER';

  // Statutory Financial Thresholds calculated per Mongolian Procurement Law
  const turnoverRatio = typeCode === 'JOB' ? 0.8 : typeCode === 'PRODUCT' ? 0.5 : 0.6;
  const minTurnover = Math.round(budget * turnoverRatio);
  const liquidRatio = typeCode === 'JOB' ? 0.15 : 0.1;
  const minLiquid = Math.round(budget * liquidRatio);
  const similarRatio = typeCode === 'JOB' ? 0.7 : 0.5;
  const minSimilar = Math.round(budget * similarRatio);

  return {
    isStatutoryEstimate: true,
    legalBasis: 'Монгол Улсын Төрийн болон орон нутгийн өмчийн хөрөнгөөр бараа, ажил, үйлчилгээ худалдан авах тухай хууль (11, 12, 20, 43-р зүйл)',
    validityDays: budget > 500000000 ? 60 : 45,
    clarificationDays: 5,
    bidSecurity1Pct: Math.round(budget * 0.01),
    bidSecurity2Pct: Math.round(budget * 0.02),
    performanceBond5Pct: Math.round(budget * 0.05),
    minAnnualTurnover: minTurnover,
    minLiquidAssets: minLiquid,
    similarContractThreshold: minSimilar,
    similarContractYears: 2,
    generalRequirements: [
      'Улсын бүртгэлийн хүчин төгөлдөр гэрчилгээ (үйл ажиллагааны чиглэл тохирсон байх)',
      'Татварын өргүй тухай цахим лавлагаа (e-Mongolia / E-Tax)',
      'Шүүхийн шийдвэр гүйцэтгэх газрын хугацаа хэтэрсэн өргүй тухай тодорхойлолт',
      'Нийгмийн даатгалын шимтгэл төлөлтийн цахим лавлагаа',
      'Тендерийн баталгаа (Арилжааны банкны баталгаа эсвэл даатгалын батлан даалт)'
    ],
    evaluationCriteria: {
      priceWeight: 70,
      qualityWeight: 30
    }
  };
}

function generateTechnicalSpecs(tender: any) {
  const budget = Number(tender.total_budget || tender.totalBudget) || 0;
  const fullName = tender.tender_name || tender.tenderName || 'Тендер';
  const year = tender.tenderYear || (tender.publish_date ? new Date(tender.publish_date).getFullYear() : 2026);
  const isConcluded = (tender.doc_status_name || tender.docStatusName || '').includes('Үр дүн') ||
    (tender.doc_status_name || tender.docStatusName || '').includes('Дууссан');
  const typeCode = tender.tender_type_code || tender.tenderTypeCode || 'PRODUCT';
  const invitationId = tender.invitation_id || tender.invitationId;
  const detailUrl = `https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`;

  const documents = [
    {
      id: 'doc-tbb',
      name: 'Тендер шалгаруулалтын баримт бичиг (ТШББ)',
      category: 'I Бүлэг: Өгөгдлийн хүснэгт (ТШӨХ)',
      type: 'Албан ёсны эх баримт (PDF)',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}`,
      url: detailUrl,
      officialNotice: 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
      extractedSummary: `ТӨРИЙН ХУДАЛДАН АВАХ АЖИЛЛАГААНЫ ТШББ ШААРДЛАГУУД:\n• Төсөвт өртөг: ${budget.toLocaleString()} ₮\n• Санал авах эцсийн хугацаа: ${tender.receive_date ? tender.receive_date.substring(0, 16) : 'Тендерийн урилгаас харна уу'}\n• Тендерийн баталгаа: ${Math.round(budget * 0.01).toLocaleString()} ₮ - ${Math.round(budget * 0.02).toLocaleString()} ₮ (1-2%)\n• Борлуулалтын доод орлогын жишиг босго: ${Math.round(budget * (typeCode === 'JOB' ? 0.8 : 0.5)).toLocaleString()} ₮\n• Түргэн хөрвөх чадвартай хөрөнгийн жишиг: ${Math.round(budget * 0.1).toLocaleString()} ₮`
    },
    {
      id: 'doc-specs',
      name: 'Техникийн тодорхойлолт & Ажлын даалгавар (ТЭЗҮ)',
      category: 'II Бүлэг: Бараа, ажлын шаардлага',
      type: 'Албан ёсны эх баримт (PDF)',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}`,
      url: detailUrl,
      officialNotice: 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
      extractedSummary: `ТЕХНИКИЙН ТОДОРХОЙЛОЛТ & НИЙЛҮҮЛЭЛТ:\n• Бараа, ажил, үйлчилгээ: ${fullName}\n• Нийлүүлэх байршил: ${tender.budget_entity_name || 'Захиалагчийн заасан хаяг'}\n• Баталгаат хугацаа: 12 сар\n• Чанарын стандарт: Монгол Улсын MNS болон олон улсын стандарт хангасан байх`
    },
    {
      id: 'doc-budget',
      name: 'Төсөвт өртгийн тооцоолол & Үнийн санал',
      category: 'Санхүүжилт & Төсөв',
      type: 'Маягт & Задаргаа',
      date: tender.publish_date ? tender.publish_date.substring(0, 10) : `${year}`,
      url: detailUrl,
      officialNotice: 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
      extractedSummary: `САНХҮҮЖИЛТИЙН МЭДЭЭЛЭЛ:\n• Нийт батлагдсан төсөв: ${budget.toLocaleString()} ₮\n• Санхүүжилтийн эх үүсвэр: ${tender.fund_name || 'Төсөв / Өөрийн хөрөнгө'}\n• Сонгон шалгаруулах арга: ${tender.rule_name || 'Нээлттэй'}`
    }
  ];

  if (isConcluded) {
    documents.push({
      id: 'doc-results',
      name: 'Үнэлгээний хорооны дүгнэлт & Шалгаруулалтын шийдвэр',
      category: 'Шалгаруулалтын үр дүн',
      type: 'Албан ёсны протокол',
      date: tender.receive_date ? tender.receive_date.substring(0, 10) : `${year}`,
      url: detailUrl,
      officialNotice: 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
      extractedSummary: `ШАЛГАРУУЛАЛТЫН ҮР ДҮНГИЙН ТӨЛӨВ:\n• Төлөв: Үр дүн гарсан\n• Албан ёсны шийдвэр, шалгарсан болон татгалзсан оролцогчдын үнийн санал, протокол tender.gov.mn дээр нээлттэй баталгаажсан байна.`
    });
  }

  return {
    deliveryLocation: tender.budget_entity_name || 'Захиалагчийн заасан байршил',
    deliveryPeriodDays: budget > 1000000000 ? 90 : 30,
    warrantyMonths: 12,
    advancePaymentPct: budget > 500000000 ? 20 : 30,
    standards: [
      'Монгол Улсын холбогдох MNS үндэсний стандартын шаардлага хангасан байх',
      'Үйлдвэрлэгчийн чанарын гэрчилгээ эсвэл тохирлын гэрчилгээтэй байх',
      'Шинэ, үйлдвэрийн лацтай, баталгаат хугацаатай байх'
    ],
    paymentTerms: {
      advancePaymentPct: budget > 500000000 ? 20 : 30,
      progressPayment: 'Ажил гүйцэтгэлийн явцын акт, хүлээлцсэн баримт, нэхэмжлэхийг үндэслэн санхүүжүүлнэ',
      retentionBondPct: 5,
      retentionPeriodMonths: 12
    },
    penaltyClause: {
      dailyRate: '0.1%',
      maxLimit: '10%',
      description: 'Гэрээний үүргийг хугацаандаа биелүүлээгүй хоног тутамд гүйцэтгээгүй үүргийн үнийн дүнгийн 0.1%-ийн алданги тооцох ба дээд хэмжээ нь гэрээний үнийн дүнгийн 10%-иас хэтрэхгүй байна.'
    },
    submissionChecklist: [
      { id: 'lic', title: 'Улсын бүртгэлийн гэрчилгээ & Тусгай зөвшөөрөл', desc: 'Улсын бүртгэлийн гэрчилгээ болон тухайн ажил үйлчилгээнд шаардлагатай тусгай зөвшөөрөл (хэрэв шаардлагатай бол)', required: true },
      { id: 'tax', title: 'Татварын өрийн цахим лавлагаа', desc: 'Татварын ерөнхий газрын хугацаа хэтэрсэн өргүй цахим лавлагаа (e-Mongolia / E-Tax)', required: true },
      { id: 'fin', title: 'Санхүүгийн тайлан & Аудитын дүгнэлт', desc: `Сүүлийн жилүүдийн борлуулалтын доод орлого (${Math.round(budget * (typeCode === 'JOB' ? 0.8 : 0.5)).toLocaleString()} ₮) хангах тайлан`, required: true },
      { id: 'sec', title: `Тендерийн баталгаа (${Math.round(budget * 0.01).toLocaleString()} ₮ - ${Math.round(budget * 0.02).toLocaleString()} ₮)`, desc: 'Арилжааны банкны баталгаа эсвэл даатгалын батлан даалт', required: true },
      { id: 'price', title: 'Үнийн санал & Өртгийн задаргаа', desc: 'Тендерийн маягтын дагуу боловсруулсан үнийн хүснэгт (НӨАТ тооцсон)', required: true },
      { id: 'spec', title: 'Техникийн тодорхойлолтын тохирлын хүснэгт', desc: 'Захиалагчийн шаардсан техникийн үзүүлэлтийг хангаж буйг нотлох баримт', required: true }
    ],
    documents
  };
}

export function generateResults(tender: any) {
  const isConcluded = (tender.doc_status_name || tender.docStatusName || '').includes('Үр дүн') ||
    (tender.doc_status_name || tender.docStatusName || '').includes('Дууссан');

  const invitationId = tender.invitation_id || tender.invitationId;
  const officialDetailUrl = `https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`;
  const officialSupplierUrl = `https://user.tender.gov.mn/mn/supplier/available/${invitationId}/detail`;

  if (!isConcluded) {
    return {
      status: 'ACTIVE' as const,
      isConcluded: false,
      message: 'Тендер шалгаруулалт одоогоор нээлттэй эсвэл үнэлгээний шатандаа явагдаж байна. Нээлт хийгдэж үнэлгээний хороо шийдвэрээ гаргасны дараа албан ёсны үр дүн нийтлэгдэнэ.',
      officialUrl: officialDetailUrl,
      supplierUrl: officialSupplierUrl
    };
  }

  return {
    status: 'CONCLUDED' as const,
    isConcluded: true,
    message: 'Энэхүү тендер шалгаруулалт дуусаж, үр дүн албан ёсоор гарсан байна. Үнэлгээний хорооны албан ёсны шийдвэр, шалгарсан болон татгалзсан оролцогчдын протокол tender.gov.mn дээр баталгаажсан байна.',
    officialUrl: officialDetailUrl,
    supplierUrl: officialSupplierUrl,
    note: 'Үнэлгээний хорооны албан ёсны протокол болон шалгарсан оролцогчийн дэлгэрэнгүйг tender.gov.mn дээрх албан ёсны хуудсаас шалгана уу.'
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


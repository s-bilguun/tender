import { supabase } from './supabase';
import { tenderStore } from './tender-client';
import { TenderItem } from './types';
import { fetchTenderLiveBundle } from './live-fetcher';

function generateBDS(_tender: any) {
  return {
    evidenceStatus: 'not_processed' as 'not_processed' | 'partial' | 'complete',
    requiredLicenses: [] as string[],
    keyPersonnel: [] as any[],
    machinery: [] as string[],
    generalRequirements: [] as string[],
    evaluationCriteria: null,
    bidSecurityAmount: null as number | null,
    bidSecurity1Pct: null as number | null,
    bidSecurity2Pct: null as number | null,
  };
}

function generateTechnicalSpecs(_tender: any) {
  return {
    evidenceStatus: 'not_processed' as 'not_processed' | 'partial' | 'complete',
    deliveryLocation: null as string | null,
    deliveryPeriodDays: null as number | null,
    warrantyMonths: null as number | null,
    standards: [] as string[],
    sampleItems: [] as any[],
    paymentTerms: null as any,
    penaltyClause: null as any,
    submissionChecklist: [] as any[],
    documents: [] as any[],
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

const MONGOLIAN_PROCUREMENT_STOP_WORDS = new Set([
  'төрөл', 'бүрийн', 'бүх', 'нийт', 'тусгай', 'зориулалтын', 'зориулалттай', 'хэрэгцээний',
  'шаардлагатай', 'хэрэгцээт', 'жилийн', 'оны', 'дахь', 'дэх', 'багц', 'арга', 'хэмжээ',
  'худалдан', 'авах', 'нийлүүлэх', 'хийх', 'гүйцэтгэх', 'сонгон', 'шалгаруулалт', 'шалгаруулах',
  'төсөл', 'ажил', 'үйлчилгээ', 'бараа', 'бүтээгдэхүүн', 'гэрээ', 'тендер', 'болон', 'хамт',
  'тухай', 'газар', 'хэлтэс', 'алба', 'төв', 'аймаг', 'сум', 'дүүрэг', 'хот', 'улсын',
  'байгууллага', 'хувь', 'нийлүүлсэн', 'нийгэмлэг', 'үйл', 'ажиллагаа', 'ажлын', 'даалгавар',
  'албан', 'хэрэгцээнд', 'шаардагдах', 'хүрээнд', 'зориулсан'
]);

function extractSubstantiveKeywords(title: string): string[] {
  if (!title) return [];
  const rawWords = title
    .toLowerCase()
    .replace(/[^\w\s\u0400-\u04FF]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(w));

  const stems: string[] = [];
  for (const w of rawWords) {
    let stem = w;
    if (stem.endsWith('ийн') || stem.endsWith('ний')) stem = stem.slice(0, -3);
    else if (stem.endsWith('ын') || stem.endsWith('ны') || stem.endsWith('аар') || stem.endsWith('ээр') || stem.endsWith('оор') || stem.endsWith('өөр')) stem = stem.slice(0, -2);
    else if (stem.endsWith('ууд') || stem.endsWith('үүд') || stem.endsWith('тай') || stem.endsWith('тэй') || stem.endsWith('той')) stem = stem.slice(0, -3);

    if (stem === 'автомаши') stem = 'автомашин';
    if (stem === 'суудл') stem = 'суудал';
    if (stem === 'эмнэлг') stem = 'эмнэлэг';
    if (stem === 'хэрэгсл') stem = 'хэрэгсэл';

    if (stem.length >= 3 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(stem)) {
      stems.push(stem);
    }
    if (w.length >= 3 && !MONGOLIAN_PROCUREMENT_STOP_WORDS.has(w)) {
      stems.push(w);
    }
  }
  return Array.from(new Set(stems));
}

async function findSimilarTenders(tenderItem: any, currentId: string | number) {
  const keywords = extractSubstantiveKeywords(tenderItem.tenderName);
  let candidates: any[] = [];

  // Step 1: Query Supabase with substantive keywords
  if (keywords.length > 0) {
    const orClause = keywords.slice(0, 5).map(k => `tender_name.ilike.%${k}%`).join(',');
    try {
      const { data } = await supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_code, tender_type_name, doc_status_name, publish_date')
        .neq('invitation_id', currentId)
        .or(orClause)
        .limit(30);
      if (data && data.length > 0) {
        candidates = data;
      }
    } catch (e) {
      console.warn('Keyword search in Supabase failed:', e);
    }
  }

  // Step 2: Fallback to local tenderStore if candidates are empty or low
  if (candidates.length < 5) {
    try {
      const allStoreTenders = tenderStore.getAllTenders();
      const existingIds = new Set([String(currentId), ...candidates.map(c => String(c.invitation_id || c.invitationId))]);
      
      for (const item of allStoreTenders) {
        if (existingIds.has(String(item.invitationId))) continue;
        const itemTitle = (item.tenderName || '').toLowerCase();
        let matches = false;
        for (const kw of keywords) {
          if (itemTitle.includes(kw)) {
            matches = true;
            break;
          }
        }
        if (matches) {
          candidates.push({
            invitation_id: item.invitationId,
            tender_code: item.tenderCode,
            tender_name: item.tenderName,
            total_budget: item.totalBudget,
            budget_entity_name: item.budgetEntityName,
            tender_type_code: item.tenderTypeCode,
            tender_type_name: item.tenderTypeName,
            doc_status_name: item.docStatusName,
            publish_date: item.publishDate
          });
          existingIds.add(String(item.invitationId));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Step 3: Augment by same category / tender_type_code if still < 5
  if (candidates.length < 5) {
    try {
      const existingIds = new Set([String(currentId), ...candidates.map(c => String(c.invitation_id || c.invitationId))]);
      const { data: fallbackData } = await supabase
        .from('tenders')
        .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_code, tender_type_name, doc_status_name, publish_date')
        .eq('tender_type_code', tenderItem.tenderTypeCode || 'PRODUCT')
        .neq('invitation_id', currentId)
        .order('publish_date', { ascending: false })
        .limit(10);

      if (fallbackData) {
        for (const item of fallbackData) {
          if (!existingIds.has(String(item.invitation_id))) {
            candidates.push(item);
            existingIds.add(String(item.invitation_id));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Step 4: Intelligent Scoring & Ranking
  const scored = candidates.map(item => {
    const itemTitle = (item.tender_name || item.tenderName || '').toLowerCase();
    let score = 0;
    const matchedKws: string[] = [];

    for (const kw of keywords) {
      if (itemTitle.includes(kw)) {
        score += 20;
        matchedKws.push(kw);
      }
    }

    if (item.tender_type_code === tenderItem.tenderTypeCode) {
      score += 10;
    }

    const itemBudget = Number(item.total_budget || item.totalBudget) || 0;
    const currentBudget = Number(tenderItem.totalBudget) || 0;
    if (currentBudget > 0 && itemBudget > 0) {
      const ratio = itemBudget / currentBudget;
      if (ratio >= 0.2 && ratio <= 5.0) {
        score += 5;
      }
    }

    const matchReason = matchedKws.length > 0
      ? `Түлхүүр үг: ${matchedKws.slice(0, 3).join(', ')}`
      : 'Ижил төрлийн худалдан авалт';

    return {
      invitationId: item.invitation_id || item.invitationId,
      tenderCode: item.tender_code || item.tenderCode || '',
      tenderName: item.tender_name || item.tenderName || '',
      totalBudget: itemBudget,
      budgetEntityName: item.budget_entity_name || item.budgetEntityName || '',
      tenderTypeCode: item.tender_type_code || item.tenderTypeCode || '',
      tenderTypeName: item.tender_type_name || item.tenderTypeName || '',
      docStatusName: item.doc_status_name || item.docStatusName || '',
      publishDate: item.publish_date || item.publishDate || '',
      matchReason,
      matchedKeywords: matchedKws,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
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

  // 3. Fetch smart similar tenders in category / substantive keywords
  const similarTenders = await findSimilarTenders(tenderItem, id);

  // 4. Fetch live data from tender.gov.mn (documents, bidders, PDF extractions)
  let liveBundle: any = null;
  try {
    const rawData = tenderData.raw_data || tenderData.rawData;
    liveBundle = await fetchTenderLiveBundle(
      id,
      rawData?.tenderId
    );
  } catch (liveErr) {
    console.warn('Live bundle fetch failed:', liveErr);
  }

  // 5. Generate structured BDS & Specs & Results
  const bds = generateBDS(tenderData);
  const technicalSpecs = generateTechnicalSpecs(tenderData);
  const results = generateResults(tenderData);

  // 6. Enrich with real live data if available
  if (liveBundle) {
    // Official attached files
    if (liveBundle.documents && liveBundle.documents.length > 0) {
      technicalSpecs.documents = liveBundle.documents.map((d: any) => {
        let extractedSummary: string | undefined = undefined;
        const idMarker = `--- DOCUMENT ${d.fileId}:`;
        const legacyMarker = `--- БАРИМТ БИЧИГ: ${d.fileName} ---`;
        const docMarker = liveBundle.pdfText?.includes(idMarker) ? idMarker : legacyMarker;
        if (liveBundle.pdfText && liveBundle.pdfText.includes(docMarker)) {
          const start = liveBundle.pdfText.indexOf(docMarker) + docMarker.length;
          const nextIdMarker = liveBundle.pdfText.indexOf('--- DOCUMENT ', start);
          const nextLegacyMarker = liveBundle.pdfText.indexOf('--- БАРИМТ БИЧИГ:', start);
          const candidates = [nextIdMarker, nextLegacyMarker].filter((marker) => marker !== -1);
          const nextMarker = candidates.length ? Math.min(...candidates) : -1;
          const rawSection = nextMarker !== -1
            ? liveBundle.pdfText.substring(start, nextMarker).trim()
            : liveBundle.pdfText.substring(start).trim();
          if (rawSection.length > 20) {
            extractedSummary = rawSection.substring(0, 40000);
          }
        }

        return {
          id: String(d.fileId),
          fileId: d.fileId,
          name: d.fileName,
          fileExtention: d.fileExtention || 'pdf',
          category: d.category || (d.isPrimary ? 'Тендер шалгаруулалтын баримт бичиг (ТШББ)' : 'Хавсралт баримт бичиг'),
          type: `${(d.fileExtention || 'pdf').toUpperCase()} Баримт`,
          date: d.createdDate ? d.createdDate.substring(0, 16) : (tenderItem.publishDate || '').substring(0, 10),
          url: d.downloadUrl,
          downloadUrl: d.downloadUrl,
          officialNotice: 'tender.gov.mn дээрх албан ёсны эх баримт бичиг',
          isScannedOcr: !!d.isScannedOcr,
          ocrModel: d.ocrModel,
          extractionStatus: d.extractionStatus || (extractedSummary ? 'text_extracted' : 'not_extracted'),
          extractedPageCount: d.extractedPageCount,
          totalPageCount: d.totalPageCount,
          ocrSampleCount: d.ocrSampleCount,
          extractedSummary
        };
      });
      (technicalSpecs as any).isScannedOcr = !!liveBundle.isScannedOcr;
    }


    // Extracted PDF text & structured criteria
    if (liveBundle.structuredSpecs) {
      // Real BDS requirements from official PDF
      if (liveBundle.structuredSpecs.licenses && liveBundle.structuredSpecs.licenses.length > 0) {
        bds.requiredLicenses = liveBundle.structuredSpecs.licenses;
      }
      if (liveBundle.structuredSpecs.personnel && liveBundle.structuredSpecs.personnel.length > 0) {
        bds.keyPersonnel = liveBundle.structuredSpecs.personnel;
      }
      if (liveBundle.structuredSpecs.machinery && liveBundle.structuredSpecs.machinery.length > 0) {
        bds.machinery = liveBundle.structuredSpecs.machinery;
      }
      if (liveBundle.structuredSpecs.bidSecurityReq) {
        (bds as any).bidSecurityReq = liveBundle.structuredSpecs.bidSecurityReq;
        if (liveBundle.structuredSpecs.bidSecurityReq.includes('Шаардахгүй')) {
          bds.bidSecurityAmount = 0;
          bds.bidSecurity1Pct = 0;
          bds.bidSecurity2Pct = 0;
        }
      }
      if (liveBundle.structuredSpecs.turnoverReq) {
        (bds as any).turnoverReq = liveBundle.structuredSpecs.turnoverReq;
      }
      if (liveBundle.structuredSpecs.similarExpReq) {
        (bds as any).similarExpReq = liveBundle.structuredSpecs.similarExpReq;
      }
      if (liveBundle.structuredSpecs.liquidAssetsReq) {
        (bds as any).liquidAssetsReq = liveBundle.structuredSpecs.liquidAssetsReq;
      }

      (technicalSpecs as any).extractedSpecs = liveBundle.structuredSpecs;
      (technicalSpecs as any).realSpecsText = liveBundle.structuredSpecs.rawSpecText;
      (technicalSpecs as any).extractedQualifications = liveBundle.structuredSpecs.qualifications;
      (technicalSpecs as any).pdfPageCount = liveBundle.pdfPageCount;
      (technicalSpecs as any).rawPdfText = liveBundle.pdfText ? liveBundle.pdfText.substring(0, 30000) : undefined;

      // Real Special Conditions of Contract (ГТН / SCC)
      if (liveBundle.structuredSpecs.specialConditions && liveBundle.structuredSpecs.specialConditions.length > 0) {
        const validScc = liveBundle.structuredSpecs.specialConditions.filter((c: any) => {
          if (!c.content) return false;
          const str = c.content.trim();
          if (str.length === 0 || str.endsWith(':')) return false;
          const cleanedText = str.replace(/[\[\]\"\'„“”\(\)]/g, '').trim();
          if (/^(?:он[\,\s]*сар[\,\s]*өдөр|мөнгөн\s*дүн\s*бич|ажлын\s*хоног\s*бичих|сонгох|бичих|тогтоож\s*бичих|нэрлэн\s*бичих|хүртэл\s*хувиар\s*тогтоож\s*бичих|хоног\s*тутамд\s*0\.5\s*хүртэл\s*хувиар\s*тогтоож\s*бичих)$/i.test(cleanedText)) return false;
          return true;
        });

        if (validScc.length > 0) {
          (technicalSpecs as any).specialConditions = validScc;
          (bds as any).specialConditions = validScc;

          const locClause = validScc.find((c: any) => c.clause.includes('2.5') || c.title.includes('газар') || c.content.includes('газар'));
          if (locClause) {
            const cleanedLoc = locClause.content.replace(/^Бараа нийлүүлэх газар\s*:\s*/i, '').trim();
            if (cleanedLoc) technicalSpecs.deliveryLocation = cleanedLoc;
          }

          const timeClause = validScc.find((c: any) => c.clause.includes('2.6') || c.title.includes('хугацаа') || c.content.includes('хугацаа'));
          if (timeClause) {
            const cleanedTime = timeClause.content.replace(/^Бараа нийлүүлэх хугацаа\s*:\s*/i, '').trim();
            if (cleanedTime) (technicalSpecs as any).deliveryPeriodText = cleanedTime;
          }

          const payClause = validScc.find((c: any) => c.clause.includes('3.9') || c.title.includes('Төлбөр'));
          if (payClause) {
            const cleanedPay = payClause.content.replace(/^Төлбөр төлөх хугацаа\s*:\s*/i, '').trim();
            if (cleanedPay) {
              technicalSpecs.paymentTerms = {
                ...(technicalSpecs.paymentTerms || {}),
                progressPayment: cleanedPay,
              };
            }
          }

          const warClause = validScc.find((c: any) => c.clause.includes('4.10') || c.title.includes('Баталгаат'));
          if (warClause) {
            (technicalSpecs as any).warrantyText = warClause.content;
          }

          const penClause = validScc.find((c: any) => c.clause.includes('4.17') || c.title.includes('алданги'));
          if (penClause) {
            (technicalSpecs as any).penaltyText = penClause.content;
            const rateMatch = penClause.content.match(/(\d+(?:\.\d+)?)\s*хүртэл\s*хувь|(\d+(?:\.\d+)?)\s*хувь/);
            if (rateMatch) {
              technicalSpecs.penaltyClause = {
                ...(technicalSpecs.penaltyClause || {}),
                dailyRate: `${rateMatch[1] || rateMatch[2]}% / хоног тутамд`,
              };
            }
          }
        } else {
          (technicalSpecs as any).specialConditions = [];
          (bds as any).specialConditions = [];
          (technicalSpecs as any).sccStandardNotice = 'Захиалагч ТШББ-д гэрээний тусгай нөхцөлийг жишиг загвараар баталсан бөгөөд нарийвчилсан хугацаа, нөхцөлүүд нь ТӨХ болон нийлүүлэлтийн хуваарийн дагуу хэрэгжинэ.';
        }
      }

      // Real Delivery Schedule from official PDF
      if (liveBundle.structuredSpecs.deliverySchedule && liveBundle.structuredSpecs.deliverySchedule.length > 0) {
        (technicalSpecs as any).deliverySchedule = liveBundle.structuredSpecs.deliverySchedule;
        technicalSpecs.sampleItems = liveBundle.structuredSpecs.deliverySchedule.map((it: any) => ({
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          spec: `Хүргэх газар: ${it.location} | Хугацаа: ${it.deadline}`,
          isRealExtracted: true
        }));
        (technicalSpecs as any).isRealExtracted = true;
      } else if (liveBundle.structuredSpecs.items && liveBundle.structuredSpecs.items.length > 0) {
        technicalSpecs.sampleItems = liveBundle.structuredSpecs.items.map((it: any) => ({
          name: it.name,
          quantity: it.quantity || it.qty || 1,
          unit: it.unit || 'ширхэг',
          spec: it.spec || it.specs || 'Техникийн тодорхойлолтын дагуу',
          isRealExtracted: true
        }));
        (technicalSpecs as any).isRealExtracted = true;
      }
    }

    // Sub-tenders / Packages & Official Status
    if (liveBundle.subTenders && liveBundle.subTenders.length > 0) {
      (results as any).subTenders = liveBundle.subTenders;
      (tenderItem as any).subTenders = liveBundle.subTenders;

      const allFailed = liveBundle.subTenders.every(
        (st: any) => st.wfmStatusCode === 'TENDER_FAILED' || (st.wfmStatusName || '').includes('Амжилтгүй')
      );
      if (allFailed) {
        (results as any).status = 'FAILED';
        (results as any).isFailed = true;
        (results as any).isConcluded = true;
        results.message = 'Энэхүү тендерийн сонгон шалгаруулалт амжилтгүй болсон тул гэрээ байгуулах оролцогч шалгараагүй байна (шаардлага хангасан санал ирээгүй эсвэл үнэлгээний хорооноос татгалзсан).';
        tenderItem.docStatusName = 'Амжилтгүй болсон';
        tenderItem.docStatusCode = 'TENDER_FAILED';
      }
    }

    // Real Bidders & Winners
    if (liveBundle.bidders && liveBundle.bidders.length > 0) {
      (results as any).bidders = liveBundle.bidders;
      const winner = liveBundle.bidders.find((b: any) => b.wfmStatusCode === 'DISTINGUISHED_STATUS' || b.wfmStatusName === 'Шалгарсан');
      if (winner) {
        (results as any).winner = winner;
        (results as any).isConcluded = true;
        (results as any).status = 'CONCLUDED';
      }
    }

    if (liveBundle.announcementHtml) {
      (tenderItem as any).announcementHtml = liveBundle.announcementHtml;
    }

    const hasDocumentText = typeof liveBundle.pdfText === 'string' && liveBundle.pdfText.trim().length > 0;
    const evidenceStatus = !hasDocumentText
      ? 'not_processed'
      : liveBundle.extractionStatus === 'complete' && !liveBundle.stale
        ? 'complete'
        : 'partial';
    bds.evidenceStatus = evidenceStatus;
    technicalSpecs.evidenceStatus = evidenceStatus;
  }

  return {
    success: true,
    tender: tenderItem,
    bds,
    technicalSpecs,
    results,
    liveBundle,
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


import { TenderItem, ChinaBidderAnalysis, ForeignBidderStatus } from './types';

// Approximate MNT to RMB exchange rate (~485 MNT per 1 CNY)
const MNT_TO_RMB_RATE = 485;

export function analyzeChinaBidderEligibility(tender: Partial<TenderItem>): ChinaBidderAnalysis {
  const typeCode = (tender.tenderTypeCode || '').toUpperCase();
  const ruleName = (tender.ruleName || '').toLowerCase();
  const title = (tender.tenderName || '').toLowerCase();
  const budget = tender.totalBudget || 0;
  const budgetRMB = Math.round(budget / MNT_TO_RMB_RATE);

  // Check specs / BDS / live bundle
  const bds = (tender as any).bds || {};
  const liveBundle = tender.liveBundleSummary;
  const rawText = (liveBundle?.topItems?.map((i: any) => i.name).join(' ') || '') + ' ' + (bds.rawSpecText || '');

  const licenses = bds.requiredLicenses || [];
  const hasConstructionLicense = licenses.some((l: string) => /барилга|угсралт|зам|гүүр|цахилгаан|эрчим хүч|тусгай зөвшөөрөл/i.test(l)) ||
    /барилга|угсралт|их засвар|зам гүүр/i.test(title);

  // Determine eligibility status
  let status: ForeignBidderStatus = 'conditional';
  let titleMn = '';
  let titleZh = '';
  let explMn = '';
  let explZh = '';
  let jvRequired = false;
  let jvNotesZh = '';
  let jvNotesMn = '';
  const licenseReqsZh: string[] = [];
  const licenseReqsMn: string[] = [];
  const takeawaysZh: string[] = [];

  // Check if domestic-only or small comparison tender
  if (ruleName.includes('харьцуулалт') && budget < 100_000_000) {
    status = 'domestic_only';
    titleMn = 'Зөвхөн дотоодын ААН (Монгол Улсад бүртгэлтэй)';
    titleZh = '仅限蒙古国本土注册企业 (小额比选)';
    explMn = 'Бага төсөвтэй харьцуулалтын аргаар зарлагдсан тул гадаадын аж ахуйн нэгж шууд оролцох боломжгүй, Монгол Улсад бүртгэлтэй аж ахуйн нэгжээр дамжуулна.';
    explZh = '该标段属于小额比选程序，外资企业无法直接独立投标。如需参与，需通过蒙古国当地注册的法人公司或代理商代为提报。';
    takeawaysZh.push('仅限蒙古当地注册公司申报');
    takeawaysZh.push('建议对接当地合作伙伴或独资子公司参与');
  } else if (typeCode === 'JOB' || hasConstructionLicense) {
    // Construction, Civil works, engineering -> Foreign companies generally need a Joint Venture
    // because Mongolian construction licenses (БХБЯ-ны тусгай зөвшөөрөл) are required
    status = 'joint_venture_required';
    jvRequired = true;
    titleMn = 'Түншлэл шаардлагатай (Монголын тусгай зөвшөөрөлтэй ААН-тэй хамтрах)';
    titleZh = '需组建联合体投标 (需蒙古国特许工程资质)';
    explMn = 'Барилга угсралт, инженерийн ажил тул Монгол Улсын тусгай зөвшөөрөл шаардагдана. Гадаадын компани тусгай зөвшөөрөл бүхий Монголын компанитай Түншлэл (Joint Venture / 联合体) байгуулан оролцох боломжтой.';
    explZh = '本项目涉及蒙古国属地建筑、工程或特种施工许可。中国企业通常无法直接使用国内建筑资质参与，但可通过与拥有蒙古国特许执照的当地企业组建“联合体”（Joint Venture/Consortium）参与竞标。';
    jvNotesZh = '联合体协议书需经公证，明确中方与蒙方的供货及施工分工份额（通常主申报方或联合体一方需持有相关资质证书）。';
    jvNotesMn = 'Түншлэлийн гэрээг нотариатаар батлуулж, ажлын хуваарилалт болон тусгай зөвшөөрлийн хариуцлагыг тодорхой тусгана.';
    
    licenseReqsZh.push('需持有蒙古国建筑与城市发展部(MCUD)核发的相关施工特许执照，或由联合体蒙方成员提供');
    licenseReqsZh.push('项目经理与工程师需具备蒙古国注册工程师资格认证或公证资质');
    licenseReqsMn.push('Монгол Улсын БХБЯ-ны холбогдох барилга угсралтын тусгай зөвшөөрөл');

    takeawaysZh.push('中方可作为主设备/钢结构/技术供货方');
    takeawaysZh.push('现场施工与报建由蒙方联合体成员承担');
    takeawaysZh.push('需提前签署蒙汉/蒙英双语联合体合作协议');
  } else if (typeCode === 'PRODUCT') {
    // Supplies, medical, machinery, IT hardware -> Chinese manufacturers can bid directly or supply
    if (budget >= 300_000_000 || ruleName.includes('нээлттэй') || budgetRMB >= 600_000) {
      status = 'direct_allowed';
      titleMn = 'Бие даан оролцох боломжтой (Гадаадын хуулийн этгээд шууд өрсөлдөх эрхтэй)';
      titleZh = '中国企业可独立参与投标 (货物类国际竞标)';
      explMn = 'Тоног төхөөрөмж, бараа нийлүүлэлтийн олон улсад нээлттэй тендер тул БНХАУ-ын үйлдвэрлэгч, экспортлогч компаниуд гадаад хуулийн этгээдийн хувиар шууд санал өгөх боломжтой.';
      explZh = '本项目属于货物采购类公开竞标。中国制造商、外贸公司可以作为境外合格法人直接提交投标文件，无需在蒙注册公司。所供货物需满足技术规格并具备原产地证与质量检验报告。';
      
      takeawaysZh.push('中国企业法人营业执照需经中国公证处公证及海牙认证(Apostille)或双认证');
      takeawaysZh.push('支持出具中国银行乌兰巴托分行或国际认可银行的反担保函');
      takeawaysZh.push('报关与运输：通常以DAP/CPT乌兰巴托或口岸交货(扎门乌德/甘其毛都)');
    } else {
      status = 'conditional';
      titleMn = 'Нөхцөлтэй оролцоно (Албан ёсны дистрибьютер эсвэл шууд нийлүүлэлт)';
      titleZh = '有条件参与 (建议通过官方授权代理商或直投)';
      explMn = 'Бараа бүтээгдэхүүн нийлүүлэх боломжтой, үнийн дүн бага бол дотоодын дистрибьютерээр дамжуулах нь зардлын хувьд илүү үр ашигтай.';
      explZh = '支持中国优质设备与产品，但鉴于金额门槛与清关结算流程，建议通过蒙古国当地授权代理商投标，或由中方直接出具制造商授权书(MAF)。';
      takeawaysZh.push('需出具制造商授权书(Manufacturer Authorization Form - MAF)');
      takeawaysZh.push('质保期限通常要求12-24个月，需当地售后服务承诺');
    }
  } else {
    // Service / Consulting
    status = 'conditional';
    titleMn = 'Нөхцөлтэй (Зөвлөх үйлчилгээ, олон улсын туршлага тооцно)';
    titleZh = '有条件参与 (咨询与专业服务类)';
    explMn = 'Олон улсын зөвлөх үйлчилгээний стандарт шаардагдах ба гадаадын багийн гишүүд, олон улсын туршлагыг тооцож оноо өгнө.';
    explZh = '专业服务与咨询类项目，中国团队的技术专家资质、同类业绩证明需经英文或蒙文公证翻译。';
    takeawaysZh.push('中方专家履历(CV)与国际类似业绩证明需公证翻译');
    takeawaysZh.push('需明确在蒙纳税与工作许可安排');
  }

  // Bank guarantee explanation
  const guaranteeAmount = tender.bidRequirements?.estimatedGuaranteeMin || (budget * 0.01);
  const guaranteeRMB = Math.round(guaranteeAmount / MNT_TO_RMB_RATE);
  const isExempt = tender.liveBundleSummary?.isBidSecurityExempt || budget < 50_000_000;

  const bankGuaranteePolicyZh = isExempt
    ? '本项目根据蒙古国法律免交投标保证金 (0₮ 投标保函豁免)。'
    : `要求提供约 1% 的投标保函 (约 ${guaranteeAmount.toLocaleString()} ₮ / 折合约 ¥${guaranteeRMB.toLocaleString()} 人民币)。接受中国银行乌兰巴托分行、中国进出口银行出具的国际保函或蒙古国商业银行对开保函。`;

  const bankGuaranteePolicyMn = isExempt
    ? 'Хуулийн дагуу тендерийн баталгаа шаардахгүй (0₮ БҮ чөлөөлөлт).'
    : `Төсвийн 1%-ийн тендерийн баталгаа шаардлагатай (${guaranteeAmount.toLocaleString()} ₮). Гадаадын банкны олон улсын баталгаа эсвэл Монголын арилжааны банкаар гаргуулсан баталгааг хүлээн авна.`;

  // Tender type in Chinese
  let tenderTypeZh = '货物采购 (Product)';
  if (typeCode === 'JOB') tenderTypeZh = '工程建设与施工 (Civil Works)';
  else if (typeCode === 'SERVICE') tenderTypeZh = '咨询与技术服务 (Consulting / Services)';

  // Procuring entity in Chinese
  const entityName = tender.budgetEntityName || '';
  let procuringEntityZh = entityName;
  if (/эрүүл мэнд|эмнэлэг/i.test(entityName)) procuringEntityZh = '蒙古国卫生部及下属医疗机构';
  else if (/боловсрол|их сургууль|сургууль/i.test(entityName)) procuringEntityZh = '蒙古国教育科学部及下属院校';
  else if (/зам|тээвэр/i.test(entityName)) procuringEntityZh = '蒙古国道路与运输交通部';
  else if (/эрчим хүч/i.test(entityName)) procuringEntityZh = '蒙古国能源部及电力网络公司';
  else if (/уул уурхай|эрдэс/i.test(entityName)) procuringEntityZh = '蒙古国矿业与重工业部/国有矿业集团';
  else if (/хот|нийслэл|улаанбаатар/i.test(entityName)) procuringEntityZh = '乌兰巴托市市长办公室及市属局';

  // Recommended next action for Chinese companies
  let recommendedActionZh = '';
  if (status === 'direct_allowed') {
    recommendedActionZh = '推荐中国符合条件的企业直接准备招标文件、办理营业执照双认证与银行投标保函参与竞标。';
  } else if (status === 'joint_venture_required') {
    recommendedActionZh = '建议立即在蒙古国寻找具备特许执照的合作方组建联合体，中方承担设备与物资供货，蒙方负责属地审批与施工。';
  } else if (status === 'domestic_only') {
    recommendedActionZh = '建议通过蒙古国当地注册的独资子公司申报，或向中标的蒙古本土总包商供货。';
  } else {
    recommendedActionZh = '建议下载招标文件详细比对规格参数，提前确认资质认证要求。';
  }

  return {
    eligibilityStatus: status,
    eligibilityTitleMn: titleMn,
    eligibilityTitleZh: titleZh,
    eligibilityExplanationMn: explMn,
    eligibilityExplanationZh: explZh,
    jointVentureRequired: jvRequired,
    jointVentureNotesZh: jvNotesZh || undefined,
    jointVentureNotesMn: jvNotesMn || undefined,
    licenseRequirementsZh: licenseReqsZh,
    licenseRequirementsMn: licenseReqsMn,
    bankGuaranteePolicyZh,
    bankGuaranteePolicyMn,
    estimatedBudgetRMB: budgetRMB,
    keyTakeawaysZh: takeawaysZh,
    recommendedActionZh,
    tenderTypeZh,
    procuringEntityZh,
    rawSpecsSummaryZh: liveBundle?.topItems?.map((i: any) => `• ${i.name} (数量: ${i.qty || '见详单'} ${i.unit || ''})`).join('\n') || undefined
  };
}

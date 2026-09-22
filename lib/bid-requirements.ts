import { BidRequirementSummary, TenderItem } from './types';

export function generateBidRequirements(tender: Partial<TenderItem>): BidRequirementSummary {
  const budget = tender.totalBudget || 0;
  const isLarge = budget >= 50_000_000;
  const isVeryLarge = budget >= 500_000_000;
  const isElectronic = (tender.isPackage !== undefined ? true : true);

  // Guarantee: Standard 1% to 2% of total budget
  const minGuarantee = Math.round(budget * 0.01);
  const maxGuarantee = Math.round(budget * 0.02);

  const clearances = [
    {
      id: 'tax',
      nameMn: 'Татварын өргүй тодорхойлолт (Цахим)',
      nameEn: 'Tax Clearance Certificate (E-Tax)',
      isMandatory: true,
      descriptionMn: 'Татварын албанаас хугацаа хэтэрсэн өргүй болох цахим лавлагаа (e-tax.mta.mn)',
      descriptionEn: 'Official digital tax clearance confirming zero overdue tax obligations',
    },
    {
      id: 'social_insurance',
      nameMn: 'Нийгмийн даатгалын шимтгэлийн лавлагаа',
      nameEn: 'Social Security Clearance',
      isMandatory: true,
      descriptionMn: 'Нийгмийн даатгалын байгууллагаас өргүй болох цахим лавлагаа (e-mongolia / nda.gov.mn)',
      descriptionEn: 'Valid social insurance certification confirming compliance for all employees',
    },
    {
      id: 'bank_guarantee',
      nameMn: isLarge ? 'Тендерийн баталгаа (Банкны батлан даалт / Даатгал)' : 'Тендерийн баталгааны мэдэгдэл',
      nameEn: isLarge ? 'Bid Security (Bank Guarantee / Insurance)' : 'Bid Security Declaration',
      isMandatory: isLarge,
      descriptionMn: isLarge
        ? `Төсөвт өртгийн 1-2% буюу ойролцоогоор ${(minGuarantee).toLocaleString()}₮ - ${(maxGuarantee).toLocaleString()}₮ дүнтэй банкны баталгаа эсвэл даатгалын батлан даалт.`
        : 'Бага үнийн дүнтэй худалдан авалтад хялбаршуулсан баталгааны маягт бөглөх боломжтой.',
      descriptionEn: isLarge
        ? `Bank guarantee or insurance letter estimated at ~₮${(minGuarantee).toLocaleString()} - ₮${(maxGuarantee).toLocaleString()}`
        : 'Simplified bid declaration form for low threshold procurement.',
    },
    {
      id: 'court_clearance',
      nameMn: 'Шүүхийн шийдвэр гүйцэтгэх газрын лавлагаа',
      nameEn: 'Judicial Enforcement Clearance',
      isMandatory: true,
      descriptionMn: 'Хугацаа хэтэрсэн төлбөрийн шүүхийн шийдвэргүй болох тодорхойлолт',
      descriptionEn: 'Clearance confirming no outstanding judicial enforcement obligations',
    },
    {
      id: 'license',
      nameMn: tender.tenderTypeCode === 'JOB'
        ? 'Барилга угсралт, инженерийн тусгай зөвшөөрөл'
        : tender.tenderTypeCode === 'PRODUCT'
        ? 'Үйлдвэрлэгчийн албан ёсны дистрибьютерийн гэрчилгээ'
        : 'Мэргэжлийн боловсон хүчний гэрчилгээ, ажиллах хүчний мэдээлэл',
      nameEn: tender.tenderTypeCode === 'JOB'
        ? 'Construction & Engineering Special License'
        : tender.tenderTypeCode === 'PRODUCT'
        ? 'Official Manufacturer Distributor Authorization'
        : 'Professional Staffing Certifications',
      isMandatory: isVeryLarge || tender.tenderTypeCode === 'JOB',
      descriptionMn: tender.tenderTypeCode === 'JOB'
        ? 'Холбогдох БХБЯ-ны тусгай зөвшөөрлийн хүчинтэй гэрчилгээ, заалтууд'
        : 'Нийлүүлэгчийн итгэмжлэл, тохирлын гэрчилгээ болон бүтээгдэхүүний чанарын стандарт',
      descriptionEn: 'Mandatory technical licenses and authorized partner certifications',
    },
  ];

  const submissionSteps = [
    {
      step: 1,
      titleMn: 'Тендерийн баримт бичигтэй танилцах',
      titleEn: 'Review Tender Dossier',
      descMn: 'Техникийн тодорхойлолт, тавигдах тусгай шаардлага болон нийлүүлэх хуваарийг нягтлах.',
      descEn: 'Inspect technical specifications, delivery terms, and penalty clauses.',
    },
    {
      step: 2,
      titleMn: 'Шалгуур лавлагаа & Үнийн санал бэлтгэх',
      titleEn: 'Prepare Clearances & Pricing',
      descMn: 'Татвар, НД-ын цахим лавлагааг татаж, нэгж үнийн задаргаа болон банкны баталгааг бүрдүүлэх.',
      descEn: 'Download e-tax and social insurance clearances, draft detailed itemized pricing.',
    },
    {
      step: 3,
      titleMn: 'Тоон гарын үсгээр tender.gov.mn дээр илгээх',
      titleEn: 'Sign Digitally & Submit on Portal',
      descMn: 'Төрийн худалдан авах ажиллагааны цахим системд нэвтрэн тоон гарын үсгээр баталгаажуулж илгээх.',
      descEn: 'Log into tender.gov.mn, sign electronically with company digital token, and lock bid.',
    },
  ];

  return {
    estimatedGuaranteeMin: minGuarantee,
    estimatedGuaranteeMax: maxGuarantee,
    isElectronic,
    requiredClearances: clearances,
    submissionSteps,
  };
}

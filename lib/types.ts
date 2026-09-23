export type TenderType = 'PRODUCT' | 'JOB' | 'SERVICE' | 'ALL';

export type IndustryVertical =
  | 'all'
  | 'mining'       // Уул уурхай, хүнд үйлдвэр, эрдэс баялаг
  | 'it'           // МТ & Програм хангамж, Цахим систем
  | 'construction' // Барилга, дэд бүтэц, засвар
  | 'medical'      // Эм, эмнэлгийн тоног төхөөрөмж
  | 'food'         // Хүнс, хоол үйлдвэрлэл, үдийн цай
  | 'transport'    // Тээвэр, шатахуун, сэлбэг
  | 'facility'     // Цэвэрлэгээ, харуул хамгаалалт, ашиглалт
  | 'stationery'   // Бичиг хэрэг, хэвлэл, тавилга
  | 'consulting';  // Зөвлөх үйлчилгээ, аудит, сургалт

export interface IndustryInfo {
  id: IndustryVertical;
  slug: string;
  labelMn: string;
  labelEn: string;
  icon: string;
  descriptionMn: string;
  descriptionEn: string;
  count?: number;
  totalCount?: number;
  activeCount?: number;
}

export interface BidRequirementSummary {
  estimatedGuaranteeMin: number; // 1%
  estimatedGuaranteeMax: number; // 2%
  isElectronic: boolean;
  requiredClearances: {
    id: string;
    nameMn: string;
    nameEn: string;
    isMandatory: boolean;
    descriptionMn: string;
    descriptionEn: string;
  }[];
  submissionSteps: {
    step: number;
    titleMn: string;
    titleEn: string;
    descMn: string;
    descEn: string;
  }[];
}

export interface SpecialConditionClause {
  clause: string;
  title: string;
  content: string;
}

export interface DeliveryScheduleItem {
  number: string;
  name: string;
  quantity: string;
  unit: string;
  location: string;
  deadline: string;
}

export interface LiveSubTender {
  subTenderId: number;
  subTenderName: string;
  subTenderCode: string;
  totalBudget: number;
  wfmStatusId: number;
  wfmStatusName: string;
  wfmStatusColor: string;
  wfmStatusCode: string;
  noticeDate?: string;
}

export interface TenderItem {
  invitationId: number | string;
  invitationNumber: string;
  tenderId?: number | string;
  tenderCode: string;
  tenderName: string;
  budgetEntityName: string;
  uusgesenEntityName?: string;
  clientCode?: string;
  registrationNumber?: string;
  positionName?: string; // e.g. "БОЛОВСРОЛЫН САЙД"
  totalBudget: number;
  yearBudget?: number;
  tenderTypeCode: string; // PRODUCT, JOB, SERVICE
  tenderTypeName: string; // Бараа, Ажил, Үйлчилгээ
  ruleName?: string;      // Харьцуулалтын арга, Нээлттэй тендер
  fundName?: string;      // Улсын төсөв, Орон нутгийн төсөв, Өөрийн хөрөнгө
  publishDate?: string;
  receiveDate?: string;
  openDate?: string;
  actionDate?: string;
  docStatusCode?: string; // RECEIVE_TENDER, PUBLISHING_STATUS
  docStatusName?: string; // Тендер хүлээн авч байгаа, Нийтлэгдсэн
  docStatusColor?: string;
  isPackage?: number;
  tenderDocumentId?: number | string;
  subTenders?: LiveSubTender[];
  
  // B2B Supplier Enrichment Fields
  industry?: IndustryVertical;
  industryName?: string;
  bidRequirements?: BidRequirementSummary;
  bds?: any;
  technicalSpecs?: any;
  results?: any;
}

export type ActiveTabMode = 'all' | 'active' | 'result' | 'closing_soon' | 'watchlist' | 'archive';

export interface TenderFilterParams {
  search?: string;
  category?: string;       // all, PRODUCT, JOB, SERVICE
  industry?: IndustryVertical;
  minBudget?: number;
  maxBudget?: number;
  status?: string;         // all, receiving, opened, result, cancelled, requested
  tabMode?: ActiveTabMode;
  urgency?: 'all' | 'urgent_3d' | 'new_48h' | 'high_budget';
  sortBy?: 'date_desc' | 'budget_desc' | 'budget_asc' | 'deadline_asc';
  year?: string;           // 'all', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'
  dateFrom?: string;       // YYYY-MM-DD
  dateTo?: string;         // YYYY-MM-DD
  fundName?: string;       // e.g. 'Улсын төсөв', 'Орон нутгийн төсөв', 'Өөрийн хөрөнгө'
  ruleName?: string;       // e.g. 'Нээлттэй тендер', 'Харьцуулалтын арга'
  positionName?: string;   // e.g. 'Сайд', 'Нийслэл', 'Аймаг'
  page?: number;
  perPage?: number;
}

export interface IndustryStatSummary {
  totalCount: number;
  totalBudgetSum: number;
  activeCount: number;
  activeBudgetSum: number;
  resultCount: number;
  closingSoonCount: number;
}

export interface TenderStats {
  totalCount: number;
  totalBudgetSum: number;
  activeTendersCount: number;
  activeBudgetSum?: number;
  closingSoonCount?: number;
  resultCount?: number;
  newCount?: number;
  categoryCounts: {
    product: number;
    job: number;
    service: number;
  };
  industryCounts?: Record<string, number>;
  statsByIndustry?: Record<string, IndustryStatSummary>;
  topMinistries: {
    name: string;
    count: number;
    budget: number;
  }[];
  lastUpdatedAt?: string;
}

export type Locale = 'mn' | 'en';

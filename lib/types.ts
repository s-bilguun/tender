export type TenderType = 'PRODUCT' | 'JOB' | 'SERVICE' | 'ALL';

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
}

export type ActiveTabMode = 'active' | 'closing_soon' | 'watchlist' | 'archive';

export interface TenderFilterParams {
  search?: string;
  category?: string;       // all, PRODUCT, JOB, SERVICE
  minBudget?: number;
  maxBudget?: number;
  status?: string;         // all, receiving, opened, result, cancelled, requested
  tabMode?: ActiveTabMode;
  urgency?: 'all' | 'urgent_3d' | 'new_48h' | 'high_budget';
  sortBy?: 'date_desc' | 'budget_desc' | 'budget_asc' | 'deadline_asc';
  year?: string;           // 'all', '2026', '2025', '2024', '2023', '2022'
  dateFrom?: string;       // YYYY-MM-DD
  dateTo?: string;         // YYYY-MM-DD
  page?: number;
  perPage?: number;
}

export interface TenderStats {
  totalCount: number;
  totalBudgetSum: number;
  activeTendersCount: number;
  activeBudgetSum?: number;
  closingSoonCount?: number;
  newCount?: number;
  categoryCounts: {
    product: number;
    job: number;
    service: number;
  };
  topMinistries: {
    name: string;
    count: number;
    budget: number;
  }[];
}

export type Locale = 'mn' | 'en';

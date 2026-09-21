export type TenderType = 'PRODUCT' | 'JOB' | 'SERVICE' | 'ALL';

export interface TenderItem {
  invitationId: number | string;
  invitationNumber: string;
  tenderId?: number | string;
  tenderCode: string;
  tenderName: string;
  budgetEntityName: string;
  uusgesenEntityName?: string;
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

export interface TenderFilterParams {
  search?: string;
  category?: string;       // all, PRODUCT, JOB, SERVICE
  minBudget?: number;
  maxBudget?: number;
  status?: string;         // all, active, closed
  sortBy?: 'date_desc' | 'budget_desc' | 'budget_asc' | 'deadline_asc';
  page?: number;
  perPage?: number;
}

export interface TenderStats {
  totalCount: number;
  totalBudgetSum: number;
  activeTendersCount: number;
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

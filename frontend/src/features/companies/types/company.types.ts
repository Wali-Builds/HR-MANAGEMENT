export type CompanySortField =
  | "company_code"
  | "legal_name"
  | "display_name"
  | "created_at"
  | "updated_at";

export type SortOrder = "ASC" | "DESC";

export interface Company {
  companyId: string;
  companyCode: string;
  legalName: string;
  displayName: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  industry: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  websiteUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  logoPath: string | null;
  employeeCodePrefix: string | null;
  employeeCodeLength: number;
  isActive: boolean;
  // edited by wali: Null for live companies; populated for soft-deleted companies.
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  sortBy: CompanySortField;
  sortOrder: SortOrder;
}

export interface CompanyListResult {
  companies: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyMutationInput {
  companyCode: string;
  legalName: string;
  displayName: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  industry?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  websiteUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  logoPath?: string | null;
  employeeCodePrefix?: string | null;
  employeeCodeLength: number;
  isActive: boolean;
}

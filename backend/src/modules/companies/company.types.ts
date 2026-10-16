export type DatabaseId =
  | string
  | number
  | bigint;

export interface CompanyDatabaseRow {
  company_id: DatabaseId;
  company_code: string;
  legal_name: string;
  display_name: string;
  registration_number: string | null;
  tax_number: string | null;
  industry: string | null;
  official_email: string | null;
  official_phone: string | null;
  website_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  currency_code: string;
  date_format: string;
  logo_path: string | null;
  employee_code_prefix: string | null;
  employee_code_length: number;
  is_active: number | boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CompanyResponse {
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
  // edited by wali: Return the deletion timestamp for administrator audit visibility.
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CompanyActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface CompanyListOptions {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  sortBy:
    | "company_code"
    | "legal_name"
    | "display_name"
    | "created_at"
    | "updated_at";
  sortOrder: "ASC" | "DESC";
  scopeCompanyId: string | null;
}

export interface CompanyListResult {
  companies: CompanyDatabaseRow[];
  total: number;
}
export type DatabaseId =
  | string
  | number
  | bigint;

export interface BranchDatabaseRow {
  branch_id: DatabaseId;
  company_id: DatabaseId;
  branch_code: string;
  branch_name: string;
  branch_type: string | null;
  official_email: string | null;
  official_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_head_office: number | boolean;
  is_active: number | boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BranchResponse {
  branchId: string;
  companyId: string;
  branchCode: string;
  branchName: string;
  branchType: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchListOptions {
  page: number;
  limit: number;
  companyId: string | null;
  search?: string;
  branchType?: string;
  city?: string;
  isActive?: boolean;
  isHeadOffice?: boolean;
  sortBy:
    | "branch_code"
    | "branch_name"
    | "branch_type"
    | "city"
    | "created_at"
    | "updated_at";
  sortOrder: "ASC" | "DESC";
}

export interface BranchListResult {
  branches: BranchDatabaseRow[];
  total: number;
}

export interface BranchActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
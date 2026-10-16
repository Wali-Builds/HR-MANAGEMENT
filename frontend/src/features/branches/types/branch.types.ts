// edited by wali: Keep branch domain and request types inside the Branches feature.
export type SortOrder = "ASC" | "DESC";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Branch {
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

export interface BranchInput {
  companyId?: string;
  branchCode: string;
  branchName: string;
  branchType?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  isHeadOffice: boolean;
  isActive: boolean;
}

export interface BranchListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  sortOrder: SortOrder;
  branchType?: string;
  city?: string;
  isActive?: boolean;
  isHeadOffice?: boolean;
  sortBy: "branch_code" | "branch_name" | "branch_type" | "city" | "created_at" | "updated_at";
}

export interface BranchListResult {
  branches: Branch[];
  pagination: Pagination;
}

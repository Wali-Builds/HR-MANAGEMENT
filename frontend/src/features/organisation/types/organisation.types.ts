// edited by wali: Keep shared department and organisation structure types here.
export type OrganisationSection =
  | "branches"
  | "departments"
  | "designations"
  | "positions";

export type SortOrder = "ASC" | "DESC";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Department {
  departmentId: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  parentDepartmentId: string | null;
  parentDepartmentName: string | null;
  departmentCode: string;
  departmentName: string;
  description: string | null;
  costCenterCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentInput {
  companyId?: string;
  branchId?: string | null;
  parentDepartmentId?: string | null;
  departmentCode: string;
  departmentName: string;
  description?: string | null;
  costCenterCode?: string | null;
  isActive: boolean;
}

export interface BaseListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  sortOrder: SortOrder;
}

export interface DepartmentListParams extends BaseListParams {
  branchId?: string;
  parentDepartmentId?: string;
  rootOnly?: boolean;
  isActive?: boolean;
  sortBy:
    | "department_code"
    | "department_name"
    | "cost_center_code"
    | "created_at"
    | "updated_at";
}



export interface DepartmentListResult {
  departments: Department[];
  pagination: Pagination;
}

export interface OrganisationCounts {
  branches: number;
  departments: number;
  designations: number;
  positions: number;
}

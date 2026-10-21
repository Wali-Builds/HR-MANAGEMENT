export type DatabaseId =
  | string
  | number
  | bigint;

export interface DepartmentDatabaseRow {
  department_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;
  parent_department_id: DatabaseId | null;

  department_code: string;
  department_name: string;
  description: string | null;
  cost_center_code: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  branch_name: string | null;
  parent_department_name: string | null;
}

export interface DepartmentResponse {
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

export interface DepartmentListOptions {
  page: number;
  limit: number;

  companyId: string | null;

  branchId?: string;
  // edited by wali: Filter Branch Admin lists to their role-assigned branch IDs.
  branchIds?: string[];
  parentDepartmentId?: string;
  rootOnly?: boolean;

  search?: string;
  isActive?: boolean;

  sortBy:
    | "department_code"
    | "department_name"
    | "cost_center_code"
    | "created_at"
    | "updated_at";

  sortOrder: "ASC" | "DESC";
}

export interface DepartmentListResult {
  departments: DepartmentDatabaseRow[];
  total: number;
}

export interface DepartmentActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface DepartmentReferenceRow {
  department_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;
  parent_department_id: DatabaseId | null;
  is_active: number | boolean;
}

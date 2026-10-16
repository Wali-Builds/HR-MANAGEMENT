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

export interface Designation {
  designationId: string;
  companyId: string;
  designationCode: string;
  designationName: string;
  grade: string | null;
  jobLevel: number | null;
  description: string | null;
  minimumSalary: number | null;
  maximumSalary: number | null;
  isManagerial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DesignationInput {
  companyId?: string;
  designationCode: string;
  designationName: string;
  grade?: string | null;
  jobLevel?: number | null;
  description?: string | null;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  isManagerial: boolean;
  isActive: boolean;
}

export type PositionStatus = "ACTIVE" | "INACTIVE" | "FROZEN" | "CLOSED";

export interface Position {
  positionId: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  reportsToPositionId: string | null;
  parentPositionTitle: string | null;
  positionCode: string;
  positionTitle: string;
  positionType: string;
  approvedHeadcount: number;
  filledHeadcount: number;
  availableHeadcount: number;
  minimumSalary: number | null;
  maximumSalary: number | null;
  currencyCode: string;
  positionStatus: PositionStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PositionInput {
  companyId?: string;
  branchId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  reportsToPositionId?: string | null;
  positionCode: string;
  positionTitle: string;
  positionType: string;
  approvedHeadcount: number;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  currencyCode: string;
  positionStatus: PositionStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface BaseListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  sortOrder: SortOrder;
}

export interface BranchListParams extends BaseListParams {
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

export interface DesignationListParams extends BaseListParams {
  grade?: string;
  jobLevel?: number;
  isManagerial?: boolean;
  isActive?: boolean;
  sortBy:
    | "designation_code"
    | "designation_name"
    | "grade"
    | "job_level"
    | "minimum_salary"
    | "maximum_salary"
    | "created_at"
    | "updated_at";
}

export interface PositionListParams extends BaseListParams {
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  reportsToPositionId?: string;
  positionType?: string;
  positionStatus?: string;
  hasVacancy?: boolean;
  sortBy:
    | "position_code"
    | "position_title"
    | "position_type"
    | "approved_headcount"
    | "filled_headcount"
    | "position_status"
    | "created_at"
    | "updated_at";
}

export interface BranchListResult {
  branches: Branch[];
  pagination: Pagination;
}

export interface DepartmentListResult {
  departments: Department[];
  pagination: Pagination;
}

export interface DesignationListResult {
  designations: Designation[];
  pagination: Pagination;
}

export interface PositionListResult {
  positions: Position[];
  pagination: Pagination;
}

export interface OrganisationCounts {
  branches: number;
  departments: number;
  designations: number;
  positions: number;
}

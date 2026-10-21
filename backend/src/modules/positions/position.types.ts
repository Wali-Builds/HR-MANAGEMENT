export type DatabaseId =
  | string
  | number
  | bigint;

export interface PositionDatabaseRow {
  position_id: DatabaseId;
  company_id: DatabaseId;

  branch_id: DatabaseId | null;
  department_id: DatabaseId | null;
  designation_id: DatabaseId | null;
  reports_to_position_id: DatabaseId | null;

  position_code: string;
  position_title: string;
  position_type: string;

  approved_headcount: number;
  filled_headcount: number;

  minimum_salary:
    | string
    | number
    | null;

  maximum_salary:
    | string
    | number
    | null;

  currency_code: string;
  position_status: string;

  effective_from:
    | Date
    | string
    | null;

  effective_to:
    | Date
    | string
    | null;

  created_at: Date | string;
  updated_at: Date | string;

  branch_name: string | null;
  department_name: string | null;
  designation_name: string | null;
  parent_position_title: string | null;
}

export interface PositionResponse {
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
  positionStatus: string;

  effectiveFrom: string | null;
  effectiveTo: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PositionListOptions {
  page: number;
  limit: number;

  companyId: string | null;

  branchId?: string;
  // edited by wali: Limit branch-admin position results to assigned branches.
  branchIds?: string[];
  departmentId?: string;
  designationId?: string;
  reportsToPositionId?: string;

  search?: string;
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

  sortOrder: "ASC" | "DESC";
}

export interface PositionListResult {
  positions: PositionDatabaseRow[];
  total: number;
}

export interface PositionActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PositionReferenceRow {
  position_id: DatabaseId;
  company_id: DatabaseId;

  branch_id: DatabaseId | null;
  department_id: DatabaseId | null;
  designation_id: DatabaseId | null;
  reports_to_position_id: DatabaseId | null;

  approved_headcount: number;
  filled_headcount: number;

  position_status: string;

  effective_from:
    | Date
    | string
    | null;

  effective_to:
    | Date
    | string
    | null;
}

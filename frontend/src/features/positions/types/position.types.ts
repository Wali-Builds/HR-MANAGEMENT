// edited by wali: Keep position domain types in the Positions feature.
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
export interface PositionListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  sortOrder: "ASC" | "DESC";
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  reportsToPositionId?: string;
  positionType?: string;
  positionStatus?: string;
  hasVacancy?: boolean;
  sortBy: "position_code" | "position_title" | "position_type" | "approved_headcount" | "filled_headcount" | "position_status" | "created_at" | "updated_at";
}
export interface PositionListResult {
  positions: Position[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

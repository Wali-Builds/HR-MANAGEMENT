export type LeaveGovernanceDatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Approval delegations
 * =========================================================
 */

export interface LeaveApprovalDelegationDatabaseRow {
  delegation_id:
    LeaveGovernanceDatabaseId;

  company_id:
    LeaveGovernanceDatabaseId;

  delegator_user_id:
    LeaveGovernanceDatabaseId;

  delegator_username: string;

  delegator_employee_id:
    LeaveGovernanceDatabaseId | null;

  delegator_employee_code:
    string | null;

  delegator_employee_name:
    string | null;

  delegate_user_id:
    LeaveGovernanceDatabaseId;

  delegate_username: string;

  delegate_employee_id:
    LeaveGovernanceDatabaseId | null;

  delegate_employee_code:
    string | null;

  delegate_employee_name:
    string | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string;

  reason:
    string | null;

  is_active:
    | number
    | boolean;

  is_effective:
    | number
    | boolean;

  created_by_user_id:
    LeaveGovernanceDatabaseId | null;

  created_by_username:
    string | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveApprovalDelegationResponse {
  delegationId: string;
  companyId: string;

  delegatorUserId: string;
  delegatorUsername: string;

  delegatorEmployeeId:
    string | null;

  delegatorEmployeeCode:
    string | null;

  delegatorEmployeeName:
    string | null;

  delegateUserId: string;
  delegateUsername: string;

  delegateEmployeeId:
    string | null;

  delegateEmployeeCode:
    string | null;

  delegateEmployeeName:
    string | null;

  effectiveFrom: string;
  effectiveTo: string;

  reason: string | null;

  isActive: boolean;
  isEffective: boolean;

  createdByUserId:
    string | null;

  createdByUsername:
    string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveApprovalDelegationRecord {
  companyId: string;

  delegatorUserId: string;
  delegateUserId: string;

  effectiveFrom: string;
  effectiveTo: string;

  reason: string | null;
  isActive: boolean;

  createdByUserId: string;
}

export interface UpdateLeaveApprovalDelegationRecord {
  delegatorUserId?:
    | string
    | undefined;

  delegateUserId?:
    | string
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | undefined;

  reason?:
    | string
    | null
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Blackout periods
 * =========================================================
 */

export type LeaveBlackoutRestrictionType =
  | "BLOCK"
  | "WARNING";

export interface LeaveBlackoutPeriodDatabaseRow {
  blackout_period_id:
    LeaveGovernanceDatabaseId;

  company_id:
    LeaveGovernanceDatabaseId;

  branch_id:
    LeaveGovernanceDatabaseId | null;

  branch_code:
    string | null;

  branch_name:
    string | null;

  department_id:
    LeaveGovernanceDatabaseId | null;

  department_code:
    string | null;

  department_name:
    string | null;

  leave_type_id:
    LeaveGovernanceDatabaseId | null;

  leave_type_code:
    string | null;

  leave_type_name:
    string | null;

  blackout_name: string;

  description:
    string | null;

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  restriction_type: string;

  exception_requires_approval:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  affected_request_count:
    | string
    | number
    | bigint;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveBlackoutPeriodResponse {
  blackoutPeriodId: string;
  companyId: string;

  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;

  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;

  leaveTypeId: string | null;
  leaveTypeCode: string | null;
  leaveTypeName: string | null;

  blackoutName: string;
  description: string | null;

  startDate: string;
  endDate: string;

  restrictionType: string;

  exceptionRequiresApproval: boolean;
  isActive: boolean;

  affectedRequestCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveBlackoutPeriodRecord {
  companyId: string;

  branchId: string | null;
  departmentId: string | null;
  leaveTypeId: string | null;

  blackoutName: string;
  description: string | null;

  startDate: string;
  endDate: string;

  restrictionType:
    LeaveBlackoutRestrictionType;

  exceptionRequiresApproval: boolean;
  isActive: boolean;
}

export interface UpdateLeaveBlackoutPeriodRecord {
  branchId?:
    | string
    | null
    | undefined;

  departmentId?:
    | string
    | null
    | undefined;

  leaveTypeId?:
    | string
    | null
    | undefined;

  blackoutName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | undefined;

  restrictionType?:
    | LeaveBlackoutRestrictionType
    | undefined;

  exceptionRequiresApproval?:
    | boolean
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Applicable blackout preview
 * =========================================================
 */

export interface ApplicableLeaveBlackoutResponse {
  employeeId: string;
  leaveTypeId: string;

  requestedStartDate: string;
  requestedEndDate: string;

  hasBlockingBlackout: boolean;
  hasWarningBlackout: boolean;

  matches:
    LeaveBlackoutPeriodResponse[];
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface LeaveGovernancePaginationResponse {
  page: number;
  pageSize: number;

  totalRecords: number;
  totalPages: number;
}
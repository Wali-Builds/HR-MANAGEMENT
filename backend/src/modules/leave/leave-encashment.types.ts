export type LeaveEncashmentDatabaseId =
  | string
  | number
  | bigint;

export type LeaveEncashmentRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "PROCESSED";

/*
 * =========================================================
 * Database and response types
 * =========================================================
 */

export interface LeaveEncashmentRequestDatabaseRow {
  encashment_request_id:
    LeaveEncashmentDatabaseId;

  company_id:
    LeaveEncashmentDatabaseId;

  employee_id:
    LeaveEncashmentDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_type_id:
    LeaveEncashmentDatabaseId;

  leave_type_code: string;
  leave_type_name: string;
  unit_type: string;

  leave_period_id:
    LeaveEncashmentDatabaseId;

  period_code: string;
  period_name: string;

  period_start_date:
    | Date
    | string;

  period_end_date:
    | Date
    | string;

  period_status: string;

  request_number: string;

  requested_units:
    | string
    | number;

  approved_units:
    | string
    | number
    | null;

  rate_per_unit:
    | string
    | number
    | null;

  gross_amount:
    | string
    | number
    | null;

  request_status: string;
  reason: string | null;

  requested_by_user_id:
    | LeaveEncashmentDatabaseId
    | null;

  requested_by_username:
    | string
    | null;

  approved_by_user_id:
    | LeaveEncashmentDatabaseId
    | null;

  approved_by_username:
    | string
    | null;

  approved_at:
    | Date
    | string
    | null;

  approval_remarks:
    | string
    | null;

  payroll_reference:
    | string
    | null;

  processed_at:
    | Date
    | string
    | null;

  leave_balance_id:
    | LeaveEncashmentDatabaseId
    | null;

  current_available_balance:
    | string
    | number
    | null;

  balance_transaction_id:
    | LeaveEncashmentDatabaseId
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveEncashmentRequestResponse {
  encashmentRequestId: string;
  companyId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: string;

  leavePeriodId: string;
  periodCode: string;
  periodName: string;

  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;

  requestNumber: string;

  requestedUnits: number;
  approvedUnits: number | null;

  ratePerUnit: number | null;
  grossAmount: number | null;

  requestStatus:
    LeaveEncashmentRequestStatus;

  reason: string | null;

  requestedByUserId:
    string | null;

  requestedByUsername:
    string | null;

  approvedByUserId:
    string | null;

  approvedByUsername:
    string | null;

  approvedAt: string | null;
  approvalRemarks: string | null;

  payrollReference: string | null;
  processedAt: string | null;

  leaveBalanceId: string | null;
  currentAvailableBalance:
    number | null;

  balanceTransactionId:
    string | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Repository write records
 * =========================================================
 */

export interface CreateLeaveEncashmentRequestRecord {
  companyId: string;
  employeeId: string;

  leaveTypeId: string;
  leavePeriodId: string;

  requestedUnits: number;
  reason: string | null;

  requestedByUserId: string;
}

export interface ApproveLeaveEncashmentRequestRecord {
  approvedUnits: number;
  ratePerUnit: number;

  approvalRemarks:
    string | null;

  approvedByUserId: string;
}

export interface RejectLeaveEncashmentRequestRecord {
  approvalRemarks: string;
  rejectedByUserId: string;
}

export interface CancelLeaveEncashmentRequestRecord {
  cancellationReason: string;
  cancelledByUserId: string;
}

export interface ProcessLeaveEncashmentRequestRecord {
  payrollReference: string;
  processedByUserId: string;
}

/*
 * =========================================================
 * Repository operation results
 * =========================================================
 */

export interface LeaveEncashmentApprovalDatabaseResult {
  request:
    LeaveEncashmentRequestDatabaseRow;

  leaveBalanceId: string;
  balanceTransactionId: string;

  balanceBefore: number;
  balanceAfter: number;

  carryForwardUnitsConsumed: number;
}

export interface LeaveEncashmentPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

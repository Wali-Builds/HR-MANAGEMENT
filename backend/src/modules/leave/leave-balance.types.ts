export type LeaveBalanceDatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Leave periods
 * =========================================================
 */

export interface LeavePeriodDatabaseRow {
  leave_period_id: LeaveBalanceDatabaseId;
  company_id: LeaveBalanceDatabaseId;

  period_code: string;
  period_name: string;

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  period_status: string;

  closed_by_user_id:
    | LeaveBalanceDatabaseId
    | null;

  closed_at:
    | Date
    | string
    | null;

  balance_count:
    | string
    | number
    | bigint;

  transaction_count:
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

export interface LeavePeriodResponse {
  leavePeriodId: string;
  companyId: string;

  periodCode: string;
  periodName: string;

  startDate: string;
  endDate: string;

  periodStatus: string;
  isOpen: boolean;

  closedByUserId: string | null;
  closedAt: string | null;

  balanceCount: number;
  transactionCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeavePeriodRecord {
  companyId: string;

  periodCode: string;
  periodName: string;

  startDate: string;
  endDate: string;

  periodStatus: "OPEN" | "CLOSED";

  closedByUserId: string | null;
  closedAt: string | null;
}

export interface UpdateLeavePeriodRecord {
  periodCode?:
    | string
    | undefined;

  periodName?:
    | string
    | undefined;

  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | undefined;
}

export interface CloseAndOpenNextLeavePeriodRecord {
  companyId: string;

  sourcePeriodId: string;
  targetPeriodId: string;

  processingDate: string;

  carryForwardRunId:
    | string
    | null;

  closedByUserId: string;
}

export interface CloseAndOpenNextLeavePeriodDatabaseResult {
  sourcePeriod:
    LeavePeriodDatabaseRow;

  targetPeriod:
    LeavePeriodDatabaseRow;

  carryForwardRunId:
    | string
    | null;

  processingDate: string;

  carriedUnits: number;
  expiredUnits: number;

  sourceBalanceCount: number;
  targetBalanceCount: number;
}

export interface CloseAndOpenNextLeavePeriodResponse {
  sourcePeriod:
    LeavePeriodResponse;

  targetPeriod:
    LeavePeriodResponse;

  carryForwardRunId:
    | string
    | null;

  processingDate: string;

  carriedUnits: number;
  expiredUnits: number;

  sourceBalanceCount: number;
  targetBalanceCount: number;
}

/*
 * =========================================================
 * Employee leave balances
 * =========================================================
 */

export interface EmployeeLeaveBalanceDatabaseRow {
  leave_balance_id: LeaveBalanceDatabaseId;
  company_id: LeaveBalanceDatabaseId;

  employee_id: LeaveBalanceDatabaseId;
  employee_code: string;
  employee_name: string;

  leave_type_id: LeaveBalanceDatabaseId;
  leave_type_code: string;
  leave_type_name: string;
  unit_type: string;
  leave_type_is_paid:
    | number
    | boolean;

  leave_period_id: LeaveBalanceDatabaseId;
  period_code: string;
  period_name: string;

  period_start_date:
    | Date
    | string;

  period_end_date:
    | Date
    | string;

  period_status: string;

  opening_balance:
    | string
    | number;

  accrued_units:
    | string
    | number;

  carried_forward_units:
    | string
    | number;

  adjusted_units:
    | string
    | number;

  used_units:
    | string
    | number;

  pending_units:
    | string
    | number;

  encashed_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  available_balance:
    | string
    | number;

  computed_available_balance:
    | string
    | number;

  balance_difference:
    | string
    | number;

  transaction_count:
    | string
    | number
    | bigint;

  last_accrual_date:
    | Date
    | string
    | null;

  last_calculated_at:
    | Date
    | string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface EmployeeLeaveBalanceResponse {
  leaveBalanceId: string;
  companyId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: string;
  leaveTypeIsPaid: boolean;

  leavePeriodId: string;
  periodCode: string;
  periodName: string;

  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;

  openingBalance: number;
  accruedUnits: number;
  carriedForwardUnits: number;
  adjustedUnits: number;

  usedUnits: number;
  pendingUnits: number;
  encashedUnits: number;
  expiredUnits: number;

  availableBalance: number;
  computedAvailableBalance: number;
  balanceDifference: number;

  isConsistent: boolean;

  transactionCount: number;

  lastAccrualDate: string | null;
  lastCalculatedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface InitializeEmployeeLeaveBalanceRecord {
  companyId: string;
  employeeId: string;

  leaveTypeId: string;
  leavePeriodId: string;

  openingBalance: number;
  accruedUnits: number;
  carriedForwardUnits: number;
  adjustedUnits: number;

  lastAccrualDate: string | null;

  createdByUserId: string;
  remarks: string | null;
}

/*
 * =========================================================
 * Balance transactions
 * =========================================================
 */

export type LeaveBalanceTransactionType =
  | "OPENING_BALANCE"
  | "ACCRUAL"
  | "CARRY_FORWARD"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "LEAVE_RESERVED"
  | "LEAVE_RELEASED"
  | "LEAVE_USED"
  | "ENCASHMENT"
  | "EXPIRY";

export interface LeaveBalanceTransactionDatabaseRow {
  transaction_id: LeaveBalanceDatabaseId;
  leave_balance_id: LeaveBalanceDatabaseId;

  company_id: LeaveBalanceDatabaseId;

  employee_id: LeaveBalanceDatabaseId;
  employee_code: string;
  employee_name: string;

  leave_type_id: LeaveBalanceDatabaseId;
  leave_type_code: string;
  leave_type_name: string;
  unit_type: string;

  leave_period_id: LeaveBalanceDatabaseId;
  period_code: string;
  period_name: string;

  transaction_date:
    | Date
    | string;

  transaction_type: string;

  units_changed:
    | string
    | number;

  balance_before:
    | string
    | number
    | null;

  balance_after:
    | string
    | number
    | null;

  reference_type: string | null;

  reference_id:
    | LeaveBalanceDatabaseId
    | null;

  remarks: string | null;

  created_by_user_id:
    | LeaveBalanceDatabaseId
    | null;

  created_at:
    | Date
    | string;
}

export interface LeaveBalanceTransactionResponse {
  transactionId: string;
  leaveBalanceId: string;

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

  transactionDate: string;
  transactionType: string;

  unitsChanged: number;

  balanceBefore: number | null;
  balanceAfter: number | null;

  referenceType: string | null;
  referenceId: string | null;

  remarks: string | null;

  createdByUserId: string | null;
  createdAt: string;
}

export interface CreateLeaveBalanceTransactionRecord {
  leaveBalanceId: string;

  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leavePeriodId: string;

  transactionDate: string;
  transactionType: LeaveBalanceTransactionType;

  unitsChanged: number;

  referenceType: string | null;
  referenceId: string | null;

  remarks: string | null;
  createdByUserId: string;
}

/*
 * =========================================================
 * Manual adjustment
 * =========================================================
 */

export type LeaveBalanceAdjustmentDirection =
  | "CREDIT"
  | "DEBIT";

export interface CreateLeaveBalanceAdjustmentRecord {
  companyId: string;
  employeeId: string;

  leaveTypeId: string;
  leavePeriodId: string;

  adjustmentDirection:
    LeaveBalanceAdjustmentDirection;

  units: number;
  transactionDate: string;

  referenceType: string | null;
  referenceId: string | null;

  remarks: string;
  createdByUserId: string;
}

/*
 * =========================================================
 * Recalculation
 * =========================================================
 */

export interface LeaveBalanceRecalculationResponse {
  leaveBalanceId: string;

  previousAvailableBalance: number;
  recalculatedAvailableBalance: number;
  difference: number;

  repaired: boolean;

  balance:
    EmployeeLeaveBalanceResponse;
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface LeaveBalancePaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
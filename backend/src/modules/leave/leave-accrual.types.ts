export type LeaveAccrualDatabaseId =
  | string
  | number
  | bigint;

export type LeaveAccrualMethod =
  | "ANNUAL"
  | "SEMI_ANNUAL"
  | "QUARTERLY"
  | "MONTHLY"
  | "MANUAL";

export type LeaveAccrualRunType =
  | "REGULAR"
  | "INITIAL_ALLOCATION"
  | "CORRECTION";

export type LeaveProcessingRunStatus =
  | "DRAFT"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_FAILED"
  | "FAILED"
  | "CANCELLED";

export type LeaveProcessingDetailStatus =
  | "PENDING"
  | "PROCESSED"
  | "SKIPPED"
  | "FAILED";

export type LeaveCarryForwardLotStatus =
  | "ACTIVE"
  | "EXHAUSTED"
  | "EXPIRED"
  | "CANCELLED";

export type LeaveBalanceExpiryStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "SKIPPED"
  | "FAILED";

/*
 * =========================================================
 * Accrual runs
 * =========================================================
 */

export interface LeaveAccrualRunDatabaseRow {
  accrual_run_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  leave_period_id:
    LeaveAccrualDatabaseId;

  period_code: string;
  period_name: string;

  period_start_date:
    | Date
    | string;

  period_end_date:
    | Date
    | string;

  period_status: string;

  run_number: string;
  idempotency_key: string;
  run_name: string;

  run_type: string;
  accrual_method: string;

  accrual_from_date:
    | Date
    | string;

  accrual_to_date:
    | Date
    | string;

  posting_date:
    | Date
    | string;

  run_status: string;

  is_dry_run:
    | number
    | boolean;

  total_candidates:
    | string
    | number
    | bigint;

  processed_count:
    | string
    | number
    | bigint;

  successful_count:
    | string
    | number
    | bigint;

  skipped_count:
    | string
    | number
    | bigint;

  failed_count:
    | string
    | number
    | bigint;

  total_calculated_units:
    | string
    | number;

  total_applied_units:
    | string
    | number;

  started_by_user_id:
    | LeaveAccrualDatabaseId
    | null;

  started_by_username:
    | string
    | null;

  started_at:
    | Date
    | string
    | null;

  completed_at:
    | Date
    | string
    | null;

  cancelled_by_user_id:
    | LeaveAccrualDatabaseId
    | null;

  cancelled_by_username:
    | string
    | null;

  cancelled_at:
    | Date
    | string
    | null;

  cancellation_reason:
    | string
    | null;

  error_summary:
    | string
    | null;

  created_by_user_id:
    | LeaveAccrualDatabaseId
    | null;

  created_by_username:
    | string
    | null;

  detail_count:
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

export interface LeaveAccrualRunResponse {
  accrualRunId: string;
  companyId: string;

  leavePeriodId: string;
  periodCode: string;
  periodName: string;

  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;

  runNumber: string;
  idempotencyKey: string;
  runName: string;

  runType: string;
  accrualMethod: string;

  accrualFromDate: string;
  accrualToDate: string;
  postingDate: string;

  runStatus: string;
  isDryRun: boolean;

  totalCandidates: number;
  processedCount: number;
  successfulCount: number;
  skippedCount: number;
  failedCount: number;

  totalCalculatedUnits: number;
  totalAppliedUnits: number;

  startedByUserId: string | null;
  startedByUsername: string | null;
  startedAt: string | null;

  completedAt: string | null;

  cancelledByUserId: string | null;
  cancelledByUsername: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  errorSummary: string | null;

  createdByUserId: string | null;
  createdByUsername: string | null;

  detailCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveAccrualRunRecord {
  companyId: string;
  leavePeriodId: string;

  runNumber: string;
  idempotencyKey: string;
  runName: string;

  runType:
    LeaveAccrualRunType;

  accrualMethod:
    LeaveAccrualMethod;

  accrualFromDate: string;
  accrualToDate: string;
  postingDate: string;

  isDryRun: boolean;

  createdByUserId: string;
}

/*
 * =========================================================
 * Accrual run details
 * =========================================================
 */

export interface LeaveAccrualRunDetailDatabaseRow {
  accrual_run_detail_id:
    LeaveAccrualDatabaseId;

  accrual_run_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  employee_id:
    LeaveAccrualDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_type_id:
    LeaveAccrualDatabaseId;

  leave_type_code: string;
  leave_type_name: string;
  leave_type_unit_type: string;

  leave_policy_rule_id:
    LeaveAccrualDatabaseId
    | null;

  leave_balance_id:
    LeaveAccrualDatabaseId
    | null;

  accrual_from_date:
    | Date
    | string;

  accrual_to_date:
    | Date
    | string;

  annual_entitlement_units:
    | string
    | number
    | null;

  accrual_rate_units:
    | string
    | number
    | null;

  proration_factor:
    | string
    | number;

  calculated_units:
    | string
    | number;

  applied_units:
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

  detail_status: string;

  skip_reason:
    | string
    | null;

  error_code:
    | string
    | null;

  error_message:
    | string
    | null;

  transaction_id:
    LeaveAccrualDatabaseId
    | null;

  processed_at:
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

export interface LeaveAccrualRunDetailResponse {
  accrualRunDetailId: string;
  accrualRunId: string;
  companyId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveTypeUnitType: string;

  leavePolicyRuleId: string | null;
  leaveBalanceId: string | null;

  accrualFromDate: string;
  accrualToDate: string;

  annualEntitlementUnits: number | null;
  accrualRateUnits: number | null;
  prorationFactor: number;

  calculatedUnits: number;
  appliedUnits: number;

  balanceBefore: number | null;
  balanceAfter: number | null;

  detailStatus: string;

  skipReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;

  transactionId: string | null;
  processedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveAccrualRunDetailRecord {
  accrualRunId: string;
  companyId: string;

  employeeId: string;
  leaveTypeId: string;

  leavePolicyRuleId:
    string
    | null;

  leaveBalanceId:
    string
    | null;

  accrualFromDate: string;
  accrualToDate: string;

  annualEntitlementUnits:
    number
    | null;

  accrualRateUnits:
    number
    | null;

  prorationFactor: number;

  calculatedUnits: number;
  appliedUnits: number;

  balanceBefore:
    number
    | null;

  balanceAfter:
    number
    | null;

  detailStatus:
    LeaveProcessingDetailStatus;

  skipReason:
    string
    | null;

  errorCode:
    string
    | null;

  errorMessage:
    string
    | null;

  transactionId:
    string
    | null;
}

/*
 * =========================================================
 * Accrual policy candidates
 * =========================================================
 */

export interface LeaveAccrualCandidateDatabaseRow {
  employee_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  employee_code: string;
  employee_name: string;

  joining_date:
    | Date
    | string;

  probation_end_date:
    | Date
    | string
    | null;

  confirmation_date:
    | Date
    | string
    | null;

  gender:
    | string
    | null;

  is_active:
    | number
    | boolean;

  leave_policy_id:
    LeaveAccrualDatabaseId;

  leave_policy_rule_id:
    LeaveAccrualDatabaseId;

  leave_type_id:
    LeaveAccrualDatabaseId;

  leave_type_code: string;
  leave_type_name: string;
  leave_type_unit_type: string;

  annual_entitlement_units:
    | string
    | number;

  accrual_method: string;

  accrual_units_per_period:
    | string
    | number;

  accrual_start_after_days:
    | string
    | number;

  prorate_entitlement:
    | number
    | boolean;

  allow_during_probation:
    | number
    | boolean;

  eligible_gender: string;

  maximum_balance_units:
    | string
    | number
    | null;

  leave_balance_id:
    LeaveAccrualDatabaseId
    | null;

  opening_balance:
    | string
    | number
    | null;

  accrued_units:
    | string
    | number
    | null;

  carried_forward_units:
    | string
    | number
    | null;

  adjusted_units:
    | string
    | number
    | null;

  used_units:
    | string
    | number
    | null;

  pending_units:
    | string
    | number
    | null;

  encashed_units:
    | string
    | number
    | null;

  expired_units:
    | string
    | number
    | null;

  available_balance:
    | string
    | number
    | null;

  last_accrual_date:
    | Date
    | string
    | null;
}

/*
 * =========================================================
 * Accrual preview
 * =========================================================
 */

export interface LeaveAccrualPreviewItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;

  leavePolicyRuleId: string;

  leaveBalanceId: string | null;

  annualEntitlementUnits: number;
  accrualRateUnits: number;

  prorationFactor: number;

  calculatedUnits: number;
  applicableMaximumBalance: number | null;

  balanceBefore: number;
  projectedBalanceAfter: number;

  status:
    | "ELIGIBLE"
    | "SKIPPED";

  skipReason: string | null;
}

export interface LeaveAccrualPreviewResponse {
  companyId: string;
  leavePeriodId: string;

  accrualMethod: string;

  accrualFromDate: string;
  accrualToDate: string;
  postingDate: string;

  totalCandidates: number;
  eligibleCount: number;
  skippedCount: number;

  totalCalculatedUnits: number;

  items:
    LeaveAccrualPreviewItem[];
}

/*
 * =========================================================
 * Carry-forward runs
 * =========================================================
 */

export interface LeaveCarryForwardRunDatabaseRow {
  carry_forward_run_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  source_period_id:
    LeaveAccrualDatabaseId;

  source_period_code: string;
  source_period_name: string;

  target_period_id:
    LeaveAccrualDatabaseId;

  target_period_code: string;
  target_period_name: string;

  run_number: string;
  idempotency_key: string;
  run_name: string;

  processing_date:
    | Date
    | string;

  run_status: string;

  is_dry_run:
    | number
    | boolean;

  total_candidates:
    | string
    | number
    | bigint;

  processed_count:
    | string
    | number
    | bigint;

  successful_count:
    | string
    | number
    | bigint;

  skipped_count:
    | string
    | number
    | bigint;

  failed_count:
    | string
    | number
    | bigint;

  total_eligible_units:
    | string
    | number;

  total_carried_units:
    | string
    | number;

  total_expired_units:
    | string
    | number;

  started_by_user_id:
    LeaveAccrualDatabaseId
    | null;

  started_by_username:
    string
    | null;

  started_at:
    | Date
    | string
    | null;

  completed_at:
    | Date
    | string
    | null;

  cancelled_by_user_id:
    LeaveAccrualDatabaseId
    | null;

  cancelled_by_username:
    string
    | null;

  cancelled_at:
    | Date
    | string
    | null;

  cancellation_reason:
    string
    | null;

  error_summary:
    string
    | null;

  created_by_user_id:
    LeaveAccrualDatabaseId
    | null;

  created_by_username:
    string
    | null;

  detail_count:
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

export interface LeaveCarryForwardRunResponse {
  carryForwardRunId: string;
  companyId: string;

  sourcePeriodId: string;
  sourcePeriodCode: string;
  sourcePeriodName: string;

  targetPeriodId: string;
  targetPeriodCode: string;
  targetPeriodName: string;

  runNumber: string;
  idempotencyKey: string;
  runName: string;

  processingDate: string;

  runStatus: string;
  isDryRun: boolean;

  totalCandidates: number;
  processedCount: number;
  successfulCount: number;
  skippedCount: number;
  failedCount: number;

  totalEligibleUnits: number;
  totalCarriedUnits: number;
  totalExpiredUnits: number;

  startedByUserId: string | null;
  startedByUsername: string | null;
  startedAt: string | null;

  completedAt: string | null;

  cancelledByUserId: string | null;
  cancelledByUsername: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  errorSummary: string | null;

  createdByUserId: string | null;
  createdByUsername: string | null;

  detailCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveCarryForwardRunRecord {
  companyId: string;

  sourcePeriodId: string;
  targetPeriodId: string;

  runNumber: string;
  idempotencyKey: string;
  runName: string;

  processingDate: string;

  isDryRun: boolean;

  createdByUserId: string;
}

/*
 * =========================================================
 * Carry-forward run details
 * =========================================================
 */

export interface LeaveCarryForwardRunDetailDatabaseRow {
  carry_forward_run_detail_id:
    LeaveAccrualDatabaseId;

  carry_forward_run_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  employee_id:
    LeaveAccrualDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_type_id:
    LeaveAccrualDatabaseId;

  leave_type_code: string;
  leave_type_name: string;

  leave_policy_rule_id:
    LeaveAccrualDatabaseId
    | null;

  source_leave_balance_id:
    LeaveAccrualDatabaseId;

  target_leave_balance_id:
    LeaveAccrualDatabaseId
    | null;

  source_available_balance:
    | string
    | number;

  carry_forward_limit_units:
    | string
    | number
    | null;

  eligible_units:
    | string
    | number;

  carried_units:
    | string
    | number;

  expired_units_at_close:
    | string
    | number;

  target_balance_before:
    | string
    | number
    | null;

  target_balance_after:
    | string
    | number
    | null;

  carry_forward_expiry_date:
    | Date
    | string
    | null;

  carry_transaction_id:
    LeaveAccrualDatabaseId
    | null;

  source_expiry_transaction_id:
    LeaveAccrualDatabaseId
    | null;

  detail_status: string;

  skip_reason:
    string
    | null;

  error_code:
    string
    | null;

  error_message:
    string
    | null;

  processed_at:
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

export interface LeaveCarryForwardRunDetailResponse {
  carryForwardRunDetailId: string;
  carryForwardRunId: string;
  companyId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;

  leavePolicyRuleId: string | null;

  sourceLeaveBalanceId: string;
  targetLeaveBalanceId: string | null;

  sourceAvailableBalance: number;

  carryForwardLimitUnits: number | null;
  eligibleUnits: number;

  carriedUnits: number;
  expiredUnitsAtClose: number;

  targetBalanceBefore: number | null;
  targetBalanceAfter: number | null;

  carryForwardExpiryDate: string | null;

  carryTransactionId: string | null;
  sourceExpiryTransactionId: string | null;

  detailStatus: string;

  skipReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;

  processedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Carry-forward preview
 * =========================================================
 */

export interface LeaveCarryForwardPreviewItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;

  leavePolicyRuleId: string | null;

  sourceLeaveBalanceId: string;

  sourceAvailableBalance: number;

  carryForwardEnabled: boolean;
  maximumCarryForwardUnits: number | null;

  eligibleUnits: number;
  carriedUnits: number;
  expiredUnitsAtClose: number;

  carryForwardExpiryDate: string | null;

  status:
    | "ELIGIBLE"
    | "SKIPPED";

  skipReason: string | null;
}

export interface LeaveCarryForwardPreviewResponse {
  companyId: string;

  sourcePeriodId: string;
  targetPeriodId: string;

  processingDate: string;

  totalCandidates: number;
  eligibleCount: number;
  skippedCount: number;

  totalEligibleUnits: number;
  totalCarriedUnits: number;
  totalExpiredUnits: number;

  items:
    LeaveCarryForwardPreviewItem[];
}

/*
 * =========================================================
 * Carry-forward lots
 * =========================================================
 */

export interface LeaveCarryForwardLotDatabaseRow {
  carry_forward_lot_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  carry_forward_run_detail_id:
    LeaveAccrualDatabaseId;

  employee_id:
    LeaveAccrualDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_type_id:
    LeaveAccrualDatabaseId;

  leave_type_code: string;
  leave_type_name: string;

  source_period_id:
    LeaveAccrualDatabaseId;

  target_period_id:
    LeaveAccrualDatabaseId;

  source_leave_balance_id:
    LeaveAccrualDatabaseId;

  target_leave_balance_id:
    LeaveAccrualDatabaseId;

  original_units:
    | string
    | number;

  remaining_units:
    | string
    | number;

  consumed_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  expiry_date:
    | Date
    | string
    | null;

  lot_status: string;

  carry_transaction_id:
    LeaveAccrualDatabaseId
    | null;

  expiry_transaction_id:
    LeaveAccrualDatabaseId
    | null;

  fully_consumed_at:
    | Date
    | string
    | null;

  expired_at:
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

export interface LeaveCarryForwardLotResponse {
  carryForwardLotId: string;
  companyId: string;

  carryForwardRunDetailId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;

  sourcePeriodId: string;
  targetPeriodId: string;

  sourceLeaveBalanceId: string;
  targetLeaveBalanceId: string;

  originalUnits: number;
  remainingUnits: number;
  consumedUnits: number;
  expiredUnits: number;

  expiryDate: string | null;
  lotStatus: string;

  carryTransactionId: string | null;
  expiryTransactionId: string | null;

  fullyConsumedAt: string | null;
  expiredAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Balance expiries
 * =========================================================
 */

export interface LeaveBalanceExpiryDatabaseRow {
  leave_balance_expiry_id:
    LeaveAccrualDatabaseId;

  company_id:
    LeaveAccrualDatabaseId;

  carry_forward_lot_id:
    LeaveAccrualDatabaseId;

  employee_id:
    LeaveAccrualDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_type_id:
    LeaveAccrualDatabaseId;

  leave_type_code: string;
  leave_type_name: string;

  leave_period_id:
    LeaveAccrualDatabaseId;

  leave_balance_id:
    LeaveAccrualDatabaseId;

  expiry_date:
    | Date
    | string;

  scheduled_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  expiry_status: string;

  transaction_id:
    LeaveAccrualDatabaseId
    | null;

  processed_by_user_id:
    LeaveAccrualDatabaseId
    | null;

  processed_by_username:
    string
    | null;

  processed_at:
    | Date
    | string
    | null;

  error_code:
    string
    | null;

  error_message:
    string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveBalanceExpiryResponse {
  leaveBalanceExpiryId: string;
  companyId: string;

  carryForwardLotId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;

  leavePeriodId: string;
  leaveBalanceId: string;

  expiryDate: string;

  scheduledUnits: number;
  expiredUnits: number;

  expiryStatus: string;

  transactionId: string | null;

  processedByUserId: string | null;
  processedByUsername: string | null;
  processedAt: string | null;

  errorCode: string | null;
  errorMessage: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceExpiryProcessingResult {
  companyId: string;
  leavePeriodId: string;

  processingDate: string;

  totalCandidates: number;
  completedCount: number;
  skippedCount: number;
  failedCount: number;

  totalExpiredUnits: number;

  expiries:
    LeaveBalanceExpiryDatabaseRow[];
}

/*
 * =========================================================
 * Run processing results
 * =========================================================
 */

export interface LeaveAccrualRunProcessingResult {
  run:
    LeaveAccrualRunDatabaseRow;

  details:
    LeaveAccrualRunDetailDatabaseRow[];
}

export interface LeaveCarryForwardRunProcessingResult {
  run:
    LeaveCarryForwardRunDatabaseRow;

  details:
    LeaveCarryForwardRunDetailDatabaseRow[];

  lots:
    LeaveCarryForwardLotDatabaseRow[];
}

/*
 * =========================================================
 * Period close and next-period opening
 * =========================================================
 */

export interface LeaveCloseAndOpenNextPeriodResult {
  closedPeriodId: string;
  targetPeriodId: string;

  carryForwardRunId:
    string
    | null;

  expiryProcessingDate: string;

  carriedUnits: number;
  expiredUnits: number;

  sourcePeriodStatus: string;
  targetPeriodStatus: string;
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface LeaveAccrualPaginationResponse {
  page: number;
  pageSize: number;

  totalRecords: number;
  totalPages: number;
}
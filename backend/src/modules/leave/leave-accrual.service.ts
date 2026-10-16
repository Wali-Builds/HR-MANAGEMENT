import { AppError } from "../../common/errors/app-error.js";

import type { AuthContext } from "../auth/auth.types.js";

import type {
  AttendanceActor,
  RequestMetadata
} from "../attendance/attendance.types.js";

import {
  cancelLeaveAccrualRunRecord,
  createLeaveAccrualRunRecord,
  findLeaveAccrualRunRecordById,
  listLeaveAccrualRunDetailRecords,
  listLeaveAccrualRunRecords,
  previewLeaveAccrualRecords,
  processLeaveAccrualRunRecord
} from "./leave-accrual.repository.js";

import {
  cancelLeaveCarryForwardRunRecord,
  createLeaveCarryForwardRunRecord,
  findLeaveCarryForwardRunRecordById,
  listLeaveBalanceExpiryRecords,
  listLeaveCarryForwardRunDetailRecords,
  listLeaveCarryForwardRunRecords,
  previewLeaveCarryForwardRecords,
  processLeaveBalanceExpiryRecords,
  processLeaveCarryForwardRunRecord
} from "./leave-carry-forward.repository.js";

import type {
  CancelLeaveAccrualRunInput,
  CancelLeaveCarryForwardRunInput,
  CreateLeaveAccrualRunInput,
  CreateLeaveCarryForwardRunInput,
  LeaveAccrualPreviewInput,
  LeaveAccrualRunDetailListQuery,
  LeaveAccrualRunListQuery,
  LeaveBalanceExpiryListQuery,
  LeaveCarryForwardPreviewInput,
  LeaveCarryForwardRunDetailListQuery,
  LeaveCarryForwardRunListQuery,
  ProcessLeaveAccrualRunInput,
  ProcessLeaveBalanceExpiryInput,
  ProcessLeaveCarryForwardRunInput
} from "./leave-accrual.schema.js";

import type {
  CreateLeaveAccrualRunRecord,
  CreateLeaveCarryForwardRunRecord,
  LeaveAccrualPaginationResponse,
  LeaveAccrualRunDatabaseRow,
  LeaveAccrualRunDetailDatabaseRow,
  LeaveAccrualRunDetailResponse,
  LeaveAccrualRunResponse,
  LeaveBalanceExpiryDatabaseRow,
  LeaveBalanceExpiryResponse,
  LeaveCarryForwardLotDatabaseRow,
  LeaveCarryForwardLotResponse,
  LeaveCarryForwardRunDatabaseRow,
  LeaveCarryForwardRunDetailDatabaseRow,
  LeaveCarryForwardRunDetailResponse,
  LeaveCarryForwardRunResponse
} from "./leave-accrual.types.js";

/*
 * =========================================================
 * Generic helpers
 * =========================================================
 */

function databaseBoolean(
  value:
    | number
    | boolean
    | null
    | undefined
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function nullableId(
  value:
    | string
    | number
    | bigint
    | null
    | undefined
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

function numericValue(
  value:
    | string
    | number
    | bigint
    | null
    | undefined
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  return Number(value);
}

function nullableNumber(
  value:
    | string
    | number
    | bigint
    | null
    | undefined
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Number(value);
}

function dateOnly(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(0, 10);
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}

function requiredDateOnly(
  value:
    | Date
    | string
): string {
  const result =
    dateOnly(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATE"
    );
  }

  return result;
}

function dateTimeIso(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  let parsed: Date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    parsed =
      new Date(
        `${value
          .slice(0, 19)
          .replace(" ", "T")}Z`
      );
  } else {
    parsed =
      new Date(value);
  }

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

function requiredDateTimeIso(
  value:
    | Date
    | string
): string {
  const result =
    dateTimeIso(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATETIME"
    );
  }

  return result;
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): LeaveAccrualPaginationResponse {
  return {
    page,
    pageSize,
    totalRecords,

    totalPages:
      totalRecords === 0
        ? 0
        : Math.ceil(
            totalRecords /
            pageSize
          )
  };
}

/*
 * =========================================================
 * Authentication and authorization
 * =========================================================
 */

function getPermissions(
  auth: AuthContext
): string[] {
  const context =
    auth as
      AuthContext & {
        permissions?: string[];
      };

  return Array.isArray(
    context.permissions
  )
    ? context.permissions
    : [];
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  return (
    auth.isPlatformAdmin ||
    getPermissions(auth).includes(
      permissionCode
    )
  );
}

function hasAnyPermission(
  auth: AuthContext,
  permissionCodes: string[]
): boolean {
  return (
    auth.isPlatformAdmin ||
    permissionCodes.some(
      permissionCode =>
        hasPermission(
          auth,
          permissionCode
        )
    )
  );
}

function requireCompanyId(
  auth: AuthContext
): string {
  if (!auth.companyId) {
    throw new AppError({
      message:
        "A company context is required",
      statusCode: 400,
      code:
        "COMPANY_CONTEXT_REQUIRED"
    });
  }

  return String(
    auth.companyId
  );
}

function createActor(
  auth: AuthContext
): AttendanceActor {
  return {
    userId:
      auth.userId,

    employeeId:
      auth.employeeId ??
      null,

    companyId:
      auth.companyId ??
      null,

    isPlatformAdmin:
      auth.isPlatformAdmin,

    permissions:
      getPermissions(auth)
  };
}

function assertAccess(
  auth: AuthContext,
  permissionCodes: string[],
  message: string,
  code: string
): void {
  if (
    hasAnyPermission(
      auth,
      permissionCodes
    )
  ) {
    return;
  }

  throw new AppError({
    message,
    statusCode: 403,
    code
  });
}

function assertAccrualViewAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.accrual.view",
      "leave.accrual.manage",
      "leave.accrual.process",
      "leave.balance.view",
      "leave.view",
      "leave.manage"
    ],
    "You do not have permission to view leave accrual runs",
    "LEAVE_ACCRUAL_VIEW_ACCESS_DENIED"
  );
}

function assertAccrualManageAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.accrual.manage",
      "leave.manage"
    ],
    "You do not have permission to create or cancel leave accrual runs",
    "LEAVE_ACCRUAL_MANAGE_ACCESS_DENIED"
  );
}

function assertAccrualProcessAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.accrual.process",
      "leave.manage"
    ],
    "You do not have permission to process leave accrual runs",
    "LEAVE_ACCRUAL_PROCESS_ACCESS_DENIED"
  );
}

function assertCarryForwardViewAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.carry_forward.view",
      "leave.carry_forward.manage",
      "leave.carry_forward.process",
      "leave.balance.view",
      "leave.view",
      "leave.manage"
    ],
    "You do not have permission to view leave carry-forward runs",
    "LEAVE_CARRY_FORWARD_VIEW_ACCESS_DENIED"
  );
}

function assertCarryForwardManageAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.carry_forward.manage",
      "leave.manage"
    ],
    "You do not have permission to create or cancel leave carry-forward runs",
    "LEAVE_CARRY_FORWARD_MANAGE_ACCESS_DENIED"
  );
}

function assertCarryForwardProcessAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.carry_forward.process",
      "leave.manage"
    ],
    "You do not have permission to process leave carry-forward runs",
    "LEAVE_CARRY_FORWARD_PROCESS_ACCESS_DENIED"
  );
}

function assertExpiryViewAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.expiry.view",
      "leave.expiry.process",
      "leave.balance.view",
      "leave.view",
      "leave.manage"
    ],
    "You do not have permission to view leave balance expiries",
    "LEAVE_EXPIRY_VIEW_ACCESS_DENIED"
  );
}

function assertExpiryProcessAccess(
  auth: AuthContext
): void {
  assertAccess(
    auth,
    [
      "leave.expiry.process",
      "leave.manage"
    ],
    "You do not have permission to process leave balance expiries",
    "LEAVE_EXPIRY_PROCESS_ACCESS_DENIED"
  );
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapLeaveAccrualRun(
  row: LeaveAccrualRunDatabaseRow
): LeaveAccrualRunResponse {
  return {
    accrualRunId:
      String(
        row.accrual_run_id
      ),

    companyId:
      String(
        row.company_id
      ),

    leavePeriodId:
      String(
        row.leave_period_id
      ),

    periodCode:
      row.period_code,

    periodName:
      row.period_name,

    periodStartDate:
      requiredDateOnly(
        row.period_start_date
      ),

    periodEndDate:
      requiredDateOnly(
        row.period_end_date
      ),

    periodStatus:
      row.period_status,

    runNumber:
      row.run_number,

    idempotencyKey:
      row.idempotency_key,

    runName:
      row.run_name,

    runType:
      row.run_type,

    accrualMethod:
      row.accrual_method,

    accrualFromDate:
      requiredDateOnly(
        row.accrual_from_date
      ),

    accrualToDate:
      requiredDateOnly(
        row.accrual_to_date
      ),

    postingDate:
      requiredDateOnly(
        row.posting_date
      ),

    runStatus:
      row.run_status,

    isDryRun:
      databaseBoolean(
        row.is_dry_run
      ),

    totalCandidates:
      numericValue(
        row.total_candidates
      ),

    processedCount:
      numericValue(
        row.processed_count
      ),

    successfulCount:
      numericValue(
        row.successful_count
      ),

    skippedCount:
      numericValue(
        row.skipped_count
      ),

    failedCount:
      numericValue(
        row.failed_count
      ),

    totalCalculatedUnits:
      numericValue(
        row.total_calculated_units
      ),

    totalAppliedUnits:
      numericValue(
        row.total_applied_units
      ),

    startedByUserId:
      nullableId(
        row.started_by_user_id
      ),

    startedByUsername:
      row.started_by_username,

    startedAt:
      dateTimeIso(
        row.started_at
      ),

    completedAt:
      dateTimeIso(
        row.completed_at
      ),

    cancelledByUserId:
      nullableId(
        row.cancelled_by_user_id
      ),

    cancelledByUsername:
      row.cancelled_by_username,

    cancelledAt:
      dateTimeIso(
        row.cancelled_at
      ),

    cancellationReason:
      row.cancellation_reason,

    errorSummary:
      row.error_summary,

    createdByUserId:
      nullableId(
        row.created_by_user_id
      ),

    createdByUsername:
      row.created_by_username,

    detailCount:
      numericValue(
        row.detail_count
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveAccrualRunDetail(
  row:
    LeaveAccrualRunDetailDatabaseRow
): LeaveAccrualRunDetailResponse {
  return {
    accrualRunDetailId:
      String(
        row.accrual_run_detail_id
      ),

    accrualRunId:
      String(
        row.accrual_run_id
      ),

    companyId:
      String(
        row.company_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    leaveTypeUnitType:
      row.leave_type_unit_type,

    leavePolicyRuleId:
      nullableId(
        row.leave_policy_rule_id
      ),

    leaveBalanceId:
      nullableId(
        row.leave_balance_id
      ),

    accrualFromDate:
      requiredDateOnly(
        row.accrual_from_date
      ),

    accrualToDate:
      requiredDateOnly(
        row.accrual_to_date
      ),

    annualEntitlementUnits:
      nullableNumber(
        row.annual_entitlement_units
      ),

    accrualRateUnits:
      nullableNumber(
        row.accrual_rate_units
      ),

    prorationFactor:
      numericValue(
        row.proration_factor
      ),

    calculatedUnits:
      numericValue(
        row.calculated_units
      ),

    appliedUnits:
      numericValue(
        row.applied_units
      ),

    balanceBefore:
      nullableNumber(
        row.balance_before
      ),

    balanceAfter:
      nullableNumber(
        row.balance_after
      ),

    detailStatus:
      row.detail_status,

    skipReason:
      row.skip_reason,

    errorCode:
      row.error_code,

    errorMessage:
      row.error_message,

    transactionId:
      nullableId(
        row.transaction_id
      ),

    processedAt:
      dateTimeIso(
        row.processed_at
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveCarryForwardRun(
  row:
    LeaveCarryForwardRunDatabaseRow
): LeaveCarryForwardRunResponse {
  return {
    carryForwardRunId:
      String(
        row.carry_forward_run_id
      ),

    companyId:
      String(
        row.company_id
      ),

    sourcePeriodId:
      String(
        row.source_period_id
      ),

    sourcePeriodCode:
      row.source_period_code,

    sourcePeriodName:
      row.source_period_name,

    targetPeriodId:
      String(
        row.target_period_id
      ),

    targetPeriodCode:
      row.target_period_code,

    targetPeriodName:
      row.target_period_name,

    runNumber:
      row.run_number,

    idempotencyKey:
      row.idempotency_key,

    runName:
      row.run_name,

    processingDate:
      requiredDateOnly(
        row.processing_date
      ),

    runStatus:
      row.run_status,

    isDryRun:
      databaseBoolean(
        row.is_dry_run
      ),

    totalCandidates:
      numericValue(
        row.total_candidates
      ),

    processedCount:
      numericValue(
        row.processed_count
      ),

    successfulCount:
      numericValue(
        row.successful_count
      ),

    skippedCount:
      numericValue(
        row.skipped_count
      ),

    failedCount:
      numericValue(
        row.failed_count
      ),

    totalEligibleUnits:
      numericValue(
        row.total_eligible_units
      ),

    totalCarriedUnits:
      numericValue(
        row.total_carried_units
      ),

    totalExpiredUnits:
      numericValue(
        row.total_expired_units
      ),

    startedByUserId:
      nullableId(
        row.started_by_user_id
      ),

    startedByUsername:
      row.started_by_username,

    startedAt:
      dateTimeIso(
        row.started_at
      ),

    completedAt:
      dateTimeIso(
        row.completed_at
      ),

    cancelledByUserId:
      nullableId(
        row.cancelled_by_user_id
      ),

    cancelledByUsername:
      row.cancelled_by_username,

    cancelledAt:
      dateTimeIso(
        row.cancelled_at
      ),

    cancellationReason:
      row.cancellation_reason,

    errorSummary:
      row.error_summary,

    createdByUserId:
      nullableId(
        row.created_by_user_id
      ),

    createdByUsername:
      row.created_by_username,

    detailCount:
      numericValue(
        row.detail_count
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveCarryForwardRunDetail(
  row:
    LeaveCarryForwardRunDetailDatabaseRow
): LeaveCarryForwardRunDetailResponse {
  return {
    carryForwardRunDetailId:
      String(
        row.carry_forward_run_detail_id
      ),

    carryForwardRunId:
      String(
        row.carry_forward_run_id
      ),

    companyId:
      String(
        row.company_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    leavePolicyRuleId:
      nullableId(
        row.leave_policy_rule_id
      ),

    sourceLeaveBalanceId:
      String(
        row.source_leave_balance_id
      ),

    targetLeaveBalanceId:
      nullableId(
        row.target_leave_balance_id
      ),

    sourceAvailableBalance:
      numericValue(
        row.source_available_balance
      ),

    carryForwardLimitUnits:
      nullableNumber(
        row.carry_forward_limit_units
      ),

    eligibleUnits:
      numericValue(
        row.eligible_units
      ),

    carriedUnits:
      numericValue(
        row.carried_units
      ),

    expiredUnitsAtClose:
      numericValue(
        row.expired_units_at_close
      ),

    targetBalanceBefore:
      nullableNumber(
        row.target_balance_before
      ),

    targetBalanceAfter:
      nullableNumber(
        row.target_balance_after
      ),

    carryForwardExpiryDate:
      dateOnly(
        row.carry_forward_expiry_date
      ),

    carryTransactionId:
      nullableId(
        row.carry_transaction_id
      ),

    sourceExpiryTransactionId:
      nullableId(
        row.source_expiry_transaction_id
      ),

    detailStatus:
      row.detail_status,

    skipReason:
      row.skip_reason,

    errorCode:
      row.error_code,

    errorMessage:
      row.error_message,

    processedAt:
      dateTimeIso(
        row.processed_at
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveCarryForwardLot(
  row:
    LeaveCarryForwardLotDatabaseRow
): LeaveCarryForwardLotResponse {
  return {
    carryForwardLotId:
      String(
        row.carry_forward_lot_id
      ),

    companyId:
      String(
        row.company_id
      ),

    carryForwardRunDetailId:
      String(
        row.carry_forward_run_detail_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    sourcePeriodId:
      String(
        row.source_period_id
      ),

    targetPeriodId:
      String(
        row.target_period_id
      ),

    sourceLeaveBalanceId:
      String(
        row.source_leave_balance_id
      ),

    targetLeaveBalanceId:
      String(
        row.target_leave_balance_id
      ),

    originalUnits:
      numericValue(
        row.original_units
      ),

    remainingUnits:
      numericValue(
        row.remaining_units
      ),

    consumedUnits:
      numericValue(
        row.consumed_units
      ),

    expiredUnits:
      numericValue(
        row.expired_units
      ),

    expiryDate:
      dateOnly(
        row.expiry_date
      ),

    lotStatus:
      row.lot_status,

    carryTransactionId:
      nullableId(
        row.carry_transaction_id
      ),

    expiryTransactionId:
      nullableId(
        row.expiry_transaction_id
      ),

    fullyConsumedAt:
      dateTimeIso(
        row.fully_consumed_at
      ),

    expiredAt:
      dateTimeIso(
        row.expired_at
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveBalanceExpiry(
  row:
    LeaveBalanceExpiryDatabaseRow
): LeaveBalanceExpiryResponse {
  return {
    leaveBalanceExpiryId:
      String(
        row.leave_balance_expiry_id
      ),

    companyId:
      String(
        row.company_id
      ),

    carryForwardLotId:
      String(
        row.carry_forward_lot_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    leavePeriodId:
      String(
        row.leave_period_id
      ),

    leaveBalanceId:
      String(
        row.leave_balance_id
      ),

    expiryDate:
      requiredDateOnly(
        row.expiry_date
      ),

    scheduledUnits:
      numericValue(
        row.scheduled_units
      ),

    expiredUnits:
      numericValue(
        row.expired_units
      ),

    expiryStatus:
      row.expiry_status,

    transactionId:
      nullableId(
        row.transaction_id
      ),

    processedByUserId:
      nullableId(
        row.processed_by_user_id
      ),

    processedByUsername:
      row.processed_by_username,

    processedAt:
      dateTimeIso(
        row.processed_at
      ),

    errorCode:
      row.error_code,

    errorMessage:
      row.error_message,

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

/*
 * =========================================================
 * Repository error translation
 * =========================================================
 */

function translateRepositoryError(
  error: unknown
): never {
  if (
    error instanceof AppError
  ) {
    throw error;
  }

  const code =
    error instanceof Error
      ? error.message
      : "";

  const mappings: Record<
    string,
    {
      message: string;
      statusCode: number;
    }
  > = {
    LEAVE_PERIOD_NOT_FOUND: {
      message:
        "Leave period was not found",
      statusCode: 404
    },

    SOURCE_LEAVE_PERIOD_NOT_FOUND: {
      message:
        "Source leave period was not found",
      statusCode: 404
    },

    TARGET_LEAVE_PERIOD_NOT_FOUND: {
      message:
        "Target leave period was not found",
      statusCode: 404
    },

    INVALID_LEAVE_PERIOD_DATES: {
      message:
        "The leave-period dates are invalid",
      statusCode: 422
    },

    SOURCE_AND_TARGET_PERIOD_CANNOT_MATCH: {
      message:
        "Source and target leave periods cannot be the same",
      statusCode: 422
    },

    TARGET_PERIOD_MUST_FOLLOW_SOURCE_PERIOD: {
      message:
        "The target leave period must follow the source period",
      statusCode: 422
    },

    CARRY_FORWARD_BEFORE_SOURCE_PERIOD_END: {
      message:
        "Carry-forward cannot be processed before the source period ends",
      statusCode: 409
    },

    TARGET_LEAVE_PERIOD_NOT_OPEN: {
      message:
        "The target leave period must be open",
      statusCode: 409
    },

    ACCRUAL_METHOD_NOT_AUTOMATED: {
      message:
        "Manual accrual cannot be processed through an automated accrual run",
      statusCode: 422
    },

    ACCRUAL_METHOD_MISMATCH: {
      message:
        "The selected accrual method does not match the applicable policy rule",
      statusCode: 409
    },

    INVALID_ACCRUAL_DATE_RANGE: {
      message:
        "The accrual date range is invalid",
      statusCode: 422
    },

    ACCRUAL_RANGE_OUTSIDE_LEAVE_PERIOD: {
      message:
        "The accrual range must remain within the leave period",
      statusCode: 422
    },

    POSTING_DATE_OUTSIDE_LEAVE_PERIOD: {
      message:
        "The accrual posting date must remain within the leave period",
      statusCode: 422
    },

    ONLY_DRAFT_ACCRUAL_RUN_CAN_BE_PROCESSED: {
      message:
        "Only a draft accrual run can be processed",
      statusCode: 409
    },

    ONLY_DRAFT_ACCRUAL_RUN_CAN_BE_CANCELLED: {
      message:
        "Only a draft accrual run can be cancelled",
      statusCode: 409
    },

    CREATED_ACCRUAL_RUN_NOT_FOUND: {
      message:
        "The accrual run was created but could not be retrieved",
      statusCode: 500
    },

    PROCESSED_ACCRUAL_RUN_NOT_FOUND: {
      message:
        "The accrual run was processed but could not be retrieved",
      statusCode: 500
    },

    CANCELLED_ACCRUAL_RUN_NOT_FOUND: {
      message:
        "The accrual run was cancelled but could not be retrieved",
      statusCode: 500
    },

    CARRY_FORWARD_ALREADY_PROCESSED: {
      message:
        "A non-dry-run carry-forward has already been processed for these periods",
      statusCode: 409
    },

    ONLY_DRAFT_CARRY_FORWARD_RUN_CAN_BE_PROCESSED: {
      message:
        "Only a draft carry-forward run can be processed",
      statusCode: 409
    },

    ONLY_DRAFT_CARRY_FORWARD_RUN_CAN_BE_CANCELLED: {
      message:
        "Only a draft carry-forward run can be cancelled",
      statusCode: 409
    },

    SOURCE_LEAVE_BALANCE_NOT_FOUND: {
      message:
        "A source leave balance was not found",
      statusCode: 404
    },

    TARGET_LEAVE_BALANCE_NOT_FOUND: {
      message:
        "A target leave balance was not found",
      statusCode: 404
    },

    TARGET_LEAVE_BALANCE_NOT_AVAILABLE: {
      message:
        "A target leave balance could not be initialized",
      statusCode: 409
    },

    SOURCE_LEAVE_BALANCE_HAS_PENDING_UNITS: {
      message:
        "Carry-forward cannot run while the source balance has pending leave units",
      statusCode: 409
    },

    CREATED_CARRY_FORWARD_RUN_NOT_FOUND: {
      message:
        "The carry-forward run was created but could not be retrieved",
      statusCode: 500
    },

    PROCESSED_CARRY_FORWARD_RUN_NOT_FOUND: {
      message:
        "The carry-forward run was processed but could not be retrieved",
      statusCode: 500
    },

    CANCELLED_CARRY_FORWARD_RUN_NOT_FOUND: {
      message:
        "The carry-forward run was cancelled but could not be retrieved",
      statusCode: 500
    },

    EXPIRY_RECORD_NOT_FOUND: {
      message:
        "A leave balance expiry record was not found",
      statusCode: 404
    },

    EXPIRY_BALANCE_HAS_PENDING_UNITS: {
      message:
        "Carried balance cannot expire while the employee has pending leave units",
      statusCode: 409
    },

    EXPIRY_UNITS_EXCEED_AVAILABLE_BALANCE: {
      message:
        "The scheduled expiry units exceed the available leave balance",
      statusCode: 409
    },

    CARRY_FORWARD_LOT_NOT_ACTIVE: {
      message:
        "The carry-forward lot is no longer active",
      statusCode: 409
    }
  };

  const mapping =
    mappings[code];

  if (mapping) {
    throw new AppError({
      message:
        mapping.message,

      statusCode:
        mapping.statusCode,

      code
    });
  }

  const databaseError =
    error as {
      code?: string;
      errno?: number;
    };

  if (
    databaseError.code ===
      "ER_DUP_ENTRY" ||
    databaseError.errno ===
      1062
  ) {
    throw new AppError({
      message:
        "A run with the same idempotency key or processing scope already exists",
      statusCode: 409,
      code:
        "LEAVE_PROCESSING_RUN_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno ===
      1452
  ) {
    throw new AppError({
      message:
        "A referenced leave, employee, policy, balance, period, or user record was not found",
      statusCode: 409,
      code:
        "LEAVE_PROCESSING_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Accrual services
 * =========================================================
 */

export async function listLeaveAccrualRuns(
  query:
    LeaveAccrualRunListQuery,
  auth:
    AuthContext
) {
  assertAccrualViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const result =
    await listLeaveAccrualRunRecords(
      companyId,
      {
        ...(query.leavePeriodId !==
        undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.runType !==
        undefined
          ? {
              runType:
                query.runType
            }
          : {}),

        ...(query.accrualMethod !==
        undefined
          ? {
              accrualMethod:
                query.accrualMethod
            }
          : {}),

        ...(query.runStatus !==
        undefined
          ? {
              runStatus:
                query.runStatus
            }
          : {}),

        ...(query.isDryRun !==
        undefined
          ? {
              isDryRun:
                query.isDryRun
            }
          : {}),

        ...(query.postingDateFrom !==
        undefined
          ? {
              postingDateFrom:
                query.postingDateFrom
            }
          : {}),

        ...(query.postingDateTo !==
        undefined
          ? {
              postingDateTo:
                query.postingDateTo
            }
          : {}),

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    accrualRuns:
      result.records.map(
        mapLeaveAccrualRun
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveAccrualRun(
  accrualRunId:
    string,
  auth:
    AuthContext
) {
  assertAccrualViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const run =
    await findLeaveAccrualRunRecordById(
      companyId,
      accrualRunId
    );

  if (!run) {
    throw new AppError({
      message:
        "Leave accrual run was not found",
      statusCode: 404,
      code:
        "LEAVE_ACCRUAL_RUN_NOT_FOUND"
    });
  }

  return mapLeaveAccrualRun(
    run
  );
}

export async function listLeaveAccrualRunDetails(
  accrualRunId:
    string,
  query:
    LeaveAccrualRunDetailListQuery,
  auth:
    AuthContext
) {
  assertAccrualViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const run =
    await findLeaveAccrualRunRecordById(
      companyId,
      accrualRunId
    );

  if (!run) {
    throw new AppError({
      message:
        "Leave accrual run was not found",
      statusCode: 404,
      code:
        "LEAVE_ACCRUAL_RUN_NOT_FOUND"
    });
  }

  const result =
    await listLeaveAccrualRunDetailRecords(
      companyId,
      accrualRunId,
      {
        ...(query.employeeId !==
        undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.detailStatus !==
        undefined
          ? {
              detailStatus:
                query.detailStatus
            }
          : {}),

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    accrualRun:
      mapLeaveAccrualRun(
        run
      ),

    details:
      result.records.map(
        mapLeaveAccrualRunDetail
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function previewLeaveAccrual(
  input:
    LeaveAccrualPreviewInput,
  auth:
    AuthContext
) {
  assertAccrualViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    return await previewLeaveAccrualRecords(
      {
        companyId,

        leavePeriodId:
          input.leavePeriodId,

        accrualMethod:
          input.accrualMethod,

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        postingDate:
          input.postingDate,

        ...(input.employeeId !==
        undefined
          ? {
              employeeId:
                input.employeeId
            }
          : {}),

        ...(input.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                input.leaveTypeId
            }
          : {})
      }
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function createLeaveAccrualRun(
  input:
    CreateLeaveAccrualRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertAccrualManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const record:
    CreateLeaveAccrualRunRecord = {
      companyId,

      leavePeriodId:
        input.leavePeriodId,

      runNumber:
        input.runNumber ??
        "",

      idempotencyKey:
        input.idempotencyKey,

      runName:
        input.runName,

      runType:
        input.runType,

      accrualMethod:
        input.accrualMethod,

      accrualFromDate:
        input.accrualFromDate,

      accrualToDate:
        input.accrualToDate,

      postingDate:
        input.postingDate,

      isDryRun:
        input.isDryRun,

      createdByUserId:
        String(
          auth.userId
        )
    };

  try {
    const created =
      await createLeaveAccrualRunRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveAccrualRun(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function processLeaveAccrualRun(
  accrualRunId:
    string,
  input:
    ProcessLeaveAccrualRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertAccrualProcessAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const result =
      await processLeaveAccrualRunRecord(
        companyId,
        accrualRunId,
        {
          continueOnError:
            input.continueOnError,

          rebuildPendingDetails:
            input.rebuildPendingDetails,

          processedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message:
          "Leave accrual run was not found",
        statusCode: 404,
        code:
          "LEAVE_ACCRUAL_RUN_NOT_FOUND"
      });
    }

    return {
      run:
        mapLeaveAccrualRun(
          result.run
        ),

      details:
        result.details.map(
          mapLeaveAccrualRunDetail
        )
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function cancelLeaveAccrualRun(
  accrualRunId:
    string,
  input:
    CancelLeaveAccrualRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertAccrualManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const cancelled =
      await cancelLeaveAccrualRunRecord(
        companyId,
        accrualRunId,
        {
          reason:
            input.reason,

          cancelledByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!cancelled) {
      throw new AppError({
        message:
          "Leave accrual run was not found",
        statusCode: 404,
        code:
          "LEAVE_ACCRUAL_RUN_NOT_FOUND"
      });
    }

    return mapLeaveAccrualRun(
      cancelled
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Carry-forward services
 * =========================================================
 */

export async function listLeaveCarryForwardRuns(
  query:
    LeaveCarryForwardRunListQuery,
  auth:
    AuthContext
) {
  assertCarryForwardViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const result =
    await listLeaveCarryForwardRunRecords(
      companyId,
      {
        ...(query.sourcePeriodId !==
        undefined
          ? {
              sourcePeriodId:
                query.sourcePeriodId
            }
          : {}),

        ...(query.targetPeriodId !==
        undefined
          ? {
              targetPeriodId:
                query.targetPeriodId
            }
          : {}),

        ...(query.runStatus !==
        undefined
          ? {
              runStatus:
                query.runStatus
            }
          : {}),

        ...(query.isDryRun !==
        undefined
          ? {
              isDryRun:
                query.isDryRun
            }
          : {}),

        ...(query.processingDateFrom !==
        undefined
          ? {
              processingDateFrom:
                query.processingDateFrom
            }
          : {}),

        ...(query.processingDateTo !==
        undefined
          ? {
              processingDateTo:
                query.processingDateTo
            }
          : {}),

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    carryForwardRuns:
      result.records.map(
        mapLeaveCarryForwardRun
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveCarryForwardRun(
  carryForwardRunId:
    string,
  auth:
    AuthContext
) {
  assertCarryForwardViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const run =
    await findLeaveCarryForwardRunRecordById(
      companyId,
      carryForwardRunId
    );

  if (!run) {
    throw new AppError({
      message:
        "Leave carry-forward run was not found",
      statusCode: 404,
      code:
        "LEAVE_CARRY_FORWARD_RUN_NOT_FOUND"
    });
  }

  return mapLeaveCarryForwardRun(
    run
  );
}

export async function listLeaveCarryForwardRunDetails(
  carryForwardRunId:
    string,
  query:
    LeaveCarryForwardRunDetailListQuery,
  auth:
    AuthContext
) {
  assertCarryForwardViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const run =
    await findLeaveCarryForwardRunRecordById(
      companyId,
      carryForwardRunId
    );

  if (!run) {
    throw new AppError({
      message:
        "Leave carry-forward run was not found",
      statusCode: 404,
      code:
        "LEAVE_CARRY_FORWARD_RUN_NOT_FOUND"
    });
  }

  const result =
    await listLeaveCarryForwardRunDetailRecords(
      companyId,
      carryForwardRunId,
      {
        ...(query.employeeId !==
        undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.detailStatus !==
        undefined
          ? {
              detailStatus:
                query.detailStatus
            }
          : {}),

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    carryForwardRun:
      mapLeaveCarryForwardRun(
        run
      ),

    details:
      result.records.map(
        mapLeaveCarryForwardRunDetail
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function previewLeaveCarryForward(
  sourcePeriodId:
    string,
  input:
    LeaveCarryForwardPreviewInput,
  auth:
    AuthContext
) {
  assertCarryForwardViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    return await previewLeaveCarryForwardRecords(
      {
        companyId,
        sourcePeriodId,

        targetPeriodId:
          input.targetPeriodId,

        processingDate:
          input.processingDate,

        ...(input.employeeId !==
        undefined
          ? {
              employeeId:
                input.employeeId
            }
          : {}),

        ...(input.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                input.leaveTypeId
            }
          : {})
      }
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function createLeaveCarryForwardRun(
  sourcePeriodId:
    string,
  input:
    CreateLeaveCarryForwardRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertCarryForwardManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const record:
    CreateLeaveCarryForwardRunRecord = {
      companyId,
      sourcePeriodId,

      targetPeriodId:
        input.targetPeriodId,

      runNumber:
        input.runNumber ??
        "",

      idempotencyKey:
        input.idempotencyKey,

      runName:
        input.runName,

      processingDate:
        input.processingDate,

      isDryRun:
        input.isDryRun,

      createdByUserId:
        String(
          auth.userId
        )
    };

  try {
    const created =
      await createLeaveCarryForwardRunRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveCarryForwardRun(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function processLeaveCarryForwardRun(
  carryForwardRunId:
    string,
  input:
    ProcessLeaveCarryForwardRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertCarryForwardProcessAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const result =
      await processLeaveCarryForwardRunRecord(
        companyId,
        carryForwardRunId,
        {
          continueOnError:
            input.continueOnError,

          processedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message:
          "Leave carry-forward run was not found",
        statusCode: 404,
        code:
          "LEAVE_CARRY_FORWARD_RUN_NOT_FOUND"
      });
    }

    return {
      run:
        mapLeaveCarryForwardRun(
          result.run
        ),

      details:
        result.details.map(
          mapLeaveCarryForwardRunDetail
        ),

      lots:
        result.lots.map(
          mapLeaveCarryForwardLot
        )
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function cancelLeaveCarryForwardRun(
  carryForwardRunId:
    string,
  input:
    CancelLeaveCarryForwardRunInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertCarryForwardManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const cancelled =
      await cancelLeaveCarryForwardRunRecord(
        companyId,
        carryForwardRunId,
        {
          reason:
            input.reason,

          cancelledByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!cancelled) {
      throw new AppError({
        message:
          "Leave carry-forward run was not found",
        statusCode: 404,
        code:
          "LEAVE_CARRY_FORWARD_RUN_NOT_FOUND"
      });
    }

    return mapLeaveCarryForwardRun(
      cancelled
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Balance-expiry services
 * =========================================================
 */

export async function listLeaveBalanceExpiries(
  query:
    LeaveBalanceExpiryListQuery,
  auth:
    AuthContext
) {
  assertExpiryViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const result =
    await listLeaveBalanceExpiryRecords(
      companyId,
      {
        ...(query.employeeId !==
        undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.leavePeriodId !==
        undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.expiryStatus !==
        undefined
          ? {
              expiryStatus:
                query.expiryStatus
            }
          : {}),

        ...(query.expiryDateFrom !==
        undefined
          ? {
              expiryDateFrom:
                query.expiryDateFrom
            }
          : {}),

        ...(query.expiryDateTo !==
        undefined
          ? {
              expiryDateTo:
                query.expiryDateTo
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    expiries:
      result.records.map(
        mapLeaveBalanceExpiry
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function processLeaveBalanceExpiries(
  leavePeriodId:
    string,
  input:
    ProcessLeaveBalanceExpiryInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertExpiryProcessAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const result =
      await processLeaveBalanceExpiryRecords(
        {
          companyId,
          leavePeriodId,

          processingDate:
            input.processingDate,

          ...(input.employeeId !==
          undefined
            ? {
                employeeId:
                  input.employeeId
              }
            : {}),

          ...(input.leaveTypeId !==
          undefined
            ? {
                leaveTypeId:
                  input.leaveTypeId
              }
            : {}),

          continueOnError:
            input.continueOnError,

          dryRun:
            input.dryRun,

          processedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    return {
      companyId:
        result.companyId,

      leavePeriodId:
        result.leavePeriodId,

      processingDate:
        result.processingDate,

      totalCandidates:
        result.totalCandidates,

      completedCount:
        result.completedCount,

      skippedCount:
        result.skippedCount,

      failedCount:
        result.failedCount,

      totalExpiredUnits:
        result.totalExpiredUnits,

      expiries:
        result.expiries.map(
          mapLeaveBalanceExpiry
        )
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById
} from "../attendance/attendance.repository.js";

import type {
  AttendanceActor,
  AttendanceEmployeeDatabaseRow,
  RequestMetadata
} from "../attendance/attendance.types.js";

import {
  bulkRecalculateLeaveBalanceRecords,
  closeAndOpenNextLeavePeriodRecord,
  closeLeavePeriodRecord,
  createLeaveBalanceAdjustmentRecord,
  createLeavePeriodRecord,
  deleteLeavePeriodRecord,
  findEmployeeLeaveTypeBalanceRecord,
  findLeaveBalanceRecordById,
  findLeavePeriodRecordById,
  initializeEmployeeLeaveBalanceRecord,
  listEmployeeLeaveBalanceRecords,
  listEmployeeLeaveBalanceTransactionRecords,
  listLeaveBalanceRecords,
  listLeaveBalanceTransactionRecords,
  listLeavePeriodRecords,
  recalculateLeaveBalanceRecord,
  reopenLeavePeriodRecord,
  updateLeavePeriodRecord
} from "./leave-balance.repository.js";

import type {
  BulkRecalculateLeaveBalancesInput,
  CloseAndOpenNextLeavePeriodInput,
  CreateLeaveBalanceAdjustmentInput,
  CreateLeavePeriodInput,
  EmployeeLeaveBalanceListQuery,
  EmployeeLeaveBalanceTransactionListQuery,
  EmployeeLeaveTypeBalanceQuery,
  InitializeEmployeeLeaveBalanceInput,
  LeaveBalanceListQuery,
  LeaveBalanceTransactionListQuery,
  LeavePeriodListQuery,
  RecalculateLeaveBalanceInput,
  UpdateLeavePeriodInput
} from "./leave-balance.schema.js";

import type {
  CloseAndOpenNextLeavePeriodRecord,
  CloseAndOpenNextLeavePeriodResponse,
  CreateLeaveBalanceAdjustmentRecord,
  CreateLeavePeriodRecord,
  EmployeeLeaveBalanceDatabaseRow,
  EmployeeLeaveBalanceResponse,
  InitializeEmployeeLeaveBalanceRecord,
  LeaveBalancePaginationResponse,
  LeaveBalanceRecalculationResponse,
  LeaveBalanceTransactionDatabaseRow,
  LeaveBalanceTransactionResponse,
  LeavePeriodDatabaseRow,
  LeavePeriodResponse,
  UpdateLeavePeriodRecord
} from "./leave-balance.types.js";

/*
 * =========================================================
 * Conversion helpers
 * =========================================================
 */

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
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate
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

  let parsedDate: Date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    parsedDate =
      new Date(
        `${value
          .slice(0, 19)
          .replace(" ", "T")}Z`
      );
  } else {
    parsedDate =
      new Date(value);
  }

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate.toISOString();
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

function currentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function currentDatabaseDateTime(): string {
  return new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): LeaveBalancePaginationResponse {
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
 * Authentication and permissions
 * =========================================================
 */

function getPermissions(
  auth: AuthContext
): string[] {
  const authWithPermissions =
    auth as AuthContext & {
      permissions?: string[];
    };

  return Array.isArray(
    authWithPermissions.permissions
  )
    ? authWithPermissions.permissions
    : [];
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  const normalizedPermission =
    permissionCode.trim().toLowerCase();
  const permissions = getPermissions(auth);
  const isTenantCompanyAdmin = Boolean(
    !auth.isPlatformAdmin &&
    auth.companyId &&
    (auth.roleCodes.some(
      (roleCode) =>
        roleCode.trim().toUpperCase() === "COMPANY_ADMIN"
    ) || permissions.some(
      (permission) =>
        permission.trim().toLowerCase() === "company_admin"
    ))
  );

  // edited by wali: Let Company Admins view and initialize balances within their tenant.
  return (
    auth.isPlatformAdmin ||
    permissions.includes(permissionCode) ||
    (isTenantCompanyAdmin &&
      (normalizedPermission.startsWith("leave.period.") ||
        ["leave.balance.view", "leave.balance.manage"].includes(normalizedPermission)))
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

function isOwnEmployee(
  auth: AuthContext,
  employeeId: string
): boolean {
  return (
    auth.employeeId !== null &&
    auth.employeeId !== undefined &&
    String(
      auth.employeeId
    ) === employeeId
  );
}

function assertCompanyAccess(
  auth: AuthContext,
  companyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    String(
      auth.companyId
    ) !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's leave balances",

      statusCode: 403,

      code:
        "LEAVE_BALANCE_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertLeavePeriodViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.period.view"
    ) ||
    hasPermission(
      auth,
      "leave.period.manage"
    ) ||
    hasPermission(
      auth,
      "leave.balance.view"
    ) ||
    hasPermission(
      auth,
      "leave.balance.manage"
    ) ||
    hasPermission(
      auth,
      "leave.view"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view leave periods",

    statusCode: 403,

    code:
      "LEAVE_PERIOD_VIEW_DENIED"
  });
}

function assertLeavePeriodManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.period.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage leave periods",

    statusCode: 403,

    code:
      "LEAVE_PERIOD_MANAGE_DENIED"
  });
}

function assertLeavePeriodCloseAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.period.close"
    ) ||
    hasPermission(
      auth,
      "leave.period.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to close leave periods",

    statusCode: 403,

    code:
      "LEAVE_PERIOD_CLOSE_DENIED"
  });
}

function assertLeaveBalanceViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.balance.view"
    ) ||
    hasPermission(
      auth,
      "leave.balance.manage"
    ) ||
    hasPermission(
      auth,
      "leave.balance.adjust"
    ) ||
    hasPermission(
      auth,
      "leave.view"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view leave balances",

    statusCode: 403,

    code:
      "LEAVE_BALANCE_VIEW_DENIED"
  });
}

function assertEmployeeLeaveBalanceViewAccess(
  auth: AuthContext,
  employeeId: string
): void {
  if (
    isOwnEmployee(
      auth,
      employeeId
    )
  ) {
    return;
  }

  assertLeaveBalanceViewAccess(
    auth
  );
}

function assertLeaveBalanceManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.balance.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage leave balances",

    statusCode: 403,

    code:
      "LEAVE_BALANCE_MANAGE_DENIED"
  });
}

function assertLeaveBalanceAdjustmentAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.balance.adjust"
    ) ||
    hasPermission(
      auth,
      "leave.balance.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to adjust leave balances",

    statusCode: 403,

    code:
      "LEAVE_BALANCE_ADJUSTMENT_DENIED"
  });
}

/*
 * =========================================================
 * Employee helpers
 * =========================================================
 */

async function getEmployeeOrThrow(
  employeeId: string
): Promise<AttendanceEmployeeDatabaseRow> {
  const employee =
    await findAttendanceEmployeeById(
      employeeId
    );

  if (!employee) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  return employee;
}

function assertEmployeeCompany(
  auth: AuthContext,
  employee:
    AttendanceEmployeeDatabaseRow
): void {
  assertCompanyAccess(
    auth,
    String(
      employee.company_id
    )
  );
}

function assertEmployeeActive(
  employee:
    AttendanceEmployeeDatabaseRow
): void {
  const row =
    employee as
      AttendanceEmployeeDatabaseRow & {
        is_active?:
          | number
          | boolean;
      };

  if (
    row.is_active !== undefined &&
    !databaseBoolean(
      row.is_active
    )
  ) {
    throw new AppError({
      message:
        "Employee is inactive",

      statusCode: 409,

      code:
        "EMPLOYEE_INACTIVE"
    });
  }
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapLeavePeriod(
  row:
    LeavePeriodDatabaseRow
): LeavePeriodResponse {
  return {
    leavePeriodId:
      String(
        row.leave_period_id
      ),

    companyId:
      String(
        row.company_id
      ),

    periodCode:
      row.period_code,

    periodName:
      row.period_name,

    startDate:
      requiredDateOnly(
        row.start_date
      ),

    endDate:
      requiredDateOnly(
        row.end_date
      ),

    periodStatus:
      row.period_status,

    isOpen:
      row.period_status ===
      "OPEN",

    closedByUserId:
      nullableId(
        row.closed_by_user_id
      ),

    closedAt:
      dateTimeIso(
        row.closed_at
      ),

    balanceCount:
      numericValue(
        row.balance_count
      ),

    transactionCount:
      numericValue(
        row.transaction_count
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

function mapLeaveBalance(
  row:
    EmployeeLeaveBalanceDatabaseRow
): EmployeeLeaveBalanceResponse {
  const difference =
    numericValue(
      row.balance_difference
    );

  return {
    leaveBalanceId:
      String(
        row.leave_balance_id
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

    unitType:
      row.unit_type,

    leaveTypeIsPaid:
      databaseBoolean(
        row.leave_type_is_paid
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

    openingBalance:
      numericValue(
        row.opening_balance
      ),

    accruedUnits:
      numericValue(
        row.accrued_units
      ),

    carriedForwardUnits:
      numericValue(
        row.carried_forward_units
      ),

    adjustedUnits:
      numericValue(
        row.adjusted_units
      ),

    usedUnits:
      numericValue(
        row.used_units
      ),

    pendingUnits:
      numericValue(
        row.pending_units
      ),

    encashedUnits:
      numericValue(
        row.encashed_units
      ),

    expiredUnits:
      numericValue(
        row.expired_units
      ),

    availableBalance:
      numericValue(
        row.available_balance
      ),

    computedAvailableBalance:
      numericValue(
        row.computed_available_balance
      ),

    balanceDifference:
      difference,

    isConsistent:
      Math.abs(
        difference
      ) <= 0.005,

    transactionCount:
      numericValue(
        row.transaction_count
      ),

    lastAccrualDate:
      dateOnly(
        row.last_accrual_date
      ),

    lastCalculatedAt:
      dateTimeIso(
        row.last_calculated_at
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

function mapLeaveBalanceTransaction(
  row:
    LeaveBalanceTransactionDatabaseRow
): LeaveBalanceTransactionResponse {
  return {
    transactionId:
      String(
        row.transaction_id
      ),

    leaveBalanceId:
      String(
        row.leave_balance_id
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

    unitType:
      row.unit_type,

    leavePeriodId:
      String(
        row.leave_period_id
      ),

    periodCode:
      row.period_code,

    periodName:
      row.period_name,

    transactionDate:
      requiredDateOnly(
        row.transaction_date
      ),

    transactionType:
      row.transaction_type,

    unitsChanged:
      numericValue(
        row.units_changed
      ),

    balanceBefore:
      nullableNumber(
        row.balance_before
      ),

    balanceAfter:
      nullableNumber(
        row.balance_after
      ),

    referenceType:
      row.reference_type,

    referenceId:
      nullableId(
        row.reference_id
      ),

    remarks:
      row.remarks,

    createdByUserId:
      nullableId(
        row.created_by_user_id
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      )
  };
}

/*
 * =========================================================
 * Repository-error translation
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

  const errors:
    Record<
      string,
      {
        message: string;
        statusCode: number;
      }
    > = {
      EMPLOYEE_NOT_FOUND: {
        message:
          "Employee was not found",
        statusCode: 404
      },

      EMPLOYEE_INACTIVE: {
        message:
          "Employee is inactive",
        statusCode: 409
      },

      LEAVE_TYPE_NOT_FOUND: {
        message:
          "Leave type was not found",
        statusCode: 404
      },

      LEAVE_TYPE_INACTIVE: {
        message:
          "Leave type is inactive",
        statusCode: 409
      },

      LEAVE_PERIOD_NOT_FOUND: {
        message:
          "Leave period was not found",
        statusCode: 404
      },

      LEAVE_PERIOD_CLOSED: {
        message:
          "The leave period is closed",
        statusCode: 409
      },

      LEAVE_PERIOD_DATE_OVERLAP: {
        message:
          "The leave-period dates overlap another leave period",
        statusCode: 409
      },

      INVALID_LEAVE_PERIOD_DATE: {
        message:
          "The leave-period date is invalid",
        statusCode: 422
      },

      INVALID_LEAVE_PERIOD_DATES: {
        message:
          "Leave-period end date cannot be before its start date",
        statusCode: 422
      },

      CLOSED_LEAVE_PERIOD_CANNOT_BE_UPDATED: {
        message:
          "A closed leave period cannot be updated",
        statusCode: 409
      },

      LEAVE_PERIOD_DATES_CONFLICT_WITH_EXISTING_RECORDS: {
        message:
          "The new leave-period dates conflict with existing balances or transactions",
        statusCode: 409
      },

      NO_LEAVE_PERIOD_UPDATE_FIELDS: {
        message:
          "At least one leave-period field is required",
        statusCode: 422
      },

      LEAVE_PERIOD_ALREADY_CLOSED: {
        message:
          "The leave period is already closed",
        statusCode: 409
      },

      LEAVE_PERIOD_ALREADY_OPEN: {
        message:
          "The leave period is already open",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_INCONSISTENT_BALANCES: {
        message:
          "The leave period contains inconsistent balances and cannot be closed",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_PENDING_REQUESTS: {
        message:
          "The leave period has draft or pending leave requests",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_PENDING_BALANCE_UNITS: {
        message:
          "The leave period has reserved leave units that must be resolved before closing",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_ACTIVE_PROCESSING_RUNS: {
        message:
          "The leave period has an accrual or carry-forward run that is still draft or processing",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_DUE_EXPIRIES: {
        message:
          "The leave period has due balance expiries that must be processed before closing",
        statusCode: 409
      },

      LEAVE_PERIOD_HAS_UNPROCESSED_BALANCES: {
        message:
          "The leave period still has non-zero balances; use close-and-open-next after carry-forward processing",
        statusCode: 409
      },

      TARGET_LEAVE_PERIOD_NOT_FOUND: {
        message:
          "The target leave period was not found",
        statusCode: 404
      },

      TARGET_LEAVE_PERIOD_NOT_OPEN: {
        message:
          "The target leave period must be open",
        statusCode: 409
      },

      SOURCE_AND_TARGET_PERIOD_CANNOT_MATCH: {
        message:
          "Source and target leave periods cannot be the same",
        statusCode: 422
      },

      TARGET_PERIOD_MUST_FOLLOW_SOURCE_PERIOD: {
        message:
          "The target leave period must start after the source period",
        statusCode: 422
      },

      PERIOD_CLOSE_BEFORE_SOURCE_PERIOD_END: {
        message:
          "The leave period cannot be closed before its end date",
        statusCode: 409
      },

      COMPLETED_CARRY_FORWARD_RUN_REQUIRED: {
        message:
          "A completed non-dry-run carry-forward is required before this leave period can be closed",
        statusCode: 409
      },

      CARRY_FORWARD_RUN_NOT_READY_FOR_PERIOD_CLOSE: {
        message:
          "The selected carry-forward run is not completed or does not match the source and target periods",
        statusCode: 409
      },

      SOURCE_PERIOD_BALANCES_NOT_FINALIZED: {
        message:
          "The source period still contains non-zero balances after carry-forward processing",
        statusCode: 409
      },

      LEAVE_PERIOD_CLOSURE_VALIDATION_FAILED: {
        message:
          "The leave period closure validation could not be completed",
        statusCode: 500
      },

      CLOSED_AND_OPENED_PERIODS_NOT_FOUND: {
        message:
          "The periods were updated but could not be retrieved",
        statusCode: 500
      },

      LEAVE_PERIOD_HAS_REFERENCES: {
        message:
          "The leave period cannot be deleted because it has balance or transaction records",
        statusCode: 409
      },

      TRANSACTION_DATE_OUTSIDE_LEAVE_PERIOD: {
        message:
          "The transaction date is outside the selected leave period",
        statusCode: 422
      },

      LAST_ACCRUAL_DATE_OUTSIDE_LEAVE_PERIOD: {
        message:
          "The last-accrual date is outside the selected leave period",
        statusCode: 422
      },

      LEAVE_BALANCE_ALREADY_EXISTS: {
        message:
          "A balance already exists for this employee, leave type, and leave period",
        statusCode: 409
      },

      LEAVE_BALANCE_NOT_FOUND: {
        message:
          "Leave balance was not found",
        statusCode: 404
      },

      LEAVE_BALANCE_MAXIMUM_EXCEEDED: {
        message:
          "The resulting leave balance exceeds the policy maximum",
        statusCode: 422
      },

      NEGATIVE_LEAVE_BALANCE_NOT_ALLOWED: {
        message:
          "The applicable policy does not allow a negative leave balance",
        statusCode: 422
      },

      NEGATIVE_LEAVE_BALANCE_LIMIT_EXCEEDED: {
        message:
          "The resulting leave balance exceeds the allowed negative-balance limit",
        statusCode: 422
      },

      CREATED_LEAVE_PERIOD_NOT_FOUND: {
        message:
          "The leave period was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_LEAVE_PERIOD_NOT_FOUND: {
        message:
          "The leave period was updated but could not be retrieved",
        statusCode: 500
      },

      CLOSED_LEAVE_PERIOD_NOT_FOUND: {
        message:
          "The leave period was closed but could not be retrieved",
        statusCode: 500
      },

      REOPENED_LEAVE_PERIOD_NOT_FOUND: {
        message:
          "The leave period was reopened but could not be retrieved",
        statusCode: 500
      },

      INITIALIZED_LEAVE_BALANCE_NOT_FOUND: {
        message:
          "The leave balance was initialized but could not be retrieved",
        statusCode: 500
      },

      ADJUSTED_LEAVE_BALANCE_NOT_FOUND: {
        message:
          "The leave balance was adjusted but could not be retrieved",
        statusCode: 500
      },

      RECALCULATED_LEAVE_BALANCE_NOT_FOUND: {
        message:
          "The leave balance was recalculated but could not be retrieved",
        statusCode: 500
      }
    };

  const mapped =
    errors[code];

  if (mapped) {
    throw new AppError({
      message:
        mapped.message,

      statusCode:
        mapped.statusCode,

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
    databaseError.errno === 1062
  ) {
    throw new AppError({
      message:
        "A duplicate leave-period or leave-balance record already exists",

      statusCode: 409,

      code:
        "LEAVE_BALANCE_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced employee, leave type, leave period, company, or user was not found",

      statusCode: 409,

      code:
        "LEAVE_BALANCE_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Leave periods
 * =========================================================
 */

export async function listLeavePeriods(
  query: LeavePeriodListQuery,
  auth: AuthContext
) {
  assertLeavePeriodViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeavePeriodRecords(
      companyId,
      {
        ...(query.periodStatus !== undefined
          ? {
              periodStatus:
                query.periodStatus
            }
          : {}),

        ...(query.effectiveOn !== undefined
          ? {
              effectiveOn:
                query.effectiveOn
            }
          : {}),

        ...(query.dateFrom !== undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !== undefined
          ? {
              dateTo:
                query.dateTo
            }
          : {}),

        ...(query.search !== undefined
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
    leavePeriods:
      result.records.map(
        mapLeavePeriod
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeavePeriod(
  leavePeriodId: string,
  auth: AuthContext
) {
  assertLeavePeriodViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const period =
    await findLeavePeriodRecordById(
      companyId,
      leavePeriodId
    );

  if (!period) {
    throw new AppError({
      message:
        "Leave period was not found",

      statusCode: 404,

      code:
        "LEAVE_PERIOD_NOT_FOUND"
    });
  }

  return mapLeavePeriod(
    period
  );
}

export async function createLeavePeriod(
  input: CreateLeavePeriodInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeavePeriodManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const isClosed =
    input.periodStatus ===
    "CLOSED";

  const record:
    CreateLeavePeriodRecord = {
      companyId,

      periodCode:
        input.periodCode,

      periodName:
        input.periodName,

      startDate:
        input.startDate,

      endDate:
        input.endDate,

      periodStatus:
        input.periodStatus,

      closedByUserId:
        isClosed
          ? String(
              auth.userId
            )
          : null,

      closedAt:
        isClosed
          ? currentDatabaseDateTime()
          : null
    };

  try {
    const created =
      await createLeavePeriodRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeavePeriod(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeavePeriod(
  leavePeriodId: string,
  input: UpdateLeavePeriodInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeavePeriodManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeavePeriodRecordById(
      companyId,
      leavePeriodId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave period was not found",

      statusCode: 404,

      code:
        "LEAVE_PERIOD_NOT_FOUND"
    });
  }

  const finalStartDate =
    input.startDate ??
    requiredDateOnly(
      existing.start_date
    );

  const finalEndDate =
    input.endDate ??
    requiredDateOnly(
      existing.end_date
    );

  if (
    finalEndDate <
    finalStartDate
  ) {
    throw new AppError({
      message:
        "Leave-period end date cannot be before its start date",

      statusCode: 422,

      code:
        "INVALID_LEAVE_PERIOD_DATES"
    });
  }

  const record:
    UpdateLeavePeriodRecord = {
      ...(input.periodCode !== undefined
        ? {
            periodCode:
              input.periodCode
          }
        : {}),

      ...(input.periodName !== undefined
        ? {
            periodName:
              input.periodName
          }
        : {}),

      ...(input.startDate !== undefined
        ? {
            startDate:
              input.startDate
          }
        : {}),

      ...(input.endDate !== undefined
        ? {
            endDate:
              input.endDate
          }
        : {})
    };

  try {
    const updated =
      await updateLeavePeriodRecord(
        companyId,
        leavePeriodId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave period was not found",

        statusCode: 404,

        code:
          "LEAVE_PERIOD_NOT_FOUND"
      });
    }

    return mapLeavePeriod(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function closeLeavePeriod(
  leavePeriodId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeavePeriodManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const closed =
      await closeLeavePeriodRecord(
        companyId,
        leavePeriodId,
        createActor(auth),
        metadata
      );

    if (!closed) {
      throw new AppError({
        message:
          "Leave period was not found",

        statusCode: 404,

        code:
          "LEAVE_PERIOD_NOT_FOUND"
      });
    }

    return mapLeavePeriod(
      closed
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}


export async function closeAndOpenNextLeavePeriod(
  leavePeriodId:
    string,
  input:
    CloseAndOpenNextLeavePeriodInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
): Promise<
  CloseAndOpenNextLeavePeriodResponse
> {
  assertLeavePeriodCloseAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const record:
    CloseAndOpenNextLeavePeriodRecord = {
      companyId,

      sourcePeriodId:
        leavePeriodId,

      targetPeriodId:
        input.targetPeriodId,

      processingDate:
        input.processingDate ??
        currentDateOnly(),

      carryForwardRunId:
        input.carryForwardRunId ??
        null,

      closedByUserId:
        String(
          auth.userId
        )
    };

  try {
    const result =
      await closeAndOpenNextLeavePeriodRecord(
        record,
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message:
          "Leave period was not found",

        statusCode: 404,

        code:
          "LEAVE_PERIOD_NOT_FOUND"
      });
    }

    return {
      sourcePeriod:
        mapLeavePeriod(
          result.sourcePeriod
        ),

      targetPeriod:
        mapLeavePeriod(
          result.targetPeriod
        ),

      carryForwardRunId:
        result.carryForwardRunId,

      processingDate:
        result.processingDate,

      carriedUnits:
        result.carriedUnits,

      expiredUnits:
        result.expiredUnits,

      sourceBalanceCount:
        result.sourceBalanceCount,

      targetBalanceCount:
        result.targetBalanceCount
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function reopenLeavePeriod(
  leavePeriodId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeavePeriodManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const reopened =
      await reopenLeavePeriodRecord(
        companyId,
        leavePeriodId,
        createActor(auth),
        metadata
      );

    if (!reopened) {
      throw new AppError({
        message:
          "Leave period was not found",

        statusCode: 404,

        code:
          "LEAVE_PERIOD_NOT_FOUND"
      });
    }

    return mapLeavePeriod(
      reopened
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteLeavePeriod(
  leavePeriodId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeavePeriodManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await deleteLeavePeriodRecord(
        companyId,
        leavePeriodId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Leave period was not found",

        statusCode: 404,

        code:
          "LEAVE_PERIOD_NOT_FOUND"
      });
    }

    return mapLeavePeriod(
      deleted
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Company leave balances
 * =========================================================
 */

export async function listLeaveBalances(
  query: LeaveBalanceListQuery,
  auth: AuthContext
) {
  assertLeaveBalanceViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveBalanceRecords(
      companyId,
      {
        ...(query.employeeId !== undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.leaveTypeId !== undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.periodStatus !== undefined
          ? {
              periodStatus:
                query.periodStatus
            }
          : {}),

        ...(query.availableBalanceMin !== undefined
          ? {
              availableBalanceMin:
                query.availableBalanceMin
            }
          : {}),

        ...(query.availableBalanceMax !== undefined
          ? {
              availableBalanceMax:
                query.availableBalanceMax
            }
          : {}),

        includeZeroBalance:
          query.includeZeroBalance,

        onlyInconsistent:
          query.onlyInconsistent,

        ...(query.search !== undefined
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
    balances:
      result.records.map(
        mapLeaveBalance
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveBalance(
  leaveBalanceId: string,
  auth: AuthContext
) {
  assertLeaveBalanceViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const balance =
    await findLeaveBalanceRecordById(
      companyId,
      leaveBalanceId
    );

  if (!balance) {
    throw new AppError({
      message:
        "Leave balance was not found",

      statusCode: 404,

      code:
        "LEAVE_BALANCE_NOT_FOUND"
    });
  }

  return mapLeaveBalance(
    balance
  );
}

/*
 * =========================================================
 * Employee leave balances
 * =========================================================
 */

export async function listEmployeeLeaveBalances(
  employeeId: string,
  query:
    EmployeeLeaveBalanceListQuery,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeLeaveBalanceViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listEmployeeLeaveBalanceRecords(
      companyId,
      employeeId,
      {
        ...(query.leaveTypeId !== undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.periodStatus !== undefined
          ? {
              periodStatus:
                query.periodStatus
            }
          : {}),

        ...(query.effectiveOn !== undefined
          ? {
              effectiveOn:
                query.effectiveOn
            }
          : {}),

        includeZeroBalance:
          query.includeZeroBalance,

        onlyInconsistent:
          query.onlyInconsistent,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    employeeId,
    companyId,

    balances:
      result.records.map(
        mapLeaveBalance
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getEmployeeLeaveTypeBalance(
  employeeId: string,
  leaveTypeId: string,
  query:
    EmployeeLeaveTypeBalanceQuery,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeLeaveBalanceViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const balance =
    await findEmployeeLeaveTypeBalanceRecord(
      companyId,
      employeeId,
      leaveTypeId,
      {
        ...(query.leavePeriodId !== undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.effectiveOn !== undefined
          ? {
              effectiveOn:
                query.effectiveOn
            }
          : {})
      }
    );

  if (!balance) {
    throw new AppError({
      message:
        "Employee leave balance was not found",

      statusCode: 404,

      code:
        "LEAVE_BALANCE_NOT_FOUND"
    });
  }

  return mapLeaveBalance(
    balance
  );
}

export async function initializeEmployeeLeaveBalance(
  employeeId: string,
  input:
    InitializeEmployeeLeaveBalanceInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeaveBalanceManageAccess(
    auth
  );

  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeActive(
    employee
  );

  const companyId =
    String(
      employee.company_id
    );

  const record:
    InitializeEmployeeLeaveBalanceRecord = {
      companyId,
      employeeId,

      leaveTypeId:
        input.leaveTypeId,

      leavePeriodId:
        input.leavePeriodId,

      openingBalance:
        input.openingBalance,

      accruedUnits:
        input.accruedUnits,

      carriedForwardUnits:
        input.carriedForwardUnits,

      adjustedUnits:
        input.adjustedUnits,

      lastAccrualDate:
        input.lastAccrualDate ??
        null,

      createdByUserId:
        String(
          auth.userId
        ),

      remarks:
        input.remarks ??
        null
    };

  try {
    const created =
      await initializeEmployeeLeaveBalanceRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveBalance(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function createEmployeeLeaveBalanceAdjustment(
  employeeId: string,
  input:
    CreateLeaveBalanceAdjustmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeaveBalanceAdjustmentAccess(
    auth
  );

  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeActive(
    employee
  );

  const companyId =
    String(
      employee.company_id
    );

  const record:
    CreateLeaveBalanceAdjustmentRecord = {
      companyId,
      employeeId,

      leaveTypeId:
        input.leaveTypeId,

      leavePeriodId:
        input.leavePeriodId,

      adjustmentDirection:
        input.adjustmentDirection,

      units:
        input.units,

      transactionDate:
        input.transactionDate ??
        currentDateOnly(),

      referenceType:
        input.referenceType ??
        null,

      referenceId:
        input.referenceId ??
        null,

      remarks:
        input.remarks,

      createdByUserId:
        String(
          auth.userId
        )
    };

  try {
    const result =
      await createLeaveBalanceAdjustmentRecord(
        record,
        createActor(auth),
        metadata
      );

    return {
      transactionId:
        result.transactionId,

      balance:
        mapLeaveBalance(
          result.balance
        )
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Transactions
 * =========================================================
 */

export async function listLeaveBalanceTransactions(
  query:
    LeaveBalanceTransactionListQuery,
  auth: AuthContext
) {
  assertLeaveBalanceViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveBalanceTransactionRecords(
      companyId,
      {
        ...(query.leaveBalanceId !== undefined
          ? {
              leaveBalanceId:
                query.leaveBalanceId
            }
          : {}),

        ...(query.employeeId !== undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.leaveTypeId !== undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.transactionType !== undefined
          ? {
              transactionType:
                query.transactionType
            }
          : {}),

        ...(query.referenceType !== undefined
          ? {
              referenceType:
                query.referenceType
            }
          : {}),

        ...(query.referenceId !== undefined
          ? {
              referenceId:
                query.referenceId
            }
          : {}),

        ...(query.createdByUserId !== undefined
          ? {
              createdByUserId:
                query.createdByUserId
            }
          : {}),

        ...(query.dateFrom !== undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !== undefined
          ? {
              dateTo:
                query.dateTo
            }
          : {}),

        ...(query.search !== undefined
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
    transactions:
      result.records.map(
        mapLeaveBalanceTransaction
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listEmployeeLeaveBalanceTransactions(
  employeeId: string,
  query:
    EmployeeLeaveBalanceTransactionListQuery,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeLeaveBalanceViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listEmployeeLeaveBalanceTransactionRecords(
      companyId,
      employeeId,
      {
        ...(query.leaveBalanceId !== undefined
          ? {
              leaveBalanceId:
                query.leaveBalanceId
            }
          : {}),

        ...(query.leaveTypeId !== undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? {
              leavePeriodId:
                query.leavePeriodId
            }
          : {}),

        ...(query.transactionType !== undefined
          ? {
              transactionType:
                query.transactionType
            }
          : {}),

        ...(query.referenceType !== undefined
          ? {
              referenceType:
                query.referenceType
            }
          : {}),

        ...(query.referenceId !== undefined
          ? {
              referenceId:
                query.referenceId
            }
          : {}),

        ...(query.dateFrom !== undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !== undefined
          ? {
              dateTo:
                query.dateTo
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    employeeId,
    companyId,

    transactions:
      result.records.map(
        mapLeaveBalanceTransaction
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

/*
 * =========================================================
 * Balance recalculation
 * =========================================================
 */

function mapRecalculationResult(
  result: {
    leaveBalanceId: string;
    previousAvailableBalance: number;
    recalculatedAvailableBalance: number;
    difference: number;
    repaired: boolean;
    balance:
      EmployeeLeaveBalanceDatabaseRow;
  }
): LeaveBalanceRecalculationResponse {
  return {
    leaveBalanceId:
      result.leaveBalanceId,

    previousAvailableBalance:
      result.previousAvailableBalance,

    recalculatedAvailableBalance:
      result.recalculatedAvailableBalance,

    difference:
      result.difference,

    repaired:
      result.repaired,

    balance:
      mapLeaveBalance(
        result.balance
      )
  };
}

export async function recalculateLeaveBalance(
  leaveBalanceId: string,
  input:
    RecalculateLeaveBalanceInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<LeaveBalanceRecalculationResponse> {
  assertLeaveBalanceManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const result =
      await recalculateLeaveBalanceRecord(
        companyId,
        leaveBalanceId,
        input.repair,
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message:
          "Leave balance was not found",

        statusCode: 404,

        code:
          "LEAVE_BALANCE_NOT_FOUND"
      });
    }

    return mapRecalculationResult(
      result
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function bulkRecalculateLeaveBalances(
  input:
    BulkRecalculateLeaveBalancesInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertLeaveBalanceManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const results =
      await bulkRecalculateLeaveBalanceRecords(
        companyId,
        {
          ...(input.employeeId !== undefined
            ? {
                employeeId:
                  input.employeeId
              }
            : {}),

          ...(input.leaveTypeId !== undefined
            ? {
                leaveTypeId:
                  input.leaveTypeId
              }
            : {}),

          ...(input.leavePeriodId !== undefined
            ? {
                leavePeriodId:
                  input.leavePeriodId
              }
            : {}),

          onlyInconsistent:
            input.onlyInconsistent,

          repair:
            input.repair
        },
        createActor(auth),
        metadata
      );

    return {
      processedCount:
        results.length,

      repairedCount:
        results.filter(
          (
            result
          ) => result.repaired
        ).length,

      inconsistentCount:
        results.filter(
          (
            result
          ) =>
            Math.abs(
              result.difference
            ) > 0.005
        ).length,

      results:
        results.map(
          mapRecalculationResult
        )
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

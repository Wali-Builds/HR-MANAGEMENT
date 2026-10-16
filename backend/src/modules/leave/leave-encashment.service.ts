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
  approveLeaveEncashmentRequestRecord,
  cancelLeaveEncashmentRequestRecord,
  createLeaveEncashmentRequestRecord,
  findLeaveEncashmentRequestRecordById,
  listEmployeeLeaveEncashmentRequestRecords,
  listLeaveEncashmentRequestRecords,
  processLeaveEncashmentRequestRecord,
  rejectLeaveEncashmentRequestRecord
} from "./leave-encashment.repository.js";

import type {
  ApproveLeaveEncashmentRequestInput,
  CancelLeaveEncashmentRequestInput,
  CreateLeaveEncashmentRequestInput,
  EmployeeLeaveEncashmentRequestListQuery,
  LeaveEncashmentRequestListQuery,
  ProcessLeaveEncashmentRequestInput,
  RejectLeaveEncashmentRequestInput
} from "./leave-encashment.schema.js";

import type {
  LeaveEncashmentPaginationResponse,
  LeaveEncashmentRequestDatabaseRow,
  LeaveEncashmentRequestResponse,
  LeaveEncashmentRequestStatus
} from "./leave-encashment.types.js";

/*
 * =========================================================
 * Mapping helpers
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
): LeaveEncashmentPaginationResponse {
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

function mapEncashmentRequest(
  row:
    LeaveEncashmentRequestDatabaseRow
): LeaveEncashmentRequestResponse {
  return {
    encashmentRequestId:
      String(
        row.encashment_request_id
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

    requestNumber:
      row.request_number,

    requestedUnits:
      numericValue(
        row.requested_units
      ),

    approvedUnits:
      nullableNumber(
        row.approved_units
      ),

    ratePerUnit:
      nullableNumber(
        row.rate_per_unit
      ),

    grossAmount:
      nullableNumber(
        row.gross_amount
      ),

    requestStatus:
      row.request_status as
        LeaveEncashmentRequestStatus,

    reason:
      row.reason,

    requestedByUserId:
      nullableId(
        row.requested_by_user_id
      ),

    requestedByUsername:
      row.requested_by_username,

    approvedByUserId:
      nullableId(
        row.approved_by_user_id
      ),

    approvedByUsername:
      row.approved_by_username,

    approvedAt:
      dateTimeIso(
        row.approved_at
      ),

    approvalRemarks:
      row.approval_remarks,

    payrollReference:
      row.payroll_reference,

    processedAt:
      dateTimeIso(
        row.processed_at
      ),

    leaveBalanceId:
      nullableId(
        row.leave_balance_id
      ),

    currentAvailableBalance:
      nullableNumber(
        row.current_available_balance
      ),

    balanceTransactionId:
      nullableId(
        row.balance_transaction_id
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

/*
 * =========================================================
 * Auth and permissions
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
        "You cannot access another company's leave encashment requests",

      statusCode: 403,

      code:
        "LEAVE_ENCASHMENT_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.encashment.view"
    ) ||
    hasPermission(
      auth,
      "leave.encashment.manage"
    ) ||
    hasPermission(
      auth,
      "leave.encashment.approve"
    ) ||
    hasPermission(
      auth,
      "leave.encashment.process"
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
      "You do not have permission to view leave encashment requests",

    statusCode: 403,

    code:
      "LEAVE_ENCASHMENT_VIEW_DENIED"
  });
}

function assertRequestViewAccess(
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

  assertViewAccess(
    auth
  );
}

function assertCreateAccess(
  auth: AuthContext,
  employeeId: string
): void {
  if (
    isOwnEmployee(
      auth,
      employeeId
    ) ||
    hasPermission(
      auth,
      "leave.encashment.manage"
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
      "You do not have permission to create this leave encashment request",

    statusCode: 403,

    code:
      "LEAVE_ENCASHMENT_CREATE_DENIED"
  });
}

function assertApproveAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.encashment.approve"
    ) ||
    hasPermission(
      auth,
      "leave.encashment.manage"
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
      "You do not have permission to approve or reject leave encashment requests",

    statusCode: 403,

    code:
      "LEAVE_ENCASHMENT_APPROVE_DENIED"
  });
}

function assertCancelAccess(
  auth: AuthContext,
  employeeId: string
): void {
  if (
    isOwnEmployee(
      auth,
      employeeId
    ) ||
    hasPermission(
      auth,
      "leave.encashment.manage"
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
      "You do not have permission to cancel this leave encashment request",

    statusCode: 403,

    code:
      "LEAVE_ENCASHMENT_CANCEL_DENIED"
  });
}

function assertProcessAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.encashment.process"
    ) ||
    hasPermission(
      auth,
      "leave.encashment.manage"
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
      "You do not have permission to process leave encashment payments",

    statusCode: 403,

    code:
      "LEAVE_ENCASHMENT_PROCESS_DENIED"
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

/*
 * =========================================================
 * Error translation
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

      INVALID_LEAVE_PERIOD_DATE: {
        message:
          "The leave-period date is invalid",
        statusCode: 422
      },

      LEAVE_BALANCE_NOT_FOUND: {
        message:
          "A leave balance was not found for the selected employee, leave type, and period",
        statusCode: 404
      },

      APPLICABLE_LEAVE_POLICY_RULE_NOT_FOUND: {
        message:
          "No active leave-policy rule applies to this employee and leave type",
        statusCode: 409
      },

      LEAVE_ENCASHMENT_NOT_ALLOWED: {
        message:
          "The applicable leave policy does not allow encashment",
        statusCode: 422
      },

      MAXIMUM_ENCASHMENT_UNITS_EXCEEDED: {
        message:
          "The request exceeds the maximum encashment units allowed for this leave period",
        statusCode: 422
      },

      INSUFFICIENT_LEAVE_BALANCE: {
        message:
          "The employee does not have sufficient available leave balance",
        statusCode: 422
      },

      PENDING_ENCASHMENT_REQUEST_EXISTS: {
        message:
          "A pending encashment request already exists for this employee, leave type, and period",
        statusCode: 409
      },

      ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_APPROVED: {
        message:
          "Only a pending encashment request can be approved",
        statusCode: 409
      },

      ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_REJECTED: {
        message:
          "Only a pending encashment request can be rejected",
        statusCode: 409
      },

      ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_CANCELLED: {
        message:
          "Only a pending encashment request can be cancelled",
        statusCode: 409
      },

      ONLY_APPROVED_ENCASHMENT_REQUEST_CAN_BE_PROCESSED: {
        message:
          "Only an approved encashment request can be marked as payroll processed",
        statusCode: 409
      },

      APPROVED_UNITS_EXCEED_REQUESTED_UNITS: {
        message:
          "Approved units cannot exceed requested units",
        statusCode: 422
      },

      ENCASHMENT_GROSS_AMOUNT_EXCEEDS_LIMIT: {
        message:
          "The calculated gross amount exceeds the database limit",
        statusCode: 422
      },

      ENCASHMENT_BALANCE_TRANSACTION_ALREADY_EXISTS: {
        message:
          "This encashment request has already deducted leave balance",
        statusCode: 409
      },

      CREATED_ENCASHMENT_REQUEST_NOT_FOUND: {
        message:
          "The encashment request was created but could not be retrieved",
        statusCode: 500
      },

      APPROVED_ENCASHMENT_REQUEST_NOT_FOUND: {
        message:
          "The encashment request was approved but could not be retrieved",
        statusCode: 500
      },

      REJECTED_ENCASHMENT_REQUEST_NOT_FOUND: {
        message:
          "The encashment request was rejected but could not be retrieved",
        statusCode: 500
      },

      CANCELLED_ENCASHMENT_REQUEST_NOT_FOUND: {
        message:
          "The encashment request was cancelled but could not be retrieved",
        statusCode: 500
      },

      PROCESSED_ENCASHMENT_REQUEST_NOT_FOUND: {
        message:
          "The encashment request was processed but could not be retrieved",
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
    databaseError.errno ===
      1062
  ) {
    throw new AppError({
      message:
        "A duplicate leave encashment request or request number already exists",

      statusCode: 409,

      code:
        "LEAVE_ENCASHMENT_DUPLICATE"
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
        "A referenced employee, leave type, leave period, company, balance, or user was not found",

      statusCode: 409,

      code:
        "LEAVE_ENCASHMENT_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Company and employee lists
 * =========================================================
 */

export async function listLeaveEncashmentRequests(
  query:
    LeaveEncashmentRequestListQuery,
  auth:
    AuthContext
) {
  assertViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  const result =
    await listLeaveEncashmentRequestRecords(
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

        ...(query.requestStatus !==
        undefined
          ? {
              requestStatus:
                query.requestStatus
            }
          : {}),

        ...(query.dateFrom !==
        undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !==
        undefined
          ? {
              dateTo:
                query.dateTo
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
    encashmentRequests:
      result.records.map(
        mapEncashmentRequest
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listEmployeeLeaveEncashmentRequests(
  employeeId: string,
  query:
    EmployeeLeaveEncashmentRequestListQuery,
  auth:
    AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertRequestViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listEmployeeLeaveEncashmentRequestRecords(
      companyId,
      employeeId,
      {
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

        ...(query.requestStatus !==
        undefined
          ? {
              requestStatus:
                query.requestStatus
            }
          : {}),

        ...(query.dateFrom !==
        undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !==
        undefined
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

    encashmentRequests:
      result.records.map(
        mapEncashmentRequest
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
 * Lookup and creation
 * =========================================================
 */

export async function getLeaveEncashmentRequest(
  encashmentRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(
      auth
    );

  const request =
    await findLeaveEncashmentRequestRecordById(
      companyId,
      encashmentRequestId
    );

  if (!request) {
    throw new AppError({
      message:
        "Leave encashment request was not found",

      statusCode: 404,

      code:
        "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
    });
  }

  assertRequestViewAccess(
    auth,
    String(
      request.employee_id
    )
  );

  return mapEncashmentRequest(
    request
  );
}

export async function createEmployeeLeaveEncashmentRequest(
  employeeId: string,
  input:
    CreateLeaveEncashmentRequestInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertCreateAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  try {
    const created =
      await createLeaveEncashmentRequestRecord(
        {
          companyId,
          employeeId,

          leaveTypeId:
            input.leaveTypeId,

          leavePeriodId:
            input.leavePeriodId,

          requestedUnits:
            input.requestedUnits,

          reason:
            input.reason ??
            null,

          requestedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    return mapEncashmentRequest(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Approval lifecycle
 * =========================================================
 */

export async function approveLeaveEncashmentRequest(
  encashmentRequestId: string,
  input:
    ApproveLeaveEncashmentRequestInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertApproveAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const result =
      await approveLeaveEncashmentRequestRecord(
        companyId,
        encashmentRequestId,
        {
          approvedUnits:
            input.approvedUnits,

          ratePerUnit:
            input.ratePerUnit,

          approvalRemarks:
            input.approvalRemarks ??
            null,

          approvedByUserId:
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
          "Leave encashment request was not found",

        statusCode: 404,

        code:
          "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapEncashmentRequest(
          result.request
        ),

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionId:
        result.balanceTransactionId,

      balanceBefore:
        result.balanceBefore,

      balanceAfter:
        result.balanceAfter,

      carryForwardUnitsConsumed:
        result.carryForwardUnitsConsumed
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function rejectLeaveEncashmentRequest(
  encashmentRequestId: string,
  input:
    RejectLeaveEncashmentRequestInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertApproveAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const rejected =
      await rejectLeaveEncashmentRequestRecord(
        companyId,
        encashmentRequestId,
        {
          approvalRemarks:
            input.approvalRemarks,

          rejectedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!rejected) {
      throw new AppError({
        message:
          "Leave encashment request was not found",

        statusCode: 404,

        code:
          "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
      });
    }

    return mapEncashmentRequest(
      rejected
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function cancelLeaveEncashmentRequest(
  encashmentRequestId: string,
  input:
    CancelLeaveEncashmentRequestInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  const companyId =
    requireCompanyId(
      auth
    );

  const existing =
    await findLeaveEncashmentRequestRecordById(
      companyId,
      encashmentRequestId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave encashment request was not found",

      statusCode: 404,

      code:
        "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
    });
  }

  assertCancelAccess(
    auth,
    String(
      existing.employee_id
    )
  );

  try {
    const cancelled =
      await cancelLeaveEncashmentRequestRecord(
        companyId,
        encashmentRequestId,
        {
          cancellationReason:
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
          "Leave encashment request was not found",

        statusCode: 404,

        code:
          "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
      });
    }

    return mapEncashmentRequest(
      cancelled
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function processLeaveEncashmentRequest(
  encashmentRequestId: string,
  input:
    ProcessLeaveEncashmentRequestInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertProcessAccess(
    auth
  );

  const companyId =
    requireCompanyId(
      auth
    );

  try {
    const processed =
      await processLeaveEncashmentRequestRecord(
        companyId,
        encashmentRequestId,
        {
          payrollReference:
            input.payrollReference,

          processedByUserId:
            String(
              auth.userId
            )
        },
        createActor(auth),
        metadata
      );

    if (!processed) {
      throw new AppError({
        message:
          "Leave encashment request was not found",

        statusCode: 404,

        code:
          "LEAVE_ENCASHMENT_REQUEST_NOT_FOUND"
      });
    }

    return mapEncashmentRequest(
      processed
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

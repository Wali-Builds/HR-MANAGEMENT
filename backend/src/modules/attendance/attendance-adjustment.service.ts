import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById,
  findAttendanceRecordByEmployeeDate,
  findAttendanceRecordById,
  findAttendanceStatusByCode
} from "./attendance.repository.js";

import {
  cancelAttendanceAdjustmentRequestRecord,
  createAttendanceAdjustmentRequestRecord,
  decideAttendanceAdjustmentRequestRecord,
  findAttendanceAdjustmentRequestRecord,
  listAttendanceAdjustmentApprovalRecords,
  listAttendanceAdjustmentRequestRecords,
  listEmployeeAttendanceAdjustmentRequestRecords,
  updateAttendanceAdjustmentRequestRecord
} from "./attendance-adjustment.repository.js";

import type {
  ApproveAttendanceAdjustmentInput,
  AttendanceAdjustmentRequestListQuery,
  CancelAttendanceAdjustmentInput,
  CreateAttendanceAdjustmentRequestInput,
  EmployeeAttendanceAdjustmentListQuery,
  RejectAttendanceAdjustmentInput,
  UpdateAttendanceAdjustmentRequestInput
} from "./attendance-adjustment.schema.js";

import type {
  AttendanceAdjustmentApprovalDatabaseRow,
  AttendanceAdjustmentApprovalResponse,
  AttendanceAdjustmentDecisionRecord,
  AttendanceAdjustmentPagination,
  AttendanceAdjustmentRequestDatabaseRow,
  AttendanceAdjustmentRequestResponse,
  CreateAttendanceAdjustmentRequestRecord,
  UpdateAttendanceAdjustmentRequestRecord
} from "./attendance-adjustment.types.js";

import type {
  AttendanceActor,
  AttendanceEmployeeDatabaseRow,
  RequestMetadata
} from "./attendance.types.js";

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
): string | null {
  return value === null
    ? null
    : String(value);
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

  return new Date(value)
    .toISOString()
    .slice(0, 10);
}

function requiredDateOnly(
  value: Date | string
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

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    return new Date(
      `${value
        .slice(0, 19)
        .replace(" ", "T")}Z`
    ).toISOString();
  }

  return new Date(
    value
  ).toISOString();
}

function requiredDateTimeIso(
  value: Date | string
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
): AttendanceAdjustmentPagination {
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

function sameDateTime(
  first:
    | Date
    | string
    | null,

  second:
    | Date
    | string
    | null
): boolean {
  const firstValue =
    dateTimeIso(first);

  const secondValue =
    dateTimeIso(second);

  return firstValue === secondValue;
}

/*
 * =========================================================
 * Authentication and permissions
 * =========================================================
 */

function getPermissions(
  auth: AuthContext
): string[] {
  const value =
    auth as AuthContext & {
      permissions?: string[];
    };

  return Array.isArray(
    value.permissions
  )
    ? value.permissions
    : [];
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  return (
    auth.isPlatformAdmin ||
    getPermissions(
      auth
    ).includes(
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

  return auth.companyId;
}

function createActor(
  auth: AuthContext
): AttendanceActor {
  return {
    userId:
      auth.userId,

    employeeId:
      auth.employeeId,

    companyId:
      auth.companyId,

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
    auth.employeeId === employeeId
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
    auth.companyId !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's attendance adjustments",

      statusCode: 403,

      code:
        "ATTENDANCE_ADJUSTMENT_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertAdjustmentViewAccess(
  auth: AuthContext,
  employeeId?: string
): void {
  if (
    employeeId &&
    isOwnEmployee(
      auth,
      employeeId
    )
  ) {
    return;
  }

  if (
    hasPermission(
      auth,
      "attendance.adjustment.view"
    ) ||
    hasPermission(
      auth,
      "attendance.adjustment.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.adjustment.approve"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view attendance-adjustment requests",

    statusCode: 403,

    code:
      "ATTENDANCE_ADJUSTMENT_VIEW_DENIED"
  });
}

function assertAdjustmentCreateAccess(
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

  if (
    hasPermission(
      auth,
      "attendance.adjustment.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You cannot create an attendance adjustment for this employee",

    statusCode: 403,

    code:
      "ATTENDANCE_ADJUSTMENT_CREATE_DENIED"
  });
}

function assertAdjustmentApprovalAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.adjustment.approve"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to approve or reject attendance adjustments",

    statusCode: 403,

    code:
      "ATTENDANCE_ADJUSTMENT_APPROVAL_DENIED"
  });
}

function assertRequestUpdateAccess(
  auth: AuthContext,
  request:
    AttendanceAdjustmentRequestDatabaseRow
): void {
  const isRequester =
    request.requested_by_user_id !== null &&
    String(
      request.requested_by_user_id
    ) === auth.userId;

  if (
    isRequester ||
    hasPermission(
      auth,
      "attendance.adjustment.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "Only the requester or attendance manager may update this request",

    statusCode: 403,

    code:
      "ATTENDANCE_ADJUSTMENT_UPDATE_DENIED"
  });
}

function assertRequestCancelAccess(
  auth: AuthContext,
  request:
    AttendanceAdjustmentRequestDatabaseRow
): void {
  const isRequester =
    request.requested_by_user_id !== null &&
    String(
      request.requested_by_user_id
    ) === auth.userId;

  const employeeId =
    String(
      request.employee_id
    );

  if (
    isRequester ||
    isOwnEmployee(
      auth,
      employeeId
    ) ||
    hasPermission(
      auth,
      "attendance.adjustment.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You cannot cancel this attendance-adjustment request",

    statusCode: 403,

    code:
      "ATTENDANCE_ADJUSTMENT_CANCEL_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapAdjustmentRequest(
  row:
    AttendanceAdjustmentRequestDatabaseRow
): AttendanceAdjustmentRequestResponse {
  return {
    adjustmentRequestId:
      String(
        row.adjustment_request_id
      ),

    companyId:
      String(row.company_id),

    employeeId:
      String(row.employee_id),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    attendanceId:
      nullableId(
        row.attendance_id
      ),

    attendanceDate:
      requiredDateOnly(
        row.attendance_date
      ),

    adjustmentType:
      row.adjustment_type,

    currentCheckInAt:
      dateTimeIso(
        row.current_check_in_at
      ),

    currentCheckOutAt:
      dateTimeIso(
        row.current_check_out_at
      ),

    currentStatusCode:
      row.current_status_code,

    currentStatusName:
      row.current_status_name,

    requestedCheckInAt:
      dateTimeIso(
        row.requested_check_in_at
      ),

    requestedCheckOutAt:
      dateTimeIso(
        row.requested_check_out_at
      ),

    requestedStatusCode:
      row.requested_status_code,

    requestedStatusName:
      row.requested_status_name,

    reason:
      row.reason,

    attachmentPath:
      row.attachment_path,

    requestStatus:
      row.request_status,

    requestedByUserId:
      nullableId(
        row.requested_by_user_id
      ),

    requestedByUsername:
      row.requested_by_username,

    requestedByFullName:
      row.requested_by_full_name,

    finalDecisionBy:
      nullableId(
        row.final_decision_by
      ),

    finalDecisionUsername:
      row.final_decision_username,

    finalDecisionFullName:
      row.final_decision_full_name,

    finalDecisionAt:
      dateTimeIso(
        row.final_decision_at
      ),

    finalRemarks:
      row.final_remarks,

    approvalCount:
      Number(
        row.approval_count
      ),

    pendingApprovalCount:
      Number(
        row.pending_approval_count
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

function mapApproval(
  row:
    AttendanceAdjustmentApprovalDatabaseRow
): AttendanceAdjustmentApprovalResponse {
  return {
    approvalId:
      String(row.approval_id),

    adjustmentRequestId:
      String(
        row.adjustment_request_id
      ),

    approvalLevel:
      Number(
        row.approval_level
      ),

    approverUserId:
      String(
        row.approver_user_id
      ),

    approverUsername:
      row.approver_username,

    approverFullName:
      row.approver_full_name,

    decision:
      row.decision,

    comments:
      row.comments,

    decidedAt:
      dateTimeIso(
        row.decided_at
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
 * Shared validation
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

async function validateRequestedStatus(
  statusCode:
    | string
    | null
    | undefined
): Promise<void> {
  if (
    statusCode === null ||
    statusCode === undefined
  ) {
    return;
  }

  const status =
    await findAttendanceStatusByCode(
      statusCode
    );

  if (
    !status ||
    !databaseBoolean(
      status.is_active
    )
  ) {
    throw new AppError({
      message:
        "Requested attendance status was not found or is inactive",

      statusCode: 422,

      code:
        "REQUESTED_ATTENDANCE_STATUS_NOT_FOUND"
    });
  }
}

function validateResultingTimes(
  currentCheckInAt:
    | Date
    | string
    | null,

  currentCheckOutAt:
    | Date
    | string
    | null,

  requestedCheckInAt:
    | string
    | null,

  requestedCheckOutAt:
    | string
    | null
): void {
  const resultingCheckIn =
    requestedCheckInAt ??
    dateTimeIso(
      currentCheckInAt
    );

  const resultingCheckOut =
    requestedCheckOutAt ??
    dateTimeIso(
      currentCheckOutAt
    );

  if (
    resultingCheckIn &&
    resultingCheckOut &&
    Date.parse(
      resultingCheckOut
    ) <
      Date.parse(
        resultingCheckIn
      )
  ) {
    throw new AppError({
      message:
        "Requested check-out cannot be before the resulting check-in",

      statusCode: 422,

      code:
        "INVALID_ATTENDANCE_ADJUSTMENT_CHECK_OUT"
    });
  }
}

function hasActualChange(
  current: {
    checkInAt:
      | Date
      | string
      | null;

    checkOutAt:
      | Date
      | string
      | null;

    statusCode:
      string | null;
  },
  requested: {
    checkInAt:
      | string
      | null;

    checkOutAt:
      | string
      | null;

    statusCode:
      string | null;
  }
): boolean {
  const checkInChanged =
    requested.checkInAt !== null &&
    !sameDateTime(
      current.checkInAt,
      requested.checkInAt
    );

  const checkOutChanged =
    requested.checkOutAt !== null &&
    !sameDateTime(
      current.checkOutAt,
      requested.checkOutAt
    );

  const statusChanged =
    requested.statusCode !== null &&
    requested.statusCode !==
      current.statusCode;

  return (
    checkInChanged ||
    checkOutChanged ||
    statusChanged
  );
}

async function getRequestOrThrow(
  companyId: string,
  adjustmentRequestId: string
): Promise<AttendanceAdjustmentRequestDatabaseRow> {
  const request =
    await findAttendanceAdjustmentRequestRecord(
      companyId,
      adjustmentRequestId
    );

  if (!request) {
    throw new AppError({
      message:
        "Attendance-adjustment request was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_ADJUSTMENT_NOT_FOUND"
    });
  }

  return request;
}

/*
 * =========================================================
 * Repository error translation
 * =========================================================
 */

function translateRepositoryError(
  error: unknown
): never {
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

      ATTENDANCE_RECORD_NOT_FOUND: {
        message:
          "Attendance record was not found",
        statusCode: 404
      },

      ATTENDANCE_ADJUSTMENT_NOT_FOUND: {
        message:
          "Attendance-adjustment request was not found",
        statusCode: 404
      },

      ATTENDANCE_ADJUSTMENT_EMPLOYEE_MISMATCH: {
        message:
          "Attendance record does not belong to the selected employee",
        statusCode: 409
      },

      ATTENDANCE_ADJUSTMENT_DATE_MISMATCH: {
        message:
          "Attendance record date does not match the adjustment date",
        statusCode: 409
      },

      PENDING_ATTENDANCE_ADJUSTMENT_EXISTS: {
        message:
          "A pending attendance-adjustment request already exists for this employee and date",
        statusCode: 409
      },

      ATTENDANCE_ADJUSTMENT_NOT_PENDING: {
        message:
          "Only a pending adjustment request can be modified or decided",
        statusCode: 409
      },

      ATTENDANCE_ADJUSTMENT_SELF_APPROVAL_DENIED: {
        message:
          "The requester cannot approve or reject their own adjustment request",
        statusCode: 403
      },

      REQUESTED_ATTENDANCE_STATUS_NOT_FOUND: {
        message:
          "Requested attendance status was not found or is inactive",
        statusCode: 422
      },

      ATTENDANCE_ADJUSTMENT_STALE: {
        message:
          "The attendance record has changed since this request was created. Create a new adjustment request.",

        statusCode: 409
      },

      ATTENDANCE_ADJUSTMENT_RECORD_MISMATCH: {
        message:
          "The linked attendance record no longer matches the adjustment request",

        statusCode: 409
      },

      ATTENDANCE_ADJUSTMENT_HAS_NO_CHANGES: {
        message:
          "The adjustment request does not contain any applicable change",

        statusCode: 422
      },

      INVALID_ATTENDANCE_ADJUSTMENT_CHECK_OUT: {
        message:
          "Requested check-out cannot be before the resulting check-in",

        statusCode: 422
      },

      NO_ATTENDANCE_ADJUSTMENT_UPDATE_FIELDS: {
        message:
          "At least one adjustment field is required",

        statusCode: 422
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
        "This approval or adjustment record already exists",

      statusCode: 409,

      code:
        "ATTENDANCE_ADJUSTMENT_DUPLICATE"
    });
  }

  throw error;
}

/*
 * =========================================================
 * List and get requests
 * =========================================================
 */

export async function listAttendanceAdjustmentRequests(
  query:
    AttendanceAdjustmentRequestListQuery,
  auth: AuthContext
) {
  assertAdjustmentViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listAttendanceAdjustmentRequestRecords(
      companyId,
      {
        ...(query.employeeId !== undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.attendanceId !== undefined
          ? {
              attendanceId:
                query.attendanceId
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

        ...(query.requestStatus !== undefined
          ? {
              requestStatus:
                query.requestStatus
            }
          : {}),

        ...(query.adjustmentType !== undefined
          ? {
              adjustmentType:
                query.adjustmentType
            }
          : {}),

        ...(query.requestedByUserId !== undefined
          ? {
              requestedByUserId:
                query.requestedByUserId
            }
          : {}),

        ...(query.finalDecisionBy !== undefined
          ? {
              finalDecisionBy:
                query.finalDecisionBy
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
    adjustmentRequests:
      result.records.map(
        mapAdjustmentRequest
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listEmployeeAttendanceAdjustments(
  employeeId: string,
  query:
    EmployeeAttendanceAdjustmentListQuery,
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

  assertAdjustmentViewAccess(
    auth,
    employeeId
  );

  const result =
    await listEmployeeAttendanceAdjustmentRequestRecords(
      String(
        employee.company_id
      ),
      employeeId,
      {
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

        ...(query.requestStatus !== undefined
          ? {
              requestStatus:
                query.requestStatus
            }
          : {}),

        ...(query.adjustmentType !== undefined
          ? {
              adjustmentType:
                query.adjustmentType
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    adjustmentRequests:
      result.records.map(
        mapAdjustmentRequest
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getAttendanceAdjustmentRequest(
  adjustmentRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await getRequestOrThrow(
      companyId,
      adjustmentRequestId
    );

  assertAdjustmentViewAccess(
    auth,
    String(
      request.employee_id
    )
  );

  return mapAdjustmentRequest(
    request
  );
}

export async function listAttendanceAdjustmentApprovals(
  adjustmentRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await getRequestOrThrow(
      companyId,
      adjustmentRequestId
    );

  assertAdjustmentViewAccess(
    auth,
    String(
      request.employee_id
    )
  );

  const approvals =
    await listAttendanceAdjustmentApprovalRecords(
      companyId,
      adjustmentRequestId
    );

  return approvals.map(
    mapApproval
  );
}

/*
 * =========================================================
 * Create and update
 * =========================================================
 */

export async function createAttendanceAdjustmentRequest(
  input:
    CreateAttendanceAdjustmentRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const employee =
    await getEmployeeOrThrow(
      input.employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertAdjustmentCreateAccess(
    auth,
    input.employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  let attendance =
    input.attendanceId
      ? await findAttendanceRecordById(
          companyId,
          input.attendanceId
        )
      : await findAttendanceRecordByEmployeeDate(
          companyId,
          input.employeeId,
          input.attendanceDate
        );

  if (
    input.attendanceId &&
    !attendance
  ) {
    throw new AppError({
      message:
        "Attendance record was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_RECORD_NOT_FOUND"
    });
  }

  if (attendance) {
    if (
      String(
        attendance.employee_id
      ) !== input.employeeId
    ) {
      throw new AppError({
        message:
          "Attendance record does not belong to the selected employee",

        statusCode: 409,

        code:
          "ATTENDANCE_ADJUSTMENT_EMPLOYEE_MISMATCH"
      });
    }

    if (
      requiredDateOnly(
        attendance.attendance_date
      ) !== input.attendanceDate
    ) {
      throw new AppError({
        message:
          "Attendance record date does not match the adjustment date",

        statusCode: 409,

        code:
          "ATTENDANCE_ADJUSTMENT_DATE_MISMATCH"
      });
    }
  }

  await validateRequestedStatus(
    input.requestedStatusCode
  );

  const requestedCheckInAt =
    input.requestedCheckInAt ??
    null;

  const requestedCheckOutAt =
    input.requestedCheckOutAt ??
    null;

  const requestedStatusCode =
    input.requestedStatusCode ??
    null;

  validateResultingTimes(
    attendance?.check_in_at ??
      null,

    attendance?.check_out_at ??
      null,

    requestedCheckInAt,
    requestedCheckOutAt
  );

  if (
    !hasActualChange(
      {
        checkInAt:
          attendance?.check_in_at ??
          null,

        checkOutAt:
          attendance?.check_out_at ??
          null,

        statusCode:
          attendance?.status_code ??
          null
      },
      {
        checkInAt:
          requestedCheckInAt,

        checkOutAt:
          requestedCheckOutAt,

        statusCode:
          requestedStatusCode
      }
    )
  ) {
    throw new AppError({
      message:
        "The requested values do not change the current attendance record",

      statusCode: 422,

      code:
        "ATTENDANCE_ADJUSTMENT_HAS_NO_CHANGES"
    });
  }

  const record:
    CreateAttendanceAdjustmentRequestRecord = {
      companyId,

      employeeId:
        input.employeeId,

      attendanceId:
        attendance
          ? String(
              attendance.attendance_id
            )
          : null,

      attendanceDate:
        input.attendanceDate,

      adjustmentType:
        input.adjustmentType,

      currentCheckInAt:
        dateTimeIso(
          attendance?.check_in_at ??
          null
        ),

      currentCheckOutAt:
        dateTimeIso(
          attendance?.check_out_at ??
          null
        ),

      currentStatusCode:
        attendance?.status_code ??
        null,

      requestedCheckInAt,
      requestedCheckOutAt,
      requestedStatusCode,

      reason:
        input.reason,

      attachmentPath:
        input.attachmentPath ??
        null,

      requestStatus:
        "PENDING",

      requestedByUserId:
        auth.userId
    };

  try {
    const created =
      await createAttendanceAdjustmentRequestRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAdjustmentRequest(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateAttendanceAdjustmentRequest(
  adjustmentRequestId: string,
  input:
    UpdateAttendanceAdjustmentRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await getRequestOrThrow(
      companyId,
      adjustmentRequestId
    );

  assertRequestUpdateAccess(
    auth,
    existing
  );

  await validateRequestedStatus(
    input.requestedStatusCode
  );

  const requestedCheckInAt =
    input.requestedCheckInAt !==
    undefined
      ? input.requestedCheckInAt
      : dateTimeIso(
          existing.requested_check_in_at
        );

  const requestedCheckOutAt =
    input.requestedCheckOutAt !==
    undefined
      ? input.requestedCheckOutAt
      : dateTimeIso(
          existing.requested_check_out_at
        );

  const requestedStatusCode =
    input.requestedStatusCode !==
    undefined
      ? input.requestedStatusCode
      : existing.requested_status_code;

  validateResultingTimes(
    existing.current_check_in_at,
    existing.current_check_out_at,
    requestedCheckInAt,
    requestedCheckOutAt
  );

  if (
    !hasActualChange(
      {
        checkInAt:
          existing.current_check_in_at,

        checkOutAt:
          existing.current_check_out_at,

        statusCode:
          existing.current_status_code
      },
      {
        checkInAt:
          requestedCheckInAt,

        checkOutAt:
          requestedCheckOutAt,

        statusCode:
          requestedStatusCode
      }
    )
  ) {
    throw new AppError({
      message:
        "The adjustment request does not contain an actual attendance change",

      statusCode: 422,

      code:
        "ATTENDANCE_ADJUSTMENT_HAS_NO_CHANGES"
    });
  }

  const record:
    UpdateAttendanceAdjustmentRequestRecord = {
      ...(input.adjustmentType !==
      undefined
        ? {
            adjustmentType:
              input.adjustmentType
          }
        : {}),

      ...(input.requestedCheckInAt !==
      undefined
        ? {
            requestedCheckInAt:
              input.requestedCheckInAt
          }
        : {}),

      ...(input.requestedCheckOutAt !==
      undefined
        ? {
            requestedCheckOutAt:
              input.requestedCheckOutAt
          }
        : {}),

      ...(input.requestedStatusCode !==
      undefined
        ? {
            requestedStatusCode:
              input.requestedStatusCode
          }
        : {}),

      ...(input.reason !== undefined
        ? {
            reason:
              input.reason
          }
        : {}),

      ...(input.attachmentPath !==
      undefined
        ? {
            attachmentPath:
              input.attachmentPath
          }
        : {})
    };

  try {
    const updated =
      await updateAttendanceAdjustmentRequestRecord(
        companyId,
        adjustmentRequestId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance-adjustment request was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      });
    }

    return mapAdjustmentRequest(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Cancel and decisions
 * =========================================================
 */

export async function cancelAttendanceAdjustmentRequest(
  adjustmentRequestId: string,
  input:
    CancelAttendanceAdjustmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await getRequestOrThrow(
      companyId,
      adjustmentRequestId
    );

  assertRequestCancelAccess(
    auth,
    existing
  );

  try {
    const cancelled =
      await cancelAttendanceAdjustmentRequestRecord(
        companyId,
        adjustmentRequestId,
        auth.userId,
        input.comments ??
          null,

        createActor(auth),
        metadata
      );

    if (!cancelled) {
      throw new AppError({
        message:
          "Attendance-adjustment request was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      });
    }

    return mapAdjustmentRequest(
      cancelled
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function approveAttendanceAdjustmentRequest(
  adjustmentRequestId: string,
  input:
    ApproveAttendanceAdjustmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAdjustmentApprovalAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const decision:
    AttendanceAdjustmentDecisionRecord = {
      adjustmentRequestId,

      approvalLevel:
        input.approvalLevel,

      approverUserId:
        auth.userId,

      decision:
        "APPROVED",

      comments:
        input.comments ??
        null,

      finalRemarks:
        input.finalRemarks ??
        null
    };

  try {
    const result =
      await decideAttendanceAdjustmentRequestRecord(
        companyId,
        decision,
        createActor(auth),
        metadata
      );

    return {
      adjustmentRequest:
        mapAdjustmentRequest(
          result.adjustmentRequest
        ),

      approval:
        mapApproval(
          result.approval
        ),

      attendanceId:
        result.attendanceId
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function rejectAttendanceAdjustmentRequest(
  adjustmentRequestId: string,
  input:
    RejectAttendanceAdjustmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAdjustmentApprovalAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const decision:
    AttendanceAdjustmentDecisionRecord = {
      adjustmentRequestId,

      approvalLevel:
        input.approvalLevel,

      approverUserId:
        auth.userId,

      decision:
        "REJECTED",

      comments:
        input.comments,

      finalRemarks:
        input.finalRemarks ??
        null
    };

  try {
    const result =
      await decideAttendanceAdjustmentRequestRecord(
        companyId,
        decision,
        createActor(auth),
        metadata
      );

    return {
      adjustmentRequest:
        mapAdjustmentRequest(
          result.adjustmentRequest
        ),

      approval:
        mapApproval(
          result.approval
        ),

      attendanceId:
        result.attendanceId
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}
import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById,
  findAttendanceRecordByEmployeeDate,
  findAttendanceRecordById
} from "./attendance.repository.js";

import {
  cancelOvertimeRequestRecord,
  createOvertimeRequestRecord,
  decideOvertimeRequestRecord,
  findOvertimeRequestRecord,
  listEmployeeOvertimeRequestRecords,
  listOvertimeRequestRecords,
  updateOvertimeRequestRecord
} from "./attendance-overtime.repository.js";

import type {
  ApproveOvertimeRequestInput,
  CancelOvertimeRequestInput,
  CreateOvertimeRequestInput,
  EmployeeOvertimeRequestListQuery,
  OvertimeRequestListQuery,
  RejectOvertimeRequestInput,
  UpdateOvertimeRequestInput
} from "./attendance-overtime.schema.js";

import type {
  CreateOvertimeRequestRecord,
  OvertimeDecisionRecord,
  OvertimePaginationResponse,
  OvertimeRequestDatabaseRow,
  OvertimeRequestResponse,
  UpdateOvertimeRequestRecord
} from "./attendance-overtime.types.js";

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

function databaseBooleanOrNull(
  value:
    | number
    | boolean
    | null
): boolean | null {
  if (value === null) {
    return null;
  }

  return (
    value === true ||
    Number(value) === 1
  );
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): OvertimePaginationResponse {
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

  return auth.companyId;
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
        "You cannot access another company's overtime records",

      statusCode: 403,

      code:
        "OVERTIME_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertOvertimeViewAccess(
  auth: AuthContext,
  employeeId?: string
): void {
  if (
    employeeId !== undefined &&
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
      "attendance.overtime.view"
    ) ||
    hasPermission(
      auth,
      "attendance.overtime.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.overtime.approve"
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
      "You do not have permission to view overtime requests",

    statusCode: 403,

    code:
      "OVERTIME_VIEW_DENIED"
  });
}

function assertOvertimeCreateAccess(
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
      "attendance.overtime.manage"
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
      "You cannot create an overtime request for this employee",

    statusCode: 403,

    code:
      "OVERTIME_CREATE_DENIED"
  });
}

function assertOvertimeApprovalAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.overtime.approve"
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
      "You do not have permission to approve or reject overtime requests",

    statusCode: 403,

    code:
      "OVERTIME_APPROVAL_DENIED"
  });
}

function assertOvertimeUpdateAccess(
  auth: AuthContext,
  request:
    OvertimeRequestDatabaseRow
): void {
  const isRequester =
    request.requested_by_user_id !==
      null &&
    String(
      request.requested_by_user_id
    ) === auth.userId;

  if (
    isRequester ||
    hasPermission(
      auth,
      "attendance.overtime.manage"
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
      "Only the requester or attendance manager may update this overtime request",

    statusCode: 403,

    code:
      "OVERTIME_UPDATE_DENIED"
  });
}

function assertOvertimeCancelAccess(
  auth: AuthContext,
  request:
    OvertimeRequestDatabaseRow
): void {
  const isRequester =
    request.requested_by_user_id !==
      null &&
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
      "attendance.overtime.manage"
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
      "You cannot cancel this overtime request",

    statusCode: 403,

    code:
      "OVERTIME_CANCEL_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapOvertimeRequest(
  row:
    OvertimeRequestDatabaseRow
): OvertimeRequestResponse {
  return {
    overtimeRequestId:
      String(
        row.overtime_request_id
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
      dateOnly(
        row.attendance_date
      ),

    overtimeDate:
      requiredDateOnly(
        row.overtime_date
      ),

    requestedStartAt:
      dateTimeIso(
        row.requested_start_at
      ),

    requestedEndAt:
      dateTimeIso(
        row.requested_end_at
      ),

    requestedMinutes:
      Number(
        row.requested_minutes
      ),

    approvedMinutes:
      row.approved_minutes ===
      null
        ? null
        : Number(
            row.approved_minutes
          ),

    reason:
      row.reason,

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

    approvedByUserId:
      nullableId(
        row.approved_by_user_id
      ),

    approvedByUsername:
      row.approved_by_username,

    approvedByFullName:
      row.approved_by_full_name,

    approvedAt:
      dateTimeIso(
        row.approved_at
      ),

    approvalRemarks:
      row.approval_remarks,

    attendanceOvertimeMinutes:
      row.attendance_overtime_minutes ===
      null
        ? null
        : Number(
            row.attendance_overtime_minutes
          ),

    attendanceIsFinalized:
      databaseBooleanOrNull(
        row.attendance_is_finalized
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
 * Employee and attendance validation
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
  const active =
    employee.is_active === true ||
    Number(
      employee.is_active
    ) === 1;

  if (!active) {
    throw new AppError({
      message:
        "Employee is inactive",

      statusCode: 409,

      code:
        "EMPLOYEE_INACTIVE"
    });
  }
}

async function resolveAttendanceRecord(
  companyId: string,
  employeeId: string,
  overtimeDate: string,
  attendanceId:
    | string
    | null
    | undefined
) {
  if (
    attendanceId !== undefined &&
    attendanceId !== null
  ) {
    const attendance =
      await findAttendanceRecordById(
        companyId,
        attendanceId
      );

    if (!attendance) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    if (
      String(
        attendance.employee_id
      ) !== employeeId
    ) {
      throw new AppError({
        message:
          "Attendance record does not belong to the selected employee",

        statusCode: 409,

        code:
          "OVERTIME_ATTENDANCE_EMPLOYEE_MISMATCH"
      });
    }

    if (
      requiredDateOnly(
        attendance.attendance_date
      ) !== overtimeDate
    ) {
      throw new AppError({
        message:
          "Attendance record date does not match the overtime date",

        statusCode: 409,

        code:
          "OVERTIME_ATTENDANCE_DATE_MISMATCH"
      });
    }

    return attendance;
  }

  return findAttendanceRecordByEmployeeDate(
    companyId,
    employeeId,
    overtimeDate
  );
}

function validateOvertimePeriod(
  requestedStartAt:
    | string
    | null,

  requestedEndAt:
    | string
    | null,

  requestedMinutes: number
): void {
  const hasStart =
    requestedStartAt !== null;

  const hasEnd =
    requestedEndAt !== null;

  if (hasStart !== hasEnd) {
    throw new AppError({
      message:
        "Requested overtime start and end must be provided together",

      statusCode: 422,

      code:
        "INVALID_OVERTIME_PERIOD"
    });
  }

  if (
    requestedStartAt === null ||
    requestedEndAt === null
  ) {
    return;
  }

  const startTime =
    Date.parse(
      requestedStartAt
    );

  const endTime =
    Date.parse(
      requestedEndAt
    );

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime <= startTime
  ) {
    throw new AppError({
      message:
        "Requested overtime end must be after its start",

      statusCode: 422,

      code:
        "INVALID_OVERTIME_PERIOD"
    });
  }

  const calculatedMinutes =
    Math.floor(
      (
        endTime -
        startTime
      ) / 60000
    );

  if (
    Math.abs(
      calculatedMinutes -
      requestedMinutes
    ) > 1
  ) {
    throw new AppError({
      message:
        "Requested minutes must match the overtime start and end period",

      statusCode: 422,

      code:
        "OVERTIME_MINUTES_PERIOD_MISMATCH"
    });
  }
}

async function getOvertimeRequestOrThrow(
  companyId: string,
  overtimeRequestId: string
): Promise<OvertimeRequestDatabaseRow> {
  const request =
    await findOvertimeRequestRecord(
      companyId,
      overtimeRequestId
    );

  if (!request) {
    throw new AppError({
      message:
        "Overtime request was not found",

      statusCode: 404,

      code:
        "OVERTIME_REQUEST_NOT_FOUND"
    });
  }

  return request;
}

function assertPendingRequest(
  request:
    OvertimeRequestDatabaseRow
): void {
  if (
    request.request_status !==
    "PENDING"
  ) {
    throw new AppError({
      message:
        "Only a pending overtime request can be modified or decided",

      statusCode: 409,

      code:
        "OVERTIME_REQUEST_NOT_PENDING"
    });
  }
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

      OVERTIME_REQUEST_NOT_FOUND: {
        message:
          "Overtime request was not found",
        statusCode: 404
      },

      OVERTIME_ATTENDANCE_EMPLOYEE_MISMATCH: {
        message:
          "Attendance record does not belong to the selected employee",
        statusCode: 409
      },

      OVERTIME_ATTENDANCE_DATE_MISMATCH: {
        message:
          "Attendance record date does not match the overtime date",
        statusCode: 409
      },

      PENDING_OVERTIME_REQUEST_EXISTS: {
        message:
          "A pending overtime request already exists for this employee and date",
        statusCode: 409
      },

      OVERTIME_REQUEST_NOT_PENDING: {
        message:
          "Only a pending overtime request can be modified or decided",
        statusCode: 409
      },

      OVERTIME_SELF_APPROVAL_DENIED: {
        message:
          "The requester cannot approve or reject their own overtime request",
        statusCode: 403
      },

      INVALID_APPROVED_OVERTIME_MINUTES: {
        message:
          "Approved overtime minutes must be greater than zero",
        statusCode: 422
      },

      APPROVED_OVERTIME_EXCEEDS_REQUESTED: {
        message:
          "Approved overtime minutes cannot exceed the requested minutes",
        statusCode: 422
      },

      INVALID_OVERTIME_DATE: {
        message:
          "The overtime date is invalid",
        statusCode: 422
      },

      INVALID_OVERTIME_DATETIME: {
        message:
          "The overtime datetime is invalid",
        statusCode: 422
      },

      NO_OVERTIME_UPDATE_FIELDS: {
        message:
          "At least one overtime field is required",
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
        "This overtime request already exists",

      statusCode: 409,

      code:
        "OVERTIME_REQUEST_DUPLICATE"
    });
  }

  throw error;
}

/*
 * =========================================================
 * List and get
 * =========================================================
 */

export async function listOvertimeRequests(
  query:
    OvertimeRequestListQuery,
  auth: AuthContext
) {
  assertOvertimeViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listOvertimeRequestRecords(
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

        ...(query.requestedByUserId !== undefined
          ? {
              requestedByUserId:
                query.requestedByUserId
            }
          : {}),

        ...(query.approvedByUserId !== undefined
          ? {
              approvedByUserId:
                query.approvedByUserId
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
    overtimeRequests:
      result.records.map(
        mapOvertimeRequest
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listEmployeeOvertimeRequests(
  employeeId: string,
  query:
    EmployeeOvertimeRequestListQuery,
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

  assertOvertimeViewAccess(
    auth,
    employeeId
  );

  const result =
    await listEmployeeOvertimeRequestRecords(
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

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    overtimeRequests:
      result.records.map(
        mapOvertimeRequest
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getOvertimeRequest(
  overtimeRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await getOvertimeRequestOrThrow(
      companyId,
      overtimeRequestId
    );

  assertOvertimeViewAccess(
    auth,
    String(
      request.employee_id
    )
  );

  return mapOvertimeRequest(
    request
  );
}

/*
 * =========================================================
 * Create
 * =========================================================
 */

export async function createOvertimeRequest(
  input:
    CreateOvertimeRequestInput,
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

  assertEmployeeActive(
    employee
  );

  assertOvertimeCreateAccess(
    auth,
    input.employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const attendance =
    await resolveAttendanceRecord(
      companyId,
      input.employeeId,
      input.overtimeDate,
      input.attendanceId
    );

  const requestedStartAt =
    input.requestedStartAt ??
    null;

  const requestedEndAt =
    input.requestedEndAt ??
    null;

  validateOvertimePeriod(
    requestedStartAt,
    requestedEndAt,
    input.requestedMinutes
  );

  const record:
    CreateOvertimeRequestRecord = {
      companyId,

      employeeId:
        input.employeeId,

      attendanceId:
        attendance
          ? String(
              attendance.attendance_id
            )
          : null,

      overtimeDate:
        input.overtimeDate,

      requestedStartAt,
      requestedEndAt,

      requestedMinutes:
        input.requestedMinutes,

      reason:
        input.reason,

      requestStatus:
        "PENDING",

      requestedByUserId:
        auth.userId
    };

  try {
    const created =
      await createOvertimeRequestRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapOvertimeRequest(
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
 * Update
 * =========================================================
 */

export async function updateOvertimeRequest(
  overtimeRequestId: string,
  input:
    UpdateOvertimeRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await getOvertimeRequestOrThrow(
      companyId,
      overtimeRequestId
    );

  assertPendingRequest(existing);

  assertOvertimeUpdateAccess(
    auth,
    existing
  );

  const finalOvertimeDate =
    input.overtimeDate ??
    requiredDateOnly(
      existing.overtime_date
    );

  const finalRequestedStartAt =
    input.requestedStartAt !==
    undefined
      ? input.requestedStartAt
      : dateTimeIso(
          existing.requested_start_at
        );

  const finalRequestedEndAt =
    input.requestedEndAt !==
    undefined
      ? input.requestedEndAt
      : dateTimeIso(
          existing.requested_end_at
        );

  const finalRequestedMinutes =
    input.requestedMinutes ??
    Number(
      existing.requested_minutes
    );

  validateOvertimePeriod(
    finalRequestedStartAt,
    finalRequestedEndAt,
    finalRequestedMinutes
  );

  let resolvedAttendanceId:
    string | null | undefined =
      undefined;

  if (
    input.attendanceId !==
      undefined ||
    input.overtimeDate !==
      undefined
  ) {
    const requestedAttendanceId =
      input.attendanceId !==
      undefined
        ? input.attendanceId
        : null;

    const attendance =
      await resolveAttendanceRecord(
        companyId,
        String(
          existing.employee_id
        ),
        finalOvertimeDate,
        requestedAttendanceId
      );

    resolvedAttendanceId =
      attendance
        ? String(
            attendance.attendance_id
          )
        : null;
  }

  const record:
    UpdateOvertimeRequestRecord = {
      ...(resolvedAttendanceId !==
      undefined
        ? {
            attendanceId:
              resolvedAttendanceId
          }
        : {}),

      ...(input.overtimeDate !==
      undefined
        ? {
            overtimeDate:
              input.overtimeDate
          }
        : {}),

      ...(input.requestedStartAt !==
      undefined
        ? {
            requestedStartAt:
              input.requestedStartAt
          }
        : {}),

      ...(input.requestedEndAt !==
      undefined
        ? {
            requestedEndAt:
              input.requestedEndAt
          }
        : {}),

      ...(input.requestedMinutes !==
      undefined
        ? {
            requestedMinutes:
              input.requestedMinutes
          }
        : {}),

      ...(input.reason !== undefined
        ? {
            reason:
              input.reason
          }
        : {})
    };

  try {
    const updated =
      await updateOvertimeRequestRecord(
        companyId,
        overtimeRequestId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Overtime request was not found",

        statusCode: 404,

        code:
          "OVERTIME_REQUEST_NOT_FOUND"
      });
    }

    return mapOvertimeRequest(
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
 * Cancel
 * =========================================================
 */

export async function cancelOvertimeRequest(
  overtimeRequestId: string,
  input:
    CancelOvertimeRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await getOvertimeRequestOrThrow(
      companyId,
      overtimeRequestId
    );

  assertPendingRequest(existing);

  assertOvertimeCancelAccess(
    auth,
    existing
  );

  try {
    const cancelled =
      await cancelOvertimeRequestRecord(
        companyId,
        overtimeRequestId,
        input.remarks ??
          null,

        createActor(auth),
        metadata
      );

    if (!cancelled) {
      throw new AppError({
        message:
          "Overtime request was not found",

        statusCode: 404,

        code:
          "OVERTIME_REQUEST_NOT_FOUND"
      });
    }

    return mapOvertimeRequest(
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
 * Approve and reject
 * =========================================================
 */

export async function approveOvertimeRequest(
  overtimeRequestId: string,
  input:
    ApproveOvertimeRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertOvertimeApprovalAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const existing =
    await getOvertimeRequestOrThrow(
      companyId,
      overtimeRequestId
    );

  assertPendingRequest(existing);

  const requestedMinutes =
    Number(
      existing.requested_minutes
    );

  const approvedMinutes =
    input.approvedMinutes ??
    requestedMinutes;

  if (
    approvedMinutes <= 0
  ) {
    throw new AppError({
      message:
        "Approved overtime minutes must be greater than zero",

      statusCode: 422,

      code:
        "INVALID_APPROVED_OVERTIME_MINUTES"
    });
  }

  if (
    approvedMinutes >
    requestedMinutes
  ) {
    throw new AppError({
      message:
        "Approved overtime minutes cannot exceed the requested minutes",

      statusCode: 422,

      code:
        "APPROVED_OVERTIME_EXCEEDS_REQUESTED"
    });
  }

  const decision:
    OvertimeDecisionRecord = {
      overtimeRequestId,

      decision:
        "APPROVED",

      approvedMinutes,

      approverUserId:
        auth.userId,

      approvalRemarks:
        input.approvalRemarks ??
        null
    };

  try {
    const result =
      await decideOvertimeRequestRecord(
        companyId,
        decision,
        createActor(auth),
        metadata
      );

    return {
      overtimeRequest:
        mapOvertimeRequest(
          result.overtimeRequest
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

export async function rejectOvertimeRequest(
  overtimeRequestId: string,
  input:
    RejectOvertimeRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertOvertimeApprovalAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const existing =
    await getOvertimeRequestOrThrow(
      companyId,
      overtimeRequestId
    );

  assertPendingRequest(existing);

  const decision:
    OvertimeDecisionRecord = {
      overtimeRequestId,

      decision:
        "REJECTED",

      approvedMinutes:
        null,

      approverUserId:
        auth.userId,

      approvalRemarks:
        input.approvalRemarks
    };

  try {
    const result =
      await decideOvertimeRequestRecord(
        companyId,
        decision,
        createActor(auth),
        metadata
      );

    return {
      overtimeRequest:
        mapOvertimeRequest(
          result.overtimeRequest
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
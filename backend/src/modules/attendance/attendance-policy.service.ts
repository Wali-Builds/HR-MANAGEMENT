import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById
} from "./attendance.repository.js";

import {
  createAttendancePolicyAssignmentManagementRecord,
  createAttendancePolicyManagementRecord,
  createAttendanceStatusManagementRecord,
  deleteAttendancePolicyAssignmentManagementRecord,
  findAttendancePolicyAssignmentManagementRecordById,
  findAttendancePolicyManagementRecordById,
  findAttendanceStatusManagementRecordByCode,
  findDefaultAttendancePolicyManagementRecord,
  findEffectiveAttendancePolicyAssignmentManagementRecord,
  listAttendancePolicyAssignmentManagementRecords,
  listAttendancePolicyManagementRecords,
  listAttendanceStatusManagementRecords,
  softDeleteAttendancePolicyManagementRecord,
  updateAttendancePolicyAssignmentManagementRecord,
  updateAttendancePolicyManagementRecord,
  updateAttendanceStatusManagementRecord
} from "./attendance-policy.repository.js";

import type {
  AttendancePolicyAssignmentListQuery,
  AttendancePolicyListQuery,
  AttendanceStatusListQuery,
  CreateAttendancePolicyAssignmentInput,
  CreateAttendancePolicyInput,
  CreateAttendanceStatusInput,
  EffectiveAttendancePolicyQuery,
  UpdateAttendancePolicyAssignmentInput,
  UpdateAttendancePolicyInput,
  UpdateAttendanceStatusInput
} from "./attendance-policy.schema.js";

import type {
  AttendancePolicyAssignmentDatabaseRow,
  AttendancePolicyAssignmentResponse,
  AttendancePolicyManagementDatabaseRow,
  AttendancePolicyPaginationResponse,
  AttendancePolicyResponse,
  AttendanceStatusManagementDatabaseRow,
  AttendanceStatusResponse,
  CreateAttendancePolicyAssignmentRecord,
  CreateAttendancePolicyRecord,
  CreateAttendanceStatusRecord,
  EffectiveAttendancePolicyResponse,
  UpdateAttendancePolicyAssignmentRecord,
  UpdateAttendancePolicyRecord,
  UpdateAttendanceStatusRecord
} from "./attendance-policy.types.js";

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

function currentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): AttendancePolicyPaginationResponse {
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
        "You cannot access another company's attendance policies",

      statusCode: 403,

      code:
        "ATTENDANCE_POLICY_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertPolicyViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.policy.view"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.assign"
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
      "You do not have permission to view attendance policies",

    statusCode: 403,

    code:
      "ATTENDANCE_POLICY_VIEW_DENIED"
  });
}

function assertPolicyManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.policy.manage"
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
      "You do not have permission to manage attendance policies",

    statusCode: 403,

    code:
      "ATTENDANCE_POLICY_MANAGE_DENIED"
  });
}

function assertStatusViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.status.view"
    ) ||
    hasPermission(
      auth,
      "attendance.status.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.view"
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
      "You do not have permission to view attendance statuses",

    statusCode: 403,

    code:
      "ATTENDANCE_STATUS_VIEW_DENIED"
  });
}

function assertStatusManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.status.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage global attendance statuses",

    statusCode: 403,

    code:
      "ATTENDANCE_STATUS_MANAGE_DENIED"
  });
}

function assertAssignmentViewAccess(
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
      "attendance.policy.view"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.assign"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.manage"
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
      "You do not have permission to view this employee's attendance-policy assignments",

    statusCode: 403,

    code:
      "ATTENDANCE_POLICY_ASSIGNMENT_VIEW_DENIED"
  });
}

function assertAssignmentManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.policy.assign"
    ) ||
    hasPermission(
      auth,
      "attendance.policy.manage"
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
      "You do not have permission to manage employee attendance-policy assignments",

    statusCode: 403,

    code:
      "ATTENDANCE_POLICY_ASSIGNMENT_MANAGE_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapAttendancePolicy(
  row:
    AttendancePolicyManagementDatabaseRow
): AttendancePolicyResponse {
  return {
    policyId:
      String(row.policy_id),

    companyId:
      String(row.company_id),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    description:
      row.description,

    lateGraceMinutes:
      Number(
        row.late_grace_minutes
      ),

    earlyDepartureGraceMinutes:
      Number(
        row
          .early_departure_grace_minutes
      ),

    minimumFullDayMinutes:
      Number(
        row.minimum_full_day_minutes
      ),

    minimumHalfDayMinutes:
      Number(
        row.minimum_half_day_minutes
      ),

    automaticAbsence:
      databaseBoolean(
        row.automatic_absence
      ),

    allowManualAttendance:
      databaseBoolean(
        row.allow_manual_attendance
      ),

    allowRemoteAttendance:
      databaseBoolean(
        row.allow_remote_attendance
      ),

    overtimeEnabled:
      databaseBoolean(
        row.overtime_enabled
      ),

    overtimeAfterMinutes:
      Number(
        row.overtime_after_minutes
      ),

    minimumOvertimeMinutes:
      Number(
        row.minimum_overtime_minutes
      ),

    maximumOvertimeMinutesDay:
      row.maximum_overtime_minutes_day ===
      null
        ? null
        : Number(
            row
              .maximum_overtime_minutes_day
          ),

    overtimeRequiresApproval:
      databaseBoolean(
        row.overtime_requires_approval
      ),

    deductBreakTime:
      databaseBoolean(
        row.deduct_break_time
      ),

    requireCheckout:
      databaseBoolean(
        row.require_checkout
      ),

    isDefault:
      databaseBoolean(
        row.is_default
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    assignmentCount:
      Number(
        row.assignment_count
      ),

    currentAssignmentCount:
      Number(
        row.current_assignment_count
      ),

    attendanceRecordCount:
      Number(
        row.attendance_record_count
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

function mapAttendanceStatus(
  row:
    AttendanceStatusManagementDatabaseRow
): AttendanceStatusResponse {
  return {
    statusCode:
      row.status_code,

    statusName:
      row.status_name,

    description:
      row.description,

    countsAsPresent:
      databaseBoolean(
        row.counts_as_present
      ),

    countsAsAbsent:
      databaseBoolean(
        row.counts_as_absent
      ),

    isPayable:
      databaseBoolean(
        row.is_payable
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    attendanceRecordCount:
      Number(
        row.attendance_record_count
      ),

    currentAdjustmentCount:
      Number(
        row.current_adjustment_count
      ),

    requestedAdjustmentCount:
      Number(
        row.requested_adjustment_count
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

function mapPolicyAssignment(
  row:
    AttendancePolicyAssignmentDatabaseRow
): AttendancePolicyAssignmentResponse {
  return {
    assignmentId:
      String(row.assignment_id),

    companyId:
      String(row.company_id),

    employeeId:
      String(row.employee_id),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    policyId:
      String(row.policy_id),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    policyIsDefault:
      databaseBoolean(
        row.policy_is_default
      ),

    policyIsActive:
      databaseBoolean(
        row.policy_is_active
      ),

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    isCurrent:
      databaseBoolean(
        row.is_current
      ),

    assignedByUserId:
      nullableId(
        row.assigned_by_user_id
      ),

    assignedByUsername:
      row.assigned_by_username,

    assignedByFullName:
      row.assigned_by_full_name,

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
  if (
    !databaseBoolean(
      employee.is_active
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
 * Configuration validation
 * =========================================================
 */

function validatePolicyConfiguration(
  input: {
    minimumFullDayMinutes: number;
    minimumHalfDayMinutes: number;

    minimumOvertimeMinutes: number;

    maximumOvertimeMinutesDay:
      | number
      | null;

    isDefault: boolean;
    isActive: boolean;
  }
): void {
  if (
    input.minimumHalfDayMinutes >
    input.minimumFullDayMinutes
  ) {
    throw new AppError({
      message:
        "Minimum half-day minutes cannot exceed minimum full-day minutes",

      statusCode: 422,

      code:
        "INVALID_ATTENDANCE_POLICY_DAY_THRESHOLDS"
    });
  }

  if (
    input.maximumOvertimeMinutesDay !==
      null &&
    input.maximumOvertimeMinutesDay <
      input.minimumOvertimeMinutes
  ) {
    throw new AppError({
      message:
        "Maximum daily overtime minutes cannot be less than minimum overtime minutes",

      statusCode: 422,

      code:
        "INVALID_ATTENDANCE_POLICY_OVERTIME_THRESHOLDS"
    });
  }

  if (
    input.isDefault &&
    !input.isActive
  ) {
    throw new AppError({
      message:
        "An inactive attendance policy cannot be the default policy",

      statusCode: 422,

      code:
        "INACTIVE_DEFAULT_ATTENDANCE_POLICY"
    });
  }
}

function validateStatusClassification(
  countsAsPresent: boolean,
  countsAsAbsent: boolean
): void {
  if (
    countsAsPresent &&
    countsAsAbsent
  ) {
    throw new AppError({
      message:
        "An attendance status cannot count as both present and absent",

      statusCode: 422,

      code:
        "INVALID_ATTENDANCE_STATUS_CLASSIFICATION"
    });
  }
}

function validateEffectiveDates(
  effectiveFrom: string,
  effectiveTo: string | null
): void {
  if (
    effectiveTo !== null &&
    effectiveTo < effectiveFrom
  ) {
    throw new AppError({
      message:
        "Effective-to cannot be before effective-from",

      statusCode: 422,

      code:
        "INVALID_ATTENDANCE_POLICY_ASSIGNMENT_DATES"
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

      EMPLOYEE_INACTIVE: {
        message:
          "Employee is inactive",
        statusCode: 409
      },

      ATTENDANCE_POLICY_NOT_FOUND: {
        message:
          "Attendance policy was not found",
        statusCode: 404
      },

      ATTENDANCE_POLICY_INACTIVE: {
        message:
          "The selected attendance policy is inactive",
        statusCode: 409
      },

      ATTENDANCE_POLICY_HAS_CURRENT_ASSIGNMENTS: {
        message:
          "The attendance policy cannot be deleted while it has current employee assignments",
        statusCode: 409
      },

      INACTIVE_DEFAULT_ATTENDANCE_POLICY: {
        message:
          "An inactive attendance policy cannot be the default policy",
        statusCode: 422
      },

      INVALID_ATTENDANCE_STATUS_CLASSIFICATION: {
        message:
          "An attendance status cannot count as both present and absent",
        statusCode: 422
      },

      ATTENDANCE_POLICY_ASSIGNMENT_DATE_OVERLAP: {
        message:
          "The attendance-policy assignment overlaps another assignment for this employee",
        statusCode: 409
      },

      ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND: {
        message:
          "Employee attendance-policy assignment was not found",
        statusCode: 404
      },

      INVALID_ATTENDANCE_POLICY_ASSIGNMENT_DATE: {
        message:
          "The attendance-policy assignment date is invalid",
        statusCode: 422
      },

      INVALID_ATTENDANCE_POLICY_ASSIGNMENT_DATES: {
        message:
          "Effective-to cannot be before effective-from",
        statusCode: 422
      },

      NO_ATTENDANCE_POLICY_UPDATE_FIELDS: {
        message:
          "At least one attendance-policy field is required",
        statusCode: 422
      },

      NO_ATTENDANCE_STATUS_UPDATE_FIELDS: {
        message:
          "At least one attendance-status field is required",
        statusCode: 422
      },

      NO_ATTENDANCE_POLICY_ASSIGNMENT_UPDATE_FIELDS: {
        message:
          "At least one policy-assignment field is required",
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
        "A policy or attendance status with the same unique values already exists",

      statusCode: 409,

      code:
        "ATTENDANCE_POLICY_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced attendance-policy record was not found",

      statusCode: 409,

      code:
        "ATTENDANCE_POLICY_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Attendance policies
 * =========================================================
 */

export async function listAttendancePolicies(
  query: AttendancePolicyListQuery,
  auth: AuthContext
) {
  assertPolicyViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listAttendancePolicyManagementRecords(
      companyId,
      {
        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        ...(query.isDefault !== undefined
          ? {
              isDefault:
                query.isDefault
            }
          : {}),

        includeInactive:
          query.includeInactive,

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
    attendancePolicies:
      result.records.map(
        mapAttendancePolicy
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getAttendancePolicy(
  policyId: string,
  auth: AuthContext
) {
  assertPolicyViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const policy =
    await findAttendancePolicyManagementRecordById(
      companyId,
      policyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Attendance policy was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_NOT_FOUND"
    });
  }

  return mapAttendancePolicy(
    policy
  );
}

export async function createAttendancePolicy(
  input: CreateAttendancePolicyInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertPolicyManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const maximumOvertimeMinutesDay =
    input.maximumOvertimeMinutesDay ??
    null;

  validatePolicyConfiguration({
    minimumFullDayMinutes:
      input.minimumFullDayMinutes,

    minimumHalfDayMinutes:
      input.minimumHalfDayMinutes,

    minimumOvertimeMinutes:
      input.minimumOvertimeMinutes,

    maximumOvertimeMinutesDay,

    isDefault:
      input.isDefault,

    isActive:
      input.isActive
  });

  const record:
    CreateAttendancePolicyRecord = {
      companyId,

      policyCode:
        input.policyCode,

      policyName:
        input.policyName,

      description:
        input.description ??
        null,

      lateGraceMinutes:
        input.lateGraceMinutes,

      earlyDepartureGraceMinutes:
        input.earlyDepartureGraceMinutes,

      minimumFullDayMinutes:
        input.minimumFullDayMinutes,

      minimumHalfDayMinutes:
        input.minimumHalfDayMinutes,

      automaticAbsence:
        input.automaticAbsence,

      allowManualAttendance:
        input.allowManualAttendance,

      allowRemoteAttendance:
        input.allowRemoteAttendance,

      overtimeEnabled:
        input.overtimeEnabled,

      overtimeAfterMinutes:
        input.overtimeAfterMinutes,

      minimumOvertimeMinutes:
        input.minimumOvertimeMinutes,

      maximumOvertimeMinutesDay,

      overtimeRequiresApproval:
        input.overtimeRequiresApproval,

      deductBreakTime:
        input.deductBreakTime,

      requireCheckout:
        input.requireCheckout,

      isDefault:
        input.isDefault,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createAttendancePolicyManagementRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAttendancePolicy(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateAttendancePolicy(
  policyId: string,
  input: UpdateAttendancePolicyInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertPolicyManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findAttendancePolicyManagementRecordById(
      companyId,
      policyId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Attendance policy was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_NOT_FOUND"
    });
  }

  validatePolicyConfiguration({
    minimumFullDayMinutes:
      input.minimumFullDayMinutes ??
      Number(
        existing.minimum_full_day_minutes
      ),

    minimumHalfDayMinutes:
      input.minimumHalfDayMinutes ??
      Number(
        existing.minimum_half_day_minutes
      ),

    minimumOvertimeMinutes:
      input.minimumOvertimeMinutes ??
      Number(
        existing.minimum_overtime_minutes
      ),

    maximumOvertimeMinutesDay:
      input.maximumOvertimeMinutesDay !==
      undefined
        ? input.maximumOvertimeMinutesDay
        : existing.maximum_overtime_minutes_day ===
          null
          ? null
          : Number(
              existing
                .maximum_overtime_minutes_day
            ),

    isDefault:
      input.isDefault ??
      databaseBoolean(
        existing.is_default
      ),

    isActive:
      input.isActive ??
      databaseBoolean(
        existing.is_active
      )
  });

  const record:
    UpdateAttendancePolicyRecord = {
      ...(input.policyCode !== undefined
        ? {
            policyCode:
              input.policyCode
          }
        : {}),

      ...(input.policyName !== undefined
        ? {
            policyName:
              input.policyName
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.lateGraceMinutes !==
      undefined
        ? {
            lateGraceMinutes:
              input.lateGraceMinutes
          }
        : {}),

      ...(input
        .earlyDepartureGraceMinutes !==
      undefined
        ? {
            earlyDepartureGraceMinutes:
              input
                .earlyDepartureGraceMinutes
          }
        : {}),

      ...(input.minimumFullDayMinutes !==
      undefined
        ? {
            minimumFullDayMinutes:
              input.minimumFullDayMinutes
          }
        : {}),

      ...(input.minimumHalfDayMinutes !==
      undefined
        ? {
            minimumHalfDayMinutes:
              input.minimumHalfDayMinutes
          }
        : {}),

      ...(input.automaticAbsence !==
      undefined
        ? {
            automaticAbsence:
              input.automaticAbsence
          }
        : {}),

      ...(input.allowManualAttendance !==
      undefined
        ? {
            allowManualAttendance:
              input.allowManualAttendance
          }
        : {}),

      ...(input.allowRemoteAttendance !==
      undefined
        ? {
            allowRemoteAttendance:
              input.allowRemoteAttendance
          }
        : {}),

      ...(input.overtimeEnabled !==
      undefined
        ? {
            overtimeEnabled:
              input.overtimeEnabled
          }
        : {}),

      ...(input.overtimeAfterMinutes !==
      undefined
        ? {
            overtimeAfterMinutes:
              input.overtimeAfterMinutes
          }
        : {}),

      ...(input.minimumOvertimeMinutes !==
      undefined
        ? {
            minimumOvertimeMinutes:
              input.minimumOvertimeMinutes
          }
        : {}),

      ...(input.maximumOvertimeMinutesDay !==
      undefined
        ? {
            maximumOvertimeMinutesDay:
              input.maximumOvertimeMinutesDay
          }
        : {}),

      ...(input.overtimeRequiresApproval !==
      undefined
        ? {
            overtimeRequiresApproval:
              input.overtimeRequiresApproval
          }
        : {}),

      ...(input.deductBreakTime !==
      undefined
        ? {
            deductBreakTime:
              input.deductBreakTime
          }
        : {}),

      ...(input.requireCheckout !==
      undefined
        ? {
            requireCheckout:
              input.requireCheckout
          }
        : {}),

      ...(input.isDefault !== undefined
        ? {
            isDefault:
              input.isDefault
          }
        : {}),

      ...(input.isActive !== undefined
        ? {
            isActive:
              input.isActive
          }
        : {})
    };

  try {
    const updated =
      await updateAttendancePolicyManagementRecord(
        companyId,
        policyId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance policy was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_POLICY_NOT_FOUND"
      });
    }

    return mapAttendancePolicy(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteAttendancePolicy(
  policyId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertPolicyManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await softDeleteAttendancePolicyManagementRecord(
        companyId,
        policyId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Attendance policy was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_POLICY_NOT_FOUND"
      });
    }

    return mapAttendancePolicy(
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
 * Global attendance statuses
 * =========================================================
 */

export async function listAttendanceStatuses(
  query: AttendanceStatusListQuery,
  auth: AuthContext
) {
  assertStatusViewAccess(auth);

  const result =
    await listAttendanceStatusManagementRecords(
      {
        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        ...(query.countsAsPresent !==
        undefined
          ? {
              countsAsPresent:
                query.countsAsPresent
            }
          : {}),

        ...(query.countsAsAbsent !==
        undefined
          ? {
              countsAsAbsent:
                query.countsAsAbsent
            }
          : {}),

        ...(query.isPayable !== undefined
          ? {
              isPayable:
                query.isPayable
            }
          : {}),

        includeInactive:
          query.includeInactive,

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
    attendanceStatuses:
      result.records.map(
        mapAttendanceStatus
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getAttendanceStatus(
  statusCode: string,
  auth: AuthContext
) {
  assertStatusViewAccess(auth);

  const status =
    await findAttendanceStatusManagementRecordByCode(
      statusCode
    );

  if (!status) {
    throw new AppError({
      message:
        "Attendance status was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_STATUS_NOT_FOUND"
    });
  }

  return mapAttendanceStatus(
    status
  );
}

export async function createAttendanceStatus(
  input: CreateAttendanceStatusInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertStatusManageAccess(auth);

  validateStatusClassification(
    input.countsAsPresent,
    input.countsAsAbsent
  );

  const record:
    CreateAttendanceStatusRecord = {
      statusCode:
        input.statusCode,

      statusName:
        input.statusName,

      description:
        input.description ??
        null,

      countsAsPresent:
        input.countsAsPresent,

      countsAsAbsent:
        input.countsAsAbsent,

      isPayable:
        input.isPayable,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createAttendanceStatusManagementRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAttendanceStatus(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateAttendanceStatus(
  statusCode: string,
  input: UpdateAttendanceStatusInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertStatusManageAccess(auth);

  const existing =
    await findAttendanceStatusManagementRecordByCode(
      statusCode
    );

  if (!existing) {
    throw new AppError({
      message:
        "Attendance status was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_STATUS_NOT_FOUND"
    });
  }

  validateStatusClassification(
    input.countsAsPresent ??
      databaseBoolean(
        existing.counts_as_present
      ),

    input.countsAsAbsent ??
      databaseBoolean(
        existing.counts_as_absent
      )
  );

  const record:
    UpdateAttendanceStatusRecord = {
      ...(input.statusName !== undefined
        ? {
            statusName:
              input.statusName
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.countsAsPresent !==
      undefined
        ? {
            countsAsPresent:
              input.countsAsPresent
          }
        : {}),

      ...(input.countsAsAbsent !==
      undefined
        ? {
            countsAsAbsent:
              input.countsAsAbsent
          }
        : {}),

      ...(input.isPayable !== undefined
        ? {
            isPayable:
              input.isPayable
          }
        : {}),

      ...(input.isActive !== undefined
        ? {
            isActive:
              input.isActive
          }
        : {})
    };

  try {
    const updated =
      await updateAttendanceStatusManagementRecord(
        statusCode,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance status was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_STATUS_NOT_FOUND"
      });
    }

    return mapAttendanceStatus(
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
 * Employee policy assignments
 * =========================================================
 */

export async function listEmployeeAttendancePolicyAssignments(
  employeeId: string,
  query:
    AttendancePolicyAssignmentListQuery,
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

  assertAssignmentViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listAttendancePolicyAssignmentManagementRecords(
      companyId,
      employeeId,
      {
        ...(query.policyId !== undefined
          ? {
              policyId:
                query.policyId
            }
          : {}),

        ...(query.isCurrent !== undefined
          ? {
              isCurrent:
                query.isCurrent
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
    policyAssignments:
      result.records.map(
        mapPolicyAssignment
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function createEmployeeAttendancePolicyAssignment(
  employeeId: string,
  input:
    CreateAttendancePolicyAssignmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAssignmentManageAccess(
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

  const policy =
    await findAttendancePolicyManagementRecordById(
      companyId,
      input.policyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Attendance policy was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected attendance policy is inactive",

      statusCode: 409,

      code:
        "ATTENDANCE_POLICY_INACTIVE"
    });
  }

  const effectiveTo =
    input.effectiveTo ??
    null;

  validateEffectiveDates(
    input.effectiveFrom,
    effectiveTo
  );

  const record:
    CreateAttendancePolicyAssignmentRecord = {
      employeeId,

      policyId:
        input.policyId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo,

      isCurrent:
        input.isCurrent,

      assignedByUserId:
        auth.userId
    };

  try {
    const created =
      await createAttendancePolicyAssignmentManagementRecord(
        companyId,
        record,
        createActor(auth),
        metadata
      );

    return mapPolicyAssignment(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeAttendancePolicyAssignment(
  employeeId: string,
  assignmentId: string,
  input:
    UpdateAttendancePolicyAssignmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAssignmentManageAccess(
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

  const companyId =
    String(
      employee.company_id
    );

  const existing =
    await findAttendancePolicyAssignmentManagementRecordById(
      companyId,
      employeeId,
      assignmentId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee attendance-policy assignment was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
    });
  }

  const finalPolicyId =
    input.policyId ??
    String(
      existing.policy_id
    );

  const finalEffectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  const finalEffectiveTo =
    input.effectiveTo !== undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  validateEffectiveDates(
    finalEffectiveFrom,
    finalEffectiveTo
  );

  const policy =
    await findAttendancePolicyManagementRecordById(
      companyId,
      finalPolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Attendance policy was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected attendance policy is inactive",

      statusCode: 409,

      code:
        "ATTENDANCE_POLICY_INACTIVE"
    });
  }

  const record:
    UpdateAttendancePolicyAssignmentRecord = {
      ...(input.policyId !== undefined
        ? {
            policyId:
              input.policyId
          }
        : {}),

      ...(input.effectiveFrom !==
      undefined
        ? {
            effectiveFrom:
              input.effectiveFrom
          }
        : {}),

      ...(input.effectiveTo !== undefined
        ? {
            effectiveTo:
              input.effectiveTo
          }
        : {}),

      ...(input.isCurrent !== undefined
        ? {
            isCurrent:
              input.isCurrent
          }
        : {})
    };

  try {
    const updated =
      await updateAttendancePolicyAssignmentManagementRecord(
        companyId,
        employeeId,
        assignmentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee attendance-policy assignment was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapPolicyAssignment(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeAttendancePolicyAssignment(
  employeeId: string,
  assignmentId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAssignmentManageAccess(
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

  const companyId =
    String(
      employee.company_id
    );

  try {
    const deleted =
      await deleteAttendancePolicyAssignmentManagementRecord(
        companyId,
        employeeId,
        assignmentId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Employee attendance-policy assignment was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapPolicyAssignment(
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
 * Effective employee attendance policy
 * =========================================================
 */

export async function getEffectiveEmployeeAttendancePolicy(
  employeeId: string,
  query: EffectiveAttendancePolicyQuery,
  auth: AuthContext
): Promise<EffectiveAttendancePolicyResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertAssignmentViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const asOfDate =
    query.asOfDate ??
    currentDateOnly();

  const assignment =
    await findEffectiveAttendancePolicyAssignmentManagementRecord(
      companyId,
      employeeId,
      asOfDate
    );

  if (assignment) {
    const policy =
      await findAttendancePolicyManagementRecordById(
        companyId,
        String(
          assignment.policy_id
        )
      );

    return {
      asOfDate,

      source:
        "EMPLOYEE_ASSIGNMENT",

      assignment:
        mapPolicyAssignment(
          assignment
        ),

      policy:
        policy
          ? mapAttendancePolicy(
              policy
            )
          : null
    };
  }

  const defaultPolicy =
    await findDefaultAttendancePolicyManagementRecord(
      companyId
    );

  if (defaultPolicy) {
    return {
      asOfDate,

      source:
        "COMPANY_DEFAULT",

      assignment:
        null,

      policy:
        mapAttendancePolicy(
          defaultPolicy
        )
    };
  }

  return {
    asOfDate,
    source: "NONE",
    assignment: null,
    policy: null
  };
}
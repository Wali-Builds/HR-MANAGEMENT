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
  createEmployeeShiftAssignmentRecord,
  createShiftRecord,
  createWorkScheduleRecord,
  deleteEmployeeShiftAssignmentRecord,
  findEffectiveEmployeeShiftAssignmentRecord,
  findEmployeeShiftAssignmentRecordById,
  findShiftRecordById,
  findWorkScheduleDayRecord,
  findWorkScheduleRecordById,
  listEmployeeShiftAssignmentRecords,
  listShiftRecords,
  listWorkScheduleDayRecords,
  listWorkScheduleRecords,
  replaceWorkScheduleDayRecords,
  softDeleteShiftRecord,
  softDeleteWorkScheduleRecord,
  updateEmployeeShiftAssignmentRecord,
  updateShiftRecord,
  updateWorkScheduleRecord
} from "./attendance-scheduling.repository.js";

import type {
  CreateEmployeeShiftAssignmentInput,
  CreateShiftInput,
  CreateWorkScheduleInput,
  EffectiveEmployeeShiftQuery,
  EmployeeShiftAssignmentListQuery,
  ReplaceWorkScheduleDaysInput,
  ShiftListQuery,
  UpdateEmployeeShiftAssignmentInput,
  UpdateShiftInput,
  UpdateWorkScheduleInput,
  WorkScheduleListQuery
} from "./attendance-scheduling.schema.js";

import type {
  CreateEmployeeShiftAssignmentRecord,
  CreateShiftRecord,
  CreateWorkScheduleRecord,
  EffectiveEmployeeShiftResponse,
  EmployeeShiftAssignmentDatabaseRow,
  EmployeeShiftAssignmentResponse,
  ReplaceWorkScheduleDayRecord,
  SchedulingPaginationResponse,
  ShiftDatabaseRow,
  ShiftResponse,
  UpdateEmployeeShiftAssignmentRecord,
  UpdateShiftRecord,
  UpdateWorkScheduleRecord,
  WorkScheduleDatabaseRow,
  WorkScheduleDayDatabaseRow,
  WorkScheduleDayResponse,
  WorkScheduleResponse
} from "./attendance-scheduling.types.js";

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

function timeOnly(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    /^\d{2}:\d{2}$/.test(
      trimmed
    )
  ) {
    return `${trimmed}:00`;
  }

  if (
    /^\d{2}:\d{2}:\d{2}/.test(
      trimmed
    )
  ) {
    return trimmed.slice(0, 8);
  }

  return trimmed;
}

function requiredTimeOnly(
  value: string
): string {
  const result =
    timeOnly(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_TIME"
    );
  }

  return result;
}

function currentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function dayOfWeekFromDate(
  value: string
): number {
  const parsedDate =
    new Date(
      `${value}T00:00:00.000Z`
    );

  const utcDay =
    parsedDate.getUTCDay();

  return utcDay === 0
    ? 7
    : utcDay;
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): SchedulingPaginationResponse {
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
        "You cannot access another company's scheduling records",

      statusCode: 403,

      code:
        "SCHEDULING_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertSchedulingViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.scheduling.view"
    ) ||
    hasPermission(
      auth,
      "attendance.scheduling.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.scheduling.assign"
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
      "You do not have permission to view shifts and work schedules",

    statusCode: 403,

    code:
      "SCHEDULING_VIEW_DENIED"
  });
}

function assertSchedulingManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.scheduling.manage"
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
      "You do not have permission to manage shifts and work schedules",

    statusCode: 403,

    code:
      "SCHEDULING_MANAGE_DENIED"
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
      "attendance.scheduling.view"
    ) ||
    hasPermission(
      auth,
      "attendance.scheduling.assign"
    ) ||
    hasPermission(
      auth,
      "attendance.scheduling.manage"
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
      "You do not have permission to view this employee's shift assignments",

    statusCode: 403,

    code:
      "SHIFT_ASSIGNMENT_VIEW_DENIED"
  });
}

function assertAssignmentManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.scheduling.assign"
    ) ||
    hasPermission(
      auth,
      "attendance.scheduling.manage"
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
      "You do not have permission to manage employee shift assignments",

    statusCode: 403,

    code:
      "SHIFT_ASSIGNMENT_MANAGE_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapShift(
  row: ShiftDatabaseRow
): ShiftResponse {
  return {
    shiftId:
      String(row.shift_id),

    companyId:
      String(row.company_id),

    branchId:
      nullableId(row.branch_id),

    branchCode:
      row.branch_code,

    branchName:
      row.branch_name,

    shiftCode:
      row.shift_code,

    shiftName:
      row.shift_name,

    description:
      row.description,

    startTime:
      requiredTimeOnly(
        row.start_time
      ),

    endTime:
      requiredTimeOnly(
        row.end_time
      ),

    crossesMidnight:
      databaseBoolean(
        row.crosses_midnight
      ),

    isFlexible:
      databaseBoolean(
        row.is_flexible
      ),

    breakMinutes:
      Number(row.break_minutes),

    expectedWorkMinutes:
      Number(
        row.expected_work_minutes
      ),

    checkInStartTime:
      timeOnly(
        row.check_in_start_time
      ),

    checkInEndTime:
      timeOnly(
        row.check_in_end_time
      ),

    checkOutStartTime:
      timeOnly(
        row.check_out_start_time
      ),

    checkOutEndTime:
      timeOnly(
        row.check_out_end_time
      ),

    lateGraceMinutes:
      Number(
        row.late_grace_minutes
      ),

    earlyDepartureGraceMinutes:
      Number(
        row
          .early_departure_grace_minutes
      ),

    overtimeAfterMinutes:
      Number(
        row.overtime_after_minutes
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

function mapWorkSchedule(
  row: WorkScheduleDatabaseRow
): WorkScheduleResponse {
  return {
    scheduleId:
      String(row.schedule_id),

    companyId:
      String(row.company_id),

    scheduleCode:
      row.schedule_code,

    scheduleName:
      row.schedule_name,

    description:
      row.description,

    weeklyWorkingHours:
      row.weekly_working_hours ===
      null
        ? null
        : Number(
            row.weekly_working_hours
          ),

    weeklyWorkingDays:
      row.weekly_working_days ===
      null
        ? null
        : Number(
            row.weekly_working_days
          ),

    isDefault:
      databaseBoolean(
        row.is_default
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    scheduleDayCount:
      Number(
        row.schedule_day_count
      ),

    configuredWorkingDayCount:
      Number(
        row
          .configured_working_day_count
      ),

    assignmentCount:
      Number(
        row.assignment_count
      ),

    currentAssignmentCount:
      Number(
        row.current_assignment_count
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

function dayName(
  dayOfWeek: number
): string {
  const names: Record<
    number,
    string
  > = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday"
  };

  return (
    names[dayOfWeek] ??
    "Unknown"
  );
}

function mapWorkScheduleDay(
  row: WorkScheduleDayDatabaseRow
): WorkScheduleDayResponse {
  const day =
    Number(row.day_of_week);

  return {
    scheduleDayId:
      String(
        row.schedule_day_id
      ),

    scheduleId:
      String(row.schedule_id),

    dayOfWeek:
      day,

    dayName:
      dayName(day),

    isWorkingDay:
      databaseBoolean(
        row.is_working_day
      ),

    plannedStartTime:
      timeOnly(
        row.planned_start_time
      ),

    plannedEndTime:
      timeOnly(
        row.planned_end_time
      ),

    breakMinutes:
      Number(row.break_minutes),

    expectedWorkMinutes:
      Number(
        row.expected_work_minutes
      ),

    crossesMidnight:
      databaseBoolean(
        row.crosses_midnight
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

function mapShiftAssignment(
  row:
    EmployeeShiftAssignmentDatabaseRow
): EmployeeShiftAssignmentResponse {
  return {
    shiftAssignmentId:
      String(
        row.shift_assignment_id
      ),

    companyId:
      String(row.company_id),

    employeeId:
      String(row.employee_id),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    shiftId:
      String(row.shift_id),

    shiftCode:
      row.shift_code,

    shiftName:
      row.shift_name,

    shiftStartTime:
      requiredTimeOnly(
        row.shift_start_time
      ),

    shiftEndTime:
      requiredTimeOnly(
        row.shift_end_time
      ),

    shiftCrossesMidnight:
      databaseBoolean(
        row.shift_crosses_midnight
      ),

    scheduleId:
      nullableId(
        row.schedule_id
      ),

    scheduleCode:
      row.schedule_code,

    scheduleName:
      row.schedule_name,

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    assignmentType:
      row.assignment_type,

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

    remarks:
      row.remarks,

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

function assertShiftBranchCompatibility(
  employee:
    AttendanceEmployeeDatabaseRow,
  shift: ShiftDatabaseRow
): void {
  if (
    shift.branch_id === null
  ) {
    return;
  }

  if (
    employee.branch_id === null ||
    employee.branch_id === undefined ||
    String(employee.branch_id) !==
      String(shift.branch_id)
  ) {
    throw new AppError({
      message:
        "The selected branch-specific shift does not belong to the employee's branch",

      statusCode: 409,

      code:
        "SHIFT_EMPLOYEE_BRANCH_MISMATCH"
    });
  }
}

/*
 * =========================================================
 * Configuration validation
 * =========================================================
 */

function timeToMinutes(
  value: string
): number {
  const parts =
    requiredTimeOnly(value)
      .split(":");

  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}

function periodMinutes(
  startTime: string,
  endTime: string,
  crossesMidnight: boolean
): number {
  const start =
    timeToMinutes(startTime);

  let end =
    timeToMinutes(endTime);

  if (
    crossesMidnight &&
    end <= start
  ) {
    end += 1440;
  }

  return end - start;
}

function validateWindowPair(
  startTime: string | null,
  endTime: string | null,
  windowName: string
): void {
  if (
    (startTime === null) !==
    (endTime === null)
  ) {
    throw new AppError({
      message:
        `${windowName} start and end must be provided together`,

      statusCode: 422,

      code:
        "INVALID_SHIFT_TIME_WINDOW"
    });
  }
}

function validateShiftConfiguration(
  input: {
    startTime: string;
    endTime: string;
    crossesMidnight: boolean;
    isFlexible: boolean;
    breakMinutes: number;
    expectedWorkMinutes: number;
    checkInStartTime: string | null;
    checkInEndTime: string | null;
    checkOutStartTime: string | null;
    checkOutEndTime: string | null;
  }
): void {
  const startMinutes =
    timeToMinutes(
      input.startTime
    );

  const endMinutes =
    timeToMinutes(
      input.endTime
    );

  if (
    input.crossesMidnight &&
    endMinutes > startMinutes
  ) {
    throw new AppError({
      message:
        "Crosses-midnight must be false when the shift ends later on the same day",

      statusCode: 422,

      code:
        "INVALID_SHIFT_MIDNIGHT_CONFIGURATION"
    });
  }

  if (
    !input.crossesMidnight &&
    endMinutes <= startMinutes
  ) {
    throw new AppError({
      message:
        "Crosses-midnight must be true when the shift ends on the following day",

      statusCode: 422,

      code:
        "INVALID_SHIFT_MIDNIGHT_CONFIGURATION"
    });
  }

  const duration =
    periodMinutes(
      input.startTime,
      input.endTime,
      input.crossesMidnight
    );

  if (
    duration <= 0 ||
    duration > 1440
  ) {
    throw new AppError({
      message:
        "Shift duration must be greater than zero and cannot exceed 24 hours",

      statusCode: 422,

      code:
        "INVALID_SHIFT_DURATION"
    });
  }

  if (
    input.breakMinutes >
    duration
  ) {
    throw new AppError({
      message:
        "Break minutes cannot exceed the shift duration",

      statusCode: 422,

      code:
        "INVALID_SHIFT_BREAK_MINUTES"
    });
  }

  if (
    !input.isFlexible &&
    input.expectedWorkMinutes >
      duration -
        input.breakMinutes
  ) {
    throw new AppError({
      message:
        "Expected work minutes cannot exceed the available shift duration",

      statusCode: 422,

      code:
        "INVALID_SHIFT_EXPECTED_MINUTES"
    });
  }

  validateWindowPair(
    input.checkInStartTime,
    input.checkInEndTime,
    "Check-in window"
  );

  validateWindowPair(
    input.checkOutStartTime,
    input.checkOutEndTime,
    "Check-out window"
  );
}

function validateDefaultSchedule(
  isDefault: boolean,
  isActive: boolean
): void {
  if (
    isDefault &&
    !isActive
  ) {
    throw new AppError({
      message:
        "An inactive work schedule cannot be the default schedule",

      statusCode: 422,

      code:
        "INACTIVE_DEFAULT_WORK_SCHEDULE"
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
        "INVALID_SHIFT_ASSIGNMENT_DATES"
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

      SCHEDULING_BRANCH_NOT_FOUND: {
        message:
          "The selected branch was not found in this company",
        statusCode: 404
      },

      SHIFT_NOT_FOUND: {
        message:
          "Shift was not found",
        statusCode: 404
      },

      SHIFT_INACTIVE: {
        message:
          "The selected shift is inactive",
        statusCode: 409
      },

      WORK_SCHEDULE_NOT_FOUND: {
        message:
          "Work schedule was not found",
        statusCode: 404
      },

      WORK_SCHEDULE_INACTIVE: {
        message:
          "The selected work schedule is inactive",
        statusCode: 409
      },

      SHIFT_HAS_CURRENT_ASSIGNMENTS: {
        message:
          "The shift cannot be deleted while it has current employee assignments",
        statusCode: 409
      },

      WORK_SCHEDULE_HAS_CURRENT_ASSIGNMENTS: {
        message:
          "The work schedule cannot be deleted while it has current employee assignments",
        statusCode: 409
      },

      SHIFT_ASSIGNMENT_DATE_OVERLAP: {
        message:
          "The shift-assignment dates overlap another assignment for this employee",
        statusCode: 409
      },

      SHIFT_ASSIGNMENT_NOT_FOUND: {
        message:
          "Employee shift assignment was not found",
        statusCode: 404
      },

      INVALID_SHIFT_ASSIGNMENT_DATE: {
        message:
          "The shift-assignment effective date is invalid",
        statusCode: 422
      },

      NO_SHIFT_UPDATE_FIELDS: {
        message:
          "At least one shift field is required",
        statusCode: 422
      },

      NO_WORK_SCHEDULE_UPDATE_FIELDS: {
        message:
          "At least one work-schedule field is required",
        statusCode: 422
      },

      NO_SHIFT_ASSIGNMENT_UPDATE_FIELDS: {
        message:
          "At least one shift-assignment field is required",
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
      sqlMessage?: string;
    };

  if (
    databaseError.code ===
      "ER_DUP_ENTRY" ||
    databaseError.errno === 1062
  ) {
    throw new AppError({
      message:
        "A scheduling record with the same unique values already exists",

      statusCode: 409,

      code:
        "SCHEDULING_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced scheduling record was not found",

      statusCode: 409,

      code:
        "SCHEDULING_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Shifts
 * =========================================================
 */

export async function listShifts(
  query: ShiftListQuery,
  auth: AuthContext
) {
  assertSchedulingViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listShiftRecords(
      companyId,
      {
        ...(query.branchId !== undefined
          ? {
              branchId:
                query.branchId
            }
          : {}),

        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
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
    shifts:
      result.records.map(
        mapShift
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getShift(
  shiftId: string,
  auth: AuthContext
) {
  assertSchedulingViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const shift =
    await findShiftRecordById(
      companyId,
      shiftId
    );

  if (!shift) {
    throw new AppError({
      message:
        "Shift was not found",

      statusCode: 404,

      code:
        "SHIFT_NOT_FOUND"
    });
  }

  return mapShift(shift);
}

export async function createShift(
  input: CreateShiftInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateShiftRecord = {
      companyId,

      branchId:
        input.branchId ??
        null,

      shiftCode:
        input.shiftCode,

      shiftName:
        input.shiftName,

      description:
        input.description ??
        null,

      startTime:
        input.startTime,

      endTime:
        input.endTime,

      crossesMidnight:
        input.crossesMidnight,

      isFlexible:
        input.isFlexible,

      breakMinutes:
        input.breakMinutes,

      expectedWorkMinutes:
        input.expectedWorkMinutes,

      checkInStartTime:
        input.checkInStartTime ??
        null,

      checkInEndTime:
        input.checkInEndTime ??
        null,

      checkOutStartTime:
        input.checkOutStartTime ??
        null,

      checkOutEndTime:
        input.checkOutEndTime ??
        null,

      lateGraceMinutes:
        input.lateGraceMinutes,

      earlyDepartureGraceMinutes:
        input
          .earlyDepartureGraceMinutes,

      overtimeAfterMinutes:
        input.overtimeAfterMinutes,

      isActive:
        input.isActive
    };

  validateShiftConfiguration(
    record
  );

  try {
    const created =
      await createShiftRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapShift(created);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateShift(
  shiftId: string,
  input: UpdateShiftInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findShiftRecordById(
      companyId,
      shiftId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Shift was not found",

      statusCode: 404,

      code:
        "SHIFT_NOT_FOUND"
    });
  }

  const finalConfiguration = {
    startTime:
      input.startTime ??
      requiredTimeOnly(
        existing.start_time
      ),

    endTime:
      input.endTime ??
      requiredTimeOnly(
        existing.end_time
      ),

    crossesMidnight:
      input.crossesMidnight ??
      databaseBoolean(
        existing.crosses_midnight
      ),

    isFlexible:
      input.isFlexible ??
      databaseBoolean(
        existing.is_flexible
      ),

    breakMinutes:
      input.breakMinutes ??
      Number(
        existing.break_minutes
      ),

    expectedWorkMinutes:
      input.expectedWorkMinutes ??
      Number(
        existing.expected_work_minutes
      ),

    checkInStartTime:
      input.checkInStartTime !==
      undefined
        ? input.checkInStartTime
        : timeOnly(
            existing
              .check_in_start_time
          ),

    checkInEndTime:
      input.checkInEndTime !==
      undefined
        ? input.checkInEndTime
        : timeOnly(
            existing
              .check_in_end_time
          ),

    checkOutStartTime:
      input.checkOutStartTime !==
      undefined
        ? input.checkOutStartTime
        : timeOnly(
            existing
              .check_out_start_time
          ),

    checkOutEndTime:
      input.checkOutEndTime !==
      undefined
        ? input.checkOutEndTime
        : timeOnly(
            existing
              .check_out_end_time
          )
  };

  validateShiftConfiguration(
    finalConfiguration
  );

  const record:
    UpdateShiftRecord = {
      ...(input.branchId !== undefined
        ? {
            branchId:
              input.branchId
          }
        : {}),

      ...(input.shiftCode !== undefined
        ? {
            shiftCode:
              input.shiftCode
          }
        : {}),

      ...(input.shiftName !== undefined
        ? {
            shiftName:
              input.shiftName
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.startTime !== undefined
        ? {
            startTime:
              input.startTime
          }
        : {}),

      ...(input.endTime !== undefined
        ? {
            endTime:
              input.endTime
          }
        : {}),

      ...(input.crossesMidnight !==
      undefined
        ? {
            crossesMidnight:
              input.crossesMidnight
          }
        : {}),

      ...(input.isFlexible !== undefined
        ? {
            isFlexible:
              input.isFlexible
          }
        : {}),

      ...(input.breakMinutes !== undefined
        ? {
            breakMinutes:
              input.breakMinutes
          }
        : {}),

      ...(input.expectedWorkMinutes !==
      undefined
        ? {
            expectedWorkMinutes:
              input.expectedWorkMinutes
          }
        : {}),

      ...(input.checkInStartTime !==
      undefined
        ? {
            checkInStartTime:
              input.checkInStartTime
          }
        : {}),

      ...(input.checkInEndTime !==
      undefined
        ? {
            checkInEndTime:
              input.checkInEndTime
          }
        : {}),

      ...(input.checkOutStartTime !==
      undefined
        ? {
            checkOutStartTime:
              input.checkOutStartTime
          }
        : {}),

      ...(input.checkOutEndTime !==
      undefined
        ? {
            checkOutEndTime:
              input.checkOutEndTime
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

      ...(input.overtimeAfterMinutes !==
      undefined
        ? {
            overtimeAfterMinutes:
              input.overtimeAfterMinutes
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
      await updateShiftRecord(
        companyId,
        shiftId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Shift was not found",

        statusCode: 404,

        code:
          "SHIFT_NOT_FOUND"
      });
    }

    return mapShift(updated);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteShift(
  shiftId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await softDeleteShiftRecord(
        companyId,
        shiftId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Shift was not found",

        statusCode: 404,

        code:
          "SHIFT_NOT_FOUND"
      });
    }

    return mapShift(deleted);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Work schedules
 * =========================================================
 */

export async function listWorkSchedules(
  query: WorkScheduleListQuery,
  auth: AuthContext
) {
  assertSchedulingViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listWorkScheduleRecords(
      companyId,
      {
        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
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

  const workSchedules =
    await Promise.all(
      result.records.map(
        async (
          schedule
        ) => {
          const mapped =
            mapWorkSchedule(
              schedule
            );

          if (!query.includeDays) {
            return mapped;
          }

          const days =
            await listWorkScheduleDayRecords(
              companyId,
              String(
                schedule.schedule_id
              )
            );

          return {
            ...mapped,

            days:
              days.map(
                mapWorkScheduleDay
              )
          };
        }
      )
    );

  return {
    workSchedules,

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getWorkSchedule(
  scheduleId: string,
  auth: AuthContext
) {
  assertSchedulingViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const schedule =
    await findWorkScheduleRecordById(
      companyId,
      scheduleId
    );

  if (!schedule) {
    throw new AppError({
      message:
        "Work schedule was not found",

      statusCode: 404,

      code:
        "WORK_SCHEDULE_NOT_FOUND"
    });
  }

  const days =
    await listWorkScheduleDayRecords(
      companyId,
      scheduleId
    );

  return {
    ...mapWorkSchedule(schedule),

    days:
      days.map(
        mapWorkScheduleDay
      )
  };
}

export async function createWorkSchedule(
  input: CreateWorkScheduleInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  validateDefaultSchedule(
    input.isDefault,
    input.isActive
  );

  const record:
    CreateWorkScheduleRecord = {
      companyId,

      scheduleCode:
        input.scheduleCode,

      scheduleName:
        input.scheduleName,

      description:
        input.description ??
        null,

      weeklyWorkingHours:
        input.weeklyWorkingHours ??
        null,

      weeklyWorkingDays:
        input.weeklyWorkingDays ??
        null,

      isDefault:
        input.isDefault,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createWorkScheduleRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapWorkSchedule(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateWorkSchedule(
  scheduleId: string,
  input: UpdateWorkScheduleInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findWorkScheduleRecordById(
      companyId,
      scheduleId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Work schedule was not found",

      statusCode: 404,

      code:
        "WORK_SCHEDULE_NOT_FOUND"
    });
  }

  const finalIsDefault =
    input.isDefault ??
    databaseBoolean(
      existing.is_default
    );

  const finalIsActive =
    input.isActive ??
    databaseBoolean(
      existing.is_active
    );

  validateDefaultSchedule(
    finalIsDefault,
    finalIsActive
  );

  const record:
    UpdateWorkScheduleRecord = {
      ...(input.scheduleCode !==
      undefined
        ? {
            scheduleCode:
              input.scheduleCode
          }
        : {}),

      ...(input.scheduleName !==
      undefined
        ? {
            scheduleName:
              input.scheduleName
          }
        : {}),

      ...(input.description !==
      undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.weeklyWorkingHours !==
      undefined
        ? {
            weeklyWorkingHours:
              input.weeklyWorkingHours
          }
        : {}),

      ...(input.weeklyWorkingDays !==
      undefined
        ? {
            weeklyWorkingDays:
              input.weeklyWorkingDays
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
      await updateWorkScheduleRecord(
        companyId,
        scheduleId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Work schedule was not found",

        statusCode: 404,

        code:
          "WORK_SCHEDULE_NOT_FOUND"
      });
    }

    return mapWorkSchedule(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteWorkSchedule(
  scheduleId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await softDeleteWorkScheduleRecord(
        companyId,
        scheduleId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Work schedule was not found",

        statusCode: 404,

        code:
          "WORK_SCHEDULE_NOT_FOUND"
      });
    }

    return mapWorkSchedule(
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
 * Work-schedule days
 * =========================================================
 */

export async function listWorkScheduleDays(
  scheduleId: string,
  auth: AuthContext
) {
  assertSchedulingViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const schedule =
    await findWorkScheduleRecordById(
      companyId,
      scheduleId
    );

  if (!schedule) {
    throw new AppError({
      message:
        "Work schedule was not found",

      statusCode: 404,

      code:
        "WORK_SCHEDULE_NOT_FOUND"
    });
  }

  const days =
    await listWorkScheduleDayRecords(
      companyId,
      scheduleId
    );

  return days.map(
    mapWorkScheduleDay
  );
}

export async function replaceWorkScheduleDays(
  scheduleId: string,
  input: ReplaceWorkScheduleDaysInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertSchedulingManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const records:
    ReplaceWorkScheduleDayRecord[] =
      input.days.map(
        (
          day
        ) => ({
          dayOfWeek:
            day.dayOfWeek,

          isWorkingDay:
            day.isWorkingDay,

          plannedStartTime:
            day.plannedStartTime,

          plannedEndTime:
            day.plannedEndTime,

          breakMinutes:
            day.breakMinutes,

          expectedWorkMinutes:
            day.expectedWorkMinutes,

          crossesMidnight:
            day.crossesMidnight
        })
      );

  try {
    const replaced =
      await replaceWorkScheduleDayRecords(
        companyId,
        scheduleId,
        records,
        createActor(auth),
        metadata
      );

    const schedule =
      await findWorkScheduleRecordById(
        companyId,
        scheduleId
      );

    return {
      workSchedule:
        schedule
          ? mapWorkSchedule(
              schedule
            )
          : null,

      days:
        replaced.map(
          mapWorkScheduleDay
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
 * Employee shift assignments
 * =========================================================
 */

export async function listEmployeeShiftAssignments(
  employeeId: string,
  query:
    EmployeeShiftAssignmentListQuery,
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
    await listEmployeeShiftAssignmentRecords(
      companyId,
      employeeId,
      {
        ...(query.shiftId !== undefined
          ? {
              shiftId:
                query.shiftId
            }
          : {}),

        ...(query.scheduleId !== undefined
          ? {
              scheduleId:
                query.scheduleId
            }
          : {}),

        ...(query.assignmentType !==
        undefined
          ? {
              assignmentType:
                query.assignmentType
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
    shiftAssignments:
      result.records.map(
        mapShiftAssignment
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function createEmployeeShiftAssignment(
  employeeId: string,
  input:
    CreateEmployeeShiftAssignmentInput,
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

  const shift =
    await findShiftRecordById(
      companyId,
      input.shiftId
    );

  if (!shift) {
    throw new AppError({
      message:
        "Shift was not found",

      statusCode: 404,

      code:
        "SHIFT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      shift.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected shift is inactive",

      statusCode: 409,

      code:
        "SHIFT_INACTIVE"
    });
  }

  assertShiftBranchCompatibility(
    employee,
    shift
  );

  if (
    input.scheduleId !== undefined &&
    input.scheduleId !== null
  ) {
    const schedule =
      await findWorkScheduleRecordById(
        companyId,
        input.scheduleId
      );

    if (!schedule) {
      throw new AppError({
        message:
          "Work schedule was not found",

        statusCode: 404,

        code:
          "WORK_SCHEDULE_NOT_FOUND"
      });
    }

    if (
      !databaseBoolean(
        schedule.is_active
      )
    ) {
      throw new AppError({
        message:
          "The selected work schedule is inactive",

        statusCode: 409,

        code:
          "WORK_SCHEDULE_INACTIVE"
      });
    }
  }

  const effectiveTo =
    input.effectiveTo ??
    null;

  validateEffectiveDates(
    input.effectiveFrom,
    effectiveTo
  );

  const record:
    CreateEmployeeShiftAssignmentRecord = {
      employeeId,

      shiftId:
        input.shiftId,

      scheduleId:
        input.scheduleId ??
        null,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo,

      assignmentType:
        input.assignmentType,

      isCurrent:
        input.isCurrent,

      assignedByUserId:
        auth.userId,

      remarks:
        input.remarks ??
        null
    };

  try {
    const created =
      await createEmployeeShiftAssignmentRecord(
        companyId,
        record,
        createActor(auth),
        metadata
      );

    return mapShiftAssignment(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeShiftAssignment(
  employeeId: string,
  shiftAssignmentId: string,
  input:
    UpdateEmployeeShiftAssignmentInput,
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
    await findEmployeeShiftAssignmentRecordById(
      companyId,
      employeeId,
      shiftAssignmentId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee shift assignment was not found",

      statusCode: 404,

      code:
        "SHIFT_ASSIGNMENT_NOT_FOUND"
    });
  }

  const finalShiftId =
    input.shiftId ??
    String(existing.shift_id);

  const finalScheduleId =
    input.scheduleId !== undefined
      ? input.scheduleId
      : nullableId(
          existing.schedule_id
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

  const shift =
    await findShiftRecordById(
      companyId,
      finalShiftId
    );

  if (!shift) {
    throw new AppError({
      message:
        "Shift was not found",

      statusCode: 404,

      code:
        "SHIFT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      shift.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected shift is inactive",

      statusCode: 409,

      code:
        "SHIFT_INACTIVE"
    });
  }

  assertShiftBranchCompatibility(
    employee,
    shift
  );

  if (
    finalScheduleId !== null
  ) {
    const schedule =
      await findWorkScheduleRecordById(
        companyId,
        finalScheduleId
      );

    if (!schedule) {
      throw new AppError({
        message:
          "Work schedule was not found",

        statusCode: 404,

        code:
          "WORK_SCHEDULE_NOT_FOUND"
      });
    }

    if (
      !databaseBoolean(
        schedule.is_active
      )
    ) {
      throw new AppError({
        message:
          "The selected work schedule is inactive",

        statusCode: 409,

        code:
          "WORK_SCHEDULE_INACTIVE"
      });
    }
  }

  const record:
    UpdateEmployeeShiftAssignmentRecord = {
      ...(input.shiftId !== undefined
        ? {
            shiftId:
              input.shiftId
          }
        : {}),

      ...(input.scheduleId !== undefined
        ? {
            scheduleId:
              input.scheduleId
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

      ...(input.assignmentType !==
      undefined
        ? {
            assignmentType:
              input.assignmentType
          }
        : {}),

      ...(input.isCurrent !== undefined
        ? {
            isCurrent:
              input.isCurrent
          }
        : {}),

      ...(input.remarks !== undefined
        ? {
            remarks:
              input.remarks
          }
        : {})
    };

  try {
    const updated =
      await updateEmployeeShiftAssignmentRecord(
        companyId,
        employeeId,
        shiftAssignmentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee shift assignment was not found",

        statusCode: 404,

        code:
          "SHIFT_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapShiftAssignment(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeShiftAssignment(
  employeeId: string,
  shiftAssignmentId: string,
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
      await deleteEmployeeShiftAssignmentRecord(
        companyId,
        employeeId,
        shiftAssignmentId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Employee shift assignment was not found",

        statusCode: 404,

        code:
          "SHIFT_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapShiftAssignment(
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
 * Effective employee shift
 * =========================================================
 */

export async function getEffectiveEmployeeShift(
  employeeId: string,
  query: EffectiveEmployeeShiftQuery,
  auth: AuthContext
): Promise<EffectiveEmployeeShiftResponse> {
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
    await findEffectiveEmployeeShiftAssignmentRecord(
      companyId,
      employeeId,
      asOfDate
    );

  if (!assignment) {
    return {
      asOfDate,
      assignment: null,
      shift: null,
      schedule: null,
      scheduleDay: null
    };
  }

  const shift =
    await findShiftRecordById(
      companyId,
      String(
        assignment.shift_id
      )
    );

  const scheduleId =
    nullableId(
      assignment.schedule_id
    );

  const schedule =
    scheduleId === null
      ? null
      : await findWorkScheduleRecordById(
          companyId,
          scheduleId
        );

  const scheduleDay =
    scheduleId === null
      ? null
      : await findWorkScheduleDayRecord(
          companyId,
          scheduleId,
          dayOfWeekFromDate(
            asOfDate
          )
        );

  return {
    asOfDate,

    assignment:
      mapShiftAssignment(
        assignment
      ),

    shift:
      shift
        ? mapShift(shift)
        : null,

    schedule:
      schedule
        ? mapWorkSchedule(
            schedule
          )
        : null,

    scheduleDay:
      scheduleDay
        ? mapWorkScheduleDay(
            scheduleDay
          )
        : null
  };
}
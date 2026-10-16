import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  assignEmployeeAttendancePolicyRecord,
  checkInAttendanceRecord,
  checkOutAttendanceRecord,
  createAttendanceDeviceRecord,
  createAttendanceRecordRecord,
  createBiometricLogRecord,
  endAttendanceBreakRecord,
  finalizeAttendanceRecord as finalizeAttendanceRecordRepository,
  findAttendanceDeviceById,
  findAttendanceEmployeeByCode,
  findAttendanceEmployeeById,
  findAttendancePolicyById,
  findAttendanceRecordById,
  findAttendanceStatusByCode,
  findDefaultAttendancePolicy,
  findEffectiveAttendancePolicyAssignment,
  findEffectiveShiftAssignment,
  findOpenAttendanceRecordForPunch,
  findShiftById,
  findWorkScheduleById,
  listAttendanceBreakRecords,
  listAttendanceDeviceRecords,
  listAttendancePolicyRecords,
  listAttendanceRecordRecords,
  listAttendanceStatusRecords,
  listBiometricLogRecords,
  listBiometricLogsForProcessing,
  listEmployeeAttendancePolicyAssignmentRecords,
  listEmployeeAttendanceRecordRecords,
  listShiftRecords,
  listWorkScheduleDayRecords,
  listWorkScheduleRecords,
  markBiometricLogFailed,
  processBiometricPunchRecord,
  startAttendanceBreakRecord,
  updateAttendanceDeviceRecord,
  updateAttendanceRecordRecord
} from "./attendance.repository.js";

import type {
  AssignEmployeeAttendancePolicyInput,
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceDeviceListQuery,
  AttendanceLookupQuery,
  AttendancePolicyAssignmentListQuery,
  AttendanceRecordListQuery,
  BiometricLogListQuery,
  CreateAttendanceDeviceInput,
  CreateAttendanceRecordInput,
  CreateBiometricLogInput,
  EmployeeAttendanceListQuery,
  EndAttendanceBreakInput,
  FinalizeAttendanceInput,
  ProcessBiometricLogsInput,
  StartAttendanceBreakInput,
  UpdateAttendanceDeviceInput,
  UpdateAttendanceRecordInput
} from "./attendance.schema.js";

import type {
  AttendanceActor,
  AttendanceBreakDatabaseRow,
  AttendanceBreakResponse,
  AttendanceDeviceDatabaseRow,
  AttendanceDeviceResponse,
  AttendanceEmployeeDatabaseRow,
  AttendancePolicyDatabaseRow,
  AttendancePolicyResponse,
  AttendanceRecordDatabaseRow,
  AttendanceRecordResponse,
  AttendanceStatusDatabaseRow,
  AttendanceStatusResponse,
  BiometricLogDatabaseRow,
  BiometricLogResponse,
  CreateAttendanceDeviceRecord,
  CreateAttendanceRecordRecord,
  CreateBiometricLogRecord,
  CreateEmployeeAttendancePolicyAssignmentRecord,
  EmployeeAttendancePolicyAssignmentDatabaseRow,
  EmployeeAttendancePolicyAssignmentResponse,
  EmployeeShiftAssignmentDatabaseRow,
  EmployeeShiftAssignmentResponse,
  PaginationResponse,
  RequestMetadata,
  ShiftDatabaseRow,
  ShiftResponse,
  UpdateAttendanceDeviceRecord,
  UpdateAttendanceRecordRecord,
  WorkScheduleDatabaseRow,
  WorkScheduleDayDatabaseRow,
  WorkScheduleDayResponse,
  WorkScheduleResponse
} from "./attendance.types.js";

/*
 * =========================================================
 * Conversion helpers
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
): string | null {
  return value === null
    ? null
    : String(value);
}

function nullableNumber(
  value:
    | string
    | number
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

function timeOnly(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  return value.slice(
    0,
    8
  );
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): PaginationResponse {
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

function addDateDays(
  dateValue: string,
  days: number
): string {
  const date =
    new Date(
      `${dateValue}T00:00:00.000Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function normalizeTime(
  value: string
): string {
  return value.length === 5
    ? `${value}:00`
    : value.slice(0, 8);
}

function combineDateAndTime(
  dateValue: string,
  timeValue: string
): string {
  return `${dateValue} ${normalizeTime(
    timeValue
  )}`;
}

function dayOfWeek(
  dateValue: string
): number {
  const day =
    new Date(
      `${dateValue}T00:00:00.000Z`
    ).getUTCDay();

  return day === 0
    ? 7
    : day;
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
    auth.employeeId ===
      employeeId
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
        "You cannot access another company's attendance records",

      statusCode: 403,

      code:
        "ATTENDANCE_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertAttendanceViewAccess(
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
      "attendance.view"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.finalize"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view attendance records",

    statusCode: 403,

    code:
      "ATTENDANCE_VIEW_DENIED"
  });
}

function assertAttendanceManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage attendance",

    statusCode: 403,

    code:
      "ATTENDANCE_MANAGE_DENIED"
  });
}

function assertAttendanceFinalizeAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.finalize"
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
      "You do not have permission to finalize attendance",

    statusCode: 403,

    code:
      "ATTENDANCE_FINALIZE_DENIED"
  });
}

function assertBiometricManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "biometric.manage"
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
      "You do not have permission to manage biometric attendance",

    statusCode: 403,

    code:
      "BIOMETRIC_MANAGE_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapAttendanceStatus(
  row: AttendanceStatusDatabaseRow
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
      )
  };
}

function mapAttendancePolicy(
  row: AttendancePolicyDatabaseRow
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
        row.early_departure_grace_minutes
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
      nullableNumber(
        row.maximum_overtime_minutes_day
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
      )
  };
}

function mapPolicyAssignment(
  row:
    EmployeeAttendancePolicyAssignmentDatabaseRow
): EmployeeAttendancePolicyAssignmentResponse {
  return {
    assignmentId:
      String(row.assignment_id),

    employeeId:
      String(row.employee_id),

    policyId:
      String(row.policy_id),

    companyId:
      String(row.company_id),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

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

function mapAttendanceDevice(
  row: AttendanceDeviceDatabaseRow
): AttendanceDeviceResponse {
  return {
    deviceId:
      String(row.device_id),

    companyId:
      String(row.company_id),

    branchId:
      nullableId(
        row.branch_id
      ),

    branchCode:
      row.branch_code,

    branchName:
      row.branch_name,

    deviceCode:
      row.device_code,

    deviceName:
      row.device_name,

    deviceType:
      row.device_type,

    manufacturer:
      row.manufacturer,

    modelNumber:
      row.model_number,

    serialNumber:
      row.serial_number,

    ipAddress:
      row.ip_address,

    portNumber:
      nullableNumber(
        row.port_number
      ),

    physicalLocation:
      row.physical_location,

    lastSyncAt:
      dateTimeIso(
        row.last_sync_at
      ),

    syncStatus:
      row.sync_status,

    isActive:
      databaseBoolean(
        row.is_active
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

function mapShift(
  row: ShiftDatabaseRow
): ShiftResponse {
  return {
    shiftId:
      String(row.shift_id),

    companyId:
      String(row.company_id),

    branchId:
      nullableId(
        row.branch_id
      ),

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
      normalizeTime(
        row.start_time
      ),

    endTime:
      normalizeTime(
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
      Number(
        row.break_minutes
      ),

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
        row.early_departure_grace_minutes
      ),

    overtimeAfterMinutes:
      Number(
        row.overtime_after_minutes
      ),

    isActive:
      databaseBoolean(
        row.is_active
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
      nullableNumber(
        row.weekly_working_hours
      ),

    weeklyWorkingDays:
      nullableNumber(
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
      )
  };
}

function mapScheduleDay(
  row: WorkScheduleDayDatabaseRow
): WorkScheduleDayResponse {
  return {
    scheduleDayId:
      String(
        row.schedule_day_id
      ),

    scheduleId:
      String(row.schedule_id),

    dayOfWeek:
      Number(row.day_of_week),

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

    employeeId:
      String(row.employee_id),

    companyId:
      String(row.company_id),

    shiftId:
      String(row.shift_id),

    shiftCode:
      row.shift_code,

    shiftName:
      row.shift_name,

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

function mapBiometricLog(
  row: BiometricLogDatabaseRow
): BiometricLogResponse {
  return {
    biometricLogId:
      String(
        row.biometric_log_id
      ),

    companyId:
      String(row.company_id),

    deviceId:
      nullableId(
        row.device_id
      ),

    deviceCode:
      row.device_code,

    deviceName:
      row.device_name,

    employeeId:
      nullableId(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    externalEmployeeCode:
      row.external_employee_code,

    punchTime:
      requiredDateTimeIso(
        row.punch_time
      ),

    punchType:
      row.punch_type,

    verificationMethod:
      row.verification_method,

    latitude:
      nullableNumber(
        row.latitude
      ),

    longitude:
      nullableNumber(
        row.longitude
      ),

    sourceType:
      row.source_type,

    isProcessed:
      databaseBoolean(
        row.is_processed
      ),

    processingError:
      row.processing_error,

    processedAt:
      dateTimeIso(
        row.processed_at
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      )
  };
}

function mapAttendanceRecord(
  row: AttendanceRecordDatabaseRow
): AttendanceRecordResponse {
  return {
    attendanceId:
      String(row.attendance_id),

    companyId:
      String(row.company_id),

    employeeId:
      String(row.employee_id),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    branchId:
      nullableId(
        row.branch_id
      ),

    branchCode:
      row.branch_code,

    branchName:
      row.branch_name,

    attendanceDate:
      requiredDateOnly(
        row.attendance_date
      ),

    shiftId:
      nullableId(
        row.shift_id
      ),

    shiftCode:
      row.shift_code,

    shiftName:
      row.shift_name,

    scheduleId:
      nullableId(
        row.schedule_id
      ),

    scheduleCode:
      row.schedule_code,

    scheduleName:
      row.schedule_name,

    policyId:
      nullableId(
        row.policy_id
      ),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    scheduledStartAt:
      dateTimeIso(
        row.scheduled_start_at
      ),

    scheduledEndAt:
      dateTimeIso(
        row.scheduled_end_at
      ),

    checkInAt:
      dateTimeIso(
        row.check_in_at
      ),

    checkOutAt:
      dateTimeIso(
        row.check_out_at
      ),

    totalPresenceMinutes:
      Number(
        row.total_presence_minutes
      ),

    totalBreakMinutes:
      Number(
        row.total_break_minutes
      ),

    totalWorkMinutes:
      Number(
        row.total_work_minutes
      ),

    payableMinutes:
      Number(
        row.payable_minutes
      ),

    lateMinutes:
      Number(row.late_minutes),

    earlyDepartureMinutes:
      Number(
        row.early_departure_minutes
      ),

    overtimeMinutes:
      Number(
        row.overtime_minutes
      ),

    statusCode:
      row.status_code,

    statusName:
      row.status_name,

    countsAsPresent:
      databaseBoolean(
        row.counts_as_present
      ),

    countsAsAbsent:
      databaseBoolean(
        row.counts_as_absent
      ),

    statusIsPayable:
      databaseBoolean(
        row.status_is_payable
      ),

    attendanceSource:
      row.attendance_source,

    checkInLocation:
      row.check_in_location,

    checkOutLocation:
      row.check_out_location,

    checkInLatitude:
      nullableNumber(
        row.check_in_latitude
      ),

    checkInLongitude:
      nullableNumber(
        row.check_in_longitude
      ),

    checkOutLatitude:
      nullableNumber(
        row.check_out_latitude
      ),

    checkOutLongitude:
      nullableNumber(
        row.check_out_longitude
      ),

    notes:
      row.notes,

    isManuallyModified:
      databaseBoolean(
        row.is_manually_modified
      ),

    isFinalized:
      databaseBoolean(
        row.is_finalized
      ),

    finalizedByUserId:
      nullableId(
        row.finalized_by_user_id
      ),

    finalizedByUsername:
      row.finalized_by_username,

    finalizedByFullName:
      row.finalized_by_full_name,

    finalizedAt:
      dateTimeIso(
        row.finalized_at
      ),

    openBreakCount:
      Number(
        row.open_break_count
      ),

    breakCount:
      Number(
        row.break_count
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

function mapAttendanceBreak(
  row: AttendanceBreakDatabaseRow
): AttendanceBreakResponse {
  return {
    breakId:
      String(row.break_id),

    attendanceId:
      String(row.attendance_id),

    employeeId:
      String(row.employee_id),

    breakType:
      row.break_type,

    breakStartAt:
      requiredDateTimeIso(
        row.break_start_at
      ),

    breakEndAt:
      dateTimeIso(
        row.break_end_at
      ),

    durationMinutes:
      Number(
        row.duration_minutes
      ),

    isPaid:
      databaseBoolean(
        row.is_paid
      ),

    sourceType:
      row.source_type,

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
    String(employee.company_id)
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
        "Attendance cannot be recorded for an inactive employee",

      statusCode: 422,

      code:
        "INACTIVE_EMPLOYEE_ATTENDANCE_DENIED"
    });
  }
}

async function validateStatus(
  statusCode: string
): Promise<void> {
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
        "Attendance status was not found or is inactive",

      statusCode: 422,

      code:
        "ATTENDANCE_STATUS_NOT_FOUND"
    });
  }
}

function serializeRawPayload(
  value: unknown
): string | null {
  if (value === undefined) {
    return null;
  }

  try {
    const serialized =
      typeof value === "string"
        ? value
        : JSON.stringify(
            value,
            (_key, currentValue) =>
              typeof currentValue ===
              "bigint"
                ? String(
                    currentValue
                  )
                : currentValue
          );

    if (
      serialized.length >
      1_000_000
    ) {
      throw new AppError({
        message:
          "Biometric raw payload exceeds the permitted size",

        statusCode: 413,

        code:
          "BIOMETRIC_PAYLOAD_TOO_LARGE"
      });
    }

    return serialized;
  } catch (error) {
    if (
      error instanceof AppError
    ) {
      throw error;
    }

    throw new AppError({
      message:
        "Biometric raw payload could not be serialized",

      statusCode: 422,

      code:
        "INVALID_BIOMETRIC_RAW_PAYLOAD"
    });
  }
}

/*
 * =========================================================
 * Attendance setup resolution
 * =========================================================
 */

interface ResolvedAttendanceSetup {
  policyId: string | null;
  shiftId: string | null;
  scheduleId: string | null;

  scheduledStartAt:
    string | null;

  scheduledEndAt:
    string | null;
}

async function resolveAttendanceSetup(
  companyId: string,
  employee:
    AttendanceEmployeeDatabaseRow,

  attendanceDate: string,

  requested: {
    policyId?:
      | string
      | null
      | undefined;

    shiftId?:
      | string
      | null
      | undefined;

    scheduleId?:
      | string
      | null
      | undefined;

    scheduledStartAt?:
      | string
      | null
      | undefined;

    scheduledEndAt?:
      | string
      | null
      | undefined;
  }
): Promise<ResolvedAttendanceSetup> {
  const employeeId =
    String(employee.employee_id);

  let policyId:
    string | null;

  if (
    requested.policyId !==
    undefined
  ) {
    policyId =
      requested.policyId;
  } else {
    const policyAssignment =
      await findEffectiveAttendancePolicyAssignment(
        employeeId,
        attendanceDate
      );

    if (policyAssignment) {
      policyId =
        String(
          policyAssignment.policy_id
        );
    } else {
      const defaultPolicy =
        await findDefaultAttendancePolicy(
          companyId
        );

      policyId =
        defaultPolicy
          ? String(
              defaultPolicy.policy_id
            )
          : null;
    }
  }

  if (policyId !== null) {
    const policy =
      await findAttendancePolicyById(
        companyId,
        policyId
      );

    if (
      !policy ||
      !databaseBoolean(
        policy.is_active
      )
    ) {
      throw new AppError({
        message:
          "Attendance policy was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_POLICY_NOT_FOUND"
      });
    }
  }

  const shiftAssignment =
    await findEffectiveShiftAssignment(
      employeeId,
      attendanceDate
    );

  const shiftId =
    requested.shiftId !==
    undefined
      ? requested.shiftId
      : shiftAssignment
        ? String(
            shiftAssignment.shift_id
          )
        : null;

  const scheduleId =
    requested.scheduleId !==
    undefined
      ? requested.scheduleId
      : shiftAssignment
        ? nullableId(
            shiftAssignment.schedule_id
          )
        : null;

  let shift:
    ShiftDatabaseRow | null =
      null;

  if (shiftId !== null) {
    shift =
      await findShiftById(
        companyId,
        shiftId
      );

    if (
      !shift ||
      !databaseBoolean(
        shift.is_active
      )
    ) {
      throw new AppError({
        message:
          "Shift was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_SHIFT_NOT_FOUND"
      });
    }

    if (
      shift.branch_id !== null &&
      employee.branch_id !== null &&
      String(
        shift.branch_id
      ) !==
        String(
          employee.branch_id
        )
    ) {
      throw new AppError({
        message:
          "The selected shift belongs to another branch",

        statusCode: 422,

        code:
          "ATTENDANCE_SHIFT_BRANCH_MISMATCH"
      });
    }
  }

  if (scheduleId !== null) {
    const schedule =
      await findWorkScheduleById(
        companyId,
        scheduleId
      );

    if (
      !schedule ||
      !databaseBoolean(
        schedule.is_active
      )
    ) {
      throw new AppError({
        message:
          "Work schedule was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_SCHEDULE_NOT_FOUND"
      });
    }
  }

  let generatedStartAt:
    string | null = null;

  let generatedEndAt:
    string | null = null;

  let scheduleDayFound = false;

  if (scheduleId !== null) {
    const scheduleDays =
      await listWorkScheduleDayRecords(
        companyId,
        scheduleId
      );

    const scheduleDay =
      scheduleDays.find(
        (record) =>
          Number(
            record.day_of_week
          ) ===
          dayOfWeek(
            attendanceDate
          )
      );

    if (scheduleDay) {
      scheduleDayFound = true;

      if (
        databaseBoolean(
          scheduleDay.is_working_day
        ) &&
        scheduleDay.planned_start_time &&
        scheduleDay.planned_end_time
      ) {
        generatedStartAt =
          combineDateAndTime(
            attendanceDate,
            scheduleDay
              .planned_start_time
          );

        const endDate =
          databaseBoolean(
            scheduleDay.crosses_midnight
          )
            ? addDateDays(
                attendanceDate,
                1
              )
            : attendanceDate;

        generatedEndAt =
          combineDateAndTime(
            endDate,
            scheduleDay
              .planned_end_time
          );
      }
    }
  }

  if (
    !scheduleDayFound &&
    shift
  ) {
    generatedStartAt =
      combineDateAndTime(
        attendanceDate,
        shift.start_time
      );

    const endDate =
      databaseBoolean(
        shift.crosses_midnight
      )
        ? addDateDays(
            attendanceDate,
            1
          )
        : attendanceDate;

    generatedEndAt =
      combineDateAndTime(
        endDate,
        shift.end_time
      );
  }

  return {
    policyId,
    shiftId,
    scheduleId,

    scheduledStartAt:
      requested.scheduledStartAt !==
      undefined
        ? requested.scheduledStartAt
        : generatedStartAt,

    scheduledEndAt:
      requested.scheduledEndAt !==
      undefined
        ? requested.scheduledEndAt
        : generatedEndAt
  };
}

async function getRecordOrThrow(
  companyId: string,
  attendanceId: string
): Promise<AttendanceRecordDatabaseRow> {
  const record =
    await findAttendanceRecordById(
      companyId,
      attendanceId
    );

  if (!record) {
    throw new AppError({
      message:
        "Attendance record was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_RECORD_NOT_FOUND"
    });
  }

  return record;
}

async function assertSelfAttendanceSource(
  companyId: string,
  record:
    AttendanceRecordDatabaseRow,

  attendanceSource: string
): Promise<void> {
  let policy:
    AttendancePolicyDatabaseRow | null =
      null;

  if (record.policy_id !== null) {
    policy =
      await findAttendancePolicyById(
        companyId,
        String(
          record.policy_id
        )
      );
  }

  if (!policy) {
    policy =
      await findDefaultAttendancePolicy(
        companyId
      );
  }

  if (!policy) {
    throw new AppError({
      message:
        "An attendance policy is required for employee self-attendance",

      statusCode: 422,

      code:
        "SELF_ATTENDANCE_POLICY_REQUIRED"
    });
  }

  if (
    attendanceSource ===
      "REMOTE" &&
    !databaseBoolean(
      policy.allow_remote_attendance
    )
  ) {
    throw new AppError({
      message:
        "Remote attendance is not allowed by the employee's attendance policy",

      statusCode: 403,

      code:
        "REMOTE_ATTENDANCE_NOT_ALLOWED"
    });
  }

  if (
    attendanceSource !==
      "REMOTE" &&
    !databaseBoolean(
      policy.allow_manual_attendance
    )
  ) {
    throw new AppError({
      message:
        "Manual attendance is not allowed by the employee's attendance policy",

      statusCode: 403,

      code:
        "MANUAL_ATTENDANCE_NOT_ALLOWED"
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

      EMPLOYEE_COMPANY_MISMATCH: {
        message:
          "Employee belongs to another company",
        statusCode: 409
      },

      ATTENDANCE_POLICY_NOT_FOUND: {
        message:
          "Attendance policy was not found or is inactive",
        statusCode: 404
      },

      ATTENDANCE_POLICY_CURRENT_DATE_CONFLICT: {
        message:
          "The new current policy must start after the existing current policy",
        statusCode: 409
      },

      ATTENDANCE_POLICY_PERIOD_OVERLAP: {
        message:
          "Attendance-policy assignment overlaps an existing assignment",
        statusCode: 409
      },

      ATTENDANCE_DEVICE_BRANCH_NOT_FOUND: {
        message:
          "Attendance-device branch was not found for this company",
        statusCode: 404
      },

      ATTENDANCE_RECORD_NOT_FOUND: {
        message:
          "Attendance record was not found",
        statusCode: 404
      },

      FINALIZED_ATTENDANCE_IMMUTABLE: {
        message:
          "A finalized attendance record cannot be modified",
        statusCode: 409
      },

      ATTENDANCE_ALREADY_CHECKED_IN: {
        message:
          "Attendance is already checked in",
        statusCode: 409
      },

      ATTENDANCE_ALREADY_CHECKED_OUT: {
        message:
          "Attendance is already checked out",
        statusCode: 409
      },

      ATTENDANCE_CHECK_IN_REQUIRED: {
        message:
          "Check-in is required before this operation",
        statusCode: 422
      },

      CHECK_IN_AFTER_CHECK_OUT: {
        message:
          "Check-in cannot be after check-out",
        statusCode: 422
      },

      INVALID_ATTENDANCE_CHECK_OUT: {
        message:
          "Check-out cannot be before check-in",
        statusCode: 422
      },

      INVALID_SCHEDULED_ATTENDANCE_PERIOD: {
        message:
          "Scheduled attendance end must be after scheduled start",
        statusCode: 422
      },

      OPEN_ATTENDANCE_BREAK_EXISTS: {
        message:
          "An open attendance break must be ended first",
        statusCode: 409
      },

      BREAK_AFTER_CHECK_OUT_NOT_ALLOWED: {
        message:
          "A break cannot start after check-out",
        statusCode: 422
      },

      BREAK_BEFORE_CHECK_IN_NOT_ALLOWED: {
        message:
          "A break cannot start before check-in",
        statusCode: 422
      },

      ATTENDANCE_BREAK_ALREADY_ENDED: {
        message:
          "Attendance break has already ended",
        statusCode: 409
      },

      INVALID_ATTENDANCE_BREAK_END: {
        message:
          "Break end cannot be before break start",
        statusCode: 422
      },

      BREAK_END_AFTER_CHECK_OUT: {
        message:
          "Break end cannot be after check-out",
        statusCode: 422
      },

      ATTENDANCE_ALREADY_FINALIZED: {
        message:
          "Attendance record is already finalized",
        statusCode: 409
      },

      CHECK_OUT_REQUIRED_BEFORE_FINALIZATION: {
        message:
          "Check-out is required before attendance finalization",
        statusCode: 422
      },

      BIOMETRIC_LOG_NOT_FOUND: {
        message:
          "Biometric log was not found",
        statusCode: 404
      },

      BIOMETRIC_LOG_ALREADY_PROCESSED: {
        message:
          "Biometric log has already been processed",
        statusCode: 409
      },

      BIOMETRIC_EMPLOYEE_NOT_FOUND: {
        message:
          "Biometric employee could not be resolved",
        statusCode: 404
      },

      BIOMETRIC_EMPLOYEE_MISMATCH: {
        message:
          "Biometric log employee does not match the resolved employee",
        statusCode: 409
      },

      BIOMETRIC_CHECK_OUT_WITHOUT_CHECK_IN: {
        message:
          "Biometric check-out cannot be processed without a check-in",
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
        "An attendance record already exists with the same unique values",

      statusCode: 409,

      code:
        "ATTENDANCE_RECORD_ALREADY_EXISTS"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

export async function getAttendanceLookups(
  query: AttendanceLookupQuery,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  assertAttendanceViewAccess(
    auth,
    query.employeeId
  );

  if (query.employeeId) {
    const employee =
      await getEmployeeOrThrow(
        query.employeeId
      );

    assertEmployeeCompany(
      auth,
      employee
    );
  }

  const [
    statuses,
    policies,
    shifts,
    schedules
  ] = await Promise.all([
    listAttendanceStatusRecords(
      query.includeInactive
    ),

    listAttendancePolicyRecords(
      companyId,
      {
        ...(query.search !== undefined
          ? {
              search:
                query.search
            }
          : {}),

        includeInactive:
          query.includeInactive
      }
    ),

    listShiftRecords(
      companyId,
      {
        ...(query.search !== undefined
          ? {
              search:
                query.search
            }
          : {}),

        includeInactive:
          query.includeInactive
      }
    ),

    listWorkScheduleRecords(
      companyId,
      {
        ...(query.search !== undefined
          ? {
              search:
                query.search
            }
          : {}),

        includeInactive:
          query.includeInactive
      }
    )
  ]);

  const scheduleDays =
    query.includeScheduleDays
      ? await listWorkScheduleDayRecords(
          companyId,
          query.scheduleId
        )
      : [];

  const currentDate =
    new Date()
      .toISOString()
      .slice(0, 10);

  const effectivePolicy =
    query.employeeId
      ? await findEffectiveAttendancePolicyAssignment(
          query.employeeId,
          currentDate
        )
      : null;

  const effectiveShift =
    query.employeeId
      ? await findEffectiveShiftAssignment(
          query.employeeId,
          currentDate
        )
      : null;

  return {
    statuses:
      statuses.map(
        mapAttendanceStatus
      ),

    policies:
      policies.map(
        mapAttendancePolicy
      ),

    shifts:
      shifts.map(
        mapShift
      ),

    schedules:
      schedules.map(
        mapWorkSchedule
      ),

    scheduleDays:
      scheduleDays.map(
        mapScheduleDay
      ),

    effectivePolicy:
      effectivePolicy
        ? mapPolicyAssignment(
            effectivePolicy
          )
        : null,

    effectiveShift:
      effectiveShift
        ? mapShiftAssignment(
            effectiveShift
          )
        : null
  };
}

/*
 * =========================================================
 * Employee attendance policies
 * =========================================================
 */

export async function listEmployeeAttendancePolicies(
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

  assertAttendanceViewAccess(
    auth,
    employeeId
  );

  const records =
    await listEmployeeAttendancePolicyAssignmentRecords(
      employeeId,
      {
        status:
          query.status
      }
    );

  return records.map(
    mapPolicyAssignment
  );
}

export async function assignEmployeeAttendancePolicy(
  employeeId: string,
  input:
    AssignEmployeeAttendancePolicyInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAttendanceManageAccess(
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
    String(employee.company_id);

  const policy =
    await findAttendancePolicyById(
      companyId,
      input.policyId
    );

  if (
    !policy ||
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new AppError({
      message:
        "Attendance policy was not found or is inactive",

      statusCode: 404,

      code:
        "ATTENDANCE_POLICY_NOT_FOUND"
    });
  }

  const record:
    CreateEmployeeAttendancePolicyAssignmentRecord = {
      employeeId,

      policyId:
        input.policyId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo:
        input.effectiveTo ??
        null,

      isCurrent:
        input.isCurrent,

      assignedByUserId:
        auth.userId
    };

  try {
    const created =
      await assignEmployeeAttendancePolicyRecord(
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

/*
 * =========================================================
 * Attendance devices
 * =========================================================
 */

export async function listAttendanceDevices(
  query: AttendanceDeviceListQuery,
  auth: AuthContext
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listAttendanceDeviceRecords(
      companyId,
      {
        ...(query.search !== undefined
          ? {
              search:
                query.search
            }
          : {}),

        ...(query.branchId !== undefined
          ? {
              branchId:
                query.branchId
            }
          : {}),

        ...(query.deviceType !== undefined
          ? {
              deviceType:
                query.deviceType
            }
          : {}),

        ...(query.syncStatus !== undefined
          ? {
              syncStatus:
                query.syncStatus
            }
          : {}),

        includeInactive:
          query.includeInactive,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    attendanceDevices:
      result.records.map(
        mapAttendanceDevice
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getAttendanceDevice(
  deviceId: string,
  auth: AuthContext
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const device =
    await findAttendanceDeviceById(
      companyId,
      deviceId
    );

  if (!device) {
    throw new AppError({
      message:
        "Attendance device was not found",

      statusCode: 404,

      code:
        "ATTENDANCE_DEVICE_NOT_FOUND"
    });
  }

  return mapAttendanceDevice(
    device
  );
}

export async function createAttendanceDevice(
  input:
    CreateAttendanceDeviceInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateAttendanceDeviceRecord = {
      companyId,

      branchId:
        input.branchId ?? null,

      deviceCode:
        input.deviceCode,

      deviceName:
        input.deviceName,

      deviceType:
        input.deviceType,

      manufacturer:
        input.manufacturer ??
        null,

      modelNumber:
        input.modelNumber ??
        null,

      serialNumber:
        input.serialNumber ??
        null,

      ipAddress:
        input.ipAddress ??
        null,

      portNumber:
        input.portNumber ??
        null,

      physicalLocation:
        input.physicalLocation ??
        null,

      syncStatus:
        input.syncStatus ??
        null,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createAttendanceDeviceRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAttendanceDevice(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateAttendanceDevice(
  deviceId: string,
  input:
    UpdateAttendanceDeviceInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    UpdateAttendanceDeviceRecord = {
      ...(input.branchId !== undefined
        ? {
            branchId:
              input.branchId
          }
        : {}),

      ...(input.deviceCode !== undefined
        ? {
            deviceCode:
              input.deviceCode
          }
        : {}),

      ...(input.deviceName !== undefined
        ? {
            deviceName:
              input.deviceName
          }
        : {}),

      ...(input.deviceType !== undefined
        ? {
            deviceType:
              input.deviceType
          }
        : {}),

      ...(input.manufacturer !== undefined
        ? {
            manufacturer:
              input.manufacturer
          }
        : {}),

      ...(input.modelNumber !== undefined
        ? {
            modelNumber:
              input.modelNumber
          }
        : {}),

      ...(input.serialNumber !== undefined
        ? {
            serialNumber:
              input.serialNumber
          }
        : {}),

      ...(input.ipAddress !== undefined
        ? {
            ipAddress:
              input.ipAddress
          }
        : {}),

      ...(input.portNumber !== undefined
        ? {
            portNumber:
              input.portNumber
          }
        : {}),

      ...(input.physicalLocation !==
      undefined
        ? {
            physicalLocation:
              input.physicalLocation
          }
        : {}),

      ...(input.lastSyncAt !== undefined
        ? {
            lastSyncAt:
              input.lastSyncAt
          }
        : {}),

      ...(input.syncStatus !== undefined
        ? {
            syncStatus:
              input.syncStatus
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
      await updateAttendanceDeviceRecord(
        companyId,
        deviceId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance device was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_DEVICE_NOT_FOUND"
      });
    }

    return mapAttendanceDevice(
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
 * Biometric logs
 * =========================================================
 */

export async function createBiometricLog(
  input:
    CreateBiometricLogInput,
  auth: AuthContext
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  if (input.deviceId) {
    const device =
      await findAttendanceDeviceById(
        companyId,
        input.deviceId
      );

    if (
      !device ||
      !databaseBoolean(
        device.is_active
      )
    ) {
      throw new AppError({
        message:
          "Attendance device was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_DEVICE_NOT_FOUND"
      });
    }
  }

  if (input.employeeId) {
    const employee =
      await getEmployeeOrThrow(
        input.employeeId
      );

    assertEmployeeCompany(
      auth,
      employee
    );
  }

  const record:
    CreateBiometricLogRecord = {
      companyId,

      deviceId:
        input.deviceId ??
        null,

      employeeId:
        input.employeeId ??
        null,

      externalEmployeeCode:
        input.externalEmployeeCode ??
        null,

      punchTime:
        input.punchTime,

      punchType:
        input.punchType ??
        null,

      verificationMethod:
        input.verificationMethod ??
        null,

      latitude:
        input.latitude ??
        null,

      longitude:
        input.longitude ??
        null,

      sourceType:
        input.sourceType,

      rawPayload:
        serializeRawPayload(
          input.rawPayload
        )
    };

  const created =
    await createBiometricLogRecord(
      record
    );

  return mapBiometricLog(
    created
  );
}

export async function listBiometricLogs(
  query:
    BiometricLogListQuery,
  auth: AuthContext
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listBiometricLogRecords(
      companyId,
      {
        ...(query.employeeId !== undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.deviceId !== undefined
          ? {
              deviceId:
                query.deviceId
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

        ...(query.punchType !== undefined
          ? {
              punchType:
                query.punchType
            }
          : {}),

        ...(query.sourceType !== undefined
          ? {
              sourceType:
                query.sourceType
            }
          : {}),

        processingStatus:
          query.processingStatus,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    biometricLogs:
      result.records.map(
        mapBiometricLog
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function processBiometricLogs(
  input:
    ProcessBiometricLogsInput,
  auth: AuthContext
) {
  assertBiometricManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const logs =
    await listBiometricLogsForProcessing(
      companyId,
      input.biometricLogIds,
      input.maximumRecords,
      input.retryFailed
    );

  const results: Array<{
    biometricLogId: string;

    status:
      | "PROCESSED"
      | "FAILED";

    attendanceId?: string;

    resolvedPunchType?:
      | "CHECK_IN"
      | "CHECK_OUT";

    errorCode?: string;
  }> = [];

  for (const log of logs) {
    const biometricLogId =
      String(
        log.biometric_log_id
      );

    try {
      let employee:
        AttendanceEmployeeDatabaseRow | null =
          null;

      if (
        log.employee_id !== null
      ) {
        employee =
          await findAttendanceEmployeeById(
            String(
              log.employee_id
            )
          );
      } else if (
        log.external_employee_code
      ) {
        employee =
          await findAttendanceEmployeeByCode(
            companyId,
            log.external_employee_code
          );
      }

      if (
        !employee ||
        String(
          employee.company_id
        ) !== companyId
      ) {
        throw new Error(
          "BIOMETRIC_EMPLOYEE_NOT_FOUND"
        );
      }

      assertEmployeeActive(
        employee
      );

      const employeeId =
        String(
          employee.employee_id
        );

      const punchAt =
        requiredDateTimeIso(
          log.punch_time
        );

      const punchType =
        (
          log.punch_type ?? ""
        )
          .trim()
          .toUpperCase();

      const explicitCheckIn =
        [
          "IN",
          "CHECK_IN",
          "CHECKIN",
          "ENTRY"
        ].includes(
          punchType
        );

      const openRecord =
        explicitCheckIn
          ? null
          : await findOpenAttendanceRecordForPunch(
              companyId,
              employeeId,
              punchAt
            );

      const attendanceDate =
        openRecord
          ? requiredDateOnly(
              openRecord
                .attendance_date
            )
          : punchAt.slice(
              0,
              10
            );

      const setup =
        openRecord
          ? {
              policyId:
                nullableId(
                  openRecord.policy_id
                ),

              shiftId:
                nullableId(
                  openRecord.shift_id
                ),

              scheduleId:
                nullableId(
                  openRecord.schedule_id
                ),

              scheduledStartAt:
                dateTimeIso(
                  openRecord
                    .scheduled_start_at
                ),

              scheduledEndAt:
                dateTimeIso(
                  openRecord
                    .scheduled_end_at
                )
            }
          : await resolveAttendanceSetup(
              companyId,
              employee,
              attendanceDate,
              {}
            );

      const processed =
        await processBiometricPunchRecord(
          {
            companyId,
            biometricLogId,
            employeeId,
            attendanceDate,
            punchAt,

            punchType:
              log.punch_type,

            shiftId:
              setup.shiftId,

            scheduleId:
              setup.scheduleId,

            policyId:
              setup.policyId,

            scheduledStartAt:
              setup.scheduledStartAt,

            scheduledEndAt:
              setup.scheduledEndAt,

            location: null,

            latitude:
              nullableNumber(
                log.latitude
              ),

            longitude:
              nullableNumber(
                log.longitude
              ),

            attendanceSource:
              log.source_type
          }
        );

      results.push({
        biometricLogId,

        status:
          "PROCESSED",

        attendanceId:
          String(
            processed
              .attendanceRecord
              .attendance_id
          ),

        resolvedPunchType:
          processed
            .resolvedPunchType
      });
    } catch (error) {
      const errorCode =
        error instanceof Error
          ? error.message
          : "BIOMETRIC_PROCESSING_FAILED";

      await markBiometricLogFailed(
        companyId,
        biometricLogId,
        errorCode
      );

      results.push({
        biometricLogId,

        status:
          "FAILED",

        errorCode
      });
    }
  }

  return {
    requestedCount:
      logs.length,

    processedCount:
      results.filter(
        (result) =>
          result.status ===
          "PROCESSED"
      ).length,

    failedCount:
      results.filter(
        (result) =>
          result.status ===
          "FAILED"
      ).length,

    results
  };
}

/*
 * =========================================================
 * Attendance records
 * =========================================================
 */

export async function listAttendanceRecords(
  query:
    AttendanceRecordListQuery,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  assertAttendanceViewAccess(
    auth,
    query.employeeId
  );

  const result =
    await listAttendanceRecordRecords(
      companyId,
      {
        ...(query.employeeId !== undefined
          ? {
              employeeId:
                query.employeeId
            }
          : {}),

        ...(query.branchId !== undefined
          ? {
              branchId:
                query.branchId
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

        ...(query.statusCode !== undefined
          ? {
              statusCode:
                query.statusCode
            }
          : {}),

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

        ...(query.policyId !== undefined
          ? {
              policyId:
                query.policyId
            }
          : {}),

        ...(query.attendanceSource !==
        undefined
          ? {
              attendanceSource:
                query.attendanceSource
            }
          : {}),

        ...(query.search !== undefined
          ? {
              search:
                query.search
            }
          : {}),

        finalizationStatus:
          query.finalizationStatus,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    attendanceRecords:
      result.records.map(
        mapAttendanceRecord
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listEmployeeAttendance(
  employeeId: string,
  query:
    EmployeeAttendanceListQuery,
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

  assertAttendanceViewAccess(
    auth,
    employeeId
  );

  const result =
    await listEmployeeAttendanceRecordRecords(
      String(
        employee.company_id
      ),
      employeeId,
      {
        dateFrom:
          query.dateFrom,

        dateTo:
          query.dateTo,

        ...(query.statusCode !== undefined
          ? {
              statusCode:
                query.statusCode
            }
          : {}),

        finalizationStatus:
          query.finalizationStatus,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    attendanceRecords:
      result.records.map(
        mapAttendanceRecord
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getAttendanceRecord(
  attendanceId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const record =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  assertAttendanceViewAccess(
    auth,
    String(
      record.employee_id
    )
  );

  return mapAttendanceRecord(
    record
  );
}

export async function createAttendanceRecord(
  input:
    CreateAttendanceRecordInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAttendanceManageAccess(
    auth
  );

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

  await validateStatus(
    input.statusCode
  );

  const companyId =
    String(employee.company_id);

  const setup =
    await resolveAttendanceSetup(
      companyId,
      employee,
      input.attendanceDate,
      {
        ...(input.policyId !== undefined
          ? {
              policyId:
                input.policyId
            }
          : {}),

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

        ...(input.scheduledStartAt !==
        undefined
          ? {
              scheduledStartAt:
                input.scheduledStartAt
            }
          : {}),

        ...(input.scheduledEndAt !==
        undefined
          ? {
              scheduledEndAt:
                input.scheduledEndAt
            }
          : {})
      }
    );

  const manuallyModified =
    input.statusCode !==
      "ABSENT" &&
    (
      input.checkInAt === null ||
      input.checkInAt === undefined
    );

  const record:
    CreateAttendanceRecordRecord = {
      companyId,

      employeeId:
        input.employeeId,

      attendanceDate:
        input.attendanceDate,

      shiftId:
        setup.shiftId,

      scheduleId:
        setup.scheduleId,

      policyId:
        setup.policyId,

      scheduledStartAt:
        setup.scheduledStartAt,

      scheduledEndAt:
        setup.scheduledEndAt,

      checkInAt:
        input.checkInAt ??
        null,

      checkOutAt:
        input.checkOutAt ??
        null,

      statusCode:
        input.statusCode,

      attendanceSource:
        input.attendanceSource,

      checkInLocation:
        input.checkInLocation ??
        null,

      checkOutLocation:
        input.checkOutLocation ??
        null,

      checkInLatitude:
        input.checkInLatitude ??
        null,

      checkInLongitude:
        input.checkInLongitude ??
        null,

      checkOutLatitude:
        input.checkOutLatitude ??
        null,

      checkOutLongitude:
        input.checkOutLongitude ??
        null,

      notes:
        input.notes ??
        null,

      isManuallyModified:
        manuallyModified
    };

  try {
    const created =
      await createAttendanceRecordRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAttendanceRecord(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateAttendanceRecord(
  attendanceId: string,
  input:
    UpdateAttendanceRecordInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAttendanceManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const existing =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  if (input.statusCode) {
    await validateStatus(
      input.statusCode
    );
  }

  const employee =
    await getEmployeeOrThrow(
      String(
        existing.employee_id
      )
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  if (input.shiftId) {
    const shift =
      await findShiftById(
        companyId,
        input.shiftId
      );

    if (
      !shift ||
      !databaseBoolean(
        shift.is_active
      )
    ) {
      throw new AppError({
        message:
          "Shift was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_SHIFT_NOT_FOUND"
      });
    }
  }

  if (input.scheduleId) {
    const schedule =
      await findWorkScheduleById(
        companyId,
        input.scheduleId
      );

    if (
      !schedule ||
      !databaseBoolean(
        schedule.is_active
      )
    ) {
      throw new AppError({
        message:
          "Work schedule was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_SCHEDULE_NOT_FOUND"
      });
    }
  }

  if (input.policyId) {
    const policy =
      await findAttendancePolicyById(
        companyId,
        input.policyId
      );

    if (
      !policy ||
      !databaseBoolean(
        policy.is_active
      )
    ) {
      throw new AppError({
        message:
          "Attendance policy was not found or is inactive",

        statusCode: 422,

        code:
          "ATTENDANCE_POLICY_NOT_FOUND"
      });
    }
  }

  const record:
    UpdateAttendanceRecordRecord = {
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

      ...(input.policyId !== undefined
        ? {
            policyId:
              input.policyId
          }
        : {}),

      ...(input.scheduledStartAt !==
      undefined
        ? {
            scheduledStartAt:
              input.scheduledStartAt
          }
        : {}),

      ...(input.scheduledEndAt !==
      undefined
        ? {
            scheduledEndAt:
              input.scheduledEndAt
          }
        : {}),

      ...(input.checkInAt !== undefined
        ? {
            checkInAt:
              input.checkInAt
          }
        : {}),

      ...(input.checkOutAt !== undefined
        ? {
            checkOutAt:
              input.checkOutAt
          }
        : {}),

      ...(input.statusCode !== undefined
        ? {
            statusCode:
              input.statusCode,

            isManuallyModified:
              true
          }
        : {}),

      ...(input.attendanceSource !==
      undefined
        ? {
            attendanceSource:
              input.attendanceSource
          }
        : {}),

      ...(input.checkInLocation !==
      undefined
        ? {
            checkInLocation:
              input.checkInLocation
          }
        : {}),

      ...(input.checkOutLocation !==
      undefined
        ? {
            checkOutLocation:
              input.checkOutLocation
          }
        : {}),

      ...(input.checkInLatitude !==
      undefined
        ? {
            checkInLatitude:
              input.checkInLatitude
          }
        : {}),

      ...(input.checkInLongitude !==
      undefined
        ? {
            checkInLongitude:
              input.checkInLongitude
          }
        : {}),

      ...(input.checkOutLatitude !==
      undefined
        ? {
            checkOutLatitude:
              input.checkOutLatitude
          }
        : {}),

      ...(input.checkOutLongitude !==
      undefined
        ? {
            checkOutLongitude:
              input.checkOutLongitude
          }
        : {}),

      ...(input.notes !== undefined
        ? {
            notes:
              input.notes
          }
        : {})
    };

  try {
    const updated =
      await updateAttendanceRecordRecord(
        companyId,
        attendanceId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    return mapAttendanceRecord(
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
 * Check-in, check-out and finalization
 * =========================================================
 */

export async function checkInAttendance(
  attendanceId: string,
  input:
    AttendanceCheckInInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const record =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  const employeeId =
    String(
      record.employee_id
    );

  const ownRecord =
    isOwnEmployee(
      auth,
      employeeId
    );

  if (!ownRecord) {
    assertAttendanceManageAccess(
      auth
    );
  } else {
    await assertSelfAttendanceSource(
      companyId,
      record,
      input.attendanceSource
    );
  }

  try {
    const updated =
      await checkInAttendanceRecord(
        companyId,
        attendanceId,
        {
          checkInAt:
            input.checkInAt ??
            new Date().toISOString(),

          attendanceSource:
            input.attendanceSource,

          location:
            input.location ??
            null,

          latitude:
            input.latitude ??
            null,

          longitude:
            input.longitude ??
            null,

          notes:
            input.notes ??
            null,

          isManual: false
        },
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    return mapAttendanceRecord(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function checkOutAttendance(
  attendanceId: string,
  input:
    AttendanceCheckOutInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const record =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  const employeeId =
    String(
      record.employee_id
    );

  const ownRecord =
    isOwnEmployee(
      auth,
      employeeId
    );

  if (!ownRecord) {
    assertAttendanceManageAccess(
      auth
    );
  } else {
    await assertSelfAttendanceSource(
      companyId,
      record,
      input.attendanceSource
    );
  }

  try {
    const updated =
      await checkOutAttendanceRecord(
        companyId,
        attendanceId,
        {
          checkOutAt:
            input.checkOutAt ??
            new Date().toISOString(),

          attendanceSource:
            input.attendanceSource,

          location:
            input.location ??
            null,

          latitude:
            input.latitude ??
            null,

          longitude:
            input.longitude ??
            null,

          notes:
            input.notes ??
            null,

          isManual: false
        },
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    return mapAttendanceRecord(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function finalizeAttendance(
  attendanceId: string,
  input:
    FinalizeAttendanceInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertAttendanceFinalizeAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const finalized =
      await finalizeAttendanceRecordRepository(
        companyId,
        attendanceId,
        auth.userId,
        input.notes ?? null,
        createActor(auth),
        metadata
      );

    if (!finalized) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    return mapAttendanceRecord(
      finalized
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Attendance breaks
 * =========================================================
 */

export async function listAttendanceBreaks(
  attendanceId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const attendance =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  assertAttendanceViewAccess(
    auth,
    String(
      attendance.employee_id
    )
  );

  const records =
    await listAttendanceBreakRecords(
      companyId,
      attendanceId
    );

  return records.map(
    mapAttendanceBreak
  );
}

export async function startAttendanceBreak(
  attendanceId: string,
  input:
    StartAttendanceBreakInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const attendance =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  if (
    !isOwnEmployee(
      auth,
      String(
        attendance.employee_id
      )
    )
  ) {
    assertAttendanceManageAccess(
      auth
    );
  }

  try {
    const created =
      await startAttendanceBreakRecord(
        companyId,
        attendanceId,
        {
          breakType:
            input.breakType,

          breakStartAt:
            input.breakStartAt ??
            new Date().toISOString(),

          isPaid:
            input.isPaid,

          sourceType:
            input.sourceType,

          remarks:
            input.remarks ??
            null
        },
        createActor(auth),
        metadata
      );

    if (!created) {
      throw new AppError({
        message:
          "Attendance record was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_RECORD_NOT_FOUND"
      });
    }

    return mapAttendanceBreak(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function endAttendanceBreak(
  attendanceId: string,
  attendanceBreakId: string,
  input:
    EndAttendanceBreakInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const attendance =
    await getRecordOrThrow(
      companyId,
      attendanceId
    );

  if (
    !isOwnEmployee(
      auth,
      String(
        attendance.employee_id
      )
    )
  ) {
    assertAttendanceManageAccess(
      auth
    );
  }

  try {
    const updated =
      await endAttendanceBreakRecord(
        companyId,
        attendanceId,
        attendanceBreakId,
        {
          breakEndAt:
            input.breakEndAt ??
            new Date().toISOString(),

          remarks:
            input.remarks ??
            null
        },
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Attendance break was not found",

        statusCode: 404,

        code:
          "ATTENDANCE_BREAK_NOT_FOUND"
      });
    }

    return mapAttendanceBreak(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}
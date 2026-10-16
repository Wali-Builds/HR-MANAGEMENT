import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  AttendanceActor,
  AttendanceBreakDatabaseRow,
  AttendanceDeviceDatabaseRow,
  AttendanceEmployeeDatabaseRow,
  AttendancePolicyDatabaseRow,
  AttendanceRecordDatabaseRow,
  AttendanceStatusDatabaseRow,
  BiometricLogDatabaseRow,
  CreateAttendanceDeviceRecord,
  CreateAttendanceRecordRecord,
  CreateBiometricLogRecord,
  CreateEmployeeAttendancePolicyAssignmentRecord,
  EmployeeAttendancePolicyAssignmentDatabaseRow,
  EmployeeShiftAssignmentDatabaseRow,
  RequestMetadata,
  ShiftDatabaseRow,
  UpdateAttendanceDeviceRecord,
  UpdateAttendanceRecordRecord,
  WorkScheduleDatabaseRow,
  WorkScheduleDayDatabaseRow
} from "./attendance.types.js";

/*
 * =========================================================
 * Internal types
 * =========================================================
 */

interface LockedEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  branch_id:
    | string
    | number
    | bigint
    | null;
}

interface PolicyAssignmentPeriodRow {
  assignment_id:
    | string
    | number
    | bigint;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_current:
    | number
    | boolean;
}

interface LookupFilters {
  search?: string | undefined;
  includeInactive: boolean;
}

interface AttendanceDeviceListFilters {
  search?: string | undefined;
  branchId?: string | undefined;
  deviceType?: string | undefined;
  syncStatus?: string | undefined;

  includeInactive: boolean;

  page: number;
  pageSize: number;
}

interface BiometricLogListFilters {
  employeeId?: string | undefined;
  deviceId?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  punchType?: string | undefined;
  sourceType?: string | undefined;

  processingStatus:
    | "ALL"
    | "PROCESSED"
    | "UNPROCESSED"
    | "FAILED";

  page: number;
  pageSize: number;
}

interface PolicyAssignmentListFilters {
  status:
    | "ALL"
    | "CURRENT"
    | "HISTORICAL";
}

interface PaginatedResult<T> {
  records: T[];
  totalRecords: number;
}

interface CountDatabaseRow {
  total_records:
    | string
    | number
    | bigint;
}

interface BranchOwnershipRow {
  branch_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
}
interface AttendanceRecordListFilters {
  employeeId?: string | undefined;
  branchId?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  statusCode?: string | undefined;
  shiftId?: string | undefined;
  scheduleId?: string | undefined;
  policyId?: string | undefined;

  attendanceSource?: string | undefined;

  finalizationStatus:
    | "ALL"
    | "FINALIZED"
    | "UNFINALIZED";

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface EmployeeAttendanceRecordListFilters {
  dateFrom: string;
  dateTo: string;

  statusCode?: string | undefined;

  finalizationStatus:
    | "ALL"
    | "FINALIZED"
    | "UNFINALIZED";

  page: number;
  pageSize: number;
}

interface LockedAttendanceRecordRow {
  attendance_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  employee_id:
    | string
    | number
    | bigint;

  attendance_date:
    | Date
    | string;

  shift_id:
    | string
    | number
    | bigint
    | null;

  schedule_id:
    | string
    | number
    | bigint
    | null;

  policy_id:
    | string
    | number
    | bigint
    | null;

  scheduled_start_at:
    | Date
    | string
    | null;

  scheduled_end_at:
    | Date
    | string
    | null;

  check_in_at:
    | Date
    | string
    | null;

  check_out_at:
    | Date
    | string
    | null;

  status_code: string;
  attendance_source: string;

  notes: string | null;

  is_manually_modified:
    | number
    | boolean;

  is_finalized:
    | number
    | boolean;
}

interface LockedAttendanceBreakRow {
  break_id:
    | string
    | number
    | bigint;

  attendance_id:
    | string
    | number
    | bigint;

  break_type: string;

  break_start_at:
    | Date
    | string;

  break_end_at:
    | Date
    | string
    | null;

  duration_minutes:
    | string
    | number;

  is_paid:
    | number
    | boolean;

  source_type: string;
  remarks: string | null;
}

interface AttendanceCalculationContextRow {
  attendance_id:
    | string
    | number
    | bigint;

  status_code: string;

  scheduled_start_at:
    | Date
    | string
    | null;

  scheduled_end_at:
    | Date
    | string
    | null;

  check_in_at:
    | Date
    | string
    | null;

  check_out_at:
    | Date
    | string
    | null;

  is_manually_modified:
    | number
    | boolean;

  calculated_presence_minutes:
    | string
    | number;

  calculated_late_minutes:
    | string
    | number;

  calculated_early_departure_minutes:
    | string
    | number;

  policy_minimum_full_day_minutes:
    | string
    | number
    | null;

  policy_minimum_half_day_minutes:
    | string
    | number
    | null;

  policy_late_grace_minutes:
    | string
    | number
    | null;

  policy_early_departure_grace_minutes:
    | string
    | number
    | null;

  policy_overtime_enabled:
    | number
    | boolean
    | null;

  policy_overtime_after_minutes:
    | string
    | number
    | null;

  policy_minimum_overtime_minutes:
    | string
    | number
    | null;

  policy_maximum_overtime_minutes_day:
    | string
    | number
    | null;

  policy_deduct_break_time:
    | number
    | boolean
    | null;

  policy_require_checkout:
    | number
    | boolean
    | null;

  shift_expected_work_minutes:
    | string
    | number
    | null;

  shift_late_grace_minutes:
    | string
    | number
    | null;

  shift_early_departure_grace_minutes:
    | string
    | number
    | null;

  shift_overtime_after_minutes:
    | string
    | number
    | null;

  schedule_expected_work_minutes:
    | string
    | number
    | null;

  scheduled_duration_minutes:
    | string
    | number;
}

interface AttendanceBreakAggregateRow {
  total_break_minutes:
    | string
    | number
    | null;

  unpaid_break_minutes:
    | string
    | number
    | null;

  open_break_count:
    | string
    | number;
}

interface AttendanceStatusCandidateRow {
  status_code: string;

  is_payable:
    | number
    | boolean;
}

interface BiometricLogProcessingDatabaseRow {
  biometric_log_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  device_id:
    | string
    | number
    | bigint
    | null;

  employee_id:
    | string
    | number
    | bigint
    | null;

  external_employee_code:
    | string
    | null;

  punch_time:
    | Date
    | string;

  punch_type:
    | string
    | null;

  verification_method:
    | string
    | null;

  latitude:
    | string
    | number
    | null;

  longitude:
    | string
    | number
    | null;

  source_type: string;

  is_processed:
    | number
    | boolean;

  processing_error:
    | string
    | null;
}

export interface BiometricPunchProcessingResult {
  processingStatus:
    | "PROCESSED"
    | "ALREADY_PROCESSED";

  resolvedPunchType:
    | "CHECK_IN"
    | "CHECK_OUT";

  attendanceRecord:
    AttendanceRecordDatabaseRow;
}

/*
 * =========================================================
 * Shared helpers
 * =========================================================
 */

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (
        typeof currentValue ===
        "bigint"
      ) {
        return String(
          currentValue
        );
      }

      if (
        Buffer.isBuffer(
          currentValue
        )
      ) {
        return "[REDACTED_BINARY]";
      }

      return currentValue;
    }
  );
}

function databaseDateOnly(
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

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date
    .toISOString()
    .slice(0, 10);
}
function toDatabaseDateTime(
  value: string
): string {
  if (
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      "INVALID_ATTENDANCE_DATETIME"
    );
  }

  return parsedDate
    .toISOString()
    .slice(0, 19)
    .replace(
      "T",
      " "
    );
}

function databaseBooleanValue(
  value:
    | number
    | boolean
    | null
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function nullableNumberValue(
  value:
    | string
    | number
    | null
): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

function attendanceLogSummary(
  attendance:
    | AttendanceRecordDatabaseRow
    | LockedAttendanceRecordRow
) {
  return {
    attendanceId:
      String(
        attendance.attendance_id
      ),

    companyId:
      String(
        attendance.company_id
      ),

    employeeId:
      String(
        attendance.employee_id
      ),

    attendanceDate:
      databaseDateOnly(
        attendance.attendance_date
      ),

    shiftId:
      attendance.shift_id === null
        ? null
        : String(
            attendance.shift_id
          ),

    scheduleId:
      attendance.schedule_id === null
        ? null
        : String(
            attendance.schedule_id
          ),

    policyId:
      attendance.policy_id === null
        ? null
        : String(
            attendance.policy_id
          ),

    checkInAt:
      attendance.check_in_at,

    checkOutAt:
      attendance.check_out_at,

    statusCode:
      attendance.status_code,

    attendanceSource:
      attendance.attendance_source,

    isFinalized:
      databaseBooleanValue(
        attendance.is_finalized
      )
  };
}
function offsetFromPagination(
  page: number,
  pageSize: number
): number {
  return (
    page - 1
  ) * pageSize;
}

async function lockEmployeeRecord(
  connection: PoolConnection,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id,
            branch_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId
      ]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: AttendanceActor;

    actionName: string;
    tableName: string;
    recordId: string;

    oldValues?:
      | unknown
      | undefined;

    newValues?:
      | unknown
      | undefined;

    requestMethod: string;
    requestPath: string;

    metadata: RequestMetadata;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO activity_logs (
          company_id,
          user_id,
          module_name,
          action_name,
          table_name,
          record_id,
          old_values,
          new_values,
          request_method,
          request_path,
          ip_address,
          user_agent
      )
      VALUES (
          ?,
          ?,
          'attendance',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
      )
    `,
    [
      input.companyId,
      input.actor.userId,
      input.actionName,
      input.tableName,
      input.recordId,

      input.oldValues === undefined
        ? null
        : safeJson(
            input.oldValues
          ),

      input.newValues === undefined
        ? null
        : safeJson(
            input.newValues
          ),

      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

/*
 * =========================================================
 * Reusable SELECT statements
 * =========================================================
 */

const attendancePolicyAssignmentSelect = `
  SELECT
      eapa.assignment_id,
      eapa.employee_id,
      eapa.policy_id,

      ap.company_id,
      ap.policy_code,
      ap.policy_name,

      eapa.effective_from,
      eapa.effective_to,
      eapa.is_current,

      eapa.assigned_by_user_id,

      assigned_user.username
          AS assigned_by_username,

      assigned_user.full_name
          AS assigned_by_full_name,

      eapa.created_at,
      eapa.updated_at
  FROM employee_attendance_policy_assignments eapa
  INNER JOIN attendance_policies ap
      ON ap.policy_id =
         eapa.policy_id
  LEFT JOIN users assigned_user
      ON assigned_user.user_id =
         eapa.assigned_by_user_id
`;

const attendanceDeviceSelect = `
  SELECT
      ad.device_id,
      ad.company_id,
      ad.branch_id,

      b.branch_code,
      b.branch_name,

      ad.device_code,
      ad.device_name,
      ad.device_type,

      ad.manufacturer,
      ad.model_number,
      ad.serial_number,

      ad.ip_address,
      ad.port_number,

      ad.physical_location,

      ad.last_sync_at,
      ad.sync_status,

      ad.is_active,
      ad.deleted_at,

      ad.created_at,
      ad.updated_at
  FROM attendance_devices ad
  LEFT JOIN branches b
      ON b.branch_id =
         ad.branch_id
`;

const biometricLogSelect = `
  SELECT
      bl.biometric_log_id,
      bl.company_id,

      bl.device_id,
      ad.device_code,
      ad.device_name,

      bl.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      bl.external_employee_code,

      bl.punch_time,
      bl.punch_type,
      bl.verification_method,

      bl.latitude,
      bl.longitude,

      bl.source_type,

      bl.is_processed,
      bl.processing_error,
      bl.processed_at,

      bl.created_at
  FROM biometric_logs bl
  LEFT JOIN attendance_devices ad
      ON ad.device_id =
         bl.device_id
  LEFT JOIN employees e
      ON e.employee_id =
         bl.employee_id
`;
const attendanceRecordSelect = `
  SELECT
      ar.attendance_id,
      ar.company_id,
      ar.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      e.branch_id,
      b.branch_code,
      b.branch_name,

      ar.attendance_date,

      ar.shift_id,
      s.shift_code,
      s.shift_name,

      ar.schedule_id,
      ws.schedule_code,
      ws.schedule_name,

      ar.policy_id,
      ap.policy_code,
      ap.policy_name,

      ar.scheduled_start_at,
      ar.scheduled_end_at,

      ar.check_in_at,
      ar.check_out_at,

      ar.total_presence_minutes,
      ar.total_break_minutes,
      ar.total_work_minutes,
      ar.payable_minutes,

      ar.late_minutes,
      ar.early_departure_minutes,
      ar.overtime_minutes,

      ar.status_code,
      ast.status_name,

      ast.counts_as_present,
      ast.counts_as_absent,

      ast.is_payable
          AS status_is_payable,

      ar.attendance_source,

      ar.check_in_location,
      ar.check_out_location,

      ar.check_in_latitude,
      ar.check_in_longitude,

      ar.check_out_latitude,
      ar.check_out_longitude,

      ar.notes,

      ar.is_manually_modified,
      ar.is_finalized,

      ar.finalized_by_user_id,

      finalized_user.username
          AS finalized_by_username,

      finalized_user.full_name
          AS finalized_by_full_name,

      ar.finalized_at,

      (
        SELECT COUNT(*)
        FROM attendance_breaks ab_open
        WHERE ab_open.attendance_id =
              ar.attendance_id
          AND ab_open.break_end_at IS NULL
      ) AS open_break_count,

      (
        SELECT COUNT(*)
        FROM attendance_breaks ab_count
        WHERE ab_count.attendance_id =
              ar.attendance_id
      ) AS break_count,

      ar.created_at,
      ar.updated_at
  FROM attendance_records ar
  INNER JOIN employees e
      ON e.employee_id =
         ar.employee_id
  LEFT JOIN branches b
      ON b.branch_id =
         e.branch_id
  LEFT JOIN shifts s
      ON s.shift_id =
         ar.shift_id
  LEFT JOIN work_schedules ws
      ON ws.schedule_id =
         ar.schedule_id
  LEFT JOIN attendance_policies ap
      ON ap.policy_id =
         ar.policy_id
  INNER JOIN attendance_statuses ast
      ON ast.status_code =
         ar.status_code
  LEFT JOIN users finalized_user
      ON finalized_user.user_id =
         ar.finalized_by_user_id
`;

const attendanceBreakSelect = `
  SELECT
      ab.break_id,
      ab.attendance_id,

      ar.company_id,
      ar.employee_id,

      ab.break_type,
      ab.break_start_at,
      ab.break_end_at,
      ab.duration_minutes,

      ab.is_paid,
      ab.source_type,
      ab.remarks,

      ab.created_at,
      ab.updated_at
  FROM attendance_breaks ab
  INNER JOIN attendance_records ar
      ON ar.attendance_id =
         ab.attendance_id
`;

/*
 * =========================================================
 * Employee
 * =========================================================
 */

export async function findAttendanceEmployeeById(
  employeeId: string
): Promise<AttendanceEmployeeDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        -- edited by wali: Read branch from the employee's current assignment and status from its lookup table.
SELECT
            e.employee_id,
            e.company_id,
            ea.branch_id,
            e.employee_code,
            e.first_name,
            e.middle_name,
            e.last_name,
            es.status_code AS employment_status,
            e.is_active,
            e.deleted_at
        FROM employees e
        INNER JOIN employee_statuses es
            ON es.employee_status_id = e.employee_status_id
        LEFT JOIN employee_assignments ea
            ON ea.assignment_id = (
                SELECT ea2.assignment_id
                FROM employee_assignments ea2
                WHERE ea2.employee_id = e.employee_id
                  AND ea2.is_current = 1
                ORDER BY ea2.effective_from DESC, ea2.assignment_id DESC
                LIMIT 1
            )
        WHERE e.employee_id = ?
          AND e.deleted_at IS NULL
        LIMIT 1
      `,
      [
        employeeId
      ]
    );

  return (
    rows[0] as
      | AttendanceEmployeeDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Branch ownership
 * =========================================================
 */

export async function findAttendanceBranchById(
  companyId: string,
  branchId: string
): Promise<BranchOwnershipRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            branch_id,
            company_id
        FROM branches
        WHERE branch_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        branchId,
        companyId
      ]
    );

  return (
    rows[0] as
      | BranchOwnershipRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance statuses
 * =========================================================
 */

export async function listAttendanceStatusRecords(
  includeInactive: boolean
): Promise<AttendanceStatusDatabaseRow[]> {
  const conditions: string[] = [];

  if (!includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const rows =
    await databasePool.query(
      `
        SELECT
            status_code,
            status_name,
            description,
            counts_as_present,
            counts_as_absent,
            is_payable,
            is_active,
            created_at,
            updated_at
        FROM attendance_statuses
        ${whereClause}
        ORDER BY
            status_name ASC,
            status_code ASC
      `
    );

  return rows as
    AttendanceStatusDatabaseRow[];
}

export async function findAttendanceStatusByCode(
  statusCode: string
): Promise<AttendanceStatusDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            status_code,
            status_name,
            description,
            counts_as_present,
            counts_as_absent,
            is_payable,
            is_active,
            created_at,
            updated_at
        FROM attendance_statuses
        WHERE status_code = ?
        LIMIT 1
      `,
      [
        statusCode
      ]
    );

  return (
    rows[0] as
      | AttendanceStatusDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance policies
 * =========================================================
 */

export async function listAttendancePolicyRecords(
  companyId: string,
  filters: LookupFilters
): Promise<AttendancePolicyDatabaseRow[]> {
  const conditions: string[] = [
    "company_id = ?",
    "deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        policy_code LIKE ?
        OR policy_name LIKE ?
        OR description LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            policy_id,
            company_id,
            policy_code,
            policy_name,
            description,
            late_grace_minutes,
            early_departure_grace_minutes,
            minimum_full_day_minutes,
            minimum_half_day_minutes,
            automatic_absence,
            allow_manual_attendance,
            allow_remote_attendance,
            overtime_enabled,
            overtime_after_minutes,
            minimum_overtime_minutes,
            maximum_overtime_minutes_day,
            overtime_requires_approval,
            deduct_break_time,
            require_checkout,
            is_default,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM attendance_policies
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            is_default DESC,
            policy_name ASC,
            policy_id ASC
      `,
      parameters
    );

  return rows as
    AttendancePolicyDatabaseRow[];
}

export async function findAttendancePolicyById(
  companyId: string,
  policyId: string
): Promise<AttendancePolicyDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            policy_id,
            company_id,
            policy_code,
            policy_name,
            description,
            late_grace_minutes,
            early_departure_grace_minutes,
            minimum_full_day_minutes,
            minimum_half_day_minutes,
            automatic_absence,
            allow_manual_attendance,
            allow_remote_attendance,
            overtime_enabled,
            overtime_after_minutes,
            minimum_overtime_minutes,
            maximum_overtime_minutes_day,
            overtime_requires_approval,
            deduct_break_time,
            require_checkout,
            is_default,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM attendance_policies
        WHERE policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        policyId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyDatabaseRow
      | undefined
  ) ?? null;
}

export async function findDefaultAttendancePolicy(
  companyId: string
): Promise<AttendancePolicyDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            policy_id,
            company_id,
            policy_code,
            policy_name,
            description,
            late_grace_minutes,
            early_departure_grace_minutes,
            minimum_full_day_minutes,
            minimum_half_day_minutes,
            automatic_absence,
            allow_manual_attendance,
            allow_remote_attendance,
            overtime_enabled,
            overtime_after_minutes,
            minimum_overtime_minutes,
            maximum_overtime_minutes_day,
            overtime_requires_approval,
            deduct_break_time,
            require_checkout,
            is_default,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM attendance_policies
        WHERE company_id = ?
          AND deleted_at IS NULL
          AND is_active = 1
          AND is_default = 1
        ORDER BY
            policy_id ASC
        LIMIT 1
      `,
      [
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyDatabaseRow
      | undefined
  ) ?? null;
}
async function lockAttendanceRecord(
  connection: PoolConnection,
  companyId: string,
  attendanceId: string
): Promise<LockedAttendanceRecordRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            attendance_id,
            company_id,
            employee_id,
            attendance_date,
            shift_id,
            schedule_id,
            policy_id,
            scheduled_start_at,
            scheduled_end_at,
            check_in_at,
            check_out_at,
            status_code,
            attendance_source,
            notes,
            is_manually_modified,
            is_finalized
        FROM attendance_records
        WHERE attendance_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        attendanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedAttendanceRecordRow
      | undefined
  ) ?? null;
}

async function lockAttendanceBreak(
  connection: PoolConnection,
  attendanceId: string,
  breakId: string
): Promise<LockedAttendanceBreakRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            break_id,
            attendance_id,
            break_type,
            break_start_at,
            break_end_at,
            duration_minutes,
            is_paid,
            source_type,
            remarks
        FROM attendance_breaks
        WHERE break_id = ?
          AND attendance_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        breakId,
        attendanceId
      ]
    );

  return (
    rows[0] as
      | LockedAttendanceBreakRow
      | undefined
  ) ?? null;
}

async function selectAttendanceRecordUsingConnection(
  connection: PoolConnection,
  companyId: string,
  attendanceId: string
): Promise<AttendanceRecordDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendanceRecordSelect}
        WHERE ar.attendance_id = ?
          AND ar.company_id = ?
        LIMIT 1
      `,
      [
        attendanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceRecordDatabaseRow
      | undefined
  ) ?? null;
}

async function selectAttendanceBreakUsingConnection(
  connection: PoolConnection,
  companyId: string,
  attendanceId: string,
  breakId: string
): Promise<AttendanceBreakDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendanceBreakSelect}
        WHERE ab.break_id = ?
          AND ab.attendance_id = ?
          AND ar.company_id = ?
        LIMIT 1
      `,
      [
        breakId,
        attendanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceBreakDatabaseRow
      | undefined
  ) ?? null;
}

async function validateAttendanceChronology(
  connection: PoolConnection,
  attendanceId: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT
            scheduled_start_at,
            scheduled_end_at,
            check_in_at,
            check_out_at
        FROM attendance_records
        WHERE attendance_id = ?
        LIMIT 1
      `,
      [
        attendanceId
      ]
    );

  const row =
    rows[0] as
      | {
          scheduled_start_at:
            | Date
            | string
            | null;

          scheduled_end_at:
            | Date
            | string
            | null;

          check_in_at:
            | Date
            | string
            | null;

          check_out_at:
            | Date
            | string
            | null;
        }
      | undefined;

  if (!row) {
    throw new Error(
      "ATTENDANCE_RECORD_NOT_FOUND"
    );
  }

  if (
    row.scheduled_start_at !== null &&
    row.scheduled_end_at !== null &&
    new Date(
      row.scheduled_end_at
    ).getTime() <=
      new Date(
        row.scheduled_start_at
      ).getTime()
  ) {
    throw new Error(
      "INVALID_SCHEDULED_ATTENDANCE_PERIOD"
    );
  }

  if (
    row.check_in_at !== null &&
    row.check_out_at !== null &&
    new Date(
      row.check_out_at
    ).getTime() <
      new Date(
        row.check_in_at
      ).getTime()
  ) {
    throw new Error(
      "INVALID_ATTENDANCE_CHECK_OUT"
    );
  }
}

async function recalculateAttendanceRecord(
  connection: PoolConnection,
  attendanceId: string
): Promise<void> {
  const contextRows =
    await connection.query(
      `
        SELECT
            ar.attendance_id,
            ar.status_code,
            ar.scheduled_start_at,
            ar.scheduled_end_at,
            ar.check_in_at,
            ar.check_out_at,
            ar.is_manually_modified,

            CASE
              WHEN ar.check_in_at IS NOT NULL
               AND ar.check_out_at IS NOT NULL
              THEN GREATEST(
                TIMESTAMPDIFF(
                  MINUTE,
                  ar.check_in_at,
                  ar.check_out_at
                ),
                0
              )
              ELSE 0
            END AS calculated_presence_minutes,

            CASE
              WHEN ar.check_in_at IS NOT NULL
               AND ar.scheduled_start_at IS NOT NULL
              THEN GREATEST(
                TIMESTAMPDIFF(
                  MINUTE,
                  ar.scheduled_start_at,
                  ar.check_in_at
                ),
                0
              )
              ELSE 0
            END AS calculated_late_minutes,

            CASE
              WHEN ar.check_out_at IS NOT NULL
               AND ar.scheduled_end_at IS NOT NULL
              THEN GREATEST(
                TIMESTAMPDIFF(
                  MINUTE,
                  ar.check_out_at,
                  ar.scheduled_end_at
                ),
                0
              )
              ELSE 0
            END AS calculated_early_departure_minutes,

            ap.minimum_full_day_minutes
                AS policy_minimum_full_day_minutes,

            ap.minimum_half_day_minutes
                AS policy_minimum_half_day_minutes,

            ap.late_grace_minutes
                AS policy_late_grace_minutes,

            ap.early_departure_grace_minutes
                AS policy_early_departure_grace_minutes,

            ap.overtime_enabled
                AS policy_overtime_enabled,

            ap.overtime_after_minutes
                AS policy_overtime_after_minutes,

            ap.minimum_overtime_minutes
                AS policy_minimum_overtime_minutes,

            ap.maximum_overtime_minutes_day
                AS policy_maximum_overtime_minutes_day,

            ap.deduct_break_time
                AS policy_deduct_break_time,

            ap.require_checkout
                AS policy_require_checkout,

            s.expected_work_minutes
                AS shift_expected_work_minutes,

            s.late_grace_minutes
                AS shift_late_grace_minutes,

            s.early_departure_grace_minutes
                AS shift_early_departure_grace_minutes,

            s.overtime_after_minutes
                AS shift_overtime_after_minutes,

            wsd.expected_work_minutes
                AS schedule_expected_work_minutes,

            CASE
              WHEN ar.scheduled_start_at IS NOT NULL
               AND ar.scheduled_end_at IS NOT NULL
              THEN GREATEST(
                TIMESTAMPDIFF(
                  MINUTE,
                  ar.scheduled_start_at,
                  ar.scheduled_end_at
                ),
                0
              )
              ELSE 0
            END AS scheduled_duration_minutes

        FROM attendance_records ar
        LEFT JOIN attendance_policies ap
            ON ap.policy_id =
               ar.policy_id
        LEFT JOIN shifts s
            ON s.shift_id =
               ar.shift_id
        LEFT JOIN work_schedule_days wsd
            ON wsd.schedule_id =
               ar.schedule_id
           AND wsd.day_of_week =
               WEEKDAY(
                 ar.attendance_date
               ) + 1
        WHERE ar.attendance_id = ?
        LIMIT 1
      `,
      [
        attendanceId
      ]
    );

  const context =
    contextRows[0] as
      | AttendanceCalculationContextRow
      | undefined;

  if (!context) {
    throw new Error(
      "ATTENDANCE_RECORD_NOT_FOUND"
    );
  }

  const breakRows =
    await connection.query(
      `
        SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN break_end_at IS NOT NULL
                  THEN duration_minutes
                  ELSE 0
                END
              ),
              0
            ) AS total_break_minutes,

            COALESCE(
              SUM(
                CASE
                  WHEN break_end_at IS NOT NULL
                   AND is_paid = 0
                  THEN duration_minutes
                  ELSE 0
                END
              ),
              0
            ) AS unpaid_break_minutes,

            COALESCE(
              SUM(
                CASE
                  WHEN break_end_at IS NULL
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS open_break_count
        FROM attendance_breaks
        WHERE attendance_id = ?
      `,
      [
        attendanceId
      ]
    );

  const breakAggregate =
    breakRows[0] as
      | AttendanceBreakAggregateRow
      | undefined;

  const totalBreakMinutes =
    Number(
      breakAggregate
        ?.total_break_minutes ?? 0
    );

  const unpaidBreakMinutes =
    Number(
      breakAggregate
        ?.unpaid_break_minutes ?? 0
    );

  const presenceMinutes =
    Number(
      context
        .calculated_presence_minutes
    );

  const deductBreakTime =
    databaseBooleanValue(
      context
        .policy_deduct_break_time
    );

  const deductedBreakMinutes =
    deductBreakTime
      ? unpaidBreakMinutes
      : 0;

  const totalWorkMinutes =
    Math.max(
      0,
      presenceMinutes -
        deductedBreakMinutes
    );

  const scheduleExpectedMinutes =
    Number(
      context
        .schedule_expected_work_minutes ??
      0
    );

  const shiftExpectedMinutes =
    Number(
      context
        .shift_expected_work_minutes ??
      0
    );

  const scheduledDurationMinutes =
    Number(
      context
        .scheduled_duration_minutes ??
      0
    );

  const policyFullDayMinutes =
    Number(
      context
        .policy_minimum_full_day_minutes ??
      480
    );

  const policyHalfDayMinutes =
    Number(
      context
        .policy_minimum_half_day_minutes ??
      Math.floor(
        policyFullDayMinutes / 2
      )
    );

  const expectedWorkMinutes =
    scheduleExpectedMinutes > 0
      ? scheduleExpectedMinutes
      : shiftExpectedMinutes > 0
        ? shiftExpectedMinutes
        : scheduledDurationMinutes > 0
          ? scheduledDurationMinutes
          : policyFullDayMinutes;

  const lateGraceMinutes =
    Math.max(
      Number(
        context
          .policy_late_grace_minutes ??
        0
      ),
      Number(
        context
          .shift_late_grace_minutes ??
        0
      )
    );

  const earlyGraceMinutes =
    Math.max(
      Number(
        context
          .policy_early_departure_grace_minutes ??
        0
      ),
      Number(
        context
          .shift_early_departure_grace_minutes ??
        0
      )
    );

  const lateMinutes =
    Math.max(
      0,
      Number(
        context
          .calculated_late_minutes
      ) - lateGraceMinutes
    );

  const earlyDepartureMinutes =
    Math.max(
      0,
      Number(
        context
          .calculated_early_departure_minutes
      ) - earlyGraceMinutes
    );

  let overtimeMinutes = 0;

  if (
    databaseBooleanValue(
      context
        .policy_overtime_enabled
    )
  ) {
    const overtimeAfterMinutes =
      Math.max(
        Number(
          context
            .policy_overtime_after_minutes ??
          0
        ),
        Number(
          context
            .shift_overtime_after_minutes ??
          0
        )
      );

    const rawOvertimeMinutes =
      Math.max(
        0,
        totalWorkMinutes -
          expectedWorkMinutes -
          overtimeAfterMinutes
      );

    const minimumOvertimeMinutes =
      Number(
        context
          .policy_minimum_overtime_minutes ??
        0
      );

    overtimeMinutes =
      rawOvertimeMinutes >=
      minimumOvertimeMinutes
        ? rawOvertimeMinutes
        : 0;

    const maximumOvertimeMinutes =
      nullableNumberValue(
        context
          .policy_maximum_overtime_minutes_day
      );

    if (
      maximumOvertimeMinutes !== null
    ) {
      overtimeMinutes =
        Math.min(
          overtimeMinutes,
          maximumOvertimeMinutes
        );
    }
  }

  const statusRows =
    await connection.query(
      `
        SELECT
            status_code,
            is_payable
        FROM attendance_statuses
        WHERE is_active = 1
      `
    ) as AttendanceStatusCandidateRow[];

  const statusMap =
    new Map<
      string,
      AttendanceStatusCandidateRow
    >();

  for (const status of statusRows) {
    statusMap.set(
      status.status_code,
      status
    );
  }

  const chooseStatus = (
    candidates: string[],
    fallback: string
  ): string => {
    for (
      const candidate
      of candidates
    ) {
      if (
        statusMap.has(
          candidate
        )
      ) {
        return candidate;
      }
    }

    return fallback;
  };

  let statusCode =
    context.status_code;

  if (
    !databaseBooleanValue(
      context
        .is_manually_modified
    )
  ) {
    if (
      context.check_in_at === null
    ) {
      statusCode =
        chooseStatus(
          [
            "ABSENT"
          ],
          statusCode
        );
    } else if (
      context.check_out_at === null
    ) {
      const requireCheckout =
        databaseBooleanValue(
          context
            .policy_require_checkout
        );

      statusCode =
        requireCheckout
          ? chooseStatus(
              [
                "INCOMPLETE",
                "PRESENT"
              ],
              statusCode
            )
          : chooseStatus(
              [
                "PRESENT"
              ],
              statusCode
            );
    } else if (
      totalWorkMinutes >=
      policyFullDayMinutes
    ) {
      statusCode =
        chooseStatus(
          [
            "PRESENT"
          ],
          statusCode
        );
    } else if (
      totalWorkMinutes >=
      policyHalfDayMinutes
    ) {
      statusCode =
        chooseStatus(
          [
            "HALF_DAY",
            "PRESENT"
          ],
          statusCode
        );
    } else {
      statusCode =
        chooseStatus(
          [
            "ABSENT"
          ],
          statusCode
        );
    }
  }

  const selectedStatus =
    statusMap.get(
      statusCode
    );

  const statusIsPayable =
    selectedStatus
      ? databaseBooleanValue(
          selectedStatus.is_payable
        )
      : false;

  let payableMinutes = 0;

  if (statusIsPayable) {
    if (
      totalWorkMinutes > 0
    ) {
      payableMinutes =
        totalWorkMinutes;
    } else if (
      context.check_in_at === null
    ) {
      /*
       * Supports payable non-working
       * statuses such as paid leave.
       */
      payableMinutes =
        expectedWorkMinutes;
    }
  }

  await connection.query(
    `
      UPDATE attendance_records
      SET
          total_presence_minutes = ?,
          total_break_minutes = ?,
          total_work_minutes = ?,
          payable_minutes = ?,
          late_minutes = ?,
          early_departure_minutes = ?,
          overtime_minutes = ?,
          status_code = ?
      WHERE attendance_id = ?
    `,
    [
      presenceMinutes,
      totalBreakMinutes,
      totalWorkMinutes,
      payableMinutes,
      lateMinutes,
      earlyDepartureMinutes,
      overtimeMinutes,
      statusCode,
      attendanceId
    ]
  );
}
export async function listAttendanceRecordRecords(
  companyId: string,
  filters: AttendanceRecordListFilters
): Promise<
  PaginatedResult<
    AttendanceRecordDatabaseRow
  >
> {
  const conditions: string[] = [
    "ar.company_id = ?",
    "e.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "ar.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.branchId) {
    conditions.push(
      "e.branch_id = ?"
    );

    parameters.push(
      filters.branchId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "ar.attendance_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "ar.attendance_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (filters.statusCode) {
    conditions.push(
      "ar.status_code = ?"
    );

    parameters.push(
      filters.statusCode
    );
  }

  if (filters.shiftId) {
    conditions.push(
      "ar.shift_id = ?"
    );

    parameters.push(
      filters.shiftId
    );
  }

  if (filters.scheduleId) {
    conditions.push(
      "ar.schedule_id = ?"
    );

    parameters.push(
      filters.scheduleId
    );
  }

  if (filters.policyId) {
    conditions.push(
      "ar.policy_id = ?"
    );

    parameters.push(
      filters.policyId
    );
  }

  if (filters.attendanceSource) {
    conditions.push(
      "ar.attendance_source = ?"
    );

    parameters.push(
      filters.attendanceSource
    );
  }

  if (
    filters.finalizationStatus ===
    "FINALIZED"
  ) {
    conditions.push(
      "ar.is_finalized = 1"
    );
  }

  if (
    filters.finalizationStatus ===
    "UNFINALIZED"
  ) {
    conditions.push(
      "ar.is_finalized = 0"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR b.branch_code LIKE ?
        OR b.branch_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM attendance_records ar
        INNER JOIN employees e
            ON e.employee_id =
               ar.employee_id
        LEFT JOIN branches b
            ON b.branch_id =
               e.branch_id
        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    countRow
      ? Number(
          countRow.total_records
        )
      : 0;

  const rows =
    await databasePool.query(
      `
        ${attendanceRecordSelect}
        WHERE ${whereClause}
        ORDER BY
            ar.attendance_date DESC,
            e.employee_code ASC,
            ar.attendance_id DESC
        LIMIT ?
        OFFSET ?
      `,
      [
        ...parameters,
        filters.pageSize,
        offsetFromPagination(
          filters.page,
          filters.pageSize
        )
      ]
    );

  return {
    records:
      rows as
        AttendanceRecordDatabaseRow[],

    totalRecords
  };
}
export async function createAttendanceRecordRecord(
  input: CreateAttendanceRecordRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceRecordDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(
        employee.company_id
      ) !== input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO attendance_records (
              company_id,
              employee_id,
              attendance_date,
              shift_id,
              schedule_id,
              policy_id,
              scheduled_start_at,
              scheduled_end_at,
              check_in_at,
              check_out_at,
              total_presence_minutes,
              total_break_minutes,
              total_work_minutes,
              payable_minutes,
              late_minutes,
              early_departure_minutes,
              overtime_minutes,
              status_code,
              attendance_source,
              check_in_location,
              check_out_location,
              check_in_latitude,
              check_in_longitude,
              check_out_latitude,
              check_out_longitude,
              notes,
              is_manually_modified,
              is_finalized
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              0
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.attendanceDate,
          input.shiftId,
          input.scheduleId,
          input.policyId,

          input.scheduledStartAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.scheduledStartAt
              ),

          input.scheduledEndAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.scheduledEndAt
              ),

          input.checkInAt === null
            ? null
            : toDatabaseDateTime(
                input.checkInAt
              ),

          input.checkOutAt === null
            ? null
            : toDatabaseDateTime(
                input.checkOutAt
              ),

          input.statusCode,
          input.attendanceSource,

          input.checkInLocation,
          input.checkOutLocation,

          input.checkInLatitude,
          input.checkInLongitude,

          input.checkOutLatitude,
          input.checkOutLongitude,

          input.notes,

          input.isManuallyModified
            ? 1
            : 0
        ]
      );

    const attendanceId =
      String(
        insertResult.insertId
      );

    await validateAttendanceChronology(
      connection,
      attendanceId
    );

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    const created =
      await selectAttendanceRecordUsingConnection(
        connection,
        input.companyId,
        attendanceId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_RECORD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "attendance_record_created",

        tableName:
          "attendance_records",

        recordId:
          attendanceId,

        newValues:
          attendanceLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/records",

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function updateAttendanceRecordRecord(
  companyId: string,
  attendanceId: string,
  input: UpdateAttendanceRecordRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceRecordDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        existing.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(
        value
      );
    };

    if (input.shiftId !== undefined) {
      addUpdate(
        "shift_id",
        input.shiftId
      );
    }

    if (
      input.scheduleId !== undefined
    ) {
      addUpdate(
        "schedule_id",
        input.scheduleId
      );
    }

    if (input.policyId !== undefined) {
      addUpdate(
        "policy_id",
        input.policyId
      );
    }

    if (
      input.scheduledStartAt !==
      undefined
    ) {
      addUpdate(
        "scheduled_start_at",

        input.scheduledStartAt === null
          ? null
          : toDatabaseDateTime(
              input.scheduledStartAt
            )
      );
    }

    if (
      input.scheduledEndAt !==
      undefined
    ) {
      addUpdate(
        "scheduled_end_at",

        input.scheduledEndAt === null
          ? null
          : toDatabaseDateTime(
              input.scheduledEndAt
            )
      );
    }

    if (input.checkInAt !== undefined) {
      addUpdate(
        "check_in_at",

        input.checkInAt === null
          ? null
          : toDatabaseDateTime(
              input.checkInAt
            )
      );
    }

    if (
      input.checkOutAt !== undefined
    ) {
      addUpdate(
        "check_out_at",

        input.checkOutAt === null
          ? null
          : toDatabaseDateTime(
              input.checkOutAt
            )
      );
    }

    if (
      input.statusCode !== undefined
    ) {
      addUpdate(
        "status_code",
        input.statusCode
      );
    }

    if (
      input.attendanceSource !==
      undefined
    ) {
      addUpdate(
        "attendance_source",
        input.attendanceSource
      );
    }

    if (
      input.checkInLocation !==
      undefined
    ) {
      addUpdate(
        "check_in_location",
        input.checkInLocation
      );
    }

    if (
      input.checkOutLocation !==
      undefined
    ) {
      addUpdate(
        "check_out_location",
        input.checkOutLocation
      );
    }

    if (
      input.checkInLatitude !==
      undefined
    ) {
      addUpdate(
        "check_in_latitude",
        input.checkInLatitude
      );
    }

    if (
      input.checkInLongitude !==
      undefined
    ) {
      addUpdate(
        "check_in_longitude",
        input.checkInLongitude
      );
    }

    if (
      input.checkOutLatitude !==
      undefined
    ) {
      addUpdate(
        "check_out_latitude",
        input.checkOutLatitude
      );
    }

    if (
      input.checkOutLongitude !==
      undefined
    ) {
      addUpdate(
        "check_out_longitude",
        input.checkOutLongitude
      );
    }

    if (input.notes !== undefined) {
      addUpdate(
        "notes",
        input.notes
      );
    }

    if (
      input.isManuallyModified !==
      undefined
    ) {
      addUpdate(
        "is_manually_modified",
        input.isManuallyModified
          ? 1
          : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_ATTENDANCE_UPDATE_FIELDS"
      );
    }

    parameters.push(
      attendanceId,
      companyId
    );

    await connection.query(
      `
        UPDATE attendance_records
        SET ${assignments.join(", ")}
        WHERE attendance_id = ?
          AND company_id = ?
      `,
      parameters
    );

    await validateAttendanceChronology(
      connection,
      attendanceId
    );

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    const updated =
      await selectAttendanceRecordUsingConnection(
        connection,
        companyId,
        attendanceId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_RECORD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_record_updated",

        tableName:
          "attendance_records",

        recordId:
          attendanceId,

        oldValues:
          attendanceLogSummary(
            existing
          ),

        newValues:
          attendanceLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function checkInAttendanceRecord(
  companyId: string,
  attendanceId: string,
  input: {
    checkInAt: string;

    attendanceSource: string;

    location: string | null;

    latitude: number | null;
    longitude: number | null;

    notes: string | null;

    isManual: boolean;
  },
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceRecordDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        existing.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    if (
      existing.check_in_at !== null
    ) {
      throw new Error(
        "ATTENDANCE_ALREADY_CHECKED_IN"
      );
    }

    const checkInAt =
      toDatabaseDateTime(
        input.checkInAt
      );

    if (
      existing.check_out_at !== null &&
      new Date(
        checkInAt
      ).getTime() >
        new Date(
          existing.check_out_at
        ).getTime()
    ) {
      throw new Error(
        "CHECK_IN_AFTER_CHECK_OUT"
      );
    }

    await connection.query(
      `
        UPDATE attendance_records
        SET
            check_in_at = ?,
            attendance_source = ?,
            check_in_location = ?,
            check_in_latitude = ?,
            check_in_longitude = ?,

            notes =
              CASE
                WHEN ? IS NULL
                THEN notes
                WHEN notes IS NULL
                  OR TRIM(notes) = ''
                THEN ?
                ELSE CONCAT(
                  notes,
                  '\\n',
                  ?
                )
              END,

            is_manually_modified =
              CASE
                WHEN ? = 1
                THEN 1
                ELSE is_manually_modified
              END
        WHERE attendance_id = ?
          AND company_id = ?
      `,
      [
        checkInAt,
        input.attendanceSource,

        input.location,
        input.latitude,
        input.longitude,

        input.notes,
        input.notes,
        input.notes,

        input.isManual ? 1 : 0,

        attendanceId,
        companyId
      ]
    );

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    const updated =
      await selectAttendanceRecordUsingConnection(
        connection,
        companyId,
        attendanceId
      );

    if (!updated) {
      throw new Error(
        "CHECKED_IN_ATTENDANCE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_checked_in",

        tableName:
          "attendance_records",

        recordId:
          attendanceId,

        oldValues:
          attendanceLogSummary(
            existing
          ),

        newValues:
          attendanceLogSummary(
            updated
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}/check-in`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function checkOutAttendanceRecord(
  companyId: string,
  attendanceId: string,
  input: {
    checkOutAt: string;

    attendanceSource: string;

    location: string | null;

    latitude: number | null;
    longitude: number | null;

    notes: string | null;

    isManual: boolean;
  },
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceRecordDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        existing.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    if (
      existing.check_in_at === null
    ) {
      throw new Error(
        "ATTENDANCE_CHECK_IN_REQUIRED"
      );
    }

    if (
      existing.check_out_at !== null
    ) {
      throw new Error(
        "ATTENDANCE_ALREADY_CHECKED_OUT"
      );
    }

    const openBreakRows =
      await connection.query(
        `
          SELECT break_id
          FROM attendance_breaks
          WHERE attendance_id = ?
            AND break_end_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          attendanceId
        ]
      );

    if (
      openBreakRows.length > 0
    ) {
      throw new Error(
        "OPEN_ATTENDANCE_BREAK_EXISTS"
      );
    }

    const checkOutAt =
      toDatabaseDateTime(
        input.checkOutAt
      );

    if (
      new Date(
        checkOutAt
      ).getTime() <
        new Date(
          existing.check_in_at
        ).getTime()
    ) {
      throw new Error(
        "INVALID_ATTENDANCE_CHECK_OUT"
      );
    }

    await connection.query(
      `
        UPDATE attendance_records
        SET
            check_out_at = ?,
            attendance_source = ?,
            check_out_location = ?,
            check_out_latitude = ?,
            check_out_longitude = ?,

            notes =
              CASE
                WHEN ? IS NULL
                THEN notes
                WHEN notes IS NULL
                  OR TRIM(notes) = ''
                THEN ?
                ELSE CONCAT(
                  notes,
                  '\\n',
                  ?
                )
              END,

            is_manually_modified =
              CASE
                WHEN ? = 1
                THEN 1
                ELSE is_manually_modified
              END
        WHERE attendance_id = ?
          AND company_id = ?
      `,
      [
        checkOutAt,
        input.attendanceSource,

        input.location,
        input.latitude,
        input.longitude,

        input.notes,
        input.notes,
        input.notes,

        input.isManual ? 1 : 0,

        attendanceId,
        companyId
      ]
    );

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    const updated =
      await selectAttendanceRecordUsingConnection(
        connection,
        companyId,
        attendanceId
      );

    if (!updated) {
      throw new Error(
        "CHECKED_OUT_ATTENDANCE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_checked_out",

        tableName:
          "attendance_records",

        recordId:
          attendanceId,

        oldValues:
          attendanceLogSummary(
            existing
          ),

        newValues:
          attendanceLogSummary(
            updated
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}/check-out`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function listAttendanceBreakRecords(
  companyId: string,
  attendanceId: string
): Promise<AttendanceBreakDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        ${attendanceBreakSelect}
        WHERE ar.company_id = ?
          AND ab.attendance_id = ?
        ORDER BY
            ab.break_start_at ASC,
            ab.break_id ASC
      `,
      [
        companyId,
        attendanceId
      ]
    );

  return rows as
    AttendanceBreakDatabaseRow[];
}

export async function startAttendanceBreakRecord(
  companyId: string,
  attendanceId: string,
  input: {
    breakType: string;
    breakStartAt: string;

    isPaid: boolean;
    sourceType: string;

    remarks: string | null;
  },
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceBreakDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const attendance =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!attendance) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        attendance.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    if (
      attendance.check_in_at === null
    ) {
      throw new Error(
        "ATTENDANCE_CHECK_IN_REQUIRED"
      );
    }

    if (
      attendance.check_out_at !== null
    ) {
      throw new Error(
        "BREAK_AFTER_CHECK_OUT_NOT_ALLOWED"
      );
    }

    const openBreakRows =
      await connection.query(
        `
          SELECT break_id
          FROM attendance_breaks
          WHERE attendance_id = ?
            AND break_end_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          attendanceId
        ]
      );

    if (
      openBreakRows.length > 0
    ) {
      throw new Error(
        "OPEN_ATTENDANCE_BREAK_EXISTS"
      );
    }

    const breakStartAt =
      toDatabaseDateTime(
        input.breakStartAt
      );

    if (
      new Date(
        breakStartAt
      ).getTime() <
        new Date(
          attendance.check_in_at
        ).getTime()
    ) {
      throw new Error(
        "BREAK_BEFORE_CHECK_IN_NOT_ALLOWED"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO attendance_breaks (
              attendance_id,
              break_type,
              break_start_at,
              break_end_at,
              duration_minutes,
              is_paid,
              source_type,
              remarks
          )
          VALUES (
              ?,
              ?,
              ?,
              NULL,
              0,
              ?,
              ?,
              ?
          )
        `,
        [
          attendanceId,
          input.breakType,
          breakStartAt,
          input.isPaid ? 1 : 0,
          input.sourceType,
          input.remarks
        ]
      );

    const breakId =
      String(
        insertResult.insertId
      );

    const created =
      await selectAttendanceBreakUsingConnection(
        connection,
        companyId,
        attendanceId,
        breakId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_BREAK_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_break_started",

        tableName:
          "attendance_breaks",

        recordId:
          breakId,

        newValues: {
          breakId,
          attendanceId,
          breakType:
            input.breakType,

          breakStartAt,

          isPaid:
            input.isPaid,

          sourceType:
            input.sourceType
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}/breaks/start`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function endAttendanceBreakRecord(
  companyId: string,
  attendanceId: string,
  breakId: string,
  input: {
    breakEndAt: string;
    remarks: string | null;
  },
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceBreakDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const attendance =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!attendance) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        attendance.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    const existing =
      await lockAttendanceBreak(
        connection,
        attendanceId,
        breakId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.break_end_at !== null
    ) {
      throw new Error(
        "ATTENDANCE_BREAK_ALREADY_ENDED"
      );
    }

    const breakEndAt =
      toDatabaseDateTime(
        input.breakEndAt
      );

    if (
      new Date(
        breakEndAt
      ).getTime() <
        new Date(
          existing.break_start_at
        ).getTime()
    ) {
      throw new Error(
        "INVALID_ATTENDANCE_BREAK_END"
      );
    }

    if (
      attendance.check_out_at !== null &&
      new Date(
        breakEndAt
      ).getTime() >
        new Date(
          attendance.check_out_at
        ).getTime()
    ) {
      throw new Error(
        "BREAK_END_AFTER_CHECK_OUT"
      );
    }

    await connection.query(
      `
        UPDATE attendance_breaks
        SET
            break_end_at = ?,

            duration_minutes =
              GREATEST(
                TIMESTAMPDIFF(
                  MINUTE,
                  break_start_at,
                  ?
                ),
                0
              ),

            remarks =
              COALESCE(
                ?,
                remarks
              )
        WHERE break_id = ?
          AND attendance_id = ?
      `,
      [
        breakEndAt,
        breakEndAt,
        input.remarks,
        breakId,
        attendanceId
      ]
    );

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    const updated =
      await selectAttendanceBreakUsingConnection(
        connection,
        companyId,
        attendanceId,
        breakId
      );

    if (!updated) {
      throw new Error(
        "ENDED_ATTENDANCE_BREAK_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_break_ended",

        tableName:
          "attendance_breaks",

        recordId:
          breakId,

        oldValues: {
          breakId,
          attendanceId,

          breakStartAt:
            existing.break_start_at,

          breakEndAt: null
        },

        newValues: {
          breakId,
          attendanceId,

          breakStartAt:
            updated.break_start_at,

          breakEndAt:
            updated.break_end_at,

          durationMinutes:
            Number(
              updated.duration_minutes
            )
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}/breaks/${breakId}/end`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function finalizeAttendanceRecord(
  companyId: string,
  attendanceId: string,
  finalizedByUserId: string,
  notes: string | null,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceRecordDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendanceRecord(
        connection,
        companyId,
        attendanceId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      databaseBooleanValue(
        existing.is_finalized
      )
    ) {
      throw new Error(
        "ATTENDANCE_ALREADY_FINALIZED"
      );
    }

    const openBreakRows =
      await connection.query(
        `
          SELECT break_id
          FROM attendance_breaks
          WHERE attendance_id = ?
            AND break_end_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          attendanceId
        ]
      );

    if (
      openBreakRows.length > 0
    ) {
      throw new Error(
        "OPEN_ATTENDANCE_BREAK_EXISTS"
      );
    }

    const policyRows =
      await connection.query(
        `
          SELECT
              ap.require_checkout
          FROM attendance_records ar
          LEFT JOIN attendance_policies ap
              ON ap.policy_id =
                 ar.policy_id
          WHERE ar.attendance_id = ?
          LIMIT 1
        `,
        [
          attendanceId
        ]
      );

    const policy =
      policyRows[0] as
        | {
            require_checkout:
              | number
              | boolean
              | null;
          }
        | undefined;

    if (
      existing.check_in_at !== null &&
      existing.check_out_at === null &&
      databaseBooleanValue(
        policy?.require_checkout ??
        true
      )
    ) {
      throw new Error(
        "CHECK_OUT_REQUIRED_BEFORE_FINALIZATION"
      );
    }

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    await connection.query(
      `
        UPDATE attendance_records
        SET
            is_finalized = 1,
            finalized_by_user_id = ?,
            finalized_at =
                CURRENT_TIMESTAMP,

            notes =
              CASE
                WHEN ? IS NULL
                THEN notes
                WHEN notes IS NULL
                  OR TRIM(notes) = ''
                THEN ?
                ELSE CONCAT(
                  notes,
                  '\\n',
                  ?
                )
              END
        WHERE attendance_id = ?
          AND company_id = ?
      `,
      [
        finalizedByUserId,

        notes,
        notes,
        notes,

        attendanceId,
        companyId
      ]
    );

    const finalized =
      await selectAttendanceRecordUsingConnection(
        connection,
        companyId,
        attendanceId
      );

    if (!finalized) {
      throw new Error(
        "FINALIZED_ATTENDANCE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_record_finalized",

        tableName:
          "attendance_records",

        recordId:
          attendanceId,

        oldValues:
          attendanceLogSummary(
            existing
          ),

        newValues:
          attendanceLogSummary(
            finalized
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/records/${attendanceId}/finalize`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return finalized;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function findAttendanceEmployeeByCode(
  companyId: string,
  employeeCode: string
): Promise<AttendanceEmployeeDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        -- edited by wali: Keep code-based employee lookup aligned with normalized assignment and status tables.
SELECT
            e.employee_id,
            e.company_id,
            ea.branch_id,
            e.employee_code,
            e.first_name,
            e.middle_name,
            e.last_name,
            es.status_code AS employment_status,
            e.is_active,
            e.deleted_at
        FROM employees e
        INNER JOIN employee_statuses es
            ON es.employee_status_id = e.employee_status_id
        LEFT JOIN employee_assignments ea
            ON ea.assignment_id = (
                SELECT ea2.assignment_id
                FROM employee_assignments ea2
                WHERE ea2.employee_id = e.employee_id
                  AND ea2.is_current = 1
                ORDER BY ea2.effective_from DESC, ea2.assignment_id DESC
                LIMIT 1
            )
        WHERE e.company_id = ?
          AND e.employee_code = ?
          AND e.deleted_at IS NULL
        LIMIT 1
      `,
      [
        companyId,
        employeeCode
      ]
    );

  return (
    rows[0] as
      | AttendanceEmployeeDatabaseRow
      | undefined
  ) ?? null;
}
export async function findOpenAttendanceRecordForPunch(
  companyId: string,
  employeeId: string,
  punchAt: string
): Promise<AttendanceRecordDatabaseRow | null> {
  const normalizedPunchAt =
    toDatabaseDateTime(
      punchAt
    );

  const rows =
    await databasePool.query(
      `
        ${attendanceRecordSelect}
        WHERE ar.company_id = ?
          AND ar.employee_id = ?
          AND ar.is_finalized = 0
          AND ar.check_in_at IS NOT NULL
          AND ar.check_out_at IS NULL
          AND ar.check_in_at <= ?
          AND ? <= DATE_ADD(
            ar.check_in_at,
            INTERVAL 24 HOUR
          )
        ORDER BY
            ar.check_in_at DESC,
            ar.attendance_id DESC
        LIMIT 1
      `,
      [
        companyId,
        employeeId,
        normalizedPunchAt,
        normalizedPunchAt
      ]
    );

  return (
    rows[0] as
      | AttendanceRecordDatabaseRow
      | undefined
  ) ?? null;
}
export async function listBiometricLogsForProcessing(
  companyId: string,
  biometricLogIds:
    | string[]
    | undefined,
  maximumRecords: number,
  retryFailed: boolean
): Promise<
  BiometricLogProcessingDatabaseRow[]
> {
  const conditions: string[] = [
    "company_id = ?",
    "is_processed = 0"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!retryFailed) {
    conditions.push(
      "processing_error IS NULL"
    );
  }

  if (
    biometricLogIds &&
    biometricLogIds.length > 0
  ) {
    const placeholders =
      biometricLogIds
        .map(() => "?")
        .join(", ");

    conditions.push(`
      biometric_log_id IN (
        ${placeholders}
      )
    `);

    parameters.push(
      ...biometricLogIds
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            biometric_log_id,
            company_id,
            device_id,
            employee_id,
            external_employee_code,
            punch_time,
            punch_type,
            verification_method,
            latitude,
            longitude,
            source_type,
            is_processed,
            processing_error
        FROM biometric_logs
        WHERE ${conditions.join(
          " AND "
        )}
        ORDER BY
            punch_time ASC,
            biometric_log_id ASC
        LIMIT ?
      `,
      [
        ...parameters,
        maximumRecords
      ]
    );

  return rows as
    BiometricLogProcessingDatabaseRow[];
}
export async function processBiometricPunchRecord(
  input: {
    companyId: string;
    biometricLogId: string;
    employeeId: string;

    attendanceDate: string;
    punchAt: string;
    punchType: string | null;

    shiftId: string | null;
    scheduleId: string | null;
    policyId: string | null;

    scheduledStartAt:
      string | null;

    scheduledEndAt:
      string | null;

    location: string | null;

    latitude: number | null;
    longitude: number | null;

    attendanceSource: string;
  }
): Promise<BiometricPunchProcessingResult> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const logRows =
      await connection.query(
        `
          SELECT
              biometric_log_id,
              company_id,
              employee_id,
              is_processed
          FROM biometric_logs
          WHERE biometric_log_id = ?
            AND company_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.biometricLogId,
          input.companyId
        ]
      );

    const biometricLog =
      logRows[0] as
        | {
            biometric_log_id:
              | string
              | number
              | bigint;

            company_id:
              | string
              | number
              | bigint;

            employee_id:
              | string
              | number
              | bigint
              | null;

            is_processed:
              | number
              | boolean;
          }
        | undefined;

    if (!biometricLog) {
      throw new Error(
        "BIOMETRIC_LOG_NOT_FOUND"
      );
    }
    if (
  databaseBooleanValue(
    biometricLog.is_processed
  )
) {
  throw new Error(
    "BIOMETRIC_LOG_ALREADY_PROCESSED"
  );
}

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (
      !employee ||
      String(
        employee.company_id
      ) !== input.companyId
    ) {
      throw new Error(
        "BIOMETRIC_EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      biometricLog.employee_id !==
        null &&
      String(
        biometricLog.employee_id
      ) !== input.employeeId
    ) {
      throw new Error(
        "BIOMETRIC_EMPLOYEE_MISMATCH"
      );
    }

    const punchAt =
      toDatabaseDateTime(
        input.punchAt
      );

    let attendanceRows =
      await connection.query(
        `
          SELECT attendance_id
          FROM attendance_records
          WHERE company_id = ?
            AND employee_id = ?
            AND attendance_date = ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.companyId,
          input.employeeId,
          input.attendanceDate
        ]
      );

    let attendanceId:
      string;

    const existingAttendanceId =
      attendanceRows[0] as
        | {
            attendance_id:
              | string
              | number
              | bigint;
          }
        | undefined;

    if (existingAttendanceId) {
      attendanceId =
        String(
          existingAttendanceId
            .attendance_id
        );
    } else {
      const insertResult =
        await connection.query(
          `
            INSERT INTO attendance_records (
                company_id,
                employee_id,
                attendance_date,
                shift_id,
                schedule_id,
                policy_id,
                scheduled_start_at,
                scheduled_end_at,
                status_code,
                attendance_source,
                is_manually_modified,
                is_finalized
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'ABSENT',
                ?,
                0,
                0
            )
            ON DUPLICATE KEY UPDATE
                attendance_id =
                    LAST_INSERT_ID(
                      attendance_id
                    )
          `,
          [
            input.companyId,
            input.employeeId,
            input.attendanceDate,

            input.shiftId,
            input.scheduleId,
            input.policyId,

            input.scheduledStartAt ===
            null
              ? null
              : toDatabaseDateTime(
                  input.scheduledStartAt
                ),

            input.scheduledEndAt ===
            null
              ? null
              : toDatabaseDateTime(
                  input.scheduledEndAt
                ),

            input.attendanceSource
          ]
        );

      attendanceId =
        String(
          insertResult.insertId
        );

      attendanceRows =
        await connection.query(
          `
            SELECT attendance_id
            FROM attendance_records
            WHERE attendance_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [
            attendanceId
          ]
        );
    }

    const attendance =
      await lockAttendanceRecord(
        connection,
        input.companyId,
        attendanceId
      );

    if (!attendance) {
      throw new Error(
        "ATTENDANCE_RECORD_NOT_FOUND"
      );
    }

    if (
      databaseBooleanValue(
        attendance.is_finalized
      )
    ) {
      throw new Error(
        "FINALIZED_ATTENDANCE_IMMUTABLE"
      );
    }

    const normalizedPunchType =
      (
        input.punchType ?? ""
      )
        .trim()
        .toUpperCase();

    const checkInPunchTypes =
      new Set([
        "IN",
        "CHECK_IN",
        "CHECKIN",
        "ENTRY"
      ]);

    const checkOutPunchTypes =
      new Set([
        "OUT",
        "CHECK_OUT",
        "CHECKOUT",
        "EXIT"
      ]);

    let resolvedPunchType:
      | "CHECK_IN"
      | "CHECK_OUT";

    if (
      checkInPunchTypes.has(
        normalizedPunchType
      )
    ) {
      resolvedPunchType =
        "CHECK_IN";
    } else if (
      checkOutPunchTypes.has(
        normalizedPunchType
      )
    ) {
      resolvedPunchType =
        "CHECK_OUT";
    } else {
      resolvedPunchType =
        attendance.check_in_at === null ||
        attendance.check_out_at !== null
          ? "CHECK_IN"
          : "CHECK_OUT";
    }

    if (
      resolvedPunchType ===
      "CHECK_IN"
    ) {
      await connection.query(
        `
          UPDATE attendance_records
          SET
              check_in_at =
                CASE
                  WHEN check_in_at IS NULL
                    OR check_in_at > ?
                  THEN ?
                  ELSE check_in_at
                END,

              attendance_source = ?,

              check_in_location =
                COALESCE(
                  check_in_location,
                  ?
                ),

              check_in_latitude =
                COALESCE(
                  check_in_latitude,
                  ?
                ),

              check_in_longitude =
                COALESCE(
                  check_in_longitude,
                  ?
                )
          WHERE attendance_id = ?
        `,
        [
          punchAt,
          punchAt,

          input.attendanceSource,

          input.location,
          input.latitude,
          input.longitude,

          attendanceId
        ]
      );
    } else {
      if (
        attendance.check_in_at === null
      ) {
        throw new Error(
          "BIOMETRIC_CHECK_OUT_WITHOUT_CHECK_IN"
        );
      }

      if (
        new Date(
          punchAt
        ).getTime() <
          new Date(
            attendance.check_in_at
          ).getTime()
      ) {
        throw new Error(
          "INVALID_ATTENDANCE_CHECK_OUT"
        );
      }

      const openBreakRows =
        await connection.query(
          `
            SELECT break_id
            FROM attendance_breaks
            WHERE attendance_id = ?
              AND break_end_at IS NULL
            LIMIT 1
            FOR UPDATE
          `,
          [
            attendanceId
          ]
        );

      if (
        openBreakRows.length > 0
      ) {
        throw new Error(
          "OPEN_ATTENDANCE_BREAK_EXISTS"
        );
      }

      await connection.query(
        `
          UPDATE attendance_records
          SET
              check_out_at =
                CASE
                  WHEN check_out_at IS NULL
                    OR check_out_at < ?
                  THEN ?
                  ELSE check_out_at
                END,

              attendance_source = ?,

              check_out_location =
                COALESCE(
                  ?,
                  check_out_location
                ),

              check_out_latitude =
                COALESCE(
                  ?,
                  check_out_latitude
                ),

              check_out_longitude =
                COALESCE(
                  ?,
                  check_out_longitude
                )
          WHERE attendance_id = ?
        `,
        [
          punchAt,
          punchAt,

          input.attendanceSource,

          input.location,
          input.latitude,
          input.longitude,

          attendanceId
        ]
      );
    }

    await recalculateAttendanceRecord(
      connection,
      attendanceId
    );

    await connection.query(
      `
        UPDATE biometric_logs
        SET
            employee_id = ?,
            is_processed = 1,
            processing_error = NULL,
            processed_at =
                CURRENT_TIMESTAMP
        WHERE biometric_log_id = ?
          AND company_id = ?
      `,
      [
        input.employeeId,
        input.biometricLogId,
        input.companyId
      ]
    );

    const processedAttendance =
      await selectAttendanceRecordUsingConnection(
        connection,
        input.companyId,
        attendanceId
      );

    if (!processedAttendance) {
      throw new Error(
        "PROCESSED_ATTENDANCE_NOT_FOUND"
      );
    }

    await connection.commit();
    transactionStarted = false;

    return {
      processingStatus:
        databaseBooleanValue(
          biometricLog.is_processed
        )
          ? "ALREADY_PROCESSED"
          : "PROCESSED",

      resolvedPunchType,

      attendanceRecord:
        processedAttendance
    };
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export async function listEmployeeAttendanceRecordRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeAttendanceRecordListFilters
): Promise<
  PaginatedResult<
    AttendanceRecordDatabaseRow
  >
> {
  return listAttendanceRecordRecords(
    companyId,
    {
      employeeId,

      dateFrom:
        filters.dateFrom,

      dateTo:
        filters.dateTo,

      statusCode:
        filters.statusCode,

      finalizationStatus:
        filters.finalizationStatus,

      page:
        filters.page,

      pageSize:
        filters.pageSize
    }
  );
}

export async function findAttendanceRecordById(
  companyId: string,
  attendanceId: string
): Promise<AttendanceRecordDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendanceRecordSelect}
        WHERE ar.attendance_id = ?
          AND ar.company_id = ?
        LIMIT 1
      `,
      [
        attendanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceRecordDatabaseRow
      | undefined
  ) ?? null;
}

export async function findAttendanceRecordByEmployeeDate(
  companyId: string,
  employeeId: string,
  attendanceDate: string
): Promise<AttendanceRecordDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendanceRecordSelect}
        WHERE ar.company_id = ?
          AND ar.employee_id = ?
          AND ar.attendance_date = ?
        LIMIT 1
      `,
      [
        companyId,
        employeeId,
        attendanceDate
      ]
    );

  return (
    rows[0] as
      | AttendanceRecordDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Employee policy assignments
 * =========================================================
 */

export async function listEmployeeAttendancePolicyAssignmentRecords(
  employeeId: string,
  filters: PolicyAssignmentListFilters
): Promise<EmployeeAttendancePolicyAssignmentDatabaseRow[]> {
  const conditions: string[] = [
    "eapa.employee_id = ?"
  ];

  const parameters: unknown[] = [
    employeeId
  ];

  if (filters.status === "CURRENT") {
    conditions.push(
      "eapa.is_current = 1"
    );
  }

  if (
    filters.status ===
    "HISTORICAL"
  ) {
    conditions.push(
      "eapa.is_current = 0"
    );
  }

  const rows =
    await databasePool.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            eapa.is_current DESC,
            eapa.effective_from DESC,
            eapa.assignment_id DESC
      `,
      parameters
    );

  return rows as
    EmployeeAttendancePolicyAssignmentDatabaseRow[];
}

export async function findEffectiveAttendancePolicyAssignment(
  employeeId: string,
  attendanceDate: string
): Promise<EmployeeAttendancePolicyAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE eapa.employee_id = ?
          AND eapa.effective_from <= ?
          AND (
            eapa.effective_to IS NULL
            OR eapa.effective_to >= ?
          )
          AND ap.deleted_at IS NULL
          AND ap.is_active = 1
        ORDER BY
            eapa.effective_from DESC,
            eapa.assignment_id DESC
        LIMIT 1
      `,
      [
        employeeId,
        attendanceDate,
        attendanceDate
      ]
    );

  return (
    rows[0] as
      | EmployeeAttendancePolicyAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

async function closeOtherCurrentPolicyAssignments(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT
            assignment_id,
            effective_from,
            effective_to,
            is_current
        FROM employee_attendance_policy_assignments
        WHERE employee_id = ?
          AND is_current = 1
        FOR UPDATE
      `,
      [
        employeeId
      ]
    ) as PolicyAssignmentPeriodRow[];

  for (const row of rows) {
    const existingEffectiveFrom =
      databaseDateOnly(
        row.effective_from
      );

    if (
      !existingEffectiveFrom ||
      existingEffectiveFrom >=
        effectiveFrom
    ) {
      throw new Error(
        "ATTENDANCE_POLICY_CURRENT_DATE_CONFLICT"
      );
    }
  }

  if (rows.length === 0) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_attendance_policy_assignments
      SET
          effective_to =
              DATE_SUB(
                ?,
                INTERVAL 1 DAY
              ),

          is_current = 0
      WHERE employee_id = ?
        AND is_current = 1
    `,
    [
      effectiveFrom,
      employeeId
    ]
  );
}

async function attendancePolicyAssignmentOverlapExists(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  effectiveTo: string | null
): Promise<boolean> {
  const rows =
    await connection.query(
      `
        SELECT assignment_id
        FROM employee_attendance_policy_assignments
        WHERE employee_id = ?
          AND effective_from <=
              COALESCE(
                ?,
                '9999-12-31'
              )
          AND COALESCE(
                effective_to,
                '9999-12-31'
              ) >= ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId,
        effectiveTo,
        effectiveFrom
      ]
    );

  return rows.length > 0;
}

async function selectPolicyAssignmentUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  assignmentId: string
): Promise<EmployeeAttendancePolicyAssignmentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE eapa.employee_id = ?
          AND eapa.assignment_id = ?
        LIMIT 1
      `,
      [
        employeeId,
        assignmentId
      ]
    );

  return (
    rows[0] as
      | EmployeeAttendancePolicyAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

export async function assignEmployeeAttendancePolicyRecord(
  companyId: string,
  input: CreateEmployeeAttendancePolicyAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeAttendancePolicyAssignmentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(
        employee.company_id
      ) !== companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    const policyRows =
      await connection.query(
        `
          SELECT
              policy_id,
              company_id,
              is_active,
              deleted_at
          FROM attendance_policies
          WHERE policy_id = ?
            AND company_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.policyId,
          companyId
        ]
      );

    const policy =
      policyRows[0] as
        | {
            policy_id:
              | string
              | number
              | bigint;

            company_id:
              | string
              | number
              | bigint;

            is_active:
              | number
              | boolean;

            deleted_at:
              | Date
              | string
              | null;
          }
        | undefined;

    if (
      !policy ||
      policy.deleted_at !== null ||
      Number(
        policy.is_active
      ) !== 1
    ) {
      throw new Error(
        "ATTENDANCE_POLICY_NOT_FOUND"
      );
    }

    if (input.isCurrent) {
      await closeOtherCurrentPolicyAssignments(
        connection,
        input.employeeId,
        input.effectiveFrom
      );
    }

    const overlap =
      await attendancePolicyAssignmentOverlapExists(
        connection,
        input.employeeId,
        input.effectiveFrom,
        input.effectiveTo
      );

    if (overlap) {
      throw new Error(
        "ATTENDANCE_POLICY_PERIOD_OVERLAP"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_attendance_policy_assignments (
              employee_id,
              policy_id,
              effective_from,
              effective_to,
              is_current,
              assigned_by_user_id
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.employeeId,
          input.policyId,
          input.effectiveFrom,
          input.effectiveTo,
          input.isCurrent ? 1 : 0,
          input.assignedByUserId
        ]
      );

    const assignmentId =
      String(
        insertResult.insertId
      );

    const created =
      await selectPolicyAssignmentUsingConnection(
        connection,
        input.employeeId,
        assignmentId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "employee_attendance_policy_assigned",

        tableName:
          "employee_attendance_policy_assignments",

        recordId:
          assignmentId,

        newValues: {
          assignmentId,
          employeeId:
            input.employeeId,

          policyId:
            input.policyId,

          effectiveFrom:
            input.effectiveFrom,

          effectiveTo:
            input.effectiveTo,

          isCurrent:
            input.isCurrent
        },

        requestMethod:
          "PUT",

        requestPath:
          `/api/v1/employees/${input.employeeId}/attendance-policy`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Shifts
 * =========================================================
 */

export async function listShiftRecords(
  companyId: string,
  filters: LookupFilters
): Promise<ShiftDatabaseRow[]> {
  const conditions: string[] = [
    "s.company_id = ?",
    "s.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "s.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        s.shift_code LIKE ?
        OR s.shift_name LIKE ?
        OR s.description LIKE ?
        OR b.branch_code LIKE ?
        OR b.branch_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            s.shift_id,
            s.company_id,
            s.branch_id,

            b.branch_code,
            b.branch_name,

            s.shift_code,
            s.shift_name,
            s.description,

            s.start_time,
            s.end_time,

            s.crosses_midnight,
            s.is_flexible,

            s.break_minutes,
            s.expected_work_minutes,

            s.check_in_start_time,
            s.check_in_end_time,

            s.check_out_start_time,
            s.check_out_end_time,

            s.late_grace_minutes,
            s.early_departure_grace_minutes,
            s.overtime_after_minutes,

            s.is_active,
            s.deleted_at,

            s.created_at,
            s.updated_at
        FROM shifts s
        LEFT JOIN branches b
            ON b.branch_id =
               s.branch_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            s.shift_name ASC,
            s.shift_id ASC
      `,
      parameters
    );

  return rows as
    ShiftDatabaseRow[];
}

export async function findShiftById(
  companyId: string,
  shiftId: string
): Promise<ShiftDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            s.shift_id,
            s.company_id,
            s.branch_id,

            b.branch_code,
            b.branch_name,

            s.shift_code,
            s.shift_name,
            s.description,

            s.start_time,
            s.end_time,

            s.crosses_midnight,
            s.is_flexible,

            s.break_minutes,
            s.expected_work_minutes,

            s.check_in_start_time,
            s.check_in_end_time,

            s.check_out_start_time,
            s.check_out_end_time,

            s.late_grace_minutes,
            s.early_departure_grace_minutes,
            s.overtime_after_minutes,

            s.is_active,
            s.deleted_at,

            s.created_at,
            s.updated_at
        FROM shifts s
        LEFT JOIN branches b
            ON b.branch_id =
               s.branch_id
        WHERE s.shift_id = ?
          AND s.company_id = ?
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [
        shiftId,
        companyId
      ]
    );

  return (
    rows[0] as
      | ShiftDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Work schedules
 * =========================================================
 */

export async function listWorkScheduleRecords(
  companyId: string,
  filters: LookupFilters
): Promise<WorkScheduleDatabaseRow[]> {
  const conditions: string[] = [
    "ws.company_id = ?",
    "ws.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "ws.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ws.schedule_code LIKE ?
        OR ws.schedule_name LIKE ?
        OR ws.description LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            ws.schedule_id,
            ws.company_id,
            ws.schedule_code,
            ws.schedule_name,
            ws.description,
            ws.weekly_working_hours,
            ws.weekly_working_days,
            ws.is_default,
            ws.is_active,
            ws.deleted_at,

            (
              SELECT COUNT(*)
              FROM work_schedule_days wsd_count
              WHERE wsd_count.schedule_id =
                    ws.schedule_id
            ) AS schedule_day_count,

            ws.created_at,
            ws.updated_at
        FROM work_schedules ws
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            ws.is_default DESC,
            ws.schedule_name ASC,
            ws.schedule_id ASC
      `,
      parameters
    );

  return rows as
    WorkScheduleDatabaseRow[];
}

export async function findWorkScheduleById(
  companyId: string,
  scheduleId: string
): Promise<WorkScheduleDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            ws.schedule_id,
            ws.company_id,
            ws.schedule_code,
            ws.schedule_name,
            ws.description,
            ws.weekly_working_hours,
            ws.weekly_working_days,
            ws.is_default,
            ws.is_active,
            ws.deleted_at,

            (
              SELECT COUNT(*)
              FROM work_schedule_days wsd_count
              WHERE wsd_count.schedule_id =
                    ws.schedule_id
            ) AS schedule_day_count,

            ws.created_at,
            ws.updated_at
        FROM work_schedules ws
        WHERE ws.schedule_id = ?
          AND ws.company_id = ?
          AND ws.deleted_at IS NULL
        LIMIT 1
      `,
      [
        scheduleId,
        companyId
      ]
    );

  return (
    rows[0] as
      | WorkScheduleDatabaseRow
      | undefined
  ) ?? null;
}

export async function listWorkScheduleDayRecords(
  companyId: string,
  scheduleId?: string
): Promise<WorkScheduleDayDatabaseRow[]> {
  const conditions: string[] = [
    "ws.company_id = ?",
    "ws.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (scheduleId) {
    conditions.push(
      "wsd.schedule_id = ?"
    );

    parameters.push(
      scheduleId
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            wsd.schedule_day_id,
            wsd.schedule_id,
            ws.company_id,
            wsd.day_of_week,
            wsd.is_working_day,
            wsd.planned_start_time,
            wsd.planned_end_time,
            wsd.break_minutes,
            wsd.expected_work_minutes,
            wsd.crosses_midnight,
            wsd.created_at,
            wsd.updated_at
        FROM work_schedule_days wsd
        INNER JOIN work_schedules ws
            ON ws.schedule_id =
               wsd.schedule_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            wsd.schedule_id ASC,
            wsd.day_of_week ASC
      `,
      parameters
    );

  return rows as
    WorkScheduleDayDatabaseRow[];
}

/*
 * =========================================================
 * Effective shift assignment
 * =========================================================
 */

export async function findEffectiveShiftAssignment(
  employeeId: string,
  attendanceDate: string
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            esa.shift_assignment_id,
            esa.employee_id,

            s.company_id,

            esa.shift_id,
            s.shift_code,
            s.shift_name,

            esa.schedule_id,
            ws.schedule_code,
            ws.schedule_name,

            esa.effective_from,
            esa.effective_to,

            esa.assignment_type,
            esa.is_current,

            esa.assigned_by_user_id,

            assigned_user.username
                AS assigned_by_username,

            assigned_user.full_name
                AS assigned_by_full_name,

            esa.remarks,
            esa.created_at,
            esa.updated_at
        FROM employee_shift_assignments esa
        INNER JOIN shifts s
            ON s.shift_id =
               esa.shift_id
        LEFT JOIN work_schedules ws
            ON ws.schedule_id =
               esa.schedule_id
        LEFT JOIN users assigned_user
            ON assigned_user.user_id =
               esa.assigned_by_user_id
        WHERE esa.employee_id = ?
          AND esa.effective_from <= ?
          AND (
            esa.effective_to IS NULL
            OR esa.effective_to >= ?
          )
          AND s.deleted_at IS NULL
          AND s.is_active = 1
          AND (
            ws.schedule_id IS NULL
            OR (
              ws.deleted_at IS NULL
              AND ws.is_active = 1
            )
          )
        ORDER BY
            esa.effective_from DESC,
            esa.shift_assignment_id DESC
        LIMIT 1
      `,
      [
        employeeId,
        attendanceDate,
        attendanceDate
      ]
    );

  return (
    rows[0] as
      | EmployeeShiftAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance devices
 * =========================================================
 */

export async function listAttendanceDeviceRecords(
  companyId: string,
  filters: AttendanceDeviceListFilters
): Promise<
  PaginatedResult<
    AttendanceDeviceDatabaseRow
  >
> {
  const conditions: string[] = [
    "ad.company_id = ?",
    "ad.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "ad.is_active = 1"
    );
  }

  if (filters.branchId) {
    conditions.push(
      "ad.branch_id = ?"
    );

    parameters.push(
      filters.branchId
    );
  }

  if (filters.deviceType) {
    conditions.push(
      "ad.device_type = ?"
    );

    parameters.push(
      filters.deviceType
    );
  }

  if (filters.syncStatus) {
    conditions.push(
      "ad.sync_status = ?"
    );

    parameters.push(
      filters.syncStatus
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ad.device_code LIKE ?
        OR ad.device_name LIKE ?
        OR ad.device_type LIKE ?
        OR ad.manufacturer LIKE ?
        OR ad.model_number LIKE ?
        OR ad.serial_number LIKE ?
        OR ad.ip_address LIKE ?
        OR ad.physical_location LIKE ?
        OR b.branch_code LIKE ?
        OR b.branch_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM attendance_devices ad
        LEFT JOIN branches b
            ON b.branch_id =
               ad.branch_id
        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    countRow
      ? Number(
          countRow.total_records
        )
      : 0;

  const offset =
    offsetFromPagination(
      filters.page,
      filters.pageSize
    );

  const rows =
    await databasePool.query(
      `
        ${attendanceDeviceSelect}
        WHERE ${whereClause}
        ORDER BY
            ad.is_active DESC,
            ad.device_name ASC,
            ad.device_id ASC
        LIMIT ?
        OFFSET ?
      `,
      [
        ...parameters,
        filters.pageSize,
        offset
      ]
    );

  return {
    records:
      rows as
        AttendanceDeviceDatabaseRow[],

    totalRecords
  };
}

export async function findAttendanceDeviceById(
  companyId: string,
  deviceId: string
): Promise<AttendanceDeviceDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendanceDeviceSelect}
        WHERE ad.device_id = ?
          AND ad.company_id = ?
          AND ad.deleted_at IS NULL
        LIMIT 1
      `,
      [
        deviceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceDeviceDatabaseRow
      | undefined
  ) ?? null;
}

async function selectAttendanceDeviceUsingConnection(
  connection: PoolConnection,
  companyId: string,
  deviceId: string
): Promise<AttendanceDeviceDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendanceDeviceSelect}
        WHERE ad.device_id = ?
          AND ad.company_id = ?
          AND ad.deleted_at IS NULL
        LIMIT 1
      `,
      [
        deviceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceDeviceDatabaseRow
      | undefined
  ) ?? null;
}

export async function createAttendanceDeviceRecord(
  input: CreateAttendanceDeviceRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceDeviceDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (input.branchId !== null) {
      const branchRows =
        await connection.query(
          `
            SELECT branch_id
            FROM branches
            WHERE branch_id = ?
              AND company_id = ?
              AND deleted_at IS NULL
            LIMIT 1
            FOR UPDATE
          `,
          [
            input.branchId,
            input.companyId
          ]
        );

      if (branchRows.length === 0) {
        throw new Error(
          "ATTENDANCE_DEVICE_BRANCH_NOT_FOUND"
        );
      }
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO attendance_devices (
              company_id,
              branch_id,
              device_code,
              device_name,
              device_type,
              manufacturer,
              model_number,
              serial_number,
              ip_address,
              port_number,
              physical_location,
              sync_status,
              is_active
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.branchId,
          input.deviceCode,
          input.deviceName,
          input.deviceType,
          input.manufacturer,
          input.modelNumber,
          input.serialNumber,
          input.ipAddress,
          input.portNumber,
          input.physicalLocation,
          input.syncStatus,
          input.isActive ? 1 : 0
        ]
      );

    const deviceId =
      String(
        insertResult.insertId
      );

    const created =
      await selectAttendanceDeviceUsingConnection(
        connection,
        input.companyId,
        deviceId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_DEVICE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "attendance_device_created",

        tableName:
          "attendance_devices",

        recordId:
          deviceId,

        newValues: {
          deviceId,
          branchId:
            input.branchId,

          deviceCode:
            input.deviceCode,

          deviceName:
            input.deviceName,

          deviceType:
            input.deviceType,

          isActive:
            input.isActive
        },

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/devices",

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAttendanceDeviceRecord(
  companyId: string,
  deviceId: string,
  input: UpdateAttendanceDeviceRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceDeviceDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const lockRows =
      await connection.query(
        `
          SELECT
              device_id,
              company_id,
              branch_id,
              device_code,
              device_name,
              device_type,
              is_active
          FROM attendance_devices
          WHERE device_id = ?
            AND company_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          deviceId,
          companyId
        ]
      );
      

    const existing =
      lockRows[0] as
        | {
            device_id:
              | string
              | number
              | bigint;

            company_id:
              | string
              | number
              | bigint;

            branch_id:
              | string
              | number
              | bigint
              | null;

            device_code: string;
            device_name: string;
            device_type: string;

            is_active:
              | number
              | boolean;
          }
        | undefined;

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      input.branchId !== undefined &&
      input.branchId !== null
    ) {
      const branchRows =
        await connection.query(
          `
            SELECT branch_id
            FROM branches
            WHERE branch_id = ?
              AND company_id = ?
              AND deleted_at IS NULL
            LIMIT 1
            FOR UPDATE
          `,
          [
            input.branchId,
            companyId
          ]
        );

      if (branchRows.length === 0) {
        throw new Error(
          "ATTENDANCE_DEVICE_BRANCH_NOT_FOUND"
        );
      }
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(
        value
      );
    };

    if (input.branchId !== undefined) {
      addUpdate(
        "branch_id",
        input.branchId
      );
    }

    if (
      input.deviceCode !== undefined
    ) {
      addUpdate(
        "device_code",
        input.deviceCode
      );
    }

    if (
      input.deviceName !== undefined
    ) {
      addUpdate(
        "device_name",
        input.deviceName
      );
    }

    if (
      input.deviceType !== undefined
    ) {
      addUpdate(
        "device_type",
        input.deviceType
      );
    }

    if (
      input.manufacturer !== undefined
    ) {
      addUpdate(
        "manufacturer",
        input.manufacturer
      );
    }

    if (
      input.modelNumber !== undefined
    ) {
      addUpdate(
        "model_number",
        input.modelNumber
      );
    }

    if (
      input.serialNumber !== undefined
    ) {
      addUpdate(
        "serial_number",
        input.serialNumber
      );
    }

    if (
      input.ipAddress !== undefined
    ) {
      addUpdate(
        "ip_address",
        input.ipAddress
      );
    }

    if (
      input.portNumber !== undefined
    ) {
      addUpdate(
        "port_number",
        input.portNumber
      );
    }

    if (
      input.physicalLocation !==
      undefined
    ) {
      addUpdate(
        "physical_location",
        input.physicalLocation
      );
    }

    if (
      input.lastSyncAt !== undefined
    ) {
      addUpdate(
        "last_sync_at",
        input.lastSyncAt
      );
    }

    if (
      input.syncStatus !== undefined
    ) {
      addUpdate(
        "sync_status",
        input.syncStatus
      );
    }

    if (
      input.isActive !== undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_ATTENDANCE_DEVICE_UPDATE_FIELDS"
      );
    }

    parameters.push(
      deviceId,
      companyId
    );

    await connection.query(
      `
        UPDATE attendance_devices
        SET ${assignments.join(", ")}
        WHERE device_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    const updated =
      await selectAttendanceDeviceUsingConnection(
        connection,
        companyId,
        deviceId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_DEVICE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_device_updated",

        tableName:
          "attendance_devices",

        recordId:
          deviceId,

        oldValues: {
          deviceId,
          branchId:
            existing.branch_id ===
            null
              ? null
              : String(
                  existing.branch_id
                ),

          deviceCode:
            existing.device_code,

          deviceName:
            existing.device_name,

          deviceType:
            existing.device_type,

          isActive:
            Number(
              existing.is_active
            ) === 1
        },

        newValues: {
          deviceId,

          branchId:
            updated.branch_id === null
              ? null
              : String(
                  updated.branch_id
                ),

          deviceCode:
            updated.device_code,

          deviceName:
            updated.device_name,

          deviceType:
            updated.device_type,

          isActive:
            Number(
              updated.is_active
            ) === 1
        },

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/devices/${deviceId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Biometric logs
 * =========================================================
 */

export async function createBiometricLogRecord(
  input: CreateBiometricLogRecord
): Promise<BiometricLogDatabaseRow> {
  const insertResult =
    await databasePool.query(
      `
        INSERT INTO biometric_logs (
            company_id,
            device_id,
            employee_id,
            external_employee_code,
            punch_time,
            punch_type,
            verification_method,
            latitude,
            longitude,
            source_type,
            raw_payload,
            is_processed,
            processing_error,
            processed_at
        )
        VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            0,
            NULL,
            NULL
        )
      `,
      [
        input.companyId,
        input.deviceId,
        input.employeeId,
        input.externalEmployeeCode,
        toDatabaseDateTime(
        input.punchTime
        ),
        input.punchType,
        input.verificationMethod,
        input.latitude,
        input.longitude,
        input.sourceType,
        input.rawPayload
      ]
    );

  const biometricLogId =
    String(
      insertResult.insertId
    );

  const created =
    await findBiometricLogById(
      input.companyId,
      biometricLogId
    );

  if (!created) {
    throw new Error(
      "CREATED_BIOMETRIC_LOG_NOT_FOUND"
    );
  }

  return created;
}

export async function findBiometricLogById(
  companyId: string,
  biometricLogId: string
): Promise<BiometricLogDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${biometricLogSelect}
        WHERE bl.biometric_log_id = ?
          AND bl.company_id = ?
        LIMIT 1
      `,
      [
        biometricLogId,
        companyId
      ]
    );

  return (
    rows[0] as
      | BiometricLogDatabaseRow
      | undefined
  ) ?? null;
}

export async function listBiometricLogRecords(
  companyId: string,
  filters: BiometricLogListFilters
): Promise<
  PaginatedResult<
    BiometricLogDatabaseRow
  >
> {
  const conditions: string[] = [
    "bl.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "bl.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.deviceId) {
    conditions.push(
      "bl.device_id = ?"
    );

    parameters.push(
      filters.deviceId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "bl.punch_time >= ?"
    );

    parameters.push(
      `${filters.dateFrom} 00:00:00`
    );
  }

  if (filters.dateTo) {
    conditions.push(`
      bl.punch_time <
      DATE_ADD(
        ?,
        INTERVAL 1 DAY
      )
    `);

    parameters.push(
      `${filters.dateTo} 00:00:00`
    );
  }

  if (filters.punchType) {
    conditions.push(
      "bl.punch_type = ?"
    );

    parameters.push(
      filters.punchType
    );
  }

  if (filters.sourceType) {
    conditions.push(
      "bl.source_type = ?"
    );

    parameters.push(
      filters.sourceType
    );
  }

  if (
    filters.processingStatus ===
    "PROCESSED"
  ) {
    conditions.push(
      "bl.is_processed = 1"
    );
  }

  if (
    filters.processingStatus ===
    "UNPROCESSED"
  ) {
    conditions.push(
      "bl.is_processed = 0"
    );

    conditions.push(
      "bl.processing_error IS NULL"
    );
  }

  if (
    filters.processingStatus ===
    "FAILED"
  ) {
    conditions.push(
      "bl.is_processed = 0"
    );

    conditions.push(
      "bl.processing_error IS NOT NULL"
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM biometric_logs bl
        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    countRow
      ? Number(
          countRow.total_records
        )
      : 0;

  const offset =
    offsetFromPagination(
      filters.page,
      filters.pageSize
    );

  const rows =
    await databasePool.query(
      `
        ${biometricLogSelect}
        WHERE ${whereClause}
        ORDER BY
            bl.punch_time DESC,
            bl.biometric_log_id DESC
        LIMIT ?
        OFFSET ?
      `,
      [
        ...parameters,
        filters.pageSize,
        offset
      ]
    );

  return {
    records:
      rows as
        BiometricLogDatabaseRow[],

    totalRecords
  };
}

export async function markBiometricLogProcessed(
  companyId: string,
  biometricLogId: string
): Promise<boolean> {
  const result =
    await databasePool.query(
      `
        UPDATE biometric_logs
        SET
            is_processed = 1,
            processing_error = NULL,
            processed_at =
                CURRENT_TIMESTAMP
        WHERE biometric_log_id = ?
          AND company_id = ?
          AND is_processed = 0
      `,
      [
        biometricLogId,
        companyId
      ]
    );

  return Number(
    result.affectedRows
  ) > 0;
}

export async function markBiometricLogFailed(
  companyId: string,
  biometricLogId: string,
  processingError: string
): Promise<boolean> {
  const result =
    await databasePool.query(
      `
        UPDATE biometric_logs
        SET
            is_processed = 0,
            processing_error = ?,
            processed_at =
                CURRENT_TIMESTAMP
        WHERE biometric_log_id = ?
          AND company_id = ?
      `,
      [
        processingError.slice(
          0,
          500
        ),
        biometricLogId,
        companyId
      ]
    );

  return Number(
    result.affectedRows
  ) > 0;
}
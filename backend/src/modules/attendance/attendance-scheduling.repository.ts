import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  AttendanceActor,
  RequestMetadata
} from "./attendance.types.js";

import type {
  CreateEmployeeShiftAssignmentRecord,
  CreateShiftRecord,
  CreateWorkScheduleRecord,
  EmployeeShiftAssignmentDatabaseRow,
  ReplaceWorkScheduleDayRecord,
  ShiftDatabaseRow,
  UpdateEmployeeShiftAssignmentRecord,
  UpdateShiftRecord,
  UpdateWorkScheduleRecord,
  WorkScheduleDatabaseRow,
  WorkScheduleDayDatabaseRow
} from "./attendance-scheduling.types.js";

/*
 * =========================================================
 * Internal types
 * =========================================================
 */

interface CountDatabaseRow {
  total_records:
    | string
    | number
    | bigint;
}

interface InsertResult {
  insertId:
    | string
    | number
    | bigint;
}

interface LockedEmployeeRow {
  employee_id:
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

interface LockedBranchRow {
  branch_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  deleted_at:
    | Date
    | string
    | null;
}

interface LockedShiftRow {
  shift_id:
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

  shift_code: string;
  shift_name: string;
  description: string | null;

  start_time: string;
  end_time: string;

  crosses_midnight:
    | number
    | boolean;

  is_flexible:
    | number
    | boolean;

  break_minutes:
    | string
    | number;

  expected_work_minutes:
    | string
    | number;

  check_in_start_time:
    | string
    | null;

  check_in_end_time:
    | string
    | null;

  check_out_start_time:
    | string
    | null;

  check_out_end_time:
    | string
    | null;

  late_grace_minutes:
    | string
    | number;

  early_departure_grace_minutes:
    | string
    | number;

  overtime_after_minutes:
    | string
    | number;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;
}

interface LockedWorkScheduleRow {
  schedule_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  schedule_code: string;
  schedule_name: string;
  description: string | null;

  weekly_working_hours:
    | string
    | number
    | null;

  weekly_working_days:
    | string
    | number
    | null;

  is_default:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;
}

interface LockedShiftAssignmentRow {
  shift_assignment_id:
    | string
    | number
    | bigint;

  employee_id:
    | string
    | number
    | bigint;

  shift_id:
    | string
    | number
    | bigint;

  schedule_id:
    | string
    | number
    | bigint
    | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  assignment_type: string;

  is_current:
    | number
    | boolean;

  assigned_by_user_id:
    | string
    | number
    | bigint
    | null;

  remarks: string | null;
}

interface ShiftListFilters {
  branchId?: string | undefined;
  isActive?: boolean | undefined;
  includeInactive: boolean;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

interface WorkScheduleListFilters {
  isActive?: boolean | undefined;
  includeInactive: boolean;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

interface EmployeeShiftAssignmentListFilters {
  shiftId?: string | undefined;
  scheduleId?: string | undefined;
  assignmentType?: string | undefined;
  isCurrent?: boolean | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  page: number;
  pageSize: number;
}

interface PaginatedResult<T> {
  records: T[];
  totalRecords: number;
}

/*
 * =========================================================
 * Utility helpers
 * =========================================================
 */

function databaseBoolean(
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

function offsetFromPagination(
  page: number,
  pageSize: number
): number {
  return (
    page - 1
  ) * pageSize;
}

function safeJson(
  value: unknown
): string {
  const serialized =
    JSON.stringify(
      value,
      (
        _key,
        currentValue
      ) => {
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

  return serialized ?? "null";
}

function shiftLogSummary(
  shift:
    | ShiftDatabaseRow
    | LockedShiftRow
) {
  return {
    shiftId:
      String(
        shift.shift_id
      ),

    branchId:
      shift.branch_id === null
        ? null
        : String(
            shift.branch_id
          ),

    shiftCode:
      shift.shift_code,

    shiftName:
      shift.shift_name,

    startTime:
      shift.start_time,

    endTime:
      shift.end_time,

    crossesMidnight:
      databaseBoolean(
        shift.crosses_midnight
      ),

    isFlexible:
      databaseBoolean(
        shift.is_flexible
      ),

    expectedWorkMinutes:
      Number(
        shift.expected_work_minutes
      ),

    isActive:
      databaseBoolean(
        shift.is_active
      )
  };
}

function scheduleLogSummary(
  schedule:
    | WorkScheduleDatabaseRow
    | LockedWorkScheduleRow
) {
  return {
    scheduleId:
      String(
        schedule.schedule_id
      ),

    scheduleCode:
      schedule.schedule_code,

    scheduleName:
      schedule.schedule_name,

    weeklyWorkingHours:
      schedule.weekly_working_hours ===
      null
        ? null
        : Number(
            schedule.weekly_working_hours
          ),

    weeklyWorkingDays:
      schedule.weekly_working_days ===
      null
        ? null
        : Number(
            schedule.weekly_working_days
          ),

    isDefault:
      databaseBoolean(
        schedule.is_default
      ),

    isActive:
      databaseBoolean(
        schedule.is_active
      )
  };
}

function assignmentLogSummary(
  assignment:
    | EmployeeShiftAssignmentDatabaseRow
    | LockedShiftAssignmentRow
) {
  return {
    shiftAssignmentId:
      String(
        assignment.shift_assignment_id
      ),

    employeeId:
      String(
        assignment.employee_id
      ),

    shiftId:
      String(
        assignment.shift_id
      ),

    scheduleId:
      assignment.schedule_id === null
        ? null
        : String(
            assignment.schedule_id
          ),

    effectiveFrom:
      databaseDateOnly(
        assignment.effective_from
      ),

    effectiveTo:
      databaseDateOnly(
        assignment.effective_to
      ),

    assignmentType:
      assignment.assignment_type,

    isCurrent:
      databaseBoolean(
        assignment.is_current
      )
  };
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

const shiftSelect = `
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

      (
        SELECT COUNT(*)
        FROM employee_shift_assignments esa_count
        WHERE esa_count.shift_id =
              s.shift_id
      ) AS assignment_count,

      (
        SELECT COUNT(*)
        FROM employee_shift_assignments esa_current
        WHERE esa_current.shift_id =
              s.shift_id
          AND esa_current.is_current = 1
      ) AS current_assignment_count,

      s.created_at,
      s.updated_at

  FROM shifts s

  LEFT JOIN branches b
      ON b.branch_id =
         s.branch_id
`;

const workScheduleSelect = `
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

      (
        SELECT COUNT(*)
        FROM work_schedule_days wsd_working
        WHERE wsd_working.schedule_id =
              ws.schedule_id
          AND wsd_working.is_working_day = 1
      ) AS configured_working_day_count,

      (
        SELECT COUNT(*)
        FROM employee_shift_assignments esa_count
        WHERE esa_count.schedule_id =
              ws.schedule_id
      ) AS assignment_count,

      (
        SELECT COUNT(*)
        FROM employee_shift_assignments esa_current
        WHERE esa_current.schedule_id =
              ws.schedule_id
          AND esa_current.is_current = 1
      ) AS current_assignment_count,

      ws.created_at,
      ws.updated_at

  FROM work_schedules ws
`;

const workScheduleDaySelect = `
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
`;

const shiftAssignmentSelect = `
  SELECT
      esa.shift_assignment_id,

      e.company_id,
      esa.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      esa.shift_id,
      s.shift_code,
      s.shift_name,

      s.start_time
          AS shift_start_time,

      s.end_time
          AS shift_end_time,

      s.crosses_midnight
          AS shift_crosses_midnight,

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

  INNER JOIN employees e
      ON e.employee_id =
         esa.employee_id

  INNER JOIN shifts s
      ON s.shift_id =
         esa.shift_id

  LEFT JOIN work_schedules ws
      ON ws.schedule_id =
         esa.schedule_id

  LEFT JOIN users assigned_user
      ON assigned_user.user_id =
         esa.assigned_by_user_id
`;

/*
 * =========================================================
 * Locking and validation helpers
 * =========================================================
 */

async function lockEmployee(
  connection: PoolConnection,
  companyId: string,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id,
            is_active,
            deleted_at
        FROM employees
        WHERE employee_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function lockBranch(
  connection: PoolConnection,
  companyId: string,
  branchId: string
): Promise<LockedBranchRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            branch_id,
            company_id,
            deleted_at
        FROM branches
        WHERE branch_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        branchId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedBranchRow
      | undefined
  ) ?? null;
}

async function lockShift(
  connection: PoolConnection,
  companyId: string,
  shiftId: string
): Promise<LockedShiftRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            shift_id,
            company_id,
            branch_id,
            shift_code,
            shift_name,
            description,
            start_time,
            end_time,
            crosses_midnight,
            is_flexible,
            break_minutes,
            expected_work_minutes,
            check_in_start_time,
            check_in_end_time,
            check_out_start_time,
            check_out_end_time,
            late_grace_minutes,
            early_departure_grace_minutes,
            overtime_after_minutes,
            is_active,
            deleted_at
        FROM shifts
        WHERE shift_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        shiftId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedShiftRow
      | undefined
  ) ?? null;
}

async function lockWorkSchedule(
  connection: PoolConnection,
  companyId: string,
  scheduleId: string
): Promise<LockedWorkScheduleRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            schedule_id,
            company_id,
            schedule_code,
            schedule_name,
            description,
            weekly_working_hours,
            weekly_working_days,
            is_default,
            is_active,
            deleted_at
        FROM work_schedules
        WHERE schedule_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        scheduleId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedWorkScheduleRow
      | undefined
  ) ?? null;
}

async function lockShiftAssignment(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  shiftAssignmentId: string
): Promise<LockedShiftAssignmentRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            esa.shift_assignment_id,
            esa.employee_id,
            esa.shift_id,
            esa.schedule_id,
            esa.effective_from,
            esa.effective_to,
            esa.assignment_type,
            esa.is_current,
            esa.assigned_by_user_id,
            esa.remarks
        FROM employee_shift_assignments esa

        INNER JOIN employees e
            ON e.employee_id =
               esa.employee_id

        WHERE esa.shift_assignment_id = ?
          AND esa.employee_id = ?
          AND e.company_id = ?
          AND e.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        shiftAssignmentId,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedShiftAssignmentRow
      | undefined
  ) ?? null;
}

async function assertBranchAvailable(
  connection: PoolConnection,
  companyId: string,
  branchId: string | null
): Promise<void> {
  if (branchId === null) {
    return;
  }

  const branch =
    await lockBranch(
      connection,
      companyId,
      branchId
    );

  if (!branch) {
    throw new Error(
      "SCHEDULING_BRANCH_NOT_FOUND"
    );
  }
}

async function assertShiftAvailable(
  connection: PoolConnection,
  companyId: string,
  shiftId: string
): Promise<LockedShiftRow> {
  const shift =
    await lockShift(
      connection,
      companyId,
      shiftId
    );

  if (!shift) {
    throw new Error(
      "SHIFT_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      shift.is_active
    )
  ) {
    throw new Error(
      "SHIFT_INACTIVE"
    );
  }

  return shift;
}

async function assertWorkScheduleAvailable(
  connection: PoolConnection,
  companyId: string,
  scheduleId: string | null
): Promise<LockedWorkScheduleRow | null> {
  if (scheduleId === null) {
    return null;
  }

  const schedule =
    await lockWorkSchedule(
      connection,
      companyId,
      scheduleId
    );

  if (!schedule) {
    throw new Error(
      "WORK_SCHEDULE_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      schedule.is_active
    )
  ) {
    throw new Error(
      "WORK_SCHEDULE_INACTIVE"
    );
  }

  return schedule;
}

async function assertNoAssignmentOverlap(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  excludedAssignmentId:
    | string
    | null
): Promise<void> {
  const parameters: unknown[] = [
    employeeId,
    effectiveTo ??
      "9999-12-31",
    effectiveFrom
  ];

  let exclusionClause = "";

  if (
    excludedAssignmentId !==
    null
  ) {
    exclusionClause = `
      AND shift_assignment_id <> ?
    `;

    parameters.push(
      excludedAssignmentId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT
            shift_assignment_id
        FROM employee_shift_assignments
        WHERE employee_id = ?
          AND effective_from <= ?
          AND COALESCE(
                effective_to,
                '9999-12-31'
              ) >= ?
          ${exclusionClause}
        LIMIT 1
        FOR UPDATE
      `,
      parameters
    );

  if (
    rows.length > 0
  ) {
    throw new Error(
      "SHIFT_ASSIGNMENT_DATE_OVERLAP"
    );
  }
}

async function clearOtherCurrentAssignments(
  connection: PoolConnection,
  employeeId: string,
  excludedAssignmentId:
    | string
    | null
): Promise<void> {
  const parameters: unknown[] = [
    employeeId
  ];

  let exclusionClause = "";

  if (
    excludedAssignmentId !==
    null
  ) {
    exclusionClause = `
      AND shift_assignment_id <> ?
    `;

    parameters.push(
      excludedAssignmentId
    );
  }

  await connection.query(
    `
      UPDATE employee_shift_assignments
      SET is_current = 0
      WHERE employee_id = ?
        ${exclusionClause}
    `,
    parameters
  );
}

async function refreshEmployeeCurrentAssignment(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE employee_shift_assignments
      SET is_current = 0
      WHERE employee_id = ?
    `,
    [
      employeeId
    ]
  );

  const rows =
    await connection.query(
      `
        SELECT
            shift_assignment_id
        FROM employee_shift_assignments
        WHERE employee_id = ?
          AND effective_from <=
              CURRENT_DATE
          AND (
            effective_to IS NULL
            OR effective_to >=
               CURRENT_DATE
          )
        ORDER BY
            effective_from DESC,
            shift_assignment_id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId
      ]
    );

  const current =
    rows[0] as
      | {
          shift_assignment_id:
            | string
            | number
            | bigint;
        }
      | undefined;

  if (!current) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_shift_assignments
      SET is_current = 1
      WHERE shift_assignment_id = ?
    `,
    [
      String(
        current.shift_assignment_id
      )
    ]
  );
}

/*
 * =========================================================
 * Connection-based select helpers
 * =========================================================
 */

async function selectShiftUsingConnection(
  connection: PoolConnection,
  companyId: string,
  shiftId: string,
  includeDeleted = false
): Promise<ShiftDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${shiftSelect}
        WHERE s.shift_id = ?
          AND s.company_id = ?
          ${
            includeDeleted
              ? ""
              : "AND s.deleted_at IS NULL"
          }
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

async function selectWorkScheduleUsingConnection(
  connection: PoolConnection,
  companyId: string,
  scheduleId: string,
  includeDeleted = false
): Promise<WorkScheduleDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${workScheduleSelect}
        WHERE ws.schedule_id = ?
          AND ws.company_id = ?
          ${
            includeDeleted
              ? ""
              : "AND ws.deleted_at IS NULL"
          }
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

async function selectShiftAssignmentUsingConnection(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  shiftAssignmentId: string
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${shiftAssignmentSelect}
        WHERE esa.shift_assignment_id = ?
          AND esa.employee_id = ?
          AND e.company_id = ?
        LIMIT 1
      `,
      [
        shiftAssignmentId,
        employeeId,
        companyId
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
 * Shift list and lookup
 * =========================================================
 */

export async function listShiftRecords(
  companyId: string,
  filters: ShiftListFilters
): Promise<
  PaginatedResult<ShiftDatabaseRow>
> {
  const conditions: string[] = [
    "s.company_id = ?",
    "s.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.branchId) {
    conditions.push(
      "s.branch_id = ?"
    );

    parameters.push(
      filters.branchId
    );
  }

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "s.is_active = ?"
    );

    parameters.push(
      filters.isActive
        ? 1
        : 0
    );
  } else if (
    !filters.includeInactive
  ) {
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

  const whereClause =
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM shifts s

        LEFT JOIN branches b
            ON b.branch_id =
               s.branch_id

        WHERE ${whereClause}
      `,
      parameters
    );

  const count =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    count
      ? Number(
          count.total_records
        )
      : 0;

  const rows =
    await databasePool.query(
      `
        ${shiftSelect}
        WHERE ${whereClause}
        ORDER BY
            s.shift_name ASC,
            s.shift_id ASC
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
      rows as ShiftDatabaseRow[],

    totalRecords
  };
}

export async function findShiftRecordById(
  companyId: string,
  shiftId: string
): Promise<ShiftDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${shiftSelect}
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
 * Shift create, update and delete
 * =========================================================
 */

export async function createShiftRecord(
  input: CreateShiftRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<ShiftDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await assertBranchAvailable(
      connection,
      input.companyId,
      input.branchId
    );

    const result =
      await connection.query(
        `
          INSERT INTO shifts (
              company_id,
              branch_id,
              shift_code,
              shift_name,
              description,
              start_time,
              end_time,
              crosses_midnight,
              is_flexible,
              break_minutes,
              expected_work_minutes,
              check_in_start_time,
              check_in_end_time,
              check_out_start_time,
              check_out_end_time,
              late_grace_minutes,
              early_departure_grace_minutes,
              overtime_after_minutes,
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
          input.shiftCode,
          input.shiftName,
          input.description,
          input.startTime,
          input.endTime,
          input.crossesMidnight
            ? 1
            : 0,
          input.isFlexible
            ? 1
            : 0,
          input.breakMinutes,
          input.expectedWorkMinutes,
          input.checkInStartTime,
          input.checkInEndTime,
          input.checkOutStartTime,
          input.checkOutEndTime,
          input.lateGraceMinutes,
          input.earlyDepartureGraceMinutes,
          input.overtimeAfterMinutes,
          input.isActive
            ? 1
            : 0
        ]
      ) as InsertResult;

    const shiftId =
      String(
        result.insertId
      );

    const created =
      await selectShiftUsingConnection(
        connection,
        input.companyId,
        shiftId
      );

    if (!created) {
      throw new Error(
        "CREATED_SHIFT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "shift_created",

        tableName:
          "shifts",

        recordId:
          shiftId,

        newValues:
          shiftLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/shifts",

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

export async function updateShiftRecord(
  companyId: string,
  shiftId: string,
  input: UpdateShiftRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<ShiftDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockShift(
        connection,
        companyId,
        shiftId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      input.branchId !==
      undefined
    ) {
      await assertBranchAvailable(
        connection,
        companyId,
        input.branchId
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

    if (
      input.branchId !==
      undefined
    ) {
      addUpdate(
        "branch_id",
        input.branchId
      );
    }

    if (
      input.shiftCode !==
      undefined
    ) {
      addUpdate(
        "shift_code",
        input.shiftCode
      );
    }

    if (
      input.shiftName !==
      undefined
    ) {
      addUpdate(
        "shift_name",
        input.shiftName
      );
    }

    if (
      input.description !==
      undefined
    ) {
      addUpdate(
        "description",
        input.description
      );
    }

    if (
      input.startTime !==
      undefined
    ) {
      addUpdate(
        "start_time",
        input.startTime
      );
    }

    if (
      input.endTime !==
      undefined
    ) {
      addUpdate(
        "end_time",
        input.endTime
      );
    }

    if (
      input.crossesMidnight !==
      undefined
    ) {
      addUpdate(
        "crosses_midnight",
        input.crossesMidnight
          ? 1
          : 0
      );
    }

    if (
      input.isFlexible !==
      undefined
    ) {
      addUpdate(
        "is_flexible",
        input.isFlexible
          ? 1
          : 0
      );
    }

    if (
      input.breakMinutes !==
      undefined
    ) {
      addUpdate(
        "break_minutes",
        input.breakMinutes
      );
    }

    if (
      input.expectedWorkMinutes !==
      undefined
    ) {
      addUpdate(
        "expected_work_minutes",
        input.expectedWorkMinutes
      );
    }

    if (
      input.checkInStartTime !==
      undefined
    ) {
      addUpdate(
        "check_in_start_time",
        input.checkInStartTime
      );
    }

    if (
      input.checkInEndTime !==
      undefined
    ) {
      addUpdate(
        "check_in_end_time",
        input.checkInEndTime
      );
    }

    if (
      input.checkOutStartTime !==
      undefined
    ) {
      addUpdate(
        "check_out_start_time",
        input.checkOutStartTime
      );
    }

    if (
      input.checkOutEndTime !==
      undefined
    ) {
      addUpdate(
        "check_out_end_time",
        input.checkOutEndTime
      );
    }

    if (
      input.lateGraceMinutes !==
      undefined
    ) {
      addUpdate(
        "late_grace_minutes",
        input.lateGraceMinutes
      );
    }

    if (
      input.earlyDepartureGraceMinutes !==
      undefined
    ) {
      addUpdate(
        "early_departure_grace_minutes",
        input.earlyDepartureGraceMinutes
      );
    }

    if (
      input.overtimeAfterMinutes !==
      undefined
    ) {
      addUpdate(
        "overtime_after_minutes",
        input.overtimeAfterMinutes
      );
    }

    if (
      input.isActive !==
      undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive
          ? 1
          : 0
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_SHIFT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      shiftId,
      companyId
    );

    await connection.query(
      `
        UPDATE shifts
        SET ${assignments.join(", ")}
        WHERE shift_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    const updated =
      await selectShiftUsingConnection(
        connection,
        companyId,
        shiftId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_SHIFT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "shift_updated",

        tableName:
          "shifts",

        recordId:
          shiftId,

        oldValues:
          shiftLogSummary(
            existing
          ),

        newValues:
          shiftLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/shifts/${shiftId}`,

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

export async function softDeleteShiftRecord(
  companyId: string,
  shiftId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<ShiftDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockShift(
        connection,
        companyId,
        shiftId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignmentRows =
      await connection.query(
        `
          SELECT COUNT(*) AS total_records
          FROM employee_shift_assignments
          WHERE shift_id = ?
            AND is_current = 1
        `,
        [
          shiftId
        ]
      );

    const assignmentCount =
      assignmentRows[0] as
        | CountDatabaseRow
        | undefined;

    if (
      Number(
        assignmentCount
          ?.total_records ??
        0
      ) > 0
    ) {
      throw new Error(
        "SHIFT_HAS_CURRENT_ASSIGNMENTS"
      );
    }

    await connection.query(
      `
        UPDATE shifts
        SET
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE shift_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [
        shiftId,
        companyId
      ]
    );

    const deleted =
      await selectShiftUsingConnection(
        connection,
        companyId,
        shiftId,
        true
      );

    if (!deleted) {
      throw new Error(
        "DELETED_SHIFT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "shift_deleted",

        tableName:
          "shifts",

        recordId:
          shiftId,

        oldValues:
          shiftLogSummary(
            existing
          ),

        newValues:
          shiftLogSummary(
            deleted
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/attendance/shifts/${shiftId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return deleted;
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
 * Work-schedule list and lookup
 * =========================================================
 */

export async function listWorkScheduleRecords(
  companyId: string,
  filters: WorkScheduleListFilters
): Promise<
  PaginatedResult<WorkScheduleDatabaseRow>
> {
  const conditions: string[] = [
    "ws.company_id = ?",
    "ws.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "ws.is_active = ?"
    );

    parameters.push(
      filters.isActive
        ? 1
        : 0
    );
  } else if (
    !filters.includeInactive
  ) {
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

  const whereClause =
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM work_schedules ws
        WHERE ${whereClause}
      `,
      parameters
    );

  const count =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    count
      ? Number(
          count.total_records
        )
      : 0;

  const rows =
    await databasePool.query(
      `
        ${workScheduleSelect}
        WHERE ${whereClause}
        ORDER BY
            ws.is_default DESC,
            ws.schedule_name ASC,
            ws.schedule_id ASC
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
        WorkScheduleDatabaseRow[],

    totalRecords
  };
}

export async function findWorkScheduleRecordById(
  companyId: string,
  scheduleId: string
): Promise<WorkScheduleDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${workScheduleSelect}
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

/*
 * =========================================================
 * Work-schedule create, update and delete
 * =========================================================
 */

export async function createWorkScheduleRecord(
  input: CreateWorkScheduleRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<WorkScheduleDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (input.isDefault) {
      await connection.query(
        `
          UPDATE work_schedules
          SET is_default = 0
          WHERE company_id = ?
            AND deleted_at IS NULL
        `,
        [
          input.companyId
        ]
      );
    }

    const result =
      await connection.query(
        `
          INSERT INTO work_schedules (
              company_id,
              schedule_code,
              schedule_name,
              description,
              weekly_working_hours,
              weekly_working_days,
              is_default,
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
              ?
          )
        `,
        [
          input.companyId,
          input.scheduleCode,
          input.scheduleName,
          input.description,
          input.weeklyWorkingHours,
          input.weeklyWorkingDays,
          input.isDefault
            ? 1
            : 0,
          input.isActive
            ? 1
            : 0
        ]
      ) as InsertResult;

    const scheduleId =
      String(
        result.insertId
      );

    const created =
      await selectWorkScheduleUsingConnection(
        connection,
        input.companyId,
        scheduleId
      );

    if (!created) {
      throw new Error(
        "CREATED_WORK_SCHEDULE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "work_schedule_created",

        tableName:
          "work_schedules",

        recordId:
          scheduleId,

        newValues:
          scheduleLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/work-schedules",

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

export async function updateWorkScheduleRecord(
  companyId: string,
  scheduleId: string,
  input: UpdateWorkScheduleRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<WorkScheduleDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockWorkSchedule(
        connection,
        companyId,
        scheduleId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      input.isDefault === true
    ) {
      await connection.query(
        `
          UPDATE work_schedules
          SET is_default = 0
          WHERE company_id = ?
            AND schedule_id <> ?
            AND deleted_at IS NULL
        `,
        [
          companyId,
          scheduleId
        ]
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

    if (
      input.scheduleCode !==
      undefined
    ) {
      addUpdate(
        "schedule_code",
        input.scheduleCode
      );
    }

    if (
      input.scheduleName !==
      undefined
    ) {
      addUpdate(
        "schedule_name",
        input.scheduleName
      );
    }

    if (
      input.description !==
      undefined
    ) {
      addUpdate(
        "description",
        input.description
      );
    }

    if (
      input.weeklyWorkingHours !==
      undefined
    ) {
      addUpdate(
        "weekly_working_hours",
        input.weeklyWorkingHours
      );
    }

    if (
      input.weeklyWorkingDays !==
      undefined
    ) {
      addUpdate(
        "weekly_working_days",
        input.weeklyWorkingDays
      );
    }

    if (
      input.isDefault !==
      undefined
    ) {
      addUpdate(
        "is_default",
        input.isDefault
          ? 1
          : 0
      );
    }

    if (
      input.isActive !==
      undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive
          ? 1
          : 0
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_WORK_SCHEDULE_UPDATE_FIELDS"
      );
    }

    parameters.push(
      scheduleId,
      companyId
    );

    await connection.query(
      `
        UPDATE work_schedules
        SET ${assignments.join(", ")}
        WHERE schedule_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    const updated =
      await selectWorkScheduleUsingConnection(
        connection,
        companyId,
        scheduleId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_WORK_SCHEDULE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "work_schedule_updated",

        tableName:
          "work_schedules",

        recordId:
          scheduleId,

        oldValues:
          scheduleLogSummary(
            existing
          ),

        newValues:
          scheduleLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/work-schedules/${scheduleId}`,

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

export async function softDeleteWorkScheduleRecord(
  companyId: string,
  scheduleId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<WorkScheduleDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockWorkSchedule(
        connection,
        companyId,
        scheduleId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignmentRows =
      await connection.query(
        `
          SELECT COUNT(*) AS total_records
          FROM employee_shift_assignments
          WHERE schedule_id = ?
            AND is_current = 1
        `,
        [
          scheduleId
        ]
      );

    const assignmentCount =
      assignmentRows[0] as
        | CountDatabaseRow
        | undefined;

    if (
      Number(
        assignmentCount
          ?.total_records ??
        0
      ) > 0
    ) {
      throw new Error(
        "WORK_SCHEDULE_HAS_CURRENT_ASSIGNMENTS"
      );
    }

    await connection.query(
      `
        UPDATE work_schedules
        SET
            is_default = 0,
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE schedule_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [
        scheduleId,
        companyId
      ]
    );

    const deleted =
      await selectWorkScheduleUsingConnection(
        connection,
        companyId,
        scheduleId,
        true
      );

    if (!deleted) {
      throw new Error(
        "DELETED_WORK_SCHEDULE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "work_schedule_deleted",

        tableName:
          "work_schedules",

        recordId:
          scheduleId,

        oldValues:
          scheduleLogSummary(
            existing
          ),

        newValues:
          scheduleLogSummary(
            deleted
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/attendance/work-schedules/${scheduleId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return deleted;
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
 * Work-schedule days
 * =========================================================
 */

export async function listWorkScheduleDayRecords(
  companyId: string,
  scheduleId: string
): Promise<WorkScheduleDayDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        ${workScheduleDaySelect}
        WHERE wsd.schedule_id = ?
          AND ws.company_id = ?
          AND ws.deleted_at IS NULL
        ORDER BY
            wsd.day_of_week ASC
      `,
      [
        scheduleId,
        companyId
      ]
    );

  return rows as
    WorkScheduleDayDatabaseRow[];
}

export async function findWorkScheduleDayRecord(
  companyId: string,
  scheduleId: string,
  dayOfWeek: number
): Promise<WorkScheduleDayDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${workScheduleDaySelect}
        WHERE wsd.schedule_id = ?
          AND wsd.day_of_week = ?
          AND ws.company_id = ?
          AND ws.deleted_at IS NULL
        LIMIT 1
      `,
      [
        scheduleId,
        dayOfWeek,
        companyId
      ]
    );

  return (
    rows[0] as
      | WorkScheduleDayDatabaseRow
      | undefined
  ) ?? null;
}

export async function replaceWorkScheduleDayRecords(
  companyId: string,
  scheduleId: string,
  days: ReplaceWorkScheduleDayRecord[],
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<WorkScheduleDayDatabaseRow[]> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const schedule =
      await lockWorkSchedule(
        connection,
        companyId,
        scheduleId
      );

    if (!schedule) {
      throw new Error(
        "WORK_SCHEDULE_NOT_FOUND"
      );
    }

    const oldRows =
      await connection.query(
        `
          ${workScheduleDaySelect}
          WHERE wsd.schedule_id = ?
            AND ws.company_id = ?
          ORDER BY
              wsd.day_of_week ASC
        `,
        [
          scheduleId,
          companyId
        ]
      ) as WorkScheduleDayDatabaseRow[];

    await connection.query(
      `
        DELETE FROM work_schedule_days
        WHERE schedule_id = ?
      `,
      [
        scheduleId
      ]
    );

    for (const day of days) {
      await connection.query(
        `
          INSERT INTO work_schedule_days (
              schedule_id,
              day_of_week,
              is_working_day,
              planned_start_time,
              planned_end_time,
              break_minutes,
              expected_work_minutes,
              crosses_midnight
          )
          VALUES (
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
          scheduleId,
          day.dayOfWeek,
          day.isWorkingDay
            ? 1
            : 0,
          day.plannedStartTime,
          day.plannedEndTime,
          day.breakMinutes,
          day.expectedWorkMinutes,
          day.crossesMidnight
            ? 1
            : 0
        ]
      );
    }

    const weeklyWorkingDays =
      days.filter(
        (
          day
        ) => day.isWorkingDay
      ).length;

    const weeklyWorkMinutes =
      days.reduce(
        (
          total,
          day
        ) =>
          total +
          (
            day.isWorkingDay
              ? day.expectedWorkMinutes
              : 0
          ),
        0
      );

    const weeklyWorkingHours =
      Number(
        (
          weeklyWorkMinutes /
          60
        ).toFixed(2)
      );

    await connection.query(
      `
        UPDATE work_schedules
        SET
            weekly_working_days = ?,
            weekly_working_hours = ?
        WHERE schedule_id = ?
          AND company_id = ?
      `,
      [
        weeklyWorkingDays,
        weeklyWorkingHours,
        scheduleId,
        companyId
      ]
    );

    const newRows =
      await connection.query(
        `
          ${workScheduleDaySelect}
          WHERE wsd.schedule_id = ?
            AND ws.company_id = ?
          ORDER BY
              wsd.day_of_week ASC
        `,
        [
          scheduleId,
          companyId
        ]
      ) as WorkScheduleDayDatabaseRow[];

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "work_schedule_days_replaced",

        tableName:
          "work_schedule_days",

        recordId:
          scheduleId,

        oldValues:
          oldRows.map(
            (
              day
            ) => ({
              dayOfWeek:
                Number(
                  day.day_of_week
                ),

              isWorkingDay:
                databaseBoolean(
                  day.is_working_day
                ),

              expectedWorkMinutes:
                Number(
                  day.expected_work_minutes
                )
            })
          ),

        newValues:
          newRows.map(
            (
              day
            ) => ({
              dayOfWeek:
                Number(
                  day.day_of_week
                ),

              isWorkingDay:
                databaseBoolean(
                  day.is_working_day
                ),

              expectedWorkMinutes:
                Number(
                  day.expected_work_minutes
                )
            })
          ),

        requestMethod:
          "PUT",

        requestPath:
          `/api/v1/attendance/work-schedules/${scheduleId}/days`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return newRows;
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
 * Employee shift-assignment list and lookup
 * =========================================================
 */

export async function listEmployeeShiftAssignmentRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeShiftAssignmentListFilters
): Promise<
  PaginatedResult<
    EmployeeShiftAssignmentDatabaseRow
  >
> {
  const conditions: string[] = [
    "e.company_id = ?",
    "esa.employee_id = ?",
    "e.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId
  ];

  if (filters.shiftId) {
    conditions.push(
      "esa.shift_id = ?"
    );

    parameters.push(
      filters.shiftId
    );
  }

  if (filters.scheduleId) {
    conditions.push(
      "esa.schedule_id = ?"
    );

    parameters.push(
      filters.scheduleId
    );
  }

  if (filters.assignmentType) {
    conditions.push(
      "esa.assignment_type = ?"
    );

    parameters.push(
      filters.assignmentType
    );
  }

  if (
    filters.isCurrent !==
    undefined
  ) {
    conditions.push(
      "esa.is_current = ?"
    );

    parameters.push(
      filters.isCurrent
        ? 1
        : 0
    );
  }

  if (filters.dateFrom) {
    conditions.push(`
      COALESCE(
        esa.effective_to,
        '9999-12-31'
      ) >= ?
    `);

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "esa.effective_from <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  const whereClause =
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM employee_shift_assignments esa

        INNER JOIN employees e
            ON e.employee_id =
               esa.employee_id

        WHERE ${whereClause}
      `,
      parameters
    );

  const count =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const totalRecords =
    count
      ? Number(
          count.total_records
        )
      : 0;

  const rows =
    await databasePool.query(
      `
        ${shiftAssignmentSelect}
        WHERE ${whereClause}
        ORDER BY
            esa.effective_from DESC,
            esa.shift_assignment_id DESC
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
        EmployeeShiftAssignmentDatabaseRow[],

    totalRecords
  };
}

export async function findEmployeeShiftAssignmentRecordById(
  companyId: string,
  employeeId: string,
  shiftAssignmentId: string
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${shiftAssignmentSelect}
        WHERE esa.shift_assignment_id = ?
          AND esa.employee_id = ?
          AND e.company_id = ?
          AND e.deleted_at IS NULL
        LIMIT 1
      `,
      [
        shiftAssignmentId,
        employeeId,
        companyId
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
 * Employee shift-assignment create
 * =========================================================
 */

export async function createEmployeeShiftAssignmentRecord(
  companyId: string,
  input:
    CreateEmployeeShiftAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeShiftAssignmentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployee(
        connection,
        companyId,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      !databaseBoolean(
        employee.is_active
      )
    ) {
      throw new Error(
        "EMPLOYEE_INACTIVE"
      );
    }

    await assertShiftAvailable(
      connection,
      companyId,
      input.shiftId
    );

    await assertWorkScheduleAvailable(
      connection,
      companyId,
      input.scheduleId
    );

    await assertNoAssignmentOverlap(
      connection,
      input.employeeId,
      input.effectiveFrom,
      input.effectiveTo,
      null
    );

    if (input.isCurrent) {
      await clearOtherCurrentAssignments(
        connection,
        input.employeeId,
        null
      );
    }

    const result =
      await connection.query(
        `
          INSERT INTO employee_shift_assignments (
              employee_id,
              shift_id,
              schedule_id,
              effective_from,
              effective_to,
              assignment_type,
              is_current,
              assigned_by_user_id,
              remarks
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
              ?
          )
        `,
        [
          input.employeeId,
          input.shiftId,
          input.scheduleId,
          input.effectiveFrom,
          input.effectiveTo,
          input.assignmentType,
          input.isCurrent
            ? 1
            : 0,
          input.assignedByUserId,
          input.remarks
        ]
      ) as InsertResult;

    const shiftAssignmentId =
      String(
        result.insertId
      );

    const created =
      await selectShiftAssignmentUsingConnection(
        connection,
        companyId,
        input.employeeId,
        shiftAssignmentId
      );

    if (!created) {
      throw new Error(
        "CREATED_SHIFT_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "employee_shift_assigned",

        tableName:
          "employee_shift_assignments",

        recordId:
          shiftAssignmentId,

        newValues:
          assignmentLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/shift-assignments`,

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
 * Employee shift-assignment update
 * =========================================================
 */

export async function updateEmployeeShiftAssignmentRecord(
  companyId: string,
  employeeId: string,
  shiftAssignmentId: string,
  input:
    UpdateEmployeeShiftAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockShiftAssignment(
        connection,
        companyId,
        employeeId,
        shiftAssignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const finalShiftId =
      input.shiftId ??
      String(
        existing.shift_id
      );

    const finalScheduleId =
      input.scheduleId !==
      undefined
        ? input.scheduleId
        : existing.schedule_id ===
          null
          ? null
          : String(
              existing.schedule_id
            );

    const finalEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(
        existing.effective_from
      );

    if (!finalEffectiveFrom) {
      throw new Error(
        "INVALID_SHIFT_ASSIGNMENT_DATE"
      );
    }

    const finalEffectiveTo =
      input.effectiveTo !==
      undefined
        ? input.effectiveTo
        : databaseDateOnly(
            existing.effective_to
          );

    const finalIsCurrent =
      input.isCurrent ??
      databaseBoolean(
        existing.is_current
      );

    await assertShiftAvailable(
      connection,
      companyId,
      finalShiftId
    );

    await assertWorkScheduleAvailable(
      connection,
      companyId,
      finalScheduleId
    );

    await assertNoAssignmentOverlap(
      connection,
      employeeId,
      finalEffectiveFrom,
      finalEffectiveTo,
      shiftAssignmentId
    );

    if (finalIsCurrent) {
      await clearOtherCurrentAssignments(
        connection,
        employeeId,
        shiftAssignmentId
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

    if (
      input.shiftId !==
      undefined
    ) {
      addUpdate(
        "shift_id",
        input.shiftId
      );
    }

    if (
      input.scheduleId !==
      undefined
    ) {
      addUpdate(
        "schedule_id",
        input.scheduleId
      );
    }

    if (
      input.effectiveFrom !==
      undefined
    ) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (
      input.effectiveTo !==
      undefined
    ) {
      addUpdate(
        "effective_to",
        input.effectiveTo
      );
    }

    if (
      input.assignmentType !==
      undefined
    ) {
      addUpdate(
        "assignment_type",
        input.assignmentType
      );
    }

    if (
      input.isCurrent !==
      undefined
    ) {
      addUpdate(
        "is_current",
        input.isCurrent
          ? 1
          : 0
      );
    }

    if (
      input.remarks !==
      undefined
    ) {
      addUpdate(
        "remarks",
        input.remarks
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_SHIFT_ASSIGNMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      shiftAssignmentId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_shift_assignments
        SET ${assignments.join(", ")}
        WHERE shift_assignment_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    const updated =
      await selectShiftAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        shiftAssignmentId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_SHIFT_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "employee_shift_assignment_updated",

        tableName:
          "employee_shift_assignments",

        recordId:
          shiftAssignmentId,

        oldValues:
          assignmentLogSummary(
            existing
          ),

        newValues:
          assignmentLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/shift-assignments/${shiftAssignmentId}`,

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
 * Employee shift-assignment delete
 * =========================================================
 */

export async function deleteEmployeeShiftAssignmentRecord(
  companyId: string,
  employeeId: string,
  shiftAssignmentId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockShiftAssignment(
        connection,
        companyId,
        employeeId,
        shiftAssignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const fullExisting =
      await selectShiftAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        shiftAssignmentId
      );

    if (!fullExisting) {
      throw new Error(
        "SHIFT_ASSIGNMENT_NOT_FOUND"
      );
    }

    const wasCurrent =
      databaseBoolean(
        existing.is_current
      );

    await connection.query(
      `
        DELETE FROM employee_shift_assignments
        WHERE shift_assignment_id = ?
          AND employee_id = ?
      `,
      [
        shiftAssignmentId,
        employeeId
      ]
    );

    if (wasCurrent) {
      await refreshEmployeeCurrentAssignment(
        connection,
        employeeId
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "employee_shift_assignment_deleted",

        tableName:
          "employee_shift_assignments",

        recordId:
          shiftAssignmentId,

        oldValues:
          assignmentLogSummary(
            fullExisting
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/shift-assignments/${shiftAssignmentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return fullExisting;
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
 * Effective employee shift
 * =========================================================
 */

export async function findEffectiveEmployeeShiftAssignmentRecord(
  companyId: string,
  employeeId: string,
  asOfDate: string
): Promise<EmployeeShiftAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${shiftAssignmentSelect}
        WHERE e.company_id = ?
          AND esa.employee_id = ?
          AND e.deleted_at IS NULL
          AND s.deleted_at IS NULL
          AND s.is_active = 1
          AND esa.effective_from <= ?
          AND (
            esa.effective_to IS NULL
            OR esa.effective_to >= ?
          )
        ORDER BY
            esa.is_current DESC,
            esa.effective_from DESC,
            esa.shift_assignment_id DESC
        LIMIT 1
      `,
      [
        companyId,
        employeeId,
        asOfDate,
        asOfDate
      ]
    );

  return (
    rows[0] as
      | EmployeeShiftAssignmentDatabaseRow
      | undefined
  ) ?? null;
}
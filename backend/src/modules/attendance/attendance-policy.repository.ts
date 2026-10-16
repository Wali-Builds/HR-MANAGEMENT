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
  AttendancePolicyAssignmentDatabaseRow,
  AttendancePolicyManagementDatabaseRow,
  AttendanceStatusManagementDatabaseRow,
  CreateAttendancePolicyAssignmentRecord,
  CreateAttendancePolicyRecord,
  CreateAttendanceStatusRecord,
  UpdateAttendancePolicyAssignmentRecord,
  UpdateAttendancePolicyRecord,
  UpdateAttendanceStatusRecord
} from "./attendance-policy.types.js";

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

interface LockedAttendancePolicyRow {
  policy_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  policy_code: string;
  policy_name: string;
  description: string | null;

  late_grace_minutes:
    | string
    | number;

  early_departure_grace_minutes:
    | string
    | number;

  minimum_full_day_minutes:
    | string
    | number;

  minimum_half_day_minutes:
    | string
    | number;

  automatic_absence:
    | number
    | boolean;

  allow_manual_attendance:
    | number
    | boolean;

  allow_remote_attendance:
    | number
    | boolean;

  overtime_enabled:
    | number
    | boolean;

  overtime_after_minutes:
    | string
    | number;

  minimum_overtime_minutes:
    | string
    | number;

  maximum_overtime_minutes_day:
    | string
    | number
    | null;

  overtime_requires_approval:
    | number
    | boolean;

  deduct_break_time:
    | number
    | boolean;

  require_checkout:
    | number
    | boolean;

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

interface LockedAttendanceStatusRow {
  status_code: string;
  status_name: string;
  description: string | null;

  counts_as_present:
    | number
    | boolean;

  counts_as_absent:
    | number
    | boolean;

  is_payable:
    | number
    | boolean;

  is_active:
    | number
    | boolean;
}

interface LockedPolicyAssignmentRow {
  assignment_id:
    | string
    | number
    | bigint;

  employee_id:
    | string
    | number
    | bigint;

  policy_id:
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

  assigned_by_user_id:
    | string
    | number
    | bigint
    | null;
}

interface AttendancePolicyListFilters {
  isActive?: boolean | undefined;
  isDefault?: boolean | undefined;

  includeInactive: boolean;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface AttendanceStatusListFilters {
  isActive?: boolean | undefined;

  countsAsPresent?:
    | boolean
    | undefined;

  countsAsAbsent?:
    | boolean
    | undefined;

  isPayable?: boolean | undefined;

  includeInactive: boolean;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface AttendancePolicyAssignmentListFilters {
  policyId?: string | undefined;
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
 * General helpers
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
    return value.slice(
      0,
      10
    );
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

function attendancePolicyLogSummary(
  policy:
    | AttendancePolicyManagementDatabaseRow
    | LockedAttendancePolicyRow
) {
  return {
    policyId:
      String(
        policy.policy_id
      ),

    companyId:
      String(
        policy.company_id
      ),

    policyCode:
      policy.policy_code,

    policyName:
      policy.policy_name,

    minimumFullDayMinutes:
      Number(
        policy.minimum_full_day_minutes
      ),

    minimumHalfDayMinutes:
      Number(
        policy.minimum_half_day_minutes
      ),

    allowManualAttendance:
      databaseBoolean(
        policy.allow_manual_attendance
      ),

    allowRemoteAttendance:
      databaseBoolean(
        policy.allow_remote_attendance
      ),

    overtimeEnabled:
      databaseBoolean(
        policy.overtime_enabled
      ),

    isDefault:
      databaseBoolean(
        policy.is_default
      ),

    isActive:
      databaseBoolean(
        policy.is_active
      )
  };
}

function attendanceStatusLogSummary(
  status:
    | AttendanceStatusManagementDatabaseRow
    | LockedAttendanceStatusRow
) {
  return {
    statusCode:
      status.status_code,

    statusName:
      status.status_name,

    countsAsPresent:
      databaseBoolean(
        status.counts_as_present
      ),

    countsAsAbsent:
      databaseBoolean(
        status.counts_as_absent
      ),

    isPayable:
      databaseBoolean(
        status.is_payable
      ),

    isActive:
      databaseBoolean(
        status.is_active
      )
  };
}

function policyAssignmentLogSummary(
  assignment:
    | AttendancePolicyAssignmentDatabaseRow
    | LockedPolicyAssignmentRow
) {
  return {
    assignmentId:
      String(
        assignment.assignment_id
      ),

    employeeId:
      String(
        assignment.employee_id
      ),

    policyId:
      String(
        assignment.policy_id
      ),

    effectiveFrom:
      databaseDateOnly(
        assignment.effective_from
      ),

    effectiveTo:
      databaseDateOnly(
        assignment.effective_to
      ),

    isCurrent:
      databaseBoolean(
        assignment.is_current
      )
  };
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId:
      | string
      | null;

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

const attendancePolicySelect = `
  SELECT
      ap.policy_id,
      ap.company_id,

      ap.policy_code,
      ap.policy_name,
      ap.description,

      ap.late_grace_minutes,
      ap.early_departure_grace_minutes,

      ap.minimum_full_day_minutes,
      ap.minimum_half_day_minutes,

      ap.automatic_absence,

      ap.allow_manual_attendance,
      ap.allow_remote_attendance,

      ap.overtime_enabled,
      ap.overtime_after_minutes,
      ap.minimum_overtime_minutes,
      ap.maximum_overtime_minutes_day,
      ap.overtime_requires_approval,

      ap.deduct_break_time,
      ap.require_checkout,

      ap.is_default,
      ap.is_active,
      ap.deleted_at,

      (
        SELECT COUNT(*)
        FROM employee_attendance_policy_assignments eapa_count
        WHERE eapa_count.policy_id =
              ap.policy_id
      ) AS assignment_count,

      (
        SELECT COUNT(*)
        FROM employee_attendance_policy_assignments eapa_current
        WHERE eapa_current.policy_id =
              ap.policy_id
          AND eapa_current.is_current = 1
      ) AS current_assignment_count,

      (
        SELECT COUNT(*)
        FROM attendance_records ar_count
        WHERE ar_count.policy_id =
              ap.policy_id
      ) AS attendance_record_count,

      ap.created_at,
      ap.updated_at

  FROM attendance_policies ap
`;

const attendanceStatusSelect = `
  SELECT
      ast.status_code,
      ast.status_name,
      ast.description,

      ast.counts_as_present,
      ast.counts_as_absent,

      ast.is_payable,
      ast.is_active,

      (
        SELECT COUNT(*)
        FROM attendance_records ar_count
        WHERE ar_count.status_code =
              ast.status_code
      ) AS attendance_record_count,

      (
        SELECT COUNT(*)
        FROM attendance_adjustment_requests aar_current
        WHERE aar_current.current_status_code =
              ast.status_code
      ) AS current_adjustment_count,

      (
        SELECT COUNT(*)
        FROM attendance_adjustment_requests aar_requested
        WHERE aar_requested.requested_status_code =
              ast.status_code
      ) AS requested_adjustment_count,

      ast.created_at,
      ast.updated_at

  FROM attendance_statuses ast
`;

const attendancePolicyAssignmentSelect = `
  SELECT
      eapa.assignment_id,

      e.company_id,
      eapa.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      eapa.policy_id,
      ap.policy_code,
      ap.policy_name,

      ap.is_default
          AS policy_is_default,

      ap.is_active
          AS policy_is_active,

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

  INNER JOIN employees e
      ON e.employee_id =
         eapa.employee_id

  INNER JOIN attendance_policies ap
      ON ap.policy_id =
         eapa.policy_id

  LEFT JOIN users assigned_user
      ON assigned_user.user_id =
         eapa.assigned_by_user_id
`;

/*
 * =========================================================
 * Locking helpers
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

async function lockAttendancePolicy(
  connection: PoolConnection,
  companyId: string,
  policyId: string
): Promise<LockedAttendancePolicyRow | null> {
  const rows =
    await connection.query(
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
            deleted_at
        FROM attendance_policies
        WHERE policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        policyId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedAttendancePolicyRow
      | undefined
  ) ?? null;
}

async function lockAttendanceStatus(
  connection: PoolConnection,
  statusCode: string
): Promise<LockedAttendanceStatusRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            status_code,
            status_name,
            description,
            counts_as_present,
            counts_as_absent,
            is_payable,
            is_active
        FROM attendance_statuses
        WHERE status_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        statusCode
      ]
    );

  return (
    rows[0] as
      | LockedAttendanceStatusRow
      | undefined
  ) ?? null;
}

async function lockPolicyAssignment(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<LockedPolicyAssignmentRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            eapa.assignment_id,
            eapa.employee_id,
            eapa.policy_id,
            eapa.effective_from,
            eapa.effective_to,
            eapa.is_current,
            eapa.assigned_by_user_id

        FROM employee_attendance_policy_assignments eapa

        INNER JOIN employees e
            ON e.employee_id =
               eapa.employee_id

        WHERE eapa.assignment_id = ?
          AND eapa.employee_id = ?
          AND e.company_id = ?
          AND e.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        assignmentId,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedPolicyAssignmentRow
      | undefined
  ) ?? null;
}

async function assertAttendancePolicyAvailable(
  connection: PoolConnection,
  companyId: string,
  policyId: string
): Promise<LockedAttendancePolicyRow> {
  const policy =
    await lockAttendancePolicy(
      connection,
      companyId,
      policyId
    );

  if (!policy) {
    throw new Error(
      "ATTENDANCE_POLICY_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new Error(
      "ATTENDANCE_POLICY_INACTIVE"
    );
  }

  return policy;
}

async function assertNoPolicyAssignmentOverlap(
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
      AND assignment_id <> ?
    `;

    parameters.push(
      excludedAssignmentId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT assignment_id
        FROM employee_attendance_policy_assignments
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
      "ATTENDANCE_POLICY_ASSIGNMENT_DATE_OVERLAP"
    );
  }
}

async function clearOtherCurrentPolicyAssignments(
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
      AND assignment_id <> ?
    `;

    parameters.push(
      excludedAssignmentId
    );
  }

  await connection.query(
    `
      UPDATE employee_attendance_policy_assignments
      SET is_current = 0
      WHERE employee_id = ?
        ${exclusionClause}
    `,
    parameters
  );
}

async function refreshEmployeeCurrentPolicyAssignment(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE employee_attendance_policy_assignments
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
            assignment_id
        FROM employee_attendance_policy_assignments
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
            assignment_id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId
      ]
    );

  const currentRow =
    rows[0] as
      | {
          assignment_id:
            | string
            | number
            | bigint;
        }
      | undefined;

  if (!currentRow) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_attendance_policy_assignments
      SET is_current = 1
      WHERE assignment_id = ?
    `,
    [
      String(
        currentRow.assignment_id
      )
    ]
  );
}

/*
 * =========================================================
 * Connection-based SELECT helpers
 * =========================================================
 */

async function selectAttendancePolicyUsingConnection(
  connection: PoolConnection,
  companyId: string,
  policyId: string,
  includeDeleted = false
): Promise<AttendancePolicyManagementDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendancePolicySelect}
        WHERE ap.policy_id = ?
          AND ap.company_id = ?
          ${
            includeDeleted
              ? ""
              : "AND ap.deleted_at IS NULL"
          }
        LIMIT 1
      `,
      [
        policyId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyManagementDatabaseRow
      | undefined
  ) ?? null;
}

async function selectAttendanceStatusUsingConnection(
  connection: PoolConnection,
  statusCode: string
): Promise<AttendanceStatusManagementDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendanceStatusSelect}
        WHERE ast.status_code = ?
        LIMIT 1
      `,
      [
        statusCode
      ]
    );

  return (
    rows[0] as
      | AttendanceStatusManagementDatabaseRow
      | undefined
  ) ?? null;
}

async function selectPolicyAssignmentUsingConnection(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<AttendancePolicyAssignmentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE eapa.assignment_id = ?
          AND eapa.employee_id = ?
          AND e.company_id = ?
        LIMIT 1
      `,
      [
        assignmentId,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance-policy list and lookup
 * =========================================================
 */

export async function listAttendancePolicyManagementRecords(
  companyId: string,
  filters: AttendancePolicyListFilters
): Promise<
  PaginatedResult<
    AttendancePolicyManagementDatabaseRow
  >
> {
  const conditions: string[] = [
    "ap.company_id = ?",
    "ap.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "ap.is_active = ?"
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
      "ap.is_active = 1"
    );
  }

  if (
    filters.isDefault !==
    undefined
  ) {
    conditions.push(
      "ap.is_default = ?"
    );

    parameters.push(
      filters.isDefault
        ? 1
        : 0
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ap.policy_code LIKE ?
        OR ap.policy_name LIKE ?
        OR ap.description LIKE ?
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
        FROM attendance_policies ap
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
        ${attendancePolicySelect}
        WHERE ${whereClause}
        ORDER BY
            ap.is_default DESC,
            ap.policy_name ASC,
            ap.policy_id ASC
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
        AttendancePolicyManagementDatabaseRow[],

    totalRecords
  };
}

export async function findAttendancePolicyManagementRecordById(
  companyId: string,
  policyId: string
): Promise<AttendancePolicyManagementDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendancePolicySelect}
        WHERE ap.policy_id = ?
          AND ap.company_id = ?
          AND ap.deleted_at IS NULL
        LIMIT 1
      `,
      [
        policyId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyManagementDatabaseRow
      | undefined
  ) ?? null;
}

export async function findDefaultAttendancePolicyManagementRecord(
  companyId: string
): Promise<AttendancePolicyManagementDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendancePolicySelect}
        WHERE ap.company_id = ?
          AND ap.is_default = 1
          AND ap.is_active = 1
          AND ap.deleted_at IS NULL
        ORDER BY
            ap.updated_at DESC,
            ap.policy_id DESC
        LIMIT 1
      `,
      [
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyManagementDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance-policy create
 * =========================================================
 */

export async function createAttendancePolicyManagementRecord(
  input: CreateAttendancePolicyRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyManagementDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (
      input.isDefault &&
      !input.isActive
    ) {
      throw new Error(
        "INACTIVE_DEFAULT_ATTENDANCE_POLICY"
      );
    }

    if (input.isDefault) {
      await connection.query(
        `
          UPDATE attendance_policies
          SET is_default = 0
          WHERE company_id = ?
            AND deleted_at IS NULL
        `,
        [
          input.companyId
        ]
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO attendance_policies (
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
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.policyCode,
          input.policyName,
          input.description,
          input.lateGraceMinutes,
          input.earlyDepartureGraceMinutes,
          input.minimumFullDayMinutes,
          input.minimumHalfDayMinutes,

          input.automaticAbsence
            ? 1
            : 0,

          input.allowManualAttendance
            ? 1
            : 0,

          input.allowRemoteAttendance
            ? 1
            : 0,

          input.overtimeEnabled
            ? 1
            : 0,

          input.overtimeAfterMinutes,
          input.minimumOvertimeMinutes,
          input.maximumOvertimeMinutesDay,

          input.overtimeRequiresApproval
            ? 1
            : 0,

          input.deductBreakTime
            ? 1
            : 0,

          input.requireCheckout
            ? 1
            : 0,

          input.isDefault
            ? 1
            : 0,

          input.isActive
            ? 1
            : 0
        ]
      ) as InsertResult;

    const policyId =
      String(
        insertResult.insertId
      );

    const created =
      await selectAttendancePolicyUsingConnection(
        connection,
        input.companyId,
        policyId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "attendance_policy_created",

        tableName:
          "attendance_policies",

        recordId:
          policyId,

        newValues:
          attendancePolicyLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/policies",

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
 * Attendance-policy update
 * =========================================================
 */

export async function updateAttendancePolicyManagementRecord(
  companyId: string,
  policyId: string,
  input: UpdateAttendancePolicyRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyManagementDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendancePolicy(
        connection,
        companyId,
        policyId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
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

    if (
      finalIsDefault &&
      !finalIsActive
    ) {
      throw new Error(
        "INACTIVE_DEFAULT_ATTENDANCE_POLICY"
      );
    }

    if (
      input.isDefault === true
    ) {
      await connection.query(
        `
          UPDATE attendance_policies
          SET is_default = 0
          WHERE company_id = ?
            AND policy_id <> ?
            AND deleted_at IS NULL
        `,
        [
          companyId,
          policyId
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
      input.policyCode !==
      undefined
    ) {
      addUpdate(
        "policy_code",
        input.policyCode
      );
    }

    if (
      input.policyName !==
      undefined
    ) {
      addUpdate(
        "policy_name",
        input.policyName
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
      input.minimumFullDayMinutes !==
      undefined
    ) {
      addUpdate(
        "minimum_full_day_minutes",
        input.minimumFullDayMinutes
      );
    }

    if (
      input.minimumHalfDayMinutes !==
      undefined
    ) {
      addUpdate(
        "minimum_half_day_minutes",
        input.minimumHalfDayMinutes
      );
    }

    if (
      input.automaticAbsence !==
      undefined
    ) {
      addUpdate(
        "automatic_absence",
        input.automaticAbsence
          ? 1
          : 0
      );
    }

    if (
      input.allowManualAttendance !==
      undefined
    ) {
      addUpdate(
        "allow_manual_attendance",
        input.allowManualAttendance
          ? 1
          : 0
      );
    }

    if (
      input.allowRemoteAttendance !==
      undefined
    ) {
      addUpdate(
        "allow_remote_attendance",
        input.allowRemoteAttendance
          ? 1
          : 0
      );
    }

    if (
      input.overtimeEnabled !==
      undefined
    ) {
      addUpdate(
        "overtime_enabled",
        input.overtimeEnabled
          ? 1
          : 0
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
      input.minimumOvertimeMinutes !==
      undefined
    ) {
      addUpdate(
        "minimum_overtime_minutes",
        input.minimumOvertimeMinutes
      );
    }

    if (
      input.maximumOvertimeMinutesDay !==
      undefined
    ) {
      addUpdate(
        "maximum_overtime_minutes_day",
        input.maximumOvertimeMinutesDay
      );
    }

    if (
      input.overtimeRequiresApproval !==
      undefined
    ) {
      addUpdate(
        "overtime_requires_approval",
        input.overtimeRequiresApproval
          ? 1
          : 0
      );
    }

    if (
      input.deductBreakTime !==
      undefined
    ) {
      addUpdate(
        "deduct_break_time",
        input.deductBreakTime
          ? 1
          : 0
      );
    }

    if (
      input.requireCheckout !==
      undefined
    ) {
      addUpdate(
        "require_checkout",
        input.requireCheckout
          ? 1
          : 0
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
        "NO_ATTENDANCE_POLICY_UPDATE_FIELDS"
      );
    }

    parameters.push(
      policyId,
      companyId
    );

    await connection.query(
      `
        UPDATE attendance_policies
        SET ${assignments.join(", ")}
        WHERE policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    const updated =
      await selectAttendancePolicyUsingConnection(
        connection,
        companyId,
        policyId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_policy_updated",

        tableName:
          "attendance_policies",

        recordId:
          policyId,

        oldValues:
          attendancePolicyLogSummary(
            existing
          ),

        newValues:
          attendancePolicyLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/policies/${policyId}`,

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
 * Attendance-policy soft delete
 * =========================================================
 */

export async function softDeleteAttendancePolicyManagementRecord(
  companyId: string,
  policyId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyManagementDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendancePolicy(
        connection,
        companyId,
        policyId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignmentRows =
      await connection.query(
        `
          SELECT
              COUNT(*) AS total_records
          FROM employee_attendance_policy_assignments
          WHERE policy_id = ?
            AND is_current = 1
        `,
        [
          policyId
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
        "ATTENDANCE_POLICY_HAS_CURRENT_ASSIGNMENTS"
      );
    }

    await connection.query(
      `
        UPDATE attendance_policies
        SET
            is_default = 0,
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [
        policyId,
        companyId
      ]
    );

    const deleted =
      await selectAttendancePolicyUsingConnection(
        connection,
        companyId,
        policyId,
        true
      );

    if (!deleted) {
      throw new Error(
        "DELETED_ATTENDANCE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_policy_deleted",

        tableName:
          "attendance_policies",

        recordId:
          policyId,

        oldValues:
          attendancePolicyLogSummary(
            existing
          ),

        newValues:
          attendancePolicyLogSummary(
            deleted
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/attendance/policies/${policyId}`,

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
 * Attendance-status list and lookup
 * =========================================================
 */

export async function listAttendanceStatusManagementRecords(
  filters: AttendanceStatusListFilters
): Promise<
  PaginatedResult<
    AttendanceStatusManagementDatabaseRow
  >
> {
  const conditions: string[] = [];
  const parameters: unknown[] = [];

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "ast.is_active = ?"
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
      "ast.is_active = 1"
    );
  }

  if (
    filters.countsAsPresent !==
    undefined
  ) {
    conditions.push(
      "ast.counts_as_present = ?"
    );

    parameters.push(
      filters.countsAsPresent
        ? 1
        : 0
    );
  }

  if (
    filters.countsAsAbsent !==
    undefined
  ) {
    conditions.push(
      "ast.counts_as_absent = ?"
    );

    parameters.push(
      filters.countsAsAbsent
        ? 1
        : 0
    );
  }

  if (
    filters.isPayable !==
    undefined
  ) {
    conditions.push(
      "ast.is_payable = ?"
    );

    parameters.push(
      filters.isPayable
        ? 1
        : 0
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ast.status_code LIKE ?
        OR ast.status_name LIKE ?
        OR ast.description LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(
          " AND "
        )}`
      : "";

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM attendance_statuses ast
        ${whereClause}
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
        ${attendanceStatusSelect}
        ${whereClause}
        ORDER BY
            ast.status_name ASC,
            ast.status_code ASC
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
        AttendanceStatusManagementDatabaseRow[],

    totalRecords
  };
}

export async function findAttendanceStatusManagementRecordByCode(
  statusCode: string
): Promise<AttendanceStatusManagementDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendanceStatusSelect}
        WHERE ast.status_code = ?
        LIMIT 1
      `,
      [
        statusCode
      ]
    );

  return (
    rows[0] as
      | AttendanceStatusManagementDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Attendance-status create
 * =========================================================
 */

export async function createAttendanceStatusManagementRecord(
  input: CreateAttendanceStatusRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceStatusManagementDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (
      input.countsAsPresent &&
      input.countsAsAbsent
    ) {
      throw new Error(
        "INVALID_ATTENDANCE_STATUS_CLASSIFICATION"
      );
    }

    await connection.query(
      `
        INSERT INTO attendance_statuses (
            status_code,
            status_name,
            description,
            counts_as_present,
            counts_as_absent,
            is_payable,
            is_active
        )
        VALUES (
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
        input.statusCode,
        input.statusName,
        input.description,

        input.countsAsPresent
          ? 1
          : 0,

        input.countsAsAbsent
          ? 1
          : 0,

        input.isPayable
          ? 1
          : 0,

        input.isActive
          ? 1
          : 0
      ]
    );

    const created =
      await selectAttendanceStatusUsingConnection(
        connection,
        input.statusCode
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_STATUS_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          actor.companyId ??
          null,

        actor,

        actionName:
          "attendance_status_created",

        tableName:
          "attendance_statuses",

        recordId:
          input.statusCode,

        newValues:
          attendanceStatusLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/statuses",

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
 * Attendance-status update
 * =========================================================
 */

export async function updateAttendanceStatusManagementRecord(
  statusCode: string,
  input: UpdateAttendanceStatusRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceStatusManagementDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAttendanceStatus(
        connection,
        statusCode
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const finalCountsAsPresent =
      input.countsAsPresent ??
      databaseBoolean(
        existing.counts_as_present
      );

    const finalCountsAsAbsent =
      input.countsAsAbsent ??
      databaseBoolean(
        existing.counts_as_absent
      );

    if (
      finalCountsAsPresent &&
      finalCountsAsAbsent
    ) {
      throw new Error(
        "INVALID_ATTENDANCE_STATUS_CLASSIFICATION"
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
      input.statusName !==
      undefined
    ) {
      addUpdate(
        "status_name",
        input.statusName
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
      input.countsAsPresent !==
      undefined
    ) {
      addUpdate(
        "counts_as_present",
        input.countsAsPresent
          ? 1
          : 0
      );
    }

    if (
      input.countsAsAbsent !==
      undefined
    ) {
      addUpdate(
        "counts_as_absent",
        input.countsAsAbsent
          ? 1
          : 0
      );
    }

    if (
      input.isPayable !==
      undefined
    ) {
      addUpdate(
        "is_payable",
        input.isPayable
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
        "NO_ATTENDANCE_STATUS_UPDATE_FIELDS"
      );
    }

    parameters.push(
      statusCode
    );

    await connection.query(
      `
        UPDATE attendance_statuses
        SET ${assignments.join(", ")}
        WHERE status_code = ?
      `,
      parameters
    );

    const updated =
      await selectAttendanceStatusUsingConnection(
        connection,
        statusCode
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_STATUS_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          actor.companyId ??
          null,

        actor,

        actionName:
          "attendance_status_updated",

        tableName:
          "attendance_statuses",

        recordId:
          statusCode,

        oldValues:
          attendanceStatusLogSummary(
            existing
          ),

        newValues:
          attendanceStatusLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/statuses/${statusCode}`,

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
 * Policy-assignment list and lookup
 * =========================================================
 */

export async function listAttendancePolicyAssignmentManagementRecords(
  companyId: string,
  employeeId: string,
  filters:
    AttendancePolicyAssignmentListFilters
): Promise<
  PaginatedResult<
    AttendancePolicyAssignmentDatabaseRow
  >
> {
  const conditions: string[] = [
    "e.company_id = ?",
    "eapa.employee_id = ?",
    "e.deleted_at IS NULL",
    "ap.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId
  ];

  if (filters.policyId) {
    conditions.push(
      "eapa.policy_id = ?"
    );

    parameters.push(
      filters.policyId
    );
  }

  if (
    filters.isCurrent !==
    undefined
  ) {
    conditions.push(
      "eapa.is_current = ?"
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
        eapa.effective_to,
        '9999-12-31'
      ) >= ?
    `);

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "eapa.effective_from <= ?"
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

        FROM employee_attendance_policy_assignments eapa

        INNER JOIN employees e
            ON e.employee_id =
               eapa.employee_id

        INNER JOIN attendance_policies ap
            ON ap.policy_id =
               eapa.policy_id

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
        ${attendancePolicyAssignmentSelect}
        WHERE ${whereClause}
        ORDER BY
            eapa.effective_from DESC,
            eapa.assignment_id DESC
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
        AttendancePolicyAssignmentDatabaseRow[],

    totalRecords
  };
}

export async function findAttendancePolicyAssignmentManagementRecordById(
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<AttendancePolicyAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE eapa.assignment_id = ?
          AND eapa.employee_id = ?
          AND e.company_id = ?
          AND e.deleted_at IS NULL
        LIMIT 1
      `,
      [
        assignmentId,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendancePolicyAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Policy-assignment create
 * =========================================================
 */

export async function createAttendancePolicyAssignmentManagementRecord(
  companyId: string,
  input:
    CreateAttendancePolicyAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyAssignmentDatabaseRow> {
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

    await assertAttendancePolicyAvailable(
      connection,
      companyId,
      input.policyId
    );

    await assertNoPolicyAssignmentOverlap(
      connection,
      input.employeeId,
      input.effectiveFrom,
      input.effectiveTo,
      null
    );

    if (input.isCurrent) {
      await clearOtherCurrentPolicyAssignments(
        connection,
        input.employeeId,
        null
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

          input.isCurrent
            ? 1
            : 0,

          input.assignedByUserId
        ]
      ) as InsertResult;

    const assignmentId =
      String(
        insertResult.insertId
      );

    const created =
      await selectPolicyAssignmentUsingConnection(
        connection,
        companyId,
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
          "attendance_policy_assigned",

        tableName:
          "employee_attendance_policy_assignments",

        recordId:
          assignmentId,

        newValues:
          policyAssignmentLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/attendance-policy-assignments`,

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
 * Policy-assignment update
 * =========================================================
 */

export async function updateAttendancePolicyAssignmentManagementRecord(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  input:
    UpdateAttendancePolicyAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockPolicyAssignment(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const finalPolicyId =
      input.policyId ??
      String(
        existing.policy_id
      );

    const finalEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(
        existing.effective_from
      );

    if (!finalEffectiveFrom) {
      throw new Error(
        "INVALID_ATTENDANCE_POLICY_ASSIGNMENT_DATE"
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

    if (
      finalEffectiveTo !== null &&
      finalEffectiveTo <
        finalEffectiveFrom
    ) {
      throw new Error(
        "INVALID_ATTENDANCE_POLICY_ASSIGNMENT_DATES"
      );
    }

    await assertAttendancePolicyAvailable(
      connection,
      companyId,
      finalPolicyId
    );

    await assertNoPolicyAssignmentOverlap(
      connection,
      employeeId,
      finalEffectiveFrom,
      finalEffectiveTo,
      assignmentId
    );

    if (finalIsCurrent) {
      await clearOtherCurrentPolicyAssignments(
        connection,
        employeeId,
        assignmentId
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
      input.policyId !==
      undefined
    ) {
      addUpdate(
        "policy_id",
        input.policyId
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
      assignments.length === 0
    ) {
      throw new Error(
        "NO_ATTENDANCE_POLICY_ASSIGNMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      assignmentId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_attendance_policy_assignments
        SET ${assignments.join(", ")}
        WHERE assignment_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    if (
      databaseBoolean(
        existing.is_current
      ) &&
      !finalIsCurrent
    ) {
      await refreshEmployeeCurrentPolicyAssignment(
        connection,
        employeeId
      );
    }

    const updated =
      await selectPolicyAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_policy_assignment_updated",

        tableName:
          "employee_attendance_policy_assignments",

        recordId:
          assignmentId,

        oldValues:
          policyAssignmentLogSummary(
            existing
          ),

        newValues:
          policyAssignmentLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/attendance-policy-assignments/${assignmentId}`,

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
 * Policy-assignment delete
 * =========================================================
 */

export async function deleteAttendancePolicyAssignmentManagementRecord(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendancePolicyAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockPolicyAssignment(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const fullExisting =
      await selectPolicyAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!fullExisting) {
      throw new Error(
        "ATTENDANCE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    const wasCurrent =
      databaseBoolean(
        existing.is_current
      );

    await connection.query(
      `
        DELETE FROM employee_attendance_policy_assignments
        WHERE assignment_id = ?
          AND employee_id = ?
      `,
      [
        assignmentId,
        employeeId
      ]
    );

    if (wasCurrent) {
      await refreshEmployeeCurrentPolicyAssignment(
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
          "attendance_policy_assignment_deleted",

        tableName:
          "employee_attendance_policy_assignments",

        recordId:
          assignmentId,

        oldValues:
          policyAssignmentLogSummary(
            fullExisting
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/attendance-policy-assignments/${assignmentId}`,

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
 * Effective employee policy assignment
 * =========================================================
 */

export async function findEffectiveAttendancePolicyAssignmentManagementRecord(
  companyId: string,
  employeeId: string,
  asOfDate: string
): Promise<AttendancePolicyAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${attendancePolicyAssignmentSelect}
        WHERE e.company_id = ?
          AND eapa.employee_id = ?
          AND e.deleted_at IS NULL
          AND ap.deleted_at IS NULL
          AND ap.is_active = 1
          AND eapa.effective_from <= ?
          AND (
            eapa.effective_to IS NULL
            OR eapa.effective_to >= ?
          )
        ORDER BY
            eapa.is_current DESC,
            eapa.effective_from DESC,
            eapa.assignment_id DESC
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
      | AttendancePolicyAssignmentDatabaseRow
      | undefined
  ) ?? null;
}
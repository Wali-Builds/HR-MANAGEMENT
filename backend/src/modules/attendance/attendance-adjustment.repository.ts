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
  AttendanceAdjustmentApprovalDatabaseRow,
  AttendanceAdjustmentDecisionRecord,
  AttendanceAdjustmentRequestDatabaseRow,
  CreateAttendanceAdjustmentRequestRecord,
  UpdateAttendanceAdjustmentRequestRecord
} from "./attendance-adjustment.types.js";

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

interface LockedAdjustmentRequestRow {
  adjustment_request_id:
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

  attendance_id:
    | string
    | number
    | bigint
    | null;

  attendance_date:
    | Date
    | string;

  adjustment_type: string;

  current_check_in_at:
    | Date
    | string
    | null;

  current_check_out_at:
    | Date
    | string
    | null;

  current_status_code:
    | string
    | null;

  requested_check_in_at:
    | Date
    | string
    | null;

  requested_check_out_at:
    | Date
    | string
    | null;

  requested_status_code:
    | string
    | null;

  reason: string;
  attachment_path: string | null;

  request_status: string;

  requested_by_user_id:
    | string
    | number
    | bigint
    | null;

  final_decision_by:
    | string
    | number
    | bigint
    | null;

  final_decision_at:
    | Date
    | string
    | null;

  final_remarks:
    | string
    | null;
}

interface LockedAttendanceRow {
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

  check_in_at:
    | Date
    | string
    | null;

  check_out_at:
    | Date
    | string
    | null;

  status_code: string;

  is_finalized:
    | number
    | boolean;
}

interface AttendanceAdjustmentRequestListFilters {
  employeeId?: string | undefined;
  attendanceId?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  requestStatus?: string | undefined;
  adjustmentType?: string | undefined;

  requestedByUserId?: string | undefined;
  finalDecisionBy?: string | undefined;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface EmployeeAdjustmentListFilters {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  requestStatus?: string | undefined;
  adjustmentType?: string | undefined;

  page: number;
  pageSize: number;
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

interface BreakAggregateRow {
  total_break_minutes:
    | string
    | number
    | null;

  unpaid_break_minutes:
    | string
    | number
    | null;
}

interface StatusCandidateRow {
  status_code: string;

  is_payable:
    | number
    | boolean;
}

interface PaginatedResult<T> {
  records: T[];
  totalRecords: number;
}

export interface AttendanceAdjustmentDecisionResult {
  adjustmentRequest:
    AttendanceAdjustmentRequestDatabaseRow;

  approval:
    AttendanceAdjustmentApprovalDatabaseRow;

  attendanceId:
    string | null;
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
    return value.slice(
      0,
      10
    );
  }

  return new Date(value)
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

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "INVALID_ATTENDANCE_ADJUSTMENT_DATETIME"
    );
  }

  return parsed
    .toISOString()
    .slice(0, 19)
    .replace(
      "T",
      " "
    );
}

function normalizeDatabaseDateTime(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value
      .toISOString()
      .slice(0, 19)
      .replace(
        "T",
        " "
      );
  }

  if (
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      19
    );
  }

  return toDatabaseDateTime(
    value
  );
}

function offsetFromPagination(
  page: number,
  pageSize: number
): number {
  return (
    page - 1
  ) * pageSize;
}

function requestLogSummary(
  request:
    | AttendanceAdjustmentRequestDatabaseRow
    | LockedAdjustmentRequestRow
) {
  return {
    adjustmentRequestId:
      String(
        request.adjustment_request_id
      ),

    employeeId:
      String(
        request.employee_id
      ),

    attendanceId:
      request.attendance_id === null
        ? null
        : String(
            request.attendance_id
          ),

    attendanceDate:
      databaseDateOnly(
        request.attendance_date
      ),

    adjustmentType:
      request.adjustment_type,

    requestStatus:
      request.request_status,

    requestedCheckInChange:
      request.requested_check_in_at !==
      null,

    requestedCheckOutChange:
      request.requested_check_out_at !==
      null,

    requestedStatusChange:
      request.requested_status_code !==
      null
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

const adjustmentRequestSelect = `
  SELECT
      aar.adjustment_request_id,
      aar.company_id,
      aar.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      aar.attendance_id,
      aar.attendance_date,

      aar.adjustment_type,

      aar.current_check_in_at,
      aar.current_check_out_at,
      aar.current_status_code,

      current_status.status_name
          AS current_status_name,

      aar.requested_check_in_at,
      aar.requested_check_out_at,
      aar.requested_status_code,

      requested_status.status_name
          AS requested_status_name,

      aar.reason,
      aar.attachment_path,
      aar.request_status,

      aar.requested_by_user_id,

      requested_user.username
          AS requested_by_username,

      requested_user.full_name
          AS requested_by_full_name,

      aar.final_decision_by,

      final_user.username
          AS final_decision_username,

      final_user.full_name
          AS final_decision_full_name,

      aar.final_decision_at,
      aar.final_remarks,

      (
        SELECT COUNT(*)
        FROM attendance_adjustment_approvals aaa_count
        WHERE aaa_count.adjustment_request_id =
              aar.adjustment_request_id
      ) AS approval_count,

      (
        SELECT COUNT(*)
        FROM attendance_adjustment_approvals aaa_pending
        WHERE aaa_pending.adjustment_request_id =
              aar.adjustment_request_id
          AND aaa_pending.decision =
              'PENDING'
      ) AS pending_approval_count,

      aar.created_at,
      aar.updated_at

  FROM attendance_adjustment_requests aar

  INNER JOIN employees e
      ON e.employee_id =
         aar.employee_id

  LEFT JOIN attendance_statuses current_status
      ON current_status.status_code =
         aar.current_status_code

  LEFT JOIN attendance_statuses requested_status
      ON requested_status.status_code =
         aar.requested_status_code

  LEFT JOIN users requested_user
      ON requested_user.user_id =
         aar.requested_by_user_id

  LEFT JOIN users final_user
      ON final_user.user_id =
         aar.final_decision_by
`;

const adjustmentApprovalSelect = `
  SELECT
      aaa.approval_id,
      aaa.adjustment_request_id,

      aar.company_id,
      aar.employee_id,

      aaa.approval_level,
      aaa.approver_user_id,

      approver.username
          AS approver_username,

      approver.full_name
          AS approver_full_name,

      aaa.decision,
      aaa.comments,
      aaa.decided_at,
      aaa.created_at,
      aaa.updated_at

  FROM attendance_adjustment_approvals aaa

  INNER JOIN attendance_adjustment_requests aar
      ON aar.adjustment_request_id =
         aaa.adjustment_request_id

  INNER JOIN users approver
      ON approver.user_id =
         aaa.approver_user_id
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

async function lockAdjustmentRequest(
  connection: PoolConnection,
  companyId: string,
  adjustmentRequestId: string
): Promise<LockedAdjustmentRequestRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            adjustment_request_id,
            company_id,
            employee_id,
            attendance_id,
            attendance_date,
            adjustment_type,
            current_check_in_at,
            current_check_out_at,
            current_status_code,
            requested_check_in_at,
            requested_check_out_at,
            requested_status_code,
            reason,
            attachment_path,
            request_status,
            requested_by_user_id,
            final_decision_by,
            final_decision_at,
            final_remarks
        FROM attendance_adjustment_requests
        WHERE adjustment_request_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        adjustmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedAdjustmentRequestRow
      | undefined
  ) ?? null;
}

async function lockAttendanceById(
  connection: PoolConnection,
  companyId: string,
  attendanceId: string
): Promise<LockedAttendanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            attendance_id,
            company_id,
            employee_id,
            attendance_date,
            check_in_at,
            check_out_at,
            status_code,
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
      | LockedAttendanceRow
      | undefined
  ) ?? null;
}

async function lockAttendanceByEmployeeDate(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  attendanceDate: string
): Promise<LockedAttendanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            attendance_id,
            company_id,
            employee_id,
            attendance_date,
            check_in_at,
            check_out_at,
            status_code,
            is_finalized
        FROM attendance_records
        WHERE company_id = ?
          AND employee_id = ?
          AND attendance_date = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        companyId,
        employeeId,
        attendanceDate
      ]
    );

  return (
    rows[0] as
      | LockedAttendanceRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Select helpers
 * =========================================================
 */

async function selectAdjustmentRequestUsingConnection(
  connection: PoolConnection,
  companyId: string,
  adjustmentRequestId: string
): Promise<AttendanceAdjustmentRequestDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${adjustmentRequestSelect}
        WHERE aar.adjustment_request_id = ?
          AND aar.company_id = ?
        LIMIT 1
      `,
      [
        adjustmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceAdjustmentRequestDatabaseRow
      | undefined
  ) ?? null;
}

async function selectApprovalUsingConnection(
  connection: PoolConnection,
  companyId: string,
  approvalId: string
): Promise<AttendanceAdjustmentApprovalDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${adjustmentApprovalSelect}
        WHERE aaa.approval_id = ?
          AND aar.company_id = ?
        LIMIT 1
      `,
      [
        approvalId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceAdjustmentApprovalDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * List and find requests
 * =========================================================
 */

export async function listAttendanceAdjustmentRequestRecords(
  companyId: string,
  filters:
    AttendanceAdjustmentRequestListFilters
): Promise<
  PaginatedResult<
    AttendanceAdjustmentRequestDatabaseRow
  >
> {
  const conditions: string[] = [
    "aar.company_id = ?",
    "e.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "aar.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.attendanceId) {
    conditions.push(
      "aar.attendance_id = ?"
    );

    parameters.push(
      filters.attendanceId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "aar.attendance_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "aar.attendance_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (filters.requestStatus) {
    conditions.push(
      "aar.request_status = ?"
    );

    parameters.push(
      filters.requestStatus
    );
  }

  if (filters.adjustmentType) {
    conditions.push(
      "aar.adjustment_type = ?"
    );

    parameters.push(
      filters.adjustmentType
    );
  }

  if (filters.requestedByUserId) {
    conditions.push(
      "aar.requested_by_user_id = ?"
    );

    parameters.push(
      filters.requestedByUserId
    );
  }

  if (filters.finalDecisionBy) {
    conditions.push(
      "aar.final_decision_by = ?"
    );

    parameters.push(
      filters.finalDecisionBy
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
        OR aar.adjustment_type LIKE ?
        OR aar.reason LIKE ?
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
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT
            COUNT(*) AS total_records
        FROM attendance_adjustment_requests aar
        INNER JOIN employees e
            ON e.employee_id =
               aar.employee_id
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
        ${adjustmentRequestSelect}
        WHERE ${whereClause}
        ORDER BY
            aar.created_at DESC,
            aar.adjustment_request_id DESC
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
        AttendanceAdjustmentRequestDatabaseRow[],

    totalRecords
  };
}

export async function listEmployeeAttendanceAdjustmentRequestRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeAdjustmentListFilters
): Promise<
  PaginatedResult<
    AttendanceAdjustmentRequestDatabaseRow
  >
> {
  return listAttendanceAdjustmentRequestRecords(
    companyId,
    {
      employeeId,

      ...(filters.dateFrom !== undefined
        ? {
            dateFrom:
              filters.dateFrom
          }
        : {}),

      ...(filters.dateTo !== undefined
        ? {
            dateTo:
              filters.dateTo
          }
        : {}),

      ...(filters.requestStatus !== undefined
        ? {
            requestStatus:
              filters.requestStatus
          }
        : {}),

      ...(filters.adjustmentType !== undefined
        ? {
            adjustmentType:
              filters.adjustmentType
          }
        : {}),

      page:
        filters.page,

      pageSize:
        filters.pageSize
    }
  );
}

export async function findAttendanceAdjustmentRequestRecord(
  companyId: string,
  adjustmentRequestId: string
): Promise<AttendanceAdjustmentRequestDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${adjustmentRequestSelect}
        WHERE aar.adjustment_request_id = ?
          AND aar.company_id = ?
        LIMIT 1
      `,
      [
        adjustmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | AttendanceAdjustmentRequestDatabaseRow
      | undefined
  ) ?? null;
}

export async function listAttendanceAdjustmentApprovalRecords(
  companyId: string,
  adjustmentRequestId: string
): Promise<
  AttendanceAdjustmentApprovalDatabaseRow[]
> {
  const rows =
    await databasePool.query(
      `
        ${adjustmentApprovalSelect}
        WHERE aaa.adjustment_request_id = ?
          AND aar.company_id = ?
        ORDER BY
            aaa.approval_level ASC,
            aaa.created_at ASC,
            aaa.approval_id ASC
      `,
      [
        adjustmentRequestId,
        companyId
      ]
    );

  return rows as
    AttendanceAdjustmentApprovalDatabaseRow[];
}

/*
 * =========================================================
 * Create adjustment request
 * =========================================================
 */

export async function createAttendanceAdjustmentRequestRecord(
  input:
    CreateAttendanceAdjustmentRequestRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceAdjustmentRequestDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployee(
        connection,
        input.companyId,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    let attendance:
      LockedAttendanceRow | null =
        null;

    if (input.attendanceId !== null) {
      attendance =
        await lockAttendanceById(
          connection,
          input.companyId,
          input.attendanceId
        );

      if (!attendance) {
        throw new Error(
          "ATTENDANCE_RECORD_NOT_FOUND"
        );
      }
    } else {
      attendance =
        await lockAttendanceByEmployeeDate(
          connection,
          input.companyId,
          input.employeeId,
          input.attendanceDate
        );
    }

    if (attendance) {
      if (
        String(
          attendance.employee_id
        ) !== input.employeeId
      ) {
        throw new Error(
          "ATTENDANCE_ADJUSTMENT_EMPLOYEE_MISMATCH"
        );
      }

      if (
        databaseDateOnly(
          attendance.attendance_date
        ) !== input.attendanceDate
      ) {
        throw new Error(
          "ATTENDANCE_ADJUSTMENT_DATE_MISMATCH"
        );
      }
    }

    const pendingRows =
      await connection.query(
        `
          SELECT adjustment_request_id
          FROM attendance_adjustment_requests
          WHERE company_id = ?
            AND employee_id = ?
            AND attendance_date = ?
            AND request_status = 'PENDING'
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.companyId,
          input.employeeId,
          input.attendanceDate
        ]
      );

    if (
      pendingRows.length > 0
    ) {
      throw new Error(
        "PENDING_ATTENDANCE_ADJUSTMENT_EXISTS"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO attendance_adjustment_requests (
              company_id,
              employee_id,
              attendance_id,
              attendance_date,
              adjustment_type,
              current_check_in_at,
              current_check_out_at,
              current_status_code,
              requested_check_in_at,
              requested_check_out_at,
              requested_status_code,
              reason,
              attachment_path,
              request_status,
              requested_by_user_id
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
              'PENDING',
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,

          attendance
            ? String(
                attendance.attendance_id
              )
            : null,

          input.attendanceDate,
          input.adjustmentType,

          attendance
            ? attendance.check_in_at
            : null,

          attendance
            ? attendance.check_out_at
            : null,

          attendance
            ? attendance.status_code
            : null,

          input.requestedCheckInAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.requestedCheckInAt
              ),

          input.requestedCheckOutAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.requestedCheckOutAt
              ),

          input.requestedStatusCode,

          input.reason,
          input.attachmentPath,
          input.requestedByUserId
        ]
      );

    const adjustmentRequestId =
      String(
        insertResult.insertId
      );

    const created =
      await selectAdjustmentRequestUsingConnection(
        connection,
        input.companyId,
        adjustmentRequestId
      );

    if (!created) {
      throw new Error(
        "CREATED_ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "attendance_adjustment_requested",

        tableName:
          "attendance_adjustment_requests",

        recordId:
          adjustmentRequestId,

        newValues:
          requestLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/adjustment-requests",

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
 * Update pending request
 * =========================================================
 */

export async function updateAttendanceAdjustmentRequestRecord(
  companyId: string,
  adjustmentRequestId: string,
  input:
    UpdateAttendanceAdjustmentRequestRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceAdjustmentRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAdjustmentRequest(
        connection,
        companyId,
        adjustmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_NOT_PENDING"
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(
        `${column} = ?`
      );

      parameters.push(
        value
      );
    };

    if (
      input.adjustmentType !==
      undefined
    ) {
      addUpdate(
        "adjustment_type",
        input.adjustmentType
      );
    }

    if (
      input.requestedCheckInAt !==
      undefined
    ) {
      addUpdate(
        "requested_check_in_at",

        input.requestedCheckInAt ===
        null
          ? null
          : toDatabaseDateTime(
              input.requestedCheckInAt
            )
      );
    }

    if (
      input.requestedCheckOutAt !==
      undefined
    ) {
      addUpdate(
        "requested_check_out_at",

        input.requestedCheckOutAt ===
        null
          ? null
          : toDatabaseDateTime(
              input.requestedCheckOutAt
            )
      );
    }

    if (
      input.requestedStatusCode !==
      undefined
    ) {
      addUpdate(
        "requested_status_code",
        input.requestedStatusCode
      );
    }

    if (input.reason !== undefined) {
      addUpdate(
        "reason",
        input.reason
      );
    }

    if (
      input.attachmentPath !==
      undefined
    ) {
      addUpdate(
        "attachment_path",
        input.attachmentPath
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_ATTENDANCE_ADJUSTMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      adjustmentRequestId,
      companyId
    );

    await connection.query(
      `
        UPDATE attendance_adjustment_requests
        SET ${assignments.join(", ")}
        WHERE adjustment_request_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectAdjustmentRequestUsingConnection(
        connection,
        companyId,
        adjustmentRequestId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_adjustment_updated",

        tableName:
          "attendance_adjustment_requests",

        recordId:
          adjustmentRequestId,

        oldValues:
          requestLogSummary(
            existing
          ),

        newValues:
          requestLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/adjustment-requests/${adjustmentRequestId}`,

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
 * Cancel request
 * =========================================================
 */

export async function cancelAttendanceAdjustmentRequestRecord(
  companyId: string,
  adjustmentRequestId: string,
  cancelledByUserId: string,
  comments: string | null,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceAdjustmentRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockAdjustmentRequest(
        connection,
        companyId,
        adjustmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_NOT_PENDING"
      );
    }

    await connection.query(
      `
        UPDATE attendance_adjustment_requests
        SET
            request_status = 'CANCELLED',
            final_decision_by = ?,
            final_decision_at =
                CURRENT_TIMESTAMP,
            final_remarks = ?
        WHERE adjustment_request_id = ?
          AND company_id = ?
      `,
      [
        cancelledByUserId,
        comments,
        adjustmentRequestId,
        companyId
      ]
    );

    const cancelled =
      await selectAdjustmentRequestUsingConnection(
        connection,
        companyId,
        adjustmentRequestId
      );

    if (!cancelled) {
      throw new Error(
        "CANCELLED_ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "attendance_adjustment_cancelled",

        tableName:
          "attendance_adjustment_requests",

        recordId:
          adjustmentRequestId,

        oldValues:
          requestLogSummary(
            existing
          ),

        newValues:
          requestLogSummary(
            cancelled
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/adjustment-requests/${adjustmentRequestId}/cancel`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return cancelled;
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
 * Recalculate adjusted attendance
 * =========================================================
 */

async function recalculateAdjustedAttendance(
  connection: PoolConnection,
  attendanceId: string,
  preserveStatus: boolean
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

  if (
    context.check_in_at !== null &&
    context.check_out_at !== null &&
    new Date(
      context.check_out_at
    ).getTime() <
      new Date(
        context.check_in_at
      ).getTime()
  ) {
    throw new Error(
      "INVALID_ATTENDANCE_ADJUSTMENT_CHECK_OUT"
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
            ) AS unpaid_break_minutes

        FROM attendance_breaks
        WHERE attendance_id = ?
      `,
      [
        attendanceId
      ]
    );

  const breaks =
    breakRows[0] as
      | BreakAggregateRow
      | undefined;

  const totalBreakMinutes =
    Number(
      breaks?.total_break_minutes ??
      0
    );

  const unpaidBreakMinutes =
    Number(
      breaks?.unpaid_break_minutes ??
      0
    );

  const presenceMinutes =
    context.check_in_at !== null &&
    context.check_out_at !== null
      ? Math.max(
          0,
          Math.floor(
            (
              new Date(
                context.check_out_at
              ).getTime() -
              new Date(
                context.check_in_at
              ).getTime()
            ) /
            60000
          )
        )
      : 0;

  const deductBreakTime =
    databaseBoolean(
      context.policy_deduct_break_time
    );

  const totalWorkMinutes =
    Math.max(
      0,
      presenceMinutes -
        (
          deductBreakTime
            ? unpaidBreakMinutes
            : 0
        )
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

  const expectedWorkMinutes =
    scheduleExpectedMinutes > 0
      ? scheduleExpectedMinutes
      : shiftExpectedMinutes > 0
        ? shiftExpectedMinutes
        : scheduledDurationMinutes > 0
          ? scheduledDurationMinutes
          : policyFullDayMinutes;

  const rawLateMinutes =
    context.check_in_at !== null &&
    context.scheduled_start_at !== null
      ? Math.max(
          0,
          Math.floor(
            (
              new Date(
                context.check_in_at
              ).getTime() -
              new Date(
                context.scheduled_start_at
              ).getTime()
            ) /
            60000
          )
        )
      : 0;

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

  const lateMinutes =
    Math.max(
      0,
      rawLateMinutes -
        lateGraceMinutes
    );

  const rawEarlyMinutes =
    context.check_out_at !== null &&
    context.scheduled_end_at !== null
      ? Math.max(
          0,
          Math.floor(
            (
              new Date(
                context.scheduled_end_at
              ).getTime() -
              new Date(
                context.check_out_at
              ).getTime()
            ) /
            60000
          )
        )
      : 0;

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

  const earlyDepartureMinutes =
    Math.max(
      0,
      rawEarlyMinutes -
        earlyGraceMinutes
    );

  let overtimeMinutes = 0;

  if (
    databaseBoolean(
      context.policy_overtime_enabled
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
      context
        .policy_maximum_overtime_minutes_day ===
      null
        ? null
        : Number(
            context
              .policy_maximum_overtime_minutes_day
          );

    if (
      maximumOvertimeMinutes !==
      null
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
    ) as StatusCandidateRow[];

  const statusMap =
    new Map<
      string,
      StatusCandidateRow
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

  if (!preserveStatus) {
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
      statusCode =
        databaseBoolean(
          context.policy_require_checkout
        )
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

  const status =
    statusMap.get(
      statusCode
    );

  const isPayable =
    status
      ? databaseBoolean(
          status.is_payable
        )
      : false;

  let payableMinutes = 0;

  if (isPayable) {
    payableMinutes =
      totalWorkMinutes > 0
        ? totalWorkMinutes
        : context.check_in_at === null
          ? expectedWorkMinutes
          : 0;
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

/*
 * =========================================================
 * Approval and rejection
 * =========================================================
 */

export async function decideAttendanceAdjustmentRequestRecord(
  companyId: string,
  input:
    AttendanceAdjustmentDecisionRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<AttendanceAdjustmentDecisionResult> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const request =
      await lockAdjustmentRequest(
        connection,
        companyId,
        input.adjustmentRequestId
      );

    if (!request) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      );
    }

    if (
      request.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_NOT_PENDING"
      );
    }

    if (
      request.requested_by_user_id !==
        null &&
      String(
        request.requested_by_user_id
      ) === input.approverUserId
    ) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_SELF_APPROVAL_DENIED"
      );
    }

    const approvalInsertResult =
      await connection.query(
        `
          INSERT INTO attendance_adjustment_approvals (
              adjustment_request_id,
              approval_level,
              approver_user_id,
              decision,
              comments,
              decided_at
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              CURRENT_TIMESTAMP
          )
        `,
        [
          input.adjustmentRequestId,
          input.approvalLevel,
          input.approverUserId,
          input.decision,
          input.comments
        ]
      );

    const approvalId =
      String(
        approvalInsertResult.insertId
      );

    let attendanceId:
      string | null = null;

    if (
      input.decision ===
      "APPROVED"
    ) {
      if (
        request.requested_status_code !==
        null
      ) {
        const statusRows =
          await connection.query(
            `
              SELECT status_code
              FROM attendance_statuses
              WHERE status_code = ?
                AND is_active = 1
              LIMIT 1
              FOR UPDATE
            `,
            [
              request
                .requested_status_code
            ]
          );

        if (
          statusRows.length === 0
        ) {
          throw new Error(
            "REQUESTED_ATTENDANCE_STATUS_NOT_FOUND"
          );
        }
      }

      let attendance:
        LockedAttendanceRow | null =
          null;

      if (
        request.attendance_id !==
        null
      ) {
        attendance =
          await lockAttendanceById(
            connection,
            companyId,
            String(
              request.attendance_id
            )
          );

        if (!attendance) {
          throw new Error(
            "ATTENDANCE_RECORD_NOT_FOUND"
          );
        }
      } else {
        attendance =
          await lockAttendanceByEmployeeDate(
            connection,
            companyId,
            String(
              request.employee_id
            ),
            databaseDateOnly(
              request.attendance_date
            ) as string
          );

        if (attendance) {
          throw new Error(
            "ATTENDANCE_ADJUSTMENT_STALE"
          );
        }
      }

      if (attendance) {
        if (
          String(
            attendance.employee_id
          ) !==
            String(
              request.employee_id
            ) ||
          databaseDateOnly(
            attendance.attendance_date
          ) !==
            databaseDateOnly(
              request.attendance_date
            )
        ) {
          throw new Error(
            "ATTENDANCE_ADJUSTMENT_RECORD_MISMATCH"
          );
        }

        const currentCheckIn =
          normalizeDatabaseDateTime(
            attendance.check_in_at
          );

        const snapshotCheckIn =
          normalizeDatabaseDateTime(
            request.current_check_in_at
          );

        const currentCheckOut =
          normalizeDatabaseDateTime(
            attendance.check_out_at
          );

        const snapshotCheckOut =
          normalizeDatabaseDateTime(
            request.current_check_out_at
          );

        if (
          currentCheckIn !==
            snapshotCheckIn ||
          currentCheckOut !==
            snapshotCheckOut ||
          attendance.status_code !==
            request.current_status_code
        ) {
          throw new Error(
            "ATTENDANCE_ADJUSTMENT_STALE"
          );
        }
      }

      const requestedCheckIn =
        normalizeDatabaseDateTime(
          request.requested_check_in_at
        );

      const requestedCheckOut =
        normalizeDatabaseDateTime(
          request.requested_check_out_at
        );

      const requestedStatus =
        request.requested_status_code;

      if (
        requestedCheckIn === null &&
        requestedCheckOut === null &&
        requestedStatus === null
      ) {
        throw new Error(
          "ATTENDANCE_ADJUSTMENT_HAS_NO_CHANGES"
        );
      }

      const resultingCheckIn =
        requestedCheckIn ??
        normalizeDatabaseDateTime(
          attendance?.check_in_at ??
          null
        );

      const resultingCheckOut =
        requestedCheckOut ??
        normalizeDatabaseDateTime(
          attendance?.check_out_at ??
          null
        );

      if (
        resultingCheckIn !== null &&
        resultingCheckOut !== null &&
        new Date(
          resultingCheckOut
        ).getTime() <
          new Date(
            resultingCheckIn
          ).getTime()
      ) {
        throw new Error(
          "INVALID_ATTENDANCE_ADJUSTMENT_CHECK_OUT"
        );
      }

      if (attendance) {
        attendanceId =
          String(
            attendance.attendance_id
          );

        await connection.query(
          `
            UPDATE attendance_records
            SET
                check_in_at = ?,
                check_out_at = ?,
                status_code =
                    COALESCE(
                      ?,
                      status_code
                    ),
                attendance_source =
                    'ADJUSTMENT',
                is_manually_modified = 1,
                is_finalized = 1,
                finalized_by_user_id = ?,
                finalized_at =
                    CURRENT_TIMESTAMP
            WHERE attendance_id = ?
              AND company_id = ?
          `,
          [
            resultingCheckIn,
            resultingCheckOut,
            requestedStatus,
            input.approverUserId,
            attendanceId,
            companyId
          ]
        );
      } else {
        const insertResult =
          await connection.query(
            `
              INSERT INTO attendance_records (
                  company_id,
                  employee_id,
                  attendance_date,
                  check_in_at,
                  check_out_at,
                  status_code,
                  attendance_source,
                  is_manually_modified,
                  is_finalized,
                  finalized_by_user_id,
                  finalized_at
              )
              VALUES (
                  ?,
                  ?,
                  ?,
                  ?,
                  ?,
                  COALESCE(
                    ?,
                    'ABSENT'
                  ),
                  'ADJUSTMENT',
                  1,
                  1,
                  ?,
                  CURRENT_TIMESTAMP
              )
            `,
            [
              companyId,
              String(
                request.employee_id
              ),
              databaseDateOnly(
                request.attendance_date
              ),
              resultingCheckIn,
              resultingCheckOut,
              requestedStatus,
              input.approverUserId
            ]
          );

        attendanceId =
          String(
            insertResult.insertId
          );

        await connection.query(
          `
            UPDATE attendance_adjustment_requests
            SET attendance_id = ?
            WHERE adjustment_request_id = ?
          `,
          [
            attendanceId,
            input.adjustmentRequestId
          ]
        );
      }

      await recalculateAdjustedAttendance(
        connection,
        attendanceId,
        requestedStatus !== null
      );

      await connection.query(
        `
          UPDATE attendance_adjustment_requests
          SET
              request_status =
                  'APPROVED',
              final_decision_by = ?,
              final_decision_at =
                  CURRENT_TIMESTAMP,
              final_remarks = ?
          WHERE adjustment_request_id = ?
            AND company_id = ?
        `,
        [
          input.approverUserId,
          input.finalRemarks,
          input.adjustmentRequestId,
          companyId
        ]
      );
    } else {
      await connection.query(
        `
          UPDATE attendance_adjustment_requests
          SET
              request_status =
                  'REJECTED',
              final_decision_by = ?,
              final_decision_at =
                  CURRENT_TIMESTAMP,
              final_remarks = ?
          WHERE adjustment_request_id = ?
            AND company_id = ?
        `,
        [
          input.approverUserId,
          input.finalRemarks ??
            input.comments,

          input.adjustmentRequestId,
          companyId
        ]
      );
    }

    const decidedRequest =
      await selectAdjustmentRequestUsingConnection(
        connection,
        companyId,
        input.adjustmentRequestId
      );

    if (!decidedRequest) {
      throw new Error(
        "DECIDED_ATTENDANCE_ADJUSTMENT_NOT_FOUND"
      );
    }

    const approval =
      await selectApprovalUsingConnection(
        connection,
        companyId,
        approvalId
      );

    if (!approval) {
      throw new Error(
        "ATTENDANCE_ADJUSTMENT_APPROVAL_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          input.decision ===
          "APPROVED"
            ? "attendance_adjustment_approved"
            : "attendance_adjustment_rejected",

        tableName:
          "attendance_adjustment_requests",

        recordId:
          input.adjustmentRequestId,

        oldValues:
          requestLogSummary(
            request
          ),

        newValues:
          requestLogSummary(
            decidedRequest
          ),

        requestMethod:
          "POST",

        requestPath:
          input.decision ===
          "APPROVED"
            ? `/api/v1/attendance/adjustment-requests/${input.adjustmentRequestId}/approve`
            : `/api/v1/attendance/adjustment-requests/${input.adjustmentRequestId}/reject`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      adjustmentRequest:
        decidedRequest,

      approval,

      attendanceId
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
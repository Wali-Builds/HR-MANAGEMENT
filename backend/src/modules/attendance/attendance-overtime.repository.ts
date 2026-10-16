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
  CreateOvertimeRequestRecord,
  OvertimeDecisionRecord,
  OvertimeRequestDatabaseRow,
  UpdateOvertimeRequestRecord
} from "./attendance-overtime.types.js";

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

  overtime_minutes:
    | string
    | number;

  is_finalized:
    | number
    | boolean;
}

interface LockedOvertimeRequestRow {
  overtime_request_id:
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

  overtime_date:
    | Date
    | string;

  requested_start_at:
    | Date
    | string
    | null;

  requested_end_at:
    | Date
    | string
    | null;

  requested_minutes:
    | string
    | number;

  approved_minutes:
    | string
    | number
    | null;

  reason: string;
  request_status: string;

  requested_by_user_id:
    | string
    | number
    | bigint
    | null;

  approved_by_user_id:
    | string
    | number
    | bigint
    | null;

  approved_at:
    | Date
    | string
    | null;

  approval_remarks:
    | string
    | null;
}

interface OvertimeRequestListFilters {
  employeeId?: string | undefined;
  attendanceId?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  requestStatus?: string | undefined;

  requestedByUserId?: string | undefined;
  approvedByUserId?: string | undefined;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface EmployeeOvertimeRequestListFilters {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  requestStatus?: string | undefined;

  page: number;
  pageSize: number;
}

interface PaginatedResult<T> {
  records: T[];
  totalRecords: number;
}

export interface OvertimeDecisionResult {
  overtimeRequest:
    OvertimeRequestDatabaseRow;

  attendanceId: string | null;
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

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      "INVALID_OVERTIME_DATETIME"
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

function overtimeLogSummary(
  request:
    | OvertimeRequestDatabaseRow
    | LockedOvertimeRequestRow
) {
  return {
    overtimeRequestId:
      String(
        request.overtime_request_id
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

    overtimeDate:
      databaseDateOnly(
        request.overtime_date
      ),

    requestedMinutes:
      Number(
        request.requested_minutes
      ),

    approvedMinutes:
      request.approved_minutes ===
      null
        ? null
        : Number(
            request.approved_minutes
          ),

    requestStatus:
      request.request_status
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
 * Reusable SELECT
 * =========================================================
 */

const overtimeRequestSelect = `
  SELECT
      otr.overtime_request_id,
      otr.company_id,
      otr.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      otr.attendance_id,

      ar.attendance_date,

      otr.overtime_date,

      otr.requested_start_at,
      otr.requested_end_at,
      otr.requested_minutes,
      otr.approved_minutes,

      otr.reason,
      otr.request_status,

      otr.requested_by_user_id,

      requested_user.username
          AS requested_by_username,

      requested_user.full_name
          AS requested_by_full_name,

      otr.approved_by_user_id,

      approved_user.username
          AS approved_by_username,

      approved_user.full_name
          AS approved_by_full_name,

      otr.approved_at,
      otr.approval_remarks,

      ar.overtime_minutes
          AS attendance_overtime_minutes,

      ar.is_finalized
          AS attendance_is_finalized,

      otr.created_at,
      otr.updated_at

  FROM overtime_requests otr

  INNER JOIN employees e
      ON e.employee_id =
         otr.employee_id

  LEFT JOIN attendance_records ar
      ON ar.attendance_id =
         otr.attendance_id

  LEFT JOIN users requested_user
      ON requested_user.user_id =
         otr.requested_by_user_id

  LEFT JOIN users approved_user
      ON approved_user.user_id =
         otr.approved_by_user_id
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
            overtime_minutes,
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
  overtimeDate: string
): Promise<LockedAttendanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            attendance_id,
            company_id,
            employee_id,
            attendance_date,
            overtime_minutes,
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
        overtimeDate
      ]
    );

  return (
    rows[0] as
      | LockedAttendanceRow
      | undefined
  ) ?? null;
}

async function lockOvertimeRequest(
  connection: PoolConnection,
  companyId: string,
  overtimeRequestId: string
): Promise<LockedOvertimeRequestRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            overtime_request_id,
            company_id,
            employee_id,
            attendance_id,
            overtime_date,
            requested_start_at,
            requested_end_at,
            requested_minutes,
            approved_minutes,
            reason,
            request_status,
            requested_by_user_id,
            approved_by_user_id,
            approved_at,
            approval_remarks
        FROM overtime_requests
        WHERE overtime_request_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        overtimeRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedOvertimeRequestRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Select helper
 * =========================================================
 */

async function selectOvertimeRequestUsingConnection(
  connection: PoolConnection,
  companyId: string,
  overtimeRequestId: string
): Promise<OvertimeRequestDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${overtimeRequestSelect}
        WHERE otr.overtime_request_id = ?
          AND otr.company_id = ?
        LIMIT 1
      `,
      [
        overtimeRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | OvertimeRequestDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * List and get
 * =========================================================
 */

export async function listOvertimeRequestRecords(
  companyId: string,
  filters: OvertimeRequestListFilters
): Promise<
  PaginatedResult<
    OvertimeRequestDatabaseRow
  >
> {
  const conditions: string[] = [
    "otr.company_id = ?",
    "e.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "otr.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.attendanceId) {
    conditions.push(
      "otr.attendance_id = ?"
    );

    parameters.push(
      filters.attendanceId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "otr.overtime_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "otr.overtime_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (filters.requestStatus) {
    conditions.push(
      "otr.request_status = ?"
    );

    parameters.push(
      filters.requestStatus
    );
  }

  if (filters.requestedByUserId) {
    conditions.push(
      "otr.requested_by_user_id = ?"
    );

    parameters.push(
      filters.requestedByUserId
    );
  }

  if (filters.approvedByUserId) {
    conditions.push(
      "otr.approved_by_user_id = ?"
    );

    parameters.push(
      filters.approvedByUserId
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
        OR otr.reason LIKE ?
        OR otr.request_status LIKE ?
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
        FROM overtime_requests otr
        INNER JOIN employees e
            ON e.employee_id =
               otr.employee_id
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
        ${overtimeRequestSelect}
        WHERE ${whereClause}
        ORDER BY
            otr.created_at DESC,
            otr.overtime_request_id DESC
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
        OvertimeRequestDatabaseRow[],

    totalRecords
  };
}

export async function listEmployeeOvertimeRequestRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeOvertimeRequestListFilters
): Promise<
  PaginatedResult<
    OvertimeRequestDatabaseRow
  >
> {
  return listOvertimeRequestRecords(
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

      page:
        filters.page,

      pageSize:
        filters.pageSize
    }
  );
}

export async function findOvertimeRequestRecord(
  companyId: string,
  overtimeRequestId: string
): Promise<OvertimeRequestDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${overtimeRequestSelect}
        WHERE otr.overtime_request_id = ?
          AND otr.company_id = ?
        LIMIT 1
      `,
      [
        overtimeRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | OvertimeRequestDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Create request
 * =========================================================
 */

export async function createOvertimeRequestRecord(
  input: CreateOvertimeRequestRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<OvertimeRequestDatabaseRow> {
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
          input.overtimeDate
        );
    }

    if (attendance) {
      if (
        String(
          attendance.employee_id
        ) !== input.employeeId
      ) {
        throw new Error(
          "OVERTIME_ATTENDANCE_EMPLOYEE_MISMATCH"
        );
      }

      if (
        databaseDateOnly(
          attendance.attendance_date
        ) !== input.overtimeDate
      ) {
        throw new Error(
          "OVERTIME_ATTENDANCE_DATE_MISMATCH"
        );
      }
    }

    const pendingRows =
      await connection.query(
        `
          SELECT overtime_request_id
          FROM overtime_requests
          WHERE company_id = ?
            AND employee_id = ?
            AND overtime_date = ?
            AND request_status = 'PENDING'
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.companyId,
          input.employeeId,
          input.overtimeDate
        ]
      );

    if (
      pendingRows.length > 0
    ) {
      throw new Error(
        "PENDING_OVERTIME_REQUEST_EXISTS"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO overtime_requests (
              company_id,
              employee_id,
              attendance_id,
              overtime_date,
              requested_start_at,
              requested_end_at,
              requested_minutes,
              approved_minutes,
              reason,
              request_status,
              requested_by_user_id,
              approved_by_user_id,
              approved_at,
              approval_remarks
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              NULL,
              ?,
              'PENDING',
              ?,
              NULL,
              NULL,
              NULL
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

          input.overtimeDate,

          input.requestedStartAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.requestedStartAt
              ),

          input.requestedEndAt ===
          null
            ? null
            : toDatabaseDateTime(
                input.requestedEndAt
              ),

          input.requestedMinutes,
          input.reason,
          input.requestedByUserId
        ]
      );

    const overtimeRequestId =
      String(
        insertResult.insertId
      );

    const created =
      await selectOvertimeRequestUsingConnection(
        connection,
        input.companyId,
        overtimeRequestId
      );

    if (!created) {
      throw new Error(
        "CREATED_OVERTIME_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "overtime_request_created",

        tableName:
          "overtime_requests",

        recordId:
          overtimeRequestId,

        newValues:
          overtimeLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/overtime-requests",

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

export async function updateOvertimeRequestRecord(
  companyId: string,
  overtimeRequestId: string,
  input: UpdateOvertimeRequestRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<OvertimeRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockOvertimeRequest(
        connection,
        companyId,
        overtimeRequestId
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
        "OVERTIME_REQUEST_NOT_PENDING"
      );
    }

    const finalOvertimeDate =
      input.overtimeDate ??
      databaseDateOnly(
        existing.overtime_date
      );

    if (!finalOvertimeDate) {
      throw new Error(
        "INVALID_OVERTIME_DATE"
      );
    }

    const finalAttendanceId =
      input.attendanceId !== undefined
        ? input.attendanceId
        : existing.attendance_id === null
          ? null
          : String(
              existing.attendance_id
            );

    let attendance:
      LockedAttendanceRow | null =
        null;

    if (finalAttendanceId !== null) {
      attendance =
        await lockAttendanceById(
          connection,
          companyId,
          finalAttendanceId
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
            existing.employee_id
          ),
          finalOvertimeDate
        );
    }

    if (attendance) {
      if (
        String(
          attendance.employee_id
        ) !==
        String(
          existing.employee_id
        )
      ) {
        throw new Error(
          "OVERTIME_ATTENDANCE_EMPLOYEE_MISMATCH"
        );
      }

      if (
        databaseDateOnly(
          attendance.attendance_date
        ) !== finalOvertimeDate
      ) {
        throw new Error(
          "OVERTIME_ATTENDANCE_DATE_MISMATCH"
        );
      }
    }

    const duplicateRows =
      await connection.query(
        `
          SELECT overtime_request_id
          FROM overtime_requests
          WHERE company_id = ?
            AND employee_id = ?
            AND overtime_date = ?
            AND request_status = 'PENDING'
            AND overtime_request_id <> ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          companyId,
          String(
            existing.employee_id
          ),
          finalOvertimeDate,
          overtimeRequestId
        ]
      );

    if (
      duplicateRows.length > 0
    ) {
      throw new Error(
        "PENDING_OVERTIME_REQUEST_EXISTS"
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
      input.attendanceId !==
      undefined ||
      attendance !== null
    ) {
      addUpdate(
        "attendance_id",

        attendance
          ? String(
              attendance.attendance_id
            )
          : null
      );
    }

    if (
      input.overtimeDate !==
      undefined
    ) {
      addUpdate(
        "overtime_date",
        input.overtimeDate
      );
    }

    if (
      input.requestedStartAt !==
      undefined
    ) {
      addUpdate(
        "requested_start_at",

        input.requestedStartAt ===
        null
          ? null
          : toDatabaseDateTime(
              input.requestedStartAt
            )
      );
    }

    if (
      input.requestedEndAt !==
      undefined
    ) {
      addUpdate(
        "requested_end_at",

        input.requestedEndAt ===
        null
          ? null
          : toDatabaseDateTime(
              input.requestedEndAt
            )
      );
    }

    if (
      input.requestedMinutes !==
      undefined
    ) {
      addUpdate(
        "requested_minutes",
        input.requestedMinutes
      );
    }

    if (input.reason !== undefined) {
      addUpdate(
        "reason",
        input.reason
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_OVERTIME_UPDATE_FIELDS"
      );
    }

    parameters.push(
      overtimeRequestId,
      companyId
    );

    await connection.query(
      `
        UPDATE overtime_requests
        SET ${assignments.join(", ")}
        WHERE overtime_request_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectOvertimeRequestUsingConnection(
        connection,
        companyId,
        overtimeRequestId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_OVERTIME_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "overtime_request_updated",

        tableName:
          "overtime_requests",

        recordId:
          overtimeRequestId,

        oldValues:
          overtimeLogSummary(
            existing
          ),

        newValues:
          overtimeLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/overtime-requests/${overtimeRequestId}`,

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

export async function cancelOvertimeRequestRecord(
  companyId: string,
  overtimeRequestId: string,
  remarks: string | null,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<OvertimeRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockOvertimeRequest(
        connection,
        companyId,
        overtimeRequestId
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
        "OVERTIME_REQUEST_NOT_PENDING"
      );
    }

    await connection.query(
      `
        UPDATE overtime_requests
        SET
            request_status =
                'CANCELLED',

            approved_minutes =
                NULL,

            approved_by_user_id =
                NULL,

            approved_at =
                NULL,

            approval_remarks = ?
        WHERE overtime_request_id = ?
          AND company_id = ?
      `,
      [
        remarks,
        overtimeRequestId,
        companyId
      ]
    );

    const cancelled =
      await selectOvertimeRequestUsingConnection(
        connection,
        companyId,
        overtimeRequestId
      );

    if (!cancelled) {
      throw new Error(
        "CANCELLED_OVERTIME_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "overtime_request_cancelled",

        tableName:
          "overtime_requests",

        recordId:
          overtimeRequestId,

        oldValues:
          overtimeLogSummary(
            existing
          ),

        newValues:
          overtimeLogSummary(
            cancelled
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/attendance/overtime-requests/${overtimeRequestId}/cancel`,

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
 * Approve or reject request
 * =========================================================
 */

export async function decideOvertimeRequestRecord(
  companyId: string,
  input: OvertimeDecisionRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<OvertimeDecisionResult> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const request =
      await lockOvertimeRequest(
        connection,
        companyId,
        input.overtimeRequestId
      );

    if (!request) {
      throw new Error(
        "OVERTIME_REQUEST_NOT_FOUND"
      );
    }

    if (
      request.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "OVERTIME_REQUEST_NOT_PENDING"
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
        "OVERTIME_SELF_APPROVAL_DENIED"
      );
    }

    let attendance:
      LockedAttendanceRow | null =
        null;

    let attendanceId:
      string | null = null;

    if (
      input.decision ===
      "APPROVED"
    ) {
      const requestedMinutes =
        Number(
          request.requested_minutes
        );

      const approvedMinutes =
        input.approvedMinutes ??
        requestedMinutes;

      if (
        approvedMinutes <= 0
      ) {
        throw new Error(
          "INVALID_APPROVED_OVERTIME_MINUTES"
        );
      }

      if (
        approvedMinutes >
        requestedMinutes
      ) {
        throw new Error(
          "APPROVED_OVERTIME_EXCEEDS_REQUESTED"
        );
      }

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
        const overtimeDate =
          databaseDateOnly(
            request.overtime_date
          );

        if (!overtimeDate) {
          throw new Error(
            "INVALID_OVERTIME_DATE"
          );
        }

        attendance =
          await lockAttendanceByEmployeeDate(
            connection,
            companyId,
            String(
              request.employee_id
            ),
            overtimeDate
          );
      }

      if (attendance) {
        if (
          String(
            attendance.employee_id
          ) !==
          String(
            request.employee_id
          )
        ) {
          throw new Error(
            "OVERTIME_ATTENDANCE_EMPLOYEE_MISMATCH"
          );
        }

        if (
          databaseDateOnly(
            attendance.attendance_date
          ) !==
          databaseDateOnly(
            request.overtime_date
          )
        ) {
          throw new Error(
            "OVERTIME_ATTENDANCE_DATE_MISMATCH"
          );
        }

        attendanceId =
          String(
            attendance.attendance_id
          );

        await connection.query(
          `
            UPDATE attendance_records
            SET overtime_minutes = ?
            WHERE attendance_id = ?
              AND company_id = ?
          `,
          [
            approvedMinutes,
            attendanceId,
            companyId
          ]
        );
      }

      await connection.query(
        `
          UPDATE overtime_requests
          SET
              attendance_id =
                  COALESCE(
                    ?,
                    attendance_id
                  ),

              approved_minutes = ?,

              request_status =
                  'APPROVED',

              approved_by_user_id = ?,

              approved_at =
                  CURRENT_TIMESTAMP,

              approval_remarks = ?
          WHERE overtime_request_id = ?
            AND company_id = ?
        `,
        [
          attendanceId,
          approvedMinutes,
          input.approverUserId,
          input.approvalRemarks,
          input.overtimeRequestId,
          companyId
        ]
      );
    } else {
      await connection.query(
        `
          UPDATE overtime_requests
          SET
              approved_minutes =
                  NULL,

              request_status =
                  'REJECTED',

              approved_by_user_id = ?,

              approved_at =
                  CURRENT_TIMESTAMP,

              approval_remarks = ?
          WHERE overtime_request_id = ?
            AND company_id = ?
        `,
        [
          input.approverUserId,
          input.approvalRemarks,
          input.overtimeRequestId,
          companyId
        ]
      );
    }

    const decided =
      await selectOvertimeRequestUsingConnection(
        connection,
        companyId,
        input.overtimeRequestId
      );

    if (!decided) {
      throw new Error(
        "DECIDED_OVERTIME_REQUEST_NOT_FOUND"
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
            ? "overtime_request_approved"
            : "overtime_request_rejected",

        tableName:
          "overtime_requests",

        recordId:
          input.overtimeRequestId,

        oldValues:
          overtimeLogSummary(
            request
          ),

        newValues:
          overtimeLogSummary(
            decided
          ),

        requestMethod:
          "POST",

        requestPath:
          input.decision ===
          "APPROVED"
            ? `/api/v1/attendance/overtime-requests/${input.overtimeRequestId}/approve`
            : `/api/v1/attendance/overtime-requests/${input.overtimeRequestId}/reject`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      overtimeRequest:
        decided,

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
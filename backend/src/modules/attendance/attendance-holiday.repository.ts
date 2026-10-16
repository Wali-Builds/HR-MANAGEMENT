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
  CreateHolidayRecord,
  HolidayDatabaseRow,
  UpdateHolidayRecord
} from "./attendance-holiday.types.js";

/*
 * =========================================================
 * Internal database types
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

interface LockedHolidayRow {
  holiday_id:
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

  holiday_name: string;

  holiday_date:
    | Date
    | string;

  holiday_type: string;
  description: string | null;

  is_optional:
    | number
    | boolean;

  is_paid:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

interface HolidayListFilters {
  branchId?: string | undefined;
  holidayType?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  isOptional?: boolean | undefined;
  isPaid?: boolean | undefined;
  isActive?: boolean | undefined;

  includeInactive: boolean;
  includeCompanyWide: boolean;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface EmployeeHolidayListFilters {
  holidayType?: string | undefined;

  dateFrom?: string | undefined;
  dateTo?: string | undefined;

  includeOptional: boolean;
  includeInactive: boolean;

  search?: string | undefined;

  page: number;
  pageSize: number;
}

interface EffectiveHolidayFilters {
  includeOptional: boolean;
  includeInactive: boolean;
}

interface HolidayCalendarFilters {
  dateFrom: string;
  dateTo: string;

  includeOptional: boolean;
  includeInactive: boolean;
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

function holidayLogSummary(
  holiday:
    | HolidayDatabaseRow
    | LockedHolidayRow
) {
  return {
    holidayId:
      String(
        holiday.holiday_id
      ),

    companyId:
      String(
        holiday.company_id
      ),

    branchId:
      holiday.branch_id === null
        ? null
        : String(
            holiday.branch_id
          ),

    holidayName:
      holiday.holiday_name,

    holidayDate:
      databaseDateOnly(
        holiday.holiday_date
      ),

    holidayType:
      holiday.holiday_type,

    isOptional:
      databaseBoolean(
        holiday.is_optional
      ),

    isPaid:
      databaseBoolean(
        holiday.is_paid
      ),

    isActive:
      databaseBoolean(
        holiday.is_active
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
 * Reusable holiday SELECT
 *
 * attendance_record_count represents attendance records
 * occurring on the holiday date within the holiday scope.
 * attendance_records does not currently contain holiday_id.
 * =========================================================
 */

const holidaySelect = `
  SELECT
      h.holiday_id,
      h.company_id,
      h.branch_id,

      b.branch_code,
      b.branch_name,

      h.holiday_name,
      h.holiday_date,
      h.holiday_type,
      h.description,

      h.is_optional,
      h.is_paid,
      h.is_active,

      (
        SELECT COUNT(*)
        FROM leave_request_days lrd_count
        WHERE lrd_count.holiday_id =
              h.holiday_id
      ) AS leave_request_day_count,

      (
        SELECT COUNT(*)
        FROM attendance_records ar_count

        INNER JOIN employees e_count
            ON e_count.employee_id =
               ar_count.employee_id

        WHERE ar_count.company_id =
              h.company_id

          AND ar_count.attendance_date =
              h.holiday_date

          AND (
            h.branch_id IS NULL
            OR e_count.branch_id =
               h.branch_id
          )
      ) AS attendance_record_count,

      h.created_at,
      h.updated_at

  FROM holidays h

  LEFT JOIN branches b
      ON b.branch_id =
         h.branch_id
`;

/*
 * =========================================================
 * Locking and validation helpers
 * =========================================================
 */

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

async function lockHoliday(
  connection: PoolConnection,
  companyId: string,
  holidayId: string
): Promise<LockedHolidayRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            holiday_id,
            company_id,
            branch_id,
            holiday_name,
            holiday_date,
            holiday_type,
            description,
            is_optional,
            is_paid,
            is_active,
            created_at,
            updated_at
        FROM holidays
        WHERE holiday_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        holidayId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedHolidayRow
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
      "HOLIDAY_BRANCH_NOT_FOUND"
    );
  }
}

async function assertNoDuplicateHoliday(
  connection: PoolConnection,
  input: {
    companyId: string;
    branchId: string | null;

    holidayName: string;
    holidayDate: string;

    excludedHolidayId:
      | string
      | null;
  }
): Promise<void> {
  const parameters: unknown[] = [
    input.companyId,
    input.branchId,
    input.holidayDate,
    input.holidayName
  ];

  let exclusionClause = "";

  if (
    input.excludedHolidayId !==
    null
  ) {
    exclusionClause = `
      AND holiday_id <> ?
    `;

    parameters.push(
      input.excludedHolidayId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT holiday_id
        FROM holidays
        WHERE company_id = ?

          AND branch_id <=> ?

          AND holiday_date = ?

          AND LOWER(
                TRIM(
                  holiday_name
                )
              ) =
              LOWER(
                TRIM(?)
              )

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
      "DUPLICATE_HOLIDAY"
    );
  }
}

/*
 * =========================================================
 * Connection-based select helper
 * =========================================================
 */

async function selectHolidayUsingConnection(
  connection: PoolConnection,
  companyId: string,
  holidayId: string
): Promise<HolidayDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${holidaySelect}
        WHERE h.holiday_id = ?
          AND h.company_id = ?
        LIMIT 1
      `,
      [
        holidayId,
        companyId
      ]
    );

  return (
    rows[0] as
      | HolidayDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Holiday list and lookup
 * =========================================================
 */

export async function listHolidayRecords(
  companyId: string,
  filters: HolidayListFilters
): Promise<
  PaginatedResult<
    HolidayDatabaseRow
  >
> {
  const conditions: string[] = [
    "h.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.branchId) {
    if (
      filters.includeCompanyWide
    ) {
      conditions.push(`
        (
          h.branch_id = ?
          OR h.branch_id IS NULL
        )
      `);
    } else {
      conditions.push(
        "h.branch_id = ?"
      );
    }

    parameters.push(
      filters.branchId
    );
  }

  if (filters.holidayType) {
    conditions.push(
      "h.holiday_type = ?"
    );

    parameters.push(
      filters.holidayType
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "h.holiday_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "h.holiday_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (
    filters.isOptional !==
    undefined
  ) {
    conditions.push(
      "h.is_optional = ?"
    );

    parameters.push(
      filters.isOptional
        ? 1
        : 0
    );
  }

  if (
    filters.isPaid !==
    undefined
  ) {
    conditions.push(
      "h.is_paid = ?"
    );

    parameters.push(
      filters.isPaid
        ? 1
        : 0
    );
  }

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "h.is_active = ?"
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
      "h.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        h.holiday_name LIKE ?
        OR h.holiday_type LIKE ?
        OR h.description LIKE ?
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

        FROM holidays h

        LEFT JOIN branches b
            ON b.branch_id =
               h.branch_id

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
        ${holidaySelect}

        WHERE ${whereClause}

        ORDER BY
            h.holiday_date ASC,
            h.branch_id IS NOT NULL ASC,
            h.holiday_name ASC,
            h.holiday_id ASC

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
      rows as HolidayDatabaseRow[],

    totalRecords
  };
}

export async function findHolidayRecordById(
  companyId: string,
  holidayId: string
): Promise<HolidayDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${holidaySelect}

        WHERE h.holiday_id = ?
          AND h.company_id = ?

        LIMIT 1
      `,
      [
        holidayId,
        companyId
      ]
    );

  return (
    rows[0] as
      | HolidayDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Create holiday
 * =========================================================
 */

export async function createHolidayRecord(
  input: CreateHolidayRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<HolidayDatabaseRow> {
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

    await assertNoDuplicateHoliday(
      connection,
      {
        companyId:
          input.companyId,

        branchId:
          input.branchId,

        holidayName:
          input.holidayName,

        holidayDate:
          input.holidayDate,

        excludedHolidayId:
          null
      }
    );

    const result =
      await connection.query(
        `
          INSERT INTO holidays (
              company_id,
              branch_id,
              holiday_name,
              holiday_date,
              holiday_type,
              description,
              is_optional,
              is_paid,
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
              ?
          )
        `,
        [
          input.companyId,
          input.branchId,
          input.holidayName,
          input.holidayDate,
          input.holidayType,
          input.description,

          input.isOptional
            ? 1
            : 0,

          input.isPaid
            ? 1
            : 0,

          input.isActive
            ? 1
            : 0
        ]
      ) as unknown as InsertResult;

    const holidayId =
      String(
        result.insertId
      );

    const created =
      await selectHolidayUsingConnection(
        connection,
        input.companyId,
        holidayId
      );

    if (!created) {
      throw new Error(
        "CREATED_HOLIDAY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "holiday_created",

        tableName:
          "holidays",

        recordId:
          holidayId,

        newValues:
          holidayLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/attendance/holidays",

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
 * Update holiday
 * =========================================================
 */

export async function updateHolidayRecord(
  companyId: string,
  holidayId: string,
  input: UpdateHolidayRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<HolidayDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockHoliday(
        connection,
        companyId,
        holidayId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const finalBranchId =
      input.branchId !== undefined
        ? input.branchId
        : existing.branch_id === null
          ? null
          : String(
              existing.branch_id
            );

    const finalHolidayName =
      input.holidayName ??
      existing.holiday_name;

    const existingDate =
      databaseDateOnly(
        existing.holiday_date
      );

    if (!existingDate) {
      throw new Error(
        "INVALID_HOLIDAY_DATE"
      );
    }

    const finalHolidayDate =
      input.holidayDate ??
      existingDate;

    await assertBranchAvailable(
      connection,
      companyId,
      finalBranchId
    );

    await assertNoDuplicateHoliday(
      connection,
      {
        companyId,
        branchId:
          finalBranchId,

        holidayName:
          finalHolidayName,

        holidayDate:
          finalHolidayDate,

        excludedHolidayId:
          holidayId
      }
    );

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
      input.holidayName !==
      undefined
    ) {
      addUpdate(
        "holiday_name",
        input.holidayName
      );
    }

    if (
      input.holidayDate !==
      undefined
    ) {
      addUpdate(
        "holiday_date",
        input.holidayDate
      );
    }

    if (
      input.holidayType !==
      undefined
    ) {
      addUpdate(
        "holiday_type",
        input.holidayType
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
      input.isOptional !==
      undefined
    ) {
      addUpdate(
        "is_optional",
        input.isOptional
          ? 1
          : 0
      );
    }

    if (
      input.isPaid !==
      undefined
    ) {
      addUpdate(
        "is_paid",
        input.isPaid
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
        "NO_HOLIDAY_UPDATE_FIELDS"
      );
    }

    parameters.push(
      holidayId,
      companyId
    );

    await connection.query(
      `
        UPDATE holidays
        SET ${assignments.join(", ")}
        WHERE holiday_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectHolidayUsingConnection(
        connection,
        companyId,
        holidayId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_HOLIDAY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "holiday_updated",

        tableName:
          "holidays",

        recordId:
          holidayId,

        oldValues:
          holidayLogSummary(
            existing
          ),

        newValues:
          holidayLogSummary(
            updated
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/attendance/holidays/${holidayId}`,

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
 * Deactivate holiday
 *
 * Holidays are not physically deleted because
 * leave_request_days can reference holiday_id.
 * =========================================================
 */

export async function deactivateHolidayRecord(
  companyId: string,
  holidayId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<HolidayDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockHoliday(
        connection,
        companyId,
        holidayId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    await connection.query(
      `
        UPDATE holidays
        SET is_active = 0
        WHERE holiday_id = ?
          AND company_id = ?
      `,
      [
        holidayId,
        companyId
      ]
    );

    const deactivated =
      await selectHolidayUsingConnection(
        connection,
        companyId,
        holidayId
      );

    if (!deactivated) {
      throw new Error(
        "DEACTIVATED_HOLIDAY_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "holiday_deactivated",

        tableName:
          "holidays",

        recordId:
          holidayId,

        oldValues:
          holidayLogSummary(
            existing
          ),

        newValues:
          holidayLogSummary(
            deactivated
          ),

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/attendance/holidays/${holidayId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return deactivated;
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
 * Employee holidays
 *
 * Applicable holidays:
 * - company-wide: branch_id IS NULL
 * - employee branch: branch_id = employee.branch_id
 * =========================================================
 */

export async function listEmployeeHolidayRecords(
  companyId: string,
  employeeBranchId:
    | string
    | null,
  filters:
    EmployeeHolidayListFilters
): Promise<
  PaginatedResult<
    HolidayDatabaseRow
  >
> {
  const conditions: string[] = [
    "h.company_id = ?",
    `
      (
        h.branch_id IS NULL
        OR h.branch_id = ?
      )
    `
  ];

  const parameters: unknown[] = [
    companyId,
    employeeBranchId
  ];

  if (filters.holidayType) {
    conditions.push(
      "h.holiday_type = ?"
    );

    parameters.push(
      filters.holidayType
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "h.holiday_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "h.holiday_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (
    !filters.includeOptional
  ) {
    conditions.push(
      "h.is_optional = 0"
    );
  }

  if (
    !filters.includeInactive
  ) {
    conditions.push(
      "h.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        h.holiday_name LIKE ?
        OR h.holiday_type LIKE ?
        OR h.description LIKE ?
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
        FROM holidays h
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
        ${holidaySelect}

        WHERE ${whereClause}

        ORDER BY
            h.holiday_date ASC,
            h.branch_id IS NOT NULL DESC,
            h.holiday_name ASC,
            h.holiday_id ASC

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
      rows as HolidayDatabaseRow[],

    totalRecords
  };
}

/*
 * =========================================================
 * Effective holidays for an employee and date
 *
 * Multiple holidays can exist on the same date. Branch-level
 * holidays are ordered before company-wide holidays.
 * =========================================================
 */

export async function findEffectiveEmployeeHolidayRecords(
  companyId: string,
  employeeBranchId:
    | string
    | null,
  holidayDate: string,
  filters: EffectiveHolidayFilters
): Promise<HolidayDatabaseRow[]> {
  const conditions: string[] = [
    "h.company_id = ?",
    "h.holiday_date = ?",
    `
      (
        h.branch_id IS NULL
        OR h.branch_id = ?
      )
    `
  ];

  const parameters: unknown[] = [
    companyId,
    holidayDate,
    employeeBranchId
  ];

  if (
    !filters.includeOptional
  ) {
    conditions.push(
      "h.is_optional = 0"
    );
  }

  if (
    !filters.includeInactive
  ) {
    conditions.push(
      "h.is_active = 1"
    );
  }

  const rows =
    await databasePool.query(
      `
        ${holidaySelect}

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
            h.branch_id IS NOT NULL DESC,
            h.is_optional ASC,
            h.is_paid DESC,
            h.holiday_id ASC
      `,
      parameters
    );

  return rows as HolidayDatabaseRow[];
}

/*
 * =========================================================
 * Holiday calendar records
 *
 * When branchId is supplied:
 * - company-wide holidays
 * - selected branch holidays
 *
 * When branchId is null:
 * - company-wide holidays only
 * =========================================================
 */

export async function listHolidayCalendarRecords(
  companyId: string,
  branchId:
    | string
    | null,
  filters: HolidayCalendarFilters
): Promise<HolidayDatabaseRow[]> {
  const conditions: string[] = [
    "h.company_id = ?",
    "h.holiday_date >= ?",
    "h.holiday_date <= ?"
  ];

  const parameters: unknown[] = [
    companyId,
    filters.dateFrom,
    filters.dateTo
  ];

  if (branchId === null) {
    conditions.push(
      "h.branch_id IS NULL"
    );
  } else {
    conditions.push(`
      (
        h.branch_id IS NULL
        OR h.branch_id = ?
      )
    `);

    parameters.push(
      branchId
    );
  }

  if (
    !filters.includeOptional
  ) {
    conditions.push(
      "h.is_optional = 0"
    );
  }

  if (
    !filters.includeInactive
  ) {
    conditions.push(
      "h.is_active = 1"
    );
  }

  const rows =
    await databasePool.query(
      `
        ${holidaySelect}

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
            h.holiday_date ASC,
            h.branch_id IS NOT NULL DESC,
            h.holiday_name ASC,
            h.holiday_id ASC
      `,
      parameters
    );

  return rows as HolidayDatabaseRow[];
}
import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  AttendanceActor,
  RequestMetadata
} from "../attendance/attendance.types.js";

import type {
  CloseAndOpenNextLeavePeriodDatabaseResult,
  CloseAndOpenNextLeavePeriodRecord,
  CreateLeaveBalanceAdjustmentRecord,
  InitializeEmployeeLeaveBalanceRecord,
  EmployeeLeaveBalanceDatabaseRow,
  LeaveBalanceTransactionDatabaseRow,
  LeavePeriodDatabaseRow,
  UpdateLeavePeriodRecord,
  CreateLeavePeriodRecord
} from "./leave-balance.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedRepositoryResult<T> {
  records: T[];
  totalRecords: number;
}

export interface LeavePeriodListFilters {
  periodStatus?: string;
  effectiveOn?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface LeaveBalanceListFilters {
  employeeId?: string;
  // edited by wali: Limit company balance searches to assigned employee branches.
  branchIds?: string[];
  leaveTypeId?: string;
  leavePeriodId?: string;
  periodStatus?: string;

  availableBalanceMin?: number;
  availableBalanceMax?: number;

  includeZeroBalance: boolean;
  onlyInconsistent: boolean;

  search?: string;

  page: number;
  pageSize: number;
}

export interface EmployeeLeaveBalanceListFilters {
  leaveTypeId?: string;
  leavePeriodId?: string;
  periodStatus?: string;
  effectiveOn?: string;

  includeZeroBalance: boolean;
  onlyInconsistent: boolean;

  page: number;
  pageSize: number;
}

export interface LeaveBalanceTransactionListFilters {
  leaveBalanceId?: string;
  employeeId?: string;
  leaveTypeId?: string;
  leavePeriodId?: string;

  transactionType?: string;

  referenceType?: string;
  referenceId?: string;

  createdByUserId?: string;

  dateFrom?: string;
  dateTo?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface BulkRecalculateLeaveBalanceFilters {
  employeeId?: string;
  leaveTypeId?: string;
  leavePeriodId?: string;

  onlyInconsistent: boolean;
  repair: boolean;
}

export interface LeaveBalanceRecalculationDatabaseResult {
  leaveBalanceId: string;

  previousAvailableBalance: number;
  recalculatedAvailableBalance: number;
  difference: number;

  repaired: boolean;

  balance: EmployeeLeaveBalanceDatabaseRow;
}

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

interface LockedLeavePeriodRow {
  leave_period_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  period_code: string;
  period_name: string;

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  period_status: string;

  closed_by_user_id:
    | string
    | number
    | bigint
    | null;

  closed_at:
    | Date
    | string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
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

interface LockedLeaveTypeRow {
  leave_type_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  leave_type_code: string;
  leave_type_name: string;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;
}

interface LockedLeaveBalanceRow {
  leave_balance_id:
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

  leave_type_id:
    | string
    | number
    | bigint;

  leave_period_id:
    | string
    | number
    | bigint;

  opening_balance:
    | string
    | number;

  accrued_units:
    | string
    | number;

  carried_forward_units:
    | string
    | number;

  adjusted_units:
    | string
    | number;

  used_units:
    | string
    | number;

  pending_units:
    | string
    | number;

  encashed_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  available_balance:
    | string
    | number;

  last_accrual_date:
    | Date
    | string
    | null;

  last_calculated_at:
    | Date
    | string
    | null;
}

interface ApplicableLeaveRuleRow {
  allow_negative_balance:
    | number
    | boolean;

  negative_balance_limit:
    | string
    | number;

  maximum_balance_units:
    | string
    | number
    | null;
}

interface PeriodClosureValidationRow {
  source_balance_count:
    | string
    | number
    | bigint;

  non_zero_balance_count:
    | string
    | number
    | bigint;

  pending_balance_count:
    | string
    | number
    | bigint;

  inconsistent_balance_count:
    | string
    | number
    | bigint;

  pending_request_count:
    | string
    | number
    | bigint;

  active_accrual_run_count:
    | string
    | number
    | bigint;

  active_carry_forward_run_count:
    | string
    | number
    | bigint;

  due_expiry_count:
    | string
    | number
    | bigint;
}

interface CompletedCarryForwardRunRow {
  carry_forward_run_id:
    | string
    | number
    | bigint;

  total_carried_units:
    | string
    | number;

  total_expired_units:
    | string
    | number;
}

/*
 * =========================================================
 * Utility helpers
 * =========================================================
 */

const computedBalanceSql = `
  (
      elb.opening_balance
    + elb.accrued_units
    + elb.carried_forward_units
    + elb.adjusted_units
    - elb.used_units
    - elb.pending_units
    - elb.encashed_units
    - elb.expired_units
  )
`;

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

function roundUnits(
  value: number
): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function offsetFromPagination(
  page: number,
  pageSize: number
): number {
  return (
    page - 1
  ) * pageSize;
}

function currentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function clampDateToPeriod(
  date: string,
  startDate: string,
  endDate: string
): string {
  if (date < startDate) {
    return startDate;
  }

  if (date > endDate) {
    return endDate;
  }

  return date;
}

function calculateAvailableBalance(
  row: {
    opening_balance:
      | string
      | number;

    accrued_units:
      | string
      | number;

    carried_forward_units:
      | string
      | number;

    adjusted_units:
      | string
      | number;

    used_units:
      | string
      | number;

    pending_units:
      | string
      | number;

    encashed_units:
      | string
      | number;

    expired_units:
      | string
      | number;
  }
): number {
  return roundUnits(
    Number(row.opening_balance) +
    Number(row.accrued_units) +
    Number(row.carried_forward_units) +
    Number(row.adjusted_units) -
    Number(row.used_units) -
    Number(row.pending_units) -
    Number(row.encashed_units) -
    Number(row.expired_units)
  );
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

/*
 * =========================================================
 * Activity logging
 * =========================================================
 */

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: AttendanceActor;

    actionName: string;
    tableName: string;
    recordId: string;

    oldValues?: unknown;
    newValues?: unknown;

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
          'leave',
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

const leavePeriodSelect = `
  SELECT
      lp.leave_period_id,
      lp.company_id,
      lp.period_code,
      lp.period_name,
      lp.start_date,
      lp.end_date,
      lp.period_status,
      lp.closed_by_user_id,
      lp.closed_at,

      (
        SELECT COUNT(*)
        FROM employee_leave_balances elb_count
        WHERE elb_count.leave_period_id =
              lp.leave_period_id
      ) AS balance_count,

      (
        SELECT COUNT(*)
        FROM leave_balance_transactions lbt_count
        WHERE lbt_count.leave_period_id =
              lp.leave_period_id
      ) AS transaction_count,

      lp.created_at,
      lp.updated_at

  FROM leave_periods lp
`;

const leaveBalanceSelect = `
  SELECT
      elb.leave_balance_id,
      elb.company_id,

      elb.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      elb.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,
      lt.unit_type,

      lt.is_paid
          AS leave_type_is_paid,

      elb.leave_period_id,
      lp.period_code,
      lp.period_name,

      lp.start_date
          AS period_start_date,

      lp.end_date
          AS period_end_date,

      lp.period_status,

      elb.opening_balance,
      elb.accrued_units,
      elb.carried_forward_units,
      elb.adjusted_units,
      elb.used_units,
      elb.pending_units,
      elb.encashed_units,
      elb.expired_units,
      elb.available_balance,

      ${computedBalanceSql}
          AS computed_available_balance,

      (
        elb.available_balance -
        ${computedBalanceSql}
      ) AS balance_difference,

      (
        SELECT COUNT(*)
        FROM leave_balance_transactions lbt_count
        WHERE lbt_count.leave_balance_id =
              elb.leave_balance_id
      ) AS transaction_count,

      elb.last_accrual_date,
      elb.last_calculated_at,
      elb.created_at,
      elb.updated_at

  FROM employee_leave_balances elb

  INNER JOIN employees e
      ON e.employee_id =
         elb.employee_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         elb.leave_type_id

  INNER JOIN leave_periods lp
      ON lp.leave_period_id =
         elb.leave_period_id
`;

const leaveTransactionSelect = `
  SELECT
      lbt.transaction_id,
      lbt.leave_balance_id,
      lbt.company_id,

      lbt.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      lbt.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,
      lt.unit_type,

      lbt.leave_period_id,
      lp.period_code,
      lp.period_name,

      lbt.transaction_date,
      lbt.transaction_type,
      lbt.units_changed,
      lbt.balance_before,
      lbt.balance_after,
      lbt.reference_type,
      lbt.reference_id,
      lbt.remarks,
      lbt.created_by_user_id,
      lbt.created_at

  FROM leave_balance_transactions lbt

  INNER JOIN employees e
      ON e.employee_id =
         lbt.employee_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         lbt.leave_type_id

  INNER JOIN leave_periods lp
      ON lp.leave_period_id =
         lbt.leave_period_id
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

async function lockLeaveType(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<LockedLeaveTypeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_type_id,
            company_id,
            leave_type_code,
            leave_type_name,
            is_active,
            deleted_at
        FROM leave_types
        WHERE leave_type_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveTypeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveTypeRow
      | undefined
  ) ?? null;
}

async function lockLeavePeriod(
  connection: PoolConnection,
  companyId: string,
  leavePeriodId: string
): Promise<LockedLeavePeriodRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_period_id,
            company_id,
            period_code,
            period_name,
            start_date,
            end_date,
            period_status,
            closed_by_user_id,
            closed_at,
            created_at,
            updated_at
        FROM leave_periods
        WHERE leave_period_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        leavePeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeavePeriodRow
      | undefined
  ) ?? null;
}

async function lockLeaveBalance(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceId: string
): Promise<LockedLeaveBalanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_balance_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            opening_balance,
            accrued_units,
            carried_forward_units,
            adjusted_units,
            used_units,
            pending_units,
            encashed_units,
            expired_units,
            available_balance,
            last_accrual_date,
            last_calculated_at
        FROM employee_leave_balances
        WHERE leave_balance_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveBalanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveBalanceRow
      | undefined
  ) ?? null;
}

async function lockLeaveBalanceByScope(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  leavePeriodId: string
): Promise<LockedLeaveBalanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_balance_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            opening_balance,
            accrued_units,
            carried_forward_units,
            adjusted_units,
            used_units,
            pending_units,
            encashed_units,
            expired_units,
            available_balance,
            last_accrual_date,
            last_calculated_at
        FROM employee_leave_balances
        WHERE company_id = ?
          AND employee_id = ?
          AND leave_type_id = ?
          AND leave_period_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        companyId,
        employeeId,
        leaveTypeId,
        leavePeriodId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveBalanceRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Validation helpers
 * =========================================================
 */

async function assertActiveEmployee(
  connection: PoolConnection,
  companyId: string,
  employeeId: string
): Promise<LockedEmployeeRow> {
  const employee =
    await lockEmployee(
      connection,
      companyId,
      employeeId
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

  return employee;
}

async function assertActiveLeaveType(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<LockedLeaveTypeRow> {
  const leaveType =
    await lockLeaveType(
      connection,
      companyId,
      leaveTypeId
    );

  if (!leaveType) {
    throw new Error(
      "LEAVE_TYPE_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      leaveType.is_active
    )
  ) {
    throw new Error(
      "LEAVE_TYPE_INACTIVE"
    );
  }

  return leaveType;
}

async function assertOpenLeavePeriod(
  connection: PoolConnection,
  companyId: string,
  leavePeriodId: string
): Promise<LockedLeavePeriodRow> {
  const period =
    await lockLeavePeriod(
      connection,
      companyId,
      leavePeriodId
    );

  if (!period) {
    throw new Error(
      "LEAVE_PERIOD_NOT_FOUND"
    );
  }

  if (
    period.period_status !==
    "OPEN"
  ) {
    throw new Error(
      "LEAVE_PERIOD_CLOSED"
    );
  }

  return period;
}

async function assertNoLeavePeriodOverlap(
  connection: PoolConnection,
  companyId: string,
  startDate: string,
  endDate: string,
  excludedLeavePeriodId:
    | string
    | null
): Promise<void> {
  const parameters: unknown[] = [
    companyId,
    endDate,
    startDate
  ];

  let exclusionClause = "";

  if (
    excludedLeavePeriodId !==
    null
  ) {
    exclusionClause = `
      AND leave_period_id <> ?
    `;

    parameters.push(
      excludedLeavePeriodId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT leave_period_id
        FROM leave_periods
        WHERE company_id = ?
          AND start_date <= ?
          AND end_date >= ?
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
      "LEAVE_PERIOD_DATE_OVERLAP"
    );
  }
}

function assertDateWithinPeriod(
  transactionDate: string,
  period: LockedLeavePeriodRow
): void {
  const startDate =
    databaseDateOnly(
      period.start_date
    );

  const endDate =
    databaseDateOnly(
      period.end_date
    );

  if (
    !startDate ||
    !endDate
  ) {
    throw new Error(
      "INVALID_LEAVE_PERIOD_DATE"
    );
  }

  if (
    transactionDate < startDate ||
    transactionDate > endDate
  ) {
    throw new Error(
      "TRANSACTION_DATE_OUTSIDE_LEAVE_PERIOD"
    );
  }
}


async function validatePeriodClosureState(
  connection: PoolConnection,
  input: {
    companyId: string;
    leavePeriodId: string;
    processingDate: string;
  }
): Promise<PeriodClosureValidationRow> {
  const rows =
    await connection.query(
      `
        SELECT
            (
              SELECT COUNT(*)
              FROM employee_leave_balances balance_count
              WHERE balance_count.company_id = ?
                AND balance_count.leave_period_id = ?
            ) AS source_balance_count,

            (
              SELECT COUNT(*)
              FROM employee_leave_balances non_zero_balance
              WHERE non_zero_balance.company_id = ?
                AND non_zero_balance.leave_period_id = ?
                AND ABS(
                  non_zero_balance.available_balance
                ) > 0.005
            ) AS non_zero_balance_count,

            (
              SELECT COUNT(*)
              FROM employee_leave_balances pending_balance
              WHERE pending_balance.company_id = ?
                AND pending_balance.leave_period_id = ?
                AND pending_balance.pending_units > 0.005
            ) AS pending_balance_count,

            (
              SELECT COUNT(*)
              FROM employee_leave_balances inconsistent_balance
              WHERE inconsistent_balance.company_id = ?
                AND inconsistent_balance.leave_period_id = ?
                AND ABS(
                  inconsistent_balance.available_balance -
                  (
                      inconsistent_balance.opening_balance
                    + inconsistent_balance.accrued_units
                    + inconsistent_balance.carried_forward_units
                    + inconsistent_balance.adjusted_units
                    - inconsistent_balance.used_units
                    - inconsistent_balance.pending_units
                    - inconsistent_balance.encashed_units
                    - inconsistent_balance.expired_units
                  )
                ) > 0.005
            ) AS inconsistent_balance_count,

            (
              SELECT COUNT(*)
              FROM leave_requests pending_request
              WHERE pending_request.company_id = ?
                AND pending_request.leave_period_id = ?
                AND pending_request.request_status IN (
                  'DRAFT',
                  'PENDING'
                )
            ) AS pending_request_count,

            (
              SELECT COUNT(*)
              FROM leave_accrual_runs active_accrual
              WHERE active_accrual.company_id = ?
                AND active_accrual.leave_period_id = ?
                AND active_accrual.is_dry_run = 0
                AND active_accrual.run_status IN (
                  'DRAFT',
                  'PROCESSING'
                )
            ) AS active_accrual_run_count,

            (
              SELECT COUNT(*)
              FROM leave_carry_forward_runs active_carry
              WHERE active_carry.company_id = ?
                AND active_carry.source_period_id = ?
                AND active_carry.is_dry_run = 0
                AND active_carry.run_status IN (
                  'DRAFT',
                  'PROCESSING'
                )
            ) AS active_carry_forward_run_count,

            (
              SELECT COUNT(*)
              FROM leave_balance_expiries due_expiry
              WHERE due_expiry.company_id = ?
                AND due_expiry.leave_period_id = ?
                AND due_expiry.expiry_date <= ?
                AND due_expiry.expiry_status IN (
                  'PENDING',
                  'PROCESSING',
                  'FAILED'
                )
            ) AS due_expiry_count
      `,
      [
        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,

        input.companyId,
        input.leavePeriodId,
        input.processingDate
      ]
    );

  const row =
    rows[0] as
      | PeriodClosureValidationRow
      | undefined;

  if (!row) {
    throw new Error(
      "LEAVE_PERIOD_CLOSURE_VALIDATION_FAILED"
    );
  }

  if (
    Number(
      row.pending_request_count
    ) > 0
  ) {
    throw new Error(
      "LEAVE_PERIOD_HAS_PENDING_REQUESTS"
    );
  }

  if (
    Number(
      row.pending_balance_count
    ) > 0
  ) {
    throw new Error(
      "LEAVE_PERIOD_HAS_PENDING_BALANCE_UNITS"
    );
  }

  if (
    Number(
      row.inconsistent_balance_count
    ) > 0
  ) {
    throw new Error(
      "LEAVE_PERIOD_HAS_INCONSISTENT_BALANCES"
    );
  }

  if (
    Number(
      row.active_accrual_run_count
    ) > 0 ||
    Number(
      row.active_carry_forward_run_count
    ) > 0
  ) {
    throw new Error(
      "LEAVE_PERIOD_HAS_ACTIVE_PROCESSING_RUNS"
    );
  }

  if (
    Number(
      row.due_expiry_count
    ) > 0
  ) {
    throw new Error(
      "LEAVE_PERIOD_HAS_DUE_EXPIRIES"
    );
  }

  return row;
}

async function findCompletedCarryForwardRunForClosure(
  connection: PoolConnection,
  input: {
    companyId: string;
    sourcePeriodId: string;
    targetPeriodId: string;

    carryForwardRunId:
      | string
      | null;
  }
): Promise<
  CompletedCarryForwardRunRow
  | null
> {
  const conditions: string[] = [
    "company_id = ?",
    "source_period_id = ?",
    "target_period_id = ?",
    "is_dry_run = 0",
    "run_status = 'COMPLETED'"
  ];

  const parameters: unknown[] = [
    input.companyId,
    input.sourcePeriodId,
    input.targetPeriodId
  ];

  if (
    input.carryForwardRunId !==
    null
  ) {
    conditions.push(
      "carry_forward_run_id = ?"
    );

    parameters.push(
      input.carryForwardRunId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT
            carry_forward_run_id,
            total_carried_units,
            total_expired_units

        FROM leave_carry_forward_runs

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
            completed_at DESC,
            carry_forward_run_id DESC

        LIMIT 1
        FOR UPDATE
      `,
      parameters
    );

  return (
    rows[0] as
      | CompletedCarryForwardRunRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Applicable leave-rule lookup
 * =========================================================
 */

async function findApplicableLeaveRule(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  effectiveDate: string
): Promise<ApplicableLeaveRuleRow | null> {
  const assignedRows =
    await connection.query(
      `
        SELECT
            lpr.allow_negative_balance,
            lpr.negative_balance_limit,
            lpr.maximum_balance_units

        FROM employee_leave_policy_assignments elpa

        INNER JOIN leave_policies lp
            ON lp.leave_policy_id =
               elpa.leave_policy_id

        INNER JOIN leave_policy_rules lpr
            ON lpr.leave_policy_id =
               lp.leave_policy_id

        WHERE elpa.employee_id = ?
          AND lp.company_id = ?
          AND lpr.leave_type_id = ?
          AND elpa.effective_from <= ?
          AND (
            elpa.effective_to IS NULL
            OR elpa.effective_to >= ?
          )
          AND lp.effective_from <= ?
          AND (
            lp.effective_to IS NULL
            OR lp.effective_to >= ?
          )
          AND lp.is_active = 1
          AND lp.deleted_at IS NULL
          AND lpr.is_active = 1

        ORDER BY
            elpa.is_current DESC,
            elpa.effective_from DESC,
            elpa.assignment_id DESC

        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeId,
        companyId,
        leaveTypeId,
        effectiveDate,
        effectiveDate,
        effectiveDate,
        effectiveDate
      ]
    );

  const assignedRule =
    assignedRows[0] as
      | ApplicableLeaveRuleRow
      | undefined;

  if (assignedRule) {
    return assignedRule;
  }

  const defaultRows =
    await connection.query(
      `
        SELECT
            lpr.allow_negative_balance,
            lpr.negative_balance_limit,
            lpr.maximum_balance_units

        FROM leave_policies lp

        INNER JOIN leave_policy_rules lpr
            ON lpr.leave_policy_id =
               lp.leave_policy_id

        WHERE lp.company_id = ?
          AND lp.is_default = 1
          AND lp.is_active = 1
          AND lp.deleted_at IS NULL
          AND lpr.leave_type_id = ?
          AND lpr.is_active = 1
          AND lp.effective_from <= ?
          AND (
            lp.effective_to IS NULL
            OR lp.effective_to >= ?
          )

        ORDER BY
            lp.effective_from DESC,
            lp.leave_policy_id DESC

        LIMIT 1
        FOR UPDATE
      `,
      [
        companyId,
        leaveTypeId,
        effectiveDate,
        effectiveDate
      ]
    );

  return (
    defaultRows[0] as
      | ApplicableLeaveRuleRow
      | undefined
  ) ?? null;
}

async function assertBalanceWithinPolicyLimits(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;

    effectiveDate: string;
    resultingBalance: number;
  }
): Promise<void> {
  const rule =
    await findApplicableLeaveRule(
      connection,
      input.companyId,
      input.employeeId,
      input.leaveTypeId,
      input.effectiveDate
    );

  const maximumBalance =
    rule?.maximum_balance_units ===
      null ||
    rule?.maximum_balance_units ===
      undefined
      ? null
      : Number(
          rule.maximum_balance_units
        );

  if (
    maximumBalance !== null &&
    input.resultingBalance >
      maximumBalance
  ) {
    throw new Error(
      "LEAVE_BALANCE_MAXIMUM_EXCEEDED"
    );
  }

  if (
    input.resultingBalance >= 0
  ) {
    return;
  }

  if (
    !rule ||
    !databaseBoolean(
      rule.allow_negative_balance
    )
  ) {
    throw new Error(
      "NEGATIVE_LEAVE_BALANCE_NOT_ALLOWED"
    );
  }

  const negativeLimit =
    Number(
      rule.negative_balance_limit
    );

  if (
    Math.abs(
      input.resultingBalance
    ) > negativeLimit
  ) {
    throw new Error(
      "NEGATIVE_LEAVE_BALANCE_LIMIT_EXCEEDED"
    );
  }
}

/*
 * =========================================================
 * Connection-based SELECT helpers
 * =========================================================
 */

async function selectLeavePeriodUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leavePeriodId: string
): Promise<LeavePeriodDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leavePeriodSelect}
        WHERE lp.leave_period_id = ?
          AND lp.company_id = ?
        LIMIT 1
      `,
      [
        leavePeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeavePeriodDatabaseRow
      | undefined
  ) ?? null;
}

async function selectLeaveBalanceUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceId: string
): Promise<EmployeeLeaveBalanceDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leaveBalanceSelect}
        WHERE elb.leave_balance_id = ?
          AND elb.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL
        LIMIT 1
      `,
      [
        leaveBalanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | EmployeeLeaveBalanceDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Transaction insertion helper
 * =========================================================
 */

async function insertLeaveBalanceTransaction(
  connection: PoolConnection,
  input: {
    leaveBalanceId: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    transactionDate: string;
    transactionType: string;

    unitsChanged: number;

    balanceBefore:
      | number
      | null;

    balanceAfter:
      | number
      | null;

    referenceType:
      | string
      | null;

    referenceId:
      | string
      | null;

    remarks:
      | string
      | null;

    createdByUserId: string;
  }
): Promise<string> {
  const result =
    await connection.query(
      `
        INSERT INTO leave_balance_transactions (
            leave_balance_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            transaction_date,
            transaction_type,
            units_changed,
            balance_before,
            balance_after,
            reference_type,
            reference_id,
            remarks,
            created_by_user_id
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
            ?
        )
      `,
      [
        input.leaveBalanceId,
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId,
        input.transactionDate,
        input.transactionType,
        input.unitsChanged,
        input.balanceBefore,
        input.balanceAfter,
        input.referenceType,
        input.referenceId,
        input.remarks,
        input.createdByUserId
      ]
    ) as unknown as InsertResult;

  return String(
    result.insertId
  );
}

/*
 * =========================================================
 * Leave periods
 * =========================================================
 */

export async function listLeavePeriodRecords(
  companyId: string,
  filters: LeavePeriodListFilters
): Promise<
  PaginatedRepositoryResult<
    LeavePeriodDatabaseRow
  >
> {
  const conditions: string[] = [
    "lp.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.periodStatus) {
    conditions.push(
      "lp.period_status = ?"
    );

    parameters.push(
      filters.periodStatus
    );
  }

  if (filters.effectiveOn) {
    conditions.push(
      "lp.start_date <= ?"
    );

    conditions.push(
      "lp.end_date >= ?"
    );

    parameters.push(
      filters.effectiveOn,
      filters.effectiveOn
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "lp.end_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "lp.start_date <= ?"
    );

    parameters.push(
      filters.dateTo
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        lp.period_code LIKE ?
        OR lp.period_name LIKE ?
        OR lp.period_status LIKE ?
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
        SELECT COUNT(*) AS total_records
        FROM leave_periods lp
        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const rows =
    await databasePool.query(
      `
        ${leavePeriodSelect}
        WHERE ${whereClause}
        ORDER BY
            lp.start_date DESC,
            lp.leave_period_id DESC
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
      rows as unknown as LeavePeriodDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeavePeriodRecordById(
  companyId: string,
  leavePeriodId: string
): Promise<LeavePeriodDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leavePeriodSelect}
        WHERE lp.leave_period_id = ?
          AND lp.company_id = ?
        LIMIT 1
      `,
      [
        leavePeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeavePeriodDatabaseRow
      | undefined
  ) ?? null;
}

export async function createLeavePeriodRecord(
  input: CreateLeavePeriodRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePeriodDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await assertNoLeavePeriodOverlap(
      connection,
      input.companyId,
      input.startDate,
      input.endDate,
      null
    );

    const result =
      await connection.query(
        `
          INSERT INTO leave_periods (
              company_id,
              period_code,
              period_name,
              start_date,
              end_date,
              period_status,
              closed_by_user_id,
              closed_at
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
          input.periodCode,
          input.periodName,
          input.startDate,
          input.endDate,
          input.periodStatus,
          input.closedByUserId,
          input.closedAt
        ]
      ) as unknown as InsertResult;

    const leavePeriodId =
      String(
        result.insertId
      );

    const created =
      await selectLeavePeriodUsingConnection(
        connection,
        input.companyId,
        leavePeriodId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_period_created",

        tableName:
          "leave_periods",

        recordId:
          leavePeriodId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/leave/periods",

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

export async function updateLeavePeriodRecord(
  companyId: string,
  leavePeriodId: string,
  input: UpdateLeavePeriodRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePeriodDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockLeavePeriod(
        connection,
        companyId,
        leavePeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.period_status ===
      "CLOSED"
    ) {
      throw new Error(
        "CLOSED_LEAVE_PERIOD_CANNOT_BE_UPDATED"
      );
    }

    const existingStartDate =
      databaseDateOnly(
        existing.start_date
      );

    const existingEndDate =
      databaseDateOnly(
        existing.end_date
      );

    if (
      !existingStartDate ||
      !existingEndDate
    ) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATE"
      );
    }

    const finalStartDate =
      input.startDate ??
      existingStartDate;

    const finalEndDate =
      input.endDate ??
      existingEndDate;

    if (
      finalEndDate <
      finalStartDate
    ) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATES"
      );
    }

    await assertNoLeavePeriodOverlap(
      connection,
      companyId,
      finalStartDate,
      finalEndDate,
      leavePeriodId
    );

    const invalidReferenceRows =
      await connection.query(
        `
          SELECT
              (
                SELECT COUNT(*)
                FROM leave_balance_transactions lbt
                WHERE lbt.leave_period_id = ?
                  AND (
                    lbt.transaction_date < ?
                    OR lbt.transaction_date > ?
                  )
              )
              +
              (
                SELECT COUNT(*)
                FROM employee_leave_balances elb
                WHERE elb.leave_period_id = ?
                  AND elb.last_accrual_date IS NOT NULL
                  AND (
                    elb.last_accrual_date < ?
                    OR elb.last_accrual_date > ?
                  )
              ) AS total_records
        `,
        [
          leavePeriodId,
          finalStartDate,
          finalEndDate,
          leavePeriodId,
          finalStartDate,
          finalEndDate
        ]
      );

    const invalidReferenceRow =
      invalidReferenceRows[0] as
        | CountDatabaseRow
        | undefined;

    if (
      Number(
        invalidReferenceRow?.total_records ??
        0
      ) > 0
    ) {
      throw new Error(
        "LEAVE_PERIOD_DATES_CONFLICT_WITH_EXISTING_RECORDS"
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

      parameters.push(value);
    };

    if (
      input.periodCode !== undefined
    ) {
      addUpdate(
        "period_code",
        input.periodCode
      );
    }

    if (
      input.periodName !== undefined
    ) {
      addUpdate(
        "period_name",
        input.periodName
      );
    }

    if (
      input.startDate !== undefined
    ) {
      addUpdate(
        "start_date",
        input.startDate
      );
    }

    if (
      input.endDate !== undefined
    ) {
      addUpdate(
        "end_date",
        input.endDate
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_LEAVE_PERIOD_UPDATE_FIELDS"
      );
    }

    parameters.push(
      leavePeriodId,
      companyId
    );

    await connection.query(
      `
        UPDATE leave_periods
        SET ${assignments.join(", ")}
        WHERE leave_period_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectLeavePeriodUsingConnection(
        connection,
        companyId,
        leavePeriodId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_period_updated",

        tableName:
          "leave_periods",

        recordId:
          leavePeriodId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/leave/periods/${leavePeriodId}`,

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

export async function closeLeavePeriodRecord(
  companyId: string,
  leavePeriodId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePeriodDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockLeavePeriod(
        connection,
        companyId,
        leavePeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.period_status ===
      "CLOSED"
    ) {
      throw new Error(
        "LEAVE_PERIOD_ALREADY_CLOSED"
      );
    }

    const validation =
      await validatePeriodClosureState(
        connection,
        {
          companyId,
          leavePeriodId,
          processingDate:
            currentDateOnly()
        }
      );

    if (
      Number(
        validation
          .non_zero_balance_count
      ) > 0
    ) {
      throw new Error(
        "LEAVE_PERIOD_HAS_UNPROCESSED_BALANCES"
      );
    }

    await connection.query(
      `
        UPDATE leave_periods
        SET
            period_status = 'CLOSED',
            closed_by_user_id = ?,
            closed_at = CURRENT_TIMESTAMP
        WHERE leave_period_id = ?
          AND company_id = ?
      `,
      [
        actor.userId,
        leavePeriodId,
        companyId
      ]
    );

    const closed =
      await selectLeavePeriodUsingConnection(
        connection,
        companyId,
        leavePeriodId
      );

    if (!closed) {
      throw new Error(
        "CLOSED_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_period_closed",

        tableName:
          "leave_periods",

        recordId:
          leavePeriodId,

        oldValues:
          existing,

        newValues:
          closed,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/periods/${leavePeriodId}/close`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return closed;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}


export async function closeAndOpenNextLeavePeriodRecord(
  input:
    CloseAndOpenNextLeavePeriodRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<
  CloseAndOpenNextLeavePeriodDatabaseResult
  | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const sourcePeriod =
      await lockLeavePeriod(
        connection,
        input.companyId,
        input.sourcePeriodId
      );

    if (!sourcePeriod) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    const targetPeriod =
      await lockLeavePeriod(
        connection,
        input.companyId,
        input.targetPeriodId
      );

    if (!targetPeriod) {
      throw new Error(
        "TARGET_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    if (
      sourcePeriod.period_status ===
      "CLOSED"
    ) {
      throw new Error(
        "LEAVE_PERIOD_ALREADY_CLOSED"
      );
    }

    if (
      String(
        sourcePeriod.leave_period_id
      ) ===
      String(
        targetPeriod.leave_period_id
      )
    ) {
      throw new Error(
        "SOURCE_AND_TARGET_PERIOD_CANNOT_MATCH"
      );
    }

    const sourceEndDate =
      databaseDateOnly(
        sourcePeriod.end_date
      );

    const targetStartDate =
      databaseDateOnly(
        targetPeriod.start_date
      );

    if (
      !sourceEndDate ||
      !targetStartDate
    ) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATE"
      );
    }

    if (
      targetStartDate <=
      sourceEndDate
    ) {
      throw new Error(
        "TARGET_PERIOD_MUST_FOLLOW_SOURCE_PERIOD"
      );
    }

    if (
      input.processingDate <
      sourceEndDate
    ) {
      throw new Error(
        "PERIOD_CLOSE_BEFORE_SOURCE_PERIOD_END"
      );
    }

    if (
      targetPeriod.period_status !==
      "OPEN"
    ) {
      throw new Error(
        "TARGET_LEAVE_PERIOD_NOT_OPEN"
      );
    }

    const validation =
      await validatePeriodClosureState(
        connection,
        {
          companyId:
            input.companyId,

          leavePeriodId:
            input.sourcePeriodId,

          processingDate:
            input.processingDate
        }
      );

    const sourceBalanceCount =
      Number(
        validation
          .source_balance_count
      );

    const completedCarryForwardRun =
      await findCompletedCarryForwardRunForClosure(
        connection,
        {
          companyId:
            input.companyId,

          sourcePeriodId:
            input.sourcePeriodId,

          targetPeriodId:
            input.targetPeriodId,

          carryForwardRunId:
            input.carryForwardRunId
        }
      );

    if (
      input.carryForwardRunId !==
        null &&
      !completedCarryForwardRun
    ) {
      throw new Error(
        "CARRY_FORWARD_RUN_NOT_READY_FOR_PERIOD_CLOSE"
      );
    }

    if (
      sourceBalanceCount > 0 &&
      !completedCarryForwardRun
    ) {
      throw new Error(
        "COMPLETED_CARRY_FORWARD_RUN_REQUIRED"
      );
    }

    if (
      Number(
        validation
          .non_zero_balance_count
      ) > 0
    ) {
      throw new Error(
        "SOURCE_PERIOD_BALANCES_NOT_FINALIZED"
      );
    }

    await connection.query(
      `
        UPDATE leave_periods

        SET
            period_status = 'OPEN',
            closed_by_user_id = NULL,
            closed_at = NULL

        WHERE leave_period_id = ?
          AND company_id = ?
      `,
      [
        input.targetPeriodId,
        input.companyId
      ]
    );

    await connection.query(
      `
        UPDATE leave_periods

        SET
            period_status = 'CLOSED',
            closed_by_user_id = ?,
            closed_at = CURRENT_TIMESTAMP

        WHERE leave_period_id = ?
          AND company_id = ?
          AND period_status = 'OPEN'
      `,
      [
        input.closedByUserId,
        input.sourcePeriodId,
        input.companyId
      ]
    );

    const closedSourcePeriod =
      await selectLeavePeriodUsingConnection(
        connection,
        input.companyId,
        input.sourcePeriodId
      );

    const openedTargetPeriod =
      await selectLeavePeriodUsingConnection(
        connection,
        input.companyId,
        input.targetPeriodId
      );

    if (
      !closedSourcePeriod ||
      !openedTargetPeriod
    ) {
      throw new Error(
        "CLOSED_AND_OPENED_PERIODS_NOT_FOUND"
      );
    }

    const carryForwardRunId =
      completedCarryForwardRun
        ? String(
            completedCarryForwardRun
              .carry_forward_run_id
          )
        : null;

    const carriedUnits =
      completedCarryForwardRun
        ? roundUnits(
            Number(
              completedCarryForwardRun
                .total_carried_units
            )
          )
        : 0;

    const expiredUnits =
      completedCarryForwardRun
        ? roundUnits(
            Number(
              completedCarryForwardRun
                .total_expired_units
            )
          )
        : 0;

    const targetBalanceCount =
      Number(
        openedTargetPeriod
          .balance_count
      );

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_period_closed_and_next_opened",

        tableName:
          "leave_periods",

        recordId:
          input.sourcePeriodId,

        oldValues: {
          sourcePeriod,
          targetPeriod
        },

        newValues: {
          sourcePeriod:
            closedSourcePeriod,

          targetPeriod:
            openedTargetPeriod,

          carryForwardRunId,
          processingDate:
            input.processingDate,

          carriedUnits,
          expiredUnits,

          sourceBalanceCount,
          targetBalanceCount
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/periods/${input.sourcePeriodId}/close-and-open-next`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      sourcePeriod:
        closedSourcePeriod,

      targetPeriod:
        openedTargetPeriod,

      carryForwardRunId,

      processingDate:
        input.processingDate,

      carriedUnits,
      expiredUnits,

      sourceBalanceCount,
      targetBalanceCount
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

export async function reopenLeavePeriodRecord(
  companyId: string,
  leavePeriodId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePeriodDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockLeavePeriod(
        connection,
        companyId,
        leavePeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (
      existing.period_status ===
      "OPEN"
    ) {
      throw new Error(
        "LEAVE_PERIOD_ALREADY_OPEN"
      );
    }

    await connection.query(
      `
        UPDATE leave_periods
        SET
            period_status = 'OPEN',
            closed_by_user_id = NULL,
            closed_at = NULL
        WHERE leave_period_id = ?
          AND company_id = ?
      `,
      [
        leavePeriodId,
        companyId
      ]
    );

    const reopened =
      await selectLeavePeriodUsingConnection(
        connection,
        companyId,
        leavePeriodId
      );

    if (!reopened) {
      throw new Error(
        "REOPENED_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_period_reopened",

        tableName:
          "leave_periods",

        recordId:
          leavePeriodId,

        oldValues:
          existing,

        newValues:
          reopened,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/periods/${leavePeriodId}/reopen`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return reopened;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLeavePeriodRecord(
  companyId: string,
  leavePeriodId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePeriodDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing =
      await lockLeavePeriod(
        connection,
        companyId,
        leavePeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const referenceRows =
      await connection.query(
        `
          SELECT
              (
                SELECT COUNT(*)
                FROM employee_leave_balances
                WHERE leave_period_id = ?
              )
              +
              (
                SELECT COUNT(*)
                FROM leave_balance_transactions
                WHERE leave_period_id = ?
              )
              AS total_records
        `,
        [
          leavePeriodId,
          leavePeriodId
        ]
      );

    const referenceRow =
      referenceRows[0] as
        | CountDatabaseRow
        | undefined;

    if (
      Number(
        referenceRow?.total_records ??
        0
      ) > 0
    ) {
      throw new Error(
        "LEAVE_PERIOD_HAS_REFERENCES"
      );
    }

    await connection.query(
      `
        DELETE FROM leave_periods
        WHERE leave_period_id = ?
          AND company_id = ?
      `,
      [
        leavePeriodId,
        companyId
      ]
    );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_period_deleted",

        tableName:
          "leave_periods",

        recordId:
          leavePeriodId,

        oldValues:
          existing,

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/leave/periods/${leavePeriodId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      ...existing,

      balance_count: 0,
      transaction_count: 0,

      created_at:
        new Date(),

      updated_at:
        new Date()
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

/*
 * =========================================================
 * Leave balances
 * =========================================================
 */

function applyLeaveBalanceFilters(
  companyId: string,
  filters: LeaveBalanceListFilters
): {
  whereClause: string;
  parameters: unknown[];
} {
  const conditions: string[] = [
    "elb.company_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "elb.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  // edited by wali: Keep balance result rows within assigned branches.
  if (filters.branchIds?.length) {
    conditions.push(`EXISTS (SELECT 1 FROM employee_assignments ea_scope WHERE ea_scope.employee_id = e.employee_id AND ea_scope.is_current = 1 AND ea_scope.branch_id IN (${filters.branchIds.map(() => "?").join(", ")}))`);
    parameters.push(...filters.branchIds);
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "elb.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "elb.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.periodStatus) {
    conditions.push(
      "lp.period_status = ?"
    );

    parameters.push(
      filters.periodStatus
    );
  }

  if (
    filters.availableBalanceMin !==
    undefined
  ) {
    conditions.push(
      "elb.available_balance >= ?"
    );

    parameters.push(
      filters.availableBalanceMin
    );
  }

  if (
    filters.availableBalanceMax !==
    undefined
  ) {
    conditions.push(
      "elb.available_balance <= ?"
    );

    parameters.push(
      filters.availableBalanceMax
    );
  }

  if (
    !filters.includeZeroBalance
  ) {
    conditions.push(
      "ABS(elb.available_balance) > 0.005"
    );
  }

  if (
    filters.onlyInconsistent
  ) {
    conditions.push(`
      ABS(
        elb.available_balance -
        ${computedBalanceSql}
      ) > 0.005
    `);
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
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lp.period_code LIKE ?
        OR lp.period_name LIKE ?
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
      searchValue
    );
  }

  return {
    whereClause:
      conditions.join(
        " AND "
      ),

    parameters
  };
}

export async function listLeaveBalanceRecords(
  companyId: string,
  filters: LeaveBalanceListFilters
): Promise<
  PaginatedRepositoryResult<
    EmployeeLeaveBalanceDatabaseRow
  >
> {
  const {
    whereClause,
    parameters
  } = applyLeaveBalanceFilters(
    companyId,
    filters
  );

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM employee_leave_balances elb

        INNER JOIN employees e
            ON e.employee_id =
               elb.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               elb.leave_type_id

        INNER JOIN leave_periods lp
            ON lp.leave_period_id =
               elb.leave_period_id

        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const rows =
    await databasePool.query(
      `
        ${leaveBalanceSelect}

        WHERE ${whereClause}

        ORDER BY
            lp.start_date DESC,
            e.employee_code ASC,
            lt.leave_type_name ASC,
            elb.leave_balance_id ASC

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
      rows as unknown as EmployeeLeaveBalanceDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeaveBalanceRecordById(
  companyId: string,
  leaveBalanceId: string
): Promise<EmployeeLeaveBalanceDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leaveBalanceSelect}

        WHERE elb.leave_balance_id = ?
          AND elb.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL

        LIMIT 1
      `,
      [
        leaveBalanceId,
        companyId
      ]
    );

  return (
    rows[0] as
      | EmployeeLeaveBalanceDatabaseRow
      | undefined
  ) ?? null;
}

export async function listEmployeeLeaveBalanceRecords(
  companyId: string,
  employeeId: string,
  filters: EmployeeLeaveBalanceListFilters
): Promise<
  PaginatedRepositoryResult<
    EmployeeLeaveBalanceDatabaseRow
  >
> {
  const conditions: string[] = [
    "elb.company_id = ?",
    "elb.employee_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId
  ];

  if (filters.leaveTypeId) {
    conditions.push(
      "elb.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "elb.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.periodStatus) {
    conditions.push(
      "lp.period_status = ?"
    );

    parameters.push(
      filters.periodStatus
    );
  }

  if (filters.effectiveOn) {
    conditions.push(
      "lp.start_date <= ?"
    );

    conditions.push(
      "lp.end_date >= ?"
    );

    parameters.push(
      filters.effectiveOn,
      filters.effectiveOn
    );
  }

  if (
    !filters.includeZeroBalance
  ) {
    conditions.push(
      "ABS(elb.available_balance) > 0.005"
    );
  }

  if (
    filters.onlyInconsistent
  ) {
    conditions.push(`
      ABS(
        elb.available_balance -
        ${computedBalanceSql}
      ) > 0.005
    `);
  }

  const whereClause =
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM employee_leave_balances elb

        INNER JOIN employees e
            ON e.employee_id =
               elb.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               elb.leave_type_id

        INNER JOIN leave_periods lp
            ON lp.leave_period_id =
               elb.leave_period_id

        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const rows =
    await databasePool.query(
      `
        ${leaveBalanceSelect}

        WHERE ${whereClause}

        ORDER BY
            lp.start_date DESC,
            lt.leave_type_name ASC,
            elb.leave_balance_id ASC

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
      rows as unknown as EmployeeLeaveBalanceDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findEmployeeLeaveTypeBalanceRecord(
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  input: {
    leavePeriodId?:
      | string
      | undefined;

    effectiveOn?:
      | string
      | undefined;
  }
): Promise<EmployeeLeaveBalanceDatabaseRow | null> {
  const conditions: string[] = [
    "elb.company_id = ?",
    "elb.employee_id = ?",
    "elb.leave_type_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId,
    leaveTypeId
  ];

  if (input.leavePeriodId) {
    conditions.push(
      "elb.leave_period_id = ?"
    );

    parameters.push(
      input.leavePeriodId
    );
  }

  if (input.effectiveOn) {
    conditions.push(
      "lp.start_date <= ?"
    );

    conditions.push(
      "lp.end_date >= ?"
    );

    parameters.push(
      input.effectiveOn,
      input.effectiveOn
    );
  }

  const rows =
    await databasePool.query(
      `
        ${leaveBalanceSelect}

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
            lp.start_date DESC,
            elb.leave_balance_id DESC

        LIMIT 1
      `,
      parameters
    );

  return (
    rows[0] as
      | EmployeeLeaveBalanceDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Balance initialization
 * =========================================================
 */

export async function initializeEmployeeLeaveBalanceRecord(
  input: InitializeEmployeeLeaveBalanceRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeLeaveBalanceDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await assertActiveEmployee(
      connection,
      input.companyId,
      input.employeeId
    );

    await assertActiveLeaveType(
      connection,
      input.companyId,
      input.leaveTypeId
    );

    const period =
      await assertOpenLeavePeriod(
        connection,
        input.companyId,
        input.leavePeriodId
      );

    const existing =
      await lockLeaveBalanceByScope(
        connection,
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId
      );

    if (existing) {
      throw new Error(
        "LEAVE_BALANCE_ALREADY_EXISTS"
      );
    }

    const periodStartDate =
      databaseDateOnly(
        period.start_date
      );

    const periodEndDate =
      databaseDateOnly(
        period.end_date
      );

    if (
      !periodStartDate ||
      !periodEndDate
    ) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATE"
      );
    }

    if (
      input.lastAccrualDate !==
        null &&
      (
        input.lastAccrualDate <
          periodStartDate ||
        input.lastAccrualDate >
          periodEndDate
      )
    ) {
      throw new Error(
        "LAST_ACCRUAL_DATE_OUTSIDE_LEAVE_PERIOD"
      );
    }

    const initialAvailableBalance =
      roundUnits(
        input.openingBalance +
        input.accruedUnits +
        input.carriedForwardUnits +
        input.adjustedUnits
      );

    const effectiveDate =
      clampDateToPeriod(
        currentDateOnly(),
        periodStartDate,
        periodEndDate
      );

    await assertBalanceWithinPolicyLimits(
      connection,
      {
        companyId:
          input.companyId,

        employeeId:
          input.employeeId,

        leaveTypeId:
          input.leaveTypeId,

        effectiveDate,

        resultingBalance:
          initialAvailableBalance
      }
    );

    const result =
      await connection.query(
        `
          INSERT INTO employee_leave_balances (
              company_id,
              employee_id,
              leave_type_id,
              leave_period_id,
              opening_balance,
              accrued_units,
              carried_forward_units,
              adjusted_units,
              used_units,
              pending_units,
              encashed_units,
              expired_units,
              available_balance,
              last_accrual_date,
              last_calculated_at
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
              0,
              0,
              0,
              0,
              ?,
              ?,
              CURRENT_TIMESTAMP
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.leaveTypeId,
          input.leavePeriodId,
          input.openingBalance,
          input.accruedUnits,
          input.carriedForwardUnits,
          input.adjustedUnits,
          initialAvailableBalance,
          input.lastAccrualDate
        ]
      ) as unknown as InsertResult;

    const leaveBalanceId =
      String(
        result.insertId
      );

    let runningBalance = 0;

    const initialTransactions: Array<{
      type: string;
      units: number;
    }> = [];

    if (
      input.openingBalance !== 0
    ) {
      initialTransactions.push({
        type:
          "OPENING_BALANCE",

        units:
          input.openingBalance
      });
    }

    if (
      input.accruedUnits !== 0
    ) {
      initialTransactions.push({
        type:
          "ACCRUAL",

        units:
          input.accruedUnits
      });
    }

    if (
      input.carriedForwardUnits !== 0
    ) {
      initialTransactions.push({
        type:
          "CARRY_FORWARD",

        units:
          input.carriedForwardUnits
      });
    }

    if (
      input.adjustedUnits !== 0
    ) {
      initialTransactions.push({
        type:
          input.adjustedUnits > 0
            ? "MANUAL_CREDIT"
            : "MANUAL_DEBIT",

        units:
          input.adjustedUnits
      });
    }

    for (
      const transaction
      of initialTransactions
    ) {
      const balanceBefore =
        runningBalance;

      const balanceAfter =
        roundUnits(
          balanceBefore +
          transaction.units
        );

      await insertLeaveBalanceTransaction(
        connection,
        {
          leaveBalanceId,

          companyId:
            input.companyId,

          employeeId:
            input.employeeId,

          leaveTypeId:
            input.leaveTypeId,

          leavePeriodId:
            input.leavePeriodId,

          transactionDate:
            effectiveDate,

          transactionType:
            transaction.type,

          unitsChanged:
            transaction.units,

          balanceBefore,
          balanceAfter,

          referenceType:
            "BALANCE_INITIALIZATION",

          referenceId:
            leaveBalanceId,

          remarks:
            input.remarks,

          createdByUserId:
            input.createdByUserId
        }
      );

      runningBalance =
        balanceAfter;
    }

    const created =
      await selectLeaveBalanceUsingConnection(
        connection,
        input.companyId,
        leaveBalanceId
      );

    if (!created) {
      throw new Error(
        "INITIALIZED_LEAVE_BALANCE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_leave_balance_initialized",

        tableName:
          "employee_leave_balances",

        recordId:
          leaveBalanceId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/leave-balances/initialize`,

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
 * Manual balance adjustment
 * =========================================================
 */

export async function createLeaveBalanceAdjustmentRecord(
  input: CreateLeaveBalanceAdjustmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<{
  balance: EmployeeLeaveBalanceDatabaseRow;
  transactionId: string;
}> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await assertActiveEmployee(
      connection,
      input.companyId,
      input.employeeId
    );

    await assertActiveLeaveType(
      connection,
      input.companyId,
      input.leaveTypeId
    );

    const period =
      await assertOpenLeavePeriod(
        connection,
        input.companyId,
        input.leavePeriodId
      );

    assertDateWithinPeriod(
      input.transactionDate,
      period
    );

    const balance =
      await lockLeaveBalanceByScope(
        connection,
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId
      );

    if (!balance) {
      throw new Error(
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    const signedUnits =
      input.adjustmentDirection ===
      "CREDIT"
        ? roundUnits(
            input.units
          )
        : roundUnits(
            -input.units
          );

    const balanceBefore =
      Number(
        balance.available_balance
      );

    const balanceAfter =
      roundUnits(
        balanceBefore +
        signedUnits
      );

    await assertBalanceWithinPolicyLimits(
      connection,
      {
        companyId:
          input.companyId,

        employeeId:
          input.employeeId,

        leaveTypeId:
          input.leaveTypeId,

        effectiveDate:
          input.transactionDate,

        resultingBalance:
          balanceAfter
      }
    );

    await connection.query(
      `
        UPDATE employee_leave_balances
        SET
            adjusted_units =
              adjusted_units + ?,

            available_balance = ?,

            last_calculated_at =
              CURRENT_TIMESTAMP

        WHERE leave_balance_id = ?
          AND company_id = ?
      `,
      [
        signedUnits,
        balanceAfter,
        String(
          balance.leave_balance_id
        ),
        input.companyId
      ]
    );

    const transactionId =
      await insertLeaveBalanceTransaction(
        connection,
        {
          leaveBalanceId:
            String(
              balance.leave_balance_id
            ),

          companyId:
            input.companyId,

          employeeId:
            input.employeeId,

          leaveTypeId:
            input.leaveTypeId,

          leavePeriodId:
            input.leavePeriodId,

          transactionDate:
            input.transactionDate,

          transactionType:
            input.adjustmentDirection ===
            "CREDIT"
              ? "MANUAL_CREDIT"
              : "MANUAL_DEBIT",

          unitsChanged:
            signedUnits,

          balanceBefore,
          balanceAfter,

          referenceType:
            input.referenceType,

          referenceId:
            input.referenceId,

          remarks:
            input.remarks,

          createdByUserId:
            input.createdByUserId
        }
      );

    const updated =
      await selectLeaveBalanceUsingConnection(
        connection,
        input.companyId,
        String(
          balance.leave_balance_id
        )
      );

    if (!updated) {
      throw new Error(
        "ADJUSTED_LEAVE_BALANCE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          input.adjustmentDirection ===
          "CREDIT"
            ? "leave_balance_manual_credit"
            : "leave_balance_manual_debit",

        tableName:
          "employee_leave_balances",

        recordId:
          String(
            balance.leave_balance_id
          ),

        oldValues: {
          availableBalance:
            balanceBefore,

          adjustedUnits:
            Number(
              balance.adjusted_units
            )
        },

        newValues: {
          availableBalance:
            balanceAfter,

          adjustedUnits:
            Number(
              updated.adjusted_units
            ),

          transactionId
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/leave-balance-adjustments`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      balance:
        updated,

      transactionId
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

/*
 * =========================================================
 * Balance transaction lists
 * =========================================================
 */

export async function listLeaveBalanceTransactionRecords(
  companyId: string,
  filters: LeaveBalanceTransactionListFilters
): Promise<
  PaginatedRepositoryResult<
    LeaveBalanceTransactionDatabaseRow
  >
> {
  const conditions: string[] = [
    "lbt.company_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.leaveBalanceId) {
    conditions.push(
      "lbt.leave_balance_id = ?"
    );

    parameters.push(
      filters.leaveBalanceId
    );
  }

  if (filters.employeeId) {
    conditions.push(
      "lbt.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "lbt.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "lbt.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.transactionType) {
    conditions.push(
      "lbt.transaction_type = ?"
    );

    parameters.push(
      filters.transactionType
    );
  }

  if (filters.referenceType) {
    conditions.push(
      "lbt.reference_type = ?"
    );

    parameters.push(
      filters.referenceType
    );
  }

  if (filters.referenceId) {
    conditions.push(
      "lbt.reference_id = ?"
    );

    parameters.push(
      filters.referenceId
    );
  }

  if (filters.createdByUserId) {
    conditions.push(
      "lbt.created_by_user_id = ?"
    );

    parameters.push(
      filters.createdByUserId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "lbt.transaction_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "lbt.transaction_date <= ?"
    );

    parameters.push(
      filters.dateTo
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
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lp.period_code LIKE ?
        OR lp.period_name LIKE ?
        OR lbt.transaction_type LIKE ?
        OR lbt.reference_type LIKE ?
        OR lbt.remarks LIKE ?
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
        SELECT COUNT(*) AS total_records

        FROM leave_balance_transactions lbt

        INNER JOIN employees e
            ON e.employee_id =
               lbt.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               lbt.leave_type_id

        INNER JOIN leave_periods lp
            ON lp.leave_period_id =
               lbt.leave_period_id

        WHERE ${whereClause}
      `,
      parameters
    );

  const countRow =
    countRows[0] as
      | CountDatabaseRow
      | undefined;

  const rows =
    await databasePool.query(
      `
        ${leaveTransactionSelect}

        WHERE ${whereClause}

        ORDER BY
            lbt.transaction_date DESC,
            lbt.transaction_id DESC

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
      rows as unknown as LeaveBalanceTransactionDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function listEmployeeLeaveBalanceTransactionRecords(
  companyId: string,
  employeeId: string,
  filters: Omit<
    LeaveBalanceTransactionListFilters,
    "employeeId"
  >
): Promise<
  PaginatedRepositoryResult<
    LeaveBalanceTransactionDatabaseRow
  >
> {
  return listLeaveBalanceTransactionRecords(
    companyId,
    {
      ...filters,
      employeeId
    }
  );
}

/*
 * =========================================================
 * Balance recalculation
 * =========================================================
 */

async function recalculateLeaveBalanceUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceId: string,
  repair: boolean
): Promise<LeaveBalanceRecalculationDatabaseResult | null> {
  const existing =
    await lockLeaveBalance(
      connection,
      companyId,
      leaveBalanceId
    );

  if (!existing) {
    return null;
  }

  const previousAvailableBalance =
    roundUnits(
      Number(
        existing.available_balance
      )
    );

  const recalculatedAvailableBalance =
    calculateAvailableBalance(
      existing
    );

  const difference =
    roundUnits(
      recalculatedAvailableBalance -
      previousAvailableBalance
    );

  const repaired =
    repair &&
    Math.abs(
      difference
    ) > 0.005;

  if (repair) {
    await connection.query(
      `
        UPDATE employee_leave_balances
        SET
            available_balance = ?,
            last_calculated_at =
              CURRENT_TIMESTAMP
        WHERE leave_balance_id = ?
          AND company_id = ?
      `,
      [
        recalculatedAvailableBalance,
        leaveBalanceId,
        companyId
      ]
    );
  }

  const balance =
    await selectLeaveBalanceUsingConnection(
      connection,
      companyId,
      leaveBalanceId
    );

  if (!balance) {
    throw new Error(
      "RECALCULATED_LEAVE_BALANCE_NOT_FOUND"
    );
  }

  return {
    leaveBalanceId,

    previousAvailableBalance,
    recalculatedAvailableBalance,
    difference,

    repaired,

    balance
  };
}

export async function recalculateLeaveBalanceRecord(
  companyId: string,
  leaveBalanceId: string,
  repair: boolean,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveBalanceRecalculationDatabaseResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const result =
      await recalculateLeaveBalanceUsingConnection(
        connection,
        companyId,
        leaveBalanceId,
        repair
      );

    if (!result) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          repair
            ? "leave_balance_recalculated"
            : "leave_balance_validated",

        tableName:
          "employee_leave_balances",

        recordId:
          leaveBalanceId,

        oldValues: {
          availableBalance:
            result.previousAvailableBalance
        },

        newValues: {
          recalculatedAvailableBalance:
            result.recalculatedAvailableBalance,

          difference:
            result.difference,

          repaired:
            result.repaired
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/balances/${leaveBalanceId}/recalculate`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function bulkRecalculateLeaveBalanceRecords(
  companyId: string,
  filters: BulkRecalculateLeaveBalanceFilters,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveBalanceRecalculationDatabaseResult[]> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const conditions: string[] = [
      "elb.company_id = ?"
    ];

    const parameters: unknown[] = [
      companyId
    ];

    if (filters.employeeId) {
      conditions.push(
        "elb.employee_id = ?"
      );

      parameters.push(
        filters.employeeId
      );
    }

    if (filters.leaveTypeId) {
      conditions.push(
        "elb.leave_type_id = ?"
      );

      parameters.push(
        filters.leaveTypeId
      );
    }

    if (filters.leavePeriodId) {
      conditions.push(
        "elb.leave_period_id = ?"
      );

      parameters.push(
        filters.leavePeriodId
      );
    }

    if (
      filters.onlyInconsistent
    ) {
      conditions.push(`
        ABS(
          elb.available_balance -
          ${computedBalanceSql}
        ) > 0.005
      `);
    }

    const idRows =
      await connection.query(
        `
          SELECT
              elb.leave_balance_id
          FROM employee_leave_balances elb
          WHERE ${conditions.join(
            " AND "
          )}
          ORDER BY
              elb.leave_balance_id ASC
          FOR UPDATE
        `,
        parameters
      );

    const results:
      LeaveBalanceRecalculationDatabaseResult[] =
        [];

    for (const idRow of idRows) {
      const leaveBalanceId =
        String(
          (
            idRow as {
              leave_balance_id:
                | string
                | number
                | bigint;
            }
          ).leave_balance_id
        );

      const result =
        await recalculateLeaveBalanceUsingConnection(
          connection,
          companyId,
          leaveBalanceId,
          filters.repair
        );

      if (result) {
        results.push(
          result
        );
      }
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          filters.repair
            ? "leave_balances_bulk_recalculated"
            : "leave_balances_bulk_validated",

        tableName:
          "employee_leave_balances",

        recordId:
          "BULK",

        newValues: {
          processedCount:
            results.length,

          repairedCount:
            results.filter(
              (
                result
              ) => result.repaired
            ).length,

          filters
        },

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/leave/balances/recalculate",

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return results;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

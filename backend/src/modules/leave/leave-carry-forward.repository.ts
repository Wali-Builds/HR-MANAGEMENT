import {
  randomBytes
} from "node:crypto";

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
  CreateLeaveCarryForwardRunRecord,
  LeaveBalanceExpiryDatabaseRow,
  LeaveBalanceExpiryProcessingResult,
  LeaveCarryForwardLotDatabaseRow,
  LeaveCarryForwardPreviewItem,
  LeaveCarryForwardPreviewResponse,
  LeaveCarryForwardRunDatabaseRow,
  LeaveCarryForwardRunDetailDatabaseRow,
  LeaveCarryForwardRunProcessingResult
} from "./leave-accrual.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedCarryForwardResult<T> {
  records: T[];
  totalRecords: number;
}

export interface LeaveCarryForwardRunListFilters {
  sourcePeriodId?: string;
  targetPeriodId?: string;

  runStatus?: string;
  isDryRun?: boolean;

  processingDateFrom?: string;
  processingDateTo?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface LeaveCarryForwardRunDetailListFilters {
  employeeId?: string;
  leaveTypeId?: string;
  detailStatus?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface LeaveBalanceExpiryListFilters {
  employeeId?: string;
  leaveTypeId?: string;
  leavePeriodId?: string;

  expiryStatus?: string;

  expiryDateFrom?: string;
  expiryDateTo?: string;

  page: number;
  pageSize: number;
}

export interface LeaveCarryForwardPreviewFilters {
  companyId: string;

  sourcePeriodId: string;
  targetPeriodId: string;

  processingDate: string;

  employeeId?: string;
  leaveTypeId?: string;
}

export interface ProcessLeaveCarryForwardRunOptions {
  continueOnError: boolean;
  processedByUserId: string;
}

export interface ProcessLeaveBalanceExpiryOptions {
  companyId: string;
  leavePeriodId: string;

  processingDate: string;

  employeeId?: string;
  leaveTypeId?: string;

  continueOnError: boolean;
  dryRun: boolean;

  processedByUserId: string;
}

/*
 * =========================================================
 * Internal rows
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
}

interface LockedCarryForwardRunRow {
  carry_forward_run_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  source_period_id:
    | string
    | number
    | bigint;

  target_period_id:
    | string
    | number
    | bigint;

  run_number: string;
  idempotency_key: string;
  run_name: string;

  processing_date:
    | Date
    | string;

  run_status: string;

  is_dry_run:
    | number
    | boolean;
}

interface CarryForwardCandidateRow {
  source_leave_balance_id:
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

  employee_code: string;
  employee_name: string;

  employee_is_active:
    | number
    | boolean;

  leave_type_id:
    | string
    | number
    | bigint;

  leave_type_code: string;
  leave_type_name: string;

  source_available_balance:
    | string
    | number;

  leave_policy_rule_id:
    | string
    | number
    | bigint
    | null;

  carry_forward_enabled:
    | number
    | boolean
    | null;

  maximum_carry_forward_units:
    | string
    | number
    | null;

  carry_forward_expiry_months:
    | string
    | number
    | null;

  maximum_balance_units:
    | string
    | number
    | null;

  target_leave_balance_id:
    | string
    | number
    | bigint
    | null;

  target_available_balance:
    | string
    | number
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

  carried_forward_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  pending_units:
    | string
    | number;

  available_balance:
    | string
    | number;
}

interface LockedCarryForwardLotRow {
  carry_forward_lot_id:
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

  target_period_id:
    | string
    | number
    | bigint;

  target_leave_balance_id:
    | string
    | number
    | bigint;

  remaining_units:
    | string
    | number;

  consumed_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  expiry_date:
    | Date
    | string
    | null;

  lot_status: string;
}

interface CarryForwardCalculation {
  status:
    | "ELIGIBLE"
    | "SKIPPED";

  skipReason:
    | string
    | null;

  sourceAvailableBalance: number;

  maximumCarryForwardUnits:
    | number
    | null;

  eligibleUnits: number;
  carriedUnits: number;
  expiredUnitsAtClose: number;

  targetBalanceBefore: number;
  targetBalanceAfter: number;

  expiryDate:
    | string
    | null;
}

/*
 * =========================================================
 * Helpers
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

function roundUnits(
  value: number
): number {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) * 100
    ) / 100
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

function parseDateOnlyUtc(
  value: string
): Date {
  return new Date(
    `${value}T00:00:00.000Z`
  );
}

function formatDateOnlyUtc(
  value: Date
): string {
  return value
    .toISOString()
    .slice(0, 10);
}

function addDays(
  value: string,
  days: number
): string {
  const parsed =
    parseDateOnlyUtc(value);

  parsed.setUTCDate(
    parsed.getUTCDate() +
    days
  );

  return formatDateOnlyUtc(
    parsed
  );
}

function addMonths(
  value: string,
  months: number
): string {
  const source =
    parseDateOnlyUtc(value);

  const originalDay =
    source.getUTCDate();

  source.setUTCDate(1);

  source.setUTCMonth(
    source.getUTCMonth() +
    months
  );

  const lastDayOfMonth =
    new Date(
      Date.UTC(
        source.getUTCFullYear(),
        source.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();

  source.setUTCDate(
    Math.min(
      originalDay,
      lastDayOfMonth
    )
  );

  return formatDateOnlyUtc(source);
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

function generateRunNumber(): string {
  const datePart =
    currentDateOnly()
      .replace(/-/g, "");

  const randomPart =
    randomBytes(6)
      .toString("hex")
      .toUpperCase();

  return `LCF-${datePart}-${randomPart}`;
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
          return String(currentValue);
        }

        if (
          Buffer.isBuffer(currentValue)
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
 * Activity log
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
        : safeJson(input.oldValues),

      input.newValues === undefined
        ? null
        : safeJson(input.newValues),

      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

/*
 * =========================================================
 * Shared SELECT statements
 * =========================================================
 */

const carryForwardRunSelect = `
  SELECT
      lcfr.carry_forward_run_id,
      lcfr.company_id,

      lcfr.source_period_id,
      source_period.period_code
          AS source_period_code,
      source_period.period_name
          AS source_period_name,

      lcfr.target_period_id,
      target_period.period_code
          AS target_period_code,
      target_period.period_name
          AS target_period_name,

      lcfr.run_number,
      lcfr.idempotency_key,
      lcfr.run_name,
      lcfr.processing_date,
      lcfr.run_status,
      lcfr.is_dry_run,

      lcfr.total_candidates,
      lcfr.processed_count,
      lcfr.successful_count,
      lcfr.skipped_count,
      lcfr.failed_count,

      lcfr.total_eligible_units,
      lcfr.total_carried_units,
      lcfr.total_expired_units,

      lcfr.started_by_user_id,
      started_user.username
          AS started_by_username,
      lcfr.started_at,

      lcfr.completed_at,

      lcfr.cancelled_by_user_id,
      cancelled_user.username
          AS cancelled_by_username,
      lcfr.cancelled_at,
      lcfr.cancellation_reason,

      lcfr.error_summary,

      lcfr.created_by_user_id,
      created_user.username
          AS created_by_username,

      (
        SELECT COUNT(*)
        FROM leave_carry_forward_run_details detail_count
        WHERE detail_count.carry_forward_run_id =
              lcfr.carry_forward_run_id
      ) AS detail_count,

      lcfr.created_at,
      lcfr.updated_at

  FROM leave_carry_forward_runs lcfr

  INNER JOIN leave_periods source_period
      ON source_period.leave_period_id =
         lcfr.source_period_id

  INNER JOIN leave_periods target_period
      ON target_period.leave_period_id =
         lcfr.target_period_id

  LEFT JOIN users started_user
      ON started_user.user_id =
         lcfr.started_by_user_id

  LEFT JOIN users cancelled_user
      ON cancelled_user.user_id =
         lcfr.cancelled_by_user_id

  LEFT JOIN users created_user
      ON created_user.user_id =
         lcfr.created_by_user_id
`;

const carryForwardDetailSelect = `
  SELECT
      detail.carry_forward_run_detail_id,
      detail.carry_forward_run_id,
      detail.company_id,

      detail.employee_id,
      employee.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          employee.first_name,
          employee.middle_name,
          employee.last_name
        )
      ) AS employee_name,

      detail.leave_type_id,
      leave_type.leave_type_code,
      leave_type.leave_type_name,

      detail.leave_policy_rule_id,

      detail.source_leave_balance_id,
      detail.target_leave_balance_id,

      detail.source_available_balance,
      detail.carry_forward_limit_units,
      detail.eligible_units,
      detail.carried_units,
      detail.expired_units_at_close,

      detail.target_balance_before,
      detail.target_balance_after,

      detail.carry_forward_expiry_date,

      detail.carry_transaction_id,
      detail.source_expiry_transaction_id,

      detail.detail_status,
      detail.skip_reason,
      detail.error_code,
      detail.error_message,
      detail.processed_at,

      detail.created_at,
      detail.updated_at

  FROM leave_carry_forward_run_details detail

  INNER JOIN employees employee
      ON employee.employee_id =
         detail.employee_id

  INNER JOIN leave_types leave_type
      ON leave_type.leave_type_id =
         detail.leave_type_id
`;

const carryForwardLotSelect = `
  SELECT
      lot.carry_forward_lot_id,
      lot.company_id,
      lot.carry_forward_run_detail_id,

      lot.employee_id,
      employee.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          employee.first_name,
          employee.middle_name,
          employee.last_name
        )
      ) AS employee_name,

      lot.leave_type_id,
      leave_type.leave_type_code,
      leave_type.leave_type_name,

      lot.source_period_id,
      lot.target_period_id,

      lot.source_leave_balance_id,
      lot.target_leave_balance_id,

      lot.original_units,
      lot.remaining_units,
      lot.consumed_units,
      lot.expired_units,

      lot.expiry_date,
      lot.lot_status,

      lot.carry_transaction_id,
      lot.expiry_transaction_id,

      lot.fully_consumed_at,
      lot.expired_at,

      lot.created_at,
      lot.updated_at

  FROM leave_carry_forward_lots lot

  INNER JOIN employees employee
      ON employee.employee_id =
         lot.employee_id

  INNER JOIN leave_types leave_type
      ON leave_type.leave_type_id =
         lot.leave_type_id
`;

const expirySelect = `
  SELECT
      expiry.leave_balance_expiry_id,
      expiry.company_id,
      expiry.carry_forward_lot_id,

      expiry.employee_id,
      employee.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          employee.first_name,
          employee.middle_name,
          employee.last_name
        )
      ) AS employee_name,

      expiry.leave_type_id,
      leave_type.leave_type_code,
      leave_type.leave_type_name,

      expiry.leave_period_id,
      expiry.leave_balance_id,

      expiry.expiry_date,
      expiry.scheduled_units,
      expiry.expired_units,
      expiry.expiry_status,

      expiry.transaction_id,

      expiry.processed_by_user_id,
      processed_user.username
          AS processed_by_username,

      expiry.processed_at,
      expiry.error_code,
      expiry.error_message,

      expiry.created_at,
      expiry.updated_at

  FROM leave_balance_expiries expiry

  INNER JOIN employees employee
      ON employee.employee_id =
         expiry.employee_id

  INNER JOIN leave_types leave_type
      ON leave_type.leave_type_id =
         expiry.leave_type_id

  LEFT JOIN users processed_user
      ON processed_user.user_id =
         expiry.processed_by_user_id
`;

/*
 * =========================================================
 * Period and run locks
 * =========================================================
 */

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
            period_status

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

async function lockCarryForwardRun(
  connection: PoolConnection,
  companyId: string,
  carryForwardRunId: string
): Promise<LockedCarryForwardRunRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            carry_forward_run_id,
            company_id,
            source_period_id,
            target_period_id,
            run_number,
            idempotency_key,
            run_name,
            processing_date,
            run_status,
            is_dry_run

        FROM leave_carry_forward_runs

        WHERE carry_forward_run_id = ?
          AND company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        carryForwardRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedCarryForwardRunRow
      | undefined
  ) ?? null;
}

function validatePeriodRelationship(
  sourcePeriod: LockedLeavePeriodRow,
  targetPeriod: LockedLeavePeriodRow,
  processingDate: string
): void {
  const sourceStart =
    dateOnly(sourcePeriod.start_date);

  const sourceEnd =
    dateOnly(sourcePeriod.end_date);

  const targetStart =
    dateOnly(targetPeriod.start_date);

  const targetEnd =
    dateOnly(targetPeriod.end_date);

  if (
    !sourceStart ||
    !sourceEnd ||
    !targetStart ||
    !targetEnd
  ) {
    throw new Error(
      "INVALID_LEAVE_PERIOD_DATES"
    );
  }

  if (
    String(sourcePeriod.leave_period_id) ===
    String(targetPeriod.leave_period_id)
  ) {
    throw new Error(
      "SOURCE_AND_TARGET_PERIOD_CANNOT_MATCH"
    );
  }

  if (targetStart <= sourceEnd) {
    throw new Error(
      "TARGET_PERIOD_MUST_FOLLOW_SOURCE_PERIOD"
    );
  }

  if (processingDate < sourceEnd) {
    throw new Error(
      "CARRY_FORWARD_BEFORE_SOURCE_PERIOD_END"
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
}

/*
 * =========================================================
 * Carry-forward candidate resolution
 * =========================================================
 */

async function findCarryForwardCandidates(
  connection: PoolConnection,
  input: {
    companyId: string;
    sourcePeriodId: string;
    targetPeriodId: string;
    effectiveDate: string;

    employeeId?: string;
    leaveTypeId?: string;
  }
): Promise<CarryForwardCandidateRow[]> {
  const conditions: string[] = [
    "source_balance.company_id = ?",
    "source_balance.leave_period_id = ?"
  ];

  const parameters: unknown[] = [
    input.companyId,
    input.sourcePeriodId
  ];

  if (input.employeeId !== undefined) {
    conditions.push(
      "source_balance.employee_id = ?"
    );

    parameters.push(
      input.employeeId
    );
  }

  if (input.leaveTypeId !== undefined) {
    conditions.push(
      "source_balance.leave_type_id = ?"
    );

    parameters.push(
      input.leaveTypeId
    );
  }

  const rows =
    await connection.query(
      `
        WITH effective_policy AS (
          SELECT
              employee.employee_id,

              COALESCE(
                (
                  SELECT assignment.leave_policy_id

                  FROM employee_leave_policy_assignments assignment

                  INNER JOIN leave_policies policy
                      ON policy.leave_policy_id =
                         assignment.leave_policy_id

                  WHERE assignment.employee_id =
                        employee.employee_id

                    AND assignment.effective_from <= ?

                    AND (
                      assignment.effective_to IS NULL
                      OR assignment.effective_to >= ?
                    )

                    AND policy.company_id =
                        employee.company_id

                    AND policy.is_active = 1
                    AND policy.deleted_at IS NULL

                  ORDER BY
                      assignment.is_current DESC,
                      assignment.effective_from DESC,
                      assignment.assignment_id DESC

                  LIMIT 1
                ),

                (
                  SELECT default_policy.leave_policy_id

                  FROM leave_policies default_policy

                  WHERE default_policy.company_id =
                        employee.company_id

                    AND default_policy.is_default = 1
                    AND default_policy.is_active = 1
                    AND default_policy.deleted_at IS NULL

                  ORDER BY
                      default_policy.effective_from DESC,
                      default_policy.leave_policy_id DESC

                  LIMIT 1
                )
              ) AS leave_policy_id

          FROM employees employee

          WHERE employee.company_id = ?
        )

        SELECT
            source_balance.leave_balance_id
                AS source_leave_balance_id,

            source_balance.company_id,
            source_balance.employee_id,

            employee.employee_code,

            TRIM(
              CONCAT_WS(
                ' ',
                employee.first_name,
                employee.middle_name,
                employee.last_name
              )
            ) AS employee_name,

            employee.is_active
                AS employee_is_active,

            source_balance.leave_type_id,
            leave_type.leave_type_code,
            leave_type.leave_type_name,

            source_balance.available_balance
                AS source_available_balance,

            rule.leave_policy_rule_id,
            rule.carry_forward_enabled,
            rule.maximum_carry_forward_units,
            rule.carry_forward_expiry_months,
            rule.maximum_balance_units,

            target_balance.leave_balance_id
                AS target_leave_balance_id,

            target_balance.available_balance
                AS target_available_balance

        FROM employee_leave_balances source_balance

        INNER JOIN employees employee
            ON employee.employee_id =
               source_balance.employee_id

        INNER JOIN leave_types leave_type
            ON leave_type.leave_type_id =
               source_balance.leave_type_id

        LEFT JOIN effective_policy
            ON effective_policy.employee_id =
               source_balance.employee_id

        LEFT JOIN leave_policy_rules rule
            ON rule.leave_policy_id =
               effective_policy.leave_policy_id

           AND rule.leave_type_id =
               source_balance.leave_type_id

           AND rule.is_active = 1

        LEFT JOIN employee_leave_balances target_balance
            ON target_balance.company_id =
               source_balance.company_id

           AND target_balance.employee_id =
               source_balance.employee_id

           AND target_balance.leave_type_id =
               source_balance.leave_type_id

           AND target_balance.leave_period_id = ?

        WHERE ${conditions.join(" AND ")}

        ORDER BY
            employee.employee_code ASC,
            leave_type.leave_type_code ASC
      `,
      [
        input.effectiveDate,
        input.effectiveDate,
        input.companyId,
        input.targetPeriodId,
        ...parameters
      ]
    );

  return rows as unknown as
    CarryForwardCandidateRow[];
}

/*
 * =========================================================
 * Carry-forward calculation
 * =========================================================
 */

function calculateCarryForward(
  candidate: CarryForwardCandidateRow,
  targetPeriodStartDate: string
): CarryForwardCalculation {
  const sourceAvailableBalance =
    roundUnits(
      Math.max(
        0,
        Number(
          candidate.source_available_balance
        )
      )
    );

  const targetBalanceBefore =
    Number(
      candidate.target_available_balance ??
      0
    );

  if (sourceAvailableBalance <= 0) {
    return {
      status: "SKIPPED",
      skipReason:
        "NO_POSITIVE_SOURCE_BALANCE",

      sourceAvailableBalance: 0,
      maximumCarryForwardUnits: null,
      eligibleUnits: 0,
      carriedUnits: 0,
      expiredUnitsAtClose: 0,

      targetBalanceBefore,
      targetBalanceAfter:
        targetBalanceBefore,

      expiryDate: null
    };
  }

  if (
    candidate.leave_policy_rule_id ===
    null
  ) {
    return {
      status: "SKIPPED",
      skipReason:
        "APPLICABLE_POLICY_RULE_NOT_FOUND",

      sourceAvailableBalance,
      maximumCarryForwardUnits: null,
      eligibleUnits: 0,
      carriedUnits: 0,
      expiredUnitsAtClose: 0,

      targetBalanceBefore,
      targetBalanceAfter:
        targetBalanceBefore,

      expiryDate: null
    };
  }

  if (
    !databaseBoolean(
      candidate.employee_is_active
    )
  ) {
    return {
      status: "ELIGIBLE",
      skipReason:
        "INACTIVE_EMPLOYEE_BALANCE_EXPIRES",

      sourceAvailableBalance,
      maximumCarryForwardUnits: 0,
      eligibleUnits:
        sourceAvailableBalance,
      carriedUnits: 0,
      expiredUnitsAtClose:
        sourceAvailableBalance,

      targetBalanceBefore,
      targetBalanceAfter:
        targetBalanceBefore,

      expiryDate: null
    };
  }

  const carryForwardEnabled =
    databaseBoolean(
      candidate.carry_forward_enabled
    );

  const maximumCarryForwardUnits =
    candidate.maximum_carry_forward_units ===
      null
      ? null
      : Number(
          candidate.maximum_carry_forward_units
        );

  let carriedUnits = 0;

  if (carryForwardEnabled) {
    carriedUnits =
      maximumCarryForwardUnits === null
        ? sourceAvailableBalance
        : roundUnits(
            Math.min(
              sourceAvailableBalance,
              maximumCarryForwardUnits
            )
          );
  }

  const maximumBalanceUnits =
    candidate.maximum_balance_units ===
      null
      ? null
      : Number(
          candidate.maximum_balance_units
        );

  if (maximumBalanceUnits !== null) {
    const targetCapacity =
      roundUnits(
        Math.max(
          0,
          maximumBalanceUnits -
          targetBalanceBefore
        )
      );

    carriedUnits =
      roundUnits(
        Math.min(
          carriedUnits,
          targetCapacity
        )
      );
  }

  const expiredUnitsAtClose =
    roundUnits(
      sourceAvailableBalance -
      carriedUnits
    );

  const expiryMonths =
    candidate.carry_forward_expiry_months ===
      null
      ? null
      : Number(
          candidate.carry_forward_expiry_months
        );

  const expiryDate =
    carriedUnits > 0 &&
    expiryMonths !== null
      ? addDays(
          addMonths(
            targetPeriodStartDate,
            expiryMonths
          ),
          -1
        )
      : null;

  return {
    status:
      carriedUnits > 0 ||
      expiredUnitsAtClose > 0
        ? "ELIGIBLE"
        : "SKIPPED",

    skipReason:
      carryForwardEnabled
        ? null
        : "CARRY_FORWARD_DISABLED",

    sourceAvailableBalance,
    maximumCarryForwardUnits,

    eligibleUnits:
      sourceAvailableBalance,

    carriedUnits,
    expiredUnitsAtClose,

    targetBalanceBefore,

    targetBalanceAfter:
      roundUnits(
        targetBalanceBefore +
        carriedUnits
      ),

    expiryDate
  };
}

/*
 * =========================================================
 * Preview
 * =========================================================
 */

export async function previewLeaveCarryForwardRecords(
  filters: LeaveCarryForwardPreviewFilters
): Promise<LeaveCarryForwardPreviewResponse> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const sourcePeriod =
      await lockLeavePeriod(
        connection,
        filters.companyId,
        filters.sourcePeriodId
      );

    const targetPeriod =
      await lockLeavePeriod(
        connection,
        filters.companyId,
        filters.targetPeriodId
      );

    if (!sourcePeriod) {
      throw new Error(
        "SOURCE_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    if (!targetPeriod) {
      throw new Error(
        "TARGET_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    validatePeriodRelationship(
      sourcePeriod,
      targetPeriod,
      filters.processingDate
    );

    const targetStartDate =
      dateOnly(targetPeriod.start_date);

    if (!targetStartDate) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATES"
      );
    }

    const candidates =
      await findCarryForwardCandidates(
        connection,
        {
          companyId:
            filters.companyId,

          sourcePeriodId:
            filters.sourcePeriodId,

          targetPeriodId:
            filters.targetPeriodId,

          effectiveDate:
            targetStartDate,

          ...(filters.employeeId !== undefined
            ? {
                employeeId:
                  filters.employeeId
              }
            : {}),

          ...(filters.leaveTypeId !== undefined
            ? {
                leaveTypeId:
                  filters.leaveTypeId
              }
            : {})
        }
      );

    const items:
      LeaveCarryForwardPreviewItem[] =
        candidates.map(
          candidate => {
            const calculation =
              calculateCarryForward(
                candidate,
                targetStartDate
              );

            return {
              employeeId:
                String(
                  candidate.employee_id
                ),

              employeeCode:
                candidate.employee_code,

              employeeName:
                candidate.employee_name,

              leaveTypeId:
                String(
                  candidate.leave_type_id
                ),

              leaveTypeCode:
                candidate.leave_type_code,

              leaveTypeName:
                candidate.leave_type_name,

              leavePolicyRuleId:
                candidate.leave_policy_rule_id ===
                  null
                  ? null
                  : String(
                      candidate
                        .leave_policy_rule_id
                    ),

              sourceLeaveBalanceId:
                String(
                  candidate
                    .source_leave_balance_id
                ),

              sourceAvailableBalance:
                calculation
                  .sourceAvailableBalance,

              carryForwardEnabled:
                databaseBoolean(
                  candidate
                    .carry_forward_enabled
                ),

              maximumCarryForwardUnits:
                calculation
                  .maximumCarryForwardUnits,

              eligibleUnits:
                calculation.eligibleUnits,

              carriedUnits:
                calculation.carriedUnits,

              expiredUnitsAtClose:
                calculation
                  .expiredUnitsAtClose,

              carryForwardExpiryDate:
                calculation.expiryDate,

              status:
                calculation.status,

              skipReason:
                calculation.skipReason
            };
          }
        );

    await connection.rollback();
    transactionStarted = false;

    return {
      companyId:
        filters.companyId,

      sourcePeriodId:
        filters.sourcePeriodId,

      targetPeriodId:
        filters.targetPeriodId,

      processingDate:
        filters.processingDate,

      totalCandidates:
        items.length,

      eligibleCount:
        items.filter(
          item =>
            item.status ===
            "ELIGIBLE"
        ).length,

      skippedCount:
        items.filter(
          item =>
            item.status ===
            "SKIPPED"
        ).length,

      totalEligibleUnits:
        roundUnits(
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              item.eligibleUnits,
            0
          )
        ),

      totalCarriedUnits:
        roundUnits(
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              item.carriedUnits,
            0
          )
        ),

      totalExpiredUnits:
        roundUnits(
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              item.expiredUnitsAtClose,
            0
          )
        ),

      items
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
 * Run creation
 * =========================================================
 */

export async function createLeaveCarryForwardRunRecord(
  input: CreateLeaveCarryForwardRunRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveCarryForwardRunDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const sourcePeriod =
      await lockLeavePeriod(
        connection,
        input.companyId,
        input.sourcePeriodId
      );

    const targetPeriod =
      await lockLeavePeriod(
        connection,
        input.companyId,
        input.targetPeriodId
      );

    if (!sourcePeriod) {
      throw new Error(
        "SOURCE_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    if (!targetPeriod) {
      throw new Error(
        "TARGET_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    validatePeriodRelationship(
      sourcePeriod,
      targetPeriod,
      input.processingDate
    );

    if (!input.isDryRun) {
      const duplicateRows =
        await connection.query(
          `
            SELECT carry_forward_run_id

            FROM leave_carry_forward_runs

            WHERE company_id = ?
              AND source_period_id = ?
              AND target_period_id = ?
              AND is_dry_run = 0

              AND run_status IN (
                'PROCESSING',
                'COMPLETED',
                'PARTIAL_FAILED'
              )

            LIMIT 1
            FOR UPDATE
          `,
          [
            input.companyId,
            input.sourcePeriodId,
            input.targetPeriodId
          ]
        );

      if (duplicateRows.length > 0) {
        throw new Error(
          "CARRY_FORWARD_ALREADY_PROCESSED"
        );
      }
    }

    const result =
      await connection.query(
        `
          INSERT INTO leave_carry_forward_runs (
              company_id,
              source_period_id,
              target_period_id,
              run_number,
              idempotency_key,
              run_name,
              processing_date,
              run_status,
              is_dry_run,
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
              'DRAFT',
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.sourcePeriodId,
          input.targetPeriodId,

          input.runNumber ||
            generateRunNumber(),

          input.idempotencyKey,
          input.runName,
          input.processingDate,

          input.isDryRun
            ? 1
            : 0,

          input.createdByUserId
        ]
      ) as unknown as InsertResult;

    const carryForwardRunId =
      String(result.insertId);

    const created =
      await selectCarryForwardRunUsingConnection(
        connection,
        input.companyId,
        carryForwardRunId
      );

    if (!created) {
      throw new Error(
        "CREATED_CARRY_FORWARD_RUN_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_carry_forward_run_created",

        tableName:
          "leave_carry_forward_runs",

        recordId:
          carryForwardRunId,

        newValues: {
          carryForwardRunId,
          sourcePeriodId:
            input.sourcePeriodId,
          targetPeriodId:
            input.targetPeriodId,
          processingDate:
            input.processingDate,
          isDryRun:
            input.isDryRun
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/periods/${input.sourcePeriodId}/carry-forward`,

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
 * Run lookup helpers
 * =========================================================
 */

async function selectCarryForwardRunUsingConnection(
  connection: PoolConnection,
  companyId: string,
  carryForwardRunId: string
): Promise<
  LeaveCarryForwardRunDatabaseRow | null
> {
  const rows =
    await connection.query(
      `
        ${carryForwardRunSelect}

        WHERE lcfr.carry_forward_run_id = ?
          AND lcfr.company_id = ?

        LIMIT 1
      `,
      [
        carryForwardRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveCarryForwardRunDatabaseRow
      | undefined
  ) ?? null;
}

async function selectCarryForwardDetailsUsingConnection(
  connection: PoolConnection,
  carryForwardRunId: string
): Promise<
  LeaveCarryForwardRunDetailDatabaseRow[]
> {
  const rows =
    await connection.query(
      `
        ${carryForwardDetailSelect}

        WHERE detail.carry_forward_run_id = ?

        ORDER BY
            employee.employee_code ASC,
            leave_type.leave_type_code ASC,
            detail.carry_forward_run_detail_id ASC
      `,
      [
        carryForwardRunId
      ]
    );

  return rows as unknown as
    LeaveCarryForwardRunDetailDatabaseRow[];
}

async function selectCarryForwardLotsUsingConnection(
  connection: PoolConnection,
  carryForwardRunId: string
): Promise<
  LeaveCarryForwardLotDatabaseRow[]
> {
  const rows =
    await connection.query(
      `
        ${carryForwardLotSelect}

        INNER JOIN leave_carry_forward_run_details detail
            ON detail.carry_forward_run_detail_id =
               lot.carry_forward_run_detail_id

        WHERE detail.carry_forward_run_id = ?

        ORDER BY
            lot.expiry_date ASC,
            lot.carry_forward_lot_id ASC
      `,
      [
        carryForwardRunId
      ]
    );

  return rows as unknown as
    LeaveCarryForwardLotDatabaseRow[];
}

/*
 * =========================================================
 * Public run lists
 * =========================================================
 */

export async function listLeaveCarryForwardRunRecords(
  companyId: string,
  filters: LeaveCarryForwardRunListFilters
): Promise<
  PaginatedCarryForwardResult<
    LeaveCarryForwardRunDatabaseRow
  >
> {
  const conditions: string[] = [
    "lcfr.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.sourcePeriodId) {
    conditions.push(
      "lcfr.source_period_id = ?"
    );

    parameters.push(
      filters.sourcePeriodId
    );
  }

  if (filters.targetPeriodId) {
    conditions.push(
      "lcfr.target_period_id = ?"
    );

    parameters.push(
      filters.targetPeriodId
    );
  }

  if (filters.runStatus) {
    conditions.push(
      "lcfr.run_status = ?"
    );

    parameters.push(
      filters.runStatus
    );
  }

  if (
    filters.isDryRun !==
    undefined
  ) {
    conditions.push(
      "lcfr.is_dry_run = ?"
    );

    parameters.push(
      filters.isDryRun
        ? 1
        : 0
    );
  }

  if (filters.processingDateFrom) {
    conditions.push(
      "lcfr.processing_date >= ?"
    );

    parameters.push(
      filters.processingDateFrom
    );
  }

  if (filters.processingDateTo) {
    conditions.push(
      "lcfr.processing_date <= ?"
    );

    parameters.push(
      filters.processingDateTo
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        lcfr.run_number LIKE ?
        OR lcfr.idempotency_key LIKE ?
        OR lcfr.run_name LIKE ?
        OR source_period.period_code LIKE ?
        OR source_period.period_name LIKE ?
        OR target_period.period_code LIKE ?
        OR target_period.period_name LIKE ?
      )
    `);

    parameters.push(
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
        SELECT COUNT(*) AS total_records

        FROM leave_carry_forward_runs lcfr

        INNER JOIN leave_periods source_period
            ON source_period.leave_period_id =
               lcfr.source_period_id

        INNER JOIN leave_periods target_period
            ON target_period.leave_period_id =
               lcfr.target_period_id

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
        ${carryForwardRunSelect}

        WHERE ${whereClause}

        ORDER BY
            lcfr.created_at DESC,
            lcfr.carry_forward_run_id DESC

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
      rows as unknown as
        LeaveCarryForwardRunDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeaveCarryForwardRunRecordById(
  companyId: string,
  carryForwardRunId: string
): Promise<
  LeaveCarryForwardRunDatabaseRow | null
> {
  const rows =
    await databasePool.query(
      `
        ${carryForwardRunSelect}

        WHERE lcfr.carry_forward_run_id = ?
          AND lcfr.company_id = ?

        LIMIT 1
      `,
      [
        carryForwardRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveCarryForwardRunDatabaseRow
      | undefined
  ) ?? null;
}

export async function listLeaveCarryForwardRunDetailRecords(
  companyId: string,
  carryForwardRunId: string,
  filters:
    LeaveCarryForwardRunDetailListFilters
): Promise<
  PaginatedCarryForwardResult<
    LeaveCarryForwardRunDetailDatabaseRow
  >
> {
  const conditions: string[] = [
    "detail.company_id = ?",
    "detail.carry_forward_run_id = ?"
  ];

  const parameters: unknown[] = [
    companyId,
    carryForwardRunId
  ];

  if (filters.employeeId) {
    conditions.push(
      "detail.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "detail.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.detailStatus) {
    conditions.push(
      "detail.detail_status = ?"
    );

    parameters.push(
      filters.detailStatus
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        employee.employee_code LIKE ?
        OR employee.first_name LIKE ?
        OR employee.middle_name LIKE ?
        OR employee.last_name LIKE ?
        OR leave_type.leave_type_code LIKE ?
        OR leave_type.leave_type_name LIKE ?
        OR detail.skip_reason LIKE ?
        OR detail.error_code LIKE ?
        OR detail.error_message LIKE ?
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
      searchValue
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_carry_forward_run_details detail

        INNER JOIN employees employee
            ON employee.employee_id =
               detail.employee_id

        INNER JOIN leave_types leave_type
            ON leave_type.leave_type_id =
               detail.leave_type_id

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
        ${carryForwardDetailSelect}

        WHERE ${whereClause}

        ORDER BY
            employee.employee_code ASC,
            leave_type.leave_type_code ASC,
            detail.carry_forward_run_detail_id ASC

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
      rows as unknown as
        LeaveCarryForwardRunDetailDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

/*
 * =========================================================
 * Carry-forward processing helpers
 * =========================================================
 */

interface CarryForwardProcessingBalanceRow {
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

  adjusted_units:
    | string
    | number;

  carried_forward_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  pending_units:
    | string
    | number;

  available_balance:
    | string
    | number;
}

interface CarryForwardDetailInsertInput {
  carryForwardRunId: string;
  companyId: string;

  employeeId: string;
  leaveTypeId: string;

  leavePolicyRuleId:
    | string
    | null;

  sourceLeaveBalanceId: string;
  targetLeaveBalanceId:
    | string
    | null;

  sourceAvailableBalance: number;
  carryForwardLimitUnits:
    | number
    | null;

  eligibleUnits: number;
  carriedUnits: number;
  expiredUnitsAtClose: number;

  targetBalanceBefore:
    | number
    | null;

  targetBalanceAfter:
    | number
    | null;

  carryForwardExpiryDate:
    | string
    | null;

  carryTransactionId:
    | string
    | null;

  sourceExpiryTransactionId:
    | string
    | null;

  detailStatus:
    | "PENDING"
    | "PROCESSED"
    | "SKIPPED"
    | "FAILED";

  skipReason:
    | string
    | null;

  errorCode:
    | string
    | null;

  errorMessage:
    | string
    | null;
}

interface CarryForwardCandidateProcessingResult {
  detailStatus:
    | "PROCESSED"
    | "SKIPPED";

  eligibleUnits: number;
  carriedUnits: number;
  expiredUnits: number;
}

interface LockedExpiryProcessingRow {
  leave_balance_expiry_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  carry_forward_lot_id:
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

  leave_balance_id:
    | string
    | number
    | bigint;

  expiry_date:
    | Date
    | string;

  scheduled_units:
    | string
    | number;

  expired_units:
    | string
    | number;

  expiry_status: string;

  lot_status: string;

  lot_remaining_units:
    | string
    | number;

  lot_expired_units:
    | string
    | number;

  balance_pending_units:
    | string
    | number;

  balance_available_balance:
    | string
    | number;
}

export interface CancelLeaveCarryForwardRunInput {
  reason: string;
  cancelledByUserId: string;
}

async function ensureTargetLeaveBalance(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT IGNORE INTO employee_leave_balances (
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
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          NULL,
          CURRENT_TIMESTAMP
      )
    `,
    [
      input.companyId,
      input.employeeId,
      input.leaveTypeId,
      input.leavePeriodId
    ]
  );
}

async function lockProcessingBalanceById(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceId: string
): Promise<CarryForwardProcessingBalanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_balance_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            adjusted_units,
            carried_forward_units,
            expired_units,
            pending_units,
            available_balance

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
      | CarryForwardProcessingBalanceRow
      | undefined
  ) ?? null;
}

async function lockProcessingBalanceByScope(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;
  }
): Promise<CarryForwardProcessingBalanceRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_balance_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            adjusted_units,
            carried_forward_units,
            expired_units,
            pending_units,
            available_balance

        FROM employee_leave_balances

        WHERE company_id = ?
          AND employee_id = ?
          AND leave_type_id = ?
          AND leave_period_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId
      ]
    );

  return (
    rows[0] as
      | CarryForwardProcessingBalanceRow
      | undefined
  ) ?? null;
}

async function insertCarryForwardBalanceTransaction(
  connection: PoolConnection,
  input: {
    leaveBalanceId: string;
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    transactionDate: string;
    transactionType:
      | "CARRY_FORWARD"
      | "EXPIRY";

    unitsChanged: number;
    balanceBefore: number;
    balanceAfter: number;

    referenceType: string;
    referenceId: string;
    remarks: string;
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

  return String(result.insertId);
}

async function upsertCarryForwardRunDetail(
  connection: PoolConnection,
  input: CarryForwardDetailInsertInput
): Promise<string> {
  await connection.query(
    `
      INSERT INTO leave_carry_forward_run_details (
          carry_forward_run_id,
          company_id,
          employee_id,
          leave_type_id,
          leave_policy_rule_id,
          source_leave_balance_id,
          target_leave_balance_id,
          source_available_balance,
          carry_forward_limit_units,
          eligible_units,
          carried_units,
          expired_units_at_close,
          target_balance_before,
          target_balance_after,
          carry_forward_expiry_date,
          carry_transaction_id,
          source_expiry_transaction_id,
          detail_status,
          skip_reason,
          error_code,
          error_message,
          processed_at
      )
      VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP
      )

      ON DUPLICATE KEY UPDATE
          leave_policy_rule_id =
            VALUES(leave_policy_rule_id),
          target_leave_balance_id =
            VALUES(target_leave_balance_id),
          source_available_balance =
            VALUES(source_available_balance),
          carry_forward_limit_units =
            VALUES(carry_forward_limit_units),
          eligible_units =
            VALUES(eligible_units),
          carried_units =
            VALUES(carried_units),
          expired_units_at_close =
            VALUES(expired_units_at_close),
          target_balance_before =
            VALUES(target_balance_before),
          target_balance_after =
            VALUES(target_balance_after),
          carry_forward_expiry_date =
            VALUES(carry_forward_expiry_date),
          carry_transaction_id =
            VALUES(carry_transaction_id),
          source_expiry_transaction_id =
            VALUES(source_expiry_transaction_id),
          detail_status =
            VALUES(detail_status),
          skip_reason =
            VALUES(skip_reason),
          error_code =
            VALUES(error_code),
          error_message =
            VALUES(error_message),
          processed_at =
            CURRENT_TIMESTAMP
    `,
    [
      input.carryForwardRunId,
      input.companyId,
      input.employeeId,
      input.leaveTypeId,
      input.leavePolicyRuleId,
      input.sourceLeaveBalanceId,
      input.targetLeaveBalanceId,
      input.sourceAvailableBalance,
      input.carryForwardLimitUnits,
      input.eligibleUnits,
      input.carriedUnits,
      input.expiredUnitsAtClose,
      input.targetBalanceBefore,
      input.targetBalanceAfter,
      input.carryForwardExpiryDate,
      input.carryTransactionId,
      input.sourceExpiryTransactionId,
      input.detailStatus,
      input.skipReason,
      input.errorCode,
      input.errorMessage
    ]
  );

  const rows =
    await connection.query(
      `
        SELECT carry_forward_run_detail_id

        FROM leave_carry_forward_run_details

        WHERE carry_forward_run_id = ?
          AND source_leave_balance_id = ?

        LIMIT 1
      `,
      [
        input.carryForwardRunId,
        input.sourceLeaveBalanceId
      ]
    );

  const row =
    rows[0] as
      | {
          carry_forward_run_detail_id:
            | string
            | number
            | bigint;
        }
      | undefined;

  if (!row) {
    throw new Error(
      "CARRY_FORWARD_RUN_DETAIL_NOT_FOUND_AFTER_UPSERT"
    );
  }

  return String(
    row.carry_forward_run_detail_id
  );
}

async function createCarryForwardLotAndExpiry(
  connection: PoolConnection,
  input: {
    companyId: string;
    carryForwardRunDetailId: string;
    employeeId: string;
    leaveTypeId: string;
    sourcePeriodId: string;
    targetPeriodId: string;
    sourceLeaveBalanceId: string;
    targetLeaveBalanceId: string;
    carriedUnits: number;
    expiryDate:
      | string
      | null;
    carryTransactionId:
      | string
      | null;
  }
): Promise<string> {
  const result =
    await connection.query(
      `
        INSERT INTO leave_carry_forward_lots (
            company_id,
            carry_forward_run_detail_id,
            employee_id,
            leave_type_id,
            source_period_id,
            target_period_id,
            source_leave_balance_id,
            target_leave_balance_id,
            original_units,
            remaining_units,
            consumed_units,
            expired_units,
            expiry_date,
            lot_status,
            carry_transaction_id
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'ACTIVE', ?
        )
      `,
      [
        input.companyId,
        input.carryForwardRunDetailId,
        input.employeeId,
        input.leaveTypeId,
        input.sourcePeriodId,
        input.targetPeriodId,
        input.sourceLeaveBalanceId,
        input.targetLeaveBalanceId,
        input.carriedUnits,
        input.carriedUnits,
        input.expiryDate,
        input.carryTransactionId
      ]
    ) as unknown as InsertResult;

  const carryForwardLotId =
    String(result.insertId);

  if (input.expiryDate !== null) {
    await connection.query(
      `
        INSERT INTO leave_balance_expiries (
            company_id,
            carry_forward_lot_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            leave_balance_id,
            expiry_date,
            scheduled_units,
            expired_units,
            expiry_status
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING'
        )
      `,
      [
        input.companyId,
        carryForwardLotId,
        input.employeeId,
        input.leaveTypeId,
        input.targetPeriodId,
        input.targetLeaveBalanceId,
        input.expiryDate,
        input.carriedUnits
      ]
    );
  }

  return carryForwardLotId;
}

async function processSingleCarryForwardCandidate(
  connection: PoolConnection,
  input: {
    run: LockedCarryForwardRunRow;
    candidate: CarryForwardCandidateRow;
    targetPeriodStartDate: string;
    processingDate: string;
    isDryRun: boolean;
    processedByUserId: string;
  }
): Promise<CarryForwardCandidateProcessingResult> {
  const companyId =
    String(input.run.company_id);

  const sourcePeriodId =
    String(input.run.source_period_id);

  const targetPeriodId =
    String(input.run.target_period_id);

  const carryForwardRunId =
    String(input.run.carry_forward_run_id);

  const employeeId =
    String(input.candidate.employee_id);

  const leaveTypeId =
    String(input.candidate.leave_type_id);

  let calculation =
    calculateCarryForward(
      input.candidate,
      input.targetPeriodStartDate
    );

  if (
    calculation.status ===
    "SKIPPED"
  ) {
    await upsertCarryForwardRunDetail(
      connection,
      {
        carryForwardRunId,
        companyId,
        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          input.candidate.leave_policy_rule_id ===
            null
            ? null
            : String(
                input.candidate
                  .leave_policy_rule_id
              ),

        sourceLeaveBalanceId:
          String(
            input.candidate
              .source_leave_balance_id
          ),

        targetLeaveBalanceId:
          input.candidate.target_leave_balance_id ===
            null
            ? null
            : String(
                input.candidate
                  .target_leave_balance_id
              ),

        sourceAvailableBalance:
          calculation.sourceAvailableBalance,

        carryForwardLimitUnits:
          calculation.maximumCarryForwardUnits,

        eligibleUnits:
          calculation.eligibleUnits,

        carriedUnits: 0,
        expiredUnitsAtClose: 0,

        targetBalanceBefore:
          calculation.targetBalanceBefore,

        targetBalanceAfter:
          calculation.targetBalanceBefore,

        carryForwardExpiryDate: null,
        carryTransactionId: null,
        sourceExpiryTransactionId: null,
        detailStatus: "SKIPPED",
        skipReason: calculation.skipReason,
        errorCode: null,
        errorMessage: null
      }
    );

    return {
      detailStatus: "SKIPPED",
      eligibleUnits: 0,
      carriedUnits: 0,
      expiredUnits: 0
    };
  }

  if (input.isDryRun) {
    await upsertCarryForwardRunDetail(
      connection,
      {
        carryForwardRunId,
        companyId,
        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          input.candidate.leave_policy_rule_id ===
            null
            ? null
            : String(
                input.candidate
                  .leave_policy_rule_id
              ),

        sourceLeaveBalanceId:
          String(
            input.candidate
              .source_leave_balance_id
          ),

        targetLeaveBalanceId:
          input.candidate.target_leave_balance_id ===
            null
            ? null
            : String(
                input.candidate
                  .target_leave_balance_id
              ),

        sourceAvailableBalance:
          calculation.sourceAvailableBalance,

        carryForwardLimitUnits:
          calculation.maximumCarryForwardUnits,

        eligibleUnits:
          calculation.eligibleUnits,

        carriedUnits:
          calculation.carriedUnits,

        expiredUnitsAtClose:
          calculation.expiredUnitsAtClose,

        targetBalanceBefore:
          calculation.targetBalanceBefore,

        targetBalanceAfter:
          calculation.targetBalanceAfter,

        carryForwardExpiryDate:
          calculation.expiryDate,

        carryTransactionId: null,
        sourceExpiryTransactionId: null,
        detailStatus: "PROCESSED",
        skipReason: calculation.skipReason,
        errorCode: null,
        errorMessage: null
      }
    );

    return {
      detailStatus: "PROCESSED",
      eligibleUnits:
        calculation.eligibleUnits,
      carriedUnits:
        calculation.carriedUnits,
      expiredUnits:
        calculation.expiredUnitsAtClose
    };
  }

  const sourceBalance =
    await lockProcessingBalanceById(
      connection,
      companyId,
      String(
        input.candidate
          .source_leave_balance_id
      )
    );

  if (!sourceBalance) {
    throw new Error(
      "SOURCE_LEAVE_BALANCE_NOT_FOUND"
    );
  }

  if (
    String(sourceBalance.leave_period_id) !==
      sourcePeriodId ||
    String(sourceBalance.employee_id) !==
      employeeId ||
    String(sourceBalance.leave_type_id) !==
      leaveTypeId
  ) {
    throw new Error(
      "SOURCE_LEAVE_BALANCE_SCOPE_MISMATCH"
    );
  }

  if (
    Number(sourceBalance.pending_units) >
    0.005
  ) {
    throw new Error(
      "SOURCE_LEAVE_BALANCE_HAS_PENDING_UNITS"
    );
  }

  let targetBalance:
    | CarryForwardProcessingBalanceRow
    | null = null;

  const potentiallyCarries =
    databaseBoolean(
      input.candidate
        .carry_forward_enabled
    ) &&
    databaseBoolean(
      input.candidate
        .employee_is_active
    ) &&
    Number(
      sourceBalance.available_balance
    ) > 0;

  if (potentiallyCarries) {
    await ensureTargetLeaveBalance(
      connection,
      {
        companyId,
        employeeId,
        leaveTypeId,
        leavePeriodId:
          targetPeriodId
      }
    );

    targetBalance =
      await lockProcessingBalanceByScope(
        connection,
        {
          companyId,
          employeeId,
          leaveTypeId,
          leavePeriodId:
            targetPeriodId
        }
      );

    if (!targetBalance) {
      throw new Error(
        "TARGET_LEAVE_BALANCE_NOT_FOUND_AFTER_INITIALIZATION"
      );
    }
  } else if (
    input.candidate.target_leave_balance_id !==
    null
  ) {
    targetBalance =
      await lockProcessingBalanceById(
        connection,
        companyId,
        String(
          input.candidate
            .target_leave_balance_id
        )
      );
  }

  const refreshedCandidate:
    CarryForwardCandidateRow = {
      ...input.candidate,

      source_available_balance:
        sourceBalance.available_balance,

      target_leave_balance_id:
        targetBalance === null
          ? null
          : targetBalance.leave_balance_id,

      target_available_balance:
        targetBalance === null
          ? 0
          : targetBalance.available_balance
    };

  calculation =
    calculateCarryForward(
      refreshedCandidate,
      input.targetPeriodStartDate
    );

  if (
    calculation.status ===
    "SKIPPED"
  ) {
    await upsertCarryForwardRunDetail(
      connection,
      {
        carryForwardRunId,
        companyId,
        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          refreshedCandidate.leave_policy_rule_id ===
            null
            ? null
            : String(
                refreshedCandidate
                  .leave_policy_rule_id
              ),

        sourceLeaveBalanceId:
          String(
            sourceBalance.leave_balance_id
          ),

        targetLeaveBalanceId:
          targetBalance === null
            ? null
            : String(
                targetBalance.leave_balance_id
              ),

        sourceAvailableBalance:
          calculation.sourceAvailableBalance,

        carryForwardLimitUnits:
          calculation.maximumCarryForwardUnits,

        eligibleUnits:
          calculation.eligibleUnits,

        carriedUnits: 0,
        expiredUnitsAtClose: 0,

        targetBalanceBefore:
          calculation.targetBalanceBefore,

        targetBalanceAfter:
          calculation.targetBalanceBefore,

        carryForwardExpiryDate: null,
        carryTransactionId: null,
        sourceExpiryTransactionId: null,
        detailStatus: "SKIPPED",
        skipReason: calculation.skipReason,
        errorCode: null,
        errorMessage: null
      }
    );

    return {
      detailStatus: "SKIPPED",
      eligibleUnits: 0,
      carriedUnits: 0,
      expiredUnits: 0
    };
  }

  const sourceBalanceBefore =
    roundUnits(
      Number(
        sourceBalance.available_balance
      )
    );

  const carriedUnits =
    roundUnits(
      calculation.carriedUnits
    );

  const expiredUnits =
    roundUnits(
      Math.max(
        0,
        sourceBalanceBefore -
          carriedUnits
      )
    );

  const sourceAfterCarry =
    roundUnits(
      sourceBalanceBefore -
      carriedUnits
    );

  const sourceAfterExpiry =
    roundUnits(
      sourceAfterCarry -
      expiredUnits
    );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          adjusted_units =
            adjusted_units - ?,

          expired_units =
            expired_units + ?,

          available_balance = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      carriedUnits,
      expiredUnits,
      sourceAfterExpiry,
      String(
        sourceBalance.leave_balance_id
      ),
      companyId
    ]
  );

  let sourceCarryTransactionId:
    | string
    | null = null;

  if (carriedUnits > 0) {
    sourceCarryTransactionId =
      await insertCarryForwardBalanceTransaction(
        connection,
        {
          leaveBalanceId:
            String(
              sourceBalance.leave_balance_id
            ),
          companyId,
          employeeId,
          leaveTypeId,
          leavePeriodId:
            sourcePeriodId,
          transactionDate:
            input.processingDate,
          transactionType:
            "CARRY_FORWARD",
          unitsChanged:
            -carriedUnits,
          balanceBefore:
            sourceBalanceBefore,
          balanceAfter:
            sourceAfterCarry,
          referenceType:
            "LEAVE_CARRY_FORWARD_RUN",
          referenceId:
            carryForwardRunId,
          remarks:
            "Leave units transferred out to the next leave period",
          createdByUserId:
            input.processedByUserId
        }
      );
  }

  let sourceExpiryTransactionId:
    | string
    | null = null;

  if (expiredUnits > 0) {
    sourceExpiryTransactionId =
      await insertCarryForwardBalanceTransaction(
        connection,
        {
          leaveBalanceId:
            String(
              sourceBalance.leave_balance_id
            ),
          companyId,
          employeeId,
          leaveTypeId,
          leavePeriodId:
            sourcePeriodId,
          transactionDate:
            input.processingDate,
          transactionType:
            "EXPIRY",
          unitsChanged:
            -expiredUnits,
          balanceBefore:
            sourceAfterCarry,
          balanceAfter:
            sourceAfterExpiry,
          referenceType:
            "LEAVE_CARRY_FORWARD_RUN",
          referenceId:
            carryForwardRunId,
          remarks:
            "Leave units expired at source-period closing",
          createdByUserId:
            input.processedByUserId
        }
      );
  }

  let targetCarryTransactionId:
    | string
    | null = null;

  let targetBalanceId:
    | string
    | null = null;

  let targetBalanceBefore:
    | number
    | null = null;

  let targetBalanceAfter:
    | number
    | null = null;

  if (carriedUnits > 0) {
    if (!targetBalance) {
      throw new Error(
        "TARGET_LEAVE_BALANCE_NOT_FOUND"
      );
    }

    targetBalanceId =
      String(
        targetBalance.leave_balance_id
      );

    targetBalanceBefore =
      roundUnits(
        Number(
          targetBalance.available_balance
        )
      );

    targetBalanceAfter =
      roundUnits(
        targetBalanceBefore +
        carriedUnits
      );

    await connection.query(
      `
        UPDATE employee_leave_balances

        SET
            carried_forward_units =
              carried_forward_units + ?,

            available_balance = ?,

            last_calculated_at =
              CURRENT_TIMESTAMP

        WHERE leave_balance_id = ?
          AND company_id = ?
      `,
      [
        carriedUnits,
        targetBalanceAfter,
        targetBalanceId,
        companyId
      ]
    );

    targetCarryTransactionId =
      await insertCarryForwardBalanceTransaction(
        connection,
        {
          leaveBalanceId:
            targetBalanceId,
          companyId,
          employeeId,
          leaveTypeId,
          leavePeriodId:
            targetPeriodId,
          transactionDate:
            input.processingDate,
          transactionType:
            "CARRY_FORWARD",
          unitsChanged:
            carriedUnits,
          balanceBefore:
            targetBalanceBefore,
          balanceAfter:
            targetBalanceAfter,
          referenceType:
            "LEAVE_CARRY_FORWARD_RUN",
          referenceId:
            carryForwardRunId,
          remarks:
            "Leave units carried forward from the previous leave period",
          createdByUserId:
            input.processedByUserId
        }
      );
  }

  const carryForwardRunDetailId =
    await upsertCarryForwardRunDetail(
      connection,
      {
        carryForwardRunId,
        companyId,
        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          refreshedCandidate.leave_policy_rule_id ===
            null
            ? null
            : String(
                refreshedCandidate
                  .leave_policy_rule_id
              ),

        sourceLeaveBalanceId:
          String(
            sourceBalance.leave_balance_id
          ),

        targetLeaveBalanceId:
          targetBalanceId,

        sourceAvailableBalance:
          sourceBalanceBefore,

        carryForwardLimitUnits:
          calculation.maximumCarryForwardUnits,

        eligibleUnits:
          calculation.eligibleUnits,

        carriedUnits,
        expiredUnitsAtClose:
          expiredUnits,

        targetBalanceBefore,
        targetBalanceAfter,

        carryForwardExpiryDate:
          calculation.expiryDate,

        carryTransactionId:
          targetCarryTransactionId,

        sourceExpiryTransactionId,
        detailStatus: "PROCESSED",
        skipReason: calculation.skipReason,
        errorCode: null,
        errorMessage: null
      }
    );

  if (
    carriedUnits > 0 &&
    targetBalanceId !== null
  ) {
    await createCarryForwardLotAndExpiry(
      connection,
      {
        companyId,
        carryForwardRunDetailId,
        employeeId,
        leaveTypeId,
        sourcePeriodId,
        targetPeriodId,
        sourceLeaveBalanceId:
          String(
            sourceBalance.leave_balance_id
          ),
        targetLeaveBalanceId:
          targetBalanceId,
        carriedUnits,
        expiryDate:
          calculation.expiryDate,
        carryTransactionId:
          targetCarryTransactionId
      }
    );
  }

  void sourceCarryTransactionId;

  return {
    detailStatus: "PROCESSED",
    eligibleUnits:
      calculation.eligibleUnits,
    carriedUnits,
    expiredUnits
  };
}

/*
 * =========================================================
 * Carry-forward run processing
 * =========================================================
 */

export async function processLeaveCarryForwardRunRecord(
  companyId: string,
  carryForwardRunId: string,
  options: ProcessLeaveCarryForwardRunOptions,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveCarryForwardRunProcessingResult
  | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const run =
      await lockCarryForwardRun(
        connection,
        companyId,
        carryForwardRunId
      );

    if (!run) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    if (run.run_status !== "DRAFT") {
      throw new Error(
        "ONLY_DRAFT_CARRY_FORWARD_RUN_CAN_BE_PROCESSED"
      );
    }

    const sourcePeriod =
      await lockLeavePeriod(
        connection,
        companyId,
        String(run.source_period_id)
      );

    const targetPeriod =
      await lockLeavePeriod(
        connection,
        companyId,
        String(run.target_period_id)
      );

    if (!sourcePeriod) {
      throw new Error(
        "SOURCE_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    if (!targetPeriod) {
      throw new Error(
        "TARGET_LEAVE_PERIOD_NOT_FOUND"
      );
    }

    const processingDate =
      dateOnly(run.processing_date);

    const targetStartDate =
      dateOnly(targetPeriod.start_date);

    if (
      !processingDate ||
      !targetStartDate
    ) {
      throw new Error(
        "INVALID_LEAVE_PERIOD_DATES"
      );
    }

    validatePeriodRelationship(
      sourcePeriod,
      targetPeriod,
      processingDate
    );

    await connection.query(
      `
        UPDATE leave_carry_forward_runs

        SET
            run_status = 'PROCESSING',
            started_by_user_id = ?,
            started_at = CURRENT_TIMESTAMP,
            completed_at = NULL,
            error_summary = NULL

        WHERE carry_forward_run_id = ?
          AND company_id = ?
          AND run_status = 'DRAFT'
      `,
      [
        options.processedByUserId,
        carryForwardRunId,
        companyId
      ]
    );

    const candidates =
      await findCarryForwardCandidates(
        connection,
        {
          companyId,
          sourcePeriodId:
            String(run.source_period_id),
          targetPeriodId:
            String(run.target_period_id),
          effectiveDate:
            targetStartDate
        }
      );

    let processedCount = 0;
    let successfulCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    let totalEligibleUnits = 0;
    let totalCarriedUnits = 0;
    let totalExpiredUnits = 0;

    const errors: string[] = [];

    for (
      let index = 0;
      index < candidates.length;
      index += 1
    ) {
      const candidate =
        candidates[index];

      if (!candidate) {
        continue;
      }

      const savepoint =
        `carry_candidate_${index}`;

      await connection.query(
        `SAVEPOINT ${savepoint}`
      );

      try {
        const result =
          await processSingleCarryForwardCandidate(
            connection,
            {
              run,
              candidate,
              targetPeriodStartDate:
                targetStartDate,
              processingDate,
              isDryRun:
                databaseBoolean(
                  run.is_dry_run
                ),
              processedByUserId:
                options.processedByUserId
            }
          );

        processedCount += 1;

        totalEligibleUnits =
          roundUnits(
            totalEligibleUnits +
            result.eligibleUnits
          );

        totalCarriedUnits =
          roundUnits(
            totalCarriedUnits +
            result.carriedUnits
          );

        totalExpiredUnits =
          roundUnits(
            totalExpiredUnits +
            result.expiredUnits
          );

        if (
          result.detailStatus ===
          "PROCESSED"
        ) {
          successfulCount += 1;
        } else {
          skippedCount += 1;
        }

        await connection.query(
          `RELEASE SAVEPOINT ${savepoint}`
        );
      } catch (candidateError) {
        await connection.query(
          `ROLLBACK TO SAVEPOINT ${savepoint}`
        );

        await connection.query(
          `RELEASE SAVEPOINT ${savepoint}`
        );

        processedCount += 1;
        failedCount += 1;

        const errorCode =
          candidateError instanceof Error
            ? candidateError.message
            : "UNKNOWN_CARRY_FORWARD_ERROR";

        const errorMessage =
          candidateError instanceof Error
            ? candidateError.message
            : String(candidateError);

        errors.push(
          `${candidate.employee_code}/${candidate.leave_type_code}: ${errorMessage}`
        );

        let failureCalculation:
          CarryForwardCalculation;

        try {
          failureCalculation =
            calculateCarryForward(
              candidate,
              targetStartDate
            );
        } catch {
          failureCalculation = {
            status: "SKIPPED",
            skipReason: null,
            sourceAvailableBalance:
              Number(
                candidate.source_available_balance
              ),
            maximumCarryForwardUnits: null,
            eligibleUnits: 0,
            carriedUnits: 0,
            expiredUnitsAtClose: 0,
            targetBalanceBefore:
              Number(
                candidate.target_available_balance ??
                0
              ),
            targetBalanceAfter:
              Number(
                candidate.target_available_balance ??
                0
              ),
            expiryDate: null
          };
        }

        await upsertCarryForwardRunDetail(
          connection,
          {
            carryForwardRunId,
            companyId,
            employeeId:
              String(candidate.employee_id),
            leaveTypeId:
              String(candidate.leave_type_id),
            leavePolicyRuleId:
              candidate.leave_policy_rule_id ===
                null
                ? null
                : String(
                    candidate.leave_policy_rule_id
                  ),
            sourceLeaveBalanceId:
              String(
                candidate.source_leave_balance_id
              ),
            targetLeaveBalanceId:
              candidate.target_leave_balance_id ===
                null
                ? null
                : String(
                    candidate.target_leave_balance_id
                  ),
            sourceAvailableBalance:
              failureCalculation
                .sourceAvailableBalance,
            carryForwardLimitUnits:
              failureCalculation
                .maximumCarryForwardUnits,
            eligibleUnits:
              failureCalculation.eligibleUnits,
            carriedUnits: 0,
            expiredUnitsAtClose: 0,
            targetBalanceBefore:
              failureCalculation
                .targetBalanceBefore,
            targetBalanceAfter:
              failureCalculation
                .targetBalanceBefore,
            carryForwardExpiryDate: null,
            carryTransactionId: null,
            sourceExpiryTransactionId: null,
            detailStatus: "FAILED",
            skipReason: null,
            errorCode,
            errorMessage
          }
        );

        if (!options.continueOnError) {
          break;
        }
      }
    }

    let finalStatus:
      | "COMPLETED"
      | "PARTIAL_FAILED"
      | "FAILED";

    if (failedCount === 0) {
      finalStatus = "COMPLETED";
    } else if (
      successfulCount > 0 ||
      skippedCount > 0
    ) {
      finalStatus = "PARTIAL_FAILED";
    } else {
      finalStatus = "FAILED";
    }

    await connection.query(
      `
        UPDATE leave_carry_forward_runs

        SET
            run_status = ?,
            total_candidates = ?,
            processed_count = ?,
            successful_count = ?,
            skipped_count = ?,
            failed_count = ?,
            total_eligible_units = ?,
            total_carried_units = ?,
            total_expired_units = ?,
            completed_at = CURRENT_TIMESTAMP,
            error_summary = ?

        WHERE carry_forward_run_id = ?
          AND company_id = ?
      `,
      [
        finalStatus,
        candidates.length,
        processedCount,
        successfulCount,
        skippedCount,
        failedCount,
        totalEligibleUnits,
        totalCarriedUnits,
        totalExpiredUnits,
        errors.length === 0
          ? null
          : errors
              .slice(0, 100)
              .join("\n"),
        carryForwardRunId,
        companyId
      ]
    );

    const processedRun =
      await selectCarryForwardRunUsingConnection(
        connection,
        companyId,
        carryForwardRunId
      );

    if (!processedRun) {
      throw new Error(
        "PROCESSED_CARRY_FORWARD_RUN_NOT_FOUND"
      );
    }

    const details =
      await selectCarryForwardDetailsUsingConnection(
        connection,
        carryForwardRunId
      );

    const lots =
      await selectCarryForwardLotsUsingConnection(
        connection,
        carryForwardRunId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,
        actionName:
          databaseBoolean(run.is_dry_run)
            ? "leave_carry_forward_dry_run_processed"
            : "leave_carry_forward_run_processed",
        tableName:
          "leave_carry_forward_runs",
        recordId:
          carryForwardRunId,
        oldValues: {
          runStatus: run.run_status
        },
        newValues: {
          runStatus:
            processedRun.run_status,
          totalCandidates:
            candidates.length,
          processedCount,
          successfulCount,
          skippedCount,
          failedCount,
          totalEligibleUnits,
          totalCarriedUnits,
          totalExpiredUnits
        },
        requestMethod: "POST",
        requestPath:
          `/api/v1/leave/carry-forward-runs/${carryForwardRunId}/process`,
        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      run: processedRun,
      details,
      lots
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
 * Carry-forward run cancellation
 * =========================================================
 */

export async function cancelLeaveCarryForwardRunRecord(
  companyId: string,
  carryForwardRunId: string,
  input: CancelLeaveCarryForwardRunInput,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveCarryForwardRunDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const run =
      await lockCarryForwardRun(
        connection,
        companyId,
        carryForwardRunId
      );

    if (!run) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    if (run.run_status !== "DRAFT") {
      throw new Error(
        "ONLY_DRAFT_CARRY_FORWARD_RUN_CAN_BE_CANCELLED"
      );
    }

    await connection.query(
      `
        UPDATE leave_carry_forward_runs

        SET
            run_status = 'CANCELLED',
            cancelled_by_user_id = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancellation_reason = ?,
            completed_at = CURRENT_TIMESTAMP

        WHERE carry_forward_run_id = ?
          AND company_id = ?
          AND run_status = 'DRAFT'
      `,
      [
        input.cancelledByUserId,
        input.reason,
        carryForwardRunId,
        companyId
      ]
    );

    const cancelled =
      await selectCarryForwardRunUsingConnection(
        connection,
        companyId,
        carryForwardRunId
      );

    if (!cancelled) {
      throw new Error(
        "CANCELLED_CARRY_FORWARD_RUN_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,
        actionName:
          "leave_carry_forward_run_cancelled",
        tableName:
          "leave_carry_forward_runs",
        recordId:
          carryForwardRunId,
        oldValues: {
          runStatus: run.run_status
        },
        newValues: {
          runStatus:
            cancelled.run_status,
          cancellationReason:
            input.reason
        },
        requestMethod: "POST",
        requestPath:
          `/api/v1/leave/carry-forward-runs/${carryForwardRunId}/cancel`,
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
 * Expiry listing and locking
 * =========================================================
 */

export async function listLeaveBalanceExpiryRecords(
  companyId: string,
  filters: LeaveBalanceExpiryListFilters
): Promise<
  PaginatedCarryForwardResult<
    LeaveBalanceExpiryDatabaseRow
  >
> {
  const conditions: string[] = [
    "expiry.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "expiry.employee_id = ?"
    );
    parameters.push(
      filters.employeeId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "expiry.leave_type_id = ?"
    );
    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "expiry.leave_period_id = ?"
    );
    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.expiryStatus) {
    conditions.push(
      "expiry.expiry_status = ?"
    );
    parameters.push(
      filters.expiryStatus
    );
  }

  if (filters.expiryDateFrom) {
    conditions.push(
      "expiry.expiry_date >= ?"
    );
    parameters.push(
      filters.expiryDateFrom
    );
  }

  if (filters.expiryDateTo) {
    conditions.push(
      "expiry.expiry_date <= ?"
    );
    parameters.push(
      filters.expiryDateTo
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_balance_expiries expiry

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
        ${expirySelect}

        WHERE ${whereClause}

        ORDER BY
            expiry.expiry_date ASC,
            expiry.leave_balance_expiry_id ASC

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
      rows as unknown as
        LeaveBalanceExpiryDatabaseRow[],
    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

async function lockExpiryProcessingRecord(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceExpiryId: string
): Promise<LockedExpiryProcessingRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            expiry.leave_balance_expiry_id,
            expiry.company_id,
            expiry.carry_forward_lot_id,
            expiry.employee_id,
            expiry.leave_type_id,
            expiry.leave_period_id,
            expiry.leave_balance_id,
            expiry.expiry_date,
            expiry.scheduled_units,
            expiry.expired_units,
            expiry.expiry_status,

            lot.lot_status,
            lot.remaining_units
                AS lot_remaining_units,
            lot.expired_units
                AS lot_expired_units,

            balance.pending_units
                AS balance_pending_units,
            balance.available_balance
                AS balance_available_balance

        FROM leave_balance_expiries expiry

        INNER JOIN leave_carry_forward_lots lot
            ON lot.carry_forward_lot_id =
               expiry.carry_forward_lot_id

        INNER JOIN employee_leave_balances balance
            ON balance.leave_balance_id =
               expiry.leave_balance_id

        WHERE expiry.leave_balance_expiry_id = ?
          AND expiry.company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveBalanceExpiryId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedExpiryProcessingRow
      | undefined
  ) ?? null;
}

async function selectExpiryUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceExpiryId: string
): Promise<LeaveBalanceExpiryDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${expirySelect}

        WHERE expiry.leave_balance_expiry_id = ?
          AND expiry.company_id = ?

        LIMIT 1
      `,
      [
        leaveBalanceExpiryId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveBalanceExpiryDatabaseRow
      | undefined
  ) ?? null;
}

async function markExpiryFailure(
  connection: PoolConnection,
  companyId: string,
  leaveBalanceExpiryId: string,
  processedByUserId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await connection.query(
    `
      UPDATE leave_balance_expiries

      SET
          expiry_status = 'FAILED',
          processed_by_user_id = ?,
          processed_at = CURRENT_TIMESTAMP,
          error_code = ?,
          error_message = ?

      WHERE leave_balance_expiry_id = ?
        AND company_id = ?
    `,
    [
      processedByUserId,
      errorCode,
      errorMessage,
      leaveBalanceExpiryId,
      companyId
    ]
  );
}

/*
 * =========================================================
 * Expiry processing
 * =========================================================
 */

export async function processLeaveBalanceExpiryRecords(
  options: ProcessLeaveBalanceExpiryOptions,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveBalanceExpiryProcessingResult> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const period =
      await lockLeavePeriod(
        connection,
        options.companyId,
        options.leavePeriodId
      );

    if (!period) {
      throw new Error(
        "LEAVE_PERIOD_NOT_FOUND"
      );
    }

    const conditions: string[] = [
      "company_id = ?",
      "leave_period_id = ?",
      "expiry_date <= ?",
      "expiry_status IN ('PENDING', 'FAILED')"
    ];

    const parameters: unknown[] = [
      options.companyId,
      options.leavePeriodId,
      options.processingDate
    ];

    if (options.employeeId !== undefined) {
      conditions.push(
        "employee_id = ?"
      );
      parameters.push(
        options.employeeId
      );
    }

    if (options.leaveTypeId !== undefined) {
      conditions.push(
        "leave_type_id = ?"
      );
      parameters.push(
        options.leaveTypeId
      );
    }

    const candidateRows =
      await connection.query(
        `
          SELECT leave_balance_expiry_id

          FROM leave_balance_expiries

          WHERE ${conditions.join(" AND ")}

          ORDER BY
              expiry_date ASC,
              leave_balance_expiry_id ASC

          FOR UPDATE
        `,
        parameters
      );

    const candidateIds =
      (
        candidateRows as unknown as
          Array<{
            leave_balance_expiry_id:
              | string
              | number
              | bigint;
          }>
      ).map(
        row =>
          String(
            row.leave_balance_expiry_id
          )
      );

    let completedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let totalExpiredUnits = 0;

    const expiries:
      LeaveBalanceExpiryDatabaseRow[] =
        [];

    for (
      let index = 0;
      index < candidateIds.length;
      index += 1
    ) {
      const leaveBalanceExpiryId =
        candidateIds[index];

      if (!leaveBalanceExpiryId) {
        continue;
      }

      const savepoint =
        `expiry_candidate_${index}`;

      await connection.query(
        `SAVEPOINT ${savepoint}`
      );

      try {
        const expiry =
          await lockExpiryProcessingRecord(
            connection,
            options.companyId,
            leaveBalanceExpiryId
          );

        if (!expiry) {
          throw new Error(
            "LEAVE_BALANCE_EXPIRY_NOT_FOUND"
          );
        }

        const expiryDate =
          dateOnly(expiry.expiry_date);

        if (
          !expiryDate ||
          expiryDate >
            options.processingDate
        ) {
          throw new Error(
            "LEAVE_BALANCE_EXPIRY_NOT_DUE"
          );
        }

        const remainingUnits =
          roundUnits(
            Number(
              expiry.lot_remaining_units
            )
          );

        if (
          expiry.lot_status !==
            "ACTIVE" ||
          remainingUnits <= 0
        ) {
          if (!options.dryRun) {
            await connection.query(
              `
                UPDATE leave_balance_expiries

                SET
                    expiry_status = 'SKIPPED',
                    expired_units = 0,
                    processed_by_user_id = ?,
                    processed_at = CURRENT_TIMESTAMP,
                    error_code =
                      'CARRY_FORWARD_LOT_NOT_ACTIVE',
                    error_message =
                      'The carry-forward lot has already been exhausted, expired, or cancelled'

                WHERE leave_balance_expiry_id = ?
                  AND company_id = ?
              `,
              [
                options.processedByUserId,
                leaveBalanceExpiryId,
                options.companyId
              ]
            );
          }

          const selected =
            await selectExpiryUsingConnection(
              connection,
              options.companyId,
              leaveBalanceExpiryId
            );

          if (selected) {
            expiries.push(selected);
          }

          skippedCount += 1;

          await connection.query(
            `RELEASE SAVEPOINT ${savepoint}`
          );

          continue;
        }

        if (
          Number(
            expiry.balance_pending_units
          ) > 0.005
        ) {
          throw new Error(
            "LEAVE_BALANCE_HAS_PENDING_RESERVATIONS"
          );
        }

        const balanceBefore =
          roundUnits(
            Number(
              expiry.balance_available_balance
            )
          );

        if (
          balanceBefore + 0.005 <
          remainingUnits
        ) {
          throw new Error(
            "CARRY_FORWARD_LOT_BALANCE_INCONSISTENT"
          );
        }

        const balanceAfter =
          roundUnits(
            balanceBefore -
            remainingUnits
          );

        if (options.dryRun) {
          const selected =
            await selectExpiryUsingConnection(
              connection,
              options.companyId,
              leaveBalanceExpiryId
            );

          if (selected) {
            expiries.push({
              ...selected,
              expired_units:
                remainingUnits,
              expiry_status:
                "COMPLETED",
              processed_by_user_id:
                options.processedByUserId,
              processed_at:
                new Date().toISOString(),
              error_code: null,
              error_message: null
            });
          }

          completedCount += 1;
          totalExpiredUnits =
            roundUnits(
              totalExpiredUnits +
              remainingUnits
            );

          await connection.query(
            `RELEASE SAVEPOINT ${savepoint}`
          );

          continue;
        }

        await connection.query(
          `
            UPDATE employee_leave_balances

            SET
                expired_units =
                  expired_units + ?,

                available_balance = ?,

                last_calculated_at =
                  CURRENT_TIMESTAMP

            WHERE leave_balance_id = ?
              AND company_id = ?
          `,
          [
            remainingUnits,
            balanceAfter,
            String(expiry.leave_balance_id),
            options.companyId
          ]
        );

        const transactionId =
          await insertCarryForwardBalanceTransaction(
            connection,
            {
              leaveBalanceId:
                String(expiry.leave_balance_id),
              companyId:
                options.companyId,
              employeeId:
                String(expiry.employee_id),
              leaveTypeId:
                String(expiry.leave_type_id),
              leavePeriodId:
                String(expiry.leave_period_id),
              transactionDate:
                options.processingDate,
              transactionType:
                "EXPIRY",
              unitsChanged:
                -remainingUnits,
              balanceBefore,
              balanceAfter,
              referenceType:
                "CARRY_FORWARD_LOT",
              referenceId:
                String(
                  expiry.carry_forward_lot_id
                ),
              remarks:
                "Unused carried-forward leave units expired",
              createdByUserId:
                options.processedByUserId
            }
          );

        await connection.query(
          `
            UPDATE leave_carry_forward_lots

            SET
                remaining_units = 0,
                expired_units =
                  expired_units + ?,
                lot_status = 'EXPIRED',
                expiry_transaction_id = ?,
                expired_at = CURRENT_TIMESTAMP

            WHERE carry_forward_lot_id = ?
              AND company_id = ?
              AND lot_status = 'ACTIVE'
          `,
          [
            remainingUnits,
            transactionId,
            String(
              expiry.carry_forward_lot_id
            ),
            options.companyId
          ]
        );

        await connection.query(
          `
            UPDATE leave_balance_expiries

            SET
                expired_units = ?,
                expiry_status = 'COMPLETED',
                transaction_id = ?,
                processed_by_user_id = ?,
                processed_at = CURRENT_TIMESTAMP,
                error_code = NULL,
                error_message = NULL

            WHERE leave_balance_expiry_id = ?
              AND company_id = ?
          `,
          [
            remainingUnits,
            transactionId,
            options.processedByUserId,
            leaveBalanceExpiryId,
            options.companyId
          ]
        );

        const selected =
          await selectExpiryUsingConnection(
            connection,
            options.companyId,
            leaveBalanceExpiryId
          );

        if (!selected) {
          throw new Error(
            "PROCESSED_LEAVE_BALANCE_EXPIRY_NOT_FOUND"
          );
        }

        expiries.push(selected);
        completedCount += 1;
        totalExpiredUnits =
          roundUnits(
            totalExpiredUnits +
            remainingUnits
          );

        await connection.query(
          `RELEASE SAVEPOINT ${savepoint}`
        );
      } catch (expiryError) {
        await connection.query(
          `ROLLBACK TO SAVEPOINT ${savepoint}`
        );

        await connection.query(
          `RELEASE SAVEPOINT ${savepoint}`
        );

        failedCount += 1;

        const errorCode =
          expiryError instanceof Error
            ? expiryError.message
            : "UNKNOWN_LEAVE_EXPIRY_ERROR";

        const errorMessage =
          expiryError instanceof Error
            ? expiryError.message
            : String(expiryError);

        if (!options.dryRun) {
          await markExpiryFailure(
            connection,
            options.companyId,
            leaveBalanceExpiryId,
            options.processedByUserId,
            errorCode,
            errorMessage
          );

          const selected =
            await selectExpiryUsingConnection(
              connection,
              options.companyId,
              leaveBalanceExpiryId
            );

          if (selected) {
            expiries.push(selected);
          }
        }

        if (!options.continueOnError) {
          break;
        }
      }
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          options.companyId,
        actor,
        actionName:
          options.dryRun
            ? "leave_balance_expiry_dry_run_processed"
            : "leave_balance_expiry_processed",
        tableName:
          "leave_balance_expiries",
        recordId:
          options.leavePeriodId,
        newValues: {
          leavePeriodId:
            options.leavePeriodId,
          processingDate:
            options.processingDate,
          totalCandidates:
            candidateIds.length,
          completedCount,
          skippedCount,
          failedCount,
          totalExpiredUnits,
          dryRun:
            options.dryRun
        },
        requestMethod: "POST",
        requestPath:
          `/api/v1/leave/periods/${options.leavePeriodId}/expire-balances`,
        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return {
      companyId:
        options.companyId,
      leavePeriodId:
        options.leavePeriodId,
      processingDate:
        options.processingDate,
      totalCandidates:
        candidateIds.length,
      completedCount,
      skippedCount,
      failedCount,
      totalExpiredUnits,
      expiries
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

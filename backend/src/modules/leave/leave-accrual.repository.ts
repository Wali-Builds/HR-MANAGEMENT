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
  CreateLeaveAccrualRunRecord as CreateLeaveAccrualRunRecordInput,
  LeaveAccrualCandidateDatabaseRow,
  LeaveAccrualPreviewItem,
  LeaveAccrualPreviewResponse,
  LeaveAccrualRunDatabaseRow,
  LeaveAccrualRunDetailDatabaseRow,
  LeaveAccrualRunProcessingResult
} from "./leave-accrual.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedLeaveAccrualResult<T> {
  records: T[];
  totalRecords: number;
}

export interface LeaveAccrualRunListFilters {
  leavePeriodId?: string;
  runStatus?: string;
  runType?: string;
  accrualMethod?: string;
  isDryRun?: boolean;

  postingDateFrom?: string;
  postingDateTo?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface LeaveAccrualRunDetailListFilters {
  employeeId?: string;
  leaveTypeId?: string;
  detailStatus?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface LeaveAccrualPreviewFilters {
  companyId: string;
  leavePeriodId: string;

  accrualMethod: string;

  accrualFromDate: string;
  accrualToDate: string;
  postingDate: string;

  employeeId?: string;
  leaveTypeId?: string;
}

export interface ProcessLeaveAccrualRunOptions {
  continueOnError: boolean;
  rebuildPendingDetails: boolean;

  processedByUserId: string;
}

export interface CancelLeaveAccrualRunInput {
  reason: string;
  cancelledByUserId: string;
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
}

interface LockedLeaveAccrualRunRow {
  accrual_run_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  leave_period_id:
    | string
    | number
    | bigint;

  run_number: string;
  idempotency_key: string;
  run_name: string;

  run_type: string;
  accrual_method: string;

  accrual_from_date:
    | Date
    | string;

  accrual_to_date:
    | Date
    | string;

  posting_date:
    | Date
    | string;

  run_status: string;

  is_dry_run:
    | number
    | boolean;

  total_candidates:
    | string
    | number
    | bigint;

  processed_count:
    | string
    | number
    | bigint;

  successful_count:
    | string
    | number
    | bigint;

  skipped_count:
    | string
    | number
    | bigint;

  failed_count:
    | string
    | number
    | bigint;

  total_calculated_units:
    | string
    | number;

  total_applied_units:
    | string
    | number;

  started_by_user_id:
    | string
    | number
    | bigint
    | null;

  started_at:
    | Date
    | string
    | null;

  completed_at:
    | Date
    | string
    | null;

  cancelled_by_user_id:
    | string
    | number
    | bigint
    | null;

  cancelled_at:
    | Date
    | string
    | null;

  cancellation_reason:
    | string
    | null;

  error_summary:
    | string
    | null;

  created_by_user_id:
    | string
    | number
    | bigint
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
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

interface AccrualCalculationResult {
  status:
    | "ELIGIBLE"
    | "SKIPPED";

  skipReason:
    | string
    | null;

  annualEntitlementUnits: number;
  accrualRateUnits: number;

  prorationFactor: number;

  calculatedUnits: number;
  appliedUnits: number;

  balanceBefore: number;
  balanceAfter: number;
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

function roundFactor(
  value: number
): number {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) * 1_000_000
    ) / 1_000_000
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

function currentDateOnly(): string {
  return new Date()
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

function differenceInDaysInclusive(
  startDate: string,
  endDate: string
): number {
  const start =
    parseDateOnlyUtc(
      startDate
    ).getTime();

  const end =
    parseDateOnlyUtc(
      endDate
    ).getTime();

  return (
    Math.floor(
      (
        end -
        start
      ) / 86_400_000
    ) + 1
  );
}

function maximumDate(
  values: string[]
): string {
  return values.reduce(
    (
      maximum,
      current
    ) =>
      current >
      maximum
        ? current
        : maximum
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

function generateRunNumber(): string {
  const datePart =
    currentDateOnly()
      .replace(
        /-/g,
        ""
      );

  const randomPart =
    randomBytes(6)
      .toString("hex")
      .toUpperCase();

  return (
    `LAR-${datePart}-${randomPart}`
  );
}

function accrualMethodDivisor(
  method: string
): number {
  switch (method) {
    case "MONTHLY":
      return 12;

    case "QUARTERLY":
      return 4;

    case "SEMI_ANNUAL":
      return 2;

    case "ANNUAL":
      return 1;

    default:
      throw new Error(
        "UNSUPPORTED_LEAVE_ACCRUAL_METHOD"
      );
  }
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

      input.oldValues ===
      undefined
        ? null
        : safeJson(
            input.oldValues
          ),

      input.newValues ===
      undefined
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
 * Shared SELECT statements
 * =========================================================
 */

const leaveAccrualRunSelect = `
  SELECT
      lar.accrual_run_id,
      lar.company_id,
      lar.leave_period_id,

      lp.period_code,
      lp.period_name,

      lp.start_date
          AS period_start_date,

      lp.end_date
          AS period_end_date,

      lp.period_status,

      lar.run_number,
      lar.idempotency_key,
      lar.run_name,
      lar.run_type,
      lar.accrual_method,
      lar.accrual_from_date,
      lar.accrual_to_date,
      lar.posting_date,
      lar.run_status,
      lar.is_dry_run,

      lar.total_candidates,
      lar.processed_count,
      lar.successful_count,
      lar.skipped_count,
      lar.failed_count,

      lar.total_calculated_units,
      lar.total_applied_units,

      lar.started_by_user_id,

      started_user.username
          AS started_by_username,

      lar.started_at,
      lar.completed_at,

      lar.cancelled_by_user_id,

      cancelled_user.username
          AS cancelled_by_username,

      lar.cancelled_at,
      lar.cancellation_reason,
      lar.error_summary,

      lar.created_by_user_id,

      created_user.username
          AS created_by_username,

      (
        SELECT COUNT(*)

        FROM leave_accrual_run_details detail_count

        WHERE detail_count.accrual_run_id =
              lar.accrual_run_id
      ) AS detail_count,

      lar.created_at,
      lar.updated_at

  FROM leave_accrual_runs lar

  INNER JOIN leave_periods lp
      ON lp.leave_period_id =
         lar.leave_period_id

  LEFT JOIN users started_user
      ON started_user.user_id =
         lar.started_by_user_id

  LEFT JOIN users cancelled_user
      ON cancelled_user.user_id =
         lar.cancelled_by_user_id

  LEFT JOIN users created_user
      ON created_user.user_id =
         lar.created_by_user_id
`;

const leaveAccrualDetailSelect = `
  SELECT
      lard.accrual_run_detail_id,
      lard.accrual_run_id,
      lard.company_id,

      lard.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      lard.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,

      lt.unit_type
          AS leave_type_unit_type,

      lard.leave_policy_rule_id,
      lard.leave_balance_id,

      lard.accrual_from_date,
      lard.accrual_to_date,

      lard.annual_entitlement_units,
      lard.accrual_rate_units,
      lard.proration_factor,

      lard.calculated_units,
      lard.applied_units,

      lard.balance_before,
      lard.balance_after,

      lard.detail_status,
      lard.skip_reason,
      lard.error_code,
      lard.error_message,

      lard.transaction_id,
      lard.processed_at,

      lard.created_at,
      lard.updated_at

  FROM leave_accrual_run_details lard

  INNER JOIN employees e
      ON e.employee_id =
         lard.employee_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         lard.leave_type_id
`;

/*
 * =========================================================
 * Period locking and validation
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
            period_status,
            closed_by_user_id,
            closed_at

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

function validateAccrualPeriodRange(
  period: LockedLeavePeriodRow,
  input: {
    accrualFromDate: string;
    accrualToDate: string;
    postingDate: string;
  }
): void {
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
      "INVALID_LEAVE_PERIOD_DATES"
    );
  }

  if (
    input.accrualToDate <
    input.accrualFromDate
  ) {
    throw new Error(
      "INVALID_LEAVE_ACCRUAL_DATES"
    );
  }

  if (
    input.accrualFromDate <
      periodStartDate ||
    input.accrualToDate >
      periodEndDate
  ) {
    throw new Error(
      "LEAVE_ACCRUAL_RANGE_OUTSIDE_PERIOD"
    );
  }

  if (
    input.postingDate <
      periodStartDate ||
    input.postingDate >
      periodEndDate
  ) {
    throw new Error(
      "LEAVE_ACCRUAL_POSTING_DATE_OUTSIDE_PERIOD"
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
}

/*
 * =========================================================
 * Run locking and selection
 * =========================================================
 */

async function lockLeaveAccrualRun(
  connection: PoolConnection,
  companyId: string,
  accrualRunId: string
): Promise<LockedLeaveAccrualRunRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            accrual_run_id,
            company_id,
            leave_period_id,
            run_number,
            idempotency_key,
            run_name,
            run_type,
            accrual_method,
            accrual_from_date,
            accrual_to_date,
            posting_date,
            run_status,
            is_dry_run,
            total_candidates,
            processed_count,
            successful_count,
            skipped_count,
            failed_count,
            total_calculated_units,
            total_applied_units,
            started_by_user_id,
            started_at,
            completed_at,
            cancelled_by_user_id,
            cancelled_at,
            cancellation_reason,
            error_summary,
            created_by_user_id,
            created_at,
            updated_at

        FROM leave_accrual_runs

        WHERE accrual_run_id = ?
          AND company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        accrualRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveAccrualRunRow
      | undefined
  ) ?? null;
}

async function selectLeaveAccrualRunUsingConnection(
  connection: PoolConnection,
  companyId: string,
  accrualRunId: string
): Promise<LeaveAccrualRunDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leaveAccrualRunSelect}

        WHERE lar.accrual_run_id = ?
          AND lar.company_id = ?

        LIMIT 1
      `,
      [
        accrualRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveAccrualRunDatabaseRow
      | undefined
  ) ?? null;
}

async function selectLeaveAccrualDetailsUsingConnection(
  connection: PoolConnection,
  accrualRunId: string
): Promise<LeaveAccrualRunDetailDatabaseRow[]> {
  const rows =
    await connection.query(
      `
        ${leaveAccrualDetailSelect}

        WHERE lard.accrual_run_id = ?

        ORDER BY
            e.employee_code ASC,
            lt.leave_type_code ASC,
            lard.accrual_run_detail_id ASC
      `,
      [
        accrualRunId
      ]
    );

  return (
    rows as unknown as
      LeaveAccrualRunDetailDatabaseRow[]
  );
}

/*
 * =========================================================
 * Candidate resolution
 * =========================================================
 */

async function findLeaveAccrualCandidates(
  connection: PoolConnection,
  input: {
    companyId: string;
    leavePeriodId: string;

    accrualMethod: string;
    effectiveDate: string;

    employeeId?: string;
    leaveTypeId?: string;
  }
): Promise<LeaveAccrualCandidateDatabaseRow[]> {
  const conditions: string[] = [
    "effective_policy.leave_policy_id IS NOT NULL",
    "lpr.accrual_method = ?",
    "lpr.accrual_method <> 'MANUAL'",
    "lpr.is_active = 1",
    "lt.is_active = 1",
    "lt.deleted_at IS NULL"
  ];

  const trailingParameters: unknown[] = [
    input.accrualMethod
  ];

  if (
    input.employeeId !==
    undefined
  ) {
    conditions.push(
      "e.employee_id = ?"
    );

    trailingParameters.push(
      input.employeeId
    );
  }

  if (
    input.leaveTypeId !==
    undefined
  ) {
    conditions.push(
      "lpr.leave_type_id = ?"
    );

    trailingParameters.push(
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

                  INNER JOIN leave_policies assigned_policy
                      ON assigned_policy.leave_policy_id =
                         assignment.leave_policy_id

                  WHERE assignment.employee_id =
                        employee.employee_id

                    AND assignment.effective_from <= ?

                    AND (
                      assignment.effective_to IS NULL
                      OR assignment.effective_to >= ?
                    )

                    AND assigned_policy.company_id =
                        employee.company_id

                    AND assigned_policy.is_active = 1
                    AND assigned_policy.deleted_at IS NULL

                    AND (
                      assigned_policy.effective_from IS NULL
                      OR assigned_policy.effective_from <= ?
                    )

                    AND (
                      assigned_policy.effective_to IS NULL
                      OR assigned_policy.effective_to >= ?
                    )

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

                    AND (
                      default_policy.effective_from IS NULL
                      OR default_policy.effective_from <= ?
                    )

                    AND (
                      default_policy.effective_to IS NULL
                      OR default_policy.effective_to >= ?
                    )

                  ORDER BY
                      default_policy.effective_from DESC,
                      default_policy.leave_policy_id DESC

                  LIMIT 1
                )
              ) AS leave_policy_id

          FROM employees employee

          WHERE employee.company_id = ?
            AND employee.is_active = 1
            AND employee.deleted_at IS NULL
        )

        SELECT
            e.employee_id,
            e.company_id,
            e.employee_code,

            TRIM(
              CONCAT_WS(
                ' ',
                e.first_name,
                e.middle_name,
                e.last_name
              )
            ) AS employee_name,

            e.joining_date,
            e.probation_end_date,
            e.confirmation_date,
            e.gender,
            e.is_active,

            effective_policy.leave_policy_id,
            lpr.leave_policy_rule_id,
            lpr.leave_type_id,

            lt.leave_type_code,
            lt.leave_type_name,

            lt.unit_type
                AS leave_type_unit_type,

            lpr.annual_entitlement_units,
            lpr.accrual_method,
            lpr.accrual_units_per_period,
            lpr.accrual_start_after_days,
            lpr.prorate_entitlement,
            lpr.allow_during_probation,
            lpr.eligible_gender,
            lpr.maximum_balance_units,

            balance.leave_balance_id,
            balance.opening_balance,
            balance.accrued_units,
            balance.carried_forward_units,
            balance.adjusted_units,
            balance.used_units,
            balance.pending_units,
            balance.encashed_units,
            balance.expired_units,
            balance.available_balance,
            balance.last_accrual_date

        FROM effective_policy

        INNER JOIN employees e
            ON e.employee_id =
               effective_policy.employee_id

        INNER JOIN leave_policy_rules lpr
            ON lpr.leave_policy_id =
               effective_policy.leave_policy_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               lpr.leave_type_id

        LEFT JOIN employee_leave_balances balance
            ON balance.company_id =
               e.company_id

           AND balance.employee_id =
               e.employee_id

           AND balance.leave_type_id =
               lpr.leave_type_id

           AND balance.leave_period_id = ?

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
            e.employee_code ASC,
            lt.leave_type_code ASC
      `,
      [
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate,
        input.companyId,
        input.leavePeriodId,
        ...trailingParameters
      ]
    );

  return (
    rows as unknown as
      LeaveAccrualCandidateDatabaseRow[]
  );
}

/*
 * =========================================================
 * Accrual calculation
 * =========================================================
 */

function calculateAccrualCandidate(
  candidate:
    LeaveAccrualCandidateDatabaseRow,
  input: {
    accrualMethod: string;
    accrualFromDate: string;
    accrualToDate: string;
  }
): AccrualCalculationResult {
  const annualEntitlementUnits =
    Number(
      candidate
        .annual_entitlement_units
    );

  const configuredRate =
    Number(
      candidate
        .accrual_units_per_period
    );

  const divisor =
    accrualMethodDivisor(
      input.accrualMethod
    );

  const accrualRateUnits =
    roundUnits(
      configuredRate > 0
        ? configuredRate
        : annualEntitlementUnits /
          divisor
    );

  const balanceBefore =
    Number(
      candidate.available_balance ??
      0
    );

  const employeeGender =
    candidate.gender
      ?.trim()
      .toUpperCase() ??
    "";

  const eligibleGender =
    candidate.eligible_gender
      .trim()
      .toUpperCase();

  if (
    eligibleGender !== "ALL" &&
    eligibleGender !==
      employeeGender
  ) {
    return {
      status: "SKIPPED",
      skipReason:
        "EMPLOYEE_GENDER_NOT_ELIGIBLE",

      annualEntitlementUnits,
      accrualRateUnits,
      prorationFactor: 0,
      calculatedUnits: 0,
      appliedUnits: 0,
      balanceBefore,
      balanceAfter:
        balanceBefore
    };
  }

  const joiningDate =
    databaseDateOnly(
      candidate.joining_date
    );

  if (!joiningDate) {
    return {
      status: "SKIPPED",
      skipReason:
        "EMPLOYEE_JOINING_DATE_NOT_AVAILABLE",

      annualEntitlementUnits,
      accrualRateUnits,
      prorationFactor: 0,
      calculatedUnits: 0,
      appliedUnits: 0,
      balanceBefore,
      balanceAfter:
        balanceBefore
    };
  }

  const eligibilityDates: string[] = [
    input.accrualFromDate,

    addDays(
      joiningDate,
      Number(
        candidate
          .accrual_start_after_days
      )
    )
  ];

  if (
    !databaseBoolean(
      candidate.allow_during_probation
    )
  ) {
    const probationEndDate =
      databaseDateOnly(
        candidate.probation_end_date
      );

    if (probationEndDate) {
      eligibilityDates.push(
        addDays(
          probationEndDate,
          1
        )
      );
    }
  }

  const eligibilityStartDate =
    maximumDate(
      eligibilityDates
    );

  if (
    eligibilityStartDate >
    input.accrualToDate
  ) {
    return {
      status: "SKIPPED",
      skipReason:
        "EMPLOYEE_NOT_YET_ELIGIBLE",

      annualEntitlementUnits,
      accrualRateUnits,
      prorationFactor: 0,
      calculatedUnits: 0,
      appliedUnits: 0,
      balanceBefore,
      balanceAfter:
        balanceBefore
    };
  }

  const lastAccrualDate =
    databaseDateOnly(
      candidate.last_accrual_date
    );

  if (
    lastAccrualDate !== null &&
    lastAccrualDate >=
      input.accrualToDate
  ) {
    return {
      status: "SKIPPED",
      skipReason:
        "ACCRUAL_PERIOD_ALREADY_POSTED",

      annualEntitlementUnits,
      accrualRateUnits,
      prorationFactor: 0,
      calculatedUnits: 0,
      appliedUnits: 0,
      balanceBefore,
      balanceAfter:
        balanceBefore
    };
  }

  const totalPeriodDays =
    differenceInDaysInclusive(
      input.accrualFromDate,
      input.accrualToDate
    );

  const eligibleDays =
    differenceInDaysInclusive(
      eligibilityStartDate,
      input.accrualToDate
    );

  const prorationFactor =
    databaseBoolean(
      candidate.prorate_entitlement
    )
      ? roundFactor(
          Math.min(
            1,
            eligibleDays /
              totalPeriodDays
          )
        )
      : 1;

  const calculatedUnits =
    roundUnits(
      accrualRateUnits *
      prorationFactor
    );

  if (
    calculatedUnits <= 0
  ) {
    return {
      status: "SKIPPED",
      skipReason:
        "CALCULATED_ACCRUAL_IS_ZERO",

      annualEntitlementUnits,
      accrualRateUnits,
      prorationFactor,
      calculatedUnits: 0,
      appliedUnits: 0,
      balanceBefore,
      balanceAfter:
        balanceBefore
    };
  }

  const maximumBalanceUnits =
    candidate.maximum_balance_units ===
      null
      ? null
      : Number(
          candidate.maximum_balance_units
        );

  let appliedUnits =
    calculatedUnits;

  if (
    maximumBalanceUnits !==
    null
  ) {
    const availableCapacity =
      roundUnits(
        maximumBalanceUnits -
        balanceBefore
      );

    if (
      availableCapacity <= 0
    ) {
      return {
        status: "SKIPPED",
        skipReason:
          "MAXIMUM_LEAVE_BALANCE_REACHED",

        annualEntitlementUnits,
        accrualRateUnits,
        prorationFactor,
        calculatedUnits,
        appliedUnits: 0,
        balanceBefore,
        balanceAfter:
          balanceBefore
      };
    }

    appliedUnits =
      roundUnits(
        Math.min(
          calculatedUnits,
          availableCapacity
        )
      );
  }

  return {
    status: "ELIGIBLE",
    skipReason: null,

    annualEntitlementUnits,
    accrualRateUnits,
    prorationFactor,
    calculatedUnits,
    appliedUnits,

    balanceBefore,

    balanceAfter:
      roundUnits(
        balanceBefore +
        appliedUnits
      )
  };
}

/*
 * =========================================================
 * Balance creation and locking
 * =========================================================
 */

async function ensureLeaveBalance(
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

async function lockLeaveBalance(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;
  }
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
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId
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
 * Balance transaction
 * =========================================================
 */

async function insertAccrualBalanceTransaction(
  connection: PoolConnection,
  input: {
    leaveBalanceId: string;

    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    transactionDate: string;

    unitsChanged: number;
    balanceBefore: number;
    balanceAfter: number;

    accrualRunId: string;
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
            'ACCRUAL',
            ?,
            ?,
            ?,
            'LEAVE_ACCRUAL_RUN',
            ?,
            'Automated leave accrual posting',
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
        input.unitsChanged,
        input.balanceBefore,
        input.balanceAfter,
        input.accrualRunId,
        input.createdByUserId
      ]
    ) as unknown as InsertResult;

  return String(
    result.insertId
  );
}

/*
 * =========================================================
 * Detail persistence
 * =========================================================
 */

async function upsertAccrualRunDetail(
  connection: PoolConnection,
  input: {
    accrualRunId: string;
    companyId: string;

    employeeId: string;
    leaveTypeId: string;

    leavePolicyRuleId:
      string
      | null;

    leaveBalanceId:
      string
      | null;

    accrualFromDate: string;
    accrualToDate: string;

    annualEntitlementUnits:
      number
      | null;

    accrualRateUnits:
      number
      | null;

    prorationFactor: number;

    calculatedUnits: number;
    appliedUnits: number;

    balanceBefore:
      number
      | null;

    balanceAfter:
      number
      | null;

    detailStatus: string;

    skipReason:
      string
      | null;

    errorCode:
      string
      | null;

    errorMessage:
      string
      | null;

    transactionId:
      string
      | null;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO leave_accrual_run_details (
          accrual_run_id,
          company_id,
          employee_id,
          leave_type_id,
          leave_policy_rule_id,
          leave_balance_id,
          accrual_from_date,
          accrual_to_date,
          annual_entitlement_units,
          accrual_rate_units,
          proration_factor,
          calculated_units,
          applied_units,
          balance_before,
          balance_after,
          detail_status,
          skip_reason,
          error_code,
          error_message,
          transaction_id,
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
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP
      )

      ON DUPLICATE KEY UPDATE
          leave_policy_rule_id =
            VALUES(leave_policy_rule_id),

          leave_balance_id =
            VALUES(leave_balance_id),

          accrual_from_date =
            VALUES(accrual_from_date),

          accrual_to_date =
            VALUES(accrual_to_date),

          annual_entitlement_units =
            VALUES(annual_entitlement_units),

          accrual_rate_units =
            VALUES(accrual_rate_units),

          proration_factor =
            VALUES(proration_factor),

          calculated_units =
            VALUES(calculated_units),

          applied_units =
            VALUES(applied_units),

          balance_before =
            VALUES(balance_before),

          balance_after =
            VALUES(balance_after),

          detail_status =
            VALUES(detail_status),

          skip_reason =
            VALUES(skip_reason),

          error_code =
            VALUES(error_code),

          error_message =
            VALUES(error_message),

          transaction_id =
            VALUES(transaction_id),

          processed_at =
            CURRENT_TIMESTAMP
    `,
    [
      input.accrualRunId,
      input.companyId,
      input.employeeId,
      input.leaveTypeId,
      input.leavePolicyRuleId,
      input.leaveBalanceId,
      input.accrualFromDate,
      input.accrualToDate,
      input.annualEntitlementUnits,
      input.accrualRateUnits,
      input.prorationFactor,
      input.calculatedUnits,
      input.appliedUnits,
      input.balanceBefore,
      input.balanceAfter,
      input.detailStatus,
      input.skipReason,
      input.errorCode,
      input.errorMessage,
      input.transactionId
    ]
  );
}

/*
 * =========================================================
 * Public preview
 * =========================================================
 */

export async function previewLeaveAccrualRecords(
  filters: LeaveAccrualPreviewFilters
): Promise<LeaveAccrualPreviewResponse> {
  const connection =
    await databasePool.getConnection();

  try {
    await connection.beginTransaction();

    const period =
      await lockLeavePeriod(
        connection,
        filters.companyId,
        filters.leavePeriodId
      );

    if (!period) {
      throw new Error(
        "LEAVE_PERIOD_NOT_FOUND"
      );
    }

    validateAccrualPeriodRange(
      period,
      {
        accrualFromDate:
          filters.accrualFromDate,

        accrualToDate:
          filters.accrualToDate,

        postingDate:
          filters.postingDate
      }
    );

    const candidates =
      await findLeaveAccrualCandidates(
        connection,
        {
          companyId:
            filters.companyId,

          leavePeriodId:
            filters.leavePeriodId,

          accrualMethod:
            filters.accrualMethod,

          effectiveDate:
            filters.accrualToDate,

          ...(filters.employeeId !==
          undefined
            ? {
                employeeId:
                  filters.employeeId
              }
            : {}),

          ...(filters.leaveTypeId !==
          undefined
            ? {
                leaveTypeId:
                  filters.leaveTypeId
              }
            : {})
        }
      );

    const items:
      LeaveAccrualPreviewItem[] =
        candidates.map(
          (
            candidate
          ) => {
            const calculation =
              calculateAccrualCandidate(
                candidate,
                {
                  accrualMethod:
                    filters.accrualMethod,

                  accrualFromDate:
                    filters.accrualFromDate,

                  accrualToDate:
                    filters.accrualToDate
                }
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
                String(
                  candidate
                    .leave_policy_rule_id
                ),

              leaveBalanceId:
                candidate.leave_balance_id ===
                  null
                  ? null
                  : String(
                      candidate
                        .leave_balance_id
                    ),

              annualEntitlementUnits:
                calculation
                  .annualEntitlementUnits,

              accrualRateUnits:
                calculation
                  .accrualRateUnits,

              prorationFactor:
                calculation
                  .prorationFactor,

              calculatedUnits:
                calculation
                  .calculatedUnits,

              applicableMaximumBalance:
                candidate.maximum_balance_units ===
                  null
                  ? null
                  : Number(
                      candidate
                        .maximum_balance_units
                    ),

              balanceBefore:
                calculation
                  .balanceBefore,

              projectedBalanceAfter:
                calculation
                  .balanceAfter,

              status:
                calculation.status,

              skipReason:
                calculation.skipReason
            };
          }
        );

    await connection.rollback();

    return {
      companyId:
        filters.companyId,

      leavePeriodId:
        filters.leavePeriodId,

      accrualMethod:
        filters.accrualMethod,

      accrualFromDate:
        filters.accrualFromDate,

      accrualToDate:
        filters.accrualToDate,

      postingDate:
        filters.postingDate,

      totalCandidates:
        items.length,

      eligibleCount:
        items.filter(
          (
            item
          ) =>
            item.status ===
            "ELIGIBLE"
        ).length,

      skippedCount:
        items.filter(
          (
            item
          ) =>
            item.status ===
            "SKIPPED"
        ).length,

      totalCalculatedUnits:
        roundUnits(
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              (
                item.status ===
                "ELIGIBLE"
                  ? item
                      .calculatedUnits
                  : 0
              ),
            0
          )
        ),

      items
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve original error.
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Run listing and lookup
 * =========================================================
 */

export async function listLeaveAccrualRunRecords(
  companyId: string,
  filters:
    LeaveAccrualRunListFilters
): Promise<
  PaginatedLeaveAccrualResult<
    LeaveAccrualRunDatabaseRow
  >
> {
  const conditions: string[] = [
    "lar.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (
    filters.leavePeriodId
  ) {
    conditions.push(
      "lar.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (
    filters.runStatus
  ) {
    conditions.push(
      "lar.run_status = ?"
    );

    parameters.push(
      filters.runStatus
    );
  }

  if (
    filters.runType
  ) {
    conditions.push(
      "lar.run_type = ?"
    );

    parameters.push(
      filters.runType
    );
  }

  if (
    filters.accrualMethod
  ) {
    conditions.push(
      "lar.accrual_method = ?"
    );

    parameters.push(
      filters.accrualMethod
    );
  }

  if (
    filters.isDryRun !==
    undefined
  ) {
    conditions.push(
      "lar.is_dry_run = ?"
    );

    parameters.push(
      filters.isDryRun
        ? 1
        : 0
    );
  }

  if (
    filters.postingDateFrom
  ) {
    conditions.push(
      "lar.posting_date >= ?"
    );

    parameters.push(
      filters.postingDateFrom
    );
  }

  if (
    filters.postingDateTo
  ) {
    conditions.push(
      "lar.posting_date <= ?"
    );

    parameters.push(
      filters.postingDateTo
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        lar.run_number LIKE ?
        OR lar.idempotency_key LIKE ?
        OR lar.run_name LIKE ?
        OR lar.run_type LIKE ?
        OR lar.accrual_method LIKE ?
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

        FROM leave_accrual_runs lar

        INNER JOIN leave_periods lp
            ON lp.leave_period_id =
               lar.leave_period_id

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
        ${leaveAccrualRunSelect}

        WHERE ${whereClause}

        ORDER BY
            lar.created_at DESC,
            lar.accrual_run_id DESC

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
        LeaveAccrualRunDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeaveAccrualRunRecordById(
  companyId: string,
  accrualRunId: string
): Promise<LeaveAccrualRunDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leaveAccrualRunSelect}

        WHERE lar.accrual_run_id = ?
          AND lar.company_id = ?

        LIMIT 1
      `,
      [
        accrualRunId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveAccrualRunDatabaseRow
      | undefined
  ) ?? null;
}

export async function listLeaveAccrualRunDetailRecords(
  companyId: string,
  accrualRunId: string,
  filters:
    LeaveAccrualRunDetailListFilters
): Promise<
  PaginatedLeaveAccrualResult<
    LeaveAccrualRunDetailDatabaseRow
  >
> {
  const conditions: string[] = [
    "lard.company_id = ?",
    "lard.accrual_run_id = ?"
  ];

  const parameters: unknown[] = [
    companyId,
    accrualRunId
  ];

  if (
    filters.employeeId
  ) {
    conditions.push(
      "lard.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (
    filters.leaveTypeId
  ) {
    conditions.push(
      "lard.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (
    filters.detailStatus
  ) {
    conditions.push(
      "lard.detail_status = ?"
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
        e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lard.skip_reason LIKE ?
        OR lard.error_code LIKE ?
        OR lard.error_message LIKE ?
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
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_accrual_run_details lard

        INNER JOIN employees e
            ON e.employee_id =
               lard.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               lard.leave_type_id

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
        ${leaveAccrualDetailSelect}

        WHERE ${whereClause}

        ORDER BY
            e.employee_code ASC,
            lt.leave_type_code ASC,
            lard.accrual_run_detail_id ASC

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
        LeaveAccrualRunDetailDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

/*
 * =========================================================
 * Run creation
 * =========================================================
 */

export async function createLeaveAccrualRunRecord(
  input:
    CreateLeaveAccrualRunRecordInput,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveAccrualRunDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const period =
      await lockLeavePeriod(
        connection,
        input.companyId,
        input.leavePeriodId
      );

    if (!period) {
      throw new Error(
        "LEAVE_PERIOD_NOT_FOUND"
      );
    }

    validateAccrualPeriodRange(
      period,
      {
        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        postingDate:
          input.postingDate
      }
    );

    const result =
      await connection.query(
        `
          INSERT INTO leave_accrual_runs (
              company_id,
              leave_period_id,
              run_number,
              idempotency_key,
              run_name,
              run_type,
              accrual_method,
              accrual_from_date,
              accrual_to_date,
              posting_date,
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
          input.leavePeriodId,
          input.runNumber ||
            generateRunNumber(),
          input.idempotencyKey,
          input.runName,
          input.runType,
          input.accrualMethod,
          input.accrualFromDate,
          input.accrualToDate,
          input.postingDate,
          input.isDryRun
            ? 1
            : 0,
          input.createdByUserId
        ]
      ) as unknown as InsertResult;

    const accrualRunId =
      String(
        result.insertId
      );

    const created =
      await selectLeaveAccrualRunUsingConnection(
        connection,
        input.companyId,
        accrualRunId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_ACCRUAL_RUN_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_accrual_run_created",

        tableName:
          "leave_accrual_runs",

        recordId:
          accrualRunId,

        newValues: {
          accrualRunId,
          runNumber:
            created.run_number,
          idempotencyKey:
            created.idempotency_key,
          accrualMethod:
            created.accrual_method,
          accrualFromDate:
            databaseDateOnly(
              created.accrual_from_date
            ),
          accrualToDate:
            databaseDateOnly(
              created.accrual_to_date
            ),
          postingDate:
            databaseDateOnly(
              created.posting_date
            ),
          isDryRun:
            databaseBoolean(
              created.is_dry_run
            )
        },

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/leave/accrual-runs",

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
 * Candidate processing
 * =========================================================
 */

async function processSingleAccrualCandidate(
  connection: PoolConnection,
  input: {
    run:
      LockedLeaveAccrualRunRow;

    candidate:
      LeaveAccrualCandidateDatabaseRow;

    companyId: string;
    accrualRunId: string;
    leavePeriodId: string;

    accrualMethod: string;
    accrualFromDate: string;
    accrualToDate: string;
    postingDate: string;

    isDryRun: boolean;
    processedByUserId: string;
  }
): Promise<{
  detailStatus:
    | "PROCESSED"
    | "SKIPPED";

  calculatedUnits: number;
  appliedUnits: number;
}> {
  const calculation =
    calculateAccrualCandidate(
      input.candidate,
      {
        accrualMethod:
          input.accrualMethod,

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate
      }
    );

  if (
    calculation.status ===
    "SKIPPED"
  ) {
    await upsertAccrualRunDetail(
      connection,
      {
        accrualRunId:
          input.accrualRunId,

        companyId:
          input.companyId,

        employeeId:
          String(
            input.candidate.employee_id
          ),

        leaveTypeId:
          String(
            input.candidate.leave_type_id
          ),

        leavePolicyRuleId:
          String(
            input.candidate
              .leave_policy_rule_id
          ),

        leaveBalanceId:
          input.candidate.leave_balance_id ===
            null
            ? null
            : String(
                input.candidate
                  .leave_balance_id
              ),

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        annualEntitlementUnits:
          calculation
            .annualEntitlementUnits,

        accrualRateUnits:
          calculation
            .accrualRateUnits,

        prorationFactor:
          calculation
            .prorationFactor,

        calculatedUnits:
          calculation
            .calculatedUnits,

        appliedUnits: 0,

        balanceBefore:
          calculation
            .balanceBefore,

        balanceAfter:
          calculation
            .balanceBefore,

        detailStatus:
          "SKIPPED",

        skipReason:
          calculation.skipReason,

        errorCode: null,
        errorMessage: null,
        transactionId: null
      }
    );

    return {
      detailStatus:
        "SKIPPED",

      calculatedUnits:
        calculation
          .calculatedUnits,

      appliedUnits: 0
    };
  }

  if (input.isDryRun) {
    await upsertAccrualRunDetail(
      connection,
      {
        accrualRunId:
          input.accrualRunId,

        companyId:
          input.companyId,

        employeeId:
          String(
            input.candidate.employee_id
          ),

        leaveTypeId:
          String(
            input.candidate.leave_type_id
          ),

        leavePolicyRuleId:
          String(
            input.candidate
              .leave_policy_rule_id
          ),

        leaveBalanceId:
          input.candidate.leave_balance_id ===
            null
            ? null
            : String(
                input.candidate
                  .leave_balance_id
              ),

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        annualEntitlementUnits:
          calculation
            .annualEntitlementUnits,

        accrualRateUnits:
          calculation
            .accrualRateUnits,

        prorationFactor:
          calculation
            .prorationFactor,

        calculatedUnits:
          calculation
            .calculatedUnits,

        appliedUnits:
          calculation
            .appliedUnits,

        balanceBefore:
          calculation
            .balanceBefore,

        balanceAfter:
          calculation
            .balanceAfter,

        detailStatus:
          "PROCESSED",

        skipReason: null,
        errorCode: null,
        errorMessage: null,
        transactionId: null
      }
    );

    return {
      detailStatus:
        "PROCESSED",

      calculatedUnits:
        calculation
          .calculatedUnits,

      appliedUnits:
        calculation
          .appliedUnits
    };
  }

  const employeeId =
    String(
      input.candidate.employee_id
    );

  const leaveTypeId =
    String(
      input.candidate.leave_type_id
    );

  await ensureLeaveBalance(
    connection,
    {
      companyId:
        input.companyId,

      employeeId,
      leaveTypeId,

      leavePeriodId:
        input.leavePeriodId
    }
  );

  const balance =
    await lockLeaveBalance(
      connection,
      {
        companyId:
          input.companyId,

        employeeId,
        leaveTypeId,

        leavePeriodId:
          input.leavePeriodId
      }
    );

  if (!balance) {
    throw new Error(
      "LEAVE_BALANCE_NOT_FOUND_AFTER_INITIALIZATION"
    );
  }

  const lastAccrualDate =
    databaseDateOnly(
      balance.last_accrual_date
    );

  if (
    lastAccrualDate !== null &&
    lastAccrualDate >=
      input.accrualToDate
  ) {
    await upsertAccrualRunDetail(
      connection,
      {
        accrualRunId:
          input.accrualRunId,

        companyId:
          input.companyId,

        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          String(
            input.candidate
              .leave_policy_rule_id
          ),

        leaveBalanceId:
          String(
            balance.leave_balance_id
          ),

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        annualEntitlementUnits:
          calculation
            .annualEntitlementUnits,

        accrualRateUnits:
          calculation
            .accrualRateUnits,

        prorationFactor:
          calculation
            .prorationFactor,

        calculatedUnits:
          calculation
            .calculatedUnits,

        appliedUnits: 0,

        balanceBefore:
          Number(
            balance.available_balance
          ),

        balanceAfter:
          Number(
            balance.available_balance
          ),

        detailStatus:
          "SKIPPED",

        skipReason:
          "ACCRUAL_PERIOD_ALREADY_POSTED",

        errorCode: null,
        errorMessage: null,
        transactionId: null
      }
    );

    return {
      detailStatus:
        "SKIPPED",

      calculatedUnits:
        calculation
          .calculatedUnits,

      appliedUnits: 0
    };
  }

  const currentBalance =
    Number(
      balance.available_balance
    );

  const maximumBalance =
    input.candidate.maximum_balance_units ===
      null
      ? null
      : Number(
          input.candidate
            .maximum_balance_units
        );

  let finalAppliedUnits =
    calculation.appliedUnits;

  if (
    maximumBalance !==
    null
  ) {
    finalAppliedUnits =
      roundUnits(
        Math.min(
          finalAppliedUnits,
          Math.max(
            0,
            maximumBalance -
              currentBalance
          )
        )
      );
  }

  if (
    finalAppliedUnits <= 0
  ) {
    await upsertAccrualRunDetail(
      connection,
      {
        accrualRunId:
          input.accrualRunId,

        companyId:
          input.companyId,

        employeeId,
        leaveTypeId,

        leavePolicyRuleId:
          String(
            input.candidate
              .leave_policy_rule_id
          ),

        leaveBalanceId:
          String(
            balance.leave_balance_id
          ),

        accrualFromDate:
          input.accrualFromDate,

        accrualToDate:
          input.accrualToDate,

        annualEntitlementUnits:
          calculation
            .annualEntitlementUnits,

        accrualRateUnits:
          calculation
            .accrualRateUnits,

        prorationFactor:
          calculation
            .prorationFactor,

        calculatedUnits:
          calculation
            .calculatedUnits,

        appliedUnits: 0,

        balanceBefore:
          currentBalance,

        balanceAfter:
          currentBalance,

        detailStatus:
          "SKIPPED",

        skipReason:
          "MAXIMUM_LEAVE_BALANCE_REACHED",

        errorCode: null,
        errorMessage: null,
        transactionId: null
      }
    );

    return {
      detailStatus:
        "SKIPPED",

      calculatedUnits:
        calculation
          .calculatedUnits,

      appliedUnits: 0
    };
  }

  const balanceAfter =
    roundUnits(
      currentBalance +
      finalAppliedUnits
    );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          accrued_units =
            accrued_units + ?,

          available_balance = ?,

          last_accrual_date = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      finalAppliedUnits,
      balanceAfter,
      input.accrualToDate,
      String(
        balance.leave_balance_id
      ),
      input.companyId
    ]
  );

  const transactionId =
    await insertAccrualBalanceTransaction(
      connection,
      {
        leaveBalanceId:
          String(
            balance.leave_balance_id
          ),

        companyId:
          input.companyId,

        employeeId,
        leaveTypeId,

        leavePeriodId:
          input.leavePeriodId,

        transactionDate:
          input.postingDate,

        unitsChanged:
          finalAppliedUnits,

        balanceBefore:
          currentBalance,

        balanceAfter,

        accrualRunId:
          input.accrualRunId,

        createdByUserId:
          input.processedByUserId
      }
    );

  await upsertAccrualRunDetail(
    connection,
    {
      accrualRunId:
        input.accrualRunId,

      companyId:
        input.companyId,

      employeeId,
      leaveTypeId,

      leavePolicyRuleId:
        String(
          input.candidate
            .leave_policy_rule_id
        ),

      leaveBalanceId:
        String(
          balance.leave_balance_id
        ),

      accrualFromDate:
        input.accrualFromDate,

      accrualToDate:
        input.accrualToDate,

      annualEntitlementUnits:
        calculation
          .annualEntitlementUnits,

      accrualRateUnits:
        calculation
          .accrualRateUnits,

      prorationFactor:
        calculation
          .prorationFactor,

      calculatedUnits:
        calculation
          .calculatedUnits,

      appliedUnits:
        finalAppliedUnits,

      balanceBefore:
        currentBalance,

      balanceAfter,

      detailStatus:
        "PROCESSED",

      skipReason: null,
      errorCode: null,
      errorMessage: null,

      transactionId
    }
  );

  return {
    detailStatus:
      "PROCESSED",

    calculatedUnits:
      calculation
        .calculatedUnits,

    appliedUnits:
      finalAppliedUnits
  };
}

/*
 * =========================================================
 * Run processing
 * =========================================================
 */

export async function processLeaveAccrualRunRecord(
  companyId: string,
  accrualRunId: string,
  options:
    ProcessLeaveAccrualRunOptions,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveAccrualRunProcessingResult
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

    const run =
      await lockLeaveAccrualRun(
        connection,
        companyId,
        accrualRunId
      );

    if (!run) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      run.run_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ONLY_DRAFT_ACCRUAL_RUN_CAN_BE_PROCESSED"
      );
    }

    const period =
      await lockLeavePeriod(
        connection,
        companyId,
        String(
          run.leave_period_id
        )
      );

    if (!period) {
      throw new Error(
        "LEAVE_PERIOD_NOT_FOUND"
      );
    }

    const accrualFromDate =
      databaseDateOnly(
        run.accrual_from_date
      );

    const accrualToDate =
      databaseDateOnly(
        run.accrual_to_date
      );

    const postingDate =
      databaseDateOnly(
        run.posting_date
      );

    if (
      !accrualFromDate ||
      !accrualToDate ||
      !postingDate
    ) {
      throw new Error(
        "INVALID_LEAVE_ACCRUAL_DATES"
      );
    }

    validateAccrualPeriodRange(
      period,
      {
        accrualFromDate,
        accrualToDate,
        postingDate
      }
    );

    if (
      options.rebuildPendingDetails
    ) {
      await connection.query(
        `
          DELETE FROM leave_accrual_run_details

          WHERE accrual_run_id = ?
            AND detail_status IN (
              'PENDING',
              'SKIPPED',
              'FAILED'
            )
        `,
        [
          accrualRunId
        ]
      );
    }

    await connection.query(
      `
        UPDATE leave_accrual_runs

        SET
            run_status = 'PROCESSING',
            started_by_user_id = ?,
            started_at = CURRENT_TIMESTAMP,
            completed_at = NULL,
            error_summary = NULL

        WHERE accrual_run_id = ?
          AND company_id = ?
          AND run_status = 'DRAFT'
      `,
      [
        options.processedByUserId,
        accrualRunId,
        companyId
      ]
    );

    const candidates =
      await findLeaveAccrualCandidates(
        connection,
        {
          companyId,

          leavePeriodId:
            String(
              run.leave_period_id
            ),

          accrualMethod:
            run.accrual_method,

          effectiveDate:
            accrualToDate
        }
      );

    let processedCount = 0;
    let successfulCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    let totalCalculatedUnits = 0;
    let totalAppliedUnits = 0;

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
        `accrual_candidate_${index}`;

      await connection.query(
        `SAVEPOINT ${savepoint}`
      );

      try {
        const result =
          await processSingleAccrualCandidate(
            connection,
            {
              run,
              candidate,
              companyId,
              accrualRunId,

              leavePeriodId:
                String(
                  run.leave_period_id
                ),

              accrualMethod:
                run.accrual_method,

              accrualFromDate,
              accrualToDate,
              postingDate,

              isDryRun:
                databaseBoolean(
                  run.is_dry_run
                ),

              processedByUserId:
                options.processedByUserId
            }
          );

        processedCount += 1;

        totalCalculatedUnits =
          roundUnits(
            totalCalculatedUnits +
            result.calculatedUnits
          );

        totalAppliedUnits =
          roundUnits(
            totalAppliedUnits +
            result.appliedUnits
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
            : "UNKNOWN_ACCRUAL_ERROR";

        const errorMessage =
          candidateError instanceof Error
            ? candidateError.message
            : String(
                candidateError
              );

        errors.push(
          `${candidate.employee_code}/${candidate.leave_type_code}: ${errorMessage}`
        );

        await upsertAccrualRunDetail(
          connection,
          {
            accrualRunId,
            companyId,

            employeeId:
              String(
                candidate.employee_id
              ),

            leaveTypeId:
              String(
                candidate.leave_type_id
              ),

            leavePolicyRuleId:
              String(
                candidate
                  .leave_policy_rule_id
              ),

            leaveBalanceId:
              candidate.leave_balance_id ===
                null
                ? null
                : String(
                    candidate
                      .leave_balance_id
                  ),

            accrualFromDate,
            accrualToDate,

            annualEntitlementUnits:
              Number(
                candidate
                  .annual_entitlement_units
              ),

            accrualRateUnits:
              Number(
                candidate
                  .accrual_units_per_period
              ),

            prorationFactor: 0,
            calculatedUnits: 0,
            appliedUnits: 0,

            balanceBefore:
              Number(
                candidate.available_balance ??
                0
              ),

            balanceAfter:
              Number(
                candidate.available_balance ??
                0
              ),

            detailStatus:
              "FAILED",

            skipReason: null,

            errorCode,
            errorMessage,

            transactionId: null
          }
        );

        if (
          !options.continueOnError
        ) {
          break;
        }
      }
    }

    let finalStatus:
      | "COMPLETED"
      | "PARTIAL_FAILED"
      | "FAILED";

    if (
      failedCount === 0
    ) {
      finalStatus =
        "COMPLETED";
    } else if (
      successfulCount > 0 ||
      skippedCount > 0
    ) {
      finalStatus =
        "PARTIAL_FAILED";
    } else {
      finalStatus =
        "FAILED";
    }

    await connection.query(
      `
        UPDATE leave_accrual_runs

        SET
            run_status = ?,
            total_candidates = ?,
            processed_count = ?,
            successful_count = ?,
            skipped_count = ?,
            failed_count = ?,
            total_calculated_units = ?,
            total_applied_units = ?,
            completed_at = CURRENT_TIMESTAMP,
            error_summary = ?

        WHERE accrual_run_id = ?
          AND company_id = ?
      `,
      [
        finalStatus,
        candidates.length,
        processedCount,
        successfulCount,
        skippedCount,
        failedCount,
        totalCalculatedUnits,
        totalAppliedUnits,

        errors.length === 0
          ? null
          : errors
              .slice(0, 100)
              .join("\n"),

        accrualRunId,
        companyId
      ]
    );

    const processedRun =
      await selectLeaveAccrualRunUsingConnection(
        connection,
        companyId,
        accrualRunId
      );

    if (!processedRun) {
      throw new Error(
        "PROCESSED_LEAVE_ACCRUAL_RUN_NOT_FOUND"
      );
    }

    const details =
      await selectLeaveAccrualDetailsUsingConnection(
        connection,
        accrualRunId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          databaseBoolean(
            run.is_dry_run
          )
            ? "leave_accrual_dry_run_processed"
            : "leave_accrual_run_processed",

        tableName:
          "leave_accrual_runs",

        recordId:
          accrualRunId,

        oldValues: {
          runStatus:
            run.run_status
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
          totalCalculatedUnits,
          totalAppliedUnits
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/accrual-runs/${accrualRunId}/process`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      run:
        processedRun,

      details
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
 * Run cancellation
 * =========================================================
 */

export async function cancelLeaveAccrualRunRecord(
  companyId: string,
  accrualRunId: string,
  input:
    CancelLeaveAccrualRunInput,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveAccrualRunDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const run =
      await lockLeaveAccrualRun(
        connection,
        companyId,
        accrualRunId
      );

    if (!run) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      run.run_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ONLY_DRAFT_ACCRUAL_RUN_CAN_BE_CANCELLED"
      );
    }

    await connection.query(
      `
        UPDATE leave_accrual_runs

        SET
            run_status = 'CANCELLED',
            cancelled_by_user_id = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancellation_reason = ?,
            completed_at = CURRENT_TIMESTAMP

        WHERE accrual_run_id = ?
          AND company_id = ?
          AND run_status = 'DRAFT'
      `,
      [
        input.cancelledByUserId,
        input.reason,
        accrualRunId,
        companyId
      ]
    );

    const cancelled =
      await selectLeaveAccrualRunUsingConnection(
        connection,
        companyId,
        accrualRunId
      );

    if (!cancelled) {
      throw new Error(
        "CANCELLED_LEAVE_ACCRUAL_RUN_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_accrual_run_cancelled",

        tableName:
          "leave_accrual_runs",

        recordId:
          accrualRunId,

        oldValues: {
          runStatus:
            run.run_status
        },

        newValues: {
          runStatus:
            cancelled.run_status,

          cancellationReason:
            input.reason
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/accrual-runs/${accrualRunId}/cancel`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
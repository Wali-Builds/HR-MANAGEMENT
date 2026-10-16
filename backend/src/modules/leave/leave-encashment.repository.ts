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
  ApproveLeaveEncashmentRequestRecord,
  CancelLeaveEncashmentRequestRecord,
  CreateLeaveEncashmentRequestRecord,
  LeaveEncashmentApprovalDatabaseResult,
  LeaveEncashmentRequestDatabaseRow,
  ProcessLeaveEncashmentRequestRecord,
  RejectLeaveEncashmentRequestRecord
} from "./leave-encashment.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedLeaveEncashmentRepositoryResult {
  records:
    LeaveEncashmentRequestDatabaseRow[];

  totalRecords: number;
}

export interface LeaveEncashmentRequestListFilters {
  employeeId?: string;
  leaveTypeId?: string;
  leavePeriodId?: string;
  requestStatus?: string;

  dateFrom?: string;
  dateTo?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface EmployeeLeaveEncashmentRequestListFilters {
  leaveTypeId?: string;
  leavePeriodId?: string;
  requestStatus?: string;

  dateFrom?: string;
  dateTo?: string;

  page: number;
  pageSize: number;
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

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;
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

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  period_status: string;
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

  available_balance:
    | string
    | number;

  encashed_units:
    | string
    | number;

  pending_units:
    | string
    | number;
}

interface LockedEncashmentRequestRow {
  encashment_request_id:
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

  request_number: string;

  requested_units:
    | string
    | number;

  approved_units:
    | string
    | number
    | null;

  request_status: string;
}

interface ApplicableEncashmentRuleRow {
  encashment_allowed:
    | number
    | boolean;

  maximum_encashment_units:
    | string
    | number
    | null;
}

interface CarryForwardLotRow {
  carry_forward_lot_id:
    | string
    | number
    | bigint;

  remaining_units:
    | string
    | number;
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

function roundUnits(
  value: number
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) * 100
  ) / 100;
}

function roundMoney(
  value: number
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) * 100
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

  return serialized ??
    "null";
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
 * Shared SELECT
 * =========================================================
 */

const leaveEncashmentRequestSelect = `
  SELECT
      ler.encashment_request_id,
      ler.company_id,

      ler.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      ler.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,
      lt.unit_type,

      ler.leave_period_id,
      lp.period_code,
      lp.period_name,

      lp.start_date
          AS period_start_date,

      lp.end_date
          AS period_end_date,

      lp.period_status,

      ler.request_number,
      ler.requested_units,
      ler.approved_units,
      ler.rate_per_unit,
      ler.gross_amount,
      ler.request_status,
      ler.reason,

      ler.requested_by_user_id,

      requested_by.username
          AS requested_by_username,

      ler.approved_by_user_id,

      approved_by.username
          AS approved_by_username,

      ler.approved_at,
      ler.approval_remarks,
      ler.payroll_reference,
      ler.processed_at,

      elb.leave_balance_id,

      elb.available_balance
          AS current_available_balance,

      (
        SELECT lbt.transaction_id
        FROM leave_balance_transactions lbt
        WHERE lbt.company_id =
              ler.company_id
          AND lbt.transaction_type =
              'ENCASHMENT'
          AND lbt.reference_type =
              'ENCASHMENT_REQUEST'
          AND lbt.reference_id =
              ler.encashment_request_id
        ORDER BY
            lbt.transaction_id ASC
        LIMIT 1
      ) AS balance_transaction_id,

      ler.created_at,
      ler.updated_at

  FROM leave_encashment_requests ler

  INNER JOIN employees e
      ON e.employee_id =
         ler.employee_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         ler.leave_type_id

  INNER JOIN leave_periods lp
      ON lp.leave_period_id =
         ler.leave_period_id

  LEFT JOIN users requested_by
      ON requested_by.user_id =
         ler.requested_by_user_id

  LEFT JOIN users approved_by
      ON approved_by.user_id =
         ler.approved_by_user_id

  LEFT JOIN employee_leave_balances elb
      ON elb.company_id =
         ler.company_id
     AND elb.employee_id =
         ler.employee_id
     AND elb.leave_type_id =
         ler.leave_type_id
     AND elb.leave_period_id =
         ler.leave_period_id
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
            available_balance,
            encashed_units,
            pending_units
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

async function lockEncashmentRequest(
  connection: PoolConnection,
  companyId: string,
  encashmentRequestId: string
): Promise<LockedEncashmentRequestRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            encashment_request_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            request_number,
            requested_units,
            approved_units,
            request_status
        FROM leave_encashment_requests
        WHERE encashment_request_id = ?
          AND company_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        encashmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedEncashmentRequestRow
      | undefined
  ) ?? null;
}

async function assertActiveEmployee(
  connection: PoolConnection,
  companyId: string,
  employeeId: string
): Promise<void> {
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
}

async function assertActiveLeaveType(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<void> {
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

async function findApplicableEncashmentRule(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    effectiveDate: string;
  }
): Promise<ApplicableEncashmentRuleRow | null> {
  const assignedRows =
    await connection.query(
      `
        SELECT
            lpr.encashment_allowed,
            lpr.maximum_encashment_units

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
        input.employeeId,
        input.companyId,
        input.leaveTypeId,
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate,
        input.effectiveDate
      ]
    );

  const assigned =
    assignedRows[0] as
      | ApplicableEncashmentRuleRow
      | undefined;

  if (assigned) {
    return assigned;
  }

  const defaultRows =
    await connection.query(
      `
        SELECT
            lpr.encashment_allowed,
            lpr.maximum_encashment_units

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
        input.companyId,
        input.leaveTypeId,
        input.effectiveDate,
        input.effectiveDate
      ]
    );

  return (
    defaultRows[0] as
      | ApplicableEncashmentRuleRow
      | undefined
  ) ?? null;
}

function assertEncashmentAllowed(
  rule:
    ApplicableEncashmentRuleRow | null
): void {
  if (!rule) {
    throw new Error(
      "APPLICABLE_LEAVE_POLICY_RULE_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      rule.encashment_allowed
    )
  ) {
    throw new Error(
      "LEAVE_ENCASHMENT_NOT_ALLOWED"
    );
  }
}

async function getCommittedEncashmentUnits(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    excludedRequestId:
      | string
      | null;
  }
): Promise<number> {
  const parameters: unknown[] = [
    input.companyId,
    input.employeeId,
    input.leaveTypeId,
    input.leavePeriodId
  ];

  let exclusionClause = "";

  if (
    input.excludedRequestId !==
      null
  ) {
    exclusionClause = `
      AND encashment_request_id <> ?
    `;

    parameters.push(
      input.excludedRequestId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT
            COALESCE(
              SUM(
                approved_units
              ),
              0
            ) AS total_records
        FROM leave_encashment_requests
        WHERE company_id = ?
          AND employee_id = ?
          AND leave_type_id = ?
          AND leave_period_id = ?
          AND request_status IN (
            'APPROVED',
            'PROCESSED'
          )
          ${exclusionClause}
        FOR UPDATE
      `,
      parameters
    );

  const row =
    rows[0] as
      | CountDatabaseRow
      | undefined;

  return Number(
    row?.total_records ??
      0
  );
}

async function assertWithinMaximumEncashment(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    requestedUnits: number;

    maximumUnits:
      | string
      | number
      | null;

    excludedRequestId:
      | string
      | null;
  }
): Promise<void> {
  if (
    input.maximumUnits ===
      null
  ) {
    return;
  }

  const committed =
    await getCommittedEncashmentUnits(
      connection,
      {
        companyId:
          input.companyId,

        employeeId:
          input.employeeId,

        leaveTypeId:
          input.leaveTypeId,

        leavePeriodId:
          input.leavePeriodId,

        excludedRequestId:
          input.excludedRequestId
      }
    );

  if (
    roundUnits(
      committed +
      input.requestedUnits
    ) >
    Number(
      input.maximumUnits
    )
  ) {
    throw new Error(
      "MAXIMUM_ENCASHMENT_UNITS_EXCEEDED"
    );
  }
}

async function selectEncashmentRequestUsingConnection(
  connection: PoolConnection,
  companyId: string,
  encashmentRequestId: string
): Promise<LeaveEncashmentRequestDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leaveEncashmentRequestSelect}
        WHERE ler.encashment_request_id = ?
          AND ler.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL
        LIMIT 1
      `,
      [
        encashmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveEncashmentRequestDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Carry-forward FIFO bookkeeping
 * =========================================================
 */

async function consumeCarryForwardLotsFifo(
  connection: PoolConnection,
  input: {
    companyId: string;
    leaveBalanceId: string;
    transactionDate: string;
    units: number;
  }
): Promise<number> {
  let unitsRemaining =
    roundUnits(
      input.units
    );

  let unitsConsumed = 0;

  const rows =
    await connection.query(
      `
        SELECT
            carry_forward_lot_id,
            remaining_units
        FROM leave_carry_forward_lots
        WHERE company_id = ?
          AND target_leave_balance_id = ?
          AND lot_status = 'ACTIVE'
          AND remaining_units > 0
          AND (
            expiry_date IS NULL
            OR expiry_date >= ?
          )
        ORDER BY
            CASE
              WHEN expiry_date IS NULL
                THEN 1
              ELSE 0
            END ASC,
            expiry_date ASC,
            created_at ASC,
            carry_forward_lot_id ASC
        FOR UPDATE
      `,
      [
        input.companyId,
        input.leaveBalanceId,
        input.transactionDate
      ]
    );

  for (
    const rawRow
    of rows
  ) {
    if (
      unitsRemaining <=
        0.005
    ) {
      break;
    }

    const row =
      rawRow as CarryForwardLotRow;

    const available =
      roundUnits(
        Number(
          row.remaining_units
        )
      );

    if (
      available <=
        0.005
    ) {
      continue;
    }

    const consumed =
      roundUnits(
        Math.min(
          available,
          unitsRemaining
        )
      );

    const newRemaining =
      roundUnits(
        available -
        consumed
      );

    await connection.query(
      `
        UPDATE leave_carry_forward_lots
        SET
            remaining_units = ?,
            consumed_units =
              consumed_units + ?,
            lot_status = ?,
            fully_consumed_at =
              CASE
                WHEN ? = 'EXHAUSTED'
                  THEN CURRENT_TIMESTAMP
                ELSE fully_consumed_at
              END
        WHERE carry_forward_lot_id = ?
          AND company_id = ?
      `,
      [
        newRemaining,
        consumed,

        newRemaining <= 0.005
          ? "EXHAUSTED"
          : "ACTIVE",

        newRemaining <= 0.005
          ? "EXHAUSTED"
          : "ACTIVE",

        String(
          row.carry_forward_lot_id
        ),

        input.companyId
      ]
    );

    unitsRemaining =
      roundUnits(
        unitsRemaining -
        consumed
      );

    unitsConsumed =
      roundUnits(
        unitsConsumed +
        consumed
      );
  }

  return unitsConsumed;
}

/*
 * =========================================================
 * Balance transaction helper
 * =========================================================
 */

async function insertEncashmentBalanceTransaction(
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

    encashmentRequestId: string;
    remarks: string | null;

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
            'ENCASHMENT',
            ?,
            ?,
            ?,
            'ENCASHMENT_REQUEST',
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
        input.unitsChanged,
        input.balanceBefore,
        input.balanceAfter,
        input.encashmentRequestId,
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
 * Listing and lookup
 * =========================================================
 */

function buildListConditions(
  companyId: string,
  filters:
    LeaveEncashmentRequestListFilters
): {
  whereClause: string;
  parameters: unknown[];
} {
  const conditions: string[] = [
    "ler.company_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "ler.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "ler.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "ler.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.requestStatus) {
    conditions.push(
      "ler.request_status = ?"
    );

    parameters.push(
      filters.requestStatus
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "DATE(ler.created_at) >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "DATE(ler.created_at) <= ?"
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
        ler.request_number LIKE ?
        OR e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lp.period_code LIKE ?
        OR lp.period_name LIKE ?
        OR ler.request_status LIKE ?
        OR ler.payroll_reference LIKE ?
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

  return {
    whereClause:
      conditions.join(
        " AND "
      ),

    parameters
  };
}

export async function listLeaveEncashmentRequestRecords(
  companyId: string,
  filters:
    LeaveEncashmentRequestListFilters
): Promise<PaginatedLeaveEncashmentRepositoryResult> {
  const {
    whereClause,
    parameters
  } = buildListConditions(
    companyId,
    filters
  );

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_encashment_requests ler

        INNER JOIN employees e
            ON e.employee_id =
               ler.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               ler.leave_type_id

        INNER JOIN leave_periods lp
            ON lp.leave_period_id =
               ler.leave_period_id

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
        ${leaveEncashmentRequestSelect}

        WHERE ${whereClause}

        ORDER BY
            ler.created_at DESC,
            ler.encashment_request_id DESC

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
        LeaveEncashmentRequestDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
          0
      )
  };
}

export async function listEmployeeLeaveEncashmentRequestRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeLeaveEncashmentRequestListFilters
): Promise<PaginatedLeaveEncashmentRepositoryResult> {
  return listLeaveEncashmentRequestRecords(
    companyId,
    {
      employeeId,

      ...(filters.leaveTypeId !==
      undefined
        ? {
            leaveTypeId:
              filters.leaveTypeId
          }
        : {}),

      ...(filters.leavePeriodId !==
      undefined
        ? {
            leavePeriodId:
              filters.leavePeriodId
          }
        : {}),

      ...(filters.requestStatus !==
      undefined
        ? {
            requestStatus:
              filters.requestStatus
          }
        : {}),

      ...(filters.dateFrom !==
      undefined
        ? {
            dateFrom:
              filters.dateFrom
          }
        : {}),

      ...(filters.dateTo !==
      undefined
        ? {
            dateTo:
              filters.dateTo
          }
        : {}),

      page:
        filters.page,

      pageSize:
        filters.pageSize
    }
  );
}

export async function findLeaveEncashmentRequestRecordById(
  companyId: string,
  encashmentRequestId: string
): Promise<LeaveEncashmentRequestDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leaveEncashmentRequestSelect}

        WHERE ler.encashment_request_id = ?
          AND ler.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL

        LIMIT 1
      `,
      [
        encashmentRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveEncashmentRequestDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Request creation
 * =========================================================
 */

export async function createLeaveEncashmentRequestRecord(
  input:
    CreateLeaveEncashmentRequestRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<LeaveEncashmentRequestDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

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

    const effectiveDate =
      clampDateToPeriod(
        currentDateOnly(),
        periodStartDate,
        periodEndDate
      );

    const rule =
      await findApplicableEncashmentRule(
        connection,
        {
          companyId:
            input.companyId,

          employeeId:
            input.employeeId,

          leaveTypeId:
            input.leaveTypeId,

          effectiveDate
        }
      );

    assertEncashmentAllowed(
      rule
    );

    if (
      input.requestedUnits >
      Number(
        balance.available_balance
      )
    ) {
      throw new Error(
        "INSUFFICIENT_LEAVE_BALANCE"
      );
    }

    await assertWithinMaximumEncashment(
      connection,
      {
        companyId:
          input.companyId,

        employeeId:
          input.employeeId,

        leaveTypeId:
          input.leaveTypeId,

        leavePeriodId:
          input.leavePeriodId,

        requestedUnits:
          input.requestedUnits,

        maximumUnits:
          rule?.maximum_encashment_units ??
          null,

        excludedRequestId:
          null
      }
    );

    const pendingRows =
      await connection.query(
        `
          SELECT
              encashment_request_id
          FROM leave_encashment_requests
          WHERE company_id = ?
            AND employee_id = ?
            AND leave_type_id = ?
            AND leave_period_id = ?
            AND request_status = 'PENDING'
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

    if (
      pendingRows.length >
      0
    ) {
      throw new Error(
        "PENDING_ENCASHMENT_REQUEST_EXISTS"
      );
    }

    const result =
      await connection.query(
        `
          INSERT INTO leave_encashment_requests (
              company_id,
              employee_id,
              leave_type_id,
              leave_period_id,
              request_number,
              requested_units,
              request_status,
              reason,
              requested_by_user_id
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              CONCAT(
                'ENC-',
                DATE_FORMAT(
                  CURRENT_DATE,
                  '%Y%m'
                ),
                '-',
                UUID_SHORT()
              ),
              ?,
              'PENDING',
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.leaveTypeId,
          input.leavePeriodId,
          input.requestedUnits,
          input.reason,
          input.requestedByUserId
        ]
      ) as unknown as InsertResult;

    const encashmentRequestId =
      String(
        result.insertId
      );

    const created =
      await selectEncashmentRequestUsingConnection(
        connection,
        input.companyId,
        encashmentRequestId
      );

    if (!created) {
      throw new Error(
        "CREATED_ENCASHMENT_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_encashment_requested",

        tableName:
          "leave_encashment_requests",

        recordId:
          encashmentRequestId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/leave-encashment-requests`,

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
 * Approval and balance deduction
 * =========================================================
 */

export async function approveLeaveEncashmentRequestRecord(
  companyId: string,
  encashmentRequestId: string,
  input:
    ApproveLeaveEncashmentRequestRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<LeaveEncashmentApprovalDatabaseResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockEncashmentRequest(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      existing.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_APPROVED"
      );
    }

    const requestedUnits =
      Number(
        existing.requested_units
      );

    if (
      input.approvedUnits >
      requestedUnits
    ) {
      throw new Error(
        "APPROVED_UNITS_EXCEED_REQUESTED_UNITS"
      );
    }

    const employeeId =
      String(
        existing.employee_id
      );

    const leaveTypeId =
      String(
        existing.leave_type_id
      );

    const leavePeriodId =
      String(
        existing.leave_period_id
      );

    await assertActiveEmployee(
      connection,
      companyId,
      employeeId
    );

    await assertActiveLeaveType(
      connection,
      companyId,
      leaveTypeId
    );

    const period =
      await assertOpenLeavePeriod(
        connection,
        companyId,
        leavePeriodId
      );

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

    const transactionDate =
      clampDateToPeriod(
        currentDateOnly(),
        periodStartDate,
        periodEndDate
      );

    const rule =
      await findApplicableEncashmentRule(
        connection,
        {
          companyId,
          employeeId,
          leaveTypeId,

          effectiveDate:
            transactionDate
        }
      );

    assertEncashmentAllowed(
      rule
    );

    await assertWithinMaximumEncashment(
      connection,
      {
        companyId,
        employeeId,
        leaveTypeId,
        leavePeriodId,

        requestedUnits:
          input.approvedUnits,

        maximumUnits:
          rule?.maximum_encashment_units ??
          null,

        excludedRequestId:
          encashmentRequestId
      }
    );

    const balance =
      await lockLeaveBalanceByScope(
        connection,
        companyId,
        employeeId,
        leaveTypeId,
        leavePeriodId
      );

    if (!balance) {
      throw new Error(
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    const duplicateRows =
      await connection.query(
        `
          SELECT transaction_id
          FROM leave_balance_transactions
          WHERE company_id = ?
            AND transaction_type =
                'ENCASHMENT'
            AND reference_type =
                'ENCASHMENT_REQUEST'
            AND reference_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          companyId,
          encashmentRequestId
        ]
      );

    if (
      duplicateRows.length >
      0
    ) {
      throw new Error(
        "ENCASHMENT_BALANCE_TRANSACTION_ALREADY_EXISTS"
      );
    }

    const balanceBefore =
      roundUnits(
        Number(
          balance.available_balance
        )
      );

    if (
      input.approvedUnits >
      balanceBefore
    ) {
      throw new Error(
        "INSUFFICIENT_LEAVE_BALANCE"
      );
    }

    const balanceAfter =
      roundUnits(
        balanceBefore -
        input.approvedUnits
      );

    const grossAmount =
      roundMoney(
        input.approvedUnits *
        input.ratePerUnit
      );

    if (
      grossAmount >
      9_999_999_999_999.99
    ) {
      throw new Error(
        "ENCASHMENT_GROSS_AMOUNT_EXCEEDS_LIMIT"
      );
    }

    const carryForwardUnitsConsumed =
      await consumeCarryForwardLotsFifo(
        connection,
        {
          companyId,

          leaveBalanceId:
            String(
              balance.leave_balance_id
            ),

          transactionDate,

          units:
            input.approvedUnits
        }
      );

    await connection.query(
      `
        UPDATE employee_leave_balances
        SET
            encashed_units =
              encashed_units + ?,
            available_balance = ?,
            last_calculated_at =
              CURRENT_TIMESTAMP
        WHERE leave_balance_id = ?
          AND company_id = ?
      `,
      [
        input.approvedUnits,
        balanceAfter,
        String(
          balance.leave_balance_id
        ),
        companyId
      ]
    );

    const transactionId =
      await insertEncashmentBalanceTransaction(
        connection,
        {
          leaveBalanceId:
            String(
              balance.leave_balance_id
            ),

          companyId,
          employeeId,
          leaveTypeId,
          leavePeriodId,

          transactionDate,

          unitsChanged:
            -input.approvedUnits,

          balanceBefore,
          balanceAfter,

          encashmentRequestId,

          remarks:
            input.approvalRemarks,

          createdByUserId:
            input.approvedByUserId
        }
      );

    await connection.query(
      `
        UPDATE leave_encashment_requests
        SET
            approved_units = ?,
            rate_per_unit = ?,
            gross_amount = ?,
            request_status = 'APPROVED',
            approved_by_user_id = ?,
            approved_at =
              CURRENT_TIMESTAMP,
            approval_remarks = ?
        WHERE encashment_request_id = ?
          AND company_id = ?
      `,
      [
        input.approvedUnits,
        input.ratePerUnit,
        grossAmount,
        input.approvedByUserId,
        input.approvalRemarks,
        encashmentRequestId,
        companyId
      ]
    );

    const approved =
      await selectEncashmentRequestUsingConnection(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!approved) {
      throw new Error(
        "APPROVED_ENCASHMENT_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_encashment_approved",

        tableName:
          "leave_encashment_requests",

        recordId:
          encashmentRequestId,

        oldValues:
          existing,

        newValues: {
          request:
            approved,

          balanceBefore,
          balanceAfter,
          transactionId,
          carryForwardUnitsConsumed
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/encashment-requests/${encashmentRequestId}/approve`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        approved,

      leaveBalanceId:
        String(
          balance.leave_balance_id
        ),

      balanceTransactionId:
        transactionId,

      balanceBefore,
      balanceAfter,
      carryForwardUnitsConsumed
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
 * Rejection, cancellation, and payroll processing
 * =========================================================
 */

export async function rejectLeaveEncashmentRequestRecord(
  companyId: string,
  encashmentRequestId: string,
  input:
    RejectLeaveEncashmentRequestRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<LeaveEncashmentRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockEncashmentRequest(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      existing.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_REJECTED"
      );
    }

    await connection.query(
      `
        UPDATE leave_encashment_requests
        SET
            request_status = 'REJECTED',
            approved_by_user_id = ?,
            approved_at =
              CURRENT_TIMESTAMP,
            approval_remarks = ?
        WHERE encashment_request_id = ?
          AND company_id = ?
      `,
      [
        input.rejectedByUserId,
        input.approvalRemarks,
        encashmentRequestId,
        companyId
      ]
    );

    const rejected =
      await selectEncashmentRequestUsingConnection(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!rejected) {
      throw new Error(
        "REJECTED_ENCASHMENT_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_encashment_rejected",

        tableName:
          "leave_encashment_requests",

        recordId:
          encashmentRequestId,

        oldValues:
          existing,

        newValues:
          rejected,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/encashment-requests/${encashmentRequestId}/reject`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return rejected;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelLeaveEncashmentRequestRecord(
  companyId: string,
  encashmentRequestId: string,
  input:
    CancelLeaveEncashmentRequestRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<LeaveEncashmentRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockEncashmentRequest(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      existing.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ONLY_PENDING_ENCASHMENT_REQUEST_CAN_BE_CANCELLED"
      );
    }

    await connection.query(
      `
        UPDATE leave_encashment_requests
        SET
            request_status = 'CANCELLED',
            approval_remarks = ?
        WHERE encashment_request_id = ?
          AND company_id = ?
      `,
      [
        input.cancellationReason,
        encashmentRequestId,
        companyId
      ]
    );

    const cancelled =
      await selectEncashmentRequestUsingConnection(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!cancelled) {
      throw new Error(
        "CANCELLED_ENCASHMENT_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_encashment_cancelled",

        tableName:
          "leave_encashment_requests",

        recordId:
          encashmentRequestId,

        oldValues:
          existing,

        newValues: {
          request:
            cancelled,

          cancelledByUserId:
            input.cancelledByUserId
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/encashment-requests/${encashmentRequestId}/cancel`,

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

export async function processLeaveEncashmentRequestRecord(
  companyId: string,
  encashmentRequestId: string,
  input:
    ProcessLeaveEncashmentRequestRecord,
  actor:
    AttendanceActor,
  metadata:
    RequestMetadata
): Promise<LeaveEncashmentRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockEncashmentRequest(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      existing.request_status !==
      "APPROVED"
    ) {
      throw new Error(
        "ONLY_APPROVED_ENCASHMENT_REQUEST_CAN_BE_PROCESSED"
      );
    }

    await connection.query(
      `
        UPDATE leave_encashment_requests
        SET
            request_status = 'PROCESSED',
            payroll_reference = ?,
            processed_at =
              CURRENT_TIMESTAMP
        WHERE encashment_request_id = ?
          AND company_id = ?
      `,
      [
        input.payrollReference,
        encashmentRequestId,
        companyId
      ]
    );

    const processed =
      await selectEncashmentRequestUsingConnection(
        connection,
        companyId,
        encashmentRequestId
      );

    if (!processed) {
      throw new Error(
        "PROCESSED_ENCASHMENT_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_encashment_processed",

        tableName:
          "leave_encashment_requests",

        recordId:
          encashmentRequestId,

        oldValues:
          existing,

        newValues: {
          request:
            processed,

          processedByUserId:
            input.processedByUserId
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/encashment-requests/${encashmentRequestId}/process`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return processed;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

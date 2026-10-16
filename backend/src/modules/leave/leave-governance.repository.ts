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
  CreateLeaveApprovalDelegationRecord,
  CreateLeaveBlackoutPeriodRecord,
  LeaveApprovalDelegationDatabaseRow,
  LeaveBlackoutPeriodDatabaseRow,
  UpdateLeaveApprovalDelegationRecord,
  UpdateLeaveBlackoutPeriodRecord
} from "./leave-governance.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedLeaveGovernanceResult<T> {
  records: T[];
  totalRecords: number;
}

export interface LeaveApprovalDelegationListFilters {
  delegatorUserId?: string;
  delegateUserId?: string;

  isActive?: boolean;
  effectiveOn?: string;

  includeExpired: boolean;

  search?: string;

  page: number;
  pageSize: number;
}

export interface LeaveBlackoutPeriodListFilters {
  branchId?: string;
  departmentId?: string;
  leaveTypeId?: string;

  restrictionType?: string;
  isActive?: boolean;

  overlappingDateFrom?: string;
  overlappingDateTo?: string;

  search?: string;

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

interface LockedLeaveDelegationRow {
  delegation_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  delegator_user_id:
    | string
    | number
    | bigint;

  delegate_user_id:
    | string
    | number
    | bigint;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string;

  reason:
    | string
    | null;

  is_active:
    | number
    | boolean;

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

interface LockedLeaveBlackoutRow {
  blackout_period_id:
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

  department_id:
    | string
    | number
    | bigint
    | null;

  leave_type_id:
    | string
    | number
    | bigint
    | null;

  blackout_name: string;

  description:
    | string
    | null;

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  restriction_type: string;

  exception_requires_approval:
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

interface ActiveCompanyUserRow {
  user_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint
    | null;

  employee_id:
    | string
    | number
    | bigint
    | null;

  username: string;

  is_active:
    | number
    | boolean;
}

interface CompanyScopeRow {
  record_id:
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
}

interface EmployeeScopeRow {
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

  department_id:
    | string
    | number
    | bigint
    | null;
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

function databaseDateTime(
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
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    return value
      .slice(0, 19)
      .replace("T", " ");
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
    .slice(0, 19)
    .replace("T", " ");
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
 * Shared SELECT statements
 * =========================================================
 */

const leaveDelegationSelect = `
  SELECT
      lad.delegation_id,
      lad.company_id,

      lad.delegator_user_id,

      delegator_user.username
          AS delegator_username,

      delegator_user.employee_id
          AS delegator_employee_id,

      delegator_employee.employee_code
          AS delegator_employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          delegator_employee.first_name,
          delegator_employee.middle_name,
          delegator_employee.last_name
        )
      ) AS delegator_employee_name,

      lad.delegate_user_id,

      delegate_user.username
          AS delegate_username,

      delegate_user.employee_id
          AS delegate_employee_id,

      delegate_employee.employee_code
          AS delegate_employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          delegate_employee.first_name,
          delegate_employee.middle_name,
          delegate_employee.last_name
        )
      ) AS delegate_employee_name,

      lad.effective_from,
      lad.effective_to,
      lad.reason,
      lad.is_active,

      CASE
        WHEN lad.is_active = 1
         AND lad.effective_from <= CURRENT_TIMESTAMP
         AND lad.effective_to >= CURRENT_TIMESTAMP
        THEN 1
        ELSE 0
      END AS is_effective,

      lad.created_by_user_id,

      created_by_user.username
          AS created_by_username,

      lad.created_at,
      lad.updated_at

  FROM leave_approval_delegations lad

  INNER JOIN users delegator_user
      ON delegator_user.user_id =
         lad.delegator_user_id

  LEFT JOIN employees delegator_employee
      ON delegator_employee.employee_id =
         delegator_user.employee_id

  INNER JOIN users delegate_user
      ON delegate_user.user_id =
         lad.delegate_user_id

  LEFT JOIN employees delegate_employee
      ON delegate_employee.employee_id =
         delegate_user.employee_id

  LEFT JOIN users created_by_user
      ON created_by_user.user_id =
         lad.created_by_user_id
`;

const leaveBlackoutSelect = `
  SELECT
      lbp.blackout_period_id,
      lbp.company_id,

      lbp.branch_id,
      b.branch_code,
      b.branch_name,

      lbp.department_id,
      d.department_code,
      d.department_name,

      lbp.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,

      lbp.blackout_name,
      lbp.description,
      lbp.start_date,
      lbp.end_date,
      lbp.restriction_type,
      lbp.exception_requires_approval,
      lbp.is_active,

      (
        SELECT COUNT(*)

        FROM leave_requests affected_request

        WHERE affected_request.company_id =
              lbp.company_id

          AND affected_request.start_date <=
              lbp.end_date

          AND affected_request.end_date >=
              lbp.start_date

          AND affected_request.request_status IN (
            'DRAFT',
            'PENDING',
            'APPROVED'
          )

          AND (
            lbp.leave_type_id IS NULL
            OR affected_request.leave_type_id =
               lbp.leave_type_id
          )

          AND (
            (
              lbp.branch_id IS NULL
              AND lbp.department_id IS NULL
            )

            OR EXISTS (
              SELECT 1

              FROM employee_assignments affected_assignment

              WHERE affected_assignment.employee_id =
                    affected_request.employee_id

                AND affected_assignment.effective_from <=
                    affected_request.start_date

                AND (
                  affected_assignment.effective_to IS NULL
                  OR affected_assignment.effective_to >=
                     affected_request.start_date
                )

                AND (
                  lbp.branch_id IS NULL
                  OR affected_assignment.branch_id =
                     lbp.branch_id
                )

                AND (
                  lbp.department_id IS NULL
                  OR affected_assignment.department_id =
                     lbp.department_id
                )
            )
          )
      ) AS affected_request_count,

      lbp.created_at,
      lbp.updated_at

  FROM leave_blackout_periods lbp

  LEFT JOIN branches b
      ON b.branch_id =
         lbp.branch_id

  LEFT JOIN departments d
      ON d.department_id =
         lbp.department_id

  LEFT JOIN leave_types lt
      ON lt.leave_type_id =
         lbp.leave_type_id
`;

/*
 * =========================================================
 * Connection SELECT helpers
 * =========================================================
 */

async function selectLeaveDelegationUsingConnection(
  connection: PoolConnection,
  companyId: string,
  delegationId: string
): Promise<
  LeaveApprovalDelegationDatabaseRow | null
> {
  const rows =
    await connection.query(
      `
        ${leaveDelegationSelect}

        WHERE lad.delegation_id = ?
          AND lad.company_id = ?

        LIMIT 1
      `,
      [
        delegationId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveApprovalDelegationDatabaseRow
      | undefined
  ) ?? null;
}

async function selectLeaveBlackoutUsingConnection(
  connection: PoolConnection,
  companyId: string,
  blackoutPeriodId: string
): Promise<
  LeaveBlackoutPeriodDatabaseRow | null
> {
  const rows =
    await connection.query(
      `
        ${leaveBlackoutSelect}

        WHERE lbp.blackout_period_id = ?
          AND lbp.company_id = ?

        LIMIT 1
      `,
      [
        blackoutPeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveBlackoutPeriodDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Lock helpers
 * =========================================================
 */

async function lockLeaveDelegation(
  connection: PoolConnection,
  companyId: string,
  delegationId: string
): Promise<LockedLeaveDelegationRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            delegation_id,
            company_id,
            delegator_user_id,
            delegate_user_id,
            effective_from,
            effective_to,
            reason,
            is_active,
            created_by_user_id,
            created_at,
            updated_at

        FROM leave_approval_delegations

        WHERE delegation_id = ?
          AND company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        delegationId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveDelegationRow
      | undefined
  ) ?? null;
}

async function lockLeaveBlackout(
  connection: PoolConnection,
  companyId: string,
  blackoutPeriodId: string
): Promise<LockedLeaveBlackoutRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            blackout_period_id,
            company_id,
            branch_id,
            department_id,
            leave_type_id,
            blackout_name,
            description,
            start_date,
            end_date,
            restriction_type,
            exception_requires_approval,
            is_active,
            created_at,
            updated_at

        FROM leave_blackout_periods

        WHERE blackout_period_id = ?
          AND company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        blackoutPeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveBlackoutRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * User validation
 * =========================================================
 */

async function lockActiveCompanyUser(
  connection: PoolConnection,
  companyId: string,
  userId: string
): Promise<ActiveCompanyUserRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            user_id,
            company_id,
            employee_id,
            username,
            is_active

        FROM users

        WHERE user_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL

        LIMIT 1
        FOR UPDATE
      `,
      [
        userId,
        companyId
      ]
    );

  return (
    rows[0] as
      | ActiveCompanyUserRow
      | undefined
  ) ?? null;
}

async function assertActiveDelegatorUser(
  connection: PoolConnection,
  companyId: string,
  userId: string
): Promise<ActiveCompanyUserRow> {
  const user =
    await lockActiveCompanyUser(
      connection,
      companyId,
      userId
    );

  if (!user) {
    throw new Error(
      "LEAVE_DELEGATOR_USER_NOT_FOUND"
    );
  }

  return user;
}

async function assertActiveDelegateUser(
  connection: PoolConnection,
  companyId: string,
  userId: string
): Promise<ActiveCompanyUserRow> {
  const user =
    await lockActiveCompanyUser(
      connection,
      companyId,
      userId
    );

  if (!user) {
    throw new Error(
      "LEAVE_DELEGATE_USER_NOT_FOUND"
    );
  }

  return user;
}

/*
 * =========================================================
 * Delegation overlap and cycle validation
 * =========================================================
 */

async function assertNoDelegationOverlap(
  connection: PoolConnection,
  input: {
    companyId: string;

    delegatorUserId: string;

    effectiveFrom: string;
    effectiveTo: string;

    excludedDelegationId:
      | string
      | null;
  }
): Promise<void> {
  const parameters: unknown[] = [
    input.companyId,
    input.delegatorUserId,
    input.effectiveTo,
    input.effectiveFrom
  ];

  let exclusionClause = "";

  if (
    input.excludedDelegationId !== null
  ) {
    exclusionClause = `
      AND delegation_id <> ?
    `;

    parameters.push(
      input.excludedDelegationId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT delegation_id

        FROM leave_approval_delegations

        WHERE company_id = ?
          AND delegator_user_id = ?
          AND is_active = 1

          AND effective_from < ?
          AND effective_to > ?

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
      "LEAVE_DELEGATION_DATE_OVERLAP"
    );
  }
}

async function assertNoDirectDelegationCycle(
  connection: PoolConnection,
  input: {
    companyId: string;

    delegatorUserId: string;
    delegateUserId: string;

    effectiveFrom: string;
    effectiveTo: string;

    excludedDelegationId:
      | string
      | null;
  }
): Promise<void> {
  const parameters: unknown[] = [
    input.companyId,
    input.delegateUserId,
    input.delegatorUserId,
    input.effectiveTo,
    input.effectiveFrom
  ];

  let exclusionClause = "";

  if (
    input.excludedDelegationId !== null
  ) {
    exclusionClause = `
      AND delegation_id <> ?
    `;

    parameters.push(
      input.excludedDelegationId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT delegation_id

        FROM leave_approval_delegations

        WHERE company_id = ?
          AND delegator_user_id = ?
          AND delegate_user_id = ?
          AND is_active = 1

          AND effective_from < ?
          AND effective_to > ?

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
      "LEAVE_DELEGATION_DIRECT_CYCLE"
    );
  }
}

async function validateDelegationConfiguration(
  connection: PoolConnection,
  input: {
    companyId: string;

    delegatorUserId: string;
    delegateUserId: string;

    effectiveFrom: string;
    effectiveTo: string;

    isActive: boolean;

    excludedDelegationId:
      | string
      | null;
  }
): Promise<void> {
  if (
    input.delegatorUserId ===
    input.delegateUserId
  ) {
    throw new Error(
      "LEAVE_DELEGATION_TO_SELF"
    );
  }

  if (
    input.effectiveTo <=
    input.effectiveFrom
  ) {
    throw new Error(
      "INVALID_LEAVE_DELEGATION_DATES"
    );
  }

  await assertActiveDelegatorUser(
    connection,
    input.companyId,
    input.delegatorUserId
  );

  await assertActiveDelegateUser(
    connection,
    input.companyId,
    input.delegateUserId
  );

  if (!input.isActive) {
    return;
  }

  await assertNoDelegationOverlap(
    connection,
    {
      companyId:
        input.companyId,

      delegatorUserId:
        input.delegatorUserId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo:
        input.effectiveTo,

      excludedDelegationId:
        input.excludedDelegationId
    }
  );

  await assertNoDirectDelegationCycle(
    connection,
    {
      companyId:
        input.companyId,

      delegatorUserId:
        input.delegatorUserId,

      delegateUserId:
        input.delegateUserId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo:
        input.effectiveTo,

      excludedDelegationId:
        input.excludedDelegationId
    }
  );
}

/*
 * =========================================================
 * Company-scope validation
 * =========================================================
 */

async function assertCompanyBranch(
  connection: PoolConnection,
  companyId: string,
  branchId: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT
            branch_id AS record_id,
            company_id,
            is_active

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

  const branch =
    rows[0] as
      | CompanyScopeRow
      | undefined;

  if (!branch) {
    throw new Error(
      "LEAVE_BLACKOUT_BRANCH_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      branch.is_active
    )
  ) {
    throw new Error(
      "LEAVE_BLACKOUT_BRANCH_INACTIVE"
    );
  }
}

async function assertCompanyDepartment(
  connection: PoolConnection,
  companyId: string,
  departmentId: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT
            department_id AS record_id,
            company_id,
            is_active

        FROM departments

        WHERE department_id = ?
          AND company_id = ?
          AND deleted_at IS NULL

        LIMIT 1
        FOR UPDATE
      `,
      [
        departmentId,
        companyId
      ]
    );

  const department =
    rows[0] as
      | CompanyScopeRow
      | undefined;

  if (!department) {
    throw new Error(
      "LEAVE_BLACKOUT_DEPARTMENT_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      department.is_active
    )
  ) {
    throw new Error(
      "LEAVE_BLACKOUT_DEPARTMENT_INACTIVE"
    );
  }
}

async function assertCompanyLeaveType(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_type_id AS record_id,
            company_id,
            is_active

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

  const leaveType =
    rows[0] as
      | CompanyScopeRow
      | undefined;

  if (!leaveType) {
    throw new Error(
      "LEAVE_BLACKOUT_LEAVE_TYPE_NOT_FOUND"
    );
  }

  if (
    !databaseBoolean(
      leaveType.is_active
    )
  ) {
    throw new Error(
      "LEAVE_BLACKOUT_LEAVE_TYPE_INACTIVE"
    );
  }
}

async function validateBlackoutScope(
  connection: PoolConnection,
  input: {
    companyId: string;

    branchId:
      | string
      | null;

    departmentId:
      | string
      | null;

    leaveTypeId:
      | string
      | null;
  }
): Promise<void> {
  if (
    input.branchId !== null
  ) {
    await assertCompanyBranch(
      connection,
      input.companyId,
      input.branchId
    );
  }

  if (
    input.departmentId !== null
  ) {
    await assertCompanyDepartment(
      connection,
      input.companyId,
      input.departmentId
    );
  }

  if (
    input.leaveTypeId !== null
  ) {
    await assertCompanyLeaveType(
      connection,
      input.companyId,
      input.leaveTypeId
    );
  }
}

/*
 * =========================================================
 * Duplicate blackout validation
 * =========================================================
 */

async function assertNoDuplicateBlackoutOverlap(
  connection: PoolConnection,
  input: {
    companyId: string;

    branchId:
      | string
      | null;

    departmentId:
      | string
      | null;

    leaveTypeId:
      | string
      | null;

    blackoutName: string;

    startDate: string;
    endDate: string;

    restrictionType: string;

    excludedBlackoutPeriodId:
      | string
      | null;
  }
): Promise<void> {
  const parameters: unknown[] = [
    input.companyId,
    input.branchId,
    input.departmentId,
    input.leaveTypeId,
    input.blackoutName,
    input.restrictionType,
    input.endDate,
    input.startDate
  ];

  let exclusionClause = "";

  if (
    input.excludedBlackoutPeriodId !==
    null
  ) {
    exclusionClause = `
      AND blackout_period_id <> ?
    `;

    parameters.push(
      input.excludedBlackoutPeriodId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT blackout_period_id

        FROM leave_blackout_periods

        WHERE company_id = ?
          AND branch_id <=> ?
          AND department_id <=> ?
          AND leave_type_id <=> ?

          AND LOWER(
            TRIM(
              blackout_name
            )
          ) = LOWER(
            TRIM(?)
          )

          AND restriction_type = ?
          AND is_active = 1

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
      "DUPLICATE_LEAVE_BLACKOUT_PERIOD"
    );
  }
}

/*
 * =========================================================
 * Approval delegation lists and lookups
 * =========================================================
 */

export async function listLeaveApprovalDelegationRecords(
  companyId: string,
  filters:
    LeaveApprovalDelegationListFilters
): Promise<
  PaginatedLeaveGovernanceResult<
    LeaveApprovalDelegationDatabaseRow
  >
> {
  const conditions: string[] = [
    "lad.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (
    filters.delegatorUserId
  ) {
    conditions.push(
      "lad.delegator_user_id = ?"
    );

    parameters.push(
      filters.delegatorUserId
    );
  }

  if (
    filters.delegateUserId
  ) {
    conditions.push(
      "lad.delegate_user_id = ?"
    );

    parameters.push(
      filters.delegateUserId
    );
  }

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "lad.is_active = ?"
    );

    parameters.push(
      filters.isActive
        ? 1
        : 0
    );
  }

  if (
    filters.effectiveOn
  ) {
    conditions.push(
      "lad.effective_from <= ?"
    );

    conditions.push(
      "lad.effective_to >= ?"
    );

    parameters.push(
      filters.effectiveOn,
      filters.effectiveOn
    );
  }

  if (
    !filters.includeExpired
  ) {
    conditions.push(
      "lad.effective_to >= CURRENT_TIMESTAMP"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        delegator_user.username LIKE ?
        OR delegate_user.username LIKE ?
        OR delegator_employee.employee_code LIKE ?
        OR delegator_employee.first_name LIKE ?
        OR delegator_employee.middle_name LIKE ?
        OR delegator_employee.last_name LIKE ?
        OR delegate_employee.employee_code LIKE ?
        OR delegate_employee.first_name LIKE ?
        OR delegate_employee.middle_name LIKE ?
        OR delegate_employee.last_name LIKE ?
        OR lad.reason LIKE ?
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

        FROM leave_approval_delegations lad

        INNER JOIN users delegator_user
            ON delegator_user.user_id =
               lad.delegator_user_id

        LEFT JOIN employees delegator_employee
            ON delegator_employee.employee_id =
               delegator_user.employee_id

        INNER JOIN users delegate_user
            ON delegate_user.user_id =
               lad.delegate_user_id

        LEFT JOIN employees delegate_employee
            ON delegate_employee.employee_id =
               delegate_user.employee_id

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
        ${leaveDelegationSelect}

        WHERE ${whereClause}

        ORDER BY
            lad.effective_from DESC,
            lad.delegation_id DESC

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
        LeaveApprovalDelegationDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeaveApprovalDelegationRecordById(
  companyId: string,
  delegationId: string
): Promise<
  LeaveApprovalDelegationDatabaseRow | null
> {
  const rows =
    await databasePool.query(
      `
        ${leaveDelegationSelect}

        WHERE lad.delegation_id = ?
          AND lad.company_id = ?

        LIMIT 1
      `,
      [
        delegationId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveApprovalDelegationDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Approval delegation creation
 * =========================================================
 */

export async function createLeaveApprovalDelegationRecord(
  input:
    CreateLeaveApprovalDelegationRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveApprovalDelegationDatabaseRow
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    await validateDelegationConfiguration(
      connection,
      {
        companyId:
          input.companyId,

        delegatorUserId:
          input.delegatorUserId,

        delegateUserId:
          input.delegateUserId,

        effectiveFrom:
          input.effectiveFrom,

        effectiveTo:
          input.effectiveTo,

        isActive:
          input.isActive,

        excludedDelegationId:
          null
      }
    );

    const result =
      await connection.query(
        `
          INSERT INTO leave_approval_delegations (
              company_id,
              delegator_user_id,
              delegate_user_id,
              effective_from,
              effective_to,
              reason,
              is_active,
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
              ?
          )
        `,
        [
          input.companyId,
          input.delegatorUserId,
          input.delegateUserId,
          input.effectiveFrom,
          input.effectiveTo,
          input.reason,
          input.isActive
            ? 1
            : 0,
          input.createdByUserId
        ]
      ) as unknown as InsertResult;

    const delegationId =
      String(
        result.insertId
      );

    const created =
      await selectLeaveDelegationUsingConnection(
        connection,
        input.companyId,
        delegationId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_DELEGATION_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_approval_delegation_created",

        tableName:
          "leave_approval_delegations",

        recordId:
          delegationId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/leave/approval-delegations",

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
 * Approval delegation update
 * =========================================================
 */

export async function updateLeaveApprovalDelegationRecord(
  companyId: string,
  delegationId: string,
  input:
    UpdateLeaveApprovalDelegationRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveApprovalDelegationDatabaseRow | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockLeaveDelegation(
        connection,
        companyId,
        delegationId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    const existingEffectiveFrom =
      databaseDateTime(
        existing.effective_from
      );

    const existingEffectiveTo =
      databaseDateTime(
        existing.effective_to
      );

    if (
      !existingEffectiveFrom ||
      !existingEffectiveTo
    ) {
      throw new Error(
        "INVALID_LEAVE_DELEGATION_DATES"
      );
    }

    const finalDelegatorUserId =
      input.delegatorUserId ??
      String(
        existing.delegator_user_id
      );

    const finalDelegateUserId =
      input.delegateUserId ??
      String(
        existing.delegate_user_id
      );

    const finalEffectiveFrom =
      input.effectiveFrom ??
      existingEffectiveFrom;

    const finalEffectiveTo =
      input.effectiveTo ??
      existingEffectiveTo;

    const finalIsActive =
      input.isActive ??
      databaseBoolean(
        existing.is_active
      );

    await validateDelegationConfiguration(
      connection,
      {
        companyId,

        delegatorUserId:
          finalDelegatorUserId,

        delegateUserId:
          finalDelegateUserId,

        effectiveFrom:
          finalEffectiveFrom,

        effectiveTo:
          finalEffectiveTo,

        isActive:
          finalIsActive,

        excludedDelegationId:
          delegationId
      }
    );

    const assignments: string[] =
      [];

    const parameters: unknown[] =
      [];

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
      input.delegatorUserId !==
      undefined
    ) {
      addUpdate(
        "delegator_user_id",
        input.delegatorUserId
      );
    }

    if (
      input.delegateUserId !==
      undefined
    ) {
      addUpdate(
        "delegate_user_id",
        input.delegateUserId
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
      input.reason !==
      undefined
    ) {
      addUpdate(
        "reason",
        input.reason
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
        "NO_LEAVE_DELEGATION_UPDATE_FIELDS"
      );
    }

    parameters.push(
      delegationId,
      companyId
    );

    await connection.query(
      `
        UPDATE leave_approval_delegations

        SET ${assignments.join(
          ", "
        )}

        WHERE delegation_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectLeaveDelegationUsingConnection(
        connection,
        companyId,
        delegationId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_DELEGATION_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_approval_delegation_updated",

        tableName:
          "leave_approval_delegations",

        recordId:
          delegationId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/leave/approval-delegations/${delegationId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
 * Approval delegation deactivation
 * =========================================================
 */

export async function deactivateLeaveApprovalDelegationRecord(
  companyId: string,
  delegationId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveApprovalDelegationDatabaseRow | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockLeaveDelegation(
        connection,
        companyId,
        delegationId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      databaseBoolean(
        existing.is_active
      )
    ) {
      await connection.query(
        `
          UPDATE leave_approval_delegations

          SET is_active = 0

          WHERE delegation_id = ?
            AND company_id = ?
        `,
        [
          delegationId,
          companyId
        ]
      );
    }

    const deactivated =
      await selectLeaveDelegationUsingConnection(
        connection,
        companyId,
        delegationId
      );

    if (!deactivated) {
      throw new Error(
        "DEACTIVATED_LEAVE_DELEGATION_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_approval_delegation_deactivated",

        tableName:
          "leave_approval_delegations",

        recordId:
          delegationId,

        oldValues:
          existing,

        newValues:
          deactivated,

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/leave/approval-delegations/${delegationId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
 * Blackout-period lists and lookups
 * =========================================================
 */

export async function listLeaveBlackoutPeriodRecords(
  companyId: string,
  filters:
    LeaveBlackoutPeriodListFilters
): Promise<
  PaginatedLeaveGovernanceResult<
    LeaveBlackoutPeriodDatabaseRow
  >
> {
  const conditions: string[] = [
    "lbp.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.branchId) {
    conditions.push(
      "lbp.branch_id = ?"
    );

    parameters.push(
      filters.branchId
    );
  }

  if (filters.departmentId) {
    conditions.push(
      "lbp.department_id = ?"
    );

    parameters.push(
      filters.departmentId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "lbp.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (
    filters.restrictionType
  ) {
    conditions.push(
      "lbp.restriction_type = ?"
    );

    parameters.push(
      filters.restrictionType
    );
  }

  if (
    filters.isActive !==
    undefined
  ) {
    conditions.push(
      "lbp.is_active = ?"
    );

    parameters.push(
      filters.isActive
        ? 1
        : 0
    );
  }

  if (
    filters.overlappingDateFrom
  ) {
    conditions.push(
      "lbp.end_date >= ?"
    );

    parameters.push(
      filters.overlappingDateFrom
    );
  }

  if (
    filters.overlappingDateTo
  ) {
    conditions.push(
      "lbp.start_date <= ?"
    );

    parameters.push(
      filters.overlappingDateTo
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        lbp.blackout_name LIKE ?
        OR lbp.description LIKE ?
        OR b.branch_code LIKE ?
        OR b.branch_name LIKE ?
        OR d.department_code LIKE ?
        OR d.department_name LIKE ?
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lbp.restriction_type LIKE ?
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

        FROM leave_blackout_periods lbp

        LEFT JOIN branches b
            ON b.branch_id =
               lbp.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               lbp.department_id

        LEFT JOIN leave_types lt
            ON lt.leave_type_id =
               lbp.leave_type_id

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
        ${leaveBlackoutSelect}

        WHERE ${whereClause}

        ORDER BY
            lbp.start_date DESC,
            lbp.blackout_period_id DESC

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
        LeaveBlackoutPeriodDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function findLeaveBlackoutPeriodRecordById(
  companyId: string,
  blackoutPeriodId: string
): Promise<
  LeaveBlackoutPeriodDatabaseRow | null
> {
  const rows =
    await databasePool.query(
      `
        ${leaveBlackoutSelect}

        WHERE lbp.blackout_period_id = ?
          AND lbp.company_id = ?

        LIMIT 1
      `,
      [
        blackoutPeriodId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveBlackoutPeriodDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Blackout-period creation
 * =========================================================
 */

export async function createLeaveBlackoutPeriodRecord(
  input:
    CreateLeaveBlackoutPeriodRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveBlackoutPeriodDatabaseRow
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    if (
      input.endDate <
      input.startDate
    ) {
      throw new Error(
        "INVALID_LEAVE_BLACKOUT_DATES"
      );
    }

    await validateBlackoutScope(
      connection,
      {
        companyId:
          input.companyId,

        branchId:
          input.branchId,

        departmentId:
          input.departmentId,

        leaveTypeId:
          input.leaveTypeId
      }
    );

    if (input.isActive) {
      await assertNoDuplicateBlackoutOverlap(
        connection,
        {
          companyId:
            input.companyId,

          branchId:
            input.branchId,

          departmentId:
            input.departmentId,

          leaveTypeId:
            input.leaveTypeId,

          blackoutName:
            input.blackoutName,

          startDate:
            input.startDate,

          endDate:
            input.endDate,

          restrictionType:
            input.restrictionType,

          excludedBlackoutPeriodId:
            null
        }
      );
    }

    const result =
      await connection.query(
        `
          INSERT INTO leave_blackout_periods (
              company_id,
              branch_id,
              department_id,
              leave_type_id,
              blackout_name,
              description,
              start_date,
              end_date,
              restriction_type,
              exception_requires_approval,
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
              ?
          )
        `,
        [
          input.companyId,
          input.branchId,
          input.departmentId,
          input.leaveTypeId,
          input.blackoutName,
          input.description,
          input.startDate,
          input.endDate,
          input.restrictionType,

          input.exceptionRequiresApproval
            ? 1
            : 0,

          input.isActive
            ? 1
            : 0
        ]
      ) as unknown as InsertResult;

    const blackoutPeriodId =
      String(
        result.insertId
      );

    const created =
      await selectLeaveBlackoutUsingConnection(
        connection,
        input.companyId,
        blackoutPeriodId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_BLACKOUT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_blackout_period_created",

        tableName:
          "leave_blackout_periods",

        recordId:
          blackoutPeriodId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          "/api/v1/leave/blackout-periods",

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
 * Blackout-period update
 * =========================================================
 */

export async function updateLeaveBlackoutPeriodRecord(
  companyId: string,
  blackoutPeriodId: string,
  input:
    UpdateLeaveBlackoutPeriodRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveBlackoutPeriodDatabaseRow | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockLeaveBlackout(
        connection,
        companyId,
        blackoutPeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
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
        "INVALID_LEAVE_BLACKOUT_DATES"
      );
    }

    const finalBranchId =
      input.branchId !==
      undefined
        ? input.branchId
        : existing.branch_id ===
          null
          ? null
          : String(
              existing.branch_id
            );

    const finalDepartmentId =
      input.departmentId !==
      undefined
        ? input.departmentId
        : existing.department_id ===
          null
          ? null
          : String(
              existing.department_id
            );

    const finalLeaveTypeId =
      input.leaveTypeId !==
      undefined
        ? input.leaveTypeId
        : existing.leave_type_id ===
          null
          ? null
          : String(
              existing.leave_type_id
            );

    const finalBlackoutName =
      input.blackoutName ??
      existing.blackout_name;

    const finalStartDate =
      input.startDate ??
      existingStartDate;

    const finalEndDate =
      input.endDate ??
      existingEndDate;

    const finalRestrictionType =
      input.restrictionType ??
      existing.restriction_type;

    const finalIsActive =
      input.isActive ??
      databaseBoolean(
        existing.is_active
      );

    if (
      finalEndDate <
      finalStartDate
    ) {
      throw new Error(
        "INVALID_LEAVE_BLACKOUT_DATES"
      );
    }

    await validateBlackoutScope(
      connection,
      {
        companyId,

        branchId:
          finalBranchId,

        departmentId:
          finalDepartmentId,

        leaveTypeId:
          finalLeaveTypeId
      }
    );

    if (finalIsActive) {
      await assertNoDuplicateBlackoutOverlap(
        connection,
        {
          companyId,

          branchId:
            finalBranchId,

          departmentId:
            finalDepartmentId,

          leaveTypeId:
            finalLeaveTypeId,

          blackoutName:
            finalBlackoutName,

          startDate:
            finalStartDate,

          endDate:
            finalEndDate,

          restrictionType:
            finalRestrictionType,

          excludedBlackoutPeriodId:
            blackoutPeriodId
        }
      );
    }

    const assignments: string[] =
      [];

    const parameters: unknown[] =
      [];

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
      input.branchId !==
      undefined
    ) {
      addUpdate(
        "branch_id",
        input.branchId
      );
    }

    if (
      input.departmentId !==
      undefined
    ) {
      addUpdate(
        "department_id",
        input.departmentId
      );
    }

    if (
      input.leaveTypeId !==
      undefined
    ) {
      addUpdate(
        "leave_type_id",
        input.leaveTypeId
      );
    }

    if (
      input.blackoutName !==
      undefined
    ) {
      addUpdate(
        "blackout_name",
        input.blackoutName
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
      input.startDate !==
      undefined
    ) {
      addUpdate(
        "start_date",
        input.startDate
      );
    }

    if (
      input.endDate !==
      undefined
    ) {
      addUpdate(
        "end_date",
        input.endDate
      );
    }

    if (
      input.restrictionType !==
      undefined
    ) {
      addUpdate(
        "restriction_type",
        input.restrictionType
      );
    }

    if (
      input.exceptionRequiresApproval !==
      undefined
    ) {
      addUpdate(
        "exception_requires_approval",
        input.exceptionRequiresApproval
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
        "NO_LEAVE_BLACKOUT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      blackoutPeriodId,
      companyId
    );

    await connection.query(
      `
        UPDATE leave_blackout_periods

        SET ${assignments.join(
          ", "
        )}

        WHERE blackout_period_id = ?
          AND company_id = ?
      `,
      parameters
    );

    const updated =
      await selectLeaveBlackoutUsingConnection(
        connection,
        companyId,
        blackoutPeriodId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_BLACKOUT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_blackout_period_updated",

        tableName:
          "leave_blackout_periods",

        recordId:
          blackoutPeriodId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/leave/blackout-periods/${blackoutPeriodId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
 * Blackout-period deactivation
 * =========================================================
 */

export async function deactivateLeaveBlackoutPeriodRecord(
  companyId: string,
  blackoutPeriodId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveBlackoutPeriodDatabaseRow | null
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockLeaveBlackout(
        connection,
        companyId,
        blackoutPeriodId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      databaseBoolean(
        existing.is_active
      )
    ) {
      await connection.query(
        `
          UPDATE leave_blackout_periods

          SET is_active = 0

          WHERE blackout_period_id = ?
            AND company_id = ?
        `,
        [
          blackoutPeriodId,
          companyId
        ]
      );
    }

    const deactivated =
      await selectLeaveBlackoutUsingConnection(
        connection,
        companyId,
        blackoutPeriodId
      );

    if (!deactivated) {
      throw new Error(
        "DEACTIVATED_LEAVE_BLACKOUT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_blackout_period_deactivated",

        tableName:
          "leave_blackout_periods",

        recordId:
          blackoutPeriodId,

        oldValues:
          existing,

        newValues:
          deactivated,

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/leave/blackout-periods/${blackoutPeriodId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

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
 * Employee organizational scope
 * =========================================================
 */

async function findEmployeeScopeForDate(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  effectiveDate: string
): Promise<EmployeeScopeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            e.employee_id,
            e.company_id,

            ea.branch_id,
            ea.department_id

        FROM employees e

        LEFT JOIN employee_assignments ea
            ON ea.assignment_id = (
              SELECT assignment.assignment_id

              FROM employee_assignments assignment

              WHERE assignment.employee_id =
                    e.employee_id

                AND assignment.effective_from <= ?

                AND (
                  assignment.effective_to IS NULL
                  OR assignment.effective_to >= ?
                )

              ORDER BY
                  (
                    assignment.assignment_type =
                    'PRIMARY'
                  ) DESC,

                  assignment.is_current DESC,
                  assignment.effective_from DESC,
                  assignment.assignment_id DESC

              LIMIT 1
            )

        WHERE e.employee_id = ?
          AND e.company_id = ?
          AND e.is_active = 1
          AND e.deleted_at IS NULL

        LIMIT 1
      `,
      [
        effectiveDate,
        effectiveDate,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | EmployeeScopeRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Applicable blackout preview
 * =========================================================
 */

export async function findApplicableLeaveBlackoutPeriodRecords(
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string
): Promise<
  LeaveBlackoutPeriodDatabaseRow[]
> {
  const connection =
    await databasePool.getConnection();

  try {
    const employeeScope =
      await findEmployeeScopeForDate(
        connection,
        companyId,
        employeeId,
        startDate
      );

    if (!employeeScope) {
      throw new Error(
        "LEAVE_BLACKOUT_EMPLOYEE_NOT_FOUND"
      );
    }

    await assertCompanyLeaveType(
      connection,
      companyId,
      leaveTypeId
    );

    const branchId =
      employeeScope.branch_id ===
      null
        ? null
        : String(
            employeeScope.branch_id
          );

    const departmentId =
      employeeScope.department_id ===
      null
        ? null
        : String(
            employeeScope.department_id
          );

    const rows =
      await connection.query(
        `
          ${leaveBlackoutSelect}

          WHERE lbp.company_id = ?
            AND lbp.is_active = 1

            AND lbp.start_date <= ?
            AND lbp.end_date >= ?

            AND (
              lbp.branch_id IS NULL
              OR lbp.branch_id = ?
            )

            AND (
              lbp.department_id IS NULL
              OR lbp.department_id = ?
            )

            AND (
              lbp.leave_type_id IS NULL
              OR lbp.leave_type_id = ?
            )

          ORDER BY
              CASE
                WHEN lbp.restriction_type = 'BLOCK'
                THEN 0
                ELSE 1
              END,

              lbp.start_date ASC,
              lbp.blackout_period_id ASC
        `,
        [
          companyId,
          endDate,
          startDate,
          branchId,
          departmentId,
          leaveTypeId
        ]
      );

    return (
      rows as unknown as
        LeaveBlackoutPeriodDatabaseRow[]
    );
  } finally {
    connection.release();
  }
}
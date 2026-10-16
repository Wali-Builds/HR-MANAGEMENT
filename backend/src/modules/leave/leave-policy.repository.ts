import type { PoolConnection } from "mariadb";

import { databasePool } from "../../database/pool.js";

import type {
  AttendanceActor,
  RequestMetadata
} from "../attendance/attendance.types.js";

import type {
  CreateEmployeeLeavePolicyAssignmentRecord,
  CreateLeavePolicyRecord,
  CreateLeavePolicyRuleRecord,
  CreateLeaveTypeRecord,
  EmployeeLeavePolicyAssignmentDatabaseRow,
  LeavePolicyDatabaseRow,
  LeavePolicyRuleDatabaseRow,
  LeaveTypeDatabaseRow,
  UpdateEmployeeLeavePolicyAssignmentRecord,
  UpdateLeavePolicyRecord,
  UpdateLeavePolicyRuleRecord,
  UpdateLeaveTypeRecord
} from "./leave-policy.types.js";

/*
 * =========================================================
 * Internal types
 * =========================================================
 */

interface CountDatabaseRow {
  total_records: string | number | bigint;
}

interface InsertResult {
  insertId: string | number | bigint;
}

interface PaginatedResult<T> {
  records: T[];
  totalRecords: number;
}

interface LeaveTypeListFilters {
  unitType?: string | undefined;
  isPaid?: boolean | undefined;
  requiresApproval?: boolean | undefined;
  isActive?: boolean | undefined;
  includeInactive: boolean;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

interface LeavePolicyListFilters {
  effectiveOn?: string | undefined;
  isDefault?: boolean | undefined;
  isActive?: boolean | undefined;
  includeInactive: boolean;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

interface LeavePolicyRuleListFilters {
  leaveTypeId?: string | undefined;
  accrualMethod?: string | undefined;
  eligibleGender?: string | undefined;
  isActive?: boolean | undefined;
  includeInactive: boolean;
  search?: string | undefined;
  page: number;
  pageSize: number;
}

interface EmployeeLeavePolicyAssignmentListFilters {
  leavePolicyId?: string | undefined;
  isCurrent?: boolean | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  page: number;
  pageSize: number;
}

interface LockedLeaveTypeRow {
  leave_type_id: string | number | bigint;
  company_id: string | number | bigint;
  leave_type_code: string;
  leave_type_name: string;
  description: string | null;
  unit_type: string;
  is_paid: number | boolean;
  requires_approval: number | boolean;
  requires_attachment: number | boolean;
  display_color: string | null;
  sort_order: string | number;
  is_active: number | boolean;
  deleted_at: Date | string | null;
}

interface LockedLeavePolicyRow {
  leave_policy_id: string | number | bigint;
  company_id: string | number | bigint;
  policy_code: string;
  policy_name: string;
  description: string | null;
  effective_from: Date | string;
  effective_to: Date | string | null;
  is_default: number | boolean;
  is_active: number | boolean;
  deleted_at: Date | string | null;
}

interface LockedLeavePolicyRuleRow {
  leave_policy_rule_id: string | number | bigint;
  leave_policy_id: string | number | bigint;
  leave_type_id: string | number | bigint;
  annual_entitlement_units: string | number;
  accrual_method: string;
  accrual_units_per_period: string | number;
  accrual_start_after_days: string | number;
  prorate_entitlement: number | boolean;
  allow_during_probation: number | boolean;
  eligible_gender: string;
  minimum_request_units: string | number;
  maximum_request_units: string | number | null;
  minimum_notice_days: string | number;
  maximum_advance_days: string | number | null;
  maximum_backdate_days: string | number;
  allow_half_day: number | boolean;
  allow_hourly_leave: number | boolean;
  include_weekends: number | boolean;
  include_holidays: number | boolean;
  sandwich_rule_enabled: number | boolean;
  carry_forward_enabled: number | boolean;
  maximum_carry_forward_units: string | number | null;
  carry_forward_expiry_months: string | number | null;
  maximum_balance_units: string | number | null;
  allow_negative_balance: number | boolean;
  negative_balance_limit: string | number;
  attachment_required_after_units: string | number | null;
  encashment_allowed: number | boolean;
  maximum_encashment_units: string | number | null;
  approval_levels_required: string | number;
  is_active: number | boolean;
}

interface LockedEmployeeRow {
  employee_id: string | number | bigint;
  company_id: string | number | bigint;
  is_active: number | boolean;
  deleted_at: Date | string | null;
}

interface LockedEmployeeLeavePolicyAssignmentRow {
  assignment_id: string | number | bigint;
  employee_id: string | number | bigint;
  leave_policy_id: string | number | bigint;
  effective_from: Date | string;
  effective_to: Date | string | null;
  is_current: number | boolean;
  assigned_by_user_id: string | number | bigint | null;
  remarks: string | null;
}

/*
 * =========================================================
 * Helpers
 * =========================================================
 */

function databaseBoolean(
  value: number | boolean | null | undefined
): boolean {
  return value === true || Number(value) === 1;
}

function databaseDateOnly(
  value: Date | string | null
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

  // edited by wali: MariaDB DATE values are local calendar dates; avoid UTC conversion shifting the day.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function offsetFromPagination(
  page: number,
  pageSize: number
): number {
  return (page - 1) * pageSize;
}

function safeJson(value: unknown): string {
  const serialized = JSON.stringify(
    value,
    (_key, currentValue) => {
      if (typeof currentValue === "bigint") {
        return String(currentValue);
      }

      if (Buffer.isBuffer(currentValue)) {
        return "[REDACTED_BINARY]";
      }

      return currentValue;
    }
  );

  return serialized ?? "null";
}

function leaveTypeLogSummary(
  row: LeaveTypeDatabaseRow | LockedLeaveTypeRow
) {
  return {
    leaveTypeId: String(row.leave_type_id),
    companyId: String(row.company_id),
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: row.leave_type_name,
    unitType: row.unit_type,
    isPaid: databaseBoolean(row.is_paid),
    requiresApproval: databaseBoolean(row.requires_approval),
    requiresAttachment: databaseBoolean(row.requires_attachment),
    isActive: databaseBoolean(row.is_active)
  };
}

function leavePolicyLogSummary(
  row: LeavePolicyDatabaseRow | LockedLeavePolicyRow
) {
  return {
    leavePolicyId: String(row.leave_policy_id),
    companyId: String(row.company_id),
    policyCode: row.policy_code,
    policyName: row.policy_name,
    effectiveFrom: databaseDateOnly(row.effective_from),
    effectiveTo: databaseDateOnly(row.effective_to),
    isDefault: databaseBoolean(row.is_default),
    isActive: databaseBoolean(row.is_active)
  };
}

function leavePolicyRuleLogSummary(
  row:
    | LeavePolicyRuleDatabaseRow
    | LockedLeavePolicyRuleRow
) {
  return {
    leavePolicyRuleId: String(
      row.leave_policy_rule_id
    ),
    leavePolicyId: String(row.leave_policy_id),
    leaveTypeId: String(row.leave_type_id),
    annualEntitlementUnits: Number(
      row.annual_entitlement_units
    ),
    accrualMethod: row.accrual_method,
    accrualUnitsPerPeriod: Number(
      row.accrual_units_per_period
    ),
    eligibleGender: row.eligible_gender,
    carryForwardEnabled: databaseBoolean(
      row.carry_forward_enabled
    ),
    allowNegativeBalance: databaseBoolean(
      row.allow_negative_balance
    ),
    encashmentAllowed: databaseBoolean(
      row.encashment_allowed
    ),
    isActive: databaseBoolean(row.is_active)
  };
}

function assignmentLogSummary(
  row:
    | EmployeeLeavePolicyAssignmentDatabaseRow
    | LockedEmployeeLeavePolicyAssignmentRow
) {
  return {
    assignmentId: String(row.assignment_id),
    employeeId: String(row.employee_id),
    leavePolicyId: String(row.leave_policy_id),
    effectiveFrom: databaseDateOnly(
      row.effective_from
    ),
    effectiveTo: databaseDateOnly(row.effective_to),
    isCurrent: databaseBoolean(row.is_current),
    remarks: row.remarks
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
    oldValues?: unknown | undefined;
    newValues?: unknown | undefined;
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
 * Reusable SELECT statements
 * =========================================================
 */

const leaveTypeSelect = `
  SELECT
      lt.leave_type_id,
      lt.company_id,
      lt.leave_type_code,
      lt.leave_type_name,
      lt.description,
      lt.unit_type,
      lt.is_paid,
      lt.requires_approval,
      lt.requires_attachment,
      lt.display_color,
      lt.sort_order,
      lt.is_active,
      lt.deleted_at,

      (
        SELECT COUNT(*)
        FROM leave_policy_rules lpr_count
        WHERE lpr_count.leave_type_id =
              lt.leave_type_id
      ) AS policy_rule_count,

      lt.created_at,
      lt.updated_at

  FROM leave_types lt
`;

const leavePolicySelect = `
  SELECT
      lp.leave_policy_id,
      lp.company_id,
      lp.policy_code,
      lp.policy_name,
      lp.description,
      lp.effective_from,
      lp.effective_to,
      lp.is_default,
      lp.is_active,
      lp.deleted_at,

      (
        SELECT COUNT(*)
        FROM leave_policy_rules lpr_count
        WHERE lpr_count.leave_policy_id =
              lp.leave_policy_id
      ) AS rule_count,

      (
        SELECT COUNT(*)
        FROM employee_leave_policy_assignments elpa_count
        WHERE elpa_count.leave_policy_id =
              lp.leave_policy_id
      ) AS assignment_count,

      (
        SELECT COUNT(*)
        FROM employee_leave_policy_assignments elpa_current
        WHERE elpa_current.leave_policy_id =
              lp.leave_policy_id
          AND elpa_current.is_current = 1
      ) AS current_assignment_count,

      lp.created_at,
      lp.updated_at

  FROM leave_policies lp
`;

const leavePolicyRuleSelect = `
  SELECT
      lpr.leave_policy_rule_id,
      lpr.leave_policy_id,
      lpr.leave_type_id,

      lp.company_id,
      lp.policy_code,
      lp.policy_name,

      lt.leave_type_code,
      lt.leave_type_name,
      lt.unit_type,
      lt.is_paid AS leave_type_is_paid,

      lpr.annual_entitlement_units,
      lpr.accrual_method,
      lpr.accrual_units_per_period,
      lpr.accrual_start_after_days,
      lpr.prorate_entitlement,
      lpr.allow_during_probation,
      lpr.eligible_gender,
      lpr.minimum_request_units,
      lpr.maximum_request_units,
      lpr.minimum_notice_days,
      lpr.maximum_advance_days,
      lpr.maximum_backdate_days,
      lpr.allow_half_day,
      lpr.allow_hourly_leave,
      lpr.include_weekends,
      lpr.include_holidays,
      lpr.sandwich_rule_enabled,
      lpr.carry_forward_enabled,
      lpr.maximum_carry_forward_units,
      lpr.carry_forward_expiry_months,
      lpr.maximum_balance_units,
      lpr.allow_negative_balance,
      lpr.negative_balance_limit,
      lpr.attachment_required_after_units,
      lpr.encashment_allowed,
      lpr.maximum_encashment_units,
      lpr.approval_levels_required,
      lpr.is_active,
      lpr.created_at,
      lpr.updated_at

  FROM leave_policy_rules lpr

  INNER JOIN leave_policies lp
      ON lp.leave_policy_id =
         lpr.leave_policy_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         lpr.leave_type_id
`;

const assignmentSelect = `
  SELECT
      elpa.assignment_id,

      e.company_id,
      elpa.employee_id,

      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      elpa.leave_policy_id,
      lp.policy_code,
      lp.policy_name,

      lp.is_default
          AS policy_is_default,

      lp.is_active
          AS policy_is_active,

      elpa.effective_from,
      elpa.effective_to,
      elpa.is_current,
      elpa.assigned_by_user_id,
      elpa.remarks,
      elpa.created_at,
      elpa.updated_at

  FROM employee_leave_policy_assignments elpa

  INNER JOIN employees e
      ON e.employee_id =
         elpa.employee_id

  INNER JOIN leave_policies lp
      ON lp.leave_policy_id =
         elpa.leave_policy_id
`;

/*
 * =========================================================
 * Locking helpers
 * =========================================================
 */

async function lockLeaveType(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<LockedLeaveTypeRow | null> {
  const rows = await connection.query(
    `
      SELECT
          leave_type_id,
          company_id,
          leave_type_code,
          leave_type_name,
          description,
          unit_type,
          is_paid,
          requires_approval,
          requires_attachment,
          display_color,
          sort_order,
          is_active,
          deleted_at
      FROM leave_types
      WHERE leave_type_id = ?
        AND company_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [leaveTypeId, companyId]
  );

  return (
    (rows[0] as LockedLeaveTypeRow | undefined) ??
    null
  );
}

async function lockLeavePolicy(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string
): Promise<LockedLeavePolicyRow | null> {
  const rows = await connection.query(
    `
      SELECT
          leave_policy_id,
          company_id,
          policy_code,
          policy_name,
          description,
          effective_from,
          effective_to,
          is_default,
          is_active,
          deleted_at
      FROM leave_policies
      WHERE leave_policy_id = ?
        AND company_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [leavePolicyId, companyId]
  );

  return (
    (rows[0] as LockedLeavePolicyRow | undefined) ??
    null
  );
}

async function lockLeavePolicyRule(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string,
  leavePolicyRuleId: string
): Promise<LockedLeavePolicyRuleRow | null> {
  const rows = await connection.query(
    `
      SELECT
          lpr.leave_policy_rule_id,
          lpr.leave_policy_id,
          lpr.leave_type_id,
          lpr.annual_entitlement_units,
          lpr.accrual_method,
          lpr.accrual_units_per_period,
          lpr.accrual_start_after_days,
          lpr.prorate_entitlement,
          lpr.allow_during_probation,
          lpr.eligible_gender,
          lpr.minimum_request_units,
          lpr.maximum_request_units,
          lpr.minimum_notice_days,
          lpr.maximum_advance_days,
          lpr.maximum_backdate_days,
          lpr.allow_half_day,
          lpr.allow_hourly_leave,
          lpr.include_weekends,
          lpr.include_holidays,
          lpr.sandwich_rule_enabled,
          lpr.carry_forward_enabled,
          lpr.maximum_carry_forward_units,
          lpr.carry_forward_expiry_months,
          lpr.maximum_balance_units,
          lpr.allow_negative_balance,
          lpr.negative_balance_limit,
          lpr.attachment_required_after_units,
          lpr.encashment_allowed,
          lpr.maximum_encashment_units,
          lpr.approval_levels_required,
          lpr.is_active

      FROM leave_policy_rules lpr

      INNER JOIN leave_policies lp
          ON lp.leave_policy_id =
             lpr.leave_policy_id

      WHERE lpr.leave_policy_rule_id = ?
        AND lpr.leave_policy_id = ?
        AND lp.company_id = ?
        AND lp.deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [
      leavePolicyRuleId,
      leavePolicyId,
      companyId
    ]
  );

  return (
    (
      rows[0] as
        | LockedLeavePolicyRuleRow
        | undefined
    ) ?? null
  );
}

async function lockEmployee(
  connection: PoolConnection,
  companyId: string,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows = await connection.query(
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
    [employeeId, companyId]
  );

  return (
    (rows[0] as LockedEmployeeRow | undefined) ??
    null
  );
}

async function lockEmployeeAssignment(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<LockedEmployeeLeavePolicyAssignmentRow | null> {
  const rows = await connection.query(
    `
      SELECT
          elpa.assignment_id,
          elpa.employee_id,
          elpa.leave_policy_id,
          elpa.effective_from,
          elpa.effective_to,
          elpa.is_current,
          elpa.assigned_by_user_id,
          elpa.remarks

      FROM employee_leave_policy_assignments elpa

      INNER JOIN employees e
          ON e.employee_id =
             elpa.employee_id

      WHERE elpa.assignment_id = ?
        AND elpa.employee_id = ?
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
    (
      rows[0] as
        | LockedEmployeeLeavePolicyAssignmentRow
        | undefined
    ) ?? null
  );
}

async function assertLeaveTypeBelongsToCompany(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string
): Promise<LockedLeaveTypeRow> {
  const leaveType = await lockLeaveType(
    connection,
    companyId,
    leaveTypeId
  );

  if (!leaveType) {
    throw new Error("LEAVE_TYPE_NOT_FOUND");
  }

  return leaveType;
}

async function assertLeavePolicyBelongsToCompany(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string
): Promise<LockedLeavePolicyRow> {
  const policy = await lockLeavePolicy(
    connection,
    companyId,
    leavePolicyId
  );

  if (!policy) {
    throw new Error("LEAVE_POLICY_NOT_FOUND");
  }

  return policy;
}

async function assertActiveLeavePolicy(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string
): Promise<LockedLeavePolicyRow> {
  const policy =
    await assertLeavePolicyBelongsToCompany(
      connection,
      companyId,
      leavePolicyId
    );

  if (!databaseBoolean(policy.is_active)) {
    throw new Error("LEAVE_POLICY_INACTIVE");
  }

  return policy;
}

async function assertAssignmentWithinPolicyDates(
  policy: LockedLeavePolicyRow,
  effectiveFrom: string,
  effectiveTo: string | null
): Promise<void> {
  const policyFrom = databaseDateOnly(
    policy.effective_from
  );

  const policyTo = databaseDateOnly(
    policy.effective_to
  );

  if (!policyFrom) {
    throw new Error("INVALID_LEAVE_POLICY_DATE");
  }

  if (effectiveFrom < policyFrom) {
    throw new Error(
      "ASSIGNMENT_BEFORE_LEAVE_POLICY_START"
    );
  }

  if (
    policyTo !== null &&
    (
      effectiveTo === null ||
      effectiveTo > policyTo
    )
  ) {
    throw new Error(
      "ASSIGNMENT_AFTER_LEAVE_POLICY_END"
    );
  }
}

async function assertNoDuplicatePolicyRule(
  connection: PoolConnection,
  leavePolicyId: string,
  leaveTypeId: string,
  excludedRuleId: string | null
): Promise<void> {
  const parameters: unknown[] = [
    leavePolicyId,
    leaveTypeId
  ];

  let exclusionClause = "";

  if (excludedRuleId !== null) {
    exclusionClause = `
      AND leave_policy_rule_id <> ?
    `;

    parameters.push(excludedRuleId);
  }

  const rows = await connection.query(
    `
      SELECT leave_policy_rule_id
      FROM leave_policy_rules
      WHERE leave_policy_id = ?
        AND leave_type_id = ?
        ${exclusionClause}
      LIMIT 1
      FOR UPDATE
    `,
    parameters
  );

  if (rows.length > 0) {
    throw new Error(
      "DUPLICATE_LEAVE_POLICY_RULE"
    );
  }
}

async function assertNoAssignmentOverlap(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  excludedAssignmentId: string | null
): Promise<void> {
  const parameters: unknown[] = [
    employeeId,
    effectiveTo ?? "9999-12-31",
    effectiveFrom
  ];

  let exclusionClause = "";

  if (excludedAssignmentId !== null) {
    exclusionClause = `
      AND assignment_id <> ?
    `;

    parameters.push(excludedAssignmentId);
  }

  const rows = await connection.query(
    `
      SELECT assignment_id
      FROM employee_leave_policy_assignments
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

  if (rows.length > 0) {
    throw new Error(
      "LEAVE_POLICY_ASSIGNMENT_DATE_OVERLAP"
    );
  }
}

async function clearOtherCurrentAssignments(
  connection: PoolConnection,
  employeeId: string,
  excludedAssignmentId: string | null
): Promise<void> {
  const parameters: unknown[] = [employeeId];

  let exclusionClause = "";

  if (excludedAssignmentId !== null) {
    exclusionClause = `
      AND assignment_id <> ?
    `;

    parameters.push(excludedAssignmentId);
  }

  await connection.query(
    `
      UPDATE employee_leave_policy_assignments
      SET is_current = 0
      WHERE employee_id = ?
        ${exclusionClause}
    `,
    parameters
  );
}

async function refreshCurrentAssignment(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE employee_leave_policy_assignments
      SET is_current = 0
      WHERE employee_id = ?
    `,
    [employeeId]
  );

  const rows = await connection.query(
    `
      SELECT
          elpa.assignment_id

      FROM employee_leave_policy_assignments elpa

      INNER JOIN leave_policies lp
          ON lp.leave_policy_id =
             elpa.leave_policy_id

      WHERE elpa.employee_id = ?
        AND elpa.effective_from <= CURRENT_DATE
        AND (
          elpa.effective_to IS NULL
          OR elpa.effective_to >= CURRENT_DATE
        )
        AND lp.effective_from <= CURRENT_DATE
        AND (
          lp.effective_to IS NULL
          OR lp.effective_to >= CURRENT_DATE
        )
        AND lp.is_active = 1
        AND lp.deleted_at IS NULL

      ORDER BY
          elpa.effective_from DESC,
          elpa.assignment_id DESC

      LIMIT 1
      FOR UPDATE
    `,
    [employeeId]
  );

  const current = rows[0] as
    | {
        assignment_id:
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
      UPDATE employee_leave_policy_assignments
      SET is_current = 1
      WHERE assignment_id = ?
    `,
    [String(current.assignment_id)]
  );
}

/*
 * =========================================================
 * Connection-based lookup helpers
 * =========================================================
 */

async function selectLeaveTypeUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leaveTypeId: string,
  includeDeleted = false
): Promise<LeaveTypeDatabaseRow | null> {
  const rows = await connection.query(
    `
      ${leaveTypeSelect}
      WHERE lt.leave_type_id = ?
        AND lt.company_id = ?
        ${
          includeDeleted
            ? ""
            : "AND lt.deleted_at IS NULL"
        }
      LIMIT 1
    `,
    [leaveTypeId, companyId]
  );

  return (
    (rows[0] as LeaveTypeDatabaseRow | undefined) ??
    null
  );
}

async function selectLeavePolicyUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string,
  includeDeleted = false
): Promise<LeavePolicyDatabaseRow | null> {
  const rows = await connection.query(
    `
      ${leavePolicySelect}
      WHERE lp.leave_policy_id = ?
        AND lp.company_id = ?
        ${
          includeDeleted
            ? ""
            : "AND lp.deleted_at IS NULL"
        }
      LIMIT 1
    `,
    [leavePolicyId, companyId]
  );

  return (
    (
      rows[0] as
        | LeavePolicyDatabaseRow
        | undefined
    ) ?? null
  );
}

async function selectLeavePolicyRuleUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leavePolicyId: string,
  leavePolicyRuleId: string
): Promise<LeavePolicyRuleDatabaseRow | null> {
  const rows = await connection.query(
    `
      ${leavePolicyRuleSelect}
      WHERE lpr.leave_policy_rule_id = ?
        AND lpr.leave_policy_id = ?
        AND lp.company_id = ?
        AND lp.deleted_at IS NULL
        AND lt.deleted_at IS NULL
      LIMIT 1
    `,
    [
      leavePolicyRuleId,
      leavePolicyId,
      companyId
    ]
  );

  return (
    (
      rows[0] as
        | LeavePolicyRuleDatabaseRow
        | undefined
    ) ?? null
  );
}

async function selectAssignmentUsingConnection(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow | null> {
  const rows = await connection.query(
    `
      ${assignmentSelect}
      WHERE elpa.assignment_id = ?
        AND elpa.employee_id = ?
        AND e.company_id = ?
        AND e.deleted_at IS NULL
        AND lp.deleted_at IS NULL
      LIMIT 1
    `,
    [
      assignmentId,
      employeeId,
      companyId
    ]
  );

  return (
    (
      rows[0] as
        | EmployeeLeavePolicyAssignmentDatabaseRow
        | undefined
    ) ?? null
  );
}

/*
 * =========================================================
 * Leave types
 * =========================================================
 */

export async function listLeaveTypeRecords(
  companyId: string,
  filters: LeaveTypeListFilters
): Promise<PaginatedResult<LeaveTypeDatabaseRow>> {
  const conditions = [
    "lt.company_id = ?",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [companyId];

  if (filters.unitType) {
    conditions.push("lt.unit_type = ?");
    parameters.push(filters.unitType);
  }

  if (filters.isPaid !== undefined) {
    conditions.push("lt.is_paid = ?");
    parameters.push(filters.isPaid ? 1 : 0);
  }

  if (
    filters.requiresApproval !== undefined
  ) {
    conditions.push(
      "lt.requires_approval = ?"
    );

    parameters.push(
      filters.requiresApproval ? 1 : 0
    );
  }

  if (filters.isActive !== undefined) {
    conditions.push("lt.is_active = ?");
    parameters.push(filters.isActive ? 1 : 0);
  } else if (!filters.includeInactive) {
    conditions.push("lt.is_active = 1");
  }

  if (filters.search) {
    const search = `%${filters.search}%`;

    conditions.push(`
      (
        lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lt.description LIKE ?
      )
    `);

    parameters.push(search, search, search);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(*) AS total_records
      FROM leave_types lt
      WHERE ${whereClause}
    `,
    parameters
  );

  const countRow = countRows[0] as
    | CountDatabaseRow
    | undefined;

  const rows = await databasePool.query(
    `
      ${leaveTypeSelect}
      WHERE ${whereClause}
      ORDER BY
          lt.sort_order ASC,
          lt.leave_type_name ASC,
          lt.leave_type_id ASC
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
    records: rows as unknown as LeaveTypeDatabaseRow[],
    totalRecords: Number(
      countRow?.total_records ?? 0
    )
  };
}

export async function findLeaveTypeRecordById(
  companyId: string,
  leaveTypeId: string
): Promise<LeaveTypeDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${leaveTypeSelect}
      WHERE lt.leave_type_id = ?
        AND lt.company_id = ?
        AND lt.deleted_at IS NULL
      LIMIT 1
    `,
    [leaveTypeId, companyId]
  );

  return (
    (rows[0] as LeaveTypeDatabaseRow | undefined) ??
    null
  );
}

export async function createLeaveTypeRecord(
  input: CreateLeaveTypeRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveTypeDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const result = (await connection.query(
      `
        INSERT INTO leave_types (
            company_id,
            leave_type_code,
            leave_type_name,
            description,
            unit_type,
            is_paid,
            requires_approval,
            requires_attachment,
            display_color,
            sort_order,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.companyId,
        input.leaveTypeCode,
        input.leaveTypeName,
        input.description,
        input.unitType,
        input.isPaid ? 1 : 0,
        input.requiresApproval ? 1 : 0,
        input.requiresAttachment ? 1 : 0,
        input.displayColor,
        input.sortOrder,
        input.isActive ? 1 : 0
      ]
    )) as unknown as InsertResult;

    const leaveTypeId = String(result.insertId);

    const created =
      await selectLeaveTypeUsingConnection(
        connection,
        input.companyId,
        leaveTypeId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_TYPE_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId: input.companyId,
      actor,
      actionName: "leave_type_created",
      tableName: "leave_types",
      recordId: leaveTypeId,
      newValues: leaveTypeLogSummary(created),
      requestMethod: "POST",
      requestPath: "/api/v1/leave/types",
      metadata
    });

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

export async function updateLeaveTypeRecord(
  companyId: string,
  leaveTypeId: string,
  input: UpdateLeaveTypeRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveTypeDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeaveType(
      connection,
      companyId,
      leaveTypeId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      parameters.push(value);
    };

    if (input.leaveTypeCode !== undefined) {
      addUpdate(
        "leave_type_code",
        input.leaveTypeCode
      );
    }

    if (input.leaveTypeName !== undefined) {
      addUpdate(
        "leave_type_name",
        input.leaveTypeName
      );
    }

    if (input.description !== undefined) {
      addUpdate("description", input.description);
    }

    if (input.unitType !== undefined) {
      addUpdate("unit_type", input.unitType);
    }

    if (input.isPaid !== undefined) {
      addUpdate("is_paid", input.isPaid ? 1 : 0);
    }

    if (
      input.requiresApproval !== undefined
    ) {
      addUpdate(
        "requires_approval",
        input.requiresApproval ? 1 : 0
      );
    }

    if (
      input.requiresAttachment !== undefined
    ) {
      addUpdate(
        "requires_attachment",
        input.requiresAttachment ? 1 : 0
      );
    }

    if (input.displayColor !== undefined) {
      addUpdate(
        "display_color",
        input.displayColor
      );
    }

    if (input.sortOrder !== undefined) {
      addUpdate("sort_order", input.sortOrder);
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_LEAVE_TYPE_UPDATE_FIELDS"
      );
    }

    parameters.push(leaveTypeId, companyId);

    await connection.query(
      `
        UPDATE leave_types
        SET ${assignments.join(", ")}
        WHERE leave_type_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    if (input.isActive === false) {
      await connection.query(
        `
          UPDATE leave_policy_rules
          SET is_active = 0
          WHERE leave_type_id = ?
        `,
        [leaveTypeId]
      );
    }

    const updated =
      await selectLeaveTypeUsingConnection(
        connection,
        companyId,
        leaveTypeId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_TYPE_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_type_updated",
      tableName: "leave_types",
      recordId: leaveTypeId,
      oldValues: leaveTypeLogSummary(existing),
      newValues: leaveTypeLogSummary(updated),
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/leave/types/${leaveTypeId}`,
      metadata
    });

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

export async function softDeleteLeaveTypeRecord(
  companyId: string,
  leaveTypeId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveTypeDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeaveType(
      connection,
      companyId,
      leaveTypeId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    await connection.query(
      `
        UPDATE leave_policy_rules
        SET is_active = 0
        WHERE leave_type_id = ?
      `,
      [leaveTypeId]
    );

    await connection.query(
      `
        UPDATE leave_types
        SET
            is_active = 0,
            deleted_at = CURRENT_TIMESTAMP
        WHERE leave_type_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [leaveTypeId, companyId]
    );

    const deleted =
      await selectLeaveTypeUsingConnection(
        connection,
        companyId,
        leaveTypeId,
        true
      );

    if (!deleted) {
      throw new Error(
        "DELETED_LEAVE_TYPE_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_type_deleted",
      tableName: "leave_types",
      recordId: leaveTypeId,
      oldValues: leaveTypeLogSummary(existing),
      newValues: leaveTypeLogSummary(deleted),
      requestMethod: "DELETE",
      requestPath:
        `/api/v1/leave/types/${leaveTypeId}`,
      metadata
    });

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
 * Leave policies
 * =========================================================
 */

export async function listLeavePolicyRecords(
  companyId: string,
  filters: LeavePolicyListFilters
): Promise<PaginatedResult<LeavePolicyDatabaseRow>> {
  const conditions = [
    "lp.company_id = ?",
    "lp.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [companyId];

  if (filters.effectiveOn) {
    conditions.push("lp.effective_from <= ?");
    conditions.push(`
      (
        lp.effective_to IS NULL
        OR lp.effective_to >= ?
      )
    `);

    parameters.push(
      filters.effectiveOn,
      filters.effectiveOn
    );
  }

  if (filters.isDefault !== undefined) {
    conditions.push("lp.is_default = ?");
    parameters.push(
      filters.isDefault ? 1 : 0
    );
  }

  if (filters.isActive !== undefined) {
    conditions.push("lp.is_active = ?");
    parameters.push(filters.isActive ? 1 : 0);
  } else if (!filters.includeInactive) {
    conditions.push("lp.is_active = 1");
  }

  if (filters.search) {
    const search = `%${filters.search}%`;

    conditions.push(`
      (
        lp.policy_code LIKE ?
        OR lp.policy_name LIKE ?
        OR lp.description LIKE ?
      )
    `);

    parameters.push(search, search, search);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(*) AS total_records
      FROM leave_policies lp
      WHERE ${whereClause}
    `,
    parameters
  );

  const countRow = countRows[0] as
    | CountDatabaseRow
    | undefined;

  const rows = await databasePool.query(
    `
      ${leavePolicySelect}
      WHERE ${whereClause}
      ORDER BY
          lp.is_default DESC,
          lp.effective_from DESC,
          lp.policy_name ASC,
          lp.leave_policy_id ASC
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
      rows as unknown as LeavePolicyDatabaseRow[],
    totalRecords: Number(
      countRow?.total_records ?? 0
    )
  };
}

export async function findLeavePolicyRecordById(
  companyId: string,
  leavePolicyId: string
): Promise<LeavePolicyDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${leavePolicySelect}
      WHERE lp.leave_policy_id = ?
        AND lp.company_id = ?
        AND lp.deleted_at IS NULL
      LIMIT 1
    `,
    [leavePolicyId, companyId]
  );

  return (
    (
      rows[0] as
        | LeavePolicyDatabaseRow
        | undefined
    ) ?? null
  );
}

export async function findDefaultLeavePolicyRecord(
  companyId: string,
  asOfDate: string
): Promise<LeavePolicyDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${leavePolicySelect}
      WHERE lp.company_id = ?
        AND lp.is_default = 1
        AND lp.is_active = 1
        AND lp.deleted_at IS NULL
        AND lp.effective_from <= ?
        AND (
          lp.effective_to IS NULL
          OR lp.effective_to >= ?
        )
      ORDER BY
          lp.effective_from DESC,
          lp.leave_policy_id DESC
      LIMIT 1
    `,
    [companyId, asOfDate, asOfDate]
  );

  return (
    (
      rows[0] as
        | LeavePolicyDatabaseRow
        | undefined
    ) ?? null
  );
}

// edited by wali: Read the tenant timezone so effective leave dates follow its business day, not server UTC.
export async function findCompanyTimezone(companyId: string): Promise<string | null> {
  const rows = await databasePool.query(
    `
      SELECT timezone
      FROM companies
      WHERE company_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [companyId]
  );

  const row = rows[0] as { timezone: string | null } | undefined;
  return row?.timezone ?? null;
}

export async function createLeavePolicyRecord(
  input: CreateLeavePolicyRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (input.isDefault && !input.isActive) {
      throw new Error(
        "INACTIVE_DEFAULT_LEAVE_POLICY"
      );
    }

    if (input.isDefault) {
      await connection.query(
        `
          UPDATE leave_policies
          SET is_default = 0
          WHERE company_id = ?
            AND deleted_at IS NULL
        `,
        [input.companyId]
      );
    }

    const result = (await connection.query(
      `
        INSERT INTO leave_policies (
            company_id,
            policy_code,
            policy_name,
            description,
            effective_from,
            effective_to,
            is_default,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.companyId,
        input.policyCode,
        input.policyName,
        input.description,
        input.effectiveFrom,
        input.effectiveTo,
        input.isDefault ? 1 : 0,
        input.isActive ? 1 : 0
      ]
    )) as unknown as InsertResult;

    const leavePolicyId = String(result.insertId);

    const created =
      await selectLeavePolicyUsingConnection(
        connection,
        input.companyId,
        leavePolicyId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId: input.companyId,
      actor,
      actionName: "leave_policy_created",
      tableName: "leave_policies",
      recordId: leavePolicyId,
      newValues: leavePolicyLogSummary(created),
      requestMethod: "POST",
      requestPath: "/api/v1/leave/policies",
      metadata
    });

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

export async function updateLeavePolicyRecord(
  companyId: string,
  leavePolicyId: string,
  input: UpdateLeavePolicyRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeavePolicy(
      connection,
      companyId,
      leavePolicyId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const finalIsDefault =
      input.isDefault ??
      databaseBoolean(existing.is_default);

    const finalIsActive =
      input.isActive ??
      databaseBoolean(existing.is_active);

    if (finalIsDefault && !finalIsActive) {
      throw new Error(
        "INACTIVE_DEFAULT_LEAVE_POLICY"
      );
    }

    if (input.isDefault === true) {
      await connection.query(
        `
          UPDATE leave_policies
          SET is_default = 0
          WHERE company_id = ?
            AND leave_policy_id <> ?
            AND deleted_at IS NULL
        `,
        [companyId, leavePolicyId]
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      parameters.push(value);
    };

    if (input.policyCode !== undefined) {
      addUpdate("policy_code", input.policyCode);
    }

    if (input.policyName !== undefined) {
      addUpdate("policy_name", input.policyName);
    }

    if (input.description !== undefined) {
      addUpdate("description", input.description);
    }

    if (input.effectiveFrom !== undefined) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (input.effectiveTo !== undefined) {
      addUpdate("effective_to", input.effectiveTo);
    }

    if (input.isDefault !== undefined) {
      addUpdate(
        "is_default",
        input.isDefault ? 1 : 0
      );
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_LEAVE_POLICY_UPDATE_FIELDS"
      );
    }

    parameters.push(leavePolicyId, companyId);

    await connection.query(
      `
        UPDATE leave_policies
        SET ${assignments.join(", ")}
        WHERE leave_policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    if (input.isActive === false) {
      await connection.query(
        `
          UPDATE leave_policy_rules
          SET is_active = 0
          WHERE leave_policy_id = ?
        `,
        [leavePolicyId]
      );
    }

    const updated =
      await selectLeavePolicyUsingConnection(
        connection,
        companyId,
        leavePolicyId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_policy_updated",
      tableName: "leave_policies",
      recordId: leavePolicyId,
      oldValues: leavePolicyLogSummary(existing),
      newValues: leavePolicyLogSummary(updated),
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/leave/policies/${leavePolicyId}`,
      metadata
    });

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

export async function softDeleteLeavePolicyRecord(
  companyId: string,
  leavePolicyId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeavePolicy(
      connection,
      companyId,
      leavePolicyId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const countRows = await connection.query(
      `
        SELECT COUNT(*) AS total_records
        FROM employee_leave_policy_assignments
        WHERE leave_policy_id = ?
          AND is_current = 1
      `,
      [leavePolicyId]
    );

    const countRow = countRows[0] as
      | CountDatabaseRow
      | undefined;

    if (
      Number(countRow?.total_records ?? 0) > 0
    ) {
      throw new Error(
        "LEAVE_POLICY_HAS_CURRENT_ASSIGNMENTS"
      );
    }

    await connection.query(
      `
        UPDATE leave_policy_rules
        SET is_active = 0
        WHERE leave_policy_id = ?
      `,
      [leavePolicyId]
    );

    await connection.query(
      `
        UPDATE leave_policies
        SET
            is_default = 0,
            is_active = 0,
            deleted_at = CURRENT_TIMESTAMP
        WHERE leave_policy_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [leavePolicyId, companyId]
    );

    const deleted =
      await selectLeavePolicyUsingConnection(
        connection,
        companyId,
        leavePolicyId,
        true
      );

    if (!deleted) {
      throw new Error(
        "DELETED_LEAVE_POLICY_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_policy_deleted",
      tableName: "leave_policies",
      recordId: leavePolicyId,
      oldValues: leavePolicyLogSummary(existing),
      newValues: leavePolicyLogSummary(deleted),
      requestMethod: "DELETE",
      requestPath:
        `/api/v1/leave/policies/${leavePolicyId}`,
      metadata
    });

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
 * Leave policy rules
 * =========================================================
 */

export async function listLeavePolicyRuleRecords(
  companyId: string,
  leavePolicyId: string,
  filters: LeavePolicyRuleListFilters
): Promise<
  PaginatedResult<LeavePolicyRuleDatabaseRow>
> {
  const conditions = [
    "lp.company_id = ?",
    "lpr.leave_policy_id = ?",
    "lp.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    leavePolicyId
  ];

  if (filters.leaveTypeId) {
    conditions.push("lpr.leave_type_id = ?");
    parameters.push(filters.leaveTypeId);
  }

  if (filters.accrualMethod) {
    conditions.push("lpr.accrual_method = ?");
    parameters.push(filters.accrualMethod);
  }

  if (filters.eligibleGender) {
    conditions.push("lpr.eligible_gender = ?");
    parameters.push(filters.eligibleGender);
  }

  if (filters.isActive !== undefined) {
    conditions.push("lpr.is_active = ?");
    parameters.push(filters.isActive ? 1 : 0);
  } else if (!filters.includeInactive) {
    conditions.push("lpr.is_active = 1");
  }

  if (filters.search) {
    const search = `%${filters.search}%`;

    conditions.push(`
      (
        lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lpr.accrual_method LIKE ?
        OR lpr.eligible_gender LIKE ?
      )
    `);

    parameters.push(
      search,
      search,
      search,
      search
    );
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(*) AS total_records

      FROM leave_policy_rules lpr

      INNER JOIN leave_policies lp
          ON lp.leave_policy_id =
             lpr.leave_policy_id

      INNER JOIN leave_types lt
          ON lt.leave_type_id =
             lpr.leave_type_id

      WHERE ${whereClause}
    `,
    parameters
  );

  const countRow = countRows[0] as
    | CountDatabaseRow
    | undefined;

  const rows = await databasePool.query(
    `
      ${leavePolicyRuleSelect}
      WHERE ${whereClause}
      ORDER BY
          lt.sort_order ASC,
          lt.leave_type_name ASC,
          lpr.leave_policy_rule_id ASC
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
      rows as unknown as LeavePolicyRuleDatabaseRow[],
    totalRecords: Number(
      countRow?.total_records ?? 0
    )
  };
}

export async function findLeavePolicyRuleRecordById(
  companyId: string,
  leavePolicyId: string,
  leavePolicyRuleId: string
): Promise<LeavePolicyRuleDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${leavePolicyRuleSelect}
      WHERE lpr.leave_policy_rule_id = ?
        AND lpr.leave_policy_id = ?
        AND lp.company_id = ?
        AND lp.deleted_at IS NULL
        AND lt.deleted_at IS NULL
      LIMIT 1
    `,
    [
      leavePolicyRuleId,
      leavePolicyId,
      companyId
    ]
  );

  return (
    (
      rows[0] as
        | LeavePolicyRuleDatabaseRow
        | undefined
    ) ?? null
  );
}

export async function listEffectiveLeavePolicyRuleRecords(
  companyId: string,
  leavePolicyId: string,
  includeInactive: boolean
): Promise<LeavePolicyRuleDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      ${leavePolicyRuleSelect}
      WHERE lp.company_id = ?
        AND lpr.leave_policy_id = ?
        AND lp.deleted_at IS NULL
        AND lt.deleted_at IS NULL
        ${includeInactive ? "" : "AND lpr.is_active = 1"}
      ORDER BY
          lt.sort_order ASC,
          lt.leave_type_name ASC,
          lpr.leave_policy_rule_id ASC
    `,
    [companyId, leavePolicyId]
  );

  return rows as unknown as LeavePolicyRuleDatabaseRow[];
}

export async function createLeavePolicyRuleRecord(
  companyId: string,
  input: CreateLeavePolicyRuleRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyRuleDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await assertLeavePolicyBelongsToCompany(
      connection,
      companyId,
      input.leavePolicyId
    );

    await assertLeaveTypeBelongsToCompany(
      connection,
      companyId,
      input.leaveTypeId
    );

    await assertNoDuplicatePolicyRule(
      connection,
      input.leavePolicyId,
      input.leaveTypeId,
      null
    );

    const result = (await connection.query(
      `
        INSERT INTO leave_policy_rules (
            leave_policy_id,
            leave_type_id,
            annual_entitlement_units,
            accrual_method,
            accrual_units_per_period,
            accrual_start_after_days,
            prorate_entitlement,
            allow_during_probation,
            eligible_gender,
            minimum_request_units,
            maximum_request_units,
            minimum_notice_days,
            maximum_advance_days,
            maximum_backdate_days,
            allow_half_day,
            allow_hourly_leave,
            include_weekends,
            include_holidays,
            sandwich_rule_enabled,
            carry_forward_enabled,
            maximum_carry_forward_units,
            carry_forward_expiry_months,
            maximum_balance_units,
            allow_negative_balance,
            negative_balance_limit,
            attachment_required_after_units,
            encashment_allowed,
            maximum_encashment_units,
            approval_levels_required,
            is_active
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        input.leavePolicyId,
        input.leaveTypeId,
        input.annualEntitlementUnits,
        input.accrualMethod,
        input.accrualUnitsPerPeriod,
        input.accrualStartAfterDays,
        input.prorateEntitlement ? 1 : 0,
        input.allowDuringProbation ? 1 : 0,
        input.eligibleGender,
        input.minimumRequestUnits,
        input.maximumRequestUnits,
        input.minimumNoticeDays,
        input.maximumAdvanceDays,
        input.maximumBackdateDays,
        input.allowHalfDay ? 1 : 0,
        input.allowHourlyLeave ? 1 : 0,
        input.includeWeekends ? 1 : 0,
        input.includeHolidays ? 1 : 0,
        input.sandwichRuleEnabled ? 1 : 0,
        input.carryForwardEnabled ? 1 : 0,
        input.maximumCarryForwardUnits,
        input.carryForwardExpiryMonths,
        input.maximumBalanceUnits,
        input.allowNegativeBalance ? 1 : 0,
        input.negativeBalanceLimit,
        input.attachmentRequiredAfterUnits,
        input.encashmentAllowed ? 1 : 0,
        input.maximumEncashmentUnits,
        input.approvalLevelsRequired,
        input.isActive ? 1 : 0
      ]
    )) as unknown as InsertResult;

    const leavePolicyRuleId = String(
      result.insertId
    );

    const created =
      await selectLeavePolicyRuleUsingConnection(
        connection,
        companyId,
        input.leavePolicyId,
        leavePolicyRuleId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_POLICY_RULE_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_policy_rule_created",
      tableName: "leave_policy_rules",
      recordId: leavePolicyRuleId,
      newValues:
        leavePolicyRuleLogSummary(created),
      requestMethod: "POST",
      requestPath:
        `/api/v1/leave/policies/${input.leavePolicyId}/rules`,
      metadata
    });

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

export async function updateLeavePolicyRuleRecord(
  companyId: string,
  leavePolicyId: string,
  leavePolicyRuleId: string,
  input: UpdateLeavePolicyRuleRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyRuleDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeavePolicyRule(
      connection,
      companyId,
      leavePolicyId,
      leavePolicyRuleId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const finalLeaveTypeId =
      input.leaveTypeId ??
      String(existing.leave_type_id);

    await assertLeaveTypeBelongsToCompany(
      connection,
      companyId,
      finalLeaveTypeId
    );

    await assertNoDuplicatePolicyRule(
      connection,
      leavePolicyId,
      finalLeaveTypeId,
      leavePolicyRuleId
    );

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      parameters.push(value);
    };

    const updateFields: Array<
      [
        keyof UpdateLeavePolicyRuleRecord,
        string
      ]
    > = [
      ["leaveTypeId", "leave_type_id"],
      [
        "annualEntitlementUnits",
        "annual_entitlement_units"
      ],
      ["accrualMethod", "accrual_method"],
      [
        "accrualUnitsPerPeriod",
        "accrual_units_per_period"
      ],
      [
        "accrualStartAfterDays",
        "accrual_start_after_days"
      ],
      [
        "eligibleGender",
        "eligible_gender"
      ],
      [
        "minimumRequestUnits",
        "minimum_request_units"
      ],
      [
        "maximumRequestUnits",
        "maximum_request_units"
      ],
      [
        "minimumNoticeDays",
        "minimum_notice_days"
      ],
      [
        "maximumAdvanceDays",
        "maximum_advance_days"
      ],
      [
        "maximumBackdateDays",
        "maximum_backdate_days"
      ],
      [
        "maximumCarryForwardUnits",
        "maximum_carry_forward_units"
      ],
      [
        "carryForwardExpiryMonths",
        "carry_forward_expiry_months"
      ],
      [
        "maximumBalanceUnits",
        "maximum_balance_units"
      ],
      [
        "negativeBalanceLimit",
        "negative_balance_limit"
      ],
      [
        "attachmentRequiredAfterUnits",
        "attachment_required_after_units"
      ],
      [
        "maximumEncashmentUnits",
        "maximum_encashment_units"
      ],
      [
        "approvalLevelsRequired",
        "approval_levels_required"
      ]
    ];

    for (const [property, column] of updateFields) {
      const value = input[property];

      if (value !== undefined) {
        addUpdate(column, value);
      }
    }

    const booleanFields: Array<
      [
        keyof UpdateLeavePolicyRuleRecord,
        string
      ]
    > = [
      [
        "prorateEntitlement",
        "prorate_entitlement"
      ],
      [
        "allowDuringProbation",
        "allow_during_probation"
      ],
      ["allowHalfDay", "allow_half_day"],
      [
        "allowHourlyLeave",
        "allow_hourly_leave"
      ],
      [
        "includeWeekends",
        "include_weekends"
      ],
      [
        "includeHolidays",
        "include_holidays"
      ],
      [
        "sandwichRuleEnabled",
        "sandwich_rule_enabled"
      ],
      [
        "carryForwardEnabled",
        "carry_forward_enabled"
      ],
      [
        "allowNegativeBalance",
        "allow_negative_balance"
      ],
      [
        "encashmentAllowed",
        "encashment_allowed"
      ],
      ["isActive", "is_active"]
    ];

    for (const [property, column] of booleanFields) {
      const value = input[property];

      if (value !== undefined) {
        addUpdate(column, value ? 1 : 0);
      }
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_LEAVE_POLICY_RULE_UPDATE_FIELDS"
      );
    }

    parameters.push(
      leavePolicyRuleId,
      leavePolicyId
    );

    await connection.query(
      `
        UPDATE leave_policy_rules
        SET ${assignments.join(", ")}
        WHERE leave_policy_rule_id = ?
          AND leave_policy_id = ?
      `,
      parameters
    );

    const updated =
      await selectLeavePolicyRuleUsingConnection(
        connection,
        companyId,
        leavePolicyId,
        leavePolicyRuleId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_POLICY_RULE_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_policy_rule_updated",
      tableName: "leave_policy_rules",
      recordId: leavePolicyRuleId,
      oldValues:
        leavePolicyRuleLogSummary(existing),
      newValues:
        leavePolicyRuleLogSummary(updated),
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/leave/policies/${leavePolicyId}/rules/${leavePolicyRuleId}`,
      metadata
    });

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

export async function deleteLeavePolicyRuleRecord(
  companyId: string,
  leavePolicyId: string,
  leavePolicyRuleId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeavePolicyRuleDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockLeavePolicyRule(
      connection,
      companyId,
      leavePolicyId,
      leavePolicyRuleId
    );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const fullExisting =
      await selectLeavePolicyRuleUsingConnection(
        connection,
        companyId,
        leavePolicyId,
        leavePolicyRuleId
      );

    if (!fullExisting) {
      throw new Error(
        "LEAVE_POLICY_RULE_NOT_FOUND"
      );
    }

    await connection.query(
      `
        DELETE FROM leave_policy_rules
        WHERE leave_policy_rule_id = ?
          AND leave_policy_id = ?
      `,
      [
        leavePolicyRuleId,
        leavePolicyId
      ]
    );

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName: "leave_policy_rule_deleted",
      tableName: "leave_policy_rules",
      recordId: leavePolicyRuleId,
      oldValues:
        leavePolicyRuleLogSummary(fullExisting),
      requestMethod: "DELETE",
      requestPath:
        `/api/v1/leave/policies/${leavePolicyId}/rules/${leavePolicyRuleId}`,
      metadata
    });

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
 * Employee leave-policy assignments
 * =========================================================
 */

export async function listEmployeeLeavePolicyAssignmentRecords(
  companyId: string,
  employeeId: string,
  filters: EmployeeLeavePolicyAssignmentListFilters
): Promise<
  PaginatedResult<EmployeeLeavePolicyAssignmentDatabaseRow>
> {
  const conditions = [
    "e.company_id = ?",
    "elpa.employee_id = ?",
    "e.deleted_at IS NULL",
    "lp.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId
  ];

  if (filters.leavePolicyId) {
    conditions.push(
      "elpa.leave_policy_id = ?"
    );

    parameters.push(filters.leavePolicyId);
  }

  if (filters.isCurrent !== undefined) {
    conditions.push("elpa.is_current = ?");
    parameters.push(
      filters.isCurrent ? 1 : 0
    );
  }

  if (filters.dateFrom) {
    conditions.push(`
      COALESCE(
        elpa.effective_to,
        '9999-12-31'
      ) >= ?
    `);

    parameters.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(
      "elpa.effective_from <= ?"
    );

    parameters.push(filters.dateTo);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(*) AS total_records

      FROM employee_leave_policy_assignments elpa

      INNER JOIN employees e
          ON e.employee_id =
             elpa.employee_id

      INNER JOIN leave_policies lp
          ON lp.leave_policy_id =
             elpa.leave_policy_id

      WHERE ${whereClause}
    `,
    parameters
  );

  const countRow = countRows[0] as
    | CountDatabaseRow
    | undefined;

  const rows = await databasePool.query(
    `
      ${assignmentSelect}
      WHERE ${whereClause}
      ORDER BY
          elpa.effective_from DESC,
          elpa.assignment_id DESC
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
      rows as unknown as EmployeeLeavePolicyAssignmentDatabaseRow[],
    totalRecords: Number(
      countRow?.total_records ?? 0
    )
  };
}

export async function findEmployeeLeavePolicyAssignmentRecordById(
  companyId: string,
  employeeId: string,
  assignmentId: string
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${assignmentSelect}
      WHERE elpa.assignment_id = ?
        AND elpa.employee_id = ?
        AND e.company_id = ?
        AND e.deleted_at IS NULL
        AND lp.deleted_at IS NULL
      LIMIT 1
    `,
    [
      assignmentId,
      employeeId,
      companyId
    ]
  );

  return (
    (
      rows[0] as
        | EmployeeLeavePolicyAssignmentDatabaseRow
        | undefined
    ) ?? null
  );
}

export async function createEmployeeLeavePolicyAssignmentRecord(
  companyId: string,
  input: CreateEmployeeLeavePolicyAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee = await lockEmployee(
      connection,
      companyId,
      input.employeeId
    );

    if (!employee) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    if (!databaseBoolean(employee.is_active)) {
      throw new Error("EMPLOYEE_INACTIVE");
    }

    const policy = await assertActiveLeavePolicy(
      connection,
      companyId,
      input.leavePolicyId
    );

    await assertAssignmentWithinPolicyDates(
      policy,
      input.effectiveFrom,
      input.effectiveTo
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

    const result = (await connection.query(
      `
        INSERT INTO employee_leave_policy_assignments (
            employee_id,
            leave_policy_id,
            effective_from,
            effective_to,
            is_current,
            assigned_by_user_id,
            remarks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.employeeId,
        input.leavePolicyId,
        input.effectiveFrom,
        input.effectiveTo,
        input.isCurrent ? 1 : 0,
        input.assignedByUserId,
        input.remarks
      ]
    )) as unknown as InsertResult;

    const assignmentId = String(result.insertId);

    const created =
      await selectAssignmentUsingConnection(
        connection,
        companyId,
        input.employeeId,
        assignmentId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "employee_leave_policy_assigned",
      tableName:
        "employee_leave_policy_assignments",
      recordId: assignmentId,
      newValues: assignmentLogSummary(created),
      requestMethod: "POST",
      requestPath:
        `/api/v1/employees/${input.employeeId}/leave-policy-assignments`,
      metadata
    });

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

export async function updateEmployeeLeavePolicyAssignmentRecord(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  input: UpdateEmployeeLeavePolicyAssignmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockEmployeeAssignment(
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
      input.leavePolicyId ??
      String(existing.leave_policy_id);

    const finalEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(existing.effective_from);

    if (!finalEffectiveFrom) {
      throw new Error(
        "INVALID_LEAVE_POLICY_ASSIGNMENT_DATE"
      );
    }

    const finalEffectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
        : databaseDateOnly(existing.effective_to);

    if (
      finalEffectiveTo !== null &&
      finalEffectiveTo < finalEffectiveFrom
    ) {
      throw new Error(
        "INVALID_LEAVE_POLICY_ASSIGNMENT_DATES"
      );
    }

    const finalIsCurrent =
      input.isCurrent ??
      databaseBoolean(existing.is_current);

    const policy = await assertActiveLeavePolicy(
      connection,
      companyId,
      finalPolicyId
    );

    await assertAssignmentWithinPolicyDates(
      policy,
      finalEffectiveFrom,
      finalEffectiveTo
    );

    await assertNoAssignmentOverlap(
      connection,
      employeeId,
      finalEffectiveFrom,
      finalEffectiveTo,
      assignmentId
    );

    if (finalIsCurrent) {
      await clearOtherCurrentAssignments(
        connection,
        employeeId,
        assignmentId
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      parameters.push(value);
    };

    if (input.leavePolicyId !== undefined) {
      addUpdate(
        "leave_policy_id",
        input.leavePolicyId
      );
    }

    if (input.effectiveFrom !== undefined) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (input.effectiveTo !== undefined) {
      addUpdate("effective_to", input.effectiveTo);
    }

    if (input.isCurrent !== undefined) {
      addUpdate(
        "is_current",
        input.isCurrent ? 1 : 0
      );
    }

    if (input.remarks !== undefined) {
      addUpdate("remarks", input.remarks);
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_LEAVE_POLICY_ASSIGNMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(assignmentId, employeeId);

    await connection.query(
      `
        UPDATE employee_leave_policy_assignments
        SET ${assignments.join(", ")}
        WHERE assignment_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    if (
      databaseBoolean(existing.is_current) &&
      !finalIsCurrent
    ) {
      await refreshCurrentAssignment(
        connection,
        employeeId
      );
    }

    const updated =
      await selectAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "employee_leave_policy_assignment_updated",
      tableName:
        "employee_leave_policy_assignments",
      recordId: assignmentId,
      oldValues: assignmentLogSummary(existing),
      newValues: assignmentLogSummary(updated),
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/employees/${employeeId}/leave-policy-assignments/${assignmentId}`,
      metadata
    });

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

export async function deleteEmployeeLeavePolicyAssignmentRecord(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await lockEmployeeAssignment(
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
      await selectAssignmentUsingConnection(
        connection,
        companyId,
        employeeId,
        assignmentId
      );

    if (!fullExisting) {
      throw new Error(
        "LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
      );
    }

    const wasCurrent = databaseBoolean(
      existing.is_current
    );

    await connection.query(
      `
        DELETE FROM employee_leave_policy_assignments
        WHERE assignment_id = ?
          AND employee_id = ?
      `,
      [assignmentId, employeeId]
    );

    if (wasCurrent) {
      await refreshCurrentAssignment(
        connection,
        employeeId
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "employee_leave_policy_assignment_deleted",
      tableName:
        "employee_leave_policy_assignments",
      recordId: assignmentId,
      oldValues:
        assignmentLogSummary(fullExisting),
      requestMethod: "DELETE",
      requestPath:
        `/api/v1/employees/${employeeId}/leave-policy-assignments/${assignmentId}`,
      metadata
    });

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

export async function findEffectiveEmployeeLeavePolicyAssignmentRecord(
  companyId: string,
  employeeId: string,
  asOfDate: string
): Promise<EmployeeLeavePolicyAssignmentDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      ${assignmentSelect}
      WHERE e.company_id = ?
        AND elpa.employee_id = ?
        AND e.deleted_at IS NULL
        AND lp.deleted_at IS NULL
        AND lp.is_active = 1
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
      ORDER BY
          elpa.is_current DESC,
          elpa.effective_from DESC,
          elpa.assignment_id DESC
      LIMIT 1
    `,
    [
      companyId,
      employeeId,
      asOfDate,
      asOfDate,
      asOfDate,
      asOfDate
    ]
  );

  return (
    (
      rows[0] as
        | EmployeeLeavePolicyAssignmentDatabaseRow
        | undefined
    ) ?? null
  );
}

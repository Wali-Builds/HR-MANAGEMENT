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
  ApplicableLeaveBlackoutDatabaseRow,
  ApplicableLeaveRequestRuleDatabaseRow,
  CreateLeaveRequestAttachmentRecord,
  CreateLeaveRequestRecord,
  EmployeeLeaveOrganizationalContextDatabaseRow,
  GeneratedLeaveRequestDayRecord,
  LeaveApprovalDecision,
  LeaveRequestApprovalDatabaseRow,
  LeaveRequestAttachmentDatabaseRow,
  LeaveRequestDatabaseRow,
  LeaveRequestDayDatabaseRow,
  LeaveRequestStatus,
  LeaveRequestSubmissionResult,
  ResolveLeaveApprovalResult,
  UpdateLeaveRequestRecord
} from "./leave-request.types.js";

/*
 * =========================================================
 * Public repository types
 * =========================================================
 */

export interface PaginatedLeaveRequestResult<T> {
  records: T[];
  totalRecords: number;
}

export interface LeaveRequestListFilters {
  employeeId?: string;
  leaveTypeId?: string;
  leavePeriodId?: string;
  requestStatus?: string;

  startDateFrom?: string;
  startDateTo?: string;

  overlappingDateFrom?: string;
  overlappingDateTo?: string;

  submittedByUserId?: string;
  finalDecisionByUserId?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface EmployeeLeaveRequestListFilters {
  leaveTypeId?: string;
  leavePeriodId?: string;
  requestStatus?: string;

  dateFrom?: string;
  dateTo?: string;

  search?: string;

  page: number;
  pageSize: number;
}

export interface PendingLeaveApprovalListFilters {
  decision: string;

  leaveTypeId?: string;
  employeeId?: string;

  dateFrom?: string;
  dateTo?: string;

  includeDelegated: boolean;

  page: number;
  pageSize: number;
}

export interface LeaveRequestDraftInput {
  companyId: string;
  employeeId: string;

  leaveTypeId: string;

  startDate: string;
  endDate: string;

  startSession:
    | "FULL_DAY"
    | "FIRST_HALF"
    | "SECOND_HALF"
    | "HOURLY";

  endSession:
    | "FULL_DAY"
    | "FIRST_HALF"
    | "SECOND_HALF"
    | "HOURLY";

  startTime: string | null;
  endTime: string | null;

  requestedUnits: number | null;

  reason: string;

  contactNumber: string | null;
  contactAddress: string | null;

  workHandoverToEmployeeId:
    | string
    | null;

  workHandoverNotes:
    | string
    | null;
}

export interface LeaveRequestDetailedDatabaseResult {
  request: LeaveRequestDatabaseRow;

  days:
    LeaveRequestDayDatabaseRow[];

  attachments:
    LeaveRequestAttachmentDatabaseRow[];

  approvals:
    LeaveRequestApprovalDatabaseRow[];

  blackoutMatches:
    ApplicableLeaveBlackoutDatabaseRow[];
}

export interface LeaveRequestLifecycleResult {
  request: LeaveRequestDatabaseRow;

  days:
    LeaveRequestDayDatabaseRow[];

  approvals:
    LeaveRequestApprovalDatabaseRow[];

  releasedUnits: number;

  leaveBalanceId:
    | string
    | null;

  balanceTransactionId:
    | string
    | null;
}

export interface LeaveApprovalDecisionResult {
  request: LeaveRequestDatabaseRow;

  approval:
    LeaveRequestApprovalDatabaseRow;

  approvals:
    LeaveRequestApprovalDatabaseRow[];

  days:
    LeaveRequestDayDatabaseRow[];

  finalized: boolean;

  leaveBalanceId:
    | string
    | null;

  balanceTransactionIds:
    string[];
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

interface LockedLeaveRequestRow {
  leave_request_id:
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
    | bigint
    | null;

  request_number: string;

  start_date:
    | Date
    | string;

  end_date:
    | Date
    | string;

  start_session: string;
  end_session: string;

  start_time:
    | string
    | null;

  end_time:
    | string
    | null;

  requested_units:
    | string
    | number;

  reason: string;

  contact_number:
    | string
    | null;

  contact_address:
    | string
    | null;

  work_handover_to_employee_id:
    | string
    | number
    | bigint
    | null;

  work_handover_notes:
    | string
    | null;

  request_status: string;

  submitted_by_user_id:
    | string
    | number
    | bigint
    | null;

  submitted_at:
    | Date
    | string
    | null;

  final_decision_by_user_id:
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
  unit_type: string;

  is_paid:
    | number
    | boolean;

  requires_approval:
    | number
    | boolean;

  requires_attachment:
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

  pending_units:
    | string
    | number;

  used_units:
    | string
    | number;

  available_balance:
    | string
    | number;
}

interface LockedLeaveApprovalRow {
  leave_approval_id:
    | string
    | number
    | bigint;

  leave_request_id:
    | string
    | number
    | bigint;

  approval_level:
    | string
    | number;

  approver_user_id:
    | string
    | number
    | bigint;

  decision: string;

  comments:
    | string
    | null;

  decided_at:
    | Date
    | string
    | null;

  is_final_level:
    | number
    | boolean;
}

interface ActiveUserRow {
  user_id:
    | string
    | number
    | bigint;

  employee_id:
    | string
    | number
    | bigint
    | null;

  username: string;
}

interface ManagerEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;
}

interface HolidayMatchRow {
  holiday_id:
    | string
    | number
    | bigint;

  holiday_name: string;
  holiday_type: string;
}

interface WorkingDayRow {
  is_working_day:
    | number
    | boolean;
}

interface RequestDayCalculationResult {
  days:
    GeneratedLeaveRequestDayRecord[];

  requestedUnits: number;
  chargeableUnits: number;
}

interface RequestValidationResult {
  organization:
    EmployeeLeaveOrganizationalContextDatabaseRow;

  leaveType:
    LockedLeaveTypeRow;

  leavePeriod:
    LockedLeavePeriodRow;

  rule:
    ApplicableLeaveRequestRuleDatabaseRow;

  days:
    GeneratedLeaveRequestDayRecord[];

  requestedUnits: number;
  chargeableUnits: number;

  blackoutMatches:
    ApplicableLeaveBlackoutDatabaseRow[];
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

  // edited by wali: Preserve MariaDB DATE calendar fields when reloading drafts for recalculation.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
  dateOnly: string,
  days: number
): string {
  const date =
    parseDateOnlyUtc(
      dateOnly
    );

  date.setUTCDate(
    date.getUTCDate() +
    days
  );

  return formatDateOnlyUtc(
    date
  );
}

function differenceInDays(
  laterDate: string,
  earlierDate: string
): number {
  const later =
    parseDateOnlyUtc(
      laterDate
    ).getTime();

  const earlier =
    parseDateOnlyUtc(
      earlierDate
    ).getTime();

  return Math.floor(
    (
      later -
      earlier
    ) / 86_400_000
  );
}

function dateRange(
  startDate: string,
  endDate: string
): string[] {
  const rangeLength =
    differenceInDays(
      endDate,
      startDate
    );

  if (rangeLength < 0) {
    throw new Error(
      "INVALID_LEAVE_REQUEST_DATES"
    );
  }

  if (rangeLength > 365) {
    throw new Error(
      "LEAVE_REQUEST_RANGE_TOO_LARGE"
    );
  }

  const dates: string[] = [];

  for (
    let offset = 0;
    offset <= rangeLength;
    offset += 1
  ) {
    dates.push(
      addDays(
        startDate,
        offset
      )
    );
  }

  return dates;
}

function timeToMinutes(
  value: string
): number {
  const parts =
    value.split(":");

  const hours =
    Number(
      parts[0] ?? "0"
    );

  const minutes =
    Number(
      parts[1] ?? "0"
    );

  const seconds =
    Number(
      parts[2] ?? "0"
    );

  return (
    hours * 60 +
    minutes +
    seconds / 60
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

function requestNumber(): string {
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
    `LR-${datePart}-${randomPart}`
  );
}

function requestLogSummary(
  row:
    | LeaveRequestDatabaseRow
    | LockedLeaveRequestRow
) {
  return {
    leaveRequestId:
      String(
        row.leave_request_id
      ),

    companyId:
      String(
        row.company_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    leavePeriodId:
      row.leave_period_id ===
        null
        ? null
        : String(
            row.leave_period_id
          ),

    requestNumber:
      row.request_number,

    startDate:
      databaseDateOnly(
        row.start_date
      ),

    endDate:
      databaseDateOnly(
        row.end_date
      ),

    requestedUnits:
      Number(
        row.requested_units
      ),

    requestStatus:
      row.request_status
  };
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
 * Reusable SELECT statements
 * =========================================================
 */

const leaveRequestSelect = `
  SELECT
      lr.leave_request_id,
      lr.company_id,

      lr.employee_id,
      e.employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          e.first_name,
          e.middle_name,
          e.last_name
        )
      ) AS employee_name,

      lr.leave_type_id,
      lt.leave_type_code,
      lt.leave_type_name,

      lt.unit_type
          AS leave_type_unit_type,

      lt.is_paid
          AS leave_type_is_paid,

      lt.requires_approval
          AS leave_type_requires_approval,

      lt.requires_attachment
          AS leave_type_requires_attachment,

      lr.leave_period_id,
      lp.period_code,
      lp.period_name,

      lp.start_date
          AS period_start_date,

      lp.end_date
          AS period_end_date,

      lp.period_status,

      lr.request_number,
      lr.start_date,
      lr.end_date,
      lr.start_session,
      lr.end_session,
      lr.start_time,
      lr.end_time,
      lr.requested_units,
      lr.reason,
      lr.contact_number,
      lr.contact_address,

      lr.work_handover_to_employee_id,

      handover_employee.employee_code
          AS work_handover_employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          handover_employee.first_name,
          handover_employee.middle_name,
          handover_employee.last_name
        )
      ) AS work_handover_employee_name,

      lr.work_handover_notes,
      lr.request_status,

      lr.submitted_by_user_id,

      submitted_user.username
          AS submitted_by_username,

      lr.submitted_at,

      lr.final_decision_by_user_id,

      final_user.username
          AS final_decision_by_username,

      lr.final_decision_at,
      lr.final_remarks,

      lr.cancelled_by_user_id,

      cancelled_user.username
          AS cancelled_by_username,

      lr.cancelled_at,
      lr.cancellation_reason,

      (
        SELECT COUNT(*)
        FROM leave_request_days lrd_count
        WHERE lrd_count.leave_request_id =
              lr.leave_request_id
      ) AS request_day_count,

      (
        SELECT COUNT(*)
        FROM leave_request_days lrd_chargeable
        WHERE lrd_chargeable.leave_request_id =
              lr.leave_request_id
          AND lrd_chargeable.is_chargeable = 1
      ) AS chargeable_day_count,

      COALESCE(
        (
          SELECT SUM(
            CASE
              WHEN lrd_units.is_chargeable = 1
              THEN lrd_units.requested_units
              ELSE 0
            END
          )
          FROM leave_request_days lrd_units
          WHERE lrd_units.leave_request_id =
                lr.leave_request_id
        ),
        0
      ) AS chargeable_units,

      (
        SELECT COUNT(*)
        FROM leave_request_attachments lra_count
        WHERE lra_count.leave_request_id =
              lr.leave_request_id
      ) AS attachment_count,

      (
        SELECT COUNT(*)
        FROM leave_request_approvals lrap_count
        WHERE lrap_count.leave_request_id =
              lr.leave_request_id
      ) AS approval_count,

      (
        SELECT COUNT(*)
        FROM leave_request_approvals lrap_pending
        WHERE lrap_pending.leave_request_id =
              lr.leave_request_id
          AND lrap_pending.decision = 'PENDING'
      ) AS pending_approval_count,

      (
        SELECT COUNT(*)
        FROM leave_request_approvals lrap_approved
        WHERE lrap_approved.leave_request_id =
              lr.leave_request_id
          AND lrap_approved.decision = 'APPROVED'
      ) AS approved_approval_count,

      (
        SELECT COUNT(*)
        FROM leave_request_approvals lrap_rejected
        WHERE lrap_rejected.leave_request_id =
              lr.leave_request_id
          AND lrap_rejected.decision = 'REJECTED'
      ) AS rejected_approval_count,

      lr.created_at,
      lr.updated_at

  FROM leave_requests lr

  INNER JOIN employees e
      ON e.employee_id =
         lr.employee_id

  INNER JOIN leave_types lt
      ON lt.leave_type_id =
         lr.leave_type_id

  LEFT JOIN leave_periods lp
      ON lp.leave_period_id =
         lr.leave_period_id

  LEFT JOIN employees handover_employee
      ON handover_employee.employee_id =
         lr.work_handover_to_employee_id

  LEFT JOIN users submitted_user
      ON submitted_user.user_id =
         lr.submitted_by_user_id

  LEFT JOIN users final_user
      ON final_user.user_id =
         lr.final_decision_by_user_id

  LEFT JOIN users cancelled_user
      ON cancelled_user.user_id =
         lr.cancelled_by_user_id
`;

const leaveRequestDaySelect = `
  SELECT
      lrd.leave_request_day_id,
      lrd.leave_request_id,
      lrd.leave_date,
      lrd.duration_type,
      lrd.requested_units,
      lrd.start_time,
      lrd.end_time,
      lrd.is_weekend,
      lrd.is_holiday,
      lrd.holiday_id,
      h.holiday_name,
      h.holiday_type,
      lrd.is_chargeable,
      lrd.created_at,
      lrd.updated_at

  FROM leave_request_days lrd

  LEFT JOIN holidays h
      ON h.holiday_id =
         lrd.holiday_id
`;

const leaveAttachmentSelect = `
  SELECT
      lra.attachment_id,
      lra.leave_request_id,
      lra.attachment_type,
      lra.attachment_title,
      lra.original_filename,
      lra.stored_filename,
      lra.storage_path,
      lra.mime_type,
      lra.file_size_bytes,
      lra.checksum_sha256,
      lra.uploaded_by_user_id,

      u.username
          AS uploaded_by_username,

      lra.created_at

  FROM leave_request_attachments lra

  LEFT JOIN users u
      ON u.user_id =
         lra.uploaded_by_user_id
`;

const leaveApprovalSelect = `
  SELECT
      lrap.leave_approval_id,
      lrap.leave_request_id,
      lrap.approval_level,
      lrap.approver_user_id,

      u.username
          AS approver_username,

      u.employee_id
          AS approver_employee_id,

      approver_employee.employee_code
          AS approver_employee_code,

      TRIM(
        CONCAT_WS(
          ' ',
          approver_employee.first_name,
          approver_employee.middle_name,
          approver_employee.last_name
        )
      ) AS approver_employee_name,

      lrap.decision,
      lrap.comments,
      lrap.decided_at,
      lrap.is_final_level,
      lrap.created_at,
      lrap.updated_at

  FROM leave_request_approvals lrap

  INNER JOIN users u
      ON u.user_id =
         lrap.approver_user_id

  LEFT JOIN employees approver_employee
      ON approver_employee.employee_id =
         u.employee_id
`;

/*
 * =========================================================
 * Lock helpers
 * =========================================================
 */

async function lockLeaveRequest(
  connection: PoolConnection,
  companyId: string,
  leaveRequestId: string
): Promise<LockedLeaveRequestRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            leave_request_id,
            company_id,
            employee_id,
            leave_type_id,
            leave_period_id,
            request_number,
            start_date,
            end_date,
            start_session,
            end_session,
            start_time,
            end_time,
            requested_units,
            reason,
            contact_number,
            contact_address,
            work_handover_to_employee_id,
            work_handover_notes,
            request_status,
            submitted_by_user_id,
            submitted_at,
            final_decision_by_user_id,
            final_decision_at,
            final_remarks,
            cancelled_by_user_id,
            cancelled_at,
            cancellation_reason

        FROM leave_requests

        WHERE leave_request_id = ?
          AND company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveRequestRow
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
            unit_type,
            is_paid,
            requires_approval,
            requires_attachment,
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
            pending_units,
            used_units,
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

async function lockLeaveApproval(
  connection: PoolConnection,
  companyId: string,
  leaveRequestId: string,
  leaveApprovalId: string
): Promise<LockedLeaveApprovalRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            lrap.leave_approval_id,
            lrap.leave_request_id,
            lrap.approval_level,
            lrap.approver_user_id,
            lrap.decision,
            lrap.comments,
            lrap.decided_at,
            lrap.is_final_level

        FROM leave_request_approvals lrap

        INNER JOIN leave_requests lr
            ON lr.leave_request_id =
               lrap.leave_request_id

        WHERE lrap.leave_approval_id = ?
          AND lrap.leave_request_id = ?
          AND lr.company_id = ?

        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveApprovalId,
        leaveRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LockedLeaveApprovalRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Connection SELECT helpers
 * =========================================================
 */

async function selectLeaveRequestUsingConnection(
  connection: PoolConnection,
  companyId: string,
  leaveRequestId: string
): Promise<LeaveRequestDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leaveRequestSelect}

        WHERE lr.leave_request_id = ?
          AND lr.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL

        LIMIT 1
      `,
      [
        leaveRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveRequestDatabaseRow
      | undefined
  ) ?? null;
}

async function selectLeaveRequestDaysUsingConnection(
  connection: PoolConnection,
  leaveRequestId: string
): Promise<LeaveRequestDayDatabaseRow[]> {
  const rows =
    await connection.query(
      `
        ${leaveRequestDaySelect}

        WHERE lrd.leave_request_id = ?

        ORDER BY
            lrd.leave_date ASC,
            lrd.leave_request_day_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestDayDatabaseRow[]
  );
}

async function selectLeaveAttachmentsUsingConnection(
  connection: PoolConnection,
  leaveRequestId: string
): Promise<LeaveRequestAttachmentDatabaseRow[]> {
  const rows =
    await connection.query(
      `
        ${leaveAttachmentSelect}

        WHERE lra.leave_request_id = ?

        ORDER BY
            lra.created_at ASC,
            lra.attachment_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestAttachmentDatabaseRow[]
  );
}

async function selectLeaveApprovalsUsingConnection(
  connection: PoolConnection,
  leaveRequestId: string
): Promise<LeaveRequestApprovalDatabaseRow[]> {
  const rows =
    await connection.query(
      `
        ${leaveApprovalSelect}

        WHERE lrap.leave_request_id = ?

        ORDER BY
            lrap.approval_level ASC,
            lrap.leave_approval_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestApprovalDatabaseRow[]
  );
}

async function selectLeaveApprovalUsingConnection(
  connection: PoolConnection,
  leaveApprovalId: string
): Promise<LeaveRequestApprovalDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${leaveApprovalSelect}

        WHERE lrap.leave_approval_id = ?

        LIMIT 1
      `,
      [
        leaveApprovalId
      ]
    );

  return (
    rows[0] as
      | LeaveRequestApprovalDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Employee organizational context
 * =========================================================
 */

async function findEmployeeOrganizationalContext(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  effectiveDate: string
): Promise<
  EmployeeLeaveOrganizationalContextDatabaseRow
  | null
> {
  const rows =
    await connection.query(
      `
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

            e.gender,
            e.joining_date,
            e.probation_end_date,
            e.confirmation_date,
            e.is_active,

            ea.assignment_id,
            ea.branch_id,
            ea.department_id,
            ea.designation_id,
            ea.reporting_manager_id,

            pa.position_id,
            p.reports_to_position_id

        FROM employees e

        LEFT JOIN employee_assignments ea
            ON ea.assignment_id = (
              SELECT ea_inner.assignment_id

              FROM employee_assignments ea_inner

              WHERE ea_inner.employee_id =
                    e.employee_id

                AND ea_inner.effective_from <= ?

                AND (
                  ea_inner.effective_to IS NULL
                  OR ea_inner.effective_to >= ?
                )

              ORDER BY
                  (
                    ea_inner.assignment_type =
                    'PRIMARY'
                  ) DESC,

                  ea_inner.is_current DESC,
                  ea_inner.effective_from DESC,
                  ea_inner.assignment_id DESC

              LIMIT 1
            )

        LEFT JOIN position_assignments pa
            ON pa.position_assignment_id = (
              SELECT pa_inner.position_assignment_id

              FROM position_assignments pa_inner

              WHERE pa_inner.employee_id =
                    e.employee_id

                AND pa_inner.effective_from <= ?

                AND (
                  pa_inner.effective_to IS NULL
                  OR pa_inner.effective_to >= ?
                )

              ORDER BY
                  (
                    pa_inner.assignment_type =
                    'PRIMARY'
                  ) DESC,

                  pa_inner.is_current DESC,
                  pa_inner.effective_from DESC,
                  pa_inner.position_assignment_id DESC

              LIMIT 1
            )

        LEFT JOIN positions p
            ON p.position_id =
               pa.position_id

        WHERE e.employee_id = ?
          AND e.company_id = ?
          AND e.deleted_at IS NULL

        LIMIT 1
        FOR UPDATE
      `,
      [
        effectiveDate,
        effectiveDate,
        effectiveDate,
        effectiveDate,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | EmployeeLeaveOrganizationalContextDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Leave type and period resolution
 * =========================================================
 */

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

async function resolveOpenLeavePeriod(
  connection: PoolConnection,
  companyId: string,
  startDate: string,
  endDate: string
): Promise<LockedLeavePeriodRow> {
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

        WHERE company_id = ?
          AND start_date <= ?
          AND end_date >= ?

        ORDER BY
            start_date DESC,
            leave_period_id DESC

        LIMIT 1
        FOR UPDATE
      `,
      [
        companyId,
        startDate,
        endDate
      ]
    );

  const period =
    (
      rows[0] as
        | LockedLeavePeriodRow
        | undefined
    ) ?? null;

  if (!period) {
    throw new Error(
      "LEAVE_PERIOD_NOT_FOUND_FOR_REQUEST"
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

/*
 * =========================================================
 * Applicable leave policy rule
 * =========================================================
 */

async function findApplicableLeaveRequestRule(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string
): Promise<
  ApplicableLeaveRequestRuleDatabaseRow
  | null
> {
  const assignedRows =
    await connection.query(
      `
        SELECT
            lpr.leave_policy_rule_id,
            lpr.leave_policy_id,
            lpr.leave_type_id,
            lpr.annual_entitlement_units,
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
            lpr.allow_negative_balance,
            lpr.negative_balance_limit,
            lpr.attachment_required_after_units,
            lpr.approval_levels_required,
            lpr.is_active

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
        startDate,
        endDate,
        startDate,
        endDate
      ]
    );

  const assignedRule =
    assignedRows[0] as
      | ApplicableLeaveRequestRuleDatabaseRow
      | undefined;

  if (assignedRule) {
    return assignedRule;
  }

  const defaultRows =
    await connection.query(
      `
        SELECT
            lpr.leave_policy_rule_id,
            lpr.leave_policy_id,
            lpr.leave_type_id,
            lpr.annual_entitlement_units,
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
            lpr.allow_negative_balance,
            lpr.negative_balance_limit,
            lpr.attachment_required_after_units,
            lpr.approval_levels_required,
            lpr.is_active

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
        startDate,
        endDate
      ]
    );

  return (
    defaultRows[0] as
      | ApplicableLeaveRequestRuleDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Holiday and weekend resolution
 * =========================================================
 */

async function findHolidayForDate(
  connection: PoolConnection,
  companyId: string,
  branchId: string | null,
  leaveDate: string
): Promise<HolidayMatchRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            holiday_id,
            holiday_name,
            holiday_type

        FROM holidays

        WHERE company_id = ?
          AND holiday_date = ?
          AND is_active = 1

          AND (
            branch_id IS NULL
            OR branch_id = ?
          )

        ORDER BY
            (
              branch_id IS NOT NULL
            ) DESC,
            holiday_id DESC

        LIMIT 1
      `,
      [
        companyId,
        leaveDate,
        branchId
      ]
    );

  return (
    rows[0] as
      | HolidayMatchRow
      | undefined
  ) ?? null;
}

async function isEmployeeWorkingDay(
  connection: PoolConnection,
  employeeId: string,
  leaveDate: string
): Promise<boolean> {
  const rows =
    await connection.query(
      `
        SELECT
          COALESCE(
            (
              SELECT wsd.is_working_day

              FROM employee_shift_assignments esa

              INNER JOIN work_schedules ws
                  ON ws.schedule_id =
                     esa.schedule_id

              INNER JOIN work_schedule_days wsd
                  ON wsd.schedule_id =
                     esa.schedule_id

              WHERE esa.employee_id = ?
                AND esa.schedule_id IS NOT NULL

                AND esa.effective_from <= ?

                AND (
                  esa.effective_to IS NULL
                  OR esa.effective_to >= ?
                )

                AND ws.is_active = 1
                AND ws.deleted_at IS NULL

                AND wsd.day_of_week =
                    DAYOFWEEK(?) - 1

              ORDER BY
                  esa.is_current DESC,
                  esa.effective_from DESC,
                  esa.shift_assignment_id DESC

              LIMIT 1
            ),

            CASE
              WHEN WEEKDAY(?) IN (5, 6)
              THEN 0
              ELSE 1
            END
          ) AS is_working_day
      `,
      [
        employeeId,
        leaveDate,
        leaveDate,
        leaveDate,
        leaveDate
      ]
    );

  const row =
    rows[0] as
      | WorkingDayRow
      | undefined;

  return databaseBoolean(
    row?.is_working_day ??
    false
  );
}

/*
 * =========================================================
 * Request-day generation
 * =========================================================
 */

function rawDayDuration(
  input: {
    leaveDate: string;
    startDate: string;
    endDate: string;

    startSession: string;
    endSession: string;

    startTime: string | null;
    endTime: string | null;

    unitType: string;
  }
): {
  durationType:
    | "FULL_DAY"
    | "FIRST_HALF"
    | "SECOND_HALF"
    | "HOURLY";

  requestedUnits: number;

  startTime: string | null;
  endTime: string | null;
} {
  const isSameDay =
    input.startDate ===
    input.endDate;

  if (
    input.startSession ===
      "HOURLY" ||
    input.endSession ===
      "HOURLY"
  ) {
    if (
      input.unitType !==
      "HOURS"
    ) {
      throw new Error(
        "HOURLY_REQUEST_REQUIRES_HOURS_LEAVE_TYPE"
      );
    }

    if (
      !isSameDay ||
      !input.startTime ||
      !input.endTime
    ) {
      throw new Error(
        "INVALID_HOURLY_LEAVE_REQUEST"
      );
    }

    const minutes =
      timeToMinutes(
        input.endTime
      ) -
      timeToMinutes(
        input.startTime
      );

    if (minutes <= 0) {
      throw new Error(
        "INVALID_HOURLY_LEAVE_TIME_RANGE"
      );
    }

    return {
      durationType:
        "HOURLY",

      requestedUnits:
        roundUnits(
          minutes / 60
        ),

      startTime:
        input.startTime,

      endTime:
        input.endTime
    };
  }

  if (
    input.unitType !==
    "DAYS"
  ) {
    throw new Error(
      "DAY_REQUEST_REQUIRES_DAYS_LEAVE_TYPE"
    );
  }

  if (isSameDay) {
    if (
      input.startSession ===
        "FIRST_HALF" &&
      input.endSession ===
        "FIRST_HALF"
    ) {
      return {
        durationType:
          "FIRST_HALF",

        requestedUnits:
          0.5,

        startTime:
          null,

        endTime:
          null
      };
    }

    if (
      input.startSession ===
        "SECOND_HALF" &&
      input.endSession ===
        "SECOND_HALF"
    ) {
      return {
        durationType:
          "SECOND_HALF",

        requestedUnits:
          0.5,

        startTime:
          null,

        endTime:
          null
      };
    }

    return {
      durationType:
        "FULL_DAY",

      requestedUnits:
        1,

      startTime:
        null,

      endTime:
        null
    };
  }

  if (
    input.leaveDate ===
    input.startDate
  ) {
    if (
      input.startSession ===
      "SECOND_HALF"
    ) {
      return {
        durationType:
          "SECOND_HALF",

        requestedUnits:
          0.5,

        startTime:
          null,

        endTime:
          null
      };
    }

    return {
      durationType:
        "FULL_DAY",

      requestedUnits:
        1,

      startTime:
        null,

      endTime:
        null
    };
  }

  if (
    input.leaveDate ===
    input.endDate
  ) {
    if (
      input.endSession ===
      "FIRST_HALF"
    ) {
      return {
        durationType:
          "FIRST_HALF",

        requestedUnits:
          0.5,

        startTime:
          null,

        endTime:
          null
      };
    }

    return {
      durationType:
        "FULL_DAY",

      requestedUnits:
        1,

      startTime:
        null,

      endTime:
        null
    };
  }

  return {
    durationType:
      "FULL_DAY",

    requestedUnits:
      1,

    startTime:
      null,

    endTime:
      null
  };
}

async function generateRequestDays(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    branchId:
      | string
      | null;

    leaveRequestId: string;

    leaveType:
      LockedLeaveTypeRow;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;

    startDate: string;
    endDate: string;

    startSession: string;
    endSession: string;

    startTime:
      | string
      | null;

    endTime:
      | string
      | null;
  }
): Promise<RequestDayCalculationResult> {
  const dates =
    dateRange(
      input.startDate,
      input.endDate
    );

  const days:
    GeneratedLeaveRequestDayRecord[] =
      [];

  for (
    const leaveDate
    of dates
  ) {
    const raw =
      rawDayDuration({
        leaveDate,

        startDate:
          input.startDate,

        endDate:
          input.endDate,

        startSession:
          input.startSession,

        endSession:
          input.endSession,

        startTime:
          input.startTime,

        endTime:
          input.endTime,

        unitType:
          input.leaveType.unit_type
      });

    const workingDay =
      await isEmployeeWorkingDay(
        connection,
        input.employeeId,
        leaveDate
      );

    const holiday =
      await findHolidayForDate(
        connection,
        input.companyId,
        input.branchId,
        leaveDate
      );

    const isWeekend =
      !workingDay;

    const isHoliday =
      holiday !== null;

    const weekendAllowed =
      !isWeekend ||
      databaseBoolean(
        input.rule.include_weekends
      );

    const holidayAllowed =
      !isHoliday ||
      databaseBoolean(
        input.rule.include_holidays
      );

    days.push({
      leaveRequestId:
        input.leaveRequestId,

      leaveDate,

      durationType:
        raw.durationType,

      requestedUnits:
        raw.requestedUnits,

      startTime:
        raw.startTime,

      endTime:
        raw.endTime,

      isWeekend,
      isHoliday,

      holidayId:
        holiday
          ? String(
              holiday.holiday_id
            )
          : null,

      isChargeable:
        weekendAllowed &&
        holidayAllowed
    });
  }

  if (
    databaseBoolean(
      input.rule.sandwich_rule_enabled
    ) &&
    input.leaveType.unit_type ===
      "DAYS"
  ) {
    const chargeableIndexes =
      days
        .map(
          (
            day,
            index
          ) =>
            day.isChargeable
              ? index
              : -1
        )
        .filter(
          (
            index
          ) => index >= 0
        );

    const firstChargeableIndex =
      chargeableIndexes[0];

    const lastChargeableIndex =
      chargeableIndexes[
        chargeableIndexes.length -
        1
      ];

    if (
      firstChargeableIndex !==
        undefined &&
      lastChargeableIndex !==
        undefined
    ) {
      for (
        let index =
          firstChargeableIndex + 1;

        index <
          lastChargeableIndex;

        index += 1
      ) {
        const day =
          days[index];

        if (
          day &&
          !day.isChargeable &&
          (
            day.isWeekend ||
            day.isHoliday
          )
        ) {
          day.isChargeable =
            true;
        }
      }
    }
  }

  const requestedUnits =
    roundUnits(
      days.reduce(
        (
          total,
          day
        ) =>
          total +
          day.requestedUnits,
        0
      )
    );

  const chargeableUnits =
    roundUnits(
      days.reduce(
        (
          total,
          day
        ) =>
          total +
          (
            day.isChargeable
              ? day.requestedUnits
              : 0
          ),
        0
      )
    );

  return {
    days,
    requestedUnits,
    chargeableUnits
  };
}

/*
 * =========================================================
 * Blackout validation
 * =========================================================
 */

async function findApplicableBlackoutPeriods(
  connection: PoolConnection,
  input: {
    companyId: string;

    branchId:
      | string
      | null;

    departmentId:
      | string
      | null;

    leaveTypeId: string;

    startDate: string;
    endDate: string;
  }
): Promise<
  ApplicableLeaveBlackoutDatabaseRow[]
> {
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
            is_active

        FROM leave_blackout_periods

        WHERE company_id = ?
          AND is_active = 1

          AND start_date <= ?
          AND end_date >= ?

          AND (
            branch_id IS NULL
            OR branch_id = ?
          )

          AND (
            department_id IS NULL
            OR department_id = ?
          )

          AND (
            leave_type_id IS NULL
            OR leave_type_id = ?
          )

        ORDER BY
            start_date ASC,
            blackout_period_id ASC
      `,
      [
        input.companyId,
        input.endDate,
        input.startDate,
        input.branchId,
        input.departmentId,
        input.leaveTypeId
      ]
    );

  return (
    rows as unknown as
      ApplicableLeaveBlackoutDatabaseRow[]
  );
}

/*
 * =========================================================
 * Policy validation
 * =========================================================
 */

function validateEmployeeEligibility(
  input: {
    organization:
      EmployeeLeaveOrganizationalContextDatabaseRow;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;

    startDate: string;
  }
): void {
  if (
    !databaseBoolean(
      input.organization.is_active
    )
  ) {
    throw new Error(
      "EMPLOYEE_INACTIVE"
    );
  }

  const joiningDate =
    databaseDateOnly(
      input.organization.joining_date
    );

  if (
    joiningDate &&
    input.startDate <
      joiningDate
  ) {
    throw new Error(
      "LEAVE_BEFORE_EMPLOYEE_JOINING_DATE"
    );
  }

  const probationEndDate =
    databaseDateOnly(
      input.organization.probation_end_date
    );

  const isOnProbation =
    probationEndDate !== null &&
    input.startDate <=
      probationEndDate;

  if (
    isOnProbation &&
    !databaseBoolean(
      input.rule.allow_during_probation
    )
  ) {
    throw new Error(
      "LEAVE_NOT_ALLOWED_DURING_PROBATION"
    );
  }

  const eligibleGender =
    input.rule.eligible_gender
      .trim()
      .toUpperCase();

  const employeeGender =
    input.organization.gender
      ?.trim()
      .toUpperCase() ??
    "";

  if (
    eligibleGender !==
      "ALL" &&
    eligibleGender !==
      employeeGender
  ) {
    throw new Error(
      "EMPLOYEE_NOT_ELIGIBLE_FOR_LEAVE_TYPE"
    );
  }
}

function validateRequestTiming(
  input: {
    startDate: string;
    rule:
      ApplicableLeaveRequestRuleDatabaseRow;
  }
): void {
  const today =
    currentDateOnly();

  const offsetDays =
    differenceInDays(
      input.startDate,
      today
    );

  if (offsetDays < 0) {
    const backdatedDays =
      Math.abs(
        offsetDays
      );

    if (
      backdatedDays >
      Number(
        input.rule.maximum_backdate_days
      )
    ) {
      throw new Error(
        "LEAVE_BACKDATE_LIMIT_EXCEEDED"
      );
    }

    return;
  }

  const minimumNoticeDays =
    Number(
      input.rule.minimum_notice_days
    );

  if (
    offsetDays <
    minimumNoticeDays
  ) {
    throw new Error(
      "LEAVE_MINIMUM_NOTICE_NOT_MET"
    );
  }

  if (
    input.rule.maximum_advance_days !==
      null &&
    offsetDays >
      Number(
        input.rule.maximum_advance_days
      )
  ) {
    throw new Error(
      "LEAVE_MAXIMUM_ADVANCE_LIMIT_EXCEEDED"
    );
  }
}

function validateRequestUnits(
  input: {
    chargeableUnits: number;

    requestedInputUnits:
      | number
      | null;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;
  }
): void {
  const minimumUnits =
    Number(
      input.rule.minimum_request_units
    );

  if (
    input.chargeableUnits <
    minimumUnits
  ) {
    throw new Error(
      "LEAVE_MINIMUM_REQUEST_UNITS_NOT_MET"
    );
  }

  if (
    input.rule.maximum_request_units !==
      null &&
    input.chargeableUnits >
      Number(
        input.rule.maximum_request_units
      )
  ) {
    throw new Error(
      "LEAVE_MAXIMUM_REQUEST_UNITS_EXCEEDED"
    );
  }

  if (
    input.requestedInputUnits !==
      null &&
    Math.abs(
      input.requestedInputUnits -
      input.chargeableUnits
    ) > 0.01
  ) {
    throw new Error(
      "LEAVE_REQUESTED_UNITS_MISMATCH"
    );
  }
}

function validateDurationPermissions(
  input: {
    startSession: string;
    endSession: string;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;
  }
): void {
  const hourly =
    input.startSession ===
      "HOURLY" ||
    input.endSession ===
      "HOURLY";

  const halfDay =
    input.startSession ===
      "FIRST_HALF" ||
    input.startSession ===
      "SECOND_HALF" ||
    input.endSession ===
      "FIRST_HALF" ||
    input.endSession ===
      "SECOND_HALF";

  if (
    hourly &&
    !databaseBoolean(
      input.rule.allow_hourly_leave
    )
  ) {
    throw new Error(
      "HOURLY_LEAVE_NOT_ALLOWED"
    );
  }

  if (
    halfDay &&
    !databaseBoolean(
      input.rule.allow_half_day
    )
  ) {
    throw new Error(
      "HALF_DAY_LEAVE_NOT_ALLOWED"
    );
  }
}

/*
 * =========================================================
 * Handover and overlap validation
 * =========================================================
 */

async function validateWorkHandoverEmployee(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    workHandoverToEmployeeId:
      | string
      | null;
  }
): Promise<void> {
  if (
    input.workHandoverToEmployeeId ===
    null
  ) {
    return;
  }

  if (
    input.workHandoverToEmployeeId ===
    input.employeeId
  ) {
    throw new Error(
      "EMPLOYEE_CANNOT_HANDOVER_TO_SELF"
    );
  }

  const rows =
    await connection.query(
      `
        SELECT employee_id

        FROM employees

        WHERE employee_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL

        LIMIT 1
        FOR UPDATE
      `,
      [
        input.workHandoverToEmployeeId,
        input.companyId
      ]
    );

  if (
    rows.length === 0
  ) {
    throw new Error(
      "WORK_HANDOVER_EMPLOYEE_NOT_FOUND"
    );
  }
}

async function assertNoOverlappingLeaveRequest(
  connection: PoolConnection,
  input: {
    employeeId: string;

    startDate: string;
    endDate: string;

    excludedLeaveRequestId:
      | string
      | null;
  }
): Promise<void> {
  const parameters: unknown[] = [
    input.employeeId,
    input.endDate,
    input.startDate
  ];

  let exclusionClause = "";

  if (
    input.excludedLeaveRequestId !==
    null
  ) {
    exclusionClause = `
      AND leave_request_id <> ?
    `;

    parameters.push(
      input.excludedLeaveRequestId
    );
  }

  const rows =
    await connection.query(
      `
        SELECT leave_request_id

        FROM leave_requests

        WHERE employee_id = ?

          AND start_date <= ?
          AND end_date >= ?

          AND request_status IN (
            'PENDING',
            'APPROVED'
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
      "OVERLAPPING_LEAVE_REQUEST_EXISTS"
    );
  }
}

/*
 * =========================================================
 * Full request validation
 * =========================================================
 */

async function validateRequestConfiguration(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    leaveRequestId: string;
    leaveTypeId: string;

    startDate: string;
    endDate: string;

    startSession: string;
    endSession: string;

    startTime:
      | string
      | null;

    endTime:
      | string
      | null;

    requestedInputUnits:
      | number
      | null;

    workHandoverToEmployeeId:
      | string
      | null;

    excludedLeaveRequestId:
      | string
      | null;
  }
): Promise<RequestValidationResult> {
  const organization =
    await findEmployeeOrganizationalContext(
      connection,
      input.companyId,
      input.employeeId,
      input.startDate
    );

  if (!organization) {
    throw new Error(
      "EMPLOYEE_NOT_FOUND"
    );
  }

  const leaveType =
    await assertActiveLeaveType(
      connection,
      input.companyId,
      input.leaveTypeId
    );

  const leavePeriod =
    await resolveOpenLeavePeriod(
      connection,
      input.companyId,
      input.startDate,
      input.endDate
    );

  const rule =
    await findApplicableLeaveRequestRule(
      connection,
      input.companyId,
      input.employeeId,
      input.leaveTypeId,
      input.startDate,
      input.endDate
    );

  if (!rule) {
    throw new Error(
      "APPLICABLE_LEAVE_POLICY_RULE_NOT_FOUND"
    );
  }

  validateEmployeeEligibility({
    organization,
    rule,
    startDate:
      input.startDate
  });

  validateRequestTiming({
    startDate:
      input.startDate,

    rule
  });

  validateDurationPermissions({
    startSession:
      input.startSession,

    endSession:
      input.endSession,

    rule
  });

  await validateWorkHandoverEmployee(
    connection,
    {
      companyId:
        input.companyId,

      employeeId:
        input.employeeId,

      workHandoverToEmployeeId:
        input.workHandoverToEmployeeId
    }
  );

  await assertNoOverlappingLeaveRequest(
    connection,
    {
      employeeId:
        input.employeeId,

      startDate:
        input.startDate,

      endDate:
        input.endDate,

      excludedLeaveRequestId:
        input.excludedLeaveRequestId
    }
  );

  const generated =
    await generateRequestDays(
      connection,
      {
        companyId:
          input.companyId,

        employeeId:
          input.employeeId,

        branchId:
          organization.branch_id ===
            null
            ? null
            : String(
                organization.branch_id
              ),

        leaveRequestId:
          input.leaveRequestId,

        leaveType,
        rule,

        startDate:
          input.startDate,

        endDate:
          input.endDate,

        startSession:
          input.startSession,

        endSession:
          input.endSession,

        startTime:
          input.startTime,

        endTime:
          input.endTime
      }
    );

  if (
    generated.chargeableUnits <=
    0
  ) {
    throw new Error(
      "LEAVE_REQUEST_HAS_NO_CHARGEABLE_UNITS"
    );
  }

  validateRequestUnits({
    chargeableUnits:
      generated.chargeableUnits,

    requestedInputUnits:
      input.requestedInputUnits,

    rule
  });

  const blackoutMatches =
    await findApplicableBlackoutPeriods(
      connection,
      {
        companyId:
          input.companyId,

        branchId:
          organization.branch_id ===
            null
            ? null
            : String(
                organization.branch_id
              ),

        departmentId:
          organization.department_id ===
            null
            ? null
            : String(
                organization.department_id
              ),

        leaveTypeId:
          input.leaveTypeId,

        startDate:
          input.startDate,

        endDate:
          input.endDate
      }
    );

  const blockingBlackout =
    blackoutMatches.find(
      (
        blackout
      ) =>
        blackout.restriction_type ===
        "BLOCK"
    );

  if (blockingBlackout) {
    throw new Error(
      "LEAVE_REQUEST_BLOCKED_BY_BLACKOUT_PERIOD"
    );
  }

  return {
    organization,
    leaveType,
    leavePeriod,
    rule,

    days:
      generated.days,

    requestedUnits:
      generated.requestedUnits,

    chargeableUnits:
      generated.chargeableUnits,

    blackoutMatches
  };
}

/*
 * =========================================================
 * Request-day persistence
 * =========================================================
 */

async function replaceRequestDays(
  connection: PoolConnection,
  leaveRequestId: string,
  days:
    GeneratedLeaveRequestDayRecord[]
): Promise<void> {
  await connection.query(
    `
      DELETE FROM leave_request_days
      WHERE leave_request_id = ?
    `,
    [
      leaveRequestId
    ]
  );

  for (
    const day
    of days
  ) {
    await connection.query(
      `
        INSERT INTO leave_request_days (
            leave_request_id,
            leave_date,
            duration_type,
            requested_units,
            start_time,
            end_time,
            is_weekend,
            is_holiday,
            holiday_id,
            is_chargeable
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
            ?
        )
      `,
      [
        leaveRequestId,
        day.leaveDate,
        day.durationType,
        day.requestedUnits,
        day.startTime,
        day.endTime,
        day.isWeekend ? 1 : 0,
        day.isHoliday ? 1 : 0,
        day.holidayId,
        day.isChargeable ? 1 : 0
      ]
    );
  }
}

/*
 * =========================================================
 * Balance transaction helpers
 * =========================================================
 */

async function insertBalanceTransaction(
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

    balanceBefore: number;
    balanceAfter: number;

    leaveRequestId: string;

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
            'LEAVE_REQUEST',
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
        input.leaveRequestId,
        input.remarks,
        input.createdByUserId
      ]
    ) as unknown as InsertResult;

  return String(
    result.insertId
  );
}

function assertSufficientBalance(
  input: {
    availableBalance: number;
    requestedUnits: number;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;
  }
): void {
  const resultingBalance =
    roundUnits(
      input.availableBalance -
      input.requestedUnits
    );

  if (
    resultingBalance >= 0
  ) {
    return;
  }

  if (
    !databaseBoolean(
      input.rule.allow_negative_balance
    )
  ) {
    throw new Error(
      "INSUFFICIENT_LEAVE_BALANCE"
    );
  }

  const negativeLimit =
    Number(
      input.rule.negative_balance_limit
    );

  if (
    Math.abs(
      resultingBalance
    ) >
    negativeLimit
  ) {
    throw new Error(
      "NEGATIVE_LEAVE_BALANCE_LIMIT_EXCEEDED"
    );
  }
}

async function reserveLeaveBalance(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    leaveTypeId: string;
    leavePeriodId: string;

    leaveRequestId: string;

    units: number;
    transactionDate: string;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;

    createdByUserId: string;
  }
): Promise<{
  leaveBalanceId: string;
  transactionId: string;
}> {
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

  const balanceBefore =
    Number(
      balance.available_balance
    );

  assertSufficientBalance({
    availableBalance:
      balanceBefore,

    requestedUnits:
      input.units,

    rule:
      input.rule
  });

  const balanceAfter =
    roundUnits(
      balanceBefore -
      input.units
    );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          pending_units =
            pending_units + ?,

          available_balance = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      input.units,
      balanceAfter,
      String(
        balance.leave_balance_id
      ),
      input.companyId
    ]
  );

  const transactionId =
    await insertBalanceTransaction(
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
          "LEAVE_RESERVED",

        unitsChanged:
          -input.units,

        balanceBefore,
        balanceAfter,

        leaveRequestId:
          input.leaveRequestId,

        remarks:
          "Leave balance reserved on request submission",

        createdByUserId:
          input.createdByUserId
      }
    );

  return {
    leaveBalanceId:
      String(
        balance.leave_balance_id
      ),

    transactionId
  };
}

async function releaseReservedLeaveBalance(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    leaveTypeId: string;
    leavePeriodId: string;

    leaveRequestId: string;

    units: number;
    transactionDate: string;

    remarks: string;

    createdByUserId: string;
  }
): Promise<{
  leaveBalanceId: string;
  transactionId: string;
}> {
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

  const currentPending =
    Number(
      balance.pending_units
    );

  if (
    currentPending + 0.005 <
    input.units
  ) {
    throw new Error(
      "LEAVE_RESERVED_UNITS_INCONSISTENT"
    );
  }

  const balanceBefore =
    Number(
      balance.available_balance
    );

  const balanceAfter =
    roundUnits(
      balanceBefore +
      input.units
    );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          pending_units =
            GREATEST(
              pending_units - ?,
              0
            ),

          available_balance = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      input.units,
      balanceAfter,
      String(
        balance.leave_balance_id
      ),
      input.companyId
    ]
  );

  const transactionId =
    await insertBalanceTransaction(
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
          "LEAVE_RELEASED",

        unitsChanged:
          input.units,

        balanceBefore,
        balanceAfter,

        leaveRequestId:
          input.leaveRequestId,

        remarks:
          input.remarks,

        createdByUserId:
          input.createdByUserId
      }
    );

  return {
    leaveBalanceId:
      String(
        balance.leave_balance_id
      ),

    transactionId
  };
}
interface LockedCarryForwardLotRow {
  carry_forward_lot_id:
    | string
    | number
    | bigint;

  remaining_units:
    | string
    | number;

  consumed_units:
    | string
    | number;

  expiry_date:
    | Date
    | string
    | null;
}

async function consumeCarryForwardLotsFifo(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;
    leaveTypeId: string;
    leavePeriodId: string;

    unitsToConsume: number;
    consumptionDate: string;
  }
): Promise<number> {
  let remainingToConsume =
    roundUnits(input.unitsToConsume);

  if (remainingToConsume <= 0) {
    return 0;
  }

  const rows =
    await connection.query(
      `
        SELECT
            carry_forward_lot_id,
            remaining_units,
            consumed_units,
            expiry_date

        FROM leave_carry_forward_lots

        WHERE company_id = ?
          AND employee_id = ?
          AND leave_type_id = ?
          AND target_period_id = ?
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
            END,
            expiry_date ASC,
            created_at ASC,
            carry_forward_lot_id ASC

        FOR UPDATE
      `,
      [
        input.companyId,
        input.employeeId,
        input.leaveTypeId,
        input.leavePeriodId,
        input.consumptionDate
      ]
    );

  const lots =
    rows as unknown as
      LockedCarryForwardLotRow[];

  let consumedFromLots = 0;

  for (const lot of lots) {
    if (remainingToConsume <= 0) {
      break;
    }

    const lotRemaining =
      Number(lot.remaining_units);

    if (lotRemaining <= 0) {
      continue;
    }

    const consumedUnits =
      roundUnits(
        Math.min(
          lotRemaining,
          remainingToConsume
        )
      );

    const updatedRemaining =
      roundUnits(
        lotRemaining -
        consumedUnits
      );

    const updatedConsumed =
      roundUnits(
        Number(lot.consumed_units) +
        consumedUnits
      );

    await connection.query(
      `
        UPDATE leave_carry_forward_lots

        SET
            remaining_units = ?,
            consumed_units = ?,

            lot_status =
              CASE
                WHEN ? <= 0
                THEN 'EXHAUSTED'
                ELSE 'ACTIVE'
              END,

            fully_consumed_at =
              CASE
                WHEN ? <= 0
                THEN CURRENT_TIMESTAMP
                ELSE NULL
              END

        WHERE carry_forward_lot_id = ?
          AND company_id = ?
          AND lot_status = 'ACTIVE'
      `,
      [
        updatedRemaining,
        updatedConsumed,
        updatedRemaining,
        updatedRemaining,
        String(
          lot.carry_forward_lot_id
        ),
        input.companyId
      ]
    );

    consumedFromLots =
      roundUnits(
        consumedFromLots +
        consumedUnits
      );

    remainingToConsume =
      roundUnits(
        remainingToConsume -
        consumedUnits
      );
  }

  return consumedFromLots;
}
async function convertReservedBalanceToUsed(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    leaveTypeId: string;
    leavePeriodId: string;

    leaveRequestId: string;

    units: number;
    transactionDate: string;

    createdByUserId: string;
  }
): Promise<{
  leaveBalanceId: string;
  transactionIds: string[];
}> {
  const released =
    await releaseReservedLeaveBalance(
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

        leaveRequestId:
          input.leaveRequestId,

        units:
          input.units,

        transactionDate:
          input.transactionDate,

        remarks:
          "Reserved balance released before final leave approval",

        createdByUserId:
          input.createdByUserId
      }
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

  const balanceBefore =
    Number(
      balance.available_balance
    );

  const balanceAfter =
    roundUnits(
      balanceBefore -
      input.units
    );

  await consumeCarryForwardLotsFifo(
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

      unitsToConsume:
        input.units,

      consumptionDate:
        input.transactionDate
    }
  );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          used_units =
            used_units + ?,

          available_balance = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      input.units,
      balanceAfter,
      String(
        balance.leave_balance_id
      ),
      input.companyId
    ]
  );

  const usedTransactionId =
    await insertBalanceTransaction(
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
          "LEAVE_USED",

        unitsChanged:
          -input.units,

        balanceBefore,
        balanceAfter,

        leaveRequestId:
          input.leaveRequestId,

        remarks:
          "Leave units consumed after final approval",

        createdByUserId:
          input.createdByUserId
      }
    );

  return {
    leaveBalanceId:
      String(
        balance.leave_balance_id
      ),

    transactionIds: [
      released.transactionId,
      usedTransactionId
    ]
  };
}

async function directlyUseLeaveBalance(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    leaveTypeId: string;
    leavePeriodId: string;

    leaveRequestId: string;

    units: number;
    transactionDate: string;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;

    createdByUserId: string;
  }
): Promise<{
  leaveBalanceId: string;
  transactionId: string;
}> {
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

  const balanceBefore =
    Number(
      balance.available_balance
    );

  assertSufficientBalance({
    availableBalance:
      balanceBefore,

    requestedUnits:
      input.units,

    rule:
      input.rule
  });

  const balanceAfter =
    roundUnits(
      balanceBefore -
      input.units
    );

  await consumeCarryForwardLotsFifo(
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

      unitsToConsume:
        input.units,

      consumptionDate:
        input.transactionDate
    }
  );

  await connection.query(
    `
      UPDATE employee_leave_balances

      SET
          used_units =
            used_units + ?,

          available_balance = ?,

          last_calculated_at =
            CURRENT_TIMESTAMP

      WHERE leave_balance_id = ?
        AND company_id = ?
    `,
    [
      input.units,
      balanceAfter,
      String(
        balance.leave_balance_id
      ),
      input.companyId
    ]
  );

  const transactionId =
    await insertBalanceTransaction(
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
          "LEAVE_USED",

        unitsChanged:
          -input.units,

        balanceBefore,
        balanceAfter,

        leaveRequestId:
          input.leaveRequestId,

        remarks:
          "Leave automatically approved and deducted",

        createdByUserId:
          input.createdByUserId
      }
    );

  return {
    leaveBalanceId:
      String(
        balance.leave_balance_id
      ),

    transactionId
  };
}

/*
 * =========================================================
 * Approval hierarchy resolution
 * =========================================================
 */

async function findActiveUserByEmployeeId(
  connection: PoolConnection,
  companyId: string,
  employeeId: string
): Promise<ActiveUserRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            user_id,
            employee_id,
            username

        FROM users

        WHERE employee_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | ActiveUserRow
      | undefined
  ) ?? null;
}

async function findExplicitReportingManager(
  connection: PoolConnection,
  employeeId: string,
  effectiveDate: string
): Promise<string | null> {
  const rows =
    await connection.query(
      `
        SELECT reporting_manager_id

        FROM employee_assignments

        WHERE employee_id = ?
          AND reporting_manager_id IS NOT NULL

          AND effective_from <= ?

          AND (
            effective_to IS NULL
            OR effective_to >= ?
          )

        ORDER BY
            (
              assignment_type =
              'PRIMARY'
            ) DESC,

            is_current DESC,
            effective_from DESC,
            assignment_id DESC

        LIMIT 1
      `,
      [
        employeeId,
        effectiveDate,
        effectiveDate
      ]
    );

  const row =
    rows[0] as
      | {
          reporting_manager_id:
            | string
            | number
            | bigint;
        }
      | undefined;

  return row
    ? String(
        row.reporting_manager_id
      )
    : null;
}

async function findPositionReportingManager(
  connection: PoolConnection,
  companyId: string,
  employeeId: string,
  effectiveDate: string
): Promise<string | null> {
  const rows =
    await connection.query(
      `
        SELECT manager_pa.employee_id

        FROM position_assignments employee_pa

        INNER JOIN positions employee_position
            ON employee_position.position_id =
               employee_pa.position_id

        INNER JOIN positions manager_position
            ON manager_position.position_id =
               employee_position.reports_to_position_id

        INNER JOIN position_assignments manager_pa
            ON manager_pa.position_id =
               manager_position.position_id

        INNER JOIN employees manager_employee
            ON manager_employee.employee_id =
               manager_pa.employee_id

        WHERE employee_pa.employee_id = ?

          AND employee_position.company_id = ?
          AND manager_position.company_id = ?

          AND employee_pa.effective_from <= ?
          AND (
            employee_pa.effective_to IS NULL
            OR employee_pa.effective_to >= ?
          )

          AND manager_pa.effective_from <= ?
          AND (
            manager_pa.effective_to IS NULL
            OR manager_pa.effective_to >= ?
          )

          AND manager_employee.is_active = 1
          AND manager_employee.deleted_at IS NULL

        ORDER BY
            employee_pa.is_current DESC,
            manager_pa.is_current DESC,

            (
              employee_pa.assignment_type =
              'PRIMARY'
            ) DESC,

            (
              manager_pa.assignment_type =
              'PRIMARY'
            ) DESC,

            employee_pa.effective_from DESC,
            manager_pa.effective_from DESC

        LIMIT 1
      `,
      [
        employeeId,
        companyId,
        companyId,
        effectiveDate,
        effectiveDate,
        effectiveDate,
        effectiveDate
      ]
    );

  const row =
    rows[0] as
      | ManagerEmployeeRow
      | undefined;

  return row
    ? String(
        row.employee_id
      )
    : null;
}

async function resolveLeaveApprovers(
  connection: PoolConnection,
  input: {
    companyId: string;
    employeeId: string;

    effectiveDate: string;
    approvalLevels: number;
  }
): Promise<
  ResolveLeaveApprovalResult[]
> {
  if (
    input.approvalLevels <= 0
  ) {
    return [];
  }

  const approvals:
    ResolveLeaveApprovalResult[] =
      [];

  const visitedEmployeeIds =
    new Set<string>([
      input.employeeId
    ]);

  let currentEmployeeId =
    input.employeeId;

  let attempts = 0;

  while (
    approvals.length <
      input.approvalLevels &&
    attempts < 25
  ) {
    attempts += 1;

    const explicitManagerId =
      await findExplicitReportingManager(
        connection,
        currentEmployeeId,
        input.effectiveDate
      );

    let managerEmployeeId =
      explicitManagerId;

    let source:
      | "REPORTING_MANAGER"
      | "POSITION_HIERARCHY" =
        "REPORTING_MANAGER";

    if (!managerEmployeeId) {
      managerEmployeeId =
        await findPositionReportingManager(
          connection,
          input.companyId,
          currentEmployeeId,
          input.effectiveDate
        );

      source =
        "POSITION_HIERARCHY";
    }

    if (!managerEmployeeId) {
      break;
    }

    if (
      visitedEmployeeIds.has(
        managerEmployeeId
      )
    ) {
      throw new Error(
        "LEAVE_APPROVAL_HIERARCHY_CYCLE"
      );
    }

    visitedEmployeeIds.add(
      managerEmployeeId
    );

    const managerUser =
      await findActiveUserByEmployeeId(
        connection,
        input.companyId,
        managerEmployeeId
      );

    currentEmployeeId =
      managerEmployeeId;

    if (!managerUser) {
      continue;
    }

    approvals.push({
      approvalLevel:
        approvals.length + 1,

      approverUserId:
        String(
          managerUser.user_id
        ),

      approverEmployeeId:
        managerEmployeeId,

      source,

      isFinalLevel:
        approvals.length + 1 ===
        input.approvalLevels
    });
  }

  if (
    approvals.length <
    input.approvalLevels
  ) {
    // edited by wali: Add the active tenant Company Admin when the employee's manager chain is short.
    const adminRows = await connection.query(
      `
        SELECT u.user_id, u.employee_id
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.user_id
        INNER JOIN roles r ON r.role_id = ur.role_id
        WHERE u.company_id = ?
          AND u.is_active = 1
          AND u.deleted_at IS NULL
          AND ur.is_active = 1
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
          AND r.is_active = 1
          AND r.role_code = 'COMPANY_ADMIN'
          AND (r.company_id = ? OR r.company_id IS NULL)
        ORDER BY CASE WHEN r.company_id = ? THEN 0 ELSE 1 END, ur.assigned_at DESC
        LIMIT 1
      `,
      [input.companyId, input.companyId, input.companyId]
    ) as Array<{ user_id: string | number | bigint; employee_id: string | number | bigint | null }>;

    const companyAdmin = adminRows[0];
    if (companyAdmin) {
      const existingAdminApproval = approvals.find((approval) => approval.approverUserId === String(companyAdmin.user_id));
      approvals.forEach((approval) => { approval.isFinalLevel = false; });
      if (existingAdminApproval) {
        existingAdminApproval.isFinalLevel = true;
      } else {
        approvals.push({
          approvalLevel: approvals.length + 1,
          approverUserId: String(companyAdmin.user_id),
          approverEmployeeId: companyAdmin.employee_id === null ? null : String(companyAdmin.employee_id),
          source: "ADMIN_FALLBACK",
          isFinalLevel: true
        });
      }
    }

    if (approvals.length < input.approvalLevels && !approvals.some((approval) => approval.source === "ADMIN_FALLBACK" || approval.isFinalLevel)) {
      throw new Error(
        "LEAVE_APPROVER_NOT_CONFIGURED"
      );
    }
  }

  return approvals;
}

async function createApprovalRows(
  connection: PoolConnection,
  leaveRequestId: string,
  approvals:
    ResolveLeaveApprovalResult[]
): Promise<void> {
  await connection.query(
    `
      DELETE FROM leave_request_approvals
      WHERE leave_request_id = ?
    `,
    [
      leaveRequestId
    ]
  );

  for (
    const approval
    of approvals
  ) {
    await connection.query(
      `
        INSERT INTO leave_request_approvals (
            leave_request_id,
            approval_level,
            approver_user_id,
            decision,
            comments,
            decided_at,
            is_final_level
        )
        VALUES (
            ?,
            ?,
            ?,
            'PENDING',
            NULL,
            NULL,
            ?
        )
      `,
      [
        leaveRequestId,
        approval.approvalLevel,
        approval.approverUserId,
        approval.isFinalLevel
          ? 1
          : 0
      ]
    );
  }
}

/*
 * =========================================================
 * Delegated approval access
 * =========================================================
 */

async function canUserActForApprover(
  connection: PoolConnection,
  input: {
    companyId: string;

    actingUserId: string;
    approverUserId: string;
    // edited by wali: The caller sets this only for a Company Admin acting within their authenticated company.
    allowCompanyAdminOverride?: boolean;
  }
): Promise<boolean> {
  if (input.allowCompanyAdminOverride) return true;
  if (
    input.actingUserId ===
    input.approverUserId
  ) {
    return true;
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
          AND effective_from <= CURRENT_TIMESTAMP
          AND effective_to >= CURRENT_TIMESTAMP

        LIMIT 1
      `,
      [
        input.companyId,
        input.approverUserId,
        input.actingUserId
      ]
    );

  return rows.length > 0;
}

async function assertApprovalIsCurrentLevel(
  connection: PoolConnection,
  leaveRequestId: string,
  approvalLevel: number
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT leave_approval_id

        FROM leave_request_approvals

        WHERE leave_request_id = ?
          AND approval_level < ?
          AND decision NOT IN (
            'APPROVED',
            'SKIPPED'
          )

        LIMIT 1
        FOR UPDATE
      `,
      [
        leaveRequestId,
        approvalLevel
      ]
    );

  if (
    rows.length > 0
  ) {
    throw new Error(
      "LEAVE_APPROVAL_PREVIOUS_LEVEL_PENDING"
    );
  }
}

/*
 * =========================================================
 * Attachment requirement validation
 * =========================================================
 */

async function validateAttachmentRequirement(
  connection: PoolConnection,
  input: {
    leaveRequestId: string;

    leaveType:
      LockedLeaveTypeRow;

    rule:
      ApplicableLeaveRequestRuleDatabaseRow;

    chargeableUnits: number;
  }
): Promise<void> {
  const leaveTypeRequiresAttachment =
    databaseBoolean(
      input.leaveType.requires_attachment
    );

  const threshold =
    input.rule.attachment_required_after_units ===
      null
      ? null
      : Number(
          input.rule.attachment_required_after_units
        );

  const thresholdRequiresAttachment =
    threshold !== null &&
    input.chargeableUnits >
      threshold;

  if (
    !leaveTypeRequiresAttachment &&
    !thresholdRequiresAttachment
  ) {
    return;
  }

  const rows =
    await connection.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_request_attachments

        WHERE leave_request_id = ?
      `,
      [
        input.leaveRequestId
      ]
    );

  const countRow =
    rows[0] as
      | CountDatabaseRow
      | undefined;

  if (
    Number(
      countRow?.total_records ??
      0
    ) === 0
  ) {
    throw new Error(
      "LEAVE_REQUEST_ATTACHMENT_REQUIRED"
    );
  }
}

/*
 * =========================================================
 * Public list and lookup functions
 * =========================================================
 */

export async function listLeaveRequestRecords(
  companyId: string,
  filters: LeaveRequestListFilters
): Promise<
  PaginatedLeaveRequestResult<
    LeaveRequestDatabaseRow
  >
> {
  const conditions: string[] = [
    "lr.company_id = ?",
    "e.deleted_at IS NULL",
    "lt.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.employeeId) {
    conditions.push(
      "lr.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.leaveTypeId) {
    conditions.push(
      "lr.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.leavePeriodId) {
    conditions.push(
      "lr.leave_period_id = ?"
    );

    parameters.push(
      filters.leavePeriodId
    );
  }

  if (filters.requestStatus) {
    conditions.push(
      "lr.request_status = ?"
    );

    parameters.push(
      filters.requestStatus
    );
  }

  if (filters.startDateFrom) {
    conditions.push(
      "lr.start_date >= ?"
    );

    parameters.push(
      filters.startDateFrom
    );
  }

  if (filters.startDateTo) {
    conditions.push(
      "lr.start_date <= ?"
    );

    parameters.push(
      filters.startDateTo
    );
  }

  if (filters.overlappingDateFrom) {
    conditions.push(
      "lr.end_date >= ?"
    );

    parameters.push(
      filters.overlappingDateFrom
    );
  }

  if (filters.overlappingDateTo) {
    conditions.push(
      "lr.start_date <= ?"
    );

    parameters.push(
      filters.overlappingDateTo
    );
  }

  if (filters.submittedByUserId) {
    conditions.push(
      "lr.submitted_by_user_id = ?"
    );

    parameters.push(
      filters.submittedByUserId
    );
  }

  if (
    filters.finalDecisionByUserId
  ) {
    conditions.push(
      "lr.final_decision_by_user_id = ?"
    );

    parameters.push(
      filters.finalDecisionByUserId
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        lr.request_number LIKE ?
        OR e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR lt.leave_type_code LIKE ?
        OR lt.leave_type_name LIKE ?
        OR lr.reason LIKE ?
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

  const whereClause =
    conditions.join(
      " AND "
    );

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total_records

        FROM leave_requests lr

        INNER JOIN employees e
            ON e.employee_id =
               lr.employee_id

        INNER JOIN leave_types lt
            ON lt.leave_type_id =
               lr.leave_type_id

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
        ${leaveRequestSelect}

        WHERE ${whereClause}

        ORDER BY
            lr.created_at DESC,
            lr.leave_request_id DESC

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
        LeaveRequestDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

export async function listEmployeeLeaveRequestRecords(
  companyId: string,
  employeeId: string,
  filters:
    EmployeeLeaveRequestListFilters
): Promise<
  PaginatedLeaveRequestResult<
    LeaveRequestDatabaseRow
  >
> {
  return listLeaveRequestRecords(
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
            overlappingDateFrom:
              filters.dateFrom
          }
        : {}),

      ...(filters.dateTo !==
      undefined
        ? {
            overlappingDateTo:
              filters.dateTo
          }
        : {}),

      ...(filters.search !==
      undefined
        ? {
            search:
              filters.search
          }
        : {}),

      page:
        filters.page,

      pageSize:
        filters.pageSize
    }
  );
}

export async function findLeaveRequestRecordById(
  companyId: string,
  leaveRequestId: string
): Promise<LeaveRequestDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leaveRequestSelect}

        WHERE lr.leave_request_id = ?
          AND lr.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL

        LIMIT 1
      `,
      [
        leaveRequestId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveRequestDatabaseRow
      | undefined
  ) ?? null;
}

export async function findEmployeeLeaveRequestRecordById(
  companyId: string,
  employeeId: string,
  leaveRequestId: string
): Promise<LeaveRequestDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${leaveRequestSelect}

        WHERE lr.leave_request_id = ?
          AND lr.employee_id = ?
          AND lr.company_id = ?
          AND e.deleted_at IS NULL
          AND lt.deleted_at IS NULL

        LIMIT 1
      `,
      [
        leaveRequestId,
        employeeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | LeaveRequestDatabaseRow
      | undefined
  ) ?? null;
}

export async function listLeaveRequestDayRecords(
  leaveRequestId: string
): Promise<
  LeaveRequestDayDatabaseRow[]
> {
  const rows =
    await databasePool.query(
      `
        ${leaveRequestDaySelect}

        WHERE lrd.leave_request_id = ?

        ORDER BY
            lrd.leave_date ASC,
            lrd.leave_request_day_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestDayDatabaseRow[]
  );
}

export async function listLeaveRequestAttachmentRecords(
  leaveRequestId: string
): Promise<
  LeaveRequestAttachmentDatabaseRow[]
> {
  const rows =
    await databasePool.query(
      `
        ${leaveAttachmentSelect}

        WHERE lra.leave_request_id = ?

        ORDER BY
            lra.created_at ASC,
            lra.attachment_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestAttachmentDatabaseRow[]
  );
}

export async function listLeaveRequestApprovalRecords(
  leaveRequestId: string
): Promise<
  LeaveRequestApprovalDatabaseRow[]
> {
  const rows =
    await databasePool.query(
      `
        ${leaveApprovalSelect}

        WHERE lrap.leave_request_id = ?

        ORDER BY
            lrap.approval_level ASC,
            lrap.leave_approval_id ASC
      `,
      [
        leaveRequestId
      ]
    );

  return (
    rows as unknown as
      LeaveRequestApprovalDatabaseRow[]
  );
}

export async function getDetailedLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string
): Promise<
  LeaveRequestDetailedDatabaseResult
  | null
> {
  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    return null;
  }

  const [
    days,
    attachments,
    approvals
  ] = await Promise.all([
    listLeaveRequestDayRecords(
      leaveRequestId
    ),

    listLeaveRequestAttachmentRecords(
      leaveRequestId
    ),

    listLeaveRequestApprovalRecords(
      leaveRequestId
    )
  ]);

  const connection =
    await databasePool.getConnection();

  try {
    const organization =
      await findEmployeeOrganizationalContext(
        connection,
        companyId,
        String(
          request.employee_id
        ),
        databaseDateOnly(
          request.start_date
        ) ??
        currentDateOnly()
      );

    const blackoutMatches =
      organization
        ? await findApplicableBlackoutPeriods(
            connection,
            {
              companyId,

              branchId:
                organization.branch_id ===
                  null
                  ? null
                  : String(
                      organization.branch_id
                    ),

              departmentId:
                organization.department_id ===
                  null
                  ? null
                  : String(
                      organization.department_id
                    ),

              leaveTypeId:
                String(
                  request.leave_type_id
                ),

              startDate:
                databaseDateOnly(
                  request.start_date
                ) ??
                currentDateOnly(),

              endDate:
                databaseDateOnly(
                  request.end_date
                ) ??
                currentDateOnly()
            }
          )
        : [];

    return {
      request,
      days,
      attachments,
      approvals,
      blackoutMatches
    };
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Draft creation
 * =========================================================
 */

export async function createLeaveRequestRecord(
  input: LeaveRequestDraftInput,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveRequestDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const temporaryRequestId =
      "0";

    const validation =
      await validateRequestConfiguration(
        connection,
        {
          companyId:
            input.companyId,

          employeeId:
            input.employeeId,

          leaveRequestId:
            temporaryRequestId,

          leaveTypeId:
            input.leaveTypeId,

          startDate:
            input.startDate,

          endDate:
            input.endDate,

          startSession:
            input.startSession,

          endSession:
            input.endSession,

          startTime:
            input.startTime,

          endTime:
            input.endTime,

          requestedInputUnits:
            input.requestedUnits,

          workHandoverToEmployeeId:
            input.workHandoverToEmployeeId,

          excludedLeaveRequestId:
            null
        }
      );

    const result =
      await connection.query(
        `
          INSERT INTO leave_requests (
              company_id,
              employee_id,
              leave_type_id,
              leave_period_id,
              request_number,
              start_date,
              end_date,
              start_session,
              end_session,
              start_time,
              end_time,
              requested_units,
              reason,
              contact_number,
              contact_address,
              work_handover_to_employee_id,
              work_handover_notes,
              request_status
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
              'DRAFT'
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.leaveTypeId,

          String(
            validation
              .leavePeriod
              .leave_period_id
          ),

          requestNumber(),

          input.startDate,
          input.endDate,
          input.startSession,
          input.endSession,
          input.startTime,
          input.endTime,

          validation
            .chargeableUnits,

          input.reason,
          input.contactNumber,
          input.contactAddress,

          input
            .workHandoverToEmployeeId,

          input.workHandoverNotes
        ]
      ) as unknown as InsertResult;

    const leaveRequestId =
      String(
        result.insertId
      );

    const requestDays =
      validation.days.map(
        (
          day
        ) => ({
          ...day,
          leaveRequestId
        })
      );

    await replaceRequestDays(
      connection,
      leaveRequestId,
      requestDays
    );

    const created =
      await selectLeaveRequestUsingConnection(
        connection,
        input.companyId,
        leaveRequestId
      );

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "leave_request_created",

        tableName:
          "leave_requests",

        recordId:
          leaveRequestId,

        newValues:
          requestLogSummary(
            created
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/leave-requests`,

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
 * Draft update
 * =========================================================
 */

export async function updateLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  input: UpdateLeaveRequestRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveRequestDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const existing =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      existing.request_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ONLY_DRAFT_LEAVE_REQUEST_CAN_BE_UPDATED"
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
        "INVALID_LEAVE_REQUEST_DATES"
      );
    }

    const finalLeaveTypeId =
      input.leaveTypeId ??
      String(
        existing.leave_type_id
      );

    const finalStartDate =
      input.startDate ??
      existingStartDate;

    const finalEndDate =
      input.endDate ??
      existingEndDate;

    const finalStartSession =
      input.startSession ??
      existing.start_session;

    const finalEndSession =
      input.endSession ??
      existing.end_session;

    const finalStartTime =
      input.startTime !==
      undefined
        ? input.startTime
        : existing.start_time;

    const finalEndTime =
      input.endTime !==
      undefined
        ? input.endTime
        : existing.end_time;

    const finalHandoverEmployeeId =
      input
        .workHandoverToEmployeeId !==
      undefined
        ? input
            .workHandoverToEmployeeId
        : existing
            .work_handover_to_employee_id ===
          null
          ? null
          : String(
              existing
                .work_handover_to_employee_id
            );

    const validation =
      await validateRequestConfiguration(
        connection,
        {
          companyId,

          employeeId:
            String(
              existing.employee_id
            ),

          leaveRequestId,

          leaveTypeId:
            finalLeaveTypeId,

          startDate:
            finalStartDate,

          endDate:
            finalEndDate,

          startSession:
            finalStartSession,

          endSession:
            finalEndSession,

          startTime:
            finalStartTime,

          endTime:
            finalEndTime,

          requestedInputUnits:
            input.requestedUnits ??
            null,

          workHandoverToEmployeeId:
            finalHandoverEmployeeId,

          excludedLeaveRequestId:
            leaveRequestId
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
      input.leaveTypeId !==
      undefined
    ) {
      addUpdate(
        "leave_type_id",
        input.leaveTypeId
      );
    }

    addUpdate(
      "leave_period_id",
      String(
        validation
          .leavePeriod
          .leave_period_id
      )
    );

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
      input.startSession !==
      undefined
    ) {
      addUpdate(
        "start_session",
        input.startSession
      );
    }

    if (
      input.endSession !==
      undefined
    ) {
      addUpdate(
        "end_session",
        input.endSession
      );
    }

    if (
      input.startTime !==
      undefined
    ) {
      addUpdate(
        "start_time",
        input.startTime
      );
    }

    if (
      input.endTime !==
      undefined
    ) {
      addUpdate(
        "end_time",
        input.endTime
      );
    }

    addUpdate(
      "requested_units",
      validation.chargeableUnits
    );

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
      input.contactNumber !==
      undefined
    ) {
      addUpdate(
        "contact_number",
        input.contactNumber
      );
    }

    if (
      input.contactAddress !==
      undefined
    ) {
      addUpdate(
        "contact_address",
        input.contactAddress
      );
    }

    if (
      input
        .workHandoverToEmployeeId !==
      undefined
    ) {
      addUpdate(
        "work_handover_to_employee_id",
        input
          .workHandoverToEmployeeId
      );
    }

    if (
      input.workHandoverNotes !==
      undefined
    ) {
      addUpdate(
        "work_handover_notes",
        input.workHandoverNotes
      );
    }

    parameters.push(
      leaveRequestId,
      companyId
    );

    await connection.query(
      `
        UPDATE leave_requests

        SET ${assignments.join(
          ", "
        )}

        WHERE leave_request_id = ?
          AND company_id = ?
          AND request_status = 'DRAFT'
      `,
      parameters
    );

    await replaceRequestDays(
      connection,
      leaveRequestId,
      validation.days
    );

    const updated =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_updated",

        tableName:
          "leave_requests",

        recordId:
          leaveRequestId,

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
          `/api/v1/leave/requests/${leaveRequestId}`,

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
 * Attachment metadata
 * =========================================================
 */

export async function createLeaveRequestAttachmentRecord(
  companyId: string,
  input:
    CreateLeaveRequestAttachmentRecord,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveRequestAttachmentDatabaseRow
> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        input.leaveRequestId
      );

    if (!request) {
      throw new Error(
        "LEAVE_REQUEST_NOT_FOUND"
      );
    }

    if (
      request.request_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ATTACHMENTS_CAN_ONLY_BE_CHANGED_ON_DRAFT_REQUEST"
      );
    }

    const result =
      await connection.query(
        `
          INSERT INTO leave_request_attachments (
              leave_request_id,
              attachment_type,
              attachment_title,
              original_filename,
              stored_filename,
              storage_path,
              mime_type,
              file_size_bytes,
              checksum_sha256,
              uploaded_by_user_id
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
              ?
          )
        `,
        [
          input.leaveRequestId,
          input.attachmentType,
          input.attachmentTitle,
          input.originalFilename,
          input.storedFilename,
          input.storagePath,
          input.mimeType,
          input.fileSizeBytes,
          input.checksumSha256,
          input.uploadedByUserId
        ]
      ) as unknown as InsertResult;

    const attachmentId =
      String(
        result.insertId
      );

    const rows =
      await connection.query(
        `
          ${leaveAttachmentSelect}

          WHERE lra.attachment_id = ?

          LIMIT 1
        `,
        [
          attachmentId
        ]
      );

    const created =
      (
        rows[0] as
          | LeaveRequestAttachmentDatabaseRow
          | undefined
      ) ?? null;

    if (!created) {
      throw new Error(
        "CREATED_LEAVE_ATTACHMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_attachment_created",

        tableName:
          "leave_request_attachments",

        recordId:
          attachmentId,

        newValues: {
          attachmentId,
          leaveRequestId:
            input.leaveRequestId,

          originalFilename:
            input.originalFilename,

          mimeType:
            input.mimeType,

          fileSizeBytes:
            input.fileSizeBytes
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${input.leaveRequestId}/attachments`,

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

export async function deleteLeaveRequestAttachmentRecord(
  companyId: string,
  leaveRequestId: string,
  attachmentId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<
  LeaveRequestAttachmentDatabaseRow
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

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      request.request_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ATTACHMENTS_CAN_ONLY_BE_CHANGED_ON_DRAFT_REQUEST"
      );
    }

    const rows =
      await connection.query(
        `
          ${leaveAttachmentSelect}

          WHERE lra.attachment_id = ?
            AND lra.leave_request_id = ?

          LIMIT 1
          FOR UPDATE
        `,
        [
          attachmentId,
          leaveRequestId
        ]
      );

    const attachment =
      (
        rows[0] as
          | LeaveRequestAttachmentDatabaseRow
          | undefined
      ) ?? null;

    if (!attachment) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    await connection.query(
      `
        DELETE FROM leave_request_attachments

        WHERE attachment_id = ?
          AND leave_request_id = ?
      `,
      [
        attachmentId,
        leaveRequestId
      ]
    );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_attachment_deleted",

        tableName:
          "leave_request_attachments",

        recordId:
          attachmentId,

        oldValues: {
          attachmentId,
          leaveRequestId,
          originalFilename:
            attachment.original_filename,

          storagePath:
            attachment.storage_path
        },

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/attachments/${attachmentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return attachment;
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
 * Request submission
 * =========================================================
 */

export async function submitLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  submittedByUserId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveRequestSubmissionResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      request.request_status !==
      "DRAFT"
    ) {
      throw new Error(
        "ONLY_DRAFT_LEAVE_REQUEST_CAN_BE_SUBMITTED"
      );
    }

    const startDate =
      databaseDateOnly(
        request.start_date
      );

    const endDate =
      databaseDateOnly(
        request.end_date
      );

    if (
      !startDate ||
      !endDate
    ) {
      throw new Error(
        "INVALID_LEAVE_REQUEST_DATES"
      );
    }

    const validation =
      await validateRequestConfiguration(
        connection,
        {
          companyId,

          employeeId:
            String(
              request.employee_id
            ),

          leaveRequestId,

          leaveTypeId:
            String(
              request.leave_type_id
            ),

          startDate,
          endDate,

          startSession:
            request.start_session,

          endSession:
            request.end_session,

          startTime:
            request.start_time,

          endTime:
            request.end_time,

          requestedInputUnits:
            Number(
              request.requested_units
            ),

          workHandoverToEmployeeId:
            request
              .work_handover_to_employee_id ===
            null
              ? null
              : String(
                  request
                    .work_handover_to_employee_id
                ),

          excludedLeaveRequestId:
            leaveRequestId
        }
      );

    await validateAttachmentRequirement(
      connection,
      {
        leaveRequestId,

        leaveType:
          validation.leaveType,

        rule:
          validation.rule,

        chargeableUnits:
          validation.chargeableUnits
      }
    );

    await replaceRequestDays(
      connection,
      leaveRequestId,
      validation.days
    );

    const leavePeriodId =
      String(
        validation
          .leavePeriod
          .leave_period_id
      );

    const approvalRequired =
      databaseBoolean(
        validation
          .leaveType
          .requires_approval
      ) &&
      Number(
        validation
          .rule
          .approval_levels_required
      ) > 0;

    let leaveBalanceId =
      "";

    let balanceTransactionId =
      "";

    if (approvalRequired) {
      const approvalLevels =
        Number(
          validation
            .rule
            .approval_levels_required
        );

      const approvers =
        await resolveLeaveApprovers(
          connection,
          {
            companyId,

            employeeId:
              String(
                request.employee_id
              ),

            effectiveDate:
              startDate,

            approvalLevels
          }
        );

      await createApprovalRows(
        connection,
        leaveRequestId,
        approvers
      );

      const reservation =
        await reserveLeaveBalance(
          connection,
          {
            companyId,

            employeeId:
              String(
                request.employee_id
              ),

            leaveTypeId:
              String(
                request.leave_type_id
              ),

            leavePeriodId,

            leaveRequestId,

            units:
              validation
                .chargeableUnits,

            transactionDate:
              currentDateOnly(),

            rule:
              validation.rule,

            createdByUserId:
              submittedByUserId
          }
        );

      leaveBalanceId =
        reservation.leaveBalanceId;

      balanceTransactionId =
        reservation.transactionId;

      await connection.query(
        `
          UPDATE leave_requests

          SET
              leave_period_id = ?,
              requested_units = ?,
              request_status = 'PENDING',
              submitted_by_user_id = ?,
              submitted_at = CURRENT_TIMESTAMP,
              final_decision_by_user_id = NULL,
              final_decision_at = NULL,
              final_remarks = NULL,
              cancelled_by_user_id = NULL,
              cancelled_at = NULL,
              cancellation_reason = NULL

          WHERE leave_request_id = ?
            AND company_id = ?
            AND request_status = 'DRAFT'
        `,
        [
          leavePeriodId,
          validation.chargeableUnits,
          submittedByUserId,
          leaveRequestId,
          companyId
        ]
      );
    } else {
      const deduction =
        await directlyUseLeaveBalance(
          connection,
          {
            companyId,

            employeeId:
              String(
                request.employee_id
              ),

            leaveTypeId:
              String(
                request.leave_type_id
              ),

            leavePeriodId,

            leaveRequestId,

            units:
              validation
                .chargeableUnits,

            transactionDate:
              currentDateOnly(),

            rule:
              validation.rule,

            createdByUserId:
              submittedByUserId
          }
        );

      leaveBalanceId =
        deduction.leaveBalanceId;

      balanceTransactionId =
        deduction.transactionId;

      await connection.query(
        `
          UPDATE leave_requests

          SET
              leave_period_id = ?,
              requested_units = ?,
              request_status = 'APPROVED',
              submitted_by_user_id = ?,
              submitted_at = CURRENT_TIMESTAMP,
              final_decision_by_user_id = ?,
              final_decision_at = CURRENT_TIMESTAMP,
              final_remarks =
                'Automatically approved because approval is not required',
              cancelled_by_user_id = NULL,
              cancelled_at = NULL,
              cancellation_reason = NULL

          WHERE leave_request_id = ?
            AND company_id = ?
            AND request_status = 'DRAFT'
        `,
        [
          leavePeriodId,
          validation.chargeableUnits,
          submittedByUserId,
          submittedByUserId,
          leaveRequestId,
          companyId
        ]
      );
    }

    const submitted =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    if (!submitted) {
      throw new Error(
        "SUBMITTED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const days =
      await selectLeaveRequestDaysUsingConnection(
        connection,
        leaveRequestId
      );

    const approvals =
      await selectLeaveApprovalsUsingConnection(
        connection,
        leaveRequestId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          approvalRequired
            ? "leave_request_submitted"
            : "leave_request_auto_approved",

        tableName:
          "leave_requests",

        recordId:
          leaveRequestId,

        oldValues:
          requestLogSummary(
            request
          ),

        newValues:
          requestLogSummary(
            submitted
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/submit`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        submitted,

      days,
      approvals,

      reservedUnits:
        approvalRequired
          ? validation
              .chargeableUnits
          : 0,

      leaveBalanceId,
      balanceTransactionId
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
 * Withdrawal and cancellation
 * =========================================================
 */

async function skipPendingApprovals(
  connection: PoolConnection,
  leaveRequestId: string,
  comments: string
): Promise<void> {
  await connection.query(
    `
      UPDATE leave_request_approvals

      SET
          decision = 'SKIPPED',
          comments = ?,
          decided_at = CURRENT_TIMESTAMP

      WHERE leave_request_id = ?
        AND decision = 'PENDING'
    `,
    [
      comments,
      leaveRequestId
    ]
  );
}

export async function withdrawLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  reason: string,
  withdrawnByUserId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveRequestLifecycleResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      request.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "ONLY_PENDING_LEAVE_REQUEST_CAN_BE_WITHDRAWN"
      );
    }

    if (
      request.leave_period_id ===
      null
    ) {
      throw new Error(
        "LEAVE_REQUEST_PERIOD_NOT_FOUND"
      );
    }

    const units =
      Number(
        request.requested_units
      );

    const released =
      await releaseReservedLeaveBalance(
        connection,
        {
          companyId,

          employeeId:
            String(
              request.employee_id
            ),

          leaveTypeId:
            String(
              request.leave_type_id
            ),

          leavePeriodId:
            String(
              request.leave_period_id
            ),

          leaveRequestId,

          units,

          transactionDate:
            currentDateOnly(),

          remarks:
            `Leave request withdrawn: ${reason}`,

          createdByUserId:
            withdrawnByUserId
        }
      );

    await skipPendingApprovals(
      connection,
      leaveRequestId,
      "Skipped because the leave request was withdrawn"
    );

    await connection.query(
      `
        UPDATE leave_requests

        SET
            request_status = 'WITHDRAWN',
            cancelled_by_user_id = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancellation_reason = ?,
            final_decision_by_user_id = NULL,
            final_decision_at = NULL,
            final_remarks = NULL

        WHERE leave_request_id = ?
          AND company_id = ?
          AND request_status = 'PENDING'
      `,
      [
        withdrawnByUserId,
        reason,
        leaveRequestId,
        companyId
      ]
    );

    const updated =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    if (!updated) {
      throw new Error(
        "WITHDRAWN_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const days =
      await selectLeaveRequestDaysUsingConnection(
        connection,
        leaveRequestId
      );

    const approvals =
      await selectLeaveApprovalsUsingConnection(
        connection,
        leaveRequestId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_withdrawn",

        tableName:
          "leave_requests",

        recordId:
          leaveRequestId,

        oldValues:
          requestLogSummary(
            request
          ),

        newValues:
          requestLogSummary(
            updated
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/withdraw`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        updated,

      days,
      approvals,

      releasedUnits:
        units,

      leaveBalanceId:
        released.leaveBalanceId,

      balanceTransactionId:
        released.transactionId
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

export async function cancelLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  reason: string,
  cancelledByUserId: string,
  actor: AttendanceActor,
  metadata: RequestMetadata
): Promise<LeaveRequestLifecycleResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      ![
        "DRAFT",
        "PENDING"
      ].includes(
        request.request_status
      )
    ) {
      throw new Error(
        "LEAVE_REQUEST_CANNOT_BE_CANCELLED"
      );
    }

    let releasedUnits = 0;

    let leaveBalanceId:
      | string
      | null =
        null;

    let balanceTransactionId:
      | string
      | null =
        null;

    if (
      request.request_status ===
      "PENDING"
    ) {
      if (
        request.leave_period_id ===
        null
      ) {
        throw new Error(
          "LEAVE_REQUEST_PERIOD_NOT_FOUND"
        );
      }

      releasedUnits =
        Number(
          request.requested_units
        );

      const released =
        await releaseReservedLeaveBalance(
          connection,
          {
            companyId,

            employeeId:
              String(
                request.employee_id
              ),

            leaveTypeId:
              String(
                request.leave_type_id
              ),

            leavePeriodId:
              String(
                request.leave_period_id
              ),

            leaveRequestId,

            units:
              releasedUnits,

            transactionDate:
              currentDateOnly(),

            remarks:
              `Leave request cancelled: ${reason}`,

            createdByUserId:
              cancelledByUserId
          }
        );

      leaveBalanceId =
        released.leaveBalanceId;

      balanceTransactionId =
        released.transactionId;

      await skipPendingApprovals(
        connection,
        leaveRequestId,
        "Skipped because the leave request was cancelled"
      );
    }

    await connection.query(
      `
        UPDATE leave_requests

        SET
            request_status = 'CANCELLED',
            cancelled_by_user_id = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancellation_reason = ?

        WHERE leave_request_id = ?
          AND company_id = ?
          AND request_status IN (
            'DRAFT',
            'PENDING'
          )
      `,
      [
        cancelledByUserId,
        reason,
        leaveRequestId,
        companyId
      ]
    );

    const updated =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    if (!updated) {
      throw new Error(
        "CANCELLED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const days =
      await selectLeaveRequestDaysUsingConnection(
        connection,
        leaveRequestId
      );

    const approvals =
      await selectLeaveApprovalsUsingConnection(
        connection,
        leaveRequestId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_cancelled",

        tableName:
          "leave_requests",

        recordId:
          leaveRequestId,

        oldValues:
          requestLogSummary(
            request
          ),

        newValues:
          requestLogSummary(
            updated
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/cancel`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        updated,

      days,
      approvals,

      releasedUnits,

      leaveBalanceId,
      balanceTransactionId
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
 * Pending approval list
 * =========================================================
 */

export async function listPendingLeaveApprovalRecords(
  companyId: string,
  actingUserId: string,
  filters:
    PendingLeaveApprovalListFilters
): Promise<
  PaginatedLeaveRequestResult<
    LeaveRequestApprovalDatabaseRow
  >
> {
  const conditions: string[] = [
    "lr.company_id = ?",
    "lrap.decision = ?",
    "lr.request_status = 'PENDING'"
  ];

  const parameters: unknown[] = [
    companyId,
    filters.decision
  ];

  if (
    filters.includeDelegated
  ) {
    conditions.push(`
      (
        lrap.approver_user_id = ?

        OR EXISTS (
          SELECT 1

          FROM leave_approval_delegations lad

          WHERE lad.company_id =
                lr.company_id

            AND lad.delegator_user_id =
                lrap.approver_user_id

            AND lad.delegate_user_id = ?

            AND lad.is_active = 1

            AND lad.effective_from <=
                CURRENT_TIMESTAMP

            AND lad.effective_to >=
                CURRENT_TIMESTAMP
        )
      )
    `);

    parameters.push(
      actingUserId,
      actingUserId
    );
  } else {
    conditions.push(
      "lrap.approver_user_id = ?"
    );

    parameters.push(
      actingUserId
    );
  }

  conditions.push(`
    NOT EXISTS (
      SELECT 1

      FROM leave_request_approvals prior_approval

      WHERE prior_approval.leave_request_id =
            lrap.leave_request_id

        AND prior_approval.approval_level <
            lrap.approval_level

        AND prior_approval.decision NOT IN (
          'APPROVED',
          'SKIPPED'
        )
    )
  `);

  if (filters.leaveTypeId) {
    conditions.push(
      "lr.leave_type_id = ?"
    );

    parameters.push(
      filters.leaveTypeId
    );
  }

  if (filters.employeeId) {
    conditions.push(
      "lr.employee_id = ?"
    );

    parameters.push(
      filters.employeeId
    );
  }

  if (filters.dateFrom) {
    conditions.push(
      "lr.end_date >= ?"
    );

    parameters.push(
      filters.dateFrom
    );
  }

  if (filters.dateTo) {
    conditions.push(
      "lr.start_date <= ?"
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
        SELECT COUNT(*) AS total_records

        FROM leave_request_approvals lrap

        INNER JOIN leave_requests lr
            ON lr.leave_request_id =
               lrap.leave_request_id

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
        ${leaveApprovalSelect}

        INNER JOIN leave_requests lr
            ON lr.leave_request_id =
               lrap.leave_request_id

        WHERE ${whereClause}

        ORDER BY
            lr.submitted_at ASC,
            lrap.approval_level ASC,
            lrap.leave_approval_id ASC

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
        LeaveRequestApprovalDatabaseRow[],

    totalRecords:
      Number(
        countRow?.total_records ??
        0
      )
  };
}

/*
 * =========================================================
 * Approval decision
 * =========================================================
 */

export async function approveLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  leaveApprovalId: string,
  actingUserId: string,
  comments: string | null,
  actor: AttendanceActor,
  metadata: RequestMetadata,
  allowCompanyAdminOverride = false
): Promise<LeaveApprovalDecisionResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      request.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "LEAVE_REQUEST_NOT_PENDING_APPROVAL"
      );
    }

    const approval =
      await lockLeaveApproval(
        connection,
        companyId,
        leaveRequestId,
        leaveApprovalId
      );

    if (!approval) {
      throw new Error(
        "LEAVE_APPROVAL_NOT_FOUND"
      );
    }

    if (
      approval.decision !==
      "PENDING"
    ) {
      throw new Error(
        "LEAVE_APPROVAL_ALREADY_DECIDED"
      );
    }

    const userCanAct =
      await canUserActForApprover(
        connection,
        {
          companyId,

          actingUserId,

          approverUserId:
            String(
              approval.approver_user_id
            ),
          allowCompanyAdminOverride
        }
      );

    if (!userCanAct) {
      throw new Error(
        "LEAVE_APPROVAL_ACCESS_DENIED"
      );
    }

    await assertApprovalIsCurrentLevel(
      connection,
      leaveRequestId,
      Number(
        approval.approval_level
      )
    );

    await connection.query(
      `
        UPDATE leave_request_approvals

        SET
            decision = 'APPROVED',
            comments = ?,
            decided_at = CURRENT_TIMESTAMP

        WHERE leave_approval_id = ?
          AND leave_request_id = ?
          AND decision = 'PENDING'
      `,
      [
        comments,
        leaveApprovalId,
        leaveRequestId
      ]
    );

    const isFinalLevel =
      databaseBoolean(
        approval.is_final_level
      );

    const transactionIds:
      string[] =
        [];

    let leaveBalanceId:
      | string
      | null =
        null;

    if (isFinalLevel) {
      if (
        request.leave_period_id ===
        null
      ) {
        throw new Error(
          "LEAVE_REQUEST_PERIOD_NOT_FOUND"
        );
      }

      const conversion =
        await convertReservedBalanceToUsed(
          connection,
          {
            companyId,

            employeeId:
              String(
                request.employee_id
              ),

            leaveTypeId:
              String(
                request.leave_type_id
              ),

            leavePeriodId:
              String(
                request.leave_period_id
              ),

            leaveRequestId,

            units:
              Number(
                request.requested_units
              ),

            transactionDate:
              currentDateOnly(),

            createdByUserId:
              actingUserId
          }
        );

      leaveBalanceId =
        conversion.leaveBalanceId;

      transactionIds.push(
        ...conversion.transactionIds
      );

      await connection.query(
        `
          UPDATE leave_requests

          SET
              request_status = 'APPROVED',
              final_decision_by_user_id = ?,
              final_decision_at = CURRENT_TIMESTAMP,
              final_remarks = ?

          WHERE leave_request_id = ?
            AND company_id = ?
            AND request_status = 'PENDING'
        `,
        [
          actingUserId,
          comments,
          leaveRequestId,
          companyId
        ]
      );
    }

    const updatedRequest =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    const updatedApproval =
      await selectLeaveApprovalUsingConnection(
        connection,
        leaveApprovalId
      );

    if (
      !updatedRequest ||
      !updatedApproval
    ) {
      throw new Error(
        "APPROVED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const approvals =
      await selectLeaveApprovalsUsingConnection(
        connection,
        leaveRequestId
      );

    const days =
      await selectLeaveRequestDaysUsingConnection(
        connection,
        leaveRequestId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          isFinalLevel
            ? "leave_request_finally_approved"
            : "leave_request_approval_level_approved",

        tableName:
          "leave_request_approvals",

        recordId:
          leaveApprovalId,

        oldValues: {
          decision:
            approval.decision,

          approvalLevel:
            Number(
              approval.approval_level
            )
        },

        newValues: {
          decision:
            "APPROVED",

          requestStatus:
            updatedRequest.request_status,

          comments
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/approvals/${leaveApprovalId}/approve`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        updatedRequest,

      approval:
        updatedApproval,

      approvals,
      days,

      finalized:
        isFinalLevel,

      leaveBalanceId,
      balanceTransactionIds:
        transactionIds
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

export async function rejectLeaveRequestRecord(
  companyId: string,
  leaveRequestId: string,
  leaveApprovalId: string,
  actingUserId: string,
  comments: string,
  actor: AttendanceActor,
  metadata: RequestMetadata,
  allowCompanyAdminOverride = false
): Promise<LeaveApprovalDecisionResult | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted =
    false;

  try {
    await connection.beginTransaction();
    transactionStarted =
      true;

    const request =
      await lockLeaveRequest(
        connection,
        companyId,
        leaveRequestId
      );

    if (!request) {
      await connection.rollback();
      transactionStarted =
        false;

      return null;
    }

    if (
      request.request_status !==
      "PENDING"
    ) {
      throw new Error(
        "LEAVE_REQUEST_NOT_PENDING_APPROVAL"
      );
    }

    const approval =
      await lockLeaveApproval(
        connection,
        companyId,
        leaveRequestId,
        leaveApprovalId
      );

    if (!approval) {
      throw new Error(
        "LEAVE_APPROVAL_NOT_FOUND"
      );
    }

    if (
      approval.decision !==
      "PENDING"
    ) {
      throw new Error(
        "LEAVE_APPROVAL_ALREADY_DECIDED"
      );
    }

    const userCanAct =
      await canUserActForApprover(
        connection,
        {
          companyId,

          actingUserId,

          approverUserId:
            String(
              approval.approver_user_id
            ),
          allowCompanyAdminOverride
        }
      );

    if (!userCanAct) {
      throw new Error(
        "LEAVE_APPROVAL_ACCESS_DENIED"
      );
    }

    await assertApprovalIsCurrentLevel(
      connection,
      leaveRequestId,
      Number(
        approval.approval_level
      )
    );

    await connection.query(
      `
        UPDATE leave_request_approvals

        SET
            decision = 'REJECTED',
            comments = ?,
            decided_at = CURRENT_TIMESTAMP

        WHERE leave_approval_id = ?
          AND leave_request_id = ?
          AND decision = 'PENDING'
      `,
      [
        comments,
        leaveApprovalId,
        leaveRequestId
      ]
    );

    await connection.query(
      `
        UPDATE leave_request_approvals

        SET
            decision = 'SKIPPED',
            comments =
              'Skipped because a previous approval level rejected the request',
            decided_at = CURRENT_TIMESTAMP

        WHERE leave_request_id = ?
          AND approval_level > ?
          AND decision = 'PENDING'
      `,
      [
        leaveRequestId,
        Number(
          approval.approval_level
        )
      ]
    );

    if (
      request.leave_period_id ===
      null
    ) {
      throw new Error(
        "LEAVE_REQUEST_PERIOD_NOT_FOUND"
      );
    }

    const released =
      await releaseReservedLeaveBalance(
        connection,
        {
          companyId,

          employeeId:
            String(
              request.employee_id
            ),

          leaveTypeId:
            String(
              request.leave_type_id
            ),

          leavePeriodId:
            String(
              request.leave_period_id
            ),

          leaveRequestId,

          units:
            Number(
              request.requested_units
            ),

          transactionDate:
            currentDateOnly(),

          remarks:
            `Leave request rejected: ${comments}`,

          createdByUserId:
            actingUserId
        }
      );

    await connection.query(
      `
        UPDATE leave_requests

        SET
            request_status = 'REJECTED',
            final_decision_by_user_id = ?,
            final_decision_at = CURRENT_TIMESTAMP,
            final_remarks = ?

        WHERE leave_request_id = ?
          AND company_id = ?
          AND request_status = 'PENDING'
      `,
      [
        actingUserId,
        comments,
        leaveRequestId,
        companyId
      ]
    );

    const updatedRequest =
      await selectLeaveRequestUsingConnection(
        connection,
        companyId,
        leaveRequestId
      );

    const updatedApproval =
      await selectLeaveApprovalUsingConnection(
        connection,
        leaveApprovalId
      );

    if (
      !updatedRequest ||
      !updatedApproval
    ) {
      throw new Error(
        "REJECTED_LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const approvals =
      await selectLeaveApprovalsUsingConnection(
        connection,
        leaveRequestId
      );

    const days =
      await selectLeaveRequestDaysUsingConnection(
        connection,
        leaveRequestId
      );

    await insertActivityLog(
      connection,
      {
        companyId,
        actor,

        actionName:
          "leave_request_rejected",

        tableName:
          "leave_request_approvals",

        recordId:
          leaveApprovalId,

        oldValues: {
          decision:
            approval.decision,

          approvalLevel:
            Number(
              approval.approval_level
            )
        },

        newValues: {
          decision:
            "REJECTED",

          requestStatus:
            "REJECTED",

          comments
        },

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/leave/requests/${leaveRequestId}/approvals/${leaveApprovalId}/reject`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted =
      false;

    return {
      request:
        updatedRequest,

      approval:
        updatedApproval,

      approvals,
      days,

      finalized:
        true,

      leaveBalanceId:
        released.leaveBalanceId,

      balanceTransactionIds: [
        released.transactionId
      ]
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

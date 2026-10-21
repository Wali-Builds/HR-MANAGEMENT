import { AppError } from "../../common/errors/app-error.js";

import type { AuthContext } from "../auth/auth.types.js";

import { findAttendanceEmployeeById } from "../attendance/attendance.repository.js";

import type {
  AttendanceActor,
  AttendanceEmployeeDatabaseRow,
  RequestMetadata
} from "../attendance/attendance.types.js";

import {
  approveLeaveRequestRecord,
  cancelLeaveRequestRecord,
  createLeaveRequestAttachmentRecord,
  createLeaveRequestRecord,
  deleteLeaveRequestAttachmentRecord,
  findEmployeeLeaveRequestRecordById,
  findLeaveRequestRecordById,
  getDetailedLeaveRequestRecord,
  listEmployeeLeaveRequestRecords,
  listLeaveRequestApprovalRecords,
  listLeaveRequestAttachmentRecords,
  listLeaveRequestDayRecords,
  listLeaveRequestRecords,
  listPendingLeaveApprovalRecords,
  rejectLeaveRequestRecord,
  submitLeaveRequestRecord,
  updateLeaveRequestRecord,
  withdrawLeaveRequestRecord
} from "./leave-request.repository.js";

import type {
  LeaveRequestDraftInput
} from "./leave-request.repository.js";

import type {
  ApproveLeaveRequestInput,
  CancelLeaveRequestInput,
  CreateLeaveRequestAttachmentInput,
  CreateLeaveRequestInput,
  EmployeeLeaveRequestListQuery,
  LeaveRequestListQuery,
  PendingLeaveApprovalListQuery,
  RejectLeaveRequestInput,
  SubmitLeaveRequestInput,
  UpdateLeaveRequestInput,
  WithdrawLeaveRequestInput
} from "./leave-request.schema.js";

import type {
  ApplicableLeaveBlackoutDatabaseRow,
  CreateLeaveRequestAttachmentRecord,
  LeaveBlackoutMatchResponse,
  LeaveRequestApprovalDatabaseRow,
  LeaveRequestApprovalResponse,
  LeaveRequestAttachmentDatabaseRow,
  LeaveRequestAttachmentResponse,
  LeaveRequestDatabaseRow,
  LeaveRequestDayDatabaseRow,
  LeaveRequestDayResponse,
  LeaveRequestDetailedResponse,
  LeaveRequestPaginationResponse,
  LeaveRequestResponse,
  UpdateLeaveRequestRecord
} from "./leave-request.types.js";

/*
 * =========================================================
 * Conversion helpers
 * =========================================================
 */

function databaseBoolean(
  value: number | boolean | null | undefined
): boolean {
  return value === true || Number(value) === 1;
}

function nullableId(
  value: string | number | bigint | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function numericValue(
  value: string | number | bigint | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function nullableNumber(
  value: string | number | bigint | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function dateOnly(
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

  // edited by wali: Preserve MariaDB DATE calendar fields instead of shifting them through UTC.
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

function requiredDateOnly(
  value: Date | string
): string {
  const result = dateOnly(value);

  if (!result) {
    throw new Error("INVALID_DATABASE_DATE");
  }

  return result;
}

function dateTimeIso(
  value: Date | string | null
): string | null {
  if (value === null) {
    return null;
  }

  let parsed: Date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
  ) {
    parsed = new Date(
      `${value.slice(0, 19).replace(" ", "T")}Z`
    );
  } else {
    parsed = new Date(value);
  }

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function requiredDateTimeIso(
  value: Date | string
): string {
  const result = dateTimeIso(value);

  if (!result) {
    throw new Error("INVALID_DATABASE_DATETIME");
  }

  return result;
}

function timeOnly(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  return value.slice(0, 8);
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): LeaveRequestPaginationResponse {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages:
      totalRecords === 0
        ? 0
        : Math.ceil(totalRecords / pageSize)
  };
}

/*
 * =========================================================
 * Authentication and authorization
 * =========================================================
 */

function getPermissions(
  auth: AuthContext
): string[] {
  const context = auth as AuthContext & {
    permissions?: string[];
  };

  return Array.isArray(context.permissions)
    ? context.permissions
    : [];
}

// edited by wali: Limit the request review permission shortcut to authenticated tenant Company Admins.
function isTenantCompanyAdmin(auth: AuthContext): boolean {
  return Boolean(
    !auth.isPlatformAdmin &&
    auth.companyId &&
    auth.roleCodes.some((code) => code.trim().toUpperCase() === "COMPANY_ADMIN")
  );
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  // edited by wali: Company Admin request actions are scoped by requireCompanyId and tenant-bound queries.
  if (isTenantCompanyAdmin(auth) && ["leave.request.view", "leave.request.approve"].includes(permissionCode)) {
    return true;
  }
  return (
    auth.isPlatformAdmin ||
    getPermissions(auth).includes(permissionCode)
  );
}

function requireCompanyId(
  auth: AuthContext
): string {
  if (!auth.companyId) {
    throw new AppError({
      message: "A company context is required",
      statusCode: 400,
      code: "COMPANY_CONTEXT_REQUIRED"
    });
  }

  return String(auth.companyId);
}

function createActor(
  auth: AuthContext
): AttendanceActor {
  return {
    userId: auth.userId,
    employeeId: auth.employeeId ?? null,
    companyId: auth.companyId ?? null,
    isPlatformAdmin: auth.isPlatformAdmin,
    permissions: getPermissions(auth)
  };
}

function isOwnEmployee(
  auth: AuthContext,
  employeeId: string
): boolean {
  return (
    auth.employeeId !== null &&
    auth.employeeId !== undefined &&
    String(auth.employeeId) === employeeId
  );
}

function assertCompanyAccess(
  auth: AuthContext,
  companyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    String(auth.companyId) !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's leave requests",
      statusCode: 403,
      code: "LEAVE_REQUEST_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertCompanyRequestListAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(auth, "leave.request.view") ||
    hasPermission(auth, "leave.request.manage") ||
    hasPermission(auth, "leave.request.approve") ||
    hasPermission(auth, "leave.view") ||
    hasPermission(auth, "leave.manage")
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view company leave requests",
    statusCode: 403,
    code: "LEAVE_REQUEST_LIST_ACCESS_DENIED"
  });
}

// edited by wali: Detect branch-scoped administration for leave data boundaries.
function isBranchAdmin(auth: AuthContext): boolean {
  return auth.branchIds.length > 0 && auth.permissions.some((permission) => permission.toUpperCase() === "BRANCH_ADMIN");
}

// edited by wali: Prevent leave detail and decision endpoints from crossing assigned branches.
function assertLeaveEmployeeBranch(auth: AuthContext, employee: AttendanceEmployeeDatabaseRow): void {
  if (isBranchAdmin(auth) && (!employee.branch_id || !auth.branchIds.includes(String(employee.branch_id)))) {
    throw new AppError({ message: "You cannot access leave records outside your assigned branch", statusCode: 403, code: "LEAVE_REQUEST_BRANCH_ACCESS_DENIED" });
  }
}

async function assertRequestViewAccess(
  auth: AuthContext,
  employeeId: string
): Promise<void> {
  // edited by wali: Apply branch scope to every direct leave request read endpoint.
  if (isBranchAdmin(auth)) assertLeaveEmployeeBranch(auth, await getEmployeeOrThrow(employeeId));
  if (isOwnEmployee(auth, employeeId)) {
    return;
  }

  if (
    hasPermission(auth, "leave.request.view") ||
    hasPermission(auth, "leave.request.manage") ||
    hasPermission(auth, "leave.request.approve") ||
    hasPermission(auth, "leave.view") ||
    hasPermission(auth, "leave.manage")
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view this leave request",
    statusCode: 403,
    code: "LEAVE_REQUEST_VIEW_ACCESS_DENIED"
  });
}

async function assertRequestManageAccess(
  auth: AuthContext,
  employeeId: string
): Promise<void> {
  // edited by wali: Apply branch scope to every employee leave request mutation.
  if (isBranchAdmin(auth)) assertLeaveEmployeeBranch(auth, await getEmployeeOrThrow(employeeId));
  if (isOwnEmployee(auth, employeeId)) {
    return;
  }

  if (
    hasPermission(auth, "leave.request.manage") ||
    hasPermission(auth, "leave.manage")
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage this leave request",
    statusCode: 403,
    code: "LEAVE_REQUEST_MANAGE_ACCESS_DENIED"
  });
}

function assertCreateRequestAccess(
  auth: AuthContext,
  employeeId: string
): void {
  if (isOwnEmployee(auth, employeeId)) {
    return;
  }

  if (
    hasPermission(auth, "leave.request.manage") ||
    hasPermission(auth, "leave.manage")
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to create a leave request for this employee",
    statusCode: 403,
    code: "LEAVE_REQUEST_CREATE_ACCESS_DENIED"
  });
}

/*
 * =========================================================
 * Employee helpers
 * =========================================================
 */

async function getEmployeeOrThrow(
  employeeId: string
): Promise<AttendanceEmployeeDatabaseRow> {
  const employee =
    await findAttendanceEmployeeById(employeeId);

  if (!employee) {
    throw new AppError({
      message: "Employee was not found",
      statusCode: 404,
      code: "EMPLOYEE_NOT_FOUND"
    });
  }

  return employee;
}

function assertEmployeeCompany(
  auth: AuthContext,
  employee: AttendanceEmployeeDatabaseRow
): void {
  assertCompanyAccess(
    auth,
    String(employee.company_id)
  );
}

function assertEmployeeActive(
  employee: AttendanceEmployeeDatabaseRow
): void {
  const row =
    employee as AttendanceEmployeeDatabaseRow & {
      is_active?: number | boolean;
    };

  if (
    row.is_active !== undefined &&
    !databaseBoolean(row.is_active)
  ) {
    throw new AppError({
      message: "Employee is inactive",
      statusCode: 409,
      code: "EMPLOYEE_INACTIVE"
    });
  }
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapLeaveRequest(
  row: LeaveRequestDatabaseRow
): LeaveRequestResponse {
  return {
    leaveRequestId: String(row.leave_request_id),
    companyId: String(row.company_id),

    employeeId: String(row.employee_id),
    employeeCode: row.employee_code,
    employeeName: row.employee_name,

    leaveTypeId: String(row.leave_type_id),
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: row.leave_type_name,
    leaveTypeUnitType: row.leave_type_unit_type,

    leaveTypeIsPaid:
      databaseBoolean(row.leave_type_is_paid),

    leaveTypeRequiresApproval:
      databaseBoolean(
        row.leave_type_requires_approval
      ),

    leaveTypeRequiresAttachment:
      databaseBoolean(
        row.leave_type_requires_attachment
      ),

    leavePeriodId:
      nullableId(row.leave_period_id),

    periodCode: row.period_code,
    periodName: row.period_name,

    periodStartDate:
      dateOnly(row.period_start_date),

    periodEndDate:
      dateOnly(row.period_end_date),

    periodStatus: row.period_status,

    requestNumber: row.request_number,

    startDate:
      requiredDateOnly(row.start_date),

    endDate:
      requiredDateOnly(row.end_date),

    startSession: row.start_session,
    endSession: row.end_session,

    startTime: timeOnly(row.start_time),
    endTime: timeOnly(row.end_time),

    requestedUnits:
      numericValue(row.requested_units),

    chargeableUnits:
      numericValue(row.chargeable_units),

    reason: row.reason,

    contactNumber: row.contact_number,
    contactAddress: row.contact_address,

    workHandoverToEmployeeId:
      nullableId(
        row.work_handover_to_employee_id
      ),

    workHandoverEmployeeCode:
      row.work_handover_employee_code,

    workHandoverEmployeeName:
      row.work_handover_employee_name,

    workHandoverNotes:
      row.work_handover_notes,

    requestStatus:
      row.request_status,

    submittedByUserId:
      nullableId(row.submitted_by_user_id),

    submittedByUsername:
      row.submitted_by_username,

    submittedAt:
      dateTimeIso(row.submitted_at),

    finalDecisionByUserId:
      nullableId(
        row.final_decision_by_user_id
      ),

    finalDecisionByUsername:
      row.final_decision_by_username,

    finalDecisionAt:
      dateTimeIso(row.final_decision_at),

    finalRemarks:
      row.final_remarks,

    cancelledByUserId:
      nullableId(row.cancelled_by_user_id),

    cancelledByUsername:
      row.cancelled_by_username,

    cancelledAt:
      dateTimeIso(row.cancelled_at),

    cancellationReason:
      row.cancellation_reason,

    requestDayCount:
      numericValue(row.request_day_count),

    chargeableDayCount:
      numericValue(row.chargeable_day_count),

    attachmentCount:
      numericValue(row.attachment_count),

    approvalCount:
      numericValue(row.approval_count),

    pendingApprovalCount:
      numericValue(row.pending_approval_count),

    approvedApprovalCount:
      numericValue(row.approved_approval_count),

    rejectedApprovalCount:
      numericValue(row.rejected_approval_count),

    createdAt:
      requiredDateTimeIso(row.created_at),

    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function mapLeaveRequestDay(
  row: LeaveRequestDayDatabaseRow
): LeaveRequestDayResponse {
  return {
    leaveRequestDayId:
      String(row.leave_request_day_id),

    leaveRequestId:
      String(row.leave_request_id),

    leaveDate:
      requiredDateOnly(row.leave_date),

    durationType:
      row.duration_type,

    requestedUnits:
      numericValue(row.requested_units),

    startTime:
      timeOnly(row.start_time),

    endTime:
      timeOnly(row.end_time),

    isWeekend:
      databaseBoolean(row.is_weekend),

    isHoliday:
      databaseBoolean(row.is_holiday),

    holidayId:
      nullableId(row.holiday_id),

    holidayName:
      row.holiday_name,

    holidayType:
      row.holiday_type,

    isChargeable:
      databaseBoolean(row.is_chargeable),

    createdAt:
      requiredDateTimeIso(row.created_at),

    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function mapLeaveRequestAttachment(
  row: LeaveRequestAttachmentDatabaseRow
): LeaveRequestAttachmentResponse {
  return {
    attachmentId:
      String(row.attachment_id),

    leaveRequestId:
      String(row.leave_request_id),

    attachmentType:
      row.attachment_type,

    attachmentTitle:
      row.attachment_title,

    originalFilename:
      row.original_filename,

    storedFilename:
      row.stored_filename,

    storagePath:
      row.storage_path,

    mimeType:
      row.mime_type,

    fileSizeBytes:
      nullableNumber(row.file_size_bytes),

    checksumSha256:
      row.checksum_sha256,

    uploadedByUserId:
      nullableId(row.uploaded_by_user_id),

    uploadedByUsername:
      row.uploaded_by_username,

    createdAt:
      requiredDateTimeIso(row.created_at)
  };
}

function mapLeaveRequestApproval(
  row: LeaveRequestApprovalDatabaseRow
): LeaveRequestApprovalResponse {
  return {
    leaveApprovalId:
      String(row.leave_approval_id),

    leaveRequestId:
      String(row.leave_request_id),

    approvalLevel:
      numericValue(row.approval_level),

    approverUserId:
      String(row.approver_user_id),

    approverUsername:
      row.approver_username,

    approverEmployeeId:
      nullableId(row.approver_employee_id),

    approverEmployeeCode:
      row.approver_employee_code,

    approverEmployeeName:
      row.approver_employee_name,

    decision:
      row.decision,

    comments:
      row.comments,

    decidedAt:
      dateTimeIso(row.decided_at),

    isFinalLevel:
      databaseBoolean(row.is_final_level),

    createdAt:
      requiredDateTimeIso(row.created_at),

    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function mapBlackoutMatch(
  row: ApplicableLeaveBlackoutDatabaseRow
): LeaveBlackoutMatchResponse {
  return {
    blackoutPeriodId:
      String(row.blackout_period_id),

    blackoutName:
      row.blackout_name,

    description:
      row.description,

    startDate:
      requiredDateOnly(row.start_date),

    endDate:
      requiredDateOnly(row.end_date),

    restrictionType:
      row.restriction_type,

    exceptionRequiresApproval:
      databaseBoolean(
        row.exception_requires_approval
      )
  };
}

function mapDetailedRequest(
  result: {
    request: LeaveRequestDatabaseRow;
    days: LeaveRequestDayDatabaseRow[];
    attachments: LeaveRequestAttachmentDatabaseRow[];
    approvals: LeaveRequestApprovalDatabaseRow[];
    blackoutMatches: ApplicableLeaveBlackoutDatabaseRow[];
  }
): LeaveRequestDetailedResponse {
  return {
    request:
      mapLeaveRequest(result.request),

    days:
      result.days.map(mapLeaveRequestDay),

    attachments:
      result.attachments.map(
        mapLeaveRequestAttachment
      ),

    approvals:
      result.approvals.map(
        mapLeaveRequestApproval
      ),

    blackoutMatches:
      result.blackoutMatches.map(
        mapBlackoutMatch
      )
  };
}

/*
 * =========================================================
 * Error translation
 * =========================================================
 */

function translateRepositoryError(
  error: unknown
): never {
  if (error instanceof AppError) {
    throw error;
  }

  const code =
    error instanceof Error
      ? error.message
      : "";

  const mappings: Record<
    string,
    {
      message: string;
      statusCode: number;
    }
  > = {
    EMPLOYEE_NOT_FOUND: {
      message: "Employee was not found",
      statusCode: 404
    },

    EMPLOYEE_INACTIVE: {
      message: "Employee is inactive",
      statusCode: 409
    },

    LEAVE_REQUEST_NOT_FOUND: {
      message: "Leave request was not found",
      statusCode: 404
    },

    LEAVE_TYPE_NOT_FOUND: {
      message: "Leave type was not found",
      statusCode: 404
    },

    LEAVE_TYPE_INACTIVE: {
      message: "Leave type is inactive",
      statusCode: 409
    },

    LEAVE_PERIOD_NOT_FOUND_FOR_REQUEST: {
      message:
        "No leave period covers the requested dates",
      statusCode: 422
    },

    LEAVE_PERIOD_NOT_FOUND: {
      message: "Leave period was not found",
      statusCode: 404
    },

    LEAVE_PERIOD_CLOSED: {
      message: "The applicable leave period is closed",
      statusCode: 409
    },

    LEAVE_REQUEST_PERIOD_NOT_FOUND: {
      message:
        "The leave request does not have an applicable leave period",
      statusCode: 409
    },

    APPLICABLE_LEAVE_POLICY_RULE_NOT_FOUND: {
      message:
        "No active leave-policy rule applies to this employee and leave type",
      statusCode: 409
    },

    LEAVE_BEFORE_EMPLOYEE_JOINING_DATE: {
      message:
        "Leave cannot start before the employee's joining date",
      statusCode: 422
    },

    LEAVE_NOT_ALLOWED_DURING_PROBATION: {
      message:
        "The applicable policy does not allow this leave during probation",
      statusCode: 422
    },

    EMPLOYEE_NOT_ELIGIBLE_FOR_LEAVE_TYPE: {
      message:
        "The employee is not eligible for this leave type",
      statusCode: 422
    },

    LEAVE_BACKDATE_LIMIT_EXCEEDED: {
      message:
        "The leave request exceeds the allowed backdate limit",
      statusCode: 422
    },

    LEAVE_MINIMUM_NOTICE_NOT_MET: {
      message:
        "The leave request does not meet the minimum notice requirement",
      statusCode: 422
    },

    LEAVE_MAXIMUM_ADVANCE_LIMIT_EXCEEDED: {
      message:
        "The leave request exceeds the maximum advance-booking limit",
      statusCode: 422
    },

    HALF_DAY_LEAVE_NOT_ALLOWED: {
      message:
        "The applicable policy does not allow half-day leave",
      statusCode: 422
    },

    HOURLY_LEAVE_NOT_ALLOWED: {
      message:
        "The applicable policy does not allow hourly leave",
      statusCode: 422
    },

    HOURLY_REQUEST_REQUIRES_HOURS_LEAVE_TYPE: {
      message:
        "Hourly leave requires a leave type measured in hours",
      statusCode: 422
    },

    DAY_REQUEST_REQUIRES_DAYS_LEAVE_TYPE: {
      message:
        "Full-day and half-day leave require a leave type measured in days",
      statusCode: 422
    },

    INVALID_HOURLY_LEAVE_REQUEST: {
      message:
        "Hourly leave must use one date and include start and end times",
      statusCode: 422
    },

    INVALID_HOURLY_LEAVE_TIME_RANGE: {
      message:
        "Hourly leave end time must be after its start time",
      statusCode: 422
    },

    INVALID_LEAVE_REQUEST_DATES: {
      message:
        "The leave-request dates are invalid",
      statusCode: 422
    },

    LEAVE_REQUEST_RANGE_TOO_LARGE: {
      message:
        "A single leave request cannot exceed 366 calendar days",
      statusCode: 422
    },

    LEAVE_REQUEST_HAS_NO_CHARGEABLE_UNITS: {
      message:
        "The leave request contains no chargeable units",
      statusCode: 422
    },

    LEAVE_MINIMUM_REQUEST_UNITS_NOT_MET: {
      message:
        "The request is below the minimum leave units allowed",
      statusCode: 422
    },

    LEAVE_MAXIMUM_REQUEST_UNITS_EXCEEDED: {
      message:
        "The request exceeds the maximum leave units allowed",
      statusCode: 422
    },

    LEAVE_REQUESTED_UNITS_MISMATCH: {
      message:
        "Requested units do not match the calculated chargeable units",
      statusCode: 422
    },

    LEAVE_REQUEST_BLOCKED_BY_BLACKOUT_PERIOD: {
      message:
        "The leave request overlaps a blocked leave period",
      statusCode: 409
    },

    EMPLOYEE_CANNOT_HANDOVER_TO_SELF: {
      message:
        "An employee cannot hand work over to themselves",
      statusCode: 422
    },

    WORK_HANDOVER_EMPLOYEE_NOT_FOUND: {
      message:
        "The selected work-handover employee was not found or is inactive",
      statusCode: 404
    },

    OVERLAPPING_LEAVE_REQUEST_EXISTS: {
      message:
        "The employee already has a pending or approved request overlapping these dates",
      statusCode: 409
    },

    LEAVE_REQUEST_ATTACHMENT_REQUIRED: {
      message:
        "An attachment is required before this leave request can be submitted",
      statusCode: 422
    },

    LEAVE_BALANCE_NOT_FOUND: {
      message:
        "No leave balance exists for the employee, leave type, and leave period",
      statusCode: 404
    },

    INSUFFICIENT_LEAVE_BALANCE: {
      message:
        "The employee does not have sufficient leave balance",
      statusCode: 422
    },

    NEGATIVE_LEAVE_BALANCE_LIMIT_EXCEEDED: {
      message:
        "The request exceeds the permitted negative leave-balance limit",
      statusCode: 422
    },

    LEAVE_RESERVED_UNITS_INCONSISTENT: {
      message:
        "The reserved leave units are inconsistent with the employee balance",
      statusCode: 409
    },

    LEAVE_APPROVER_NOT_CONFIGURED: {
      message:
        "The required leave approval hierarchy is incomplete",
      statusCode: 409
    },

    LEAVE_APPROVAL_HIERARCHY_CYCLE: {
      message:
        "A cycle was detected in the leave approval hierarchy",
      statusCode: 409
    },

    ONLY_DRAFT_LEAVE_REQUEST_CAN_BE_UPDATED: {
      message:
        "Only a draft leave request can be updated",
      statusCode: 409
    },

    ONLY_DRAFT_LEAVE_REQUEST_CAN_BE_SUBMITTED: {
      message:
        "Only a draft leave request can be submitted",
      statusCode: 409
    },

    ONLY_PENDING_LEAVE_REQUEST_CAN_BE_WITHDRAWN: {
      message:
        "Only a pending leave request can be withdrawn",
      statusCode: 409
    },

    LEAVE_REQUEST_CANNOT_BE_CANCELLED: {
      message:
        "Only draft or pending leave requests can be cancelled",
      statusCode: 409
    },

    ATTACHMENTS_CAN_ONLY_BE_CHANGED_ON_DRAFT_REQUEST: {
      message:
        "Attachments can only be changed while the request is in draft status",
      statusCode: 409
    },

    LEAVE_REQUEST_NOT_PENDING_APPROVAL: {
      message:
        "The leave request is not pending approval",
      statusCode: 409
    },

    LEAVE_APPROVAL_NOT_FOUND: {
      message:
        "The leave approval record was not found",
      statusCode: 404
    },

    LEAVE_APPROVAL_ALREADY_DECIDED: {
      message:
        "This approval level has already been decided",
      statusCode: 409
    },

    LEAVE_APPROVAL_ACCESS_DENIED: {
      message:
        "You are not the assigned approver or an active delegate",
      statusCode: 403
    },

    LEAVE_APPROVAL_PREVIOUS_LEVEL_PENDING: {
      message:
        "A previous approval level must be completed first",
      statusCode: 409
    },

    CREATED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The leave request was created but could not be retrieved",
      statusCode: 500
    },

    UPDATED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The leave request was updated but could not be retrieved",
      statusCode: 500
    },

    SUBMITTED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The leave request was submitted but could not be retrieved",
      statusCode: 500
    },

    WITHDRAWN_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The leave request was withdrawn but could not be retrieved",
      statusCode: 500
    },

    CANCELLED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The leave request was cancelled but could not be retrieved",
      statusCode: 500
    },

    CREATED_LEAVE_ATTACHMENT_NOT_FOUND: {
      message:
        "The attachment was created but could not be retrieved",
      statusCode: 500
    },

    APPROVED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The approval was saved but its updated records could not be retrieved",
      statusCode: 500
    },

    REJECTED_LEAVE_REQUEST_NOT_FOUND: {
      message:
        "The rejection was saved but its updated records could not be retrieved",
      statusCode: 500
    }
  };

  const mapping = mappings[code];

  if (mapping) {
    throw new AppError({
      message: mapping.message,
      statusCode: mapping.statusCode,
      code
    });
  }

  const databaseError = error as {
    code?: string;
    errno?: number;
  };

  if (
    databaseError.code === "ER_DUP_ENTRY" ||
    databaseError.errno === 1062
  ) {
    throw new AppError({
      message:
        "A duplicate leave request, request day, approval, or attachment record already exists",
      statusCode: 409,
      code: "LEAVE_REQUEST_DUPLICATE"
    });
  }

  if (
    databaseError.code === "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced leave, employee, holiday, user, or period record was not found",
      statusCode: 409,
      code: "LEAVE_REQUEST_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Company request listing
 * =========================================================
 */

export async function listLeaveRequests(
  query: LeaveRequestListQuery,
  auth: AuthContext
) {
  assertCompanyRequestListAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveRequestRecords(
      companyId,
      {
        // edited by wali: Keep Branch Admin leave queues inside the assigned branch.
        ...(isBranchAdmin(auth) ? { branchIds: auth.branchIds } : {}),
        ...(query.employeeId !== undefined
          ? { employeeId: query.employeeId }
          : {}),

        ...(query.leaveTypeId !== undefined
          ? { leaveTypeId: query.leaveTypeId }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? { leavePeriodId: query.leavePeriodId }
          : {}),

        ...(query.requestStatus !== undefined
          ? { requestStatus: query.requestStatus }
          : {}),

        ...(query.startDateFrom !== undefined
          ? { startDateFrom: query.startDateFrom }
          : {}),

        ...(query.startDateTo !== undefined
          ? { startDateTo: query.startDateTo }
          : {}),

        ...(query.overlappingDateFrom !== undefined
          ? {
              overlappingDateFrom:
                query.overlappingDateFrom
            }
          : {}),

        ...(query.overlappingDateTo !== undefined
          ? {
              overlappingDateTo:
                query.overlappingDateTo
            }
          : {}),

        ...(query.submittedByUserId !== undefined
          ? {
              submittedByUserId:
                query.submittedByUserId
            }
          : {}),

        ...(query.finalDecisionByUserId !== undefined
          ? {
              finalDecisionByUserId:
                query.finalDecisionByUserId
            }
          : {}),

        ...(query.search !== undefined
          ? { search: query.search }
          : {}),

        page: query.page,
        pageSize: query.pageSize
      }
    );

  if (!query.includeDetails) {
    return {
      requests:
        result.records.map(mapLeaveRequest),

      pagination:
        pagination(
          query.page,
          query.pageSize,
          result.totalRecords
        )
    };
  }

  const requests =
    await Promise.all(
      result.records.map(
        async (request) => {
          const details =
            await getDetailedLeaveRequestRecord(
              companyId,
              String(request.leave_request_id)
            );

          return details
            ? mapDetailedRequest(details)
            : {
                request:
                  mapLeaveRequest(request),

                days: [],
                attachments: [],
                approvals: [],
                blackoutMatches: []
              };
        }
      )
    );

  return {
    requests,

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

/*
 * =========================================================
 * Employee request listing and creation
 * =========================================================
 */

export async function listEmployeeLeaveRequests(
  employeeId: string,
  query: EmployeeLeaveRequestListQuery,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(employeeId);

  assertEmployeeCompany(auth, employee);
  await assertRequestViewAccess(auth, employeeId);

  const companyId =
    String(employee.company_id);

  const result =
    await listEmployeeLeaveRequestRecords(
      companyId,
      employeeId,
      {
        ...(query.leaveTypeId !== undefined
          ? { leaveTypeId: query.leaveTypeId }
          : {}),

        ...(query.leavePeriodId !== undefined
          ? { leavePeriodId: query.leavePeriodId }
          : {}),

        ...(query.requestStatus !== undefined
          ? { requestStatus: query.requestStatus }
          : {}),

        ...(query.dateFrom !== undefined
          ? { dateFrom: query.dateFrom }
          : {}),

        ...(query.dateTo !== undefined
          ? { dateTo: query.dateTo }
          : {}),

        ...(query.search !== undefined
          ? { search: query.search }
          : {}),

        page: query.page,
        pageSize: query.pageSize
      }
    );

  return {
    employeeId,
    companyId,

    requests:
      result.records.map(mapLeaveRequest),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function createEmployeeLeaveRequest(
  employeeId: string,
  input: CreateLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const employee =
    await getEmployeeOrThrow(employeeId);

  assertEmployeeCompany(auth, employee);
  assertCreateRequestAccess(auth, employeeId);
  assertEmployeeActive(employee);

  const companyId =
    String(employee.company_id);

  const record: LeaveRequestDraftInput = {
    companyId,
    employeeId,

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
      input.startTime ?? null,

    endTime:
      input.endTime ?? null,

    requestedUnits:
      input.requestedUnits ?? null,

    reason:
      input.reason,

    contactNumber:
      input.contactNumber ?? null,

    contactAddress:
      input.contactAddress ?? null,

    workHandoverToEmployeeId:
      input.workHandoverToEmployeeId ?? null,

    workHandoverNotes:
      input.workHandoverNotes ?? null
  };

  try {
    const created =
      await createLeaveRequestRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveRequest(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

/*
 * =========================================================
 * Request lookup
 * =========================================================
 */

export async function getLeaveRequest(
  leaveRequestId: string,
  includeDetails: boolean,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestViewAccess(
    auth,
    String(request.employee_id)
  );

  if (!includeDetails) {
    return mapLeaveRequest(request);
  }

  const details =
    await getDetailedLeaveRequestRecord(
      companyId,
      leaveRequestId
    );

  if (!details) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  return mapDetailedRequest(details);
}

export async function getEmployeeLeaveRequest(
  employeeId: string,
  leaveRequestId: string,
  includeDetails: boolean,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(employeeId);

  assertEmployeeCompany(auth, employee);
  await assertRequestViewAccess(auth, employeeId);

  const companyId =
    String(employee.company_id);

  const request =
    await findEmployeeLeaveRequestRecordById(
      companyId,
      employeeId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  if (!includeDetails) {
    return mapLeaveRequest(request);
  }

  const details =
    await getDetailedLeaveRequestRecord(
      companyId,
      leaveRequestId
    );

  if (!details) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  return mapDetailedRequest(details);
}

/*
 * =========================================================
 * Draft update
 * =========================================================
 */

export async function updateLeaveRequest(
  leaveRequestId: string,
  input: UpdateLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!existing) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(existing.employee_id)
  );

  const record: UpdateLeaveRequestRecord = {
    ...(input.leaveTypeId !== undefined
      ? { leaveTypeId: input.leaveTypeId }
      : {}),

    ...(input.startDate !== undefined
      ? { startDate: input.startDate }
      : {}),

    ...(input.endDate !== undefined
      ? { endDate: input.endDate }
      : {}),

    ...(input.startSession !== undefined
      ? { startSession: input.startSession }
      : {}),

    ...(input.endSession !== undefined
      ? { endSession: input.endSession }
      : {}),

    ...(input.startTime !== undefined
      ? { startTime: input.startTime }
      : {}),

    ...(input.endTime !== undefined
      ? { endTime: input.endTime }
      : {}),

    ...(input.requestedUnits !== undefined
      ? { requestedUnits: input.requestedUnits }
      : {}),

    ...(input.reason !== undefined
      ? { reason: input.reason }
      : {}),

    ...(input.contactNumber !== undefined
      ? { contactNumber: input.contactNumber }
      : {}),

    ...(input.contactAddress !== undefined
      ? { contactAddress: input.contactAddress }
      : {}),

    ...(input.workHandoverToEmployeeId !== undefined
      ? {
          workHandoverToEmployeeId:
            input.workHandoverToEmployeeId
        }
      : {}),

    ...(input.workHandoverNotes !== undefined
      ? {
          workHandoverNotes:
            input.workHandoverNotes
        }
      : {})
  };

  try {
    const updated =
      await updateLeaveRequestRecord(
        companyId,
        leaveRequestId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return mapLeaveRequest(updated);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

/*
 * =========================================================
 * Request lifecycle
 * =========================================================
 */

export async function submitLeaveRequest(
  leaveRequestId: string,
  _input: SubmitLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!existing) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(existing.employee_id)
  );

  try {
    const result =
      await submitLeaveRequestRecord(
        companyId,
        leaveRequestId,
        String(auth.userId),
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapLeaveRequest(result.request),

      days:
        result.days.map(mapLeaveRequestDay),

      approvals:
        result.approvals.map(
          mapLeaveRequestApproval
        ),

      reservedUnits:
        result.reservedUnits,

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionId:
        result.balanceTransactionId
    };
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function cancelLeaveRequest(
  leaveRequestId: string,
  input: CancelLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!existing) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(existing.employee_id)
  );

  try {
    const result =
      await cancelLeaveRequestRecord(
        companyId,
        leaveRequestId,
        input.reason,
        String(auth.userId),
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapLeaveRequest(result.request),

      days:
        result.days.map(mapLeaveRequestDay),

      approvals:
        result.approvals.map(
          mapLeaveRequestApproval
        ),

      releasedUnits:
        result.releasedUnits,

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionId:
        result.balanceTransactionId
    };
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function withdrawLeaveRequest(
  leaveRequestId: string,
  input: WithdrawLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!existing) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(existing.employee_id)
  );

  try {
    const result =
      await withdrawLeaveRequestRecord(
        companyId,
        leaveRequestId,
        input.reason,
        String(auth.userId),
        createActor(auth),
        metadata
      );

    if (!result) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapLeaveRequest(result.request),

      days:
        result.days.map(mapLeaveRequestDay),

      approvals:
        result.approvals.map(
          mapLeaveRequestApproval
        ),

      releasedUnits:
        result.releasedUnits,

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionId:
        result.balanceTransactionId
    };
  } catch (error) {
    return translateRepositoryError(error);
  }
}

/*
 * =========================================================
 * Request days
 * =========================================================
 */

export async function listLeaveRequestDays(
  leaveRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestViewAccess(
    auth,
    String(request.employee_id)
  );

  const days =
    await listLeaveRequestDayRecords(
      leaveRequestId
    );

  return {
    leaveRequestId,
    days: days.map(mapLeaveRequestDay)
  };
}

/*
 * =========================================================
 * Attachments
 * =========================================================
 */

export async function listLeaveRequestAttachments(
  leaveRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestViewAccess(
    auth,
    String(request.employee_id)
  );

  const attachments =
    await listLeaveRequestAttachmentRecords(
      leaveRequestId
    );

  return {
    leaveRequestId,

    attachments:
      attachments.map(
        mapLeaveRequestAttachment
      )
  };
}

export async function createLeaveRequestAttachment(
  leaveRequestId: string,
  input: CreateLeaveRequestAttachmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(request.employee_id)
  );

  const record:
    CreateLeaveRequestAttachmentRecord = {
      leaveRequestId,

      attachmentType:
        input.attachmentType ?? null,

      attachmentTitle:
        input.attachmentTitle ?? null,

      originalFilename:
        input.originalFilename,

      storedFilename:
        input.storedFilename,

      storagePath:
        input.storagePath,

      mimeType:
        input.mimeType ?? null,

      fileSizeBytes:
        input.fileSizeBytes ?? null,

      checksumSha256:
        input.checksumSha256 ?? null,

      uploadedByUserId:
        String(auth.userId)
    };

  try {
    const created =
      await createLeaveRequestAttachmentRecord(
        companyId,
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveRequestAttachment(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function deleteLeaveRequestAttachment(
  leaveRequestId: string,
  attachmentId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestManageAccess(
    auth,
    String(request.employee_id)
  );

  try {
    const deleted =
      await deleteLeaveRequestAttachmentRecord(
        companyId,
        leaveRequestId,
        attachmentId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Leave-request attachment was not found",
        statusCode: 404,
        code: "LEAVE_ATTACHMENT_NOT_FOUND"
      });
    }

    return mapLeaveRequestAttachment(deleted);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

/*
 * =========================================================
 * Approvals
 * =========================================================
 */

export async function listPendingLeaveApprovals(
  query: PendingLeaveApprovalListQuery,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const result =
    await listPendingLeaveApprovalRecords(
      companyId,
      String(auth.userId),
      {
        decision:
          query.decision,

        // edited by wali: Scope pending approvals to employees in assigned branches.
        ...(isBranchAdmin(auth) ? { branchIds: auth.branchIds } : {}),
        // edited by wali: Let a Branch Admin review actionable requests throughout the assigned branch.
        ...(isBranchAdmin(auth) ? { includeAllBranchPending: true } : {}),

        ...(query.leaveTypeId !== undefined
          ? { leaveTypeId: query.leaveTypeId }
          : {}),

        ...(query.employeeId !== undefined
          ? { employeeId: query.employeeId }
          : {}),

        ...(query.dateFrom !== undefined
          ? { dateFrom: query.dateFrom }
          : {}),

        ...(query.dateTo !== undefined
          ? { dateTo: query.dateTo }
          : {}),

        includeDelegated:
          query.includeDelegated,

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    approvals:
      result.records.map(
        mapLeaveRequestApproval
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function listLeaveRequestApprovals(
  leaveRequestId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const request =
    await findLeaveRequestRecordById(
      companyId,
      leaveRequestId
    );

  if (!request) {
    throw new AppError({
      message: "Leave request was not found",
      statusCode: 404,
      code: "LEAVE_REQUEST_NOT_FOUND"
    });
  }

  await assertRequestViewAccess(
    auth,
    String(request.employee_id)
  );

  const approvals =
    await listLeaveRequestApprovalRecords(
      leaveRequestId
    );

  return {
    leaveRequestId,

    approvals:
      approvals.map(
        mapLeaveRequestApproval
      )
  };
}

export async function approveLeaveRequest(
  leaveRequestId: string,
  leaveApprovalId: string,
  input: ApproveLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  // edited by wali: Verify the target request belongs to an assigned branch before deciding it.
  const targetRequest = await findLeaveRequestRecordById(companyId, leaveRequestId);
  if (!targetRequest) {
    throw new AppError({ message: "Leave request was not found", statusCode: 404, code: "LEAVE_REQUEST_NOT_FOUND" });
  }
  assertLeaveEmployeeBranch(auth, await getEmployeeOrThrow(String(targetRequest.employee_id)));

  try {
    const result =
      await approveLeaveRequestRecord(
        companyId,
        leaveRequestId,
        leaveApprovalId,
        String(auth.userId),
        input.comments ?? null,
        createActor(auth),
        metadata,
        isTenantCompanyAdmin(auth) || isBranchAdmin(auth)
      );

    if (!result) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapLeaveRequest(result.request),

      approval:
        mapLeaveRequestApproval(
          result.approval
        ),

      approvals:
        result.approvals.map(
          mapLeaveRequestApproval
        ),

      days:
        result.days.map(
          mapLeaveRequestDay
        ),

      finalized:
        result.finalized,

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionIds:
        result.balanceTransactionIds
    };
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function rejectLeaveRequest(
  leaveRequestId: string,
  leaveApprovalId: string,
  input: RejectLeaveRequestInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  // edited by wali: Verify the target request belongs to an assigned branch before deciding it.
  const targetRequest = await findLeaveRequestRecordById(companyId, leaveRequestId);
  if (!targetRequest) {
    throw new AppError({ message: "Leave request was not found", statusCode: 404, code: "LEAVE_REQUEST_NOT_FOUND" });
  }
  assertLeaveEmployeeBranch(auth, await getEmployeeOrThrow(String(targetRequest.employee_id)));

  try {
    const result =
      await rejectLeaveRequestRecord(
        companyId,
        leaveRequestId,
        leaveApprovalId,
        String(auth.userId),
        input.comments,
        createActor(auth),
        metadata,
        isTenantCompanyAdmin(auth) || isBranchAdmin(auth)
      );

    if (!result) {
      throw new AppError({
        message: "Leave request was not found",
        statusCode: 404,
        code: "LEAVE_REQUEST_NOT_FOUND"
      });
    }

    return {
      request:
        mapLeaveRequest(result.request),

      approval:
        mapLeaveRequestApproval(
          result.approval
        ),

      approvals:
        result.approvals.map(
          mapLeaveRequestApproval
        ),

      days:
        result.days.map(
          mapLeaveRequestDay
        ),

      finalized:
        result.finalized,

      leaveBalanceId:
        result.leaveBalanceId,

      balanceTransactionIds:
        result.balanceTransactionIds
    };
  } catch (error) {
    return translateRepositoryError(error);
  }
}

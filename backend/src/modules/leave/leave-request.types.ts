export type LeaveRequestDatabaseId =
  | string
  | number
  | bigint;

export type LeaveRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "WITHDRAWN";

export type LeaveSessionType =
  | "FULL_DAY"
  | "FIRST_HALF"
  | "SECOND_HALF"
  | "HOURLY";

export type LeaveDurationType =
  | "FULL_DAY"
  | "FIRST_HALF"
  | "SECOND_HALF"
  | "HOURLY";

export type LeaveApprovalDecision =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SKIPPED";

export type LeaveBlackoutRestrictionType =
  | "BLOCK"
  | "WARNING";

/*
 * =========================================================
 * Leave requests
 * =========================================================
 */

export interface LeaveRequestDatabaseRow {
  leave_request_id: LeaveRequestDatabaseId;
  company_id: LeaveRequestDatabaseId;

  employee_id: LeaveRequestDatabaseId;
  employee_code: string;
  employee_name: string;

  leave_type_id: LeaveRequestDatabaseId;
  leave_type_code: string;
  leave_type_name: string;
  leave_type_unit_type: string;

  leave_type_is_paid:
    | number
    | boolean;

  leave_type_requires_approval:
    | number
    | boolean;

  leave_type_requires_attachment:
    | number
    | boolean;

  leave_period_id:
    | LeaveRequestDatabaseId
    | null;

  period_code: string | null;
  period_name: string | null;

  period_start_date:
    | Date
    | string
    | null;

  period_end_date:
    | Date
    | string
    | null;

  period_status: string | null;

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

  contact_number: string | null;
  contact_address: string | null;

  work_handover_to_employee_id:
    | LeaveRequestDatabaseId
    | null;

  work_handover_employee_code:
    | string
    | null;

  work_handover_employee_name:
    | string
    | null;

  work_handover_notes:
    | string
    | null;

  request_status: string;

  submitted_by_user_id:
    | LeaveRequestDatabaseId
    | null;

  submitted_by_username:
    | string
    | null;

  submitted_at:
    | Date
    | string
    | null;

  final_decision_by_user_id:
    | LeaveRequestDatabaseId
    | null;

  final_decision_by_username:
    | string
    | null;

  final_decision_at:
    | Date
    | string
    | null;

  final_remarks:
    | string
    | null;

  cancelled_by_user_id:
    | LeaveRequestDatabaseId
    | null;

  cancelled_by_username:
    | string
    | null;

  cancelled_at:
    | Date
    | string
    | null;

  cancellation_reason:
    | string
    | null;

  request_day_count:
    | string
    | number
    | bigint;

  chargeable_day_count:
    | string
    | number
    | bigint;

  chargeable_units:
    | string
    | number;

  attachment_count:
    | string
    | number
    | bigint;

  approval_count:
    | string
    | number
    | bigint;

  pending_approval_count:
    | string
    | number
    | bigint;

  approved_approval_count:
    | string
    | number
    | bigint;

  rejected_approval_count:
    | string
    | number
    | bigint;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveRequestResponse {
  leaveRequestId: string;
  companyId: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;

  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveTypeUnitType: string;

  leaveTypeIsPaid: boolean;
  leaveTypeRequiresApproval: boolean;
  leaveTypeRequiresAttachment: boolean;

  leavePeriodId: string | null;
  periodCode: string | null;
  periodName: string | null;

  periodStartDate: string | null;
  periodEndDate: string | null;
  periodStatus: string | null;

  requestNumber: string;

  startDate: string;
  endDate: string;

  startSession: string;
  endSession: string;

  startTime: string | null;
  endTime: string | null;

  requestedUnits: number;
  chargeableUnits: number;

  reason: string;

  contactNumber: string | null;
  contactAddress: string | null;

  workHandoverToEmployeeId: string | null;
  workHandoverEmployeeCode: string | null;
  workHandoverEmployeeName: string | null;
  workHandoverNotes: string | null;

  requestStatus: string;

  submittedByUserId: string | null;
  submittedByUsername: string | null;
  submittedAt: string | null;

  finalDecisionByUserId: string | null;
  finalDecisionByUsername: string | null;
  finalDecisionAt: string | null;
  finalRemarks: string | null;

  cancelledByUserId: string | null;
  cancelledByUsername: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;

  requestDayCount: number;
  chargeableDayCount: number;

  attachmentCount: number;

  approvalCount: number;
  pendingApprovalCount: number;
  approvedApprovalCount: number;
  rejectedApprovalCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestRecord {
  companyId: string;
  employeeId: string;
  leaveTypeId: string;

  leavePeriodId: string | null;

  requestNumber: string;

  startDate: string;
  endDate: string;

  startSession: LeaveSessionType;
  endSession: LeaveSessionType;

  startTime: string | null;
  endTime: string | null;

  requestedUnits: number;

  reason: string;

  contactNumber: string | null;
  contactAddress: string | null;

  workHandoverToEmployeeId:
    | string
    | null;

  workHandoverNotes:
    | string
    | null;

  requestStatus:
    LeaveRequestStatus;
}

export interface UpdateLeaveRequestRecord {
  leaveTypeId?:
    | string
    | undefined;

  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | undefined;

  startSession?:
    | LeaveSessionType
    | undefined;

  endSession?:
    | LeaveSessionType
    | undefined;

  startTime?:
    | string
    | null
    | undefined;

  endTime?:
    | string
    | null
    | undefined;

  requestedUnits?:
    | number
    | undefined;

  reason?:
    | string
    | undefined;

  contactNumber?:
    | string
    | null
    | undefined;

  contactAddress?:
    | string
    | null
    | undefined;

  workHandoverToEmployeeId?:
    | string
    | null
    | undefined;

  workHandoverNotes?:
    | string
    | null
    | undefined;
}

/*
 * =========================================================
 * Leave-request days
 * =========================================================
 */

export interface LeaveRequestDayDatabaseRow {
  leave_request_day_id:
    LeaveRequestDatabaseId;

  leave_request_id:
    LeaveRequestDatabaseId;

  leave_date:
    | Date
    | string;

  duration_type: string;

  requested_units:
    | string
    | number;

  start_time:
    | string
    | null;

  end_time:
    | string
    | null;

  is_weekend:
    | number
    | boolean;

  is_holiday:
    | number
    | boolean;

  holiday_id:
    | LeaveRequestDatabaseId
    | null;

  holiday_name:
    | string
    | null;

  holiday_type:
    | string
    | null;

  is_chargeable:
    | number
    | boolean;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveRequestDayResponse {
  leaveRequestDayId: string;
  leaveRequestId: string;

  leaveDate: string;

  durationType: string;
  requestedUnits: number;

  startTime: string | null;
  endTime: string | null;

  isWeekend: boolean;
  isHoliday: boolean;

  holidayId: string | null;
  holidayName: string | null;
  holidayType: string | null;

  isChargeable: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface GeneratedLeaveRequestDayRecord {
  leaveRequestId: string;
  leaveDate: string;

  durationType:
    LeaveDurationType;

  requestedUnits: number;

  startTime: string | null;
  endTime: string | null;

  isWeekend: boolean;
  isHoliday: boolean;

  holidayId: string | null;

  isChargeable: boolean;
}

/*
 * =========================================================
 * Attachments
 * =========================================================
 */

export interface LeaveRequestAttachmentDatabaseRow {
  attachment_id:
    LeaveRequestDatabaseId;

  leave_request_id:
    LeaveRequestDatabaseId;

  attachment_type:
    string
    | null;

  attachment_title:
    string
    | null;

  original_filename: string;
  stored_filename: string;
  storage_path: string;

  mime_type:
    string
    | null;

  file_size_bytes:
    LeaveRequestDatabaseId
    | null;

  checksum_sha256:
    string
    | null;

  uploaded_by_user_id:
    LeaveRequestDatabaseId
    | null;

  uploaded_by_username:
    string
    | null;

  created_at:
    | Date
    | string;
}

export interface LeaveRequestAttachmentResponse {
  attachmentId: string;
  leaveRequestId: string;

  attachmentType: string | null;
  attachmentTitle: string | null;

  originalFilename: string;
  storedFilename: string;
  storagePath: string;

  mimeType: string | null;
  fileSizeBytes: number | null;

  checksumSha256: string | null;

  uploadedByUserId: string | null;
  uploadedByUsername: string | null;

  createdAt: string;
}

export interface CreateLeaveRequestAttachmentRecord {
  leaveRequestId: string;

  attachmentType:
    string
    | null;

  attachmentTitle:
    string
    | null;

  originalFilename: string;
  storedFilename: string;
  storagePath: string;

  mimeType:
    string
    | null;

  fileSizeBytes:
    number
    | null;

  checksumSha256:
    string
    | null;

  uploadedByUserId: string;
}

/*
 * =========================================================
 * Approval workflow
 * =========================================================
 */

export interface LeaveRequestApprovalDatabaseRow {
  leave_approval_id:
    LeaveRequestDatabaseId;

  leave_request_id:
    LeaveRequestDatabaseId;

  approval_level:
    | string
    | number;

  approver_user_id:
    LeaveRequestDatabaseId;

  approver_username: string;

  approver_employee_id:
    LeaveRequestDatabaseId
    | null;

  approver_employee_code:
    string
    | null;

  approver_employee_name:
    string
    | null;

  decision: string;
  comments: string | null;

  decided_at:
    | Date
    | string
    | null;

  is_final_level:
    | number
    | boolean;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveRequestApprovalResponse {
  leaveApprovalId: string;
  leaveRequestId: string;

  approvalLevel: number;

  approverUserId: string;
  approverUsername: string;

  approverEmployeeId: string | null;
  approverEmployeeCode: string | null;
  approverEmployeeName: string | null;

  decision: string;
  comments: string | null;

  decidedAt: string | null;
  isFinalLevel: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestApprovalRecord {
  leaveRequestId: string;
  approvalLevel: number;

  approverUserId: string;

  decision:
    LeaveApprovalDecision;

  isFinalLevel: boolean;
}

export interface ResolveLeaveApprovalResult {
  approvalLevel: number;

  approverUserId: string;
  // edited by wali: A Company Admin user may be an approver without an employee profile.
  approverEmployeeId: string | null;

  source:
    | "REPORTING_MANAGER"
    | "POSITION_HIERARCHY"
    | "ADMIN_FALLBACK";

  isFinalLevel: boolean;
}

/*
 * =========================================================
 * Approval delegations
 * =========================================================
 */

export interface LeaveApprovalDelegationDatabaseRow {
  delegation_id:
    LeaveRequestDatabaseId;

  company_id:
    LeaveRequestDatabaseId;

  delegator_user_id:
    LeaveRequestDatabaseId;

  delegator_username: string;

  delegate_user_id:
    LeaveRequestDatabaseId;

  delegate_username: string;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string;

  reason: string | null;

  is_active:
    | number
    | boolean;

  created_by_user_id:
    LeaveRequestDatabaseId
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

/*
 * =========================================================
 * Employee organizational context
 * =========================================================
 */

export interface EmployeeLeaveOrganizationalContextDatabaseRow {
  employee_id:
    LeaveRequestDatabaseId;

  company_id:
    LeaveRequestDatabaseId;

  employee_code: string;
  employee_name: string;

  gender: string | null;

  joining_date:
    | Date
    | string;

  probation_end_date:
    | Date
    | string
    | null;

  confirmation_date:
    | Date
    | string
    | null;

  is_active:
    | number
    | boolean;

  assignment_id:
    | LeaveRequestDatabaseId
    | null;

  branch_id:
    | LeaveRequestDatabaseId
    | null;

  department_id:
    | LeaveRequestDatabaseId
    | null;

  designation_id:
    | LeaveRequestDatabaseId
    | null;

  reporting_manager_id:
    | LeaveRequestDatabaseId
    | null;

  position_id:
    | LeaveRequestDatabaseId
    | null;

  reports_to_position_id:
    | LeaveRequestDatabaseId
    | null;
}

/*
 * =========================================================
 * Applicable policy rule
 * =========================================================
 */

export interface ApplicableLeaveRequestRuleDatabaseRow {
  leave_policy_rule_id:
    LeaveRequestDatabaseId;

  leave_policy_id:
    LeaveRequestDatabaseId;

  leave_type_id:
    LeaveRequestDatabaseId;

  annual_entitlement_units:
    | string
    | number;

  allow_during_probation:
    | number
    | boolean;

  eligible_gender: string;

  minimum_request_units:
    | string
    | number;

  maximum_request_units:
    | string
    | number
    | null;

  minimum_notice_days:
    | string
    | number;

  maximum_advance_days:
    | string
    | number
    | null;

  maximum_backdate_days:
    | string
    | number;

  allow_half_day:
    | number
    | boolean;

  allow_hourly_leave:
    | number
    | boolean;

  include_weekends:
    | number
    | boolean;

  include_holidays:
    | number
    | boolean;

  sandwich_rule_enabled:
    | number
    | boolean;

  allow_negative_balance:
    | number
    | boolean;

  negative_balance_limit:
    | string
    | number;

  attachment_required_after_units:
    | string
    | number
    | null;

  approval_levels_required:
    | string
    | number;

  is_active:
    | number
    | boolean;
}

/*
 * =========================================================
 * Blackout periods
 * =========================================================
 */

export interface ApplicableLeaveBlackoutDatabaseRow {
  blackout_period_id:
    LeaveRequestDatabaseId;

  company_id:
    LeaveRequestDatabaseId;

  branch_id:
    LeaveRequestDatabaseId
    | null;

  department_id:
    LeaveRequestDatabaseId
    | null;

  leave_type_id:
    LeaveRequestDatabaseId
    | null;

  blackout_name: string;
  description: string | null;

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
}

export interface LeaveBlackoutMatchResponse {
  blackoutPeriodId: string;

  blackoutName: string;
  description: string | null;

  startDate: string;
  endDate: string;

  restrictionType: string;
  exceptionRequiresApproval: boolean;
}

/*
 * =========================================================
 * Detailed request
 * =========================================================
 */

export interface LeaveRequestDetailedResponse {
  request:
    LeaveRequestResponse;

  days:
    LeaveRequestDayResponse[];

  attachments:
    LeaveRequestAttachmentResponse[];

  approvals:
    LeaveRequestApprovalResponse[];

  blackoutMatches:
    LeaveBlackoutMatchResponse[];
}

/*
 * =========================================================
 * Submission result
 * =========================================================
 */

export interface LeaveRequestSubmissionResult {
  request:
    LeaveRequestDatabaseRow;

  days:
    LeaveRequestDayDatabaseRow[];

  approvals:
    LeaveRequestApprovalDatabaseRow[];

  reservedUnits: number;

  leaveBalanceId: string;

  balanceTransactionId: string;
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface LeaveRequestPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

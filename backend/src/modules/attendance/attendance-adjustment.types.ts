export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Adjustment request
 * =========================================================
 */

export interface AttendanceAdjustmentRequestDatabaseRow {
  adjustment_request_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;

  employee_code: string;
  employee_name: string;

  attendance_id: DatabaseId | null;
  attendance_date: Date | string;

  adjustment_type: string;

  current_check_in_at:
    | Date
    | string
    | null;

  current_check_out_at:
    | Date
    | string
    | null;

  current_status_code: string | null;
  current_status_name: string | null;

  requested_check_in_at:
    | Date
    | string
    | null;

  requested_check_out_at:
    | Date
    | string
    | null;

  requested_status_code: string | null;
  requested_status_name: string | null;

  reason: string;
  attachment_path: string | null;

  request_status: string;

  requested_by_user_id:
    | DatabaseId
    | null;

  requested_by_username: string | null;
  requested_by_full_name: string | null;

  final_decision_by:
    | DatabaseId
    | null;

  final_decision_username:
    | string
    | null;

  final_decision_full_name:
    | string
    | null;

  final_decision_at:
    | Date
    | string
    | null;

  final_remarks: string | null;

  approval_count:
    | string
    | number;

  pending_approval_count:
    | string
    | number;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceAdjustmentRequestResponse {
  adjustmentRequestId: string;
  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  attendanceId: string | null;
  attendanceDate: string;

  adjustmentType: string;

  currentCheckInAt: string | null;
  currentCheckOutAt: string | null;

  currentStatusCode: string | null;
  currentStatusName: string | null;

  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;

  requestedStatusCode: string | null;
  requestedStatusName: string | null;

  reason: string;
  attachmentPath: string | null;

  requestStatus: string;

  requestedByUserId: string | null;
  requestedByUsername: string | null;
  requestedByFullName: string | null;

  finalDecisionBy: string | null;
  finalDecisionUsername: string | null;
  finalDecisionFullName: string | null;

  finalDecisionAt: string | null;
  finalRemarks: string | null;

  approvalCount: number;
  pendingApprovalCount: number;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Approval record
 * =========================================================
 */

export interface AttendanceAdjustmentApprovalDatabaseRow {
  approval_id: DatabaseId;
  adjustment_request_id: DatabaseId;

  company_id: DatabaseId;
  employee_id: DatabaseId;

  approval_level:
    | string
    | number;

  approver_user_id: DatabaseId;

  approver_username: string | null;
  approver_full_name: string | null;

  decision: string;
  comments: string | null;

  decided_at:
    | Date
    | string
    | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceAdjustmentApprovalResponse {
  approvalId: string;
  adjustmentRequestId: string;

  approvalLevel: number;

  approverUserId: string;
  approverUsername: string | null;
  approverFullName: string | null;

  decision: string;
  comments: string | null;

  decidedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Repository records
 * =========================================================
 */

export interface CreateAttendanceAdjustmentRequestRecord {
  companyId: string;
  employeeId: string;

  attendanceId: string | null;
  attendanceDate: string;

  adjustmentType: string;

  currentCheckInAt: string | null;
  currentCheckOutAt: string | null;
  currentStatusCode: string | null;

  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  requestedStatusCode: string | null;

  reason: string;
  attachmentPath: string | null;

  requestStatus: string;
  requestedByUserId: string;
}

export interface UpdateAttendanceAdjustmentRequestRecord {
  adjustmentType?: string | undefined;

  requestedCheckInAt?:
    | string
    | null
    | undefined;

  requestedCheckOutAt?:
    | string
    | null
    | undefined;

  requestedStatusCode?:
    | string
    | null
    | undefined;

  reason?: string | undefined;

  attachmentPath?:
    | string
    | null
    | undefined;
}

export interface AttendanceAdjustmentDecisionRecord {
  adjustmentRequestId: string;

  approvalLevel: number;
  approverUserId: string;

  decision:
    | "APPROVED"
    | "REJECTED";

  comments: string | null;
  finalRemarks: string | null;
}

export interface AttendanceAdjustmentPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
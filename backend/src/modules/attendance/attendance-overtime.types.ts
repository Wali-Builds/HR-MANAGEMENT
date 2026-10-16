export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Overtime request database row
 * =========================================================
 */

export interface OvertimeRequestDatabaseRow {
  overtime_request_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;

  employee_code: string;
  employee_name: string;

  attendance_id: DatabaseId | null;
  attendance_date: Date | string | null;

  overtime_date: Date | string;

  requested_start_at:
    | Date
    | string
    | null;

  requested_end_at:
    | Date
    | string
    | null;

  requested_minutes:
    | string
    | number;

  approved_minutes:
    | string
    | number
    | null;

  reason: string;
  request_status: string;

  requested_by_user_id:
    | DatabaseId
    | null;

  requested_by_username:
    | string
    | null;

  requested_by_full_name:
    | string
    | null;

  approved_by_user_id:
    | DatabaseId
    | null;

  approved_by_username:
    | string
    | null;

  approved_by_full_name:
    | string
    | null;

  approved_at:
    | Date
    | string
    | null;

  approval_remarks:
    | string
    | null;

  attendance_overtime_minutes:
    | string
    | number
    | null;

  attendance_is_finalized:
    | number
    | boolean
    | null;

  created_at: Date | string;
  updated_at: Date | string;
}

/*
 * =========================================================
 * API response
 * =========================================================
 */

export interface OvertimeRequestResponse {
  overtimeRequestId: string;
  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  attendanceId: string | null;
  attendanceDate: string | null;

  overtimeDate: string;

  requestedStartAt: string | null;
  requestedEndAt: string | null;

  requestedMinutes: number;
  approvedMinutes: number | null;

  reason: string;
  requestStatus: string;

  requestedByUserId: string | null;
  requestedByUsername: string | null;
  requestedByFullName: string | null;

  approvedByUserId: string | null;
  approvedByUsername: string | null;
  approvedByFullName: string | null;

  approvedAt: string | null;
  approvalRemarks: string | null;

  attendanceOvertimeMinutes: number | null;
  attendanceIsFinalized: boolean | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Repository records
 * =========================================================
 */

export interface CreateOvertimeRequestRecord {
  companyId: string;
  employeeId: string;

  attendanceId: string | null;
  overtimeDate: string;

  requestedStartAt: string | null;
  requestedEndAt: string | null;
  requestedMinutes: number;

  reason: string;
  requestStatus: string;

  requestedByUserId: string;
}

export interface UpdateOvertimeRequestRecord {
  attendanceId?:
    | string
    | null
    | undefined;

  overtimeDate?:
    | string
    | undefined;

  requestedStartAt?:
    | string
    | null
    | undefined;

  requestedEndAt?:
    | string
    | null
    | undefined;

  requestedMinutes?:
    | number
    | undefined;

  reason?:
    | string
    | undefined;
}

export interface OvertimeDecisionRecord {
  overtimeRequestId: string;

  decision:
    | "APPROVED"
    | "REJECTED";

  approvedMinutes:
    | number
    | null;

  approverUserId: string;
  approvalRemarks: string | null;
}

export interface OvertimePaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
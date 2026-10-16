export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Attendance policy
 * =========================================================
 */

export interface AttendancePolicyManagementDatabaseRow {
  policy_id: DatabaseId;
  company_id: DatabaseId;

  policy_code: string;
  policy_name: string;
  description: string | null;

  late_grace_minutes:
    | string
    | number;

  early_departure_grace_minutes:
    | string
    | number;

  minimum_full_day_minutes:
    | string
    | number;

  minimum_half_day_minutes:
    | string
    | number;

  automatic_absence:
    | number
    | boolean;

  allow_manual_attendance:
    | number
    | boolean;

  allow_remote_attendance:
    | number
    | boolean;

  overtime_enabled:
    | number
    | boolean;

  overtime_after_minutes:
    | string
    | number;

  minimum_overtime_minutes:
    | string
    | number;

  maximum_overtime_minutes_day:
    | string
    | number
    | null;

  overtime_requires_approval:
    | number
    | boolean;

  deduct_break_time:
    | number
    | boolean;

  require_checkout:
    | number
    | boolean;

  is_default:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;

  assignment_count:
    | string
    | number;

  current_assignment_count:
    | string
    | number;

  attendance_record_count:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface AttendancePolicyResponse {
  policyId: string;
  companyId: string;

  policyCode: string;
  policyName: string;
  description: string | null;

  lateGraceMinutes: number;
  earlyDepartureGraceMinutes: number;

  minimumFullDayMinutes: number;
  minimumHalfDayMinutes: number;

  automaticAbsence: boolean;

  allowManualAttendance: boolean;
  allowRemoteAttendance: boolean;

  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
  minimumOvertimeMinutes: number;
  maximumOvertimeMinutesDay: number | null;
  overtimeRequiresApproval: boolean;

  deductBreakTime: boolean;
  requireCheckout: boolean;

  isDefault: boolean;
  isActive: boolean;

  assignmentCount: number;
  currentAssignmentCount: number;
  attendanceRecordCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendancePolicyRecord {
  companyId: string;

  policyCode: string;
  policyName: string;
  description: string | null;

  lateGraceMinutes: number;
  earlyDepartureGraceMinutes: number;

  minimumFullDayMinutes: number;
  minimumHalfDayMinutes: number;

  automaticAbsence: boolean;

  allowManualAttendance: boolean;
  allowRemoteAttendance: boolean;

  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
  minimumOvertimeMinutes: number;
  maximumOvertimeMinutesDay: number | null;
  overtimeRequiresApproval: boolean;

  deductBreakTime: boolean;
  requireCheckout: boolean;

  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateAttendancePolicyRecord {
  policyCode?:
    | string
    | undefined;

  policyName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  lateGraceMinutes?:
    | number
    | undefined;

  earlyDepartureGraceMinutes?:
    | number
    | undefined;

  minimumFullDayMinutes?:
    | number
    | undefined;

  minimumHalfDayMinutes?:
    | number
    | undefined;

  automaticAbsence?:
    | boolean
    | undefined;

  allowManualAttendance?:
    | boolean
    | undefined;

  allowRemoteAttendance?:
    | boolean
    | undefined;

  overtimeEnabled?:
    | boolean
    | undefined;

  overtimeAfterMinutes?:
    | number
    | undefined;

  minimumOvertimeMinutes?:
    | number
    | undefined;

  maximumOvertimeMinutesDay?:
    | number
    | null
    | undefined;

  overtimeRequiresApproval?:
    | boolean
    | undefined;

  deductBreakTime?:
    | boolean
    | undefined;

  requireCheckout?:
    | boolean
    | undefined;

  isDefault?:
    | boolean
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Attendance status
 *
 * These statuses are global because the table does not
 * contain company_id.
 * =========================================================
 */

export interface AttendanceStatusManagementDatabaseRow {
  status_code: string;
  status_name: string;
  description: string | null;

  counts_as_present:
    | number
    | boolean;

  counts_as_absent:
    | number
    | boolean;

  is_payable:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  attendance_record_count:
    | string
    | number;

  current_adjustment_count:
    | string
    | number;

  requested_adjustment_count:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface AttendanceStatusResponse {
  statusCode: string;
  statusName: string;
  description: string | null;

  countsAsPresent: boolean;
  countsAsAbsent: boolean;
  isPayable: boolean;
  isActive: boolean;

  attendanceRecordCount: number;
  currentAdjustmentCount: number;
  requestedAdjustmentCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceStatusRecord {
  statusCode: string;
  statusName: string;
  description: string | null;

  countsAsPresent: boolean;
  countsAsAbsent: boolean;

  isPayable: boolean;
  isActive: boolean;
}

export interface UpdateAttendanceStatusRecord {
  statusName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  countsAsPresent?:
    | boolean
    | undefined;

  countsAsAbsent?:
    | boolean
    | undefined;

  isPayable?:
    | boolean
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Employee attendance-policy assignment
 * =========================================================
 */

export interface AttendancePolicyAssignmentDatabaseRow {
  assignment_id: DatabaseId;

  company_id: DatabaseId;
  employee_id: DatabaseId;

  employee_code: string;
  employee_name: string;

  policy_id: DatabaseId;
  policy_code: string;
  policy_name: string;

  policy_is_default:
    | number
    | boolean;

  policy_is_active:
    | number
    | boolean;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_current:
    | number
    | boolean;

  assigned_by_user_id:
    | DatabaseId
    | null;

  assigned_by_username:
    | string
    | null;

  assigned_by_full_name:
    | string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface AttendancePolicyAssignmentResponse {
  assignmentId: string;

  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  policyId: string;
  policyCode: string;
  policyName: string;

  policyIsDefault: boolean;
  policyIsActive: boolean;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;

  assignedByUserId: string | null;
  assignedByUsername: string | null;
  assignedByFullName: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendancePolicyAssignmentRecord {
  employeeId: string;
  policyId: string;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;
  assignedByUserId: string;
}

export interface UpdateAttendancePolicyAssignmentRecord {
  policyId?:
    | string
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;

  isCurrent?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Effective policy
 * =========================================================
 */

export interface EffectiveAttendancePolicyResponse {
  asOfDate: string;

  source:
    | "EMPLOYEE_ASSIGNMENT"
    | "COMPANY_DEFAULT"
    | "NONE";

  assignment:
    | AttendancePolicyAssignmentResponse
    | null;

  policy:
    | AttendancePolicyResponse
    | null;
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface AttendancePolicyPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
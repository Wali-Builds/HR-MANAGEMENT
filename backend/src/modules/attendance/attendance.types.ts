export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Shared
 * =========================================================
 */

export interface AttendanceActor {
  userId: string;
  employeeId: string | null;
  companyId: string | null;
  isPlatformAdmin: boolean;
  permissions: string[];
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export interface AttendanceEmployeeDatabaseRow {
  employee_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;

  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;

  employment_status: string | null;
  is_active: number | boolean;

  deleted_at: Date | string | null;
}

/*
 * =========================================================
 * Attendance statuses
 * =========================================================
 */

export interface AttendanceStatusDatabaseRow {
  status_code: string;
  status_name: string;
  description: string | null;

  counts_as_present: number | boolean;
  counts_as_absent: number | boolean;
  is_payable: number | boolean;
  is_active: number | boolean;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceStatusResponse {
  statusCode: string;
  statusName: string;
  description: string | null;

  countsAsPresent: boolean;
  countsAsAbsent: boolean;
  isPayable: boolean;
  isActive: boolean;
}

/*
 * =========================================================
 * Attendance policies
 * =========================================================
 */

export interface AttendancePolicyDatabaseRow {
  policy_id: DatabaseId;
  company_id: DatabaseId;

  policy_code: string;
  policy_name: string;
  description: string | null;

  late_grace_minutes: string | number;
  early_departure_grace_minutes: string | number;

  minimum_full_day_minutes: string | number;
  minimum_half_day_minutes: string | number;

  automatic_absence: number | boolean;
  allow_manual_attendance: number | boolean;
  allow_remote_attendance: number | boolean;

  overtime_enabled: number | boolean;
  overtime_after_minutes: string | number;
  minimum_overtime_minutes: string | number;

  maximum_overtime_minutes_day:
    | string
    | number
    | null;

  overtime_requires_approval:
    | number
    | boolean;

  deduct_break_time: number | boolean;
  require_checkout: number | boolean;

  is_default: number | boolean;
  is_active: number | boolean;

  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
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
}

/*
 * =========================================================
 * Employee attendance policy assignments
 * =========================================================
 */

export interface EmployeeAttendancePolicyAssignmentDatabaseRow {
  assignment_id: DatabaseId;
  employee_id: DatabaseId;
  policy_id: DatabaseId;

  company_id: DatabaseId;

  policy_code: string;
  policy_name: string;

  effective_from: Date | string;
  effective_to: Date | string | null;

  is_current: number | boolean;

  assigned_by_user_id: DatabaseId | null;
  assigned_by_username: string | null;
  assigned_by_full_name: string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeAttendancePolicyAssignmentResponse {
  assignmentId: string;
  employeeId: string;
  policyId: string;
  companyId: string;

  policyCode: string;
  policyName: string;

  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;

  assignedByUserId: string | null;
  assignedByUsername: string | null;
  assignedByFullName: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeAttendancePolicyAssignmentRecord {
  employeeId: string;
  policyId: string;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;
  assignedByUserId: string;
}

/*
 * =========================================================
 * Attendance devices
 * =========================================================
 */

export interface AttendanceDeviceDatabaseRow {
  device_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;

  branch_code: string | null;
  branch_name: string | null;

  device_code: string;
  device_name: string;
  device_type: string;

  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;

  ip_address: string | null;
  port_number: string | number | null;

  physical_location: string | null;

  last_sync_at: Date | string | null;
  sync_status: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceDeviceResponse {
  deviceId: string;
  companyId: string;

  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;

  deviceCode: string;
  deviceName: string;
  deviceType: string;

  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;

  ipAddress: string | null;
  portNumber: number | null;

  physicalLocation: string | null;

  lastSyncAt: string | null;
  syncStatus: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceDeviceRecord {
  companyId: string;
  branchId: string | null;

  deviceCode: string;
  deviceName: string;
  deviceType: string;

  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;

  ipAddress: string | null;
  portNumber: number | null;

  physicalLocation: string | null;
  syncStatus: string | null;

  isActive: boolean;
}

export interface UpdateAttendanceDeviceRecord {
  branchId?: string | null | undefined;

  deviceCode?: string | undefined;
  deviceName?: string | undefined;
  deviceType?: string | undefined;

  manufacturer?: string | null | undefined;
  modelNumber?: string | null | undefined;
  serialNumber?: string | null | undefined;

  ipAddress?: string | null | undefined;
  portNumber?: number | null | undefined;

  physicalLocation?: string | null | undefined;

  lastSyncAt?: string | null | undefined;
  syncStatus?: string | null | undefined;

  isActive?: boolean | undefined;
}

/*
 * =========================================================
 * Shifts
 * =========================================================
 */

export interface ShiftDatabaseRow {
  shift_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;

  branch_code: string | null;
  branch_name: string | null;

  shift_code: string;
  shift_name: string;
  description: string | null;

  start_time: string;
  end_time: string;

  crosses_midnight: number | boolean;
  is_flexible: number | boolean;

  break_minutes: string | number;
  expected_work_minutes: string | number;

  check_in_start_time: string | null;
  check_in_end_time: string | null;

  check_out_start_time: string | null;
  check_out_end_time: string | null;

  late_grace_minutes: string | number;
  early_departure_grace_minutes: string | number;
  overtime_after_minutes: string | number;

  is_active: number | boolean;
  deleted_at: Date | string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface ShiftResponse {
  shiftId: string;
  companyId: string;

  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;

  shiftCode: string;
  shiftName: string;
  description: string | null;

  startTime: string;
  endTime: string;

  crossesMidnight: boolean;
  isFlexible: boolean;

  breakMinutes: number;
  expectedWorkMinutes: number;

  checkInStartTime: string | null;
  checkInEndTime: string | null;

  checkOutStartTime: string | null;
  checkOutEndTime: string | null;

  lateGraceMinutes: number;
  earlyDepartureGraceMinutes: number;
  overtimeAfterMinutes: number;

  isActive: boolean;
}

/*
 * =========================================================
 * Work schedules
 * =========================================================
 */

export interface WorkScheduleDatabaseRow {
  schedule_id: DatabaseId;
  company_id: DatabaseId;

  schedule_code: string;
  schedule_name: string;
  description: string | null;

  weekly_working_hours:
    | string
    | number
    | null;

  weekly_working_days:
    | string
    | number
    | null;

  is_default: number | boolean;
  is_active: number | boolean;

  deleted_at: Date | string | null;

  schedule_day_count: string | number;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface WorkScheduleResponse {
  scheduleId: string;
  companyId: string;

  scheduleCode: string;
  scheduleName: string;
  description: string | null;

  weeklyWorkingHours: number | null;
  weeklyWorkingDays: number | null;

  isDefault: boolean;
  isActive: boolean;

  scheduleDayCount: number;
}

export interface WorkScheduleDayDatabaseRow {
  schedule_day_id: DatabaseId;
  schedule_id: DatabaseId;
  company_id: DatabaseId;

  day_of_week: string | number;
  is_working_day: number | boolean;

  planned_start_time: string | null;
  planned_end_time: string | null;

  break_minutes: string | number;
  expected_work_minutes: string | number;

  crosses_midnight: number | boolean;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface WorkScheduleDayResponse {
  scheduleDayId: string;
  scheduleId: string;

  dayOfWeek: number;
  isWorkingDay: boolean;

  plannedStartTime: string | null;
  plannedEndTime: string | null;

  breakMinutes: number;
  expectedWorkMinutes: number;

  crossesMidnight: boolean;
}

/*
 * =========================================================
 * Employee shift assignments
 * =========================================================
 */

export interface EmployeeShiftAssignmentDatabaseRow {
  shift_assignment_id: DatabaseId;
  employee_id: DatabaseId;

  company_id: DatabaseId;

  shift_id: DatabaseId;
  shift_code: string;
  shift_name: string;

  schedule_id: DatabaseId | null;
  schedule_code: string | null;
  schedule_name: string | null;

  effective_from: Date | string;
  effective_to: Date | string | null;

  assignment_type: string;
  is_current: number | boolean;

  assigned_by_user_id: DatabaseId | null;
  assigned_by_username: string | null;
  assigned_by_full_name: string | null;

  remarks: string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeShiftAssignmentResponse {
  shiftAssignmentId: string;
  employeeId: string;
  companyId: string;

  shiftId: string;
  shiftCode: string;
  shiftName: string;

  scheduleId: string | null;
  scheduleCode: string | null;
  scheduleName: string | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  assignmentType: string;
  isCurrent: boolean;

  assignedByUserId: string | null;
  assignedByUsername: string | null;
  assignedByFullName: string | null;

  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Biometric logs
 * =========================================================
 */

export interface BiometricLogDatabaseRow {
  biometric_log_id: DatabaseId;
  company_id: DatabaseId;

  device_id: DatabaseId | null;
  device_code: string | null;
  device_name: string | null;

  employee_id: DatabaseId | null;
  employee_code: string | null;
  employee_name: string | null;

  external_employee_code: string | null;

  punch_time: Date | string;
  punch_type: string | null;
  verification_method: string | null;

  latitude: string | number | null;
  longitude: string | number | null;

  source_type: string;

  is_processed: number | boolean;
  processing_error: string | null;
  processed_at: Date | string | null;

  created_at: Date | string;
}

export interface BiometricLogResponse {
  biometricLogId: string;
  companyId: string;

  deviceId: string | null;
  deviceCode: string | null;
  deviceName: string | null;

  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;

  externalEmployeeCode: string | null;

  punchTime: string;
  punchType: string | null;
  verificationMethod: string | null;

  latitude: number | null;
  longitude: number | null;

  sourceType: string;

  isProcessed: boolean;
  processingError: string | null;
  processedAt: string | null;

  createdAt: string;
}

export interface CreateBiometricLogRecord {
  companyId: string;

  deviceId: string | null;
  employeeId: string | null;

  externalEmployeeCode: string | null;

  punchTime: string;
  punchType: string | null;
  verificationMethod: string | null;

  latitude: number | null;
  longitude: number | null;

  sourceType: string;
  rawPayload: string | null;
}

/*
 * =========================================================
 * Attendance records
 * =========================================================
 */

export interface AttendanceRecordDatabaseRow {
  attendance_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;

  employee_code: string;
  employee_name: string;

  branch_id: DatabaseId | null;
  branch_code: string | null;
  branch_name: string | null;

  attendance_date: Date | string;

  shift_id: DatabaseId | null;
  shift_code: string | null;
  shift_name: string | null;

  schedule_id: DatabaseId | null;
  schedule_code: string | null;
  schedule_name: string | null;

  policy_id: DatabaseId | null;
  policy_code: string | null;
  policy_name: string | null;

  scheduled_start_at: Date | string | null;
  scheduled_end_at: Date | string | null;

  check_in_at: Date | string | null;
  check_out_at: Date | string | null;

  total_presence_minutes: string | number;
  total_break_minutes: string | number;
  total_work_minutes: string | number;
  payable_minutes: string | number;

  late_minutes: string | number;
  early_departure_minutes: string | number;
  overtime_minutes: string | number;

  status_code: string;
  status_name: string;

  counts_as_present: number | boolean;
  counts_as_absent: number | boolean;
  status_is_payable: number | boolean;

  attendance_source: string;

  check_in_location: string | null;
  check_out_location: string | null;

  check_in_latitude: string | number | null;
  check_in_longitude: string | number | null;

  check_out_latitude: string | number | null;
  check_out_longitude: string | number | null;

  notes: string | null;

  is_manually_modified: number | boolean;
  is_finalized: number | boolean;

  finalized_by_user_id: DatabaseId | null;
  finalized_by_username: string | null;
  finalized_by_full_name: string | null;

  finalized_at: Date | string | null;

  open_break_count: string | number;
  break_count: string | number;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceRecordResponse {
  attendanceId: string;
  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;

  attendanceDate: string;

  shiftId: string | null;
  shiftCode: string | null;
  shiftName: string | null;

  scheduleId: string | null;
  scheduleCode: string | null;
  scheduleName: string | null;

  policyId: string | null;
  policyCode: string | null;
  policyName: string | null;

  scheduledStartAt: string | null;
  scheduledEndAt: string | null;

  checkInAt: string | null;
  checkOutAt: string | null;

  totalPresenceMinutes: number;
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  payableMinutes: number;

  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;

  statusCode: string;
  statusName: string;

  countsAsPresent: boolean;
  countsAsAbsent: boolean;
  statusIsPayable: boolean;

  attendanceSource: string;

  checkInLocation: string | null;
  checkOutLocation: string | null;

  checkInLatitude: number | null;
  checkInLongitude: number | null;

  checkOutLatitude: number | null;
  checkOutLongitude: number | null;

  notes: string | null;

  isManuallyModified: boolean;
  isFinalized: boolean;

  finalizedByUserId: string | null;
  finalizedByUsername: string | null;
  finalizedByFullName: string | null;

  finalizedAt: string | null;

  openBreakCount: number;
  breakCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceRecordRecord {
  companyId: string;
  employeeId: string;

  attendanceDate: string;

  shiftId: string | null;
  scheduleId: string | null;
  policyId: string | null;

  scheduledStartAt: string | null;
  scheduledEndAt: string | null;

  checkInAt: string | null;
  checkOutAt: string | null;

  statusCode: string;
  attendanceSource: string;

  checkInLocation: string | null;
  checkOutLocation: string | null;

  checkInLatitude: number | null;
  checkInLongitude: number | null;

  checkOutLatitude: number | null;
  checkOutLongitude: number | null;

  notes: string | null;

  isManuallyModified: boolean;
}

export interface UpdateAttendanceRecordRecord {
  shiftId?: string | null | undefined;
  scheduleId?: string | null | undefined;
  policyId?: string | null | undefined;

  scheduledStartAt?: string | null | undefined;
  scheduledEndAt?: string | null | undefined;

  checkInAt?: string | null | undefined;
  checkOutAt?: string | null | undefined;

  statusCode?: string | undefined;
  attendanceSource?: string | undefined;

  checkInLocation?: string | null | undefined;
  checkOutLocation?: string | null | undefined;

  checkInLatitude?: number | null | undefined;
  checkInLongitude?: number | null | undefined;

  checkOutLatitude?: number | null | undefined;
  checkOutLongitude?: number | null | undefined;

  notes?: string | null | undefined;

  isManuallyModified?: boolean | undefined;
}

/*
 * =========================================================
 * Attendance breaks
 * =========================================================
 */

export interface AttendanceBreakDatabaseRow {
  break_id: DatabaseId;
  attendance_id: DatabaseId;

  company_id: DatabaseId;
  employee_id: DatabaseId;

  break_type: string;

  break_start_at: Date | string;
  break_end_at: Date | string | null;

  duration_minutes: string | number;

  is_paid: number | boolean;
  source_type: string;

  remarks: string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttendanceBreakResponse {
  breakId: string;
  attendanceId: string;

  employeeId: string;

  breakType: string;

  breakStartAt: string;
  breakEndAt: string | null;

  durationMinutes: number;

  isPaid: boolean;
  sourceType: string;

  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}
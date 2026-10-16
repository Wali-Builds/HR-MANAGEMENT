export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Shift
 * =========================================================
 */

export interface ShiftDatabaseRow {
  shift_id: DatabaseId;
  company_id: DatabaseId;

  branch_id:
    | DatabaseId
    | null;

  branch_code: string | null;
  branch_name: string | null;

  shift_code: string;
  shift_name: string;
  description: string | null;

  start_time: string;
  end_time: string;

  crosses_midnight:
    | number
    | boolean;

  is_flexible:
    | number
    | boolean;

  break_minutes:
    | string
    | number;

  expected_work_minutes:
    | string
    | number;

  check_in_start_time:
    | string
    | null;

  check_in_end_time:
    | string
    | null;

  check_out_start_time:
    | string
    | null;

  check_out_end_time:
    | string
    | null;

  late_grace_minutes:
    | string
    | number;

  early_departure_grace_minutes:
    | string
    | number;

  overtime_after_minutes:
    | string
    | number;

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

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
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

  assignmentCount: number;
  currentAssignmentCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftRecord {
  companyId: string;

  branchId: string | null;

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

export interface UpdateShiftRecord {
  branchId?:
    | string
    | null
    | undefined;

  shiftCode?:
    | string
    | undefined;

  shiftName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  startTime?:
    | string
    | undefined;

  endTime?:
    | string
    | undefined;

  crossesMidnight?:
    | boolean
    | undefined;

  isFlexible?:
    | boolean
    | undefined;

  breakMinutes?:
    | number
    | undefined;

  expectedWorkMinutes?:
    | number
    | undefined;

  checkInStartTime?:
    | string
    | null
    | undefined;

  checkInEndTime?:
    | string
    | null
    | undefined;

  checkOutStartTime?:
    | string
    | null
    | undefined;

  checkOutEndTime?:
    | string
    | null
    | undefined;

  lateGraceMinutes?:
    | number
    | undefined;

  earlyDepartureGraceMinutes?:
    | number
    | undefined;

  overtimeAfterMinutes?:
    | number
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Work schedule
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

  schedule_day_count:
    | string
    | number;

  configured_working_day_count:
    | string
    | number;

  assignment_count:
    | string
    | number;

  current_assignment_count:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
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
  configuredWorkingDayCount: number;

  assignmentCount: number;
  currentAssignmentCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkScheduleRecord {
  companyId: string;

  scheduleCode: string;
  scheduleName: string;
  description: string | null;

  weeklyWorkingHours: number | null;
  weeklyWorkingDays: number | null;

  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateWorkScheduleRecord {
  scheduleCode?:
    | string
    | undefined;

  scheduleName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  weeklyWorkingHours?:
    | number
    | null
    | undefined;

  weeklyWorkingDays?:
    | number
    | null
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
 * Work schedule day
 *
 * dayOfWeek:
 * 1 = Monday
 * 2 = Tuesday
 * 3 = Wednesday
 * 4 = Thursday
 * 5 = Friday
 * 6 = Saturday
 * 7 = Sunday
 * =========================================================
 */

export interface WorkScheduleDayDatabaseRow {
  schedule_day_id: DatabaseId;
  schedule_id: DatabaseId;

  company_id: DatabaseId;

  day_of_week:
    | string
    | number;

  is_working_day:
    | number
    | boolean;

  planned_start_time:
    | string
    | null;

  planned_end_time:
    | string
    | null;

  break_minutes:
    | string
    | number;

  expected_work_minutes:
    | string
    | number;

  crosses_midnight:
    | number
    | boolean;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface WorkScheduleDayResponse {
  scheduleDayId: string;
  scheduleId: string;

  dayOfWeek: number;
  dayName: string;

  isWorkingDay: boolean;

  plannedStartTime: string | null;
  plannedEndTime: string | null;

  breakMinutes: number;
  expectedWorkMinutes: number;

  crossesMidnight: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface ReplaceWorkScheduleDayRecord {
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
 * Employee shift assignment
 * =========================================================
 */

export interface EmployeeShiftAssignmentDatabaseRow {
  shift_assignment_id: DatabaseId;

  company_id: DatabaseId;
  employee_id: DatabaseId;

  employee_code: string;
  employee_name: string;

  shift_id: DatabaseId;
  shift_code: string;
  shift_name: string;

  shift_start_time: string;
  shift_end_time: string;

  shift_crosses_midnight:
    | number
    | boolean;

  schedule_id:
    | DatabaseId
    | null;

  schedule_code: string | null;
  schedule_name: string | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  assignment_type: string;

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

  remarks: string | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface EmployeeShiftAssignmentResponse {
  shiftAssignmentId: string;

  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  shiftId: string;
  shiftCode: string;
  shiftName: string;

  shiftStartTime: string;
  shiftEndTime: string;
  shiftCrossesMidnight: boolean;

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

export interface CreateEmployeeShiftAssignmentRecord {
  employeeId: string;

  shiftId: string;
  scheduleId: string | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  assignmentType: string;
  isCurrent: boolean;

  assignedByUserId: string;
  remarks: string | null;
}

export interface UpdateEmployeeShiftAssignmentRecord {
  shiftId?:
    | string
    | undefined;

  scheduleId?:
    | string
    | null
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;

  assignmentType?:
    | string
    | undefined;

  isCurrent?:
    | boolean
    | undefined;

  remarks?:
    | string
    | null
    | undefined;
}

/*
 * =========================================================
 * Effective shift
 * =========================================================
 */

export interface EffectiveEmployeeShiftResponse {
  asOfDate: string;

  assignment:
    EmployeeShiftAssignmentResponse | null;

  shift:
    ShiftResponse | null;

  schedule:
    WorkScheduleResponse | null;

  scheduleDay:
    WorkScheduleDayResponse | null;
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface SchedulingPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
export type HolidayDatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Holiday
 * =========================================================
 */

export interface HolidayDatabaseRow {
  holiday_id: HolidayDatabaseId;
  company_id: HolidayDatabaseId;

  branch_id:
    | HolidayDatabaseId
    | null;

  branch_code: string | null;
  branch_name: string | null;

  holiday_name: string;

  holiday_date:
    | Date
    | string;

  holiday_type: string;
  description: string | null;

  is_optional:
    | number
    | boolean;

  is_paid:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  leave_request_day_count:
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

export interface HolidayResponse {
  holidayId: string;
  companyId: string;

  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;

  scope:
    | "COMPANY"
    | "BRANCH";

  holidayName: string;
  holidayDate: string;
  holidayType: string;

  description: string | null;

  isOptional: boolean;
  isPaid: boolean;
  isActive: boolean;

  leaveRequestDayCount: number;
  attendanceRecordCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayRecord {
  companyId: string;
  branchId: string | null;

  holidayName: string;
  holidayDate: string;
  holidayType: string;

  description: string | null;

  isOptional: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface UpdateHolidayRecord {
  branchId?:
    | string
    | null
    | undefined;

  holidayName?:
    | string
    | undefined;

  holidayDate?:
    | string
    | undefined;

  holidayType?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  isOptional?:
    | boolean
    | undefined;

  isPaid?:
    | boolean
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Employee holiday
 * =========================================================
 */

export interface EmployeeHolidayResponse {
  employeeId: string;
  companyId: string;

  employeeCode: string;
  employeeName: string;

  employeeBranchId: string | null;

  holiday: HolidayResponse;
}

export interface EffectiveEmployeeHolidayResponse {
  employeeId: string;
  companyId: string;

  employeeBranchId: string | null;
  holidayDate: string;

  isHoliday: boolean;

  holidays: HolidayResponse[];

  primaryHoliday:
    | HolidayResponse
    | null;
}

/*
 * =========================================================
 * Calendar summary
 * =========================================================
 */

export interface HolidayCalendarDayResponse {
  holidayDate: string;

  isHoliday: boolean;
  isOptional: boolean;
  isPaid: boolean;

  holidayCount: number;
  holidays: HolidayResponse[];
}

export interface HolidayCalendarSummaryResponse {
  dateFrom: string;
  dateTo: string;

  totalCalendarDays: number;
  totalHolidayDates: number;

  paidHolidayDates: number;
  unpaidHolidayDates: number;
  optionalHolidayDates: number;

  days:
    HolidayCalendarDayResponse[];
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface HolidayPaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { AttendanceDailySummary, AttendanceDevice, AttendanceDeviceInput, AttendanceListParams, AttendanceRecord, AttendanceRecordListResult, AttendanceShift, AttendanceShiftInput, AttendanceShiftOption, AttendanceStatus } from "../types/attendance.types";

// added by wali: Persist monthly review metadata returned by the employee-month finalization endpoint.
export interface AttendanceMonthFinalization {
  monthFinalizationId: string;
  companyId: string;
  employeeId: string;
  yearMonth: string;
  recordsFinalizedCount: number;
  finalizedByUserId: string;
  finalizedAt: string;
  notes: string | null;
}

// added by wali: Model work schedules and weekday rules returned by the attendance scheduling API.
export interface WorkScheduleDay {
  scheduleDayId?: string;
  scheduleId?: string;
  dayOfWeek: number;
  dayName?: string;
  shiftId: string | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  isWorkingDay: boolean;
  plannedStartTime: string | null;
  plannedEndTime: string | null;
  breakMinutes: number;
  expectedWorkMinutes: number;
  crossesMidnight: boolean;
}

export interface WorkSchedule {
  scheduleId: string;
  scheduleCode: string;
  scheduleName: string;
  description: string | null;
  weeklyWorkingHours: number | null;
  weeklyWorkingDays: number | null;
  isDefault: boolean;
  isActive: boolean;
  configuredWorkingDayCount: number;
  assignmentCount: number;
  currentAssignmentCount: number;
  days?: WorkScheduleDay[];
}

export interface WorkScheduleInput {
  scheduleCode: string;
  scheduleName: string;
  description: string | null;
  weeklyWorkingHours: number | null;
  weeklyWorkingDays: number | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface ShiftAssignment {
  shiftAssignmentId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  shiftId: string | null;
  shiftCode: string | null;
  shiftName: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  scheduleId: string | null;
  scheduleCode: string | null;
  scheduleName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignmentType: string;
  isCurrent: boolean;
  remarks: string | null;
}

export interface ShiftAssignmentInput {
  shiftId?: string;
  scheduleId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignmentType: string;
  isCurrent: boolean;
  remarks: string | null;
}

// added by wali: Model employee-submitted punch corrections for the Approvals workspace.
export interface AttendanceAdjustmentRequest {
  adjustmentRequestId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  attendanceId: string | null;
  attendanceDate: string;
  adjustmentType: string;
  currentCheckInAt: string | null;
  currentCheckOutAt: string | null;
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reason: string;
  requestStatus: string;
  requestedByFullName: string | null;
  createdAt: string;
}

export interface AttendanceAdjustmentListResult {
  adjustmentRequests: AttendanceAdjustmentRequest[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export async function listAttendanceRecordsRequest(params: AttendanceListParams = {}): Promise<AttendanceRecordListResult> {
  const response = await apiClient.get<ApiSuccessResponse<AttendanceRecordListResult>>("/attendance/records", { params });
  return response.data.data;
}

// added by wali: Load filtered attendance history across pages so Approvals can show month rows from the earliest records onward.
export async function listAttendanceHistoryRecordsRequest(params: AttendanceListParams = {}): Promise<AttendanceRecord[]> {
  const firstPage = await listAttendanceRecordsRequest({ ...params, page: 1, pageSize: 100 });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
      listAttendanceRecordsRequest({ ...params, page: index + 2, pageSize: 100 }),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((result) => result.attendanceRecords);
}

// added by wali: Finalize reviewed attendance records through the backend's immutable-record workflow.
export async function finalizeAttendanceRecordRequest(attendanceId: string, notes?: string): Promise<AttendanceRecord> {
  const response = await apiClient.post<ApiSuccessResponse<{ attendanceRecord: AttendanceRecord }>>(`/attendance/records/${attendanceId}/finalize`, { ...(notes ? { notes } : {}) });
  return response.data.data.attendanceRecord;
}

// added by wali: Finalize all eligible daily attendance rows for one employee and calendar month at once.
export async function finalizeAttendanceMonthRequest(employeeId: string, yearMonth: string, notes?: string): Promise<AttendanceMonthFinalization> {
  const response = await apiClient.post<ApiSuccessResponse<{ monthFinalization: AttendanceMonthFinalization }>>(
    `/attendance/employees/${employeeId}/months/${yearMonth}/finalize`,
    { ...(notes ? { notes } : {}) },
  );
  return response.data.data.monthFinalization;
}

// added by wali: Load pending attendance corrections for the adjustment approval queue.
export async function listAttendanceAdjustmentRequestsRequest(params: { page?: number; pageSize?: number; requestStatus?: string; search?: string } = {}): Promise<AttendanceAdjustmentListResult> {
  const response = await apiClient.get<ApiSuccessResponse<AttendanceAdjustmentListResult>>("/attendance/adjustment-requests", { params });
  return response.data.data;
}

// added by wali: Submit approval or rejection decisions for attendance correction requests.
export async function decideAttendanceAdjustmentRequest(requestId: string, decision: "approve" | "reject", input: { approvalLevel?: number; comments?: string }) {
  const response = await apiClient.post<ApiSuccessResponse<{ adjustmentRequest: AttendanceAdjustmentRequest }>>(`/attendance/adjustment-requests/${requestId}/${decision}`, input);
  return response.data.data.adjustmentRequest;
}

export async function listEmployeeAttendanceRequest(employeeId: string, params: AttendanceListParams): Promise<AttendanceRecordListResult> {
  const response = await apiClient.get<ApiSuccessResponse<AttendanceRecordListResult>>(`/employees/${employeeId}/attendance`, { params });
  return response.data.data;
}

export async function getAttendanceDailySummaryRequest(params: AttendanceListParams, employeeId?: string): Promise<AttendanceDailySummary> {
  const listRequest = (page: number) => employeeId
    ? listEmployeeAttendanceRequest(employeeId, { ...params, page, pageSize: 100 })
    : listAttendanceRecordsRequest({ ...params, page, pageSize: 100 });
  const firstPage = await listRequest(1);
  const otherPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) => listRequest(index + 2)),
  );
  const records = [firstPage, ...otherPages].flatMap((result) => result.attendanceRecords);
  return {
    // added by wali: Count distinct employees whose daily attendance status is configured to count as absent.
    absentEmployees: new Set(records.filter((record) => record.countsAsAbsent).map((record) => record.employeeId)).size,
    checkedIn: records.filter((record) => Boolean(record.checkInAt)).length,
    checkedOut: records.filter((record) => Boolean(record.checkOutAt)).length,
    lateArrivals: records.filter((record) => record.lateMinutes > 0).length,
  };
}

export async function listAttendanceStatusesRequest(): Promise<AttendanceStatus[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ attendanceStatuses: AttendanceStatus[] }>>("/attendance/statuses", { params: { page: 1, pageSize: 100, isActive: true } });
  return response.data.data.attendanceStatuses;
}

export async function listAttendanceShiftsRequest(): Promise<AttendanceShiftOption[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ shifts: AttendanceShiftOption[] }>>("/attendance/shifts", { params: { page: 1, pageSize: 100, isActive: true } });
  return response.data.data.shifts;
}

// added by wali: Keep shift list queries aligned with backend pagination, department and branch filters, and inactive definitions for management.
export async function listAttendanceShiftDefinitionsRequest(search?: string, filters: { branchId?: string; departmentId?: string } = {}): Promise<AttendanceShift[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ shifts: AttendanceShift[] }>>("/attendance/shifts", {
    params: { page: 1, pageSize: 100, includeInactive: true, ...(search ? { search } : {}), ...filters },
  });
  return response.data.data.shifts;
}

// added by wali: Create and edit shifts through the existing scheduling API.
export async function createAttendanceShiftRequest(input: AttendanceShiftInput): Promise<AttendanceShift> {
  const response = await apiClient.post<ApiSuccessResponse<{ shift: AttendanceShift }>>("/attendance/shifts", input);
  return response.data.data.shift;
}

export async function updateAttendanceShiftRequest(shiftId: string, input: Partial<AttendanceShiftInput>): Promise<AttendanceShift> {
  const response = await apiClient.patch<ApiSuccessResponse<{ shift: AttendanceShift }>>(`/attendance/shifts/${shiftId}`, input);
  return response.data.data.shift;
}

// added by wali: Fetch schedules with weekday rules and optional employee branch/department filters.
export async function listWorkSchedulesRequest(filters: { branchId?: string; departmentId?: string } = {}): Promise<WorkSchedule[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ workSchedules: WorkSchedule[] }>>("/attendance/work-schedules", {
    params: { page: 1, pageSize: 100, includeInactive: true, includeDays: true, ...filters },
  });
  return response.data.data.workSchedules;
}

export async function createWorkScheduleRequest(input: WorkScheduleInput): Promise<WorkSchedule> {
  const response = await apiClient.post<ApiSuccessResponse<{ workSchedule: WorkSchedule }>>("/attendance/work-schedules", input);
  return response.data.data.workSchedule;
}

export async function updateWorkScheduleRequest(scheduleId: string, input: Partial<WorkScheduleInput>): Promise<WorkSchedule> {
  const response = await apiClient.patch<ApiSuccessResponse<{ workSchedule: WorkSchedule }>>(`/attendance/work-schedules/${scheduleId}`, input);
  return response.data.data.workSchedule;
}

export async function replaceWorkScheduleDaysRequest(scheduleId: string, days: WorkScheduleDay[]): Promise<WorkScheduleDay[]> {
  const response = await apiClient.put<ApiSuccessResponse<{ workSchedule: WorkSchedule | null; days: WorkScheduleDay[] }>>(`/attendance/work-schedules/${scheduleId}/days`, { days });
  return response.data.data.days;
}

export async function listEmployeeShiftAssignmentsRequest(employeeId: string): Promise<ShiftAssignment[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ shiftAssignments: ShiftAssignment[] }>>(`/employees/${employeeId}/shift-assignments`, {
    params: { page: 1, pageSize: 100 },
  });
  return response.data.data.shiftAssignments;
}

// added by wali: Load the company-wide assignment overview so employee names and schedules appear together in the table.
export async function listAllShiftAssignmentsRequest(): Promise<ShiftAssignment[]> {
  // added by wali: Load every assignment page so employee filtering and bulk selection use complete company data.
  const firstResponse = await apiClient.get<ApiSuccessResponse<{ shiftAssignments: ShiftAssignment[]; pagination: { totalPages: number } }>>("/attendance/employee-shift-assignments", {
    params: { page: 1, pageSize: 100 },
  });
  const assignments = [...firstResponse.data.data.shiftAssignments];
  for (let page = 2; page <= firstResponse.data.data.pagination.totalPages; page += 1) {
    const response = await apiClient.get<ApiSuccessResponse<{ shiftAssignments: ShiftAssignment[] }>>("/attendance/employee-shift-assignments", {
      params: { page, pageSize: 100 },
    });
    assignments.push(...response.data.data.shiftAssignments);
  }
  return assignments;
}

export async function createEmployeeShiftAssignmentRequest(employeeId: string, input: ShiftAssignmentInput): Promise<ShiftAssignment> {
  const response = await apiClient.post<ApiSuccessResponse<{ shiftAssignment: ShiftAssignment }>>(`/employees/${employeeId}/shift-assignments`, input);
  return response.data.data.shiftAssignment;
}

export async function updateEmployeeShiftAssignmentRequest(employeeId: string, assignmentId: string, input: Partial<ShiftAssignmentInput>): Promise<ShiftAssignment> {
  const response = await apiClient.patch<ApiSuccessResponse<{ shiftAssignment: ShiftAssignment }>>(`/employees/${employeeId}/shift-assignments/${assignmentId}`, input);
  return response.data.data.shiftAssignment;
}

export async function listAttendanceDevicesRequest(search?: string, branchId?: string): Promise<AttendanceDevice[]> {
  // added by wali: Load every matching device so configuration totals do not stop at the first 100 rows.
  const firstResponse = await apiClient.get<ApiSuccessResponse<{ attendanceDevices: AttendanceDevice[]; pagination: { totalPages: number } }>>("/attendance/devices", {
    params: { page: 1, pageSize: 100, includeInactive: true, ...(search ? { search } : {}), ...(branchId ? { branchId } : {}) },
  });
  const devices = [...firstResponse.data.data.attendanceDevices];
  const totalPages = firstResponse.data.data.pagination.totalPages;
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await apiClient.get<ApiSuccessResponse<{ attendanceDevices: AttendanceDevice[] }>>("/attendance/devices", {
      params: { page, pageSize: 100, includeInactive: true, ...(search ? { search } : {}), ...(branchId ? { branchId } : {}) },
    });
    devices.push(...response.data.data.attendanceDevices);
  }
  return devices;
}

export async function createAttendanceDeviceRequest(input: AttendanceDeviceInput): Promise<AttendanceDevice> {
  const response = await apiClient.post<ApiSuccessResponse<{ attendanceDevice: AttendanceDevice }>>("/attendance/devices", input);
  return response.data.data.attendanceDevice;
}

export async function updateAttendanceDeviceRequest(deviceId: string, input: Partial<AttendanceDeviceInput>): Promise<AttendanceDevice> {
  const response = await apiClient.patch<ApiSuccessResponse<{ attendanceDevice: AttendanceDevice }>>(`/attendance/devices/${deviceId}`, input);
  return response.data.data.attendanceDevice;
}

export async function checkInAttendanceRequest(attendanceId: string): Promise<AttendanceRecord> {
  const response = await apiClient.post<ApiSuccessResponse<{ attendanceRecord: AttendanceRecord }>>(`/attendance/records/${attendanceId}/check-in`, {});
  return response.data.data.attendanceRecord;
}

export async function checkOutAttendanceRequest(attendanceId: string): Promise<AttendanceRecord> {
  const response = await apiClient.post<ApiSuccessResponse<{ attendanceRecord: AttendanceRecord }>>(`/attendance/records/${attendanceId}/check-out`, {});
  return response.data.data.attendanceRecord;
}

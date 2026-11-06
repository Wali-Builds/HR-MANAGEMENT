export interface AttendanceRecord {
  attendanceId: string;
  companyId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branchId: string | null;
  branchName: string | null;
  attendanceDate: string;
  shiftId: string | null;
  shiftName: string | null;
  scheduleId: string | null;
  scheduleName: string | null;
  policyId: string | null;
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
  notes: string | null;
  isManuallyModified: boolean;
  isFinalized: boolean;
  finalizedAt: string | null;
  openBreakCount: number;
  breakCount: number;
}

export interface AttendanceStatus {
  statusCode: string;
  statusName: string;
  description: string | null;
  countsAsPresent: boolean;
  countsAsAbsent: boolean;
  isPayable: boolean;
  isActive: boolean;
}

export interface AttendancePagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface AttendanceRecordListResult {
  attendanceRecords: AttendanceRecord[];
  pagination: AttendancePagination;
}

export interface AttendanceDailySummary {
  absentEmployees: number;
  checkedIn: number;
  checkedOut: number;
  lateArrivals: number;
}

export interface AttendanceListParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  branchId?: string;
  // added by wali: Limit team attendance results to employees in a selected department.
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  statusCode?: string;
  shiftId?: string;
  finalizationStatus?: "ALL" | "FINALIZED" | "UNFINALIZED";
  search?: string;
}

export interface AttendanceShiftOption {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  branchId: string | null;
  isActive: boolean;
}

// added by wali: Model the full shift resource returned by the scheduling API.
export interface AttendanceShift extends AttendanceShiftOption {
  companyId: string;
  branchCode: string | null;
  branchName: string | null;
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
  assignmentCount: number;
  currentAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

// added by wali: Match the backend shift create/update schema for the editor form.
export interface AttendanceShiftInput {
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

export interface AttendanceDevice {
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

export interface AttendanceDeviceInput {
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
  isActive: boolean;
}

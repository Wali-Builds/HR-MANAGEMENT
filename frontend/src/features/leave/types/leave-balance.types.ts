// edited by wali: Match employee balance details returned by the self-scoped balances endpoint.
export interface EmployeeLeaveBalance {
  leaveBalanceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  unitType: string;
  leavePeriodId: string;
  periodName: string;
  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;
  openingBalance: number;
  accruedUnits: number;
  carriedForwardUnits: number;
  adjustedUnits: number;
  usedUnits: number;
  pendingUnits: number;
  availableBalance: number;
  isConsistent: boolean;
}

export interface EmployeeLeaveBalancesResult {
  employeeId: string;
  companyId: string;
  balances: EmployeeLeaveBalance[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

// edited by wali: Describe company-wide balance details used by the Company Admin's read-only balance page.
export interface CompanyLeaveBalance {
  leaveBalanceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: string;
  leavePeriodId: string;
  periodName: string;
  periodStartDate: string;
  periodEndDate: string;
  periodStatus: string;
  openingBalance: number;
  accruedUnits: number;
  carriedForwardUnits: number;
  usedUnits: number;
  pendingUnits: number;
  availableBalance: number;
  isConsistent: boolean;
}

export interface CompanyLeaveBalancesResult {
  balances: CompanyLeaveBalance[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface InitializeEmployeeLeaveBalanceInput {
  leaveTypeId: string;
  leavePeriodId: string;
  openingBalance: number;
  accruedUnits: number;
  carriedForwardUnits: number;
  adjustedUnits: number;
  remarks?: string;
}

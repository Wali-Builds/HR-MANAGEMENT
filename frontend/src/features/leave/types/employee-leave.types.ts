// edited by wali: Keep employee Leave API types aligned to the backend request and effective-policy responses.
import type { LeaveUnitType } from "./leave-setup.types";

export interface EffectiveLeaveRule {
  leavePolicyRuleId: string;
  leavePolicyId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: LeaveUnitType;
  annualEntitlementUnits: number;
  allowHourlyLeave: boolean;
  isActive: boolean;
}

export interface EffectiveLeavePolicyResult {
  employeeId: string;
  companyId: string;
  asOfDate: string;
  source: "EMPLOYEE_ASSIGNMENT" | "COMPANY_DEFAULT" | "NONE";
  policy: { leavePolicyId: string; policyName: string; policyCode: string } | null;
  rules: EffectiveLeaveRule[];
}

export interface EmployeeLeaveRequest {
  leaveRequestId: string;
  requestNumber: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeUnitType: string;
  startDate: string;
  endDate: string;
  startSession: string;
  endSession: string;
  startTime: string | null;
  endTime: string | null;
  requestedUnits: number;
  chargeableUnits: number;
  reason: string;
  requestStatus: string;
  submittedAt: string | null;
  finalRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeLeaveRequestsResult {
  employeeId: string;
  companyId: string;
  requests: EmployeeLeaveRequest[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface CreateEmployeeLeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  startSession: "FULL_DAY" | "HOURLY";
  endSession: "FULL_DAY" | "HOURLY";
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
}

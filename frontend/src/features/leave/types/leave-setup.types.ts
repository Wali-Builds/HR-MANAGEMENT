// edited by wali: API-facing Leave setup types mirror the existing backend responses.
export type LeaveUnitType = "DAYS" | "HOURS";

// edited by wali: Represent company leave periods returned by the existing API.
export interface LeavePeriod {
  leavePeriodId: string;
  companyId: string;
  periodCode: string;
  periodName: string;
  startDate: string;
  endDate: string;
  periodStatus: string;
  isOpen: boolean;
}

export interface LeavePeriodsResult {
  leavePeriods: LeavePeriod[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface LeaveType {
  leaveTypeId: string;
  companyId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  description: string | null;
  unitType: LeaveUnitType;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  displayColor: string | null;
  sortOrder: number;
  isActive: boolean;
  policyRuleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTypesResult {
  leaveTypes: LeaveType[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface SaveLeaveTypeInput {
  leaveTypeCode: string;
  leaveTypeName: string;
  description: string | null;
  unitType: LeaveUnitType;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  displayColor: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface LeavePolicy {
  leavePolicyId: string;
  companyId: string;
  policyCode: string;
  policyName: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  isActive: boolean;
  ruleCount: number;
  assignmentCount: number;
  currentAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePoliciesResult {
  leavePolicies: LeavePolicy[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface SaveLeavePolicyInput {
  policyCode: string;
  policyName: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface LeavePolicyRule {
  leavePolicyRuleId: string;
  leavePolicyId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: LeaveUnitType;
  annualEntitlementUnits: number;
  isActive: boolean;
}

export interface LeavePolicyRulesResult {
  rules: LeavePolicyRule[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
}

export interface SaveLeavePolicyRuleInput {
  leaveTypeId: string;
  annualEntitlementUnits: number;
  isActive: boolean;
}

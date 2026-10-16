export type LeaveDatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Leave types
 * =========================================================
 */

export interface LeaveTypeDatabaseRow {
  leave_type_id: LeaveDatabaseId;
  company_id: LeaveDatabaseId;

  leave_type_code: string;
  leave_type_name: string;
  description: string | null;

  unit_type: string;

  is_paid:
    | number
    | boolean;

  requires_approval:
    | number
    | boolean;

  requires_attachment:
    | number
    | boolean;

  display_color: string | null;

  sort_order:
    | string
    | number;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;

  policy_rule_count:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeaveTypeResponse {
  leaveTypeId: string;
  companyId: string;

  leaveTypeCode: string;
  leaveTypeName: string;
  description: string | null;

  unitType: string;

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

export interface CreateLeaveTypeRecord {
  companyId: string;

  leaveTypeCode: string;
  leaveTypeName: string;
  description: string | null;

  unitType: string;

  isPaid: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;

  displayColor: string | null;
  sortOrder: number;

  isActive: boolean;
}

export interface UpdateLeaveTypeRecord {
  leaveTypeCode?:
    | string
    | undefined;

  leaveTypeName?:
    | string
    | undefined;

  description?:
    | string
    | null
    | undefined;

  unitType?:
    | string
    | undefined;

  isPaid?:
    | boolean
    | undefined;

  requiresApproval?:
    | boolean
    | undefined;

  requiresAttachment?:
    | boolean
    | undefined;

  displayColor?:
    | string
    | null
    | undefined;

  sortOrder?:
    | number
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Leave policies
 * =========================================================
 */

export interface LeavePolicyDatabaseRow {
  leave_policy_id: LeaveDatabaseId;
  company_id: LeaveDatabaseId;

  policy_code: string;
  policy_name: string;
  description: string | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
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

  rule_count:
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

export interface LeavePolicyResponse {
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

export interface CreateLeavePolicyRecord {
  companyId: string;

  policyCode: string;
  policyName: string;
  description: string | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  isDefault: boolean;
  isActive: boolean;
}

export interface UpdateLeavePolicyRecord {
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

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
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
 * Leave policy rules
 * =========================================================
 */

export interface LeavePolicyRuleDatabaseRow {
  leave_policy_rule_id: LeaveDatabaseId;

  leave_policy_id: LeaveDatabaseId;
  leave_type_id: LeaveDatabaseId;

  company_id: LeaveDatabaseId;

  policy_code: string;
  policy_name: string;

  leave_type_code: string;
  leave_type_name: string;
  unit_type: string;

  leave_type_is_paid:
    | number
    | boolean;

  annual_entitlement_units:
    | string
    | number;

  accrual_method: string;

  accrual_units_per_period:
    | string
    | number;

  accrual_start_after_days:
    | string
    | number;

  prorate_entitlement:
    | number
    | boolean;

  allow_during_probation:
    | number
    | boolean;

  eligible_gender: string;

  minimum_request_units:
    | string
    | number;

  maximum_request_units:
    | string
    | number
    | null;

  minimum_notice_days:
    | string
    | number;

  maximum_advance_days:
    | string
    | number
    | null;

  maximum_backdate_days:
    | string
    | number;

  allow_half_day:
    | number
    | boolean;

  allow_hourly_leave:
    | number
    | boolean;

  include_weekends:
    | number
    | boolean;

  include_holidays:
    | number
    | boolean;

  sandwich_rule_enabled:
    | number
    | boolean;

  carry_forward_enabled:
    | number
    | boolean;

  maximum_carry_forward_units:
    | string
    | number
    | null;

  carry_forward_expiry_months:
    | string
    | number
    | null;

  maximum_balance_units:
    | string
    | number
    | null;

  allow_negative_balance:
    | number
    | boolean;

  negative_balance_limit:
    | string
    | number;

  attachment_required_after_units:
    | string
    | number
    | null;

  encashment_allowed:
    | number
    | boolean;

  maximum_encashment_units:
    | string
    | number
    | null;

  approval_levels_required:
    | string
    | number;

  is_active:
    | number
    | boolean;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface LeavePolicyRuleResponse {
  leavePolicyRuleId: string;

  leavePolicyId: string;
  leaveTypeId: string;
  companyId: string;

  policyCode: string;
  policyName: string;

  leaveTypeCode: string;
  leaveTypeName: string;
  unitType: string;
  leaveTypeIsPaid: boolean;

  annualEntitlementUnits: number;

  accrualMethod: string;
  accrualUnitsPerPeriod: number;
  accrualStartAfterDays: number;

  prorateEntitlement: boolean;
  allowDuringProbation: boolean;

  eligibleGender: string;

  minimumRequestUnits: number;
  maximumRequestUnits: number | null;

  minimumNoticeDays: number;
  maximumAdvanceDays: number | null;
  maximumBackdateDays: number;

  allowHalfDay: boolean;
  allowHourlyLeave: boolean;

  includeWeekends: boolean;
  includeHolidays: boolean;
  sandwichRuleEnabled: boolean;

  carryForwardEnabled: boolean;
  maximumCarryForwardUnits: number | null;
  carryForwardExpiryMonths: number | null;

  maximumBalanceUnits: number | null;

  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;

  attachmentRequiredAfterUnits: number | null;

  encashmentAllowed: boolean;
  maximumEncashmentUnits: number | null;

  approvalLevelsRequired: number;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateLeavePolicyRuleRecord {
  leavePolicyId: string;
  leaveTypeId: string;

  annualEntitlementUnits: number;

  accrualMethod: string;
  accrualUnitsPerPeriod: number;
  accrualStartAfterDays: number;

  prorateEntitlement: boolean;
  allowDuringProbation: boolean;

  eligibleGender: string;

  minimumRequestUnits: number;
  maximumRequestUnits: number | null;

  minimumNoticeDays: number;
  maximumAdvanceDays: number | null;
  maximumBackdateDays: number;

  allowHalfDay: boolean;
  allowHourlyLeave: boolean;

  includeWeekends: boolean;
  includeHolidays: boolean;
  sandwichRuleEnabled: boolean;

  carryForwardEnabled: boolean;
  maximumCarryForwardUnits: number | null;
  carryForwardExpiryMonths: number | null;

  maximumBalanceUnits: number | null;

  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;

  attachmentRequiredAfterUnits: number | null;

  encashmentAllowed: boolean;
  maximumEncashmentUnits: number | null;

  approvalLevelsRequired: number;

  isActive: boolean;
}

export interface UpdateLeavePolicyRuleRecord {
  leaveTypeId?:
    | string
    | undefined;

  annualEntitlementUnits?:
    | number
    | undefined;

  accrualMethod?:
    | string
    | undefined;

  accrualUnitsPerPeriod?:
    | number
    | undefined;

  accrualStartAfterDays?:
    | number
    | undefined;

  prorateEntitlement?:
    | boolean
    | undefined;

  allowDuringProbation?:
    | boolean
    | undefined;

  eligibleGender?:
    | string
    | undefined;

  minimumRequestUnits?:
    | number
    | undefined;

  maximumRequestUnits?:
    | number
    | null
    | undefined;

  minimumNoticeDays?:
    | number
    | undefined;

  maximumAdvanceDays?:
    | number
    | null
    | undefined;

  maximumBackdateDays?:
    | number
    | undefined;

  allowHalfDay?:
    | boolean
    | undefined;

  allowHourlyLeave?:
    | boolean
    | undefined;

  includeWeekends?:
    | boolean
    | undefined;

  includeHolidays?:
    | boolean
    | undefined;

  sandwichRuleEnabled?:
    | boolean
    | undefined;

  carryForwardEnabled?:
    | boolean
    | undefined;

  maximumCarryForwardUnits?:
    | number
    | null
    | undefined;

  carryForwardExpiryMonths?:
    | number
    | null
    | undefined;

  maximumBalanceUnits?:
    | number
    | null
    | undefined;

  allowNegativeBalance?:
    | boolean
    | undefined;

  negativeBalanceLimit?:
    | number
    | undefined;

  attachmentRequiredAfterUnits?:
    | number
    | null
    | undefined;

  encashmentAllowed?:
    | boolean
    | undefined;

  maximumEncashmentUnits?:
    | number
    | null
    | undefined;

  approvalLevelsRequired?:
    | number
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Employee leave-policy assignments
 * =========================================================
 */

export interface EmployeeLeavePolicyAssignmentDatabaseRow {
  assignment_id: LeaveDatabaseId;

  company_id: LeaveDatabaseId;
  employee_id: LeaveDatabaseId;

  employee_code: string;
  employee_name: string;

  leave_policy_id: LeaveDatabaseId;
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
    | LeaveDatabaseId
    | null;

  remarks: string | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface EmployeeLeavePolicyAssignmentResponse {
  assignmentId: string;

  companyId: string;
  employeeId: string;

  employeeCode: string;
  employeeName: string;

  leavePolicyId: string;
  policyCode: string;
  policyName: string;

  policyIsDefault: boolean;
  policyIsActive: boolean;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;

  assignedByUserId: string | null;
  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeLeavePolicyAssignmentRecord {
  employeeId: string;
  leavePolicyId: string;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;

  assignedByUserId: string;
  remarks: string | null;
}

export interface UpdateEmployeeLeavePolicyAssignmentRecord {
  leavePolicyId?:
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

  remarks?:
    | string
    | null
    | undefined;
}

/*
 * =========================================================
 * Effective leave policy
 * =========================================================
 */

export interface EffectiveEmployeeLeavePolicyResponse {
  employeeId: string;
  companyId: string;
  asOfDate: string;

  source:
    | "EMPLOYEE_ASSIGNMENT"
    | "COMPANY_DEFAULT"
    | "NONE";

  assignment:
    | EmployeeLeavePolicyAssignmentResponse
    | null;

  policy:
    | LeavePolicyResponse
    | null;

  rules:
    LeavePolicyRuleResponse[];
}

/*
 * =========================================================
 * Pagination
 * =========================================================
 */

export interface LeavePaginationResponse {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
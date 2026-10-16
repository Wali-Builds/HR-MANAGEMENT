import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  LeavePoliciesResult,
  LeavePolicy,
  LeavePolicyRule,
  LeavePolicyRulesResult,
  LeavePeriod,
  LeavePeriodsResult,
  LeaveType,
  LeaveTypesResult,
  SaveLeavePolicyInput,
  SaveLeavePolicyRuleInput,
  SaveLeaveTypeInput,
} from "../types/leave-setup.types";
import type {
  CreateEmployeeLeaveRequestInput,
  EffectiveLeavePolicyResult,
  EmployeeLeaveRequest,
  EmployeeLeaveRequestsResult,
} from "../types/employee-leave.types";

// edited by wali: Retrieve periods scoped by the backend to the signed-in Company Admin's company.
export async function getLeavePeriods(): Promise<LeavePeriodsResult> {
  const response = await apiClient.get<ApiSuccessResponse<LeavePeriodsResult>>(
    "/leave/periods", { params: { page: 1, pageSize: 100 } });
  return response.data.data;
}

// edited by wali: Create an open annual or quarterly leave period for the current company.
export async function createLeavePeriod(input: {
  periodCode: string;
  periodName: string;
  startDate: string;
  endDate: string;
}): Promise<LeavePeriod> {
  const response = await apiClient.post<ApiSuccessResponse<{ leavePeriod: LeavePeriod }>>(
    "/leave/periods", { ...input, periodStatus: "OPEN" });
  return response.data.data.leavePeriod;
}

// edited by wali: Use the existing tenant-scoped Leave endpoints for Company Admin setup.
export async function getLeaveTypes(): Promise<LeaveTypesResult> {
  const response = await apiClient.get<ApiSuccessResponse<LeaveTypesResult>>(
    "/leave/types", { params: { page: 1, pageSize: 100, includeInactive: true } });
  return response.data.data;
}

export async function createLeaveType(input: SaveLeaveTypeInput): Promise<LeaveType> {
  const response = await apiClient.post<ApiSuccessResponse<{ leaveType: LeaveType }>>(
    "/leave/types", input);
  return response.data.data.leaveType;
}

export async function updateLeaveType(leaveTypeId: string, input: Partial<SaveLeaveTypeInput>): Promise<LeaveType> {
  const response = await apiClient.patch<ApiSuccessResponse<{ leaveType: LeaveType }>>(
    "/leave/types/" + leaveTypeId, input);
  return response.data.data.leaveType;
}

export async function getLeavePolicies(): Promise<LeavePoliciesResult> {
  const response = await apiClient.get<ApiSuccessResponse<LeavePoliciesResult>>(
    "/leave/policies", { params: { page: 1, pageSize: 100, includeInactive: true } });
  return response.data.data;
}

export async function createLeavePolicy(input: SaveLeavePolicyInput): Promise<LeavePolicy> {
  const response = await apiClient.post<ApiSuccessResponse<{ leavePolicy: LeavePolicy }>>(
    "/leave/policies", input);
  return response.data.data.leavePolicy;
}

export async function updateLeavePolicy(leavePolicyId: string, input: Partial<SaveLeavePolicyInput>): Promise<LeavePolicy> {
  const response = await apiClient.patch<ApiSuccessResponse<{ leavePolicy: LeavePolicy }>>(
    "/leave/policies/" + leavePolicyId, input);
  return response.data.data.leavePolicy;
}

export async function getLeavePolicyRules(leavePolicyId: string): Promise<LeavePolicyRulesResult> {
  const response = await apiClient.get<ApiSuccessResponse<LeavePolicyRulesResult>>(
    "/leave/policies/" + leavePolicyId + "/rules", { params: { page: 1, pageSize: 100, includeInactive: true } });
  return response.data.data;
}

export async function createLeavePolicyRule(leavePolicyId: string, input: SaveLeavePolicyRuleInput): Promise<LeavePolicyRule> {
  const response = await apiClient.post<ApiSuccessResponse<{ rule: LeavePolicyRule }>>(
    "/leave/policies/" + leavePolicyId + "/rules", input);
  return response.data.data.rule;
}

export async function updateLeavePolicyRule(leavePolicyId: string, ruleId: string, input: Partial<SaveLeavePolicyRuleInput>): Promise<LeavePolicyRule> {
  const response = await apiClient.patch<ApiSuccessResponse<{ rule: LeavePolicyRule }>>(
    "/leave/policies/" + leavePolicyId + "/rules/" + ruleId, input);
  return response.data.data.rule;
}

// edited by wali: Load the authenticated employee's effective assignment or company-default policy.
export async function getMyEffectiveLeavePolicy(employeeId: string): Promise<EffectiveLeavePolicyResult> {
  const response = await apiClient.get<ApiSuccessResponse<EffectiveLeavePolicyResult>>(
    "/employees/" + employeeId + "/effective-leave-policy",
  );
  return response.data.data;
}

// edited by wali: Fetch only the signed-in employee's own leave requests.
export async function getMyLeaveRequests(employeeId: string): Promise<EmployeeLeaveRequestsResult> {
  const response = await apiClient.get<ApiSuccessResponse<EmployeeLeaveRequestsResult>>(
    "/employees/" + employeeId + "/leave-requests",
    { params: { page: 1, pageSize: 50 } },
  );
  return response.data.data;
}

// edited by wali: Save an employee request as a draft before its separate submit action.
export async function createMyLeaveRequest(employeeId: string, input: CreateEmployeeLeaveRequestInput): Promise<EmployeeLeaveRequest> {
  const response = await apiClient.post<ApiSuccessResponse<{ leaveRequest: EmployeeLeaveRequest }>>(
    "/employees/" + employeeId + "/leave-requests", input,
  );
  return response.data.data.leaveRequest;
}

// edited by wali: Update an employee-owned draft through the backend's existing draft-only PATCH route.
export async function updateMyLeaveRequest(leaveRequestId: string, input: CreateEmployeeLeaveRequestInput): Promise<EmployeeLeaveRequest> {
  const response = await apiClient.patch<ApiSuccessResponse<{ leaveRequest: EmployeeLeaveRequest }>>(
    "/leave/requests/" + leaveRequestId, input,
  );
  return response.data.data.leaveRequest;
}

// edited by wali: Submit the employee-owned draft through the backend request lifecycle endpoint.
export async function submitMyLeaveRequest(leaveRequestId: string): Promise<EmployeeLeaveRequest> {
  const response = await apiClient.post<ApiSuccessResponse<{ request: EmployeeLeaveRequest }>>(
    "/leave/requests/" + leaveRequestId + "/submit", { acknowledgement: true },
  );
  return response.data.data.request;
}

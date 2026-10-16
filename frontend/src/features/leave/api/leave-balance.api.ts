import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { CompanyLeaveBalancesResult, EmployeeLeaveBalancesResult, InitializeEmployeeLeaveBalanceInput } from "../types/leave-balance.types";

// edited by wali: Load a page of tenant-scoped balances for the Company Admin's overview.
export async function getCompanyLeaveBalances(page: number, pageSize = 100): Promise<CompanyLeaveBalancesResult> {
  const response = await apiClient.get<ApiSuccessResponse<CompanyLeaveBalancesResult>>(
    "/leave/balances",
    { params: { page, pageSize, includeZeroBalance: true } },
  );
  return response.data.data;
}

// edited by wali: Load an employee's balances for a selected date; backend access is self-scoped for employees.
export async function getEmployeeLeaveBalances(employeeId: string, effectiveOn?: string): Promise<EmployeeLeaveBalancesResult> {
  const response = await apiClient.get<ApiSuccessResponse<EmployeeLeaveBalancesResult>>(
    `/employees/${employeeId}/leave-balances`,
    { params: { page: 1, pageSize: 100, includeZeroBalance: true, ...(effectiveOn ? { effectiveOn } : {}) } },
  );
  return response.data.data;
}

// edited by wali: Initialize a single tenant employee/type/period balance with its ledger transaction.
export async function initializeEmployeeLeaveBalance(employeeId: string, input: InitializeEmployeeLeaveBalanceInput): Promise<void> {
  await apiClient.post(
    `/employees/${employeeId}/leave-balances/initialize`,
    input,
  );
}

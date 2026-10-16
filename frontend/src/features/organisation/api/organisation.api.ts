// edited by wali: Keep department HTTP requests inside the Organisation feature.
import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Department, DepartmentInput, DepartmentListParams, DepartmentListResult } from "../types/organisation.types";

export async function listDepartmentsRequest(params: DepartmentListParams): Promise<DepartmentListResult> {
  const response = await apiClient.get<ApiSuccessResponse<DepartmentListResult>>("/departments", { params });
  return response.data.data;
}

export async function createDepartmentRequest(input: DepartmentInput): Promise<Department> {
  const response = await apiClient.post<ApiSuccessResponse<{ department: Department }>>("/departments", input);
  return response.data.data.department;
}

export async function updateDepartmentRequest(departmentId: string, input: Partial<DepartmentInput>): Promise<Department> {
  const response = await apiClient.patch<ApiSuccessResponse<{ department: Department }>>(`/departments/${departmentId}`, input);
  return response.data.data.department;
}

export async function archiveDepartmentRequest(departmentId: string): Promise<void> {
  await apiClient.delete(`/departments/${departmentId}`);
}

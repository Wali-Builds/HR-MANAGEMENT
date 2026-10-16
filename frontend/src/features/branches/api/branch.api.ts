// edited by wali: Keep branch HTTP requests inside the Branches feature.
import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Branch, BranchInput, BranchListParams, BranchListResult } from "../types/branch.types";

export async function listBranchesRequest(params: BranchListParams): Promise<BranchListResult> {
  const response = await apiClient.get<ApiSuccessResponse<BranchListResult>>("/branches", { params });
  return response.data.data;
}

export async function createBranchRequest(input: BranchInput): Promise<Branch> {
  const response = await apiClient.post<ApiSuccessResponse<{ branch: Branch }>>("/branches", input);
  return response.data.data.branch;
}

export async function updateBranchRequest(branchId: string, input: Partial<BranchInput>): Promise<Branch> {
  const response = await apiClient.patch<ApiSuccessResponse<{ branch: Branch }>>(`/branches/${branchId}`, input);
  return response.data.data.branch;
}

export async function archiveBranchRequest(branchId: string): Promise<void> {
  await apiClient.delete(`/branches/${branchId}`);
}

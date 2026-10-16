import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Designation, DesignationInput, DesignationListParams, DesignationListResult } from "../types/designation.types";

// edited by wali: Keep designation HTTP requests in the Designations feature.
export async function listDesignationsRequest(params: DesignationListParams): Promise<DesignationListResult> {
  const response = await apiClient.get<ApiSuccessResponse<DesignationListResult>>("/designations", { params });
  return response.data.data;
}
export async function createDesignationRequest(input: DesignationInput): Promise<Designation> {
  const response = await apiClient.post<ApiSuccessResponse<{ designation: Designation }>>("/designations", input);
  return response.data.data.designation;
}
export async function updateDesignationRequest(designationId: string, input: Partial<DesignationInput>): Promise<Designation> {
  const response = await apiClient.patch<ApiSuccessResponse<{ designation: Designation }>>("/designations/" + designationId, input);
  return response.data.data.designation;
}
export async function archiveDesignationRequest(designationId: string): Promise<void> {
  await apiClient.delete("/designations/" + designationId);
}

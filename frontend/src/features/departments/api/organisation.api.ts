import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  Branch,
  BranchInput,
  BranchListParams,
  BranchListResult,
  Department,
  DepartmentInput,
  DepartmentListParams,
  DepartmentListResult,
  Designation,
  DesignationInput,
  DesignationListParams,
  DesignationListResult,
  Position,
  PositionInput,
  PositionListParams,
  PositionListResult,
} from "../types/organisation.types";

export async function listBranchesRequest(
  params: BranchListParams,
): Promise<BranchListResult> {
  const response = await apiClient.get<ApiSuccessResponse<BranchListResult>>(
    "/branches",
    { params },
  );
  return response.data.data;
}

export async function createBranchRequest(input: BranchInput): Promise<Branch> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ branch: Branch }>
  >("/branches", input);
  return response.data.data.branch;
}

export async function updateBranchRequest(
  branchId: string,
  input: Partial<BranchInput>,
): Promise<Branch> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ branch: Branch }>
  >(`/branches/${branchId}`, input);
  return response.data.data.branch;
}

export async function archiveBranchRequest(branchId: string): Promise<void> {
  await apiClient.delete(`/branches/${branchId}`);
}

export async function listDepartmentsRequest(
  params: DepartmentListParams,
): Promise<DepartmentListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<DepartmentListResult>
  >("/departments", { params });
  return response.data.data;
}

export async function createDepartmentRequest(
  input: DepartmentInput,
): Promise<Department> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ department: Department }>
  >("/departments", input);
  return response.data.data.department;
}

export async function updateDepartmentRequest(
  departmentId: string,
  input: Partial<DepartmentInput>,
): Promise<Department> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ department: Department }>
  >(`/departments/${departmentId}`, input);
  return response.data.data.department;
}

export async function archiveDepartmentRequest(
  departmentId: string,
): Promise<void> {
  await apiClient.delete(`/departments/${departmentId}`);
}

export async function listDesignationsRequest(
  params: DesignationListParams,
): Promise<DesignationListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<DesignationListResult>
  >("/designations", { params });
  return response.data.data;
}

export async function createDesignationRequest(
  input: DesignationInput,
): Promise<Designation> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ designation: Designation }>
  >("/designations", input);
  return response.data.data.designation;
}

export async function updateDesignationRequest(
  designationId: string,
  input: Partial<DesignationInput>,
): Promise<Designation> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ designation: Designation }>
  >(`/designations/${designationId}`, input);
  return response.data.data.designation;
}

export async function archiveDesignationRequest(
  designationId: string,
): Promise<void> {
  await apiClient.delete(`/designations/${designationId}`);
}

export async function listPositionsRequest(
  params: PositionListParams,
): Promise<PositionListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<PositionListResult>
  >("/positions", { params });
  return response.data.data;
}

export async function createPositionRequest(
  input: PositionInput,
): Promise<Position> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ position: Position }>
  >("/positions", input);
  return response.data.data.position;
}

export async function updatePositionRequest(
  positionId: string,
  input: Partial<PositionInput>,
): Promise<Position> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ position: Position }>
  >(`/positions/${positionId}`, input);
  return response.data.data.position;
}

export async function closePositionRequest(positionId: string): Promise<void> {
  await apiClient.delete(`/positions/${positionId}`);
}

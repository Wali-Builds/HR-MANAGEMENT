import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  BranchReference,
  DepartmentReference,
  DesignationReference,
  Employee,
  EmployeeListParams,
  EmployeeListResult,
  EmployeeLookups,
  EmployeeMutationInput,
  EmployeeSelfProfile,
  PositionReference,
} from "../types/employee.types";

interface BranchListResult {
  branches: BranchReference[];
}

interface DepartmentListResult {
  departments: DepartmentReference[];
}

interface DesignationListResult {
  designations: DesignationReference[];
}

interface PositionListResult {
  positions: PositionReference[];
}

export interface ProjectReference {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  departmentId: string | null;
}

export async function listActiveProjectReferencesRequest(departmentId: string): Promise<ProjectReference[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ projects: ProjectReference[] }>>("/projects", {
    params: { departmentId, activeOnly: "true" },
  });
  return response.data.data.projects;
}

export async function listEmployeesRequest(
  params: EmployeeListParams,
): Promise<EmployeeListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<EmployeeListResult>
  >("/employees", { params });

  return response.data.data;
}

export async function getEmployeeRequest(
  employeeId: string,
): Promise<Employee> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ employee: Employee }>
  >(`/employees/${employeeId}`);

  return response.data.data.employee;
}

// edited by wali: Fetch the authenticated employee's restricted profile from the self-service endpoint.
export async function getMyEmployeeProfileRequest(): Promise<EmployeeSelfProfile> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ profile: EmployeeSelfProfile }>
  >("/employees/me");

  return response.data.data.profile;
}

export async function getEmployeeLookupsRequest(): Promise<EmployeeLookups> {
  const response = await apiClient.get<
    ApiSuccessResponse<EmployeeLookups>
  >("/employees/lookups");

  return response.data.data;
}

export async function createEmployeeRequest(
  input: EmployeeMutationInput,
): Promise<Employee> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ employee: Employee }>
  >("/employees", input);

  return response.data.data.employee;
}

export async function updateEmployeeRequest(
  employeeId: string,
  input: Partial<EmployeeMutationInput>,
): Promise<Employee> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ employee: Employee }>
  >(`/employees/${employeeId}`, input);

  return response.data.data.employee;
}

export async function archiveEmployeeRequest(
  employeeId: string,
): Promise<void> {
  await apiClient.delete(`/employees/${employeeId}`);
}

export async function listBranchReferencesRequest(
  companyId?: string,
): Promise<BranchReference[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<BranchListResult>
  >("/branches", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      sortBy: "branch_name",
      sortOrder: "ASC",
      ...(companyId ? { companyId } : {}),
    },
  });

  return response.data.data.branches;
}

export async function listDepartmentReferencesRequest(
  companyId?: string,
): Promise<DepartmentReference[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<DepartmentListResult>
  >("/departments", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      sortBy: "department_name",
      sortOrder: "ASC",
      ...(companyId ? { companyId } : {}),
    },
  });

  return response.data.data.departments;
}

export async function listDesignationReferencesRequest(
  companyId?: string,
): Promise<DesignationReference[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<DesignationListResult>
  >("/designations", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      sortBy: "designation_name",
      sortOrder: "ASC",
      ...(companyId ? { companyId } : {}),
    },
  });

  return response.data.data.designations;
}

export async function listPositionReferencesRequest(
  companyId?: string,
): Promise<PositionReference[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<PositionListResult>
  >("/positions", {
    params: {
      page: 1,
      limit: 100,
      positionStatus: "ACTIVE",
      hasVacancy: true,
      sortBy: "position_title",
      sortOrder: "ASC",
      ...(companyId ? { companyId } : {}),
    },
  });

  return response.data.data.positions;
}

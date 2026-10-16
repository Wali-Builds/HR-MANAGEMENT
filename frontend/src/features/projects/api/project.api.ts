import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Project, ProjectInput, ProjectStatus } from "../types/project.types";

export interface ProjectListParams {
  departmentId?: string;
  branchId?: string;
  projectStatus?: ProjectStatus;
  search?: string;
  activeOnly?: boolean;
}

export async function listProjectsRequest(params: ProjectListParams = {}): Promise<Project[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ projects: Project[] }>>("/projects", { params });
  return response.data.data.projects;
}

export async function createProjectRequest(input: ProjectInput): Promise<Project> {
  const response = await apiClient.post<ApiSuccessResponse<{ project: Project }>>("/projects", input);
  return response.data.data.project;
}

export async function updateProjectRequest(projectId: string, input: Partial<ProjectInput>): Promise<Project> {
  const response = await apiClient.patch<ApiSuccessResponse<{ project: Project }>>(`/projects/${projectId}`, input);
  return response.data.data.project;
}

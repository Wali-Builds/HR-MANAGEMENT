import { AppError } from "../../common/errors/app-error.js";
import type { AuthContext } from "../auth/auth.types.js";
import type { CreateProjectInput, ProjectListQuery, UpdateProjectInput } from "./project.schema.js";
import { createProjectRow, findActiveBranch, findActiveDepartment, findActiveProjectManager, findProjectRow, listProjectRows, updateProjectRow } from "./project.repository.js";
import type { ProjectResponse, ProjectRow } from "./project.types.js";

function requiredCompany(auth: AuthContext): string {
  if (!auth.companyId || !auth.roleCodes.some((role) => role.toUpperCase() === "COMPANY_ADMIN")) {
    throw new AppError({ message: "Projects are available only to a Company Administrator", statusCode: 403, code: "PROJECT_ACCESS_DENIED" });
  }
  return auth.companyId;
}

function date(value: Date | string | null): string | null {
  if (value === null) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = value instanceof Date ? value : new Date(value);
  return parsed.toISOString().slice(0, 10);
}

function timestamp(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function map(row: ProjectRow): ProjectResponse {
  return {
    projectId: String(row.project_id), companyId: String(row.company_id),
    branchId: row.branch_id == null ? null : String(row.branch_id),
    departmentId: row.department_id == null ? null : String(row.department_id),
    projectCode: row.project_code, projectName: row.project_name, clientName: row.client_name,
    description: row.description,
    projectManagerEmployeeId: row.project_manager_employee_id == null ? null : String(row.project_manager_employee_id),
    startDate: date(row.start_date)!, endDate: date(row.end_date),
    budgetAmount: row.budget_amount == null ? null : Number(row.budget_amount),
    currencyCode: row.currency_code, isBillable: row.is_billable === true || Number(row.is_billable) === 1,
    projectStatus: row.project_status, createdByUserId: row.created_by_user_id == null ? null : String(row.created_by_user_id),
    createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at)
  };
}

async function validateReferences(companyId: string, input: Partial<CreateProjectInput>): Promise<void> {
  let departmentBranchId: string | null = null;
  if (input.departmentId) {
    const department = await findActiveDepartment(companyId, input.departmentId);
    if (!department) throw new AppError({ message: "Selected department is inactive or belongs to another company", statusCode: 422, code: "INVALID_PROJECT_DEPARTMENT" });
    departmentBranchId = department.branch_id == null ? null : String(department.branch_id);
  }
  if (input.branchId && !(await findActiveBranch(companyId, input.branchId))) {
    throw new AppError({ message: "Selected branch is inactive or belongs to another company", statusCode: 422, code: "INVALID_PROJECT_BRANCH" });
  }
  if (input.branchId && departmentBranchId && input.branchId !== departmentBranchId) {
    throw new AppError({ message: "Selected department belongs to another branch", statusCode: 422, code: "PROJECT_DEPARTMENT_BRANCH_MISMATCH" });
  }
  if (input.projectManagerEmployeeId && !(await findActiveProjectManager(
    companyId,
    input.projectManagerEmployeeId,
    input.branchId ?? null,
    input.departmentId ?? null
  ))) {
    throw new AppError({ message: "Project manager must be an active employee with a managerial designation in the selected branch and department", statusCode: 422, code: "INVALID_PROJECT_MANAGER" });
  }
}

export async function listProjects(query: ProjectListQuery, auth: AuthContext): Promise<ProjectResponse[]> {
  const companyId = requiredCompany(auth);
  return (await listProjectRows(companyId, query)).map(map);
}

export async function getProject(projectId: string, auth: AuthContext): Promise<ProjectResponse> {
  const project = await findProjectRow(projectId, requiredCompany(auth));
  if (!project) throw new AppError({ message: "Project was not found", statusCode: 404, code: "PROJECT_NOT_FOUND" });
  return map(project);
}

export async function createProject(input: CreateProjectInput, auth: AuthContext): Promise<ProjectResponse> {
  const companyId = requiredCompany(auth);
  if (input.companyId && input.companyId !== companyId) throw new AppError({ message: "You cannot create projects for another company", statusCode: 403, code: "PROJECT_ACCESS_DENIED" });
  await validateReferences(companyId, input);
  try {
    return map(await createProjectRow(input, companyId, auth.userId));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      throw new AppError({ message: "Project code is already in use within this company", statusCode: 409, code: "PROJECT_CODE_EXISTS" });
    }
    throw error;
  }
}

export async function updateProject(projectId: string, input: UpdateProjectInput, auth: AuthContext): Promise<ProjectResponse> {
  const companyId = requiredCompany(auth);
  const current = await findProjectRow(projectId, companyId);
  if (!current) throw new AppError({ message: "Project was not found", statusCode: 404, code: "PROJECT_NOT_FOUND" });
  await validateReferences(companyId, {
    branchId: (input.branchId !== undefined ? input.branchId : current.branch_id) == null ? null : String(input.branchId !== undefined ? input.branchId : current.branch_id),
    departmentId: (input.departmentId !== undefined ? input.departmentId : current.department_id) == null ? null : String(input.departmentId !== undefined ? input.departmentId : current.department_id),
    projectManagerEmployeeId: (input.projectManagerEmployeeId !== undefined ? input.projectManagerEmployeeId : current.project_manager_employee_id) == null ? null : String(input.projectManagerEmployeeId !== undefined ? input.projectManagerEmployeeId : current.project_manager_employee_id)
  });
  const startDate = input.startDate ?? date(current.start_date)!;
  const endDate = input.endDate !== undefined ? input.endDate : date(current.end_date);
  if (endDate && endDate < startDate) throw new AppError({ message: "End date cannot be before start date", statusCode: 422, code: "INVALID_PROJECT_DATES" });
  const updated = await updateProjectRow(projectId, companyId, input);
  if (!updated) throw new AppError({ message: "Project was not found", statusCode: 404, code: "PROJECT_NOT_FOUND" });
  return map(updated);
}

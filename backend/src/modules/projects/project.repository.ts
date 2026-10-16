import { databasePool } from "../../database/pool.js";
import type { CreateProjectInput, ProjectListQuery, UpdateProjectInput } from "./project.schema.js";
import type { ProjectRow } from "./project.types.js";

const select = `project_id, company_id, branch_id, department_id, project_code, project_name,
  client_name, description, project_manager_employee_id, start_date, end_date, budget_amount,
  currency_code, is_billable, project_status, created_by_user_id, created_at, updated_at`;

export async function listProjectRows(companyId: string, query: ProjectListQuery): Promise<ProjectRow[]> {
  const conditions = ["company_id = ?"];
  const values: unknown[] = [companyId];
  if (query.departmentId) { conditions.push("department_id = ?"); values.push(query.departmentId); }
  if (query.branchId) { conditions.push("branch_id = ?"); values.push(query.branchId); }
  if (query.projectStatus) { conditions.push("project_status = ?"); values.push(query.projectStatus); }
  if (query.activeOnly === "true" || query.activeOnly === "1") conditions.push("project_status = 'ACTIVE'");
  if (query.search) {
    conditions.push("(project_name LIKE ? OR project_code LIKE ? OR client_name LIKE ?)");
    const term = `%${query.search}%`; values.push(term, term, term);
  }
  return await databasePool.query(
    `SELECT ${select} FROM projects WHERE ${conditions.join(" AND ")} ORDER BY project_name ASC, project_id DESC`,
    values
  ) as ProjectRow[];
}

export async function findProjectRow(projectId: string, companyId: string): Promise<ProjectRow | null> {
  const rows = await databasePool.query(`SELECT ${select} FROM projects WHERE project_id = ? AND company_id = ? LIMIT 1`, [projectId, companyId]);
  return (rows[0] as ProjectRow | undefined) ?? null;
}

export async function createProjectRow(input: CreateProjectInput, companyId: string, userId: string): Promise<ProjectRow> {
  const result = await databasePool.query(
    `INSERT INTO projects (company_id, branch_id, department_id, project_code, project_name, client_name, description,
      project_manager_employee_id, start_date, end_date, budget_amount, currency_code, is_billable, project_status, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, input.branchId ?? null, input.departmentId ?? null, input.projectCode, input.projectName,
      input.clientName ?? null, input.description ?? null, input.projectManagerEmployeeId ?? null,
      input.startDate, input.endDate ?? null, input.budgetAmount ?? null, input.currencyCode,
      input.isBillable ? 1 : 0, input.projectStatus, userId]
  );
  return (await findProjectRow(String(result.insertId), companyId))!;
}

export async function updateProjectRow(projectId: string, companyId: string, input: UpdateProjectInput): Promise<ProjectRow | null> {
  const fields: Record<string, keyof UpdateProjectInput> = {
    branch_id: "branchId", department_id: "departmentId", project_code: "projectCode", project_name: "projectName",
    client_name: "clientName", description: "description", project_manager_employee_id: "projectManagerEmployeeId",
    start_date: "startDate", end_date: "endDate", budget_amount: "budgetAmount", currency_code: "currencyCode",
    is_billable: "isBillable", project_status: "projectStatus"
  };
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [column, key] of Object.entries(fields)) {
    if (input[key] !== undefined) {
      assignments.push(`${column} = ?`);
      const value = input[key];
      values.push(key === "isBillable" ? (value ? 1 : 0) : value);
    }
  }
  values.push(projectId, companyId);
  await databasePool.query(`UPDATE projects SET ${assignments.join(", ")} WHERE project_id = ? AND company_id = ?`, values);
  return findProjectRow(projectId, companyId);
}

export async function findActiveDepartment(companyId: string, departmentId: string): Promise<{ branch_id: string | number | null } | null> {
  const rows = await databasePool.query(`SELECT branch_id FROM departments WHERE department_id = ? AND company_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`, [departmentId, companyId]);
  return (rows[0] as { branch_id: string | number | null } | undefined) ?? null;
}

export async function findActiveBranch(companyId: string, branchId: string): Promise<boolean> {
  const rows = await databasePool.query(`SELECT branch_id FROM branches WHERE branch_id = ? AND company_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`, [branchId, companyId]);
  return rows.length > 0;
}

export async function findActiveProjectManager(
  companyId: string,
  employeeId: string,
  branchId: string | null,
  departmentId: string | null
): Promise<boolean> {
  const scopeConditions: string[] = [];
  const values: unknown[] = [employeeId, companyId];
  if (branchId) {
    scopeConditions.push("ea.branch_id = ?");
    values.push(branchId);
  }
  if (departmentId) {
    scopeConditions.push("ea.department_id = ?");
    values.push(departmentId);
  }
  const rows = await databasePool.query(
    `SELECT e.employee_id
     FROM employees e
     INNER JOIN employee_assignments ea
       ON ea.employee_id = e.employee_id
      AND ea.is_current = 1
     INNER JOIN designations d
       ON d.designation_id = ea.designation_id
      AND d.company_id = e.company_id
      AND d.is_managerial = 1
      AND d.is_active = 1
      AND d.deleted_at IS NULL
     WHERE e.employee_id = ?
       AND e.company_id = ?
       AND e.is_active = 1
       AND e.deleted_at IS NULL
       ${scopeConditions.length ? `AND ${scopeConditions.join(" AND ")}` : ""}
     LIMIT 1`,
    values
  );
  return rows.length > 0;
}

export async function findActiveProjectForAssignment(projectId: string, companyId: string, departmentId: string | null): Promise<boolean> {
  if (!departmentId) return false;
  const rows = await databasePool.query(
    `SELECT project_id FROM projects WHERE project_id = ? AND company_id = ? AND department_id = ? AND project_status = 'ACTIVE' LIMIT 1`,
    [projectId, companyId, departmentId]
  );
  return rows.length > 0;
}

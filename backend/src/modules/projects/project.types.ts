export type DatabaseId = string | number | bigint;

export type ProjectStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export interface ProjectRow {
  project_id: DatabaseId;
  company_id: DatabaseId;
  branch_id: DatabaseId | null;
  department_id: DatabaseId | null;
  project_code: string;
  project_name: string;
  client_name: string | null;
  description: string | null;
  project_manager_employee_id: DatabaseId | null;
  start_date: Date | string;
  end_date: Date | string | null;
  budget_amount: string | number | null;
  currency_code: string;
  is_billable: number | boolean;
  project_status: ProjectStatus;
  created_by_user_id: DatabaseId | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ProjectResponse {
  projectId: string;
  companyId: string;
  branchId: string | null;
  departmentId: string | null;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  description: string | null;
  projectManagerEmployeeId: string | null;
  startDate: string;
  endDate: string | null;
  budgetAmount: number | null;
  currencyCode: string;
  isBillable: boolean;
  projectStatus: ProjectStatus;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

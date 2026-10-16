export const PROJECT_STATUSES = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
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

export interface ProjectInput {
  companyId?: string;
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
}

// edited by wali: Keep designation domain types in the Designations feature.
export interface Designation {
  designationId: string;
  companyId: string;
  designationCode: string;
  designationName: string;
  grade: string | null;
  jobLevel: number | null;
  description: string | null;
  minimumSalary: number | null;
  maximumSalary: number | null;
  isManagerial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface DesignationInput {
  companyId?: string;
  designationCode: string;
  designationName: string;
  grade?: string | null;
  jobLevel?: number | null;
  description?: string | null;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  isManagerial: boolean;
  isActive: boolean;
}
export interface DesignationListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  sortOrder: "ASC" | "DESC";
  grade?: string;
  jobLevel?: number;
  isManagerial?: boolean;
  isActive?: boolean;
  sortBy: "designation_code" | "designation_name" | "grade" | "job_level" | "minimum_salary" | "maximum_salary" | "created_at" | "updated_at";
}
export interface DesignationListResult {
  designations: Designation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

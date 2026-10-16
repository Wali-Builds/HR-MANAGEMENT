export type DatabaseId =
  | string
  | number
  | bigint;

export interface DesignationDatabaseRow {
  designation_id: DatabaseId;
  company_id: DatabaseId;

  designation_code: string;
  designation_name: string;
  grade: string | null;
  job_level: string | number | null;
  description: string | null;

  minimum_salary:
    | string
    | number
    | null;

  maximum_salary:
    | string
    | number
    | null;

  is_managerial: number | boolean;
  is_active: number | boolean;

  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DesignationResponse {
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

export interface DesignationListOptions {
  page: number;
  limit: number;

  companyId: string | null;

  search?: string;
  grade?: string;
  jobLevel?: number;
  isManagerial?: boolean;
  isActive?: boolean;

  sortBy:
    | "designation_code"
    | "designation_name"
    | "grade"
    | "job_level"
    | "minimum_salary"
    | "maximum_salary"
    | "created_at"
    | "updated_at";

  sortOrder: "ASC" | "DESC";
}

export interface DesignationListResult {
  designations:
    DesignationDatabaseRow[];

  total: number;
}

export interface DesignationActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
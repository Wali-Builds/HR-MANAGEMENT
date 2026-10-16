export type DatabaseId =
  | string
  | number
  | bigint;

export interface RoleDatabaseRow {
  role_id: DatabaseId;
  // edited by wali: Keep tenant ownership available to role authorization.
  company_id: DatabaseId | null;
  role_code: string;
  role_name: string;
  description: string | null;

  is_system_role: number | boolean;
  is_active: number | boolean;

  created_at: Date | string;
  updated_at: Date | string;

  permission_count:
    | string
    | number
    | bigint;
}

export interface PermissionDatabaseRow {
  permission_id: DatabaseId;
  permission_code: string;
  module_name: string;
  action_name: string;
  description: string | null;
  created_at: Date | string;
}

export interface RolePermissionDatabaseRow {
  role_id: DatabaseId;
  permission_id: DatabaseId;

  permission_code: string;
  module_name: string;
  action_name: string;
  description: string | null;

  created_at: Date | string;
}

export interface PermissionResponse {
  permissionId: string;
  permissionCode: string;
  moduleName: string;
  actionName: string;
  description: string | null;
  createdAt: string;
}

export interface RoleResponse {
  roleId: string;
  companyId: string | null;
  roleCode: string;
  roleName: string;
  description: string | null;

  isSystemRole: boolean;
  isActive: boolean;

  permissionCount: number;
  permissions: PermissionResponse[];

  createdAt: string;
  updatedAt: string;
}

export interface RoleListOptions {
  page: number;
  limit: number;
  companyId: string | null;

  search?: string;
  permissionCode?: string;
  moduleName?: string;

  isSystemRole?: boolean;
  isActive?: boolean;

  sortBy:
    | "role_code"
    | "role_name"
    | "created_at"
    | "updated_at";

  sortOrder:
    | "ASC"
    | "DESC";
}

export interface RoleListResult {
  roles: RoleDatabaseRow[];
  total: number;
}

export interface PermissionListOptions {
  page: number;
  limit: number;
  allowedPermissionCodes?: string[];

  search?: string;
  moduleName?: string;
  actionName?: string;

  sortBy:
    | "permission_code"
    | "module_name"
    | "action_name"
    | "created_at";

  sortOrder:
    | "ASC"
    | "DESC";
}

export interface PermissionListResult {
  permissions:
    PermissionDatabaseRow[];

  total: number;
}

export interface CreateRoleRecord {
  // edited by wali: Persist company-created roles inside the creator tenant.
  companyId: string | null;
  roleCode: string;
  roleName: string;
  description: string | null;
  isActive: boolean;
  permissionCodes: string[];
}

export interface UpdateRoleRecord {
  roleCode?: string;
  roleName?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface RoleActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

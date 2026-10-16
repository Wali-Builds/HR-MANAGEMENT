// edited by wali: Define response and input types for role administration.
export interface RolePermission {
  permissionId: string;
  permissionCode: string;
  moduleName: string;
  actionName: string;
  description: string | null;
  createdAt: string;
}
export interface RoleRecord {
  roleId: string;
  // edited by wali: Distinguish global roles from tenant-owned roles in API responses.
  companyId: string | null;
  roleCode: string;
  roleName: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCount: number;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}
export interface RoleListData {
  roles: RoleRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export interface PermissionListData {
  permissions: RolePermission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export interface RoleInput {
  roleCode: string;
  roleName: string;
  description: string | null;
  isActive: boolean;
  permissionCodes: string[];
}

// edited by wali: Use the existing role and permission backend routes.
import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { PermissionListData, RoleInput, RoleListData, RoleRecord } from "../types/role.types";

export const roleKeys = {
  all: ["role-admin"] as const,
  roles: () => [...roleKeys.all, "roles"] as const,
  permissions: () => [...roleKeys.all, "permissions"] as const,
};

export async function listRolesRequest(): Promise<RoleListData> {
  const response = await apiClient.get<ApiSuccessResponse<RoleListData>>("/roles", {
    params: { page: 1, limit: 100, sortBy: "role_name", sortOrder: "ASC" },
  });
  return response.data.data;
}
export async function listPermissionsRequest(): Promise<PermissionListData> {
  const response = await apiClient.get<ApiSuccessResponse<PermissionListData>>("/roles/permissions", {
    params: { page: 1, limit: 500, sortBy: "module_name", sortOrder: "ASC" },
  });
  return response.data.data;
}
export async function createRoleRequest(input: RoleInput): Promise<RoleRecord> {
  const response = await apiClient.post<ApiSuccessResponse<{ role: RoleRecord }>>("/roles", input);
  return response.data.data.role;
}
export async function updateRoleRequest(
  roleId: string,
  input: Partial<Pick<RoleInput, "roleCode" | "roleName" | "description" | "isActive">>,
): Promise<RoleRecord> {
  const response = await apiClient.patch<ApiSuccessResponse<{ role: RoleRecord }>>(`/roles/${roleId}`, input);
  return response.data.data.role;
}
export async function replaceRolePermissionsRequest(roleId: string, permissionCodes: string[]): Promise<void> {
  await apiClient.put(`/roles/${roleId}/permissions`, { permissionCodes });
}
// edited by wali: DELETE permanently removes only roles with no user assignments.
export async function deleteRoleRequest(roleId: string): Promise<void> {
  await apiClient.delete(`/roles/${roleId}`);
}

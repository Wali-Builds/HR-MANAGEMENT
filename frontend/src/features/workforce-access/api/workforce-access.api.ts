import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";

import type {
  AccessListParams,
  AccessListResult,
  AccessLookups,
  AccessRoleInput,
  AccessUser,
  CreateAccessUserInput,
  ResetAccessPasswordInput,
  UpdateAccessUserInput
} from "../types/workforce-access.types";

export async function listAccessUsersRequest(
  params: AccessListParams
): Promise<AccessListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<AccessListResult>
  >("/users", { params });

  return response.data.data;
}

export async function getAccessLookupsRequest(
  companyId?: string
): Promise<AccessLookups> {
  const response = await apiClient.get<
    ApiSuccessResponse<AccessLookups>
  >("/users/lookups", {
    params: {
      includeEmployeesWithoutAccounts: true,
      ...(companyId ? { companyId } : {})
    }
  });

  return response.data.data;
}

export async function createAccessUserRequest(
  input: CreateAccessUserInput
): Promise<AccessUser> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ user: AccessUser }>
  >("/users", input);

  return response.data.data.user;
}

export async function updateAccessUserRequest(
  userId: string,
  input: UpdateAccessUserInput
): Promise<AccessUser> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ user: AccessUser }>
  >(`/users/${userId}`, input);

  return response.data.data.user;
}

export async function replaceAccessRolesRequest(
  userId: string,
  roles: AccessRoleInput[]
): Promise<AccessUser> {
  const response = await apiClient.put<
    ApiSuccessResponse<{ user: AccessUser }>
  >(`/users/${userId}/roles`, { roles });

  return response.data.data.user;
}

export async function resetAccessPasswordRequest(
  userId: string,
  input: ResetAccessPasswordInput
): Promise<void> {
  await apiClient.post(`/users/${userId}/reset-password`, input);
}

export async function removeAccessUserRequest(
  userId: string
): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import {
  createAccessUserRequest,
  getAccessLookupsRequest,
  listAccessUsersRequest,
  removeAccessUserRequest,
  replaceAccessRolesRequest,
  resetAccessPasswordRequest,
  updateAccessUserRequest
} from "../api/workforce-access.api";

import type {
  AccessListParams,
  AccessRoleInput,
  CreateAccessUserInput,
  ResetAccessPasswordInput,
  UpdateAccessUserInput
} from "../types/workforce-access.types";

export const accessQueryKeys = {
  all: ["workforce-access"] as const,
  lists: () => [...accessQueryKeys.all, "list"] as const,
  list: (params: AccessListParams) =>
    [...accessQueryKeys.lists(), params] as const,
  lookups: (companyId?: string) =>
    [...accessQueryKeys.all, "lookups", companyId ?? "current"] as const
};

export function useAccessUsers(
  params: AccessListParams,
  enabled = true
) {
  return useQuery({
    queryKey: accessQueryKeys.list(params),
    queryFn: () => listAccessUsersRequest(params),
    placeholderData: keepPreviousData,
    enabled
  });
}

export function useAccessLookups(companyId?: string) {
  return useQuery({
    queryKey: accessQueryKeys.lookups(companyId),
    queryFn: () => getAccessLookupsRequest(companyId),
    enabled: Boolean(companyId),
    staleTime: 120000
  });
}

function useInvalidateAccess() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: accessQueryKeys.lists()
      }),
      queryClient.invalidateQueries({
        queryKey: accessQueryKeys.all
      })
    ]);
  };
}

export function useCreateAccessUser() {
  const invalidate = useInvalidateAccess();

  return useMutation({
    mutationFn: (input: CreateAccessUserInput) =>
      createAccessUserRequest(input),
    onSuccess: invalidate
  });
}

export function useUpdateAccessUser() {
  const invalidate = useInvalidateAccess();

  return useMutation({
    mutationFn: ({
      userId,
      input
    }: {
      userId: string;
      input: UpdateAccessUserInput;
    }) => updateAccessUserRequest(userId, input),
    onSuccess: invalidate
  });
}

export function useReplaceAccessRoles() {
  const invalidate = useInvalidateAccess();

  return useMutation({
    mutationFn: ({
      userId,
      roles
    }: {
      userId: string;
      roles: AccessRoleInput[];
    }) => replaceAccessRolesRequest(userId, roles),
    onSuccess: invalidate
  });
}

export function useResetAccessPassword() {
  return useMutation({
    mutationFn: ({
      userId,
      input
    }: {
      userId: string;
      input: ResetAccessPasswordInput;
    }) => resetAccessPasswordRequest(userId, input)
  });
}

export function useRemoveAccessUser() {
  const invalidate = useInvalidateAccess();

  return useMutation({
    mutationFn: removeAccessUserRequest,
    onSuccess: invalidate
  });
}

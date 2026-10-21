import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveEmployeeRequest,
  createEmployeeRequest,
  getEmployeeLookupsRequest,
  getEmployeeRequest,
  listBranchReferencesRequest,
  listDepartmentReferencesRequest,
  listDesignationReferencesRequest,
  listEmployeesRequest,
  listPositionReferencesRequest,
  updateEmployeeRequest,
} from "../api/employee.api";
import { useAuthStore } from "../../../app/store/auth.store";
import type {
  EmployeeListParams,
  EmployeeMutationInput,
} from "../types/employee.types";

export const employeeQueryKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeQueryKeys.all, "list"] as const,
  list: (params: EmployeeListParams) =>
    [...employeeQueryKeys.lists(), params] as const,
  details: () => [...employeeQueryKeys.all, "detail"] as const,
  detail: (employeeId: string) =>
    [...employeeQueryKeys.details(), employeeId] as const,
  lookups: () => [...employeeQueryKeys.all, "lookups"] as const,
  references: (companyId?: string) =>
    [...employeeQueryKeys.all, "references", companyId ?? "current"] as const,
};

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: employeeQueryKeys.list(params),
    queryFn: () => listEmployeesRequest(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(employeeId: string | null) {
  return useQuery({
    queryKey: employeeQueryKeys.detail(employeeId ?? ""),
    queryFn: () => getEmployeeRequest(employeeId ?? ""),
    enabled: Boolean(employeeId),
  });
}

export function useEmployeeLookups() {
  return useQuery({
    queryKey: employeeQueryKeys.lookups(),
    queryFn: getEmployeeLookupsRequest,
    staleTime: 10 * 60 * 1000,
  });
}

export function useEmployeeReferenceData(
  companyId: string | undefined,
  enabled = true,
) {
  const sessionScope = useAuthStore(
    (state) => state.user?.sessionId ?? "anonymous",
  );

  const branchQuery = useQuery({
    // edited by wali: Prevent directory references fetched by another signed-in account from being reused.
    queryKey: [...employeeQueryKeys.references(companyId), sessionScope, "branches"],
    queryFn: () => listBranchReferencesRequest(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const departmentQuery = useQuery({
    queryKey: [...employeeQueryKeys.references(companyId), sessionScope, "departments"],
    queryFn: () => listDepartmentReferencesRequest(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const designationQuery = useQuery({
    queryKey: [...employeeQueryKeys.references(companyId), sessionScope, "designations"],
    queryFn: () => listDesignationReferencesRequest(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const positionQuery = useQuery({
    queryKey: [...employeeQueryKeys.references(companyId), sessionScope, "positions"],
    queryFn: () => listPositionReferencesRequest(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const managerQuery = useQuery({
    queryKey: [...employeeQueryKeys.references(companyId), sessionScope, "managers"],
    queryFn: () =>
      listEmployeesRequest({
        page: 1,
        limit: 100,
        sortBy: "first_name",
        sortOrder: "ASC",
        isActive: true,
        ...(companyId ? { companyId } : {}),
      }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    branches: branchQuery.data ?? [],
    departments: departmentQuery.data ?? [],
    designations: designationQuery.data ?? [],
    positions: positionQuery.data ?? [],
    // edited by wali: Only employees assigned to a managerial designation can be selected as reporting managers.
    managers: (managerQuery.data?.employees ?? []).filter((employee) => {
      const designationId = employee.assignment.designationId;
      return Boolean(
        designationId &&
          designationQuery.data?.some(
            (designation) =>
              designation.designationId === designationId &&
              designation.isManagerial,
          ),
      );
    }),
    isLoading:
      branchQuery.isLoading ||
      departmentQuery.isLoading ||
      designationQuery.isLoading ||
      positionQuery.isLoading ||
      managerQuery.isLoading,
    isFetching:
      branchQuery.isFetching ||
      departmentQuery.isFetching ||
      designationQuery.isFetching ||
      positionQuery.isFetching ||
      managerQuery.isFetching,
    isError:
      branchQuery.isError ||
      departmentQuery.isError ||
      designationQuery.isError ||
      positionQuery.isError ||
      managerQuery.isError,
    refetch: async () => {
      await Promise.all([
        branchQuery.refetch(),
        departmentQuery.refetch(),
        designationQuery.refetch(),
        positionQuery.refetch(),
        managerQuery.refetch(),
      ]);
    },
  };
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployeeRequest,
    onSuccess: async (employee) => {
      queryClient.setQueryData(
        employeeQueryKeys.detail(employee.employeeId),
        employee,
      );
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKeys.lists(),
      });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      input,
    }: {
      employeeId: string;
      input: Partial<EmployeeMutationInput>;
    }) => updateEmployeeRequest(employeeId, input),
    onSuccess: async (employee) => {
      queryClient.setQueryData(
        employeeQueryKeys.detail(employee.employeeId),
        employee,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: employeeQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: employeeQueryKeys.references(employee.companyId),
        }),
      ]);
    },
  });
}

export function useArchiveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveEmployeeRequest,
    onSuccess: async (_data, employeeId) => {
      queryClient.removeQueries({
        queryKey: employeeQueryKeys.detail(employeeId),
      });
      await queryClient.invalidateQueries({
        queryKey: employeeQueryKeys.lists(),
      });
    },
  });
}

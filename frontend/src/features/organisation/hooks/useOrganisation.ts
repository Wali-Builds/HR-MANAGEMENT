import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archiveDepartmentRequest, createDepartmentRequest, listDepartmentsRequest, updateDepartmentRequest } from "../api/organisation.api";
import { listDesignationsRequest } from "../../designations/api/designation.api";
import { listPositionsRequest } from "../../positions/api/position.api";
import { listBranchesRequest } from "../../branches/api/branch.api";
import { branchQueryKeys } from "../../branches/hooks/useBranches";
import type { BranchListParams } from "../../branches/types/branch.types";
import type { DepartmentInput, DepartmentListParams } from "../types/organisation.types";

export const organisationQueryKeys = {
  all: ["organisation"] as const,
  departments: (params?: DepartmentListParams) =>
    [...organisationQueryKeys.all, "departments", params] as const,
};

export function useDepartments(params: DepartmentListParams) {
  return useQuery({
    queryKey: organisationQueryKeys.departments(params),
    queryFn: () => listDepartmentsRequest(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrganisationCounts(
  companyId?: string,
  enabled = true,
  visible: { branches: boolean; departments: boolean; designations: boolean; positions: boolean } = {
    branches: true,
    departments: true,
    designations: true,
    positions: true,
  },
) {
  return useQuery({
    queryKey: [...organisationQueryKeys.all, "counts", companyId ?? "none", visible],
    queryFn: async () => {
      const common = {
        page: 1,
        limit: 1,
        sortOrder: "ASC" as const,
        ...(companyId ? { companyId } : {}),
      };
      // edited by wali: Keep each structure count available when another list endpoint fails.
      const [branches, departments, designations, positions] = await Promise.allSettled([
        visible.branches
          ? listBranchesRequest({ ...common, sortBy: "branch_name" })
          : Promise.resolve(null),
        visible.departments
          ? listDepartmentsRequest({ ...common, sortBy: "department_name" })
          : Promise.resolve(null),
        visible.designations
          ? listDesignationsRequest({ ...common, sortBy: "designation_name" })
          : Promise.resolve(null),
        visible.positions
          ? listPositionsRequest({ ...common, sortBy: "position_title" })
          : Promise.resolve(null),
      ]);
      const total = (result: PromiseSettledResult<{ pagination: { total: number } } | null>) =>
        result.status === "fulfilled" ? result.value?.pagination.total ?? 0 : 0;
      return {
        branches: total(branches),
        departments: total(departments),
        designations: total(designations),
        positions: total(positions),
      };
    },
    enabled,
  });
}

// edited by wali: Load branch options through the standalone Branches feature for dependent forms.
export function useOrganisationReferences(companyId?: string, enabled = true) {
  const common = {
    page: 1,
    limit: 100,
    sortOrder: "ASC" as const,
    ...(companyId ? { companyId } : {}),
  };
  const branchParams: BranchListParams = {
    ...common,
    isActive: true,
    sortBy: "branch_name",
  };
  const branches = useQuery({
    queryKey: branchQueryKeys.list(branchParams),
    queryFn: () => listBranchesRequest(branchParams),
    enabled,
  });
  const departmentParams: DepartmentListParams = { ...common, isActive: true, sortBy: "department_name" };
  const departments = useQuery({
    queryKey: organisationQueryKeys.departments(departmentParams),
    queryFn: () => listDepartmentsRequest(departmentParams),
    enabled,
  });
  const designationParams = { ...common, isActive: true, sortBy: "designation_name" as const };
  const designations = useQuery({
    queryKey: ["organisation", "designations", designationParams],
    queryFn: () => listDesignationsRequest(designationParams),
    enabled,
  });
  const positionParams = { ...common, positionStatus: "ACTIVE" as const, sortBy: "position_title" as const };
  const positions = useQuery({
    queryKey: ["organisation", "positions", positionParams],
    queryFn: () => listPositionsRequest(positionParams),
    enabled,
  });
  return {
    branches: branches.data?.branches ?? [],
    departments: departments.data?.departments ?? [],
    designations: designations.data?.designations ?? [],
    positions: positions.data?.positions ?? [],
    isLoading: branches.isLoading || departments.isLoading || designations.isLoading || positions.isLoading,
  };
}

function useInvalidateOrganisation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all });
  };
}

export function useCreateDepartment() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: createDepartmentRequest, onSuccess: invalidate });
}

export function useUpdateDepartment() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({
    mutationFn: ({ departmentId, input }: { departmentId: string; input: Partial<DepartmentInput> }) =>
      updateDepartmentRequest(departmentId, input),
    onSuccess: invalidate,
  });
}

export function useArchiveDepartment() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: archiveDepartmentRequest, onSuccess: invalidate });
}

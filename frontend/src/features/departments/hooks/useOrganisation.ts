import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveBranchRequest,
  archiveDepartmentRequest,
  archiveDesignationRequest,
  closePositionRequest,
  createBranchRequest,
  createDepartmentRequest,
  createDesignationRequest,
  createPositionRequest,
  listBranchesRequest,
  listDepartmentsRequest,
  listDesignationsRequest,
  listPositionsRequest,
  updateBranchRequest,
  updateDepartmentRequest,
  updateDesignationRequest,
  updatePositionRequest,
} from "../api/organisation.api";
import type {
  BranchInput,
  BranchListParams,
  DepartmentInput,
  DepartmentListParams,
  DesignationInput,
  DesignationListParams,
  PositionInput,
  PositionListParams,
} from "../types/organisation.types";

export const organisationQueryKeys = {
  all: ["organisation"] as const,
  branches: (params?: BranchListParams) =>
    [...organisationQueryKeys.all, "branches", params] as const,
  departments: (params?: DepartmentListParams) =>
    [...organisationQueryKeys.all, "departments", params] as const,
  designations: (params?: DesignationListParams) =>
    [...organisationQueryKeys.all, "designations", params] as const,
  positions: (params?: PositionListParams) =>
    [...organisationQueryKeys.all, "positions", params] as const,
};

export function useBranches(params: BranchListParams) {
  return useQuery({
    queryKey: organisationQueryKeys.branches(params),
    queryFn: () => listBranchesRequest(params),
    placeholderData: keepPreviousData,
  });
}

export function useDepartments(params: DepartmentListParams) {
  return useQuery({
    queryKey: organisationQueryKeys.departments(params),
    queryFn: () => listDepartmentsRequest(params),
    placeholderData: keepPreviousData,
  });
}

export function useDesignations(params: DesignationListParams, enabled = true) {
  return useQuery({
    queryKey: organisationQueryKeys.designations(params),
    queryFn: () => listDesignationsRequest(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePositions(params: PositionListParams, enabled = true) {
  return useQuery({
    queryKey: organisationQueryKeys.positions(params),
    queryFn: () => listPositionsRequest(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}


export function useOrganisationCounts(
  companyId?: string,
  enabled = true,
  visible: {
    branches: boolean;
    departments: boolean;
    designations: boolean;
    positions: boolean;
  } = {
    branches: true,
    departments: true,
    designations: true,
    positions: true,
  },
) {
  return useQuery({
    queryKey: [
      ...organisationQueryKeys.all,
      "counts",
      companyId ?? "none",
      visible,
    ],
    queryFn: async () => {
      const common = {
        page: 1,
        limit: 1,
        sortOrder: "ASC" as const,
        ...(companyId ? { companyId } : {}),
      };

      const [branches, departments, designations, positions] = await Promise.all([
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

      return {
        branches: branches?.pagination.total ?? 0,
        departments: departments?.pagination.total ?? 0,
        designations: designations?.pagination.total ?? 0,
        positions: positions?.pagination.total ?? 0,
      };
    },
    enabled,
  });
}

export function useOrganisationReferences(companyId?: string, enabled = true) {
  const common = {
    page: 1,
    limit: 100,
    sortOrder: "ASC" as const,
    ...(companyId ? { companyId } : {}),
  };

  const branches = useQuery({
    queryKey: organisationQueryKeys.branches({
      ...common,
      isActive: true,
      sortBy: "branch_name",
    }),
    queryFn: () =>
      listBranchesRequest({
        ...common,
        isActive: true,
        sortBy: "branch_name",
      }),
    enabled,
  });

  const departments = useQuery({
    queryKey: organisationQueryKeys.departments({
      ...common,
      isActive: true,
      sortBy: "department_name",
    }),
    queryFn: () =>
      listDepartmentsRequest({
        ...common,
        isActive: true,
        sortBy: "department_name",
      }),
    enabled,
  });

  const designations = useQuery({
    queryKey: organisationQueryKeys.designations({
      ...common,
      isActive: true,
      sortBy: "designation_name",
    }),
    queryFn: () =>
      listDesignationsRequest({
        ...common,
        isActive: true,
        sortBy: "designation_name",
      }),
    enabled,
  });

  const positions = useQuery({
    queryKey: organisationQueryKeys.positions({
      ...common,
      positionStatus: "ACTIVE",
      sortBy: "position_title",
    }),
    queryFn: () =>
      listPositionsRequest({
        ...common,
        positionStatus: "ACTIVE",
        sortBy: "position_title",
      }),
    enabled,
  });

  return {
    branches: branches.data?.branches ?? [],
    departments: departments.data?.departments ?? [],
    designations: designations.data?.designations ?? [],
    positions: positions.data?.positions ?? [],
    isLoading:
      branches.isLoading ||
      departments.isLoading ||
      designations.isLoading ||
      positions.isLoading,
  };
}

function useInvalidateOrganisation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all });
  };
}

export function useCreateBranch() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: createBranchRequest, onSuccess: invalidate });
}

export function useUpdateBranch() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: Partial<BranchInput> }) =>
      updateBranchRequest(branchId, input),
    onSuccess: invalidate,
  });
}

export function useArchiveBranch() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: archiveBranchRequest, onSuccess: invalidate });
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

export function useCreateDesignation() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: createDesignationRequest, onSuccess: invalidate });
}

export function useUpdateDesignation() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({
    mutationFn: ({ designationId, input }: { designationId: string; input: Partial<DesignationInput> }) =>
      updateDesignationRequest(designationId, input),
    onSuccess: invalidate,
  });
}

export function useArchiveDesignation() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: archiveDesignationRequest, onSuccess: invalidate });
}

export function useCreatePosition() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: createPositionRequest, onSuccess: invalidate });
}

export function useUpdatePosition() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({
    mutationFn: ({ positionId, input }: { positionId: string; input: Partial<PositionInput> }) =>
      updatePositionRequest(positionId, input),
    onSuccess: invalidate,
  });
}

export function useClosePosition() {
  const invalidate = useInvalidateOrganisation();
  return useMutation({ mutationFn: closePositionRequest, onSuccess: invalidate });
}

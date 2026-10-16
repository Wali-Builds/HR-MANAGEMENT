// edited by wali: Keep branch queries and mutations inside the Branches feature.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archiveBranchRequest, createBranchRequest, listBranchesRequest, updateBranchRequest } from "../api/branch.api";
import type { BranchInput, BranchListParams } from "../types/branch.types";

export const branchQueryKeys = {
  all: ["branches"] as const,
  list: (params?: BranchListParams) => [...branchQueryKeys.all, "list", params] as const,
};

export function useBranches(params: BranchListParams) {
  return useQuery({
    queryKey: branchQueryKeys.list(params),
    queryFn: () => listBranchesRequest(params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateBranches() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: branchQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["organisation"] }),
    ]);
  };
}

export function useCreateBranch() {
  const invalidate = useInvalidateBranches();
  return useMutation({ mutationFn: createBranchRequest, onSuccess: invalidate });
}

export function useUpdateBranch() {
  const invalidate = useInvalidateBranches();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: Partial<BranchInput> }) => updateBranchRequest(branchId, input),
    onSuccess: invalidate,
  });
}

export function useArchiveBranch() {
  const invalidate = useInvalidateBranches();
  return useMutation({ mutationFn: archiveBranchRequest, onSuccess: invalidate });
}

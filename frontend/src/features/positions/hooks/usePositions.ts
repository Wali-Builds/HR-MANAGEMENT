import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { closePositionRequest, createPositionRequest, listAllPositionsRequest, listPositionsRequest, updatePositionRequest } from "../api/position.api";
import type { PositionInput, PositionListParams } from "../types/position.types";

// edited by wali: Keep position query and mutation hooks in the Positions feature.
export const positionQueryKeys = {
  all: ["organisation", "positions"] as const,
  list: (params?: PositionListParams) => [...positionQueryKeys.all, params] as const,
};
export function usePositions(params: PositionListParams, enabled = true) {
  return useQuery({ queryKey: positionQueryKeys.list(params), queryFn: () => listPositionsRequest(params), placeholderData: keepPreviousData, enabled });
}

// edited by wali: Keep the full list available for designation uniqueness checks.
export function useAllPositions(companyId?: string, enabled = true) {
  const params = {
    sortBy: "position_title" as const,
    sortOrder: "ASC" as const,
    ...(companyId ? { companyId } : {}),
  };
  return useQuery({
    queryKey: [...positionQueryKeys.all, "all", companyId ?? "none"],
    queryFn: () => listAllPositionsRequest(params),
    enabled,
  });
}

function useInvalidatePositions() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["organisation"] });
}
export function useCreatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({ mutationFn: createPositionRequest, onSuccess: invalidate });
}
export function useUpdatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: ({ positionId, input }: { positionId: string; input: Partial<PositionInput> }) => updatePositionRequest(positionId, input),
    onSuccess: invalidate,
  });
}
export function useClosePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({ mutationFn: closePositionRequest, onSuccess: invalidate });
}

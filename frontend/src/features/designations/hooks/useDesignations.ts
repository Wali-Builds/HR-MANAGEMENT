import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveDesignationRequest, createDesignationRequest, listDesignationsRequest, updateDesignationRequest } from "../api/designation.api";
import type { DesignationInput, DesignationListParams } from "../types/designation.types";

// edited by wali: Keep designation query and mutation hooks in the Designations feature.
export const designationQueryKeys = {
  all: ["organisation", "designations"] as const,
  list: (params?: DesignationListParams) => [...designationQueryKeys.all, params] as const,
};
export function useDesignations(params: DesignationListParams) {
  return useQuery({ queryKey: designationQueryKeys.list(params), queryFn: () => listDesignationsRequest(params), placeholderData: keepPreviousData });
}
function useInvalidateDesignations() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["organisation"] });
}
export function useCreateDesignation() {
  const invalidate = useInvalidateDesignations();
  return useMutation({ mutationFn: createDesignationRequest, onSuccess: invalidate });
}
export function useUpdateDesignation() {
  const invalidate = useInvalidateDesignations();
  return useMutation({
    mutationFn: ({ designationId, input }: { designationId: string; input: Partial<DesignationInput> }) => updateDesignationRequest(designationId, input),
    onSuccess: invalidate,
  });
}
export function useArchiveDesignation() {
  const invalidate = useInvalidateDesignations();
  return useMutation({ mutationFn: archiveDesignationRequest, onSuccess: invalidate });
}

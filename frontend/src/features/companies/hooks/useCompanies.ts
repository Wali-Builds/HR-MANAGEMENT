import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createCompanyRequest,
  deleteCompanyRequest,
  getCurrentCompanyIdentityRequest,
  getCompanyRequest,
  listCompaniesRequest,
  updateCompanyRequest,
} from "../api/company.api";
import type {
  CompanyListParams,
  CompanyMutationInput,
} from "../types/company.types";

export const companyQueryKeys = {
  all: ["companies"] as const,
  lists: () => [...companyQueryKeys.all, "list"] as const,
  list: (params: CompanyListParams) =>
    [...companyQueryKeys.lists(), params] as const,
  details: () => [...companyQueryKeys.all, "detail"] as const,
  detail: (companyId: string) =>
    [...companyQueryKeys.details(), companyId] as const,
};

// edited by wali: Let admin-only count queries remain disabled for other users.
export function useCompanies(params: CompanyListParams, enabled = true) {
  return useQuery({
    queryKey: companyQueryKeys.list(params),
    queryFn: () => listCompaniesRequest(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCompany(companyId: string | null) {
  return useQuery({
    queryKey: companyQueryKeys.detail(companyId ?? ""),
    queryFn: () => getCompanyRequest(companyId ?? ""),
    enabled: Boolean(companyId),
  });
}

export function useCurrentCompanyIdentity(companyId: string | null) {
  return useQuery({
    queryKey: [...companyQueryKeys.all, "current-identity", companyId ?? "none"],
    queryFn: getCurrentCompanyIdentityRequest,
    enabled: Boolean(companyId),
    staleTime: 300_000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompanyRequest,
    onSuccess: async (company) => {
      queryClient.setQueryData(
        companyQueryKeys.detail(company.companyId),
        company,
      );
      await queryClient.invalidateQueries({
        queryKey: companyQueryKeys.lists(),
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      input,
    }: {
      companyId: string;
      input: Partial<CompanyMutationInput>;
    }) => updateCompanyRequest(companyId, input),
    onSuccess: async (company) => {
      queryClient.setQueryData(
        companyQueryKeys.detail(company.companyId),
        company,
      );
      await queryClient.invalidateQueries({
        queryKey: companyQueryKeys.lists(),
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompanyRequest,
    onSuccess: async (_data, companyId) => {
      queryClient.removeQueries({
        queryKey: companyQueryKeys.detail(companyId),
      });
      await queryClient.invalidateQueries({
        queryKey: companyQueryKeys.lists(),
      });
    },
  });
}

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  cancelCompanySubscriptionRequest,
  createCompanySubscriptionRequest,
  getCompanyFeaturesRequest,
  getCompanySubscriptionRequest,
  getCompanyUsageRequest,
  listCompanyAdministratorsRequest,
  listSubscriptionPlansRequest,
  selfServiceSubscribeCompanyRequest,
  provisionCompanyAdministratorRequest,
  updateCompanySubscriptionRequest,
} from "../api/company-subscription.api";
import type {
  CompanySubscriptionInput,
  ProvisionCompanyAdministratorInput,
  SelfServiceSubscribeInput,
} from "../types/company-subscription.types";

export const companySubscriptionQueryKeys = {
  root: ["company-subscriptions"] as const,
  plans: ["subscription-plans"] as const,
  subscription: (companyId: string) =>
    [...companySubscriptionQueryKeys.root, companyId, "subscription"] as const,
  usage: (companyId: string) =>
    [...companySubscriptionQueryKeys.root, companyId, "usage"] as const,
  features: (companyId: string) =>
    [...companySubscriptionQueryKeys.root, companyId, "features"] as const,
  administrators: (companyId: string) =>
    [...companySubscriptionQueryKeys.root, companyId, "administrators"] as const,
};

export function useSubscriptionPlans(enabled = true) {
  return useQuery({
    queryKey: companySubscriptionQueryKeys.plans,
    queryFn: listSubscriptionPlansRequest,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanySubscription(companyId: string) {
  return useQuery({
    queryKey: companySubscriptionQueryKeys.subscription(companyId),
    queryFn: () => getCompanySubscriptionRequest(companyId),
    // edited by wali: Skip the request until the signed-in account has a company ID.
    enabled: Boolean(companyId),
  });
}

export function useCompanyUsage(companyId: string) {
  return useQuery({
    queryKey: companySubscriptionQueryKeys.usage(companyId),
    queryFn: () => getCompanyUsageRequest(companyId),
  });
}

export function useCompanyFeatures(companyId: string) {
  return useQuery({
    queryKey: companySubscriptionQueryKeys.features(companyId),
    queryFn: () => getCompanyFeaturesRequest(companyId),
  });
}

export function useCompanyAdministrators(companyId: string) {
  return useQuery({
    queryKey: companySubscriptionQueryKeys.administrators(companyId),
    queryFn: () => listCompanyAdministratorsRequest(companyId),
  });
}

async function invalidateCompanyEntitlements(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: companySubscriptionQueryKeys.subscription(companyId),
    }),
    queryClient.invalidateQueries({
      queryKey: companySubscriptionQueryKeys.usage(companyId),
    }),
    queryClient.invalidateQueries({
      queryKey: companySubscriptionQueryKeys.features(companyId),
    }),
  ]);
}

export function useSaveCompanySubscription(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      exists,
    }: {
      input: CompanySubscriptionInput;
      exists: boolean;
    }) =>
      exists
        ? updateCompanySubscriptionRequest(companyId, input)
        : createCompanySubscriptionRequest(companyId, input),
    onSuccess: async (subscription) => {
      queryClient.setQueryData(
        companySubscriptionQueryKeys.subscription(companyId),
        subscription,
      );
      await invalidateCompanyEntitlements(queryClient, companyId);
    },
  });
}

// edited by wali: Refresh the current plan and entitlements after a company subscribes.
export function useSelfServiceSubscribeCompany(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SelfServiceSubscribeInput) =>
      selfServiceSubscribeCompanyRequest(companyId, input),
    onSuccess: async (subscription) => {
      queryClient.setQueryData(
        companySubscriptionQueryKeys.subscription(companyId),
        subscription,
      );
      await invalidateCompanyEntitlements(queryClient, companyId);
    },
  });
}

// edited by wali: Refresh company access data after cancellation takes effect.
export function useCancelCompanySubscription(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelCompanySubscriptionRequest(companyId),
    onSuccess: async (subscription) => {
      queryClient.setQueryData(
        companySubscriptionQueryKeys.subscription(companyId),
        subscription,
      );
      await invalidateCompanyEntitlements(queryClient, companyId);
    },
  });
}

export function useProvisionCompanyAdministrator(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionCompanyAdministratorInput) =>
      provisionCompanyAdministratorRequest(companyId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: companySubscriptionQueryKeys.administrators(companyId),
        }),
        queryClient.invalidateQueries({
          queryKey: companySubscriptionQueryKeys.usage(companyId),
        }),
      ]);
    },
  });
}

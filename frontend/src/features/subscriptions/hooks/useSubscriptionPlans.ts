// edited by wali: Cache plan catalog queries and expose mutations for the admin screens.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createSubscriptionPlanRequest,
  getSubscriptionPlanRequest,
  listSubscriptionFeatureFlagsRequest,
  listSubscriptionPlansRequest,
  replaceSubscriptionPlanFeaturesRequest,
  updateSubscriptionPlanRequest,
} from "../api/subscription-plan.api";
import type {
  ReplacePlanFeaturesInput,
  SubscriptionPlanInput,
} from "../types/subscription-plan.types";

export const subscriptionPlanQueryKeys = {
  root: ["subscription-plan-admin"] as const,
  list: () => ["subscription-plan-admin", "list"] as const,
  detail: (planId: string) => ["subscription-plan-admin", "detail", planId] as const,
  flags: () => ["subscription-plan-admin", "feature-flags"] as const,
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionPlanQueryKeys.list(),
    queryFn: listSubscriptionPlansRequest,
  });
}

export function useSubscriptionPlan(planId: string | null) {
  return useQuery({
    queryKey: subscriptionPlanQueryKeys.detail(planId ?? ""),
    queryFn: () => getSubscriptionPlanRequest(planId ?? ""),
    enabled: Boolean(planId),
  });
}

export function useSubscriptionFeatureFlags() {
  return useQuery({
    queryKey: subscriptionPlanQueryKeys.flags(),
    queryFn: listSubscriptionFeatureFlagsRequest,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubscriptionPlanRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.list() }),
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: SubscriptionPlanInput }) =>
      updateSubscriptionPlanRequest(planId, input),
    onSuccess: async (_plan, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.detail(variables.planId) }),
      ]);
    },
  });
}

export function useReplaceSubscriptionPlanFeatures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: ReplacePlanFeaturesInput }) =>
      replaceSubscriptionPlanFeaturesRequest(planId, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryKeys.detail(variables.planId) }),
      ]);
    },
  });
}

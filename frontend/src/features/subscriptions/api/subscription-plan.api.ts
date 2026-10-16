// edited by wali: Connect the plan catalog UI to the existing subscription endpoints.
import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  ReplacePlanFeaturesInput,
  SubscriptionFeatureFlag,
  SubscriptionPlan,
  SubscriptionPlanDetails,
  SubscriptionPlanInput,
  SubscriptionPlanListResult,
} from "../types/subscription-plan.types";

export async function listSubscriptionPlansRequest(): Promise<SubscriptionPlanListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<SubscriptionPlanListResult>
  >("/subscriptions/plans", {
    params: { page: 1, limit: 100, sortBy: "plan_name", sortOrder: "ASC" },
  });
  return response.data.data;
}

export async function getSubscriptionPlanRequest(planId: string): Promise<SubscriptionPlanDetails> {
  const response = await apiClient.get<
    ApiSuccessResponse<SubscriptionPlanDetails>
  >(`/subscriptions/plans/${planId}`);
  return response.data.data;
}

export async function listSubscriptionFeatureFlagsRequest(): Promise<SubscriptionFeatureFlag[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ features: SubscriptionFeatureFlag[] }>
  >("/subscriptions/features");
  // edited by wali: Only active flags can be assigned by the backend plan-feature endpoint.
  return response.data.data.features.filter((feature) => feature.isActive);
}

export async function createSubscriptionPlanRequest(input: SubscriptionPlanInput): Promise<SubscriptionPlan> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ plan: SubscriptionPlan }>
  >("/subscriptions/plans", input);
  return response.data.data.plan;
}

export async function updateSubscriptionPlanRequest(planId: string, input: SubscriptionPlanInput): Promise<SubscriptionPlan> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ plan: SubscriptionPlan }>
  >(`/subscriptions/plans/${planId}`, input);
  return response.data.data.plan;
}

export async function replaceSubscriptionPlanFeaturesRequest(planId: string, input: ReplacePlanFeaturesInput): Promise<void> {
  await apiClient.put(`/subscriptions/plans/${planId}/features`, input);
}

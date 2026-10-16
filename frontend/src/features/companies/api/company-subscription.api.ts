import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  CompanyAdministrator,
  CompanyAdministratorListResult,
  CompanySubscriptionInput,
  CompanyUsage,
  CurrentCompanySubscription,
  EffectiveCompanyFeature,
  ProvisionCompanyAdministratorInput,
  SelfServiceSubscribeInput,
  SubscriptionPlanListResult,
} from "../types/company-subscription.types";

export async function listSubscriptionPlansRequest(): Promise<SubscriptionPlanListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<SubscriptionPlanListResult>
  >("/subscriptions/plans", {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      sortBy: "plan_name",
      sortOrder: "ASC",
    },
  });

  return response.data.data;
}

export async function getCompanySubscriptionRequest(
  companyId: string,
): Promise<CurrentCompanySubscription | null> {
  const response = await apiClient.get<
    ApiSuccessResponse<{
      subscription: CurrentCompanySubscription | null;
    }>
  >(`/companies/${companyId}/subscription`);

  return response.data.data.subscription;
}

export async function createCompanySubscriptionRequest(
  companyId: string,
  input: CompanySubscriptionInput,
): Promise<CurrentCompanySubscription> {
  const response = await apiClient.post<
    ApiSuccessResponse<{
      subscription: CurrentCompanySubscription;
    }>
  >(`/companies/${companyId}/subscription`, input);

  return response.data.data.subscription;
}

export async function updateCompanySubscriptionRequest(
  companyId: string,
  input: CompanySubscriptionInput,
): Promise<CurrentCompanySubscription> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{
      subscription: CurrentCompanySubscription;
    }>
  >(`/companies/${companyId}/subscription`, input);

  return response.data.data.subscription;
}

// edited by wali: Submit a limited plan selection; the backend supplies price and status.
export async function selfServiceSubscribeCompanyRequest(
  companyId: string,
  input: SelfServiceSubscribeInput,
): Promise<CurrentCompanySubscription> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ subscription: CurrentCompanySubscription }>
  >("/companies/" + companyId + "/subscribe", input);

  return response.data.data.subscription;
}

// edited by wali: Request immediate cancellation for the signed-in company's subscription.
export async function cancelCompanySubscriptionRequest(
  companyId: string,
): Promise<CurrentCompanySubscription> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ subscription: CurrentCompanySubscription }>
  >("/companies/" + companyId + "/cancel-subscription");

  return response.data.data.subscription;
}

export async function getCompanyUsageRequest(
  companyId: string,
): Promise<CompanyUsage> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ usage: CompanyUsage }>
  >(`/companies/${companyId}/usage`);

  return response.data.data.usage;
}

export async function getCompanyFeaturesRequest(
  companyId: string,
): Promise<EffectiveCompanyFeature[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<{
      features: EffectiveCompanyFeature[];
    }>
  >(`/companies/${companyId}/features`);

  return response.data.data.features;
}

export async function listCompanyAdministratorsRequest(
  companyId: string,
): Promise<CompanyAdministratorListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<CompanyAdministratorListResult>
  >(`/companies/${companyId}/administrators`, {
    params: {
      page: 1,
      limit: 100,
    },
  });

  return response.data.data;
}

export async function provisionCompanyAdministratorRequest(
  companyId: string,
  input: ProvisionCompanyAdministratorInput,
): Promise<CompanyAdministrator> {
  const response = await apiClient.post<
    ApiSuccessResponse<{
      administrator: CompanyAdministrator;
    }>
  >(`/companies/${companyId}/provision-admin`, input);

  return response.data.data.administrator;
}

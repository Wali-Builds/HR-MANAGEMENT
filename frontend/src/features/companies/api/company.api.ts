import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  Company,
  CompanyListParams,
  CompanyListResult,
  CompanyMutationInput,
} from "../types/company.types";

// edited by wali: Keep the current-company response shape explicit for workspace headers.
export interface CompanyIdentity {
  companyId: string;
  displayName: string;
}

export async function getCurrentCompanyIdentityRequest(): Promise<CompanyIdentity> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ company: CompanyIdentity }>
  >("/companies/current");

  return response.data.data.company;
}

export async function listCompaniesRequest(
  params: CompanyListParams,
): Promise<CompanyListResult> {
  const response = await apiClient.get<
    ApiSuccessResponse<CompanyListResult>
  >("/companies", { params });

  return response.data.data;
}

export async function getCompanyRequest(
  companyId: string,
): Promise<Company> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ company: Company }>
  >(`/companies/${companyId}`);

  return response.data.data.company;
}

export async function createCompanyRequest(
  input: CompanyMutationInput,
): Promise<Company> {
  const response = await apiClient.post<
    ApiSuccessResponse<{ company: Company }>
  >("/companies", input);

  return response.data.data.company;
}

export async function updateCompanyRequest(
  companyId: string,
  input: Partial<CompanyMutationInput>,
): Promise<Company> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ company: Company }>
  >(`/companies/${companyId}`, input);

  return response.data.data.company;
}

export async function deleteCompanyRequest(
  companyId: string,
): Promise<void> {
  await apiClient.delete(`/companies/${companyId}`);
}

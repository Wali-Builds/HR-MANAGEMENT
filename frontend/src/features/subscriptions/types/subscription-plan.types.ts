// edited by wali: Share backend plan and feature contracts across admin screens.
export interface SubscriptionPlan {
  planId: string;
  planCode: string;
  planName: string;
  description: string | null;
  maximumEmployees: number | null;
  maximumBranches: number | null;
  maximumUsers: number | null;
  storageLimitMb: number | null;
  monthlyPrice: number;
  annualPrice: number;
  currencyCode: string;
  trialDays: number;
  isActive: boolean;
  featureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanListResult {
  plans: SubscriptionPlan[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SubscriptionFeatureFlag {
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  description: string | null;
  moduleName: string | null;
  defaultEnabled: boolean;
  minimumPlanCode: string | null;
  isActive: boolean;
}

export interface SubscriptionPlanFeature {
  planFeatureId: string;
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  moduleName: string | null;
  isEnabled: boolean;
  configuration: unknown;
}

export interface SubscriptionPlanDetails {
  plan: SubscriptionPlan;
  features: SubscriptionPlanFeature[];
}

export interface SubscriptionPlanInput {
  planCode: string;
  planName: string;
  description: string | null;
  maximumEmployees: number | null;
  maximumBranches: number | null;
  maximumUsers: number | null;
  storageLimitMb: number | null;
  monthlyPrice: number;
  annualPrice: number;
  currencyCode: string;
  trialDays: number;
  isActive: boolean;
}

export interface ReplacePlanFeaturesInput {
  features: Array<{
    featureCode: string;
    isEnabled: boolean;
    configuration: Record<string, unknown> | null;
  }>;
}

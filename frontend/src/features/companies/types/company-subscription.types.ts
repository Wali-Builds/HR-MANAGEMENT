export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export type BillingCycle =
  | "MONTHLY"
  | "ANNUAL"
  | "CUSTOM";

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
  pagination: Pagination;
}

export interface CurrentCompanySubscription {
  subscriptionId: string;
  companyId: string;
  planId: string;
  planCode: string;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  nextBillingDate: string | null;
  agreedPrice: number;
  currencyCode: string;
  autoRenew: boolean;
  employeeLimitOverride: number | null;
  branchLimitOverride: number | null;
  userLimitOverride: number | null;
  storageLimitMbOverride: number | null;
  effectiveEmployeeLimit: number | null;
  effectiveBranchLimit: number | null;
  effectiveUserLimit: number | null;
  effectiveStorageLimitMb: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUsage {
  companyId: string;
  companyCode: string;
  companyName: string;
  companyIsActive: boolean;
  subscription: {
    subscriptionId: string;
    planId: string;
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    trialEndDate: string | null;
    subscriptionEndDate: string | null;
  } | null;
  usage: {
    activeEmployees: number;
    activeUsers: number;
    activeBranches: number;
    fileStorageBytes: number;
  };
  limits: {
    employees: number | null;
    users: number | null;
    branches: number | null;
    storageMb: number | null;
  };
  remaining: {
    employees: number | null;
    users: number | null;
    branches: number | null;
    storageBytes: number | null;
  };
}

export interface EffectiveCompanyFeature {
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  description: string | null;
  moduleName: string | null;
  isEnabled: boolean;
  configuration: unknown;
  source: "COMPANY_OVERRIDE" | "PLAN" | "DEFAULT";
}

export interface CompanyAdministrator {
  userId: string;
  companyId: string;
  username: string;
  email: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roleId: string;
  roleCode: string;
  roleName: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyAdministratorListResult {
  administrators: CompanyAdministrator[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CompanySubscriptionInput {
  planId: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  subscriptionStartDate: string;
  subscriptionEndDate?: string | null;
  nextBillingDate?: string | null;
  agreedPrice: number;
  currencyCode: string;
  autoRenew: boolean;
  employeeLimitOverride?: number | null;
  branchLimitOverride?: number | null;
  userLimitOverride?: number | null;
  storageLimitMbOverride?: number | null;
  remarks?: string | null;
}

// edited by wali: A company admin may choose only a plan and its billing cycle.
export interface SelfServiceSubscribeInput {
  planId: string;
  billingCycle: "MONTHLY" | "ANNUAL";
}

export interface ProvisionCompanyAdministratorInput {
  username: string;
  email: string;
  temporaryPassword: string;
  isEmailVerified: boolean;
}

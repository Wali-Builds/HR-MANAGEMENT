export type DatabaseId =
  | string
  | number
  | bigint;

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

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SubscriptionActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface SubscriptionPlanDatabaseRow {
  plan_id: DatabaseId;
  plan_code: string;
  plan_name: string;
  description: string | null;
  maximum_employees: number | null;
  maximum_branches: number | null;
  maximum_users: number | null;
  storage_limit_mb: number | null;
  monthly_price: string | number;
  annual_price: string | number;
  currency_code: string;
  trial_days: number;
  is_active: number | boolean;
  feature_count: number | string | bigint;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FeatureFlagDatabaseRow {
  feature_flag_id: DatabaseId;
  feature_code: string;
  feature_name: string;
  description: string | null;
  module_name: string | null;
  default_enabled: number | boolean;
  minimum_plan_code: string | null;
  is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PlanFeatureDatabaseRow {
  subscription_plan_feature_id: DatabaseId;
  plan_id: DatabaseId;
  feature_flag_id: DatabaseId;
  feature_code: string;
  feature_name: string;
  module_name: string | null;
  is_enabled: number | boolean;
  configuration_payload: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CurrentSubscriptionDatabaseRow {
  subscription_id: DatabaseId;
  company_id: DatabaseId;
  plan_id: DatabaseId;
  plan_code: string;
  plan_name: string;
  subscription_status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  trial_start_date: Date | string | null;
  trial_end_date: Date | string | null;
  subscription_start_date: Date | string;
  subscription_end_date: Date | string | null;
  next_billing_date: Date | string | null;
  agreed_price: string | number;
  currency_code: string;
  auto_renew: number | boolean;
  is_current: number | boolean | null;
  employee_limit_override: number | null;
  branch_limit_override: number | null;
  user_limit_override: number | null;
  storage_limit_mb_override: number | null;
  effective_employee_limit: number | null;
  effective_branch_limit: number | null;
  effective_user_limit: number | null;
  effective_storage_limit_mb: number | null;
  monthly_price: string | number;
  annual_price: string | number;
  trial_days: number;
  plan_is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CompanyUsageDatabaseRow {
  company_id: DatabaseId;
  company_code: string;
  display_name: string;
  company_is_active: number | boolean;
  subscription_id: DatabaseId | null;
  plan_id: DatabaseId | null;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: SubscriptionStatus | null;
  trial_end_date: Date | string | null;
  subscription_end_date: Date | string | null;
  effective_employee_limit: number | null;
  effective_branch_limit: number | null;
  effective_user_limit: number | null;
  effective_storage_limit_mb: number | null;
  active_employee_count: string | number | bigint;
  active_user_count: string | number | bigint;
  active_branch_count: string | number | bigint;
  file_storage_bytes: string | number | bigint;
}

export interface EffectiveFeatureDatabaseRow {
  feature_flag_id: DatabaseId;
  feature_code: string;
  feature_name: string;
  description: string | null;
  module_name: string | null;
  effective_enabled: number | boolean;
  configuration_payload: string | null;
  entitlement_source: "COMPANY_OVERRIDE" | "PLAN" | "DEFAULT";
}

export interface CompanyAdministratorDatabaseRow {
  user_id: DatabaseId;
  company_id: DatabaseId;
  username: string;
  email: string | null;
  is_active: number | boolean;
  is_email_verified: number | boolean;
  must_change_password: number | boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  role_id: DatabaseId;
  role_code: string;
  role_name: string;
  assigned_at: Date | string;
}

export interface SubscriptionPlanResponse {
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

export interface FeatureFlagResponse {
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  description: string | null;
  moduleName: string | null;
  defaultEnabled: boolean;
  minimumPlanCode: string | null;
  isActive: boolean;
}

export interface PlanFeatureResponse {
  planFeatureId: string;
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  moduleName: string | null;
  isEnabled: boolean;
  configuration: unknown;
}

export interface CurrentSubscriptionResponse {
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

export interface CompanyUsageResponse {
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

export interface EffectiveFeatureResponse {
  featureFlagId: string;
  featureCode: string;
  featureName: string;
  description: string | null;
  moduleName: string | null;
  isEnabled: boolean;
  configuration: unknown;
  source: "COMPANY_OVERRIDE" | "PLAN" | "DEFAULT";
}

export interface CompanyAdministratorResponse {
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

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class SubscriptionRuleError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;

  public constructor(
    code: string,
    details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "SubscriptionRuleError";
    this.code = code;
    this.details = details;
  }
}

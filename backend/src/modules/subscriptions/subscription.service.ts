import {
  AppError
} from "../../common/errors/app-error.js";

import {
  hashPassword
} from "../../common/security/password.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import type {
  CreateCompanySubscriptionInput,
  CreateSubscriptionPlanInput,
  ListCompanyAdministratorsQuery,
  ListSubscriptionPlansQuery,
  ProvisionCompanyAdministratorInput,
  ReplacePlanFeaturesInput,
  SelfServiceSubscribeInput,
  UpdateCompanySubscriptionInput,
  UpdateSubscriptionPlanInput
} from "./subscription.schema.js";

import {
  createCurrentCompanySubscriptionRecord,
  createSubscriptionPlanRecord,
  findCurrentCompanySubscriptionRecord,
  findSubscriptionPlanById,
  findSubscriptionPlanIdByCode,
  getCompanyUsageRecord,
  listCompanyAdministratorRecords,
  listEffectiveCompanyFeatureRecords,
  listFeatureFlagRecords,
  listPlanFeatureRecords,
  listSubscriptionPlanRecords,
  provisionCompanyAdministratorRecord,
  replacePlanFeatureRecords,
  updateCurrentCompanySubscriptionRecord,
  updateSubscriptionPlanRecord
} from "./subscription.repository.js";

import {
  SubscriptionRuleError
} from "./subscription.types.js";

import type {
  CompanyAdministratorDatabaseRow,
  CompanyAdministratorResponse,
  CompanyUsageDatabaseRow,
  CompanyUsageResponse,
  CurrentSubscriptionDatabaseRow,
  CurrentSubscriptionResponse,
  EffectiveFeatureDatabaseRow,
  EffectiveFeatureResponse,
  FeatureFlagDatabaseRow,
  FeatureFlagResponse,
  PaginationResponse,
  PlanFeatureDatabaseRow,
  PlanFeatureResponse,
  RequestMetadata,
  SubscriptionActor,
  SubscriptionPlanDatabaseRow,
  SubscriptionPlanResponse
} from "./subscription.types.js";

function databaseBoolean(
  value: number | boolean | null
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function dateOnly(
  value: Date | string | null
): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value
      .toISOString()
      .slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function dateTimeIso(
  value: Date | string | null
): string | null {
  if (value === null) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function requiredDateTimeIso(
  value: Date | string
): string {
  const result = dateTimeIso(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATETIME"
    );
  }

  return result;
}

function requiredDateOnly(
  value: Date | string
): string {
  const result = dateOnly(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATE"
    );
  }

  return result;
}

function parseJson(
  value: string | null
): unknown {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function createActor(
  auth: AuthContext
): SubscriptionActor {
  return {
    userId: auth.userId,
    companyId: auth.companyId,
    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function requirePlatformAdministrator(
  auth: AuthContext
): void {
  if (!auth.isPlatformAdmin) {
    throw new AppError({
      message:
        "Only a Platform Administrator can manage subscriptions and provision the initial Company Administrator",
      statusCode: 403,
      code: "PLATFORM_ADMIN_REQUIRED"
    });
  }
}

function assertCompanyAccess(
  companyId: string,
  auth: AuthContext
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    String(auth.companyId) !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's subscription information",
      statusCode: 403,
      code: "COMPANY_ACCESS_DENIED"
    });
  }
}

function mapPlan(
  row: SubscriptionPlanDatabaseRow
): SubscriptionPlanResponse {
  return {
    planId: String(row.plan_id),
    planCode: row.plan_code,
    planName: row.plan_name,
    description: row.description,
    maximumEmployees:
      row.maximum_employees,
    maximumBranches:
      row.maximum_branches,
    maximumUsers: row.maximum_users,
    storageLimitMb: row.storage_limit_mb,
    monthlyPrice: Number(row.monthly_price),
    annualPrice: Number(row.annual_price),
    currencyCode: row.currency_code,
    trialDays: Number(row.trial_days),
    isActive:
      databaseBoolean(row.is_active),
    featureCount: Number(row.feature_count),
    createdAt:
      requiredDateTimeIso(row.created_at),
    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function mapFeatureFlag(
  row: FeatureFlagDatabaseRow
): FeatureFlagResponse {
  return {
    featureFlagId:
      String(row.feature_flag_id),
    featureCode: row.feature_code,
    featureName: row.feature_name,
    description: row.description,
    moduleName: row.module_name,
    defaultEnabled:
      databaseBoolean(row.default_enabled),
    minimumPlanCode:
      row.minimum_plan_code,
    isActive:
      databaseBoolean(row.is_active)
  };
}

function mapPlanFeature(
  row: PlanFeatureDatabaseRow
): PlanFeatureResponse {
  return {
    planFeatureId:
      String(
        row.subscription_plan_feature_id
      ),
    featureFlagId:
      String(row.feature_flag_id),
    featureCode: row.feature_code,
    featureName: row.feature_name,
    moduleName: row.module_name,
    isEnabled:
      databaseBoolean(row.is_enabled),
    configuration:
      parseJson(row.configuration_payload)
  };
}

function mapCurrentSubscription(
  row: CurrentSubscriptionDatabaseRow
): CurrentSubscriptionResponse {
  return {
    subscriptionId:
      String(row.subscription_id),
    companyId: String(row.company_id),
    planId: String(row.plan_id),
    planCode: row.plan_code,
    planName: row.plan_name,
    subscriptionStatus:
      row.subscription_status,
    billingCycle: row.billing_cycle,
    trialStartDate:
      dateOnly(row.trial_start_date),
    trialEndDate:
      dateOnly(row.trial_end_date),
    subscriptionStartDate:
      requiredDateOnly(
        row.subscription_start_date
      ),
    subscriptionEndDate:
      dateOnly(row.subscription_end_date),
    nextBillingDate:
      dateOnly(row.next_billing_date),
    agreedPrice: Number(row.agreed_price),
    currencyCode: row.currency_code,
    autoRenew:
      databaseBoolean(row.auto_renew),
    employeeLimitOverride:
      row.employee_limit_override,
    branchLimitOverride:
      row.branch_limit_override,
    userLimitOverride:
      row.user_limit_override,
    storageLimitMbOverride:
      row.storage_limit_mb_override,
    effectiveEmployeeLimit:
      row.effective_employee_limit,
    effectiveBranchLimit:
      row.effective_branch_limit,
    effectiveUserLimit:
      row.effective_user_limit,
    effectiveStorageLimitMb:
      row.effective_storage_limit_mb,
    createdAt:
      requiredDateTimeIso(row.created_at),
    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function remaining(
  limit: number | null,
  used: number
): number | null {
  return limit === null
    ? null
    : Math.max(0, limit - used);
}

function mapUsage(
  row: CompanyUsageDatabaseRow
): CompanyUsageResponse {
  const employees =
    Number(row.active_employee_count);
  const users =
    Number(row.active_user_count);
  const branches =
    Number(row.active_branch_count);
  const storageBytes =
    Number(row.file_storage_bytes);

  const storageLimitBytes =
    row.effective_storage_limit_mb === null
      ? null
      : row.effective_storage_limit_mb *
        1024 * 1024;

  return {
    companyId: String(row.company_id),
    companyCode: row.company_code,
    companyName: row.display_name,
    companyIsActive:
      databaseBoolean(row.company_is_active),
    subscription:
      row.subscription_id === null ||
      row.plan_id === null ||
      row.plan_code === null ||
      row.plan_name === null ||
      row.subscription_status === null
        ? null
        : {
            subscriptionId:
              String(row.subscription_id),
            planId: String(row.plan_id),
            planCode: row.plan_code,
            planName: row.plan_name,
            status:
              row.subscription_status,
            trialEndDate:
              dateOnly(row.trial_end_date),
            subscriptionEndDate:
              dateOnly(
                row.subscription_end_date
              )
          },
    usage: {
      activeEmployees: employees,
      activeUsers: users,
      activeBranches: branches,
      fileStorageBytes: storageBytes
    },
    limits: {
      employees:
        row.effective_employee_limit,
      users: row.effective_user_limit,
      branches:
        row.effective_branch_limit,
      storageMb:
        row.effective_storage_limit_mb
    },
    remaining: {
      employees:
        remaining(
          row.effective_employee_limit,
          employees
        ),
      users:
        remaining(
          row.effective_user_limit,
          users
        ),
      branches:
        remaining(
          row.effective_branch_limit,
          branches
        ),
      storageBytes:
        storageLimitBytes === null
          ? null
          : Math.max(
              0,
              storageLimitBytes - storageBytes
            )
    }
  };
}

function mapEffectiveFeature(
  row: EffectiveFeatureDatabaseRow
): EffectiveFeatureResponse {
  return {
    featureFlagId:
      String(row.feature_flag_id),
    featureCode: row.feature_code,
    featureName: row.feature_name,
    description: row.description,
    moduleName: row.module_name,
    isEnabled:
      databaseBoolean(row.effective_enabled),
    configuration:
      parseJson(row.configuration_payload),
    source: row.entitlement_source
  };
}

function mapCompanyAdministrator(
  row: CompanyAdministratorDatabaseRow
): CompanyAdministratorResponse {
  return {
    userId: String(row.user_id),
    companyId: String(row.company_id),
    username: row.username,
    email: row.email,
    isActive:
      databaseBoolean(row.is_active),
    isEmailVerified:
      databaseBoolean(
        row.is_email_verified
      ),
    mustChangePassword:
      databaseBoolean(
        row.must_change_password
      ),
    lastLoginAt:
      dateTimeIso(row.last_login_at),
    roleId: String(row.role_id),
    roleCode: row.role_code,
    roleName: row.role_name,
    assignedAt:
      requiredDateTimeIso(row.assigned_at),
    createdAt:
      requiredDateTimeIso(row.created_at),
    updatedAt:
      requiredDateTimeIso(row.updated_at)
  };
}

function isDuplicateEntryError(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code ===
      "ER_DUP_ENTRY"
  );
}

function translateRepositoryError(
  error: unknown
): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof SubscriptionRuleError) {
    const mappings: Record<
      string,
      {
        message: string;
        statusCode: number;
      }
    > = {
      COMPANY_NOT_FOUND: {
        message: "Company was not found",
        statusCode: 404
      },
      COMPANY_INACTIVE: {
        message:
          "The company is inactive",
        statusCode: 409
      },
      SUBSCRIPTION_PLAN_NOT_FOUND: {
        message:
          "Subscription plan was not found",
        statusCode: 404
      },
      SUBSCRIPTION_PLAN_INACTIVE: {
        message:
          "The selected subscription plan is inactive",
        statusCode: 409
      },
      SUBSCRIPTION_REQUIRED: {
        message:
          "The company requires a current subscription before an administrator can be provisioned",
        statusCode: 409
      },
      SUBSCRIPTION_INACTIVE: {
        message:
          "The company's subscription is not active",
        statusCode: 403
      },
      SUBSCRIPTION_EXPIRED: {
        message:
          "The company's subscription has expired",
        statusCode: 403
      },
      USER_LIMIT_REACHED: {
        message:
          "The subscription user limit has been reached",
        statusCode: 409
      },
      USERNAME_ALREADY_EXISTS: {
        message:
          "This username is already in use",
        statusCode: 409
      },
      EMAIL_ALREADY_EXISTS: {
        message:
          "This email address is already in use",
        statusCode: 409
      },
      COMPANY_ADMIN_ROLE_NOT_FOUND: {
        message:
          "The COMPANY_ADMIN system role is unavailable",
        statusCode: 500
      },
      INVALID_FEATURE_CODE: {
        message:
          "One or more feature codes are invalid or inactive",
        statusCode: 422
      }
    };

    const mapping = mappings[error.code];

    if (mapping) {
      throw new AppError({
        message: mapping.message,
        statusCode: mapping.statusCode,
        code: error.code,
        ...(error.details !== undefined
          ? { details: error.details }
          : {})
      });
    }
  }

  if (isDuplicateEntryError(error)) {
    throw new AppError({
      message:
        "A record with the same unique value already exists",
      statusCode: 409,
      code: "DUPLICATE_RECORD"
    });
  }

  throw error;
}

function validateMergedSubscriptionDates(
  current: CurrentSubscriptionResponse,
  input: UpdateCompanySubscriptionInput
): void {
  const trialStartDate =
    input.trialStartDate !== undefined
      ? input.trialStartDate
      : current.trialStartDate;

  const trialEndDate =
    input.trialEndDate !== undefined
      ? input.trialEndDate
      : current.trialEndDate;

  const subscriptionStartDate =
    input.subscriptionStartDate ??
    current.subscriptionStartDate;

  const subscriptionEndDate =
    input.subscriptionEndDate !== undefined
      ? input.subscriptionEndDate
      : current.subscriptionEndDate;

  if (
    trialStartDate &&
    trialEndDate &&
    trialEndDate < trialStartDate
  ) {
    throw new AppError({
      message:
        "Trial end date cannot be before the trial start date",
      statusCode: 422,
      code: "INVALID_TRIAL_DATE_RANGE"
    });
  }

  if (
    subscriptionEndDate &&
    subscriptionEndDate <
      subscriptionStartDate
  ) {
    throw new AppError({
      message:
        "Subscription end date cannot be before the subscription start date",
      statusCode: 422,
      code:
        "INVALID_SUBSCRIPTION_DATE_RANGE"
    });
  }
}

export async function listSubscriptionPlans(
  query: ListSubscriptionPlansQuery,
  auth: AuthContext
): Promise<{
  plans: SubscriptionPlanResponse[];
  pagination: PaginationResponse;
}> {
  const effectiveQuery:
    ListSubscriptionPlansQuery =
    auth.isPlatformAdmin
      ? query
      : {
          ...query,
          isActive: true
        };

  const result =
    await listSubscriptionPlanRecords(
      effectiveQuery
    );

  return {
    plans: result.plans.map(mapPlan),
    pagination: {
      page: effectiveQuery.page,
      limit: effectiveQuery.limit,
      total: result.total,
      totalPages:
        Math.ceil(
          result.total /
          effectiveQuery.limit
        )
    }
  };
}

export async function getSubscriptionPlan(
  planId: string,
  _auth: AuthContext
): Promise<{
  plan: SubscriptionPlanResponse;
  features: PlanFeatureResponse[];
}> {
  const [plan, features] =
    await Promise.all([
      findSubscriptionPlanById(planId),
      listPlanFeatureRecords(planId)
    ]);

  if (!plan) {
    throw new AppError({
      message:
        "Subscription plan was not found",
      statusCode: 404,
      code:
        "SUBSCRIPTION_PLAN_NOT_FOUND"
    });
  }

  return {
    plan: mapPlan(plan),
    features:
      features.map(mapPlanFeature)
  };
}

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<SubscriptionPlanResponse> {
  requirePlatformAdministrator(auth);

  const duplicate =
    await findSubscriptionPlanIdByCode(
      input.planCode
    );

  if (duplicate) {
    throw new AppError({
      message:
        "This subscription plan code is already in use",
      statusCode: 409,
      code:
        "SUBSCRIPTION_PLAN_CODE_EXISTS"
    });
  }

  try {
    const created =
      await createSubscriptionPlanRecord(
        input,
        createActor(auth),
        metadata
      );

    return mapPlan(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function updateSubscriptionPlan(
  planId: string,
  input: UpdateSubscriptionPlanInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<SubscriptionPlanResponse> {
  requirePlatformAdministrator(auth);

  if (input.planCode !== undefined) {
    const duplicate =
      await findSubscriptionPlanIdByCode(
        input.planCode,
        planId
      );

    if (duplicate) {
      throw new AppError({
        message:
          "This subscription plan code is already in use",
        statusCode: 409,
        code:
          "SUBSCRIPTION_PLAN_CODE_EXISTS"
      });
    }
  }

  try {
    const updated =
      await updateSubscriptionPlanRecord(
        planId,
        input,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Subscription plan was not found",
        statusCode: 404,
        code:
          "SUBSCRIPTION_PLAN_NOT_FOUND"
      });
    }

    return mapPlan(updated);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function listFeatureFlags(
  _auth: AuthContext
): Promise<FeatureFlagResponse[]> {
  const rows =
    await listFeatureFlagRecords();

  return rows.map(mapFeatureFlag);
}

export async function replaceSubscriptionPlanFeatures(
  planId: string,
  input: ReplacePlanFeaturesInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<PlanFeatureResponse[]> {
  requirePlatformAdministrator(auth);

  try {
    const updated =
      await replacePlanFeatureRecords(
        planId,
        input,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Subscription plan was not found",
        statusCode: 404,
        code:
          "SUBSCRIPTION_PLAN_NOT_FOUND"
      });
    }

    return updated.map(mapPlanFeature);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function getCompanySubscription(
  companyId: string,
  auth: AuthContext
): Promise<CurrentSubscriptionResponse | null> {
  assertCompanyAccess(companyId, auth);

  const record =
    await findCurrentCompanySubscriptionRecord(
      companyId
    );

  return record
    ? mapCurrentSubscription(record)
    : null;
}

export async function createCompanySubscription(
  companyId: string,
  input: CreateCompanySubscriptionInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CurrentSubscriptionResponse> {
  requirePlatformAdministrator(auth);

  try {
    const created =
      await createCurrentCompanySubscriptionRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    return mapCurrentSubscription(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

// edited by wali: Activate an active catalog plan for the signed-in company's administrator.
export async function selfServiceSubscribeCompany(
  companyId: string,
  input: SelfServiceSubscribeInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CurrentSubscriptionResponse> {
  if (auth.isPlatformAdmin) {
    throw new AppError({
      message: "Company self-service subscriptions are only available to company accounts",
      statusCode: 403,
      code: "COMPANY_ACCOUNT_REQUIRED"
    });
  }

  assertCompanyAccess(companyId, auth);

  if (
    !auth.roleCodes.includes("COMPANY_ADMIN") &&
    !auth.permissions.some(
      (permission) =>
        permission === "subscription.company.manage" ||
        permission === "company.manage"
    )
  ) {
    throw new AppError({
      message: "You do not have permission to subscribe this company to a plan",
      statusCode: 403,
      code: "SUBSCRIPTION_MANAGE_REQUIRED"
    });
  }

  const plan = await findSubscriptionPlanById(input.planId);

  if (!plan) {
    throw new AppError({
      message: "Subscription plan was not found",
      statusCode: 404,
      code: "SUBSCRIPTION_PLAN_NOT_FOUND"
    });
  }

  if (!databaseBoolean(plan.is_active)) {
    throw new AppError({
      message: "The selected subscription plan is inactive",
      statusCode: 409,
      code: "SUBSCRIPTION_PLAN_INACTIVE"
    });
  }

  const subscriptionInput: CreateCompanySubscriptionInput = {
    planId: String(plan.plan_id),
    subscriptionStatus: "ACTIVE",
    billingCycle: input.billingCycle,
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: new Date().toISOString().slice(0, 10),
    subscriptionEndDate: null,
    nextBillingDate: null,
    agreedPrice: Number(
      input.billingCycle === "ANNUAL"
        ? plan.annual_price
        : plan.monthly_price
    ),
    currencyCode: plan.currency_code,
    autoRenew: false,
    employeeLimitOverride: null,
    branchLimitOverride: null,
    userLimitOverride: null,
    storageLimitMbOverride: null,
    remarks: "Self-service subscription; payment is handled outside the application."
  };

  try {
    const created = await createCurrentCompanySubscriptionRecord(
      companyId,
      subscriptionInput,
      createActor(auth),
      metadata,
      "/api/v1/companies/" + companyId + "/subscribe"
    );

    return mapCurrentSubscription(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

// edited by wali: Let the company administrator cancel only their company's current subscription.
export async function cancelSelfServiceCompanySubscription(
  companyId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CurrentSubscriptionResponse> {
  if (auth.isPlatformAdmin) {
    throw new AppError({
      message: "Company self-service cancellation is only available to company accounts",
      statusCode: 403,
      code: "COMPANY_ACCOUNT_REQUIRED"
    });
  }

  assertCompanyAccess(companyId, auth);

  if (
    !auth.roleCodes.includes("COMPANY_ADMIN") &&
    !auth.permissions.some(
      (permission) =>
        permission === "subscription.company.manage" ||
        permission === "company.manage"
    )
  ) {
    throw new AppError({
      message: "You do not have permission to cancel this company's subscription",
      statusCode: 403,
      code: "SUBSCRIPTION_MANAGE_REQUIRED"
    });
  }

  const current = await findCurrentCompanySubscriptionRecord(companyId);

  if (!current) {
    throw new AppError({
      message: "The company does not have a current subscription",
      statusCode: 404,
      code: "CURRENT_SUBSCRIPTION_NOT_FOUND"
    });
  }

  if (current.subscription_status === "CANCELLED") {
    throw new AppError({
      message: "The current subscription is already cancelled",
      statusCode: 409,
      code: "SUBSCRIPTION_ALREADY_CANCELLED"
    });
  }

  try {
    const cancelled = await updateCurrentCompanySubscriptionRecord(
      companyId,
      {
        subscriptionStatus: "CANCELLED",
        subscriptionEndDate: new Date().toISOString().slice(0, 10),
        nextBillingDate: null,
        autoRenew: false,
        remarks: "Cancelled by the company's administrator."
      },
      createActor(auth),
      metadata
    );

    if (!cancelled) {
      throw new AppError({
        message: "The company does not have a current subscription",
        statusCode: 404,
        code: "CURRENT_SUBSCRIPTION_NOT_FOUND"
      });
    }

    return mapCurrentSubscription(cancelled);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function updateCompanySubscription(
  companyId: string,
  input: UpdateCompanySubscriptionInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CurrentSubscriptionResponse> {
  requirePlatformAdministrator(auth);

  const current =
    await findCurrentCompanySubscriptionRecord(
      companyId
    );

  if (!current) {
    throw new AppError({
      message:
        "The company does not have a current subscription",
      statusCode: 404,
      code:
        "CURRENT_SUBSCRIPTION_NOT_FOUND"
    });
  }

  validateMergedSubscriptionDates(
    mapCurrentSubscription(current),
    input
  );

  try {
    const updated =
      await updateCurrentCompanySubscriptionRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "The company does not have a current subscription",
        statusCode: 404,
        code:
          "CURRENT_SUBSCRIPTION_NOT_FOUND"
      });
    }

    return mapCurrentSubscription(updated);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

export async function getCompanyUsage(
  companyId: string,
  auth: AuthContext
): Promise<CompanyUsageResponse> {
  assertCompanyAccess(companyId, auth);

  const row =
    await getCompanyUsageRecord(companyId);

  if (!row) {
    throw new AppError({
      message: "Company was not found",
      statusCode: 404,
      code: "COMPANY_NOT_FOUND"
    });
  }

  return mapUsage(row);
}

export async function getCompanyFeatures(
  companyId: string,
  auth: AuthContext
): Promise<EffectiveFeatureResponse[]> {
  assertCompanyAccess(companyId, auth);

  const rows =
    await listEffectiveCompanyFeatureRecords(
      companyId
    );

  return rows.map(mapEffectiveFeature);
}

export async function listCompanyAdministrators(
  companyId: string,
  query: ListCompanyAdministratorsQuery,
  auth: AuthContext
): Promise<{
  administrators:
    CompanyAdministratorResponse[];
  pagination: PaginationResponse;
}> {
  assertCompanyAccess(companyId, auth);

  const result =
    await listCompanyAdministratorRecords(
      companyId,
      query
    );

  return {
    administrators:
      result.administrators.map(
        mapCompanyAdministrator
      ),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages:
        Math.ceil(
          result.total / query.limit
        )
    }
  };
}

export async function provisionCompanyAdministrator(
  companyId: string,
  input: ProvisionCompanyAdministratorInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CompanyAdministratorResponse> {
  requirePlatformAdministrator(auth);

  const passwordHash =
    await hashPassword(
      input.temporaryPassword
    );

  try {
    const created =
      await provisionCompanyAdministratorRecord(
        companyId,
        input,
        passwordHash,
        createActor(auth),
        metadata
      );

    return mapCompanyAdministrator(created);
  } catch (error) {
    return translateRepositoryError(error);
  }
}

import type {
  PoolConnection
} from "mariadb";

import {
  AppError
} from "../../common/errors/app-error.js";

import {
  getCompanyUsageRecord,
  listEffectiveCompanyFeatureRecords
} from "./subscription.repository.js";

export type SubscriptionQuotaResource =
  | "EMPLOYEE"
  | "USER"
  | "BRANCH";

type SubscriptionStatusValue =
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

interface LockedCompanyRow {
  company_id:
    | string
    | number
    | bigint;
  is_active: number | boolean;
}

interface LockedSubscriptionRow {
  subscription_id:
    | string
    | number
    | bigint;
  subscription_status:
    SubscriptionStatusValue;
  trial_end_date:
    | Date
    | string
    | null;
  subscription_end_date:
    | Date
    | string
    | null;
  effective_employee_limit:
    | string
    | number
    | bigint
    | null;
  effective_user_limit:
    | string
    | number
    | bigint
    | null;
  effective_branch_limit:
    | string
    | number
    | bigint
    | null;
}

interface QuotaCountRow {
  used_count:
    | string
    | number
    | bigint;
  record_is_already_active:
    | string
    | number
    | bigint;
}

function todayDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
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

function databaseBoolean(
  value:
    | string
    | number
    | bigint
    | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function numericLimit(
  value:
    | string
    | number
    | bigint
    | null
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function assertSubscriptionStatus(
  subscription: {
    subscription_status:
      SubscriptionStatusValue | null;
    trial_end_date:
      | Date
      | string
      | null;
    subscription_end_date:
      | Date
      | string
      | null;
  }
): void {
  if (
    subscription.subscription_status !==
      "TRIAL" &&
    subscription.subscription_status !==
      "ACTIVE"
  ) {
    throw new AppError({
      message:
        "The company subscription is not active",
      statusCode: 403,
      code: "SUBSCRIPTION_INACTIVE",
      details: {
        status:
          subscription.subscription_status
      }
    });
  }

  const expiryDate =
    subscription.subscription_status ===
      "TRIAL"
      ? dateOnly(
          subscription.trial_end_date
        )
      : dateOnly(
          subscription.subscription_end_date
        );

  if (
    expiryDate !== null &&
    expiryDate < todayDateOnly()
  ) {
    throw new AppError({
      message:
        "The company subscription has expired",
      statusCode: 403,
      code: "SUBSCRIPTION_EXPIRED",
      details: { expiryDate }
    });
  }
}

export async function requireActiveCompanySubscription(
  companyId: string
): Promise<void> {
  const usage =
    await getCompanyUsageRecord(companyId);

  if (!usage) {
    throw new AppError({
      message: "Company was not found",
      statusCode: 404,
      code: "COMPANY_NOT_FOUND"
    });
  }

  if (usage.subscription_id === null) {
    throw new AppError({
      message:
        "A current subscription is required",
      statusCode: 403,
      code: "SUBSCRIPTION_REQUIRED"
    });
  }

  assertSubscriptionStatus({
    subscription_status:
      usage.subscription_status,
    trial_end_date:
      usage.trial_end_date,
    subscription_end_date:
      usage.subscription_end_date
  });
}

export async function requireCompanyFeature(
  companyId: string,
  featureCode: string
): Promise<void> {
  await requireActiveCompanySubscription(
    companyId
  );

  const features =
    await listEffectiveCompanyFeatureRecords(
      companyId
    );

  const feature = features.find(
    item =>
      item.feature_code === featureCode
  );

  if (
    !feature ||
    !(
      feature.effective_enabled === true ||
      Number(feature.effective_enabled) === 1
    )
  ) {
    throw new AppError({
      message:
        "This feature is not available under the current subscription",
      statusCode: 403,
      code: "FEATURE_NOT_AVAILABLE",
      details: { featureCode }
    });
  }
}

export async function requireQuotaAvailable(
  companyId: string,
  resource: SubscriptionQuotaResource
): Promise<void> {
  await requireActiveCompanySubscription(
    companyId
  );

  const usage =
    await getCompanyUsageRecord(companyId);

  if (!usage) {
    throw new AppError({
      message: "Company was not found",
      statusCode: 404,
      code: "COMPANY_NOT_FOUND"
    });
  }

  const values = {
    EMPLOYEE: {
      used: Number(
        usage.active_employee_count
      ),
      limit:
        usage.effective_employee_limit,
      code: "EMPLOYEE_LIMIT_REACHED"
    },
    USER: {
      used: Number(
        usage.active_user_count
      ),
      limit: usage.effective_user_limit,
      code: "USER_LIMIT_REACHED"
    },
    BRANCH: {
      used: Number(
        usage.active_branch_count
      ),
      limit: usage.effective_branch_limit,
      code: "BRANCH_LIMIT_REACHED"
    }
  } as const;

  const selected = values[resource];

  if (
    selected.limit !== null &&
    selected.used >= selected.limit
  ) {
    throw new AppError({
      message:
        `The subscription ${resource.toLowerCase()} limit has been reached`,
      statusCode: 409,
      code: selected.code,
      details: {
        resource,
        used: selected.used,
        limit: selected.limit
      }
    });
  }
}

/**
 * Performs the subscription and quota validation inside the caller's
 * database transaction. Locking the company row serialises all quota-
 * consuming operations for the same tenant and prevents concurrent
 * requests from exceeding the purchased limit.
 *
 * recordId is supplied for activation updates. An already-active record
 * consumes no additional seat, so ordinary updates remain allowed when
 * the tenant is exactly at its limit.
 */
export async function requireQuotaAvailableUsingConnection(
  connection: PoolConnection,
  companyId: string,
  resource: SubscriptionQuotaResource,
  recordId: string | null,
  consumesQuota: boolean
): Promise<void> {
  const companyRows =
    await connection.query(
      `
        SELECT
            company_id,
            is_active
        FROM companies
        WHERE company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

  const company =
    companyRows[0] as
      | LockedCompanyRow
      | undefined;

  if (!company) {
    throw new AppError({
      message: "Company was not found",
      statusCode: 404,
      code: "COMPANY_NOT_FOUND"
    });
  }

  if (!databaseBoolean(company.is_active)) {
    throw new AppError({
      message:
        "The selected company is inactive",
      statusCode: 403,
      code: "COMPANY_INACTIVE"
    });
  }

  const subscriptionRows =
    await connection.query(
      `
        SELECT
            subscription.subscription_id,
            subscription.subscription_status,
            subscription.trial_end_date,
            subscription.subscription_end_date,

            COALESCE(
              subscription.employee_limit_override,
              plan.maximum_employees
            ) AS effective_employee_limit,

            COALESCE(
              subscription.user_limit_override,
              plan.maximum_users
            ) AS effective_user_limit,

            COALESCE(
              subscription.branch_limit_override,
              plan.maximum_branches
            ) AS effective_branch_limit

        FROM company_subscriptions subscription

        INNER JOIN subscription_plans plan
            ON plan.plan_id =
               subscription.plan_id

        WHERE subscription.company_id = ?
          AND subscription.is_current = 1

        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

  const subscription =
    subscriptionRows[0] as
      | LockedSubscriptionRow
      | undefined;

  if (!subscription) {
    throw new AppError({
      message:
        "A current subscription is required",
      statusCode: 403,
      code: "SUBSCRIPTION_REQUIRED"
    });
  }

  assertSubscriptionStatus(
    subscription
  );

  if (!consumesQuota) {
    return;
  }

  const resourceSettings = {
    EMPLOYEE: {
      tableName: "employees",
      idColumn: "employee_id",
      limit:
        numericLimit(
          subscription
            .effective_employee_limit
        ),
      errorCode:
        "EMPLOYEE_LIMIT_REACHED",
      label: "employee"
    },
    USER: {
      tableName: "users",
      idColumn: "user_id",
      limit:
        numericLimit(
          subscription
            .effective_user_limit
        ),
      errorCode:
        "USER_LIMIT_REACHED",
      label: "user"
    },
    BRANCH: {
      tableName: "branches",
      idColumn: "branch_id",
      limit:
        numericLimit(
          subscription
            .effective_branch_limit
        ),
      errorCode:
        "BRANCH_LIMIT_REACHED",
      label: "branch"
    }
  } as const;

  const selected =
    resourceSettings[resource];

  if (selected.limit === null) {
    return;
  }

  const recordActiveExpression =
    recordId === null
      ? "0"
      : `
          COALESCE(
            MAX(
              CASE
                WHEN ${selected.idColumn} = ?
                  THEN 1
                ELSE 0
              END
            ),
            0
          )
        `;

  const countValues: unknown[] = [];

  if (recordId !== null) {
    countValues.push(recordId);
  }

  countValues.push(companyId);

  const countRows =
    await connection.query(
      `
        SELECT
            COUNT(*) AS used_count,
            ${recordActiveExpression}
              AS record_is_already_active
        FROM ${selected.tableName}
        WHERE company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
      `,
      countValues
    );

  const count =
    countRows[0] as
      | QuotaCountRow
      | undefined;

  const used = Number(
    count?.used_count ?? 0
  );

  const recordIsAlreadyActive =
    databaseBoolean(
      count?.record_is_already_active ?? 0
    );

  if (recordIsAlreadyActive) {
    return;
  }

  if (used >= selected.limit) {
    throw new AppError({
      message:
        `The subscription ${selected.label} limit has been reached`,
      statusCode: 409,
      code: selected.errorCode,
      details: {
        resource,
        used,
        limit: selected.limit
      }
    });
  }
}

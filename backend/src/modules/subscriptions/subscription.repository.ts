import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateCompanySubscriptionInput,
  CreateSubscriptionPlanInput,
  ListCompanyAdministratorsQuery,
  ListSubscriptionPlansQuery,
  ProvisionCompanyAdministratorInput,
  ReplacePlanFeaturesInput,
  UpdateCompanySubscriptionInput,
  UpdateSubscriptionPlanInput
} from "./subscription.schema.js";

import {
  SubscriptionRuleError
} from "./subscription.types.js";

import type {
  CompanyAdministratorDatabaseRow,
  CompanyUsageDatabaseRow,
  CurrentSubscriptionDatabaseRow,
  EffectiveFeatureDatabaseRow,
  FeatureFlagDatabaseRow,
  PlanFeatureDatabaseRow,
  RequestMetadata,
  SubscriptionActor,
  SubscriptionPlanDatabaseRow
} from "./subscription.types.js";

interface InsertResult {
  insertId:
    | string
    | number
    | bigint;
}

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? String(currentValue)
        : currentValue
  );
}

function todayDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function databaseDateOnly(
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

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string | null;
    actor: SubscriptionActor;
    actionName: string;
    tableName: string;
    recordId: string;
    oldValues?: unknown;
    newValues?: unknown;
    requestMethod: string;
    requestPath: string;
    metadata: RequestMetadata;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO activity_logs (
          company_id,
          user_id,
          module_name,
          action_name,
          table_name,
          record_id,
          old_values,
          new_values,
          request_method,
          request_path,
          ip_address,
          user_agent
      )
      VALUES (
          ?, ?, 'subscription', ?, ?, ?,
          ?, ?, ?, ?, ?, ?
      )
    `,
    [
      input.companyId,
      input.actor.userId,
      input.actionName,
      input.tableName,
      input.recordId,
      input.oldValues === undefined
        ? null
        : safeJson(input.oldValues),
      input.newValues === undefined
        ? null
        : safeJson(input.newValues),
      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

const planSelectColumns = `
  plan.plan_id,
  plan.plan_code,
  plan.plan_name,
  plan.description,
  plan.maximum_employees,
  plan.maximum_branches,
  plan.maximum_users,
  plan.storage_limit_mb,
  plan.monthly_price,
  plan.annual_price,
  plan.currency_code,
  plan.trial_days,
  plan.is_active,
  (
    SELECT COUNT(*)
    FROM subscription_plan_features plan_feature
    WHERE plan_feature.plan_id = plan.plan_id
      AND plan_feature.is_enabled = 1
  ) AS feature_count,
  plan.created_at,
  plan.updated_at
`;

export async function listSubscriptionPlanRecords(
  query: ListSubscriptionPlansQuery
): Promise<{
  plans: SubscriptionPlanDatabaseRow[];
  total: number;
}> {
  const conditions: string[] = ["1 = 1"];
  const values: unknown[] = [];

  if (query.search !== undefined) {
    const search = `%${query.search}%`;

    conditions.push(`
      (
        plan.plan_code LIKE ?
        OR plan.plan_name LIKE ?
        OR plan.description LIKE ?
      )
    `);

    values.push(search, search, search);
  }

  if (query.isActive !== undefined) {
    conditions.push("plan.is_active = ?");
    values.push(query.isActive ? 1 : 0);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(*) AS total
      FROM subscription_plans plan
      WHERE ${whereClause}
    `,
    values
  );

  const total = Number(
    String(
      (countRows[0] as {
        total: string | number | bigint;
      }).total
    )
  );

  const offset =
    (query.page - 1) * query.limit;

  const rows = await databasePool.query(
    `
      SELECT
        ${planSelectColumns}
      FROM subscription_plans plan
      WHERE ${whereClause}
      ORDER BY
        plan.${query.sortBy}
        ${query.sortOrder}
      LIMIT ? OFFSET ?
    `,
    [
      ...values,
      query.limit,
      offset
    ]
  );

  return {
    plans:
      rows as SubscriptionPlanDatabaseRow[],
    total
  };
}

export async function findSubscriptionPlanById(
  planId: string
): Promise<SubscriptionPlanDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      SELECT
        ${planSelectColumns}
      FROM subscription_plans plan
      WHERE plan.plan_id = ?
      LIMIT 1
    `,
    [planId]
  );

  return (
    rows[0] as
      | SubscriptionPlanDatabaseRow
      | undefined
  ) ?? null;
}

export async function findSubscriptionPlanIdByCode(
  planCode: string,
  excludePlanId?: string
): Promise<string | null> {
  let sql = `
    SELECT plan_id
    FROM subscription_plans
    WHERE plan_code = ?
  `;

  const values: unknown[] = [planCode];

  if (excludePlanId !== undefined) {
    sql += " AND plan_id <> ?";
    values.push(excludePlanId);
  }

  sql += " LIMIT 1";

  const rows = await databasePool.query(
    sql,
    values
  );

  const row = rows[0] as
    | {
        plan_id:
          | string
          | number
          | bigint;
      }
    | undefined;

  return row
    ? String(row.plan_id)
    : null;
}

export async function listFeatureFlagRecords(): Promise<FeatureFlagDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      SELECT
          feature_flag_id,
          feature_code,
          feature_name,
          description,
          module_name,
          default_enabled,
          minimum_plan_code,
          is_active,
          created_at,
          updated_at
      FROM feature_flags
      ORDER BY
          module_name ASC,
          feature_name ASC
    `
  );

  return rows as FeatureFlagDatabaseRow[];
}

export async function listPlanFeatureRecords(
  planId: string
): Promise<PlanFeatureDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      SELECT
          plan_feature.subscription_plan_feature_id,
          plan_feature.plan_id,
          plan_feature.feature_flag_id,
          feature.feature_code,
          feature.feature_name,
          feature.module_name,
          plan_feature.is_enabled,
          plan_feature.configuration_payload,
          plan_feature.created_at,
          plan_feature.updated_at
      FROM subscription_plan_features plan_feature
      INNER JOIN feature_flags feature
        ON feature.feature_flag_id =
           plan_feature.feature_flag_id
      WHERE plan_feature.plan_id = ?
      ORDER BY
          feature.module_name ASC,
          feature.feature_name ASC
    `,
    [planId]
  );

  return rows as PlanFeatureDatabaseRow[];
}

export async function createSubscriptionPlanRecord(
  input: CreateSubscriptionPlanInput,
  actor: SubscriptionActor,
  metadata: RequestMetadata
): Promise<SubscriptionPlanDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const result = await connection.query(
      `
        INSERT INTO subscription_plans (
            plan_code,
            plan_name,
            description,
            maximum_employees,
            maximum_branches,
            maximum_users,
            storage_limit_mb,
            monthly_price,
            annual_price,
            currency_code,
            trial_days,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.planCode,
        input.planName,
        input.description ?? null,
        input.maximumEmployees ?? null,
        input.maximumBranches ?? null,
        input.maximumUsers ?? null,
        input.storageLimitMb ?? null,
        input.monthlyPrice,
        input.annualPrice,
        input.currencyCode,
        input.trialDays,
        input.isActive ? 1 : 0
      ]
    ) as unknown as InsertResult;

    const planId = String(result.insertId);

    const rows = await connection.query(
      `
        SELECT
          ${planSelectColumns}
        FROM subscription_plans plan
        WHERE plan.plan_id = ?
        LIMIT 1
      `,
      [planId]
    );

    const created = rows[0] as
      | SubscriptionPlanDatabaseRow
      | undefined;

    if (!created) {
      throw new Error(
        "CREATED_SUBSCRIPTION_PLAN_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId: null,
      actor,
      actionName:
        "subscription_plan_created",
      tableName: "subscription_plans",
      recordId: planId,
      newValues: created,
      requestMethod: "POST",
      requestPath:
        "/api/v1/subscriptions/plans",
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSubscriptionPlanRecord(
  planId: string,
  input: UpdateSubscriptionPlanInput,
  actor: SubscriptionActor,
  metadata: RequestMetadata
): Promise<SubscriptionPlanDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentRows = await connection.query(
      `
        SELECT
          ${planSelectColumns}
        FROM subscription_plans plan
        WHERE plan.plan_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [planId]
    );

    const current = currentRows[0] as
      | SubscriptionPlanDatabaseRow
      | undefined;

    if (!current) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const add = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };

    if (input.planCode !== undefined) {
      add("plan_code", input.planCode);
    }
    if (input.planName !== undefined) {
      add("plan_name", input.planName);
    }
    if (input.description !== undefined) {
      add("description", input.description);
    }
    if (input.maximumEmployees !== undefined) {
      add(
        "maximum_employees",
        input.maximumEmployees
      );
    }
    if (input.maximumBranches !== undefined) {
      add(
        "maximum_branches",
        input.maximumBranches
      );
    }
    if (input.maximumUsers !== undefined) {
      add("maximum_users", input.maximumUsers);
    }
    if (input.storageLimitMb !== undefined) {
      add("storage_limit_mb", input.storageLimitMb);
    }
    if (input.monthlyPrice !== undefined) {
      add("monthly_price", input.monthlyPrice);
    }
    if (input.annualPrice !== undefined) {
      add("annual_price", input.annualPrice);
    }
    if (input.currencyCode !== undefined) {
      add("currency_code", input.currencyCode);
    }
    if (input.trialDays !== undefined) {
      add("trial_days", input.trialDays);
    }
    if (input.isActive !== undefined) {
      add("is_active", input.isActive ? 1 : 0);
    }

    values.push(planId);

    await connection.query(
      `
        UPDATE subscription_plans
        SET ${assignments.join(", ")}
        WHERE plan_id = ?
      `,
      values
    );

    const updatedRows = await connection.query(
      `
        SELECT
          ${planSelectColumns}
        FROM subscription_plans plan
        WHERE plan.plan_id = ?
        LIMIT 1
      `,
      [planId]
    );

    const updated = updatedRows[0] as
      | SubscriptionPlanDatabaseRow
      | undefined;

    if (!updated) {
      throw new Error(
        "UPDATED_SUBSCRIPTION_PLAN_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId: null,
      actor,
      actionName:
        "subscription_plan_updated",
      tableName: "subscription_plans",
      recordId: planId,
      oldValues: current,
      newValues: updated,
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/subscriptions/plans/${planId}`,
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function replacePlanFeatureRecords(
  planId: string,
  input: ReplacePlanFeaturesInput,
  actor: SubscriptionActor,
  metadata: RequestMetadata
): Promise<PlanFeatureDatabaseRow[] | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const planRows = await connection.query(
      `
        SELECT plan_id
        FROM subscription_plans
        WHERE plan_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [planId]
    );

    if (planRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    const oldRows = await connection.query(
      `
        SELECT *
        FROM subscription_plan_features
        WHERE plan_id = ?
        FOR UPDATE
      `,
      [planId]
    );

    const featureCodes = input.features.map(
      feature => feature.featureCode
    );

    let featureRows: Array<{
      feature_flag_id:
        | string
        | number
        | bigint;
      feature_code: string;
    }> = [];

    if (featureCodes.length > 0) {
      const placeholders = featureCodes
        .map(() => "?")
        .join(", ");

      featureRows = await connection.query(
        `
          SELECT
              feature_flag_id,
              feature_code
          FROM feature_flags
          WHERE feature_code IN (${placeholders})
            AND is_active = 1
        `,
        featureCodes
      ) as Array<{
        feature_flag_id:
          | string
          | number
          | bigint;
        feature_code: string;
      }>;

      if (
        featureRows.length !==
        featureCodes.length
      ) {
        throw new SubscriptionRuleError(
          "INVALID_FEATURE_CODE"
        );
      }
    }

    await connection.query(
      `
        DELETE FROM subscription_plan_features
        WHERE plan_id = ?
      `,
      [planId]
    );

    const featureIdByCode = new Map(
      featureRows.map(row => [
        row.feature_code,
        String(row.feature_flag_id)
      ])
    );

    for (const feature of input.features) {
      const featureFlagId =
        featureIdByCode.get(
          feature.featureCode
        );

      if (!featureFlagId) {
        throw new SubscriptionRuleError(
          "INVALID_FEATURE_CODE"
        );
      }

      await connection.query(
        `
          INSERT INTO subscription_plan_features (
              plan_id,
              feature_flag_id,
              is_enabled,
              configuration_payload
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          planId,
          featureFlagId,
          feature.isEnabled ? 1 : 0,
          feature.configuration === undefined ||
          feature.configuration === null
            ? null
            : safeJson(feature.configuration)
        ]
      );
    }

    const updatedRows = await connection.query(
      `
        SELECT
            plan_feature.subscription_plan_feature_id,
            plan_feature.plan_id,
            plan_feature.feature_flag_id,
            feature.feature_code,
            feature.feature_name,
            feature.module_name,
            plan_feature.is_enabled,
            plan_feature.configuration_payload,
            plan_feature.created_at,
            plan_feature.updated_at
        FROM subscription_plan_features plan_feature
        INNER JOIN feature_flags feature
          ON feature.feature_flag_id =
             plan_feature.feature_flag_id
        WHERE plan_feature.plan_id = ?
        ORDER BY
            feature.module_name ASC,
            feature.feature_name ASC
      `,
      [planId]
    );

    await insertActivityLog(connection, {
      companyId: null,
      actor,
      actionName:
        "subscription_plan_features_replaced",
      tableName:
        "subscription_plan_features",
      recordId: planId,
      oldValues: oldRows,
      newValues: updatedRows,
      requestMethod: "PUT",
      requestPath:
        `/api/v1/subscriptions/plans/${planId}/features`,
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return updatedRows as PlanFeatureDatabaseRow[];
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function findCurrentCompanySubscriptionRecord(
  companyId: string
): Promise<CurrentSubscriptionDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      SELECT *
      FROM company_current_subscription_details
      WHERE company_id = ?
      LIMIT 1
    `,
    [companyId]
  );

  return (
    rows[0] as
      | CurrentSubscriptionDatabaseRow
      | undefined
  ) ?? null;
}

async function selectCurrentSubscriptionUsingConnection(
  connection: PoolConnection,
  companyId: string
): Promise<CurrentSubscriptionDatabaseRow | null> {
  const rows = await connection.query(
    `
      SELECT *
      FROM company_current_subscription_details
      WHERE company_id = ?
      LIMIT 1
    `,
    [companyId]
  );

  return (
    rows[0] as
      | CurrentSubscriptionDatabaseRow
      | undefined
  ) ?? null;
}

// edited by wali: Record the actual route used for each subscription creation.
export async function createCurrentCompanySubscriptionRecord(
  companyId: string,
  input: CreateCompanySubscriptionInput,
  actor: SubscriptionActor,
  metadata: RequestMetadata,
  auditRequestPath = "/api/v1/companies/" + companyId + "/subscription"
): Promise<CurrentSubscriptionDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const companyRows = await connection.query(
      `
        SELECT company_id, is_active, deleted_at
        FROM companies
        WHERE company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

    const company = companyRows[0] as
      | {
          company_id:
            | string
            | number
            | bigint;
          is_active: number | boolean;
          deleted_at: Date | string | null;
        }
      | undefined;

    if (!company) {
      throw new SubscriptionRuleError(
        "COMPANY_NOT_FOUND"
      );
    }

    const planRows = await connection.query(
      `
        SELECT plan_id, is_active
        FROM subscription_plans
        WHERE plan_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.planId]
    );

    const plan = planRows[0] as
      | {
          plan_id:
            | string
            | number
            | bigint;
          is_active: number | boolean;
        }
      | undefined;

    if (!plan) {
      throw new SubscriptionRuleError(
        "SUBSCRIPTION_PLAN_NOT_FOUND"
      );
    }

    if (
      plan.is_active !== true &&
      Number(plan.is_active) !== 1
    ) {
      throw new SubscriptionRuleError(
        "SUBSCRIPTION_PLAN_INACTIVE"
      );
    }

    const oldRows = await connection.query(
      `
        SELECT *
        FROM company_subscriptions
        WHERE company_id = ?
          AND is_current = 1
        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

    const oldCurrent = oldRows[0] as
      | Record<string, unknown>
      | undefined;

    await connection.query(
      `
        UPDATE company_subscriptions
        SET is_current = NULL
        WHERE company_id = ?
          AND is_current = 1
      `,
      [companyId]
    );

    const result = await connection.query(
      `
        INSERT INTO company_subscriptions (
            company_id,
            plan_id,
            employee_limit_override,
            branch_limit_override,
            user_limit_override,
            storage_limit_mb_override,
            subscription_status,
            billing_cycle,
            trial_start_date,
            trial_end_date,
            subscription_start_date,
            subscription_end_date,
            next_billing_date,
            agreed_price,
            currency_code,
            auto_renew,
            is_current,
            remarks
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, 1, ?
        )
      `,
      [
        companyId,
        input.planId,
        input.employeeLimitOverride ?? null,
        input.branchLimitOverride ?? null,
        input.userLimitOverride ?? null,
        input.storageLimitMbOverride ?? null,
        input.subscriptionStatus,
        input.billingCycle,
        input.trialStartDate ?? null,
        input.trialEndDate ?? null,
        input.subscriptionStartDate,
        input.subscriptionEndDate ?? null,
        input.nextBillingDate ?? null,
        input.agreedPrice,
        input.currencyCode,
        input.autoRenew ? 1 : 0,
        input.remarks ?? null
      ]
    ) as unknown as InsertResult;

    const subscriptionId =
      String(result.insertId);

    const created =
      await selectCurrentSubscriptionUsingConnection(
        connection,
        companyId
      );

    if (!created) {
      throw new Error(
        "CREATED_CURRENT_SUBSCRIPTION_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "company_subscription_created",
      tableName: "company_subscriptions",
      recordId: subscriptionId,
      ...(oldCurrent !== undefined
        ? { oldValues: oldCurrent }
        : {}),
      newValues: created,
      requestMethod: "POST",
      requestPath: auditRequestPath,
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCurrentCompanySubscriptionRecord(
  companyId: string,
  input: UpdateCompanySubscriptionInput,
  actor: SubscriptionActor,
  metadata: RequestMetadata
): Promise<CurrentSubscriptionDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentRows = await connection.query(
      `
        SELECT *
        FROM company_subscriptions
        WHERE company_id = ?
          AND is_current = 1
        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

    const current = currentRows[0] as
      | Record<string, unknown>
      | undefined;

    if (!current) {
      await connection.rollback();
      transactionStarted = false;
      return null;
    }

    if (input.planId !== undefined) {
      const planRows = await connection.query(
        `
          SELECT plan_id, is_active
          FROM subscription_plans
          WHERE plan_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [input.planId]
      );

      const plan = planRows[0] as
        | {
            plan_id:
              | string
              | number
              | bigint;
            is_active: number | boolean;
          }
        | undefined;

      if (!plan) {
        throw new SubscriptionRuleError(
          "SUBSCRIPTION_PLAN_NOT_FOUND"
        );
      }

      if (
        plan.is_active !== true &&
        Number(plan.is_active) !== 1
      ) {
        throw new SubscriptionRuleError(
          "SUBSCRIPTION_PLAN_INACTIVE"
        );
      }
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const add = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(`${column} = ?`);
      values.push(value);
    };

    if (input.planId !== undefined) {
      add("plan_id", input.planId);
    }
    if (input.subscriptionStatus !== undefined) {
      add(
        "subscription_status",
        input.subscriptionStatus
      );
    }
    if (input.billingCycle !== undefined) {
      add("billing_cycle", input.billingCycle);
    }
    if (input.trialStartDate !== undefined) {
      add(
        "trial_start_date",
        input.trialStartDate
      );
    }
    if (input.trialEndDate !== undefined) {
      add("trial_end_date", input.trialEndDate);
    }
    if (
      input.subscriptionStartDate !==
      undefined
    ) {
      add(
        "subscription_start_date",
        input.subscriptionStartDate
      );
    }
    if (
      input.subscriptionEndDate !==
      undefined
    ) {
      add(
        "subscription_end_date",
        input.subscriptionEndDate
      );
    }
    if (input.nextBillingDate !== undefined) {
      add(
        "next_billing_date",
        input.nextBillingDate
      );
    }
    if (input.agreedPrice !== undefined) {
      add("agreed_price", input.agreedPrice);
    }
    if (input.currencyCode !== undefined) {
      add("currency_code", input.currencyCode);
    }
    if (input.autoRenew !== undefined) {
      add("auto_renew", input.autoRenew ? 1 : 0);
    }
    if (
      input.employeeLimitOverride !==
      undefined
    ) {
      add(
        "employee_limit_override",
        input.employeeLimitOverride
      );
    }
    if (
      input.branchLimitOverride !==
      undefined
    ) {
      add(
        "branch_limit_override",
        input.branchLimitOverride
      );
    }
    if (input.userLimitOverride !== undefined) {
      add(
        "user_limit_override",
        input.userLimitOverride
      );
    }
    if (
      input.storageLimitMbOverride !==
      undefined
    ) {
      add(
        "storage_limit_mb_override",
        input.storageLimitMbOverride
      );
    }
    if (input.remarks !== undefined) {
      add("remarks", input.remarks);
    }

    values.push(companyId);

    await connection.query(
      `
        UPDATE company_subscriptions
        SET ${assignments.join(", ")}
        WHERE company_id = ?
          AND is_current = 1
      `,
      values
    );

    const updated =
      await selectCurrentSubscriptionUsingConnection(
        connection,
        companyId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_CURRENT_SUBSCRIPTION_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "company_subscription_updated",
      tableName: "company_subscriptions",
      recordId: String(current.subscription_id),
      oldValues: current,
      newValues: updated,
      requestMethod: "PATCH",
      requestPath:
        `/api/v1/companies/${companyId}/subscription`,
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function getCompanyUsageRecord(
  companyId: string
): Promise<CompanyUsageDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      SELECT
          company.company_id,
          company.company_code,
          company.display_name,
          company.is_active AS company_is_active,

          subscription.subscription_id,
          subscription.plan_id,
          subscription.plan_code,
          subscription.plan_name,
          subscription.subscription_status,
          subscription.trial_end_date,
          subscription.subscription_end_date,
          subscription.effective_employee_limit,
          subscription.effective_branch_limit,
          subscription.effective_user_limit,
          subscription.effective_storage_limit_mb,

          (
            SELECT COUNT(*)
            FROM employees employee
            WHERE employee.company_id = company.company_id
              AND employee.is_active = 1
              AND employee.deleted_at IS NULL
          ) AS active_employee_count,

          (
            SELECT COUNT(*)
            FROM users user_account
            WHERE user_account.company_id = company.company_id
              AND user_account.is_active = 1
              AND user_account.deleted_at IS NULL
          ) AS active_user_count,

          (
            SELECT COUNT(*)
            FROM branches branch
            WHERE branch.company_id = company.company_id
              AND branch.is_active = 1
              AND branch.deleted_at IS NULL
          ) AS active_branch_count,

          COALESCE(
            (
              SELECT usage_snapshot.file_storage_bytes
              FROM tenant_usage_snapshots usage_snapshot
              WHERE usage_snapshot.company_id = company.company_id
              ORDER BY usage_snapshot.snapshot_date DESC
              LIMIT 1
            ),
            0
          ) AS file_storage_bytes

      FROM companies company

      LEFT JOIN company_current_subscription_details subscription
        ON subscription.company_id = company.company_id

      WHERE company.company_id = ?
        AND company.deleted_at IS NULL

      LIMIT 1
    `,
    [companyId]
  );

  return (
    rows[0] as
      | CompanyUsageDatabaseRow
      | undefined
  ) ?? null;
}

export async function listEffectiveCompanyFeatureRecords(
  companyId: string
): Promise<EffectiveFeatureDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      SELECT
          feature.feature_flag_id,
          feature.feature_code,
          feature.feature_name,
          feature.description,
          feature.module_name,

          COALESCE(
            company_override.is_enabled,
            plan_feature.is_enabled,
            feature.default_enabled
          ) AS effective_enabled,

          COALESCE(
            company_override.configuration_payload,
            plan_feature.configuration_payload
          ) AS configuration_payload,

          CASE
            WHEN company_override.company_feature_flag_id
                 IS NOT NULL
              THEN 'COMPANY_OVERRIDE'
            WHEN plan_feature.subscription_plan_feature_id
                 IS NOT NULL
              THEN 'PLAN'
            ELSE 'DEFAULT'
          END AS entitlement_source

      FROM feature_flags feature

      LEFT JOIN company_current_subscription_details subscription
        ON subscription.company_id = ?

      LEFT JOIN subscription_plan_features plan_feature
        ON plan_feature.plan_id = subscription.plan_id
       AND plan_feature.feature_flag_id =
           feature.feature_flag_id

      LEFT JOIN company_feature_flags company_override
        ON company_override.company_id = ?
       AND company_override.feature_flag_id =
           feature.feature_flag_id
       AND (
         company_override.enabled_from IS NULL
         OR company_override.enabled_from <= CURRENT_TIMESTAMP
       )
       AND (
         company_override.enabled_until IS NULL
         OR company_override.enabled_until >= CURRENT_TIMESTAMP
       )

      WHERE feature.is_active = 1

      ORDER BY
          feature.module_name ASC,
          feature.feature_name ASC
    `,
    [companyId, companyId]
  );

  return rows as EffectiveFeatureDatabaseRow[];
}

export async function listCompanyAdministratorRecords(
  companyId: string,
  query: ListCompanyAdministratorsQuery
): Promise<{
  administrators:
    CompanyAdministratorDatabaseRow[];
  total: number;
}> {
  const conditions: string[] = [
    "user_account.company_id = ?",
    "user_account.deleted_at IS NULL",
    "role.role_code = 'COMPANY_ADMIN'",
    "user_role.company_id = ?",
    "user_role.is_active = 1"
  ];

  const values: unknown[] = [
    companyId,
    companyId
  ];

  if (query.search !== undefined) {
    const search = `%${query.search}%`;

    conditions.push(`
      (
        user_account.username LIKE ?
        OR user_account.email LIKE ?
      )
    `);

    values.push(search, search);
  }

  if (query.isActive !== undefined) {
    conditions.push(
      "user_account.is_active = ?"
    );

    values.push(query.isActive ? 1 : 0);
  }

  const whereClause = conditions.join(" AND ");

  const countRows = await databasePool.query(
    `
      SELECT COUNT(DISTINCT user_account.user_id)
        AS total
      FROM users user_account
      INNER JOIN user_roles user_role
        ON user_role.user_id =
           user_account.user_id
      INNER JOIN roles role
        ON role.role_id = user_role.role_id
      WHERE ${whereClause}
    `,
    values
  );

  const total = Number(
    String(
      (countRows[0] as {
        total: string | number | bigint;
      }).total
    )
  );

  const offset =
    (query.page - 1) * query.limit;

  const rows = await databasePool.query(
    `
      SELECT
          user_account.user_id,
          user_account.company_id,
          user_account.username,
          user_account.email,
          user_account.is_active,
          user_account.is_email_verified,
          user_account.must_change_password,
          user_account.last_login_at,
          user_account.created_at,
          user_account.updated_at,
          role.role_id,
          role.role_code,
          role.role_name,
          user_role.assigned_at
      FROM users user_account
      INNER JOIN user_roles user_role
        ON user_role.user_id =
           user_account.user_id
      INNER JOIN roles role
        ON role.role_id = user_role.role_id
      WHERE ${whereClause}
      ORDER BY user_account.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [
      ...values,
      query.limit,
      offset
    ]
  );

  return {
    administrators:
      rows as CompanyAdministratorDatabaseRow[],
    total
  };
}

export async function provisionCompanyAdministratorRecord(
  companyId: string,
  input: ProvisionCompanyAdministratorInput,
  passwordHash: string,
  actor: SubscriptionActor,
  metadata: RequestMetadata
): Promise<CompanyAdministratorDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const companyRows = await connection.query(
      `
        SELECT
            company_id,
            is_active,
            deleted_at
        FROM companies
        WHERE company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [companyId]
    );

    const company = companyRows[0] as
      | {
          company_id:
            | string
            | number
            | bigint;
          is_active: number | boolean;
          deleted_at: Date | string | null;
        }
      | undefined;

    if (!company) {
      throw new SubscriptionRuleError(
        "COMPANY_NOT_FOUND"
      );
    }

    if (
      company.is_active !== true &&
      Number(company.is_active) !== 1
    ) {
      throw new SubscriptionRuleError(
        "COMPANY_INACTIVE"
      );
    }

    const subscriptionRows =
      await connection.query(
        `
          SELECT
              subscription_status,
              trial_end_date,
              subscription_end_date,
              effective_user_limit
          FROM company_current_subscription_details
          WHERE company_id = ?
          LIMIT 1
        `,
        [companyId]
      );

    const subscription =
      subscriptionRows[0] as
        | {
            subscription_status: string;
            trial_end_date:
              | Date
              | string
              | null;
            subscription_end_date:
              | Date
              | string
              | null;
            effective_user_limit:
              | number
              | null;
          }
        | undefined;

    if (!subscription) {
      throw new SubscriptionRuleError(
        "SUBSCRIPTION_REQUIRED"
      );
    }

    if (
      ![
        "TRIAL",
        "ACTIVE"
      ].includes(
        subscription.subscription_status
      )
    ) {
      throw new SubscriptionRuleError(
        "SUBSCRIPTION_INACTIVE",
        {
          status:
            subscription.subscription_status
        }
      );
    }

    const today = todayDateOnly();

    const expiryDate =
      subscription.subscription_status ===
      "TRIAL"
        ? databaseDateOnly(
            subscription.trial_end_date
          )
        : databaseDateOnly(
            subscription.subscription_end_date
          );

    if (
      expiryDate !== null &&
      expiryDate < today
    ) {
      throw new SubscriptionRuleError(
        "SUBSCRIPTION_EXPIRED",
        { expiryDate }
      );
    }

    const countRows = await connection.query(
      `
        SELECT COUNT(*) AS total
        FROM users
        WHERE company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
      `,
      [companyId]
    );

    const activeUserCount = Number(
      String(
        (countRows[0] as {
          total:
            | string
            | number
            | bigint;
        }).total
      )
    );

    if (
      subscription.effective_user_limit !==
        null &&
      activeUserCount >=
        subscription.effective_user_limit
    ) {
      throw new SubscriptionRuleError(
        "USER_LIMIT_REACHED",
        {
          limit:
            subscription.effective_user_limit,
          activeUserCount
        }
      );
    }

    const duplicateRows = await connection.query(
      `
        SELECT user_id, username, email
        FROM users
        WHERE username = ?
           OR email = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.username, input.email]
    );

    const duplicate = duplicateRows[0] as
      | {
          user_id:
            | string
            | number
            | bigint;
          username: string;
          email: string | null;
        }
      | undefined;

    if (duplicate) {
      if (duplicate.username === input.username) {
        throw new SubscriptionRuleError(
          "USERNAME_ALREADY_EXISTS"
        );
      }

      throw new SubscriptionRuleError(
        "EMAIL_ALREADY_EXISTS"
      );
    }

    const roleRows = await connection.query(
      `
        SELECT role_id, role_code, role_name
        FROM roles
        WHERE role_code = 'COMPANY_ADMIN'
          AND is_active = 1
        LIMIT 1
        FOR UPDATE
      `
    );

    const role = roleRows[0] as
      | {
          role_id:
            | string
            | number
            | bigint;
          role_code: string;
          role_name: string;
        }
      | undefined;

    if (!role) {
      throw new SubscriptionRuleError(
        "COMPANY_ADMIN_ROLE_NOT_FOUND"
      );
    }

    const userResult = await connection.query(
      `
        INSERT INTO users (
            company_id,
            employee_id,
            username,
            email,
            password_hash,
            is_platform_admin,
            is_active,
            is_email_verified,
            must_change_password,
            failed_login_attempts,
            password_changed_at
        )
        VALUES (
            ?, NULL, ?, ?, ?,
            0, 1, ?, 1, 0,
            CURRENT_TIMESTAMP
        )
      `,
      [
        companyId,
        input.username,
        input.email,
        passwordHash,
        input.isEmailVerified ? 1 : 0
      ]
    ) as unknown as InsertResult;

    const userId =
      String(userResult.insertId);

    await connection.query(
      `
        INSERT INTO user_roles (
            user_id,
            role_id,
            company_id,
            branch_id,
            department_id,
            is_active
        )
        VALUES (?, ?, ?, NULL, NULL, 1)
      `,
      [
        userId,
        String(role.role_id),
        companyId
      ]
    );

    const createdRows = await connection.query(
      `
        SELECT
            user_account.user_id,
            user_account.company_id,
            user_account.username,
            user_account.email,
            user_account.is_active,
            user_account.is_email_verified,
            user_account.must_change_password,
            user_account.last_login_at,
            user_account.created_at,
            user_account.updated_at,
            role.role_id,
            role.role_code,
            role.role_name,
            user_role.assigned_at
        FROM users user_account
        INNER JOIN user_roles user_role
          ON user_role.user_id =
             user_account.user_id
        INNER JOIN roles role
          ON role.role_id = user_role.role_id
        WHERE user_account.user_id = ?
          AND user_role.company_id = ?
          AND role.role_code = 'COMPANY_ADMIN'
        LIMIT 1
      `,
      [userId, companyId]
    );

    const created = createdRows[0] as
      | CompanyAdministratorDatabaseRow
      | undefined;

    if (!created) {
      throw new Error(
        "PROVISIONED_COMPANY_ADMIN_NOT_FOUND"
      );
    }

    await insertActivityLog(connection, {
      companyId,
      actor,
      actionName:
        "company_administrator_provisioned",
      tableName: "users",
      recordId: userId,
      newValues: {
        userId,
        companyId,
        username: input.username,
        email: input.email,
        roleCode: "COMPANY_ADMIN",
        mustChangePassword: true
      },
      requestMethod: "POST",
      requestPath:
        `/api/v1/companies/${companyId}/provision-admin`,
      metadata
    });

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

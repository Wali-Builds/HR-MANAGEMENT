import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateEmployeeBankAccountRecord,
  CreateEmployeeTaxProfileRecord,
  EmployeeBankAccountDatabaseRow,
  EmployeeFinanceActor,
  EmployeeFinanceOwnerDatabaseRow,
  EmployeeTaxProfileDatabaseRow,
  RequestMetadata,
  TaxRuleDatabaseRow,
  UpdateEmployeeBankAccountRecord,
  UpdateEmployeeTaxProfileRecord
} from "./employee-finance.types.js";

interface LockedEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
}

interface BankAccountListFilters {
  search?: string | undefined;
  includeInactive: boolean;
  primaryOnly: boolean;
  verifiedOnly: boolean;
}

interface TaxProfileListFilters {
  status:
    | "ALL"
    | "CURRENT"
    | "HISTORICAL";

  taxRuleId?:
    | string
    | undefined;
}

interface TaxProfilePeriodRow {
  employee_tax_profile_id:
    | string
    | number
    | bigint;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_current:
    | number
    | boolean;
}

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? String(currentValue)
        : Buffer.isBuffer(currentValue)
          ? "[REDACTED_BINARY]"
          : currentValue
  );
}

function databaseDateOnly(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date
    .toISOString()
    .slice(0, 10);
}

async function lockEmployeeRecord(
  connection: PoolConnection,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: EmployeeFinanceActor;
    actionName: string;
    tableName: string;
    recordId: string;

    oldValues?:
      | unknown
      | undefined;

    newValues?:
      | unknown
      | undefined;

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
          ?,
          ?,
          'employee_finance',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
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

/*
 * =========================================================
 * Reusable SELECT statements
 * =========================================================
 */

const employeeBankAccountSelect = `
  SELECT
      ba.bank_account_id,
      ba.company_id,
      ba.employee_id,
      ba.bank_name,
      ba.bank_code,
      ba.branch_name,
      ba.branch_code,
      ba.account_title,
      ba.account_number_last4,
      ba.iban_last4,
      ba.account_type,
      ba.currency_code,
      ba.payment_priority,
      ba.is_primary,
      ba.is_verified,
      ba.is_active,
      ba.verified_by_user_id,

      verifier.username
          AS verifier_username,

      verifier.full_name
          AS verifier_full_name,

      ba.verified_at,
      ba.deleted_at,
      ba.created_at,
      ba.updated_at
  FROM employee_bank_accounts ba
  LEFT JOIN users verifier
      ON verifier.user_id =
         ba.verified_by_user_id
`;

const employeeTaxProfileSelect = `
  SELECT
      etp.employee_tax_profile_id,
      etp.company_id,
      etp.employee_id,
      etp.tax_rule_id,

      tr.tax_rule_code,
      tr.tax_rule_name,
      tr.country_code,
      tr.region_code,
      tr.tax_year_start,
      tr.tax_year_end,
      tr.calculation_method,

      tr.annual_exemption_amount
          AS rule_annual_exemption_amount,

      tr.fixed_rebate_amount
          AS rule_fixed_rebate_amount,

      etp.tax_identifier,
      etp.taxpayer_status,
      etp.annual_tax_credit,
      etp.annual_tax_exemption,
      etp.additional_tax_amount,
      etp.effective_from,
      etp.effective_to,
      etp.is_current,
      etp.created_at,
      etp.updated_at
  FROM employee_tax_profiles etp
  INNER JOIN tax_rules tr
      ON tr.tax_rule_id =
         etp.tax_rule_id
`;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export async function findEmployeeFinanceOwnerById(
  employeeId: string
): Promise<EmployeeFinanceOwnerDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            employee_id,
            company_id,
            employee_code,
            first_name,
            middle_name,
            last_name,
            is_active,
            deleted_at
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeFinanceOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Tax-rule lookups
 * =========================================================
 */

export async function listTaxRuleRecords(
  companyId: string,
  search: string | undefined,
  includeInactive: boolean
): Promise<TaxRuleDatabaseRow[]> {
  const conditions: string[] = [
    "company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  if (search) {
    const searchValue =
      `%${search}%`;

    conditions.push(`
      (
        tax_rule_code LIKE ?
        OR tax_rule_name LIKE ?
        OR country_code LIKE ?
        OR region_code LIKE ?
        OR description LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            tax_rule_id,
            company_id,
            tax_rule_code,
            tax_rule_name,
            country_code,
            region_code,
            tax_year_start,
            tax_year_end,
            calculation_method,
            annual_exemption_amount,
            fixed_rebate_amount,
            description,
            is_active,
            created_at,
            updated_at
        FROM tax_rules
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            tax_year_start DESC,
            tax_rule_name ASC
      `,
      parameters
    );

  return rows as
    TaxRuleDatabaseRow[];
}

export async function findActiveTaxRuleById(
  companyId: string,
  taxRuleId: string
): Promise<TaxRuleDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            tax_rule_id,
            company_id,
            tax_rule_code,
            tax_rule_name,
            country_code,
            region_code,
            tax_year_start,
            tax_year_end,
            calculation_method,
            annual_exemption_amount,
            fixed_rebate_amount,
            description,
            is_active,
            created_at,
            updated_at
        FROM tax_rules
        WHERE tax_rule_id = ?
          AND company_id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [
        taxRuleId,
        companyId
      ]
    );

  return (
    rows[0] as
      | TaxRuleDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Bank-account helpers
 * =========================================================
 */

async function selectEmployeeBankAccountUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  bankAccountId: string,
  lockRecord: boolean
): Promise<EmployeeBankAccountDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeBankAccountSelect}
        WHERE ba.bank_account_id = ?
          AND ba.employee_id = ?
          AND ba.deleted_at IS NULL
        LIMIT 1
        ${lockRecord ? "FOR UPDATE" : ""}
      `,
      [
        bankAccountId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeBankAccountDatabaseRow
      | undefined
  ) ?? null;
}

async function clearPrimaryBankAccounts(
  connection: PoolConnection,
  employeeId: string,
  excludeBankAccountId?: string
): Promise<void> {
  let sql = `
    UPDATE employee_bank_accounts
    SET is_primary = 0
    WHERE employee_id = ?
      AND deleted_at IS NULL
      AND is_primary = 1
  `;

  const parameters: unknown[] = [
    employeeId
  ];

  if (excludeBankAccountId) {
    sql += `
      AND bank_account_id <> ?
    `;

    parameters.push(
      excludeBankAccountId
    );
  }

  await connection.query(
    sql,
    parameters
  );
}

async function ensurePrimaryBankAccount(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  const primaryRows =
    await connection.query(
      `
        SELECT bank_account_id
        FROM employee_bank_accounts
        WHERE employee_id = ?
          AND deleted_at IS NULL
          AND is_active = 1
          AND is_primary = 1
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  if (primaryRows.length > 0) {
    return;
  }

  const fallbackRows =
    await connection.query(
      `
        SELECT bank_account_id
        FROM employee_bank_accounts
        WHERE employee_id = ?
          AND deleted_at IS NULL
          AND is_active = 1
        ORDER BY
            payment_priority ASC,
            created_at ASC,
            bank_account_id ASC
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  const fallback =
    fallbackRows[0] as
      | {
          bank_account_id:
            | string
            | number
            | bigint;
        }
      | undefined;

  if (!fallback) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_bank_accounts
      SET is_primary = 1
      WHERE bank_account_id = ?
    `,
    [
      String(
        fallback.bank_account_id
      )
    ]
  );
}

/*
 * =========================================================
 * Bank-account list/get
 * =========================================================
 */

export async function listEmployeeBankAccountRecords(
  employeeId: string,
  filters: BankAccountListFilters
): Promise<EmployeeBankAccountDatabaseRow[]> {
  const conditions: string[] = [
    "ba.employee_id = ?",
    "ba.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    employeeId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "ba.is_active = 1"
    );
  }

  if (filters.primaryOnly) {
    conditions.push(
      "ba.is_primary = 1"
    );
  }

  if (filters.verifiedOnly) {
    conditions.push(
      "ba.is_verified = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ba.bank_name LIKE ?
        OR ba.bank_code LIKE ?
        OR ba.branch_name LIKE ?
        OR ba.branch_code LIKE ?
        OR ba.account_title LIKE ?
        OR ba.account_number_last4 LIKE ?
        OR ba.iban_last4 LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        ${employeeBankAccountSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            ba.is_primary DESC,
            ba.is_active DESC,
            ba.payment_priority ASC,
            ba.created_at ASC
      `,
      parameters
    );

  return rows as
    EmployeeBankAccountDatabaseRow[];
}

export async function findEmployeeBankAccountRecord(
  employeeId: string,
  bankAccountId: string
): Promise<EmployeeBankAccountDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeBankAccountSelect}
        WHERE ba.bank_account_id = ?
          AND ba.employee_id = ?
          AND ba.deleted_at IS NULL
        LIMIT 1
      `,
      [
        bankAccountId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeBankAccountDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Bank-account create
 * =========================================================
 */

export async function createEmployeeBankAccountRecord(
  input: CreateEmployeeBankAccountRecord,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<EmployeeBankAccountDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(employee.company_id) !==
      input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    const activeRows =
      await connection.query(
        `
          SELECT bank_account_id
          FROM employee_bank_accounts
          WHERE employee_id = ?
            AND deleted_at IS NULL
            AND is_active = 1
          LIMIT 1
          FOR UPDATE
        `,
        [input.employeeId]
      );

    const shouldBePrimary =
      input.isActive &&
      (
        input.isPrimary ||
        activeRows.length === 0
      );

    if (shouldBePrimary) {
      await clearPrimaryBankAccounts(
        connection,
        input.employeeId
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_bank_accounts (
              company_id,
              employee_id,
              bank_name,
              bank_code,
              branch_name,
              branch_code,
              account_title,
              account_number_encrypted,
              account_number_last4,
              iban_encrypted,
              iban_last4,
              account_type,
              currency_code,
              payment_priority,
              is_primary,
              is_verified,
              is_active,
              verified_by_user_id,
              verified_at
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              0,
              ?,
              NULL,
              NULL
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.bankName,
          input.bankCode,
          input.branchName,
          input.branchCode,
          input.accountTitle,
          input.accountNumberEncrypted,
          input.accountNumberLast4,
          input.ibanEncrypted,
          input.ibanLast4,
          input.accountType,
          input.currencyCode,
          input.paymentPriority,
          shouldBePrimary ? 1 : 0,
          input.isActive ? 1 : 0
        ]
      );

    const bankAccountId =
      String(
        insertResult.insertId
      );

    await ensurePrimaryBankAccount(
      connection,
      input.employeeId
    );

    const created =
      await selectEmployeeBankAccountUsingConnection(
        connection,
        input.employeeId,
        bankAccountId,
        false
      );

    if (!created) {
      throw new Error(
        "CREATED_BANK_ACCOUNT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_bank_account_created",

        tableName:
          "employee_bank_accounts",

        recordId:
          bankAccountId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/bank-accounts`,

        metadata
      }
    );

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

/*
 * =========================================================
 * Bank-account update
 * =========================================================
 */

export async function updateEmployeeBankAccountRecord(
  employeeId: string,
  bankAccountId: string,
  input: UpdateEmployeeBankAccountRecord,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<EmployeeBankAccountDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeBankAccountUsingConnection(
        connection,
        employeeId,
        bankAccountId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingIsActive =
      input.isActive !== undefined
        ? input.isActive
        : Number(
            existing.is_active
          ) === 1;

    let resultingIsPrimary =
      input.isPrimary !== undefined
        ? input.isPrimary
        : Number(
            existing.is_primary
          ) === 1;

    if (!resultingIsActive) {
      resultingIsPrimary = false;
    }

    if (resultingIsPrimary) {
      await clearPrimaryBankAccounts(
        connection,
        employeeId,
        bankAccountId
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (input.bankName !== undefined) {
      addUpdate(
        "bank_name",
        input.bankName
      );
    }

    if (input.bankCode !== undefined) {
      addUpdate(
        "bank_code",
        input.bankCode
      );
    }

    if (input.branchName !== undefined) {
      addUpdate(
        "branch_name",
        input.branchName
      );
    }

    if (input.branchCode !== undefined) {
      addUpdate(
        "branch_code",
        input.branchCode
      );
    }

    if (input.accountTitle !== undefined) {
      addUpdate(
        "account_title",
        input.accountTitle
      );
    }

    if (
      input.accountNumberEncrypted !==
      undefined
    ) {
      addUpdate(
        "account_number_encrypted",
        input.accountNumberEncrypted
      );
    }

    if (
      input.accountNumberLast4 !==
      undefined
    ) {
      addUpdate(
        "account_number_last4",
        input.accountNumberLast4
      );
    }

    if (input.ibanEncrypted !== undefined) {
      addUpdate(
        "iban_encrypted",
        input.ibanEncrypted
      );
    }

    if (input.ibanLast4 !== undefined) {
      addUpdate(
        "iban_last4",
        input.ibanLast4
      );
    }

    if (input.accountType !== undefined) {
      addUpdate(
        "account_type",
        input.accountType
      );
    }

    if (input.currencyCode !== undefined) {
      addUpdate(
        "currency_code",
        input.currencyCode
      );
    }

    if (
      input.paymentPriority !==
      undefined
    ) {
      addUpdate(
        "payment_priority",
        input.paymentPriority
      );
    }

    if (
      input.isPrimary !== undefined ||
      input.isActive !== undefined
    ) {
      addUpdate(
        "is_primary",
        resultingIsPrimary ? 1 : 0
      );
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_BANK_ACCOUNT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      bankAccountId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_bank_accounts
        SET ${assignments.join(", ")}
        WHERE bank_account_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    await ensurePrimaryBankAccount(
      connection,
      employeeId
    );

    const updated =
      await selectEmployeeBankAccountUsingConnection(
        connection,
        employeeId,
        bankAccountId,
        false
      );

    if (!updated) {
      throw new Error(
        "UPDATED_BANK_ACCOUNT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_bank_account_updated",

        tableName:
          "employee_bank_accounts",

        recordId:
          bankAccountId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/bank-accounts/${bankAccountId}`,

        metadata
      }
    );

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

/*
 * =========================================================
 * Bank-account soft delete
 * =========================================================
 */

export async function deleteEmployeeBankAccountRecord(
  employeeId: string,
  bankAccountId: string,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeBankAccountUsingConnection(
        connection,
        employeeId,
        bankAccountId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE employee_bank_accounts
        SET
            is_primary = 0,
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE bank_account_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      [
        bankAccountId,
        employeeId
      ]
    );

    await ensurePrimaryBankAccount(
      connection,
      employeeId
    );

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_bank_account_deleted",

        tableName:
          "employee_bank_accounts",

        recordId:
          bankAccountId,

        oldValues:
          existing,

        newValues: {
          bankAccountId,
          employeeId,
          isActive: false,
          isPrimary: false,
          deleted: true
        },

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/bank-accounts/${bankAccountId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return true;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Tax-profile helpers
 * =========================================================
 */

async function selectEmployeeTaxProfileUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  taxProfileId: string,
  lockRecord: boolean
): Promise<EmployeeTaxProfileDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeTaxProfileSelect}
        WHERE etp.employee_tax_profile_id = ?
          AND etp.employee_id = ?
        LIMIT 1
        ${lockRecord ? "FOR UPDATE" : ""}
      `,
      [
        taxProfileId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeTaxProfileDatabaseRow
      | undefined
  ) ?? null;
}

async function closeOtherCurrentTaxProfiles(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  excludeTaxProfileId?: string
): Promise<void> {
  let sql = `
    SELECT
        employee_tax_profile_id,
        effective_from,
        effective_to,
        is_current
    FROM employee_tax_profiles
    WHERE employee_id = ?
      AND is_current = 1
  `;

  const parameters: unknown[] = [
    employeeId
  ];

  if (excludeTaxProfileId) {
    sql += `
      AND employee_tax_profile_id <> ?
    `;

    parameters.push(
      excludeTaxProfileId
    );
  }

  sql += `
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    ) as TaxProfilePeriodRow[];

  for (const row of rows) {
    const currentStart =
      databaseDateOnly(
        row.effective_from
      );

    if (
      currentStart === null ||
      currentStart >= effectiveFrom
    ) {
      throw new Error(
        "TAX_PROFILE_CURRENT_DATE_CONFLICT"
      );
    }
  }

  let updateSql = `
    UPDATE employee_tax_profiles
    SET
        effective_to =
            DATE_SUB(?, INTERVAL 1 DAY),
        is_current = 0
    WHERE employee_id = ?
      AND is_current = 1
  `;

  const updateParameters: unknown[] = [
    effectiveFrom,
    employeeId
  ];

  if (excludeTaxProfileId) {
    updateSql += `
      AND employee_tax_profile_id <> ?
    `;

    updateParameters.push(
      excludeTaxProfileId
    );
  }

  await connection.query(
    updateSql,
    updateParameters
  );
}

async function taxProfileOverlapExists(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  excludeTaxProfileId?: string
): Promise<boolean> {
  let sql = `
    SELECT employee_tax_profile_id
    FROM employee_tax_profiles
    WHERE employee_id = ?
      AND effective_from <=
          COALESCE(?, '9999-12-31')
      AND COALESCE(
            effective_to,
            '9999-12-31'
          ) >= ?
  `;

  const parameters: unknown[] = [
    employeeId,
    effectiveTo,
    effectiveFrom
  ];

  if (excludeTaxProfileId) {
    sql += `
      AND employee_tax_profile_id <> ?
    `;

    parameters.push(
      excludeTaxProfileId
    );
  }

  sql += `
    LIMIT 1
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Tax-profile list/get
 * =========================================================
 */

export async function listEmployeeTaxProfileRecords(
  employeeId: string,
  filters: TaxProfileListFilters
): Promise<EmployeeTaxProfileDatabaseRow[]> {
  const conditions: string[] = [
    "etp.employee_id = ?"
  ];

  const parameters: unknown[] = [
    employeeId
  ];

  if (filters.status === "CURRENT") {
    conditions.push(
      "etp.is_current = 1"
    );
  }

  if (filters.status === "HISTORICAL") {
    conditions.push(
      "etp.is_current = 0"
    );
  }

  if (filters.taxRuleId) {
    conditions.push(
      "etp.tax_rule_id = ?"
    );

    parameters.push(
      filters.taxRuleId
    );
  }

  const rows =
    await databasePool.query(
      `
        ${employeeTaxProfileSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            etp.is_current DESC,
            etp.effective_from DESC,
            etp.employee_tax_profile_id DESC
      `,
      parameters
    );

  return rows as
    EmployeeTaxProfileDatabaseRow[];
}

export async function findEmployeeTaxProfileRecord(
  employeeId: string,
  taxProfileId: string
): Promise<EmployeeTaxProfileDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeTaxProfileSelect}
        WHERE etp.employee_tax_profile_id = ?
          AND etp.employee_id = ?
        LIMIT 1
      `,
      [
        taxProfileId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeTaxProfileDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Tax-profile create
 * =========================================================
 */

export async function createEmployeeTaxProfileRecord(
  input: CreateEmployeeTaxProfileRecord,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(employee.company_id) !==
      input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    if (input.isCurrent) {
      await closeOtherCurrentTaxProfiles(
        connection,
        input.employeeId,
        input.effectiveFrom
      );
    }

    const overlap =
      await taxProfileOverlapExists(
        connection,
        input.employeeId,
        input.effectiveFrom,
        input.effectiveTo
      );

    if (overlap) {
      throw new Error(
        "TAX_PROFILE_PERIOD_OVERLAP"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_tax_profiles (
              company_id,
              employee_id,
              tax_rule_id,
              tax_identifier,
              taxpayer_status,
              annual_tax_credit,
              annual_tax_exemption,
              additional_tax_amount,
              effective_from,
              effective_to,
              is_current
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.taxRuleId,
          input.taxIdentifier,
          input.taxpayerStatus,
          input.annualTaxCredit,
          input.annualTaxExemption,
          input.additionalTaxAmount,
          input.effectiveFrom,
          input.effectiveTo,
          input.isCurrent ? 1 : 0
        ]
      );

    const taxProfileId =
      String(
        insertResult.insertId
      );

    const created =
      await selectEmployeeTaxProfileUsingConnection(
        connection,
        input.employeeId,
        taxProfileId,
        false
      );

    if (!created) {
      throw new Error(
        "CREATED_TAX_PROFILE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_tax_profile_created",

        tableName:
          "employee_tax_profiles",

        recordId:
          taxProfileId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/tax-profiles`,

        metadata
      }
    );

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

/*
 * =========================================================
 * Tax-profile update
 * =========================================================
 */

export async function updateEmployeeTaxProfileRecord(
  employeeId: string,
  taxProfileId: string,
  input: UpdateEmployeeTaxProfileRecord,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeTaxProfileUsingConnection(
        connection,
        employeeId,
        taxProfileId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(
        existing.effective_from
      );

    if (!resultingEffectiveFrom) {
      throw new Error(
        "INVALID_TAX_PROFILE_EFFECTIVE_FROM"
      );
    }

    const resultingIsCurrent =
      input.isCurrent !== undefined
        ? input.isCurrent
        : Number(
            existing.is_current
          ) === 1;

    let resultingEffectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
        : databaseDateOnly(
            existing.effective_to
          );

    if (
      input.isCurrent === true &&
      input.effectiveTo === undefined
    ) {
      resultingEffectiveTo = null;
    }

    if (resultingIsCurrent) {
      await closeOtherCurrentTaxProfiles(
        connection,
        employeeId,
        resultingEffectiveFrom,
        taxProfileId
      );
    }

    const overlap =
      await taxProfileOverlapExists(
        connection,
        employeeId,
        resultingEffectiveFrom,
        resultingEffectiveTo,
        taxProfileId
      );

    if (overlap) {
      throw new Error(
        "TAX_PROFILE_PERIOD_OVERLAP"
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (input.taxRuleId !== undefined) {
      addUpdate(
        "tax_rule_id",
        input.taxRuleId
      );
    }

    if (
      input.taxIdentifier !== undefined
    ) {
      addUpdate(
        "tax_identifier",
        input.taxIdentifier
      );
    }

    if (
      input.taxpayerStatus !== undefined
    ) {
      addUpdate(
        "taxpayer_status",
        input.taxpayerStatus
      );
    }

    if (
      input.annualTaxCredit !== undefined
    ) {
      addUpdate(
        "annual_tax_credit",
        input.annualTaxCredit
      );
    }

    if (
      input.annualTaxExemption !==
      undefined
    ) {
      addUpdate(
        "annual_tax_exemption",
        input.annualTaxExemption
      );
    }

    if (
      input.additionalTaxAmount !==
      undefined
    ) {
      addUpdate(
        "additional_tax_amount",
        input.additionalTaxAmount
      );
    }

    if (
      input.effectiveFrom !== undefined
    ) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (
      input.effectiveTo !== undefined ||
      input.isCurrent === true
    ) {
      addUpdate(
        "effective_to",
        resultingEffectiveTo
      );
    }

    if (input.isCurrent !== undefined) {
      addUpdate(
        "is_current",
        input.isCurrent ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_TAX_PROFILE_UPDATE_FIELDS"
      );
    }

    parameters.push(
      taxProfileId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_tax_profiles
        SET ${assignments.join(", ")}
        WHERE employee_tax_profile_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    const updated =
      await selectEmployeeTaxProfileUsingConnection(
        connection,
        employeeId,
        taxProfileId,
        false
      );

    if (!updated) {
      throw new Error(
        "UPDATED_TAX_PROFILE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_tax_profile_updated",

        tableName:
          "employee_tax_profiles",

        recordId:
          taxProfileId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/tax-profiles/${taxProfileId}`,

        metadata
      }
    );

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

/*
 * =========================================================
 * Close tax profile
 * =========================================================
 */

export async function closeEmployeeTaxProfileRecord(
  employeeId: string,
  taxProfileId: string,
  effectiveTo: string,
  actor: EmployeeFinanceActor,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeTaxProfileUsingConnection(
        connection,
        employeeId,
        taxProfileId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const effectiveFrom =
      databaseDateOnly(
        existing.effective_from
      );

    if (
      !effectiveFrom ||
      effectiveTo < effectiveFrom
    ) {
      throw new Error(
        "INVALID_TAX_PROFILE_CLOSE_DATE"
      );
    }

    await connection.query(
      `
        UPDATE employee_tax_profiles
        SET
            effective_to = ?,
            is_current = 0
        WHERE employee_tax_profile_id = ?
          AND employee_id = ?
      `,
      [
        effectiveTo,
        taxProfileId,
        employeeId
      ]
    );

    const updated =
      await selectEmployeeTaxProfileUsingConnection(
        connection,
        employeeId,
        taxProfileId,
        false
      );

    if (!updated) {
      throw new Error(
        "CLOSED_TAX_PROFILE_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_tax_profile_closed",

        tableName:
          "employee_tax_profiles",

        recordId:
          taxProfileId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${employeeId}/tax-profiles/${taxProfileId}/close`,

        metadata
      }
    );

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
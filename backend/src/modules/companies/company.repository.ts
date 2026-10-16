import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateCompanyInput,
  UpdateCompanyInput
} from "./company.schema.js";

import type {
  CompanyActor,
  CompanyDatabaseRow,
  CompanyListOptions,
  CompanyListResult,
  RequestMetadata
} from "./company.types.js";

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue ===
      "bigint"
        ? String(currentValue)
        : currentValue
  );
}

const companySelectColumns = `
  company_id,
  company_code,
  legal_name,
  display_name,
  registration_number,
  tax_number,
  industry,
  official_email,
  official_phone,
  website_url,
  address_line_1,
  address_line_2,
  city,
  district,
  province,
  postal_code,
  country_code,
  timezone,
  currency_code,
  date_format,
  logo_path,
  employee_code_prefix,
  employee_code_length,
  is_active,
  deleted_at,
  created_at,
  updated_at
`;

export async function findCompanyIdByCode(
  companyCode: string,
  excludeCompanyId?: string
): Promise<string | null> {
  let sql = `
    SELECT company_id
    FROM companies
    WHERE company_code = ?
  `;

  const values: unknown[] = [
    companyCode
  ];

  if (excludeCompanyId) {
    sql += `
      AND company_id <> ?
    `;

    values.push(
      excludeCompanyId
    );
  }

  sql += `
    LIMIT 1
  `;

  const rows =
    await databasePool.query(
      sql,
      values
    );

  const row = rows[0] as
    | {
        company_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.company_id)
    : null;
}

export async function listCompanyRecords(
  options: CompanyListOptions
): Promise<CompanyListResult> {
  // edited by wali: Keep soft-deleted records out unless this is the explicit deleted view.
  const conditions: string[] = [
    options.isDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"
  ];

  const values: unknown[] = [];

  if (options.scopeCompanyId) {
    conditions.push(
      "company_id = ?"
    );

    values.push(
      options.scopeCompanyId
    );
  }

  if (
    options.isActive !== undefined
  ) {
    conditions.push(
      "is_active = ?"
    );

    values.push(
      options.isActive ? 1 : 0
    );
  }

  if (options.search) {
    conditions.push(`
      (
        company_code LIKE ?
        OR legal_name LIKE ?
        OR display_name LIKE ?
        OR official_email LIKE ?
        OR official_phone LIKE ?
        OR city LIKE ?
      )
    `);

    const searchValue =
      `%${options.search}%`;

    values.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total
        FROM companies
        WHERE ${whereClause}
      `,
      values
    );

  const total = Number(
    String(
      (
        countRows[0] as {
          total:
            string | number | bigint;
        }
      ).total
    )
  );

  const offset =
    (options.page - 1) *
    options.limit;

  const rows =
    await databasePool.query(
      `
        SELECT
          ${companySelectColumns}
        FROM companies
        WHERE ${whereClause}
        ORDER BY
          ${options.sortBy}
          ${options.sortOrder}
        LIMIT ?
        OFFSET ?
      `,
      [
        ...values,
        options.limit,
        offset
      ]
    );

  return {
    companies:
      rows as CompanyDatabaseRow[],
    total
  };
}

export async function findCompanyById(
  companyId: string
): Promise<CompanyDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${companySelectColumns}
        FROM companies
        WHERE company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [companyId]
    );

  return (
    rows[0] as
      | CompanyDatabaseRow
      | undefined
  ) ?? null;
}

export async function createCompanyRecord(
  input: CreateCompanyInput,
  actor: CompanyActor,
  metadata: RequestMetadata
): Promise<CompanyDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const insertResult =
      await connection.query(
        `
          INSERT INTO companies (
              company_code,
              legal_name,
              display_name,
              registration_number,
              tax_number,
              industry,
              official_email,
              official_phone,
              website_url,
              address_line_1,
              address_line_2,
              city,
              district,
              province,
              postal_code,
              country_code,
              timezone,
              currency_code,
              date_format,
              logo_path,
              employee_code_prefix,
              employee_code_length,
              is_active
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
          )
        `,
        [
          input.companyCode,
          input.legalName,
          input.displayName,
          input.registrationNumber ??
            null,
          input.taxNumber ?? null,
          input.industry ?? null,
          input.officialEmail ?? null,
          input.officialPhone ?? null,
          input.websiteUrl ?? null,
          input.addressLine1 ?? null,
          input.addressLine2 ?? null,
          input.city ?? null,
          input.district ?? null,
          input.province ?? null,
          input.postalCode ?? null,
          input.countryCode,
          input.timezone,
          input.currencyCode,
          input.dateFormat,
          input.logoPath ?? null,
          input.employeeCodePrefix ??
            null,
          input.employeeCodeLength,
          input.isActive ? 1 : 0
        ]
      );

    const companyId = String(
      insertResult.insertId
    );

    const rows =
      await connection.query(
        `
          SELECT
            ${companySelectColumns}
          FROM companies
          WHERE company_id = ?
          LIMIT 1
        `,
        [companyId]
      );

    const company =
      rows[0] as
        | CompanyDatabaseRow
        | undefined;

    if (!company) {
      throw new Error(
        "Created company could not be retrieved"
      );
    }

    await connection.query(
      `
        INSERT INTO activity_logs (
            company_id,
            user_id,
            module_name,
            action_name,
            table_name,
            record_id,
            new_values,
            request_method,
            request_path,
            ip_address,
            user_agent
        )
        VALUES (
            ?,
            ?,
            'company',
            'company_created',
            'companies',
            ?,
            ?,
            'POST',
            '/api/v1/companies',
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        companyId,
        safeJson(company),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return company;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCompanyRecord(
  companyId: string,
  input: UpdateCompanyInput,
  actor: CompanyActor,
  metadata: RequestMetadata
): Promise<CompanyDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentRows =
      await connection.query(
        `
          SELECT
            ${companySelectColumns}
          FROM companies
          WHERE company_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [companyId]
      );

    const currentCompany =
      currentRows[0] as
        | CompanyDatabaseRow
        | undefined;

    if (!currentCompany) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const addUpdate = (
      column: string,
      value: unknown
    ): void => {
      assignments.push(
        `${column} = ?`
      );

      values.push(value);
    };

    if (
      input.companyCode !== undefined
    ) {
      addUpdate(
        "company_code",
        input.companyCode
      );
    }

    if (
      input.legalName !== undefined
    ) {
      addUpdate(
        "legal_name",
        input.legalName
      );
    }

    if (
      input.displayName !== undefined
    ) {
      addUpdate(
        "display_name",
        input.displayName
      );
    }

    if (
      input.registrationNumber !==
      undefined
    ) {
      addUpdate(
        "registration_number",
        input.registrationNumber
      );
    }

    if (
      input.taxNumber !== undefined
    ) {
      addUpdate(
        "tax_number",
        input.taxNumber
      );
    }

    if (
      input.industry !== undefined
    ) {
      addUpdate(
        "industry",
        input.industry
      );
    }

    if (
      input.officialEmail !== undefined
    ) {
      addUpdate(
        "official_email",
        input.officialEmail
      );
    }

    if (
      input.officialPhone !== undefined
    ) {
      addUpdate(
        "official_phone",
        input.officialPhone
      );
    }

    if (
      input.websiteUrl !== undefined
    ) {
      addUpdate(
        "website_url",
        input.websiteUrl
      );
    }

    if (
      input.addressLine1 !== undefined
    ) {
      addUpdate(
        "address_line_1",
        input.addressLine1
      );
    }

    if (
      input.addressLine2 !== undefined
    ) {
      addUpdate(
        "address_line_2",
        input.addressLine2
      );
    }

    if (
      input.city !== undefined
    ) {
      addUpdate(
        "city",
        input.city
      );
    }

    if (
      input.district !== undefined
    ) {
      addUpdate(
        "district",
        input.district
      );
    }

    if (
      input.province !== undefined
    ) {
      addUpdate(
        "province",
        input.province
      );
    }

    if (
      input.postalCode !== undefined
    ) {
      addUpdate(
        "postal_code",
        input.postalCode
      );
    }

    if (
      input.countryCode !== undefined
    ) {
      addUpdate(
        "country_code",
        input.countryCode
      );
    }

    if (
      input.timezone !== undefined
    ) {
      addUpdate(
        "timezone",
        input.timezone
      );
    }

    if (
      input.currencyCode !== undefined
    ) {
      addUpdate(
        "currency_code",
        input.currencyCode
      );
    }

    if (
      input.dateFormat !== undefined
    ) {
      addUpdate(
        "date_format",
        input.dateFormat
      );
    }

    if (
      input.logoPath !== undefined
    ) {
      addUpdate(
        "logo_path",
        input.logoPath
      );
    }

    if (
      input.employeeCodePrefix !==
      undefined
    ) {
      addUpdate(
        "employee_code_prefix",
        input.employeeCodePrefix
      );
    }

    if (
      input.employeeCodeLength !==
      undefined
    ) {
      addUpdate(
        "employee_code_length",
        input.employeeCodeLength
      );
    }

    if (
      input.isActive !== undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "No company fields were provided for update"
      );
    }

    values.push(companyId);

    await connection.query(
      `
        UPDATE companies
        SET ${assignments.join(", ")}
        WHERE company_id = ?
          AND deleted_at IS NULL
      `,
      values
    );

    /*
     * Company inactive hone par us company
     * ke users aur sessions bhi disable honge.
     */
    if (input.isActive === false) {
      await connection.query(
        `
          UPDATE user_sessions s
          INNER JOIN users u
              ON u.user_id = s.user_id
          SET s.revoked_at =
              CURRENT_TIMESTAMP
          WHERE u.company_id = ?
            AND s.revoked_at IS NULL
        `,
        [companyId]
      );

      await connection.query(
        `
          UPDATE users
          SET is_active = 0
          WHERE company_id = ?
            AND deleted_at IS NULL
        `,
        [companyId]
      );
    }

    const updatedRows =
      await connection.query(
        `
          SELECT
            ${companySelectColumns}
          FROM companies
          WHERE company_id = ?
          LIMIT 1
        `,
        [companyId]
      );

    const updatedCompany =
      updatedRows[0] as
        | CompanyDatabaseRow
        | undefined;

    if (!updatedCompany) {
      throw new Error(
        "Updated company could not be retrieved"
      );
    }

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
            'company',
            'company_updated',
            'companies',
            ?,
            ?,
            ?,
            'PATCH',
            ?,
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        companyId,
        safeJson(currentCompany),
        safeJson(updatedCompany),
        `/api/v1/companies/${companyId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedCompany;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteCompanyRecord(
  companyId: string,
  actor: CompanyActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const rows =
      await connection.query(
        `
          SELECT
            ${companySelectColumns}
          FROM companies
          WHERE company_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [companyId]
      );

    const company =
      rows[0] as
        | CompanyDatabaseRow
        | undefined;

    if (!company) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE user_sessions s
        INNER JOIN users u
            ON u.user_id = s.user_id
        SET s.revoked_at =
            CURRENT_TIMESTAMP
        WHERE u.company_id = ?
          AND s.revoked_at IS NULL
      `,
      [companyId]
    );

    await connection.query(
      `
        UPDATE users
        SET is_active = 0
        WHERE company_id = ?
          AND deleted_at IS NULL
      `,
      [companyId]
    );

    await connection.query(
      `
        UPDATE companies
        SET
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE company_id = ?
      `,
      [companyId]
    );

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
            'company',
            'company_deleted',
            'companies',
            ?,
            ?,
            ?,
            'DELETE',
            ?,
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        companyId,
        safeJson(company),
        safeJson({
          companyId,
          isActive: false,
          deleted: true
        }),
        `/api/v1/companies/${companyId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
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
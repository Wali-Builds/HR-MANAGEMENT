import {
  databasePool
} from "../../database/pool.js";

import {
  requireQuotaAvailableUsingConnection
} from "../subscriptions/subscription-entitlement.service.js";

import type {
  CreateBranchInput,
  UpdateBranchInput
} from "./branch.schema.js";

import type {
  BranchActor,
  BranchDatabaseRow,
  BranchListOptions,
  BranchListResult,
  RequestMetadata
} from "./branch.types.js";

const branchSelectColumns = `
  branch_id,
  company_id,
  branch_code,
  branch_name,
  branch_type,
  official_email,
  official_phone,
  address_line_1,
  address_line_2,
  city,
  district,
  province,
  postal_code,
  country_code,
  timezone,
  latitude,
  longitude,
  is_head_office,
  is_active,
  deleted_at,
  created_at,
  updated_at
`;

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

export async function findActiveCompanyById(
  companyId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        SELECT company_id
        FROM companies
        WHERE company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [companyId]
    );

  return rows.length > 0;
}

export async function findBranchCodeConflict(
  companyId: string,
  branchCode: string,
  excludeBranchId?: string
): Promise<string | null> {
  let sql = `
    SELECT branch_id
    FROM branches
    WHERE company_id = ?
      AND branch_code = ?
  `;

  const values: unknown[] = [
    companyId,
    branchCode
  ];

  if (excludeBranchId) {
    sql += `
      AND branch_id <> ?
    `;

    values.push(
      excludeBranchId
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
        branch_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.branch_id)
    : null;
}

export async function listBranchRecords(
  options: BranchListOptions
): Promise<BranchListResult> {
  const conditions: string[] = [
    "deleted_at IS NULL"
  ];

  const values: unknown[] = [];

  if (options.companyId) {
    conditions.push(
      "company_id = ?"
    );

    values.push(
      options.companyId
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

  if (
    options.isHeadOffice !== undefined
  ) {
    conditions.push(
      "is_head_office = ?"
    );

    values.push(
      options.isHeadOffice ? 1 : 0
    );
  }

  if (options.branchType) {
    conditions.push(
      "branch_type = ?"
    );

    values.push(
      options.branchType
    );
  }

  if (options.city) {
    conditions.push(
      "city = ?"
    );

    values.push(
      options.city
    );
  }

  if (options.search) {
    conditions.push(`
      (
        branch_code LIKE ?
        OR branch_name LIKE ?
        OR branch_type LIKE ?
        OR official_email LIKE ?
        OR official_phone LIKE ?
        OR city LIKE ?
        OR district LIKE ?
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
        FROM branches
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
          ${branchSelectColumns}
        FROM branches
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
    branches:
      rows as BranchDatabaseRow[],
    total
  };
}

export async function findBranchById(
  branchId: string
): Promise<BranchDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${branchSelectColumns}
        FROM branches
        WHERE branch_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [branchId]
    );

  return (
    rows[0] as
      | BranchDatabaseRow
      | undefined
  ) ?? null;
}

export async function createBranchRecord(
  companyId: string,
  input: CreateBranchInput,
  actor: BranchActor,
  metadata: RequestMetadata
): Promise<BranchDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await requireQuotaAvailableUsingConnection(
      connection,
      companyId,
      "BRANCH",
      null,
      input.isActive
    );

    if (input.isHeadOffice) {
      await connection.query(
        `
          UPDATE branches
          SET is_head_office = 0
          WHERE company_id = ?
            AND deleted_at IS NULL
        `,
        [companyId]
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO branches (
              company_id,
              branch_code,
              branch_name,
              branch_type,
              official_email,
              official_phone,
              address_line_1,
              address_line_2,
              city,
              district,
              province,
              postal_code,
              country_code,
              timezone,
              latitude,
              longitude,
              is_head_office,
              is_active
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          companyId,
          input.branchCode,
          input.branchName,
          input.branchType ?? null,
          input.officialEmail ?? null,
          input.officialPhone ?? null,
          input.addressLine1 ?? null,
          input.addressLine2 ?? null,
          input.city ?? null,
          input.district ?? null,
          input.province ?? null,
          input.postalCode ?? null,
          input.countryCode,
          input.timezone,
          input.latitude ?? null,
          input.longitude ?? null,
          input.isHeadOffice ? 1 : 0,
          input.isActive ? 1 : 0
        ]
      );

    const branchId = String(
      insertResult.insertId
    );

    const rows =
      await connection.query(
        `
          SELECT
            ${branchSelectColumns}
          FROM branches
          WHERE branch_id = ?
            AND company_id = ?
          LIMIT 1
        `,
        [
          branchId,
          companyId
        ]
      );

    const branch =
      rows[0] as
        | BranchDatabaseRow
        | undefined;

    if (!branch) {
      throw new Error(
        "Created branch could not be retrieved"
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
            'branch',
            'branch_created',
            'branches',
            ?,
            ?,
            'POST',
            '/api/v1/branches',
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        branchId,
        safeJson(branch),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return branch;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateBranchRecord(
  branchId: string,
  companyId: string,
  input: UpdateBranchInput,
  actor: BranchActor,
  metadata: RequestMetadata
): Promise<BranchDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (input.isActive === true) {
      await requireQuotaAvailableUsingConnection(
        connection,
        companyId,
        "BRANCH",
        branchId,
        true
      );
    }

    const currentRows =
      await connection.query(
        `
          SELECT
            ${branchSelectColumns}
          FROM branches
          WHERE branch_id = ?
            AND company_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          branchId,
          companyId
        ]
      );

    const currentBranch =
      currentRows[0] as
        | BranchDatabaseRow
        | undefined;

    if (!currentBranch) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }


    if (input.isHeadOffice === true) {
      await connection.query(
        `
          UPDATE branches
          SET is_head_office = 0
          WHERE company_id = ?
            AND branch_id <> ?
            AND deleted_at IS NULL
        `,
        [
          companyId,
          branchId
        ]
      );
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
      input.branchCode !== undefined
    ) {
      addUpdate(
        "branch_code",
        input.branchCode
      );
    }

    if (
      input.branchName !== undefined
    ) {
      addUpdate(
        "branch_name",
        input.branchName
      );
    }

    if (
      input.branchType !== undefined
    ) {
      addUpdate(
        "branch_type",
        input.branchType
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
      input.latitude !== undefined
    ) {
      addUpdate(
        "latitude",
        input.latitude
      );
    }

    if (
      input.longitude !== undefined
    ) {
      addUpdate(
        "longitude",
        input.longitude
      );
    }

    if (
      input.isHeadOffice !== undefined
    ) {
      addUpdate(
        "is_head_office",
        input.isHeadOffice ? 1 : 0
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

    values.push(branchId);

    await connection.query(
      `
        UPDATE branches
        SET ${assignments.join(", ")}
        WHERE branch_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
      `,
      [
        ...values,
        companyId
      ]
    );

    if (input.isActive === false) {
      await connection.query(
        `
          UPDATE user_roles
          SET is_active = 0
          WHERE branch_id = ?
            AND is_active = 1
        `,
        [branchId]
      );

      await connection.query(
        `
          UPDATE user_sessions s
          INNER JOIN user_roles ur
              ON ur.user_id = s.user_id
          SET s.revoked_at =
              CURRENT_TIMESTAMP
          WHERE ur.branch_id = ?
            AND s.revoked_at IS NULL
        `,
        [branchId]
      );
    }

    const updatedRows =
      await connection.query(
        `
          SELECT
            ${branchSelectColumns}
          FROM branches
          WHERE branch_id = ?
          LIMIT 1
        `,
        [branchId]
      );

    const updatedBranch =
      updatedRows[0] as
        | BranchDatabaseRow
        | undefined;

    if (!updatedBranch) {
      throw new Error(
        "Updated branch could not be retrieved"
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
            'branch',
            'branch_updated',
            'branches',
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
        branchId,
        safeJson(currentBranch),
        safeJson(updatedBranch),
        `/api/v1/branches/${branchId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedBranch;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteBranchRecord(
  branchId: string,
  actor: BranchActor,
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
            ${branchSelectColumns}
          FROM branches
          WHERE branch_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [branchId]
      );

    const branch =
      rows[0] as
        | BranchDatabaseRow
        | undefined;

    if (!branch) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE user_roles
        SET is_active = 0
        WHERE branch_id = ?
          AND is_active = 1
      `,
      [branchId]
    );

    await connection.query(
      `
        UPDATE user_sessions s
        INNER JOIN user_roles ur
            ON ur.user_id = s.user_id
        SET s.revoked_at =
            CURRENT_TIMESTAMP
        WHERE ur.branch_id = ?
          AND s.revoked_at IS NULL
      `,
      [branchId]
    );

    await connection.query(
      `
        UPDATE branches
        SET
            is_active = 0,
            is_head_office = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE branch_id = ?
      `,
      [branchId]
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
            'branch',
            'branch_deleted',
            'branches',
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
        branch.company_id,
        actor.userId,
        branchId,
        safeJson(branch),
        safeJson({
          branchId,
          isActive: false,
          deleted: true
        }),
        `/api/v1/branches/${branchId}`,
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
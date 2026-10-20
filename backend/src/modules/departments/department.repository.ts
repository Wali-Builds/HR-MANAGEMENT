import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateDepartmentInput,
  UpdateDepartmentInput
} from "./department.schema.js";

import type {
  DepartmentActor,
  DepartmentDatabaseRow,
  DepartmentListOptions,
  DepartmentListResult,
  DepartmentReferenceRow,
  RequestMetadata
} from "./department.types.js";

const departmentSelectColumns = `
  d.department_id,
  d.company_id,
  d.branch_id,
  d.parent_department_id,
  d.department_code,
  d.department_name,
  d.description,
  d.cost_center_code,
  d.is_active,
  d.deleted_at,
  d.created_at,
  d.updated_at,
  b.branch_name,
  p.department_name
    AS parent_department_name
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

export async function findActiveBranchForCompany(
  branchId: string,
  companyId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        SELECT branch_id
        FROM branches
        WHERE branch_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        branchId,
        companyId
      ]
    );

  return rows.length > 0;
}

export async function findDepartmentReferenceById(
  departmentId: string
): Promise<DepartmentReferenceRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            department_id,
            company_id,
            branch_id,
            parent_department_id,
            is_active
        FROM departments
        WHERE department_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [departmentId]
    );

  return (
    rows[0] as
      | DepartmentReferenceRow
      | undefined
  ) ?? null;
}

export async function findDepartmentCodeConflict(
  companyId: string,
  branchId: string | null,
  departmentCode: string,
  excludeDepartmentId?: string
): Promise<string | null> {
  let sql = `
    SELECT department_id
    FROM departments
    WHERE company_id = ?
      -- edited by wali: NULL branch_id represents the company-wide department scope.
      AND branch_id <=> ?
      AND department_code = ?
  `;

  const values: unknown[] = [
    companyId,
    branchId,
    departmentCode
  ];

  if (excludeDepartmentId) {
    sql += `
      AND department_id <> ?
    `;

    values.push(
      excludeDepartmentId
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
        department_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.department_id)
    : null;
}

export async function wouldCreateDepartmentCycle(
  departmentId: string,
  proposedParentDepartmentId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        WITH RECURSIVE descendants AS (
          SELECT
              department_id
          FROM departments
          WHERE parent_department_id = ?
            AND deleted_at IS NULL

          UNION ALL

          SELECT
              child.department_id
          FROM departments child
          INNER JOIN descendants tree
              ON child.parent_department_id =
                 tree.department_id
          WHERE child.deleted_at IS NULL
        )
        SELECT department_id
        FROM descendants
        WHERE department_id = ?
        LIMIT 1
      `,
      [
        departmentId,
        proposedParentDepartmentId
      ]
    );

  return rows.length > 0;
}

export async function listDepartmentRecords(
  options: DepartmentListOptions
): Promise<DepartmentListResult> {
  const conditions: string[] = [
    "d.deleted_at IS NULL"
  ];

  const values: unknown[] = [];

  if (options.companyId) {
    conditions.push(
      "d.company_id = ?"
    );

    values.push(
      options.companyId
    );
  }

  if (options.branchId) {
    conditions.push(
      "d.branch_id = ?"
    );

    values.push(
      options.branchId
    );
  }

  if (options.parentDepartmentId) {
    conditions.push(
      "d.parent_department_id = ?"
    );

    values.push(
      options.parentDepartmentId
    );
  }

  if (options.rootOnly === true) {
    conditions.push(
      "d.parent_department_id IS NULL"
    );
  }

  if (
    options.isActive !== undefined
  ) {
    conditions.push(
      "d.is_active = ?"
    );

    values.push(
      options.isActive ? 1 : 0
    );
  }

  if (options.search) {
    conditions.push(`
      (
        d.department_code LIKE ?
        OR d.department_name LIKE ?
        OR d.description LIKE ?
        OR d.cost_center_code LIKE ?
      )
    `);

    const searchValue =
      `%${options.search}%`;

    values.push(
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
        FROM departments d
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
          ${departmentSelectColumns}
        FROM departments d
        LEFT JOIN branches b
            ON b.branch_id = d.branch_id
        LEFT JOIN departments p
            ON p.department_id =
               d.parent_department_id
        WHERE ${whereClause}
        ORDER BY
          d.${options.sortBy}
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
    departments:
      rows as DepartmentDatabaseRow[],

    total
  };
}

export async function findDepartmentById(
  departmentId: string
): Promise<DepartmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${departmentSelectColumns}
        FROM departments d
        LEFT JOIN branches b
            ON b.branch_id = d.branch_id
        LEFT JOIN departments p
            ON p.department_id =
               d.parent_department_id
        WHERE d.department_id = ?
          AND d.deleted_at IS NULL
        LIMIT 1
      `,
      [departmentId]
    );

  return (
    rows[0] as
      | DepartmentDatabaseRow
      | undefined
  ) ?? null;
}

export async function createDepartmentRecord(
  companyId: string,
  input: CreateDepartmentInput,
  actor: DepartmentActor,
  metadata: RequestMetadata
): Promise<DepartmentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const insertResult =
      await connection.query(
        `
          INSERT INTO departments (
              company_id,
              branch_id,
              parent_department_id,
              department_code,
              department_name,
              description,
              cost_center_code,
              is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          companyId,
          input.branchId ?? null,
          input.parentDepartmentId ?? null,
          input.departmentCode,
          input.departmentName,
          input.description ?? null,
          input.costCenterCode ?? null,
          input.isActive ? 1 : 0
        ]
      );

    const departmentId =
      String(
        insertResult.insertId
      );

    const rows =
      await connection.query(
        `
          SELECT
            ${departmentSelectColumns}
          FROM departments d
          LEFT JOIN branches b
              ON b.branch_id =
                 d.branch_id
          LEFT JOIN departments p
              ON p.department_id =
                 d.parent_department_id
          WHERE d.department_id = ?
          LIMIT 1
        `,
        [departmentId]
      );

    const department =
      rows[0] as
        | DepartmentDatabaseRow
        | undefined;

    if (!department) {
      throw new Error(
        "Created department could not be retrieved"
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
            'department',
            'department_created',
            'departments',
            ?,
            ?,
            'POST',
            '/api/v1/departments',
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        departmentId,
        safeJson(department),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return department;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateDepartmentRecord(
  departmentId: string,
  input: UpdateDepartmentInput,
  actor: DepartmentActor,
  metadata: RequestMetadata
): Promise<DepartmentDatabaseRow | null> {
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
            ${departmentSelectColumns}
          FROM departments d
          LEFT JOIN branches b
              ON b.branch_id =
                 d.branch_id
          LEFT JOIN departments p
              ON p.department_id =
                 d.parent_department_id
          WHERE d.department_id = ?
            AND d.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [departmentId]
      );

    const currentDepartment =
      currentRows[0] as
        | DepartmentDatabaseRow
        | undefined;

    if (!currentDepartment) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      values.push(value);
    };

    if (input.branchId !== undefined) {
      addUpdate(
        "branch_id",
        input.branchId
      );
    }

    if (
      input.parentDepartmentId !==
      undefined
    ) {
      addUpdate(
        "parent_department_id",
        input.parentDepartmentId
      );
    }

    if (
      input.departmentCode !== undefined
    ) {
      addUpdate(
        "department_code",
        input.departmentCode
      );
    }

    if (
      input.departmentName !== undefined
    ) {
      addUpdate(
        "department_name",
        input.departmentName
      );
    }

    if (
      input.description !== undefined
    ) {
      addUpdate(
        "description",
        input.description
      );
    }

    if (
      input.costCenterCode !== undefined
    ) {
      addUpdate(
        "cost_center_code",
        input.costCenterCode
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
        "No department fields were provided for update"
      );
    }

    values.push(departmentId);

    await connection.query(
      `
        UPDATE departments
        SET ${assignments.join(", ")}
        WHERE department_id = ?
          AND deleted_at IS NULL
      `,
      values
    );

    if (input.isActive === false) {
      await connection.query(
        `
          UPDATE user_roles
          SET is_active = 0
          WHERE department_id = ?
            AND is_active = 1
        `,
        [departmentId]
      );

      await connection.query(
        `
          UPDATE user_sessions s
          INNER JOIN user_roles ur
              ON ur.user_id = s.user_id
          SET s.revoked_at =
              CURRENT_TIMESTAMP
          WHERE ur.department_id = ?
            AND s.revoked_at IS NULL
        `,
        [departmentId]
      );
    }

    const updatedRows =
      await connection.query(
        `
          SELECT
            ${departmentSelectColumns}
          FROM departments d
          LEFT JOIN branches b
              ON b.branch_id =
                 d.branch_id
          LEFT JOIN departments p
              ON p.department_id =
                 d.parent_department_id
          WHERE d.department_id = ?
          LIMIT 1
        `,
        [departmentId]
      );

    const updatedDepartment =
      updatedRows[0] as
        | DepartmentDatabaseRow
        | undefined;

    if (!updatedDepartment) {
      throw new Error(
        "Updated department could not be retrieved"
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
            'department',
            'department_updated',
            'departments',
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
        currentDepartment.company_id,
        actor.userId,
        departmentId,
        safeJson(currentDepartment),
        safeJson(updatedDepartment),
        `/api/v1/departments/${departmentId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedDepartment;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteDepartmentRecord(
  departmentId: string,
  actor: DepartmentActor,
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
            ${departmentSelectColumns}
          FROM departments d
          LEFT JOIN branches b
              ON b.branch_id =
                 d.branch_id
          LEFT JOIN departments p
              ON p.department_id =
                 d.parent_department_id
          WHERE d.department_id = ?
            AND d.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [departmentId]
      );

    const department =
      rows[0] as
        | DepartmentDatabaseRow
        | undefined;

    if (!department) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE departments
        SET parent_department_id = NULL
        WHERE parent_department_id = ?
          AND deleted_at IS NULL
      `,
      [departmentId]
    );

    await connection.query(
      `
        UPDATE user_roles
        SET is_active = 0
        WHERE department_id = ?
          AND is_active = 1
      `,
      [departmentId]
    );

    await connection.query(
      `
        UPDATE user_sessions s
        INNER JOIN user_roles ur
            ON ur.user_id = s.user_id
        SET s.revoked_at =
            CURRENT_TIMESTAMP
        WHERE ur.department_id = ?
          AND s.revoked_at IS NULL
      `,
      [departmentId]
    );

    await connection.query(
      `
        UPDATE departments
        SET
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE department_id = ?
      `,
      [departmentId]
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
            'department',
            'department_deleted',
            'departments',
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
        department.company_id,
        actor.userId,
        departmentId,
        safeJson(department),

        safeJson({
          departmentId,
          isActive: false,
          deleted: true,
          childDepartmentsDetached: true
        }),

        `/api/v1/departments/${departmentId}`,
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

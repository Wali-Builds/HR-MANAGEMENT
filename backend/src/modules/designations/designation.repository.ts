import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateDesignationInput,
  UpdateDesignationInput
} from "./designation.schema.js";

import type {
  DesignationActor,
  DesignationDatabaseRow,
  DesignationListOptions,
  DesignationListResult,
  RequestMetadata
} from "./designation.types.js";

const designationSelectColumns = `
  designation_id,
  company_id,
  department_id,
  designation_code,
  designation_name,
  grade,
  job_level,
  description,
  minimum_salary,
  maximum_salary,
  is_managerial,
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

export async function findActiveDepartmentForCompany(
  departmentId: string,
  companyId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        SELECT department_id
        FROM departments
        WHERE department_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [departmentId, companyId]
    );

  return rows.length > 0;
}

// edited by wali: Resolve designation scope through its department's branch assignment.
export async function findDepartmentBranchForCompany(
  departmentId: string,
  companyId: string
): Promise<string | null> {
  const rows = await databasePool.query(
    `
      SELECT branch_id
      FROM departments
      WHERE department_id = ?
        AND company_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [departmentId, companyId]
  );
  const row = rows[0] as { branch_id: string | number | bigint | null } | undefined;
  return row?.branch_id == null ? null : String(row.branch_id);
}

export async function findDesignationCodeConflict(
  companyId: string,
  departmentId: string,
  designationCode: string,
  excludeDesignationId?: string
): Promise<string | null> {
  let sql = `
    SELECT designation_id
    FROM designations
    WHERE company_id = ?
      AND department_id = ?
      AND designation_code = ?
  `;

  const values: unknown[] = [
    companyId,
    departmentId,
    designationCode
  ];

  if (excludeDesignationId) {
    sql += `
      AND designation_id <> ?
    `;

    values.push(
      excludeDesignationId
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
        designation_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.designation_id)
    : null;
}

export async function areDesignationAssignmentsInDepartment(
  designationId: string,
  departmentId: string
): Promise<boolean> {
  // edited by wali: Only current assignments for active employees block moving a designation.
  const rows = await databasePool.query(
    `
      SELECT department_id
      FROM (
        SELECT department_id
        FROM positions
        WHERE designation_id = ?

        UNION ALL

        SELECT ea.department_id
        FROM employee_assignments ea
        INNER JOIN employees e
          ON e.employee_id = ea.employee_id
        WHERE ea.designation_id = ?
          AND ea.is_current = 1
          AND e.is_active = 1
          AND e.deleted_at IS NULL
      ) linked_assignments
    `,
    [designationId, designationId]
  );

  // edited by wali: Narrow raw database results before comparing linked department IDs.
  return rows.every((row: unknown) => {
    const department = row as {
      department_id: string | number | bigint | null;
    };

    return department.department_id !== null &&
      String(department.department_id) === departmentId;
  });
}

export async function listDesignationRecords(
  options: DesignationListOptions
): Promise<DesignationListResult> {
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

  // edited by wali: Filter designations to departments in assigned branches.
  if (options.branchIds?.length) {
    const placeholders = options.branchIds.map(() => "?").join(", ");
    conditions.push(`department_id IN (
      SELECT department_id
      FROM departments
      WHERE branch_id IN (${placeholders})
    )`);
    values.push(...options.branchIds);
  }

  if (options.departmentId) {
    // edited by wali: Scope designation results to their owning department when requested.
    conditions.push(
      "department_id = ?"
    );

    values.push(
      options.departmentId
    );
  }

  if (options.grade) {
    conditions.push(
      "grade = ?"
    );

    values.push(
      options.grade
    );
  }

  if (
    options.jobLevel !== undefined
  ) {
    conditions.push(
      "job_level = ?"
    );

    values.push(
      options.jobLevel
    );
  }

  if (
    options.isManagerial !==
      undefined
  ) {
    conditions.push(
      "is_managerial = ?"
    );

    values.push(
      options.isManagerial
        ? 1
        : 0
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
        designation_code LIKE ?
        OR designation_name LIKE ?
        OR grade LIKE ?
        OR description LIKE ?
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
        FROM designations
        WHERE ${whereClause}
      `,
      values
    );

  const total = Number(
    String(
      (
        countRows[0] as {
          total:
            | string
            | number
            | bigint;
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
          ${designationSelectColumns}
        FROM designations
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
    designations:
      rows as
        DesignationDatabaseRow[],

    total
  };
}

export async function findDesignationById(
  designationId: string
): Promise<DesignationDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${designationSelectColumns}
        FROM designations
        WHERE designation_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [designationId]
    );

  return (
    rows[0] as
      | DesignationDatabaseRow
      | undefined
  ) ?? null;
}

export async function createDesignationRecord(
  companyId: string,
  input: CreateDesignationInput,
  actor: DesignationActor,
  metadata: RequestMetadata
): Promise<DesignationDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const insertResult =
      await connection.query(
        `
          INSERT INTO designations (
              company_id,
              department_id,
              designation_code,
              designation_name,
              grade,
              job_level,
              description,
              minimum_salary,
              maximum_salary,
              is_managerial,
              is_active
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?
          )
        `,
        [
          companyId,
          input.departmentId,
          input.designationCode,
          input.designationName,
          input.grade ?? null,
          input.jobLevel ?? null,
          input.description ?? null,
          input.minimumSalary ?? null,
          input.maximumSalary ?? null,
          input.isManagerial ? 1 : 0,
          input.isActive ? 1 : 0
        ]
      );

    const designationId =
      String(
        insertResult.insertId
      );

    const rows =
      await connection.query(
        `
          SELECT
            ${designationSelectColumns}
          FROM designations
          WHERE designation_id = ?
          LIMIT 1
        `,
        [designationId]
      );

    const designation =
      rows[0] as
        | DesignationDatabaseRow
        | undefined;

    if (!designation) {
      throw new Error(
        "Created designation could not be retrieved"
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
            'designation',
            'designation_created',
            'designations',
            ?,
            ?,
            'POST',
            '/api/v1/designations',
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        designationId,
        safeJson(designation),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return designation;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateDesignationRecord(
  designationId: string,
  input: UpdateDesignationInput,
  actor: DesignationActor,
  metadata: RequestMetadata
): Promise<DesignationDatabaseRow | null> {
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
            ${designationSelectColumns}
          FROM designations
          WHERE designation_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [designationId]
      );

    const currentDesignation =
      currentRows[0] as
        | DesignationDatabaseRow
        | undefined;

    if (!currentDesignation) {
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

    if (
      input.designationCode !==
        undefined
    ) {
      addUpdate(
        "designation_code",
        input.designationCode
      );
    }

    if (
      input.designationName !==
        undefined
    ) {
      addUpdate(
        "designation_name",
        input.designationName
      );
    }

    if (input.departmentId !== undefined) {
      addUpdate(
        "department_id",
        input.departmentId
      );
    }

    if (input.grade !== undefined) {
      addUpdate(
        "grade",
        input.grade
      );
    }

    if (
      input.jobLevel !== undefined
    ) {
      addUpdate(
        "job_level",
        input.jobLevel
      );
    }

    if (
      input.description !==
        undefined
    ) {
      addUpdate(
        "description",
        input.description
      );
    }

    if (
      input.minimumSalary !==
        undefined
    ) {
      addUpdate(
        "minimum_salary",
        input.minimumSalary
      );
    }

    if (
      input.maximumSalary !==
        undefined
    ) {
      addUpdate(
        "maximum_salary",
        input.maximumSalary
      );
    }

    if (
      input.isManagerial !==
        undefined
    ) {
      addUpdate(
        "is_managerial",
        input.isManagerial
          ? 1
          : 0
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
        "No designation fields were provided for update"
      );
    }

    values.push(designationId);

    await connection.query(
      `
        UPDATE designations
        SET ${assignments.join(", ")}
        WHERE designation_id = ?
          AND deleted_at IS NULL
      `,
      values
    );

    const updatedRows =
      await connection.query(
        `
          SELECT
            ${designationSelectColumns}
          FROM designations
          WHERE designation_id = ?
          LIMIT 1
        `,
        [designationId]
      );

    const updatedDesignation =
      updatedRows[0] as
        | DesignationDatabaseRow
        | undefined;

    if (!updatedDesignation) {
      throw new Error(
        "Updated designation could not be retrieved"
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
            'designation',
            'designation_updated',
            'designations',
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
        currentDesignation.company_id,
        actor.userId,
        designationId,
        safeJson(currentDesignation),
        safeJson(updatedDesignation),
        `/api/v1/designations/${designationId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedDesignation;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteDesignationRecord(
  designationId: string,
  actor: DesignationActor,
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
            ${designationSelectColumns}
          FROM designations
          WHERE designation_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [designationId]
      );

    const designation =
      rows[0] as
        | DesignationDatabaseRow
        | undefined;

    if (!designation) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE designations
        SET
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE designation_id = ?
      `,
      [designationId]
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
            'designation',
            'designation_deleted',
            'designations',
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
        designation.company_id,
        actor.userId,
        designationId,
        safeJson(designation),

        safeJson({
          designationId,
          isActive: false,
          deleted: true
        }),

        `/api/v1/designations/${designationId}`,
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

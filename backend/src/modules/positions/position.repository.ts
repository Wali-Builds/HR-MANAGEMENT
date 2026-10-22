import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreatePositionInput,
  UpdatePositionInput
} from "./position.schema.js";

import type {
  PositionActor,
  PositionDatabaseRow,
  PositionListOptions,
  PositionListResult,
  PositionReferenceRow,
  RequestMetadata
} from "./position.types.js";

const positionSelectColumns = `
  p.position_id,
  p.company_id,
  p.branch_id,
  p.department_id,
  p.designation_id,
  p.reports_to_position_id,
  p.position_code,
  p.position_title,
  p.position_type,
  p.approved_headcount,
  p.filled_headcount,
  p.minimum_salary,
  p.maximum_salary,
  p.currency_code,
  p.position_status,
  p.effective_from,
  p.effective_to,
  p.created_at,
  p.updated_at,

  b.branch_name,
  d.department_name,
  dg.designation_name,

  parent.position_title
    AS parent_position_title
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

async function lockActiveDesignationForPosition(
  connection: PoolConnection,
  designationId: string,
  companyId: string
): Promise<void> {
  const rows =
    await connection.query(
      `
        SELECT designation_id
        FROM designations
        WHERE designation_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        designationId,
        companyId
      ]
    );

  if (rows.length === 0) {
    throw new Error(
      "POSITION_DESIGNATION_INACTIVE"
    );
  }
}

async function lockActiveBranchForPosition(
  connection: PoolConnection,
  branchId: string | null,
  companyId: string
): Promise<void> {
  if (!branchId) return;

  const rows = await connection.query(
    `
      SELECT branch_id
      FROM branches
      WHERE branch_id = ?
        AND company_id = ?
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [branchId, companyId]
  );

  if (rows.length === 0) {
    throw new Error("POSITION_BRANCH_INACTIVE");
  }
}

async function lockActiveDepartmentForPosition(
  connection: PoolConnection,
  departmentId: string | null,
  companyId: string
): Promise<void> {
  if (!departmentId) return;

  const rows = await connection.query(
    `
      SELECT department_id
      FROM departments
      WHERE department_id = ?
        AND company_id = ?
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [departmentId, companyId]
  );

  if (rows.length === 0) {
    throw new Error("POSITION_DEPARTMENT_INACTIVE");
  }
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

export async function findActiveDepartmentForCompany(
  departmentId: string,
  companyId: string
): Promise<{
  departmentId: string;
  branchId: string | null;
} | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            department_id,
            branch_id
        FROM departments
        WHERE department_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        departmentId,
        companyId
      ]
    );

  const row = rows[0] as
    | {
        department_id:
          string | number | bigint;

        branch_id:
          string |
          number |
          bigint |
          null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    departmentId:
      String(row.department_id),

    branchId:
      row.branch_id === null
        ? null
        : String(row.branch_id)
  };
}

export async function findActiveDesignationForCompany(
  designationId: string,
  companyId: string
): Promise<{ departmentId: string | null } | null> {
  const rows =
    await databasePool.query(
      `
        -- edited by wali: Return designation scope for position validation.
        SELECT designation_id, department_id
        FROM designations
        WHERE designation_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        designationId,
        companyId
      ]
    );

  const row = rows[0] as
    | {
        department_id: string | number | bigint | null;
      }
    | undefined;

  return row
    ? {
        departmentId:
          row.department_id === null
            ? null
            : String(row.department_id)
      }
    : null;
}

export async function findPositionReferenceById(
  positionId: string
): Promise<PositionReferenceRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            position_id,
            company_id,
            branch_id,
            department_id,
            designation_id,
            reports_to_position_id,
            approved_headcount,
            filled_headcount,
            position_status,
            effective_from,
            effective_to
        FROM positions
        WHERE position_id = ?
        LIMIT 1
      `,
      [positionId]
    );

  return (
    rows[0] as
      | PositionReferenceRow
      | undefined
  ) ?? null;
}

export async function findPositionCodeConflict(
  companyId: string,
  departmentId: string | null,
  positionCode: string,
  excludePositionId?: string
): Promise<string | null> {
  let sql = `
    SELECT position_id
    FROM positions
    WHERE company_id = ?
      -- edited by wali: NULL-safe matching handles company-wide positions without a department.
      AND department_id <=> ?
      AND position_code = ?
  `;

  const values: unknown[] = [
    companyId,
    departmentId,
    positionCode
  ];

  if (excludePositionId) {
    sql += `
      AND position_id <> ?
    `;

    values.push(
      excludePositionId
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
        position_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.position_id)
    : null;
}

export async function wouldCreatePositionCycle(
  positionId: string,
  proposedParentPositionId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        WITH RECURSIVE descendants AS (
          SELECT position_id
          FROM positions
          WHERE reports_to_position_id = ?

          UNION ALL

          SELECT child.position_id
          FROM positions child
          INNER JOIN descendants tree
              ON child.reports_to_position_id =
                 tree.position_id
        )
        SELECT position_id
        FROM descendants
        WHERE position_id = ?
        LIMIT 1
      `,
      [
        positionId,
        proposedParentPositionId
      ]
    );

  return rows.length > 0;
}

export async function countCurrentPositionAssignments(
  positionId: string
): Promise<number> {
  const rows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total
        FROM position_assignments
        WHERE position_id = ?
          AND is_current = 1
          AND (
              effective_to IS NULL
              OR effective_to >= CURRENT_DATE
          )
      `,
      [positionId]
    );

  return Number(
    String(
      (
        rows[0] as {
          total:
            | string
            | number
            | bigint;
        }
      ).total
    )
  );
}

export async function listPositionRecords(
  options: PositionListOptions
): Promise<PositionListResult> {
  const conditions: string[] = [
    "1 = 1"
  ];

  const values: unknown[] = [];

  if (options.companyId) {
    conditions.push(
      "p.company_id = ?"
    );

    values.push(
      options.companyId
    );
  }

  if (options.branchId) {
    conditions.push(
      "p.branch_id = ?"
    );

    values.push(
      options.branchId
    );
  }

  // edited by wali: Keep branch-admin position lists inside assigned branches.
  if (options.branchIds?.length) {
    const placeholders = options.branchIds.map(() => "?").join(", ");
    conditions.push(`p.branch_id IN (${placeholders})`);
    values.push(...options.branchIds);
  }

  if (options.departmentId) {
    conditions.push(
      "p.department_id = ?"
    );

    values.push(
      options.departmentId
    );
  }

  if (options.designationId) {
    conditions.push(
      "p.designation_id = ?"
    );

    values.push(
      options.designationId
    );
  }

  if (
    options.reportsToPositionId
  ) {
    conditions.push(
      "p.reports_to_position_id = ?"
    );

    values.push(
      options.reportsToPositionId
    );
  }

  if (options.positionType) {
    conditions.push(
      "p.position_type = ?"
    );

    values.push(
      options.positionType
    );
  }

  if (options.positionStatus) {
    conditions.push(
      "p.position_status = ?"
    );

    values.push(
      options.positionStatus
    );
  }

  if (
    options.hasVacancy !== undefined
  ) {
    conditions.push(
      options.hasVacancy
        ? "p.filled_headcount < p.approved_headcount"
        : "p.filled_headcount >= p.approved_headcount"
    );
  }

  if (options.search) {
    conditions.push(`
      (
        p.position_code LIKE ?
        OR p.position_title LIKE ?
        OR p.position_type LIKE ?
        OR b.branch_name LIKE ?
        OR d.department_name LIKE ?
        OR dg.designation_name LIKE ?
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
        FROM positions p

        LEFT JOIN branches b
            ON b.branch_id =
               p.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               p.department_id

        LEFT JOIN designations dg
            ON dg.designation_id =
               p.designation_id

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
          ${positionSelectColumns}

        FROM positions p

        LEFT JOIN branches b
            ON b.branch_id =
               p.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               p.department_id

        LEFT JOIN designations dg
            ON dg.designation_id =
               p.designation_id

        LEFT JOIN positions parent
            ON parent.position_id =
               p.reports_to_position_id

        WHERE ${whereClause}

        ORDER BY
          p.${options.sortBy}
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
    positions:
      rows as PositionDatabaseRow[],

    total
  };
}

export async function findPositionById(
  positionId: string
): Promise<PositionDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${positionSelectColumns}

        FROM positions p

        LEFT JOIN branches b
            ON b.branch_id =
               p.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               p.department_id

        LEFT JOIN designations dg
            ON dg.designation_id =
               p.designation_id

        LEFT JOIN positions parent
            ON parent.position_id =
               p.reports_to_position_id

        WHERE p.position_id = ?
        LIMIT 1
      `,
      [positionId]
    );

  return (
    rows[0] as
      | PositionDatabaseRow
      | undefined
  ) ?? null;
}

export async function createPositionRecord(
  companyId: string,
  input: CreatePositionInput,
  actor: PositionActor,
  metadata: RequestMetadata
): Promise<PositionDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await lockActiveBranchForPosition(
      connection,
      input.branchId ?? null,
      companyId
    );
    await lockActiveDepartmentForPosition(
      connection,
      input.departmentId ?? null,
      companyId
    );

    if (input.designationId) {
      await lockActiveDesignationForPosition(
        connection,
        input.designationId,
        companyId
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO positions (
              company_id,
              branch_id,
              department_id,
              designation_id,
              reports_to_position_id,
              position_code,
              position_title,
              position_type,
              approved_headcount,
              filled_headcount,
              minimum_salary,
              maximum_salary,
              currency_code,
              position_status,
              effective_from,
              effective_to
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, 0, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          companyId,
          input.branchId ?? null,
          input.departmentId ?? null,
          input.designationId ?? null,
          input.reportsToPositionId ??
            null,
          input.positionCode,
          input.positionTitle,
          input.positionType,
          input.approvedHeadcount,
          input.minimumSalary ?? null,
          input.maximumSalary ?? null,
          input.currencyCode,
          input.positionStatus,
          input.effectiveFrom ?? null,
          input.effectiveTo ?? null
        ]
      );

    const positionId =
      String(
        insertResult.insertId
      );

    const rows =
      await connection.query(
        `
          SELECT
            ${positionSelectColumns}

          FROM positions p

          LEFT JOIN branches b
              ON b.branch_id =
                 p.branch_id

          LEFT JOIN departments d
              ON d.department_id =
                 p.department_id

          LEFT JOIN designations dg
              ON dg.designation_id =
                 p.designation_id

          LEFT JOIN positions parent
              ON parent.position_id =
                 p.reports_to_position_id

          WHERE p.position_id = ?
          LIMIT 1
        `,
        [positionId]
      );

    const position =
      rows[0] as
        | PositionDatabaseRow
        | undefined;

    if (!position) {
      throw new Error(
        "Created position could not be retrieved"
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
            'position',
            'position_created',
            'positions',
            ?,
            ?,
            'POST',
            '/api/v1/positions',
            ?,
            ?
        )
      `,
      [
        companyId,
        actor.userId,
        positionId,
        safeJson(position),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return position;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePositionRecord(
  positionId: string,
  input: UpdatePositionInput,
  actor: PositionActor,
  metadata: RequestMetadata
): Promise<PositionDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentRows =
      await connection.query(
        `
          SELECT *
          FROM positions
          WHERE position_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [positionId]
      );

    const currentPosition =
      currentRows[0] as
        | Record<string, unknown>
        | undefined;

    if (!currentPosition) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingBranchId =
      input.branchId !== undefined
        ? input.branchId
        : currentPosition.branch_id === null
          ? null
          : String(currentPosition.branch_id);
    const resultingDepartmentId =
      input.departmentId !== undefined
        ? input.departmentId
        : currentPosition.department_id === null
          ? null
          : String(currentPosition.department_id);

    const resultingDesignationId =
      input.designationId !== undefined
        ? input.designationId
        : currentPosition.designation_id === null
          ? null
          : String(currentPosition.designation_id);

    const resultingPositionStatus =
      input.positionStatus ??
      String(currentPosition.position_status);

    if (resultingPositionStatus === "ACTIVE") {
      await lockActiveBranchForPosition(
        connection,
        resultingBranchId,
        String(currentPosition.company_id)
      );
      await lockActiveDepartmentForPosition(
        connection,
        resultingDepartmentId,
        String(currentPosition.company_id)
      );

      if (resultingDesignationId) {
        await lockActiveDesignationForPosition(
          connection,
          resultingDesignationId,
          String(currentPosition.company_id)
        );
      }
    }

    if (input.positionStatus === "INACTIVE") {
      const activeEmployeeRows =
        await connection.query(
          `
            SELECT COUNT(DISTINCT e.employee_id) AS total
            FROM position_assignments pa
            INNER JOIN employees e
                ON e.employee_id = pa.employee_id
            WHERE pa.position_id = ?
              AND pa.is_current = 1
              AND (
                  pa.effective_to IS NULL
                  OR pa.effective_to >= CURRENT_DATE
              )
              AND e.is_active = 1
          `,
          [positionId]
        );
      const activeEmployees = Number(
        String(
          (activeEmployeeRows[0] as { total: number | string | bigint }).total
        )
      );

      if (activeEmployees > 0) {
        throw new Error(
          "POSITION_HAS_ACTIVE_EMPLOYEES"
        );
      }
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
      input.departmentId !== undefined
    ) {
      addUpdate(
        "department_id",
        input.departmentId
      );
    }

    if (
      input.designationId !== undefined
    ) {
      addUpdate(
        "designation_id",
        input.designationId
      );
    }

    if (
      input.reportsToPositionId !==
      undefined
    ) {
      addUpdate(
        "reports_to_position_id",
        input.reportsToPositionId
      );
    }

    if (
      input.positionCode !== undefined
    ) {
      addUpdate(
        "position_code",
        input.positionCode
      );
    }

    if (
      input.positionTitle !==
      undefined
    ) {
      addUpdate(
        "position_title",
        input.positionTitle
      );
    }

    if (
      input.positionType !== undefined
    ) {
      addUpdate(
        "position_type",
        input.positionType
      );
    }

    if (
      input.approvedHeadcount !==
      undefined
    ) {
      addUpdate(
        "approved_headcount",
        input.approvedHeadcount
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
      input.currencyCode !==
      undefined
    ) {
      addUpdate(
        "currency_code",
        input.currencyCode
      );
    }

    if (
      input.positionStatus !==
      undefined
    ) {
      addUpdate(
        "position_status",
        input.positionStatus
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
      input.effectiveTo !== undefined
    ) {
      addUpdate(
        "effective_to",
        input.effectiveTo
      );
    }

    values.push(positionId);

    await connection.query(
      `
        UPDATE positions
        SET ${assignments.join(", ")}
        WHERE position_id = ?
      `,
      values
    );

    const updatedRows =
      await connection.query(
        `
          SELECT
            ${positionSelectColumns}

          FROM positions p

          LEFT JOIN branches b
              ON b.branch_id =
                 p.branch_id

          LEFT JOIN departments d
              ON d.department_id =
                 p.department_id

          LEFT JOIN designations dg
              ON dg.designation_id =
                 p.designation_id

          LEFT JOIN positions parent
              ON parent.position_id =
                 p.reports_to_position_id

          WHERE p.position_id = ?
          LIMIT 1
        `,
        [positionId]
      );

    const updatedPosition =
      updatedRows[0] as
        | PositionDatabaseRow
        | undefined;

    if (!updatedPosition) {
      throw new Error(
        "Updated position could not be retrieved"
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
            'position',
            'position_updated',
            'positions',
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
        updatedPosition.company_id,
        actor.userId,
        positionId,
        safeJson(currentPosition),
        safeJson(updatedPosition),
        `/api/v1/positions/${positionId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedPosition;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function closePositionRecord(
  positionId: string,
  actor: PositionActor,
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
          SELECT *
          FROM positions
          WHERE position_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [positionId]
      );

    const position =
      rows[0] as
        | Record<string, unknown>
        | undefined;

    if (!position) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    const assignmentRows =
      await connection.query(
        `
          SELECT COUNT(*) AS total
          FROM position_assignments
          WHERE position_id = ?
            AND is_current = 1
            AND (
                effective_to IS NULL
                OR effective_to >= CURRENT_DATE
            )
        `,
        [positionId]
      );

    const currentAssignments =
      Number(
        String(
          (
            assignmentRows[0] as {
              total:
                | string
                | number
                | bigint;
            }
          ).total
        )
      );

    if (currentAssignments > 0) {
      throw new Error(
        "POSITION_HAS_CURRENT_ASSIGNMENTS"
      );
    }

    await connection.query(
      `
        UPDATE positions
        SET
            position_status = 'CLOSED',
            effective_to =
                COALESCE(
                  effective_to,
                  CURRENT_DATE
                )
        WHERE position_id = ?
      `,
      [positionId]
    );

    await connection.query(
      `
        UPDATE positions
        SET reports_to_position_id = NULL
        WHERE reports_to_position_id = ?
      `,
      [positionId]
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
            'position',
            'position_closed',
            'positions',
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
        position.company_id,
        actor.userId,
        positionId,
        safeJson(position),

        safeJson({
          positionId,
          positionStatus:
            "CLOSED",
          effectiveTo:
            new Date()
              .toISOString()
              .slice(0, 10)
        }),

        `/api/v1/positions/${positionId}`,
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

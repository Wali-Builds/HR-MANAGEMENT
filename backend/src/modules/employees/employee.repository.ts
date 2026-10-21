import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import {
  requireQuotaAvailableUsingConnection
} from "../subscriptions/subscription-entitlement.service.js";

import type {
  UpdateEmployeeInput
} from "./employee.schema.js";

import type {
  EmployeeActor,
  EmployeeAssignmentMutation,
  EmployeeCreateRecord,
  EmployeeDatabaseRow,
  EmployeeSelfProfileResponse,
  EmployeeListOptions,
  EmployeeListResult,
  EmployeeStatusLookup,
  EmploymentTypeLookup,
  RequestMetadata
} from "./employee.types.js";

interface CompanyEmployeeSettings {
  companyId: string;
  employeeCodePrefix: string | null;
  employeeCodeLength: number;
}

interface DepartmentReference {
  departmentId: string;
  branchId: string | null;
}

export interface PositionReference {
  positionId: string;
  companyId: string;
  branchId: string | null;
  departmentId: string | null;
  designationId: string | null;
  positionStatus: string;
  approvedHeadcount: number;
  filledHeadcount: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface CurrentAssignmentReference {
  assignmentId: string;
  branchId: string | null;
  departmentId: string | null;
  designationId: string | null;
  reportingManagerId: string | null;
  positionId: string | null;
  assignmentType: string;
  effectiveFrom: string;
  workLocation: string | null;
  employmentPercentage: number;
}

export interface EmployeeConflictResult {
  employeeCodeExists: boolean;
  cnicNumberExists: boolean;
  officialEmailExists: boolean;
}

const employeeSelectColumns = `
  e.employee_id,
  e.company_id,
  e.employee_code,

  e.first_name,
  e.middle_name,
  e.last_name,
  e.preferred_name,

  e.father_name,
  e.spouse_name,

  e.gender,
  e.date_of_birth,
  e.marital_status,
  e.blood_group,
  e.nationality,

  e.cnic_number,
  e.passport_number,

  e.personal_email,
  e.official_email,
  e.mobile_number,
  e.alternate_number,

  e.employment_type_id,
  e.employee_status_id,

  e.joining_date,
  e.probation_end_date,
  e.confirmation_date,
  e.contract_start_date,
  e.contract_end_date,
  e.resignation_date,
  e.last_working_date,

  e.profile_photo_path,
  e.biometric_identifier,
  e.remarks,

  e.is_active,
  e.deleted_at,
  e.created_at,
  e.updated_at,

  et.type_code
    AS employment_type_code,

  et.type_name
    AS employment_type_name,

  es.status_code
    AS employee_status_code,

  es.status_name
    AS employee_status_name,

  es.is_active_employment,

  ea.assignment_id,

  ea.branch_id,
  b.branch_name,

  ea.department_id,
  d.department_name,

  ea.project_id,
  pr.project_code,
  pr.project_name,

  ea.designation_id,
  dg.designation_name,

  ea.reporting_manager_id,

  rm.employee_code
    AS reporting_manager_code,

  TRIM(
    CONCAT_WS(
      ' ',
      rm.first_name,
      rm.middle_name,
      rm.last_name
    )
  ) AS reporting_manager_name,

  ea.assignment_type,

  ea.effective_from
    AS assignment_effective_from,

  ea.effective_to
    AS assignment_effective_to,

  ea.work_location,
  ea.employment_percentage,
  ea.transfer_reason,

  pa.position_assignment_id,

  pa.position_id,
  p.position_code,
  p.position_title
`;

const employeeJoinSql = `
  FROM employees e

  INNER JOIN employment_types et
      ON et.employment_type_id =
         e.employment_type_id

  INNER JOIN employee_statuses es
      ON es.employee_status_id =
         e.employee_status_id

  LEFT JOIN employee_assignments ea
      ON ea.assignment_id = (
          SELECT ea2.assignment_id
          FROM employee_assignments ea2
          WHERE ea2.employee_id =
                e.employee_id
            AND ea2.is_current = 1
          ORDER BY
            ea2.effective_from DESC,
            ea2.assignment_id DESC
          LIMIT 1
      )

  LEFT JOIN branches b
      ON b.branch_id = ea.branch_id

  LEFT JOIN departments d
      ON d.department_id =
         ea.department_id

  LEFT JOIN projects pr
      ON pr.project_id = ea.project_id

  LEFT JOIN designations dg
      ON dg.designation_id =
         ea.designation_id

  LEFT JOIN employees rm
      ON rm.employee_id =
         ea.reporting_manager_id

  LEFT JOIN position_assignments pa
      ON pa.position_assignment_id = (
          SELECT pa2.position_assignment_id
          FROM position_assignments pa2
          WHERE pa2.employee_id =
                e.employee_id
            AND pa2.is_current = 1
          ORDER BY
            pa2.effective_from DESC,
            pa2.position_assignment_id DESC
          LIMIT 1
      )

  LEFT JOIN positions p
      ON p.position_id =
         pa.position_id
`;

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

function toDateOnly(
  value: Date | string | null
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function selectEmployeeByIdUsingConnection(
  connection: PoolConnection,
  employeeId: string
): Promise<EmployeeDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
          ${employeeSelectColumns}

        ${employeeJoinSql}

        WHERE e.employee_id = ?
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeDatabaseRow
      | undefined
  ) ?? null;
}

async function refreshPositionFilledHeadcount(
  connection: PoolConnection,
  positionId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE positions p
      SET p.filled_headcount = (
          SELECT COUNT(*)
          FROM position_assignments pa
          WHERE pa.position_id =
                p.position_id
            AND pa.is_current = 1
            AND (
                pa.effective_to IS NULL
                OR pa.effective_to >=
                   CURRENT_DATE
            )
      )
      WHERE p.position_id = ?
    `,
    [positionId]
  );
}

async function createPositionAssignment(
  connection: PoolConnection,
  employeeId: string,
  positionId: string,
  assignmentType: string,
  effectiveFrom: string,
  assignedByUserId: string
): Promise<void> {
  const positionRows =
    await connection.query(
      `
        SELECT
            position_id,
            company_id,
            position_status,
            approved_headcount,
            effective_from,
            effective_to
        FROM positions
        WHERE position_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [positionId]
    );

  const position =
    positionRows[0] as
      | {
          position_id:
            string | number | bigint;

          position_status: string;

          approved_headcount:
            string | number;

          effective_from:
            Date | string | null;

          effective_to:
            Date | string | null;
        }
      | undefined;

  if (
    !position ||
    position.position_status !==
      "ACTIVE"
  ) {
    throw new Error(
      "POSITION_NOT_ASSIGNABLE"
    );
  }

  const positionEffectiveFrom =
    toDateOnly(
      position.effective_from
    );

  const positionEffectiveTo =
    toDateOnly(
      position.effective_to
    );

  if (
    positionEffectiveFrom &&
    effectiveFrom <
      positionEffectiveFrom
  ) {
    throw new Error(
      "POSITION_NOT_EFFECTIVE"
    );
  }

  if (
    positionEffectiveTo &&
    effectiveFrom >
      positionEffectiveTo
  ) {
    throw new Error(
      "POSITION_NOT_EFFECTIVE"
    );
  }

  const countRows =
    await connection.query(
      `
        SELECT COUNT(*) AS total
        FROM position_assignments
        WHERE position_id = ?
          AND is_current = 1
          AND (
              effective_to IS NULL
              OR effective_to >=
                 CURRENT_DATE
          )
      `,
      [positionId]
    );

  const currentAssignments =
    Number(
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

  if (
    currentAssignments >=
    Number(
      position.approved_headcount
    )
  ) {
    throw new Error(
      "POSITION_CAPACITY_EXCEEDED"
    );
  }

  await connection.query(
    `
      INSERT INTO position_assignments (
          position_id,
          employee_id,
          assignment_type,
          effective_from,
          effective_to,
          is_current,
          assigned_by_user_id
      )
      VALUES (
          ?,
          ?,
          ?,
          ?,
          NULL,
          1,
          ?
      )
    `,
    [
      positionId,
      employeeId,
      assignmentType,
      effectiveFrom,
      assignedByUserId
    ]
  );

  await refreshPositionFilledHeadcount(
    connection,
    positionId
  );
}

async function closeCurrentPositionAssignments(
  connection: PoolConnection,
  employeeId: string,
  effectiveTo: string
): Promise<string[]> {
  const rows =
    await connection.query(
      `
        SELECT
            position_assignment_id,
            position_id
        FROM position_assignments
        WHERE employee_id = ?
          AND is_current = 1
        FOR UPDATE
      `,
      [employeeId]
    );

  const positionIds =
    Array.from(
      new Set(
        (
          rows as Array<{
            position_id:
              | string
              | number
              | bigint;
          }>
        ).map((row) =>
          String(row.position_id)
        )
      )
    );

  await connection.query(
    `
      UPDATE position_assignments
      SET
          is_current = 0,
          effective_to = ?
      WHERE employee_id = ?
        AND is_current = 1
    `,
    [
      effectiveTo,
      employeeId
    ]
  );

  for (
    const positionId of
    positionIds
  ) {
    await refreshPositionFilledHeadcount(
      connection,
      positionId
    );
  }

  return positionIds;
}

async function deactivateLinkedUserAccount(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE user_sessions s
      INNER JOIN users u
          ON u.user_id = s.user_id
      SET s.revoked_at =
          CURRENT_TIMESTAMP
      WHERE u.employee_id = ?
        AND s.revoked_at IS NULL
    `,
    [employeeId]
  );

  await connection.query(
    `
      UPDATE users
      SET is_active = 0
      WHERE employee_id = ?
        AND deleted_at IS NULL
    `,
    [employeeId]
  );
}

// edited by wali: Archiving removes the login and frees its unique username/email while retaining the user row for history.
async function archiveLinkedUserAccount(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE user_sessions s
      INNER JOIN users u
          ON u.user_id = s.user_id
      SET s.revoked_at =
          CURRENT_TIMESTAMP
      WHERE u.employee_id = ?
        AND s.revoked_at IS NULL
    `,
    [employeeId]
  );

  await connection.query(
    `
      UPDATE password_reset_tokens prt
      INNER JOIN users u
          ON u.user_id = prt.user_id
      SET prt.revoked_at =
          CURRENT_TIMESTAMP
      WHERE u.employee_id = ?
        AND prt.revoked_at IS NULL
        AND prt.used_at IS NULL
    `,
    [employeeId]
  );

  await connection.query(
    `
      UPDATE user_roles ur
      INNER JOIN users u
          ON u.user_id = ur.user_id
      SET ur.is_active = 0
      WHERE u.employee_id = ?
        AND ur.is_active = 1
    `,
    [employeeId]
  );

  await connection.query(
    `
      UPDATE users
      SET
          is_active = 0,
          deleted_at = COALESCE(
            deleted_at,
            CURRENT_TIMESTAMP
          ),
          username = CONCAT(
            '__archived__',
            user_id,
            '__',
            UUID()
          ),
          email = NULL
      WHERE employee_id = ?
    `,
    [employeeId]
  );
}

export async function findActiveCompanySettings(
  companyId: string
): Promise<CompanyEmployeeSettings | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            company_id,
            employee_code_prefix,
            employee_code_length
        FROM companies
        WHERE company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [companyId]
    );

  const row = rows[0] as
    | {
        company_id:
          string | number | bigint;

        employee_code_prefix:
          string | null;

        employee_code_length:
          string | number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    companyId:
      String(row.company_id),

    employeeCodePrefix:
      row.employee_code_prefix,

    employeeCodeLength:
      Number(
        row.employee_code_length
      )
  };
}

export async function findActiveEmploymentType(
  employmentTypeId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        SELECT employment_type_id
        FROM employment_types
        WHERE employment_type_id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [employmentTypeId]
    );

  return rows.length > 0;
}

export async function findActiveEmployeeStatus(
  employeeStatusId: string
): Promise<boolean> {
  const rows =
    await databasePool.query(
      `
        SELECT employee_status_id
        FROM employee_statuses
        WHERE employee_status_id = ?
          AND is_active = 1
        LIMIT 1
      `,
      [employeeStatusId]
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
): Promise<DepartmentReference | null> {
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
          | string
          | number
          | bigint
          | null;
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
        -- edited by wali: Return the department so assignments can validate designation scope.
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

export async function findActiveManagerForCompany(
  managerEmployeeId: string,
  companyId: string,
  branchId: string | null,
  departmentId: string | null
): Promise<boolean> {
  const scopeConditions: string[] = [];
  const values: unknown[] = [managerEmployeeId, companyId];
  if (branchId) {
    scopeConditions.push("ea.branch_id = ?");
    values.push(branchId);
  }
  if (departmentId) {
    scopeConditions.push("ea.department_id = ?");
    values.push(departmentId);
  }
  const rows =
    await databasePool.query(
      `
        SELECT e.employee_id
        FROM employees e
        INNER JOIN employee_assignments ea
            ON ea.employee_id = e.employee_id
           AND ea.is_current = 1
        INNER JOIN designations d
            ON d.designation_id = ea.designation_id
           AND d.company_id = e.company_id
           AND d.is_managerial = 1
           AND d.is_active = 1
           AND d.deleted_at IS NULL
        WHERE e.employee_id = ?
          AND e.company_id = ?
          AND e.is_active = 1
          AND e.deleted_at IS NULL
          ${scopeConditions.length ? `AND ${scopeConditions.join(" AND ")}` : ""}
        LIMIT 1
      `,
      values
    );

  return rows.length > 0;
}

export async function findPositionReference(
  positionId: string
): Promise<PositionReference | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            position_id,
            company_id,
            branch_id,
            department_id,
            designation_id,
            position_status,
            approved_headcount,
            filled_headcount,
            effective_from,
            effective_to
        FROM positions
        WHERE position_id = ?
        LIMIT 1
      `,
      [positionId]
    );

  const row = rows[0] as
    | {
        position_id:
          string | number | bigint;

        company_id:
          string | number | bigint;

        branch_id:
          | string
          | number
          | bigint
          | null;

        department_id:
          | string
          | number
          | bigint
          | null;

        designation_id:
          | string
          | number
          | bigint
          | null;

        position_status: string;

        approved_headcount:
          string | number;

        filled_headcount:
          string | number;

        effective_from:
          Date | string | null;

        effective_to:
          Date | string | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    positionId:
      String(row.position_id),

    companyId:
      String(row.company_id),

    branchId:
      row.branch_id === null
        ? null
        : String(row.branch_id),

    departmentId:
      row.department_id === null
        ? null
        : String(row.department_id),

    designationId:
      row.designation_id === null
        ? null
        : String(row.designation_id),

    positionStatus:
      row.position_status,

    approvedHeadcount:
      Number(
        row.approved_headcount
      ),

    filledHeadcount:
      Number(
        row.filled_headcount
      ),

    effectiveFrom:
      toDateOnly(
        row.effective_from
      ),

    effectiveTo:
      toDateOnly(
        row.effective_to
      )
  };
}

export async function findEmployeeConflicts(
  companyId: string,
  values: {
    employeeCode: string;
    cnicNumber: string | null;
    officialEmail: string | null;
  },
  excludeEmployeeId?: string
): Promise<EmployeeConflictResult> {
  let sql = `
    SELECT
        employee_id,
        employee_code,
        cnic_number,
        official_email
    FROM employees
    WHERE company_id = ?
      AND (
          employee_code = ?
  `;

  const parameters: unknown[] = [
    companyId,
    values.employeeCode
  ];

  if (values.cnicNumber) {
    sql += `
      OR cnic_number = ?
    `;

    parameters.push(
      values.cnicNumber
    );
  }

  if (values.officialEmail) {
    sql += `
      OR official_email = ?
    `;

    parameters.push(
      values.officialEmail
    );
  }

  sql += `
      )
  `;

  if (excludeEmployeeId) {
    sql += `
      AND employee_id <> ?
    `;

    parameters.push(
      excludeEmployeeId
    );
  }

  const rows =
    await databasePool.query(
      sql,
      parameters
    );

  const conflictRows =
    rows as Array<{
      employee_code: string;
      cnic_number: string | null;
      official_email: string | null;
    }>;

  return {
    employeeCodeExists:
      conflictRows.some(
        (row) =>
          row.employee_code ===
          values.employeeCode
      ),

    cnicNumberExists:
      values.cnicNumber !== null &&
      conflictRows.some(
        (row) =>
          row.cnic_number ===
          values.cnicNumber
      ),

    officialEmailExists:
      values.officialEmail !== null &&
      conflictRows.some(
        (row) =>
          row.official_email ===
          values.officialEmail
      )
  };
}

export async function getEmployeeLookups(): Promise<{
  employmentTypes:
    EmploymentTypeLookup[];

  employeeStatuses:
    EmployeeStatusLookup[];
}> {
  const employmentTypeRows =
    await databasePool.query(
      `
        SELECT
            employment_type_id,
            type_code,
            type_name
        FROM employment_types
        WHERE is_active = 1
        ORDER BY type_name
      `
    );

  const statusRows =
    await databasePool.query(
      `
        SELECT
            employee_status_id,
            status_code,
            status_name,
            is_active_employment
        FROM employee_statuses
        WHERE is_active = 1
        ORDER BY employee_status_id
      `
    );

  return {
    employmentTypes:
      (
        employmentTypeRows as Array<{
          employment_type_id:
            | string
            | number
            | bigint;

          type_code: string;
          type_name: string;
        }>
      ).map((row) => ({
        employmentTypeId:
          String(
            row.employment_type_id
          ),

        typeCode:
          row.type_code,

        typeName:
          row.type_name
      })),

    employeeStatuses:
      (
        statusRows as Array<{
          employee_status_id:
            | string
            | number
            | bigint;

          status_code: string;
          status_name: string;

          is_active_employment:
            number | boolean;
        }>
      ).map((row) => ({
        employeeStatusId:
          String(
            row.employee_status_id
          ),

        statusCode:
          row.status_code,

        statusName:
          row.status_name,

        isActiveEmployment:
          row.is_active_employment ===
            true ||
          Number(
            row.is_active_employment
          ) === 1
      }))
  };
}

export async function listEmployeeRecords(
  options: EmployeeListOptions
): Promise<EmployeeListResult> {
  const conditions: string[] = [
    "e.deleted_at IS NULL"
  ];

  const values: unknown[] = [];

  if (options.companyId) {
    conditions.push(
      "e.company_id = ?"
    );

    values.push(
      options.companyId
    );
  }

  if (options.branchId) {
    conditions.push(
      "ea.branch_id = ?"
    );

    values.push(
      options.branchId
    );
  }

  // edited by wali: Filter workforce results by assigned Branch Admin scopes.
  if (options.branchIds?.length) {
    const placeholders = options.branchIds.map(() => "?").join(", ");
    conditions.push(`ea.branch_id IN (${placeholders})`);
    values.push(...options.branchIds);
  }

  if (options.departmentId) {
    conditions.push(
      "ea.department_id = ?"
    );

    values.push(
      options.departmentId
    );
  }

  if (options.designationId) {
    conditions.push(
      "ea.designation_id = ?"
    );

    values.push(
      options.designationId
    );
  }

  if (options.reportingManagerId) {
    conditions.push(
      "ea.reporting_manager_id = ?"
    );

    values.push(
      options.reportingManagerId
    );
  }

  if (options.positionId) {
    conditions.push(
      "pa.position_id = ?"
    );

    values.push(
      options.positionId
    );
  }

  if (options.employmentTypeId) {
    conditions.push(
      "e.employment_type_id = ?"
    );

    values.push(
      options.employmentTypeId
    );
  }

  if (options.employeeStatusId) {
    conditions.push(
      "e.employee_status_id = ?"
    );

    values.push(
      options.employeeStatusId
    );
  }

  if (options.gender) {
    conditions.push(
      "e.gender = ?"
    );

    values.push(
      options.gender
    );
  }

  if (
    options.isActive !== undefined
  ) {
    conditions.push(
      "e.is_active = ?"
    );

    values.push(
      options.isActive ? 1 : 0
    );
  }

  if (options.joiningDateFrom) {
    conditions.push(
      "e.joining_date >= ?"
    );

    values.push(
      options.joiningDateFrom
    );
  }

  if (options.joiningDateTo) {
    conditions.push(
      "e.joining_date <= ?"
    );

    values.push(
      options.joiningDateTo
    );
  }

  if (options.search) {
    conditions.push(`
      (
        e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR e.preferred_name LIKE ?
        OR e.cnic_number LIKE ?
        OR e.personal_email LIKE ?
        OR e.official_email LIKE ?
        OR e.mobile_number LIKE ?
        OR b.branch_name LIKE ?
        OR d.department_name LIKE ?
        OR dg.designation_name LIKE ?
        OR p.position_title LIKE ?
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

        ${employeeJoinSql}

        WHERE ${whereClause}
      `,
      values
    );

  const total =
    Number(
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
          ${employeeSelectColumns}

        ${employeeJoinSql}

        WHERE ${whereClause}

        ORDER BY
          e.${options.sortBy}
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
    employees:
      rows as EmployeeDatabaseRow[],

    total
  };
}

export async function findEmployeeById(
  employeeId: string
): Promise<EmployeeDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${employeeSelectColumns}

        ${employeeJoinSql}

        WHERE e.employee_id = ?
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeDatabaseRow
      | undefined
  ) ?? null;
}

// edited by wali: Read the employee's own profile details while excluding national and biometric identifiers.
export async function findEmployeeSelfProfile(
  employeeId: string,
  companyId: string
): Promise<EmployeeSelfProfileResponse | null> {
  const rows = await databasePool.query(
    `
      SELECT
        e.employee_id,
        e.employee_code,
        TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
        e.preferred_name,
        e.gender,
        e.date_of_birth,
        e.marital_status,
        e.nationality,
        e.official_email,
        e.personal_email,
        e.mobile_number,
        e.alternate_number,
        e.company_id,
        c.company_code,
        c.display_name AS company_name,
        b.branch_name,
        d.department_name,
        dg.designation_name,
        p.position_title,
        TRIM(CONCAT_WS(' ', rm.first_name, rm.middle_name, rm.last_name)) AS reporting_manager_name,
        ea.assignment_type,
        ea.effective_from AS assignment_effective_from,
        ea.work_location,
        ea.employment_percentage,
        et.type_name AS employment_type_name,
        es.status_name AS employee_status_name,
        es.is_active_employment,
        e.joining_date,
        e.probation_end_date,
        e.confirmation_date,
        e.contract_start_date,
        e.contract_end_date,
        e.resignation_date,
        e.last_working_date
      FROM employees e
      INNER JOIN companies c
        ON c.company_id = e.company_id
      INNER JOIN employment_types et
        ON et.employment_type_id = e.employment_type_id
      INNER JOIN employee_statuses es
        ON es.employee_status_id = e.employee_status_id
      LEFT JOIN employee_assignments ea
        ON ea.assignment_id = (
          SELECT ea2.assignment_id
          FROM employee_assignments ea2
          WHERE ea2.employee_id = e.employee_id
            AND ea2.is_current = 1
          ORDER BY ea2.effective_from DESC, ea2.assignment_id DESC
          LIMIT 1
        )
      LEFT JOIN departments d
        ON d.department_id = ea.department_id
      LEFT JOIN branches b
        ON b.branch_id = ea.branch_id
      LEFT JOIN designations dg
        ON dg.designation_id = ea.designation_id
      LEFT JOIN employees rm
        ON rm.employee_id = ea.reporting_manager_id
      LEFT JOIN position_assignments pa
        ON pa.position_assignment_id = (
          SELECT pa2.position_assignment_id
          FROM position_assignments pa2
          WHERE pa2.employee_id = e.employee_id
            AND pa2.is_current = 1
          ORDER BY pa2.effective_from DESC, pa2.position_assignment_id DESC
          LIMIT 1
        )
      LEFT JOIN positions p
        ON p.position_id = pa.position_id
      WHERE e.employee_id = ?
        AND e.company_id = ?
        AND e.deleted_at IS NULL
      LIMIT 1
    `,
    [employeeId, companyId]
  );

  const row = rows[0] as
    | {
        employee_id: string | number | bigint;
        employee_code: string;
        full_name: string;
        preferred_name: string | null;
        gender: string | null;
        date_of_birth: Date | string | null;
        marital_status: string | null;
        nationality: string;
        official_email: string | null;
        personal_email: string | null;
        mobile_number: string | null;
        alternate_number: string | null;
        company_id: string | number | bigint;
        company_code: string;
        company_name: string;
        branch_name: string | null;
        department_name: string | null;
        designation_name: string | null;
        position_title: string | null;
        reporting_manager_name: string | null;
        assignment_type: string | null;
        assignment_effective_from: Date | string | null;
        work_location: string | null;
        employment_percentage: string | number | null;
        employment_type_name: string;
        employee_status_name: string;
        is_active_employment: number | boolean;
        joining_date: Date | string;
        probation_end_date: Date | string | null;
        confirmation_date: Date | string | null;
        contract_start_date: Date | string | null;
        contract_end_date: Date | string | null;
        resignation_date: Date | string | null;
        last_working_date: Date | string | null;
      }
    | undefined;

  if (!row) return null;

  return {
    employeeId: String(row.employee_id),
    employeeCode: row.employee_code,
    fullName: row.full_name,
    preferredName: row.preferred_name,
    gender: row.gender,
    dateOfBirth: toDateOnly(row.date_of_birth),
    maritalStatus: row.marital_status,
    nationality: row.nationality,
    officialEmail: row.official_email,
    personalEmail: row.personal_email,
    mobileNumber: row.mobile_number,
    alternateNumber: row.alternate_number,
    companyId: String(row.company_id),
    companyCode: row.company_code,
    companyName: row.company_name,
    branchName: row.branch_name,
    departmentName: row.department_name,
    designationName: row.designation_name,
    positionTitle: row.position_title,
    reportingManagerName: row.reporting_manager_name,
    assignmentType: row.assignment_type,
    assignmentEffectiveFrom: toDateOnly(row.assignment_effective_from),
    workLocation: row.work_location,
    employmentPercentage: row.employment_percentage === null ? null : Number(row.employment_percentage),
    employmentTypeName: row.employment_type_name,
    employeeStatusName: row.employee_status_name,
    isActiveEmployment: Number(row.is_active_employment) === 1,
    joiningDate: toDateOnly(row.joining_date) ?? "",
    probationEndDate: toDateOnly(row.probation_end_date),
    confirmationDate: toDateOnly(row.confirmation_date),
    contractStartDate: toDateOnly(row.contract_start_date),
    contractEndDate: toDateOnly(row.contract_end_date),
    resignationDate: toDateOnly(row.resignation_date),
    lastWorkingDate: toDateOnly(row.last_working_date)
  };
}

export async function createEmployeeRecord(
  input: EmployeeCreateRecord,
  actor: EmployeeActor,
  metadata: RequestMetadata
): Promise<EmployeeDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const companyRows =
      await connection.query(
        `
          SELECT
              employee_code_prefix,
              employee_code_length
          FROM companies
          WHERE company_id = ?
            AND is_active = 1
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [input.companyId]
      );

    const company =
      companyRows[0] as
        | {
            employee_code_prefix:
              string | null;

            employee_code_length:
              string | number;
          }
        | undefined;

    if (!company) {
      throw new Error(
        "COMPANY_NOT_FOUND"
      );
    }

    await requireQuotaAvailableUsingConnection(
      connection,
      input.companyId,
      "EMPLOYEE",
      null,
      input.isActive
    );

    let employeeCode =
      input.employeeCode;

    if (!employeeCode) {
      const prefix =
        (
          company
            .employee_code_prefix ??
          "EMP"
        )
          .trim()
          .toUpperCase();

      const codeLength =
        Math.max(
          Number(
            company
              .employee_code_length
          ),
          1
        );

      const codeRows =
        await connection.query(
          `
            SELECT employee_code
            FROM employees
            WHERE company_id = ?
              AND employee_code LIKE
                  CONCAT(?, '%')
          `,
          [
            input.companyId,
            prefix
          ]
        );

      let highestNumber = 0;

      for (
        const row of
        codeRows as Array<{
          employee_code: string;
        }>
      ) {
        const suffix =
          row.employee_code.slice(
            prefix.length
          );

        if (/^\d+$/.test(suffix)) {
          highestNumber =
            Math.max(
              highestNumber,
              Number(suffix)
            );
        }
      }

      const nextNumber =
        highestNumber + 1;

      employeeCode =
        `${prefix}${String(
          nextNumber
        ).padStart(
          codeLength,
          "0"
        )}`;

      if (
        employeeCode.length > 50
      ) {
        throw new Error(
          "EMPLOYEE_CODE_TOO_LONG"
        );
      }
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employees (
              company_id,
              employee_code,
              first_name,
              middle_name,
              last_name,
              preferred_name,
              father_name,
              spouse_name,
              gender,
              date_of_birth,
              marital_status,
              blood_group,
              nationality,
              cnic_number,
              passport_number,
              personal_email,
              official_email,
              mobile_number,
              alternate_number,
              employment_type_id,
              employee_status_id,
              joining_date,
              probation_end_date,
              confirmation_date,
              contract_start_date,
              contract_end_date,
              resignation_date,
              last_working_date,
              profile_photo_path,
              biometric_identifier,
              remarks,
              is_active
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          input.companyId,
          employeeCode,
          input.firstName,
          input.middleName,
          input.lastName,
          input.preferredName,
          input.fatherName,
          input.spouseName,
          input.gender,
          input.dateOfBirth,
          input.maritalStatus,
          input.bloodGroup,
          input.nationality,
          input.cnicNumber,
          input.passportNumber,
          input.personalEmail,
          input.officialEmail,
          input.mobileNumber,
          input.alternateNumber,
          input.employmentTypeId,
          input.employeeStatusId,
          input.joiningDate,
          input.probationEndDate,
          input.confirmationDate,
          input.contractStartDate,
          input.contractEndDate,
          input.resignationDate,
          input.lastWorkingDate,
          input.profilePhotoPath,
          input.biometricIdentifier,
          input.remarks,
          input.isActive ? 1 : 0
        ]
      );

    const employeeId =
      String(
        insertResult.insertId
      );

    await connection.query(
      `
        INSERT INTO employee_assignments (
            employee_id,
            branch_id,
            department_id,
            project_id,
            designation_id,
            reporting_manager_id,
            assignment_type,
            effective_from,
            effective_to,
            work_location,
            employment_percentage,
            transfer_reason,
            is_current
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            NULL, ?, ?, ?, 1
        )
      `,
      [
        employeeId,
        input.assignment.branchId,
        input.assignment.departmentId,
        input.assignment.projectId,
        input.assignment.designationId,
        input.assignment
          .reportingManagerId,
        input.assignment
          .assignmentType,
        input.assignment
          .effectiveFrom,
        input.assignment
          .workLocation,
        input.assignment
          .employmentPercentage,
        input.assignment
          .transferReason
      ]
    );

    if (
      input.assignment.positionId
    ) {
      await createPositionAssignment(
        connection,
        employeeId,
        input.assignment.positionId,
        input.assignment
          .assignmentType,
        input.assignment
          .effectiveFrom,
        actor.userId
      );
    }

    const employee =
      await selectEmployeeByIdUsingConnection(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "CREATED_EMPLOYEE_NOT_FOUND"
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
            'employee',
            'employee_created',
            'employees',
            ?,
            ?,
            'POST',
            '/api/v1/employees',
            ?,
            ?
        )
      `,
      [
        input.companyId,
        actor.userId,
        employeeId,
        safeJson(employee),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return employee;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeRecord(
  employeeId: string,
  companyId: string,
  input: UpdateEmployeeInput,
  assignment:
    EmployeeAssignmentMutation | null,
  actor: EmployeeActor,
  metadata: RequestMetadata
): Promise<EmployeeDatabaseRow | null> {
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
        "EMPLOYEE",
        employeeId,
        true
      );
    }

    const currentRows =
      await connection.query(
        `
          SELECT *
          FROM employees
          WHERE employee_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [employeeId]
      );

    const currentEmployee =
      currentRows[0] as
        | Record<string, unknown>
        | undefined;

    if (!currentEmployee) {
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

    if (input.employeeCode !== undefined) {
      addUpdate(
        "employee_code",
        input.employeeCode
      );
    }

    if (input.firstName !== undefined) {
      addUpdate(
        "first_name",
        input.firstName
      );
    }

    if (input.middleName !== undefined) {
      addUpdate(
        "middle_name",
        input.middleName
      );
    }

    if (input.lastName !== undefined) {
      addUpdate(
        "last_name",
        input.lastName
      );
    }

    if (input.preferredName !== undefined) {
      addUpdate(
        "preferred_name",
        input.preferredName
      );
    }

    if (input.fatherName !== undefined) {
      addUpdate(
        "father_name",
        input.fatherName
      );
    }

    if (input.spouseName !== undefined) {
      addUpdate(
        "spouse_name",
        input.spouseName
      );
    }

    if (input.gender !== undefined) {
      addUpdate(
        "gender",
        input.gender
      );
    }

    if (input.dateOfBirth !== undefined) {
      addUpdate(
        "date_of_birth",
        input.dateOfBirth
      );
    }

    if (input.maritalStatus !== undefined) {
      addUpdate(
        "marital_status",
        input.maritalStatus
      );
    }

    if (input.bloodGroup !== undefined) {
      addUpdate(
        "blood_group",
        input.bloodGroup
      );
    }

    if (input.nationality !== undefined) {
      addUpdate(
        "nationality",
        input.nationality
      );
    }

    if (input.cnicNumber !== undefined) {
      addUpdate(
        "cnic_number",
        input.cnicNumber
      );
    }

    if (input.passportNumber !== undefined) {
      addUpdate(
        "passport_number",
        input.passportNumber
      );
    }

    if (input.personalEmail !== undefined) {
      addUpdate(
        "personal_email",
        input.personalEmail
      );
    }

    if (input.officialEmail !== undefined) {
      addUpdate(
        "official_email",
        input.officialEmail
      );
    }

    if (input.mobileNumber !== undefined) {
      addUpdate(
        "mobile_number",
        input.mobileNumber
      );
    }

    if (input.alternateNumber !== undefined) {
      addUpdate(
        "alternate_number",
        input.alternateNumber
      );
    }

    if (input.employmentTypeId !== undefined) {
      addUpdate(
        "employment_type_id",
        input.employmentTypeId
      );
    }

    if (input.employeeStatusId !== undefined) {
      addUpdate(
        "employee_status_id",
        input.employeeStatusId
      );
    }

    if (input.joiningDate !== undefined) {
      addUpdate(
        "joining_date",
        input.joiningDate
      );
    }

    if (input.probationEndDate !== undefined) {
      addUpdate(
        "probation_end_date",
        input.probationEndDate
      );
    }

    if (input.confirmationDate !== undefined) {
      addUpdate(
        "confirmation_date",
        input.confirmationDate
      );
    }

    if (input.contractStartDate !== undefined) {
      addUpdate(
        "contract_start_date",
        input.contractStartDate
      );
    }

    if (input.contractEndDate !== undefined) {
      addUpdate(
        "contract_end_date",
        input.contractEndDate
      );
    }

    if (input.resignationDate !== undefined) {
      addUpdate(
        "resignation_date",
        input.resignationDate
      );
    }

    if (input.lastWorkingDate !== undefined) {
      addUpdate(
        "last_working_date",
        input.lastWorkingDate
      );
    }

    if (input.profilePhotoPath !== undefined) {
      addUpdate(
        "profile_photo_path",
        input.profilePhotoPath
      );
    }

    if (input.biometricIdentifier !== undefined) {
      addUpdate(
        "biometric_identifier",
        input.biometricIdentifier
      );
    }

    if (input.remarks !== undefined) {
      addUpdate(
        "remarks",
        input.remarks
      );
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (assignments.length > 0) {
      values.push(employeeId);

      await connection.query(
        `
          UPDATE employees
          SET ${assignments.join(", ")}
          WHERE employee_id = ?
            AND deleted_at IS NULL
        `,
        values
      );
    }

    if (assignment) {
      const currentAssignmentRows =
        await connection.query(
          `
            SELECT
                assignment_id,
                effective_from
            FROM employee_assignments
            WHERE employee_id = ?
              AND is_current = 1
            ORDER BY
              effective_from DESC,
              assignment_id DESC
            LIMIT 1
            FOR UPDATE
          `,
          [employeeId]
        );

      const currentAssignment =
        currentAssignmentRows[0] as
          | {
              assignment_id:
                | string
                | number
                | bigint;

              effective_from:
                Date | string;
            }
          | undefined;

      if (currentAssignment) {
        await connection.query(
          `
            UPDATE employee_assignments
            SET
                is_current = 0,
                effective_to =
                  DATE_SUB(
                    ?,
                    INTERVAL 1 DAY
                  )
            WHERE assignment_id = ?
          `,
          [
            assignment.effectiveFrom,
            currentAssignment
              .assignment_id
          ]
        );
      }

      await connection.query(
        `
          INSERT INTO employee_assignments (
              employee_id,
              branch_id,
              department_id,
              project_id,
              designation_id,
              reporting_manager_id,
              assignment_type,
              effective_from,
              effective_to,
              work_location,
              employment_percentage,
              transfer_reason,
              is_current
          )
          VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?,
              NULL, ?, ?, ?, 1
          )
        `,
        [
          employeeId,
          assignment.branchId,
          assignment.departmentId,
          assignment.projectId,
          assignment.designationId,
          assignment.reportingManagerId,
          assignment.assignmentType,
          assignment.effectiveFrom,
          assignment.workLocation,
          assignment.employmentPercentage,
          assignment.transferReason
        ]
      );

      const currentPositionRows =
        await connection.query(
          `
            SELECT
                position_assignment_id,
                position_id
            FROM position_assignments
            WHERE employee_id = ?
              AND is_current = 1
            ORDER BY
              effective_from DESC,
              position_assignment_id DESC
            LIMIT 1
            FOR UPDATE
          `,
          [employeeId]
        );

      const currentPosition =
        currentPositionRows[0] as
          | {
              position_assignment_id:
                | string
                | number
                | bigint;

              position_id:
                | string
                | number
                | bigint;
            }
          | undefined;

      const currentPositionId =
        currentPosition
          ? String(
              currentPosition
                .position_id
            )
          : null;

      if (
        currentPositionId !==
        assignment.positionId
      ) {
        if (currentPosition) {
          await connection.query(
            `
              UPDATE position_assignments
              SET
                  is_current = 0,
                  effective_to =
                    DATE_SUB(
                      ?,
                      INTERVAL 1 DAY
                    )
              WHERE position_assignment_id = ?
            `,
            [
              assignment.effectiveFrom,
              currentPosition
                .position_assignment_id
            ]
          );

          await refreshPositionFilledHeadcount(
            connection,
            currentPositionId as string
          );
        }

        if (assignment.positionId) {
          await createPositionAssignment(
            connection,
            employeeId,
            assignment.positionId,
            assignment.assignmentType,
            assignment.effectiveFrom,
            actor.userId
          );
        }
      }
    }

    if (input.isActive === false) {
      const today =
        new Date()
          .toISOString()
          .slice(0, 10);

      await connection.query(
        `
          UPDATE employee_assignments
          SET
              is_current = 0,
              effective_to =
                COALESCE(
                  effective_to,
                  ?
                )
          WHERE employee_id = ?
            AND is_current = 1
        `,
        [
          today,
          employeeId
        ]
      );

      await closeCurrentPositionAssignments(
        connection,
        employeeId,
        today
      );

      await deactivateLinkedUserAccount(
        connection,
        employeeId
      );
    }

    const updatedEmployee =
      await selectEmployeeByIdUsingConnection(
        connection,
        employeeId
      );

    if (!updatedEmployee) {
      throw new Error(
        "UPDATED_EMPLOYEE_NOT_FOUND"
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
            'employee',
            'employee_updated',
            'employees',
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
        updatedEmployee.company_id,
        actor.userId,
        employeeId,
        safeJson(currentEmployee),
        safeJson(updatedEmployee),
        `/api/v1/employees/${employeeId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedEmployee;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteEmployeeRecord(
  employeeId: string,
  actor: EmployeeActor,
  metadata: RequestMetadata
): Promise<boolean> {
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
          FROM employees
          WHERE employee_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [employeeId]
      );

    const employee =
      currentRows[0] as
        | Record<string, unknown>
        | undefined;

    if (!employee) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    await connection.query(
      `
        UPDATE employee_assignments
        SET
            is_current = 0,
            effective_to =
              COALESCE(
                effective_to,
                ?
              )
        WHERE employee_id = ?
          AND is_current = 1
      `,
      [
        today,
        employeeId
      ]
    );

    await closeCurrentPositionAssignments(
      connection,
      employeeId,
      today
    );

    await archiveLinkedUserAccount(
      connection,
      employeeId
    );

    await connection.query(
      `
        UPDATE employees
        SET
            is_active = 0,
            deleted_at =
              CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `,
      [employeeId]
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
            'employee',
            'employee_deleted',
            'employees',
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
        employee.company_id,
        actor.userId,
        employeeId,
        safeJson(employee),

        safeJson({
          employeeId,
          isActive: false,
          deleted: true
        }),

        `/api/v1/employees/${employeeId}`,
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

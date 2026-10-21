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
  CreateUserRecord,
  RequestMetadata,
  UpdateUserRecord,
  UserActor,
  UserDatabaseRow,
  UserListOptions,
  UserListResult,
  UserLookupBranch,
  UserLookupCompany,
  UserLookupDepartment,
  UserLookupEmployee,
  UserLookupRole,
  UserRoleAssignmentInput,
  UserRoleDatabaseRow
} from "./user.types.js";

const userSelectColumns = `
  u.user_id,
  u.company_id,
  u.employee_id,
  u.username,
  u.email,
  u.password_hash,
  u.is_platform_admin,
  u.is_active,
  u.is_email_verified,
  u.must_change_password,
  u.failed_login_attempts,
  u.locked_until,
  u.last_login_at,
  u.password_changed_at,
  u.deleted_at,
  u.created_at,
  u.updated_at,

  c.company_code,
  c.display_name AS company_name,

  e.employee_code,
  e.first_name AS employee_first_name,
  e.middle_name AS employee_middle_name,
  e.last_name AS employee_last_name,
  e.official_email AS employee_official_email,
  (
    SELECT ea.branch_id
    FROM employee_assignments ea
    WHERE ea.employee_id = e.employee_id
      AND ea.is_current = 1
    ORDER BY ea.effective_from DESC, ea.assignment_id DESC
    LIMIT 1
  ) AS employee_branch_id,
  e.deleted_at AS employee_deleted_at
`;

const userJoinSql = `
  FROM users u

  LEFT JOIN companies c
      ON c.company_id = u.company_id

  LEFT JOIN employees e
      ON e.employee_id = u.employee_id
`;

const roleSelectColumns = `
  ur.user_role_id,
  ur.user_id,
  ur.role_id,

  r.role_code,
  r.role_name,
  r.is_active AS role_is_active,

  ur.company_id,
  c.company_code,
  c.display_name AS company_name,

  ur.branch_id,
  b.branch_code,
  b.branch_name,

  ur.department_id,
  d.department_code,
  d.department_name,

  ur.assigned_at,
  ur.expires_at,
  ur.is_active
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

function sanitizeUserForAudit(
  user: UserDatabaseRow
): Record<string, unknown> {
  return {
    userId:
      String(user.user_id),

    companyId:
      user.company_id === null
        ? null
        : String(user.company_id),

    employeeId:
      user.employee_id === null
        ? null
        : String(user.employee_id),

    username:
      user.username,

    email:
      user.email,

    isPlatformAdmin:
      Number(
        user.is_platform_admin
      ) === 1,

    isActive:
      Number(
        user.is_active
      ) === 1,

    isEmailVerified:
      Number(
        user.is_email_verified
      ) === 1,

    mustChangePassword:
      Number(
        user.must_change_password
      ) === 1,

    failedLoginAttempts:
      Number(
        user.failed_login_attempts
      ),

    lockedUntil:
      user.locked_until,

    lastLoginAt:
      user.last_login_at,

    passwordChangedAt:
      user.password_changed_at
  };
}

async function selectUserByIdUsingConnection(
  connection: PoolConnection,
  userId: string
): Promise<UserDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
          ${userSelectColumns}

        ${userJoinSql}

        WHERE u.user_id = ?
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );

  return (
    rows[0] as
      | UserDatabaseRow
      | undefined
  ) ?? null;
}

async function revokeUserSessions(
  connection: PoolConnection,
  userId: string
): Promise<number> {
  const result =
    await connection.query(
      `
        UPDATE user_sessions
        SET revoked_at =
            CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND revoked_at IS NULL
      `,
      [userId]
    );

  return Number(
    result.affectedRows ?? 0
  );
}

async function revokePasswordResetTokens(
  connection: PoolConnection,
  userId: string
): Promise<void> {
  await connection.query(
    `
      UPDATE password_reset_tokens
      SET revoked_at =
          CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND used_at IS NULL
        AND revoked_at IS NULL
    `,
    [userId]
  );
}

async function insertOrReactivateRole(
  connection: PoolConnection,
  userId: string,
  role: UserRoleAssignmentInput
): Promise<void> {
  // edited by wali: Match the resolved role ID so identical tenant role codes never cross scopes.
  const existingRows =
    await connection.query(
      `
        SELECT ur.user_role_id
        FROM user_roles ur

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        WHERE ur.user_id = ?
          AND ur.role_id = ?
          AND ur.company_id <=> ?
          AND ur.branch_id <=> ?
          AND ur.department_id <=> ?

        ORDER BY ur.user_role_id
        LIMIT 1
        FOR UPDATE
      `,
      [
        userId,
        role.roleId,
        role.companyId,
        role.branchId,
        role.departmentId
      ]
    );

  const existingRole =
    existingRows[0] as
      | {
          user_role_id:
            string | number | bigint;
        }
      | undefined;

  if (existingRole) {
    await connection.query(
      `
        UPDATE user_roles
        SET
            assigned_at =
                CURRENT_TIMESTAMP,
            expires_at = ?,
            is_active = ?
        WHERE user_role_id = ?
      `,
      [
        role.expiresAt,
        role.isActive ? 1 : 0,
        existingRole.user_role_id
      ]
    );

    return;
  }

  const insertResult =
    await connection.query(
      `
        INSERT INTO user_roles (
            user_id,
            role_id,
            company_id,
            branch_id,
            department_id,
            assigned_at,
            expires_at,
            is_active
        )
        SELECT
            ?,
            r.role_id,
            ?,
            ?,
            ?,
            CURRENT_TIMESTAMP,
            ?,
            ?
        FROM roles r
        WHERE r.role_id = ?
          AND r.is_active = 1
        LIMIT 1
      `,
      [
        userId,
        role.companyId,
        role.branchId,
        role.departmentId,
        role.expiresAt,
        role.isActive ? 1 : 0,
        role.roleId
      ]
    );

  if (
    Number(
      insertResult.affectedRows ?? 0
    ) !== 1
  ) {
    throw new Error(
      "ROLE_NOT_FOUND"
    );
  }
}

export async function findUserById(
  userId: string
): Promise<UserDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${userSelectColumns}

        ${userJoinSql}

        WHERE u.user_id = ?
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );

  return (
    rows[0] as
      | UserDatabaseRow
      | undefined
  ) ?? null;
}

export async function findUserRolesByUserId(
  userId: string
): Promise<UserRoleDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${roleSelectColumns}

        FROM user_roles ur

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        LEFT JOIN companies c
            ON c.company_id =
               ur.company_id

        LEFT JOIN branches b
            ON b.branch_id =
               ur.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               ur.department_id

        WHERE ur.user_id = ?
          -- edited by wali: Keep a deactivated role assignment visible while the role itself is inactive.
          AND (ur.is_active = 1 OR r.is_active = 0)
          AND (
              ur.expires_at IS NULL
              OR ur.expires_at >
                 CURRENT_TIMESTAMP
          )

        ORDER BY
          r.role_name,
          ur.user_role_id
      `,
      [userId]
    );

  return rows as
    UserRoleDatabaseRow[];
}

export async function findRolesForUsers(
  userIds: string[]
): Promise<UserRoleDatabaseRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const placeholders =
    userIds
      .map(() => "?")
      .join(", ");

  const rows =
    await databasePool.query(
      `
        SELECT
          ${roleSelectColumns}

        FROM user_roles ur

        INNER JOIN roles r
            ON r.role_id = ur.role_id

        LEFT JOIN companies c
            ON c.company_id =
               ur.company_id

        LEFT JOIN branches b
            ON b.branch_id =
               ur.branch_id

        LEFT JOIN departments d
            ON d.department_id =
               ur.department_id

        WHERE ur.user_id IN (
          ${placeholders}
        )
          -- edited by wali: Keep deactivated role assignments in Workforce Access for inactive status display.
          AND (ur.is_active = 1 OR r.is_active = 0)
          AND (
              ur.expires_at IS NULL
              OR ur.expires_at >
                 CURRENT_TIMESTAMP
          )

        ORDER BY
          ur.user_id,
          r.role_name
      `,
      userIds
    );

  return rows as
    UserRoleDatabaseRow[];
}

export async function listUserRecords(
  options: UserListOptions
): Promise<UserListResult> {
  const conditions: string[] = [
    "u.deleted_at IS NULL",
    // edited by wali: Keep archived employees out of the access-management list.
    "(u.employee_id IS NULL OR e.deleted_at IS NULL)"
  ];

  const values: unknown[] = [];

  if (options.companyId) {
    conditions.push(
      "u.company_id = ?"
    );

    values.push(
      options.companyId
    );
  }

  if (options.employeeId) {
    conditions.push(
      "u.employee_id = ?"
    );

    values.push(
      options.employeeId
    );
  }

  if (
    options.isPlatformAdmin !==
      undefined
  ) {
    conditions.push(
      "u.is_platform_admin = ?"
    );

    values.push(
      options.isPlatformAdmin
        ? 1
        : 0
    );
  }

  if (
    options.isActive !== undefined
  ) {
    conditions.push(
      "u.is_active = ?"
    );

    values.push(
      options.isActive ? 1 : 0
    );
  }

  if (
    options.isEmailVerified !==
      undefined
  ) {
    conditions.push(
      "u.is_email_verified = ?"
    );

    values.push(
      options.isEmailVerified
        ? 1
        : 0
    );
  }

  if (
    options.mustChangePassword !==
      undefined
  ) {
    conditions.push(
      "u.must_change_password = ?"
    );

    values.push(
      options.mustChangePassword
        ? 1
        : 0
    );
  }

  if (
    options.isLocked !== undefined
  ) {
    conditions.push(
      options.isLocked
        ? `
          u.locked_until IS NOT NULL
          AND u.locked_until >
              CURRENT_TIMESTAMP
        `
        : `
          (
            u.locked_until IS NULL
            OR u.locked_until <=
               CURRENT_TIMESTAMP
          )
        `
    );
  }

  if (options.roleCode) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM user_roles ur_filter

        INNER JOIN roles r_filter
            ON r_filter.role_id =
               ur_filter.role_id

        WHERE ur_filter.user_id =
              u.user_id
          AND ur_filter.is_active = 1
          AND r_filter.is_active = 1
          AND r_filter.role_code = ?
          AND (
              ur_filter.expires_at
                  IS NULL
              OR ur_filter.expires_at >
                 CURRENT_TIMESTAMP
          )
      )
    `);

    values.push(
      options.roleCode
    );
  }

  if (options.branchId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM user_roles ur_branch
        WHERE ur_branch.user_id =
              u.user_id
          AND ur_branch.branch_id = ?
          AND ur_branch.is_active = 1
          AND (
              ur_branch.expires_at
                  IS NULL
              OR ur_branch.expires_at >
                 CURRENT_TIMESTAMP
          )
      )
    `);

    values.push(
      options.branchId
    );
  }

  if (options.departmentId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM user_roles ur_department
        WHERE ur_department.user_id =
              u.user_id
          AND ur_department.department_id
              = ?
          AND ur_department.is_active = 1
          AND (
              ur_department.expires_at
                  IS NULL
              OR ur_department.expires_at >
                 CURRENT_TIMESTAMP
          )
      )
    `);

    values.push(
      options.departmentId
    );
  }

  if (options.search) {
    conditions.push(`
      (
        u.username LIKE ?
        OR u.email LIKE ?
        OR c.company_code LIKE ?
        OR c.display_name LIKE ?
        OR e.employee_code LIKE ?
        OR e.first_name LIKE ?
        OR e.middle_name LIKE ?
        OR e.last_name LIKE ?
        OR e.official_email LIKE ?
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
      searchValue
    );
  }

  const whereClause =
    conditions.join(" AND ");

  const countRows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total

        ${userJoinSql}

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
          ${userSelectColumns}

        ${userJoinSql}

        WHERE ${whereClause}

        ORDER BY
          u.${options.sortBy}
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
    users:
      rows as UserDatabaseRow[],

    total
  };
}

export async function findUserConflicts(
  values: {
    username: string;
    email: string | null;
  },
  excludeUserId?: string
): Promise<{
  usernameExists: boolean;
  emailExists: boolean;
}> {
  let sql = `
    SELECT
        user_id,
        username,
        email
    FROM users
    WHERE (
        username = ?
  `;

  const parameters: unknown[] = [
    values.username
  ];

  if (values.email) {
    sql += `
      OR email = ?
    `;

    parameters.push(
      values.email
    );
  }

  sql += `
      )
  `;

  if (excludeUserId) {
    sql += `
      AND user_id <> ?
    `;

    parameters.push(
      excludeUserId
    );
  }

  const rows =
    await databasePool.query(
      sql,
      parameters
    );

  const conflictRows =
    rows as Array<{
      username: string;
      email: string | null;
    }>;

  return {
    usernameExists:
      conflictRows.some(
        (row) =>
          row.username ===
          values.username
      ),

    emailExists:
      values.email !== null &&
      conflictRows.some(
        (row) =>
          row.email ===
          values.email
      )
  };
}

export async function findActiveCompany(
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

export async function findEmployeeForUserAccount(
  employeeId: string,
  companyId: string
): Promise<{
  employeeId: string;
  companyId: string;
  officialEmail: string | null;
} | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            employee_id,
            company_id,
            official_email
        FROM employees
        WHERE employee_id = ?
          AND company_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        employeeId,
        companyId
      ]
    );

  const row = rows[0] as
    | {
        employee_id:
          string | number | bigint;

        company_id:
          string | number | bigint;

        official_email:
          string | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    employeeId:
      String(row.employee_id),

    companyId:
      String(row.company_id),

    officialEmail:
      row.official_email
  };
}

export async function findUserByEmployeeId(
  employeeId: string,
  excludeUserId?: string
): Promise<string | null> {
  let sql = `
    SELECT user_id
    FROM users
    WHERE employee_id = ?
  `;

  const values: unknown[] = [
    employeeId
  ];

  if (excludeUserId) {
    sql += `
      AND user_id <> ?
    `;

    values.push(
      excludeUserId
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
        user_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.user_id)
    : null;
}

export async function findActiveRolesByCodes(
  roleCodes: string[],
  accountCompanyId: string | null,
  isPlatformAdminAccount: boolean
): Promise<Array<{
  roleId: string;
  roleCode: string;
  companyId: string | null;
}>> {
  if (roleCodes.length === 0) {
    return [];
  }

  const placeholders =
    roleCodes
      .map(() => "?")
      .join(", ");

  const rows =
    await databasePool.query(
      `
        SELECT
            role_id,
            role_code,
            company_id
        FROM roles
        WHERE role_code IN (
          ${placeholders}
        )
          AND is_active = 1
          AND (
            (? = 1 AND company_id IS NULL)
            OR
            (? = 0 AND (
              company_id = ?
              OR (role_code = 'COMPANY_ADMIN' AND company_id IS NULL)
            ))
          )
      `,
      [
        ...roleCodes,
        isPlatformAdminAccount ? 1 : 0,
        isPlatformAdminAccount ? 1 : 0,
        accountCompanyId
      ]
    );

  return (
    rows as Array<{
      role_id:
        string | number | bigint;

      role_code: string;
      company_id: string | number | bigint | null;
    }>
  ).map((row) => ({
    roleId:
      String(row.role_id),

    roleCode:
      row.role_code,

    companyId:
      row.company_id === null
        ? null
        : String(row.company_id)
  }));
}

export async function findActiveBranchScope(
  branchId: string
): Promise<{
  branchId: string;
  companyId: string;
} | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            branch_id,
            company_id
        FROM branches
        WHERE branch_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [branchId]
    );

  const row = rows[0] as
    | {
        branch_id:
          string | number | bigint;

        company_id:
          string | number | bigint;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    branchId:
      String(row.branch_id),

    companyId:
      String(row.company_id)
  };
}

export async function findActiveDepartmentScope(
  departmentId: string
): Promise<{
  departmentId: string;
  companyId: string;
  branchId: string | null;
} | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            department_id,
            company_id,
            branch_id
        FROM departments
        WHERE department_id = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [departmentId]
    );

  const row = rows[0] as
    | {
        department_id:
          string | number | bigint;

        company_id:
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

    companyId:
      String(row.company_id),

    branchId:
      row.branch_id === null
        ? null
        : String(row.branch_id)
  };
}

export async function countActivePlatformAdmins():
Promise<number> {
  const rows =
    await databasePool.query(
      `
        SELECT COUNT(*) AS total
        FROM users
        WHERE is_platform_admin = 1
          AND is_active = 1
          AND deleted_at IS NULL
      `
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

export async function getUserLookupRecords(
  companyId: string | null,
  includeEmployeesWithoutAccounts: boolean,
  includePlatformAdminRole: boolean
): Promise<{
  roles: UserLookupRole[];
  employees: UserLookupEmployee[];
  companies: UserLookupCompany[];
  branches: UserLookupBranch[];
  departments: UserLookupDepartment[];
}> {
  // edited by wali: Return only the selected tenant's roles and the global Company Admin role for provisioning.
  const roleRows =
    await databasePool.query(
      `
        SELECT
            role_id,
            role_code,
            role_name,
            description,
            is_system_role,
            EXISTS (
              SELECT 1
              FROM role_permissions rp
              INNER JOIN permissions p
                ON p.permission_id = rp.permission_id
              WHERE rp.role_id = roles.role_id
                AND p.permission_code = 'BRANCH_ADMIN'
            ) AS has_branch_admin_access
        FROM roles
        WHERE is_active = 1
          AND (
            company_id <=> ?
            OR (
              ? = 1
              AND company_id IS NULL
              AND role_code = 'COMPANY_ADMIN'
            )
          )
          AND (
            ? = 1
            OR role_code <> 'PLATFORM_ADMIN'
          )
        ORDER BY role_name
      `,
      [
        companyId,
        includePlatformAdminRole ? 1 : 0,
        includePlatformAdminRole ? 1 : 0
      ]
    );

  const companyConditions =
    companyId
      ? `
        AND company_id = ?
      `
      : "";

  const companyValues =
    companyId
      ? [companyId]
      : [];

  const companyRows =
    await databasePool.query(
      `
        SELECT
            company_id,
            company_code,
            display_name
        FROM companies
        WHERE is_active = 1
          AND deleted_at IS NULL
          ${companyConditions}
        ORDER BY display_name
      `,
      companyValues
    );

  const branchRows =
    await databasePool.query(
      `
        SELECT
            branch_id,
            company_id,
            branch_code,
            branch_name
        FROM branches
        WHERE is_active = 1
          AND deleted_at IS NULL
          ${companyConditions}
        ORDER BY branch_name
      `,
      companyValues
    );

  const departmentRows =
    await databasePool.query(
      `
        SELECT
            department_id,
            company_id,
            branch_id,
            department_code,
            department_name
        FROM departments
        WHERE is_active = 1
          AND deleted_at IS NULL
          ${companyConditions}
        ORDER BY department_name
      `,
      companyValues
    );

  let employeeRows: unknown[] = [];

  if (companyId) {
    employeeRows =
      await databasePool.query(
        `
          SELECT
              e.employee_id,
              e.company_id,
              e.employee_code,
              e.first_name,
              e.middle_name,
              e.last_name,
              e.official_email,
              (
                SELECT ea.branch_id
                FROM employee_assignments ea
                WHERE ea.employee_id = e.employee_id
                  AND ea.is_current = 1
                ORDER BY ea.effective_from DESC, ea.assignment_id DESC
                LIMIT 1
              ) AS branch_id
          FROM employees e

          WHERE e.company_id = ?
            AND e.is_active = 1
            AND e.deleted_at IS NULL

            ${
              includeEmployeesWithoutAccounts
                ? `
                  AND NOT EXISTS (
                    SELECT 1
                    FROM users u
                    WHERE u.employee_id =
                          e.employee_id
                      AND u.deleted_at IS NULL
                  )
                `
                : ""
            }

          ORDER BY
            e.first_name,
            e.last_name
        `,
        [companyId]
      );
  }

  return {
    roles:
      (
        roleRows as Array<{
          role_id:
            string | number | bigint;

          role_code: string;
          role_name: string;
          description: string | null;

          is_system_role:
            number | boolean;
          has_branch_admin_access: number | boolean;
        }>
      ).map((row) => ({
        roleId:
          String(row.role_id),

        roleCode:
          row.role_code,

        roleName:
          row.role_name,

        description:
          row.description,

        isSystemRole:
          row.is_system_role === true ||
          Number(
            row.is_system_role
          ) === 1,

        // edited by wali: Let Workforce Access recognize roles carrying the Branch Admin marker.
        hasBranchAdminAccess:
          row.has_branch_admin_access === true || Number(row.has_branch_admin_access) === 1
      })),

    employees:
      (
        employeeRows as Array<{
          employee_id:
            string | number | bigint;

          company_id:
            string | number | bigint;

          employee_code: string;
          first_name: string;
          middle_name: string | null;
          last_name: string | null;
          official_email: string | null;
          branch_id: string | number | bigint | null;
        }>
      ).map((row) => ({
        employeeId:
          String(row.employee_id),

        companyId:
          String(row.company_id),

        employeeCode:
          row.employee_code,

        employeeName:
          [
            row.first_name,
            row.middle_name,
            row.last_name
          ]
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                  "string" &&
                value.trim() !== ""
            )
            .join(" "),

        officialEmail:
          row.official_email,

        // edited by wali: Carry the employee's home branch into their role assignment.
        branchId:
          row.branch_id === null ? null : String(row.branch_id)
      })),

    companies:
      (
        companyRows as Array<{
          company_id:
            string | number | bigint;

          company_code: string;
          display_name: string;
        }>
      ).map((row) => ({
        companyId:
          String(row.company_id),

        companyCode:
          row.company_code,

        companyName:
          row.display_name
      })),

    branches:
      (
        branchRows as Array<{
          branch_id:
            string | number | bigint;

          company_id:
            string | number | bigint;

          branch_code: string;
          branch_name: string;
        }>
      ).map((row) => ({
        branchId:
          String(row.branch_id),

        companyId:
          String(row.company_id),

        branchCode:
          row.branch_code,

        branchName:
          row.branch_name
      })),

    departments:
      (
        departmentRows as Array<{
          department_id:
            string | number | bigint;

          company_id:
            string | number | bigint;

          branch_id:
            | string
            | number
            | bigint
            | null;

          department_code: string;
          department_name: string;
        }>
      ).map((row) => ({
        departmentId:
          String(row.department_id),

        companyId:
          String(row.company_id),

        branchId:
          row.branch_id === null
            ? null
            : String(row.branch_id),

        departmentCode:
          row.department_code,

        departmentName:
          row.department_name
      }))
  };
}

export async function createUserRecord(
  input: CreateUserRecord,
  actor: UserActor,
  metadata: RequestMetadata
): Promise<UserDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (input.companyId !== null) {
      await requireQuotaAvailableUsingConnection(
        connection,
        input.companyId,
        "USER",
        null,
        input.isActive
      );
    }

    const insertResult =
      await connection.query(
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
              locked_until,
              password_changed_at
          )
          VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              0, NULL,
              CURRENT_TIMESTAMP
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.username,
          input.email,
          input.passwordHash,
          input.isPlatformAdmin
            ? 1
            : 0,
          input.isActive
            ? 1
            : 0,
          input.isEmailVerified
            ? 1
            : 0,
          input.mustChangePassword
            ? 1
            : 0
        ]
      );

    const userId =
      String(
        insertResult.insertId
      );

    for (
      const role of input.roles
    ) {
      await insertOrReactivateRole(
        connection,
        userId,
        role
      );
    }

    const user =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!user) {
      throw new Error(
        "CREATED_USER_NOT_FOUND"
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
            'user',
            'user_created',
            'users',
            ?,
            ?,
            'POST',
            '/api/v1/users',
            ?,
            ?
        )
      `,
      [
        input.companyId,
        actor.userId,
        userId,

        safeJson({
          ...sanitizeUserForAudit(user),
          roles:
            input.roles
        }),

        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return user;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateUserAccountRecord(
  userId: string,
  companyId: string | null,
  input: UpdateUserRecord,
  actor: UserActor,
  metadata: RequestMetadata
): Promise<UserDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    if (
      companyId !== null &&
      input.isActive === true
    ) {
      await requireQuotaAvailableUsingConnection(
        connection,
        companyId,
        "USER",
        userId,
        true
      );
    }

    const currentUser =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!currentUser) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    // edited by wali: Prevent reactivating access for a soft-deleted employee.
    if (
      input.isActive === true &&
      currentUser.employee_id !== null
    ) {
      const employeeRows =
        await connection.query(
          `
            SELECT employee_id, deleted_at
            FROM employees
            WHERE employee_id = ?
              AND company_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [
            currentUser.employee_id,
            currentUser.company_id
          ]
        );

      if (
        !employeeRows[0] ||
        employeeRows[0].deleted_at !== null
      ) {
        throw new Error(
          "ARCHIVED_EMPLOYEE_CANNOT_BE_ACTIVATED"
        );
      }
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

    if (input.username !== undefined) {
      addUpdate(
        "username",
        input.username
      );
    }

    if (input.email !== undefined) {
      addUpdate(
        "email",
        input.email
      );
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (
      input.isEmailVerified !==
        undefined
    ) {
      addUpdate(
        "is_email_verified",
        input.isEmailVerified
          ? 1
          : 0
      );
    }

    if (
      input.mustChangePassword !==
        undefined
    ) {
      addUpdate(
        "must_change_password",
        input.mustChangePassword
          ? 1
          : 0
      );
    }

    if (
      input.clearAccountLock === true
    ) {
      addUpdate(
        "failed_login_attempts",
        0
      );

      addUpdate(
        "locked_until",
        null
      );
    }

    if (assignments.length > 0) {
      values.push(userId);

      await connection.query(
        `
          UPDATE users
          SET ${assignments.join(", ")}
          WHERE user_id = ?
            AND deleted_at IS NULL
        `,
        values
      );
    }

    let revokedSessionCount = 0;

    if (input.isActive === false) {
      revokedSessionCount =
        await revokeUserSessions(
          connection,
          userId
        );
    }

    const updatedUser =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!updatedUser) {
      throw new Error(
        "UPDATED_USER_NOT_FOUND"
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
            'user',
            'user_updated',
            'users',
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
        updatedUser.company_id,
        actor.userId,
        userId,
        safeJson(
          sanitizeUserForAudit(
            currentUser
          )
        ),

        safeJson({
          ...sanitizeUserForAudit(
            updatedUser
          ),
          revokedSessionCount
        }),

        `/api/v1/users/${userId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedUser;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function replaceUserRolesRecord(
  userId: string,
  roles: UserRoleAssignmentInput[],
  actor: UserActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const user =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!user) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    const oldRoleRows =
      await connection.query(
        `
          SELECT
              r.role_code,
              ur.company_id,
              ur.branch_id,
              ur.department_id,
              ur.expires_at,
              ur.is_active
          FROM user_roles ur

          INNER JOIN roles r
              ON r.role_id =
                 ur.role_id

          WHERE ur.user_id = ?
        `,
        [userId]
      );

    await connection.query(
      `
        UPDATE user_roles
        SET is_active = 0
        WHERE user_id = ?
          AND is_active = 1
      `,
      [userId]
    );

    for (const role of roles) {
      await insertOrReactivateRole(
        connection,
        userId,
        role
      );
    }

    const revokedSessionCount =
      await revokeUserSessions(
        connection,
        userId
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
            'user',
            'user_roles_replaced',
            'user_roles',
            ?,
            ?,
            ?,
            'PUT',
            ?,
            ?,
            ?
        )
      `,
      [
        user.company_id,
        actor.userId,
        userId,
        safeJson(oldRoleRows),

        safeJson({
          roles,
          revokedSessionCount
        }),

        `/api/v1/users/${userId}/roles`,
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

export async function adminResetUserPasswordRecord(
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean,
  revokeAllSessions: boolean,
  actor: UserActor,
  metadata: RequestMetadata
): Promise<{
  updated: boolean;
  revokedSessionCount: number;
}> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const user =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!user) {
      await connection.rollback();
      transactionStarted = false;

      return {
        updated: false,
        revokedSessionCount: 0
      };
    }

    await connection.query(
      `
        UPDATE users
        SET
            password_hash = ?,
            must_change_password = ?,
            password_changed_at =
                CURRENT_TIMESTAMP,
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE user_id = ?
          AND deleted_at IS NULL
      `,
      [
        passwordHash,
        mustChangePassword
          ? 1
          : 0,
        userId
      ]
    );

    await revokePasswordResetTokens(
      connection,
      userId
    );

    const revokedSessionCount =
      revokeAllSessions
        ? await revokeUserSessions(
            connection,
            userId
          )
        : 0;

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
            'user',
            'admin_password_reset',
            'users',
            ?,
            ?,
            'POST',
            ?,
            ?,
            ?
        )
      `,
      [
        user.company_id,
        actor.userId,
        userId,

        safeJson({
          passwordReset: true,
          mustChangePassword,
          revokedSessionCount
        }),

        `/api/v1/users/${userId}/reset-password`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      updated: true,
      revokedSessionCount
    };
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function softDeleteUserRecord(
  userId: string,
  actor: UserActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const user =
      await selectUserByIdUsingConnection(
        connection,
        userId
      );

    if (!user) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    const revokedSessionCount =
      await revokeUserSessions(
        connection,
        userId
      );

    await revokePasswordResetTokens(
      connection,
      userId
    );

    await connection.query(
      `
        UPDATE user_roles
        SET is_active = 0
        WHERE user_id = ?
          AND is_active = 1
      `,
      [userId]
    );

    await connection.query(
      `
        UPDATE users
        SET
            is_active = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [userId]
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
            'user',
            'user_deleted',
            'users',
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
        user.company_id,
        actor.userId,
        userId,

        safeJson(
          sanitizeUserForAudit(
            user
          )
        ),

        safeJson({
          userId,
          deleted: true,
          isActive: false,
          revokedSessionCount
        }),

        `/api/v1/users/${userId}`,
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

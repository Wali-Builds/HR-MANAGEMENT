import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateRoleRecord,
  PermissionDatabaseRow,
  PermissionListOptions,
  PermissionListResult,
  RequestMetadata,
  RoleActor,
  RoleDatabaseRow,
  RoleListOptions,
  RoleListResult,
  RolePermissionDatabaseRow,
  UpdateRoleRecord
} from "./role.types.js";

const roleSelectColumns = `
  r.role_id,
  r.company_id,
  r.role_code,
  r.role_name,
  r.description,
  r.is_system_role,
  r.is_active,
  r.created_at,
  r.updated_at,

  (
    SELECT COUNT(*)
    FROM role_permissions rp_count
    WHERE rp_count.role_id =
          r.role_id
  ) AS permission_count
`;

const permissionSelectColumns = `
  p.permission_id,
  p.permission_code,
  p.module_name,
  p.action_name,
  p.description,
  p.created_at
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

async function selectRoleByIdUsingConnection(
  connection: PoolConnection,
  roleId: string,
  companyId: string | null = null
): Promise<RoleDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
          ${roleSelectColumns}
        FROM roles r
        WHERE r.role_id = ?
          AND r.company_id <=> ?
        LIMIT 1
      `,
      [roleId, companyId]
    );

  return (
    rows[0] as
      | RoleDatabaseRow
      | undefined
  ) ?? null;
}

async function revokeSessionsForRole(
  connection: PoolConnection,
  roleId: string
): Promise<number> {
  const result =
    await connection.query(
      `
        UPDATE user_sessions s

        INNER JOIN user_roles ur
            ON ur.user_id =
               s.user_id

        SET s.revoked_at =
            CURRENT_TIMESTAMP

        WHERE ur.role_id = ?
          AND ur.is_active = 1
          AND s.revoked_at IS NULL
      `,
      [roleId]
    );

  return Number(
    result.affectedRows ?? 0
  );
}

export async function listRoleRecords(
  options: RoleListOptions
): Promise<RoleListResult> {
  // edited by wali: Scope both count and page queries to one role owner.
  const conditions: string[] = [
    "r.company_id <=> ?"
  ];

  const values: unknown[] = [
    options.companyId
  ];

  if (
    options.isSystemRole !== undefined
  ) {
    conditions.push(
      "r.is_system_role = ?"
    );

    values.push(
      options.isSystemRole
        ? 1
        : 0
    );
  }

  if (
    options.isActive !== undefined
  ) {
    conditions.push(
      "r.is_active = ?"
    );

    values.push(
      options.isActive
        ? 1
        : 0
    );
  }

  if (options.permissionCode) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM role_permissions rp_filter

        INNER JOIN permissions p_filter
            ON p_filter.permission_id =
               rp_filter.permission_id

        WHERE rp_filter.role_id =
              r.role_id
          AND p_filter.permission_code = ?
      )
    `);

    values.push(
      options.permissionCode
    );
  }

  if (options.moduleName) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM role_permissions rp_module

        INNER JOIN permissions p_module
            ON p_module.permission_id =
               rp_module.permission_id

        WHERE rp_module.role_id =
              r.role_id
          AND p_module.module_name = ?
      )
    `);

    values.push(
      options.moduleName
    );
  }

  if (options.search) {
    conditions.push(`
      (
        r.role_code LIKE ?
        OR r.role_name LIKE ?
        OR r.description LIKE ?
      )
    `);

    const searchValue =
      `%${options.search}%`;

    values.push(
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
        FROM roles r
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
          ${roleSelectColumns}
        FROM roles r
        WHERE ${whereClause}

        ORDER BY
          r.${options.sortBy}
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
    roles:
      rows as RoleDatabaseRow[],

    total
  };
}

export async function listPermissionRecords(
  options: PermissionListOptions
): Promise<PermissionListResult> {
  const conditions: string[] = [
    "1 = 1"
  ];

  const values: unknown[] = [];

  if (options.allowedPermissionCodes) {
    if (options.allowedPermissionCodes.length === 0) {
      return { permissions: [], total: 0 };
    }

    const placeholders = options.allowedPermissionCodes
      .map(() => "?")
      .join(", ");

    conditions.push(`p.permission_code IN (${placeholders})`);
    values.push(...options.allowedPermissionCodes);
  }

  if (options.moduleName) {
    conditions.push(
      "p.module_name = ?"
    );

    values.push(
      options.moduleName
    );
  }

  if (options.actionName) {
    conditions.push(
      "p.action_name = ?"
    );

    values.push(
      options.actionName
    );
  }

  if (options.search) {
    conditions.push(`
      (
        p.permission_code LIKE ?
        OR p.module_name LIKE ?
        OR p.action_name LIKE ?
        OR p.description LIKE ?
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
        FROM permissions p
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
          ${permissionSelectColumns}
        FROM permissions p
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
    permissions:
      rows as PermissionDatabaseRow[],

    total
  };
}

export async function findRoleById(
  roleId: string,
  companyId: string | null = null
): Promise<RoleDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
          ${roleSelectColumns}
        FROM roles r
        WHERE r.role_id = ?
          AND r.company_id <=> ?
        LIMIT 1
      `,
      [roleId, companyId]
    );

  return (
    rows[0] as
      | RoleDatabaseRow
      | undefined
  ) ?? null;
}

export async function findRolePermissionsByRoleId(
  roleId: string
): Promise<RolePermissionDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
            rp.role_id,
            rp.permission_id,
            p.permission_code,
            p.module_name,
            p.action_name,
            p.description,
            rp.created_at

        FROM role_permissions rp

        INNER JOIN permissions p
            ON p.permission_id =
               rp.permission_id

        WHERE rp.role_id = ?

        ORDER BY
          p.module_name,
          p.action_name,
          p.permission_code
      `,
      [roleId]
    );

  return rows as
    RolePermissionDatabaseRow[];
}

export async function findPermissionsForRoles(
  roleIds: string[]
): Promise<RolePermissionDatabaseRow[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const placeholders =
    roleIds
      .map(() => "?")
      .join(", ");

  const rows =
    await databasePool.query(
      `
        SELECT
            rp.role_id,
            rp.permission_id,
            p.permission_code,
            p.module_name,
            p.action_name,
            p.description,
            rp.created_at

        FROM role_permissions rp

        INNER JOIN permissions p
            ON p.permission_id =
               rp.permission_id

        WHERE rp.role_id IN (
          ${placeholders}
        )

        ORDER BY
          rp.role_id,
          p.module_name,
          p.action_name,
          p.permission_code
      `,
      roleIds
    );

  return rows as
    RolePermissionDatabaseRow[];
}

export async function findRoleCodeConflict(
  roleCode: string,
  companyId: string | null,
  excludeRoleId?: string
): Promise<string | null> {
  let sql = `
    SELECT role_id
    FROM roles
    WHERE role_code = ?
      AND company_id <=> ?
  `;

  const values: unknown[] = [
    roleCode,
    companyId
  ];

  if (excludeRoleId) {
    sql += `
      AND role_id <> ?
    `;

    values.push(
      excludeRoleId
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
        role_id:
          string | number | bigint;
      }
    | undefined;

  return row
    ? String(row.role_id)
    : null;
}

export async function findPermissionRowsByCodes(
  permissionCodes: string[]
): Promise<PermissionDatabaseRow[]> {
  if (permissionCodes.length === 0) {
    return [];
  }

  const placeholders =
    permissionCodes
      .map(() => "?")
      .join(", ");

  const rows =
    await databasePool.query(
      `
        SELECT
          ${permissionSelectColumns}
        FROM permissions p
        WHERE p.permission_code IN (
          ${placeholders}
        )
      `,
      permissionCodes
    );

  return rows as
    PermissionDatabaseRow[];
}

export async function createRoleRecord(
  input: CreateRoleRecord,
  actor: RoleActor,
  metadata: RequestMetadata
): Promise<RoleDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    // edited by wali: Create the tenant-owned role and permissions atomically.
    await connection.beginTransaction();
    transactionStarted = true;

    const insertResult =
      await connection.query(
        `
          INSERT INTO roles (
              company_id,
              role_code,
              role_name,
              description,
              is_system_role,
              is_active
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              0,
              ?
          )
        `,
        [
          input.companyId,
          input.roleCode,
          input.roleName,
          input.description,
          input.isActive
            ? 1
            : 0
        ]
      );

    const roleId =
      String(
        insertResult.insertId
      );

    const placeholders =
      input.permissionCodes
        .map(() => "?")
        .join(", ");

    const permissionResult =
      await connection.query(
        `
          INSERT INTO role_permissions (
              role_id,
              permission_id
          )
          SELECT
              ?,
              p.permission_id
          FROM permissions p
          WHERE p.permission_code IN (
            ${placeholders}
          )
        `,
        [
          roleId,
          ...input.permissionCodes
        ]
      );

    if (
      Number(
        permissionResult.affectedRows ??
        0
      ) !== input.permissionCodes.length
    ) {
      throw new Error(
        "PERMISSION_ASSIGNMENT_COUNT_MISMATCH"
      );
    }

    const role =
      await selectRoleByIdUsingConnection(
        connection,
        roleId,
        input.companyId
      );

    if (!role) {
      throw new Error(
        "CREATED_ROLE_NOT_FOUND"
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
            'role',
            'role_created',
            'roles',
            ?,
            ?,
            'POST',
            '/api/v1/roles',
            ?,
            ?
        )
      `,
      [
        actor.companyId,
        actor.userId,
        roleId,

        safeJson({
          roleId,
          roleCode:
            input.roleCode,

          roleName:
            input.roleName,

          description:
            input.description,

          isActive:
            input.isActive,

          permissionCodes:
            input.permissionCodes
        }),

        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return role;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateRoleRecord(
  roleId: string,
  input: UpdateRoleRecord,
  actor: RoleActor,
  metadata: RequestMetadata
): Promise<RoleDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const currentRole =
      await selectRoleByIdUsingConnection(
        connection,
        roleId,
        actor.companyId
      );

    if (!currentRole) {
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

    if (input.roleCode !== undefined) {
      addUpdate(
        "role_code",
        input.roleCode
      );
    }

    if (input.roleName !== undefined) {
      addUpdate(
        "role_name",
        input.roleName
      );
    }

    if (input.description !== undefined) {
      addUpdate(
        "description",
        input.description
      );
    }

    if (input.isActive !== undefined) {
      addUpdate(
        "is_active",
        input.isActive
          ? 1
          : 0
      );
    }

    if (assignments.length > 0) {
      values.push(roleId, actor.companyId);

      await connection.query(
        `
          UPDATE roles
          SET ${assignments.join(", ")}
          WHERE role_id = ?
            AND company_id <=> ?
        `,
        values
      );
    }

    let revokedSessionCount = 0;

    if (input.isActive === false) {
      // edited by wali: Revoke sessions but leave assignments intact so users retain the visibly inactive role.
      revokedSessionCount =
        await revokeSessionsForRole(
          connection,
          roleId
        );
    }

    const updatedRole =
      await selectRoleByIdUsingConnection(
        connection,
        roleId,
        actor.companyId
      );

    if (!updatedRole) {
      throw new Error(
        "UPDATED_ROLE_NOT_FOUND"
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
            'role',
            'role_updated',
            'roles',
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
        actor.companyId,
        actor.userId,
        roleId,
        safeJson(currentRole),

        safeJson({
          role:
            updatedRole,

          revokedSessionCount,
          // edited by wali: Keep user-role rows assigned so Workforce Access can show the inactive role.
          roleAssignmentsRetained:
            input.isActive === false
        }),

        `/api/v1/roles/${roleId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedRole;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function replaceRolePermissionsRecord(
  roleId: string,
  permissionCodes: string[],
  actor: RoleActor,
  metadata: RequestMetadata
): Promise<{
  replaced: boolean;
  revokedSessionCount: number;
}> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const role =
      await selectRoleByIdUsingConnection(
        connection,
        roleId,
        actor.companyId
      );

    if (!role) {
      await connection.rollback();
      transactionStarted = false;

      return {
        replaced: false,
        revokedSessionCount: 0
      };
    }

    const oldPermissionRows =
      await connection.query(
        `
          SELECT
              p.permission_code,
              p.module_name,
              p.action_name

          FROM role_permissions rp

          INNER JOIN permissions p
              ON p.permission_id =
                 rp.permission_id

          WHERE rp.role_id = ?

          ORDER BY
            p.module_name,
            p.action_name,
            p.permission_code
        `,
        [roleId]
      );

    await connection.query(
      `
        DELETE FROM role_permissions
        WHERE role_id = ?
      `,
      [roleId]
    );

    const placeholders =
      permissionCodes
        .map(() => "?")
        .join(", ");

    const permissionResult =
      await connection.query(
        `
          INSERT INTO role_permissions (
              role_id,
              permission_id
          )
          SELECT
              ?,
              p.permission_id
          FROM permissions p
          WHERE p.permission_code IN (
            ${placeholders}
          )
        `,
        [
          roleId,
          ...permissionCodes
        ]
      );

    if (
      Number(
        permissionResult.affectedRows ??
        0
      ) !== permissionCodes.length
    ) {
      throw new Error(
        "PERMISSION_ASSIGNMENT_COUNT_MISMATCH"
      );
    }

    const revokedSessionCount =
      await revokeSessionsForRole(
        connection,
        roleId
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
            'role',
            'role_permissions_replaced',
            'role_permissions',
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
        actor.companyId,
        actor.userId,
        roleId,
        safeJson(oldPermissionRows),

        safeJson({
          permissionCodes,
          revokedSessionCount
        }),

        `/api/v1/roles/${roleId}/permissions`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      replaced: true,
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

export async function deleteRoleRecord(
  roleId: string,
  actor: RoleActor,
  metadata: RequestMetadata
): Promise<{
  deleted: boolean;
  assigned: boolean;
}> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // edited by wali: Lock this tenant-scoped role so a user assignment cannot race with deletion.
    const lockedRoleRows = await connection.query(
      `SELECT role_id FROM roles WHERE role_id = ? AND company_id <=> ? FOR UPDATE`,
      [roleId, actor.companyId]
    );

    if (lockedRoleRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return { deleted: false, assigned: false };
    }

    const role =
      await selectRoleByIdUsingConnection(
        connection,
        roleId,
        actor.companyId
      );

    if (!role) {
      await connection.rollback();
      transactionStarted = false;

      return {
        deleted: false,
        assigned: false
      };
    }

    // edited by wali: Block deletion only while someone currently has this role assigned.
    const assignmentRows = await connection.query(
      `
        SELECT user_id
        FROM user_roles
        WHERE role_id = ?
          AND is_active = 1
        LIMIT 1
        FOR UPDATE
      `,
      [roleId]
    );

    if (assignmentRows.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return {
        deleted: false,
        assigned: true
      };
    }

    await connection.query(
      `DELETE FROM role_permissions WHERE role_id = ?`,
      [roleId]
    );

    // edited by wali: Remove inactive historical assignment links so the role row can be deleted.
    const inactiveAssignmentResult = await connection.query(
      `DELETE FROM user_roles WHERE role_id = ? AND is_active = 0`,
      [roleId]
    );
    const removedInactiveAssignmentCount = Number(
      inactiveAssignmentResult.affectedRows ?? 0
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
            ?, ?, 'role', 'role_deleted', 'roles', ?, ?, ?, 'DELETE', ?, ?, ?
        )
      `,
      [
        actor.companyId,
        actor.userId,
        roleId,
        safeJson(role),
        safeJson({ removedInactiveAssignmentCount }),
        `/api/v1/roles/${roleId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.query(
      `
        DELETE FROM roles
        WHERE role_id = ?
          AND company_id <=> ?
      `,
      [roleId, actor.companyId]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      deleted: true,
      assigned: false
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

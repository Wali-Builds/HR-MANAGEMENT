import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

const defaultCompanyRoles = [
  {
    roleCode: "COMP-ADMIN",
    roleName: "COMPANY-ADMIN",
    permissionCode: "COMPANY_ADMIN",
    permissionDescription:
      "Company administrator access marker"
  },
  {
    roleCode: "BR-MAN",
    roleName: "BRANCH-MANAGER",
    permissionCode: "BRANCH_ADMIN",
    permissionDescription:
      "Branch administrator access marker"
  },
  {
    roleCode: "DEPT-ADMIN",
    roleName: "DEPARTMENT-ADMIN",
    permissionCode: "DEPARTMENT_ADMIN",
    permissionDescription:
      "Department administrator access marker"
  },
  {
    roleCode: "COMP-EMP",
    roleName: "EMPLOYEE",
    permissionCode: "EMPLOYEE",
    permissionDescription:
      "Employee self-service access marker"
  }
] as const;

export async function createDefaultCompanyRolesUsingConnection(
  connection: PoolConnection,
  companyId: string
): Promise<void> {
  for (const role of defaultCompanyRoles) {
    await connection.query(
      `
        INSERT IGNORE INTO permissions (
            permission_code,
            module_name,
            action_name,
            description
        )
        VALUES (?, 'Access Control', ?, ?)
      `,
      [
        role.permissionCode,
        role.roleName,
        role.permissionDescription
      ]
    );

    await connection.query(
      `
        INSERT IGNORE INTO roles (
            company_id,
            role_code,
            role_name,
            is_system_role,
            is_active
        )
        VALUES (?, ?, ?, 0, 1)
      `,
      [
        companyId,
        role.roleCode,
        role.roleName
      ]
    );

    const roleRows =
      await connection.query(
        `
          SELECT role_id
          FROM roles
          WHERE company_id = ?
            AND role_code = ?
          LIMIT 1
        `,
        [
          companyId,
          role.roleCode
        ]
      );

    const roleRow =
      roleRows[0] as
        | { role_id: string | number | bigint }
        | undefined;

    if (!roleRow) {
      throw new Error(
        `DEFAULT_COMPANY_ROLE_CREATE_FAILED:${role.roleCode}`
      );
    }

    const permissionRows =
      await connection.query(
        `
          SELECT permission_id
          FROM permissions
          WHERE permission_code = ?
          LIMIT 1
        `,
        [role.permissionCode]
      );

    const permissionRow =
      permissionRows[0] as
        | { permission_id: string | number | bigint }
        | undefined;

    if (!permissionRow) {
      throw new Error(
        `DEFAULT_COMPANY_ROLE_PERMISSION_NOT_FOUND:${role.permissionCode}`
      );
    }

    await connection.query(
      `
        INSERT IGNORE INTO role_permissions (
            role_id,
            permission_id
        )
        VALUES (?, ?)
      `,
      [
        roleRow.role_id,
        permissionRow.permission_id
      ]
    );
  }
}

export async function seedDefaultCompanyRolesForExistingCompanies(): Promise<number> {
  const companies =
    await databasePool.query(
      `
        SELECT company_id
        FROM companies
        WHERE deleted_at IS NULL
        ORDER BY company_id
      `
    ) as Array<{
      company_id: string | number | bigint;
    }>;

  for (const company of companies) {
    const connection =
      await databasePool.getConnection();

    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      await createDefaultCompanyRolesUsingConnection(
        connection,
        String(company.company_id)
      );

      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  return companies.length;
}

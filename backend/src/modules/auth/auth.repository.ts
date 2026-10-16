import {
  type PoolConnection
} from "mariadb";

import { env } from "../../config/env.js";

import {
  databasePool
} from "../../database/pool.js";

import type {
  AuthContext,
  AuthUserRow,
  AuthorizationData,
  DatabaseId,
  RequestMetadata
} from "./auth.types.js";

function idToString(
  value: DatabaseId | null
): string | null {
  if (value === null) {
    return null;
  }

  return String(value);
}

function databaseBoolean(
  value: number | boolean
): boolean {
  return value === true || Number(value) === 1;
}

export async function findUserByIdentifier(
  identifier: string
): Promise<AuthUserRow | null> {
  const rows = await databasePool.query(
    `
      SELECT
          user_id,
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
          locked_until
      FROM users
      WHERE deleted_at IS NULL
        AND (
            username = ?
            OR email = ?
        )
      LIMIT 1
    `,
    [
      identifier,
      identifier
    ]
  );

  return (
    rows[0] as AuthUserRow | undefined
  ) ?? null;
}

export async function loadAuthorization(
  userId: DatabaseId,
  isPlatformAdmin: boolean
): Promise<AuthorizationData> {
  const roleRows = await databasePool.query(
    `
      SELECT DISTINCT
          r.role_code
      FROM user_roles ur
      INNER JOIN roles r
          ON r.role_id = ur.role_id
      WHERE ur.user_id = ?
        AND ur.is_active = 1
        AND r.is_active = 1
        AND (
            ur.expires_at IS NULL
            OR ur.expires_at > CURRENT_TIMESTAMP
        )
      ORDER BY r.role_code
    `,
    [userId]
  );

  const roleCodes = roleRows.map(
    (row: unknown) =>
      String(
        (
          row as {
            role_code: string;
          }
        ).role_code
      )
  );

  let permissionRows: unknown[];

  if (isPlatformAdmin) {
    permissionRows =
      await databasePool.query(
        `
          SELECT permission_code
          FROM permissions
          ORDER BY permission_code
        `
      );
  } else {
    permissionRows =
      await databasePool.query(
        `
          SELECT DISTINCT
              p.permission_code
          FROM user_roles ur
          INNER JOIN roles r
              ON r.role_id = ur.role_id
          INNER JOIN role_permissions rp
              ON rp.role_id = r.role_id
          INNER JOIN permissions p
              ON p.permission_id =
                 rp.permission_id
          WHERE ur.user_id = ?
            AND ur.is_active = 1
            AND r.is_active = 1
            AND (
                ur.expires_at IS NULL
                OR ur.expires_at >
                   CURRENT_TIMESTAMP
            )
          ORDER BY p.permission_code
        `,
        [userId]
      );
  }

  const permissions = permissionRows.map(
    (row: unknown) =>
      String(
        (
          row as {
            permission_code: string;
          }
        ).permission_code
      )
  );

  return {
    roleCodes,
    permissions
  };
}

export async function recordFailedLogin(
  user: AuthUserRow,
  nextAttemptCount: number,
  lockedUntil: Date | null,
  metadata: RequestMetadata
): Promise<void> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query(
      `
        UPDATE users
        SET
            failed_login_attempts = ?,
            locked_until = ?
        WHERE user_id = ?
      `,
      [
        nextAttemptCount,
        lockedUntil,
        user.user_id
      ]
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
            new_values,
            request_method,
            request_path,
            ip_address,
            user_agent
        )
        VALUES (
            ?,
            ?,
            'auth',
            'login_failed',
            'users',
            ?,
            ?,
            'POST',
            '/api/v1/auth/login',
            ?,
            ?
        )
      `,
      [
        user.company_id,
        user.user_id,
        String(user.user_id),
        JSON.stringify({
          failedLoginAttempts:
            nextAttemptCount,

          lockedUntil:
            lockedUntil?.toISOString() ??
            null
        }),
        metadata.ipAddress,
        metadata.userAgent
      ]
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

export async function createSuccessfulSession(
  user: AuthUserRow,
  refreshTokenHash: string,
  refreshTokenExpiresAt: Date,
  metadata: RequestMetadata,
  deviceName: string | null
): Promise<string> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const sessionResult =
      await connection.query(
        `
          INSERT INTO user_sessions (
              user_id,
              refresh_token_hash,
              ip_address,
              user_agent,
              device_name,
              expires_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          user.user_id,
          refreshTokenHash,
          metadata.ipAddress,
          metadata.userAgent,
          deviceName,
          refreshTokenExpiresAt
        ]
      );

    const sessionId = String(
      sessionResult.insertId
    );

    await connection.query(
      `
        UPDATE users
        SET
            failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at =
                CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [user.user_id]
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
            new_values,
            request_method,
            request_path,
            ip_address,
            user_agent
        )
        VALUES (
            ?,
            ?,
            'auth',
            'login_success',
            'user_sessions',
            ?,
            ?,
            'POST',
            '/api/v1/auth/login',
            ?,
            ?
        )
      `,
      [
        user.company_id,
        user.user_id,
        sessionId,
        JSON.stringify({
          sessionId,
          deviceName,
          expiresAt:
            refreshTokenExpiresAt
              .toISOString()
        }),
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return sessionId;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function getAuthenticatedContext(
  userId: string,
  sessionId: string
): Promise<AuthContext | null> {
  const rows = await databasePool.query(
    `
      SELECT
          u.user_id,
          u.company_id,
          u.employee_id,
          u.username,
          u.email,
          u.is_platform_admin,
          u.is_email_verified,
          u.must_change_password
      FROM user_sessions s
      INNER JOIN users u
          ON u.user_id = s.user_id
      WHERE s.session_id = ?
        AND s.user_id = ?
        AND s.revoked_at IS NULL
        AND s.expires_at >
            CURRENT_TIMESTAMP
        AND u.is_active = 1
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [
      sessionId,
      userId
    ]
  );

  const user = rows[0] as
    | {
        user_id: DatabaseId;
        company_id: DatabaseId | null;
        employee_id: DatabaseId | null;
        username: string;
        email: string | null;
        is_platform_admin: number | boolean;
        is_email_verified: number | boolean;
        must_change_password: number | boolean;
      }
    | undefined;

  if (!user) {
    return null;
  }

  const isPlatformAdmin =
    databaseBoolean(
      user.is_platform_admin
    );

  const authorization =
    await loadAuthorization(
      user.user_id,
      isPlatformAdmin
    );

  return {
    userId:
      String(user.user_id),

    sessionId,

    companyId:
      idToString(user.company_id),

    employeeId:
      idToString(user.employee_id),

    username:
      user.username,

    email:
      user.email,

    isPlatformAdmin,

    isEmailVerified:
      databaseBoolean(
        user.is_email_verified
      ),

    mustChangePassword:
      databaseBoolean(
        user.must_change_password
      ),

    roleCodes:
      authorization.roleCodes,

    permissions:
      authorization.permissions
  };
}

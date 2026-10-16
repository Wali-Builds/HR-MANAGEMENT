import {
  databasePool
} from "../../database/pool.js";

import type {
  DatabaseId,
  RequestMetadata
} from "./auth.types.js";

export interface PasswordUserRow {
  user_id: DatabaseId;
  company_id: DatabaseId | null;
  password_hash: string;
  is_active: number | boolean;
  deleted_at: Date | string | null;
}

export async function findPasswordUserById(
  userId: string
): Promise<PasswordUserRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            user_id,
            company_id,
            password_hash,
            is_active,
            deleted_at
        FROM users
        WHERE user_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [userId]
    );

  return (
    rows[0] as
      | PasswordUserRow
      | undefined
  ) ?? null;
}

export async function updatePasswordAndRevokeSessions(
  userId: string,
  companyId: string | null,
  newPasswordHash: string,
  metadata: RequestMetadata
): Promise<number> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const passwordUpdateResult =
      await connection.query(
        `
          UPDATE users
          SET
              password_hash = ?,
              must_change_password = 0,
              password_changed_at =
                  CURRENT_TIMESTAMP,
              failed_login_attempts = 0,
              locked_until = NULL
          WHERE user_id = ?
            AND is_active = 1
            AND deleted_at IS NULL
        `,
        [
          newPasswordHash,
          userId
        ]
      );

    const updatedUsers =
      Number(
        passwordUpdateResult
          .affectedRows ?? 0
      );

    if (updatedUsers !== 1) {
      throw new Error(
        "User account could not be updated"
      );
    }

    const sessionUpdateResult =
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

    const revokedSessionCount =
      Number(
        sessionUpdateResult
          .affectedRows ?? 0
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
            'password_changed',
            'users',
            ?,
            ?,
            'POST',
            '/api/v1/auth/change-password',
            ?,
            ?
        )
      `,
      [
        companyId,
        userId,
        userId,

        JSON.stringify({
          passwordChanged: true,
          mustChangePassword: false,
          revokedSessionCount
        }),

        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return revokedSessionCount;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
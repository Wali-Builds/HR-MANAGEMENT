import {
  databasePool
} from "../../database/pool.js";

import type {
  DatabaseId,
  RequestMetadata
} from "./auth.types.js";

export interface PasswordResetUserRow {
  user_id: DatabaseId;
  company_id: DatabaseId | null;
  username: string;
  email: string;
  password_hash: string;
  is_active: number | boolean;
}

export async function findPasswordResetUserByEmail(
  email: string
): Promise<PasswordResetUserRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            user_id,
            company_id,
            username,
            email,
            password_hash,
            is_active
        FROM users
        WHERE email = ?
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [email]
    );

  return (
    rows[0] as
      | PasswordResetUserRow
      | undefined
  ) ?? null;
}

export async function createPasswordResetRequest(
  user: PasswordResetUserRow,
  tokenHash: string,
  expiresAt: Date,
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
        UPDATE password_reset_tokens
        SET revoked_at =
            CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND used_at IS NULL
          AND revoked_at IS NULL
      `,
      [user.user_id]
    );

    const insertResult =
      await connection.query(
        `
          INSERT INTO password_reset_tokens (
              user_id,
              token_hash,
              expires_at,
              requested_ip,
              user_agent
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          user.user_id,
          tokenHash,
          expiresAt,
          metadata.ipAddress,
          metadata.userAgent
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
            'password_reset_requested',
            'password_reset_tokens',
            ?,
            ?,
            'POST',
            '/api/v1/auth/forgot-password',
            ?,
            ?
        )
      `,
      [
        user.company_id,
        user.user_id,
        String(insertResult.insertId),

        JSON.stringify({
          email: user.email,
          expiresAt:
            expiresAt.toISOString()
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

export async function findValidPasswordResetToken(
  tokenHash: string
): Promise<PasswordResetUserRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            u.user_id,
            u.company_id,
            u.username,
            u.email,
            u.password_hash,
            u.is_active
        FROM password_reset_tokens prt
        INNER JOIN users u
            ON u.user_id = prt.user_id
        WHERE prt.token_hash = ?
          AND prt.used_at IS NULL
          AND prt.revoked_at IS NULL
          AND prt.expires_at >
              CURRENT_TIMESTAMP
          AND u.is_active = 1
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [tokenHash]
    );

  return (
    rows[0] as
      | PasswordResetUserRow
      | undefined
  ) ?? null;
}

export async function completePasswordReset(
  tokenHash: string,
  newPasswordHash: string,
  metadata: RequestMetadata
): Promise<{
  userId: string;
  revokedSessionCount: number;
} | null> {
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
              prt.password_reset_token_id,
              prt.user_id,
              u.company_id
          FROM password_reset_tokens prt
          INNER JOIN users u
              ON u.user_id = prt.user_id
          WHERE prt.token_hash = ?
            AND prt.used_at IS NULL
            AND prt.revoked_at IS NULL
            AND prt.expires_at >
                CURRENT_TIMESTAMP
            AND u.is_active = 1
            AND u.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [tokenHash]
      );

    const resetRecord =
      rows[0] as
        | {
            password_reset_token_id:
              DatabaseId;
            user_id: DatabaseId;
            company_id:
              DatabaseId | null;
          }
        | undefined;

    if (!resetRecord) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

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
        resetRecord.user_id
      ]
    );

    await connection.query(
      `
        UPDATE password_reset_tokens
        SET used_at =
            CURRENT_TIMESTAMP
        WHERE password_reset_token_id = ?
      `,
      [
        resetRecord
          .password_reset_token_id
      ]
    );

    await connection.query(
      `
        UPDATE password_reset_tokens
        SET revoked_at =
            CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND password_reset_token_id <> ?
          AND used_at IS NULL
          AND revoked_at IS NULL
      `,
      [
        resetRecord.user_id,
        resetRecord
          .password_reset_token_id
      ]
    );

    const sessionUpdateResult =
      await connection.query(
        `
          UPDATE user_sessions
          SET revoked_at =
              CURRENT_TIMESTAMP
          WHERE user_id = ?
            AND revoked_at IS NULL
        `,
        [resetRecord.user_id]
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
            'password_reset_completed',
            'users',
            ?,
            ?,
            'POST',
            '/api/v1/auth/reset-password',
            ?,
            ?
        )
      `,
      [
        resetRecord.company_id,
        resetRecord.user_id,
        String(resetRecord.user_id),

        JSON.stringify({
          passwordReset: true,
          revokedSessionCount
        }),

        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      userId:
        String(resetRecord.user_id),

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
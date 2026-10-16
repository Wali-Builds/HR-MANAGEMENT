import { databasePool } from "../../database/pool.js";

import type {
  DatabaseId,
  RequestMetadata
} from "./auth.types.js";

export interface RefreshSessionUser {
  session_id: DatabaseId;
  user_id: DatabaseId;
  company_id: DatabaseId | null;
  employee_id: DatabaseId | null;

  username: string;
  email: string | null;

  is_platform_admin: number | boolean;
  is_email_verified: number | boolean;
  must_change_password: number | boolean;
}

/**
 * Valid refresh token ko atomically rotate karta hai.
 *
 * Purana token hash replace ho jata hai, is liye purana
 * refresh token dobara use nahi ho sakega.
 */
export async function rotateRefreshSession(
  currentTokenHash: string,
  newTokenHash: string,
  newExpiresAt: Date,
  metadata: RequestMetadata
): Promise<RefreshSessionUser | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const rows = await connection.query(
      `
        SELECT
            s.session_id,
            s.user_id,

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

        WHERE s.refresh_token_hash = ?
          AND s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
          AND u.is_active = 1
          AND u.deleted_at IS NULL

        LIMIT 1
        FOR UPDATE
      `,
      [currentTokenHash]
    );

    const session =
      rows[0] as RefreshSessionUser | undefined;

    if (!session) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    await connection.query(
      `
        UPDATE user_sessions
        SET
            refresh_token_hash = ?,
            expires_at = ?,
            ip_address = ?,
            user_agent = ?
        WHERE session_id = ?
          AND revoked_at IS NULL
      `,
      [
        newTokenHash,
        newExpiresAt,
        metadata.ipAddress,
        metadata.userAgent,
        session.session_id
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
            'refresh_token_rotated',
            'user_sessions',
            ?,
            ?,
            'POST',
            '/api/v1/auth/refresh',
            ?,
            ?
        )
      `,
      [
        session.company_id,
        session.user_id,
        String(session.session_id),

        JSON.stringify({
          sessionId:
            String(session.session_id),

          expiresAt:
            newExpiresAt.toISOString()
        }),

        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return session;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function revokeCurrentSession(
  userId: string,
  sessionId: string,
  companyId: string | null,
  metadata: RequestMetadata
): Promise<void> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const updateResult =
      await connection.query(
        `
          UPDATE user_sessions
          SET revoked_at = CURRENT_TIMESTAMP
          WHERE session_id = ?
            AND user_id = ?
            AND revoked_at IS NULL
        `,
        [
          sessionId,
          userId
        ]
      );

    const affectedRows =
      Number(updateResult.affectedRows ?? 0);

    if (affectedRows > 0) {
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
              'logout',
              'user_sessions',
              ?,
              ?,
              'POST',
              '/api/v1/auth/logout',
              ?,
              ?
          )
        `,
        [
          companyId,
          userId,
          sessionId,

          JSON.stringify({
            sessionId,
            revoked: true
          }),

          metadata.ipAddress,
          metadata.userAgent
        ]
      );
    }

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

export async function revokeAllUserSessions(
  userId: string,
  companyId: string | null,
  metadata: RequestMetadata
): Promise<number> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const updateResult =
      await connection.query(
        `
          UPDATE user_sessions
          SET revoked_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
            AND revoked_at IS NULL
        `,
        [userId]
      );

    const revokedSessionCount =
      Number(updateResult.affectedRows ?? 0);

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
            'logout_all',
            'user_sessions',
            ?,
            ?,
            'POST',
            '/api/v1/auth/logout-all',
            ?,
            ?
        )
      `,
      [
        companyId,
        userId,
        userId,

        JSON.stringify({
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
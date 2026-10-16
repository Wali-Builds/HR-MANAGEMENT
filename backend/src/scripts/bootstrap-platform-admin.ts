import "dotenv/config";

import { z } from "zod";

import {
  hashPassword
} from "../common/security/password.js";

import {
  closeDatabasePool,
  databasePool
} from "../database/pool.js";

const bootstrapEnvironmentSchema = z.object({
  BOOTSTRAP_ADMIN_USERNAME: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Username may contain letters, numbers, dots, underscores and hyphens"
    ),

  BOOTSTRAP_ADMIN_EMAIL: z
    .string()
    .trim()
    .email()
    .max(150)
    .transform((value) =>
      value.toLowerCase()
    ),

  BOOTSTRAP_ADMIN_PASSWORD: z
    .string()
    .min(
      8,
      "Administrator password must contain at least 8 characters"
    )
    .max(128)
});

type BootstrapEnvironment =
  z.infer<
    typeof bootstrapEnvironmentSchema
  >;

async function createPlatformAdministrator(
  settings: BootstrapEnvironment
): Promise<void> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existingAdministrators =
      await connection.query(
        `
          SELECT user_id
          FROM users
          WHERE is_platform_admin = 1
            AND deleted_at IS NULL
          LIMIT 1
        `
      );

    if (existingAdministrators.length > 0) {
      throw new Error(
        "An active Platform Administrator already exists"
      );
    }

    const duplicateUsers =
      await connection.query(
        `
          SELECT user_id
          FROM users
          WHERE username = ?
             OR email = ?
          LIMIT 1
        `,
        [
          settings.BOOTSTRAP_ADMIN_USERNAME,
          settings.BOOTSTRAP_ADMIN_EMAIL
        ]
      );

    if (duplicateUsers.length > 0) {
      throw new Error(
        "The administrator username or email already exists"
      );
    }

    const roleRows =
      await connection.query(
        `
          SELECT role_id
          FROM roles
          WHERE role_code = 'PLATFORM_ADMIN'
            AND is_active = 1
          LIMIT 1
        `
      );

    const platformAdminRole =
      roleRows[0] as
        | {
            role_id:
              bigint |
              number |
              string;
          }
        | undefined;

    if (!platformAdminRole) {
      throw new Error(
        "PLATFORM_ADMIN role was not found"
      );
    }

    const passwordHash =
      await hashPassword(
        settings.BOOTSTRAP_ADMIN_PASSWORD
      );

    const insertUserResult =
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
              password_changed_at
          )
          VALUES (
              NULL,
              NULL,
              ?,
              ?,
              ?,
              1,
              1,
              1,
              1,
              0,
              CURRENT_TIMESTAMP
          )
        `,
        [
          settings.BOOTSTRAP_ADMIN_USERNAME,
          settings.BOOTSTRAP_ADMIN_EMAIL,
          passwordHash
        ]
      );

    const userId =
      insertUserResult.insertId as
        | bigint
        | number
        | string;

    await connection.query(
      `
        INSERT INTO user_roles (
            user_id,
            role_id,
            company_id,
            branch_id,
            department_id,
            is_active
        )
        VALUES (?, ?, NULL, NULL, NULL, 1)
      `,
      [
        userId,
        platformAdminRole.role_id
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
            request_path
        )
        VALUES (
            NULL,
            ?,
            'auth',
            'bootstrap_platform_admin',
            'users',
            ?,
            ?,
            'SCRIPT',
            'bootstrap-platform-admin'
        )
      `,
      [
        userId,
        String(userId),
        JSON.stringify({
          username:
            settings.BOOTSTRAP_ADMIN_USERNAME,
          email:
            settings.BOOTSTRAP_ADMIN_EMAIL,
          roleCode:
            "PLATFORM_ADMIN"
        })
      ]
    );

    await connection.commit();
    transactionStarted = false;

    console.log(
      "Platform Administrator created successfully."
    );

    console.log(
      `User ID: ${String(userId)}`
    );

    console.log(
      `Username: ${settings.BOOTSTRAP_ADMIN_USERNAME}`
    );

    console.log(
      `Email: ${settings.BOOTSTRAP_ADMIN_EMAIL}`
    );

    console.log(
      "Password was hashed with Argon2id."
    );

    console.log(
      "The administrator must change the password after first login."
    );
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function main(): Promise<void> {
  const parsedEnvironment =
    bootstrapEnvironmentSchema.safeParse(
      process.env
    );

  if (!parsedEnvironment.success) {
    console.error(
      "Invalid bootstrap configuration:"
    );

    for (
      const issue of
      parsedEnvironment.error.issues
    ) {
      console.error(
        `- ${issue.path.join(".")}: ${issue.message}`
      );
    }

    process.exitCode = 1;
    return;
  }

  try {
    await createPlatformAdministrator(
      parsedEnvironment.data
    );
  } catch (error) {
    console.error(
      "Could not create Platform Administrator."
    );

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await closeDatabasePool().catch(
      (error: unknown) => {
        console.error(
          "Could not close database pool:",
          error
        );
      }
    );
  }
}

void main();
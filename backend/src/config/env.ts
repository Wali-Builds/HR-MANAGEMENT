import "dotenv/config";
import { z } from "zod";

const base64EncryptionKeySchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9+/]{43}=$/,
    "BANK_ACCOUNT_ENCRYPTION_KEY must be a valid 32-byte base64 key"
  )
  .refine(
    (value) =>
      Buffer.from(
        value,
        "base64"
      ).length === 32,
    "BANK_ACCOUNT_ENCRYPTION_KEY must decode to exactly 32 bytes"
  );

const environmentSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "test",
      "production"
    ])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  FRONTEND_URL: z
    .string()
    .url()
    .default(
      "http://localhost:5173"
    ),

  DB_HOST: z
    .string()
    .trim()
    .min(
      1,
      "DB_HOST is required"
    ),

  DB_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3306),

  DB_NAME: z
    .string()
    .trim()
    .min(
      1,
      "DB_NAME is required"
    ),

  DB_USER: z
    .string()
    .trim()
    .min(
      1,
      "DB_USER is required"
    ),

  DB_PASSWORD: z
    .string()
    .default(""),

  DB_CONNECTION_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .default(10),

  JWT_ACCESS_SECRET: z
    .string()
    .min(
      64,
      "JWT_ACCESS_SECRET must contain at least 64 characters"
    ),

  JWT_ISSUER: z
    .string()
    .trim()
    .min(1)
    .default(
      "hr-management-api"
    ),

  JWT_AUDIENCE: z
    .string()
    .trim()
    .min(1)
    .default(
      "hr-management-web"
    ),

  JWT_ACCESS_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(3600)
    .default(900),

  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(30),

  LOGIN_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(3)
    .max(20)
    .default(5),

  LOGIN_LOCK_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(15),

  PASSWORD_RESET_EXPIRES_MINUTES:
    z.coerce
      .number()
      .int()
      .min(10)
      .max(120)
      .default(30),

  FRONTEND_RESET_PASSWORD_URL: z
    .string()
    .url()
    .default(
      "http://localhost:5173/reset-password"
    ),

  EMPLOYEE_DOCUMENT_STORAGE_DIR: z
    .string()
    .trim()
    .min(
      1,
      "EMPLOYEE_DOCUMENT_STORAGE_DIR is required"
    )
    .default(
      "./storage/employee-documents"
    ),

  EMPLOYEE_DOCUMENT_MAX_FILE_SIZE_BYTES:
    z.coerce
      .number()
      .int()
      .min(
        1024,
        "Employee-document maximum file size must be at least 1 KB"
      )
      .max(
        52428800,
        "Employee-document maximum file size cannot exceed 50 MB"
      )
      .default(
        10485760
      ),

  BANK_ACCOUNT_ENCRYPTION_KEY:
    base64EncryptionKeySchema
});

const parsedEnvironment =
  environmentSchema.safeParse(
    process.env
  );

if (!parsedEnvironment.success) {
  console.error(
    "Invalid environment configuration:"
  );

  for (
    const issue of
    parsedEnvironment.error.issues
  ) {
    const variableName =
      issue.path.join(".") ||
      "environment";

    console.error(
      `- ${variableName}: ${issue.message}`
    );
  }

  process.exit(1);
}

export const env =
  parsedEnvironment.data;

export type Environment =
  typeof env;
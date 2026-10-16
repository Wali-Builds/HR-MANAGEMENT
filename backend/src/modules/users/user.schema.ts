import { z } from "zod";

function blankStringToNull(
  value: unknown
): unknown {
  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  return value;
}

function queryBoolean(
  value: unknown
): unknown {
  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return false;
  }

  return value;
}

function isValidDateTime(
  value: string
): boolean {
  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
}

const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "ID must be a positive integer"
  );

const nullableDatabaseIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
  );

const nullableEmailSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .email(
        "A valid email address is required"
      )
      .max(
        150,
        "Email cannot contain more than 150 characters"
      )
      .transform((value) =>
        value.toLowerCase()
      )
      .nullable()
  );

const usernameSchema = z
  .string()
  .trim()
  .min(
    3,
    "Username must contain at least 3 characters"
  )
  .max(
    80,
    "Username cannot contain more than 80 characters"
  )
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Username may contain letters, numbers, dots, underscores and hyphens"
  )
  .transform((value) =>
    value.toLowerCase()
  );

const roleCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Role code is required"
  )
  .max(
    50,
    "Role code cannot contain more than 50 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Role code contains invalid characters"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const strongPasswordSchema = z
  .string()
  .min(
    12,
    "Password must contain at least 12 characters"
  )
  .max(
    128,
    "Password cannot contain more than 128 characters"
  )
  .regex(
    /[a-z]/,
    "Password must contain at least one lowercase letter"
  )
  .regex(
    /[A-Z]/,
    "Password must contain at least one uppercase letter"
  )
  .regex(
    /[0-9]/,
    "Password must contain at least one number"
  )
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

const nullableExpiryDateTimeSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .refine(
        isValidDateTime,
        "Expiry date must be a valid ISO date-time"
      )
      .nullable()
  );

export const userRoleAssignmentSchema =
  z
    .object({
      roleCode:
        roleCodeSchema,

      companyId:
        nullableDatabaseIdSchema
          .optional(),

      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      expiresAt:
        nullableExpiryDateTimeSchema
          .optional(),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.roleCode ===
            "PLATFORM_ADMIN" &&
          (
            data.companyId != null ||
            data.branchId != null ||
            data.departmentId != null
          )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "companyId"
            ],

            message:
              "Platform Administrator role cannot have company, branch or department scope"
          });
        }

        if (
          data.branchId != null &&
          data.companyId == null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "companyId"
            ],

            message:
              "Company ID is required when branch scope is provided"
          });
        }

        if (
          data.departmentId != null &&
          data.companyId == null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "companyId"
            ],

            message:
              "Company ID is required when department scope is provided"
          });
        }

        if (
          data.expiresAt
        ) {
          const expiryDate =
            new Date(
              data.expiresAt
            );

          if (
            expiryDate.getTime() <=
            Date.now()
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "expiresAt"
              ],

              message:
                "Role expiry date must be in the future"
            });
          }
        }
      }
    );

export const createUserBodySchema =
  z
    .object({
      companyId:
        nullableDatabaseIdSchema
          .optional(),

      employeeId:
        nullableDatabaseIdSchema
          .optional(),

      username:
        usernameSchema,

      email:
        nullableEmailSchema
          .optional(),

      temporaryPassword:
        strongPasswordSchema,

      confirmTemporaryPassword:
        z
          .string()
          .min(
            1,
            "Password confirmation is required"
          )
          .max(128),

      isPlatformAdmin: z
        .boolean()
        .default(false),

      isActive: z
        .boolean()
        .default(true),

      isEmailVerified: z
        .boolean()
        .default(false),

      mustChangePassword: z
        .boolean()
        .default(true),

      roles: z
        .array(
          userRoleAssignmentSchema
        )
        .min(
          1,
          "At least one role must be assigned"
        )
        .max(
          20,
          "A user cannot have more than 20 role assignments"
        )
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.temporaryPassword !==
          data.confirmTemporaryPassword
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "confirmTemporaryPassword"
            ],

            message:
              "Temporary password and confirmation do not match"
          });
        }

        if (
          data.isPlatformAdmin &&
          data.companyId != null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "companyId"
            ],

            message:
              "Platform Administrator account cannot belong to a company"
          });
        }

        if (
          data.isPlatformAdmin &&
          data.employeeId != null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "employeeId"
            ],

            message:
              "Platform Administrator account cannot be linked to a company employee"
          });
        }

        const hasPlatformAdminRole =
          data.roles.some(
            (role) =>
              role.roleCode ===
              "PLATFORM_ADMIN"
          );

        if (
          data.isPlatformAdmin &&
          !hasPlatformAdminRole
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "roles"
            ],

            message:
              "Platform Administrator account must have the PLATFORM_ADMIN role"
          });
        }

        if (
          !data.isPlatformAdmin &&
          hasPlatformAdminRole
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "roles"
            ],

            message:
              "PLATFORM_ADMIN role can only be assigned to a Platform Administrator account"
          });
        }

        if (
          !data.isPlatformAdmin &&
          data.companyId == null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "companyId"
            ],

            message:
              "Company ID is required for a company user account"
          });
        }

        const uniqueRoleScopes =
          new Set<string>();

        data.roles.forEach(
          (
            role,
            index
          ) => {
            const key = [
              role.roleCode,
              role.companyId ?? "NULL",
              role.branchId ?? "NULL",
              role.departmentId ??
                "NULL"
            ].join("|");

            if (
              uniqueRoleScopes.has(key)
            ) {
              context.addIssue({
                code:
                  z.ZodIssueCode.custom,

                path: [
                  "roles",
                  index
                ],

                message:
                  "Duplicate role scope assignment is not allowed"
              });

              return;
            }

            uniqueRoleScopes.add(key);
          }
        );
      }
    );

export const updateUserBodySchema =
  z
    .object({
      username:
        usernameSchema
          .optional(),

      email:
        nullableEmailSchema
          .optional(),

      isActive: z
        .boolean()
        .optional(),

      isEmailVerified: z
        .boolean()
        .optional(),

      mustChangePassword: z
        .boolean()
        .optional(),

      clearAccountLock: z
        .boolean()
        .optional()
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one user-account field is required"
          });
        }

        if (
          data.clearAccountLock === false
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "clearAccountLock"
            ],

            message:
              "Omit clearAccountLock or set it to true"
          });
        }
      }
    );

export const replaceUserRolesBodySchema =
  z
    .object({
      roles: z
        .array(
          userRoleAssignmentSchema
        )
        .min(
          1,
          "At least one role must be assigned"
        )
        .max(
          20,
          "A user cannot have more than 20 role assignments"
        )
    })
    .strict()
    .superRefine(
      (data, context) => {
        const uniqueRoleScopes =
          new Set<string>();

        data.roles.forEach(
          (
            role,
            index
          ) => {
            const key = [
              role.roleCode,
              role.companyId ?? "NULL",
              role.branchId ?? "NULL",
              role.departmentId ??
                "NULL"
            ].join("|");

            if (
              uniqueRoleScopes.has(key)
            ) {
              context.addIssue({
                code:
                  z.ZodIssueCode.custom,

                path: [
                  "roles",
                  index
                ],

                message:
                  "Duplicate role scope assignment is not allowed"
              });

              return;
            }

            uniqueRoleScopes.add(key);
          }
        );
      }
    );

export const adminResetPasswordBodySchema =
  z
    .object({
      newPassword:
        strongPasswordSchema,

      confirmPassword: z
        .string()
        .min(
          1,
          "Password confirmation is required"
        )
        .max(128),

      mustChangePassword: z
        .boolean()
        .default(true),

      revokeAllSessions: z
        .boolean()
        .default(true)
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.newPassword !==
          data.confirmPassword
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "confirmPassword"
            ],

            message:
              "New password and confirmation do not match"
          });
        }
      }
    );

const userIdParamsSchema =
  z.object({
    userId:
      databaseIdSchema
  });

export const userListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    companyId:
      databaseIdSchema
        .optional(),

    employeeId:
      databaseIdSchema
        .optional(),

    roleCode:
      roleCodeSchema
        .optional(),

    branchId:
      databaseIdSchema
        .optional(),

    departmentId:
      databaseIdSchema
        .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    isPlatformAdmin: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    isActive: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    isEmailVerified: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    mustChangePassword: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    isLocked: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "username",
        "email",
        "last_login_at",
        "created_at",
        "updated_at"
      ])
      .default(
        "created_at"
      ),

    sortOrder: z
      .enum([
        "asc",
        "desc",
        "ASC",
        "DESC"
      ])
      .transform((value) =>
        value.toUpperCase() as
          | "ASC"
          | "DESC"
      )
      .default("DESC")
  });

export const userLookupQuerySchema =
  z.object({
    companyId:
      databaseIdSchema
        .optional(),

    includeEmployeesWithoutAccounts:
      z
        .preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(true)
  });

export const listUsersRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      userListQuerySchema
  });

export const getUserRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      userIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createUserRequestSchema =
  z.object({
    body:
      createUserBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateUserRequestSchema =
  z.object({
    body:
      updateUserBodySchema,

    params:
      userIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const replaceUserRolesRequestSchema =
  z.object({
    body:
      replaceUserRolesBodySchema,

    params:
      userIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const adminResetPasswordRequestSchema =
  z.object({
    body:
      adminResetPasswordBodySchema,

    params:
      userIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteUserRequestSchema =
  getUserRequestSchema;

export const userLookupsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      userLookupQuerySchema
  });

export type CreateUserInput =
  z.infer<
    typeof createUserBodySchema
  >;

export type UpdateUserInput =
  z.infer<
    typeof updateUserBodySchema
  >;

export type ReplaceUserRolesInput =
  z.infer<
    typeof replaceUserRolesBodySchema
  >;

export type AdminResetPasswordInput =
  z.infer<
    typeof adminResetPasswordBodySchema
  >;

export type UserListQuery =
  z.infer<
    typeof userListQuerySchema
  >;

export type UserLookupQuery =
  z.infer<
    typeof userLookupQuerySchema
  >;

export type UserRoleInput =
  z.infer<
    typeof userRoleAssignmentSchema
  >;
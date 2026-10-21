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

const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "ID must be a positive integer"
  );

const roleCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Role code must contain at least 2 characters"
  )
  .max(
    50,
    "Role code cannot contain more than 50 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Role code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const permissionCodeSchema = z
  .string()
  .trim()
  .min(
    3,
    "Permission code is required"
  )
  .max(
    120,
    "Permission code cannot contain more than 120 characters"
  )
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Permission code contains invalid characters"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const nullableDescriptionSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        500,
        "Description cannot contain more than 500 characters"
      )
      .nullable()
  );

function validateUniquePermissions(
  permissionCodes: string[],
  context: z.RefinementCtx
): void {
  const uniqueCodes =
    new Set<string>();

  permissionCodes.forEach(
    (
      permissionCode,
      index
    ) => {
      if (
        uniqueCodes.has(
          permissionCode
        )
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "permissionCodes",
            index
          ],

          message:
            `Duplicate permission code is not allowed: ${permissionCode}`
        });

        return;
      }

      uniqueCodes.add(
        permissionCode
      );
    }
  );
}

export const createRoleBodySchema =
  z
    .object({
      roleCode:
        roleCodeSchema,

      roleName: z
        .string()
        .trim()
        .min(
          2,
          "Role name is required"
        )
        .max(
          100,
          "Role name cannot contain more than 100 characters"
        ),

      description:
        nullableDescriptionSchema
          .optional(),

      isActive: z
        .boolean()
        .default(true),

      permissionCodes: z
        .array(
          permissionCodeSchema
        )
        // edited by wali: Enforce the single-permission role rule at the API boundary.
        .length(
          1,
          "Exactly one permission must be assigned to a role"
        )
    })
    .strict()
    .superRefine(
      (data, context) => {
        validateUniquePermissions(
          data.permissionCodes,
          context
        );

        if (
          data.roleCode ===
          "PLATFORM_ADMIN"
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "roleCode"
            ],

            message:
              "PLATFORM_ADMIN is a protected system role code"
          });
        }
      }
    );

export const updateRoleBodySchema =
  z
    .object({
      roleCode:
        roleCodeSchema
          .optional(),

      roleName: z
        .string()
        .trim()
        .min(
          2,
          "Role name must contain at least 2 characters"
        )
        .max(
          100,
          "Role name cannot contain more than 100 characters"
        )
        .optional(),

      description:
        nullableDescriptionSchema
          .optional(),

      isActive: z
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
              "At least one role field is required"
          });
        }

        if (
          data.roleCode ===
          "PLATFORM_ADMIN"
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "roleCode"
            ],

            message:
              "PLATFORM_ADMIN is a protected system role code"
          });
        }
      }
    );

export const replaceRolePermissionsBodySchema =
  z
    .object({
      permissionCodes: z
        .array(
          permissionCodeSchema
        )
        // edited by wali: Keep permission replacements limited to one grant per role.
        .length(
          1,
          "Exactly one permission must be assigned to a role"
        )
    })
    .strict()
    .superRefine(
      (data, context) => {
        validateUniquePermissions(
          data.permissionCodes,
          context
        );
      }
    );

const roleIdParamsSchema =
  z.object({
    roleId:
      databaseIdSchema
  });

export const roleListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int(
        "Page must be a whole number"
      )
      .min(
        1,
        "Page must be at least 1"
      )
      .default(1),

    limit: z.coerce
      .number()
      .int(
        "Limit must be a whole number"
      )
      .min(
        1,
        "Limit must be at least 1"
      )
      .max(
        100,
        "Limit cannot exceed 100"
      )
      .default(20),

    search: z
      .string()
      .trim()
      .max(
        200,
        "Search cannot contain more than 200 characters"
      )
      .optional(),

    permissionCode:
      permissionCodeSchema
        .optional(),

    moduleName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) =>
        value.toLowerCase()
      )
      .optional(),

    isSystemRole: z
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

    sortBy: z
      .enum([
        "role_code",
        "role_name",
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

export const permissionListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int(
        "Page must be a whole number"
      )
      .min(
        1,
        "Page must be at least 1"
      )
      .default(1),

    limit: z.coerce
      .number()
      .int(
        "Limit must be a whole number"
      )
      .min(
        1,
        "Limit must be at least 1"
      )
      .max(
        500,
        "Limit cannot exceed 500"
      )
      .default(100),

    search: z
      .string()
      .trim()
      .max(
        200,
        "Search cannot contain more than 200 characters"
      )
      .optional(),

    moduleName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) =>
        value.toLowerCase()
      )
      .optional(),

    actionName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) =>
        value.toLowerCase()
      )
      .optional(),

    sortBy: z
      .enum([
        "permission_code",
        "module_name",
        "action_name",
        "created_at"
      ])
      .default(
        "module_name"
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
      .default("ASC")
  });

export const listRolesRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      roleListQuerySchema
  });

export const listPermissionsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      permissionListQuerySchema
  });

export const getRoleRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      roleIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createRoleRequestSchema =
  z.object({
    body:
      createRoleBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateRoleRequestSchema =
  z.object({
    body:
      updateRoleBodySchema,

    params:
      roleIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const replaceRolePermissionsRequestSchema =
  z.object({
    body:
      replaceRolePermissionsBodySchema,

    params:
      roleIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteRoleRequestSchema =
  getRoleRequestSchema;

export type CreateRoleInput =
  z.infer<
    typeof createRoleBodySchema
  >;

export type UpdateRoleInput =
  z.infer<
    typeof updateRoleBodySchema
  >;

export type ReplaceRolePermissionsInput =
  z.infer<
    typeof replaceRolePermissionsBodySchema
  >;

export type RoleListQuery =
  z.infer<
    typeof roleListQuerySchema
  >;

export type PermissionListQuery =
  z.infer<
    typeof permissionListQuerySchema
  >;

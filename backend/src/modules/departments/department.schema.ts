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

const nullableDatabaseIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
  );

const nullableText = (
  maximumLength: number
) =>
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(maximumLength)
      .nullable()
  );

const departmentCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Department code must contain at least 2 characters"
  )
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Department code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

export const createDepartmentBodySchema =
  z
    .object({
      companyId:
        databaseIdSchema.optional(),

      branchId:
        nullableDatabaseIdSchema.optional(),

      parentDepartmentId:
        nullableDatabaseIdSchema.optional(),

      departmentCode:
        departmentCodeSchema,

      departmentName: z
        .string()
        .trim()
        .min(
          2,
          "Department name is required"
        )
        .max(150),

      description:
        nullableText(65535).optional(),

      costCenterCode:
        nullableText(50).optional(),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict();

export const updateDepartmentBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema.optional(),

      parentDepartmentId:
        nullableDatabaseIdSchema.optional(),

      departmentCode:
        departmentCodeSchema.optional(),

      departmentName: z
        .string()
        .trim()
        .min(
          2,
          "Department name is required"
        )
        .max(150)
        .optional(),

      description:
        nullableText(65535).optional(),

      costCenterCode:
        nullableText(50).optional(),

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
              "At least one department field is required"
          });
        }
      }
    );

const departmentIdParamsSchema =
  z.object({
    departmentId:
      databaseIdSchema
  });

export const departmentListQuerySchema =
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
      databaseIdSchema.optional(),

    branchId:
      databaseIdSchema.optional(),

    parentDepartmentId:
      databaseIdSchema.optional(),

    rootOnly: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    isActive: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "department_code",
        "department_name",
        "cost_center_code",
        "created_at",
        "updated_at"
      ])
      .default("created_at"),

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
  })
  .superRefine(
    (data, context) => {
      if (
        data.rootOnly === true &&
        data.parentDepartmentId !==
          undefined
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "parentDepartmentId"
          ],

          message:
            "parentDepartmentId cannot be used when rootOnly is true"
        });
      }
    }
  );

export const listDepartmentsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      departmentListQuerySchema
  });

export const getDepartmentRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      departmentIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createDepartmentRequestSchema =
  z.object({
    body:
      createDepartmentBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateDepartmentRequestSchema =
  z.object({
    body:
      updateDepartmentBodySchema,

    params:
      departmentIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteDepartmentRequestSchema =
  getDepartmentRequestSchema;

export type CreateDepartmentInput =
  z.infer<
    typeof createDepartmentBodySchema
  >;

export type UpdateDepartmentInput =
  z.infer<
    typeof updateDepartmentBodySchema
  >;

export type DepartmentListQuery =
  z.infer<
    typeof departmentListQuerySchema
  >;
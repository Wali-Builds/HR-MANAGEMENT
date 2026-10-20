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

const designationCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Designation code must contain at least 2 characters"
  )
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Designation code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const nullableJobLevelSchema =
  z.preprocess(
    blankStringToNull,
    z.coerce
      .number()
      .int()
      .min(
        0,
        "Job level cannot be negative"
      )
      .max(
        65535,
        "Job level is too large"
      )
      .nullable()
  );

const maximumSalaryValue =
  9_999_999_999_999.99;

const nullableSalarySchema =
  z.preprocess(
    blankStringToNull,
    z.coerce
      .number()
      .finite()
      .min(
        0,
        "Salary cannot be negative"
      )
      .max(
        maximumSalaryValue,
        "Salary exceeds the supported limit"
      )
      .nullable()
  );

export const createDesignationBodySchema =
  z
    .object({
      companyId:
        databaseIdSchema.optional(),

      // edited by wali: Each designation is created inside one department.
      departmentId:
        databaseIdSchema,

      designationCode:
        designationCodeSchema,

      designationName: z
        .string()
        .trim()
        .min(
          2,
          "Designation name is required"
        )
        .max(150),

      grade:
        nullableText(50)
          .optional(),

      jobLevel:
        nullableJobLevelSchema
          .optional(),

      description:
        nullableText(65535)
          .optional(),

      minimumSalary:
        nullableSalarySchema
          .optional(),

      maximumSalary:
        nullableSalarySchema
          .optional(),

      isManagerial: z
        .boolean()
        .default(false),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.minimumSalary !==
            undefined &&
          data.minimumSalary !== null &&
          data.maximumSalary !==
            undefined &&
          data.maximumSalary !== null &&
          data.minimumSalary >
            data.maximumSalary
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "maximumSalary"
            ],

            message:
              "Maximum salary must be greater than or equal to minimum salary"
          });
        }
      }
    );

export const updateDesignationBodySchema =
  z
    .object({
      // edited by wali: Department changes are validated against linked positions and employees.
      departmentId:
        databaseIdSchema
          .optional(),

      designationCode:
        designationCodeSchema
          .optional(),

      designationName: z
        .string()
        .trim()
        .min(
          2,
          "Designation name is required"
        )
        .max(150)
        .optional(),

      grade:
        nullableText(50)
          .optional(),

      jobLevel:
        nullableJobLevelSchema
          .optional(),

      description:
        nullableText(65535)
          .optional(),

      minimumSalary:
        nullableSalarySchema
          .optional(),

      maximumSalary:
        nullableSalarySchema
          .optional(),

      isManagerial: z
        .boolean()
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
              "At least one designation field is required"
          });
        }

        if (
          data.minimumSalary !==
            undefined &&
          data.minimumSalary !== null &&
          data.maximumSalary !==
            undefined &&
          data.maximumSalary !== null &&
          data.minimumSalary >
            data.maximumSalary
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "maximumSalary"
            ],

            message:
              "Maximum salary must be greater than or equal to minimum salary"
          });
        }
      }
    );

const designationIdParamsSchema =
  z.object({
    designationId:
      databaseIdSchema
  });

export const designationListQuerySchema =
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

    departmentId:
      databaseIdSchema
        .optional(),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    grade: z
      .string()
      .trim()
      .max(50)
      .optional(),

    jobLevel: z.coerce
      .number()
      .int()
      .min(0)
      .max(65535)
      .optional(),

    isManagerial: z
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
        "designation_code",
        "designation_name",
        "grade",
        "job_level",
        "minimum_salary",
        "maximum_salary",
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
  });

export const listDesignationsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      designationListQuerySchema
  });

export const getDesignationRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      designationIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createDesignationRequestSchema =
  z.object({
    body:
      createDesignationBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateDesignationRequestSchema =
  z.object({
    body:
      updateDesignationBodySchema,

    params:
      designationIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteDesignationRequestSchema =
  getDesignationRequestSchema;

export type CreateDesignationInput =
  z.infer<
    typeof createDesignationBodySchema
  >;

export type UpdateDesignationInput =
  z.infer<
    typeof updateDesignationBodySchema
  >;

export type DesignationListQuery =
  z.infer<
    typeof designationListQuerySchema
  >;

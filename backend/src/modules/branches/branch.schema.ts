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

const nullableEmail = z.preprocess(
  blankStringToNull,
  z
    .string()
    .trim()
    .email(
      "A valid email address is required"
    )
    .max(150)
    .transform((value) =>
      value.toLowerCase()
    )
    .nullable()
);

const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "ID must be a positive integer"
  );

const branchCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Branch code must contain at least 2 characters"
  )
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Branch code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const countryCodeSchema = z
  .string()
  .trim()
  .length(
    2,
    "Country code must contain exactly 2 characters"
  )
  .regex(
    /^[A-Za-z]{2}$/,
    "Country code must contain letters only"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const latitudeSchema = z.preprocess(
  blankStringToNull,
  z.coerce
    .number()
    .min(-90)
    .max(90)
    .nullable()
);

const longitudeSchema = z.preprocess(
  blankStringToNull,
  z.coerce
    .number()
    .min(-180)
    .max(180)
    .nullable()
);

export const createBranchBodySchema =
  z
    .object({
      companyId:
        databaseIdSchema.optional(),

      branchCode:
        branchCodeSchema,

      branchName: z
        .string()
        .trim()
        .min(
          2,
          "Branch name is required"
        )
        .max(150),

      branchType:
        nullableText(50).optional(),

      officialEmail:
        nullableEmail.optional(),

      officialPhone:
        nullableText(50).optional(),

      addressLine1:
        nullableText(255).optional(),

      addressLine2:
        nullableText(255).optional(),

      city:
        nullableText(100).optional(),

      district:
        nullableText(100).optional(),

      province:
        nullableText(100).optional(),

      postalCode:
        nullableText(30).optional(),

      countryCode:
        countryCodeSchema.default("PK"),

      timezone: z
        .string()
        .trim()
        .min(1)
        .max(60)
        .default("Asia/Karachi"),

      latitude:
        latitudeSchema.optional(),

      longitude:
        longitudeSchema.optional(),

      isHeadOffice: z
        .boolean()
        .default(false),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict();

export const updateBranchBodySchema =
  createBranchBodySchema
    .omit({
      companyId: true
    })
    .partial()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one branch field is required"
          });
        }
      }
    );

const branchIdParamsSchema =
  z.object({
    branchId:
      databaseIdSchema
  });

export const branchListQuerySchema =
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

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    branchType: z
      .string()
      .trim()
      .max(50)
      .optional(),

    city: z
      .string()
      .trim()
      .max(100)
      .optional(),

    isActive: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    isHeadOffice: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "branch_code",
        "branch_name",
        "branch_type",
        "city",
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

export const listBranchesRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      branchListQuerySchema
  });

export const getBranchRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      branchIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createBranchRequestSchema =
  z.object({
    body:
      createBranchBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateBranchRequestSchema =
  z.object({
    body:
      updateBranchBodySchema,

    params:
      branchIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteBranchRequestSchema =
  getBranchRequestSchema;

export type CreateBranchInput =
  z.infer<
    typeof createBranchBodySchema
  >;

export type UpdateBranchInput =
  z.infer<
    typeof updateBranchBodySchema
  >;

export type BranchListQuery =
  z.infer<
    typeof branchListQuerySchema
  >;
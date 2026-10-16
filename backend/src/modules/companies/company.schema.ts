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
    .email("A valid email address is required")
    .max(150)
    .transform((value) =>
      value.toLowerCase()
    )
    .nullable()
);

const nullableWebsite = z.preprocess(
  blankStringToNull,
  z
    .string()
    .trim()
    .url("A valid website URL is required")
    .max(255)
    .nullable()
);

const companyCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Company code may contain letters, numbers, underscores and hyphens"
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

const currencyCodeSchema = z
  .string()
  .trim()
  .length(
    3,
    "Currency code must contain exactly 3 characters"
  )
  .regex(
    /^[A-Za-z]{3}$/,
    "Currency code must contain letters only"
  )
  .transform((value) =>
    value.toUpperCase()
  );

export const createCompanyBodySchema =
  z
    .object({
      companyCode:
        companyCodeSchema,

      legalName: z
        .string()
        .trim()
        .min(
          2,
          "Legal name is required"
        )
        .max(200),

      displayName: z
        .string()
        .trim()
        .min(
          2,
          "Display name is required"
        )
        .max(200),

      registrationNumber:
        nullableText(100)
          .optional(),

      taxNumber:
        nullableText(100)
          .optional(),

      industry:
        nullableText(100)
          .optional(),

      officialEmail:
        nullableEmail.optional(),

      officialPhone:
        nullableText(50)
          .optional(),

      websiteUrl:
        nullableWebsite.optional(),

      addressLine1:
        nullableText(255)
          .optional(),

      addressLine2:
        nullableText(255)
          .optional(),

      city:
        nullableText(100)
          .optional(),

      district:
        nullableText(100)
          .optional(),

      province:
        nullableText(100)
          .optional(),

      postalCode:
        nullableText(30)
          .optional(),

      countryCode:
        countryCodeSchema
          .default("PK"),

      timezone: z
        .string()
        .trim()
        .min(1)
        .max(60)
        .default("Asia/Karachi"),

      currencyCode:
        currencyCodeSchema
          .default("PKR"),

      dateFormat: z
        .string()
        .trim()
        .min(1)
        .max(30)
        .default("DD-MM-YYYY"),

      logoPath:
        nullableText(500)
          .optional(),

      employeeCodePrefix:
        nullableText(20)
          .optional(),

      employeeCodeLength: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict();

export const updateCompanyBodySchema =
  createCompanyBodySchema
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
              "At least one company field is required"
          });
        }
      }
    );

const companyIdParamsSchema =
  z.object({
    companyId: z
      .string()
      .trim()
      .regex(
        /^\d+$/,
        "Company ID must be a positive integer"
      )
  });

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

export const companyListQuerySchema =
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

    // edited by wali: Support the administrator deleted-company listing.
    isDeleted: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "company_code",
        "legal_name",
        "display_name",
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

const emptyRequestObjectSchema =
  z
    .object({})
    .passthrough()
    .default({});

export const listCompaniesRequestSchema =
  z.object({
    body:
      emptyRequestObjectSchema,

    params:
      emptyRequestObjectSchema,

    query:
      companyListQuerySchema
  });

export const getCompanyRequestSchema =
  z.object({
    body:
      emptyRequestObjectSchema,

    params:
      companyIdParamsSchema,

    query:
      emptyRequestObjectSchema
  });

export const createCompanyRequestSchema =
  z.object({
    body:
      createCompanyBodySchema,

    params:
      emptyRequestObjectSchema,

    query:
      emptyRequestObjectSchema
  });

export const updateCompanyRequestSchema =
  z.object({
    body:
      updateCompanyBodySchema,

    params:
      companyIdParamsSchema,

    query:
      emptyRequestObjectSchema
  });

export const deleteCompanyRequestSchema =
  getCompanyRequestSchema;

export type CreateCompanyInput =
  z.infer<
    typeof createCompanyBodySchema
  >;

export type UpdateCompanyInput =
  z.infer<
    typeof updateCompanyBodySchema
  >;

export type CompanyListQuery =
  z.infer<
    typeof companyListQuerySchema
  >;
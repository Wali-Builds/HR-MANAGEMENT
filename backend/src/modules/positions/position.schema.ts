import { z } from "zod";

/**
 * Converts empty or whitespace-only strings to null.
 *
 * This is useful for optional database columns where the frontend
 * may send an empty string instead of null.
 */
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

/**
 * Converts common query-string boolean values into actual booleans.
 */
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

/**
 * Validates a strict YYYY-MM-DD date.
 *
 * It rejects invalid dates such as:
 * - 2026-02-30
 * - 2026-13-01
 * - 18-07-2026
 */
function isValidIsoDate(
  value: string
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return false;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Database identifier such as companyId, branchId or positionId.
 */
const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "ID must be a positive integer"
  );

/**
 * Allows either:
 * - positive database ID
 * - null
 * - blank string, which is converted to null
 */
const nullableDatabaseIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
  );

/**
 * Optional date field stored as YYYY-MM-DD.
 */
const nullableDateSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .refine(
        isValidIsoDate,
        "Date must use YYYY-MM-DD format"
      )
      .nullable()
  );

/**
 * Salary column validation for DECIMAL(15,2).
 */
const nullableSalarySchema =
  z.preprocess(
    blankStringToNull,
    z.coerce
      .number()
      .finite(
        "Salary must be a valid number"
      )
      .min(
        0,
        "Salary cannot be negative"
      )
      .max(
        9_999_999_999_999.99,
        "Salary exceeds the supported limit"
      )
      .nullable()
  );

/**
 * Position code is unique within a company.
 */
const positionCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Position code must contain at least 2 characters"
  )
  .max(
    60,
    "Position code cannot contain more than 60 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Position code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

/**
 * Supports values such as:
 * - PERMANENT
 * - CONTRACT
 * - TEMPORARY
 * - INTERNSHIP
 */
const positionTypeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Position type must contain at least 2 characters"
  )
  .max(
    40,
    "Position type cannot contain more than 40 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Position type contains invalid characters"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const positionStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "FROZEN",
  "CLOSED"
]);

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

/**
 * The explicit undefined unions are required because the project uses:
 *
 * exactOptionalPropertyTypes: true
 */
type PositionRangeFields = {
  minimumSalary?:
    | number
    | null
    | undefined;

  maximumSalary?:
    | number
    | null
    | undefined;

  effectiveFrom?:
    | string
    | null
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;
};

/**
 * Shared validation for create and update position requests.
 */
function validateRanges(
  data: PositionRangeFields,
  context: z.RefinementCtx
): void {
  const minimumSalary =
    data.minimumSalary;

  const maximumSalary =
    data.maximumSalary;

  const effectiveFrom =
    data.effectiveFrom;

  const effectiveTo =
    data.effectiveTo;

  if (
    minimumSalary !== undefined &&
    minimumSalary !== null &&
    maximumSalary !== undefined &&
    maximumSalary !== null &&
    minimumSalary > maximumSalary
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

  if (
    effectiveFrom !== undefined &&
    effectiveFrom !== null &&
    effectiveTo !== undefined &&
    effectiveTo !== null &&
    effectiveTo < effectiveFrom
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "effectiveTo"
      ],

      message:
        "Effective-to date cannot be before effective-from date"
    });
  }
}

/**
 * POST /api/v1/positions
 */
export const createPositionBodySchema =
  z
    .object({
      /**
       * Required for Platform Administrator.
       *
       * Company-level users will receive companyId
       * from their authenticated account scope.
       */
      companyId:
        databaseIdSchema.optional(),

      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      designationId:
        nullableDatabaseIdSchema
          .optional(),

      reportsToPositionId:
        nullableDatabaseIdSchema
          .optional(),

      positionCode:
        positionCodeSchema,

      positionTitle: z
        .string()
        .trim()
        .min(
          2,
          "Position title is required"
        )
        .max(
          200,
          "Position title cannot contain more than 200 characters"
        ),

      positionType:
        positionTypeSchema
          .default("PERMANENT"),

      approvedHeadcount: z
        .number()
        .int(
          "Approved headcount must be a whole number"
        )
        .min(
          1,
          "Approved headcount must be at least 1"
        )
        .max(
          65535,
          "Approved headcount exceeds the supported limit"
        )
        .default(1),

      minimumSalary:
        nullableSalarySchema
          .optional(),

      maximumSalary:
        nullableSalarySchema
          .optional(),

      currencyCode:
        currencyCodeSchema
          .default("PKR"),

      positionStatus:
        positionStatusSchema
          .default("ACTIVE"),

      effectiveFrom:
        nullableDateSchema
          .optional(),

      effectiveTo:
        nullableDateSchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        data,
        context
      ) => {
        validateRanges(
          data,
          context
        );
      }
    );

/**
 * PATCH /api/v1/positions/:positionId
 */
export const updatePositionBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      designationId:
        nullableDatabaseIdSchema
          .optional(),

      reportsToPositionId:
        nullableDatabaseIdSchema
          .optional(),

      positionCode:
        positionCodeSchema
          .optional(),

      positionTitle: z
        .string()
        .trim()
        .min(
          2,
          "Position title must contain at least 2 characters"
        )
        .max(
          200,
          "Position title cannot contain more than 200 characters"
        )
        .optional(),

      positionType:
        positionTypeSchema
          .optional(),

      approvedHeadcount: z
        .number()
        .int(
          "Approved headcount must be a whole number"
        )
        .min(
          1,
          "Approved headcount must be at least 1"
        )
        .max(
          65535,
          "Approved headcount exceeds the supported limit"
        )
        .optional(),

      minimumSalary:
        nullableSalarySchema
          .optional(),

      maximumSalary:
        nullableSalarySchema
          .optional(),

      currencyCode:
        currencyCodeSchema
          .optional(),

      positionStatus:
        positionStatusSchema
          .optional(),

      effectiveFrom:
        nullableDateSchema
          .optional(),

      effectiveTo:
        nullableDateSchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        data,
        context
      ) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one position field is required"
          });
        }

        validateRanges(
          data,
          context
        );
      }
    );

const positionIdParamsSchema =
  z.object({
    positionId:
      databaseIdSchema
  });

/**
 * GET /api/v1/positions
 */
export const positionListQuerySchema =
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

    companyId:
      databaseIdSchema
        .optional(),

    branchId:
      databaseIdSchema
        .optional(),

    departmentId:
      databaseIdSchema
        .optional(),

    designationId:
      databaseIdSchema
        .optional(),

    reportsToPositionId:
      databaseIdSchema
        .optional(),

    search: z
      .string()
      .trim()
      .max(
        200,
        "Search value cannot contain more than 200 characters"
      )
      .optional(),

    positionType:
      positionTypeSchema
        .optional(),

    positionStatus:
      positionStatusSchema
        .optional(),

    hasVacancy: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "position_code",
        "position_title",
        "position_type",
        "approved_headcount",
        "filled_headcount",
        "position_status",
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

/**
 * Complete request schemas used by validateRequest middleware.
 */

export const listPositionsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      positionListQuerySchema
  });

export const getPositionRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      positionIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createPositionRequestSchema =
  z.object({
    body:
      createPositionBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updatePositionRequestSchema =
  z.object({
    body:
      updatePositionBodySchema,

    params:
      positionIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const closePositionRequestSchema =
  getPositionRequestSchema;

/**
 * TypeScript types inferred from Zod.
 */

export type CreatePositionInput =
  z.infer<
    typeof createPositionBodySchema
  >;

export type UpdatePositionInput =
  z.infer<
    typeof updatePositionBodySchema
  >;

export type PositionListQuery =
  z.infer<
    typeof positionListQuerySchema
  >;
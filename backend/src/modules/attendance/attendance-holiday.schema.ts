import { z } from "zod";

/*
 * =========================================================
 * Preprocessors
 * =========================================================
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

function queryNumber(
  value: unknown
): unknown {
  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed =
      Number(value);

    return Number.isNaN(parsed)
      ? value
      : parsed;
  }

  return value;
}

function queryBoolean(
  value: unknown
): unknown {
  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  if (
    typeof value === "number"
  ) {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0"
    ) {
      return false;
    }
  }

  return value;
}

function normalizeCode(
  value: string
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}

/*
 * =========================================================
 * Date validation
 * =========================================================
 */

function isValidDateOnly(
  value: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const parts =
    value.split("-");

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}

/*
 * =========================================================
 * Common schemas
 * =========================================================
 */

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

const dateOnlySchema = z
  .string()
  .trim()
  .refine(
    isValidDateOnly,
    "Date must use YYYY-MM-DD format"
  );

const booleanSchema =
  z.preprocess(
    queryBoolean,
    z.boolean()
  );

const holidayTypeSchema = z
  .string()
  .trim()
  .min(
    1,
    "Holiday type is required"
  )
  .max(
    30,
    "Holiday type cannot exceed 30 characters"
  )
  .regex(
    /^[A-Za-z0-9 _-]+$/,
    "Holiday type contains invalid characters"
  )
  .transform(
    normalizeCode
  );

const holidayNameSchema = z
  .string()
  .trim()
  .min(
    1,
    "Holiday name is required"
  )
  .max(
    150,
    "Holiday name cannot exceed 150 characters"
  );

const nullableDescriptionSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        500,
        "Description cannot exceed 500 characters"
      )
      .nullable()
  );

const paginationQuerySchema =
  z.object({
    page: z
      .preprocess(
        queryNumber,
        z
          .number()
          .int()
          .min(1)
      )
      .default(1),

    pageSize: z
      .preprocess(
        queryNumber,
        z
          .number()
          .int()
          .min(1)
          .max(100)
      )
      .default(25)
  });

/*
 * =========================================================
 * Shared validation
 * =========================================================
 */

function validateDateRange(
  input: {
    dateFrom?:
      | string
      | undefined;

    dateTo?:
      | string
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.dateFrom !== undefined &&
    input.dateTo !== undefined &&
    input.dateTo < input.dateFrom
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "dateTo"
      ],

      message:
        "Date-to cannot be before date-from"
    });
  }
}

/*
 * =========================================================
 * Holiday CRUD schemas
 * =========================================================
 */

export const createHolidayBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      holidayName:
        holidayNameSchema,

      holidayDate:
        dateOnlySchema,

      holidayType:
        holidayTypeSchema
          .default("PUBLIC"),

      description:
        nullableDescriptionSchema
          .optional(),

      isOptional:
        booleanSchema
          .default(false),

      isPaid:
        booleanSchema
          .default(true),

      isActive:
        booleanSchema
          .default(true)
    })
    .strict();

export const updateHolidayBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      holidayName:
        holidayNameSchema
          .optional(),

      holidayDate:
        dateOnlySchema
          .optional(),

      holidayType:
        holidayTypeSchema
          .optional(),

      description:
        nullableDescriptionSchema
          .optional(),

      isOptional:
        booleanSchema
          .optional(),

      isPaid:
        booleanSchema
          .optional(),

      isActive:
        booleanSchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          Object.keys(input).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one holiday field is required"
          });
        }
      }
    );

export const holidayListQuerySchema =
  paginationQuerySchema
    .extend({
      branchId:
        databaseIdSchema
          .optional(),

      holidayType:
        holidayTypeSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      isOptional:
        booleanSchema
          .optional(),

      isPaid:
        booleanSchema
          .optional(),

      isActive:
        booleanSchema
          .optional(),

      includeInactive:
        booleanSchema
          .default(false),

      includeCompanyWide:
        booleanSchema
          .default(true),

      search: z
        .string()
        .trim()
        .max(200)
        .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateDateRange(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Employee holiday schemas
 * =========================================================
 */

export const employeeHolidayListQuerySchema =
  paginationQuerySchema
    .extend({
      holidayType:
        holidayTypeSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      includeOptional:
        booleanSchema
          .default(true),

      includeInactive:
        booleanSchema
          .default(false),

      search: z
        .string()
        .trim()
        .max(200)
        .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateDateRange(
          input,
          context
        );
      }
    );

export const effectiveEmployeeHolidayQuerySchema =
  z
    .object({
      holidayDate:
        dateOnlySchema
          .optional(),

      includeOptional:
        booleanSchema
          .default(true),

      includeInactive:
        booleanSchema
          .default(false)
    })
    .strict();

/*
 * =========================================================
 * Holiday calendar summary
 * =========================================================
 */

export const holidayCalendarSummaryQuerySchema =
  z
    .object({
      branchId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema,

      dateTo:
        dateOnlySchema,

      includeOptional:
        booleanSchema
          .default(true),

      includeInactive:
        booleanSchema
          .default(false)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateDateRange(
          input,
          context
        );

        if (
          input.dateTo >=
          input.dateFrom
        ) {
          const startDate =
            new Date(
              `${input.dateFrom}T00:00:00.000Z`
            );

          const endDate =
            new Date(
              `${input.dateTo}T00:00:00.000Z`
            );

          const totalDays =
            Math.floor(
              (
                endDate.getTime() -
                startDate.getTime()
              ) /
                86_400_000
            ) + 1;

          if (
            totalDays > 366
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "dateTo"
              ],

              message:
                "Holiday calendar range cannot exceed 366 days"
            });
          }
        }
      }
    );

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const holidayParamsSchema =
  z.object({
    holidayId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Holiday request schemas
 * =========================================================
 */

export const listHolidaysRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      holidayListQuerySchema
  });

export const getHolidayRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      holidayParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createHolidayRequestSchema =
  z.object({
    body:
      createHolidayBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateHolidayRequestSchema =
  z.object({
    body:
      updateHolidayBodySchema,

    params:
      holidayParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteHolidayRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      holidayParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Employee holiday request schemas
 * =========================================================
 */

export const listEmployeeHolidaysRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeHolidayListQuerySchema
  });

export const getEffectiveEmployeeHolidayRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      effectiveEmployeeHolidayQuerySchema
  });

/*
 * =========================================================
 * Calendar-summary request schema
 * =========================================================
 */

export const getHolidayCalendarSummaryRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      holidayCalendarSummaryQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateHolidayInput =
  z.infer<
    typeof createHolidayBodySchema
  >;

export type UpdateHolidayInput =
  z.infer<
    typeof updateHolidayBodySchema
  >;

export type HolidayListQuery =
  z.infer<
    typeof holidayListQuerySchema
  >;

export type EmployeeHolidayListQuery =
  z.infer<
    typeof employeeHolidayListQuerySchema
  >;

export type EffectiveEmployeeHolidayQuery =
  z.infer<
    typeof effectiveEmployeeHolidayQuerySchema
  >;

export type HolidayCalendarSummaryQuery =
  z.infer<
    typeof holidayCalendarSummaryQuerySchema
  >;
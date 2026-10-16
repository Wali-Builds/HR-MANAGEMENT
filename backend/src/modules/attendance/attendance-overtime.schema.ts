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

  const [
    yearValue,
    monthValue,
    dayValue
  ] = value
    .split("-")
    .map(Number);

  if (
    yearValue === undefined ||
    monthValue === undefined ||
    dayValue === undefined
  ) {
    return false;
  }

  const date =
    new Date(
      Date.UTC(
        yearValue,
        monthValue - 1,
        dayValue
      )
    );

  return (
    date.getUTCFullYear() ===
      yearValue &&
    date.getUTCMonth() ===
      monthValue - 1 &&
    date.getUTCDate() ===
      dayValue
  );
}

function isValidDateTime(
  value: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(
      value
    )
  ) {
    return false;
  }

  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(
      value
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    Date.parse(value)
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

const dateTimeSchema = z
  .string()
  .trim()
  .refine(
    isValidDateTime,
    "Datetime must be ISO-8601 and include Z or a timezone offset"
  );

const nullableDateTimeSchema =
  z.preprocess(
    blankStringToNull,
    dateTimeSchema.nullable()
  );

const nullableTextSchema = (
  maximumLength: number
) =>
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        maximumLength,
        `Value cannot exceed ${maximumLength} characters`
      )
      .nullable()
  );

const requestStatusSchema =
  z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED"
  ]);

const minuteSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        1,
        "Overtime minutes must be greater than zero"
      )
      .max(
        1440,
        "Overtime minutes cannot exceed 1440 minutes"
      )
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

function validateDateRange(
  input: {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.dateFrom &&
    input.dateTo &&
    input.dateTo <
      input.dateFrom
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

function validateOvertimePeriod(
  input: {
    requestedStartAt?:
      | string
      | null
      | undefined;

    requestedEndAt?:
      | string
      | null
      | undefined;

    requestedMinutes?:
      | number
      | undefined;
  },
  context: z.RefinementCtx
): void {
  const hasStart =
    input.requestedStartAt !==
      undefined &&
    input.requestedStartAt !==
      null;

  const hasEnd =
    input.requestedEndAt !==
      undefined &&
    input.requestedEndAt !==
      null;

  if (hasStart !== hasEnd) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: hasStart
        ? [
            "requestedEndAt"
          ]
        : [
            "requestedStartAt"
          ],

      message:
        "Requested overtime start and end must be provided together"
    });

    return;
  }

  if (
    input.requestedStartAt &&
    input.requestedEndAt
  ) {
    const startTime =
      Date.parse(
        input.requestedStartAt
      );

    const endTime =
      Date.parse(
        input.requestedEndAt
      );

    if (
      endTime <= startTime
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "requestedEndAt"
        ],

        message:
          "Requested overtime end must be after its start"
      });

      return;
    }

    const calculatedMinutes =
      Math.floor(
        (
          endTime -
          startTime
        ) / 60000
      );

    if (
      input.requestedMinutes !==
        undefined &&
      Math.abs(
        calculatedMinutes -
        input.requestedMinutes
      ) > 1
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "requestedMinutes"
        ],

        message:
          "Requested minutes must match the overtime start and end period"
      });
    }
  }
}

/*
 * =========================================================
 * Create overtime request
 * =========================================================
 */

export const createOvertimeRequestBodySchema =
  z
    .object({
      employeeId:
        databaseIdSchema,

      attendanceId:
        nullableDatabaseIdSchema
          .optional(),

      overtimeDate:
        dateOnlySchema,

      requestedStartAt:
        nullableDateTimeSchema
          .optional(),

      requestedEndAt:
        nullableDateTimeSchema
          .optional(),

      requestedMinutes:
        minuteSchema,

      reason: z
        .string()
        .trim()
        .min(
          5,
          "Reason must contain at least 5 characters"
        )
        .max(
          5000,
          "Reason cannot exceed 5000 characters"
        )
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateOvertimePeriod(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Update pending request
 * =========================================================
 */

export const updateOvertimeRequestBodySchema =
  z
    .object({
      attendanceId:
        nullableDatabaseIdSchema
          .optional(),

      overtimeDate:
        dateOnlySchema
          .optional(),

      requestedStartAt:
        nullableDateTimeSchema
          .optional(),

      requestedEndAt:
        nullableDateTimeSchema
          .optional(),

      requestedMinutes:
        minuteSchema
          .optional(),

      reason: z
        .string()
        .trim()
        .min(5)
        .max(5000)
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
              "At least one overtime field is required"
          });
        }

        validateOvertimePeriod(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Approval, rejection and cancellation
 * =========================================================
 */

export const approveOvertimeRequestBodySchema =
  z
    .object({
      approvedMinutes:
        z.preprocess(
          queryNumber,
          z
            .number()
            .int()
            .min(
              0,
              "Approved minutes cannot be negative"
            )
            .max(
              1440,
              "Approved minutes cannot exceed 1440 minutes"
            )
        )
        .optional(),

      approvalRemarks:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

export const rejectOvertimeRequestBodySchema =
  z
    .object({
      approvalRemarks: z
        .string()
        .trim()
        .min(
          3,
          "Rejection remarks are required"
        )
        .max(5000)
    })
    .strict();

export const cancelOvertimeRequestBodySchema =
  z
    .object({
      remarks:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

/*
 * =========================================================
 * List filters
 * =========================================================
 */

export const overtimeRequestListQuerySchema =
  paginationQuerySchema
    .extend({
      employeeId:
        databaseIdSchema
          .optional(),

      attendanceId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      requestStatus:
        requestStatusSchema
          .optional(),

      requestedByUserId:
        databaseIdSchema
          .optional(),

      approvedByUserId:
        databaseIdSchema
          .optional(),

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

export const employeeOvertimeRequestListQuerySchema =
  paginationQuerySchema
    .extend({
      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      requestStatus:
        requestStatusSchema
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
 * Parameters
 * =========================================================
 */

const overtimeRequestParamsSchema =
  z.object({
    overtimeRequestId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const listOvertimeRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      overtimeRequestListQuerySchema
  });

export const getOvertimeRequestRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      overtimeRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createOvertimeRequestRequestSchema =
  z.object({
    body:
      createOvertimeRequestBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateOvertimeRequestRequestSchema =
  z.object({
    body:
      updateOvertimeRequestBodySchema,

    params:
      overtimeRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const approveOvertimeRequestRequestSchema =
  z.object({
    body:
      approveOvertimeRequestBodySchema,

    params:
      overtimeRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const rejectOvertimeRequestRequestSchema =
  z.object({
    body:
      rejectOvertimeRequestBodySchema,

    params:
      overtimeRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const cancelOvertimeRequestRequestSchema =
  z.object({
    body:
      cancelOvertimeRequestBodySchema,

    params:
      overtimeRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeOvertimeRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeOvertimeRequestListQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateOvertimeRequestInput =
  z.infer<
    typeof createOvertimeRequestBodySchema
  >;

export type UpdateOvertimeRequestInput =
  z.infer<
    typeof updateOvertimeRequestBodySchema
  >;

export type ApproveOvertimeRequestInput =
  z.infer<
    typeof approveOvertimeRequestBodySchema
  >;

export type RejectOvertimeRequestInput =
  z.infer<
    typeof rejectOvertimeRequestBodySchema
  >;

export type CancelOvertimeRequestInput =
  z.infer<
    typeof cancelOvertimeRequestBodySchema
  >;

export type OvertimeRequestListQuery =
  z.infer<
    typeof overtimeRequestListQuerySchema
  >;

export type EmployeeOvertimeRequestListQuery =
  z.infer<
    typeof employeeOvertimeRequestListQuerySchema
  >;
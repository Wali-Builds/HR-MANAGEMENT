import { z } from "zod";

/*
 * =========================================================
 * Helpers
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

  const date =
    new Date(
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

const nullableDatabaseIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
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

const codeSchema = (
  maximumLength: number
) =>
  z
    .string()
    .trim()
    .min(
      1,
      "Value is required"
    )
    .max(
      maximumLength,
      `Value cannot exceed ${maximumLength} characters`
    )
    .regex(
      /^[A-Za-z0-9 _-]+$/,
      "Value contains invalid characters"
    )
    .transform(
      normalizeCode
    );

const requestStatusSchema =
  z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED"
  ]);

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

function validateRequestedTimes(
  input: {
    requestedCheckInAt?:
      | string
      | null
      | undefined;

    requestedCheckOutAt?:
      | string
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.requestedCheckInAt &&
    input.requestedCheckOutAt &&
    Date.parse(
      input.requestedCheckOutAt
    ) <
      Date.parse(
        input.requestedCheckInAt
      )
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "requestedCheckOutAt"
      ],

      message:
        "Requested check-out cannot be before requested check-in"
    });
  }
}

/*
 * =========================================================
 * Create request
 * =========================================================
 */

export const createAttendanceAdjustmentRequestBodySchema =
  z
    .object({
      employeeId:
        databaseIdSchema,

      attendanceId:
        nullableDatabaseIdSchema
          .optional(),

      attendanceDate:
        dateOnlySchema,

      adjustmentType:
        codeSchema(50),

      requestedCheckInAt:
        nullableDateTimeSchema
          .optional(),

      requestedCheckOutAt:
        nullableDateTimeSchema
          .optional(),

      requestedStatusCode:
        z.preprocess(
          blankStringToNull,
          codeSchema(30)
            .nullable()
        )
        .optional(),

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
        ),

      attachmentPath:
        nullableTextSchema(700)
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateRequestedTimes(
          input,
          context
        );

        const hasRequestedChange =
          input.requestedCheckInAt !==
            undefined ||
          input.requestedCheckOutAt !==
            undefined ||
          input.requestedStatusCode !==
            undefined;

        if (!hasRequestedChange) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one requested attendance change is required"
          });
        }
      }
    );

/*
 * =========================================================
 * Update pending request
 * =========================================================
 */

export const updateAttendanceAdjustmentRequestBodySchema =
  z
    .object({
      adjustmentType:
        codeSchema(50)
          .optional(),

      requestedCheckInAt:
        nullableDateTimeSchema
          .optional(),

      requestedCheckOutAt:
        nullableDateTimeSchema
          .optional(),

      requestedStatusCode:
        z.preprocess(
          blankStringToNull,
          codeSchema(30)
            .nullable()
        )
        .optional(),

      reason: z
        .string()
        .trim()
        .min(5)
        .max(5000)
        .optional(),

      attachmentPath:
        nullableTextSchema(700)
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
              "At least one adjustment field is required"
          });
        }

        validateRequestedTimes(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Approval and rejection
 * =========================================================
 */

export const approveAttendanceAdjustmentBodySchema =
  z
    .object({
      approvalLevel: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(1),

      comments:
        nullableTextSchema(5000)
          .optional(),

      finalRemarks:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

export const rejectAttendanceAdjustmentBodySchema =
  z
    .object({
      approvalLevel: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(1),

      comments: z
        .string()
        .trim()
        .min(
          3,
          "Rejection comments are required"
        )
        .max(5000),

      finalRemarks:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

export const cancelAttendanceAdjustmentBodySchema =
  z
    .object({
      comments:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

/*
 * =========================================================
 * List queries
 * =========================================================
 */

export const attendanceAdjustmentRequestListQuerySchema =
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

      adjustmentType:
        codeSchema(50)
          .optional(),

      requestedByUserId:
        databaseIdSchema
          .optional(),

      finalDecisionBy:
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

export const employeeAttendanceAdjustmentListQuerySchema =
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
          .optional(),

      adjustmentType:
        codeSchema(50)
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
 * Params
 * =========================================================
 */

const adjustmentRequestParamsSchema =
  z.object({
    adjustmentRequestId:
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

export const listAttendanceAdjustmentRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendanceAdjustmentRequestListQuerySchema
  });

export const getAttendanceAdjustmentRequestRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createAttendanceAdjustmentRequestRequestSchema =
  z.object({
    body:
      createAttendanceAdjustmentRequestBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateAttendanceAdjustmentRequestRequestSchema =
  z.object({
    body:
      updateAttendanceAdjustmentRequestBodySchema,

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const approveAttendanceAdjustmentRequestSchema =
  z.object({
    body:
      approveAttendanceAdjustmentBodySchema,

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const rejectAttendanceAdjustmentRequestSchema =
  z.object({
    body:
      rejectAttendanceAdjustmentBodySchema,

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const cancelAttendanceAdjustmentRequestSchema =
  z.object({
    body:
      cancelAttendanceAdjustmentBodySchema,

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listAttendanceAdjustmentApprovalsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      adjustmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeAttendanceAdjustmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeAttendanceAdjustmentListQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateAttendanceAdjustmentRequestInput =
  z.infer<
    typeof createAttendanceAdjustmentRequestBodySchema
  >;

export type UpdateAttendanceAdjustmentRequestInput =
  z.infer<
    typeof updateAttendanceAdjustmentRequestBodySchema
  >;

export type ApproveAttendanceAdjustmentInput =
  z.infer<
    typeof approveAttendanceAdjustmentBodySchema
  >;

export type RejectAttendanceAdjustmentInput =
  z.infer<
    typeof rejectAttendanceAdjustmentBodySchema
  >;

export type CancelAttendanceAdjustmentInput =
  z.infer<
    typeof cancelAttendanceAdjustmentBodySchema
  >;

export type AttendanceAdjustmentRequestListQuery =
  z.infer<
    typeof attendanceAdjustmentRequestListQuerySchema
  >;

export type EmployeeAttendanceAdjustmentListQuery =
  z.infer<
    typeof employeeAttendanceAdjustmentListQuerySchema
  >;
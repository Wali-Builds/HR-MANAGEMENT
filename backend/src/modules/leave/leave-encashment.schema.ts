import { z } from "zod";

/*
 * =========================================================
 * Preprocessors and common schemas
 * =========================================================
 */

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
    yearText,
    monthText,
    dayText
  ] = value.split("-");

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  const day =
    Number(dayText);

  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    parsed.getUTCFullYear() ===
      year &&
    parsed.getUTCMonth() ===
      month - 1 &&
    parsed.getUTCDate() ===
      day
  );
}

const databaseIdSchema =
  z
    .string()
    .trim()
    .regex(
      /^[1-9]\d*$/,
      "ID must be a positive integer"
    );

const dateOnlySchema =
  z
    .string()
    .trim()
    .refine(
      isValidDateOnly,
      "Date must use YYYY-MM-DD format"
    );

const requestedUnitsSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .finite()
      .gt(
        0,
        "Requested units must be greater than zero"
      )
      .max(
        99_999_999.99,
        "Requested units exceed the database limit"
      )
  );

const ratePerUnitSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .finite()
      .gt(
        0,
        "Rate per unit must be greater than zero"
      )
      .max(
        9_999_999_999_999.99,
        "Rate per unit exceeds the database limit"
      )
  );

const nullableReasonSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        5000,
        "Reason cannot exceed 5000 characters"
      )
      .nullable()
  );

const requiredRemarksSchema =
  z
    .string()
    .trim()
    .min(
      3,
      "Remarks must contain at least 3 characters"
    )
    .max(
      5000,
      "Remarks cannot exceed 5000 characters"
    );

const nullableApprovalRemarksSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        5000,
        "Approval remarks cannot exceed 5000 characters"
      )
      .nullable()
  );

const payrollReferenceSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Payroll reference is required"
    )
    .max(
      100,
      "Payroll reference cannot exceed 100 characters"
    );

export const leaveEncashmentRequestStatusSchema =
  z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "PROCESSED"
  ]);

const paginationQuerySchema =
  z.object({
    page:
      z.preprocess(
        queryNumber,
        z
          .number()
          .int()
          .min(1)
      )
      .default(1),

    pageSize:
      z.preprocess(
        queryNumber,
        z
          .number()
          .int()
          .min(1)
          .max(100)
      )
      .default(25)
  });

function validateFilterDateRange(
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
    input.dateFrom !==
      undefined &&
    input.dateTo !==
      undefined &&
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

/*
 * =========================================================
 * List schemas
 * =========================================================
 */

export const leaveEncashmentRequestListQuerySchema =
  paginationQuerySchema
    .extend({
      employeeId:
        databaseIdSchema
          .optional(),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      requestStatus:
        leaveEncashmentRequestStatusSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      search:
        z
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
        validateFilterDateRange(
          input,
          context
        );
      }
    );

export const employeeLeaveEncashmentRequestListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      requestStatus:
        leaveEncashmentRequestStatusSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateFilterDateRange(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Lifecycle body schemas
 * =========================================================
 */

export const createLeaveEncashmentRequestBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema,

      leavePeriodId:
        databaseIdSchema,

      requestedUnits:
        requestedUnitsSchema,

      reason:
        nullableReasonSchema
          .optional()
    })
    .strict();

export const approveLeaveEncashmentRequestBodySchema =
  z
    .object({
      approvedUnits:
        requestedUnitsSchema,

      ratePerUnit:
        ratePerUnitSchema,

      approvalRemarks:
        nullableApprovalRemarksSchema
          .optional()
    })
    .strict();

export const rejectLeaveEncashmentRequestBodySchema =
  z
    .object({
      approvalRemarks:
        requiredRemarksSchema
    })
    .strict();

export const cancelLeaveEncashmentRequestBodySchema =
  z
    .object({
      reason:
        requiredRemarksSchema
    })
    .strict();

export const processLeaveEncashmentRequestBodySchema =
  z
    .object({
      payrollReference:
        payrollReferenceSchema
    })
    .strict();

/*
 * =========================================================
 * Request wrappers
 * =========================================================
 */

const encashmentRequestParamsSchema =
  z.object({
    encashmentRequestId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

export const listLeaveEncashmentRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveEncashmentRequestListQuerySchema
  });

export const getLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      encashmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeLeaveEncashmentRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeLeaveEncashmentRequestListQuerySchema
  });

export const createEmployeeLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      createLeaveEncashmentRequestBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const approveLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      approveLeaveEncashmentRequestBodySchema,

    params:
      encashmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const rejectLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      rejectLeaveEncashmentRequestBodySchema,

    params:
      encashmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const cancelLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      cancelLeaveEncashmentRequestBodySchema,

    params:
      encashmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const processLeaveEncashmentRequestRequestSchema =
  z.object({
    body:
      processLeaveEncashmentRequestBodySchema,

    params:
      encashmentRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred input types
 * =========================================================
 */

export type LeaveEncashmentRequestListQuery =
  z.infer<
    typeof leaveEncashmentRequestListQuerySchema
  >;

export type EmployeeLeaveEncashmentRequestListQuery =
  z.infer<
    typeof employeeLeaveEncashmentRequestListQuerySchema
  >;

export type CreateLeaveEncashmentRequestInput =
  z.infer<
    typeof createLeaveEncashmentRequestBodySchema
  >;

export type ApproveLeaveEncashmentRequestInput =
  z.infer<
    typeof approveLeaveEncashmentRequestBodySchema
  >;

export type RejectLeaveEncashmentRequestInput =
  z.infer<
    typeof rejectLeaveEncashmentRequestBodySchema
  >;

export type CancelLeaveEncashmentRequestInput =
  z.infer<
    typeof cancelLeaveEncashmentRequestBodySchema
  >;

export type ProcessLeaveEncashmentRequestInput =
  z.infer<
    typeof processLeaveEncashmentRequestBodySchema
  >;

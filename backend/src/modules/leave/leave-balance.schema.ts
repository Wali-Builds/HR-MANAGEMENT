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
    Number(
      parts[0] ?? "0"
    );

  const month =
    Number(
      parts[1] ?? "0"
    );

  const day =
    Number(
      parts[2] ?? "0"
    );

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

const dateOnlySchema = z
  .string()
  .trim()
  .refine(
    isValidDateOnly,
    "Date must use YYYY-MM-DD format"
  );

const nullableDateOnlySchema =
  z.preprocess(
    blankStringToNull,
    dateOnlySchema.nullable()
  );

const booleanSchema =
  z.preprocess(
    queryBoolean,
    z.boolean()
  );

const codeSchema = (
  maximumLength: number
) =>
  z
    .string()
    .trim()
    .min(
      1,
      "Code is required"
    )
    .max(
      maximumLength,
      `Code cannot exceed ${maximumLength} characters`
    )
    .regex(
      /^[A-Za-z0-9 _-]+$/,
      "Code contains invalid characters"
    )
    .transform(
      normalizeCode
    );

const nameSchema = (
  maximumLength: number
) =>
  z
    .string()
    .trim()
    .min(
      1,
      "Name is required"
    )
    .max(
      maximumLength,
      `Name cannot exceed ${maximumLength} characters`
    );

const nullableReferenceTypeSchema =
  z.preprocess(
    blankStringToNull,
    codeSchema(50).nullable()
  );

const nullableReferenceIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
  );

const nullableRemarksSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        1000,
        "Remarks cannot exceed 1000 characters"
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
      1000,
      "Remarks cannot exceed 1000 characters"
    );

const decimalUnitsSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .finite()
      .min(
        0,
        "Units cannot be negative"
      )
      .max(
        99_999_999.99,
        "Units exceed the database limit"
      )
  );

const positiveDecimalUnitsSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .finite()
      .gt(
        0,
        "Units must be greater than zero"
      )
      .max(
        99_999_999.99,
        "Units exceed the database limit"
      )
  );

const signedDecimalSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .finite()
      .min(
        -99_999_999.99,
        "Value is below the database limit"
      )
      .max(
        99_999_999.99,
        "Value exceeds the database limit"
      )
  );

const periodStatusSchema =
  z.enum([
    "OPEN",
    "CLOSED"
  ]);

export const leaveBalanceTransactionTypeSchema =
  z.enum([
    "OPENING_BALANCE",
    "ACCRUAL",
    "CARRY_FORWARD",
    "MANUAL_CREDIT",
    "MANUAL_DEBIT",
    "LEAVE_RESERVED",
    "LEAVE_RELEASED",
    "LEAVE_USED",
    "ENCASHMENT",
    "EXPIRY"
  ]);

const adjustmentDirectionSchema =
  z.enum([
    "CREDIT",
    "DEBIT"
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

/*
 * =========================================================
 * Validation helpers
 * =========================================================
 */

function validateDateRange(
  input: {
    startDate?:
      | string
      | undefined;

    endDate?:
      | string
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.startDate !== undefined &&
    input.endDate !== undefined &&
    input.endDate <
      input.startDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "endDate"
      ],

      message:
        "End date cannot be before start date"
    });
  }
}

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
    input.dateFrom !== undefined &&
    input.dateTo !== undefined &&
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
 * Leave-period schemas
 * =========================================================
 */

export const createLeavePeriodBodySchema =
  z
    .object({
      periodCode:
        codeSchema(50),

      periodName:
        nameSchema(150),

      startDate:
        dateOnlySchema,

      endDate:
        dateOnlySchema,

      periodStatus:
        periodStatusSchema
          .default("OPEN")
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

export const updateLeavePeriodBodySchema =
  z
    .object({
      periodCode:
        codeSchema(50)
          .optional(),

      periodName:
        nameSchema(150)
          .optional(),

      startDate:
        dateOnlySchema
          .optional(),

      endDate:
        dateOnlySchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          Object.keys(input).length ===
          0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one leave-period field is required"
          });
        }

        validateDateRange(
          input,
          context
        );
      }
    );

export const closeAndOpenNextLeavePeriodBodySchema =
  z
    .object({
      targetPeriodId:
        databaseIdSchema,

      processingDate:
        dateOnlySchema
          .optional(),

      carryForwardRunId:
        databaseIdSchema
          .optional()
    })
    .strict();

export const leavePeriodListQuerySchema =
  paginationQuerySchema
    .extend({
      periodStatus:
        periodStatusSchema
          .optional(),

      effectiveOn:
        dateOnlySchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
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
        validateFilterDateRange(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Balance schemas
 * =========================================================
 */

export const leaveBalanceListQuerySchema =
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

      periodStatus:
        periodStatusSchema
          .optional(),

      availableBalanceMin:
        signedDecimalSchema
          .optional(),

      availableBalanceMax:
        signedDecimalSchema
          .optional(),

      includeZeroBalance:
        booleanSchema
          .default(true),

      onlyInconsistent:
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
        if (
          input.availableBalanceMin !==
            undefined &&
          input.availableBalanceMax !==
            undefined &&
          input.availableBalanceMax <
            input.availableBalanceMin
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "availableBalanceMax"
            ],

            message:
              "Maximum balance cannot be less than minimum balance"
          });
        }
      }
    );

export const employeeLeaveBalanceListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      periodStatus:
        periodStatusSchema
          .optional(),

      effectiveOn:
        dateOnlySchema
          .optional(),

      includeZeroBalance:
        booleanSchema
          .default(true),

      onlyInconsistent:
        booleanSchema
          .default(false)
    })
    .strict();

export const employeeLeaveTypeBalanceQuerySchema =
  z
    .object({
      leavePeriodId:
        databaseIdSchema
          .optional(),

      effectiveOn:
        dateOnlySchema
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.leavePeriodId ===
            undefined &&
          input.effectiveOn ===
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Either leavePeriodId or effectiveOn is required"
          });
        }

        if (
          input.leavePeriodId !==
            undefined &&
          input.effectiveOn !==
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "Provide leavePeriodId or effectiveOn, not both"
          });
        }
      }
    );

export const initializeEmployeeLeaveBalanceBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema,

      leavePeriodId:
        databaseIdSchema,

      openingBalance:
        decimalUnitsSchema
          .default(0),

      accruedUnits:
        decimalUnitsSchema
          .default(0),

      carriedForwardUnits:
        decimalUnitsSchema
          .default(0),

      adjustedUnits:
        signedDecimalSchema
          .default(0),

      lastAccrualDate:
        nullableDateOnlySchema
          .optional(),

      remarks:
        nullableRemarksSchema
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Manual adjustment schemas
 * =========================================================
 */

export const createLeaveBalanceAdjustmentBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema,

      leavePeriodId:
        databaseIdSchema,

      adjustmentDirection:
        adjustmentDirectionSchema,

      units:
        positiveDecimalUnitsSchema,

      transactionDate:
        dateOnlySchema
          .optional(),

      referenceType:
        nullableReferenceTypeSchema
          .optional(),

      referenceId:
        nullableReferenceIdSchema
          .optional(),

      remarks:
        requiredRemarksSchema
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        const hasReferenceType =
          input.referenceType !==
            undefined &&
          input.referenceType !==
            null;

        const hasReferenceId =
          input.referenceId !==
            undefined &&
          input.referenceId !==
            null;

        if (
          hasReferenceId &&
          !hasReferenceType
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "referenceType"
            ],

            message:
              "Reference type is required when reference ID is provided"
          });
        }
      }
    );

/*
 * =========================================================
 * Transaction-list schemas
 * =========================================================
 */

export const leaveBalanceTransactionListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveBalanceId:
        databaseIdSchema
          .optional(),

      employeeId:
        databaseIdSchema
          .optional(),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      transactionType:
        leaveBalanceTransactionTypeSchema
          .optional(),

      referenceType:
        codeSchema(50)
          .optional(),

      referenceId:
        databaseIdSchema
          .optional(),

      createdByUserId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
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
        validateFilterDateRange(
          input,
          context
        );
      }
    );

export const employeeLeaveBalanceTransactionListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveBalanceId:
        databaseIdSchema
          .optional(),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      transactionType:
        leaveBalanceTransactionTypeSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      referenceType:
        codeSchema(50)
          .optional(),

      referenceId:
        databaseIdSchema
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
 * Recalculation schemas
 * =========================================================
 */

export const recalculateLeaveBalanceBodySchema =
  z
    .object({
      repair:
        booleanSchema
          .default(true)
    })
    .strict();

export const bulkRecalculateLeaveBalancesBodySchema =
  z
    .object({
      employeeId:
        databaseIdSchema
          .optional(),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      onlyInconsistent:
        booleanSchema
          .default(true),

      repair:
        booleanSchema
          .default(true)
    })
    .strict();

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const leavePeriodParamsSchema =
  z.object({
    leavePeriodId:
      databaseIdSchema
  });

const leaveBalanceParamsSchema =
  z.object({
    leaveBalanceId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeLeaveTypeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    leaveTypeId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Leave-period request schemas
 * =========================================================
 */

export const listLeavePeriodsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leavePeriodListQuerySchema
  });

export const getLeavePeriodRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeavePeriodRequestSchema =
  z.object({
    body:
      createLeavePeriodBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateLeavePeriodRequestSchema =
  z.object({
    body:
      updateLeavePeriodBodySchema,

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const closeLeavePeriodRequestSchema =
  z.object({
    body:
      z.object({}).strict(),

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const closeAndOpenNextLeavePeriodRequestSchema =
  z.object({
    body:
      closeAndOpenNextLeavePeriodBodySchema,

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const reopenLeavePeriodRequestSchema =
  z.object({
    body:
      z.object({}).strict(),

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeavePeriodRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Balance request schemas
 * =========================================================
 */

export const listLeaveBalancesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveBalanceListQuerySchema
  });

export const getLeaveBalanceRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveBalanceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeLeaveBalancesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeLeaveBalanceListQuerySchema
  });

export const getEmployeeLeaveTypeBalanceRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeLeaveTypeParamsSchema,

    query:
      employeeLeaveTypeBalanceQuerySchema
  });

export const initializeEmployeeLeaveBalanceRequestSchema =
  z.object({
    body:
      initializeEmployeeLeaveBalanceBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Adjustment request schema
 * =========================================================
 */

export const createLeaveBalanceAdjustmentRequestSchema =
  z.object({
    body:
      createLeaveBalanceAdjustmentBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Transaction request schemas
 * =========================================================
 */

export const listLeaveBalanceTransactionsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveBalanceTransactionListQuerySchema
  });

export const listEmployeeLeaveBalanceTransactionsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeLeaveBalanceTransactionListQuerySchema
  });

/*
 * =========================================================
 * Recalculation request schemas
 * =========================================================
 */

export const recalculateLeaveBalanceRequestSchema =
  z.object({
    body:
      recalculateLeaveBalanceBodySchema,

    params:
      leaveBalanceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const bulkRecalculateLeaveBalancesRequestSchema =
  z.object({
    body:
      bulkRecalculateLeaveBalancesBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateLeavePeriodInput =
  z.infer<
    typeof createLeavePeriodBodySchema
  >;

export type UpdateLeavePeriodInput =
  z.infer<
    typeof updateLeavePeriodBodySchema
  >;

export type CloseAndOpenNextLeavePeriodInput =
  z.infer<
    typeof closeAndOpenNextLeavePeriodBodySchema
  >;

export type LeavePeriodListQuery =
  z.infer<
    typeof leavePeriodListQuerySchema
  >;

export type LeaveBalanceListQuery =
  z.infer<
    typeof leaveBalanceListQuerySchema
  >;

export type EmployeeLeaveBalanceListQuery =
  z.infer<
    typeof employeeLeaveBalanceListQuerySchema
  >;

export type EmployeeLeaveTypeBalanceQuery =
  z.infer<
    typeof employeeLeaveTypeBalanceQuerySchema
  >;

export type InitializeEmployeeLeaveBalanceInput =
  z.infer<
    typeof initializeEmployeeLeaveBalanceBodySchema
  >;

export type CreateLeaveBalanceAdjustmentInput =
  z.infer<
    typeof createLeaveBalanceAdjustmentBodySchema
  >;

export type LeaveBalanceTransactionListQuery =
  z.infer<
    typeof leaveBalanceTransactionListQuerySchema
  >;

export type EmployeeLeaveBalanceTransactionListQuery =
  z.infer<
    typeof employeeLeaveBalanceTransactionListQuerySchema
  >;

export type RecalculateLeaveBalanceInput =
  z.infer<
    typeof recalculateLeaveBalanceBodySchema
  >;

export type BulkRecalculateLeaveBalancesInput =
  z.infer<
    typeof bulkRecalculateLeaveBalancesBodySchema
  >;
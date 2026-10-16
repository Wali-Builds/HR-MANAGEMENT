import { z } from "zod";

/*
 * =========================================================
 * Shared preprocessors
 * =========================================================
 */

const databaseIdSchema =
  z.preprocess(
    value => {
      if (
        typeof value === "number" ||
        typeof value === "bigint"
      ) {
        return String(value);
      }

      return value;
    },
    z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(
        /^\d+$/,
        "A valid numeric identifier is required"
      )
  );

const dateOnlySchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Date must use YYYY-MM-DD format"
    )
    .refine(
      value => {
        const parsed =
          new Date(
            `${value}T00:00:00.000Z`
          );

        return (
          !Number.isNaN(
            parsed.getTime()
          ) &&
          parsed
            .toISOString()
            .slice(0, 10) ===
            value
        );
      },
      "A valid date is required"
    );

const booleanQuerySchema =
  z.preprocess(
    value => {
      if (
        value === true ||
        value === false
      ) {
        return value;
      }

      if (
        value === "true" ||
        value === "1" ||
        value === 1
      ) {
        return true;
      }

      if (
        value === "false" ||
        value === "0" ||
        value === 0
      ) {
        return false;
      }

      return value;
    },
    z.boolean()
  );

const positiveIntegerSchema =
  z.preprocess(
    value => {
      if (
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        return Number(value);
      }

      return value;
    },
    z
      .number()
      .int()
      .positive()
  );

const pageSchema =
  positiveIntegerSchema
    .default(1);

const pageSizeSchema =
  z.preprocess(
    value => {
      if (
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        return Number(value);
      }

      return value;
    },
    z
      .number()
      .int()
      .positive()
      .max(200)
  )
  .default(25);

const optionalSearchSchema =
  z
    .string()
    .trim()
    .min(1)
    .max(150)
    .optional();

const optionalDatabaseIdSchema =
  databaseIdSchema.optional();

const processingRunStatusSchema =
  z.enum([
    "DRAFT",
    "PROCESSING",
    "COMPLETED",
    "PARTIAL_FAILED",
    "FAILED",
    "CANCELLED"
  ]);

const processingDetailStatusSchema =
  z.enum([
    "PENDING",
    "PROCESSED",
    "SKIPPED",
    "FAILED"
  ]);

const expiryStatusSchema =
  z.enum([
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "SKIPPED",
    "FAILED"
  ]);

const accrualMethodSchema =
  z.enum([
    "ANNUAL",
    "SEMI_ANNUAL",
    "QUARTERLY",
    "MONTHLY"
  ]);

const accrualRunTypeSchema =
  z.enum([
    "REGULAR",
    "INITIAL_ALLOCATION",
    "CORRECTION"
  ]);

const runNumberSchema =
  z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional();

const idempotencyKeySchema =
  z
    .string()
    .trim()
    .min(8)
    .max(150);

const runNameSchema =
  z
    .string()
    .trim()
    .min(3)
    .max(150);

const cancellationReasonSchema =
  z
    .string()
    .trim()
    .min(3)
    .max(1000);

function validateDateRange(
  input: {
    fromDate: string;
    toDate: string;
  },
  context: z.RefinementCtx,
  toPath: string
): void {
  if (
    input.toDate <
    input.fromDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,
      message:
        "The ending date cannot be before the starting date",
      path: [toPath]
    });
  }
}

/*
 * =========================================================
 * Accrual-run schemas
 * =========================================================
 */

export const leaveAccrualRunListQuerySchema =
  z.object({
    leavePeriodId:
      optionalDatabaseIdSchema,

    runType:
      accrualRunTypeSchema.optional(),

    accrualMethod:
      accrualMethodSchema.optional(),

    runStatus:
      processingRunStatusSchema.optional(),

    isDryRun:
      booleanQuerySchema.optional(),

    postingDateFrom:
      dateOnlySchema.optional(),

    postingDateTo:
      dateOnlySchema.optional(),

    search:
      optionalSearchSchema,

    page:
      pageSchema,

    pageSize:
      pageSizeSchema
  })
  .superRefine(
    (
      input,
      context
    ) => {
      if (
        input.postingDateFrom &&
        input.postingDateTo
      ) {
        validateDateRange(
          {
            fromDate:
              input.postingDateFrom,

            toDate:
              input.postingDateTo
          },
          context,
          "postingDateTo"
        );
      }
    }
  );

export const leaveAccrualRunDetailListQuerySchema =
  z.object({
    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema,

    detailStatus:
      processingDetailStatusSchema.optional(),

    search:
      optionalSearchSchema,

    page:
      pageSchema,

    pageSize:
      pageSizeSchema
  });

const leaveAccrualPreviewBaseSchema =
  z.object({
    leavePeriodId:
      databaseIdSchema,

    accrualMethod:
      accrualMethodSchema,

    accrualFromDate:
      dateOnlySchema,

    accrualToDate:
      dateOnlySchema,

    postingDate:
      dateOnlySchema,

    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema
  });

export const leaveAccrualPreviewBodySchema =
  leaveAccrualPreviewBaseSchema
    .superRefine(
      (
        input,
        context
      ) => {
        validateDateRange(
          {
            fromDate:
              input.accrualFromDate,

            toDate:
              input.accrualToDate
          },
          context,
          "accrualToDate"
        );
      }
    );

export const createLeaveAccrualRunBodySchema =
  leaveAccrualPreviewBaseSchema
    .extend({
      runNumber:
        runNumberSchema,

      idempotencyKey:
        idempotencyKeySchema,

      runName:
        runNameSchema,

      runType:
        accrualRunTypeSchema,

      isDryRun:
        z.boolean().default(false)
    })
    .superRefine(
      (
        input,
        context
      ) => {
        validateDateRange(
          {
            fromDate:
              input.accrualFromDate,

            toDate:
              input.accrualToDate
          },
          context,
          "accrualToDate"
        );
      }
    );

export const processLeaveAccrualRunBodySchema =
  z.object({
    continueOnError:
      z.boolean().default(true),

    rebuildPendingDetails:
      z.boolean().default(true)
  });

export const cancelLeaveAccrualRunBodySchema =
  z.object({
    reason:
      cancellationReasonSchema
  });

/*
 * =========================================================
 * Carry-forward schemas
 * =========================================================
 */

export const leaveCarryForwardRunListQuerySchema =
  z.object({
    sourcePeriodId:
      optionalDatabaseIdSchema,

    targetPeriodId:
      optionalDatabaseIdSchema,

    runStatus:
      processingRunStatusSchema.optional(),

    isDryRun:
      booleanQuerySchema.optional(),

    processingDateFrom:
      dateOnlySchema.optional(),

    processingDateTo:
      dateOnlySchema.optional(),

    search:
      optionalSearchSchema,

    page:
      pageSchema,

    pageSize:
      pageSizeSchema
  })
  .superRefine(
    (
      input,
      context
    ) => {
      if (
        input.processingDateFrom &&
        input.processingDateTo
      ) {
        validateDateRange(
          {
            fromDate:
              input.processingDateFrom,

            toDate:
              input.processingDateTo
          },
          context,
          "processingDateTo"
        );
      }
    }
  );

export const leaveCarryForwardRunDetailListQuerySchema =
  z.object({
    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema,

    detailStatus:
      processingDetailStatusSchema.optional(),

    search:
      optionalSearchSchema,

    page:
      pageSchema,

    pageSize:
      pageSizeSchema
  });

export const leaveCarryForwardPreviewBodySchema =
  z.object({
    targetPeriodId:
      databaseIdSchema,

    processingDate:
      dateOnlySchema,

    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema
  });

export const createLeaveCarryForwardRunBodySchema =
  leaveCarryForwardPreviewBodySchema
    .extend({
      runNumber:
        runNumberSchema,

      idempotencyKey:
        idempotencyKeySchema,

      runName:
        runNameSchema,

      isDryRun:
        z.boolean().default(false)
    });

export const processLeaveCarryForwardRunBodySchema =
  z.object({
    continueOnError:
      z.boolean().default(true)
  });

export const cancelLeaveCarryForwardRunBodySchema =
  z.object({
    reason:
      cancellationReasonSchema
  });

/*
 * =========================================================
 * Expiry schemas
 * =========================================================
 */

export const leaveBalanceExpiryListQuerySchema =
  z.object({
    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema,

    leavePeriodId:
      optionalDatabaseIdSchema,

    expiryStatus:
      expiryStatusSchema.optional(),

    expiryDateFrom:
      dateOnlySchema.optional(),

    expiryDateTo:
      dateOnlySchema.optional(),

    page:
      pageSchema,

    pageSize:
      pageSizeSchema
  })
  .superRefine(
    (
      input,
      context
    ) => {
      if (
        input.expiryDateFrom &&
        input.expiryDateTo
      ) {
        validateDateRange(
          {
            fromDate:
              input.expiryDateFrom,

            toDate:
              input.expiryDateTo
          },
          context,
          "expiryDateTo"
        );
      }
    }
  );

export const processLeaveBalanceExpiryBodySchema =
  z.object({
    processingDate:
      dateOnlySchema,

    employeeId:
      optionalDatabaseIdSchema,

    leaveTypeId:
      optionalDatabaseIdSchema,

    continueOnError:
      z.boolean().default(true),

    dryRun:
      z.boolean().default(false)
  });

/*
 * =========================================================
 * Request wrappers
 * =========================================================
 */

const emptyBodySchema =
  z.object({}).passthrough();

const emptyQuerySchema =
  z.object({}).passthrough();

const accrualRunParamsSchema =
  z.object({
    accrualRunId:
      databaseIdSchema
  });

const carryForwardRunParamsSchema =
  z.object({
    carryForwardRunId:
      databaseIdSchema
  });

const leavePeriodParamsSchema =
  z.object({
    leavePeriodId:
      databaseIdSchema
  });

export const listLeaveAccrualRunsRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      leaveAccrualRunListQuerySchema
  });

export const getLeaveAccrualRunRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      accrualRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const listLeaveAccrualRunDetailsRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      accrualRunParamsSchema,

    query:
      leaveAccrualRunDetailListQuerySchema
  });

export const previewLeaveAccrualRequestSchema =
  z.object({
    body:
      leaveAccrualPreviewBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      emptyQuerySchema
  });

export const createLeaveAccrualRunRequestSchema =
  z.object({
    body:
      createLeaveAccrualRunBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      emptyQuerySchema
  });

export const processLeaveAccrualRunRequestSchema =
  z.object({
    body:
      processLeaveAccrualRunBodySchema,

    params:
      accrualRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const cancelLeaveAccrualRunRequestSchema =
  z.object({
    body:
      cancelLeaveAccrualRunBodySchema,

    params:
      accrualRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const listLeaveCarryForwardRunsRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      leaveCarryForwardRunListQuerySchema
  });

export const getLeaveCarryForwardRunRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      carryForwardRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const listLeaveCarryForwardRunDetailsRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      carryForwardRunParamsSchema,

    query:
      leaveCarryForwardRunDetailListQuerySchema
  });

export const previewLeaveCarryForwardRequestSchema =
  z.object({
    body:
      leaveCarryForwardPreviewBodySchema,

    params:
      leavePeriodParamsSchema,

    query:
      emptyQuerySchema
  });

export const createLeaveCarryForwardRunRequestSchema =
  z.object({
    body:
      createLeaveCarryForwardRunBodySchema,

    params:
      leavePeriodParamsSchema,

    query:
      emptyQuerySchema
  });

export const processLeaveCarryForwardRunRequestSchema =
  z.object({
    body:
      processLeaveCarryForwardRunBodySchema,

    params:
      carryForwardRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const cancelLeaveCarryForwardRunRequestSchema =
  z.object({
    body:
      cancelLeaveCarryForwardRunBodySchema,

    params:
      carryForwardRunParamsSchema,

    query:
      emptyQuerySchema
  });

export const listLeaveBalanceExpiriesRequestSchema =
  z.object({
    body:
      emptyBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      leaveBalanceExpiryListQuerySchema
  });

export const processLeaveBalanceExpiryRequestSchema =
  z.object({
    body:
      processLeaveBalanceExpiryBodySchema,

    params:
      leavePeriodParamsSchema,

    query:
      emptyQuerySchema
  });

/*
 * =========================================================
 * Inferred input types
 * =========================================================
 */

export type LeaveAccrualRunListQuery =
  z.infer<
    typeof leaveAccrualRunListQuerySchema
  >;

export type LeaveAccrualRunDetailListQuery =
  z.infer<
    typeof leaveAccrualRunDetailListQuerySchema
  >;

export type LeaveAccrualPreviewInput =
  z.infer<
    typeof leaveAccrualPreviewBodySchema
  >;

export type CreateLeaveAccrualRunInput =
  z.infer<
    typeof createLeaveAccrualRunBodySchema
  >;

export type ProcessLeaveAccrualRunInput =
  z.infer<
    typeof processLeaveAccrualRunBodySchema
  >;

export type CancelLeaveAccrualRunInput =
  z.infer<
    typeof cancelLeaveAccrualRunBodySchema
  >;

export type LeaveCarryForwardRunListQuery =
  z.infer<
    typeof leaveCarryForwardRunListQuerySchema
  >;

export type LeaveCarryForwardRunDetailListQuery =
  z.infer<
    typeof leaveCarryForwardRunDetailListQuerySchema
  >;

export type LeaveCarryForwardPreviewInput =
  z.infer<
    typeof leaveCarryForwardPreviewBodySchema
  >;

export type CreateLeaveCarryForwardRunInput =
  z.infer<
    typeof createLeaveCarryForwardRunBodySchema
  >;

export type ProcessLeaveCarryForwardRunInput =
  z.infer<
    typeof processLeaveCarryForwardRunBodySchema
  >;

export type CancelLeaveCarryForwardRunInput =
  z.infer<
    typeof cancelLeaveCarryForwardRunBodySchema
  >;

export type LeaveBalanceExpiryListQuery =
  z.infer<
    typeof leaveBalanceExpiryListQuerySchema
  >;

export type ProcessLeaveBalanceExpiryInput =
  z.infer<
    typeof processLeaveBalanceExpiryBodySchema
  >;

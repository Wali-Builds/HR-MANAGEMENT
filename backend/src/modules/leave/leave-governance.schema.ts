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
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDatabaseDateTime(
  value: string
): string {
  const normalized =
    value
      .trim()
      .replace("T", " ");

  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(
    normalized
  )
    ? `${normalized}:00`
    : normalized;
}

function isValidDatabaseDateTime(
  value: string
): boolean {
  const normalized =
    normalizeDatabaseDateTime(value);

  if (
    !/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(
      normalized
    )
  ) {
    return false;
  }

  const [
    datePart = "",
    timePart = ""
  ] = normalized.split(" ");

  if (
    !isValidDateOnly(datePart)
  ) {
    return false;
  }

  const timeParts =
    timePart.split(":");

  const hours =
    Number(
      timeParts[0] ?? "-1"
    );

  const minutes =
    Number(
      timeParts[1] ?? "-1"
    );

  const seconds =
    Number(
      timeParts[2] ?? "-1"
    );

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

/*
 * =========================================================
 * Common schemas
 * =========================================================
 */

const databaseIdSchema =
  z
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

const dateOnlySchema =
  z
    .string()
    .trim()
    .refine(
      isValidDateOnly,
      "Date must use YYYY-MM-DD format"
    );

const dateTimeSchema =
  z
    .string()
    .trim()
    .refine(
      isValidDatabaseDateTime,
      "Datetime must use YYYY-MM-DD HH:mm:ss format"
    )
    .transform(
      normalizeDatabaseDateTime
    );

const booleanSchema =
  z.preprocess(
    queryBoolean,
    z.boolean()
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

const paginationQuerySchema =
  z.object({
    page:
      z
        .preprocess(
          queryNumber,
          z
            .number()
            .int()
            .min(1)
        )
        .default(1),

    pageSize:
      z
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

const blackoutRestrictionTypeSchema =
  z.enum([
    "BLOCK",
    "WARNING"
  ]);

/*
 * =========================================================
 * Delegation validation
 * =========================================================
 */

interface DelegationRangeInput {
  delegatorUserId?:
    | string
    | undefined;

  delegateUserId?:
    | string
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | undefined;
}

function validateDelegationRange(
  input: DelegationRangeInput,
  context: z.RefinementCtx
): void {
  if (
    input.delegatorUserId !== undefined &&
    input.delegateUserId !== undefined &&
    input.delegatorUserId ===
      input.delegateUserId
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "delegateUserId"
      ],

      message:
        "A user cannot delegate approvals to themselves"
    });
  }

  if (
    input.effectiveFrom !== undefined &&
    input.effectiveTo !== undefined &&
    input.effectiveTo <=
      input.effectiveFrom
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "effectiveTo"
      ],

      message:
        "Effective-to must be after effective-from"
    });
  }
}

/*
 * =========================================================
 * Approval delegation schemas
 * =========================================================
 */

export const createLeaveApprovalDelegationBodySchema =
  z
    .object({
      delegatorUserId:
        databaseIdSchema,

      delegateUserId:
        databaseIdSchema,

      effectiveFrom:
        dateTimeSchema,

      effectiveTo:
        dateTimeSchema,

      reason:
        nullableTextSchema(500)
          .optional(),

      isActive:
        booleanSchema
          .default(true)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateDelegationRange(
          input,
          context
        );
      }
    );

export const updateLeaveApprovalDelegationBodySchema =
  z
    .object({
      delegatorUserId:
        databaseIdSchema
          .optional(),

      delegateUserId:
        databaseIdSchema
          .optional(),

      effectiveFrom:
        dateTimeSchema
          .optional(),

      effectiveTo:
        dateTimeSchema
          .optional(),

      reason:
        nullableTextSchema(500)
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
              "At least one delegation field is required"
          });
        }

        validateDelegationRange(
          input,
          context
        );
      }
    );

export const leaveApprovalDelegationListQuerySchema =
  paginationQuerySchema
    .extend({
      delegatorUserId:
        databaseIdSchema
          .optional(),

      delegateUserId:
        databaseIdSchema
          .optional(),

      isActive:
        booleanSchema
          .optional(),

      effectiveOn:
        dateTimeSchema
          .optional(),

      includeExpired:
        booleanSchema
          .default(false),

      search:
        z
          .string()
          .trim()
          .max(200)
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Blackout validation
 * =========================================================
 */

interface BlackoutDateRangeInput {
  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | undefined;
}

function validateBlackoutDateRange(
  input: BlackoutDateRangeInput,
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

/*
 * =========================================================
 * Blackout-period schemas
 * =========================================================
 */

export const createLeaveBlackoutPeriodBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      leaveTypeId:
        nullableDatabaseIdSchema
          .optional(),

      blackoutName:
        z
          .string()
          .trim()
          .min(
            1,
            "Blackout name is required"
          )
          .max(
            150,
            "Blackout name cannot exceed 150 characters"
          ),

      description:
        nullableTextSchema(5000)
          .optional(),

      startDate:
        dateOnlySchema,

      endDate:
        dateOnlySchema,

      restrictionType:
        blackoutRestrictionTypeSchema
          .default("BLOCK"),

      exceptionRequiresApproval:
        booleanSchema
          .default(true),

      isActive:
        booleanSchema
          .default(true)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateBlackoutDateRange(
          input,
          context
        );
      }
    );

export const updateLeaveBlackoutPeriodBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      leaveTypeId:
        nullableDatabaseIdSchema
          .optional(),

      blackoutName:
        z
          .string()
          .trim()
          .min(
            1,
            "Blackout name is required"
          )
          .max(
            150,
            "Blackout name cannot exceed 150 characters"
          )
          .optional(),

      description:
        nullableTextSchema(5000)
          .optional(),

      startDate:
        dateOnlySchema
          .optional(),

      endDate:
        dateOnlySchema
          .optional(),

      restrictionType:
        blackoutRestrictionTypeSchema
          .optional(),

      exceptionRequiresApproval:
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
              "At least one blackout-period field is required"
          });
        }

        validateBlackoutDateRange(
          input,
          context
        );
      }
    );

export const leaveBlackoutPeriodListQuerySchema =
  paginationQuerySchema
    .extend({
      branchId:
        databaseIdSchema
          .optional(),

      departmentId:
        databaseIdSchema
          .optional(),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      restrictionType:
        blackoutRestrictionTypeSchema
          .optional(),

      isActive:
        booleanSchema
          .optional(),

      overlappingDateFrom:
        dateOnlySchema
          .optional(),

      overlappingDateTo:
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
        if (
          input.overlappingDateFrom !== undefined &&
          input.overlappingDateTo !== undefined &&
          input.overlappingDateTo <
            input.overlappingDateFrom
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "overlappingDateTo"
            ],

            message:
              "Overlapping-date-to cannot be before overlapping-date-from"
          });
        }
      }
    );

export const applicableLeaveBlackoutQuerySchema =
  z
    .object({
      employeeId:
        databaseIdSchema,

      leaveTypeId:
        databaseIdSchema,

      startDate:
        dateOnlySchema,

      endDate:
        dateOnlySchema
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateBlackoutDateRange(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const delegationParamsSchema =
  z.object({
    delegationId:
      databaseIdSchema
  });

const blackoutPeriodParamsSchema =
  z.object({
    blackoutPeriodId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Delegation request schemas
 * =========================================================
 */

export const listLeaveApprovalDelegationsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveApprovalDelegationListQuerySchema
  });

export const getLeaveApprovalDelegationRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      delegationParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeaveApprovalDelegationRequestSchema =
  z.object({
    body:
      createLeaveApprovalDelegationBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateLeaveApprovalDelegationRequestSchema =
  z.object({
    body:
      updateLeaveApprovalDelegationBodySchema,

    params:
      delegationParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeaveApprovalDelegationRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      delegationParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Blackout request schemas
 * =========================================================
 */

export const listLeaveBlackoutPeriodsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveBlackoutPeriodListQuerySchema
  });

export const getLeaveBlackoutPeriodRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      blackoutPeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeaveBlackoutPeriodRequestSchema =
  z.object({
    body:
      createLeaveBlackoutPeriodBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateLeaveBlackoutPeriodRequestSchema =
  z.object({
    body:
      updateLeaveBlackoutPeriodBodySchema,

    params:
      blackoutPeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeaveBlackoutPeriodRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      blackoutPeriodParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const previewApplicableLeaveBlackoutsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      applicableLeaveBlackoutQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateLeaveApprovalDelegationInput =
  z.infer<
    typeof createLeaveApprovalDelegationBodySchema
  >;

export type UpdateLeaveApprovalDelegationInput =
  z.infer<
    typeof updateLeaveApprovalDelegationBodySchema
  >;

export type LeaveApprovalDelegationListQuery =
  z.infer<
    typeof leaveApprovalDelegationListQuerySchema
  >;

export type CreateLeaveBlackoutPeriodInput =
  z.infer<
    typeof createLeaveBlackoutPeriodBodySchema
  >;

export type UpdateLeaveBlackoutPeriodInput =
  z.infer<
    typeof updateLeaveBlackoutPeriodBodySchema
  >;

export type LeaveBlackoutPeriodListQuery =
  z.infer<
    typeof leaveBlackoutPeriodListQuerySchema
  >;

export type ApplicableLeaveBlackoutQuery =
  z.infer<
    typeof applicableLeaveBlackoutQuerySchema
  >;
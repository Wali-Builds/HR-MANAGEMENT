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
 * Date and time validation
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

function normalizeTime(
  value: string
): string {
  const trimmed =
    value.trim();

  if (
    /^\d{2}:\d{2}$/.test(
      trimmed
    )
  ) {
    return `${trimmed}:00`;
  }

  return trimmed;
}

function timeToSeconds(
  value: string
): number {
  const parts =
    value.split(":");

  const hours =
    Number(
      parts[0] ?? "0"
    );

  const minutes =
    Number(
      parts[1] ?? "0"
    );

  const seconds =
    Number(
      parts[2] ?? "0"
    );

  return (
    hours * 3600 +
    minutes * 60 +
    seconds
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

const timeSchema =
  z
    .string()
    .trim()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
      "Time must use HH:mm or HH:mm:ss format"
    )
    .transform(
      normalizeTime
    );

const nullableTimeSchema =
  z.preprocess(
    blankStringToNull,
    timeSchema.nullable()
  );

const booleanSchema =
  z.preprocess(
    queryBoolean,
    z.boolean()
  );

const requestStatusSchema =
  z.enum([
    "DRAFT",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "WITHDRAWN"
  ]);

const leaveSessionSchema =
  z.enum([
    "FULL_DAY",
    "FIRST_HALF",
    "SECOND_HALF",
    "HOURLY"
  ]);

const approvalDecisionSchema =
  z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SKIPPED"
  ]);

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

const requiredReasonSchema =
  z
    .string()
    .trim()
    .min(
      3,
      "Reason must contain at least 3 characters"
    )
    .max(
      5000,
      "Reason cannot exceed 5000 characters"
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

/*
 * =========================================================
 * Request-range validation
 * =========================================================
 */

interface LeaveRequestRangeInput {
  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | undefined;

  startSession?:
    | z.infer<
        typeof leaveSessionSchema
      >
    | undefined;

  endSession?:
    | z.infer<
        typeof leaveSessionSchema
      >
    | undefined;

  startTime?:
    | string
    | null
    | undefined;

  endTime?:
    | string
    | null
    | undefined;
}

function validateLeaveRequestRange(
  input: LeaveRequestRangeInput,
  context: z.RefinementCtx
): void {
  if (
    input.startDate !== undefined &&
    input.endDate !== undefined &&
    input.endDate < input.startDate
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

  const startIsHourly =
    input.startSession ===
    "HOURLY";

  const endIsHourly =
    input.endSession ===
    "HOURLY";

  if (
    startIsHourly !==
    endIsHourly
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        startIsHourly
          ? "endSession"
          : "startSession"
      ],

      message:
        "Start and end sessions must both be HOURLY for an hourly request"
    });
  }

  if (
    startIsHourly &&
    endIsHourly
  ) {
    if (
      input.startDate !== undefined &&
      input.endDate !== undefined &&
      input.startDate !==
        input.endDate
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "endDate"
        ],

        message:
          "Hourly leave must start and end on the same date"
      });
    }

    if (
      input.startTime ===
        undefined ||
      input.startTime === null
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "startTime"
        ],

        message:
          "Start time is required for hourly leave"
      });
    }

    if (
      input.endTime ===
        undefined ||
      input.endTime === null
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "endTime"
        ],

        message:
          "End time is required for hourly leave"
      });
    }

    if (
      input.startTime !==
        undefined &&
      input.startTime !== null &&
      input.endTime !==
        undefined &&
      input.endTime !== null &&
      timeToSeconds(
        input.endTime
      ) <=
        timeToSeconds(
          input.startTime
        )
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "endTime"
        ],

        message:
          "End time must be after start time"
      });
    }

    return;
  }

  if (
    input.startTime !==
      undefined &&
    input.startTime !==
      null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "startTime"
      ],

      message:
        "Start time is only allowed for hourly leave"
    });
  }

  if (
    input.endTime !==
      undefined &&
    input.endTime !==
      null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "endTime"
      ],

      message:
        "End time is only allowed for hourly leave"
    });
  }

  if (
    input.startDate !== undefined &&
    input.endDate !== undefined &&
    input.startDate ===
      input.endDate &&
    input.startSession !==
      undefined &&
    input.endSession !==
      undefined
  ) {
    const sessionKey =
      `${input.startSession}:${input.endSession}`;

    const allowedSameDaySessions =
      new Set([
        "FULL_DAY:FULL_DAY",
        "FIRST_HALF:FIRST_HALF",
        "SECOND_HALF:SECOND_HALF",
        "FIRST_HALF:SECOND_HALF"
      ]);

    if (
      !allowedSameDaySessions.has(
        sessionKey
      )
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "endSession"
        ],

        message:
          "The selected start and end sessions are not valid for a same-day request"
      });
    }
  }
}

/*
 * =========================================================
 * Leave-request body schemas
 * =========================================================
 */

export const createLeaveRequestBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema,

      startDate:
        dateOnlySchema,

      endDate:
        dateOnlySchema,

      startSession:
        leaveSessionSchema
          .default(
            "FULL_DAY"
          ),

      endSession:
        leaveSessionSchema
          .default(
            "FULL_DAY"
          ),

      startTime:
        nullableTimeSchema
          .optional(),

      endTime:
        nullableTimeSchema
          .optional(),

      requestedUnits:
        requestedUnitsSchema
          .optional(),

      reason:
        requiredReasonSchema,

      contactNumber:
        nullableTextSchema(50)
          .optional(),

      contactAddress:
        nullableTextSchema(500)
          .optional(),

      workHandoverToEmployeeId:
        nullableDatabaseIdSchema
          .optional(),

      workHandoverNotes:
        nullableTextSchema(5000)
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateLeaveRequestRange(
          input,
          context
        );
      }
    );

export const updateLeaveRequestBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      startDate:
        dateOnlySchema
          .optional(),

      endDate:
        dateOnlySchema
          .optional(),

      startSession:
        leaveSessionSchema
          .optional(),

      endSession:
        leaveSessionSchema
          .optional(),

      startTime:
        nullableTimeSchema
          .optional(),

      endTime:
        nullableTimeSchema
          .optional(),

      requestedUnits:
        requestedUnitsSchema
          .optional(),

      reason:
        requiredReasonSchema
          .optional(),

      contactNumber:
        nullableTextSchema(50)
          .optional(),

      contactAddress:
        nullableTextSchema(500)
          .optional(),

      workHandoverToEmployeeId:
        nullableDatabaseIdSchema
          .optional(),

      workHandoverNotes:
        nullableTextSchema(5000)
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
              "At least one leave-request field is required"
          });
        }

        validateLeaveRequestRange(
          input,
          context
        );
      }
    );

/*
 * =========================================================
 * Request lifecycle schemas
 * =========================================================
 */

export const submitLeaveRequestBodySchema =
  z
    .object({
      acknowledgement:
        booleanSchema
          .default(true)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.acknowledgement !==
          true
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "acknowledgement"
            ],

            message:
              "Submission acknowledgement must be accepted"
          });
        }
      }
    );

export const cancelLeaveRequestBodySchema =
  z
    .object({
      reason:
        requiredReasonSchema
    })
    .strict();

export const withdrawLeaveRequestBodySchema =
  z
    .object({
      reason:
        requiredReasonSchema
    })
    .strict();

/*
 * =========================================================
 * Approval schemas
 * =========================================================
 */

export const approveLeaveRequestBodySchema =
  z
    .object({
      comments:
        nullableTextSchema(5000)
          .optional()
    })
    .strict();

export const rejectLeaveRequestBodySchema =
  z
    .object({
      comments:
        z
          .string()
          .trim()
          .min(
            3,
            "Rejection comments must contain at least 3 characters"
          )
          .max(
            5000,
            "Comments cannot exceed 5000 characters"
          )
    })
    .strict();

export const leaveApprovalDecisionFilterSchema =
  approvalDecisionSchema;

/*
 * =========================================================
 * Attachment schemas
 * =========================================================
 */

export const createLeaveRequestAttachmentBodySchema =
  z
    .object({
      attachmentType:
        nullableTextSchema(50)
          .optional(),

      attachmentTitle:
        nullableTextSchema(200)
          .optional(),

      originalFilename:
        z
          .string()
          .trim()
          .min(
            1,
            "Original filename is required"
          )
          .max(
            255,
            "Original filename cannot exceed 255 characters"
          ),

      storedFilename:
        z
          .string()
          .trim()
          .min(
            1,
            "Stored filename is required"
          )
          .max(
            255,
            "Stored filename cannot exceed 255 characters"
          ),

      storagePath:
        z
          .string()
          .trim()
          .min(
            1,
            "Storage path is required"
          )
          .max(
            700,
            "Storage path cannot exceed 700 characters"
          ),

      mimeType:
        nullableTextSchema(100)
          .optional(),

      fileSizeBytes:
        z
          .preprocess(
            queryNumber,
            z
              .number()
              .int()
              .min(
                0,
                "File size cannot be negative"
              )
              .max(
                104_857_600,
                "File size cannot exceed 100 MB"
              )
          )
          .optional(),

      checksumSha256:
        z
          .preprocess(
            blankStringToNull,
            z
              .string()
              .trim()
              .regex(
                /^[A-Fa-f0-9]{64}$/,
                "SHA-256 checksum must contain 64 hexadecimal characters"
              )
              .transform(
                (
                  value
                ) =>
                  value.toLowerCase()
              )
              .nullable()
          )
          .optional()
    })
    .strict();

/*
 * =========================================================
 * List-query schemas
 * =========================================================
 */

export const leaveRequestListQuerySchema =
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
        requestStatusSchema
          .optional(),

      startDateFrom:
        dateOnlySchema
          .optional(),

      startDateTo:
        dateOnlySchema
          .optional(),

      overlappingDateFrom:
        dateOnlySchema
          .optional(),

      overlappingDateTo:
        dateOnlySchema
          .optional(),

      submittedByUserId:
        databaseIdSchema
          .optional(),

      finalDecisionByUserId:
        databaseIdSchema
          .optional(),

      includeDetails:
        booleanSchema
          .default(false),

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
          input.startDateFrom !==
            undefined &&
          input.startDateTo !==
            undefined &&
          input.startDateTo <
            input.startDateFrom
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "startDateTo"
            ],

            message:
              "Start-date-to cannot be before start-date-from"
          });
        }

        if (
          input.overlappingDateFrom !==
            undefined &&
          input.overlappingDateTo !==
            undefined &&
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

export const employeeLeaveRequestListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      leavePeriodId:
        databaseIdSchema
          .optional(),

      requestStatus:
        requestStatusSchema
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
    );

export const pendingLeaveApprovalListQuerySchema =
  paginationQuerySchema
    .extend({
      decision:
        approvalDecisionSchema
          .default(
            "PENDING"
          ),

      leaveTypeId:
        databaseIdSchema
          .optional(),

      employeeId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      includeDelegated:
        booleanSchema
          .default(true)
    })
    .strict();

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const leaveRequestParamsSchema =
  z.object({
    leaveRequestId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeLeaveRequestParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    leaveRequestId:
      databaseIdSchema
  });

const leaveRequestAttachmentParamsSchema =
  z.object({
    leaveRequestId:
      databaseIdSchema,

    attachmentId:
      databaseIdSchema
  });

const leaveRequestApprovalParamsSchema =
  z.object({
    leaveRequestId:
      databaseIdSchema,

    leaveApprovalId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Company leave-request request schemas
 * =========================================================
 */

export const listLeaveRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveRequestListQuerySchema
  });

export const getLeaveRequestRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveRequestParamsSchema,

    query:
      z.object({
        includeDetails:
          booleanSchema
            .default(true)
      })
        .strict()
  });

export const updateLeaveRequestRequestSchema =
  z.object({
    body:
      updateLeaveRequestBodySchema,

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const submitLeaveRequestRequestSchema =
  z.object({
    body:
      submitLeaveRequestBodySchema,

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const cancelLeaveRequestRequestSchema =
  z.object({
    body:
      cancelLeaveRequestBodySchema,

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const withdrawLeaveRequestRequestSchema =
  z.object({
    body:
      withdrawLeaveRequestBodySchema,

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Employee leave-request request schemas
 * =========================================================
 */

export const listEmployeeLeaveRequestsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeLeaveRequestListQuerySchema
  });

export const createEmployeeLeaveRequestRequestSchema =
  z.object({
    body:
      createLeaveRequestBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const getEmployeeLeaveRequestRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeLeaveRequestParamsSchema,

    query:
      z.object({
        includeDetails:
          booleanSchema
            .default(true)
      })
        .strict()
  });

/*
 * =========================================================
 * Request-day request schemas
 * =========================================================
 */

export const listLeaveRequestDaysRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Attachment request schemas
 * =========================================================
 */

export const listLeaveRequestAttachmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeaveRequestAttachmentRequestSchema =
  z.object({
    body:
      createLeaveRequestAttachmentBodySchema,

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeaveRequestAttachmentRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveRequestAttachmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Approval request schemas
 * =========================================================
 */

export const listPendingLeaveApprovalsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      pendingLeaveApprovalListQuerySchema
  });

export const approveLeaveRequestRequestSchema =
  z.object({
    body:
      approveLeaveRequestBodySchema,

    params:
      leaveRequestApprovalParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const rejectLeaveRequestRequestSchema =
  z.object({
    body:
      rejectLeaveRequestBodySchema,

    params:
      leaveRequestApprovalParamsSchema,

    query:
      z.object({}).passthrough()
  });
  export const listLeaveRequestApprovalsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveRequestParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateLeaveRequestInput =
  z.infer<
    typeof createLeaveRequestBodySchema
  >;

export type UpdateLeaveRequestInput =
  z.infer<
    typeof updateLeaveRequestBodySchema
  >;

export type SubmitLeaveRequestInput =
  z.infer<
    typeof submitLeaveRequestBodySchema
  >;

export type CancelLeaveRequestInput =
  z.infer<
    typeof cancelLeaveRequestBodySchema
  >;

export type WithdrawLeaveRequestInput =
  z.infer<
    typeof withdrawLeaveRequestBodySchema
  >;

export type CreateLeaveRequestAttachmentInput =
  z.infer<
    typeof createLeaveRequestAttachmentBodySchema
  >;

export type ApproveLeaveRequestInput =
  z.infer<
    typeof approveLeaveRequestBodySchema
  >;

export type RejectLeaveRequestInput =
  z.infer<
    typeof rejectLeaveRequestBodySchema
  >;

export type LeaveRequestListQuery =
  z.infer<
    typeof leaveRequestListQuerySchema
  >;

export type EmployeeLeaveRequestListQuery =
  z.infer<
    typeof employeeLeaveRequestListQuerySchema
  >;

export type PendingLeaveApprovalListQuery =
  z.infer<
    typeof pendingLeaveApprovalListQuerySchema
  >;
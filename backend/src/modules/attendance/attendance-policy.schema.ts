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
    date.getUTCFullYear() === year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
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

const minuteSchema = (
  maximumValue = 1440
) =>
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        0,
        "Minutes cannot be negative"
      )
      .max(
        maximumValue,
        `Minutes cannot exceed ${maximumValue}`
      )
  );

const positiveMinuteSchema = (
  fieldName: string,
  maximumValue = 1440
) =>
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        1,
        `${fieldName} must be greater than zero`
      )
      .max(
        maximumValue,
        `${fieldName} cannot exceed ${maximumValue}`
      )
  );

const nullableMinuteSchema = (
  maximumValue = 1440
) =>
  z.preprocess(
    blankStringToNull,
    z.preprocess(
      queryNumber,
      z
        .number()
        .int()
        .min(
          0,
          "Minutes cannot be negative"
        )
        .max(
          maximumValue,
          `Minutes cannot exceed ${maximumValue}`
        )
        .nullable()
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

/*
 * =========================================================
 * Policy validation
 * =========================================================
 */

function validatePolicyThresholds(
  input: {
    minimumFullDayMinutes?:
      | number
      | undefined;

    minimumHalfDayMinutes?:
      | number
      | undefined;

    minimumOvertimeMinutes?:
      | number
      | undefined;

    maximumOvertimeMinutesDay?:
      | number
      | null
      | undefined;

    isDefault?:
      | boolean
      | undefined;

    isActive?:
      | boolean
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.minimumFullDayMinutes !==
      undefined &&
    input.minimumHalfDayMinutes !==
      undefined &&
    input.minimumHalfDayMinutes >
      input.minimumFullDayMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "minimumHalfDayMinutes"
      ],

      message:
        "Minimum half-day minutes cannot exceed minimum full-day minutes"
    });
  }

  if (
    input.minimumOvertimeMinutes !==
      undefined &&
    input.maximumOvertimeMinutesDay !==
      undefined &&
    input.maximumOvertimeMinutesDay !==
      null &&
    input.maximumOvertimeMinutesDay <
      input.minimumOvertimeMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumOvertimeMinutesDay"
      ],

      message:
        "Maximum daily overtime minutes cannot be less than minimum overtime minutes"
    });
  }

  if (
    input.isDefault === true &&
    input.isActive === false
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "isActive"
      ],

      message:
        "An inactive attendance policy cannot be the default policy"
    });
  }
}

/*
 * =========================================================
 * Attendance-policy schemas
 * =========================================================
 */

export const createAttendancePolicyBodySchema =
  z
    .object({
      policyCode:
        codeSchema(50),

      policyName:
        nameSchema(150),

      description:
        nullableTextSchema(5000)
          .optional(),

      lateGraceMinutes:
        minuteSchema()
          .default(0),

      earlyDepartureGraceMinutes:
        minuteSchema()
          .default(0),

      minimumFullDayMinutes:
        positiveMinuteSchema(
          "Minimum full-day minutes"
        )
          .default(480),

      minimumHalfDayMinutes:
        positiveMinuteSchema(
          "Minimum half-day minutes"
        )
          .default(240),

      automaticAbsence:
        booleanSchema
          .default(true),

      allowManualAttendance:
        booleanSchema
          .default(true),

      allowRemoteAttendance:
        booleanSchema
          .default(false),

      overtimeEnabled:
        booleanSchema
          .default(true),

      overtimeAfterMinutes:
        minuteSchema()
          .default(0),

      minimumOvertimeMinutes:
        minuteSchema()
          .default(30),

      maximumOvertimeMinutesDay:
        nullableMinuteSchema()
          .optional(),

      overtimeRequiresApproval:
        booleanSchema
          .default(true),

      deductBreakTime:
        booleanSchema
          .default(true),

      requireCheckout:
        booleanSchema
          .default(true),

      isDefault:
        booleanSchema
          .default(false),

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
        validatePolicyThresholds(
          input,
          context
        );
      }
    );

export const updateAttendancePolicyBodySchema =
  z
    .object({
      policyCode:
        codeSchema(50)
          .optional(),

      policyName:
        nameSchema(150)
          .optional(),

      description:
        nullableTextSchema(5000)
          .optional(),

      lateGraceMinutes:
        minuteSchema()
          .optional(),

      earlyDepartureGraceMinutes:
        minuteSchema()
          .optional(),

      minimumFullDayMinutes:
        positiveMinuteSchema(
          "Minimum full-day minutes"
        )
          .optional(),

      minimumHalfDayMinutes:
        positiveMinuteSchema(
          "Minimum half-day minutes"
        )
          .optional(),

      automaticAbsence:
        booleanSchema
          .optional(),

      allowManualAttendance:
        booleanSchema
          .optional(),

      allowRemoteAttendance:
        booleanSchema
          .optional(),

      overtimeEnabled:
        booleanSchema
          .optional(),

      overtimeAfterMinutes:
        minuteSchema()
          .optional(),

      minimumOvertimeMinutes:
        minuteSchema()
          .optional(),

      maximumOvertimeMinutesDay:
        nullableMinuteSchema()
          .optional(),

      overtimeRequiresApproval:
        booleanSchema
          .optional(),

      deductBreakTime:
        booleanSchema
          .optional(),

      requireCheckout:
        booleanSchema
          .optional(),

      isDefault:
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
              "At least one attendance-policy field is required"
          });
        }

        validatePolicyThresholds(
          input,
          context
        );
      }
    );

export const attendancePolicyListQuerySchema =
  paginationQuerySchema
    .extend({
      isActive:
        booleanSchema
          .optional(),

      isDefault:
        booleanSchema
          .optional(),

      includeInactive:
        booleanSchema
          .default(false),

      search: z
        .string()
        .trim()
        .max(200)
        .optional()
    })
    .strict();

/*
 * =========================================================
 * Attendance-status schemas
 * =========================================================
 */

function validateStatusClassification(
  input: {
    countsAsPresent?:
      | boolean
      | undefined;

    countsAsAbsent?:
      | boolean
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.countsAsPresent === true &&
    input.countsAsAbsent === true
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "countsAsAbsent"
      ],

      message:
        "An attendance status cannot count as both present and absent"
    });
  }
}

export const createAttendanceStatusBodySchema =
  z
    .object({
      statusCode:
        codeSchema(30),

      statusName:
        nameSchema(100),

      description:
        nullableTextSchema(500)
          .optional(),

      countsAsPresent:
        booleanSchema
          .default(false),

      countsAsAbsent:
        booleanSchema
          .default(false),

      isPayable:
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
        validateStatusClassification(
          input,
          context
        );
      }
    );

export const updateAttendanceStatusBodySchema =
  z
    .object({
      statusName:
        nameSchema(100)
          .optional(),

      description:
        nullableTextSchema(500)
          .optional(),

      countsAsPresent:
        booleanSchema
          .optional(),

      countsAsAbsent:
        booleanSchema
          .optional(),

      isPayable:
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
              "At least one attendance-status field is required"
          });
        }

        validateStatusClassification(
          input,
          context
        );
      }
    );

export const attendanceStatusListQuerySchema =
  paginationQuerySchema
    .extend({
      isActive:
        booleanSchema
          .optional(),

      countsAsPresent:
        booleanSchema
          .optional(),

      countsAsAbsent:
        booleanSchema
          .optional(),

      isPayable:
        booleanSchema
          .optional(),

      includeInactive:
        booleanSchema
          .default(false),

      search: z
        .string()
        .trim()
        .max(200)
        .optional()
    })
    .strict();

/*
 * =========================================================
 * Employee policy-assignment schemas
 * =========================================================
 */

function validateEffectiveDates(
  input: {
    effectiveFrom?:
      | string
      | undefined;

    effectiveTo?:
      | string
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.effectiveFrom &&
    input.effectiveTo &&
    input.effectiveTo <
      input.effectiveFrom
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "effectiveTo"
      ],

      message:
        "Effective-to cannot be before effective-from"
    });
  }
}

function validateListDateRange(
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

export const createAttendancePolicyAssignmentBodySchema =
  z
    .object({
      policyId:
        databaseIdSchema,

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isCurrent:
        booleanSchema
          .default(true)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateEffectiveDates(
          input,
          context
        );
      }
    );

export const updateAttendancePolicyAssignmentBodySchema =
  z
    .object({
      policyId:
        databaseIdSchema
          .optional(),

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isCurrent:
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
              "At least one policy-assignment field is required"
          });
        }

        validateEffectiveDates(
          input,
          context
        );
      }
    );

export const attendancePolicyAssignmentListQuerySchema =
  paginationQuerySchema
    .extend({
      policyId:
        databaseIdSchema
          .optional(),

      isCurrent:
        booleanSchema
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
        validateListDateRange(
          input,
          context
        );
      }
    );

export const effectiveAttendancePolicyQuerySchema =
  z
    .object({
      asOfDate:
        dateOnlySchema
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const attendancePolicyParamsSchema =
  z.object({
    policyId:
      databaseIdSchema
  });

const attendanceStatusParamsSchema =
  z.object({
    statusCode:
      codeSchema(30)
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeePolicyAssignmentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    assignmentId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Policy request schemas
 * =========================================================
 */

export const listAttendancePoliciesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendancePolicyListQuerySchema
  });

export const getAttendancePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendancePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createAttendancePolicyRequestSchema =
  z.object({
    body:
      createAttendancePolicyBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateAttendancePolicyRequestSchema =
  z.object({
    body:
      updateAttendancePolicyBodySchema,

    params:
      attendancePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteAttendancePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendancePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Status request schemas
 * =========================================================
 */

export const listAttendanceStatusesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendanceStatusListQuerySchema
  });

export const getAttendanceStatusRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendanceStatusParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createAttendanceStatusRequestSchema =
  z.object({
    body:
      createAttendanceStatusBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateAttendanceStatusRequestSchema =
  z.object({
    body:
      updateAttendanceStatusBodySchema,

    params:
      attendanceStatusParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Employee assignment request schemas
 * =========================================================
 */

export const listAttendancePolicyAssignmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      attendancePolicyAssignmentListQuerySchema
  });

export const createAttendancePolicyAssignmentRequestSchema =
  z.object({
    body:
      createAttendancePolicyAssignmentBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateAttendancePolicyAssignmentRequestSchema =
  z.object({
    body:
      updateAttendancePolicyAssignmentBodySchema,

    params:
      employeePolicyAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteAttendancePolicyAssignmentRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeePolicyAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const getEffectiveAttendancePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      effectiveAttendancePolicyQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateAttendancePolicyInput =
  z.infer<
    typeof createAttendancePolicyBodySchema
  >;

export type UpdateAttendancePolicyInput =
  z.infer<
    typeof updateAttendancePolicyBodySchema
  >;

export type AttendancePolicyListQuery =
  z.infer<
    typeof attendancePolicyListQuerySchema
  >;

export type CreateAttendanceStatusInput =
  z.infer<
    typeof createAttendanceStatusBodySchema
  >;

export type UpdateAttendanceStatusInput =
  z.infer<
    typeof updateAttendanceStatusBodySchema
  >;

export type AttendanceStatusListQuery =
  z.infer<
    typeof attendanceStatusListQuerySchema
  >;

export type CreateAttendancePolicyAssignmentInput =
  z.infer<
    typeof createAttendancePolicyAssignmentBodySchema
  >;

export type UpdateAttendancePolicyAssignmentInput =
  z.infer<
    typeof updateAttendancePolicyAssignmentBodySchema
  >;

export type AttendancePolicyAssignmentListQuery =
  z.infer<
    typeof attendancePolicyAssignmentListQuerySchema
  >;

export type EffectiveAttendancePolicyQuery =
  z.infer<
    typeof effectiveAttendancePolicyQuerySchema
  >;
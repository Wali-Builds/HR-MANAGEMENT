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
 * Date and time helpers
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

  const yearValue =
    Number(parts[0]);

  const monthValue =
    Number(parts[1]);

  const dayValue =
    Number(parts[2]);

  if (
    !Number.isInteger(yearValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(dayValue)
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

function isValidTimeOnly(
  value: string
): boolean {
  const match =
    /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      value
    );

  if (!match) {
    return false;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  const second =
    match[3] === undefined
      ? 0
      : Number(match[3]);

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function normalizeTimeOnly(
  value: string
): string {
  const trimmed =
    value.trim();

  return /^\d{2}:\d{2}$/.test(
    trimmed
  )
    ? `${trimmed}:00`
    : trimmed;
}

function timeToMinutes(
  value: string
): number {
  const normalized =
    normalizeTimeOnly(
      value
    );

  const parts =
    normalized.split(":");

  const hour =
    Number(parts[0]);

  const minute =
    Number(parts[1]);

  return (
    hour * 60
  ) + minute;
}

function calculatePeriodMinutes(
  startTime: string,
  endTime: string,
  crossesMidnight: boolean
): number {
  const startMinutes =
    timeToMinutes(
      startTime
    );

  let endMinutes =
    timeToMinutes(
      endTime
    );

  if (crossesMidnight) {
    if (
      endMinutes <=
      startMinutes
    ) {
      endMinutes += 1440;
    }
  }

  return (
    endMinutes -
    startMinutes
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

const nullableDateOnlySchema =
  z.preprocess(
    blankStringToNull,
    dateOnlySchema.nullable()
  );

const timeOnlySchema = z
  .string()
  .trim()
  .refine(
    isValidTimeOnly,
    "Time must use HH:mm or HH:mm:ss format"
  )
  .transform(
    normalizeTimeOnly
  );

const nullableTimeOnlySchema =
  z.preprocess(
    blankStringToNull,
    timeOnlySchema.nullable()
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

const minuteSchema = (
  maximumValue = 1440
) =>
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(0)
      .max(
        maximumValue
      )
  );

const positiveMinuteSchema =
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        1,
        "Expected work minutes must be greater than zero"
      )
      .max(1440)
  );

const weeklyWorkingHoursSchema =
  z.preprocess(
    blankStringToNull,
    z.preprocess(
      queryNumber,
      z
        .number()
        .min(0)
        .max(168)
        .nullable()
    )
  );

const weeklyWorkingDaysSchema =
  z.preprocess(
    blankStringToNull,
    z.preprocess(
      queryNumber,
      z
        .number()
        .int()
        .min(0)
        .max(7)
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
 * Shared validation
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

function validateWindowPair(
  startTime:
    | string
    | null
    | undefined,

  endTime:
    | string
    | null
    | undefined,

  startPath: string,
  endPath: string,
  context: z.RefinementCtx
): void {
  const hasStart =
    startTime !== undefined &&
    startTime !== null;

  const hasEnd =
    endTime !== undefined &&
    endTime !== null;

  if (hasStart === hasEnd) {
    return;
  }

  context.addIssue({
    code:
      z.ZodIssueCode.custom,

    path: [
      hasStart
        ? endPath
        : startPath
    ],

    message:
      "The start and end of this time window must be provided together"
  });
}

function validateShiftPeriod(
  input: {
    startTime: string;
    endTime: string;

    crossesMidnight: boolean;
    isFlexible: boolean;

    breakMinutes: number;
    expectedWorkMinutes: number;

    checkInStartTime?:
      | string
      | null
      | undefined;

    checkInEndTime?:
      | string
      | null
      | undefined;

    checkOutStartTime?:
      | string
      | null
      | undefined;

    checkOutEndTime?:
      | string
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  const startMinutes =
    timeToMinutes(
      input.startTime
    );

  const endMinutes =
    timeToMinutes(
      input.endTime
    );

  if (
    input.crossesMidnight &&
    endMinutes >
      startMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "crossesMidnight"
      ],

      message:
        "Crosses-midnight must be false when the shift ends later on the same day"
    });
  }

  if (
    !input.crossesMidnight &&
    endMinutes <=
      startMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "crossesMidnight"
      ],

      message:
        "Crosses-midnight must be true when the shift ends on the following day"
    });
  }

  const durationMinutes =
    calculatePeriodMinutes(
      input.startTime,
      input.endTime,
      input.crossesMidnight
    );

  if (
    durationMinutes <= 0 ||
    durationMinutes > 1440
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "endTime"
      ],

      message:
        "Shift duration must be greater than zero and cannot exceed 24 hours"
    });
  }

  if (
    input.breakMinutes >
    durationMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "breakMinutes"
      ],

      message:
        "Break minutes cannot exceed the shift duration"
    });
  }

  const availableWorkMinutes =
    Math.max(
      0,
      durationMinutes -
        input.breakMinutes
    );

  if (
    !input.isFlexible &&
    input.expectedWorkMinutes >
      availableWorkMinutes
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "expectedWorkMinutes"
      ],

      message:
        "Expected work minutes cannot exceed shift duration after break time"
    });
  }

  validateWindowPair(
    input.checkInStartTime,
    input.checkInEndTime,
    "checkInStartTime",
    "checkInEndTime",
    context
  );

  validateWindowPair(
    input.checkOutStartTime,
    input.checkOutEndTime,
    "checkOutStartTime",
    "checkOutEndTime",
    context
  );
}

/*
 * =========================================================
 * Shift schemas
 * =========================================================
 */

export const createShiftBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      shiftCode:
        codeSchema(50),

      shiftName:
        nameSchema(150),

      description:
        nullableTextSchema(5000)
          .optional(),

      startTime:
        timeOnlySchema,

      endTime:
        timeOnlySchema,

      crossesMidnight:
        booleanSchema
          .default(false),

      isFlexible:
        booleanSchema
          .default(false),

      breakMinutes:
        minuteSchema()
          .default(0),

      expectedWorkMinutes:
        positiveMinuteSchema
          .default(480),

      checkInStartTime:
        nullableTimeOnlySchema
          .optional(),

      checkInEndTime:
        nullableTimeOnlySchema
          .optional(),

      checkOutStartTime:
        nullableTimeOnlySchema
          .optional(),

      checkOutEndTime:
        nullableTimeOnlySchema
          .optional(),

      lateGraceMinutes:
        minuteSchema()
          .default(0),

      earlyDepartureGraceMinutes:
        minuteSchema()
          .default(0),

      overtimeAfterMinutes:
        minuteSchema()
          .default(0),

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
        validateShiftPeriod(
          input,
          context
        );
      }
    );

export const updateShiftBodySchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      shiftCode:
        codeSchema(50)
          .optional(),

      shiftName:
        nameSchema(150)
          .optional(),

      description:
        nullableTextSchema(5000)
          .optional(),

      startTime:
        timeOnlySchema
          .optional(),

      endTime:
        timeOnlySchema
          .optional(),

      crossesMidnight:
        booleanSchema
          .optional(),

      isFlexible:
        booleanSchema
          .optional(),

      breakMinutes:
        minuteSchema()
          .optional(),

      expectedWorkMinutes:
        positiveMinuteSchema
          .optional(),

      checkInStartTime:
        nullableTimeOnlySchema
          .optional(),

      checkInEndTime:
        nullableTimeOnlySchema
          .optional(),

      checkOutStartTime:
        nullableTimeOnlySchema
          .optional(),

      checkOutEndTime:
        nullableTimeOnlySchema
          .optional(),

      lateGraceMinutes:
        minuteSchema()
          .optional(),

      earlyDepartureGraceMinutes:
        minuteSchema()
          .optional(),

      overtimeAfterMinutes:
        minuteSchema()
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
              "At least one shift field is required"
          });
        }

        validateWindowPair(
          input.checkInStartTime,
          input.checkInEndTime,
          "checkInStartTime",
          "checkInEndTime",
          context
        );

        validateWindowPair(
          input.checkOutStartTime,
          input.checkOutEndTime,
          "checkOutStartTime",
          "checkOutEndTime",
          context
        );
      }
    );

export const shiftListQuerySchema =
  paginationQuerySchema
    .extend({
      branchId:
        databaseIdSchema
          .optional(),

      isActive:
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
 * Work schedule schemas
 * =========================================================
 */

export const createWorkScheduleBodySchema =
  z
    .object({
      scheduleCode:
        codeSchema(50),

      scheduleName:
        nameSchema(150),

      description:
        nullableTextSchema(5000)
          .optional(),

      weeklyWorkingHours:
        weeklyWorkingHoursSchema
          .optional(),

      weeklyWorkingDays:
        weeklyWorkingDaysSchema
          .optional(),

      isDefault:
        booleanSchema
          .default(false),

      isActive:
        booleanSchema
          .default(true)
    })
    .strict();

export const updateWorkScheduleBodySchema =
  z
    .object({
      scheduleCode:
        codeSchema(50)
          .optional(),

      scheduleName:
        nameSchema(150)
          .optional(),

      description:
        nullableTextSchema(5000)
          .optional(),

      weeklyWorkingHours:
        weeklyWorkingHoursSchema
          .optional(),

      weeklyWorkingDays:
        weeklyWorkingDaysSchema
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
              "At least one work-schedule field is required"
          });
        }
      }
    );

export const workScheduleListQuerySchema =
  paginationQuerySchema
    .extend({
      isActive:
        booleanSchema
          .optional(),

      includeInactive:
        booleanSchema
          .default(false),

      includeDays:
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
 * Work schedule day schemas
 * =========================================================
 */

const workScheduleDaySchema =
  z
    .object({
      dayOfWeek: z
        .preprocess(
          queryNumber,
          z
            .number()
            .int()
            .min(1)
            .max(7)
        ),

      isWorkingDay:
        booleanSchema
          .default(true),

      plannedStartTime:
        nullableTimeOnlySchema,

      plannedEndTime:
        nullableTimeOnlySchema,

      breakMinutes:
        minuteSchema()
          .default(0),

      expectedWorkMinutes:
        minuteSchema()
          .default(0),

      crossesMidnight:
        booleanSchema
          .default(false)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (!input.isWorkingDay) {
          if (
            input.plannedStartTime !==
              null ||
            input.plannedEndTime !==
              null
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              message:
                "A non-working day cannot contain planned start or end times"
            });
          }

          if (
            input.breakMinutes !== 0
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "breakMinutes"
              ],

              message:
                "Break minutes must be zero for a non-working day"
            });
          }

          if (
            input.expectedWorkMinutes !==
            0
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "expectedWorkMinutes"
              ],

              message:
                "Expected work minutes must be zero for a non-working day"
            });
          }

          if (
            input.crossesMidnight
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,

              path: [
                "crossesMidnight"
              ],

              message:
                "A non-working day cannot cross midnight"
            });
          }

          return;
        }

        if (
          input.plannedStartTime ===
            null ||
          input.plannedEndTime ===
            null
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "A working day requires planned start and end times"
          });

          return;
        }

        const startMinutes =
          timeToMinutes(
            input.plannedStartTime
          );

        const endMinutes =
          timeToMinutes(
            input.plannedEndTime
          );

        if (
          input.crossesMidnight &&
          endMinutes >
            startMinutes
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "crossesMidnight"
            ],

            message:
              "Crosses-midnight must be false when the workday ends later on the same day"
          });
        }

        if (
          !input.crossesMidnight &&
          endMinutes <=
            startMinutes
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "crossesMidnight"
            ],

            message:
              "Crosses-midnight must be true when the workday ends on the following day"
          });
        }

        const durationMinutes =
          calculatePeriodMinutes(
            input.plannedStartTime,
            input.plannedEndTime,
            input.crossesMidnight
          );

        if (
          durationMinutes <= 0 ||
          durationMinutes > 1440
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "plannedEndTime"
            ],

            message:
              "Workday duration must be greater than zero and cannot exceed 24 hours"
          });
        }

        if (
          input.breakMinutes >
          durationMinutes
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "breakMinutes"
            ],

            message:
              "Break minutes cannot exceed the workday duration"
          });
        }

        const availableMinutes =
          Math.max(
            0,
            durationMinutes -
              input.breakMinutes
          );

        if (
          input.expectedWorkMinutes <= 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "expectedWorkMinutes"
            ],

            message:
              "Expected work minutes must be greater than zero for a working day"
          });
        }

        if (
          input.expectedWorkMinutes >
          availableMinutes
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "expectedWorkMinutes"
            ],

            message:
              "Expected work minutes cannot exceed workday duration after break time"
          });
        }
      }
    );

export const replaceWorkScheduleDaysBodySchema =
  z
    .object({
      days: z
        .array(
          workScheduleDaySchema
        )
        .length(
          7,
          "Exactly seven schedule days are required"
        )
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        const uniqueDays =
          new Set(
            input.days.map(
              (
                day
              ) => day.dayOfWeek
            )
          );

        if (
          uniqueDays.size !== 7
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "days"
            ],

            message:
              "Each day from Monday through Sunday must appear exactly once"
          });
        }
      }
    );

/*
 * =========================================================
 * Employee shift assignment schemas
 * =========================================================
 */

export const createEmployeeShiftAssignmentBodySchema =
  z
    .object({
      shiftId:
        databaseIdSchema,

      scheduleId:
        nullableDatabaseIdSchema
          .optional(),

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      assignmentType:
        codeSchema(30)
          .default("REGULAR"),

      isCurrent:
        booleanSchema
          .default(true),

      remarks:
        nullableTextSchema(500)
          .optional()
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

export const updateEmployeeShiftAssignmentBodySchema =
  z
    .object({
      shiftId:
        databaseIdSchema
          .optional(),

      scheduleId:
        nullableDatabaseIdSchema
          .optional(),

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      assignmentType:
        codeSchema(30)
          .optional(),

      isCurrent:
        booleanSchema
          .optional(),

      remarks:
        nullableTextSchema(500)
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
              "At least one shift-assignment field is required"
          });
        }

        validateEffectiveDates(
          input,
          context
        );
      }
    );

export const employeeShiftAssignmentListQuerySchema =
  paginationQuerySchema
    .extend({
      shiftId:
        databaseIdSchema
          .optional(),

      scheduleId:
        databaseIdSchema
          .optional(),

      assignmentType:
        codeSchema(30)
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

export const effectiveEmployeeShiftQuerySchema =
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

const shiftParamsSchema =
  z.object({
    shiftId:
      databaseIdSchema
  });

const workScheduleParamsSchema =
  z.object({
    scheduleId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeShiftAssignmentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    shiftAssignmentId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Shift request schemas
 * =========================================================
 */

export const listShiftsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      shiftListQuerySchema
  });

export const getShiftRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      shiftParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createShiftRequestSchema =
  z.object({
    body:
      createShiftBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateShiftRequestSchema =
  z.object({
    body:
      updateShiftBodySchema,

    params:
      shiftParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteShiftRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      shiftParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Work-schedule request schemas
 * =========================================================
 */

export const listWorkSchedulesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      workScheduleListQuerySchema
  });

export const getWorkScheduleRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      workScheduleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createWorkScheduleRequestSchema =
  z.object({
    body:
      createWorkScheduleBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateWorkScheduleRequestSchema =
  z.object({
    body:
      updateWorkScheduleBodySchema,

    params:
      workScheduleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteWorkScheduleRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      workScheduleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listWorkScheduleDaysRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      workScheduleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const replaceWorkScheduleDaysRequestSchema =
  z.object({
    body:
      replaceWorkScheduleDaysBodySchema,

    params:
      workScheduleParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Employee assignment request schemas
 * =========================================================
 */

export const listEmployeeShiftAssignmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeShiftAssignmentListQuerySchema
  });

export const createEmployeeShiftAssignmentRequestSchema =
  z.object({
    body:
      createEmployeeShiftAssignmentBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeShiftAssignmentRequestSchema =
  z.object({
    body:
      updateEmployeeShiftAssignmentBodySchema,

    params:
      employeeShiftAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeShiftAssignmentRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeShiftAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const getEffectiveEmployeeShiftRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      effectiveEmployeeShiftQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateShiftInput =
  z.infer<
    typeof createShiftBodySchema
  >;

export type UpdateShiftInput =
  z.infer<
    typeof updateShiftBodySchema
  >;

export type ShiftListQuery =
  z.infer<
    typeof shiftListQuerySchema
  >;

export type CreateWorkScheduleInput =
  z.infer<
    typeof createWorkScheduleBodySchema
  >;

export type UpdateWorkScheduleInput =
  z.infer<
    typeof updateWorkScheduleBodySchema
  >;

export type WorkScheduleListQuery =
  z.infer<
    typeof workScheduleListQuerySchema
  >;

export type ReplaceWorkScheduleDaysInput =
  z.infer<
    typeof replaceWorkScheduleDaysBodySchema
  >;

export type CreateEmployeeShiftAssignmentInput =
  z.infer<
    typeof createEmployeeShiftAssignmentBodySchema
  >;

export type UpdateEmployeeShiftAssignmentInput =
  z.infer<
    typeof updateEmployeeShiftAssignmentBodySchema
  >;

export type EmployeeShiftAssignmentListQuery =
  z.infer<
    typeof employeeShiftAssignmentListQuerySchema
  >;

export type EffectiveEmployeeShiftQuery =
  z.infer<
    typeof effectiveEmployeeShiftQuerySchema
  >;
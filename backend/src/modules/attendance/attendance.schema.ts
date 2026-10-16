import { isIP } from "node:net";
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

function queryBoolean(
  value: unknown
): unknown {
  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return false;
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
    .replace(/[\s-]+/g, "_");
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
    yearText,
    monthText,
    dayText
  ] = value.split("-");

  if (
    !yearText ||
    !monthText ||
    !dayText
  ) {
    return false;
  }

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  const day =
    Number(dayText);

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

  /*
   * Require an explicit UTC marker or offset.
   * Examples:
   * 2026-07-21T08:30:00Z
   * 2026-07-21T13:30:00+05:00
   */

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

function isValidTimeOnly(
  value: string
): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
    value
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

const dateTimeSchema = z
  .string()
  .trim()
  .refine(
    isValidDateTime,
    "Datetime must be valid ISO-8601 and include Z or a timezone offset"
  );

const nullableDateTimeSchema =
  z.preprocess(
    blankStringToNull,
    dateTimeSchema.nullable()
  );

const timeOnlySchema = z
  .string()
  .trim()
  .refine(
    isValidTimeOnly,
    "Time must use HH:mm or HH:mm:ss format"
  );

const nullableText = (
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

const minuteSchema = z.preprocess(
  queryNumber,
  z
    .number()
    .int()
    .min(
      0,
      "Minutes cannot be negative"
    )
    .max(
      10080,
      "Minute value exceeds the allowed limit"
    )
);

const latitudeSchema = z.preprocess(
  blankStringToNull,
  z.preprocess(
    queryNumber,
    z
      .number()
      .min(-90)
      .max(90)
      .nullable()
  )
);

const longitudeSchema = z.preprocess(
  blankStringToNull,
  z.preprocess(
    queryNumber,
    z
      .number()
      .min(-180)
      .max(180)
      .nullable()
  )
);

const paginationQuerySchema = z.object({
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
const nullableIpAddressSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(
        45,
        "IP address cannot exceed 45 characters"
      )
      .refine(
        (value) =>
          isIP(value) !== 0,
        "IP address must be a valid IPv4 or IPv6 address"
      )
      .nullable()
  );
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

function validateEffectivePeriod(
  input: {
    effectiveFrom?: string | undefined;

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
        "Effective-to date cannot be before effective-from date"
    });
  }
}

function validateCoordinatePair(
  latitude:
    | number
    | null
    | undefined,

  longitude:
    | number
    | null
    | undefined,

  latitudePath: string,
  longitudePath: string,
  context: z.RefinementCtx
): void {
  const hasLatitude =
    latitude !== undefined &&
    latitude !== null;

  const hasLongitude =
    longitude !== undefined &&
    longitude !== null;

  if (
    hasLatitude !== hasLongitude
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: hasLatitude
        ? [longitudePath]
        : [latitudePath],

      message:
        "Latitude and longitude must be provided together"
    });
  }
}

/*
 * =========================================================
 * Attendance lookups
 * =========================================================
 */

export const attendanceLookupQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      employeeId:
        databaseIdSchema
          .optional(),

      includeInactive:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false),

      includeScheduleDays:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false),

      scheduleId:
        databaseIdSchema
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Employee attendance policy assignment
 * =========================================================
 */

export const assignEmployeeAttendancePolicyBodySchema =
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
        z.boolean()
          .default(true)
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateEffectivePeriod(
          input,
          context
        );

        if (
          input.isCurrent &&
          input.effectiveTo !== null &&
          input.effectiveTo !== undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "effectiveTo"
            ],

            message:
              "A current policy assignment cannot have an effective-to date"
          });
        }
      }
    );

export const attendancePolicyAssignmentListQuerySchema =
  z
    .object({
      status: z
        .enum([
          "ALL",
          "CURRENT",
          "HISTORICAL"
        ])
        .default("ALL")
    })
    .strict();

/*
 * =========================================================
 * Attendance device schemas
 * =========================================================
 */

export const createAttendanceDeviceBodySchema =
  z
    .object({
      branchId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      deviceCode:
        codeSchema(80),

      deviceName: z
        .string()
        .trim()
        .min(2)
        .max(150),

      deviceType:
        codeSchema(50),

      manufacturer:
        nullableText(100)
          .optional(),

      modelNumber:
        nullableText(100)
          .optional(),

      serialNumber:
        nullableText(150)
          .optional(),

   ipAddress:
  nullableIpAddressSchema
    .optional(),

      portNumber:
        z.preprocess(
          blankStringToNull,
          z.preprocess(
            queryNumber,
            z
              .number()
              .int()
              .min(1)
              .max(65535)
              .nullable()
          )
        )
        .optional(),

      physicalLocation:
        nullableText(255)
          .optional(),

      syncStatus:
        z.preprocess(
          blankStringToNull,
          codeSchema(30).nullable()
        )
        .optional(),

      isActive:
        z.boolean()
          .default(true)
    })
    .strict();

export const updateAttendanceDeviceBodySchema =
  z
    .object({
      branchId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      deviceCode:
        codeSchema(80)
          .optional(),

      deviceName: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      deviceType:
        codeSchema(50)
          .optional(),

      manufacturer:
        nullableText(100)
          .optional(),

      modelNumber:
        nullableText(100)
          .optional(),

      serialNumber:
        nullableText(150)
          .optional(),

      ipAddress:
  nullableIpAddressSchema
    .optional(),

      portNumber:
        z.preprocess(
          blankStringToNull,
          z.preprocess(
            queryNumber,
            z
              .number()
              .int()
              .min(1)
              .max(65535)
              .nullable()
          )
        )
        .optional(),

      physicalLocation:
        nullableText(255)
          .optional(),

      lastSyncAt:
        nullableDateTimeSchema
          .optional(),

      syncStatus:
        z.preprocess(
          blankStringToNull,
          codeSchema(30).nullable()
        )
        .optional(),

      isActive:
        z.boolean()
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
              "At least one device field is required"
          });
        }
      }
    );

export const attendanceDeviceListQuerySchema =
  paginationQuerySchema
    .extend({
      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      branchId:
        databaseIdSchema
          .optional(),

      deviceType:
        codeSchema(50)
          .optional(),

      syncStatus:
        codeSchema(30)
          .optional(),

      includeInactive:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false)
    })
    .strict();

/*
 * =========================================================
 * Biometric log schemas
 * =========================================================
 */

export const createBiometricLogBodySchema =
  z
    .object({
      deviceId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      employeeId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      externalEmployeeCode:
        nullableText(100)
          .optional(),

      punchTime:
        dateTimeSchema,

      punchType:
        z.preprocess(
          blankStringToNull,
          codeSchema(30).nullable()
        )
        .optional(),

      verificationMethod:
        z.preprocess(
          blankStringToNull,
          codeSchema(50).nullable()
        )
        .optional(),

      latitude:
        latitudeSchema
          .optional(),

      longitude:
        longitudeSchema
          .optional(),

      sourceType:
        codeSchema(30)
          .default(
            "BIOMETRIC"
          ),

      rawPayload:
        z.unknown()
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateCoordinatePair(
          input.latitude,
          input.longitude,
          "latitude",
          "longitude",
          context
        );

        if (
          !input.employeeId &&
          !input.externalEmployeeCode
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "employeeId"
            ],

            message:
              "Employee ID or external employee code is required"
          });
        }
      }
    );

export const biometricLogListQuerySchema =
  paginationQuerySchema
    .extend({
      employeeId:
        databaseIdSchema
          .optional(),

      deviceId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      punchType:
        codeSchema(30)
          .optional(),

      sourceType:
        codeSchema(30)
          .optional(),

      processingStatus: z
        .enum([
          "ALL",
          "PROCESSED",
          "UNPROCESSED",
          "FAILED"
        ])
        .default("ALL")
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

export const processBiometricLogsBodySchema =
  z
    .object({
      biometricLogIds: z
        .array(
          databaseIdSchema
        )
        .min(1)
        .max(1000)
        .optional(),

      maximumRecords: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100),

      retryFailed:
        z.boolean()
          .default(false)
    })
    .strict();

/*
 * =========================================================
 * Attendance record schemas
 * =========================================================
 */

export const createAttendanceRecordBodySchema =
  z
    .object({
      employeeId:
        databaseIdSchema,

      attendanceDate:
        dateOnlySchema,

      shiftId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      scheduleId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      policyId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      scheduledStartAt:
        nullableDateTimeSchema
          .optional(),

      scheduledEndAt:
        nullableDateTimeSchema
          .optional(),

      checkInAt:
        nullableDateTimeSchema
          .optional(),

      checkOutAt:
        nullableDateTimeSchema
          .optional(),

      statusCode:
        codeSchema(30)
          .default("ABSENT"),

      attendanceSource:
        codeSchema(30)
          .default("MANUAL"),

      checkInLocation:
        nullableText(255)
          .optional(),

      checkOutLocation:
        nullableText(255)
          .optional(),

      checkInLatitude:
        latitudeSchema
          .optional(),

      checkInLongitude:
        longitudeSchema
          .optional(),

      checkOutLatitude:
        latitudeSchema
          .optional(),

      checkOutLongitude:
        longitudeSchema
          .optional(),

      notes:
        nullableText(5000)
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        if (
          input.scheduledStartAt &&
          input.scheduledEndAt &&
          Date.parse(
            input.scheduledEndAt
          ) <=
            Date.parse(
              input.scheduledStartAt
            )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "scheduledEndAt"
            ],

            message:
              "Scheduled end must be after scheduled start"
          });
        }

        if (
          input.checkInAt &&
          input.checkOutAt &&
          Date.parse(
            input.checkOutAt
          ) <
            Date.parse(
              input.checkInAt
            )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "checkOutAt"
            ],

            message:
              "Check-out cannot be before check-in"
          });
        }

        validateCoordinatePair(
          input.checkInLatitude,
          input.checkInLongitude,
          "checkInLatitude",
          "checkInLongitude",
          context
        );

        validateCoordinatePair(
          input.checkOutLatitude,
          input.checkOutLongitude,
          "checkOutLatitude",
          "checkOutLongitude",
          context
        );
      }
    );

export const updateAttendanceRecordBodySchema =
  z
    .object({
      shiftId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      scheduleId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      policyId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
        .optional(),

      scheduledStartAt:
        nullableDateTimeSchema
          .optional(),

      scheduledEndAt:
        nullableDateTimeSchema
          .optional(),

      checkInAt:
        nullableDateTimeSchema
          .optional(),

      checkOutAt:
        nullableDateTimeSchema
          .optional(),

      statusCode:
        codeSchema(30)
          .optional(),

      attendanceSource:
        codeSchema(30)
          .optional(),

      checkInLocation:
        nullableText(255)
          .optional(),

      checkOutLocation:
        nullableText(255)
          .optional(),

      checkInLatitude:
        latitudeSchema
          .optional(),

      checkInLongitude:
        longitudeSchema
          .optional(),

      checkOutLatitude:
        latitudeSchema
          .optional(),

      checkOutLongitude:
        longitudeSchema
          .optional(),

      notes:
        nullableText(5000)
          .optional()
    })
    .strict()
    .superRefine(
      (input, context) => {
        if (
          Object.keys(input).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one attendance field is required"
          });
        }

        if (
          input.scheduledStartAt &&
          input.scheduledEndAt &&
          Date.parse(
            input.scheduledEndAt
          ) <=
            Date.parse(
              input.scheduledStartAt
            )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "scheduledEndAt"
            ],

            message:
              "Scheduled end must be after scheduled start"
          });
        }

        if (
          input.checkInAt &&
          input.checkOutAt &&
          Date.parse(
            input.checkOutAt
          ) <
            Date.parse(
              input.checkInAt
            )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "checkOutAt"
            ],

            message:
              "Check-out cannot be before check-in"
          });
        }

        validateCoordinatePair(
          input.checkInLatitude,
          input.checkInLongitude,
          "checkInLatitude",
          "checkInLongitude",
          context
        );

        validateCoordinatePair(
          input.checkOutLatitude,
          input.checkOutLongitude,
          "checkOutLatitude",
          "checkOutLongitude",
          context
        );
      }
    );

export const attendanceRecordListQuerySchema =
  paginationQuerySchema
    .extend({
      employeeId:
        databaseIdSchema
          .optional(),

      branchId:
        databaseIdSchema
          .optional(),

      dateFrom:
        dateOnlySchema
          .optional(),

      dateTo:
        dateOnlySchema
          .optional(),

      statusCode:
        codeSchema(30)
          .optional(),

      shiftId:
        databaseIdSchema
          .optional(),

      scheduleId:
        databaseIdSchema
          .optional(),

      policyId:
        databaseIdSchema
          .optional(),

      attendanceSource:
        codeSchema(30)
          .optional(),

      finalizationStatus: z
        .enum([
          "ALL",
          "FINALIZED",
          "UNFINALIZED"
        ])
        .default("ALL"),

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

export const employeeAttendanceListQuerySchema =
  paginationQuerySchema
    .extend({
      dateFrom:
        dateOnlySchema,

      dateTo:
        dateOnlySchema,

      statusCode:
        codeSchema(30)
          .optional(),

      finalizationStatus: z
        .enum([
          "ALL",
          "FINALIZED",
          "UNFINALIZED"
        ])
        .default("ALL")
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
 * Check-in / check-out
 * =========================================================
 */

export const attendanceCheckInBodySchema =
  z
    .object({
      checkInAt:
        dateTimeSchema
          .optional(),

      attendanceSource:
        codeSchema(30)
          .default("MANUAL"),

      location:
        nullableText(255)
          .optional(),

      latitude:
        latitudeSchema
          .optional(),

      longitude:
        longitudeSchema
          .optional(),

      notes:
        nullableText(2000)
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateCoordinatePair(
          input.latitude,
          input.longitude,
          "latitude",
          "longitude",
          context
        );
      }
    );

export const attendanceCheckOutBodySchema =
  z
    .object({
      checkOutAt:
        dateTimeSchema
          .optional(),

      attendanceSource:
        codeSchema(30)
          .default("MANUAL"),

      location:
        nullableText(255)
          .optional(),

      latitude:
        latitudeSchema
          .optional(),

      longitude:
        longitudeSchema
          .optional(),

      notes:
        nullableText(2000)
          .optional()
    })
    .strict()
    .superRefine(
      (
        input,
        context
      ) => {
        validateCoordinatePair(
          input.latitude,
          input.longitude,
          "latitude",
          "longitude",
          context
        );
      }
    );

export const finalizeAttendanceBodySchema =
  z
    .object({
      notes:
        nullableText(2000)
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Break schemas
 * =========================================================
 */

export const startAttendanceBreakBodySchema =
  z
    .object({
      breakType:
        codeSchema(50)
          .default("GENERAL"),

      breakStartAt:
        dateTimeSchema
          .optional(),

      isPaid:
        z.boolean()
          .default(false),

      sourceType:
        codeSchema(30)
          .default("MANUAL"),

      remarks:
        nullableText(500)
          .optional()
    })
    .strict();

export const endAttendanceBreakBodySchema =
  z
    .object({
      breakEndAt:
        dateTimeSchema
          .optional(),

      remarks:
        nullableText(500)
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Parameters
 * =========================================================
 */

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const attendanceRecordParamsSchema =
  z.object({
    attendanceRecordId:
      databaseIdSchema
  });

const attendanceBreakParamsSchema =
  z.object({
    attendanceRecordId:
      databaseIdSchema,

    attendanceBreakId:
      databaseIdSchema
  });

const attendanceDeviceParamsSchema =
  z.object({
    attendanceDeviceId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const getAttendanceLookupsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendanceLookupQuerySchema
  });

export const listEmployeeAttendancePoliciesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      attendancePolicyAssignmentListQuerySchema
  });

export const assignEmployeeAttendancePolicyRequestSchema =
  z.object({
    body:
      assignEmployeeAttendancePolicyBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listAttendanceDevicesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendanceDeviceListQuerySchema
  });

export const getAttendanceDeviceRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendanceDeviceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createAttendanceDeviceRequestSchema =
  z.object({
    body:
      createAttendanceDeviceBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateAttendanceDeviceRequestSchema =
  z.object({
    body:
      updateAttendanceDeviceBodySchema,

    params:
      attendanceDeviceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createBiometricLogRequestSchema =
  z.object({
    body:
      createBiometricLogBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const listBiometricLogsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      biometricLogListQuerySchema
  });

export const processBiometricLogsRequestSchema =
  z.object({
    body:
      processBiometricLogsBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const listAttendanceRecordsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      attendanceRecordListQuerySchema
  });

export const listEmployeeAttendanceRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeAttendanceListQuerySchema
  });

export const getAttendanceRecordRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createAttendanceRecordRequestSchema =
  z.object({
    body:
      createAttendanceRecordBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateAttendanceRecordRequestSchema =
  z.object({
    body:
      updateAttendanceRecordBodySchema,

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const attendanceCheckInRequestSchema =
  z.object({
    body:
      attendanceCheckInBodySchema,

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const attendanceCheckOutRequestSchema =
  z.object({
    body:
      attendanceCheckOutBodySchema,

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const finalizeAttendanceRequestSchema =
  z.object({
    body:
      finalizeAttendanceBodySchema,

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listAttendanceBreaksRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const startAttendanceBreakRequestSchema =
  z.object({
    body:
      startAttendanceBreakBodySchema,

    params:
      attendanceRecordParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const endAttendanceBreakRequestSchema =
  z.object({
    body:
      endAttendanceBreakBodySchema,

    params:
      attendanceBreakParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type AttendanceLookupQuery =
  z.infer<
    typeof attendanceLookupQuerySchema
  >;

export type AssignEmployeeAttendancePolicyInput =
  z.infer<
    typeof assignEmployeeAttendancePolicyBodySchema
  >;

export type AttendancePolicyAssignmentListQuery =
  z.infer<
    typeof attendancePolicyAssignmentListQuerySchema
  >;

export type CreateAttendanceDeviceInput =
  z.infer<
    typeof createAttendanceDeviceBodySchema
  >;

export type UpdateAttendanceDeviceInput =
  z.infer<
    typeof updateAttendanceDeviceBodySchema
  >;

export type AttendanceDeviceListQuery =
  z.infer<
    typeof attendanceDeviceListQuerySchema
  >;

export type CreateBiometricLogInput =
  z.infer<
    typeof createBiometricLogBodySchema
  >;

export type BiometricLogListQuery =
  z.infer<
    typeof biometricLogListQuerySchema
  >;

export type ProcessBiometricLogsInput =
  z.infer<
    typeof processBiometricLogsBodySchema
  >;

export type CreateAttendanceRecordInput =
  z.infer<
    typeof createAttendanceRecordBodySchema
  >;

export type UpdateAttendanceRecordInput =
  z.infer<
    typeof updateAttendanceRecordBodySchema
  >;

export type AttendanceRecordListQuery =
  z.infer<
    typeof attendanceRecordListQuerySchema
  >;

export type EmployeeAttendanceListQuery =
  z.infer<
    typeof employeeAttendanceListQuerySchema
  >;

export type AttendanceCheckInInput =
  z.infer<
    typeof attendanceCheckInBodySchema
  >;

export type AttendanceCheckOutInput =
  z.infer<
    typeof attendanceCheckOutBodySchema
  >;

export type FinalizeAttendanceInput =
  z.infer<
    typeof finalizeAttendanceBodySchema
  >;

export type StartAttendanceBreakInput =
  z.infer<
    typeof startAttendanceBreakBodySchema
  >;

export type EndAttendanceBreakInput =
  z.infer<
    typeof endAttendanceBreakBodySchema
  >;
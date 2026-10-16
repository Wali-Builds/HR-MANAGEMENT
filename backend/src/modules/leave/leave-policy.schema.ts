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
    Number(parts[0] ?? "0");

  const month =
    Number(parts[1] ?? "0");

  const day =
    Number(parts[2] ?? "0");

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

const nonNegativeIntegerSchema = (
  maximumValue: number,
  fieldName: string
) =>
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        0,
        `${fieldName} cannot be negative`
      )
      .max(
        maximumValue,
        `${fieldName} cannot exceed ${maximumValue}`
      )
  );

const positiveIntegerSchema = (
  maximumValue: number,
  fieldName: string
) =>
  z.preprocess(
    queryNumber,
    z
      .number()
      .int()
      .min(
        1,
        `${fieldName} must be at least 1`
      )
      .max(
        maximumValue,
        `${fieldName} cannot exceed ${maximumValue}`
      )
  );

const decimalUnitsSchema = (
  maximumValue = 100000
) =>
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
        maximumValue,
        `Units cannot exceed ${maximumValue}`
      )
  );

const positiveDecimalUnitsSchema = (
  maximumValue = 100000
) =>
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
        maximumValue,
        `Units cannot exceed ${maximumValue}`
      )
  );

const nullableDecimalUnitsSchema =
  z.preprocess(
    blankStringToNull,
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
          100000,
          "Units cannot exceed 100000"
        )
        .nullable()
    )
  );

const nullablePositiveIntegerSchema = (
  maximumValue: number,
  fieldName: string
) =>
  z.preprocess(
    blankStringToNull,
    z.preprocess(
      queryNumber,
      z
        .number()
        .int()
        .min(
          1,
          `${fieldName} must be at least 1`
        )
        .max(
          maximumValue,
          `${fieldName} cannot exceed ${maximumValue}`
        )
        .nullable()
    )
  );

const unitTypeSchema =
  z.enum([
    "DAYS",
    "HOURS"
  ]);

const displayColorSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        "Display color must be a six-digit hexadecimal color such as #1A73E8"
      )
      .transform(
        (
          value
        ) => value.toUpperCase()
      )
      .nullable()
  );

const accrualMethodSchema =
  codeSchema(30);

const eligibleGenderSchema =
  codeSchema(30);

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
    input.effectiveFrom !==
      undefined &&
    input.effectiveTo !==
      undefined &&
    input.effectiveTo !==
      null &&
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

function validateDefaultPolicy(
  input: {
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
        "An inactive leave policy cannot be the default policy"
    });
  }
}

function validateLeaveRule(
  input: {
    minimumRequestUnits?:
      | number
      | undefined;

    maximumRequestUnits?:
      | number
      | null
      | undefined;

    annualEntitlementUnits?:
      | number
      | undefined;

    maximumCarryForwardUnits?:
      | number
      | null
      | undefined;

    maximumBalanceUnits?:
      | number
      | null
      | undefined;

    carryForwardEnabled?:
      | boolean
      | undefined;

    carryForwardExpiryMonths?:
      | number
      | null
      | undefined;

    allowNegativeBalance?:
      | boolean
      | undefined;

    negativeBalanceLimit?:
      | number
      | undefined;

    encashmentAllowed?:
      | boolean
      | undefined;

    maximumEncashmentUnits?:
      | number
      | null
      | undefined;

    attachmentRequiredAfterUnits?:
      | number
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    input.minimumRequestUnits !==
      undefined &&
    input.maximumRequestUnits !==
      undefined &&
    input.maximumRequestUnits !==
      null &&
    input.maximumRequestUnits <
      input.minimumRequestUnits
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumRequestUnits"
      ],

      message:
        "Maximum request units cannot be less than minimum request units"
    });
  }

  if (
    input.maximumCarryForwardUnits !==
      undefined &&
    input.maximumCarryForwardUnits !==
      null &&
    input.maximumBalanceUnits !==
      undefined &&
    input.maximumBalanceUnits !==
      null &&
    input.maximumCarryForwardUnits >
      input.maximumBalanceUnits
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumCarryForwardUnits"
      ],

      message:
        "Maximum carry-forward units cannot exceed maximum balance units"
    });
  }

  if (
    input.carryForwardEnabled === false &&
    input.maximumCarryForwardUnits !==
      undefined &&
    input.maximumCarryForwardUnits !==
      null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumCarryForwardUnits"
      ],

      message:
        "Maximum carry-forward units must be null when carry forward is disabled"
    });
  }

  if (
    input.carryForwardEnabled === false &&
    input.carryForwardExpiryMonths !==
      undefined &&
    input.carryForwardExpiryMonths !==
      null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "carryForwardExpiryMonths"
      ],

      message:
        "Carry-forward expiry must be null when carry forward is disabled"
    });
  }

  if (
    input.allowNegativeBalance === false &&
    input.negativeBalanceLimit !==
      undefined &&
    input.negativeBalanceLimit !== 0
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "negativeBalanceLimit"
      ],

      message:
        "Negative balance limit must be zero when negative balance is disabled"
    });
  }

  if (
    input.encashmentAllowed === false &&
    input.maximumEncashmentUnits !==
      undefined &&
    input.maximumEncashmentUnits !==
      null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumEncashmentUnits"
      ],

      message:
        "Maximum encashment units must be null when encashment is disabled"
    });
  }

  if (
    input.maximumEncashmentUnits !==
      undefined &&
    input.maximumEncashmentUnits !==
      null &&
    input.maximumBalanceUnits !==
      undefined &&
    input.maximumBalanceUnits !==
      null &&
    input.maximumEncashmentUnits >
      input.maximumBalanceUnits
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "maximumEncashmentUnits"
      ],

      message:
        "Maximum encashment units cannot exceed maximum balance units"
    });
  }

  if (
    input.attachmentRequiredAfterUnits !==
      undefined &&
    input.attachmentRequiredAfterUnits !==
      null &&
    input.maximumRequestUnits !==
      undefined &&
    input.maximumRequestUnits !==
      null &&
    input.attachmentRequiredAfterUnits >
      input.maximumRequestUnits
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "attachmentRequiredAfterUnits"
      ],

      message:
        "Attachment threshold cannot exceed maximum request units"
    });
  }
}

/*
 * =========================================================
 * Leave-type schemas
 * =========================================================
 */

export const createLeaveTypeBodySchema =
  z
    .object({
      leaveTypeCode:
        codeSchema(50),

      leaveTypeName:
        nameSchema(150),

      description:
        nullableTextSchema(5000)
          .optional(),

      unitType:
        unitTypeSchema
          .default("DAYS"),

      isPaid:
        booleanSchema
          .default(true),

      requiresApproval:
        booleanSchema
          .default(true),

      requiresAttachment:
        booleanSchema
          .default(false),

      displayColor:
        displayColorSchema
          .optional(),

      sortOrder:
        nonNegativeIntegerSchema(
          65535,
          "Sort order"
        )
          .default(0),

      isActive:
        booleanSchema
          .default(true)
    })
    .strict();

export const updateLeaveTypeBodySchema =
  z
    .object({
      leaveTypeCode:
        codeSchema(50)
          .optional(),

      leaveTypeName:
        nameSchema(150)
          .optional(),

      description:
        nullableTextSchema(5000)
          .optional(),

      unitType:
        unitTypeSchema
          .optional(),

      isPaid:
        booleanSchema
          .optional(),

      requiresApproval:
        booleanSchema
          .optional(),

      requiresAttachment:
        booleanSchema
          .optional(),

      displayColor:
        displayColorSchema
          .optional(),

      sortOrder:
        nonNegativeIntegerSchema(
          65535,
          "Sort order"
        )
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
              "At least one leave-type field is required"
          });
        }
      }
    );

export const leaveTypeListQuerySchema =
  paginationQuerySchema
    .extend({
      unitType:
        unitTypeSchema
          .optional(),

      isPaid:
        booleanSchema
          .optional(),

      requiresApproval:
        booleanSchema
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
 * Leave-policy schemas
 * =========================================================
 */

export const createLeavePolicyBodySchema =
  z
    .object({
      policyCode:
        codeSchema(50),

      policyName:
        nameSchema(150),

      description:
        nullableTextSchema(5000)
          .optional(),

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

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
        validateDateRange(
          input,
          context
        );

        validateDefaultPolicy(
          input,
          context
        );
      }
    );

export const updateLeavePolicyBodySchema =
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

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
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
              "At least one leave-policy field is required"
          });
        }

        validateDateRange(
          input,
          context
        );

        validateDefaultPolicy(
          input,
          context
        );
      }
    );

export const leavePolicyListQuerySchema =
  paginationQuerySchema
    .extend({
      effectiveOn:
        dateOnlySchema
          .optional(),

      isDefault:
        booleanSchema
          .optional(),

      isActive:
        booleanSchema
          .optional(),

      includeInactive:
        booleanSchema
          .default(false),

      includeRules:
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
 * Leave-policy-rule schemas
 * =========================================================
 */

export const createLeavePolicyRuleBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema,

      annualEntitlementUnits:
        decimalUnitsSchema()
          .default(0),

      accrualMethod:
        accrualMethodSchema
          .default("ANNUAL"),

      accrualUnitsPerPeriod:
        decimalUnitsSchema()
          .default(0),

      accrualStartAfterDays:
        nonNegativeIntegerSchema(
          65535,
          "Accrual start days"
        )
          .default(0),

      prorateEntitlement:
        booleanSchema
          .default(true),

      allowDuringProbation:
        booleanSchema
          .default(false),

      eligibleGender:
        eligibleGenderSchema
          .default("ALL"),

      minimumRequestUnits:
        positiveDecimalUnitsSchema()
          .default(0.5),

      maximumRequestUnits:
        nullableDecimalUnitsSchema
          .optional(),

      minimumNoticeDays:
        nonNegativeIntegerSchema(
          65535,
          "Minimum notice days"
        )
          .default(0),

      maximumAdvanceDays:
        nullablePositiveIntegerSchema(
          65535,
          "Maximum advance days"
        )
          .optional(),

      maximumBackdateDays:
        nonNegativeIntegerSchema(
          65535,
          "Maximum backdate days"
        )
          .default(0),

      allowHalfDay:
        booleanSchema
          .default(true),

      allowHourlyLeave:
        booleanSchema
          .default(false),

      includeWeekends:
        booleanSchema
          .default(false),

      includeHolidays:
        booleanSchema
          .default(false),

      sandwichRuleEnabled:
        booleanSchema
          .default(false),

      carryForwardEnabled:
        booleanSchema
          .default(false),

      maximumCarryForwardUnits:
        nullableDecimalUnitsSchema
          .optional(),

      carryForwardExpiryMonths:
        nullablePositiveIntegerSchema(
          65535,
          "Carry-forward expiry months"
        )
          .optional(),

      maximumBalanceUnits:
        nullableDecimalUnitsSchema
          .optional(),

      allowNegativeBalance:
        booleanSchema
          .default(false),

      negativeBalanceLimit:
        decimalUnitsSchema()
          .default(0),

      attachmentRequiredAfterUnits:
        nullableDecimalUnitsSchema
          .optional(),

      encashmentAllowed:
        booleanSchema
          .default(false),

      maximumEncashmentUnits:
        nullableDecimalUnitsSchema
          .optional(),

      approvalLevelsRequired:
        positiveIntegerSchema(
          20,
          "Approval levels"
        )
          .default(1),

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
        validateLeaveRule(
          input,
          context
        );
      }
    );

export const updateLeavePolicyRuleBodySchema =
  z
    .object({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      annualEntitlementUnits:
        decimalUnitsSchema()
          .optional(),

      accrualMethod:
        accrualMethodSchema
          .optional(),

      accrualUnitsPerPeriod:
        decimalUnitsSchema()
          .optional(),

      accrualStartAfterDays:
        nonNegativeIntegerSchema(
          65535,
          "Accrual start days"
        )
          .optional(),

      prorateEntitlement:
        booleanSchema
          .optional(),

      allowDuringProbation:
        booleanSchema
          .optional(),

      eligibleGender:
        eligibleGenderSchema
          .optional(),

      minimumRequestUnits:
        positiveDecimalUnitsSchema()
          .optional(),

      maximumRequestUnits:
        nullableDecimalUnitsSchema
          .optional(),

      minimumNoticeDays:
        nonNegativeIntegerSchema(
          65535,
          "Minimum notice days"
        )
          .optional(),

      maximumAdvanceDays:
        nullablePositiveIntegerSchema(
          65535,
          "Maximum advance days"
        )
          .optional(),

      maximumBackdateDays:
        nonNegativeIntegerSchema(
          65535,
          "Maximum backdate days"
        )
          .optional(),

      allowHalfDay:
        booleanSchema
          .optional(),

      allowHourlyLeave:
        booleanSchema
          .optional(),

      includeWeekends:
        booleanSchema
          .optional(),

      includeHolidays:
        booleanSchema
          .optional(),

      sandwichRuleEnabled:
        booleanSchema
          .optional(),

      carryForwardEnabled:
        booleanSchema
          .optional(),

      maximumCarryForwardUnits:
        nullableDecimalUnitsSchema
          .optional(),

      carryForwardExpiryMonths:
        nullablePositiveIntegerSchema(
          65535,
          "Carry-forward expiry months"
        )
          .optional(),

      maximumBalanceUnits:
        nullableDecimalUnitsSchema
          .optional(),

      allowNegativeBalance:
        booleanSchema
          .optional(),

      negativeBalanceLimit:
        decimalUnitsSchema()
          .optional(),

      attachmentRequiredAfterUnits:
        nullableDecimalUnitsSchema
          .optional(),

      encashmentAllowed:
        booleanSchema
          .optional(),

      maximumEncashmentUnits:
        nullableDecimalUnitsSchema
          .optional(),

      approvalLevelsRequired:
        positiveIntegerSchema(
          20,
          "Approval levels"
        )
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
              "At least one leave-policy-rule field is required"
          });
        }

        validateLeaveRule(
          input,
          context
        );
      }
    );

export const leavePolicyRuleListQuerySchema =
  paginationQuerySchema
    .extend({
      leaveTypeId:
        databaseIdSchema
          .optional(),

      accrualMethod:
        accrualMethodSchema
          .optional(),

      eligibleGender:
        eligibleGenderSchema
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
 * Employee assignment schemas
 * =========================================================
 */

export const createEmployeeLeavePolicyAssignmentBodySchema =
  z
    .object({
      leavePolicyId:
        databaseIdSchema,

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

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
        validateDateRange(
          input,
          context
        );
      }
    );

export const updateEmployeeLeavePolicyAssignmentBodySchema =
  z
    .object({
      leavePolicyId:
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
              "At least one leave-policy-assignment field is required"
          });
        }

        validateDateRange(
          input,
          context
        );
      }
    );

export const employeeLeavePolicyAssignmentListQuerySchema =
  paginationQuerySchema
    .extend({
      leavePolicyId:
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
    );

export const effectiveEmployeeLeavePolicyQuerySchema =
  z
    .object({
      asOfDate:
        dateOnlySchema
          .optional(),

      includeInactiveRules:
        booleanSchema
          .default(false)
    })
    .strict();

/*
 * =========================================================
 * Parameter schemas
 * =========================================================
 */

const leaveTypeParamsSchema =
  z.object({
    leaveTypeId:
      databaseIdSchema
  });

const leavePolicyParamsSchema =
  z.object({
    leavePolicyId:
      databaseIdSchema
  });

const leavePolicyRuleParamsSchema =
  z.object({
    leavePolicyId:
      databaseIdSchema,

    leavePolicyRuleId:
      databaseIdSchema
  });

const employeeParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeAssignmentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    assignmentId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Leave-type request schemas
 * =========================================================
 */

export const listLeaveTypesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leaveTypeListQuerySchema
  });

export const getLeaveTypeRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveTypeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeaveTypeRequestSchema =
  z.object({
    body:
      createLeaveTypeBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateLeaveTypeRequestSchema =
  z.object({
    body:
      updateLeaveTypeBodySchema,

    params:
      leaveTypeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeaveTypeRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leaveTypeParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Leave-policy request schemas
 * =========================================================
 */

export const listLeavePoliciesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      z.object({}).passthrough(),

    query:
      leavePolicyListQuerySchema
  });

export const getLeavePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeavePolicyRequestSchema =
  z.object({
    body:
      createLeavePolicyBodySchema,

    params:
      z.object({}).passthrough(),

    query:
      z.object({}).passthrough()
  });

export const updateLeavePolicyRequestSchema =
  z.object({
    body:
      updateLeavePolicyBodySchema,

    params:
      leavePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeavePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Leave-policy-rule request schemas
 * =========================================================
 */

export const listLeavePolicyRulesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePolicyParamsSchema,

    query:
      leavePolicyRuleListQuerySchema
  });

export const getLeavePolicyRuleRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePolicyRuleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createLeavePolicyRuleRequestSchema =
  z.object({
    body:
      createLeavePolicyRuleBodySchema,

    params:
      leavePolicyParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateLeavePolicyRuleRequestSchema =
  z.object({
    body:
      updateLeavePolicyRuleBodySchema,

    params:
      leavePolicyRuleParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteLeavePolicyRuleRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      leavePolicyRuleParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Employee assignment request schemas
 * =========================================================
 */

export const listEmployeeLeavePolicyAssignmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      employeeLeavePolicyAssignmentListQuerySchema
  });

export const createEmployeeLeavePolicyAssignmentRequestSchema =
  z.object({
    body:
      createEmployeeLeavePolicyAssignmentBodySchema,

    params:
      employeeParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeLeavePolicyAssignmentRequestSchema =
  z.object({
    body:
      updateEmployeeLeavePolicyAssignmentBodySchema,

    params:
      employeeAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeLeavePolicyAssignmentRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const getEffectiveEmployeeLeavePolicyRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeParamsSchema,

    query:
      effectiveEmployeeLeavePolicyQuerySchema
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateLeaveTypeInput =
  z.infer<
    typeof createLeaveTypeBodySchema
  >;

export type UpdateLeaveTypeInput =
  z.infer<
    typeof updateLeaveTypeBodySchema
  >;

export type LeaveTypeListQuery =
  z.infer<
    typeof leaveTypeListQuerySchema
  >;

export type CreateLeavePolicyInput =
  z.infer<
    typeof createLeavePolicyBodySchema
  >;

export type UpdateLeavePolicyInput =
  z.infer<
    typeof updateLeavePolicyBodySchema
  >;

export type LeavePolicyListQuery =
  z.infer<
    typeof leavePolicyListQuerySchema
  >;

export type CreateLeavePolicyRuleInput =
  z.infer<
    typeof createLeavePolicyRuleBodySchema
  >;

export type UpdateLeavePolicyRuleInput =
  z.infer<
    typeof updateLeavePolicyRuleBodySchema
  >;

export type LeavePolicyRuleListQuery =
  z.infer<
    typeof leavePolicyRuleListQuerySchema
  >;

export type CreateEmployeeLeavePolicyAssignmentInput =
  z.infer<
    typeof createEmployeeLeavePolicyAssignmentBodySchema
  >;

export type UpdateEmployeeLeavePolicyAssignmentInput =
  z.infer<
    typeof updateEmployeeLeavePolicyAssignmentBodySchema
  >;

export type EmployeeLeavePolicyAssignmentListQuery =
  z.infer<
    typeof employeeLeavePolicyAssignmentListQuerySchema
  >;

export type EffectiveEmployeeLeavePolicyQuery =
  z.infer<
    typeof effectiveEmployeeLeavePolicyQuerySchema
  >;
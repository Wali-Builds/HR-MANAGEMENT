import { z } from "zod";

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

function numericStringToNumber(
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

  const yearText =
    parts[0];

  const monthText =
    parts[1];

  const dayText =
    parts[2];

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

function normalizeCode(
  value: string
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

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
      2,
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

const currencyCodeSchema = z
  .string()
  .trim()
  .length(
    3,
    "Currency code must contain exactly 3 letters"
  )
  .regex(
    /^[A-Za-z]{3}$/,
    "Currency code must contain letters only"
  )
  .transform(
    (value) =>
      value.toUpperCase()
  );

const moneySchema =
  z.preprocess(
    numericStringToNumber,
    z
      .number()
      .finite(
        "Amount must be a finite number"
      )
      .min(
        0,
        "Amount cannot be negative"
      )
      .max(
        9999999999999.99,
        "Amount exceeds the database limit"
      )
  );

const nullableMoneySchema =
  z.preprocess(
    blankStringToNull,
    moneySchema.nullable()
  );

const percentageSchema =
  z.preprocess(
    numericStringToNumber,
    z
      .number()
      .finite(
        "Percentage must be a finite number"
      )
      .min(
        0,
        "Percentage cannot be negative"
      )
      .max(
        9999.9999,
        "Percentage exceeds the database limit"
      )
  );

const nullablePercentageSchema =
  z.preprocess(
    blankStringToNull,
    percentageSchema.nullable()
  );

const calculationTypeSchema =
  z.enum([
    "FIXED",
    "PERCENTAGE",
    "FORMULA"
  ]);

function validateEffectivePeriod(
  data: {
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
    data.effectiveFrom &&
    data.effectiveTo &&
    data.effectiveTo <
      data.effectiveFrom
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

function validateCurrentAssignment(
  data: {
    effectiveTo?:
      | string
      | null
      | undefined;

    isCurrent?:
      | boolean
      | undefined;

    assignmentStatus?:
      | string
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    data.isCurrent === true &&
    data.effectiveTo !== null &&
    data.effectiveTo !== undefined
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "effectiveTo"
      ],

      message:
        "A current salary assignment cannot have an effective-to date"
    });
  }

  if (
    data.isCurrent === true &&
    (
      data.assignmentStatus ===
        "CLOSED" ||
      data.assignmentStatus ===
        "INACTIVE" ||
      data.assignmentStatus ===
        "CANCELLED"
    )
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "assignmentStatus"
      ],

      message:
        "A current salary assignment must have an active status"
    });
  }
}

function validateSalaryValues(
  data: {
    basicSalary?:
      | number
      | undefined;

    referenceGrossSalary?:
      | number
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    data.basicSalary !== undefined &&
    data.referenceGrossSalary !==
      undefined &&
    data.referenceGrossSalary !==
      null &&
    data.referenceGrossSalary <
      data.basicSalary
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "referenceGrossSalary"
      ],

      message:
        "Reference gross salary cannot be lower than basic salary"
    });
  }
}

function validateCompleteComponentConfiguration(
  data: {
    payComponentId: string;

    baseComponentId?:
      | string
      | null
      | undefined;

    calculationType:
      | "FIXED"
      | "PERCENTAGE"
      | "FORMULA";

    fixedAmount?:
      | number
      | null
      | undefined;

    percentageValue?:
      | number
      | null
      | undefined;

    formulaExpression?:
      | string
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    data.baseComponentId &&
    data.baseComponentId ===
      data.payComponentId
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "baseComponentId"
      ],

      message:
        "A salary component cannot use itself as its base component"
    });
  }

  if (
    data.calculationType ===
    "FIXED"
  ) {
    if (
      data.fixedAmount === null ||
      data.fixedAmount === undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "fixedAmount"
        ],

        message:
          "Fixed amount is required for a FIXED component"
      });
    }

    if (
      data.percentageValue !== null &&
      data.percentageValue !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "percentageValue"
        ],

        message:
          "Percentage value is not allowed for a FIXED component"
      });
    }

    if (
      data.formulaExpression !== null &&
      data.formulaExpression !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "formulaExpression"
        ],

        message:
          "Formula expression is not allowed for a FIXED component"
      });
    }
  }

  if (
    data.calculationType ===
    "PERCENTAGE"
  ) {
    if (
      data.percentageValue === null ||
      data.percentageValue ===
        undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "percentageValue"
        ],

        message:
          "Percentage value is required for a PERCENTAGE component"
      });
    }

    if (
      data.baseComponentId === null ||
      data.baseComponentId ===
        undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "baseComponentId"
        ],

        message:
          "Base component is required for a PERCENTAGE component"
      });
    }

    if (
      data.fixedAmount !== null &&
      data.fixedAmount !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "fixedAmount"
        ],

        message:
          "Fixed amount is not allowed for a PERCENTAGE component"
      });
    }

    if (
      data.formulaExpression !== null &&
      data.formulaExpression !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "formulaExpression"
        ],

        message:
          "Formula expression is not allowed for a PERCENTAGE component"
      });
    }
  }

  if (
    data.calculationType ===
    "FORMULA"
  ) {
    if (
      data.formulaExpression === null ||
      data.formulaExpression ===
        undefined ||
      data.formulaExpression.trim() ===
        ""
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "formulaExpression"
        ],

        message:
          "Formula expression is required for a FORMULA component"
      });
    }

    if (
      data.fixedAmount !== null &&
      data.fixedAmount !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "fixedAmount"
        ],

        message:
          "Fixed amount is not allowed for a FORMULA component"
      });
    }

    if (
      data.percentageValue !== null &&
      data.percentageValue !== undefined
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,

        path: [
          "percentageValue"
        ],

        message:
          "Percentage value is not allowed for a FORMULA component"
      });
    }
  }
}

/*
 * =========================================================
 * Salary assignment bodies
 * =========================================================
 */

export const createSalaryAssignmentBodySchema =
  z
    .object({
      salaryStructureId:
        databaseIdSchema,

      payGradeId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      bankAccountId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      payrollFrequency:
        codeSchema(30)
          .optional(),

      paymentMethod:
        codeSchema(30)
          .default(
            "BANK_TRANSFER"
          ),

      currencyCode:
        currencyCodeSchema
          .optional(),

      basicSalary:
        moneySchema,

      referenceGrossSalary:
        nullableMoneySchema
          .optional(),

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      assignmentStatus:
        codeSchema(30)
          .default(
            "ACTIVE"
          ),

      isCurrent:
        z.boolean()
          .default(true),

      remarks:
        nullableText(2000)
          .optional()
    })
    .strict()
    .superRefine(
      (data, context) => {
        validateEffectivePeriod(
          data,
          context
        );

        validateCurrentAssignment(
          data,
          context
        );

        validateSalaryValues(
          data,
          context
        );
      }
    );

export const updateSalaryAssignmentBodySchema =
  z
    .object({
      salaryStructureId:
        databaseIdSchema
          .optional(),

      payGradeId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      bankAccountId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      payrollFrequency:
        codeSchema(30)
          .optional(),

      paymentMethod:
        codeSchema(30)
          .optional(),

      currencyCode:
        currencyCodeSchema
          .optional(),

      basicSalary:
        moneySchema
          .optional(),

      referenceGrossSalary:
        nullableMoneySchema
          .optional(),

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      assignmentStatus:
        codeSchema(30)
          .optional(),

      isCurrent:
        z.boolean()
          .optional(),

      remarks:
        nullableText(2000)
          .optional()
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one salary-assignment field is required"
          });
        }

        validateEffectivePeriod(
          data,
          context
        );

        validateCurrentAssignment(
          data,
          context
        );

        validateSalaryValues(
          data,
          context
        );
      }
    );

export const closeSalaryAssignmentBodySchema =
  z
    .object({
      effectiveTo:
        dateOnlySchema,

      assignmentStatus:
        codeSchema(30)
          .default(
            "CLOSED"
          )
    })
    .strict();

export const approveSalaryAssignmentBodySchema =
  z
    .object({})
    .strict();

/*
 * =========================================================
 * Employee salary component bodies
 * =========================================================
 */

export const createEmployeeSalaryComponentBodySchema =
  z
    .object({
      payComponentId:
        databaseIdSchema,

      baseComponentId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      calculationType:
        calculationTypeSchema,

      fixedAmount:
        nullableMoneySchema
          .optional(),

      percentageValue:
        nullablePercentageSchema
          .optional(),

      formulaExpression:
        nullableText(2000)
          .optional(),

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isActive:
        z.boolean()
          .default(true)
    })
    .strict()
    .superRefine(
      (data, context) => {
        validateEffectivePeriod(
          data,
          context
        );

        validateCompleteComponentConfiguration(
          data,
          context
        );

        if (
          data.isActive &&
          data.effectiveTo !== null &&
          data.effectiveTo !== undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "effectiveTo"
            ],

            message:
              "An active salary component cannot have an effective-to date"
          });
        }
      }
    );

export const updateEmployeeSalaryComponentBodySchema =
  z
    .object({
      payComponentId:
        databaseIdSchema
          .optional(),

      baseComponentId:
        z.preprocess(
          blankStringToNull,
          databaseIdSchema.nullable()
        )
          .optional(),

      calculationType:
        calculationTypeSchema
          .optional(),

      fixedAmount:
        nullableMoneySchema
          .optional(),

      percentageValue:
        nullablePercentageSchema
          .optional(),

      formulaExpression:
        nullableText(2000)
          .optional(),

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isActive:
        z.boolean()
          .optional()
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one salary-component field is required"
          });
        }

        validateEffectivePeriod(
          data,
          context
        );

        if (
          data.isActive === true &&
          data.effectiveTo !== null &&
          data.effectiveTo !== undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "effectiveTo"
            ],

            message:
              "An active salary component cannot have an effective-to date"
          });
        }
      }
    );

export const closeEmployeeSalaryComponentBodySchema =
  z
    .object({
      effectiveTo:
        dateOnlySchema
    })
    .strict();

/*
 * =========================================================
 * Parameters
 * =========================================================
 */

const employeeIdParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const salaryAssignmentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    salaryAssignmentId:
      databaseIdSchema
  });

const employeeSalaryComponentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    salaryAssignmentId:
      databaseIdSchema,

    employeeSalaryComponentId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Query schemas
 * =========================================================
 */

export const compensationLookupQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(
          200,
          "Search cannot exceed 200 characters"
        )
        .optional(),

      salaryStructureId:
        databaseIdSchema
          .optional(),

      includeInactive:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false)
    })
    .strict();

export const salaryAssignmentListQuerySchema =
  z
    .object({
      status: z
        .enum([
          "ALL",
          "CURRENT",
          "HISTORICAL"
        ])
        .default("ALL"),

      assignmentStatus:
        codeSchema(30)
          .optional(),

      salaryStructureId:
        databaseIdSchema
          .optional(),

      payGradeId:
        databaseIdSchema
          .optional()
    })
    .strict();

export const employeeSalaryComponentListQuerySchema =
  z
    .object({
      includeInactive:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false),

      payComponentId:
        databaseIdSchema
          .optional(),

      calculationType:
        calculationTypeSchema
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const getCompensationLookupsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      compensationLookupQuerySchema
  });

export const listSalaryAssignmentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      salaryAssignmentListQuerySchema
  });

export const getSalaryAssignmentRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      salaryAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createSalaryAssignmentRequestSchema =
  z.object({
    body:
      createSalaryAssignmentBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateSalaryAssignmentRequestSchema =
  z.object({
    body:
      updateSalaryAssignmentBodySchema,

    params:
      salaryAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const closeSalaryAssignmentRequestSchema =
  z.object({
    body:
      closeSalaryAssignmentBodySchema,

    params:
      salaryAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const approveSalaryAssignmentRequestSchema =
  z.object({
    body:
      approveSalaryAssignmentBodySchema,

    params:
      salaryAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeSalaryComponentsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      salaryAssignmentParamsSchema,

    query:
      employeeSalaryComponentListQuerySchema
  });

export const createEmployeeSalaryComponentRequestSchema =
  z.object({
    body:
      createEmployeeSalaryComponentBodySchema,

    params:
      salaryAssignmentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeSalaryComponentRequestSchema =
  z.object({
    body:
      updateEmployeeSalaryComponentBodySchema,

    params:
      employeeSalaryComponentParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const closeEmployeeSalaryComponentRequestSchema =
  z.object({
    body:
      closeEmployeeSalaryComponentBodySchema,

    params:
      employeeSalaryComponentParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateSalaryAssignmentInput =
  z.infer<
    typeof createSalaryAssignmentBodySchema
  >;

export type UpdateSalaryAssignmentInput =
  z.infer<
    typeof updateSalaryAssignmentBodySchema
  >;

export type CloseSalaryAssignmentInput =
  z.infer<
    typeof closeSalaryAssignmentBodySchema
  >;

export type CreateEmployeeSalaryComponentInput =
  z.infer<
    typeof createEmployeeSalaryComponentBodySchema
  >;

export type UpdateEmployeeSalaryComponentInput =
  z.infer<
    typeof updateEmployeeSalaryComponentBodySchema
  >;

export type CloseEmployeeSalaryComponentInput =
  z.infer<
    typeof closeEmployeeSalaryComponentBodySchema
  >;

export type CompensationLookupQuery =
  z.infer<
    typeof compensationLookupQuerySchema
  >;

export type SalaryAssignmentListQuery =
  z.infer<
    typeof salaryAssignmentListQuerySchema
  >;

export type EmployeeSalaryComponentListQuery =
  z.infer<
    typeof employeeSalaryComponentListQuerySchema
  >;
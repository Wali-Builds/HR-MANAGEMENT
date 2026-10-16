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

function normalizeAccountIdentifier(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeIban(
  value: string
): string {
  return value
    .trim()
    .replace(/[\s-]+/g, "")
    .toUpperCase();
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

const accountNumberSchema = z
  .string()
  .trim()
  .min(
    4,
    "Account number must contain at least 4 characters"
  )
  .max(
    200,
    "Account number is too long"
  )
  .regex(
    /^[A-Za-z0-9./_\-\s]+$/,
    "Account number contains invalid characters"
  )
  .transform(
    normalizeAccountIdentifier
  );

const ibanSchema = z
  .string()
  .trim()
  .transform(
    normalizeIban
  )
  .refine(
    (value) =>
      /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(
        value
      ),
    "IBAN must contain 15 to 34 valid alphanumeric characters"
  );

const nullableIbanSchema =
  z.preprocess(
    blankStringToNull,
    ibanSchema.nullable()
  );

const paymentPrioritySchema =
  z.preprocess(
    numericStringToNumber,
    z
      .number()
      .int(
        "Payment priority must be an integer"
      )
      .min(
        1,
        "Payment priority must be at least 1"
      )
      .max(
        65535,
        "Payment priority exceeds the database limit"
      )
  );

const moneySchema =
  z.preprocess(
    numericStringToNumber,
    z
      .number()
      .finite()
      .min(
        0,
        "Amount cannot be negative"
      )
      .max(
        9999999999999.99,
        "Amount exceeds the database limit"
      )
  );

function validateEffectiveDates(
  data: {
    effectiveFrom?:
      | string
      | undefined;

    effectiveTo?:
      | string
      | null
      | undefined;

    isCurrent?:
      | boolean
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
        "A current tax profile cannot have an effective-to date"
    });
  }
}

/*
 * =========================================================
 * Bank account bodies
 * =========================================================
 */

export const createEmployeeBankAccountBodySchema =
  z
    .object({
      bankName: z
        .string()
        .trim()
        .min(
          2,
          "Bank name is required"
        )
        .max(150),

      bankCode:
        nullableText(50)
          .optional(),

      branchName:
        nullableText(150)
          .optional(),

      branchCode:
        nullableText(50)
          .optional(),

      accountTitle: z
        .string()
        .trim()
        .min(
          2,
          "Account title is required"
        )
        .max(150),

      accountNumber:
        accountNumberSchema,

      iban:
        nullableIbanSchema
          .optional(),

      accountType:
        codeSchema(30)
          .default(
            "CURRENT"
          ),

      currencyCode:
        currencyCodeSchema
          .default(
            "PKR"
          ),

      paymentPriority:
        paymentPrioritySchema
          .default(1),

      isPrimary: z
        .boolean()
        .default(false),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict();

export const updateEmployeeBankAccountBodySchema =
  z
    .object({
      bankName: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      bankCode:
        nullableText(50)
          .optional(),

      branchName:
        nullableText(150)
          .optional(),

      branchCode:
        nullableText(50)
          .optional(),

      accountTitle: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      accountNumber:
        accountNumberSchema
          .optional(),

      iban:
        nullableIbanSchema
          .optional(),

      accountType:
        codeSchema(30)
          .optional(),

      currencyCode:
        currencyCodeSchema
          .optional(),

      paymentPriority:
        paymentPrioritySchema
          .optional(),

      isPrimary: z
        .boolean()
        .optional(),

      isActive: z
        .boolean()
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
              "At least one bank-account field is required"
          });
        }
      }
    );

/*
 * =========================================================
 * Tax profile bodies
 * =========================================================
 */

export const createEmployeeTaxProfileBodySchema =
  z
    .object({
      taxRuleId:
        databaseIdSchema,

      taxIdentifier:
        nullableText(100)
          .optional(),

      taxpayerStatus:
        codeSchema(40)
          .default(
            "FILER"
          ),

      annualTaxCredit:
        moneySchema
          .default(0),

      annualTaxExemption:
        moneySchema
          .default(0),

      additionalTaxAmount:
        moneySchema
          .default(0),

      effectiveFrom:
        dateOnlySchema,

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isCurrent: z
        .boolean()
        .default(true)
    })
    .strict()
    .superRefine(
      validateEffectiveDates
    );

export const updateEmployeeTaxProfileBodySchema =
  z
    .object({
      taxRuleId:
        databaseIdSchema
          .optional(),

      taxIdentifier:
        nullableText(100)
          .optional(),

      taxpayerStatus:
        codeSchema(40)
          .optional(),

      annualTaxCredit:
        moneySchema
          .optional(),

      annualTaxExemption:
        moneySchema
          .optional(),

      additionalTaxAmount:
        moneySchema
          .optional(),

      effectiveFrom:
        dateOnlySchema
          .optional(),

      effectiveTo:
        nullableDateOnlySchema
          .optional(),

      isCurrent: z
        .boolean()
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
              "At least one tax-profile field is required"
          });
        }

        validateEffectiveDates(
          data,
          context
        );
      }
    );

export const closeEmployeeTaxProfileBodySchema =
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

const employeeBankAccountParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    bankAccountId:
      databaseIdSchema
  });

const employeeTaxProfileParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    taxProfileId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Queries
 * =========================================================
 */

export const employeeFinanceLookupQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      includeInactiveTaxRules:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false)
    })
    .strict();

export const employeeBankAccountListQuerySchema =
  z
    .object({
      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      includeInactive:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false),

      primaryOnly:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false),

      verifiedOnly:
        z.preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false)
    })
    .strict();

export const employeeTaxProfileListQuerySchema =
  z
    .object({
      status: z
        .enum([
          "ALL",
          "CURRENT",
          "HISTORICAL"
        ])
        .default("ALL"),

      taxRuleId:
        databaseIdSchema
          .optional()
    })
    .strict();

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const getEmployeeFinanceLookupsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      employeeFinanceLookupQuerySchema
  });

export const listEmployeeBankAccountsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      employeeBankAccountListQuerySchema
  });

export const getEmployeeBankAccountRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeBankAccountParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createEmployeeBankAccountRequestSchema =
  z.object({
    body:
      createEmployeeBankAccountBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeBankAccountRequestSchema =
  z.object({
    body:
      updateEmployeeBankAccountBodySchema,

    params:
      employeeBankAccountParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeBankAccountRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeBankAccountParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeTaxProfilesRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      employeeTaxProfileListQuerySchema
  });

export const getEmployeeTaxProfileRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeTaxProfileParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createEmployeeTaxProfileRequestSchema =
  z.object({
    body:
      createEmployeeTaxProfileBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeTaxProfileRequestSchema =
  z.object({
    body:
      updateEmployeeTaxProfileBodySchema,

    params:
      employeeTaxProfileParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const closeEmployeeTaxProfileRequestSchema =
  z.object({
    body:
      closeEmployeeTaxProfileBodySchema,

    params:
      employeeTaxProfileParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred types
 * =========================================================
 */

export type CreateEmployeeBankAccountInput =
  z.infer<
    typeof createEmployeeBankAccountBodySchema
  >;

export type UpdateEmployeeBankAccountInput =
  z.infer<
    typeof updateEmployeeBankAccountBodySchema
  >;

export type CreateEmployeeTaxProfileInput =
  z.infer<
    typeof createEmployeeTaxProfileBodySchema
  >;

export type UpdateEmployeeTaxProfileInput =
  z.infer<
    typeof updateEmployeeTaxProfileBodySchema
  >;

export type CloseEmployeeTaxProfileInput =
  z.infer<
    typeof closeEmployeeTaxProfileBodySchema
  >;

export type EmployeeFinanceLookupQuery =
  z.infer<
    typeof employeeFinanceLookupQuerySchema
  >;

export type EmployeeBankAccountListQuery =
  z.infer<
    typeof employeeBankAccountListQuerySchema
  >;

export type EmployeeTaxProfileListQuery =
  z.infer<
    typeof employeeTaxProfileListQuerySchema
  >;
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

function bodyBoolean(
  value: unknown
): unknown {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === "on"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0" ||
    value === "off"
  ) {
    return false;
  }

  return value;
}

function queryBoolean(
  value: unknown
): unknown {
  return bodyBoolean(value);
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
  ] =
    value.split("-");

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

function normalizeDocumentCategory(
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

const documentCategorySchema = z
  .string()
  .trim()
  .min(
    2,
    "Document category is required"
  )
  .max(
    80,
    "Document category cannot exceed 80 characters"
  )
  .regex(
    /^[A-Za-z0-9 _-]+$/,
    "Document category contains invalid characters"
  )
  .transform(
    normalizeDocumentCategory
  );

function validateDocumentDates(
  data: {
    issueDate?:
      | string
      | null
      | undefined;

    expiryDate?:
      | string
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    data.issueDate &&
    data.expiryDate &&
    data.expiryDate <
      data.issueDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "expiryDate"
      ],

      message:
        "Document expiry date cannot be before the issue date"
    });
  }
}

export const createEmployeeDocumentBodySchema =
  z
    .object({
      documentCategory:
        documentCategorySchema,

      documentTitle:
        nullableText(200)
          .optional(),

      documentNumber:
        nullableText(100)
          .optional(),

      issueDate:
        nullableDateOnlySchema
          .optional(),

      expiryDate:
        nullableDateOnlySchema
          .optional(),

      isConfidential: z
        .preprocess(
          bodyBoolean,
          z.boolean()
        )
        .default(true)
    })
    .strict()
    .superRefine(
      validateDocumentDates
    );

export const updateEmployeeDocumentBodySchema =
  z
    .object({
      documentCategory:
        documentCategorySchema
          .optional(),

      documentTitle:
        nullableText(200)
          .optional(),

      documentNumber:
        nullableText(100)
          .optional(),

      issueDate:
        nullableDateOnlySchema
          .optional(),

      expiryDate:
        nullableDateOnlySchema
          .optional(),

      isConfidential: z
        .preprocess(
          bodyBoolean,
          z.boolean()
        )
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
              "At least one employee-document field is required"
          });
        }

        validateDocumentDates(
          data,
          context
        );
      }
    );

const employeeIdParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeDocumentParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    documentId:
      databaseIdSchema
  });

export const employeeDocumentListQuerySchema =
  z
    .object({
      category:
        documentCategorySchema
          .optional(),

      search: z
        .string()
        .trim()
        .max(
          200,
          "Search cannot exceed 200 characters"
        )
        .optional(),

      expiryStatus: z
        .enum([
          "ALL",
          "VALID",
          "EXPIRED",
          "NO_EXPIRY"
        ])
        .default("ALL"),

      confidentialOnly: z
        .preprocess(
          queryBoolean,
          z.boolean()
        )
        .default(false)
    })
    .strict();

const emptyObjectSchema =
  z
    .object({})
    .passthrough()
    .default({});

export const listEmployeeDocumentsRequestSchema =
  z.object({
    body:
      emptyObjectSchema,

    params:
      employeeIdParamsSchema,

    query:
      employeeDocumentListQuerySchema
  });

export const getEmployeeDocumentRequestSchema =
  z.object({
    body:
      emptyObjectSchema,

    params:
      employeeDocumentParamsSchema,

    query:
      emptyObjectSchema
  });

export const createEmployeeDocumentRequestSchema =
  z.object({
    body:
      createEmployeeDocumentBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      emptyObjectSchema
  });

export const updateEmployeeDocumentRequestSchema =
  z.object({
    body:
      updateEmployeeDocumentBodySchema,

    params:
      employeeDocumentParamsSchema,

    query:
      emptyObjectSchema
  });

export const employeeDocumentFileRequestSchema =
  z.object({
    body:
      emptyObjectSchema,

    params:
      employeeDocumentParamsSchema,

    query:
      emptyObjectSchema
  });

export const deleteEmployeeDocumentRequestSchema =
  employeeDocumentFileRequestSchema;

export type CreateEmployeeDocumentInput =
  z.infer<
    typeof createEmployeeDocumentBodySchema
  >;

export type UpdateEmployeeDocumentInput =
  z.infer<
    typeof updateEmployeeDocumentBodySchema
  >;

export type EmployeeDocumentListQuery =
  z.infer<
    typeof employeeDocumentListQuerySchema
  >;

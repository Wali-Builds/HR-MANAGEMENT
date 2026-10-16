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

const nullableEmailSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .email(
        "A valid email address is required"
      )
      .max(150)
      .transform(
        (value) =>
          value.toLowerCase()
      )
      .nullable()
  );

const nullablePhoneSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .min(5)
      .max(50)
      .regex(
        /^[0-9+()\-.\s]+$/,
        "Phone number contains invalid characters"
      )
      .nullable()
  );

const countryCodeSchema = z
  .string()
  .trim()
  .length(
    2,
    "Country code must contain exactly 2 letters"
  )
  .regex(
    /^[A-Za-z]{2}$/,
    "Country code must contain letters only"
  )
  .transform(
    (value) =>
      value.toUpperCase()
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

const nullablePercentageSchema =
  z.preprocess(
    blankStringToNull,
    z
      .number()
      .min(0)
      .max(100)
      .nullable()
  );

const nullableCgpaSchema =
  z.preprocess(
    blankStringToNull,
    z
      .number()
      .min(0)
      .max(20)
      .nullable()
  );

const nullableSalarySchema =
  z.preprocess(
    blankStringToNull,
    z
      .number()
      .min(
        0,
        "Salary cannot be negative"
      )
      .max(
        9999999999999.99,
        "Salary value is too large"
      )
      .nullable()
  );

function validateEducationDates(
  data: {
    startDate?:
      | string
      | null
      | undefined;

    completionDate?:
      | string
      | null
      | undefined;

    isCurrentlyStudying?:
      | boolean
      | undefined;

    cgpa?:
      | number
      | null
      | undefined;

    totalCgpa?:
      | number
      | null
      | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    data.startDate &&
    data.completionDate &&
    data.completionDate <
      data.startDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "completionDate"
      ],

      message:
        "Completion date cannot be before start date"
    });
  }

  if (
    data.isCurrentlyStudying ===
      true &&
    data.completionDate != null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "completionDate"
      ],

      message:
        "A currently studying qualification cannot have a completion date"
    });
  }

  const hasCgpa =
    data.cgpa != null;

  const hasTotalCgpa =
    data.totalCgpa != null;

  if (
    hasCgpa !==
    hasTotalCgpa
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        hasCgpa
          ? "totalCgpa"
          : "cgpa"
      ],

      message:
        "CGPA and total CGPA must be provided together"
    });
  }

  if (
    data.cgpa != null &&
    data.totalCgpa != null &&
    data.cgpa >
      data.totalCgpa
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "cgpa"
      ],

      message:
        "CGPA cannot exceed total CGPA"
    });
  }
}

function validateExperienceDates(
  data: {
    startDate?:
      | string
      | undefined;

    endDate?:
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
    data.startDate &&
    data.endDate &&
    data.endDate <
      data.startDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "endDate"
      ],

      message:
        "Experience end date cannot be before start date"
    });
  }

  if (
    data.isCurrent === true &&
    data.endDate != null
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "endDate"
      ],

      message:
        "A current experience cannot have an end date"
    });
  }
}

/*
 * =========================================================
 * Education bodies
 * =========================================================
 */

export const createEmployeeEducationBodySchema =
  z
    .object({
      qualificationLevel: z
        .string()
        .trim()
        .min(2)
        .max(80),

      degreeTitle: z
        .string()
        .trim()
        .min(2)
        .max(150),

      fieldOfStudy:
        nullableText(150)
          .optional(),

      institutionName: z
        .string()
        .trim()
        .min(2)
        .max(200),

      boardUniversity:
        nullableText(200)
          .optional(),

      city:
        nullableText(100)
          .optional(),

      countryCode:
        countryCodeSchema
          .default("PK"),

      startDate:
        nullableDateOnlySchema
          .optional(),

      completionDate:
        nullableDateOnlySchema
          .optional(),

      isCurrentlyStudying: z
        .boolean()
        .default(false),

      resultType:
        nullableText(30)
          .optional(),

      resultValue:
        nullableText(50)
          .optional(),

      marksPercentage:
        nullablePercentageSchema
          .optional(),

      cgpa:
        nullableCgpaSchema
          .optional(),

      totalCgpa:
        nullableCgpaSchema
          .optional(),

      isHighestQualification: z
        .boolean()
        .default(false),

      certificateDocumentPath:
        nullableText(500)
          .optional(),

      remarks:
        nullableText(500)
          .optional()
    })
    .strict()
    .superRefine(
      validateEducationDates
    );

export const updateEmployeeEducationBodySchema =
  z
    .object({
      ...createEmployeeEducationBodySchema.shape
    })
    .partial()
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
              "At least one education field is required"
          });
        }

        validateEducationDates(
          data,
          context
        );
      }
    );

/*
 * =========================================================
 * Experience bodies
 * =========================================================
 */

export const createEmployeeExperienceBodySchema =
  z
    .object({
      employerName: z
        .string()
        .trim()
        .min(2)
        .max(200),

      jobTitle: z
        .string()
        .trim()
        .min(2)
        .max(150),

      department:
        nullableText(150)
          .optional(),

      employmentType:
        nullableText(50)
          .optional(),

      location:
        nullableText(200)
          .optional(),

      countryCode:
        countryCodeSchema
          .default("PK"),

      startDate:
        dateOnlySchema,

      endDate:
        nullableDateOnlySchema
          .optional(),

      isCurrent: z
        .boolean()
        .default(false),

      responsibilities:
        nullableText(10000)
          .optional(),

      lastDrawnSalary:
        nullableSalarySchema
          .optional(),

      currencyCode:
        currencyCodeSchema
          .default("PKR"),

      reasonForLeaving:
        nullableText(500)
          .optional(),

      referenceName:
        nullableText(150)
          .optional(),

      referencePhone:
        nullablePhoneSchema
          .optional(),

      referenceEmail:
        nullableEmailSchema
          .optional(),

      experienceLetterPath:
        nullableText(500)
          .optional(),

      remarks:
        nullableText(500)
          .optional()
    })
    .strict()
    .superRefine(
      validateExperienceDates
    );

export const updateEmployeeExperienceBodySchema =
  z
    .object({
      ...createEmployeeExperienceBodySchema.shape
    })
    .partial()
    .strict()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length === 0
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "At least one experience field is required"
          });
        }

        validateExperienceDates(
          data,
          context
        );
      }
    );

/*
 * =========================================================
 * Route parameters
 * =========================================================
 */

const employeeIdParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeEducationParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    educationId:
      databaseIdSchema
  });

const employeeExperienceParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    experienceId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const listEmployeeEducationsRequestSchema =
  z.object({
    body: z.object({}).passthrough(),
    params: employeeIdParamsSchema,
    query: z.object({}).passthrough()
  });

export const createEmployeeEducationRequestSchema =
  z.object({
    body:
      createEmployeeEducationBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeEducationRequestSchema =
  z.object({
    body:
      updateEmployeeEducationBodySchema,

    params:
      employeeEducationParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeEducationRequestSchema =
  z.object({
    body: z.object({}).passthrough(),

    params:
      employeeEducationParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeExperiencesRequestSchema =
  z.object({
    body: z.object({}).passthrough(),
    params: employeeIdParamsSchema,
    query: z.object({}).passthrough()
  });

export const createEmployeeExperienceRequestSchema =
  z.object({
    body:
      createEmployeeExperienceBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeExperienceRequestSchema =
  z.object({
    body:
      updateEmployeeExperienceBodySchema,

    params:
      employeeExperienceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeExperienceRequestSchema =
  z.object({
    body: z.object({}).passthrough(),

    params:
      employeeExperienceParamsSchema,

    query:
      z.object({}).passthrough()
  });

export type CreateEmployeeEducationInput =
  z.infer<
    typeof createEmployeeEducationBodySchema
  >;

export type UpdateEmployeeEducationInput =
  z.infer<
    typeof updateEmployeeEducationBodySchema
  >;

export type CreateEmployeeExperienceInput =
  z.infer<
    typeof createEmployeeExperienceBodySchema
  >;

export type UpdateEmployeeExperienceInput =
  z.infer<
    typeof updateEmployeeExperienceBodySchema
  >;
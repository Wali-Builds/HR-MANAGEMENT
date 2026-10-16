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

function nullableNumberValue(
  value: unknown
): unknown {
  const blankConverted =
    blankStringToNull(value);

  if (blankConverted === null) {
    return null;
  }

  return numericStringToNumber(
    blankConverted
  );
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

function isValidDateTime(
  value: string
): boolean {
  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
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

const dateTimeSchema = z
  .string()
  .trim()
  .refine(
    isValidDateTime,
    "Value must be a valid ISO date-time"
  );

const nullableDateTimeSchema =
  z.preprocess(
    blankStringToNull,
    dateTimeSchema.nullable()
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

const sourceTypeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Source type is required"
  )
  .max(
    40,
    "Source type cannot exceed 40 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Source type contains invalid characters"
  )
  .transform(
    (value) =>
      value.toUpperCase()
  );

const renewalStatusSchema = z
  .string()
  .trim()
  .min(
    2,
    "Renewal status is required"
  )
  .max(
    30,
    "Renewal status cannot exceed 30 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Renewal status contains invalid characters"
  )
  .transform(
    (value) =>
      value.toUpperCase()
  );

const nullableRenewalStatusSchema =
  z.preprocess(
    blankStringToNull,
    renewalStatusSchema.nullable()
  );

const proficiencyLevelSchema =
  z.preprocess(
    numericStringToNumber,
    z
      .number()
      .finite()
      .min(
        0,
        "Proficiency level cannot be negative"
      )
      .max(
        999.99,
        "Proficiency level is too large"
      )
  );

const nullableProficiencyLevelSchema =
  z.preprocess(
    nullableNumberValue,
    z
      .number()
      .finite()
      .min(
        0,
        "Target proficiency level cannot be negative"
      )
      .max(
        999.99,
        "Target proficiency level is too large"
      )
      .nullable()
  );

const nullableYearsOfExperienceSchema =
  z.preprocess(
    nullableNumberValue,
    z
      .number()
      .finite()
      .min(
        0,
        "Years of experience cannot be negative"
      )
      .max(
        9999.99,
        "Years of experience is too large"
      )
      .nullable()
  );

const checksumSha256Schema = z
  .string()
  .trim()
  .regex(
    /^[A-Fa-f0-9]{64}$/,
    "Checksum must be a valid SHA-256 hexadecimal value"
  )
  .transform(
    (value) =>
      value.toLowerCase()
  );

const nullableChecksumSha256Schema =
  z.preprocess(
    blankStringToNull,
    checksumSha256Schema.nullable()
  );

/*
 * =========================================================
 * Employee skill bodies
 * =========================================================
 */

const employeeSkillCreateShape = {
  skillId:
    databaseIdSchema,

  proficiencyLevel:
    proficiencyLevelSchema
      .default(0),

  targetProficiencyLevel:
    nullableProficiencyLevelSchema
      .optional(),

  yearsOfExperience:
    nullableYearsOfExperienceSchema
      .optional(),

  sourceType:
    sourceTypeSchema
      .default(
        "SELF_REPORTED"
      ),

  isPrimarySkill: z
    .boolean()
    .default(false),

  lastAssessedAt:
    nullableDateTimeSchema
      .optional(),

  nextAssessmentDate:
    nullableDateOnlySchema
      .optional(),

  evidenceStoragePath:
    nullableText(700)
      .optional(),

  remarks:
    nullableText(10000)
      .optional()
};

export const createEmployeeSkillBodySchema =
  z
    .object(
      employeeSkillCreateShape
    )
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.targetProficiencyLevel != null &&
          data.targetProficiencyLevel <
            data.proficiencyLevel
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "targetProficiencyLevel"
            ],

            message:
              "Target proficiency cannot be lower than the current proficiency"
          });
        }
      }
    );

export const updateEmployeeSkillBodySchema =
  z
    .object({
      proficiencyLevel:
        proficiencyLevelSchema
          .optional(),

      targetProficiencyLevel:
        nullableProficiencyLevelSchema
          .optional(),

      yearsOfExperience:
        nullableYearsOfExperienceSchema
          .optional(),

      sourceType:
        sourceTypeSchema
          .optional(),

      isPrimarySkill: z
        .boolean()
        .optional(),

      lastAssessedAt:
        nullableDateTimeSchema
          .optional(),

      nextAssessmentDate:
        nullableDateOnlySchema
          .optional(),

      evidenceStoragePath:
        nullableText(700)
          .optional(),

      remarks:
        nullableText(10000)
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
              "At least one employee-skill field is required"
          });
        }

        if (
          data.proficiencyLevel !==
            undefined &&
          data.targetProficiencyLevel !=
            null &&
          data.targetProficiencyLevel <
            data.proficiencyLevel
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "targetProficiencyLevel"
            ],

            message:
              "Target proficiency cannot be lower than the current proficiency"
          });
        }
      }
    );

/*
 * =========================================================
 * Employee certification bodies
 * =========================================================
 */

function validateCertificationDates(
  data: {
    issueDate?:
      | string
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
        "Certification expiry date cannot be before the issue date"
    });
  }
}

export const createEmployeeCertificationBodySchema =
  z
    .object({
      certificationId:
        databaseIdSchema,

      trainingEnrollmentId:
        nullableDatabaseIdSchema
          .optional(),

      certificateNumber:
        nullableText(150)
          .optional(),

      issueDate:
        dateOnlySchema,

      expiryDate:
        nullableDateOnlySchema
          .optional(),

      issuingOrganization:
        nullableText(250)
          .optional(),

      certificateStoragePath:
        nullableText(700)
          .optional(),

      checksumSha256:
        nullableChecksumSha256Schema
          .optional(),

      renewalStatus:
        nullableRenewalStatusSchema
          .optional(),

      isActive: z
        .boolean()
        .default(true)
    })
    .strict()
    .superRefine(
      validateCertificationDates
    );

export const updateEmployeeCertificationBodySchema =
  z
    .object({
      trainingEnrollmentId:
        nullableDatabaseIdSchema
          .optional(),

      certificateNumber:
        nullableText(150)
          .optional(),

      issueDate:
        dateOnlySchema
          .optional(),

      expiryDate:
        nullableDateOnlySchema
          .optional(),

      issuingOrganization:
        nullableText(250)
          .optional(),

      certificateStoragePath:
        nullableText(700)
          .optional(),

      checksumSha256:
        nullableChecksumSha256Schema
          .optional(),

      renewalStatus:
        nullableRenewalStatusSchema
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
              "At least one employee-certification field is required"
          });
        }

        validateCertificationDates(
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

const employeeSkillParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    employeeSkillId:
      databaseIdSchema
  });

const employeeCertificationParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    employeeCertificationId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Lookup query
 * =========================================================
 */

export const employeeCompetencyLookupQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(
        200,
        "Search cannot exceed 200 characters"
      )
      .optional(),

    includeInactive: z
      .preprocess(
        queryBoolean,
        z.boolean()
      )
      .default(false)
  });

/*
 * =========================================================
 * Request schemas
 * =========================================================
 */

export const getEmployeeCompetencyLookupsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      employeeCompetencyLookupQuerySchema
  });

export const listEmployeeSkillsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const createEmployeeSkillRequestSchema =
  z.object({
    body:
      createEmployeeSkillBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeSkillRequestSchema =
  z.object({
    body:
      updateEmployeeSkillBodySchema,

    params:
      employeeSkillParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeSkillRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeSkillParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const listEmployeeCertificationsRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeIdParamsSchema,

    query:
      z
        .object({
          includeInactive: z
            .preprocess(
              queryBoolean,
              z.boolean()
            )
            .default(false)
        })
        .strict()
  });

export const createEmployeeCertificationRequestSchema =
  z.object({
    body:
      createEmployeeCertificationBodySchema,

    params:
      employeeIdParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const updateEmployeeCertificationRequestSchema =
  z.object({
    body:
      updateEmployeeCertificationBodySchema,

    params:
      employeeCertificationParamsSchema,

    query:
      z.object({}).passthrough()
  });

export const deleteEmployeeCertificationRequestSchema =
  z.object({
    body:
      z.object({}).passthrough(),

    params:
      employeeCertificationParamsSchema,

    query:
      z.object({}).passthrough()
  });

/*
 * =========================================================
 * Inferred input types
 * =========================================================
 */

export type CreateEmployeeSkillInput =
  z.infer<
    typeof createEmployeeSkillBodySchema
  >;

export type UpdateEmployeeSkillInput =
  z.infer<
    typeof updateEmployeeSkillBodySchema
  >;

export type CreateEmployeeCertificationInput =
  z.infer<
    typeof createEmployeeCertificationBodySchema
  >;

export type UpdateEmployeeCertificationInput =
  z.infer<
    typeof updateEmployeeCertificationBodySchema
  >;

export type EmployeeCompetencyLookupQuery =
  z.infer<
    typeof employeeCompetencyLookupQuerySchema
  >;

export type EmployeeCertificationListQuery =
  z.infer<
    typeof listEmployeeCertificationsRequestSchema
  >["query"];
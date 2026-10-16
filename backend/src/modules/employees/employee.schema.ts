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

function isValidIsoDate(
  value: string
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
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

const nullableDatabaseIdSchema =
  z.preprocess(
    blankStringToNull,
    databaseIdSchema.nullable()
  );

const isoDateSchema = z
  .string()
  .trim()
  .refine(
    isValidIsoDate,
    "Date must use YYYY-MM-DD format"
  );

const nullableDateSchema =
  z.preprocess(
    blankStringToNull,
    isoDateSchema.nullable()
  );

const nullableText = (
  maximumLength: number
) =>
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(maximumLength)
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
      .transform((value) =>
        value.toLowerCase()
      )
      .nullable()
  );

const employeeCodeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Employee code must contain at least 2 characters"
  )
  .max(50)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Employee code may contain letters, numbers, underscores and hyphens"
  )
  .transform((value) =>
    value.toUpperCase()
  );

const bloodGroupSchema =
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(10)
      .transform((value) =>
        value.toUpperCase()
      )
      .nullable()
  );

const assignmentTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Assignment type contains invalid characters"
  )
  .transform((value) =>
    value.toUpperCase()
  );

// edited by wali: Require branch, department, designation, and position for new hires.
const createAssignmentSchema =
  z
    .object({
      branchId:
        databaseIdSchema,

      departmentId:
        databaseIdSchema,

      projectId:
        nullableDatabaseIdSchema
          .optional(),

      designationId:
        databaseIdSchema,

      reportingManagerId:
        nullableDatabaseIdSchema
          .optional(),

      positionId:
        databaseIdSchema,

      assignmentType:
        assignmentTypeSchema
          .default("PRIMARY"),

      effectiveFrom:
        isoDateSchema.optional(),

      workLocation:
        nullableText(255)
          .optional(),

      employmentPercentage:
        z.number()
          .finite()
          .min(
            0.01,
            "Employment percentage must be greater than zero"
          )
          .max(
            100,
            "Employment percentage cannot exceed 100"
          )
          .default(100),

      transferReason:
        nullableText(500)
          .optional()
    })
    .strict();

const updateAssignmentSchema =
  z
    .object({
      branchId:
        nullableDatabaseIdSchema
          .optional(),

      departmentId:
        nullableDatabaseIdSchema
          .optional(),

      projectId:
        nullableDatabaseIdSchema
          .optional(),

      designationId:
        nullableDatabaseIdSchema
          .optional(),

      reportingManagerId:
        nullableDatabaseIdSchema
          .optional(),

      positionId:
        nullableDatabaseIdSchema
          .optional(),

      assignmentType:
        assignmentTypeSchema
          .optional(),

      effectiveFrom:
        isoDateSchema,

      workLocation:
        nullableText(255)
          .optional(),

      employmentPercentage:
        z.number()
          .finite()
          .min(
            0.01,
            "Employment percentage must be greater than zero"
          )
          .max(
            100,
            "Employment percentage cannot exceed 100"
          )
          .optional(),

      transferReason:
        nullableText(500)
          .optional()
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          Object.keys(data).length <= 1
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            message:
              "At least one assignment change is required in addition to effectiveFrom"
          });
        }
      }
    );

type EmployeeDateFields = {
  joiningDate?: string | undefined;

  dateOfBirth?:
    | string
    | null
    | undefined;

  probationEndDate?:
    | string
    | null
    | undefined;

  confirmationDate?:
    | string
    | null
    | undefined;

  contractStartDate?:
    | string
    | null
    | undefined;

  contractEndDate?:
    | string
    | null
    | undefined;

  resignationDate?:
    | string
    | null
    | undefined;

  lastWorkingDate?:
    | string
    | null
    | undefined;
};

function validateEmployeeDates(
  data: EmployeeDateFields,
  context: z.RefinementCtx
): void {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  if (
    data.dateOfBirth &&
    data.dateOfBirth > today
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "dateOfBirth"
      ],

      message:
        "Date of birth cannot be in the future"
    });
  }

  if (
    data.joiningDate &&
    data.probationEndDate &&
    data.probationEndDate <
      data.joiningDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "probationEndDate"
      ],

      message:
        "Probation end date cannot be before joining date"
    });
  }

  if (
    data.joiningDate &&
    data.confirmationDate &&
    data.confirmationDate <
      data.joiningDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "confirmationDate"
      ],

      message:
        "Confirmation date cannot be before joining date"
    });
  }

  if (
    data.contractStartDate &&
    data.contractEndDate &&
    data.contractEndDate <
      data.contractStartDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "contractEndDate"
      ],

      message:
        "Contract end date cannot be before contract start date"
    });
  }

  if (
    data.joiningDate &&
    data.resignationDate &&
    data.resignationDate <
      data.joiningDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "resignationDate"
      ],

      message:
        "Resignation date cannot be before joining date"
    });
  }

  if (
    data.joiningDate &&
    data.lastWorkingDate &&
    data.lastWorkingDate <
      data.joiningDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "lastWorkingDate"
      ],

      message:
        "Last working date cannot be before joining date"
    });
  }

  if (
    data.resignationDate &&
    data.lastWorkingDate &&
    data.lastWorkingDate <
      data.resignationDate
  ) {
    context.addIssue({
      code:
        z.ZodIssueCode.custom,

      path: [
        "lastWorkingDate"
      ],

      message:
        "Last working date cannot be before resignation date"
    });
  }
}

export const createEmployeeBodySchema =
  z
    .object({
      companyId:
        databaseIdSchema
          .optional(),

      employeeCode:
        employeeCodeSchema
          .optional(),

      firstName: z
        .string()
        .trim()
        .min(
          1,
          "First name is required"
        )
        .max(100),

      middleName:
        nullableText(100)
          .optional(),

      lastName: z
        .string()
        .trim()
        .min(1, "Last name is required")
        .max(100),

      preferredName:
        nullableText(100)
          .optional(),

      fatherName:
        nullableText(150)
          .optional(),

      spouseName:
        nullableText(150)
          .optional(),

      gender: z
        .string()
        .trim()
        .min(1, "Gender is required")
        .max(30),

      dateOfBirth:
        isoDateSchema,

      maritalStatus: z
        .string()
        .trim()
        .min(1, "Marital status is required")
        .max(30),

      bloodGroup: z
        .string()
        .trim()
        .min(1, "Blood group is required")
        .max(10)
        .transform((value) => value.toUpperCase()),

      nationality: z
        .string()
        .trim()
        .min(2)
        .max(80)
        .default("Pakistani"),

      cnicNumber: z
        .string()
        .trim()
        .min(1, "CNIC number is required")
        .max(20),

      passportNumber:
        nullableText(50)
          .optional(),

      // edited by wali: Require the contact details on creation; update schema remains optional.
      personalEmail:
        nullableEmailSchema
          .refine((value) => value != null, "Personal email is required when creating an employee"),

      officialEmail:
        nullableEmailSchema
          .refine((value) => value != null, "Official email is required when creating an employee"),

      mobileNumber:
        nullableText(50)
          .refine((value) => value != null, "Mobile number is required when creating an employee"),

      alternateNumber:
        nullableText(50)
          .refine((value) => value != null, "Emergency number is required when creating an employee"),

      employmentTypeId:
        databaseIdSchema,

      employeeStatusId:
        databaseIdSchema,

      joiningDate:
        isoDateSchema,

      probationEndDate:
        nullableDateSchema
          .optional(),

      confirmationDate:
        nullableDateSchema
          .optional(),

      contractStartDate:
        nullableDateSchema
          .optional(),

      contractEndDate:
        nullableDateSchema
          .optional(),

      resignationDate:
        nullableDateSchema
          .optional(),

      lastWorkingDate:
        nullableDateSchema
          .optional(),

      profilePhotoPath:
        nullableText(500)
          .optional(),

      biometricIdentifier:
        nullableText(100)
          .optional(),

      remarks:
        nullableText(65535)
          .optional(),

      isActive: z
        .boolean()
        .default(true),

      assignment:
        createAssignmentSchema
    })
    .strict()
    .superRefine(
      (data, context) => {
        validateEmployeeDates(
          data,
          context
        );
      }
    );

export const updateEmployeeBodySchema =
  z
    .object({
      employeeCode:
        employeeCodeSchema
          .optional(),

      firstName: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      middleName:
        nullableText(100)
          .optional(),

      lastName: z
        .string()
        .trim()
        .min(1, "Last name is required")
        .max(100)
        .optional(),

      preferredName:
        nullableText(100)
          .optional(),

      fatherName:
        nullableText(150)
          .optional(),

      spouseName:
        nullableText(150)
          .optional(),

      gender: z
        .string()
        .trim()
        .min(1, "Gender is required")
        .max(30)
        .optional(),

      dateOfBirth:
        isoDateSchema
          .optional(),

      maritalStatus: z
        .string()
        .trim()
        .min(1, "Marital status is required")
        .max(30)
        .optional(),

      bloodGroup: z
        .string()
        .trim()
        .min(1, "Blood group is required")
        .max(10)
        .transform((value) => value.toUpperCase())
        .optional(),

      nationality: z
        .string()
        .trim()
        .min(2)
        .max(80)
        .optional(),

      cnicNumber: z
        .string()
        .trim()
        .min(1, "CNIC number is required")
        .max(20)
        .optional(),

      passportNumber:
        nullableText(50)
          .optional(),

      personalEmail:
        nullableEmailSchema
          .optional(),

      officialEmail:
        nullableEmailSchema
          .optional(),

      mobileNumber:
        nullableText(50)
          .optional(),

      alternateNumber:
        nullableText(50)
          .optional(),

      employmentTypeId:
        databaseIdSchema
          .optional(),

      employeeStatusId:
        databaseIdSchema
          .optional(),

      joiningDate:
        isoDateSchema
          .optional(),

      probationEndDate:
        nullableDateSchema
          .optional(),

      confirmationDate:
        nullableDateSchema
          .optional(),

      contractStartDate:
        nullableDateSchema
          .optional(),

      contractEndDate:
        nullableDateSchema
          .optional(),

      resignationDate:
        nullableDateSchema
          .optional(),

      lastWorkingDate:
        nullableDateSchema
          .optional(),

      profilePhotoPath:
        nullableText(500)
          .optional(),

      biometricIdentifier:
        nullableText(100)
          .optional(),

      remarks:
        nullableText(65535)
          .optional(),

      isActive: z
        .boolean()
        .optional(),

      assignment:
        updateAssignmentSchema
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
              "At least one employee field is required"
          });
        }

        validateEmployeeDates(
          data,
          context
        );

        if (
          data.isActive === false &&
          data.assignment !== undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "assignment"
            ],

            message:
              "Assignment cannot be changed while deactivating the employee"
          });
        }
      }
    );

const employeeIdParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

export const employeeListQuerySchema =
  z
    .object({
      page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),

      companyId:
        databaseIdSchema
          .optional(),

      branchId:
        databaseIdSchema
          .optional(),

      departmentId:
        databaseIdSchema
          .optional(),

      designationId:
        databaseIdSchema
          .optional(),

      reportingManagerId:
        databaseIdSchema
          .optional(),

      positionId:
        databaseIdSchema
          .optional(),

      employmentTypeId:
        databaseIdSchema
          .optional(),

      employeeStatusId:
        databaseIdSchema
          .optional(),

      search: z
        .string()
        .trim()
        .max(200)
        .optional(),

      gender: z
        .string()
        .trim()
        .max(30)
        .optional(),

      isActive: z
        .preprocess(
          queryBoolean,
          z.boolean()
        )
        .optional(),

      joiningDateFrom:
        isoDateSchema
          .optional(),

      joiningDateTo:
        isoDateSchema
          .optional(),

      sortBy: z
        .enum([
          "employee_code",
          "first_name",
          "joining_date",
          "created_at",
          "updated_at"
        ])
        .default("created_at"),

      sortOrder: z
        .enum([
          "asc",
          "desc",
          "ASC",
          "DESC"
        ])
        .transform((value) =>
          value.toUpperCase() as
            | "ASC"
            | "DESC"
        )
        .default("DESC")
    })
    .superRefine(
      (data, context) => {
        if (
          data.joiningDateFrom &&
          data.joiningDateTo &&
          data.joiningDateTo <
            data.joiningDateFrom
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,

            path: [
              "joiningDateTo"
            ],

            message:
              "Joining-date-to cannot be before joining-date-from"
          });
        }
      }
    );

export const listEmployeesRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query:
      employeeListQuerySchema
  });

export const getEmployeeRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      employeeIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const createEmployeeRequestSchema =
  z.object({
    body:
      createEmployeeBodySchema,

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export const updateEmployeeRequestSchema =
  z.object({
    body:
      updateEmployeeBodySchema,

    params:
      employeeIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteEmployeeRequestSchema =
  getEmployeeRequestSchema;

export const employeeLookupsRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough(),

    query: z
      .object({})
      .passthrough()
  });

export type CreateEmployeeInput =
  z.infer<
    typeof createEmployeeBodySchema
  >;

export type UpdateEmployeeInput =
  z.infer<
    typeof updateEmployeeBodySchema
  >;

export type EmployeeListQuery =
  z.infer<
    typeof employeeListQuerySchema
  >;

export type CreateEmployeeAssignmentInput =
  z.infer<
    typeof createAssignmentSchema
  >;

export type UpdateEmployeeAssignmentInput =
  z.infer<
    typeof updateAssignmentSchema
  >;

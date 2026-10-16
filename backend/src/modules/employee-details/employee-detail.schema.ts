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

const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "ID must be a positive integer"
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
        `Value cannot contain more than ${maximumLength} characters`
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
      .max(
        150,
        "Email cannot contain more than 150 characters"
      )
      .transform(
        (value) =>
          value.toLowerCase()
      )
      .nullable()
  );

const phoneSchema = z
  .string()
  .trim()
  .min(
    5,
    "Phone number must contain at least 5 characters"
  )
  .max(
    50,
    "Phone number cannot contain more than 50 characters"
  )
  .regex(
    /^[0-9+()\-.\s]+$/,
    "Phone number contains invalid characters"
  );

const nullablePhoneSchema =
  z.preprocess(
    blankStringToNull,
    phoneSchema.nullable()
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

const addressTypeSchema = z
  .string()
  .trim()
  .min(
    2,
    "Address type is required"
  )
  .max(
    30,
    "Address type cannot contain more than 30 characters"
  )
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Address type may contain letters, numbers, underscores and hyphens"
  )
  .transform(
    (value) =>
      value.toUpperCase()
  );

/*
 * =========================================================
 * Employee address body schemas
 * =========================================================
 */

export const createEmployeeAddressBodySchema =
  z
    .object({
      addressType:
        addressTypeSchema,

      addressLine1: z
        .string()
        .trim()
        .min(
          3,
          "Address line 1 is required"
        )
        .max(
          255,
          "Address line 1 cannot contain more than 255 characters"
        ),

      addressLine2:
        nullableText(255)
          .optional(),

      city:
        nullableText(100)
          .optional(),

      district:
        nullableText(100)
          .optional(),

      province:
        nullableText(100)
          .optional(),

      postalCode:
        nullableText(30)
          .optional(),

      countryCode:
        countryCodeSchema
          .default("PK"),

      isPrimary: z
        .boolean()
        .default(false)
    })
    .strict();

export const updateEmployeeAddressBodySchema =
  z
    .object({
      addressType:
        addressTypeSchema
          .optional(),

      addressLine1: z
        .string()
        .trim()
        .min(
          3,
          "Address line 1 must contain at least 3 characters"
        )
        .max(
          255,
          "Address line 1 cannot contain more than 255 characters"
        )
        .optional(),

      addressLine2:
        nullableText(255)
          .optional(),

      city:
        nullableText(100)
          .optional(),

      district:
        nullableText(100)
          .optional(),

      province:
        nullableText(100)
          .optional(),

      postalCode:
        nullableText(30)
          .optional(),

      countryCode:
        countryCodeSchema
          .optional(),

      isPrimary: z
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
              "At least one address field is required"
          });
        }
      }
    );

/*
 * =========================================================
 * Emergency contact body schemas
 * =========================================================
 */

export const createEmergencyContactBodySchema =
  z
    .object({
      contactName: z
        .string()
        .trim()
        .min(
          2,
          "Contact name is required"
        )
        .max(
          150,
          "Contact name cannot contain more than 150 characters"
        ),

      relationship: z
        .string()
        .trim()
        .min(
          2,
          "Relationship is required"
        )
        .max(
          80,
          "Relationship cannot contain more than 80 characters"
        ),

      primaryPhone:
        phoneSchema,

      alternatePhone:
        nullablePhoneSchema
          .optional(),

      email:
        nullableEmailSchema
          .optional(),

      address:
        nullableText(500)
          .optional(),

      isPrimary: z
        .boolean()
        .default(false)
    })
    .strict();

export const updateEmergencyContactBodySchema =
  z
    .object({
      contactName: z
        .string()
        .trim()
        .min(
          2,
          "Contact name must contain at least 2 characters"
        )
        .max(
          150,
          "Contact name cannot contain more than 150 characters"
        )
        .optional(),

      relationship: z
        .string()
        .trim()
        .min(
          2,
          "Relationship must contain at least 2 characters"
        )
        .max(
          80,
          "Relationship cannot contain more than 80 characters"
        )
        .optional(),

      primaryPhone:
        phoneSchema
          .optional(),

      alternatePhone:
        nullablePhoneSchema
          .optional(),

      email:
        nullableEmailSchema
          .optional(),

      address:
        nullableText(500)
          .optional(),

      isPrimary: z
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
              "At least one emergency-contact field is required"
          });
        }
      }
    );

/*
 * =========================================================
 * Route parameter schemas
 * =========================================================
 */

const employeeIdParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema
  });

const employeeAddressParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    addressId:
      databaseIdSchema
  });

const emergencyContactParamsSchema =
  z.object({
    employeeId:
      databaseIdSchema,

    contactId:
      databaseIdSchema
  });

/*
 * =========================================================
 * Address request schemas
 * =========================================================
 */

export const listEmployeeAddressesRequestSchema =
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

export const createEmployeeAddressRequestSchema =
  z.object({
    body:
      createEmployeeAddressBodySchema,

    params:
      employeeIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const updateEmployeeAddressRequestSchema =
  z.object({
    body:
      updateEmployeeAddressBodySchema,

    params:
      employeeAddressParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteEmployeeAddressRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      employeeAddressParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

/*
 * =========================================================
 * Emergency-contact request schemas
 * =========================================================
 */

export const listEmergencyContactsRequestSchema =
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

export const createEmergencyContactRequestSchema =
  z.object({
    body:
      createEmergencyContactBodySchema,

    params:
      employeeIdParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const updateEmergencyContactRequestSchema =
  z.object({
    body:
      updateEmergencyContactBodySchema,

    params:
      emergencyContactParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

export const deleteEmergencyContactRequestSchema =
  z.object({
    body: z
      .object({})
      .passthrough(),

    params:
      emergencyContactParamsSchema,

    query: z
      .object({})
      .passthrough()
  });

/*
 * =========================================================
 * Inferred input types
 * =========================================================
 */

export type CreateEmployeeAddressInput =
  z.infer<
    typeof createEmployeeAddressBodySchema
  >;

export type UpdateEmployeeAddressInput =
  z.infer<
    typeof updateEmployeeAddressBodySchema
  >;

export type CreateEmergencyContactInput =
  z.infer<
    typeof createEmergencyContactBodySchema
  >;

export type UpdateEmergencyContactInput =
  z.infer<
    typeof updateEmergencyContactBodySchema
  >;
import { z } from "zod";

export const loginBodySchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(
        3,
        "Username or email must contain at least 3 characters"
      )
      .max(150),

    password: z
      .string()
      .min(1, "Password is required")
      .max(128),

    deviceName: z
      .string()
      .trim()
      .max(150)
      .optional()
  })
  .strict();

export const loginRequestSchema = z.object({
  body: loginBodySchema,

  query: z
    .object({})
    .passthrough(),

  params: z
    .object({})
    .passthrough()
});

export const strongPasswordSchema = z
  .string()
  .min(
    12,
    "Password must contain at least 12 characters"
  )
  .max(
    128,
    "Password cannot contain more than 128 characters"
  )
  .regex(
    /[a-z]/,
    "Password must contain at least one lowercase letter"
  )
  .regex(
    /[A-Z]/,
    "Password must contain at least one uppercase letter"
  )
  .regex(
    /[0-9]/,
    "Password must contain at least one number"
  )
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const changePasswordBodySchema = z
  .object({
    currentPassword: z
      .string()
      .min(
        1,
        "Current password is required"
      )
      .max(128),

    newPassword:
      strongPasswordSchema,

    confirmPassword: z
      .string()
      .min(
        1,
        "Password confirmation is required"
      )
      .max(128)
  })
  .strict()
  .superRefine(
    (data, context) => {
      if (
        data.newPassword !==
        data.confirmPassword
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "confirmPassword"
          ],

          message:
            "New password and confirmation do not match"
        });
      }

      if (
        data.currentPassword ===
        data.newPassword
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "newPassword"
          ],

          message:
            "New password must be different from the current password"
        });
      }
    }
  );

export const changePasswordRequestSchema =
  z.object({
    body:
      changePasswordBodySchema,

    query: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough()
  });

export type LoginRequestBody =
  z.infer<typeof loginBodySchema>;

export type ChangePasswordRequestBody =
  z.infer<
    typeof changePasswordBodySchema
  >;
  export const forgotPasswordBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email(
        "A valid email address is required"
      )
      .max(150)
      .transform((value) =>
        value.toLowerCase()
      )
  })
  .strict();

export const forgotPasswordRequestSchema =
  z.object({
    body:
      forgotPasswordBodySchema,

    query: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough()
  });

export const resetPasswordBodySchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(
        20,
        "Password-reset token is invalid"
      )
      .max(500),

    newPassword:
      strongPasswordSchema,

    confirmPassword: z
      .string()
      .min(
        1,
        "Password confirmation is required"
      )
      .max(128)
  })
  .strict()
  .superRefine(
    (data, context) => {
      if (
        data.newPassword !==
        data.confirmPassword
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "confirmPassword"
          ],

          message:
            "New password and confirmation do not match"
        });
      }
    }
  );

export const resetPasswordRequestSchema =
  z.object({
    body:
      resetPasswordBodySchema,

    query: z
      .object({})
      .passthrough(),

    params: z
      .object({})
      .passthrough()
  });

export type ForgotPasswordRequestBody =
  z.infer<
    typeof forgotPasswordBodySchema
  >;

export type ResetPasswordRequestBody =
  z.infer<
    typeof resetPasswordBodySchema
  >;
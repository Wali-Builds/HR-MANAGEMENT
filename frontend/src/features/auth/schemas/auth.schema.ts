import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Enter a valid username or email")
    .max(150),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128),
});

export const strongPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(128),
    newPassword: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, "Confirm your new password")
      .max(128),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }

    if (data.currentPassword === data.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message:
          "New password must differ from the current password",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(150),
});

export const resetPasswordSchema = z
  .object({
    newPassword: strongPasswordSchema,
    confirmPassword: z
      .string()
      .min(1, "Confirm your new password")
      .max(128),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type LoginFormValues = z.infer<
  typeof loginSchema
>;

export type ChangePasswordFormValues = z.infer<
  typeof changePasswordSchema
>;

export type ForgotPasswordFormValues = z.infer<
  typeof forgotPasswordSchema
>;

export type ResetPasswordFormValues = z.infer<
  typeof resetPasswordSchema
>;

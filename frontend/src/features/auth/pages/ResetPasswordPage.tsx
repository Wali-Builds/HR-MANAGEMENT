import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { PasswordField } from "../../../components/common/PasswordField";
import { resetPasswordRequest } from "../api/auth.api";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "../schemas/auth.schema";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [completed, setCompleted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    if (token.length < 20) {
      setServerError("The password-reset link is invalid or incomplete.");
      return;
    }

    try {
      await resetPasswordRequest({ token, ...values });
      setCompleted(true);
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  });

  if (completed) {
    return (
      <div className="auth-card">
        <div className="auth-card__icon"><KeyRound size={22} /></div>
        <header className="auth-card__header">
          <span className="eyebrow">Password updated</span>
          <h2>Your password has been reset</h2>
          <p>Sign in again using your new password.</p>
        </header>
        <Link className="button button--primary button--full" to="/login">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__icon"><KeyRound size={22} /></div>
      <header className="auth-card__header">
        <span className="eyebrow">Create a new password</span>
        <h2>Secure your account</h2>
        <p>Use at least 12 characters with uppercase, lowercase, number and symbol.</p>
      </header>

      {serverError ? <div className="alert alert--error">{serverError}</div> : null}

      <form className="auth-form" onSubmit={submit} noValidate>
        <PasswordField
          {...register("newPassword")}
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
        />
        <PasswordField
          {...register("confirmPassword")}
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
        />
        <button
          type="submit"
          className="button button--primary button--full"
          disabled={isSubmitting || token.length < 20}
        >
          {isSubmitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}

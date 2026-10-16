import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { PasswordField } from "../../../components/common/PasswordField";
import { changePasswordRequest } from "../api/auth.api";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "../schemas/auth.schema";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      await changePasswordRequest(values);
      clearSession();
      navigate("/login", {
        replace: true,
        state: {
          message:
            "Password changed successfully. Sign in again.",
        },
      });
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  });

  return (
    <main className="forced-password-page">
      <div className="auth-card auth-card--standalone">
        <div className="auth-card__icon auth-card__icon--warning">
          <ShieldAlert size={22} />
        </div>
        <header className="auth-card__header">
          <span className="eyebrow">Security required</span>
          <h2>Change your temporary password</h2>
          <p>You must update your password before accessing the application.</p>
        </header>

        {serverError ? <div className="alert alert--error">{serverError}</div> : null}

        <form className="auth-form" onSubmit={submit} noValidate>
          <PasswordField
            {...register("currentPassword")}
            label="Current password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
          />
          <PasswordField
            {...register("newPassword")}
            label="New password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            hint="Minimum 12 characters with uppercase, lowercase, number and symbol."
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating password…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { PasswordField } from "../../../components/common/PasswordField";
import { loginRequest } from "../api/auth.api";
import {
  loginSchema,
  type LoginFormValues,
} from "../schemas/auth.schema";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const session = await loginRequest({
        ...values,
        deviceName: `${navigator.platform || "Browser"} · Web`,
      });

      setSession(session.accessToken, session.user);

      const requestedPath = (
        location.state as { from?: string } | null
      )?.from;

      navigate(
        session.user.mustChangePassword
          ? "/change-password"
          : requestedPath ?? "/dashboard",
        { replace: true },
      );
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  });

  return (
    <div className="auth-card">
      <div className="auth-card__icon">
        <LockKeyhole size={22} />
      </div>

      <header className="auth-card__header">
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to your account</h2>
        <p>Use your username or work email to continue.</p>
      </header>

      {serverError ? (
        <div className="alert alert--error" role="alert">
          {serverError}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">Username or email</span>
          <input
            {...register("identifier")}
            autoComplete="username"
            className={
              errors.identifier ? "input input--error" : "input"
            }
            placeholder="you@company.com"
            autoFocus
          />
          {errors.identifier ? (
            <span className="field__error">
              {errors.identifier.message}
            </span>
          ) : null}
        </label>

        <PasswordField
          {...register("password")}
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
        />

        <div className="auth-form__meta">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button
          type="submit"
          className="button button--primary button--full"
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? "Signing in…" : "Sign in"}</span>
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="auth-card__footer">
        Access is limited to authorized personnel.
      </p>
    </div>
  );
}

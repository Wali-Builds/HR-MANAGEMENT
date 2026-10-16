import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { forgotPasswordRequest } from "../api/auth.api";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../schemas/auth.schema";

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [developmentUrl, setDevelopmentUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const result = await forgotPasswordRequest(values);
      setMessage(
        "When an active account matches this email, reset instructions are generated.",
      );
      setDevelopmentUrl(result.developmentResetUrl ?? null);
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  });

  return (
    <div className="auth-card">
      <div className="auth-card__icon">
        <Mail size={22} />
      </div>
      <header className="auth-card__header">
        <span className="eyebrow">Account recovery</span>
        <h2>Reset your password</h2>
        <p>Enter the work email linked with your account.</p>
      </header>

      {message ? <div className="alert alert--success">{message}</div> : null}
      {serverError ? <div className="alert alert--error">{serverError}</div> : null}

      {developmentUrl ? (
        <a className="development-link" href={developmentUrl}>
          Open development reset link
        </a>
      ) : null}

      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="field__label">Work email</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className={errors.email ? "input input--error" : "input"}
            placeholder="you@company.com"
          />
          {errors.email ? (
            <span className="field__error">{errors.email.message}</span>
          ) : null}
        </label>

        <button
          type="submit"
          className="button button--primary button--full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Send reset instructions"}
        </button>
      </form>

      <Link className="back-link" to="/login">
        <ArrowLeft size={17} /> Back to sign in
      </Link>
    </div>
  );
}

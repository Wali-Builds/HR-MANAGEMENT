import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
} from "react";

interface PasswordFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordField = forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(function PasswordField(
  { label, error, hint, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <span className="password-input">
        <input
          {...props}
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          className={error ? "input input--error" : "input"}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={
            visible ? "Hide password" : "Show password"
          }
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </label>
  );
});

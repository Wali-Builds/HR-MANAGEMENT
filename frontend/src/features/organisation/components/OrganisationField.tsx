import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

interface BaseProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children?: ReactNode | undefined;
}

export function OrganisationField({
  label,
  hint,
  error,
  required,
  children,
}: BaseProps) {
  return (
    <label className={`wf-org-field${error ? " has-error" : ""}`}>
      <span>{label}{required ? <b> *</b> : null}</span>
      {children}
      {error ? <small className="wf-org-field__error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function TextAreaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

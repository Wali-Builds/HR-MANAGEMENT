import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useProvisionCompanyAdministrator } from "../hooks/useCompanySubscription";

interface ProvisionCompanyAdminDialogProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}

interface AdminFormState {
  username: string;
  email: string;
  temporaryPassword: string;
  confirmPassword: string;
  isEmailVerified: boolean;
}

const initialForm: AdminFormState = {
  username: "",
  email: "",
  temporaryPassword: "",
  confirmPassword: "",
  isEmailVerified: true,
};

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);

  const random = Array.from(bytes, (value) =>
    alphabet.charAt(value % alphabet.length),
  ).join("");

  return `Aa1!${random.slice(4)}`;
}

function passwordRequirements(password: string) {
  return [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "Uppercase and lowercase", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", met: /[0-9]/.test(password) },
    { label: "At least one special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function ProvisionCompanyAdminDialog({
  companyId,
  companyName,
  open,
  onClose,
}: ProvisionCompanyAdminDialogProps) {
  const mutation = useProvisionCompanyAdministrator(companyId);
  const [form, setForm] = useState<AdminFormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setShowPassword(false);
      setFormError(null);
    }
  }, [open]);

  const requirements = useMemo(
    () => passwordRequirements(form.temporaryPassword),
    [form.temporaryPassword],
  );

  if (!open) {
    return null;
  }

  function update<K extends keyof AdminFormState>(
    key: K,
    value: AdminFormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function copyPassword(): Promise<void> {
    if (!form.temporaryPassword) {
      return;
    }

    await navigator.clipboard.writeText(form.temporaryPassword);
    toast.success("Temporary password copied");
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    if (form.temporaryPassword !== form.confirmPassword) {
      setFormError("Temporary password and confirmation do not match.");
      return;
    }

    if (!requirements.every((requirement) => requirement.met)) {
      setFormError("The temporary password does not meet the security requirements.");
      return;
    }

    try {
      await mutation.mutateAsync({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        temporaryPassword: form.temporaryPassword,
        isEmailVerified: form.isEmailVerified,
      });
      toast.success("Company Administrator provisioned successfully");
      onClose();
    } catch (error) {
      setFormError(normalizeApiError(error).message);
    }
  }

  return (
    <div className="org-modal-layer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="org-modal-backdrop"
        onClick={onClose}
        aria-label="Close administrator dialog"
      />

      <form className="org-setup-dialog" onSubmit={submit}>
        <header className="org-setup-dialog__header">
          <div>
            <span className="org-setup-dialog__kicker">Tenant access</span>
            <h2>Provision Company Administrator</h2>
            <p>{companyName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>

        <div className="org-setup-dialog__body">
          {formError ? (
            <div className="org-inline-alert org-inline-alert--error">
              {formError}
            </div>
          ) : null}

          <div className="org-admin-intro">
            <span><ShieldCheck size={20} /></span>
            <div>
              <strong>Company-scoped administrator</strong>
              <p>
                This account will manage only this organisation and must change
                the temporary password at first login.
              </p>
            </div>
          </div>

          <section className="org-setup-section">
            <header>
              <UserPlus size={17} />
              <div>
                <h3>Login identity</h3>
                <p>Create the first account supplied to the customer.</p>
              </div>
            </header>

            <div className="org-setup-grid">
              <label className="org-setup-field">
                <span>Username *</span>
                <input
                  required
                  minLength={3}
                  maxLength={80}
                  value={form.username}
                  onChange={(event) => update("username", event.target.value)}
                  placeholder="company.admin"
                  autoComplete="off"
                />
              </label>

              <label className="org-setup-field">
                <span>Email *</span>
                <input
                  required
                  type="email"
                  maxLength={150}
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="admin@company.com"
                  autoComplete="off"
                />
              </label>
            </div>
          </section>

          <section className="org-setup-section">
            <header>
              <KeyRound size={17} />
              <div>
                <h3>Temporary password</h3>
                <p>Share it securely. The administrator must replace it after login.</p>
              </div>
            </header>

            <div className="org-password-row">
              <label className="org-setup-field">
                <span>Temporary password *</span>
                <div className="org-password-input">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.temporaryPassword}
                    onChange={(event) =>
                      update("temporaryPassword", event.target.value)
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div className="org-password-actions">
                <button
                  type="button"
                  className="org-secondary-action"
                  onClick={() => {
                    const password = generateTemporaryPassword();
                    setForm((current) => ({
                      ...current,
                      temporaryPassword: password,
                      confirmPassword: password,
                    }));
                    setShowPassword(true);
                  }}
                >
                  Generate
                </button>
                <button
                  type="button"
                  className="org-icon-button"
                  onClick={() => void copyPassword()}
                  disabled={!form.temporaryPassword}
                  aria-label="Copy temporary password"
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>

            <label className="org-setup-field">
              <span>Confirm temporary password *</span>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => update("confirmPassword", event.target.value)}
                autoComplete="new-password"
              />
            </label>

            <div className="org-password-requirements">
              {requirements.map((requirement) => (
                <span className={requirement.met ? "is-met" : ""} key={requirement.label}>
                  <CheckCircle2 size={13} /> {requirement.label}
                </span>
              ))}
            </div>

            <label className="org-check-field">
              <input
                type="checkbox"
                checked={form.isEmailVerified}
                onChange={(event) =>
                  update("isEmailVerified", event.target.checked)
                }
              />
              <span>
                <strong>Mark email as verified</strong>
                <small>Recommended only when the customer contact has been verified.</small>
              </span>
            </label>
          </section>
        </div>

        <footer className="org-setup-dialog__footer">
          <span>The account receives the COMPANY_ADMIN role.</span>
          <div>
            <button
              type="button"
              className="org-secondary-action"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="org-primary-action"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              Provision administrator
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

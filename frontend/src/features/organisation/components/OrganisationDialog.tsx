import { LoaderCircle, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useOrganisationDialogAnimation } from "./OrganisationDialogMotion";

interface Props {
  open: boolean;
  title: string;
  subtitle: string;
  submitLabel: string;
  busy?: boolean;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OrganisationDialog({
  open,
  title,
  subtitle,
  submitLabel,
  busy = false,
  children,
  onClose,
  onSubmit,
}: Props) {
  const animation = useOrganisationDialogAnimation<HTMLFormElement>(open);

  if (!open) return null;

  const handleClose = onClose;

  return (
    <div className={animation.backdropClassName} role="presentation" onMouseDown={animation.closing ? undefined : handleClose}>
      <form
        ref={animation.dialogRef}
        className={animation.dialogClassName}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <header className="wf-org-dialog__header">
          <div>
            <span>Organisation structure</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close"><X size={19} /></button>
        </header>

        <div className="wf-org-dialog__body">{children}</div>

        <footer className="wf-org-dialog__footer">
          <button type="button" className="wf-org-button wf-org-button--secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="wf-org-button wf-org-button--primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : null}
            {busy ? "Saving…" : submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

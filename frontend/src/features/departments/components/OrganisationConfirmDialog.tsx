import { Archive, LoaderCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function OrganisationConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="wf-org-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="wf-org-confirm" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="wf-org-confirm__close" onClick={onClose}><X size={17} /></button>
        <span className="wf-org-confirm__icon"><Archive size={21} /></span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="wf-org-confirm__actions">
          <button type="button" className="wf-org-button wf-org-button--secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="wf-org-button wf-org-button--danger" onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={15} /> : null}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

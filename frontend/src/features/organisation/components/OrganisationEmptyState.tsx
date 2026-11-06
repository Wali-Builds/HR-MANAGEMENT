import { Layers3, Plus, RefreshCw } from "lucide-react";
import { useOrganisationDialogMotion } from "./OrganisationDialogMotion";

interface Props {
  title: string;
  description: string;
  error?: string | undefined;
  canCreate: boolean;
  // added by wali: Let pages name the action clearly for their first record.
  createLabel?: string | undefined;
  onCreate: () => void;
  onRetry: () => void;
  // edited by wali: Reuse the global refresh animation while a retry is fetching records.
  isRetrying?: boolean;
}

export function OrganisationEmptyState({
  title,
  description,
  error,
  canCreate,
  createLabel = "Create first record",
  onCreate,
  onRetry,
  isRetrying = false,
}: Props) {
  const dialogMotion = useOrganisationDialogMotion();
  return (
    <div className="wf-org-empty">
      <span><Layers3 size={26} /></span>
      <h2>{error ? "Records could not be loaded" : title}</h2>
      <p>{error ?? description}</p>
      {error ? (
        <button type="button" className="wf-org-button wf-org-button--secondary" onClick={onRetry}>
          <RefreshCw className={isRetrying ? "spin" : ""} size={15} /> Try again
        </button>
      ) : canCreate ? (
        <button type="button" className="wf-org-button wf-org-button--primary" onClick={(event) => { dialogMotion?.capture(event); onCreate(); }}>
          <Plus size={15} /> {createLabel}
        </button>
      ) : null}
    </div>
  );
}

import { Layers3, Plus, RefreshCw } from "lucide-react";

interface Props {
  title: string;
  description: string;
  error?: string | undefined;
  canCreate: boolean;
  onCreate: () => void;
  onRetry: () => void;
}

export function OrganisationEmptyState({
  title,
  description,
  error,
  canCreate,
  onCreate,
  onRetry,
}: Props) {
  return (
    <div className="wf-org-empty">
      <span><Layers3 size={26} /></span>
      <h2>{error ? "Records could not be loaded" : title}</h2>
      <p>{error ?? description}</p>
      {error ? (
        <button type="button" className="wf-org-button wf-org-button--secondary" onClick={onRetry}>
          <RefreshCw size={15} /> Try again
        </button>
      ) : canCreate ? (
        <button type="button" className="wf-org-button wf-org-button--primary" onClick={onCreate}>
          <Plus size={15} /> Create first record
        </button>
      ) : null}
    </div>
  );
}

import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useDeleteCompany } from "../hooks/useCompanies";
import type { Company } from "../types/company.types";

interface DeleteCompanyDialogProps {
  company: Company | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteCompanyDialog({
  company,
  onClose,
  onDeleted,
}: DeleteCompanyDialogProps) {
  const deleteMutation = useDeleteCompany();

  if (!company) {
    return null;
  }

  async function confirmDelete() {
    try {
      await deleteMutation.mutateAsync(company.companyId);
      toast.success("Company deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <div className="org-modal-layer" role="presentation">
      <button
        type="button"
        className="org-modal-backdrop"
        onClick={onClose}
        aria-label="Close delete confirmation"
      />
      <section
        className="org-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-company-title"
      >
        <button
          type="button"
          className="org-delete-dialog__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <span className="org-delete-dialog__icon"><AlertTriangle size={24} /></span>
        <span className="org-delete-dialog__eyebrow">Destructive action</span>
        <h2 id="delete-company-title">Delete {company.displayName}?</h2>
        <p>
          This soft-deletes the company, deactivates its users and revokes active
          sessions. Use it only when the organisation must no longer be accessible.
        </p>

        <div className="org-delete-dialog__record">
          <BuildingRecord company={company} />
        </div>

        <footer>
          <button
            type="button"
            className="org-secondary-action"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="org-danger-action org-danger-action--filled"
            onClick={() => void confirmDelete()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Trash2 size={16} />
            )}
            {deleteMutation.isPending ? "Deleting…" : "Delete company"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function BuildingRecord({ company }: { company: Company }) {
  return (
    <>
      <Trash2 size={17} />
      <span>
        <strong>{company.displayName}</strong>
        <small>{company.companyCode}</small>
      </span>
    </>
  );
}

import {
  CircleOff,
  LoaderCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useUpdateCompany } from "../hooks/useCompanies";
import type { Company } from "../types/company.types";

interface CompanyDeactivationDialogProps {
  company: Company | null;
  onClose: () => void;
  onDeactivated: () => void;
}

export function CompanyDeactivationDialog({
  company,
  onClose,
  onDeactivated,
}: CompanyDeactivationDialogProps) {
  const updateMutation = useUpdateCompany();

  if (!company) {
    return null;
  }

  async function confirmDeactivation() {
    try {
      await updateMutation.mutateAsync({
        companyId: company.companyId,
        input: { isActive: false },
      });
      toast.success(`${company.displayName} moved to inactive companies`);
      onDeactivated();
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
        aria-label="Close deactivation confirmation"
      />
      <section
        className="org-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deactivate-company-title"
      >
        <button
          type="button"
          className="org-delete-dialog__close"
          onClick={onClose}
          aria-label="Close"
          disabled={updateMutation.isPending}
        >
          <X size={18} />
        </button>

        <span className="org-delete-dialog__icon"><CircleOff size={24} /></span>
        <span className="org-delete-dialog__eyebrow">Deactivate workspace</span>
        <h2 id="deactivate-company-title">Deactivate {company.displayName}?</h2>
        <p>
          The company record will remain available in the Inactive tab. Its users
          will be deactivated and their active sessions revoked. Reactivating the
          company later will not automatically reactivate those user accounts.
        </p>

        <div className="org-delete-dialog__record">
          <CircleOff size={17} />
          <span>
            <strong>{company.displayName}</strong>
            <small>{company.companyCode}</small>
          </span>
        </div>

        <footer>
          <button
            type="button"
            className="org-secondary-action"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="org-danger-action org-danger-action--filled"
            onClick={() => void confirmDeactivation()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <CircleOff size={16} />
            )}
            {updateMutation.isPending ? "Deactivating..." : "Deactivate company"}
          </button>
        </footer>
      </section>
    </div>
  );
}

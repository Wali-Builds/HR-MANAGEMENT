import { Archive, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useArchiveEmployee } from "../hooks/useEmployees";
import type { Employee } from "../types/employee.types";

interface Props {
  employee: Employee | null;
  onClose: () => void;
  onArchived?: () => void;
}

export function ArchiveEmployeeDialog({ employee, onClose, onArchived }: Props) {
  const archiveMutation = useArchiveEmployee();

  if (!employee) {
    return null;
  }

  const selectedEmployee = employee;

  async function archive() {
    try {
      await archiveMutation.mutateAsync(selectedEmployee.employeeId);
      toast.success(`${selectedEmployee.fullName} was archived`);
      onArchived?.();
      onClose();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <div className="emp-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="emp-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="emp-dialog__close" onClick={onClose}><X size={17} /></button>
        <span className="emp-dialog__icon"><Archive size={22} /></span>
        <h2>Archive employee record?</h2>
        <p>
          <strong>{employee.fullName}</strong> will be removed from the active directory.
          Current assignments will close and a linked login account will be deactivated.
        </p>
        <div className="emp-dialog__actions">
          <button type="button" className="emp-secondary-action" onClick={onClose} disabled={archiveMutation.isPending}>Cancel</button>
          <button type="button" className="emp-danger-action" onClick={() => void archive()} disabled={archiveMutation.isPending}>
            {archiveMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Archive size={16} />}
            Archive employee
          </button>
        </div>
      </section>
    </div>
  );
}

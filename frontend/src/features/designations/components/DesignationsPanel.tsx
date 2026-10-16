// edited by wali: Keep designation management UI in its dedicated feature folder.
import {
  BadgeCheck,
  Banknote,
  Edit3,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useArchiveDesignation,
  useCreateDesignation,
  useDesignations,
  useUpdateDesignation,
} from "../hooks/useDesignations";
import type { Designation, DesignationInput } from "../types/designation.types";
import { OrganisationConfirmDialog } from "../../organisation/components/OrganisationConfirmDialog";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import {
  OrganisationField,
  TextAreaInput,
  TextInput,
} from "../../organisation/components/OrganisationField";
import { OrganisationResourceToolbar } from "../../organisation/components/OrganisationResourceToolbar";

interface Props {
  companyId?: string | undefined;
  canManage: boolean;
}

type StatusFilter = "all" | "active" | "inactive";

interface DesignationFormState {
  designationCode: string;
  designationName: string;
  grade: string;
  jobLevel: string;
  description: string;
  minimumSalary: string;
  maximumSalary: string;
  isManagerial: boolean;
  isActive: boolean;
}

const emptyForm: DesignationFormState = {
  designationCode: "",
  designationName: "",
  grade: "",
  jobLevel: "",
  description: "",
  minimumSalary: "",
  maximumSalary: "",
  isManagerial: false,
  isActive: true,
};

function fromDesignation(designation: Designation): DesignationFormState {
  return {
    designationCode: designation.designationCode,
    designationName: designation.designationName,
    grade: designation.grade ?? "",
    jobLevel: designation.jobLevel === null ? "" : String(designation.jobLevel),
    description: designation.description ?? "",
    minimumSalary: designation.minimumSalary === null ? "" : String(designation.minimumSalary),
    maximumSalary: designation.maximumSalary === null ? "" : String(designation.maximumSalary),
    isManagerial: designation.isManagerial,
    isActive: designation.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function money(value: number | null): string {
  // edited by wali: Escaped Unicode keeps salary dashes readable across file encodings.
  if (value === null) return "\u2014";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DesignationsPanel({ companyId, canManage }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Designation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DesignationFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Designation | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sortBy: "job_level" as const,
      sortOrder: "ASC" as const,
      ...(companyId ? { companyId } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status !== "all" ? { isActive: status === "active" } : {}),
    }),
    [companyId, deferredSearch, page, status],
  );

  const query = useDesignations(params);
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();
  const archiveMutation = useArchiveDesignation();
  const busy = createMutation.isPending || updateMutation.isPending;
  const designations = query.data?.designations ?? [];
  const pagination = query.data?.pagination;

  useEffect(() => setPage(1), [companyId, deferredSearch, status]);

  function openCreate() {
    if (!companyId) {
      toast.error("Select a company before creating a designation.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(designation: Designation) {
    setEditing(designation);
    setForm(fromDesignation(designation));
    setErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof DesignationFormState>(key: K, value: DesignationFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.designationCode.trim().length < 2) nextErrors.designationCode = "Enter a designation code.";
    if (form.designationName.trim().length < 2) nextErrors.designationName = "Enter a designation name.";
    if (form.minimumSalary && form.maximumSalary && Number(form.minimumSalary) > Number(form.maximumSalary)) {
      nextErrors.maximumSalary = "Maximum salary must be greater than or equal to minimum salary.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: DesignationInput = {
      ...(!editing && companyId ? { companyId } : {}),
      designationCode: form.designationCode.trim(),
      designationName: form.designationName.trim(),
      grade: nullable(form.grade),
      jobLevel: nullableNumber(form.jobLevel),
      description: nullable(form.description),
      minimumSalary: nullableNumber(form.minimumSalary),
      maximumSalary: nullableNumber(form.maximumSalary),
      isManagerial: form.isManagerial,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        const updateInput: Partial<DesignationInput> = { ...input };
        delete updateInput.companyId;
        await updateMutation.mutateAsync({ designationId: editing.designationId, input: updateInput });
        toast.success("Designation updated successfully");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Designation created successfully");
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.designationId);
      toast.success("Designation archived successfully");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  const error = query.isError ? normalizeApiError(query.error).message : undefined;

  return (
    <section className="wf-org-resource">
      <OrganisationResourceToolbar
        title="Designations"
        description="Maintain grades, job levels and managerial classifications."
        search={search}
        total={pagination?.total ?? 0}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        activeFilter={status}
        canCreate={canManage && Boolean(companyId)}
        isFetching={query.isFetching}
        createLabel="New designation"
        onSearchChange={setSearch}
        onActiveFilterChange={setStatus}
        onCreate={openCreate}
        onRefresh={() => void query.refetch()}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(pagination?.totalPages ?? 1, current + 1))}
      />

      {query.isLoading ? (
        <div className="wf-org-table-skeleton">Loading designationsâ€¦</div>
      ) : error || designations.length === 0 ? (
        <OrganisationEmptyState
          title={deferredSearch || status !== "all" ? "No matching designations" : "No designations configured"}
          description={deferredSearch || status !== "all" ? "Adjust the search or status filter." : "Create job classifications before defining positions."}
          error={error}
          canCreate={canManage && Boolean(companyId)}
          onCreate={openCreate}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Designation</th><th>Grade / level</th><th>Salary range</th><th>Classification</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {designations.map((designation) => (
                <tr key={designation.designationId}>
                  <td>
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><BadgeCheck size={17} /></span>
                      <div><strong>{designation.designationName}</strong><small>{designation.designationCode}</small></div>
                    </div>
                  </td>
                  {/* edited by wali: Escaped Unicode prevents corrupted dashes in empty grade and level values. */}
                  <td>{designation.grade ?? "\u2014"}<small className="wf-org-cell-note">Level {designation.jobLevel ?? "\u2014"}</small></td>
                  <td><span className="wf-org-muted-line"><Banknote size={14} /> {money(designation.minimumSalary)} {"\u2013"} {money(designation.maximumSalary)}</span></td>
                  <td>{designation.isManagerial ? <span className="wf-org-tag"><ShieldCheck size={12} /> Managerial</span> : <span className="wf-org-tag wf-org-tag--neutral">Individual contributor</span>}</td>
                  <td><span className={`wf-org-status ${designation.isActive ? "is-active" : "is-inactive"}`}>{designation.isActive ? "Active" : "Inactive"}</span></td>
                  <td>
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={() => openEdit(designation)} title="Edit"><Edit3 size={15} /></button>
                        <button type="button" onClick={() => setArchiveTarget(designation)} title="Archive"><MoreHorizontal size={16} /></button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrganisationDialog
        open={formOpen}
        title={editing ? "Edit designation" : "Create designation"}
        subtitle="Define grade, seniority and optional salary guidance."
        submitLabel={editing ? "Save changes" : "Create designation"}
        busy={busy}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          <OrganisationField label="Designation code" required error={errors.designationCode}><TextInput value={form.designationCode} onChange={(e) => setField("designationCode", e.target.value)} placeholder="HR-MGR" /></OrganisationField>
          <OrganisationField label="Designation name" required error={errors.designationName}><TextInput value={form.designationName} onChange={(e) => setField("designationName", e.target.value)} placeholder="HR Manager" /></OrganisationField>
          <OrganisationField label="Grade"><TextInput value={form.grade} onChange={(e) => setField("grade", e.target.value)} placeholder="M2" /></OrganisationField>
          <OrganisationField label="Job level"><TextInput type="number" min="0" value={form.jobLevel} onChange={(e) => setField("jobLevel", e.target.value)} /></OrganisationField>
          <OrganisationField label="Minimum salary"><TextInput type="number" min="0" step="0.01" value={form.minimumSalary} onChange={(e) => setField("minimumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Maximum salary" error={errors.maximumSalary}><TextInput type="number" min="0" step="0.01" value={form.maximumSalary} onChange={(e) => setField("maximumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Description"><TextAreaInput rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} /></OrganisationField>
          <div className="wf-org-check-stack">
            <label className="wf-org-check"><input type="checkbox" checked={form.isManagerial} onChange={(e) => setField("isManagerial", e.target.checked)} /><span><strong>Managerial designation</strong><small>Can be used for leadership and approval roles.</small></span></label>
            <label className="wf-org-check"><input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} /><span><strong>Active designation</strong><small>Available when creating positions and employee assignments.</small></span></label>
          </div>
        </div>
      </OrganisationDialog>

      <OrganisationConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive designation?"
        description={`${archiveTarget?.designationName ?? "This designation"} will no longer be available for new positions or assignments.`}
        confirmLabel="Archive designation"
        busy={archiveMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void archive()}
      />
    </section>
  );
}


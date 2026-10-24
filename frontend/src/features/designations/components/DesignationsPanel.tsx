// edited by wali: Keep designation management UI in its dedicated feature folder.
import {
  BadgeCheck,
  Banknote,
  Edit3,
  MoreHorizontal,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
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
import { useBranches, useDepartments, usePositions } from "../../departments/hooks/useOrganisation";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationDialogMotionProvider, useRequiredOrganisationDialogMotion } from "../../organisation/components/OrganisationDialogMotion";

interface Props {
  companyId?: string | undefined;
  canManage: boolean;
  view: "list" | "cards";
  onViewChange: (view: "list" | "cards") => void;
}

type StatusFilter = "all" | "active" | "inactive";

interface DesignationFormState {
  branchId: string;
  departmentId: string;
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
  branchId: "",
  departmentId: "",
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
    branchId: "",
    departmentId: designation.departmentId ?? "",
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

function DesignationsPanelContent({ companyId, canManage, view, onViewChange }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Designation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // edited by wali: Track the New designation button as the create-dialog animation origin.
  const dialogMotion = useRequiredOrganisationDialogMotion();
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
  // edited by wali: Load departments for required designation ownership and list labels.
  const departmentsQuery = useDepartments({
    page: 1,
    limit: 100,
    sortBy: "department_name",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    isActive: true,
  });
  // edited by wali: Load branches first so designation departments can be scoped to the selected branch.
  const branchesQuery = useBranches({
    page: 1,
    limit: 100,
    sortBy: "branch_name",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    isActive: true,
  });
  // edited by wali: Check for linked positions before allowing a designation's branch or department to change.
  const positionUsageQuery = usePositions({
    page: 1,
    limit: 1,
    sortBy: "position_title",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    ...(editing ? { designationId: editing.designationId } : {}),
  }, Boolean(editing));
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();
  const archiveMutation = useArchiveDesignation();
  const busy = createMutation.isPending || updateMutation.isPending;
  const designations = query.data?.designations ?? [];
  const departments = departmentsQuery.data?.departments ?? [];
  const branches = branchesQuery.data?.branches ?? [];
  const branchDepartments = departments.filter((department) => department.branchId === form.branchId);
  const hasLinkedPositions = (positionUsageQuery.data?.pagination.total ?? 0) > 0;
  const positionUsageCheckUnavailable = Boolean(editing && positionUsageQuery.isError);
  const positionUsageCheckPending = Boolean(editing && (positionUsageQuery.isLoading || positionUsageQuery.isPlaceholderData || positionUsageCheckUnavailable));
  const designationScopeLocked = Boolean(editing && (hasLinkedPositions || positionUsageCheckPending));
  const originalDesignationBranchId = editing
    ? departments.find((department) => department.departmentId === editing.departmentId)?.branchId ?? ""
    : "";
  const pagination = query.data?.pagination;

  useEffect(() => setPage(1), [companyId, deferredSearch, status]);

  function openCreate() {
    if (!companyId) {
      toast.error("Select a company before creating a designation.");
      return;
    }
    if (!departmentsQuery.isLoading && departments.length === 0) {
      toast.error("Create an active department before creating a designation.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(designation: Designation, event: MouseEvent<HTMLButtonElement>) {
    dialogMotion.capture(event);
    setEditing(designation);
    const department = departments.find((item) => item.departmentId === designation.departmentId);
    setForm({ ...fromDesignation(designation), branchId: department?.branchId ?? "" });
    setErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    dialogMotion.close(() => { setFormOpen(false); setEditing(null); });
  }

  function setField<K extends keyof DesignationFormState>(key: K, value: DesignationFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setBranchId(branchId: string) {
    setForm((current) => ({ ...current, branchId, departmentId: "" }));
    setErrors((current) => ({ ...current, branchId: "", departmentId: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.branchId) nextErrors.branchId = "Select a branch.";
    if (!form.departmentId) nextErrors.departmentId = "Select a department.";
    if (editing && (form.branchId !== originalDesignationBranchId || form.departmentId !== editing.departmentId) && hasLinkedPositions) {
      nextErrors.departmentId = "Branch and department cannot be changed because this designation has a position.";
    } else if (editing && (form.branchId !== originalDesignationBranchId || form.departmentId !== editing.departmentId) && positionUsageCheckPending) {
      nextErrors.departmentId = "Could not verify position usage. Try again before changing the branch or department.";
    }
    if (form.departmentId && !branchDepartments.some((department) => department.departmentId === form.departmentId)) {
      nextErrors.departmentId = "Select a department in the selected branch.";
    }
    if (form.designationCode.trim().length < 2) nextErrors.designationCode = "Enter a designation code.";
    if (form.designationName.trim().length < 2) nextErrors.designationName = "Enter a designation name.";
    if (form.minimumSalary && form.maximumSalary && Number(form.minimumSalary) > Number(form.maximumSalary)) {
      nextErrors.maximumSalary = "Maximum salary must be greater than or equal to minimum salary.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: DesignationInput = {
      ...(!editing && companyId ? { companyId } : {}),
      departmentId: form.departmentId,
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
      closeForm();
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
        description="Maintain department-specific grades, job levels and managerial classifications."
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
        view={view}
        onViewChange={onViewChange}
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
          isRetrying={query.isFetching}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Designation</th><th>Branch / department</th><th>Grade / level</th><th>Salary range</th><th>Classification</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {designations.map((designation) => (
                <tr key={designation.designationId}>
                  {/* edited by wali: Show the designation's branch together with its owning department. */}
                  <td data-label="Designation">
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><BadgeCheck size={17} /></span>
                      <div><strong>{designation.designationName}</strong><small>{designation.designationCode}</small></div>
                    </div>
                  </td>
                  <td data-label="Branch / department">
                    <strong>{departments.find((department) => department.departmentId === designation.departmentId)?.branchName ?? "No branch"}</strong>
                    <small className="wf-org-cell-note">{departments.find((department) => department.departmentId === designation.departmentId)?.departmentName ?? "Department unavailable"}</small>
                  </td>
                  {/* edited by wali: Escaped Unicode prevents corrupted dashes in empty grade and level values. */}
                  <td data-label="Grade / level">{designation.grade ?? "\u2014"}<small className="wf-org-cell-note">Level {designation.jobLevel ?? "\u2014"}</small></td>
                  <td data-label="Salary range"><span className="wf-org-muted-line"><Banknote size={14} /> {money(designation.minimumSalary)} {"\u2013"} {money(designation.maximumSalary)}</span></td>
                  <td data-label="Classification">{designation.isManagerial ? <span className="wf-org-tag"><ShieldCheck size={12} /> Managerial</span> : <span className="wf-org-tag wf-org-tag--neutral">Individual contributor</span>}</td>
                  <td data-label="Status"><span className={`wf-org-status ${designation.isActive ? "is-active" : "is-inactive"}`}>{designation.isActive ? "Active" : "Inactive"}</span></td>
                  <td data-label="Actions">
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={(event) => openEdit(designation, event)} title="Edit"><Edit3 size={15} /></button>
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
        subtitle="Choose a branch and department, then define grade, seniority and optional salary guidance."
        submitLabel={editing ? "Save changes" : "Create designation"}
        busy={busy}
        onClose={closeForm}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          {/* edited by wali: Require a branch first and mark the current Head Office in its picker. */}
          <OrganisationField label="Branch" required error={errors.branchId} hint={positionUsageCheckUnavailable ? "Could not check position usage. Branch and department changes are disabled." : positionUsageCheckPending ? "Checking whether this designation has positions…" : hasLinkedPositions ? "Branch cannot be changed while this designation has a position." : branchesQuery.isLoading ? "Loading branches…" : branches.length === 0 ? "Create an active branch first." : undefined}>
            <EmployeeMenuSelect
              className="wf-org-menu-select"
              value={form.branchId}
              placeholder="Select branch"
              options={branches.map((branch) => ({
                value: branch.branchId,
                label: branch.branchName,
                ...(branch.isHeadOffice ? { icon: <span className="emp-menu-select__head-office-marker"><Star size={13} fill="currentColor" aria-hidden="true" />Head Office</span> } : {}),
              }))}
              onChange={setBranchId}
              disabled={designationScopeLocked || branchesQuery.isLoading || branches.length === 0}
            />
          </OrganisationField>
          <OrganisationField label="Department" required error={errors.departmentId} hint={designationScopeLocked ? hasLinkedPositions ? "Department cannot be changed while this designation has a position." : positionUsageCheckUnavailable ? "Could not check position usage. Branch and department changes are disabled." : "Checking whether this designation has positions…" : !form.branchId ? "Select a branch first." : departmentsQuery.isLoading ? "Loading departments…" : branchDepartments.length === 0 ? "Create an active department in this branch first." : undefined}>
            <EmployeeMenuSelect
              className="wf-org-menu-select"
              value={form.departmentId}
              placeholder={form.branchId ? "Select department" : "Select branch first"}
              options={branchDepartments.map((department) => ({ value: department.departmentId, label: department.departmentName }))}
              onChange={(value) => setField("departmentId", value)}
              disabled={designationScopeLocked || !form.branchId || departmentsQuery.isLoading || branchDepartments.length === 0}
            />
          </OrganisationField>
          <OrganisationField label="Designation code" required error={errors.designationCode}><TextInput value={form.designationCode} onChange={(e) => setField("designationCode", e.target.value)} placeholder="HR-MGR" /></OrganisationField>
          <OrganisationField label="Designation name" required error={errors.designationName}><TextInput value={form.designationName} onChange={(e) => setField("designationName", e.target.value)} placeholder="HR Manager" /></OrganisationField>
          <OrganisationField label="Grade"><TextInput value={form.grade} onChange={(e) => setField("grade", e.target.value)} placeholder="M2" /></OrganisationField>
          <OrganisationField label="Job level"><TextInput type="number" min="0" value={form.jobLevel} onChange={(e) => setField("jobLevel", e.target.value)} /></OrganisationField>
          <OrganisationField label="Minimum salary"><TextInput type="number" min="0" step="0.01" value={form.minimumSalary} onChange={(e) => setField("minimumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Maximum salary" error={errors.maximumSalary}><TextInput type="number" min="0" step="0.01" value={form.maximumSalary} onChange={(e) => setField("maximumSalary", e.target.value)} /></OrganisationField>
          {/* edited by wali: Match the branch form's two-column layout for description and checkbox cards. */}
          <div className="wf-org-form-bottom-grid">
            <OrganisationField label="Description"><TextAreaInput rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} /></OrganisationField>
            <div className="wf-org-check-stack">
              <label className="wf-org-check"><input type="checkbox" checked={form.isManagerial} onChange={(e) => setField("isManagerial", e.target.checked)} /><span><strong>Managerial designation</strong><small>Can be used for leadership and approval roles.</small></span></label>
              <label className="wf-org-check"><input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} /><span><strong>Active designation</strong><small>Available when creating positions and employee assignments.</small></span></label>
            </div>
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

export function DesignationsPanel(props: Props) {
  // edited by wali: Enable shared trigger-origin motion for the designation toolbar and dialog.
  return (
    <OrganisationDialogMotionProvider>
      <DesignationsPanelContent {...props} />
    </OrganisationDialogMotionProvider>
  );
}


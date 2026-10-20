import {
  Building2,
  Edit3,
  GitBranch,
  MoreHorizontal,
  Network,
  Star,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useArchiveDepartment,
  useCreateDepartment,
  useDepartments,
  useOrganisationReferences,
  useUpdateDepartment,
} from "../hooks/useOrganisation";
import { useDesignations } from "../../departments/hooks/useOrganisation";
import type { Department, DepartmentInput } from "../types/organisation.types";
import { OrganisationConfirmDialog } from "./OrganisationConfirmDialog";
import { OrganisationDialog } from "./OrganisationDialog";
import { OrganisationEmptyState } from "./OrganisationEmptyState";
import {
  OrganisationField,
  TextAreaInput,
  TextInput,
} from "./OrganisationField";
import { OrganisationResourceToolbar } from "./OrganisationResourceToolbar";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationDialogMotionProvider, useRequiredOrganisationDialogMotion } from "./OrganisationDialogMotion";

interface Props {
  companyId?: string | undefined;
  canManage: boolean;
}

type StatusFilter = "all" | "active" | "inactive";

interface DepartmentFormState {
  branchId: string;
  parentDepartmentId: string;
  departmentCode: string;
  departmentName: string;
  description: string;
  costCenterCode: string;
  isActive: boolean;
}

const emptyForm: DepartmentFormState = {
  branchId: "",
  parentDepartmentId: "",
  departmentCode: "",
  departmentName: "",
  description: "",
  costCenterCode: "",
  isActive: true,
};

function fromDepartment(department: Department): DepartmentFormState {
  return {
    branchId: department.branchId ?? "",
    parentDepartmentId: department.parentDepartmentId ?? "",
    departmentCode: department.departmentCode,
    departmentName: department.departmentName,
    description: department.description ?? "",
    costCenterCode: department.costCenterCode ?? "",
    isActive: department.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function DepartmentsPanelContent({ companyId, canManage }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // edited by wali: Track the New department button as the create-dialog animation origin.
  const dialogMotion = useRequiredOrganisationDialogMotion();
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Department | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sortBy: "department_name" as const,
      sortOrder: "ASC" as const,
      ...(companyId ? { companyId } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status !== "all" ? { isActive: status === "active" } : {}),
    }),
    [companyId, deferredSearch, page, status],
  );

  const query = useDepartments(params);
  const references = useOrganisationReferences(companyId, Boolean(companyId));
  // edited by wali: Check whether this department already owns a designation before allowing branch changes.
  const designationUsageQuery = useDesignations({
    page: 1,
    limit: 1,
    sortBy: "designation_name",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    ...(editing ? { departmentId: editing.departmentId } : {}),
  }, Boolean(editing));
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const archiveMutation = useArchiveDepartment();
  const busy = createMutation.isPending || updateMutation.isPending;
  const departments = query.data?.departments ?? [];
  const pagination = query.data?.pagination;
  const hasLinkedDesignations = (designationUsageQuery.data?.pagination.total ?? 0) > 0;
  const branchUsageCheckUnavailable = Boolean(editing && designationUsageQuery.isError);
  const branchChangeCheckPending = Boolean(editing && (designationUsageQuery.isLoading || designationUsageQuery.isPlaceholderData || branchUsageCheckUnavailable));
  const branchChangeLocked = Boolean(editing && (hasLinkedDesignations || branchChangeCheckPending));

  useEffect(() => setPage(1), [companyId, deferredSearch, status]);

  const openCreate = useCallback(() => {
    if (!companyId) {
      toast.error("Select a company before creating a department.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }, [companyId]);

  function closeForm() {
    dialogMotion.close(() => { setFormOpen(false); setEditing(null); });
  }

  // edited by wali: Open the department dialog when launched from the Company Admin Create menu.
  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    if (canManage) openCreate();
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete("create");
    setSearchParams(cleanParams, { replace: true });
  }, [canManage, openCreate, searchParams, setSearchParams]);

  function openEdit(department: Department) {
    dialogMotion.reset();
    setEditing(department);
    setForm(fromDepartment(department));
    setErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof DepartmentFormState>(key: K, value: DepartmentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setBranchId(branchId: string) {
    setForm((current) => {
      const parent = references.departments.find(
        (department) => department.departmentId === current.parentDepartmentId,
      );
      const parentFitsBranch = !parent?.branchId || parent.branchId === branchId;
      return {
        ...current,
        branchId,
        parentDepartmentId: parentFitsBranch ? current.parentDepartmentId : "",
      };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.departmentCode.trim().length < 2) nextErrors.departmentCode = "Enter a department code.";
    if (form.departmentName.trim().length < 2) nextErrors.departmentName = "Enter a department name.";
    if (editing && form.parentDepartmentId === editing.departmentId) nextErrors.parentDepartmentId = "A department cannot be its own parent.";
    if (editing && form.branchId !== (editing.branchId ?? "") && hasLinkedDesignations) {
      nextErrors.branchId = "This department's branch cannot be changed because it has designations.";
    } else if (editing && form.branchId !== (editing.branchId ?? "") && branchChangeCheckPending) {
      nextErrors.branchId = "Could not verify designation usage. Try again before changing the branch.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: DepartmentInput = {
      ...(!editing && companyId ? { companyId } : {}),
      branchId: nullable(form.branchId),
      parentDepartmentId: nullable(form.parentDepartmentId),
      departmentCode: form.departmentCode.trim(),
      departmentName: form.departmentName.trim(),
      description: nullable(form.description),
      costCenterCode: nullable(form.costCenterCode),
      isActive: form.isActive,
    };

    try {
      if (editing) {
        const updateInput: Partial<DepartmentInput> = { ...input };
        delete updateInput.companyId;
        await updateMutation.mutateAsync({ departmentId: editing.departmentId, input: updateInput });
        toast.success("Department updated successfully");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Department created successfully");
      }
      closeForm();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.departmentId);
      toast.success("Department archived successfully");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  const error = query.isError ? normalizeApiError(query.error).message : undefined;

  return (
    <section className="wf-org-resource">
      <OrganisationResourceToolbar
        title="Departments"
        description="Define functional teams, cost centres and reporting relationships."
        search={search}
        total={pagination?.total ?? 0}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        activeFilter={status}
        canCreate={canManage && Boolean(companyId)}
        isFetching={query.isFetching}
        createLabel="New department"
        onSearchChange={setSearch}
        onActiveFilterChange={setStatus}
        onCreate={openCreate}
        onRefresh={() => void query.refetch()}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(pagination?.totalPages ?? 1, current + 1))}
      />

      {query.isLoading ? (
        <div className="wf-org-table-skeleton">Loading departments…</div>
      ) : error || departments.length === 0 ? (
        <OrganisationEmptyState
          title={deferredSearch || status !== "all" ? "No matching departments" : "No departments configured"}
          description={deferredSearch || status !== "all" ? "Adjust the search or status filter." : "Create functional teams before assigning employees."}
          error={error}
          canCreate={canManage && Boolean(companyId)}
          onCreate={openCreate}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Department</th><th>Branch</th><th>Parent</th><th>Cost centre</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.departmentId}>
                  <td>
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><Network size={17} /></span>
                      <div><strong>{department.departmentName}</strong><small>{department.departmentCode}</small></div>
                    </div>
                  </td>
                  <td><span className="wf-org-muted-line"><Building2 size={14} /> {department.branchName ?? "Company-wide"}</span></td>
                  <td><span className="wf-org-muted-line"><GitBranch size={14} /> {department.parentDepartmentName ?? "Root department"}</span></td>
                  <td>{department.costCenterCode ?? "—"}</td>
                  <td><span className={`wf-org-status ${department.isActive ? "is-active" : "is-inactive"}`}>{department.isActive ? "Active" : "Inactive"}</span></td>
                  <td>
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={() => openEdit(department)} title="Edit"><Edit3 size={15} /></button>
                        <button type="button" onClick={() => setArchiveTarget(department)} title="Archive"><MoreHorizontal size={16} /></button>
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
        title={editing ? "Edit department" : "Create department"}
        subtitle="Set the functional hierarchy and optional branch scope."
        submitLabel={editing ? "Save changes" : "Create department"}
        busy={busy}
        onClose={closeForm}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          <OrganisationField label="Department code" required error={errors.departmentCode}><TextInput value={form.departmentCode} onChange={(e) => setField("departmentCode", e.target.value)} placeholder="HR" /></OrganisationField>
          <OrganisationField label="Department name" required error={errors.departmentName}><TextInput value={form.departmentName} onChange={(e) => setField("departmentName", e.target.value)} placeholder="Human Resources" /></OrganisationField>
          {/* edited by wali: Mark the company's current Head Office in the branch picker. */}
          {/* edited by wali: Lock department branch changes once a designation is attached. */}
          <OrganisationField label="Branch" error={errors.branchId} hint={branchUsageCheckUnavailable ? "Could not check designation usage. Branch changes are disabled." : branchChangeCheckPending ? "Checking whether this department has designations…" : hasLinkedDesignations ? "Branch cannot be changed while this department has designations." : "Leave empty for a company-wide department."}>
            <EmployeeMenuSelect
              className="wf-org-menu-select"
              value={form.branchId}
              placeholder="Company-wide"
              options={references.branches.map((branch) => ({
                value: branch.branchId,
                label: branch.branchName,
                ...(branch.isHeadOffice ? { icon: <span className="emp-menu-select__head-office-marker"><Star size={13} fill="currentColor" aria-hidden="true" />Head Office</span> } : {}),
              }))}
              onChange={setBranchId}
              disabled={branchChangeLocked}
            />
          </OrganisationField>
          <OrganisationField label="Parent department" hint="Only company-wide departments and departments in the selected branch are available as parents." error={errors.parentDepartmentId}><EmployeeMenuSelect className="wf-org-menu-select" value={form.parentDepartmentId} placeholder="Root department" options={references.departments.filter((department) => department.departmentId !== editing?.departmentId && (!department.branchId || department.branchId === form.branchId)).map((department) => ({ value: department.departmentId, label: department.departmentName }))} onChange={(value) => setField("parentDepartmentId", value)} /></OrganisationField>
          <OrganisationField label="Cost centre code"><TextInput value={form.costCenterCode} onChange={(e) => setField("costCenterCode", e.target.value)} placeholder="CC-HR-01" /></OrganisationField>
          {/* edited by wali: Match the branch form's two-column layout for description and checkbox cards. */}
          <div className="wf-org-form-bottom-grid">
            <OrganisationField label="Description"><TextAreaInput rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} /></OrganisationField>
            <label className="wf-org-check"><input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} /><span><strong>Active department</strong><small>Available for employee assignments and reporting.</small></span></label>
          </div>
        </div>
      </OrganisationDialog>

      <OrganisationConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive department?"
        description={`${archiveTarget?.departmentName ?? "This department"} will no longer be available for new assignments. Existing employee history remains preserved.`}
        confirmLabel="Archive department"
        busy={archiveMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void archive()}
      />
    </section>
  );
}

export function DepartmentsPanel(props: Props) {
  // edited by wali: Enable shared trigger-origin motion for the department toolbar and dialog.
  return (
    <OrganisationDialogMotionProvider>
      <DepartmentsPanelContent {...props} />
    </OrganisationDialogMotionProvider>
  );
}

// edited by wali: Keep position management UI in its dedicated feature folder.
import {
  BriefcaseBusiness,
  Building2,
  CircleDot,
  Edit3,
  MoreHorizontal,
  Network,
  Star,
  UsersRound,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useClosePosition,
  useCreatePosition,
  useAllPositions,
  usePositions,
  useUpdatePosition,
} from "../hooks/usePositions";
import { useOrganisationReferences } from "../../organisation/hooks/useOrganisation";
import type {
  Position,
  PositionInput,
  PositionStatus,
} from "../types/position.types";
import { OrganisationConfirmDialog } from "../../organisation/components/OrganisationConfirmDialog";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import {
  OrganisationField,
  TextInput,
} from "../../organisation/components/OrganisationField";
import { OrganisationResourceToolbar } from "../../organisation/components/OrganisationResourceToolbar";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationDialogMotionProvider, useRequiredOrganisationDialogMotion } from "../../organisation/components/OrganisationDialogMotion";

interface Props {
  companyId?: string | undefined;
  canManage: boolean;
  view: "list" | "cards";
  onViewChange: (view: "list" | "cards") => void;
}

type StatusFilter = "all" | "active" | "inactive";

interface PositionFormState {
  branchId: string;
  departmentId: string;
  designationId: string;
  reportsToPositionId: string;
  positionCode: string;
  positionTitle: string;
  positionType: string;
  approvedHeadcount: string;
  minimumSalary: string;
  maximumSalary: string;
  currencyCode: string;
  positionStatus: PositionStatus;
  effectiveFrom: string;
  effectiveTo: string;
}

const emptyForm: PositionFormState = {
  branchId: "",
  departmentId: "",
  designationId: "",
  reportsToPositionId: "",
  positionCode: "",
  positionTitle: "",
  positionType: "PERMANENT",
  approvedHeadcount: "1",
  minimumSalary: "",
  maximumSalary: "",
  currencyCode: "PKR",
  positionStatus: "ACTIVE",
  effectiveFrom: "",
  effectiveTo: "",
};

function fromPosition(position: Position): PositionFormState {
  return {
    branchId: position.branchId ?? "",
    departmentId: position.departmentId ?? "",
    designationId: position.designationId ?? "",
    reportsToPositionId: position.reportsToPositionId ?? "",
    positionCode: position.positionCode,
    positionTitle: position.positionTitle,
    positionType: position.positionType,
    approvedHeadcount: String(position.approvedHeadcount),
    minimumSalary: position.minimumSalary === null ? "" : String(position.minimumSalary),
    maximumSalary: position.maximumSalary === null ? "" : String(position.maximumSalary),
    currencyCode: position.currencyCode,
    positionStatus: position.positionStatus,
    effectiveFrom: position.effectiveFrom ?? "",
    effectiveTo: position.effectiveTo ?? "",
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function money(value: number | null, currency: string): string {
  // edited by wali: Escaped Unicode keeps salary dashes readable across file encodings.
  if (value === null) return "\u2014";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function PositionsPanelContent({ companyId, canManage, view, onViewChange }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Position | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // edited by wali: Track the New position button as the create-dialog animation origin.
  const dialogMotion = useRequiredOrganisationDialogMotion();
  const [form, setForm] = useState<PositionFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [closeTarget, setCloseTarget] = useState<Position | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sortBy: "position_title" as const,
      sortOrder: "ASC" as const,
      ...(companyId ? { companyId } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status === "active" ? { positionStatus: "ACTIVE" } : {}),
      ...(status === "inactive" ? { positionStatus: "INACTIVE" } : {}),
    }),
    [companyId, deferredSearch, page, status],
  );

  const query = usePositions(params);
  const allCompanyPositionsQuery = useAllPositions(companyId, Boolean(companyId));
  const references = useOrganisationReferences(companyId, Boolean(companyId));
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const closeMutation = useClosePosition();
  const busy = createMutation.isPending || updateMutation.isPending;
  const positions = query.data?.positions ?? [];
  const pagination = query.data?.pagination;
  // edited by wali: Keep a filled position's organisational scope fixed after an employee is assigned.
  const positionScopeLocked = Boolean(editing && editing.filledHeadcount > 0);
  // edited by wali: A designation can back one position, so check beyond the visible page.
  const usedDesignationIds = new Set(
    (allCompanyPositionsQuery.data ?? references.positions)
      .filter((position) => position.positionId !== editing?.positionId && position.designationId)
      .map((position) => position.designationId!),
  );
  const availableDesignations = references.designations.filter(
    (designation) =>
      designation.departmentId === form.departmentId &&
      (!usedDesignationIds.has(designation.designationId) || designation.designationId === editing?.designationId),
  );
  const managerialDesignationIds = new Set(
    references.designations
      .filter((designation) => designation.isManagerial)
      .map((designation) => designation.designationId),
  );
  const parentPositionOptions = references.positions.filter((position) =>
    Boolean(
      form.departmentId &&
      position.departmentId === form.departmentId &&
      position.designationId &&
      managerialDesignationIds.has(position.designationId) &&
      position.positionId !== editing?.positionId
    ),
  );

  useEffect(() => setPage(1), [companyId, deferredSearch, status]);

  function openCreate() {
    if (!companyId) {
      toast.error("Select a company before creating a position.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(position: Position, event: MouseEvent<HTMLButtonElement>) {
    dialogMotion.capture(event);
    setEditing(position);
    setForm(fromPosition(position));
    setErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    dialogMotion.close(() => { setFormOpen(false); setEditing(null); });
  }

  function setField<K extends keyof PositionFormState>(key: K, value: PositionFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.positionCode.trim().length < 2) nextErrors.positionCode = "Enter a position code.";
    if (form.positionTitle.trim().length < 2) nextErrors.positionTitle = "Enter a position title.";
    if (!form.departmentId) nextErrors.departmentId = "Select a department.";
    if (!form.designationId) nextErrors.designationId = "Select a designation.";
    if (positionScopeLocked && (
      form.branchId !== (editing?.branchId ?? "") ||
      form.departmentId !== (editing?.departmentId ?? "") ||
      form.designationId !== (editing?.designationId ?? "")
    )) {
      nextErrors.departmentId = "Branch, department, and designation cannot be changed while employees are assigned to this position.";
    }
    if (!Number.isInteger(Number(form.approvedHeadcount)) || Number(form.approvedHeadcount) < 1) {
      nextErrors.approvedHeadcount = "Approved headcount must be at least 1.";
    }
    if (form.minimumSalary && form.maximumSalary && Number(form.minimumSalary) > Number(form.maximumSalary)) {
      nextErrors.maximumSalary = "Maximum salary must be greater than or equal to minimum salary.";
    }
    if (form.effectiveFrom && form.effectiveTo && form.effectiveFrom > form.effectiveTo) {
      nextErrors.effectiveTo = "Effective-to date cannot be before effective-from date.";
    }
    if (editing && form.reportsToPositionId === editing.positionId) {
      nextErrors.reportsToPositionId = "A position cannot report to itself.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: PositionInput = {
      ...(!editing && companyId ? { companyId } : {}),
      branchId: nullable(form.branchId),
      departmentId: form.departmentId,
      designationId: form.designationId,
      reportsToPositionId: nullable(form.reportsToPositionId),
      positionCode: form.positionCode.trim(),
      positionTitle: form.positionTitle.trim(),
      positionType: form.positionType.trim().toUpperCase(),
      approvedHeadcount: Number(form.approvedHeadcount),
      minimumSalary: nullableNumber(form.minimumSalary),
      maximumSalary: nullableNumber(form.maximumSalary),
      currencyCode: form.currencyCode.trim().toUpperCase(),
      positionStatus: form.positionStatus,
      effectiveFrom: nullable(form.effectiveFrom),
      effectiveTo: nullable(form.effectiveTo),
    };

    try {
      if (editing) {
        const updateInput: Partial<PositionInput> = { ...input };
        delete updateInput.companyId;
        await updateMutation.mutateAsync({ positionId: editing.positionId, input: updateInput });
        toast.success("Position updated successfully");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Position created successfully");
      }
      closeForm();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function closePosition() {
    if (!closeTarget) return;
    try {
      await closeMutation.mutateAsync(closeTarget.positionId);
      toast.success("Position closed successfully");
      setCloseTarget(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  const error = query.isError ? normalizeApiError(query.error).message : undefined;

  return (
    <section className="wf-org-resource">
      <OrganisationResourceToolbar
        title="Positions"
        description="Control approved seats, vacancies and position reporting lines."
        search={search}
        total={pagination?.total ?? 0}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        activeFilter={status}
        canCreate={canManage && Boolean(companyId)}
        isFetching={query.isFetching}
        createLabel="New position"
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
        <div className="wf-org-table-skeleton">Loading positionsÃ¢â‚¬Â¦</div>
      ) : error || positions.length === 0 ? (
        <OrganisationEmptyState
          title={deferredSearch || status !== "all" ? "No matching positions" : "No positions configured"}
          description={deferredSearch || status !== "all" ? "Adjust the search or status filter." : "Create approved workforce seats before assigning employees."}
          error={error}
          canCreate={canManage && Boolean(companyId)}
          onCreate={openCreate}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Position</th><th>Organisation</th><th>Headcount</th><th>Salary range</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.positionId}>
                  <td data-label="Position">
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><BriefcaseBusiness size={17} /></span>
                      <div><strong>{position.positionTitle}</strong><small>{/* edited by wali: Escaped middle dot keeps the position-code separator encoding-safe. */}{position.positionCode} {"\u00b7"} {position.positionType}</small></div>
                    </div>
                  </td>
                  <td data-label="Organisation">
                    <div className="wf-org-contact-lines">
                      <span><Building2 size={13} /> {position.branchName ?? "Company-wide"}</span>
                      <span><Network size={13} /> {position.departmentName ?? "No department"}</span>
                    </div>
                  </td>
                  <td data-label="Headcount">
                    <div className="wf-org-headcount">
                      <span><UsersRound size={14} /> {position.filledHeadcount} / {position.approvedHeadcount}</span>
                      <small>{position.availableHeadcount} available</small>
                    </div>
                  </td>
                  <td data-label="Salary range">{money(position.minimumSalary, position.currencyCode)} {"\u2013"} {money(position.maximumSalary, position.currencyCode)}</td>
                  <td data-label="Status"><span className={`wf-org-status is-${position.positionStatus.toLowerCase()}`}><CircleDot size={11} /> {position.positionStatus}</span></td>
                  <td data-label="Actions">
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={(event) => openEdit(position, event)} title="Edit"><Edit3 size={15} /></button>
                        {position.positionStatus !== "CLOSED" ? <button type="button" onClick={() => setCloseTarget(position)} title="Close"><MoreHorizontal size={16} /></button> : null}
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
        title={editing ? "Edit position" : "Create position"}
        subtitle="Define an approved workforce seat and its reporting placement."
        submitLabel={editing ? "Save changes" : "Create position"}
        busy={busy}
        onClose={closeForm}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          <OrganisationField label="Position code" required error={errors.positionCode} hint={form.designationId ? "Filled from the selected designation code. You can edit it if needed." : undefined}><TextInput value={form.positionCode} onChange={(e) => setField("positionCode", e.target.value)} placeholder="Select a designation to fill its code" /></OrganisationField>
          <OrganisationField label="Position title" required error={errors.positionTitle}><TextInput value={form.positionTitle} onChange={(e) => setField("positionTitle", e.target.value)} placeholder="HR Manager" /></OrganisationField>
          <OrganisationField label="Position type"><EmployeeMenuSelect className="wf-org-menu-select" value={form.positionType} placeholder="Select position type" options={[{ value: "PERMANENT", label: "Permanent" }, { value: "CONTRACT", label: "Contract" }, { value: "TEMPORARY", label: "Temporary" }, { value: "INTERNSHIP", label: "Internship" }]} onChange={(value) => setField("positionType", value)} allowClear={false} /></OrganisationField>
          <OrganisationField label="Approved headcount" required error={errors.approvedHeadcount}><TextInput type="number" min="1" max="65535" value={form.approvedHeadcount} onChange={(e) => setField("approvedHeadcount", e.target.value)} /></OrganisationField>
          {/* edited by wali: Identify the current Head Office when selecting a position branch. */}
          <OrganisationField label="Branch" hint={positionScopeLocked ? "Branch cannot be changed while employees are assigned to this position." : undefined}><EmployeeMenuSelect className="wf-org-menu-select" value={form.branchId} placeholder="Select branch" options={references.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName, ...(branch.isHeadOffice ? { icon: <span className="emp-menu-select__head-office-marker"><Star size={13} fill="currentColor" aria-hidden="true" />Head Office</span> } : {}) }))} onChange={(value) => setForm((current) => ({ ...current, branchId: value, departmentId: "", designationId: "", reportsToPositionId: "" }))} disabled={positionScopeLocked} /></OrganisationField>
          <OrganisationField label="Department" required error={errors.departmentId} hint={positionScopeLocked ? "Department cannot be changed while employees are assigned to this position." : !form.branchId ? "Select a branch first." : undefined}><EmployeeMenuSelect className="wf-org-menu-select" value={form.departmentId} placeholder={form.branchId ? "Select department" : "Select branch first"} options={references.departments.filter((department) => !department.branchId || department.branchId === form.branchId).map((department) => ({ value: department.departmentId, label: department.departmentName }))} onChange={(value) => setForm((current) => ({ ...current, departmentId: value, designationId: "", reportsToPositionId: "" }))} disabled={positionScopeLocked || !form.branchId} /></OrganisationField>
          <OrganisationField label="Designation" required error={errors.designationId} hint={positionScopeLocked ? "Designation cannot be changed while employees are assigned to this position." : !form.departmentId ? "Select a department first." : allCompanyPositionsQuery.isLoading ? "Checking which designations are already assigned." : allCompanyPositionsQuery.isError ? "Could not check existing positions. Refresh and try again." : undefined}><EmployeeMenuSelect className="wf-org-menu-select" value={form.designationId} placeholder={!form.departmentId ? "Select department first" : allCompanyPositionsQuery.isLoading ? "Checking assigned designations" : allCompanyPositionsQuery.isError ? "Could not check assigned designations" : availableDesignations.length ? "Select designation" : "All designations already have positions"} options={availableDesignations.map((designation) => ({ value: designation.designationId, label: designation.designationName }))} onChange={(value) => { const designation = availableDesignations.find((item) => item.designationId === value); setForm((current) => ({ ...current, designationId: value, ...(designation ? { positionCode: designation.designationCode } : {}) })); }} disabled={positionScopeLocked || !form.departmentId || allCompanyPositionsQuery.isLoading || allCompanyPositionsQuery.isError} allowClear={false} /></OrganisationField>
          <OrganisationField label="Reports to position" hint={!form.departmentId ? "Select a department to see managerial positions." : undefined} error={errors.reportsToPositionId}><EmployeeMenuSelect className="wf-org-menu-select" value={form.reportsToPositionId} placeholder={!form.departmentId ? "Select department first" : parentPositionOptions.length ? "Select parent position" : "No managerial positions in this department"} options={parentPositionOptions.map((position) => ({ value: position.positionId, label: position.positionTitle }))} onChange={(value) => setField("reportsToPositionId", value)} disabled={!form.departmentId || parentPositionOptions.length === 0} /></OrganisationField>
          <OrganisationField label="Minimum salary"><TextInput type="number" min="0" step="0.01" value={form.minimumSalary} onChange={(e) => setField("minimumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Maximum salary" error={errors.maximumSalary}><TextInput type="number" min="0" step="0.01" value={form.maximumSalary} onChange={(e) => setField("maximumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Currency code"><TextInput value={form.currencyCode} maxLength={3} onChange={(e) => setField("currencyCode", e.target.value.toUpperCase())} /></OrganisationField>
          <OrganisationField label="Status"><EmployeeMenuSelect className="wf-org-menu-select" value={form.positionStatus} placeholder="Select status" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }, { value: "FROZEN", label: "Frozen" }, { value: "CLOSED", label: "Closed" }]} onChange={(value) => setField("positionStatus", value as PositionStatus)} allowClear={false} /></OrganisationField>
          <OrganisationField label="Effective from"><TextInput type="date" value={form.effectiveFrom} onChange={(e) => setField("effectiveFrom", e.target.value)} /></OrganisationField>
          <OrganisationField label="Effective to" error={errors.effectiveTo}><TextInput type="date" value={form.effectiveTo} onChange={(e) => setField("effectiveTo", e.target.value)} /></OrganisationField>
        </div>
      </OrganisationDialog>

      <OrganisationConfirmDialog
        open={Boolean(closeTarget)}
        title="Close position?"
        description={`${closeTarget?.positionTitle ?? "This position"} will be closed and will no longer accept employee assignments.`}
        confirmLabel="Close position"
        busy={closeMutation.isPending}
        onClose={() => setCloseTarget(null)}
        onConfirm={() => void closePosition()}
      />
    </section>
  );
}

export function PositionsPanel(props: Props) {
  // edited by wali: Enable shared trigger-origin motion for the position toolbar and dialog.
  return (
    <OrganisationDialogMotionProvider>
      <PositionsPanelContent {...props} />
    </OrganisationDialogMotionProvider>
  );
}


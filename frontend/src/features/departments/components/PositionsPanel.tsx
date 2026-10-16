import {
  BriefcaseBusiness,
  Building2,
  CircleDot,
  Edit3,
  MoreHorizontal,
  Network,
  UsersRound,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useClosePosition,
  useCreatePosition,
  useOrganisationReferences,
  usePositions,
  useUpdatePosition,
} from "../hooks/useOrganisation";
import type {
  Position,
  PositionInput,
  PositionStatus,
} from "../types/organisation.types";
import { OrganisationConfirmDialog } from "./OrganisationConfirmDialog";
import { OrganisationDialog } from "./OrganisationDialog";
import { OrganisationEmptyState } from "./OrganisationEmptyState";
import {
  OrganisationField,
  SelectInput,
  TextInput,
} from "./OrganisationField";
import { OrganisationResourceToolbar } from "./OrganisationResourceToolbar";

interface Props {
  companyId?: string | undefined;
  canManage: boolean;
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
  if (value === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PositionsPanel({ companyId, canManage }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Position | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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
  const references = useOrganisationReferences(companyId, Boolean(companyId));
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const closeMutation = useClosePosition();
  const busy = createMutation.isPending || updateMutation.isPending;
  const positions = query.data?.positions ?? [];
  const pagination = query.data?.pagination;

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

  function openEdit(position: Position) {
    setEditing(position);
    setForm(fromPosition(position));
    setErrors({});
    setFormOpen(true);
  }

  function setField<K extends keyof PositionFormState>(key: K, value: PositionFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.positionCode.trim().length < 2) nextErrors.positionCode = "Enter a position code.";
    if (form.positionTitle.trim().length < 2) nextErrors.positionTitle = "Enter a position title.";
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
      departmentId: nullable(form.departmentId),
      designationId: nullable(form.designationId),
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
      setFormOpen(false);
      setEditing(null);
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
      />

      {query.isLoading ? (
        <div className="wf-org-table-skeleton">Loading positions…</div>
      ) : error || positions.length === 0 ? (
        <OrganisationEmptyState
          title={deferredSearch || status !== "all" ? "No matching positions" : "No positions configured"}
          description={deferredSearch || status !== "all" ? "Adjust the search or status filter." : "Create approved workforce seats before assigning employees."}
          error={error}
          canCreate={canManage && Boolean(companyId)}
          onCreate={openCreate}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Position</th><th>Organisation</th><th>Headcount</th><th>Salary range</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.positionId}>
                  <td>
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><BriefcaseBusiness size={17} /></span>
                      <div><strong>{position.positionTitle}</strong><small>{position.positionCode} · {position.positionType}</small></div>
                    </div>
                  </td>
                  <td>
                    <div className="wf-org-contact-lines">
                      <span><Building2 size={13} /> {position.branchName ?? "Company-wide"}</span>
                      <span><Network size={13} /> {position.departmentName ?? "No department"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="wf-org-headcount">
                      <span><UsersRound size={14} /> {position.filledHeadcount} / {position.approvedHeadcount}</span>
                      <small>{position.availableHeadcount} available</small>
                    </div>
                  </td>
                  <td>{money(position.minimumSalary, position.currencyCode)} – {money(position.maximumSalary, position.currencyCode)}</td>
                  <td><span className={`wf-org-status is-${position.positionStatus.toLowerCase()}`}><CircleDot size={11} /> {position.positionStatus}</span></td>
                  <td>
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={() => openEdit(position)} title="Edit"><Edit3 size={15} /></button>
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
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          <OrganisationField label="Position code" required error={errors.positionCode}><TextInput value={form.positionCode} onChange={(e) => setField("positionCode", e.target.value)} placeholder="HR-MGR-01" /></OrganisationField>
          <OrganisationField label="Position title" required error={errors.positionTitle}><TextInput value={form.positionTitle} onChange={(e) => setField("positionTitle", e.target.value)} placeholder="HR Manager" /></OrganisationField>
          <OrganisationField label="Position type"><SelectInput value={form.positionType} onChange={(e) => setField("positionType", e.target.value)}><option value="PERMANENT">Permanent</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option><option value="INTERNSHIP">Internship</option></SelectInput></OrganisationField>
          <OrganisationField label="Approved headcount" required error={errors.approvedHeadcount}><TextInput type="number" min="1" max="65535" value={form.approvedHeadcount} onChange={(e) => setField("approvedHeadcount", e.target.value)} /></OrganisationField>
          <OrganisationField label="Branch"><SelectInput value={form.branchId} onChange={(e) => setField("branchId", e.target.value)}><option value="">Company-wide</option>{references.branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.branchName}</option>)}</SelectInput></OrganisationField>
          <OrganisationField label="Department"><SelectInput value={form.departmentId} onChange={(e) => setField("departmentId", e.target.value)}><option value="">No department</option>{references.departments.filter((department) => !form.branchId || !department.branchId || department.branchId === form.branchId).map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName}</option>)}</SelectInput></OrganisationField>
          <OrganisationField label="Designation"><SelectInput value={form.designationId} onChange={(e) => setField("designationId", e.target.value)}><option value="">No designation</option>{references.designations.map((designation) => <option key={designation.designationId} value={designation.designationId}>{designation.designationName}</option>)}</SelectInput></OrganisationField>
          <OrganisationField label="Reports to position" error={errors.reportsToPositionId}><SelectInput value={form.reportsToPositionId} onChange={(e) => setField("reportsToPositionId", e.target.value)}><option value="">No parent position</option>{references.positions.filter((position) => position.positionId !== editing?.positionId).map((position) => <option key={position.positionId} value={position.positionId}>{position.positionTitle}</option>)}</SelectInput></OrganisationField>
          <OrganisationField label="Minimum salary"><TextInput type="number" min="0" step="0.01" value={form.minimumSalary} onChange={(e) => setField("minimumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Maximum salary" error={errors.maximumSalary}><TextInput type="number" min="0" step="0.01" value={form.maximumSalary} onChange={(e) => setField("maximumSalary", e.target.value)} /></OrganisationField>
          <OrganisationField label="Currency code"><TextInput value={form.currencyCode} maxLength={3} onChange={(e) => setField("currencyCode", e.target.value.toUpperCase())} /></OrganisationField>
          <OrganisationField label="Status"><SelectInput value={form.positionStatus} onChange={(e) => setField("positionStatus", e.target.value as PositionStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="FROZEN">Frozen</option><option value="CLOSED">Closed</option></SelectInput></OrganisationField>
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

import {
  Building2,
  Edit3,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Star,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useArchiveBranch,
  useBranches,
  useCreateBranch,
  useUpdateBranch,
} from "../hooks/useBranches";
import type { Branch, BranchInput } from "../types/branch.types";
import { branchFormSchema } from "../schemas/branch.schema";
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
}

type StatusFilter = "all" | "active" | "inactive";

interface BranchFormState {
  branchCode: string;
  branchName: string;
  branchType: string;
  officialEmail: string;
  officialPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  countryCode: string;
  timezone: string;
  latitude: string;
  longitude: string;
  isHeadOffice: boolean;
  isActive: boolean;
}

const emptyForm: BranchFormState = {
  branchCode: "",
  branchName: "",
  branchType: "",
  officialEmail: "",
  officialPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
  countryCode: "PK",
  timezone: "Asia/Karachi",
  latitude: "",
  longitude: "",
  isHeadOffice: false,
  isActive: true,
};

function fromBranch(branch: Branch): BranchFormState {
  return {
    branchCode: branch.branchCode,
    branchName: branch.branchName,
    branchType: branch.branchType ?? "",
    officialEmail: branch.officialEmail ?? "",
    officialPhone: branch.officialPhone ?? "",
    addressLine1: branch.addressLine1 ?? "",
    addressLine2: branch.addressLine2 ?? "",
    city: branch.city ?? "",
    district: branch.district ?? "",
    province: branch.province ?? "",
    postalCode: branch.postalCode ?? "",
    countryCode: branch.countryCode,
    timezone: branch.timezone,
    latitude: branch.latitude === null ? "" : String(branch.latitude),
    longitude: branch.longitude === null ? "" : String(branch.longitude),
    isHeadOffice: branch.isHeadOffice,
    isActive: branch.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function BranchesPanelContent({ companyId, canManage }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const dialogMotion = useRequiredOrganisationDialogMotion();
  const [form, setForm] = useState<BranchFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<Branch | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sortBy: "branch_name" as const,
      sortOrder: "ASC" as const,
      ...(companyId ? { companyId } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status !== "all" ? { isActive: status === "active" } : {}),
    }),
    [companyId, deferredSearch, page, status],
  );

  const query = useBranches(params);
  // edited by wali: Check the company-wide Head Office flag independently of the paginated list.
  const headOfficeQuery = useBranches({
    page: 1,
    limit: 1,
    sortBy: "branch_name",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    isHeadOffice: true,
  });
  // edited by wali: Legacy Head Office branch types must be changed before assigning another.
  const headOfficeTypeQuery = useBranches({
    page: 1,
    limit: 1,
    sortBy: "branch_name",
    sortOrder: "ASC",
    ...(companyId ? { companyId } : {}),
    branchType: "HEAD_OFFICE",
  });
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const archiveMutation = useArchiveBranch();
  const busy = createMutation.isPending || updateMutation.isPending;
  const branches = query.data?.branches ?? [];
  const pagination = query.data?.pagination;

  useEffect(() => setPage(1), [companyId, deferredSearch, status]);

  const openCreate = useCallback(() => {
    if (!companyId) {
      toast.error("Select a company before creating a branch.");
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }, [companyId]);

  // edited by wali: Open the branch dialog when launched from the Company Admin Create menu.
  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    if (canManage) openCreate();
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete("create");
    setSearchParams(cleanParams, { replace: true });
  }, [canManage, openCreate, searchParams, setSearchParams]);

  function openEdit(branch: Branch) {
    dialogMotion.reset();
    setEditing(branch);
    setForm(fromBranch(branch));
    setErrors({});
    setFormOpen(true);
  }

  // edited by wali: Use the shared dialog motion provider when closing the branch form.
  function closeForm(): void {
    dialogMotion.close(() => { setFormOpen(false); setEditing(null); });
  }

  function setField<K extends keyof BranchFormState>(key: K, value: BranchFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // edited by wali: Keep the Head Office checkbox and branch type synchronized.
  function setHeadOffice(checked: boolean): void {
    const otherHeadOffice = [
      ...(!headOfficeQuery.isPlaceholderData ? headOfficeQuery.data?.branches ?? [] : []),
      ...(!headOfficeTypeQuery.isPlaceholderData ? headOfficeTypeQuery.data?.branches ?? [] : []),
    ].find((branch) => branch.branchId !== editing?.branchId);

    if (checked && otherHeadOffice) {
      toast.error("A head office already exists. Edit that branch, clear its Head Office checkbox, and change its Branch type first.");
      return;
    }

    setForm((current) => ({
      ...current,
      isHeadOffice: checked,
      ...(checked ? { branchType: "HEAD_OFFICE" } : {}),
    }));
  }

  // edited by wali: Changing away from HEAD_OFFICE clears the primary-office flag too.
  function setBranchType(value: string): void {
    if (value.trim().toUpperCase() === "HEAD_OFFICE") {
      setHeadOffice(true);
      return;
    }

    setForm((current) => ({
      ...current,
      branchType: value,
      isHeadOffice: false,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    // edited by wali: Use the Branches feature schema for form validation.
    const validation = branchFormSchema.safeParse(form);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") nextErrors[field] = issue.message;
      }
    }
    if (!editing && !companyId) nextErrors.companyId = "Select a company.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: BranchInput = {
      ...(!editing && companyId ? { companyId } : {}),
      branchCode: form.branchCode.trim(),
      branchName: form.branchName.trim(),
      branchType: nullable(form.branchType),
      officialEmail: nullable(form.officialEmail),
      officialPhone: nullable(form.officialPhone),
      addressLine1: nullable(form.addressLine1),
      addressLine2: nullable(form.addressLine2),
      city: nullable(form.city),
      district: nullable(form.district),
      province: nullable(form.province),
      postalCode: nullable(form.postalCode),
      countryCode: form.countryCode.trim().toUpperCase(),
      timezone: form.timezone.trim(),
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      isHeadOffice: form.isHeadOffice,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        const updateInput: Partial<BranchInput> = { ...input };
        delete updateInput.companyId;
        await updateMutation.mutateAsync({ branchId: editing.branchId, input: updateInput });
        toast.success("Branch updated successfully");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Branch created successfully");
      }
      closeForm();
      setEditing(null);
    } catch (error) {
      const apiError = normalizeApiError(error);
      toast.error(
        apiError.code === "BRANCH_LIMIT_REACHED"
          ? "This company has reached the branch limit for its subscription plan."
          : apiError.message,
      );
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.branchId);
      toast.success("Branch archived successfully");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  const error = query.isError ? normalizeApiError(query.error).message : undefined;

  return (
    <section className="wf-org-resource">
      <OrganisationResourceToolbar
        title="Company Footprints"
        description="Manage head offices, regional offices and operational locations."
        search={search}
        total={pagination?.total ?? 0}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        activeFilter={status}
        canCreate={canManage && Boolean(companyId)}
        isFetching={query.isFetching}
        createLabel="New branch"
        onSearchChange={setSearch}
        onActiveFilterChange={setStatus}
        onCreate={openCreate}
        onRefresh={() => void query.refetch()}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(pagination?.totalPages ?? 1, current + 1))}
      />

      {query.isLoading ? (
        <div className="wf-org-table-skeleton">Loading branches…</div>
      ) : error || branches.length === 0 ? (
        <OrganisationEmptyState
          title={deferredSearch || status !== "all" ? "No matching branches" : "No branches configured"}
          description={deferredSearch || status !== "all" ? "Adjust the search or status filter." : "Create the first location before assigning employees."}
          error={error}
          canCreate={canManage && Boolean(companyId)}
          onCreate={openCreate}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="wf-org-table-wrap">
          <table className="wf-org-table">
            <thead><tr><th>Branch</th><th>Type</th><th>Location</th><th>Contact</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.branchId}>
                  <td>
                    <div className="wf-org-record-title">
                      <span className="wf-org-record-icon"><Building2 size={17} /></span>
                      <div><strong>{branch.branchName}</strong><small>{branch.branchCode}</small></div>
                      {branch.isHeadOffice ? <em><Star size={12} /> Head office</em> : null}
                    </div>
                  </td>
                  <td>{branch.branchType ?? "—"}</td>
                  <td><span className="wf-org-muted-line"><MapPin size={14} /> {[branch.city, branch.province].filter(Boolean).join(", ") || "Not provided"}</span></td>
                  <td>
                    <div className="wf-org-contact-lines">
                      <span><Mail size={13} /> {branch.officialEmail ?? "—"}</span>
                      <span><Phone size={13} /> {branch.officialPhone ?? "—"}</span>
                    </div>
                  </td>
                  <td><span className={`wf-org-status ${branch.isActive ? "is-active" : "is-inactive"}`}>{branch.isActive ? "Active" : "Inactive"}</span></td>
                  <td>
                    {canManage ? (
                      <div className="wf-org-row-actions">
                        <button type="button" onClick={() => openEdit(branch)} title="Edit"><Edit3 size={15} /></button>
                        <button type="button" onClick={() => setArchiveTarget(branch)} title="Archive"><MoreHorizontal size={16} /></button>
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
        title={editing ? "Edit branch" : "Create branch"}
        subtitle="Location, contact and operating settings for this branch."
        submitLabel={editing ? "Save changes" : "Create branch"}
        busy={busy}
        onClose={closeForm}
        onSubmit={submit}
      >
        <div className="wf-org-form-grid">
          <OrganisationField label="Branch code" required error={errors.branchCode}><TextInput value={form.branchCode} onChange={(e) => setField("branchCode", e.target.value)} placeholder="LHR-HO" /></OrganisationField>
          <OrganisationField label="Branch name" required error={errors.branchName}><TextInput value={form.branchName} onChange={(e) => setField("branchName", e.target.value)} placeholder="Lahore Head Office" /></OrganisationField>
          <OrganisationField label="Branch type" hint="Choose a type or search to enter a custom one.">
            <EmployeeMenuSelect
              className="wf-org-menu-select"
              value={form.branchType}
              placeholder="Select or enter a branch type"
              searchPlaceholder="Search or type a custom branch type"
              searchable
              allowCustomValue
              customValueMaxLength={50}
              options={[{ value: "REGIONAL_OFFICE", label: "Regional office" }, { value: "SITE_OFFICE", label: "Site office" }, { value: "WAREHOUSE", label: "Warehouse" }, { value: "OTHER", label: "Other" }]}
              onChange={setBranchType}
            />
          </OrganisationField>
          <OrganisationField label="Official email"><TextInput type="email" value={form.officialEmail} onChange={(e) => setField("officialEmail", e.target.value)} /></OrganisationField>
          <OrganisationField label="Official phone"><TextInput value={form.officialPhone} onChange={(e) => setField("officialPhone", e.target.value)} /></OrganisationField>
          <OrganisationField label="City"><TextInput value={form.city} onChange={(e) => setField("city", e.target.value)} /></OrganisationField>
          <OrganisationField label="District"><TextInput value={form.district} onChange={(e) => setField("district", e.target.value)} /></OrganisationField>
          <OrganisationField label="Province"><TextInput value={form.province} onChange={(e) => setField("province", e.target.value)} /></OrganisationField>
          <OrganisationField label="Postal code"><TextInput value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} /></OrganisationField>
          <OrganisationField label="Country code"><TextInput value={form.countryCode} maxLength={2} onChange={(e) => setField("countryCode", e.target.value.toUpperCase())} /></OrganisationField>
          <OrganisationField label="Timezone"><TextInput value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} /></OrganisationField>
          <OrganisationField label="Latitude"><TextInput type="number" step="any" value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} /></OrganisationField>
          <OrganisationField label="Longitude"><TextInput type="number" step="any" value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} /></OrganisationField>
          <OrganisationField label="Address line 1"><TextInput value={form.addressLine1} onChange={(e) => setField("addressLine1", e.target.value)} /></OrganisationField>
          <OrganisationField label="Address line 2"><TextInput value={form.addressLine2} onChange={(e) => setField("addressLine2", e.target.value)} /></OrganisationField>
          {/* edited by wali: Require the previous head office to be cleared and retitled before reassignment. */}
          <label className="wf-org-check"><input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setHeadOffice(e.target.checked)} /><span><strong>Head office</strong><small>Mark this as the company’s primary location.</small></span></label>
          <label className="wf-org-check"><input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} /><span><strong>Active branch</strong><small>Available for assignments and operational use.</small></span></label>
        </div>
      </OrganisationDialog>

      <OrganisationConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive branch?"
        description={`${archiveTarget?.branchName ?? "This branch"} will no longer be available for new assignments. Existing history remains preserved.`}
        confirmLabel="Archive branch"
        busy={archiveMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void archive()}
      />
    </section>
  );
}

export function BranchesPanel(props: Props) {
  // edited by wali: Enable shared trigger-origin motion for the branch toolbar and dialog.
  return (
    <OrganisationDialogMotionProvider>
      <BranchesPanelContent {...props} />
    </OrganisationDialogMotionProvider>
  );
}

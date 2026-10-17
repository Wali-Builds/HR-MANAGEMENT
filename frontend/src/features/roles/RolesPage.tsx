// edited by wali: Create roles and grant permissions through the existing backend API.
import {
  AlertTriangle, Check, CheckCheck, CheckCircle2, CircleHelp, KeyRound,
  LoaderCircle, Plus, RefreshCw, Search, Shield, ShieldCheck, Trash2, UserCog, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "../../api/api-error";
import { usePermissions } from "../../hooks/usePermissions";
import {
  createRoleRequest, deleteRoleRequest, listPermissionsRequest, listRolesRequest,
  replaceRolePermissionsRequest, roleKeys, updateRoleRequest,
} from "./api/role.api";
import type { RoleInput, RolePermission, RoleRecord } from "./types/role.types";
import "./roles.css";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
interface RoleFormState {
  roleCode: string;
  roleName: string;
  description: string;
  isActive: boolean;
  permissionCodes: string[];
}
function initialForm(role: RoleRecord | null, presetCode: string | null): RoleFormState {
  return {
    roleCode: role?.roleCode ?? presetCode ?? "",
    roleName: role?.roleName ?? (presetCode === "COMPANY_ADMIN" ? "Company Administrator" : ""),
    description: role?.description ?? "",
    isActive: role?.isActive ?? true,
    permissionCodes: role?.permissions.map((item) => item.permissionCode) ?? [],
  };
}

function RoleDialog(props: {
  open: boolean;
  isPlatformAdmin: boolean;
  role: RoleRecord | null;
  permissions: RolePermission[];
  presetCode: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: RoleInput) => Promise<void>;
}) {
  const { open, isPlatformAdmin, role, permissions, presetCode, saving, onClose, onSave } = props;
  const [form, setForm] = useState(() => initialForm(role, presetCode));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm(initialForm(role, presetCode));
      setSearch("");
      setError("");
    }
  }, [open, role, presetCode]);

  const selected = useMemo(() => new Set(form.permissionCodes), [form.permissionCodes]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return permissions.filter((item) =>
      !term || [item.permissionCode, item.moduleName, item.actionName, item.description ?? ""]
        .join(" ").toLowerCase().includes(term),
    );
  }, [permissions, search]);
  const groups = useMemo(() => {
    const map = new Map<string, RolePermission[]>();
    filtered.forEach((item) => {
      const key = item.moduleName || "General";
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);
  if (!open) return null;

  function togglePermission(code: string) {
    setForm((current) => ({
      ...current,
      permissionCodes: current.permissionCodes.includes(code)
        ? current.permissionCodes.filter((item) => item !== code)
        : [...current.permissionCodes, code],
    }));
  }
  function toggleGroup(items: RolePermission[], select: boolean) {
    setForm((current) => {
      const codes = new Set(current.permissionCodes);
      items.forEach((item) => {
        if (select) codes.add(item.permissionCode);
        else codes.delete(item.permissionCode);
      });
      return { ...current, permissionCodes: [...codes] };
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const roleCode = form.roleCode.trim().toUpperCase();
    if (!role && !/^[A-Z0-9_-]{2,50}$/.test(roleCode)) {
      setError("Use 2 to 50 letters, numbers, underscores or hyphens for the role code.");
      return;
    }
    if (!role && roleCode === "PLATFORM_ADMIN") {
      setError("PLATFORM_ADMIN is reserved for the protected system role.");
      return;
    }
    // edited by wali: Company admins can create tenant roles, not platform-managed admin roles.
    if (!role && !isPlatformAdmin && roleCode === "COMPANY_ADMIN") {
      setError("COMPANY_ADMIN is reserved for Platform Administrator provisioning.");
      return;
    }
    if (form.roleName.trim().length < 2) {
      setError("Role name must contain at least 2 characters.");
      return;
    }
    if (!form.permissionCodes.length) {
      setError("Select at least one permission.");
      return;
    }
    await onSave({
      roleCode,
      roleName: form.roleName.trim(),
      description: form.description.trim() || null,
      isActive: form.isActive,
      permissionCodes: form.permissionCodes,
    });
  }

  const platformAdminRole = role?.roleCode === "PLATFORM_ADMIN";
  return (
    <div className="role-modal" role="dialog" aria-modal="true">
      <button type="button" className="role-modal__backdrop" onClick={onClose} aria-label="Close role form" />
      <form className="role-dialog" onSubmit={submit}>
        <header className="role-dialog__header">
          <span className="role-dialog__mark"><ShieldCheck size={20} /></span>
          <div className="role-dialog__heading">
            <span className="role-eyebrow">{role ? "Access control" : "New access role"}</span>
            <h2>{role ? "Edit role" : "Create a role"}</h2>
            <p>Define the role and choose which actions it grants.</p>
          </div>
          <button type="button" className="role-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="role-dialog__body">
          {error ? <div className="role-error">{error}</div> : null}
          <section className="role-card">
            <div className="role-section-heading"><span><KeyRound size={16} /></span><div><h3>Role details</h3><p>Name the role and give it a unique code.</p></div></div>
            <div className="role-form-grid">
              <label className="role-field"><span>Role name *</span>
                <input required minLength={2} maxLength={100} value={form.roleName} disabled={Boolean(role?.isSystemRole)}
                  onChange={(event) => setForm({ ...form, roleName: event.target.value })} placeholder="e.g. HR Manager" />
              </label>
              <label className="role-field"><span>Role code *</span>
                <input required minLength={2} maxLength={50} value={form.roleCode} disabled={Boolean(role)}
                  onChange={(event) => setForm({ ...form, roleCode: event.target.value.toUpperCase() })} placeholder="e.g. HR_MANAGER" />
                <small>Use COMPANY_ADMIN for company administrator provisioning.</small>
              </label>
              <label className="role-field role-field--full"><span>Description</span>
                <textarea rows={2} maxLength={500} value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe this role's responsibilities." />
              </label>
              {!role ? <label className="role-active-check"><input type="checkbox" checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                <span><strong>Active role</strong><small>Inactive roles cannot be assigned to users.</small></span></label> : null}
            </div>
          </section>
          <section className="role-card role-permissions-card">
            <div className="role-section-heading"><span><Shield size={16} /></span>
              <div><h3>Grant permissions</h3><p>Select the actions this role is allowed to perform.</p></div>
              <strong className="role-selected-count">{form.permissionCodes.length} selected</strong>
            </div>
            <label className="role-permission-search"><Search size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search permission or module" />
            </label>
            {!permissions.length ? (
              <div className="role-empty"><Shield size={22} /><strong>No permissions available</strong><span>Permission records need to be configured in the database.</span></div>
            ) : !filtered.length ? (
              <div className="role-empty"><Search size={20} /><strong>No matching permissions</strong><span>Try another search.</span></div>
            ) : (
              <div className="role-groups">{groups.map(([module, items]) => {
                const count = items.filter((item) => selected.has(item.permissionCode)).length;
                const allSelected = count === items.length;
                return <details className="role-group" key={module} open={groups.length <= 4}>
                  <summary><span><strong>{module}</strong><small>{count} of {items.length} selected</small></span>
                    <button type="button" className="role-select-all" disabled={platformAdminRole}
                      onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleGroup(items, !allSelected); }}>
                      <CheckCheck size={14} />{allSelected ? "Clear" : "Select all"}
                    </button>
                  </summary>
                  <div className="role-permission-list">{items.map((item) => <label className="role-permission" key={item.permissionCode}>
                    <input type="checkbox" checked={selected.has(item.permissionCode)} disabled={platformAdminRole} onChange={() => togglePermission(item.permissionCode)} />
                    <span className="role-permission__box"><Check size={12} /></span>
                    <span className="role-permission__text"><strong>{item.permissionCode}</strong><small>{item.description || item.moduleName + " / " + item.actionName}</small></span>
                  </label>)}</div>
                </details>;
              })}</div>
            )}
          </section>
        </div>
        <footer className="role-dialog__footer"><span>{role?.isSystemRole ? "System-role identity is protected." : "Permission changes revoke affected user sessions."}</span>
          <div><button type="button" className="role-button role-button--secondary" disabled={saving} onClick={onClose}>Cancel</button>
            <button type="submit" className="role-button role-button--primary" disabled={saving || platformAdminRole || !permissions.length}>
              {saving ? <LoaderCircle className="role-spin" size={15} /> : <Check size={15} />}{role ? "Save changes" : "Create role"}
            </button></div>
        </footer>
      </form>
    </div>
  );
}

export function RolesPage() {
  const { isPlatformAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: roleKeys.roles(), queryFn: listRolesRequest, staleTime: 60_000 });
  const permissionsQuery = useQuery({ queryKey: roleKeys.permissions(), queryFn: listPermissionsRequest, staleTime: 300_000 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [presetCode, setPresetCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const roles = rolesQuery.data?.roles ?? [];
  const permissions = permissionsQuery.data?.permissions ?? [];
  const loading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const loadError = rolesQuery.error ?? permissionsQuery.error;

  const visibleRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return roles.filter((role) => {
      const stateMatch = status === "ALL" || (status === "ACTIVE" ? role.isActive : !role.isActive);
      const textMatch = !query || [role.roleName, role.roleCode, role.description ?? ""].join(" ").toLowerCase().includes(query);
      return stateMatch && textMatch;
    });
  }, [roles, search, status]);
  const hasCompanyAdmin = roles.some((role) => role.roleCode === "COMPANY_ADMIN" && role.isActive);

  function create(code: string | null = null) { setEditing(null); setPresetCode(code); setDialogOpen(true); }
  function edit(role: RoleRecord) { setEditing(role); setPresetCode(null); setDialogOpen(true); }

  async function save(input: RoleInput) {
    setSaving(true);
    try {
      if (!editing) {
        await createRoleRequest(input);
        toast.success(input.roleCode === "COMPANY_ADMIN" ? "Company Administrator role created" : "Role created");
      } else {
        const changes = editing.isSystemRole
          ? { description: input.description }
          : { roleCode: input.roleCode, roleName: input.roleName, description: input.description };
        await updateRoleRequest(editing.roleId, changes);
        try {
          await replaceRolePermissionsRequest(editing.roleId, input.permissionCodes);
        } catch (error) {
          await queryClient.invalidateQueries({ queryKey: roleKeys.roles() });
          throw error;
        }
        toast.success("Role and permissions updated");
      }
      await queryClient.invalidateQueries({ queryKey: roleKeys.roles() });
      setDialogOpen(false); setEditing(null); setPresetCode(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally { setSaving(false); }
  }
  async function toggle(role: RoleRecord) {
    if (role.isSystemRole || role.roleCode === "PLATFORM_ADMIN") return;
    if (role.isActive && !window.confirm("Deactivate " + role.roleName + "? This removes the role from its users.")) return;
    setWorkingId(role.roleId);
    try {
      if (role.isActive) { await updateRoleRequest(role.roleId, { isActive: false }); toast.success("Role deactivated"); }
      else { await updateRoleRequest(role.roleId, { isActive: true }); toast.success("Role activated"); }
      await queryClient.invalidateQueries({ queryKey: roleKeys.roles() });
    } catch (error) { toast.error(normalizeApiError(error).message); }
    finally { setWorkingId(null); }
  }
  // edited by wali: Offer permanent deletion for custom roles; the backend blocks assigned roles.
  async function removeRole(role: RoleRecord) {
    if (role.isSystemRole || role.roleCode === "PLATFORM_ADMIN") return;
    if (!window.confirm(`Permanently delete ${role.roleName}? Roles assigned to any user cannot be deleted.`)) return;
    setWorkingId(role.roleId);
    try {
      await deleteRoleRequest(role.roleId);
      toast.success("Role deleted");
      await queryClient.invalidateQueries({ queryKey: roleKeys.roles() });
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setWorkingId(null);
    }
  }

  return <main className="roles-page wf-org-page">
    <header className="roles-hero wf-org-hero"><div className="wf-org-hero__copy"><span className="roles-eyebrow wf-org-hero__eyebrow"><ShieldCheck size={14} />{isPlatformAdmin ? "Platform administration" : "Company access control"}</span><h1>Roles &amp; permissions</h1>
      <p>{isPlatformAdmin ? "Create platform roles and manage access for your organisations." : "Create company roles for your employees and grant the access they need."}</p></div>
      <button type="button" className="roles-button roles-button--primary roles-hero__create-button" disabled={loading} onClick={() => create()}><Plus size={15} /> Create role</button>
    </header>
    <section className="roles-summary">
      <article><span className="roles-summary__icon roles-summary__icon--teal"><UserCog size={18} /></span><div><strong>{roles.length}</strong><small>Total roles</small></div></article>
      <article><span className="roles-summary__icon roles-summary__icon--green"><CheckCircle2 size={18} /></span><div><strong>{roles.filter((role) => role.isActive).length}</strong><small>Active roles</small></div></article>
      <article><span className="roles-summary__icon roles-summary__icon--indigo"><ShieldCheck size={18} /></span><div><strong>{roles.filter((role) => role.isSystemRole).length}</strong><small>System roles</small></div></article>
      <article><span className="roles-summary__icon roles-summary__icon--amber"><KeyRound size={18} /></span><div><strong>{permissions.length}</strong><small>Available permissions</small></div></article>
    </section>
    {isPlatformAdmin && !loading && !loadError && !hasCompanyAdmin ? <section className="roles-callout">
      <span><CircleHelp size={19} /></span><div><strong>Company Administrator role is missing</strong>
        <p>Provisioning requires an active role with the exact code <code>COMPANY_ADMIN</code>. Create it once and grant the required company permissions.</p></div>
      <button type="button" className="roles-button roles-button--secondary" onClick={() => create("COMPANY_ADMIN")}><Plus size={14} /> Set up role</button>
    </section> : null}
    <section className="roles-panel">
      <div className="roles-toolbar">
        <label className="roles-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles" /></label>
        <select className="roles-select" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} aria-label="Filter roles">
          <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
        </select>
        <button type="button" className="roles-button roles-button--secondary" disabled={loading} onClick={() => { void rolesQuery.refetch(); void permissionsQuery.refetch(); }}><RefreshCw size={14} /> Refresh</button>
      </div>
      {loading ? <div className="roles-state"><LoaderCircle className="role-spin" size={25} /><strong>Loading roles and permissions</strong></div>
      : loadError ? <div className="roles-state roles-state--error"><AlertTriangle size={24} /><strong>Could not load role data</strong>
        <span>{normalizeApiError(loadError).message}</span><button type="button" className="roles-button roles-button--secondary" onClick={() => { void rolesQuery.refetch(); void permissionsQuery.refetch(); }}><RefreshCw size={14} /> Try again</button></div>
      : !visibleRoles.length ? <div className="roles-state"><Shield size={26} /><strong>{roles.length ? "No roles match" : "No roles found"}</strong>
        <span>{roles.length ? "Change the search or status filter." : "Create a role to define user access."}</span></div>
      : <div className="roles-table-scroll"><table className="roles-table"><thead><tr><th>Role</th><th>Type</th><th>Permissions</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{visibleRoles.map((role) => <tr key={role.roleId}>
          <td><div className="roles-name"><span>{role.isSystemRole ? <ShieldCheck size={16} /> : <Users size={16} />}</span><div>
            <strong>{role.roleName}</strong><code>{role.roleCode}</code>
            {role.roleCode === "COMPANY_ADMIN" ? <small className="roles-company-admin-note">Used for company administrator provisioning</small> : role.description ? <small>{role.description}</small> : null}
          </div></div></td>
          <td><span className={role.isSystemRole ? "roles-chip roles-chip--system" : "roles-chip"}>{role.isSystemRole ? "System" : "Custom"}</span></td>
          <td><span className="roles-permission-count"><KeyRound size={13} /> {role.permissionCount}</span></td>
          <td><span className={role.isActive ? "roles-status roles-status--active" : "roles-status roles-status--inactive"}><i />{role.isActive ? "Active" : "Inactive"}</span></td>
          <td><div className="roles-actions">
            <button type="button" className="roles-action" disabled={role.roleCode === "PLATFORM_ADMIN"} onClick={() => edit(role)} title={role.roleCode === "PLATFORM_ADMIN" ? "Protected system role" : "Edit role"}>
              <ShieldCheck size={14} />{role.roleCode === "PLATFORM_ADMIN" ? "Protected" : "Edit"}</button>
            {!role.isSystemRole && role.roleCode !== "PLATFORM_ADMIN" ? <button type="button" className={role.isActive ? "roles-action roles-action--danger" : "roles-action"} disabled={workingId === role.roleId} onClick={() => void toggle(role)}>
              {workingId === role.roleId ? <LoaderCircle className="role-spin" size={13} /> : <UserCog size={13} />}{role.isActive ? "Deactivate" : "Activate"}</button> : null}
            {!role.isSystemRole && role.roleCode !== "PLATFORM_ADMIN" ? <button type="button" className="roles-action roles-action--danger" disabled={workingId === role.roleId} onClick={() => void removeRole(role)} title="Permanently delete role"><Trash2 size={13} />Delete</button> : null}
          </div></td>
        </tr>)}</tbody></table></div>}
    </section>
    <RoleDialog open={dialogOpen} isPlatformAdmin={isPlatformAdmin} role={editing} permissions={permissions} presetCode={presetCode} saving={saving}
      onClose={() => { if (!saving) { setDialogOpen(false); setEditing(null); setPresetCode(null); } }} onSave={save} />
  </main>;
}

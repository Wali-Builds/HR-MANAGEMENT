import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Building2, CalendarDays, Clock3, Edit3, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { listBranchesRequest } from "../../branches/api/branch.api";
// added by wali: Load departments for the branch-aware shift filters.
import { listDepartmentsRequest } from "../../organisation/api/organisation.api";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { OrganisationField, SelectInput, TextAreaInput, TextInput } from "../../organisation/components/OrganisationField";
import { useAttendanceShiftDefinitions, useCreateAttendanceShift, useUpdateAttendanceShift } from "../hooks/useAttendance";
import { listWorkSchedulesRequest } from "../api/attendance.api";
import type { AttendanceShift, AttendanceShiftInput } from "../types/attendance.types";
import "../attendance.css";
// added by wali: Reuse the shared Projects workspace typography and resource-card styling.
import "../../projects/projects.css";

interface ShiftForm {
  branchId: string;
  shiftCode: string;
  shiftName: string;
  description: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  isFlexible: boolean;
  breakMinutes: string;
  expectedWorkMinutes: string;
  checkInStartTime: string;
  checkInEndTime: string;
  checkOutStartTime: string;
  checkOutEndTime: string;
  lateGraceMinutes: string;
  earlyDepartureGraceMinutes: string;
  overtimeAfterMinutes: string;
  isActive: boolean;
}

const blankShift: ShiftForm = {
  branchId: "", shiftCode: "", shiftName: "", description: "", startTime: "09:00", endTime: "17:00",
  crossesMidnight: false, isFlexible: false, breakMinutes: "0", expectedWorkMinutes: "480",
  checkInStartTime: "", checkInEndTime: "", checkOutStartTime: "", checkOutEndTime: "",
  lateGraceMinutes: "0", earlyDepartureGraceMinutes: "0", overtimeAfterMinutes: "0", isActive: true,
};

function toForm(shift: AttendanceShift): ShiftForm {
  return {
    branchId: shift.branchId ?? "", shiftCode: shift.shiftCode, shiftName: shift.shiftName, description: shift.description ?? "",
    startTime: shift.startTime.slice(0, 5), endTime: shift.endTime.slice(0, 5), crossesMidnight: shift.crossesMidnight,
    isFlexible: shift.isFlexible, breakMinutes: String(shift.breakMinutes), expectedWorkMinutes: String(shift.expectedWorkMinutes),
    checkInStartTime: shift.checkInStartTime?.slice(0, 5) ?? "", checkInEndTime: shift.checkInEndTime?.slice(0, 5) ?? "",
    checkOutStartTime: shift.checkOutStartTime?.slice(0, 5) ?? "", checkOutEndTime: shift.checkOutEndTime?.slice(0, 5) ?? "",
    lateGraceMinutes: String(shift.lateGraceMinutes), earlyDepartureGraceMinutes: String(shift.earlyDepartureGraceMinutes),
    overtimeAfterMinutes: String(shift.overtimeAfterMinutes), isActive: shift.isActive,
  };
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

// added by wali: Calculate the shift's net work capacity so expected work is validated before submission.
function getShiftWorkCapacity(form: ShiftForm) {
  const startMinutes = Number(form.startTime.slice(0, 2)) * 60 + Number(form.startTime.slice(3, 5));
  const endMinutes = Number(form.endTime.slice(0, 2)) * 60 + Number(form.endTime.slice(3, 5));
  let durationMinutes = endMinutes - startMinutes;
  if (form.crossesMidnight && durationMinutes <= 0) durationMinutes += 1440;
  return {
    durationMinutes,
    availableWorkMinutes: Math.max(0, durationMinutes - Number(form.breakMinutes || 0)),
  };
}

export function AttendanceShiftsPage() {
  const user = useAuthStore((state) => state.user);
  const { hasPermission, hasAnyPermission } = usePermissions();
  const companyId = user?.companyId ?? undefined;
  const canView = hasAnyPermission(["attendance.scheduling.view", "attendance.scheduling.manage", "attendance.scheduling.assign", "attendance.manage"]);
  const canManage = hasAnyPermission(["attendance.scheduling.manage", "attendance.manage"]);
  const [search, setSearch] = useState("");
  // added by wali: Keep shift table branch and department filters independently selectable.
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceShift | null>(null);
  const [form, setForm] = useState<ShiftForm>(blankShift);
  const query = useAttendanceShiftDefinitions(search, Boolean(companyId && canView), {
    ...(branchFilter !== "ALL" ? { branchId: branchFilter } : {}),
    ...(departmentFilter !== "ALL" ? { departmentId: departmentFilter } : {}),
  });
  // added by wali: Keep the summary company-wide while the shift table is filtered by search.
  const summaryQuery = useAttendanceShiftDefinitions("", Boolean(companyId && canView));
  // added by wali: Read weekly schedule days to count shifts assigned to schedules, not employee assignments.
  const scheduleQuery = useQuery({ queryKey: ["attendance", "work-schedules"], queryFn: () => listWorkSchedulesRequest(), enabled: Boolean(companyId && canView) });
  const createMutation = useCreateAttendanceShift();
  const updateMutation = useUpdateAttendanceShift();
  const branchQuery = useQuery({
    queryKey: ["attendance", "shift-branches", companyId],
    queryFn: () => listBranchesRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "branch_name", isActive: true, ...(companyId ? { companyId } : {}) }),
    enabled: Boolean(companyId && canView && hasPermission("branch.view")),
  });
  // added by wali: Keep department choices aligned with the selected branch.
  const departmentQuery = useQuery({
    queryKey: ["attendance", "shift-departments", companyId, branchFilter],
    queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "department_name", isActive: true, ...(companyId ? { companyId } : {}), ...(branchFilter !== "ALL" ? { branchId: branchFilter } : {}) }),
    enabled: Boolean(companyId && canView && hasPermission("department.view")),
  });
  const shifts = query.data ?? [];
  const branches = branchQuery.data?.branches ?? [];
  const schedules = scheduleQuery.data ?? [];
  const { durationMinutes, availableWorkMinutes } = getShiftWorkCapacity(form);
  const expectedWorkTooHigh = !form.isFlexible && Number(form.expectedWorkMinutes) > availableWorkMinutes;
  const summaryShifts = summaryQuery.data ?? [];
  const activeCount = summaryShifts.filter((shift) => shift.isActive).length;
  const assignedShiftCount = new Set(schedules.flatMap((schedule) => schedule.days?.filter((day) => day.isWorkingDay && day.shiftId).map((day) => day.shiftId) ?? [])).size;
  const saving = createMutation.isPending || updateMutation.isPending;

  function openCreate() { setEditing(null); setForm(blankShift); setDialogOpen(true); }
  function openEdit(shift: AttendanceShift) { setEditing(shift); setForm(toForm(shift)); setDialogOpen(true); }

  async function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Number(form.breakMinutes) > durationMinutes) {
      toast.error("Break minutes cannot exceed the shift duration.");
      return;
    }
    if (expectedWorkTooHigh) {
      toast.error(`Expected work minutes cannot exceed ${availableWorkMinutes} minutes after the break.`);
      return;
    }
    const input: AttendanceShiftInput = {
      branchId: form.branchId || null,
      shiftCode: form.shiftCode.trim().toUpperCase(),
      shiftName: form.shiftName.trim(),
      description: form.description.trim() || null,
      startTime: form.startTime,
      endTime: form.endTime,
      crossesMidnight: form.crossesMidnight,
      isFlexible: form.isFlexible,
      breakMinutes: Number(form.breakMinutes),
      expectedWorkMinutes: Number(form.expectedWorkMinutes),
      checkInStartTime: form.checkInStartTime || null,
      checkInEndTime: form.checkInEndTime || null,
      checkOutStartTime: form.checkOutStartTime || null,
      checkOutEndTime: form.checkOutEndTime || null,
      lateGraceMinutes: Number(form.lateGraceMinutes),
      earlyDepartureGraceMinutes: Number(form.earlyDepartureGraceMinutes),
      overtimeAfterMinutes: Number(form.overtimeAfterMinutes),
      isActive: form.isActive,
    };
    try {
      // added by wali: Submit shift definitions to the scheduling API so attendance uses the configured timings.
      if (editing) {
        await updateMutation.mutateAsync({ shiftId: editing.shiftId, input });
        toast.success("Shift updated.");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Shift created.");
      }
      setDialogOpen(false);
    } catch (error) { toast.error(normalizeApiError(error).message); }
  }

  async function toggleActive(shift: AttendanceShift) {
    try {
      await updateMutation.mutateAsync({ shiftId: shift.shiftId, input: { isActive: !shift.isActive } });
      toast.success(shift.isActive ? "Shift deactivated." : "Shift activated.");
    } catch (error) { toast.error(normalizeApiError(error).message); }
  }

  return (
    <section className="wf-org-page wf-projects-page wf-attendance-page wf-attendance-shifts">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><AlarmClock size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">People operations · attendance setup</span><h1>Shifts</h1><p>Define scheduled hours, punch windows and attendance grace periods.</p></div></div>
        <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Company shifts</span><strong>{shifts.length} configured</strong></div></div>
      </header>

      <div className="wf-org-health-strip wf-attendance-health wf-attendance-shifts__metrics">
        {/* added by wali: Show the requested total, assigned, and active shift summary. */}
        <div><span><AlarmClock size={16} /></span><strong>{summaryQuery.isLoading || summaryQuery.isError ? "—" : summaryShifts.length}</strong><small>Total shifts</small></div>
        <div><span><CalendarDays size={16} /></span><strong>{scheduleQuery.isLoading || scheduleQuery.isError ? "—" : assignedShiftCount}</strong><small>Assigned shifts</small></div>
        <div><span><Clock3 size={16} /></span><strong>{summaryQuery.isLoading || summaryQuery.isError ? "—" : activeCount}</strong><small>Active shifts</small></div>
      </div>

      {/* added by wali: Use the same resource card wrapper as Projects for a consistent module layout. */}
      <section className="wf-org-resource wf-projects-resource wf-attendance-shifts-resource">
        <div className="wf-org-resource-toolbar">
          <div className="wf-org-resource-toolbar__heading"><div><span>Attendance setup</span><h2>Shift definitions</h2><p>Manage shift timing, check-in/out windows and late arrival rules.</p></div>{canManage && <button className="wf-org-button wf-org-button--primary" onClick={openCreate}><Plus size={16} />Add shift</button>}</div>
          <div className="wf-org-resource-toolbar__tools"><label className="wf-org-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shifts" /></label>
            {/* added by wali: Let users narrow shifts by their configured branch and department coverage. */}
            {branchQuery.data?.branches && branchQuery.data.branches.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={branchFilter} placeholder="All branches" ariaLabel="Filter shifts by branch" options={[{ value: "ALL", label: "All branches" }, ...branchQuery.data.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setBranchFilter(value); setDepartmentFilter("ALL"); }} allowClear={false} />}
            {departmentQuery.data?.departments && departmentQuery.data.departments.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={departmentFilter} placeholder="All departments" ariaLabel="Filter shifts by department" options={[{ value: "ALL", label: "All departments" }, ...departmentQuery.data.departments.map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={setDepartmentFilter} allowClear={false} />}
            <div className="wf-org-resource-toolbar__pager"><span>{query.isLoading ? "Loading shifts…" : `${shifts.length} shifts`}</span><button type="button" title="Refresh shifts" aria-label="Refresh shifts" onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? "spin" : ""} size={15} /></button></div></div>
        </div>
        {query.isLoading ? <div className="wf-org-table-skeleton">Loading shifts…</div> : query.isError ? <div className="wf-org-empty-state"><p>Shifts could not be loaded. Check your attendance scheduling access and try refreshing.</p><button type="button" className="wf-org-button wf-org-button--secondary" onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? "spin" : ""} size={15} /> Try again</button></div> : shifts.length === 0 ? <OrganisationEmptyState title={search.trim() ? "No matching shifts" : "No shifts configured"} description={search.trim() ? "Try a different search, or clear the search to see all shifts." : "Add a shift to set scheduled hours, grace periods, and branch coverage."} canCreate={canManage} createLabel="Add first shift" onCreate={openCreate} onRetry={() => void query.refetch()} isRetrying={query.isFetching} /> : (
          <div className="wf-org-table-wrap"><table className="wf-org-table"><thead><tr><th>Shift</th><th>Branch</th><th>Scheduled hours</th><th>Punch windows</th><th>Work / break</th><th>Grace</th><th>Assignments</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead><tbody>
            {shifts.map((shift) => <tr key={shift.shiftId}>
              <td><div className="wf-org-record-title"><span className="wf-org-record-icon"><AlarmClock size={16} /></span><div><strong>{shift.shiftName}</strong><small>{shift.shiftCode}{shift.crossesMidnight ? " · Overnight" : ""}{shift.isFlexible ? " · Flexible" : ""}</small></div></div></td>
              <td>{shift.branchName ?? "All branches"}</td>
              <td><strong>{shift.startTime.slice(0, 5)} – {shift.endTime.slice(0, 5)}</strong><small className="wf-attendance-shifts__subline">{shift.crossesMidnight ? "Ends next day" : "Same day"}</small></td>
              <td><div className="wf-attendance-shifts__windows"><span>In: {shift.checkInStartTime?.slice(0, 5) ?? "—"} – {shift.checkInEndTime?.slice(0, 5) ?? "—"}</span><span>Out: {shift.checkOutStartTime?.slice(0, 5) ?? "—"} – {shift.checkOutEndTime?.slice(0, 5) ?? "—"}</span></div></td>
              <td>{durationLabel(shift.expectedWorkMinutes)}<small className="wf-attendance-shifts__subline">{shift.breakMinutes}m break</small></td>
              <td>{shift.lateGraceMinutes}m late<small className="wf-attendance-shifts__subline">{shift.earlyDepartureGraceMinutes}m early</small></td>
              <td>{shift.currentAssignmentCount}<small className="wf-attendance-shifts__subline">of {shift.assignmentCount} total</small></td>
              <td><span className={`wf-attendance-shifts__status ${shift.isActive ? "is-active" : ""}`}><i />{shift.isActive ? "Active" : "Inactive"}</span></td>
              {canManage && <td><div className="wf-attendance-shifts__actions"><button className="wf-org-button wf-org-button--secondary" onClick={() => openEdit(shift)}><Edit3 size={14} />Edit</button><button className="wf-attendance-shifts__toggle" disabled={saving} onClick={() => void toggleActive(shift)}>{shift.isActive ? "Deactivate" : "Activate"}</button></div></td>}
            </tr>)}
          </tbody></table></div>
        )}
      </section>

      <OrganisationDialog open={dialogOpen} title={editing ? "Edit shift" : "Add shift"} subtitle="Set the scheduled work period and attendance rules." submitLabel={editing ? "Save changes" : "Create shift"} busy={saving} onClose={() => setDialogOpen(false)} onSubmit={saveShift}>
        <div className="wf-org-form-grid">
          <OrganisationField label="Shift code" required><TextInput required maxLength={50} value={form.shiftCode} onChange={(event) => setForm({ ...form, shiftCode: event.target.value })} placeholder="DAY-01" /></OrganisationField>
          <OrganisationField label="Shift name" required><TextInput required maxLength={150} value={form.shiftName} onChange={(event) => setForm({ ...form, shiftName: event.target.value })} placeholder="Day shift" /></OrganisationField>
          <OrganisationField label="Branch" hint="Leave empty to make this shift available company-wide."><SelectInput value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.branchName}</option>)}</SelectInput></OrganisationField>
          <OrganisationField label="Expected work (minutes)" required error={expectedWorkTooHigh ? `Maximum ${availableWorkMinutes} minutes after the break.` : undefined} hint={form.isFlexible ? "Flexible shifts can exceed the scheduled work duration." : `${availableWorkMinutes} minutes available after the break.`}><TextInput type="number" required min={1} max={form.isFlexible ? 1440 : Math.max(1, availableWorkMinutes)} value={form.expectedWorkMinutes} onChange={(event) => setForm({ ...form, expectedWorkMinutes: event.target.value })} /></OrganisationField>
          <OrganisationField label="Start time" required><TextInput type="time" required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="End time" required><TextInput type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="Break (minutes)"><TextInput type="number" min={0} max={1440} value={form.breakMinutes} onChange={(event) => setForm({ ...form, breakMinutes: event.target.value })} /></OrganisationField>
          <OrganisationField label="Late grace (minutes)" hint="The larger of shift grace and attendance-policy grace is applied."><TextInput type="number" min={0} max={1440} value={form.lateGraceMinutes} onChange={(event) => setForm({ ...form, lateGraceMinutes: event.target.value })} /></OrganisationField>
          <OrganisationField label="Early departure grace (minutes)"><TextInput type="number" min={0} max={1440} value={form.earlyDepartureGraceMinutes} onChange={(event) => setForm({ ...form, earlyDepartureGraceMinutes: event.target.value })} /></OrganisationField>
          <OrganisationField label="Overtime after (minutes)"><TextInput type="number" min={0} max={1440} value={form.overtimeAfterMinutes} onChange={(event) => setForm({ ...form, overtimeAfterMinutes: event.target.value })} /></OrganisationField>
          <OrganisationField label="Check-in window start" hint="Optional; set both ends of the window."><TextInput type="time" value={form.checkInStartTime} onChange={(event) => setForm({ ...form, checkInStartTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="Check-in window end"><TextInput type="time" value={form.checkInEndTime} onChange={(event) => setForm({ ...form, checkInEndTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="Check-out window start"><TextInput type="time" value={form.checkOutStartTime} onChange={(event) => setForm({ ...form, checkOutStartTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="Check-out window end"><TextInput type="time" value={form.checkOutEndTime} onChange={(event) => setForm({ ...form, checkOutEndTime: event.target.value })} /></OrganisationField>
          <OrganisationField label="Description"><TextAreaInput rows={3} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></OrganisationField>
          <div className="wf-attendance-shifts__checks"><label><input type="checkbox" checked={form.crossesMidnight} onChange={(event) => setForm({ ...form, crossesMidnight: event.target.checked })} /> Shift ends the next day</label><label><input type="checkbox" checked={form.isFlexible} onChange={(event) => setForm({ ...form, isFlexible: event.target.checked })} /> Flexible shift</label><label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label></div>
        </div>
      </OrganisationDialog>
    </section>
  );
}

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, Clock3, Edit3, Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { listBranchesRequest } from "../../branches/api/branch.api";
import { listDepartmentsRequest } from "../../departments/api/organisation.api";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { listEmployeesRequest } from "../../employees/api/employee.api";
import type { Employee } from "../../employees/types/employee.types";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { OrganisationField, SelectInput, TextAreaInput, TextInput } from "../../organisation/components/OrganisationField";
import { createEmployeeShiftAssignmentRequest, createWorkScheduleRequest, listAllShiftAssignmentsRequest, listAttendanceShiftDefinitionsRequest, listWorkSchedulesRequest, replaceWorkScheduleDaysRequest, updateEmployeeShiftAssignmentRequest, updateWorkScheduleRequest } from "../api/attendance.api";
import type { ShiftAssignment, ShiftAssignmentInput, WorkSchedule, WorkScheduleDay, WorkScheduleInput } from "../api/attendance.api";
import "../attendance.css";
// added by wali: Reuse the Projects workspace visual language for attendance scheduling pages.
import "../../projects/projects.css";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const emptyDay = (dayOfWeek: number): WorkScheduleDay => ({ dayOfWeek, isWorkingDay: dayOfWeek <= 5, shiftId: null, plannedStartTime: null, plannedEndTime: null, breakMinutes: 0, expectedWorkMinutes: 0, crossesMidnight: false });
const blankSchedule = { scheduleCode: "", scheduleName: "", description: "", isDefault: false, isActive: true };
const todayLocal = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const timeText = (value: string | null) => value?.slice(0, 5) ?? "--";

function PageHero({ title, description }: { title: string; description: string }) {
  const user = useAuthStore((state) => state.user);
  const companyIdentityQuery = useCurrentCompanyIdentity(user?.companyId ?? null);
  // added by wali: Show the same working-company identity on scheduling pages as on Attendance Records.
  const companyName = companyIdentityQuery.data?.displayName ?? (companyIdentityQuery.isLoading ? "Loading company…" : "Your company");
  return <header className="wf-org-hero wf-org-hero--center-company"><div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><CalendarDays size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Attendance setup</span><h1>{title}</h1><p>{description}</p></div></div><div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Working company</span><strong>{companyName}</strong></div></div></header>;
}

function WorkSchedulesView() {
  const permissions = usePermissions();
  const user = useAuthStore((state) => state.user);
  const canView = permissions.hasPermission("attendance.scheduling.view") || permissions.hasPermission("attendance.scheduling.manage") || permissions.hasPermission("attendance.scheduling.assign") || permissions.hasPermission("attendance.manage");
  const canManage = permissions.hasPermission("attendance.scheduling.manage") || permissions.hasPermission("attendance.manage");
  const queryClient = useQueryClient();
  // added by wali: Filter visible schedules using the branch and department of employees assigned to them.
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const branchQuery = useQuery({ queryKey: ["attendance", "schedule-branches", user?.companyId], queryFn: () => listBranchesRequest({ page: 1, limit: 100, companyId: user?.companyId ?? undefined, sortBy: "branch_name", sortOrder: "ASC", isActive: true }), enabled: canView && permissions.hasPermission("branch.view") });
  const departmentQuery = useQuery({ queryKey: ["attendance", "schedule-departments", user?.companyId, branchFilter], queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, companyId: user?.companyId ?? undefined, sortBy: "department_name", sortOrder: "ASC", isActive: true, ...(branchFilter !== "ALL" ? { branchId: branchFilter } : {}) }), enabled: canView && permissions.hasPermission("department.view") });
  const scheduleFilters = { ...(branchFilter !== "ALL" ? { branchId: branchFilter } : {}), ...(departmentFilter !== "ALL" ? { departmentId: departmentFilter } : {}) };
  const schedulesQuery = useQuery({ queryKey: ["attendance", "work-schedules", branchFilter, departmentFilter], queryFn: () => listWorkSchedulesRequest(scheduleFilters), enabled: canView });
  // added by wali: Load existing shift definitions so weekly rules select shifts instead of duplicating their timing fields.
  const shiftsQuery = useQuery({ queryKey: ["attendance", "shift-definitions", "weekly-builder"], queryFn: () => listAttendanceShiftDefinitionsRequest() });
  const schedules = schedulesQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState(blankSchedule);
  const [days, setDays] = useState<WorkScheduleDay[]>(weekDays.map((_, index) => emptyDay(index + 1)));
  const [saving, setSaving] = useState(false);
  const visibleSchedules = useMemo(() => schedules.filter((item) => `${item.scheduleName} ${item.scheduleCode}`.toLowerCase().includes(search.toLowerCase())), [schedules, search]);
  const assignedEmployees = schedules.reduce((sum, item) => sum + item.currentAssignmentCount, 0);
  const activeScheduleCount = schedules.filter((item) => item.isActive).length;
  const workingDays = days.filter((day) => day.isWorkingDay);
  const weeklyExpectedMinutes = workingDays.reduce((sum, day) => sum + (shifts.find((shift) => shift.shiftId === day.shiftId)?.expectedWorkMinutes ?? 0), 0);

  const openCreate = () => { setEditing(null); setForm(blankSchedule); setDays(weekDays.map((_, index) => emptyDay(index + 1))); setDialogOpen(true); };
  const openEdit = async (schedule: WorkSchedule) => {
    setEditing(schedule);
    setForm({ scheduleCode: schedule.scheduleCode, scheduleName: schedule.scheduleName, description: schedule.description ?? "", isDefault: schedule.isDefault, isActive: schedule.isActive });
    setDays(weekDays.map((_, index) => schedule.days?.find((day) => day.dayOfWeek === index + 1) ?? { ...emptyDay(index + 1), isWorkingDay: false }));
    setDialogOpen(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = days.find((day) => day.isWorkingDay && !shifts.some((shift) => shift.shiftId === day.shiftId && shift.isActive));
    if (invalid) { toast.error(`Choose an active shift for ${weekDays[invalid.dayOfWeek - 1]}.`); return; }
    setSaving(true);
    const scheduleInput: WorkScheduleInput = { scheduleCode: form.scheduleCode.trim().toUpperCase(), scheduleName: form.scheduleName.trim(), description: form.description.trim() || null, weeklyWorkingDays: workingDays.length, weeklyWorkingHours: Math.round(weeklyExpectedMinutes / 60 * 100) / 100, isDefault: form.isDefault, isActive: form.isActive };
    let savedSchedule: WorkSchedule | null = null;
    try {
      // added by wali: Save the schedule header first, then replace its complete Monday-to-Sunday plan.
      savedSchedule = editing ? await updateWorkScheduleRequest(editing.scheduleId, scheduleInput) : await createWorkScheduleRequest(scheduleInput);
      await replaceWorkScheduleDaysRequest(savedSchedule.scheduleId, days.map((day) => ({ dayOfWeek: day.dayOfWeek, isWorkingDay: day.isWorkingDay, shiftId: day.isWorkingDay ? day.shiftId : null, plannedStartTime: null, plannedEndTime: null, breakMinutes: 0, expectedWorkMinutes: 0, crossesMidnight: false })));
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(editing ? "Work schedule updated." : "Work schedule created."); setDialogOpen(false);
    } catch (error) {
      if (savedSchedule && !editing) {
        // added by wali: Keep a newly created schedule editable if its separate weekday save needs a retry.
        setEditing(savedSchedule);
        await queryClient.invalidateQueries({ queryKey: ["attendance", "work-schedules"] });
        toast.error("The schedule was created, but its weekly plan could not be saved. Review the days and save again.");
      } else toast.error(normalizeApiError(error).message);
    }
    finally { setSaving(false); }
  };

  const updateDay = (index: number, update: Partial<WorkScheduleDay>) => setDays((current) => current.map((day, dayIndex) => {
    if (dayIndex !== index) return day;
    const next = { ...day, ...update };
    if (!next.isWorkingDay) return { ...next, shiftId: null, plannedStartTime: null, plannedEndTime: null, breakMinutes: 0, expectedWorkMinutes: 0, crossesMidnight: false };
    if (!day.isWorkingDay) return { ...next, shiftId: null, plannedStartTime: null, plannedEndTime: null, breakMinutes: 0, expectedWorkMinutes: 0, crossesMidnight: false };
    return next;
  }));

  return <section className="wf-org-page wf-projects-page wf-attendance-page wf-attendance-scheduling">
    <PageHero title="Work schedules" description="Build a weekly plan by assigning your existing shifts to working days." />
    <div className="wf-org-health-strip wf-attendance-health">
      {/* added by wali: Show company-wide schedule totals, assigned employees, and active schedules. */}
      <div><span><CalendarDays size={16} /></span><strong>{schedulesQuery.isLoading || schedulesQuery.isError ? "â€”" : schedules.length}</strong><small>Total schedules</small></div><div><span><UsersRound size={16} /></span><strong>{schedulesQuery.isLoading || schedulesQuery.isError ? "â€”" : assignedEmployees}</strong><small>Employees assigned</small></div><div><span><Clock3 size={16} /></span><strong>{schedulesQuery.isLoading || schedulesQuery.isError ? "â€”" : activeScheduleCount}</strong><small>Active schedules</small></div>
    </div>
    <section className="wf-org-resource wf-projects-resource wf-attendance-work-schedules-resource">
      <div className="wf-org-resource-toolbar"><div className="wf-org-resource-toolbar__heading"><div><span>WEEKLY PATTERNS</span><h2>Schedule templates</h2><p>Each template defines the work plan for all seven days of the week.</p></div>{canManage && <button className="wf-org-button wf-org-button--primary" onClick={openCreate}><Plus size={16} />Add schedule</button>}</div><div className={`wf-attendance-assignment-toolbar wf-attendance-assignment-toolbar--filters${permissions.isBranchAdmin ? " wf-attendance-assignment-toolbar--branchless" : ""}`}><label className="wf-org-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedules" /></label>
        {/* added by wali: Keep schedule branch and department filters consistent with the Shifts page. */}
        {/* added by wali: Hide the schedule branch filter for branch-scoped Branch Admin accounts. */}
        {!permissions.isBranchAdmin && branchQuery.data?.branches && branchQuery.data.branches.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={branchFilter} placeholder="All branches" ariaLabel="Filter schedules by branch" options={[{ value: "ALL", label: "All branches" }, ...branchQuery.data.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setBranchFilter(value); setDepartmentFilter("ALL"); }} allowClear={false} />}
        {departmentQuery.data?.departments && departmentQuery.data.departments.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={departmentFilter} placeholder="All departments" ariaLabel="Filter schedules by department" options={[{ value: "ALL", label: "All departments" }, ...departmentQuery.data.departments.map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={setDepartmentFilter} allowClear={false} />}
        <div className="wf-org-resource-toolbar__pager"><span>{schedules.length} schedules</span><button type="button" aria-label="Refresh schedules" onClick={() => void schedulesQuery.refetch()}><RefreshCw className={schedulesQuery.isFetching ? "spin" : ""} size={15} /></button></div></div></div>
{schedulesQuery.isLoading ? <div className="wf-org-table-skeleton">Loading work schedulesâ€¦</div> : schedulesQuery.isError ? <div className="wf-org-empty-state"><p>Work schedules could not be loaded. Refresh and try again.</p><button className="wf-org-button wf-org-button--secondary" onClick={() => void schedulesQuery.refetch()}>Try again</button></div> : visibleSchedules.length === 0 ? <OrganisationEmptyState title={search ? "No matching schedules" : "No work schedules configured"} description={search ? "Try another schedule name or code." : "Create a weekly template to define employee working days and expected hours."} canCreate={canManage} createLabel="Add work schedule" onCreate={openCreate} onRetry={() => void schedulesQuery.refetch()} isRetrying={schedulesQuery.isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table"><thead><tr><th>SCHEDULE</th><th>WORKDAYS</th><th>WEEKLY HOURS</th><th>ASSIGNMENTS</th><th className="wf-attendance-status-column">STATUS</th>{canManage && <th className="wf-attendance-action-column">ACTION</th>}</tr></thead><tbody>{visibleSchedules.map((schedule) => <tr key={schedule.scheduleId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><CalendarDays size={16} /></span><div><strong>{schedule.scheduleName}</strong><small>{schedule.scheduleCode}{schedule.isDefault ? " · Default" : ""}</small></div></div></td><td>{schedule.configuredWorkingDayCount ?? schedule.weeklyWorkingDays ?? 0} days</td><td>{schedule.weeklyWorkingHours ?? 0} h</td><td>{schedule.currentAssignmentCount}<small>of {schedule.assignmentCount} total</small></td><td className="wf-attendance-status-column"><span className={`wf-attendance-shifts__status ${schedule.isActive ? "is-active" : ""}`}><i />{schedule.isActive ? "Active" : "Inactive"}</span></td>{canManage && <td className="wf-attendance-action-column"><button className="wf-org-button wf-org-button--secondary" onClick={() => void openEdit(schedule)}><Edit3 size={14} />Edit</button></td>}</tr>)}</tbody></table></div>}
    </section>
    <OrganisationDialog open={dialogOpen} title={editing ? "Edit work schedule" : "Create work schedule"} subtitle="Configure your weekly plan. Break and expected work values apply to each working day separately." submitLabel={editing ? "Save schedule" : "Create schedule"} busy={saving} onClose={() => setDialogOpen(false)} onSubmit={(event) => void save(event)}>
      <div className="wf-org-form-grid"><OrganisationField label="Schedule code" required><TextInput required value={form.scheduleCode} maxLength={50} placeholder="WEEK-5D" onChange={(event) => setForm({ ...form, scheduleCode: event.target.value })} /></OrganisationField><OrganisationField label="Schedule name" required><TextInput required value={form.scheduleName} maxLength={150} placeholder="Monday to Friday" onChange={(event) => setForm({ ...form, scheduleName: event.target.value })} /></OrganisationField><OrganisationField label="Description"><TextAreaInput rows={2} value={form.description} maxLength={5000} onChange={(event) => setForm({ ...form, description: event.target.value })} /></OrganisationField></div>
      {/* added by wali: Use plain, readable separators in the weekly summary and shift details. */}
      <div className="wf-attendance-schedule-week"><div className="wf-attendance-schedule-week__heading"><div><strong>Weekly plan</strong><small>{workingDays.length} working days | {(weeklyExpectedMinutes / 60).toFixed(1)} expected hours per week</small></div><span>Pick an existing shift for each working day</span></div><div className="wf-attendance-schedule-week__list">{days.map((day, index) => { const selectedShift = shifts.find((shift) => shift.shiftId === day.shiftId); return <div className={`wf-attendance-schedule-day${day.isWorkingDay ? " is-working" : ""}`} key={day.dayOfWeek}><label className="wf-attendance-schedule-day__toggle"><input type="checkbox" checked={day.isWorkingDay} onChange={(event) => updateDay(index, { isWorkingDay: event.target.checked })} /><span>{weekDays[index]}</span></label>{day.isWorkingDay ? <div className="wf-attendance-schedule-day__shift"><SelectInput aria-label={`${weekDays[index]} shift`} required value={day.shiftId ?? ""} onChange={(event) => updateDay(index, { shiftId: event.target.value || null })}><option value="">Select shift</option>{shifts.filter((shift) => shift.isActive || shift.shiftId === day.shiftId).map((shift) => <option key={shift.shiftId} value={shift.shiftId}>{shift.shiftName} ({shift.shiftCode})</option>)}</SelectInput>{selectedShift ? <small>{timeText(selectedShift.startTime)} to {timeText(selectedShift.endTime)} | {selectedShift.breakMinutes}m break | {selectedShift.expectedWorkMinutes}m expected</small> : <small>Select a shift already defined on the Shifts page.</small>}</div> : <span className="wf-attendance-schedule-day__off">Non-working day</span>}</div>; })}</div></div>
      <div className="wf-attendance-shifts__checks"><label><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />Default schedule</label><label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active</label></div>
    </OrganisationDialog>
  </section>;
}

interface AssignmentForm { employeeId: string; scheduleId: string; effectiveFrom: string; effectiveTo: string; assignmentType: string; isCurrent: boolean; remarks: string; }
const blankAssignment = (employeeId = ""): AssignmentForm => ({ employeeId, scheduleId: "", effectiveFrom: todayLocal(), effectiveTo: "", assignmentType: "REGULAR", isCurrent: true, remarks: "" });

function ShiftAssignmentsView() {
  const permissions = usePermissions();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const canView = permissions.hasPermission("attendance.scheduling.view") || permissions.hasPermission("attendance.scheduling.manage") || permissions.hasPermission("attendance.scheduling.assign") || permissions.hasPermission("attendance.manage");
  const canManage = permissions.hasPermission("attendance.scheduling.assign") || permissions.hasPermission("attendance.scheduling.manage") || permissions.hasPermission("attendance.manage");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftAssignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(blankAssignment());
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  // added by wali: Load all employees matching the filters so any subset can be selected for schedule assignment.
  const employeesQuery = useQuery({
    queryKey: ["attendance", "assignment-employees", user?.companyId, branchFilter, departmentFilter, employeeSearch],
    queryFn: async () => {
      const params = { page: 1, limit: 100, companyId: user?.companyId ?? undefined, sortBy: "employee_code" as const, sortOrder: "ASC" as const, ...(branchFilter ? { branchId: branchFilter } : {}), ...(departmentFilter ? { departmentId: departmentFilter } : {}), ...(employeeSearch.trim() ? { search: employeeSearch.trim() } : {}) };
      const firstPage = await listEmployeesRequest(params);
      const employees = [...firstPage.employees];
      for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
        const result = await listEmployeesRequest({ ...params, page });
        employees.push(...result.employees);
      }
      return employees;
    },
    enabled: canView,
  });
  const employees: Employee[] = employeesQuery.data ?? [];
  const branchesQuery = useQuery({ queryKey: ["attendance", "assignment-branches", user?.companyId], queryFn: () => listBranchesRequest({ page: 1, limit: 100, companyId: user?.companyId ?? undefined, sortBy: "branch_name", sortOrder: "ASC", isActive: true }), enabled: canView });
  const departmentsQuery = useQuery({ queryKey: ["attendance", "assignment-departments", user?.companyId, branchFilter], queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, companyId: user?.companyId ?? undefined, sortBy: "department_name", sortOrder: "ASC", isActive: true, ...(branchFilter ? { branchId: branchFilter } : {}) }), enabled: canView });
  const schedulesQuery = useQuery({ queryKey: ["attendance", "work-schedules"], queryFn: () => listWorkSchedulesRequest(), enabled: canView });
  // added by wali: Load all employees' assignments so existing database rows are visible immediately in this overview.
  const assignmentsQuery = useQuery({ queryKey: ["attendance", "employee-shift-assignments", user?.companyId], queryFn: listAllShiftAssignmentsRequest, enabled: canView });
  const assignments = assignmentsQuery.data ?? [];

  // added by wali: Show all filtered employees while retaining existing schedule rows for editing.
  const assignmentByEmployee = new Map(assignments.filter((item) => item.scheduleId !== null).map((item) => [item.employeeId, item]));
  const allVisibleEmployeesSelected = employees.length > 0 && employees.every((employee) => selectedEmployeeIds.has(employee.employeeId));
  const assignedEmployeeCount = employees.filter((employee) => assignmentByEmployee.has(employee.employeeId)).length;

  // added by wali: Start a bulk assignment from the selected unassigned employee rows.
  const openCreate = () => { if (!selectedEmployeeIds.size) { toast.error("Select at least one employee to assign a schedule."); return; } setEditing(null); setForm(blankAssignment()); setDialogOpen(true); };
  const openEdit = (assignment: ShiftAssignment) => { setEditing(assignment); setForm({ employeeId: assignment.employeeId, scheduleId: assignment.scheduleId ?? "", effectiveFrom: assignment.effectiveFrom.slice(0, 10), effectiveTo: assignment.effectiveTo?.slice(0, 10) ?? "", assignmentType: assignment.assignmentType, isCurrent: assignment.isCurrent, remarks: assignment.remarks ?? "" }); setDialogOpen(true); };
  const changeFilters = (branch: string, department: string, searchValue: string) => {
    setBranchFilter(branch);
    setDepartmentFilter(department);
    setEmployeeSearch(searchValue);
    setSelectedEmployeeIds(new Set());
  };
  const toggleEmployee = (employeeId: string) => setSelectedEmployeeIds((current) => {
    const next = new Set(current);
    if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
    return next;
  });
  const toggleAllVisible = () => setSelectedEmployeeIds((current) => {
    const next = new Set(current);
    if (allVisibleEmployeesSelected) employees.forEach((employee) => next.delete(employee.employeeId));
    else employees.forEach((employee) => next.add(employee.employeeId));
    return next;
  });
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing && !form.employeeId) { toast.error("Select an employee first."); return; }
    if (!editing && !selectedEmployeeIds.size) { toast.error("Select at least one employee."); return; }
    if (!form.scheduleId) { toast.error("Select a work schedule first."); return; }
    const input: ShiftAssignmentInput = { scheduleId: form.scheduleId, effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null, assignmentType: form.assignmentType.trim().toUpperCase(), isCurrent: form.isCurrent, remarks: form.remarks.trim() || null };
    setSaving(true);
    try {
      if (editing) {
        // added by wali: Preserve the one-employee edit action for existing assignments.
        await updateEmployeeShiftAssignmentRequest(editing.employeeId, editing.shiftAssignmentId, input);
      } else {
        // added by wali: Create missing assignments and update existing ones from the same bulk form submission.
        const employeeIds = [...selectedEmployeeIds];
        const results = await Promise.allSettled(employeeIds.map((employeeId) => {
          const existing = assignmentByEmployee.get(employeeId);
          return existing
            ? updateEmployeeShiftAssignmentRequest(existing.employeeId, existing.shiftAssignmentId, input)
            : createEmployeeShiftAssignmentRequest(employeeId, input);
        }));
        const failedIds = employeeIds.filter((_, index) => results[index].status === "rejected");
        const successCount = employeeIds.length - failedIds.length;
        setSelectedEmployeeIds(new Set(failedIds));
        if (!successCount) { toast.error(`Could not assign the schedule to the selected employees. ${failedIds.length} failed.`); return; }
        if (failedIds.length) toast.error(`Schedule assigned to ${successCount} employees; ${failedIds.length} could not be assigned. Failed employees remain selected.`);
        else toast.success(`Schedule assigned to ${successCount} employees.`);
      }
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      if (editing) toast.success("Schedule assignment updated.");
      setDialogOpen(false);
    } catch (error) { toast.error(normalizeApiError(error).message); }
    finally { setSaving(false); }
  };

  return <section className="wf-org-page wf-projects-page wf-attendance-page wf-attendance-scheduling">
    <PageHero title="Employee schedule assignments" description="Assign a completed weekly work schedule to each employee for an effective period." />
    <div className="wf-org-health-strip wf-attendance-health">
      {/* added by wali: Summarize employees in the current filter and employees with a schedule assignment. */}
      <div><span><UsersRound size={16} /></span><strong>{employeesQuery.isLoading || employeesQuery.isError ? "—" : employees.length}</strong><small>Employees in filter</small></div>
      <div><span><CalendarDays size={16} /></span><strong>{assignmentsQuery.isLoading || assignmentsQuery.isError ? "—" : assignedEmployeeCount}</strong><small>Assigned employees</small></div>
    </div>
    <section className="wf-org-resource wf-projects-resource">
      <div className="wf-org-resource-toolbar">
      <div className="wf-org-resource-toolbar__heading">
          <div><span>EMPLOYEE SCHEDULING</span><h2>Assign work schedules</h2><p>Select employees to assign a schedule or update their existing schedule together.</p></div>
          {canManage && <button className="wf-org-button wf-org-button--primary" onClick={openCreate} disabled={!selectedEmployeeIds.size || assignmentsQuery.isLoading}><Plus size={16} />Assign schedule{selectedEmployeeIds.size ? ` · ${selectedEmployeeIds.size}` : ""}</button>}
        </div>
        <div className={`wf-attendance-assignment-toolbar wf-attendance-assignment-toolbar--filters wf-attendance-assignment-toolbar--employee-filters${permissions.isBranchAdmin ? " wf-attendance-assignment-toolbar--branchless" : ""}`}>
          <label className="wf-org-search"><Search size={15} /><input value={employeeSearch} onChange={(event) => changeFilters(branchFilter, departmentFilter, event.target.value)} placeholder="Search employees" /></label>
          {/* added by wali: Hide branch filtering when the employee list is already limited to assigned branches. */}
          {!permissions.isBranchAdmin && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={branchFilter} placeholder="All branches" ariaLabel="Filter by branch" options={[{ value: "", label: "All branches" }, ...(branchesQuery.data?.branches ?? []).map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => changeFilters(value, "", employeeSearch)} allowClear={false} />}
          <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={departmentFilter} placeholder="All departments" ariaLabel="Filter by department" options={[{ value: "", label: "All departments" }, ...(departmentsQuery.data?.departments ?? []).map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={(value) => changeFilters(branchFilter, value, employeeSearch)} allowClear={false} />
          <span className="wf-attendance-assignment-toolbar__current">{selectedEmployeeIds.size ? `${selectedEmployeeIds.size} selected · ` : ""}{employees.length} employees</span>
          {/* added by wali: Match the icon-only refresh controls used across the other Attendance pages. */}
          <button type="button" className="wf-org-button wf-org-button--secondary" title="Refresh employees and assignments" aria-label="Refresh employees and assignments" onClick={() => { void employeesQuery.refetch(); void assignmentsQuery.refetch(); }}><RefreshCw className={employeesQuery.isFetching || assignmentsQuery.isFetching ? "spin" : ""} size={15} /></button>
        </div>
      </div>
      {/* added by wali: List every employee matching the filters, including employees who already have a schedule. */}
      {employeesQuery.isLoading || assignmentsQuery.isLoading ? <div className="wf-org-table-skeleton">Loading employees and schedule assignments…</div> : employeesQuery.isError ? <div className="wf-org-empty-state"><p>Employee directory could not be loaded.</p><button className="wf-org-button wf-org-button--secondary" onClick={() => void employeesQuery.refetch()}>Try again</button></div> : assignmentsQuery.isError ? <div className="wf-org-empty-state"><p>Employee schedule assignments could not be loaded.</p><button className="wf-org-button wf-org-button--secondary" onClick={() => void assignmentsQuery.refetch()}>Try again</button></div> : employees.length === 0 ? <OrganisationEmptyState title="No employees match these filters" description="Change the branch, department, or search text to see employees." canCreate={false} onCreate={() => undefined} onRetry={() => void employeesQuery.refetch()} isRetrying={employeesQuery.isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table"><thead><tr>{canManage && <th><input type="checkbox" aria-label="Select all employees" checked={allVisibleEmployeesSelected} disabled={!employees.length} onChange={toggleAllVisible} /></th>}<th>EMPLOYEE</th><th>BRANCH</th><th>DEPARTMENT</th><th>WORK SCHEDULE</th><th>EFFECTIVE PERIOD</th><th className="wf-attendance-status-column">STATUS</th>{canManage && <th className="wf-attendance-action-column">ACTION</th>}</tr></thead><tbody>{employees.map((employee) => {
        const assignment = assignmentByEmployee.get(employee.employeeId);
        return <tr key={employee.employeeId}>
          {canManage && <td><input type="checkbox" aria-label={`Select ${employee.fullName}`} checked={selectedEmployeeIds.has(employee.employeeId)} onChange={() => toggleEmployee(employee.employeeId)} /></td>}
          {/* added by wali: Keep employee names and codes clearly stacked in the assignment table. */}
          <td><div className="wf-org-record-title wf-attendance-assignment-employee"><span className="wf-org-record-icon"><UsersRound size={16} /></span><div className="wf-attendance-assignment-employee__details"><strong title={employee.fullName}>{employee.fullName}</strong><small>{employee.employeeCode}</small></div></div></td>
          <td>{employee.assignment.branchName ?? "Company-wide"}</td><td>{employee.assignment.departmentName ?? "No department"}</td>
          <td>{assignment ? <div className="wf-org-contact-lines"><strong>{assignment.scheduleName ?? assignment.shiftName ?? "Unassigned"}</strong><span>{assignment.scheduleCode ?? assignment.shiftCode ?? "—"}</span></div> : <span className="wf-attendance-shifts__subline">No schedule assigned</span>}</td>
          <td>{assignment ? `${assignment.effectiveFrom.slice(0, 10)} – ${assignment.effectiveTo?.slice(0, 10) ?? "Ongoing"}` : "—"}</td>
          <td className="wf-attendance-status-column"><span className={`wf-attendance-shifts__status ${assignment?.isCurrent ? "is-active" : ""}`}><i />{assignment ? assignment.isCurrent ? "Assigned" : "Scheduled / past" : "Unassigned"}</span></td>
          {canManage && <td className="wf-attendance-action-column">{assignment && <button className="wf-org-button wf-org-button--secondary" onClick={() => openEdit(assignment)}><Edit3 size={14} />Edit</button>}</td>}
        </tr>;
      })}</tbody></table></div>}
    </section>
    <OrganisationDialog open={dialogOpen} title={editing ? "Edit schedule assignment" : `Assign work schedule to ${selectedEmployeeIds.size} employees`} subtitle={editing ? `Update the weekly schedule assigned to ${editing.employeeName}.` : `The selected schedule will be assigned to ${selectedEmployeeIds.size} selected employees.`} submitLabel={editing ? "Save assignment" : `Assign to ${selectedEmployeeIds.size} employees`} busy={saving} onClose={() => setDialogOpen(false)} onSubmit={(event) => void save(event)}>
      <div className="wf-org-form-grid">
        {editing && <OrganisationField label="Employee"><TextInput value={`${editing.employeeName} · ${editing.employeeCode}`} disabled /></OrganisationField>}
        <OrganisationField label="Work schedule" required hint="The schedule already contains the shifts assigned to each weekday."><SelectInput required value={form.scheduleId} onChange={(event) => setForm({ ...form, scheduleId: event.target.value })}><option value="">Select work schedule</option>{schedulesQuery.data?.filter((item) => item.isActive || item.scheduleId === form.scheduleId).map((schedule) => <option key={schedule.scheduleId} value={schedule.scheduleId}>{schedule.scheduleName} · {schedule.scheduleCode}</option>)}</SelectInput></OrganisationField>
        <OrganisationField label="Effective from" required><TextInput type="date" required value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} /></OrganisationField>
        <OrganisationField label="Effective to"><TextInput type="date" min={form.effectiveFrom} value={form.effectiveTo} onChange={(event) => setForm({ ...form, effectiveTo: event.target.value })} /></OrganisationField>
        <OrganisationField label="Assignment type" required><TextInput required maxLength={30} value={form.assignmentType} onChange={(event) => setForm({ ...form, assignmentType: event.target.value })} placeholder="REGULAR" /></OrganisationField>
        <OrganisationField label="Remarks"><TextAreaInput rows={2} maxLength={500} value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></OrganisationField>
        <div className="wf-attendance-shifts__checks"><label><input type="checkbox" checked={form.isCurrent} onChange={(event) => setForm({ ...form, isCurrent: event.target.checked })} />Mark as current assignment</label></div>
      </div>
    </OrganisationDialog>
  </section>;
}

export function AttendanceWorkSchedulesPage() { return <WorkSchedulesView />; }
export function AttendanceShiftAssignmentsPage() { return <ShiftAssignmentsView />; }

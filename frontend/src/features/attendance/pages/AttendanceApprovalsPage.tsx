import { Fragment, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarCheck2, Check, ChevronRight, Clock3, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { usePermissions } from "../../../hooks/usePermissions";
import { listBranchesRequest } from "../../branches/api/branch.api";
import { listDepartmentsRequest } from "../../organisation/api/organisation.api";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { OrganisationField, TextAreaInput } from "../../organisation/components/OrganisationField";
import { decideAttendanceAdjustmentRequest, finalizeAttendanceMonthRequest, listAttendanceAdjustmentRequestsRequest, listAttendanceHistoryRecordsRequest } from "../api/attendance.api";
import type { AttendanceAdjustmentRequest } from "../api/attendance.api";
import type { AttendanceRecord } from "../types/attendance.types";
import "../attendance.css";

type ApprovalQueue = "RECORDS" | "ADJUSTMENTS";
type AdjustmentDecision = "approve" | "reject";
interface EmployeeMonthGroup {
  yearMonth: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branchName: string | null;
  records: AttendanceRecord[];
}

interface AttendanceMonthGroup {
  yearMonth: string;
  employees: EmployeeMonthGroup[];
}

function approvalDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function approvalTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
}

function approvalDuration(minutes: number) {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function monthLabel(yearMonth: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${yearMonth}-01T00:00:00Z`));
}

export function AttendanceApprovalsPage() {
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission, hasPermission, isBranchAdmin } = usePermissions();
  const companyId = user?.companyId ?? undefined;
  const companyIdentityQuery = useCurrentCompanyIdentity(companyId ?? null);
  const queryClient = useQueryClient();
  const canViewRecords = hasAnyPermission(["attendance.view", "attendance.finalize", "attendance.manage"]);
  const canFinalize = hasAnyPermission(["attendance.finalize", "attendance.manage"]);
  const canViewAdjustments = hasAnyPermission(["attendance.adjustment.view", "attendance.adjustment.manage", "attendance.adjustment.approve", "attendance.manage"]);
  const canApproveAdjustments = hasAnyPermission(["attendance.adjustment.approve", "attendance.manage"]);
  const [queue, setQueue] = useState<ApprovalQueue>(canViewRecords ? "RECORDS" : "ADJUSTMENTS");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<AttendanceAdjustmentRequest | null>(null);
  const [decision, setDecision] = useState<AdjustmentDecision>("approve");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizingMonth, setFinalizingMonth] = useState<string | null>(null);
  const pageSize = 20;

  // added by wali: Load branch and department options so monthly review respects the same organization scope as Records.
  const branchQuery = useQuery({
    queryKey: ["attendance", "approvals-branches", companyId],
    queryFn: () => listBranchesRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "branch_name", isActive: true, ...(companyId ? { companyId } : {}) }),
    enabled: Boolean(companyId && hasPermission("branch.view")),
  });
  const departmentQuery = useQuery({
    queryKey: ["attendance", "approvals-departments", companyId, branchId],
    queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "department_name", isActive: true, ...(companyId ? { companyId } : {}), ...(branchId !== "ALL" ? { branchId } : {}) }),
    enabled: Boolean(companyId && hasPermission("department.view")),
  });
  const adjustmentsCountQuery = useQuery({
    queryKey: ["attendance", "approvals", "adjustments-count"],
    queryFn: () => listAttendanceAdjustmentRequestsRequest({ page: 1, pageSize: 1, requestStatus: "PENDING" }),
    enabled: canViewAdjustments,
  });
  const recordsQuery = useQuery({
    queryKey: ["attendance", "approvals", "month-records", branchId, departmentId],
    queryFn: () => listAttendanceHistoryRecordsRequest({
      ...(branchId !== "ALL" ? { branchId } : {}),
      ...(departmentId !== "ALL" ? { departmentId } : {}),
    }),
    enabled: canViewRecords && queue === "RECORDS",
  });
  const adjustmentsQuery = useQuery({
    queryKey: ["attendance", "approvals", "adjustments", page, search],
    queryFn: () => listAttendanceAdjustmentRequestsRequest({ page, pageSize: 25, requestStatus: "PENDING", ...(search.trim() ? { search: search.trim() } : {}) }),
    enabled: canViewAdjustments && queue === "ADJUSTMENTS",
  });

  // added by wali: Put months at the top level, then group each month into employee review rows.
  const monthGroups = useMemo<AttendanceMonthGroup[]>(() => {
    const months = new Map<string, Map<string, EmployeeMonthGroup>>();
    for (const record of recordsQuery.data ?? []) {
      const yearMonth = record.attendanceDate.slice(0, 7);
      const employeeGroups = months.get(yearMonth) ?? new Map<string, EmployeeMonthGroup>();
      const group = employeeGroups.get(record.employeeId) ?? {
        yearMonth,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        employeeCode: record.employeeCode,
        branchName: record.branchName,
        records: [],
      };
      group.records.push(record);
      employeeGroups.set(record.employeeId, group);
      months.set(yearMonth, employeeGroups);
    }
    return [...months.entries()].map(([yearMonth, employeeGroups]) => ({
      yearMonth,
      employees: [...employeeGroups.values()].map((group) => ({
        ...group,
        records: group.records.sort((left, right) => left.attendanceDate.localeCompare(right.attendanceDate)),
      })).sort((left, right) => left.employeeName.localeCompare(right.employeeName)),
    })).sort((left, right) => right.yearMonth.localeCompare(left.yearMonth));
  }, [recordsQuery.data]);
  // added by wali: Search the month rows themselves instead of filtering their employee contents.
  const filteredMonthGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return normalizedSearch
      ? monthGroups.filter((month) => `${monthLabel(month.yearMonth)} ${month.yearMonth}`.toLowerCase().includes(normalizedSearch))
      : monthGroups;
  }, [monthGroups, search]);
  const totalPages = queue === "RECORDS" ? Math.ceil(filteredMonthGroups.length / pageSize) : (adjustmentsQuery.data?.pagination.totalPages ?? 0);
  const visibleMonthGroups = filteredMonthGroups.slice((page - 1) * pageSize, page * pageSize);
  const totalRecords = queue === "RECORDS" ? filteredMonthGroups.length : (adjustmentsQuery.data?.pagination.totalRecords ?? 0);
  const isLoading = queue === "RECORDS" ? recordsQuery.isLoading : adjustmentsQuery.isLoading;
  const isFetching = queue === "RECORDS" ? recordsQuery.isFetching : adjustmentsQuery.isFetching;
  const queryError = queue === "RECORDS" ? recordsQuery.isError : adjustmentsQuery.isError;
  const pendingMonthCount = filteredMonthGroups.filter((month) => month.employees.some((employee) => employee.records.some((record) => !record.isFinalized))).length;
  const pendingCount = adjustmentsCountQuery.data?.pagination.totalRecords ?? 0;
  const selectedMonthGroup = monthGroups.find((month) => month.yearMonth === selectedMonth) ?? null;

  // added by wali: Let reviewers dismiss the month spreadsheet popup with Escape.
  useEffect(() => {
    if (!selectedMonth) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedMonth(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMonth]);

  function changeQueue(nextQueue: ApprovalQueue) {
    setQueue(nextQueue);
    setSearch("");
    setPage(1);
  }

  async function finalizeMonth(group: EmployeeMonthGroup) {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    if (group.yearMonth >= currentMonth) {
      toast.error("Only a completed month can be finalized.");
      return;
    }
    const count = group.records.length;
    const confirmed = window.confirm(`Finalize ${group.employeeName}'s attendance for ${group.yearMonth}? This will review and lock ${count} daily record${count === 1 ? "" : "s"} together.`);
    if (!confirmed) return;
    try {
      await finalizeAttendanceMonthRequest(group.employeeId, group.yearMonth);
      toast.success(`${group.employeeName}'s ${group.yearMonth} attendance month was finalized.`);
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  // added by wali: Finalize each unfinalized employee-month in the selected calendar month from its month-row action.
  async function finalizeCalendarMonth(month: AttendanceMonthGroup) {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    if (month.yearMonth >= currentMonth) {
      toast.error("Only a completed month can be finalized.");
      return;
    }
    const employeesToFinalize = month.employees.filter((employee) => employee.records.some((record) => !record.isFinalized));
    if (employeesToFinalize.length === 0) return;
    const confirmed = window.confirm(`Finalize ${monthLabel(month.yearMonth)} for ${employeesToFinalize.length} employee${employeesToFinalize.length === 1 ? "" : "s"}?`);
    if (!confirmed) return;

    setFinalizingMonth(month.yearMonth);
    const finalizedEmployees: string[] = [];
    const failedEmployees: string[] = [];
    try {
      // added by wali: Use the atomic employee-month endpoint for each employee and continue to report any blocked employee.
      for (const employee of employeesToFinalize) {
        try {
          await finalizeAttendanceMonthRequest(employee.employeeId, month.yearMonth);
          finalizedEmployees.push(employee.employeeName);
        } catch {
          failedEmployees.push(employee.employeeName);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      if (failedEmployees.length > 0) {
        toast.error(`Finalized ${finalizedEmployees.length} of ${employeesToFinalize.length} employees. Review blocked records for: ${failedEmployees.join(", ")}.`);
      } else {
        toast.success(`${monthLabel(month.yearMonth)} finalized for ${finalizedEmployees.length} employees.`);
      }
    } finally {
      setFinalizingMonth(null);
    }
  }

  function openDecision(request: AttendanceAdjustmentRequest, nextDecision: AdjustmentDecision) {
    setDecisionTarget(request);
    setDecision(nextDecision);
    setComments("");
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decisionTarget) return;
    const trimmedComments = comments.trim();
    if (decision === "reject" && trimmedComments.length < 3) {
      toast.error("Add a reason with at least 3 characters to reject this request.");
      return;
    }
    setSaving(true);
    try {
      await decideAttendanceAdjustmentRequest(decisionTarget.adjustmentRequestId, decision, {
        approvalLevel: 1,
        ...(trimmedComments ? { comments: trimmedComments } : {}),
      });
      toast.success(decision === "approve" ? "Adjustment request approved." : "Adjustment request rejected.");
      setDecisionTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  // added by wali: Render the selected month as a spreadsheet inside the review popup.
  function renderMonthSpreadsheet(month: AttendanceMonthGroup) {
    const numberOfDays = new Date(Number(month.yearMonth.slice(0, 4)), Number(month.yearMonth.slice(5, 7)), 0).getDate();
    const days = Array.from({ length: numberOfDays }, (_, index) => `${month.yearMonth}-${String(index + 1).padStart(2, "0")}`);
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    return <div className="wf-attendance-spreadsheet-wrap"><table className="wf-org-table wf-attendance-table wf-attendance-spreadsheet"><thead><tr><th className="wf-attendance-spreadsheet__employee">EMPLOYEE</th>{days.map((day) => <th key={day}>{Number(day.slice(-2))} {new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))}</th>)}<th className="wf-attendance-spreadsheet__action">MONTH REVIEW</th></tr></thead><tbody>{month.employees.map((employee) => {
      const key = `${employee.employeeId}-${employee.yearMonth}`;
      const finalized = employee.records.every((record) => record.isFinalized);
      const recordByDate = new Map(employee.records.map((record) => [record.attendanceDate.slice(0, 10), record]));
      return <tr key={key}><td className="wf-attendance-spreadsheet__employee"><div><strong>{employee.employeeName}</strong><small>{employee.employeeCode}{employee.branchName ? ` · ${employee.branchName}` : ""}</small></div></td>{days.map((day) => {
        const record = recordByDate.get(day);
        return <td key={day} className={record ? "wf-attendance-spreadsheet__day is-recorded" : "wf-attendance-spreadsheet__day"} title={record ? `${employee.employeeName} · ${approvalDate(day)}` : `${approvalDate(day)} · No record`}>
          {record ? <div className="wf-attendance-spreadsheet__cell"><span>In <b>{approvalTime(record.checkInAt)}</b></span><span>Out <b>{approvalTime(record.checkOutAt)}</b></span><span>Break <b>{approvalDuration(record.totalBreakMinutes)}</b></span><span>Work <b>{approvalDuration(record.totalWorkMinutes)}</b></span>{record.lateMinutes > 0 && <span className="is-late">Late <b>{approvalDuration(record.lateMinutes)}</b></span>}</div> : <span className="wf-attendance-spreadsheet__empty">—</span>}
        </td>;
      })}<td className="wf-attendance-spreadsheet__action">{finalized ? <span className="wf-attendance-review is-finalized">Finalized</span> : canFinalize ? <button type="button" className="wf-org-button wf-org-button--primary" disabled={month.yearMonth >= currentMonth} title={month.yearMonth >= currentMonth ? "A month can be finalized after it has ended." : undefined} onClick={() => void finalizeMonth(employee)}>Finalize month</button> : <span className="wf-attendance-review">Needs review</span>}</td></tr>;
    })}</tbody></table></div>;
  }

  return (
    <section className="wf-org-page wf-attendance-page wf-attendance-page--records wf-attendance-approvals">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><ShieldCheck size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">People operations | attendance review</span><h1>Approvals</h1><p>Review each employee’s attendance month before finalizing it, and process punch correction requests.</p></div></div>
        <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Working company</span><strong>{companyIdentityQuery.data?.displayName ?? (companyIdentityQuery.isLoading ? "Loading company…" : "Your company")}</strong></div></div>
      </header>

      <div className="wf-org-health-strip wf-attendance-health wf-attendance-approvals__metrics">
        {canViewRecords && <button type="button" className={queue === "RECORDS" ? "is-selected" : ""} onClick={() => changeQueue("RECORDS")}><span><Clock3 size={16} /></span><strong>{recordsQuery.isLoading ? "—" : pendingMonthCount}</strong><small>Employee months to finalize</small></button>}
        {canViewAdjustments && <button type="button" className={queue === "ADJUSTMENTS" ? "is-selected" : ""} onClick={() => changeQueue("ADJUSTMENTS")}><span><CalendarCheck2 size={16} /></span><strong>{adjustmentsCountQuery.isLoading && !adjustmentsCountQuery.data ? "—" : pendingCount}</strong><small>Pending adjustments</small></button>}
      </div>

      <section className="wf-org-resource wf-attendance-resource wf-attendance-approvals__resource">
        <div className="wf-org-resource-toolbar">
          <div className="wf-org-resource-toolbar__heading"><div><span>REVIEW QUEUE</span><h2>{queue === "RECORDS" ? "Monthly attendance" : "Adjustment requests"}</h2><p>{queue === "RECORDS" ? "Open an employee’s month to review daily punches, breaks, and work time before finalizing." : "Compare requested punch changes with the current record before deciding."}</p></div></div>
          <div className="wf-org-resource-toolbar__tools">
            <label className="wf-org-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setSelectedMonth(null); }} placeholder={queue === "RECORDS" ? "Search months" : "Search requests"} /></label>
            {queue === "RECORDS" ? <>
              {/* added by wali: Hide branch filtering because Branch Admin approval data is already restricted by the backend. */}
              {!isBranchAdmin && branchQuery.data?.branches && branchQuery.data.branches.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={branchId} placeholder="All branches" ariaLabel="Filter monthly attendance by branch" options={[{ value: "ALL", label: "All branches" }, ...branchQuery.data.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setBranchId(value); setDepartmentId("ALL"); setPage(1); setSelectedMonth(null); }} allowClear={false} />}
              {departmentQuery.data?.departments && departmentQuery.data.departments.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={departmentId} placeholder="All departments" ariaLabel="Filter monthly attendance by department" options={[{ value: "ALL", label: "All departments" }, ...departmentQuery.data.departments.map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={(value) => { setDepartmentId(value); setPage(1); setSelectedMonth(null); }} allowClear={false} />}
            </> : null}
            <div className="wf-org-resource-toolbar__pager"><span>{totalRecords} {queue === "RECORDS" ? "months" : "requests"}</span><button type="button" aria-label="Refresh approval queue" onClick={() => void (queue === "RECORDS" ? recordsQuery.refetch() : adjustmentsQuery.refetch())}><RefreshCw className={isFetching ? "spin" : ""} size={15} /></button></div>
          </div>
        </div>

        {isLoading ? <div className="wf-org-table-skeleton">Loading review queue...</div> : queryError ? <OrganisationEmptyState title="Review queue could not be loaded" description="Check your attendance review permissions and try again." canCreate={false} onCreate={() => undefined} onRetry={() => void (queue === "RECORDS" ? recordsQuery.refetch() : adjustmentsQuery.refetch())} isRetrying={isFetching} /> : queue === "RECORDS" ? (
          monthGroups.length === 0 ? <OrganisationEmptyState title="No attendance history found" description="Attendance months will appear here when employee records exist. Change the branch or department filters to broaden the results." canCreate={false} onCreate={() => undefined} onRetry={() => void recordsQuery.refetch()} isRetrying={isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>MONTH</th><th>EMPLOYEES</th><th>DAILY RECORDS</th><th>CHECK INS</th><th>CHECK OUTS</th><th className="wf-attendance-month-finalize-cell">FINALIZE</th></tr></thead><tbody>{visibleMonthGroups.map((month) => {
            // added by wali: Keep summary totals to counts; employee work time stays visible by day in the month spreadsheet.
            const allRecords = month.employees.flatMap((employee) => employee.records);
            const pendingEmployees = month.employees.filter((employee) => employee.records.some((record) => !record.isFinalized)).length;
            const checkIns = allRecords.filter((record) => record.checkInAt).length;
            const checkOuts = allRecords.filter((record) => record.checkOutAt).length;
            return <Fragment key={month.yearMonth}>
              <tr className="wf-attendance-month-row">
                <td><div className="wf-org-record-title"><button type="button" className="wf-attendance-month-toggle" aria-label={`Open ${monthLabel(month.yearMonth)} attendance`} onClick={() => setSelectedMonth(month.yearMonth)}><ChevronRight size={16} /></button><span className="wf-org-record-icon"><CalendarCheck2 size={16} /></span><div><strong>{monthLabel(month.yearMonth)}</strong><small>{month.employees.length} employees with attendance</small></div></div></td>
                <td>{month.employees.length}</td><td>{allRecords.length}</td><td>{checkIns}</td><td>{checkOuts}</td><td className="wf-attendance-month-finalize-cell">{pendingEmployees === 0 ? <span className="wf-attendance-review is-finalized">Finalized</span> : canFinalize ? <button type="button" className="wf-org-button wf-org-button--primary" disabled={Boolean(finalizingMonth) || month.yearMonth >= `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`} title={month.yearMonth >= `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}` ? "A month can be finalized after it has ended." : undefined} onClick={() => void finalizeCalendarMonth(month)}>{finalizingMonth === month.yearMonth ? "Finalizing…" : "Finalize month"}</button> : <span className="wf-attendance-review">Review required</span>}</td>
              </tr>
            </Fragment>;
          })}</tbody></table></div>
        ) : (
          (adjustmentsQuery.data?.adjustmentRequests.length ?? 0) === 0 ? <OrganisationEmptyState title="No pending adjustment requests" description="Employee punch corrections awaiting a decision will appear here." canCreate={false} onCreate={() => undefined} onRetry={() => void adjustmentsQuery.refetch()} isRetrying={isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>EMPLOYEE</th><th>DATE</th><th>CHANGE REQUESTED</th><th>REASON</th><th>STATUS</th>{canApproveAdjustments && <th>ACTION</th>}</tr></thead><tbody>{adjustmentsQuery.data?.adjustmentRequests.map((request) => <tr key={request.adjustmentRequestId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><CalendarCheck2 size={16} /></span><div><strong>{request.employeeName}</strong><small>{request.employeeCode}</small></div></div></td><td>{approvalDate(request.attendanceDate)}</td><td><div className="wf-org-contact-lines"><span>Check in: {approvalTime(request.currentCheckInAt)} to {approvalTime(request.requestedCheckInAt)}</span><span>Check out: {approvalTime(request.currentCheckOutAt)} to {approvalTime(request.requestedCheckOutAt)}</span></div></td><td className="wf-attendance-approval-reason" title={request.reason}>{request.reason}</td><td><span className="wf-attendance-review">Pending</span></td>{canApproveAdjustments && <td><div className="wf-attendance-approval-actions"><button type="button" className="wf-org-button wf-org-button--primary" onClick={() => openDecision(request, "approve")}><Check size={14} />Approve</button><button type="button" className="wf-org-button wf-org-button--secondary" onClick={() => openDecision(request, "reject")}><X size={14} />Reject</button></div></td>}</tr>)}</tbody></table></div>
        )}

        {totalPages > 1 && <footer className="wf-attendance-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></footer>}
      </section>

      {selectedMonthGroup && <div className="wf-attendance-month-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedMonth(null)}><section className="wf-attendance-month-dialog" role="dialog" aria-modal="true" aria-labelledby="wf-attendance-month-dialog-title" onMouseDown={(event) => event.stopPropagation()}><header className="wf-attendance-month-dialog__header"><div><span>MONTHLY ATTENDANCE REVIEW</span><h2 id="wf-attendance-month-dialog-title">{monthLabel(selectedMonthGroup.yearMonth)}</h2><p>{selectedMonthGroup.employees.length} employees · {selectedMonthGroup.employees.reduce((total, employee) => total + employee.records.length, 0)} daily records. Scroll horizontally to review every day.</p></div><button type="button" aria-label="Close monthly attendance" onClick={() => setSelectedMonth(null)}><X size={20} /></button></header><div className="wf-attendance-month-dialog__body">{renderMonthSpreadsheet(selectedMonthGroup)}</div></section></div>}

      <OrganisationDialog open={Boolean(decisionTarget)} title={decision === "approve" ? "Approve adjustment request" : "Reject adjustment request"} subtitle={decisionTarget ? `${decisionTarget.employeeName} | ${approvalDate(decisionTarget.attendanceDate)}` : "Review the requested attendance correction."} submitLabel={decision === "approve" ? "Approve request" : "Reject request"} busy={saving} onClose={() => setDecisionTarget(null)} onSubmit={(event) => void submitDecision(event)}>
        {decisionTarget && <div className="wf-attendance-approval-dialog-summary"><strong>{decisionTarget.adjustmentType.replaceAll("_", " ")}</strong><p>{decisionTarget.reason}</p><div><span>Check in: {approvalTime(decisionTarget.currentCheckInAt)} to {approvalTime(decisionTarget.requestedCheckInAt)}</span><span>Check out: {approvalTime(decisionTarget.currentCheckOutAt)} to {approvalTime(decisionTarget.requestedCheckOutAt)}</span></div></div>}
        <OrganisationField label={decision === "approve" ? "Comments" : "Rejection reason"} required={decision === "reject"} hint={decision === "approve" ? "Optional note for the approval history." : "A short reason is required."}><TextAreaInput rows={3} maxLength={5000} value={comments} onChange={(event) => setComments(event.target.value)} /></OrganisationField>
      </OrganisationDialog>
    </section>
  );
}

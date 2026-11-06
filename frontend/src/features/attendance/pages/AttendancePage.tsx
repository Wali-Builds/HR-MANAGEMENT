import { useMemo, useState } from "react";
import { Building2, CalendarCheck2, CheckCircle2, Clock3, Download, History, RefreshCw, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { listBranchesRequest } from "../../branches/api/branch.api";
// added by wali: Load company departments for attendance filtering.
import { listDepartmentsRequest } from "../../organisation/api/organisation.api";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { listAttendanceRecordsRequest, listEmployeeAttendanceRequest } from "../api/attendance.api";
import { useAttendanceDailySummary, useAttendanceRecords, useAttendanceShifts, useCheckInAttendance, useCheckOutAttendance } from "../hooks/useAttendance";
import type { AttendanceRecord } from "../types/attendance.types";
import "../attendance.css";

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function displayTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function displayHours(minutes: number) {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission, hasPermission } = usePermissions();
  const companyId = user?.companyId ?? undefined;
  const employeeId = user?.employeeId ?? undefined;
  const today = localDate();
  const [showPreviousRecords, setShowPreviousRecords] = useState(false);
  const isOverview = !showPreviousRecords;
  const canViewTeam = hasAnyPermission(["attendance.view", "attendance.manage", "attendance.finalize"]);
  const personalView = !canViewTeam && Boolean(employeeId && hasPermission("employee.view_self"));
  const companyIdentityQuery = useCurrentCompanyIdentity(companyId ?? null);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("ALL");
  const [shiftId, setShiftId] = useState("ALL");
  // added by wali: Keep department selection alongside branch and shift filters.
  const [departmentId, setDepartmentId] = useState("ALL");
  // added by wali: Keep finalization review filtering separate from attendance status, which is not used in Records.
  const [finalizationStatus, setFinalizationStatus] = useState<"ALL" | "FINALIZED" | "UNFINALIZED">("ALL");
  const [page, setPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  // added by wali: Prepare a previous-days range while the single Records page opens on today's activity.
  const [dateFrom, setDateFrom] = useState(() => { const start = new Date(); start.setDate(start.getDate() - 30); return localDate(start); });
  const [dateTo, setDateTo] = useState(() => { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); return localDate(yesterday); });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const previousDate = localDate(yesterday);
  const shiftQuery = useAttendanceShifts(hasAnyPermission(["attendance.scheduling.view", "attendance.scheduling.manage", "attendance.scheduling.assign", "attendance.manage"]));
  const branchQuery = useQuery({
    queryKey: ["attendance", "branches", companyId],
    queryFn: () => listBranchesRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "branch_name", isActive: true, ...(companyId ? { companyId } : {}) }),
    enabled: Boolean(companyId && hasPermission("branch.view")),
  });
  const departmentQuery = useQuery({
    queryKey: ["attendance", "departments", companyId, branchId],
    queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "department_name", isActive: true, ...(companyId ? { companyId } : {}), ...(branchId !== "ALL" ? { branchId } : {}) }),
    enabled: Boolean(companyId && !personalView && hasPermission("department.view")),
  });
  const queryParams = useMemo(() => ({
    page,
    pageSize: 100,
    dateFrom: showPreviousRecords ? dateFrom : today,
    dateTo: showPreviousRecords ? dateTo : today,
    ...(!personalView && branchId !== "ALL" ? { branchId } : {}),
    ...(!personalView && departmentId !== "ALL" ? { departmentId } : {}),
    ...(!personalView && shiftId !== "ALL" ? { shiftId } : {}),
    ...(showPreviousRecords && finalizationStatus !== "ALL" ? { finalizationStatus } : {}),
    ...(!personalView && search.trim() ? { search: search.trim() } : {}),
  }), [branchId, dateFrom, dateTo, departmentId, finalizationStatus, page, personalView, search, shiftId, showPreviousRecords, today]);
  const queryEnabled = Boolean(personalView ? employeeId : companyId);
  const query = useAttendanceRecords(queryParams, personalView ? employeeId : undefined, queryEnabled);
  const summaryQuery = useAttendanceDailySummary(queryParams, personalView ? employeeId : undefined, queryEnabled && !showPreviousRecords);
  const checkInMutation = useCheckInAttendance();
  const checkOutMutation = useCheckOutAttendance();
  const records = query.data?.attendanceRecords ?? [];
  const visibleRecords = personalView && search.trim()
    ? records.filter((record) => `${record.statusName} ${record.shiftName ?? ""} ${record.scheduleName ?? ""} ${record.notes ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    : records;
  const todayRecord = personalView && !showPreviousRecords ? records.find((record) => record.attendanceDate.slice(0, 10) === today) : undefined;
  const busy = checkInMutation.isPending || checkOutMutation.isPending;
  const totalRecords = query.data?.pagination.totalRecords ?? records.length;
  const hasRecordFilters = Boolean(showPreviousRecords || search.trim() || branchId !== "ALL" || departmentId !== "ALL" || shiftId !== "ALL" || finalizationStatus !== "ALL");

  async function handleCheckIn(record: AttendanceRecord) {
    try {
      await checkInMutation.mutateAsync(record.attendanceId);
      toast.success("You’re checked in.");
    } catch (error) { toast.error(normalizeApiError(error).message); }
  }

  async function handleCheckOut(record: AttendanceRecord) {
    try {
      await checkOutMutation.mutateAsync(record.attendanceId);
      toast.success("You’re checked out.");
    } catch (error) { toast.error(normalizeApiError(error).message); }
  }

  function refreshRecords() {
    // added by wali: Return the attendance workspace to its top when the user refreshes the record list.
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    void query.refetch();
  }

  // added by wali: Switch between today's attendance and the previous-days record history in this single page.
  function toggleRecordPeriod() {
    setShowPreviousRecords((current) => !current);
    setPage(1);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  // added by wali: Export every row matching the active Records filters while retaining source timestamps.
  async function downloadRecords() {
    setIsDownloading(true);
    try {
      const requestPage = (requestedPage: number) => {
        const params = { ...queryParams, page: requestedPage, pageSize: 100 };
        return personalView && employeeId
          ? listEmployeeAttendanceRequest(employeeId, params)
          : listAttendanceRecordsRequest(params);
      };
      const firstPage = await requestPage(1);
      const laterPages = [];
      for (let firstPageNumber = 2; firstPageNumber <= firstPage.pagination.totalPages; firstPageNumber += 5) {
        const batch = Array.from(
          { length: Math.min(5, firstPage.pagination.totalPages - firstPageNumber + 1) },
          (_, index) => requestPage(firstPageNumber + index),
        );
        laterPages.push(...await Promise.all(batch));
      }
      const allRecords = [firstPage, ...laterPages].flatMap((result) => result.attendanceRecords);
      const cell = (value: string | number | null | undefined) => {
        const raw = value == null ? "" : String(value);
        return `"${raw.replaceAll('"', '""')}"`;
      };
      const rows = [
        ["Employee", "Employee code", "Date", "Shift", "Work schedule", "Check-in timestamp", "Check-out timestamp", "Work minutes", "Late minutes", "Status", "Review"],
        ...allRecords.map((record) => [record.employeeName, record.employeeCode, record.attendanceDate.slice(0, 10), record.shiftName ?? "", record.scheduleName ?? "", record.checkInAt ?? "", record.checkOutAt ?? "", record.totalWorkMinutes, record.lateMinutes, record.statusName, record.isFinalized ? "Finalized" : "Open"]),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = showPreviousRecords ? `attendance-records-${dateFrom}-to-${dateTo}.csv` : `attendance-records-${today}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success(`Downloaded ${allRecords.length} attendance records.`);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setIsDownloading(false);
    }
  }

  // added by wali: Ask for confirmation before starting the attendance CSV download.
  function confirmDownloadRecords() {
    const period = showPreviousRecords ? `${dateFrom} through ${dateTo}` : `today (${today})`;
    if (!window.confirm(`Download ${totalRecords} attendance records for ${period} as a CSV file?`)) return;
    void downloadRecords();
  }

  return (
    <section className="wf-org-page wf-attendance-page wf-attendance-page--records">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><CalendarCheck2 size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">People operations · {isOverview ? displayDate(today) : "Previous attendance"}</span><h1>Attendance records</h1><p>{isOverview ? personalView ? "Your check-in, check-out and work time for today." : "Today's employee check-ins, check-outs, late arrivals and absences." : "Review employee check-ins and check-outs from previous days."}</p></div></div>
        <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Working company</span><strong>{companyIdentityQuery.data?.displayName ?? (companyIdentityQuery.isLoading ? "Loading company…" : "Your company")}</strong></div></div>
      </header>

      {isOverview && <div className="wf-org-health-strip wf-attendance-health">
        <div><span><CheckCircle2 size={16} /></span><strong>{summaryQuery.data?.checkedIn ?? "—"}</strong><small>Checked in today</small></div>
        <div><span><CalendarCheck2 size={16} /></span><strong>{summaryQuery.data?.checkedOut ?? "—"}</strong><small>Checked out today</small></div>
        <div><span><Clock3 size={16} /></span><strong>{summaryQuery.data?.lateArrivals ?? "—"}</strong><small>Late arrivals today</small></div>
        <div><span><UsersRound size={16} /></span><strong>{summaryQuery.data?.absentEmployees ?? (summaryQuery.isLoading ? "—" : 0)}</strong><small>Absent today</small></div>
      </div>}

      {isOverview && personalView && todayRecord && <section className="wf-attendance-punch-card"><div className="wf-attendance-punch-card__copy"><span className="wf-org-hero__eyebrow">Today · {displayDate(today)}</span><h2>{todayRecord.checkInAt ? todayRecord.checkOutAt ? "Your workday is complete" : "You’re checked in" : "Ready to start your day?"}</h2><p>{todayRecord.checkInAt ? `Checked in at ${displayTime(todayRecord.checkInAt)}${todayRecord.checkOutAt ? ` · checked out at ${displayTime(todayRecord.checkOutAt)}` : ""}` : "Use the button to record your check-in."}</p></div><div className="wf-attendance-punch-card__action">{!todayRecord.checkInAt ? <button type="button" className="wf-org-button wf-org-button--primary" disabled={busy || todayRecord.isFinalized} onClick={() => void handleCheckIn(todayRecord)}><Clock3 size={16} /> Check in</button> : !todayRecord.checkOutAt ? <button type="button" className="wf-org-button wf-org-button--primary" disabled={busy || todayRecord.isFinalized} onClick={() => void handleCheckOut(todayRecord)}><CheckCircle2 size={16} /> Check out</button> : <span className="wf-attendance-complete"><CheckCircle2 size={16} /> Completed</span>}</div></section>}

      <section className="wf-org-resource wf-attendance-resource">
        <header className="wf-org-resource-toolbar">
          <div className="wf-org-resource-toolbar__heading"><div><span>{isOverview ? `Today's records · ${displayDate(today)}` : "Previous records"}</span><h2>{personalView ? "My attendance" : isOverview ? "Today's attendance" : "Previous attendance records"}</h2><p>{personalView ? "Your check-in, check-out and attendance status." : isOverview ? "See today's check-ins, check-outs, late arrivals and absences." : "Filter and review check-ins and check-outs from earlier days."}</p></div><div className="wf-attendance-record-actions"><button type="button" className="wf-org-button wf-org-button--secondary" disabled={isDownloading || query.isLoading} onClick={confirmDownloadRecords}><Download size={15} />{isDownloading ? "Downloading…" : "Download"}</button><button type="button" className="wf-org-button wf-org-button--secondary wf-attendance-period-toggle" onClick={toggleRecordPeriod}>{showPreviousRecords ? <CalendarCheck2 size={15} /> : <History size={15} />}{showPreviousRecords ? "Today's records" : "Previous records"}</button></div></div>
          <div className="wf-org-resource-toolbar__tools">
            <label className="wf-org-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={personalView ? "Search records" : "Search employees"} /></label>
            {!personalView && branchQuery.data?.branches && branchQuery.data.branches.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={branchId} placeholder="All branches" options={[{ value: "ALL", label: "All branches" }, ...branchQuery.data.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setBranchId(value); setDepartmentId("ALL"); setPage(1); }} allowClear={false} />}
            {!personalView && departmentQuery.data?.departments && departmentQuery.data.departments.length > 0 && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={departmentId} placeholder="All departments" options={[{ value: "ALL", label: "All departments" }, ...departmentQuery.data.departments.map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={(value) => { setDepartmentId(value); setPage(1); }} allowClear={false} />}
            {!personalView && shiftQuery.data && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={shiftId} placeholder="All shifts" options={[{ value: "ALL", label: "All shifts" }, ...shiftQuery.data.map((shift) => ({ value: shift.shiftId, label: `${shift.shiftName} · ${shift.shiftCode}` }))]} onChange={(value) => { setShiftId(value); setPage(1); }} allowClear={false} />}
            {showPreviousRecords && !personalView && <span aria-hidden="true" className="wf-attendance-record-filter-break" />}
            {showPreviousRecords && <label className="wf-attendance-date-filter"><span>From</span><input type="date" value={dateFrom} max={dateTo} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>}
            {showPreviousRecords && <label className="wf-attendance-date-filter"><span>To</span><input type="date" value={dateTo} min={dateFrom} max={previousDate} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /> </label>}
            {showPreviousRecords && !personalView && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-record-filter-select" value={finalizationStatus} placeholder="Any finalization status" options={[{ value: "ALL", label: "Any finalization status" }, { value: "UNFINALIZED", label: "Needs finalization" }, { value: "FINALIZED", label: "Finalized" }]} onChange={(value) => { setFinalizationStatus(value as "ALL" | "FINALIZED" | "UNFINALIZED"); setPage(1); }} allowClear={false} />}
            <div className="wf-org-resource-toolbar__pager"><span>{totalRecords} {totalRecords === 1 ? "record" : "records"}</span><button type="button" title="Refresh" aria-label="Refresh" onClick={refreshRecords}><RefreshCw className={query.isFetching ? "spin" : ""} size={15} /></button></div>
          </div>
        </header>

        {query.isLoading ? <div className="wf-org-table-skeleton">Loading attendance records…</div> : query.isError ? <OrganisationEmptyState title="Attendance records could not be loaded" description="Check your connection and try again." error={normalizeApiError(query.error).message} canCreate={false} onCreate={() => undefined} onRetry={() => void query.refetch()} isRetrying={query.isFetching} /> : visibleRecords.length === 0 ? <OrganisationEmptyState title={hasRecordFilters ? "No matching records" : "No attendance records yet"} description={hasRecordFilters ? "Try another search, filter or date range." : personalView ? "Your attendance records will appear here when they are available." : "Attendance records will appear here as employees check in or records are created."} canCreate={false} onCreate={() => undefined} onRetry={() => void query.refetch()} isRetrying={query.isFetching} /> : (
          <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr>{!personalView && <th>Employee</th>}<th>Date</th><th>Schedule</th><th>Check in</th><th>Check out</th><th>Work time</th><th>Late</th><th>Review</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.attendanceId}>{!personalView && <td><div className="wf-org-record-title"><span className="wf-org-record-icon"><UsersRound size={16} /></span><div><strong>{record.employeeName}</strong><small>{record.employeeCode}{record.branchName ? ` · ${record.branchName}` : ""}</small></div></div></td>}<td>{displayDate(record.attendanceDate)}</td><td><div className="wf-org-contact-lines"><span>{record.shiftName ?? "No shift"}</span><span>{record.scheduleName ?? "No schedule"}</span></div></td><td>{displayTime(record.checkInAt)}</td><td>{displayTime(record.checkOutAt)}</td><td>{displayHours(record.totalWorkMinutes)}</td><td>{record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—"}</td><td><span className={`wf-attendance-review ${record.isFinalized ? "is-finalized" : ""}`}>{record.isFinalized ? "Finalized" : "Open"}</span></td></tr>)}</tbody></table></div>
        )}
        {(query.data?.pagination.totalPages ?? 0) > 1 && <footer className="wf-attendance-pagination"><span>Page {page} of {query.data?.pagination.totalPages}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" disabled={page >= (query.data?.pagination.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next</button></div></footer>}
      </section>
    </section>
  );
}

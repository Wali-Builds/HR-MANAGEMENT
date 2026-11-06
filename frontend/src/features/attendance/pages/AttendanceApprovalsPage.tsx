import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarCheck2, Check, Clock3, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { usePermissions } from "../../../hooks/usePermissions";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { OrganisationField, TextAreaInput } from "../../organisation/components/OrganisationField";
import { decideAttendanceAdjustmentRequest, finalizeAttendanceRecordRequest, listAttendanceAdjustmentRequestsRequest, listAttendanceRecordsRequest } from "../api/attendance.api";
import type { AttendanceAdjustmentRequest } from "../api/attendance.api";
import type { AttendanceRecord } from "../types/attendance.types";
import "../attendance.css";

type ApprovalQueue = "RECORDS" | "ADJUSTMENTS";
type AdjustmentDecision = "approve" | "reject";

function approvalDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function approvalTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "--";
}

function approvalDuration(minutes: number) {
  if (!minutes) return "--";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function AttendanceApprovalsPage() {
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission } = usePermissions();
  const companyIdentityQuery = useCurrentCompanyIdentity(user?.companyId ?? null);
  const queryClient = useQueryClient();
  const canViewRecords = hasAnyPermission(["attendance.view", "attendance.finalize", "attendance.manage"]);
  const canFinalize = hasAnyPermission(["attendance.finalize", "attendance.manage"]);
  const canViewAdjustments = hasAnyPermission(["attendance.adjustment.view", "attendance.adjustment.manage", "attendance.adjustment.approve", "attendance.manage"]);
  const canApproveAdjustments = hasAnyPermission(["attendance.adjustment.approve", "attendance.manage"]);
  const [queue, setQueue] = useState<ApprovalQueue>(canViewRecords ? "RECORDS" : "ADJUSTMENTS");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [decisionTarget, setDecisionTarget] = useState<AttendanceAdjustmentRequest | null>(null);
  const [decision, setDecision] = useState<AdjustmentDecision>("approve");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  // added by wali: Keep queue counts independent of the selected tab, search term, and current page.
  const recordsCountQuery = useQuery({
    queryKey: ["attendance", "approvals", "records-count"],
    queryFn: () => listAttendanceRecordsRequest({ page: 1, pageSize: 1, finalizationStatus: "UNFINALIZED" }),
    enabled: canViewRecords,
  });
  const adjustmentsCountQuery = useQuery({
    queryKey: ["attendance", "approvals", "adjustments-count"],
    queryFn: () => listAttendanceAdjustmentRequestsRequest({ page: 1, pageSize: 1, requestStatus: "PENDING" }),
    enabled: canViewAdjustments,
  });
  // added by wali: Load records awaiting finalization and adjustment requests awaiting a decision in separate queues.
  const recordsQuery = useQuery({
    queryKey: ["attendance", "approvals", "records", page, search],
    queryFn: () => listAttendanceRecordsRequest({ page, pageSize: 25, finalizationStatus: "UNFINALIZED", ...(search.trim() ? { search: search.trim() } : {}) }),
    enabled: canViewRecords && queue === "RECORDS",
  });
  const adjustmentsQuery = useQuery({
    queryKey: ["attendance", "approvals", "adjustments", page, search],
    queryFn: () => listAttendanceAdjustmentRequestsRequest({ page, pageSize: 25, requestStatus: "PENDING", ...(search.trim() ? { search: search.trim() } : {}) }),
    enabled: canViewAdjustments && queue === "ADJUSTMENTS",
  });
  const openCount = recordsCountQuery.data?.pagination.totalRecords ?? 0;
  const pendingCount = adjustmentsCountQuery.data?.pagination.totalRecords ?? 0;
  const currentQuery = queue === "RECORDS" ? recordsQuery : adjustmentsQuery;
  const totalPages = currentQuery.data?.pagination.totalPages ?? 0;
  const totalRecords = currentQuery.data?.pagination.totalRecords ?? 0;
  const isLoading = currentQuery.isLoading;
  const isFetching = currentQuery.isFetching;
  const queryError = currentQuery.isError;

  function changeQueue(nextQueue: ApprovalQueue) {
    setQueue(nextQueue);
    setSearch("");
    setPage(1);
  }

  async function finalizeRecord(record: AttendanceRecord) {
    const confirmed = window.confirm(`Finalize ${record.employeeName}'s attendance for ${approvalDate(record.attendanceDate)}? The record will be locked against changes.`);
    if (!confirmed) return;
    try {
      await finalizeAttendanceRecordRequest(record.attendanceId);
      toast.success("Attendance record finalized.");
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (error) {
      toast.error(normalizeApiError(error).message);
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

  return (
    <section className="wf-org-page wf-attendance-page wf-attendance-page--records wf-attendance-approvals">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><ShieldCheck size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">People operations | attendance review</span><h1>Approvals</h1><p>Review attendance records and employee punch correction requests.</p></div></div>
        <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Working company</span><strong>{companyIdentityQuery.data?.displayName ?? (companyIdentityQuery.isLoading ? "Loading company…" : "Your company")}</strong></div></div>
      </header>

      <div className="wf-org-health-strip wf-attendance-health wf-attendance-approvals__metrics">
        {canViewRecords && <button type="button" className={queue === "RECORDS" ? "is-selected" : ""} onClick={() => changeQueue("RECORDS")}><span><Clock3 size={16} /></span><strong>{recordsCountQuery.isLoading && !recordsCountQuery.data ? "--" : openCount}</strong><small>Records to finalize</small></button>}
        {canViewAdjustments && <button type="button" className={queue === "ADJUSTMENTS" ? "is-selected" : ""} onClick={() => changeQueue("ADJUSTMENTS")}><span><CalendarCheck2 size={16} /></span><strong>{adjustmentsCountQuery.isLoading && !adjustmentsCountQuery.data ? "--" : pendingCount}</strong><small>Pending adjustments</small></button>}
      </div>

      <section className="wf-org-resource wf-attendance-resource wf-attendance-approvals__resource">
        <div className="wf-org-resource-toolbar">
          <div className="wf-org-resource-toolbar__heading"><div><span>REVIEW QUEUE</span><h2>{queue === "RECORDS" ? "Attendance records" : "Adjustment requests"}</h2><p>{queue === "RECORDS" ? "Check open attendance records before finalizing them." : "Compare requested punch changes with the current record before deciding."}</p></div></div>
          <div className="wf-org-resource-toolbar__tools"><label className="wf-org-search"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={queue === "RECORDS" ? "Search employees" : "Search requests"} /></label><div className="wf-org-resource-toolbar__pager"><span>{totalRecords} {queue === "RECORDS" ? "records" : "requests"}</span><button type="button" aria-label="Refresh approval queue" onClick={() => void currentQuery.refetch()}><RefreshCw className={isFetching ? "spin" : ""} size={15} /></button></div></div>
        </div>

        {isLoading ? <div className="wf-org-table-skeleton">Loading review queue...</div> : queryError ? <OrganisationEmptyState title="Review queue could not be loaded" description="Check your attendance review permissions and try again." canCreate={false} onCreate={() => undefined} onRetry={() => void currentQuery.refetch()} isRetrying={isFetching} /> : queue === "RECORDS" ? (
          (recordsQuery.data?.attendanceRecords.length ?? 0) === 0 ? <OrganisationEmptyState title="No records need finalization" description="Open attendance records will appear here for review." canCreate={false} onCreate={() => undefined} onRetry={() => void recordsQuery.refetch()} isRetrying={isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>EMPLOYEE</th><th>DATE</th><th>SCHEDULE</th><th>CHECK IN</th><th>CHECK OUT</th><th>WORK TIME</th><th>REVIEW</th></tr></thead><tbody>{recordsQuery.data?.attendanceRecords.map((record) => <tr key={record.attendanceId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><CalendarCheck2 size={16} /></span><div><strong>{record.employeeName}</strong><small>{record.employeeCode}{record.branchName ? ` | ${record.branchName}` : ""}</small></div></div></td><td>{approvalDate(record.attendanceDate)}</td><td><div className="wf-org-contact-lines"><span>{record.shiftName ?? "No shift"}</span><span>{record.scheduleName ?? "No schedule"}</span></div></td><td>{approvalTime(record.checkInAt)}</td><td>{approvalTime(record.checkOutAt)}</td><td>{approvalDuration(record.totalWorkMinutes)}</td><td>{canFinalize ? <button type="button" className="wf-org-button wf-org-button--primary" onClick={() => void finalizeRecord(record)}>Finalize</button> : <span className="wf-attendance-review">Open</span>}</td></tr>)}</tbody></table></div>
        ) : (
          (adjustmentsQuery.data?.adjustmentRequests.length ?? 0) === 0 ? <OrganisationEmptyState title="No pending adjustment requests" description="Employee punch corrections awaiting a decision will appear here." canCreate={false} onCreate={() => undefined} onRetry={() => void adjustmentsQuery.refetch()} isRetrying={isFetching} /> : <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>EMPLOYEE</th><th>DATE</th><th>CHANGE REQUESTED</th><th>REASON</th><th>STATUS</th>{canApproveAdjustments && <th>ACTION</th>}</tr></thead><tbody>{adjustmentsQuery.data?.adjustmentRequests.map((request) => <tr key={request.adjustmentRequestId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><CalendarCheck2 size={16} /></span><div><strong>{request.employeeName}</strong><small>{request.employeeCode}</small></div></div></td><td>{approvalDate(request.attendanceDate)}</td><td><div className="wf-org-contact-lines"><span>Check in: {approvalTime(request.currentCheckInAt)} to {approvalTime(request.requestedCheckInAt)}</span><span>Check out: {approvalTime(request.currentCheckOutAt)} to {approvalTime(request.requestedCheckOutAt)}</span></div></td><td className="wf-attendance-approval-reason" title={request.reason}>{request.reason}</td><td><span className="wf-attendance-review">Pending</span></td>{canApproveAdjustments && <td><div className="wf-attendance-approval-actions"><button type="button" className="wf-org-button wf-org-button--primary" onClick={() => openDecision(request, "approve")}><Check size={14} />Approve</button><button type="button" className="wf-org-button wf-org-button--secondary" onClick={() => openDecision(request, "reject")}><X size={14} />Reject</button></div></td>}</tr>)}</tbody></table></div>
        )}

        {totalPages > 1 && <footer className="wf-attendance-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></footer>}
      </section>

      <OrganisationDialog open={Boolean(decisionTarget)} title={decision === "approve" ? "Approve adjustment request" : "Reject adjustment request"} subtitle={decisionTarget ? `${decisionTarget.employeeName} | ${approvalDate(decisionTarget.attendanceDate)}` : "Review the requested attendance correction."} submitLabel={decision === "approve" ? "Approve request" : "Reject request"} busy={saving} onClose={() => setDecisionTarget(null)} onSubmit={(event) => void submitDecision(event)}>
        {decisionTarget && <div className="wf-attendance-approval-dialog-summary"><strong>{decisionTarget.adjustmentType.replaceAll("_", " ")}</strong><p>{decisionTarget.reason}</p><div><span>Check in: {approvalTime(decisionTarget.currentCheckInAt)} to {approvalTime(decisionTarget.requestedCheckInAt)}</span><span>Check out: {approvalTime(decisionTarget.currentCheckOutAt)} to {approvalTime(decisionTarget.requestedCheckOutAt)}</span></div></div>}
        <OrganisationField label={decision === "approve" ? "Comments" : "Rejection reason"} required={decision === "reject"} hint={decision === "approve" ? "Optional note for the approval history." : "A short reason is required."}><TextAreaInput rows={3} maxLength={5000} value={comments} onChange={(event) => setComments(event.target.value)} /></OrganisationField>
      </OrganisationDialog>
    </section>
  );
}

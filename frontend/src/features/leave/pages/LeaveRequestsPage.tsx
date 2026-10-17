import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, Umbrella, X } from "lucide-react";
import { normalizeApiError } from "../../../api/api-error";
import { approveCompanyLeaveRequest, getCompanyLeaveRequests, rejectCompanyLeaveRequest } from "../api/leave-requests.api";
import type { CompanyLeaveRequestDetails } from "../types/leave-requests.types";
import "../leave-setup.css";

// edited by wali: Let Company Admin review tenant requests and record approval decisions.
export function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const [pendingOnly, setPendingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [commentsByRequest, setCommentsByRequest] = useState<Record<string, string>>({});
  const requestsQuery = useQuery({
    queryKey: ["leave-requests", "company", pendingOnly, page],
    queryFn: () => getCompanyLeaveRequests(pendingOnly, page),
  });
  const decisionMutation = useMutation({
    mutationFn: async (input: { decision: "approve" | "reject"; requestId: string; approvalId: string; comments: string }) => {
      if (input.decision === "approve") return approveCompanyLeaveRequest(input.requestId, input.approvalId, input.comments || undefined);
      return rejectCompanyLeaveRequest(input.requestId, input.approvalId, input.comments);
    },
    onSuccess: async () => {
      setRejectingId(null);
      await queryClient.invalidateQueries({ queryKey: ["leave-requests", "company"] });
    },
  });

  const requests = (requestsQuery.data?.requests ?? []).filter(({ request }) => request.requestStatus !== "DRAFT");
  const error = requestsQuery.error ?? decisionMutation.error;

  return <main className="page-stack leave-setup leave-setup--requests wf-org-page">
    <header className="leave-setup__header wf-org-hero">
      <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><Umbrella size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Leave management</span><h1>Leave Requests</h1><p>Review submitted requests from employees in your company.</p></div></div>
      {/* edited by wali: The requests query updates on filter changes and after approval decisions. */}
      <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><CalendarDays size={19} /></div><div><span>Approval queue</span><strong>Employee requests</strong></div></div>
    </header>
    {error && <div className="leave-setup__notice leave-setup__notice--error"><CircleAlert size={17} />{normalizeApiError(error).message}</div>}
    <section className="leave-setup__step leave-admin__toolbar">
      <div><h2>Requests</h2><p>Approve or reject pending leave requests. Decisions follow the configured approval order.</p></div>
      <div className="leave-admin__filters" role="group" aria-label="Filter requests">
        <button type="button" className={`leave-setup__button ${pendingOnly ? "leave-setup__button--primary" : ""}`} aria-pressed={pendingOnly} onClick={() => { setPendingOnly(true); setPage(1); }}>Pending</button>
        <button type="button" className={`leave-setup__button ${!pendingOnly ? "leave-setup__button--primary" : ""}`} aria-pressed={!pendingOnly} onClick={() => { setPendingOnly(false); setPage(1); }}>All submitted</button>
      </div>
    </section>
    {requestsQuery.isLoading ? <div className="leave-setup__step"><div className="leave-setup__loading"><LoaderCircle size={16} />Loading company requests...</div></div>
      : requests.length === 0 ? <section className="leave-setup__step leave-admin__empty"><CalendarDays size={24} /><strong>{pendingOnly ? "No pending requests" : "No submitted requests yet"}</strong><p>Employee submissions will appear here for your review.</p></section>
        : <><div className="leave-admin__list">{requests.map((item) => <RequestCard key={item.request.leaveRequestId} item={item} rejecting={rejectingId === item.request.leaveRequestId} comments={commentsByRequest[item.request.leaveRequestId] ?? ""} busy={decisionMutation.isPending} onCommentsChange={(value) => setCommentsByRequest((previous) => ({ ...previous, [item.request.leaveRequestId]: value }))} onApprove={(approvalId) => decisionMutation.mutate({ decision: "approve", requestId: item.request.leaveRequestId, approvalId, comments: commentsByRequest[item.request.leaveRequestId] ?? "" })} onStartReject={() => setRejectingId(item.request.leaveRequestId)} onCancelReject={() => setRejectingId(null)} onReject={(approvalId) => decisionMutation.mutate({ decision: "reject", requestId: item.request.leaveRequestId, approvalId, comments: commentsByRequest[item.request.leaveRequestId] ?? "" })} />)}</div>
          {(requestsQuery.data?.pagination.totalPages ?? 0) > 1 && <div className="leave-admin__pagination"><span>Page {page} of {requestsQuery.data?.pagination.totalPages}</span><button className="leave-setup__icon-button" type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /></button><button className="leave-setup__icon-button" type="button" aria-label="Next page" disabled={page >= (requestsQuery.data?.pagination.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button></div>}
        </>}
  </main>;
}

function RequestCard({ item, rejecting, comments, busy, onCommentsChange, onApprove, onStartReject, onCancelReject, onReject }: {
  item: CompanyLeaveRequestDetails;
  rejecting: boolean;
  comments: string;
  busy: boolean;
  onCommentsChange: (value: string) => void;
  onApprove: (approvalId: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onReject: (approvalId: string) => void;
}) {
  const { request, approvals } = item;
  const pendingApproval = approvals.find((approval) => approval.decision === "PENDING");
  const canDecide = request.requestStatus === "PENDING" && Boolean(pendingApproval);
  return <article className="leave-admin__card">
    <div className="leave-admin__card-head"><div><span className="leave-admin__employee">{request.employeeName}</span><small>{request.employeeCode} · {request.requestNumber}</small></div><span className={`leave-admin__status leave-admin__status--${request.requestStatus.toLowerCase()}`}>{request.requestStatus.replaceAll("_", " ")}</span></div>
    <div className="leave-admin__summary"><div><small>Leave type</small><strong>{request.leaveTypeName}</strong></div><div><small>Dates</small><strong>{request.startDate} — {request.endDate}</strong></div><div><small>Chargeable</small><strong>{request.chargeableUnits} {request.leaveTypeUnitType.toLowerCase()}</strong></div></div>
    <p className="leave-admin__reason">{request.reason}</p>
    {pendingApproval && <p className="leave-admin__approval-note">Approval step {pendingApproval.approvalLevel}{pendingApproval.isFinalLevel ? " · final step" : ""}{pendingApproval.approverEmployeeName ? ` · ${pendingApproval.approverEmployeeName}` : ""}</p>}
    {request.finalRemarks && <p className="leave-admin__approval-note">Decision note: {request.finalRemarks}</p>}
    {canDecide && <div className="leave-admin__actions">
      {!rejecting ? <><button className="leave-setup__button leave-setup__button--primary" type="button" disabled={busy} onClick={() => onApprove(pendingApproval!.leaveApprovalId)}><Check size={16} />Approve</button><button className="leave-setup__button leave-admin__reject" type="button" disabled={busy} onClick={onStartReject}><X size={16} />Reject</button></>
        : <div className="leave-admin__reject-form"><label><span>Reason for rejection</span><textarea required minLength={3} maxLength={5000} value={comments} onChange={(event) => onCommentsChange(event.target.value)} placeholder="Explain why this request is rejected" /></label><button className="leave-setup__button leave-admin__reject" type="button" disabled={busy || comments.trim().length < 3} onClick={() => onReject(pendingApproval!.leaveApprovalId)}>{busy ? "Saving..." : "Confirm rejection"}</button><button className="leave-setup__button" type="button" disabled={busy} onClick={onCancelReject}>Cancel</button></div>}
      {busy && <LoaderCircle size={17} className="leave-admin__spin" aria-label="Saving decision" />}
    </div>}
  </article>;
}

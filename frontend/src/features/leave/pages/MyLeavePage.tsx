import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CircleAlert, LoaderCircle, Plus, Send, Umbrella, WalletCards, X } from "lucide-react";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import {
  createMyLeaveRequest,
  getMyEffectiveLeavePolicy,
  getMyLeaveRequests,
  submitMyLeaveRequest,
  updateMyLeaveRequest,
} from "../api/leave-setup.api";
import { getEmployeeLeaveBalances } from "../api/leave-balance.api";
import type { EmployeeLeaveBalance } from "../types/leave-balance.types";
import type { CreateEmployeeLeaveRequestInput, EmployeeLeaveRequest } from "../types/employee-leave.types";
import "../leave-setup.css";

function localDate(): string {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function statusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

// edited by wali: Give linked employees a simple request form and personal request history.
export function MyLeavePage() {
  const employeeId = useAuthStore((state) => state.user?.employeeId ?? null);
  const queryClient = useQueryClient();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(localDate());
  const [endDate, setEndDate] = useState(localDate());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  // edited by wali: Keep the employee request form closed until they choose New request.
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  // edited by wali: Open the signed-in employee's balance summary on demand.
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  // edited by wali: Reuse the request form for editing a specific employee-owned draft.
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const policyQuery = useQuery({
    queryKey: ["my-leave", "policy", employeeId],
    queryFn: () => getMyEffectiveLeavePolicy(employeeId!),
    enabled: Boolean(employeeId),
  });
  const requestsQuery = useQuery({
    queryKey: ["my-leave", "requests", employeeId],
    queryFn: () => getMyLeaveRequests(employeeId!),
    enabled: Boolean(employeeId),
  });
  const balanceAsOf = localDate();
  const balancesQuery = useQuery({
    queryKey: ["my-leave", "balances", employeeId, balanceAsOf],
    queryFn: () => getEmployeeLeaveBalances(employeeId!, balanceAsOf),
    enabled: Boolean(employeeId && isBalanceOpen),
  });
  const myBalances = balancesQuery.data?.balances ?? [];
  const combinedAvailable = sumAvailableByUnit(myBalances);
  const policy = policyQuery.data;
  const activeRules = useMemo(() => policy?.rules.filter((rule) => rule.isActive) ?? [], [policy?.rules]);
  const selectedRule = activeRules.find((rule) => rule.leaveTypeId === leaveTypeId) ?? null;
  const isHourly = selectedRule?.unitType === "HOURS";
  const hourlyAllowed = Boolean(selectedRule?.allowHourlyLeave);
  const requests = requestsQuery.data?.requests ?? [];

  const resetForm = () => {
    setLeaveTypeId(""); setStartDate(localDate()); setEndDate(localDate());
    setStartTime("09:00"); setEndTime("10:00"); setReason("");
    setEditingDraftId(null);
  };
  // edited by wali: Save new drafts or update the selected draft using its existing ID.
  const saveDraftMutation = useMutation({
    mutationFn: ({ draftId, input }: { draftId: string | null; input: CreateEmployeeLeaveRequestInput }) =>
      draftId ? updateMyLeaveRequest(draftId, input) : createMyLeaveRequest(employeeId!, input),
    onSuccess: async (_request, variables) => {
      setNotice(variables.draftId ? "Draft updated." : "Draft saved. Submit it from My requests when you are ready.");
      resetForm();
      setIsRequestFormOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-leave", "requests", employeeId] }),
      ]);
    },
  });
  const submitNewMutation = useMutation({
    mutationFn: async (input: CreateEmployeeLeaveRequestInput) => {
      const draftId = editingDraftId
        ? (await updateMyLeaveRequest(editingDraftId, input)).leaveRequestId
        : (await createMyLeaveRequest(employeeId!, input)).leaveRequestId;
      return submitMyLeaveRequest(draftId);
    },
    onSuccess: async (request) => {
      setNotice(request.requestStatus === "APPROVED" ? "Your request was submitted and automatically approved." : "Your leave request was submitted to your company approver.");
      resetForm();
      setIsRequestFormOpen(false);
      // edited by wali: A submitted request may change pending units in the employee's balance.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-leave", "requests", employeeId] }),
        queryClient.invalidateQueries({ queryKey: ["my-leave", "balances", employeeId] }),
      ]);
    },
    onError: async () => {
      // edited by wali: Refresh the list so a draft remains visible if creation succeeded but submission failed.
      await queryClient.invalidateQueries({ queryKey: ["my-leave", "requests", employeeId] });
    },
  });
  const submitDraftMutation = useMutation({
    mutationFn: (requestId: string) => submitMyLeaveRequest(requestId),
    onSuccess: async (request) => {
      setNotice(request.requestStatus === "APPROVED" ? "Your request was automatically approved." : "Your draft was submitted to your company approver.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-leave", "requests", employeeId] }),
        queryClient.invalidateQueries({ queryKey: ["my-leave", "balances", employeeId] }),
      ]);
    },
  });

  const makeInput = (): CreateEmployeeLeaveRequestInput => ({
    leaveTypeId,
    startDate,
    endDate: isHourly ? startDate : endDate,
    startSession: isHourly ? "HOURLY" : "FULL_DAY",
    endSession: isHourly ? "HOURLY" : "FULL_DAY",
    ...(isHourly ? { startTime, endTime } : {}),
    reason: reason.trim(),
  });
  const validForSubmit = Boolean(
    employeeId && selectedRule && (!isHourly || hourlyAllowed) && startDate && endDate &&
      (isHourly || endDate >= startDate) &&
      (!isHourly || (startTime && endTime && endTime > startTime)) && reason.trim().length >= 3,
  );
  const handleSaveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice(""); saveDraftMutation.mutate({ draftId: editingDraftId, input: makeInput() });
  };
  const handleSubmitRequest = () => {
    if (validForSubmit) { setNotice(""); submitNewMutation.mutate(makeInput()); }
  };
  // edited by wali: Load a draft's saved fields into the form without creating a duplicate request.
  const editDraft = (request: EmployeeLeaveRequest) => {
    setEditingDraftId(request.leaveRequestId);
    setLeaveTypeId(request.leaveTypeId);
    setStartDate(request.startDate);
    setEndDate(request.endDate);
    setStartTime(request.startTime ?? "09:00");
    setEndTime(request.endTime ?? "10:00");
    setReason(request.reason);
    setNotice("");
    setIsRequestFormOpen(true);
  };
  const pageError = policyQuery.error ?? requestsQuery.error ?? saveDraftMutation.error ?? submitNewMutation.error ?? submitDraftMutation.error;

  return <main className="page-stack leave-setup leave-employee wf-org-page">
    <header className="leave-setup__header wf-org-hero">
      <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><Umbrella size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Leave management</span><h1>My leave</h1><p>Request leave and follow each request through its approval status.</p></div></div>
      {/* edited by wali: Keep employee balance and request actions together in the page header. */}
      <div className="leave-employee__header-actions wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Umbrella size={19} /></div><div className="leave-employee__header-action-copy"><span>Quick actions</span>
        <button className="leave-setup__button" type="button" aria-expanded={isBalanceOpen} aria-controls="employee-leave-balances" onClick={() => setIsBalanceOpen((open) => !open)}><WalletCards size={16} />{isBalanceOpen ? "Hide balance" : "My balance"}</button>
        {!isRequestFormOpen && <button className="leave-setup__button leave-setup__button--primary" type="button" onClick={() => { resetForm(); setNotice(""); setIsRequestFormOpen(true); }}><Plus size={16} />New request</button>}
      </div></div>
    </header>
    {notice && <div className="leave-setup__notice leave-setup__notice--success">{notice}</div>}
    {pageError && <div className="leave-setup__notice leave-setup__notice--error"><CircleAlert size={17} />{normalizeApiError(pageError).message}</div>}

    {/* edited by wali: Show only this signed-in employee's balance rows for the current leave period. */}
    {isBalanceOpen && <section className="leave-employee__balances" id="employee-leave-balances">
      <div className="leave-employee__balances-heading"><strong>My balance</strong><small>Current leave period · {formatDate(balanceAsOf)}</small></div>
      {balancesQuery.error && <div className="leave-setup__notice leave-setup__notice--error"><CircleAlert size={17} />{normalizeApiError(balancesQuery.error).message}</div>}
      {balancesQuery.isLoading ? <Loading label="Loading balances..." /> : balancesQuery.error ? null : myBalances.length === 0 ? <p className="leave-employee__balance-empty">No current balances. Contact your company administrator.</p> : <>
        <p className="leave-employee__combined-balance">Combined available: <strong>{formatCombinedAvailable(combinedAvailable)}</strong></p>
        <div className="leave-employee__balance-list">
          {myBalances.map((balance) => <EmployeeBalanceRow key={balance.leaveBalanceId} balance={balance} />)}
        </div>
      </>}
    </section>}

    {/* edited by wali: Show the leave form only after the employee chooses New request. */}
    {isRequestFormOpen && <section className="leave-setup__step">
      <div className="leave-setup__step-heading"><span><Plus size={17} /></span><div><h2>{editingDraftId ? "Edit leave draft" : "Request leave"}</h2><p>Submitting sends your request to the company approver. Saving a draft does not submit it.</p></div></div>
      <div className="leave-employee__form-close"><button className="leave-setup__button" type="button" onClick={() => { resetForm(); setNotice(""); setIsRequestFormOpen(false); }}><X size={16} />Close</button></div>
      {policyQuery.isLoading ? <Loading label="Loading your leave policy..." /> : !policy?.policy ? <div className="leave-setup__hint"><CircleAlert size={16} />No effective leave policy is available for you yet. Contact your company administrator.</div> : activeRules.length === 0 ? <div className="leave-setup__hint"><CircleAlert size={16} />Your policy has no active leave types available. Contact your company administrator.</div> : <form className="leave-setup__form leave-employee__form" onSubmit={handleSaveDraft}>
        <label><span>Leave type</span><select required value={leaveTypeId} onChange={(event) => { setLeaveTypeId(event.target.value); setNotice(""); }}><option value="">Select leave type</option>{activeRules.map((rule) => <option key={rule.leaveTypeId} value={rule.leaveTypeId}>{rule.leaveTypeName} ({rule.unitType.toLowerCase()})</option>)}</select></label>
        {isHourly && !hourlyAllowed && <div className="leave-setup__hint leave-employee__full-row"><CircleAlert size={16} />Hourly requests are not enabled for this type in your policy.</div>}
        <label><span>{isHourly ? "Date" : "Start date"}</span><input type="date" required value={startDate} onChange={(event) => { setStartDate(event.target.value); if (isHourly) setEndDate(event.target.value); }} /></label>
        {!isHourly && <label><span>End date</span><input type="date" min={startDate} required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>}
        {isHourly && hourlyAllowed && <><label><span>From</span><input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label><span>Until</span><input type="time" required min={startTime} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></>}
        <label className="leave-employee__full-row"><span>Reason</span><textarea required minLength={3} maxLength={5000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Briefly explain your request" /></label>
        <div className="leave-employee__actions leave-employee__full-row">
          <button className="leave-setup__button" type="submit" disabled={!validForSubmit || saveDraftMutation.isPending || submitNewMutation.isPending}>{saveDraftMutation.isPending ? <LoaderCircle size={16} className="leave-employee__spin" /> : <Plus size={16} />}{editingDraftId ? "Save changes" : "Save draft"}</button>
          <button className="leave-setup__button leave-setup__button--primary" type="button" disabled={!validForSubmit || saveDraftMutation.isPending || submitNewMutation.isPending} onClick={handleSubmitRequest}>{submitNewMutation.isPending ? <LoaderCircle size={16} className="leave-employee__spin" /> : <Send size={16} />}Submit request</button>
        </div>
      </form>}
    </section>}

    <section className="leave-setup__step leave-employee__request-section">
      <div className="leave-setup__step-heading"><span><CalendarDays size={17} /></span><div><h2>My requests</h2><p>Drafts are not sent for approval until you submit them.</p></div></div>
      {requestsQuery.isLoading ? <Loading label="Loading your requests..." /> : requests.length === 0 ? <p className="leave-setup__empty">No leave requests yet.</p> : <div className="leave-employee__requests">{requests.map((request) => <RequestCard key={request.leaveRequestId} request={request} onEdit={() => editDraft(request)} onSubmit={() => submitDraftMutation.mutate(request.leaveRequestId)} submitting={submitDraftMutation.isPending} editing={request.leaveRequestId === editingDraftId} />)}</div>}
    </section>
  </main>;
}

function RequestCard({ request, onEdit, onSubmit, submitting, editing }: { request: EmployeeLeaveRequest; onEdit: () => void; onSubmit: () => void; submitting: boolean; editing: boolean }) {
  const isDraft = request.requestStatus === "DRAFT";
  return <article className="leave-employee__request-card">
    <div className="leave-employee__request-main"><div><strong>{request.leaveTypeName}</strong><small>{request.requestNumber} / {formatDate(request.startDate)}{request.endDate !== request.startDate ? ` - ${formatDate(request.endDate)}` : ""}</small><small>{request.reason}</small></div><span className={`leave-setup__badge leave-employee__status status-${request.requestStatus.toLowerCase()}`}>{statusLabel(request.requestStatus)}</span></div>
    {request.finalRemarks && <p className="leave-employee__remarks">Approver note: {request.finalRemarks}</p>}
    {isDraft && <div className="leave-employee__request-card-actions"><button className="leave-setup__button" type="button" disabled={submitting || editing} onClick={onEdit}>Edit draft</button><button className="leave-setup__button leave-setup__button--primary" type="button" disabled={submitting || editing} onClick={onSubmit}>{submitting ? "Submitting..." : "Submit draft"}</button></div>}
  </article>;
}

// edited by wali: Keep the employee's read-only balance display concise and easy to scan.
function EmployeeBalanceRow({ balance }: { balance: EmployeeLeaveBalance }) {
  const unit = balance.unitType.toLowerCase();
  return <article className="leave-employee__balance-row">
    <div className="leave-employee__balance-type"><strong>{balance.leaveTypeName}</strong><small>{balance.periodName}</small></div>
    <span><small>Used</small><strong>{formatUnits(balance.usedUnits)} {unit}</strong></span>
    <span><small>Pending</small><strong>{formatUnits(balance.pendingUnits)} {unit}</strong></span>
    <span className="is-available"><small>Available</small><strong>{formatUnits(balance.availableBalance)} {unit}</strong></span>
  </article>;
}

function formatUnits(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

// edited by wali: Add balances by unit so days and hours are never combined into one misleading number.
function sumAvailableByUnit(balances: EmployeeLeaveBalance[]): Array<{ unit: string; amount: number }> {
  const totals = new Map<string, number>();
  balances.forEach((balance) => totals.set(balance.unitType, (totals.get(balance.unitType) ?? 0) + balance.availableBalance));
  return Array.from(totals, ([unit, amount]) => ({ unit: unit.toLowerCase(), amount }));
}

function formatCombinedAvailable(totals: Array<{ unit: string; amount: number }>): string {
  return totals.map(({ unit, amount }) => `${formatUnits(amount)} ${unit}`).join(" · ");
}

function Loading({ label }: { label: string }) {
  return <div className="leave-setup__loading"><LoaderCircle size={16} className="leave-employee__spin" />{label}</div>;
}

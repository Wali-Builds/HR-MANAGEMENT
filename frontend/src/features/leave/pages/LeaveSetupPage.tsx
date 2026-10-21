import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleAlert, LoaderCircle, Plus, Umbrella } from "lucide-react";
import { normalizeApiError } from "../../../api/api-error";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import {
  createLeavePolicy,
  createLeavePolicyRule,
  createLeavePeriod,
  createLeaveType,
  getLeavePeriods,
  getLeavePolicies,
  getLeavePolicyRules,
  getLeaveTypes,
  updateLeavePolicy,
  updateLeavePolicyRule,
  updateLeaveType,
} from "../api/leave-setup.api";
import type { LeavePolicy, LeaveType, SaveLeavePolicyInput, SaveLeaveTypeInput } from "../types/leave-setup.types";
import "../leave-setup.css";

function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// edited by wali: Calculate exact January-to-December boundaries for a selected annual leave period.
function calendarYearRange(yearValue: string): { startDate: string; endDate: string } {
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) return { startDate: "", endDate: "" };
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

// edited by wali: Keep quarterly periods available alongside annual periods when their dates do not overlap.
function calendarQuarterRange(yearValue: string, quarter: number): { startDate: string; endDate: string } {
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) return { startDate: "", endDate: "" };
  const firstMonth = (quarter - 1) * 3;
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(year, firstMonth + 3, 0).getDate();
  return {
    startDate: `${year}-${pad(firstMonth + 1)}-01`,
    endDate: `${year}-${pad(firstMonth + 3)}-${pad(lastDay)}`,
  };
}

// edited by wali: Keep first-step setup focused on the Company Admin's policy configuration workflow.
export function LeaveSetupPage() {
  const queryClient = useQueryClient();
  const [typeCode, setTypeCode] = useState("");
  const [typeName, setTypeName] = useState("");
  const [unitType, setUnitType] = useState<"DAYS" | "HOURS">("DAYS");
  const [isPaid, setIsPaid] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  // edited by wali: Keep editable leave-type metadata in the shared create/edit form.
  const [editingTypeId, setEditingTypeId] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [typeDisplayColor, setTypeDisplayColor] = useState("#127783");
  const [typeSortOrder, setTypeSortOrder] = useState("0");
  const [policyCode, setPolicyCode] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayLocal());
  // edited by wali: Let Company Admins set and edit when a policy expires.
  const [effectiveTo, setEffectiveTo] = useState("");
  const [editingPolicyId, setEditingPolicyId] = useState("");
  // edited by wali: Default to an annual period while allowing quarterly periods too.
  const [periodYear, setPeriodYear] = useState(() => todayLocal().slice(0, 4));
  const [periodFrequency, setPeriodFrequency] = useState<"ANNUAL" | "QUARTERLY">("ANNUAL");
  const [periodQuarter, setPeriodQuarter] = useState(() => Math.floor((Number(todayLocal().slice(5, 7)) - 1) / 3) + 1);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [ruleTypeId, setRuleTypeId] = useState("");
  const [annualEntitlement, setAnnualEntitlement] = useState("20");
  // edited by wali: Track the selected entitlement row while its yearly amount is edited.
  const [editingRuleId, setEditingRuleId] = useState("");
  const [editingAnnualEntitlement, setEditingAnnualEntitlement] = useState("0");
  const [notice, setNotice] = useState("");

  const typesQuery = useQuery({ queryKey: ["leave-setup", "types"], queryFn: getLeaveTypes });
  const policiesQuery = useQuery({ queryKey: ["leave-setup", "policies"], queryFn: getLeavePolicies });
  const periodsQuery = useQuery({ queryKey: ["leave-setup", "periods"], queryFn: getLeavePeriods });
  const types = typesQuery.data?.leaveTypes ?? [];
  const policies = policiesQuery.data?.leavePolicies ?? [];
  const periods = periodsQuery.data?.leavePeriods ?? [];
  const periodDates = periodFrequency === "ANNUAL"
    ? calendarYearRange(periodYear)
    : calendarQuarterRange(periodYear, periodQuarter);
  const periodsOverlappingSelectedRange = periods.filter((item) =>
    periodDates.startDate && periodDates.endDate &&
    item.startDate <= periodDates.endDate && item.endDate >= periodDates.startDate,
  );
  const activeTypes = types.filter((type) => type.isActive);
  const policy = policies.find((item) => item.leavePolicyId === selectedPolicyId) ?? null;
  const rulesQuery = useQuery({
    queryKey: ["leave-setup", "rules", selectedPolicyId],
    queryFn: () => getLeavePolicyRules(selectedPolicyId),
    enabled: Boolean(selectedPolicyId),
  });
  const rules = rulesQuery.data?.rules ?? [];

  useEffect(() => {
    if (!selectedPolicyId && policies.length) {
      const initial = policies.find((item) => item.isActive && item.isDefault) ?? policies.find((item) => item.isActive);
      if (initial) setSelectedPolicyId(initial.leavePolicyId);
    }
  }, [policies, selectedPolicyId]);

  const availableTypes = useMemo(() => {
    const added = new Set(rules.map((rule) => rule.leaveTypeId));
    return activeTypes.filter((type) => !added.has(type.leaveTypeId));
  }, [activeTypes, rules]);

  const invalidateSetup = async () => queryClient.invalidateQueries({ queryKey: ["leave-setup"] });
  const typeMutation = useMutation({
    // edited by wali: Use the existing PATCH API when editing and POST API when creating a leave type.
    mutationFn: ({ typeId, input }: { typeId: string | null; input: SaveLeaveTypeInput }) =>
      typeId ? updateLeaveType(typeId, input) : createLeaveType(input),
    onSuccess: async (_saved, variables) => {
      resetTypeForm();
      setNotice(variables.typeId ? "Leave type updated." : "Leave type created. Continue to Step 2 to create a policy.");
      await invalidateSetup();
    },
  });
  const typeStatusMutation = useMutation({
    mutationFn: (item: LeaveType) => updateLeaveType(item.leaveTypeId, { isActive: !item.isActive }),
    onSuccess: async (_result, item) => {
      setNotice(item.isActive ? "Leave type deactivated." : "Leave type activated.");
      await invalidateSetup();
    },
  });
  const policyMutation = useMutation({
    mutationFn: ({ policyId, input }: { policyId: string | null; input: SaveLeavePolicyInput }) =>
      policyId ? updateLeavePolicy(policyId, input) : createLeavePolicy(input),
    onSuccess: async (saved, variables) => {
      setPolicyCode(""); setPolicyName(""); setEffectiveFrom(todayLocal()); setEffectiveTo("");
      setEditingPolicyId(""); setSelectedPolicyId(saved.leavePolicyId);
      setNotice(variables.policyId ? "Policy updated." : "Policy created. Add leave entitlements in Step 3.");
      await invalidateSetup();
    },
  });
  const ruleMutation = useMutation({
    mutationFn: () => createLeavePolicyRule(selectedPolicyId, {
      leaveTypeId: ruleTypeId, annualEntitlementUnits: Number(annualEntitlement), isActive: true,
    }),
    onSuccess: async () => {
      setRuleTypeId(""); setNotice("Entitlement added to this policy.");
      await invalidateSetup();
    },
  });
  const ruleStatusMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      updateLeavePolicyRule(selectedPolicyId, ruleId, { isActive }),
    onSuccess: async () => { setNotice("Entitlement status updated."); await invalidateSetup(); },
  });
  // edited by wali: Save entitlement amount changes through the existing policy-rule PATCH endpoint.
  const ruleEditMutation = useMutation({
    mutationFn: ({ ruleId, annualEntitlementUnits }: { ruleId: string; annualEntitlementUnits: number }) =>
      updateLeavePolicyRule(selectedPolicyId, ruleId, { annualEntitlementUnits }),
    onSuccess: async () => {
      setEditingRuleId("");
      setNotice("Annual entitlement updated.");
      await invalidateSetup();
    },
  });
  const defaultMutation = useMutation({
    mutationFn: (item: LeavePolicy) => updateLeavePolicy(item.leavePolicyId, { isDefault: true }),
    onSuccess: async () => {
      setNotice("Policy applied. It is now the default for employees without an individual policy assignment.");
      await invalidateSetup();
    },
  });
  const periodMutation = useMutation({
    mutationFn: createLeavePeriod,
    onSuccess: async () => {
      setNotice("Leave period created.");
      await invalidateSetup();
    },
  });
  // edited by wali: Clear the shared form after save or when the Company Admin cancels an edit.
  function resetTypeForm(): void {
    setEditingTypeId(""); setTypeCode(""); setTypeName(""); setTypeDescription("");
    setUnitType("DAYS"); setIsPaid(true); setRequiresApproval(true); setRequiresAttachment(false);
    setTypeDisplayColor("#127783"); setTypeSortOrder(String(types.length)); setNotice("");
  }
  // edited by wali: Load an existing type into the form while preserving its current unit.
  const editLeaveType = (item: LeaveType) => {
    setEditingTypeId(item.leaveTypeId); setTypeCode(item.leaveTypeCode); setTypeName(item.leaveTypeName);
    setTypeDescription(item.description ?? ""); setUnitType(item.unitType); setIsPaid(item.isPaid);
    setRequiresApproval(item.requiresApproval); setRequiresAttachment(item.requiresAttachment);
    setTypeDisplayColor(item.displayColor ?? "#127783"); setTypeSortOrder(String(item.sortOrder));
    setNotice(`Editing ${item.leaveTypeName}. The unit is kept unchanged so existing balances keep their meaning.`);
  };
  // edited by wali: Save the complete leave-type form through the existing create or update endpoint.
  const submitType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice("");
    const existingType = types.find((item) => item.leaveTypeId === editingTypeId);
    typeMutation.mutate({
      typeId: editingTypeId || null,
      input: {
        leaveTypeCode: typeCode.trim().toUpperCase().replace(/[\s-]+/g, "_"),
        leaveTypeName: typeName.trim(), description: typeDescription.trim() || null, unitType,
        isPaid, requiresApproval, requiresAttachment,
        displayColor: typeDisplayColor, sortOrder: existingType ? Number(typeSortOrder) : types.length, isActive: existingType?.isActive ?? true,
      },
    });
  };
  const submitPolicy = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice("");
    const existing = policies.find((item) => item.leavePolicyId === editingPolicyId);
    policyMutation.mutate({
      policyId: editingPolicyId || null,
      input: {
        policyCode: policyCode.trim().toUpperCase().replace(/[\s-]+/g, "_"),
        policyName: policyName.trim(), description: existing?.description ?? null,
        effectiveFrom, effectiveTo: effectiveTo || null,
        isDefault: existing?.isDefault ?? false, isActive: existing?.isActive ?? true,
      },
    });
  };
  const submitRule = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setNotice(""); ruleMutation.mutate(); };
  // edited by wali: Load the current annual amount into the inline entitlement editor.
  const editRule = (ruleId: string, currentUnits: number) => {
    setEditingRuleId(ruleId);
    setEditingAnnualEntitlement(String(currentUnits));
    setNotice("");
  };
  // edited by wali: Persist the edited annual amount without changing the rule's other settings.
  const submitRuleEdit = (event: FormEvent<HTMLFormElement>, ruleId: string) => {
    event.preventDefault();
    setNotice("");
    ruleEditMutation.mutate({ ruleId, annualEntitlementUnits: Number(editingAnnualEntitlement) });
  };
  // edited by wali: Load an existing policy into the form so its effective dates can be edited.
  const editPolicy = (item: LeavePolicy) => {
    setEditingPolicyId(item.leavePolicyId);
    setSelectedPolicyId(item.leavePolicyId);
    setPolicyCode(item.policyCode);
    setPolicyName(item.policyName);
    setEffectiveFrom(item.effectiveFrom);
    setEffectiveTo(item.effectiveTo ?? "");
    setNotice("Editing " + item.policyName + ". Save the form to apply changes.");
  };

  // edited by wali: Submit the selected annual or quarterly range without changing existing periods.
  const submitPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice("");
    const dates = periodDates;
    if (!dates.startDate || !dates.endDate) return;
    const periodCode = periodFrequency === "ANNUAL"
      ? `LEAVE_${periodYear}`
      : `LEAVE_${periodYear}_Q${periodQuarter}`;
    const periodName = periodFrequency === "ANNUAL"
      ? `${periodYear} Annual Leave Period`
      : `Q${periodQuarter} ${periodYear} Leave Period`;
    periodMutation.mutate({
      periodCode,
      periodName,
      ...dates,
    });
  };
  const hasActiveRule = rules.some((rule) => rule.isActive);
  const today = todayLocal();
  const effectiveToday = Boolean(policy?.isActive && policy.effectiveFrom <= today && (!policy.effectiveTo || policy.effectiveTo >= today));
  const canApply = Boolean(policy && hasActiveRule && effectiveToday && !policy.isDefault);
  const errors = [typeMutation.error, typeStatusMutation.error, policyMutation.error, ruleMutation.error, ruleStatusMutation.error, ruleEditMutation.error, defaultMutation.error, periodMutation.error, typesQuery.error, policiesQuery.error, periodsQuery.error, rulesQuery.error].filter(Boolean);

  return <main className="page-stack leave-setup leave-setup--configuration wf-org-page">
    <header className="leave-setup__header wf-org-hero">
      {/* edited by wali: Balance initialization now lives on the dedicated Balances page. */}
      <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><Umbrella size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Leave management</span><h1>Leave Configuration</h1><p>Complete the setup steps before employees can request leave.</p></div></div>
      {/* edited by wali: Configuration data refreshes after changes, so this tab has no manual refresh control. */}
      <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Umbrella size={19} /></div><div><span>Company-wide setup</span><strong>Policies and entitlements</strong></div></div>
    </header>
    {notice && <div className="leave-setup__notice leave-setup__notice--success"><Check size={17} />{notice}</div>}
    {errors.map((error, index) => <div className="leave-setup__notice leave-setup__notice--error" key={index}><CircleAlert size={17} />{normalizeApiError(error).message}</div>)}

    <section className="leave-setup__step">
      <div className="leave-setup__step-heading"><span>1</span><div><h2>Manage leave types</h2><p>Create categories employees can request, or edit an existing type.</p></div></div>
      <form className="leave-setup__form" onSubmit={submitType}>
        <label><span>Name</span><input required maxLength={150} value={typeName} onChange={(event) => setTypeName(event.target.value)} placeholder="Annual Leave" /></label>
        <label><span>Code</span><input required maxLength={50} pattern="[A-Za-z0-9 _-]+" value={typeCode} onChange={(event) => setTypeCode(event.target.value)} placeholder="ANNUAL_LEAVE" /></label>
        {/* edited by wali: Match leave configuration selectors to the shared workforce dropdown. */}
        <label><span>Unit</span><EmployeeMenuSelect className="leave-setup__select" disabled={Boolean(editingTypeId)} value={unitType} placeholder="Select a unit" options={[{ value: "DAYS", label: "Days" }, { value: "HOURS", label: "Hours" }]} onChange={(value) => setUnitType(value as "DAYS" | "HOURS")} allowClear={false} /></label>
        <label className="leave-setup__check"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} />Paid leave</label>
        <label className="leave-setup__check"><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />Requires approval</label>
        {editingTypeId && <>
          <label><span>Description <small>(optional)</small></span><input maxLength={5000} value={typeDescription} onChange={(event) => setTypeDescription(event.target.value)} placeholder="Describe when this leave type is used" /></label>
          <label><span>Sort order</span><input type="number" min="0" max="65535" required value={typeSortOrder} onChange={(event) => setTypeSortOrder(event.target.value)} /></label>
          <label><span>Display color</span><input type="color" value={typeDisplayColor} onChange={(event) => setTypeDisplayColor(event.target.value)} /></label>
          <label className="leave-setup__check"><input type="checkbox" checked={requiresAttachment} onChange={(event) => setRequiresAttachment(event.target.checked)} />Requires attachment</label>
          <p className="leave-setup__hint">The unit cannot be changed here because existing balances and requests use the current unit.</p>
        </>}
        <button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={typeMutation.isPending}>{editingTypeId ? <Check size={16} /> : <Plus size={16} />}{typeMutation.isPending ? "Saving..." : editingTypeId ? "Save type" : "Create type"}</button>
        {editingTypeId && <button className="leave-setup__button" type="button" disabled={typeMutation.isPending} onClick={resetTypeForm}>Cancel edit</button>}
      </form>
      {typesQuery.isLoading ? <Loading label="Loading leave types..." /> : types.length === 0 ? <p className="leave-setup__empty">No leave types yet.</p> : <div className="leave-setup__catalog">{types.map((item) => <div className="leave-setup__catalog-row" key={item.leaveTypeId}><span className="leave-setup__type-dot" style={{ backgroundColor: item.displayColor ?? "#127783" }} /><div><strong>{item.leaveTypeName}</strong><small>{item.leaveTypeCode} / {item.unitType.toLowerCase()} / {item.isPaid ? "paid" : "unpaid"}</small></div><span className={`leave-setup__badge ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span><button className="leave-setup__text-button" type="button" onClick={() => editLeaveType(item)} disabled={typeMutation.isPending || typeStatusMutation.isPending}>Edit</button><button className="leave-setup__text-button" type="button" onClick={() => typeStatusMutation.mutate(item)} disabled={typeStatusMutation.isPending || typeMutation.isPending}>{item.isActive ? "Deactivate" : "Activate"}</button></div>)}</div>}
    </section>

    <section className={`leave-setup__step ${!activeTypes.length ? "is-locked" : ""}`}>
      <div className="leave-setup__step-heading"><span>2</span><div><h2>Create a policy</h2><p>A policy groups leave types and sets when the company uses them.</p></div></div>
      {!activeTypes.length && <div className="leave-setup__hint"><CircleAlert size={16} />Create or activate a leave type first.</div>}
      <form className="leave-setup__form leave-setup__form--policy" onSubmit={submitPolicy}>
        <label><span>Policy name</span><input required maxLength={150} disabled={!activeTypes.length} value={policyName} onChange={(event) => setPolicyName(event.target.value)} placeholder="Standard Company Policy" /></label>
        <label><span>Policy code</span><input required maxLength={50} pattern="[A-Za-z0-9 _-]+" disabled={!activeTypes.length} value={policyCode} onChange={(event) => setPolicyCode(event.target.value)} placeholder="STANDARD_2026" /></label>
        <label><span>Effective from</span><input type="date" required disabled={!activeTypes.length} value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
        {/* edited by wali: Keep the end-date input aligned with the other policy fields by removing its extra helper row. */}
        <label><span>Effective until <small>(optional)</small></span><input type="date" min={effectiveFrom} disabled={!activeTypes.length} value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></label>
        <button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={!activeTypes.length || policyMutation.isPending}><Plus size={16} />{policyMutation.isPending ? "Saving..." : editingPolicyId ? "Update policy" : "Create policy"}</button>
        {editingPolicyId && <button className="leave-setup__button" type="button" onClick={() => { setEditingPolicyId(""); setPolicyCode(""); setPolicyName(""); setEffectiveFrom(todayLocal()); setEffectiveTo(""); setNotice(""); }}>Cancel edit</button>}
      </form>
      {policiesQuery.isLoading ? <Loading label="Loading policies..." /> : policies.length === 0 ? <p className="leave-setup__empty">No policies yet.</p> : <div className="leave-setup__policies">{policies.map((item) => <div className="leave-setup__policy-row" key={item.leavePolicyId}><button className={`leave-setup__policy-card ${item.leavePolicyId === selectedPolicyId ? "is-selected" : ""}`} type="button" onClick={() => { setSelectedPolicyId(item.leavePolicyId); setEditingRuleId(""); }}><span><strong>{item.policyName}</strong><small>{item.policyCode} / {item.effectiveFrom}{item.effectiveTo ? ` to ${item.effectiveTo}` : " / no end date"}</small></span><span className={`leave-setup__badge ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isDefault ? "Company default" : item.isActive ? "Active" : "Inactive"}</span></button><button className="leave-setup__text-button" type="button" onClick={() => editPolicy(item)}>Edit</button></div>)}</div>}
    </section>

    <section className={`leave-setup__step ${!policy ? "is-locked" : ""}`}>
      <div className="leave-setup__step-heading"><span>3</span><div><h2>Add entitlements and apply</h2><p>Set the number of days or hours employees receive each year.</p></div></div>
      {!policy ? <div className="leave-setup__hint"><CircleAlert size={16} />Create or select a policy first.</div> : <>
        <form className="leave-setup__form leave-setup__form--rule" onSubmit={submitRule}>
          <label><span>Leave type</span><EmployeeMenuSelect className="leave-setup__select" disabled={!availableTypes.length} value={ruleTypeId} placeholder="Select a type" options={availableTypes.map((item) => ({ value: item.leaveTypeId, label: `${item.leaveTypeName} (${item.unitType.toLowerCase()})` }))} onChange={setRuleTypeId} searchable searchPlaceholder="Search leave types" allowClear={false} /></label>
          <label><span>Annual entitlement</span><input type="number" min="0" max="100000" step="0.5" required disabled={!availableTypes.length} value={annualEntitlement} onChange={(event) => setAnnualEntitlement(event.target.value)} /></label>
          <button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={!ruleTypeId || ruleMutation.isPending}><Plus size={16} />{ruleMutation.isPending ? "Adding..." : "Add entitlement"}</button>
        </form>
        {rulesQuery.isLoading ? <Loading label="Loading entitlements..." /> : rules.length === 0 ? <p className="leave-setup__empty">No entitlements in this policy yet.</p> : <div className="leave-setup__rules">{rules.map((rule) => <div className="leave-setup__rule-row" key={rule.leavePolicyRuleId}>
          <div><strong>{rule.leaveTypeName}</strong>
            {editingRuleId === rule.leavePolicyRuleId ? <form className="leave-setup__rule-edit" onSubmit={(event) => submitRuleEdit(event, rule.leavePolicyRuleId)}>
              <label><span>Annual entitlement ({rule.unitType.toLowerCase()}/year)</span><input type="number" min="0" max="100000" step="0.5" required value={editingAnnualEntitlement} onChange={(event) => setEditingAnnualEntitlement(event.target.value)} /></label>
              <div className="leave-setup__rule-edit-actions"><button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={ruleEditMutation.isPending}>{ruleEditMutation.isPending ? "Saving..." : "Save"}</button><button className="leave-setup__button" type="button" disabled={ruleEditMutation.isPending} onClick={() => setEditingRuleId("")}>Cancel</button></div>
            </form> : <small>{rule.annualEntitlementUnits} {rule.unitType.toLowerCase()} per year</small>}
          </div>
          <span className={`leave-setup__badge ${rule.isActive ? "is-active" : "is-inactive"}`}>{rule.isActive ? "Active" : "Inactive"}</span>
          {editingRuleId !== rule.leavePolicyRuleId && <><button className="leave-setup__text-button" type="button" disabled={ruleEditMutation.isPending} onClick={() => editRule(rule.leavePolicyRuleId, rule.annualEntitlementUnits)}>Edit</button><button className="leave-setup__text-button" type="button" disabled={ruleStatusMutation.isPending || ruleEditMutation.isPending} onClick={() => ruleStatusMutation.mutate({ ruleId: rule.leavePolicyRuleId, isActive: !rule.isActive })}>{rule.isActive ? "Deactivate" : "Activate"}</button></>}
        </div>)}</div>}
        {policy.isDefault ? <div className="leave-setup__hint leave-setup__hint--success"><Check size={16} />This is the company default. It is used for employees without an individual policy assignment.</div> : <div className="leave-setup__apply"><button className="leave-setup__button leave-setup__button--primary" type="button" disabled={!canApply || defaultMutation.isPending} onClick={() => defaultMutation.mutate(policy)}><Check size={16} />{defaultMutation.isPending ? "Applying..." : "Apply to company"}</button><p>{!hasActiveRule ? "Add an active entitlement first." : !effectiveToday ? "The policy must be active and effective today." : "This applies to employees without an individual policy assignment."}</p></div>}
      </>}
    </section>
    {/* edited by wali: Let the Company Admin create annual or quarterly records for requests and balances. */}
    <section className="leave-setup__step">
      <div className="leave-setup__step-heading"><span>4</span><div><h2>Set up leave periods</h2><p>Choose annual or quarterly periods. The system fills in the dates; periods cannot overlap. Each request must fit within one open period.</p></div></div>
      <form className="leave-setup__form leave-setup__form--period" onSubmit={submitPeriod}>
        <label><span>Year</span><input type="number" min="1900" max="9999" required value={periodYear} onChange={(event) => setPeriodYear(event.target.value)} /></label>
        <label><span>Period length</span><EmployeeMenuSelect className="leave-setup__select" value={periodFrequency} placeholder="Select period length" options={[{ value: "ANNUAL", label: "Annual" }, { value: "QUARTERLY", label: "Quarterly (3 months)" }]} onChange={(value) => setPeriodFrequency(value as "ANNUAL" | "QUARTERLY")} allowClear={false} /></label>
        {periodFrequency === "QUARTERLY" && <label><span>Quarter</span><EmployeeMenuSelect className="leave-setup__select" value={String(periodQuarter)} placeholder="Select quarter" options={[{ value: "1", label: "Q1 (Jan–Mar)" }, { value: "2", label: "Q2 (Apr–Jun)" }, { value: "3", label: "Q3 (Jul–Sep)" }, { value: "4", label: "Q4 (Oct–Dec)" }]} onChange={(value) => setPeriodQuarter(Number(value))} allowClear={false} /></label>}
        <label><span>Starts</span><input type="date" readOnly value={periodDates.startDate} /></label>
        <label><span>Ends</span><input type="date" readOnly value={periodDates.endDate} /></label>
        <button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={periodMutation.isPending || !periodYear || periodsOverlappingSelectedRange.length > 0}><Plus size={16} />{periodMutation.isPending ? "Creating..." : `Create ${periodFrequency === "ANNUAL" ? "annual" : "quarterly"} period`}</button>
      </form>
      {periodsOverlappingSelectedRange.length > 0 && <div className="leave-setup__hint"><CircleAlert size={16} />These dates overlap an existing leave period ({periodsOverlappingSelectedRange.map((item) => item.periodName).join(", ")}). Existing periods and balances are kept; choose a different quarter or year.</div>}
      {periodsQuery.isLoading ? <Loading label="Loading leave periods..." /> : periods.length === 0 ? <p className="leave-setup__empty">No leave periods have been created yet.</p> : <div className="leave-setup__periods">{periods.map((item) => <div className="leave-setup__period-row" key={item.leavePeriodId}><div><strong>{item.periodName}</strong><small>{item.periodCode} / {item.startDate} to {item.endDate}</small></div><span className={`leave-setup__badge ${item.isOpen ? "is-active" : "is-inactive"}`}>{item.periodStatus}</span></div>)}</div>}
    </section>
  </main>;
}

function Loading({ label }: { label: string }) {
  return <div className="leave-setup__loading"><LoaderCircle size={16} />{label}</div>;
}

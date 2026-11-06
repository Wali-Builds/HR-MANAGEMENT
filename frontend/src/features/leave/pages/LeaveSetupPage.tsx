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
import type { LeavePeriod, LeavePolicy, LeavePolicyRule, LeaveType, SaveLeavePolicyInput, SaveLeavePolicyRuleInput, SaveLeaveTypeInput } from "../types/leave-setup.types";
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

// added by wali: Derive the next calendar-aligned period from the latest annual or quarterly period.
function nextPeriodInput(periods: LeavePeriod[], fallbackFrequency: "ANNUAL" | "QUARTERLY"): {
  sourceName: string;
  periodCode: string;
  periodName: string;
  startDate: string;
  endDate: string;
} | null {
  const latest = [...periods].sort((left, right) => right.endDate.localeCompare(left.endDate))[0];
  if (!latest) return null;

  // added by wali: Fall back to the selected period length when older period labels do not encode their frequency.
  const periodCode = latest.periodCode.toUpperCase();
  const quarterCodeMatch = periodCode.match(/^LEAVE_(\d{4})_Q([1-4])$/);
  const quarterNameMatch = latest.periodName.match(/^Q([1-4])\s+(\d{4})\b/i);
  const annualCodeMatch = periodCode.match(/^LEAVE_(\d{4})$/);
  const annualNameMatch = latest.periodName.match(/\b(\d{4})\s+Annual\b/i);
  const isQuarterly = Boolean(quarterCodeMatch || quarterNameMatch);
  const isAnnual = Boolean(annualCodeMatch || annualNameMatch);
  const useQuarterly = isQuarterly || (!isAnnual && fallbackFrequency === "QUARTERLY");

  // added by wali: Prefer the period's labeled calendar quarter/year over imperfect legacy date boundaries.
  if (useQuarterly && (quarterCodeMatch || quarterNameMatch)) {
    const sourceYear = Number(quarterCodeMatch?.[1] ?? quarterNameMatch?.[2]);
    const sourceQuarter = Number(quarterCodeMatch?.[2] ?? quarterNameMatch?.[1]);
    const nextQuarter = sourceQuarter === 4 ? 1 : sourceQuarter + 1;
    const nextYear = sourceQuarter === 4 ? sourceYear + 1 : sourceYear;
    const dates = calendarQuarterRange(String(nextYear), nextQuarter);
    return {
      sourceName: latest.periodName,
      periodCode: `LEAVE_${nextYear}_Q${nextQuarter}`,
      periodName: `Q${nextQuarter} ${nextYear} Leave Period`,
      ...dates,
    };
  }

  if (!useQuarterly && (annualCodeMatch || annualNameMatch)) {
    const nextYear = Number(annualCodeMatch?.[1] ?? annualNameMatch?.[1]) + 1;
    const dates = calendarYearRange(String(nextYear));
    return {
      sourceName: latest.periodName,
      periodCode: `LEAVE_${nextYear}`,
      periodName: `${nextYear} Annual Leave Period`,
      ...dates,
    };
  }

  const monthsPerPeriod = useQuarterly ? 3 : 12;
  const sourceEnd = new Date(`${latest.endDate}T00:00:00Z`);
  if (Number.isNaN(sourceEnd.getTime())) return null;

  const addMonths = (date: Date, months: number) => {
    const targetMonth = date.getUTCMonth() + months;
    const firstOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), targetMonth, 1));
    const lastDayOfTargetMonth = new Date(Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)).getUTCDate();
    firstOfTargetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDayOfTargetMonth));
    return firstOfTargetMonth;
  };
  const nextStart = new Date(sourceEnd.getTime() + 86_400_000);
  const nextEnd = addMonths(nextStart, monthsPerPeriod);
  nextEnd.setUTCDate(nextEnd.getUTCDate() - 1);
  const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
  const year = nextStart.getUTCFullYear();

  if (useQuarterly) {
    const quarter = Math.floor(nextStart.getUTCMonth() / 3) + 1;
    return {
      sourceName: latest.periodName,
      periodCode: `LEAVE_${year}_Q${quarter}`,
      periodName: `Q${quarter} ${year} Leave Period`,
      startDate: dateOnly(nextStart),
      endDate: dateOnly(nextEnd),
    };
  }

  return {
    sourceName: latest.periodName,
    periodCode: `LEAVE_${year}`,
    periodName: `${year} Annual Leave Period`,
    startDate: dateOnly(nextStart),
    endDate: dateOnly(nextEnd),
  };
}

type PolicyRuleDraft = {
  leaveTypeId: string;
  annualEntitlementUnits: string;
  accrualMethod: string;
  accrualStartAfterDays: string;
  prorateEntitlement: boolean;
  allowDuringProbation: boolean;
  eligibleGender: string;
  minimumRequestUnits: string;
  maximumRequestUnits: string;
  minimumNoticeDays: string;
  maximumAdvanceDays: string;
  maximumBackdateDays: string;
  allowHalfDay: boolean;
  allowHourlyLeave: boolean;
  includeWeekends: boolean;
  includeHolidays: boolean;
  sandwichRuleEnabled: boolean;
  carryForwardEnabled: boolean;
  maximumCarryForwardUnits: string;
  carryForwardExpiryMonths: string;
  maximumBalanceUnits: string;
  allowNegativeBalance: boolean;
  negativeBalanceLimit: string;
  attachmentRequiredAfterUnits: string;
  encashmentAllowed: boolean;
  maximumEncashmentUnits: string;
  approvalLevelsRequired: string;
  isActive: boolean;
};

// edited by wali: Keep the policy-rule form defaults aligned with the backend request schema.
function newPolicyRuleDraft(leaveTypeId = ""): PolicyRuleDraft {
  return {
    leaveTypeId, annualEntitlementUnits: "0", accrualMethod: "ANNUAL",
    accrualStartAfterDays: "0", prorateEntitlement: true, allowDuringProbation: false, eligibleGender: "ALL",
    minimumRequestUnits: "0.5", maximumRequestUnits: "", minimumNoticeDays: "0", maximumAdvanceDays: "",
    maximumBackdateDays: "0", allowHalfDay: true, allowHourlyLeave: false, includeWeekends: false,
    includeHolidays: false, sandwichRuleEnabled: false, carryForwardEnabled: false, maximumCarryForwardUnits: "",
    carryForwardExpiryMonths: "", maximumBalanceUnits: "", allowNegativeBalance: false, negativeBalanceLimit: "0",
    attachmentRequiredAfterUnits: "", encashmentAllowed: false, maximumEncashmentUnits: "", approvalLevelsRequired: "1",
    isActive: true,
  };
}

// edited by wali: Convert numeric form strings and optional limits to the backend's rule payload.
function policyRulePayload(draft: PolicyRuleDraft): SaveLeavePolicyRuleInput {
  const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);
  return {
    leaveTypeId: draft.leaveTypeId,
    annualEntitlementUnits: Number(draft.annualEntitlementUnits),
    accrualMethod: draft.accrualMethod,
    // Keep the backend's automatic rate calculation enabled; the form displays this calculated amount read-only.
    accrualUnitsPerPeriod: 0,
    accrualStartAfterDays: Number(draft.accrualStartAfterDays),
    prorateEntitlement: draft.prorateEntitlement,
    allowDuringProbation: draft.allowDuringProbation,
    eligibleGender: draft.eligibleGender,
    minimumRequestUnits: Number(draft.minimumRequestUnits),
    maximumRequestUnits: optionalNumber(draft.maximumRequestUnits),
    minimumNoticeDays: Number(draft.minimumNoticeDays),
    maximumAdvanceDays: optionalNumber(draft.maximumAdvanceDays),
    maximumBackdateDays: Number(draft.maximumBackdateDays),
    allowHalfDay: draft.allowHalfDay,
    allowHourlyLeave: draft.allowHourlyLeave,
    includeWeekends: draft.includeWeekends,
    includeHolidays: draft.includeHolidays,
    sandwichRuleEnabled: draft.sandwichRuleEnabled,
    carryForwardEnabled: draft.carryForwardEnabled,
    maximumCarryForwardUnits: optionalNumber(draft.maximumCarryForwardUnits),
    carryForwardExpiryMonths: optionalNumber(draft.carryForwardExpiryMonths),
    maximumBalanceUnits: optionalNumber(draft.maximumBalanceUnits),
    allowNegativeBalance: draft.allowNegativeBalance,
    negativeBalanceLimit: Number(draft.negativeBalanceLimit),
    attachmentRequiredAfterUnits: optionalNumber(draft.attachmentRequiredAfterUnits),
    encashmentAllowed: draft.encashmentAllowed,
    maximumEncashmentUnits: optionalNumber(draft.maximumEncashmentUnits),
    approvalLevelsRequired: Number(draft.approvalLevelsRequired),
    isActive: draft.isActive,
  };
}

function calculatedUnitsPerAccrualRun(draft: PolicyRuleDraft): string {
  if (draft.accrualMethod === "MANUAL") return "Manual entry";
  const divisor = { ANNUAL: 1, SEMI_ANNUAL: 2, QUARTERLY: 4, MONTHLY: 12 }[draft.accrualMethod as "ANNUAL" | "SEMI_ANNUAL" | "QUARTERLY" | "MONTHLY"];
  const annualUnits = Number(draft.annualEntitlementUnits);
  if (!Number.isFinite(annualUnits) || divisor === undefined) return "—";
  return String(Math.round((annualUnits / divisor + Number.EPSILON) * 100) / 100);
}

// edited by wali: Populate every editable policy rule setting when an entitlement is opened for editing.
function policyRuleDraftFromRule(rule: LeavePolicyRule): PolicyRuleDraft {
  const optionalString = (value: number | null) => value === null ? "" : String(value);
  return {
    leaveTypeId: rule.leaveTypeId,
    annualEntitlementUnits: String(rule.annualEntitlementUnits),
    accrualMethod: rule.accrualMethod,
    accrualStartAfterDays: String(rule.accrualStartAfterDays),
    prorateEntitlement: rule.prorateEntitlement,
    allowDuringProbation: rule.allowDuringProbation,
    eligibleGender: rule.eligibleGender,
    minimumRequestUnits: String(rule.minimumRequestUnits),
    maximumRequestUnits: optionalString(rule.maximumRequestUnits),
    minimumNoticeDays: String(rule.minimumNoticeDays),
    maximumAdvanceDays: optionalString(rule.maximumAdvanceDays),
    maximumBackdateDays: String(rule.maximumBackdateDays),
    allowHalfDay: rule.allowHalfDay,
    allowHourlyLeave: rule.allowHourlyLeave,
    includeWeekends: rule.includeWeekends,
    includeHolidays: rule.includeHolidays,
    sandwichRuleEnabled: rule.sandwichRuleEnabled,
    carryForwardEnabled: rule.carryForwardEnabled,
    maximumCarryForwardUnits: optionalString(rule.maximumCarryForwardUnits),
    carryForwardExpiryMonths: optionalString(rule.carryForwardExpiryMonths),
    maximumBalanceUnits: optionalString(rule.maximumBalanceUnits),
    allowNegativeBalance: rule.allowNegativeBalance,
    negativeBalanceLimit: String(rule.negativeBalanceLimit),
    attachmentRequiredAfterUnits: optionalString(rule.attachmentRequiredAfterUnits),
    encashmentAllowed: rule.encashmentAllowed,
    maximumEncashmentUnits: optionalString(rule.maximumEncashmentUnits),
    approvalLevelsRequired: String(rule.approvalLevelsRequired),
    isActive: rule.isActive,
  };
}

// edited by wali: Keep first-step setup focused on the Company Admin's policy configuration workflow.
export function LeaveSetupPage() {
  const queryClient = useQueryClient();
  // added by wali: Separate the growing leave setup into focused, switchable configuration panels.
  const [configurationTab, setConfigurationTab] = useState<"types" | "policies" | "periods">("types");
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
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyIsActive, setPolicyIsActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(todayLocal());
  // edited by wali: Let Company Admins set and edit when a policy expires.
  const [effectiveTo, setEffectiveTo] = useState("");
  const [editingPolicyId, setEditingPolicyId] = useState("");
  // edited by wali: Default to an annual period while allowing quarterly periods too.
  const [periodYear, setPeriodYear] = useState(() => todayLocal().slice(0, 4));
  const [periodFrequency, setPeriodFrequency] = useState<"ANNUAL" | "QUARTERLY">("ANNUAL");
  const [periodQuarter, setPeriodQuarter] = useState(() => Math.floor((Number(todayLocal().slice(5, 7)) - 1) / 3) + 1);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [ruleDraft, setRuleDraft] = useState<PolicyRuleDraft>(() => newPolicyRuleDraft());
  const [editingRuleId, setEditingRuleId] = useState("");
  const [notice, setNotice] = useState("");

  const typesQuery = useQuery({ queryKey: ["leave-setup", "types"], queryFn: getLeaveTypes });
  const policiesQuery = useQuery({ queryKey: ["leave-setup", "policies"], queryFn: getLeavePolicies });
  const periodsQuery = useQuery({ queryKey: ["leave-setup", "periods"], queryFn: getLeavePeriods });
  const types = typesQuery.data?.leaveTypes ?? [];
  const policies = policiesQuery.data?.leavePolicies ?? [];
  const periods = periodsQuery.data?.leavePeriods ?? [];
  // added by wali: Prepare a one-click next period while leaving the current period open.
  const nextPeriod = nextPeriodInput(periods, periodFrequency);
  const nextPeriodConflict = nextPeriod
    ? periods.find((period) => period.periodCode === nextPeriod.periodCode || (period.startDate <= nextPeriod.endDate && period.endDate >= nextPeriod.startDate))
    : null;
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

  // Each leave type can have one rule per policy; separate policies can define different rules for that same type.
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
      setPolicyCode(""); setPolicyName(""); setPolicyDescription(""); setEffectiveFrom(todayLocal()); setEffectiveTo(""); setPolicyIsActive(true);
      setEditingPolicyId(""); setSelectedPolicyId(saved.leavePolicyId);
      setNotice(variables.policyId ? "Policy updated." : "Policy created. Add leave entitlements in Step 3.");
      await invalidateSetup();
    },
  });
  const ruleMutation = useMutation({
    mutationFn: ({ ruleId, input }: { ruleId: string | null; input: SaveLeavePolicyRuleInput }) =>
      ruleId
        ? updateLeavePolicyRule(selectedPolicyId, ruleId, input)
        : createLeavePolicyRule(selectedPolicyId, input),
    onSuccess: async (_saved, variables) => {
      setEditingRuleId(""); setRuleDraft(newPolicyRuleDraft());
      setNotice(variables.ruleId ? "Policy rule updated." : "Entitlement added to this policy.");
      await invalidateSetup();
    },
  });
  const ruleStatusMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      updateLeavePolicyRule(selectedPolicyId, ruleId, { isActive }),
    onSuccess: async () => { setNotice("Entitlement status updated."); await invalidateSetup(); },
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
    // added by wali: Reuse the existing guarded period-creation API for manual next-period generation.
    onSuccess: async (saved) => {
      setNotice(`Created leave period: ${saved.periodName}.`);
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
        policyName: policyName.trim(), description: policyDescription.trim() || null,
        effectiveFrom, effectiveTo: effectiveTo || null,
        isDefault: existing?.isDefault ?? false, isActive: policyIsActive,
      },
    });
  };
  // edited by wali: Save every entitlement and behavior field through the existing policy-rule endpoints.
  const submitRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    ruleMutation.mutate({ ruleId: editingRuleId || null, input: policyRulePayload(ruleDraft) });
  };
  // edited by wali: Load all backend rule settings so editing one value preserves the others.
  const editRule = (rule: LeavePolicyRule) => {
    setEditingRuleId(rule.leavePolicyRuleId);
    setRuleDraft(policyRuleDraftFromRule(rule));
    setNotice("");
  };
  // edited by wali: Reset the full rule editor when the Company Admin cancels an edit.
  const resetRuleForm = () => {
    setEditingRuleId("");
    setRuleDraft(newPolicyRuleDraft());
  };
  // edited by wali: Load an existing policy into the form so its effective dates can be edited.
  const editPolicy = (item: LeavePolicy) => {
    setEditingPolicyId(item.leavePolicyId);
    setSelectedPolicyId(item.leavePolicyId);
    resetRuleForm();
    setPolicyCode(item.policyCode);
    setPolicyName(item.policyName);
    setPolicyDescription(item.description ?? "");
    setEffectiveFrom(item.effectiveFrom);
    setEffectiveTo(item.effectiveTo ?? "");
    setPolicyIsActive(item.isActive);
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
  const errors = [typeMutation.error, typeStatusMutation.error, policyMutation.error, ruleMutation.error, ruleStatusMutation.error, defaultMutation.error, periodMutation.error, typesQuery.error, policiesQuery.error, periodsQuery.error, rulesQuery.error].filter(Boolean);

  return <main className="page-stack leave-setup leave-setup--configuration wf-org-page">
    <header className="leave-setup__header wf-org-hero">
      {/* edited by wali: Balance initialization now lives on the dedicated Balances page. */}
      <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><Umbrella size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Leave management</span><h1>Leave Configuration</h1><p>Complete the setup steps before employees can request leave.</p></div></div>
      {/* edited by wali: Configuration data refreshes after changes, so this tab has no manual refresh control. */}
      <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Umbrella size={19} /></div><div><span>Company-wide setup</span><strong>Policies and entitlements</strong></div></div>
    </header>
    {notice && <div className="leave-setup__notice leave-setup__notice--success"><Check size={17} />{notice}</div>}
    {errors.map((error, index) => <div className="leave-setup__notice leave-setup__notice--error" key={index}><CircleAlert size={17} />{normalizeApiError(error).message}</div>)}

    <nav className="leave-setup__configuration-tabs" role="tablist" aria-label="Leave configuration sections">
      <button type="button" role="tab" aria-selected={configurationTab === "types"} className={configurationTab === "types" ? "is-active" : ""} onClick={() => setConfigurationTab("types")}>Leave types</button>
      <button type="button" role="tab" aria-selected={configurationTab === "policies"} className={configurationTab === "policies" ? "is-active" : ""} onClick={() => setConfigurationTab("policies")}>Policies &amp; rules</button>
      <button type="button" role="tab" aria-selected={configurationTab === "periods"} className={configurationTab === "periods" ? "is-active" : ""} onClick={() => setConfigurationTab("periods")}>Leave periods</button>
    </nav>

    {configurationTab === "types" && <section className="leave-setup__step">
      <div className="leave-setup__step-heading leave-setup__step-heading--actions">
        <span>1</span>
        <div><h2>Manage leave types</h2><p>Create categories employees can request, or edit an existing type.</p></div>
        {/* Keep leave type actions in the section header while submitting the form below. */}
        {editingTypeId && <button className="leave-setup__button" type="button" disabled={typeMutation.isPending} onClick={resetTypeForm}>Cancel edit</button>}
        <button className="leave-setup__button leave-setup__button--primary" type="submit" form="leave-type-form" disabled={typeMutation.isPending}>{editingTypeId ? <Check size={16} /> : <Plus size={16} />}{typeMutation.isPending ? "Saving..." : editingTypeId ? "Save type" : "Create type"}</button>
      </div>
      <form id="leave-type-form" className="leave-setup__form" onSubmit={submitType}>
        <label><span>Name</span><input required maxLength={150} value={typeName} onChange={(event) => setTypeName(event.target.value)} /></label>
        <label><span>Code</span><input required maxLength={50} pattern="[A-Za-z0-9 _-]+" value={typeCode} onChange={(event) => setTypeCode(event.target.value)} /></label>
        {/* edited by wali: Match leave configuration selectors to the shared workforce dropdown. */}
        <label><span>Unit</span><EmployeeMenuSelect className="leave-setup__select" disabled={Boolean(editingTypeId)} value={unitType} placeholder="Select a unit" options={[{ value: "DAYS", label: "Days" }, { value: "HOURS", label: "Hours" }]} onChange={(value) => setUnitType(value as "DAYS" | "HOURS")} allowClear={false} /></label>
        <label className="leave-setup__check"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} />Paid leave</label>
        <label className="leave-setup__check"><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />Requires approval</label>
        {editingTypeId && <>
          <label><span>Description <small>(optional)</small></span><input maxLength={5000} value={typeDescription} onChange={(event) => setTypeDescription(event.target.value)} /></label>
          <label><span>Sort order</span><input type="number" min="0" max="65535" required value={typeSortOrder} onChange={(event) => setTypeSortOrder(event.target.value)} /></label>
          <label><span>Display color</span><input type="color" value={typeDisplayColor} onChange={(event) => setTypeDisplayColor(event.target.value)} /></label>
          <label className="leave-setup__check"><input type="checkbox" checked={requiresAttachment} onChange={(event) => setRequiresAttachment(event.target.checked)} />Requires attachment</label>
          <p className="leave-setup__hint">The unit cannot be changed here because existing balances and requests use the current unit.</p>
        </>}
      </form>
      {typesQuery.isLoading ? <Loading label="Loading leave types..." /> : types.length === 0 ? <p className="leave-setup__empty">No leave types yet.</p> : <div className="leave-setup__catalog">{types.map((item) => <div className="leave-setup__catalog-row" key={item.leaveTypeId}><span className="leave-setup__type-dot" style={{ backgroundColor: item.displayColor ?? "#127783" }} /><div><strong>{item.leaveTypeName}</strong><small>{item.leaveTypeCode} / {item.unitType.toLowerCase()} / {item.isPaid ? "paid" : "unpaid"}</small></div><span className={`leave-setup__badge ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span><button className="leave-setup__text-button" type="button" onClick={() => editLeaveType(item)} disabled={typeMutation.isPending || typeStatusMutation.isPending}>Edit</button><button className="leave-setup__text-button" type="button" onClick={() => typeStatusMutation.mutate(item)} disabled={typeStatusMutation.isPending || typeMutation.isPending}>{item.isActive ? "Deactivate" : "Activate"}</button></div>)}</div>}
    </section>}

    {configurationTab === "policies" && <>
    <section className={`leave-setup__step ${!activeTypes.length ? "is-locked" : ""}`}>
      <div className="leave-setup__step-heading leave-setup__step-heading--actions">
        <span>2</span>
        <div><h2>Create a policy</h2><p>Create a policy for a staff category, such as Junior Staff or Senior Staff.</p></div>
        {/* Keep policy actions in the section header while submitting the form below. */}
        {editingPolicyId && <button className="leave-setup__button" type="button" onClick={() => { setEditingPolicyId(""); setPolicyCode(""); setPolicyName(""); setPolicyDescription(""); setEffectiveFrom(todayLocal()); setEffectiveTo(""); setPolicyIsActive(true); setNotice(""); }}>Cancel edit</button>}
        <button className="leave-setup__button leave-setup__button--primary" type="submit" form="leave-policy-form" disabled={!activeTypes.length || policyMutation.isPending}><Plus size={16} />{policyMutation.isPending ? "Saving..." : editingPolicyId ? "Update policy" : "Create policy"}</button>
      </div>
      {!activeTypes.length && <div className="leave-setup__hint"><CircleAlert size={16} />Create or activate a leave type first.</div>}
      <form id="leave-policy-form" className="leave-setup__form leave-setup__form--policy" onSubmit={submitPolicy}>
        <label><span>Policy name</span><input required maxLength={150} disabled={!activeTypes.length} value={policyName} onChange={(event) => setPolicyName(event.target.value)} /></label>
        <label><span>Policy code</span><input required maxLength={50} pattern="[A-Za-z0-9 _-]+" disabled={!activeTypes.length} value={policyCode} onChange={(event) => setPolicyCode(event.target.value)} /></label>
        <label><span>Effective from</span><input type="date" required disabled={!activeTypes.length} value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
        {/* edited by wali: Keep the end-date input aligned with the other policy fields by removing its extra helper row. */}
        <label><span>Effective until <small>(optional)</small></span><input type="date" min={effectiveFrom} disabled={!activeTypes.length} value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></label>
        <label className="leave-setup__policy-description"><span>Description <small>(optional)</small></span><input maxLength={5000} disabled={!activeTypes.length} value={policyDescription} onChange={(event) => setPolicyDescription(event.target.value)} /></label>
        <label className="leave-setup__check"><input type="checkbox" disabled={!activeTypes.length} checked={policyIsActive} onChange={(event) => setPolicyIsActive(event.target.checked)} />Policy active</label>
      </form>
      {policiesQuery.isLoading ? <Loading label="Loading policies..." /> : policies.length === 0 ? <p className="leave-setup__empty">No policies yet.</p> : <div className="leave-setup__policies">{policies.map((item) => <div className="leave-setup__policy-row" key={item.leavePolicyId}><button className={`leave-setup__policy-card ${item.leavePolicyId === selectedPolicyId ? "is-selected" : ""}`} type="button" onClick={() => { setSelectedPolicyId(item.leavePolicyId); resetRuleForm(); }}><span><strong>{item.policyName}</strong><small>{item.policyCode} / {item.effectiveFrom}{item.effectiveTo ? ` to ${item.effectiveTo}` : " / no end date"}</small></span><span className={`leave-setup__badge ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isDefault ? "Company default" : item.isActive ? "Active" : "Inactive"}</span></button><button className="leave-setup__text-button" type="button" onClick={() => editPolicy(item)}>Edit</button></div>)}</div>}
    </section>

    <section className={`leave-setup__step ${!policy ? "is-locked" : ""}`}>
      <div className="leave-setup__step-heading leave-setup__step-heading--actions">
        <span>3</span>
        <div><h2>Configure leave rules</h2><p>{policy ? <>Rules for <strong>{policy.policyName}</strong> ({policy.policyCode}). Add each leave type this policy covers; another policy can set different rules for the same type.</> : "Select a policy above to configure its leave type rules."}</p></div>
        {policy && (policy.isDefault
          ? <div className="leave-setup__badge is-active">Company default</div>
          : <div className="leave-setup__policy-default-action">
              <button className="leave-setup__button leave-setup__button--primary" type="button" disabled={!canApply || defaultMutation.isPending} onClick={() => defaultMutation.mutate(policy)}><Check size={16} />{defaultMutation.isPending ? "Applying..." : "Make default"}</button>
              <small>{!hasActiveRule ? "Add an active leave rule first." : !effectiveToday ? "The policy must be active and effective today." : "Applies to employees without an individual policy assignment."}</small>
            </div>)}
      </div>
      {!policy ? <div className="leave-setup__hint"><CircleAlert size={16} />Create or select a policy first.</div> : <>
        <form className="leave-setup__rule-config" onSubmit={submitRule}>
          <div className="leave-setup__rule-config-heading"><div><strong>{editingRuleId ? "Edit leave type rule" : "Add a leave type to this policy"}</strong><small>Optional limits can be left blank. The backend will validate related settings when saved.</small></div>{editingRuleId && <button className="leave-setup__button" type="button" onClick={resetRuleForm}>Cancel edit</button>}</div>
          <fieldset className="leave-setup__rule-group">
            <legend>Leave type, entitlement and accrual</legend>
            <div className="leave-setup__rule-fields">
              <label><span>Leave type</span><EmployeeMenuSelect className="leave-setup__select" disabled={(!availableTypes.length && !editingRuleId) || ruleMutation.isPending} value={ruleDraft.leaveTypeId} placeholder="Select a type" options={[...activeTypes.filter((item) => !rules.some((rule) => rule.leaveTypeId === item.leaveTypeId && rule.leavePolicyRuleId !== editingRuleId)), ...types.filter((item) => !item.isActive && item.leaveTypeId === ruleDraft.leaveTypeId)].map((item) => ({ value: item.leaveTypeId, label: `${item.leaveTypeName} (${item.unitType.toLowerCase()})${item.isActive ? "" : " · inactive"}` }))} onChange={(value) => setRuleDraft((current) => ({ ...current, leaveTypeId: value }))} searchable searchPlaceholder="Search leave types" allowClear={false} /></label>
              <label><span>Annual entitlement ({types.find((item) => item.leaveTypeId === ruleDraft.leaveTypeId)?.unitType.toLowerCase() ?? "units"}/year)</span><input type="number" min="0" max="100000" step="0.5" required value={ruleDraft.annualEntitlementUnits} onChange={(event) => setRuleDraft((current) => ({ ...current, annualEntitlementUnits: event.target.value }))} /></label>
              <label><span>Accrual method</span><EmployeeMenuSelect className="leave-setup__select" value={ruleDraft.accrualMethod} placeholder="Select method" options={[{ value: "ANNUAL", label: "Annual" }, { value: "SEMI_ANNUAL", label: "Semi-annual" }, { value: "QUARTERLY", label: "Quarterly" }, { value: "MONTHLY", label: "Monthly" }, { value: "MANUAL", label: "Manual" }]} onChange={(value) => setRuleDraft((current) => ({ ...current, accrualMethod: value }))} allowClear={false} /></label>
              <label><span>Calculated units per accrual run</span><input type="text" readOnly value={calculatedUnitsPerAccrualRun(ruleDraft)} /></label>
              <label><span>Start accrual after (days)</span><input type="number" min="0" max="65535" step="1" value={ruleDraft.accrualStartAfterDays} onChange={(event) => setRuleDraft((current) => ({ ...current, accrualStartAfterDays: event.target.value }))} /></label>
              <CheckField label="Prorate entitlement" checked={ruleDraft.prorateEntitlement} onChange={(checked) => setRuleDraft((current) => ({ ...current, prorateEntitlement: checked }))} />
            </div>
          </fieldset>
          <fieldset className="leave-setup__rule-group">
            <legend>Eligibility</legend>
            <div className="leave-setup__rule-fields">
              <label><span>Eligible gender</span><EmployeeMenuSelect className="leave-setup__select" value={ruleDraft.eligibleGender} placeholder="Select eligibility" options={[{ value: "ALL", label: "All employees" }, { value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }, { value: "OTHER", label: "Other" }]} onChange={(value) => setRuleDraft((current) => ({ ...current, eligibleGender: value }))} allowClear={false} /></label>
              <CheckField label="Allow during probation" checked={ruleDraft.allowDuringProbation} onChange={(checked) => setRuleDraft((current) => ({ ...current, allowDuringProbation: checked }))} />
            </div>
          </fieldset>
          <fieldset className="leave-setup__rule-group">
            <legend>Request rules</legend>
            <div className="leave-setup__rule-fields">
              <label><span>Minimum request ({ruleDraft.leaveTypeId ? types.find((item) => item.leaveTypeId === ruleDraft.leaveTypeId)?.unitType.toLowerCase() : "units"})</span><input type="number" min="0.01" max="100000" step="0.01" required value={ruleDraft.minimumRequestUnits} onChange={(event) => setRuleDraft((current) => ({ ...current, minimumRequestUnits: event.target.value }))} /></label>
              <OptionalNumberField label="Maximum request" value={ruleDraft.maximumRequestUnits} onChange={(value) => setRuleDraft((current) => ({ ...current, maximumRequestUnits: value }))} step="0.01" />
              <label><span>Minimum notice (days)</span><input type="number" min="0" max="65535" step="1" value={ruleDraft.minimumNoticeDays} onChange={(event) => setRuleDraft((current) => ({ ...current, minimumNoticeDays: event.target.value }))} /></label>
              <OptionalNumberField label="Maximum advance (days)" value={ruleDraft.maximumAdvanceDays} onChange={(value) => setRuleDraft((current) => ({ ...current, maximumAdvanceDays: value }))} step="1" min={1} max={65535} />
              <label><span>Maximum backdate (days)</span><input type="number" min="0" max="65535" step="1" value={ruleDraft.maximumBackdateDays} onChange={(event) => setRuleDraft((current) => ({ ...current, maximumBackdateDays: event.target.value }))} /></label>
              <CheckField label="Allow half-day requests" checked={ruleDraft.allowHalfDay} onChange={(checked) => setRuleDraft((current) => ({ ...current, allowHalfDay: checked }))} />
              <CheckField label="Allow hourly requests" checked={ruleDraft.allowHourlyLeave} onChange={(checked) => setRuleDraft((current) => ({ ...current, allowHourlyLeave: checked }))} />
              <CheckField label="Count weekends" checked={ruleDraft.includeWeekends} onChange={(checked) => setRuleDraft((current) => ({ ...current, includeWeekends: checked }))} />
              <CheckField label="Count holidays" checked={ruleDraft.includeHolidays} onChange={(checked) => setRuleDraft((current) => ({ ...current, includeHolidays: checked }))} />
              <CheckField label="Apply sandwich rule" checked={ruleDraft.sandwichRuleEnabled} onChange={(checked) => setRuleDraft((current) => ({ ...current, sandwichRuleEnabled: checked }))} />
            </div>
          </fieldset>
          <fieldset className="leave-setup__rule-group">
            <legend>Carry-forward and balance</legend>
            <div className="leave-setup__rule-fields">
              <CheckField label="Allow carry-forward" checked={ruleDraft.carryForwardEnabled} onChange={(checked) => setRuleDraft((current) => ({ ...current, carryForwardEnabled: checked }))} />
              <OptionalNumberField label="Maximum carry-forward" value={ruleDraft.maximumCarryForwardUnits} onChange={(value) => setRuleDraft((current) => ({ ...current, maximumCarryForwardUnits: value }))} step="0.01" />
              <OptionalNumberField label="Carry-forward expires after (months)" value={ruleDraft.carryForwardExpiryMonths} onChange={(value) => setRuleDraft((current) => ({ ...current, carryForwardExpiryMonths: value }))} step="1" min={1} max={65535} />
              <OptionalNumberField label="Maximum balance" value={ruleDraft.maximumBalanceUnits} onChange={(value) => setRuleDraft((current) => ({ ...current, maximumBalanceUnits: value }))} step="0.01" />
              <CheckField label="Allow negative balance" checked={ruleDraft.allowNegativeBalance} onChange={(checked) => setRuleDraft((current) => ({ ...current, allowNegativeBalance: checked }))} />
              <label><span>Negative balance limit</span><input type="number" min="0" max="100000" step="0.01" value={ruleDraft.negativeBalanceLimit} onChange={(event) => setRuleDraft((current) => ({ ...current, negativeBalanceLimit: event.target.value }))} /></label>
            </div>
          </fieldset>
          <fieldset className="leave-setup__rule-group">
            <legend>Attachments, encashment and approvals</legend>
            <div className="leave-setup__rule-fields">
              <OptionalNumberField label="Require attachment after (units)" value={ruleDraft.attachmentRequiredAfterUnits} onChange={(value) => setRuleDraft((current) => ({ ...current, attachmentRequiredAfterUnits: value }))} step="0.01" />
              <CheckField label="Allow encashment" checked={ruleDraft.encashmentAllowed} onChange={(checked) => setRuleDraft((current) => ({ ...current, encashmentAllowed: checked }))} />
              <OptionalNumberField label="Maximum encashment" value={ruleDraft.maximumEncashmentUnits} onChange={(value) => setRuleDraft((current) => ({ ...current, maximumEncashmentUnits: value }))} step="0.01" />
              <label><span>Approval levels</span><input type="number" min="1" max="20" step="1" value={ruleDraft.approvalLevelsRequired} onChange={(event) => setRuleDraft((current) => ({ ...current, approvalLevelsRequired: event.target.value }))} /></label>
              <CheckField label="Rule active" checked={ruleDraft.isActive} onChange={(checked) => setRuleDraft((current) => ({ ...current, isActive: checked }))} />
            </div>
          </fieldset>
          <div className="leave-setup__rule-actions"><button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={!ruleDraft.leaveTypeId || ruleMutation.isPending}>{ruleMutation.isPending ? "Saving..." : editingRuleId ? "Save rule" : "Add leave type rule"}</button></div>
        </form>
        {rulesQuery.isLoading ? <Loading label="Loading policy rules..." /> : rules.length === 0 ? <p className="leave-setup__empty">No leave type rules in this policy yet.</p> : <div className="leave-setup__rules">{rules.map((rule) => <div className="leave-setup__rule-row" key={rule.leavePolicyRuleId}>
          <div><strong>{rule.leaveTypeName}</strong><small>{rule.annualEntitlementUnits} {rule.unitType.toLowerCase()}/year · {rule.accrualMethod.toLowerCase().replace("_", " ")} accrual · {rule.carryForwardEnabled ? "carry-forward on" : "no carry-forward"}</small></div>
          <span className={`leave-setup__badge ${rule.isActive ? "is-active" : "is-inactive"}`}>{rule.isActive ? "Active" : "Inactive"}</span>
          <button className="leave-setup__text-button" type="button" disabled={ruleMutation.isPending || ruleStatusMutation.isPending} onClick={() => editRule(rule)}>Edit settings</button>
          <button className="leave-setup__text-button" type="button" disabled={ruleStatusMutation.isPending || ruleMutation.isPending} onClick={() => ruleStatusMutation.mutate({ ruleId: rule.leavePolicyRuleId, isActive: !rule.isActive })}>{rule.isActive ? "Deactivate" : "Activate"}</button>
        </div>)}</div>}
      </>}
    </section>
    </>}
    {/* added by wali: Let the Company Admin create an initial period or manually generate its successor. */}
    {configurationTab === "periods" && <section className="leave-setup__step">
      <div className="leave-setup__step-heading leave-setup__step-heading--actions"><span>4</span><div><h2>Set up leave periods</h2><p>Create an initial annual or quarterly period, then generate the next one from the latest period. Each request must fit within one open period.</p></div>
        <button className="leave-setup__button leave-setup__button--primary" type="button" disabled={periodMutation.isPending || !periods.length || !nextPeriod || Boolean(nextPeriodConflict)} onClick={() => { if (!nextPeriod) return; setNotice(""); periodMutation.mutate({ periodCode: nextPeriod.periodCode, periodName: nextPeriod.periodName, startDate: nextPeriod.startDate, endDate: nextPeriod.endDate }); }}><Plus size={16} />{periodMutation.isPending ? "Generating..." : "Generate next period"}</button>
      </div>
      {nextPeriod && <div className="leave-setup__hint">Next after <strong>{nextPeriod.sourceName}</strong>: {nextPeriod.periodName} ({nextPeriod.startDate} to {nextPeriod.endDate}). This creates an open period without closing the current one.</div>}
      {nextPeriod && nextPeriodConflict && <div className="leave-setup__hint"><CircleAlert size={16} />A period already overlaps or uses this next period's code ({nextPeriodConflict.periodName}). No duplicate will be generated.</div>}
      {!periods.length && <div className="leave-setup__hint"><CircleAlert size={16} />Create the first annual or quarterly period below. Then this button will generate its successor.</div>}
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
    </section>}
  </main>;
}

function Loading({ label }: { label: string }) {
  return <div className="leave-setup__loading"><LoaderCircle size={16} />{label}</div>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="leave-setup__check leave-setup__rule-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function OptionalNumberField({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 100000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
  min?: number;
  max?: number;
}) {
  return <label><span>{label} <small>(optional)</small></span><input type="number" min={min} max={max} step={step} value={value} placeholder="No limit" onChange={(event) => onChange(event.target.value)} /></label>;
}

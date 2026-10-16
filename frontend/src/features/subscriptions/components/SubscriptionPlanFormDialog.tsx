// edited by wali: Edit plan pricing, capacity and feature entitlements in one admin form.
import { AlertTriangle, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  SubscriptionFeatureFlag,
  SubscriptionPlanDetails,
  SubscriptionPlanInput,
} from "../types/subscription-plan.types";

interface Props {
  open: boolean;
  plan: SubscriptionPlanDetails | null;
  featureFlags: SubscriptionFeatureFlag[];
  isLoadingPlan: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (planId: string | null, input: SubscriptionPlanInput, enabledFeatureCodes: string[]) => Promise<void>;
}
interface FormState {
  planCode: string; planName: string; description: string;
  maximumEmployees: string; maximumBranches: string; maximumUsers: string; storageLimitMb: string;
  monthlyPrice: string; annualPrice: string; currencyCode: string; trialDays: string; isActive: boolean;
}
function blankForm(): FormState {
  return { planCode: "", planName: "", description: "", maximumEmployees: "", maximumBranches: "", maximumUsers: "", storageLimitMb: "", monthlyPrice: "0", annualPrice: "0", currencyCode: "PKR", trialDays: "0", isActive: true };
}
function planForm(plan: SubscriptionPlanDetails["plan"] | null): FormState {
  if (!plan) return blankForm();
  return { planCode: plan.planCode, planName: plan.planName, description: plan.description ?? "", maximumEmployees: plan.maximumEmployees?.toString() ?? "", maximumBranches: plan.maximumBranches?.toString() ?? "", maximumUsers: plan.maximumUsers?.toString() ?? "", storageLimitMb: plan.storageLimitMb?.toString() ?? "", monthlyPrice: String(plan.monthlyPrice), annualPrice: String(plan.annualPrice), currencyCode: plan.currencyCode, trialDays: String(plan.trialDays), isActive: plan.isActive };
}
function limitValue(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function SubscriptionPlanFormDialog({ open, plan, featureFlags, isLoadingPlan, isSaving, error, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(blankForm);
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(planForm(plan?.plan ?? null));
    setFormError(null);
    const configured = new Map((plan?.features ?? []).map((item) => [item.featureCode, item.isEnabled]));
    setEnabledFeatures(new Set(featureFlags.filter((flag) => configured.get(flag.featureCode) ?? flag.defaultEnabled).map((flag) => flag.featureCode)));
  }, [open, plan, featureFlags]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SubscriptionFeatureFlag[]>();
    for (const flag of featureFlags) {
      const name = flag.moduleName?.trim() || "General";
      grouped.set(name, [...(grouped.get(name) ?? []), flag]);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [featureFlags]);

  if (!open) return null;
  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleFeature(code: string) {
    setEnabledFeatures((current) => { const next = new Set(current); if (next.has(code)) next.delete(code); else next.add(code); return next; });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    if (form.planCode.trim().length < 2 || form.planName.trim().length < 2) { setFormError("Plan code and name must contain at least 2 characters."); return; }
    if (!/^[A-Za-z0-9_-]+$/.test(form.planCode.trim())) { setFormError("Plan code may contain letters, numbers, underscores and hyphens."); return; }
    if (!/^[A-Za-z]{3}$/.test(form.currencyCode.trim())) { setFormError("Currency must be a three-letter code, such as PKR."); return; }
    if ([form.maximumEmployees, form.maximumBranches, form.maximumUsers, form.storageLimitMb].some((value) => value.trim() && limitValue(value) === null)) { setFormError("Limits must be whole numbers greater than zero, or blank for unlimited."); return; }
    const money = (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
    const input: SubscriptionPlanInput = {
      planCode: form.planCode.trim().toUpperCase(), planName: form.planName.trim(), description: form.description.trim() || null,
      maximumEmployees: limitValue(form.maximumEmployees), maximumBranches: limitValue(form.maximumBranches), maximumUsers: limitValue(form.maximumUsers), storageLimitMb: limitValue(form.storageLimitMb),
      monthlyPrice: money(form.monthlyPrice), annualPrice: money(form.annualPrice), currencyCode: form.currencyCode.trim().toUpperCase(), trialDays: Math.max(0, Math.min(3650, Math.trunc(money(form.trialDays)))), isActive: form.isActive,
    };
    try { await onSave(plan?.plan.planId ?? null, input, [...enabledFeatures]); }
    catch (saveError) { setFormError(saveError instanceof Error ? saveError.message : "The plan could not be saved."); }
  }

  return (
    <div className="subscription-admin__modal-layer" role="dialog" aria-modal="true" aria-labelledby="plan-form-title">
      <button type="button" className="subscription-admin__backdrop" onClick={onClose} aria-label="Close plan form" />
      <form className="subscription-admin__dialog" onSubmit={(event) => void submit(event)}>
        <header className="subscription-admin__dialog-head">
          <div><span className="subscription-admin__eyebrow">Subscription catalog</span><h2 id="plan-form-title">{plan ? "Edit plan" : "Create plan"}</h2><p>Configure plan pricing, company capacity and included features.</p></div>
          <button type="button" className="subscription-admin__icon-button" onClick={onClose} disabled={isSaving} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="subscription-admin__dialog-body">
          {isLoadingPlan ? <div className="subscription-admin__loading"><LoaderCircle className="spin" size={20} /> Loading plan details</div> : <>
            {error || formError ? <div className="subscription-admin__alert"><AlertTriangle size={16} /> {formError ?? error}</div> : null}
            <section className="subscription-admin__form-section"><h3>Plan details</h3><div className="subscription-admin__form-grid">
              <label><span>Plan code *</span><input value={form.planCode} onChange={(event) => update("planCode", event.target.value)} maxLength={50} required /></label>
              <label><span>Plan name *</span><input value={form.planName} onChange={(event) => update("planName", event.target.value)} maxLength={100} required /></label>
              <label className="is-wide"><span>Description</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={3} /></label>
              <label><span>Currency</span><input value={form.currencyCode} onChange={(event) => update("currencyCode", event.target.value)} maxLength={3} required /></label>
              <label><span>Trial days</span><input type="number" min="0" max="3650" step="1" value={form.trialDays} onChange={(event) => update("trialDays", event.target.value)} /></label>
              <label className="subscription-admin__check-field"><input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} /><span><strong>Active plan</strong><small>Available for new company subscriptions.</small></span></label>
            </div></section>
            <section className="subscription-admin__form-section"><h3>Pricing</h3><p>The backend currently supports monthly and annual plan prices. Custom billing periods are set on a company subscription.</p><div className="subscription-admin__form-grid subscription-admin__form-grid--three">
              <label><span>Monthly price</span><input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(event) => update("monthlyPrice", event.target.value)} /></label>
              <label><span>Annual price</span><input type="number" min="0" step="0.01" value={form.annualPrice} onChange={(event) => update("annualPrice", event.target.value)} /></label>
            </div></section>
            <section className="subscription-admin__form-section"><h3>Included capacity</h3><p>Leave a limit blank for unlimited capacity.</p><div className="subscription-admin__form-grid subscription-admin__form-grid--four">
              <label><span>Employees</span><input type="number" min="1" step="1" value={form.maximumEmployees} onChange={(event) => update("maximumEmployees", event.target.value)} placeholder="Unlimited" /></label>
              <label><span>Users</span><input type="number" min="1" step="1" value={form.maximumUsers} onChange={(event) => update("maximumUsers", event.target.value)} placeholder="Unlimited" /></label>
              <label><span>Branches</span><input type="number" min="1" step="1" value={form.maximumBranches} onChange={(event) => update("maximumBranches", event.target.value)} placeholder="Unlimited" /></label>
              <label><span>Storage (MB)</span><input type="number" min="1" step="1" value={form.storageLimitMb} onChange={(event) => update("storageLimitMb", event.target.value)} placeholder="Unlimited" /></label>
            </div></section>
            <section className="subscription-admin__form-section"><h3>Included features</h3>
              {groups.length === 0 ? <p>No active feature flags are available.</p> : groups.map(([group, flags]) => <fieldset className="subscription-admin__feature-group" key={group}><legend>{group}</legend><div>{flags.map((flag) => <label className="subscription-admin__feature-option" key={flag.featureCode}><input type="checkbox" checked={enabledFeatures.has(flag.featureCode)} onChange={() => toggleFeature(flag.featureCode)} /><span><strong>{flag.featureName}</strong><small>{flag.description || flag.featureCode}</small></span></label>)}</div></fieldset>)}
            </section>
          </>}
        </div>
        <footer className="subscription-admin__dialog-foot"><button type="button" className="subscription-admin__button subscription-admin__button--quiet" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" className="subscription-admin__button subscription-admin__button--primary" disabled={isSaving || isLoadingPlan || Boolean(error)}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{isSaving ? "Saving" : "Save plan"}</button></footer>
      </form>
    </div>
  );
}

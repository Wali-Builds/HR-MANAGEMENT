// edited by wali: Let company administrators view active plans and subscribe themselves.
import { Ban, Check, CreditCard, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import {
  useCompanySubscription,
  useCancelCompanySubscription,
  useSelfServiceSubscribeCompany,
  useSubscriptionPlans,
} from "../../companies/hooks/useCompanySubscription";
import type { SubscriptionPlan } from "../../companies/types/company-subscription.types";
import "./company-subscription.css";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency + " " + amount.toLocaleString("en-GB");
  }
}

function limit(value: number | null, suffix: string): string {
  return value === null ? "Unlimited " + suffix : value.toLocaleString() + " " + suffix;
}

export function CompanySubscriptionPage() {
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission } = usePermissions();
  const companyId = user?.companyId ?? "";
  const canSubscribe =
    user?.roleCodes.includes("COMPANY_ADMIN") ||
    hasAnyPermission(["subscription.company.manage", "company.manage"]);
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const plansQuery = useSubscriptionPlans(Boolean(companyId));
  const currentQuery = useCompanySubscription(companyId);
  const subscribe = useSelfServiceSubscribeCompany(companyId);
  const cancel = useCancelCompanySubscription(companyId);

  const plans = plansQuery.data?.plans ?? [];
  const current = currentQuery.data ?? null;

  async function choosePlan(plan: SubscriptionPlan): Promise<void> {
    if (!canSubscribe) return;
    const cycleLabel = cycle === "ANNUAL" ? "annual" : "monthly";
    if (current && !window.confirm(
      "Subscribe to " + plan.planName + " " + cycleLabel +
      "? This activates immediately and replaces the current plan. Payment is handled outside the app."
    )) return;

    try {
      await subscribe.mutateAsync({ planId: plan.planId, billingCycle: cycle });
      toast.success("Subscription activated. Payment is handled outside the app.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  // edited by wali: Confirm and immediately cancel this company's current subscription.
  async function cancelCurrentPlan(): Promise<void> {
    if (!canSubscribe || !current || current.subscriptionStatus === "CANCELLED") return;
    if (!window.confirm(
      "Cancel this subscription now? Company subscription access will end immediately. You can subscribe to an available plan again later."
    )) return;

    try {
      await cancel.mutateAsync();
      toast.success("Subscription cancelled. Access has ended immediately.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  // edited by wali: Platform Administrators use the plan catalog; tenants use self-service.
  if (user?.isPlatformAdmin) {
    return <Navigate to="/subscriptions/plans" replace />;
  }

  if (!companyId) {
    return <main className="my-subscription"><div className="my-subscription__notice">This account is not linked to a company.</div></main>;
  }

  const loadError = plansQuery.error ?? currentQuery.error;

  return (
    <main className="my-subscription">
      <header className="my-subscription__header">
        <div>
          <span className="my-subscription__eyebrow">Company billing</span>
          <h1>Plans and subscription</h1>
          <p>Choose a plan for your company. The selected plan becomes active immediately.</p>
        </div>
        <CreditCard size={27} />
      </header>

      {currentQuery.isLoading ? (
        <div className="my-subscription__state"><LoaderCircle className="my-subscription__spin" /> Loading current subscription...</div>
      ) : current ? (
        <section className="my-subscription__current">
          <div><span>Current plan</span><strong>{current.planName}</strong><small>{current.subscriptionStatus} | {current.billingCycle} | {money(current.agreedPrice, current.currencyCode)}</small></div>
          {/* edited by wali: Show company admins the cancellation action for an active subscription. */}
          <div className="my-subscription__current-actions">
            <span className={current.subscriptionStatus === "ACTIVE" || current.subscriptionStatus === "TRIAL" ? "my-subscription__active" : "my-subscription__active my-subscription__active--inactive"}><i />{current.subscriptionStatus}</span>
            {canSubscribe && current.subscriptionStatus !== "CANCELLED" && current.subscriptionStatus !== "EXPIRED" ? (
              <button className="my-subscription__cancel" type="button" disabled={cancel.isPending} onClick={() => void cancelCurrentPlan()}>
                {cancel.isPending ? <LoaderCircle className="my-subscription__spin" size={14} /> : <Ban size={14} />}
                Cancel subscription
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="my-subscription__current my-subscription__current--empty">
          <div><span>Current plan</span><strong>No subscription yet</strong><small>Select an active plan below to activate it.</small></div>
        </section>
      )}

      <section className="my-subscription__catalog">
        <div className="my-subscription__catalog-head">
          <div><h2>Available plans</h2><p>Only active plans created by the platform administrator are shown.</p></div>
          <div className="my-subscription__cycle" aria-label="Billing cycle">
            <button type="button" className={cycle === "MONTHLY" ? "is-selected" : ""} onClick={() => setCycle("MONTHLY")}>Monthly</button>
            <button type="button" className={cycle === "ANNUAL" ? "is-selected" : ""} onClick={() => setCycle("ANNUAL")}>Annual</button>
          </div>
        </div>

        {loadError ? (
          <div className="my-subscription__state my-subscription__state--error">
            <span>{normalizeApiError(loadError).message}</span>
            <button type="button" onClick={() => { void plansQuery.refetch(); void currentQuery.refetch(); }}><RefreshCw size={14} /> Retry</button>
          </div>
        ) : plansQuery.isLoading ? (
          <div className="my-subscription__state"><LoaderCircle className="my-subscription__spin" /> Loading available plans...</div>
        ) : !plans.length ? (
          <div className="my-subscription__state">No active plans are available. Contact your platform administrator.</div>
        ) : (
          <div className="my-subscription__grid">
            {plans.map((plan) => {
              const amount = cycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;
              const alreadySelected = Boolean(current && (current.subscriptionStatus === "ACTIVE" || current.subscriptionStatus === "TRIAL") && current.planId === plan.planId && current.billingCycle === cycle);
              return (
                <article className={alreadySelected ? "my-subscription__plan is-current" : "my-subscription__plan"} key={plan.planId}>
                  <div className="my-subscription__plan-top"><span>{plan.planCode}</span>{alreadySelected ? <b><Check size={13} /> Current</b> : null}</div>
                  <h3>{plan.planName}</h3>
                  <p>{plan.description || "A plan configured for your organisation's HR needs."}</p>
                  <strong className="my-subscription__price">{money(amount, plan.currencyCode)}<small> / {cycle === "ANNUAL" ? "year" : "month"}</small></strong>
                  <div className="my-subscription__limits">
                    <span>{limit(plan.maximumEmployees, "employees")}</span>
                    <span>{limit(plan.maximumUsers, "users")}</span>
                    <span>{limit(plan.maximumBranches, "branches")}</span>
                    <span>{plan.featureCount} configured features</span>
                  </div>
                  {plan.trialDays > 0 ? <small className="my-subscription__trial">{plan.trialDays} trial days configured. This subscription flow activates immediately.</small> : null}
                  <button type="button" disabled={!canSubscribe || subscribe.isPending || currentQuery.isLoading || alreadySelected} onClick={() => void choosePlan(plan)}>
                    {subscribe.isPending ? <LoaderCircle className="my-subscription__spin" size={15} /> : <ShieldCheck size={15} />}
                    {alreadySelected ? "Current plan" : current?.subscriptionStatus === "CANCELLED" ? "Subscribe again" : current ? "Switch to this plan" : "Subscribe now"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {!canSubscribe ? <p className="my-subscription__permission">Your account can view plans but does not have permission to subscribe. Ask your company administrator.</p> : null}
      </section>
      <p className="my-subscription__payment-note">Subscriptions activate immediately. Payment collection and automatic renewal are not handled in the app.</p>
    </main>
  );
}

import {
  CalendarDays,
  CreditCard,
  LoaderCircle,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useSaveCompanySubscription,
  useSubscriptionPlans,
} from "../hooks/useCompanySubscription";
import type {
  BillingCycle,
  CompanySubscriptionInput,
  CurrentCompanySubscription,
  SubscriptionStatus,
} from "../types/company-subscription.types";

interface SubscriptionDialogProps {
  companyId: string;
  companyName: string;
  subscription: CurrentCompanySubscription | null;
  open: boolean;
  onClose: () => void;
}

interface SubscriptionFormState {
  planId: string;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartDate: string;
  trialEndDate: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  nextBillingDate: string;
  agreedPrice: string;
  currencyCode: string;
  autoRenew: boolean;
  employeeLimitOverride: string;
  branchLimitOverride: string;
  userLimitOverride: string;
  storageLimitMbOverride: string;
  remarks: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialState(
  subscription: CurrentCompanySubscription | null,
): SubscriptionFormState {
  if (subscription) {
    return {
      planId: subscription.planId,
      subscriptionStatus: subscription.subscriptionStatus,
      billingCycle: subscription.billingCycle,
      trialStartDate: subscription.trialStartDate ?? "",
      trialEndDate: subscription.trialEndDate ?? "",
      subscriptionStartDate: subscription.subscriptionStartDate,
      subscriptionEndDate: subscription.subscriptionEndDate ?? "",
      nextBillingDate: subscription.nextBillingDate ?? "",
      agreedPrice: String(subscription.agreedPrice),
      currencyCode: subscription.currencyCode,
      autoRenew: subscription.autoRenew,
      employeeLimitOverride:
        subscription.employeeLimitOverride === null
          ? ""
          : String(subscription.employeeLimitOverride),
      branchLimitOverride:
        subscription.branchLimitOverride === null
          ? ""
          : String(subscription.branchLimitOverride),
      userLimitOverride:
        subscription.userLimitOverride === null
          ? ""
          : String(subscription.userLimitOverride),
      storageLimitMbOverride:
        subscription.storageLimitMbOverride === null
          ? ""
          : String(subscription.storageLimitMbOverride),
      remarks: "",
    };
  }

  return {
    planId: "",
    subscriptionStatus: "TRIAL",
    billingCycle: "MONTHLY",
    trialStartDate: today(),
    trialEndDate: "",
    subscriptionStartDate: today(),
    subscriptionEndDate: "",
    nextBillingDate: "",
    agreedPrice: "0",
    currencyCode: "PKR",
    autoRenew: false,
    employeeLimitOverride: "",
    branchLimitOverride: "",
    userLimitOverride: "",
    storageLimitMbOverride: "",
    remarks: "",
  };
}

function nullablePositiveNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableDate(value: string): string | null {
  return value.trim() || null;
}

export function SubscriptionDialog({
  companyId,
  companyName,
  subscription,
  open,
  onClose,
}: SubscriptionDialogProps) {
  const plansQuery = useSubscriptionPlans(open);
  const saveMutation = useSaveCompanySubscription(companyId);
  const [form, setForm] = useState<SubscriptionFormState>(() =>
    initialState(subscription),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialState(subscription));
      setFormError(null);
    }
  }, [open, subscription]);

  const selectedPlan = useMemo(
    () =>
      plansQuery.data?.plans.find(
        (plan) => plan.planId === form.planId,
      ) ?? null,
    [form.planId, plansQuery.data?.plans],
  );

  if (!open) {
    return null;
  }

  function update<K extends keyof SubscriptionFormState>(
    key: K,
    value: SubscriptionFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectPlan(planId: string): void {
    const plan = plansQuery.data?.plans.find(
      (item) => item.planId === planId,
    );

    setForm((current) => ({
      ...current,
      planId,
      ...(plan
        ? {
            currencyCode: plan.currencyCode,
            agreedPrice: String(
              current.billingCycle === "ANNUAL"
                ? plan.annualPrice
                : current.billingCycle === "MONTHLY"
                  ? plan.monthlyPrice
                  : current.agreedPrice,
            ),
          }
        : {}),
    }));
  }

  function selectBillingCycle(cycle: BillingCycle): void {
    setForm((current) => ({
      ...current,
      billingCycle: cycle,
      ...(selectedPlan && cycle !== "CUSTOM"
        ? {
            agreedPrice: String(
              cycle === "ANNUAL"
                ? selectedPlan.annualPrice
                : selectedPlan.monthlyPrice,
            ),
          }
        : {}),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    if (!form.planId) {
      setFormError("Select a subscription plan.");
      return;
    }

    if (!form.subscriptionStartDate) {
      setFormError("Subscription start date is required.");
      return;
    }

    if (
      form.subscriptionEndDate &&
      form.subscriptionEndDate < form.subscriptionStartDate
    ) {
      setFormError("Subscription end date cannot be before the start date.");
      return;
    }

    if (
      form.trialStartDate &&
      form.trialEndDate &&
      form.trialEndDate < form.trialStartDate
    ) {
      setFormError("Trial end date cannot be before the trial start date.");
      return;
    }

    const input: CompanySubscriptionInput = {
      planId: form.planId,
      subscriptionStatus: form.subscriptionStatus,
      billingCycle: form.billingCycle,
      trialStartDate: nullableDate(form.trialStartDate),
      trialEndDate: nullableDate(form.trialEndDate),
      subscriptionStartDate: form.subscriptionStartDate,
      subscriptionEndDate: nullableDate(form.subscriptionEndDate),
      nextBillingDate: nullableDate(form.nextBillingDate),
      agreedPrice: Number(form.agreedPrice || 0),
      currencyCode: form.currencyCode.trim().toUpperCase(),
      autoRenew: form.autoRenew,
      employeeLimitOverride: nullablePositiveNumber(
        form.employeeLimitOverride,
      ),
      branchLimitOverride: nullablePositiveNumber(
        form.branchLimitOverride,
      ),
      userLimitOverride: nullablePositiveNumber(
        form.userLimitOverride,
      ),
      storageLimitMbOverride: nullablePositiveNumber(
        form.storageLimitMbOverride,
      ),
      remarks: form.remarks.trim() || null,
    };

    try {
      await saveMutation.mutateAsync({
        input,
        exists: Boolean(subscription),
      });
      toast.success(
        subscription
          ? "Subscription updated successfully"
          : "Subscription assigned successfully",
      );
      onClose();
    } catch (error) {
      setFormError(normalizeApiError(error).message);
    }
  }

  return (
    <div className="org-modal-layer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="org-modal-backdrop"
        onClick={onClose}
        aria-label="Close subscription dialog"
      />

      <form className="org-setup-dialog org-setup-dialog--wide" onSubmit={submit}>
        <header className="org-setup-dialog__header">
          <div>
            <span className="org-setup-dialog__kicker">
              {subscription ? "Subscription management" : "Tenant activation"}
            </span>
            <h2>
              {subscription ? "Update subscription" : "Assign subscription"}
            </h2>
            <p>{companyName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>

        <div className="org-setup-dialog__body">
          {formError ? (
            <div className="org-inline-alert org-inline-alert--error">
              {formError}
            </div>
          ) : null}

          <section className="org-setup-section">
            <header>
              <CreditCard size={17} />
              <div>
                <h3>Plan and commercial terms</h3>
                <p>Select the purchased plan and billing arrangement.</p>
              </div>
            </header>

            <div className="org-setup-grid org-setup-grid--three">
              <label className="org-setup-field org-setup-field--wide">
                <span>Subscription plan *</span>
                <select
                  value={form.planId}
                  onChange={(event) => selectPlan(event.target.value)}
                  disabled={plansQuery.isLoading}
                >
                  <option value="">
                    {plansQuery.isLoading ? "Loading plans…" : "Select a plan"}
                  </option>
                  {plansQuery.data?.plans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {plan.planName} ({plan.planCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="org-setup-field">
                <span>Status</span>
                <select
                  value={form.subscriptionStatus}
                  onChange={(event) =>
                    update(
                      "subscriptionStatus",
                      event.target.value as SubscriptionStatus,
                    )
                  }
                >
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              <label className="org-setup-field">
                <span>Billing cycle</span>
                <select
                  value={form.billingCycle}
                  onChange={(event) =>
                    selectBillingCycle(event.target.value as BillingCycle)
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>

              <label className="org-setup-field">
                <span>Agreed price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.agreedPrice}
                  onChange={(event) => update("agreedPrice", event.target.value)}
                />
              </label>

              <label className="org-setup-field">
                <span>Currency</span>
                <input
                  maxLength={3}
                  value={form.currencyCode}
                  onChange={(event) => update("currencyCode", event.target.value)}
                />
              </label>

              <label className="org-check-field">
                <input
                  type="checkbox"
                  checked={form.autoRenew}
                  onChange={(event) => update("autoRenew", event.target.checked)}
                />
                <span>
                  <strong>Automatic renewal</strong>
                  <small>Renew this subscription at the next billing date.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="org-setup-section">
            <header>
              <CalendarDays size={17} />
              <div>
                <h3>Subscription dates</h3>
                <p>Set trial, service and billing dates.</p>
              </div>
            </header>

            <div className="org-setup-grid org-setup-grid--three">
              <label className="org-setup-field">
                <span>Subscription starts *</span>
                <input
                  type="date"
                  value={form.subscriptionStartDate}
                  onChange={(event) =>
                    update("subscriptionStartDate", event.target.value)
                  }
                />
              </label>

              <label className="org-setup-field">
                <span>Subscription ends</span>
                <input
                  type="date"
                  value={form.subscriptionEndDate}
                  onChange={(event) =>
                    update("subscriptionEndDate", event.target.value)
                  }
                />
              </label>

              <label className="org-setup-field">
                <span>Next billing date</span>
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={(event) =>
                    update("nextBillingDate", event.target.value)
                  }
                />
              </label>

              <label className="org-setup-field">
                <span>Trial starts</span>
                <input
                  type="date"
                  value={form.trialStartDate}
                  onChange={(event) => update("trialStartDate", event.target.value)}
                />
              </label>

              <label className="org-setup-field">
                <span>Trial ends</span>
                <input
                  type="date"
                  value={form.trialEndDate}
                  onChange={(event) => update("trialEndDate", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="org-setup-section">
            <header>
              <Settings2 size={17} />
              <div>
                <h3>Custom quota overrides</h3>
                <p>Leave empty to inherit the selected plan's allowance.</p>
              </div>
            </header>

            <div className="org-setup-grid org-setup-grid--four">
              <label className="org-setup-field">
                <span>Employees</span>
                <input
                  type="number"
                  min="1"
                  value={form.employeeLimitOverride}
                  onChange={(event) =>
                    update("employeeLimitOverride", event.target.value)
                  }
                  placeholder="Plan default"
                />
              </label>

              <label className="org-setup-field">
                <span>Users</span>
                <input
                  type="number"
                  min="1"
                  value={form.userLimitOverride}
                  onChange={(event) =>
                    update("userLimitOverride", event.target.value)
                  }
                  placeholder="Plan default"
                />
              </label>

              <label className="org-setup-field">
                <span>Branches</span>
                <input
                  type="number"
                  min="1"
                  value={form.branchLimitOverride}
                  onChange={(event) =>
                    update("branchLimitOverride", event.target.value)
                  }
                  placeholder="Plan default"
                />
              </label>

              <label className="org-setup-field">
                <span>Storage (MB)</span>
                <input
                  type="number"
                  min="1"
                  value={form.storageLimitMbOverride}
                  onChange={(event) =>
                    update("storageLimitMbOverride", event.target.value)
                  }
                  placeholder="Plan default"
                />
              </label>

              <label className="org-setup-field org-setup-field--full">
                <span>Internal remarks</span>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(event) => update("remarks", event.target.value)}
                  placeholder="Commercial notes visible to platform administrators"
                />
              </label>
            </div>
          </section>
        </div>

        <footer className="org-setup-dialog__footer">
          <span>
            {selectedPlan
              ? `${selectedPlan.featureCount} configured features · ${selectedPlan.planCode}`
              : "Select a plan to continue"}
          </span>
          <div>
            <button
              type="button"
              className="org-secondary-action"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="org-primary-action"
              disabled={saveMutation.isPending || plansQuery.isLoading}
            >
              {saveMutation.isPending ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {subscription ? "Save changes" : "Assign subscription"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

import { Building2, Check, Pencil, UsersRound, X } from "lucide-react";

import type { SubscriptionPlan } from "../types/subscription-plan.types";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-GB")}`;
  }
}

function limit(value: number | null) {
  return value === null ? "Unlimited" : value.toLocaleString("en-GB");
}

interface Props {
  plans: SubscriptionPlan[];
  onEdit: (plan: SubscriptionPlan) => void;
  onCreate: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function SubscriptionPlanCards({ plans, onEdit, onCreate, hasFilters, onClearFilters }: Props) {
  if (!plans.length) {
    return (
      <div className="emp-state-panel subscription-plan-empty">
        <span className="emp-state-panel__icon"><Building2 size={27} /></span>
        <h2>{hasFilters ? "No matching subscription plans" : "No subscription plans yet"}</h2>
        <p>{hasFilters ? "Try another search or clear the current filters." : "Create a plan to make it available when assigning a subscription to a company."}</p>
        {hasFilters ? (
          <button type="button" className="emp-secondary-action" onClick={onClearFilters}>Clear filters</button>
        ) : (
          <button type="button" className="emp-primary-action" onClick={onCreate}>Create first plan</button>
        )}
      </div>
    );
  }

  return (
    <div className="subscription-plan-grid">
      {plans.map((plan) => (
        <article className="subscription-plan-card" key={plan.planId}>
          <header className="subscription-plan-card__header">
            <div>
              <span className="subscription-plan-card__code">{plan.planCode}</span>
              <h2>{plan.planName}</h2>
            </div>
            <button type="button" className="subscription-plan-card__edit" onClick={() => onEdit(plan)} aria-label={`Edit ${plan.planName}`} title="Edit plan">
              <Pencil size={15} />
            </button>
          </header>

          {plan.description ? <p className="subscription-plan-card__description">{plan.description}</p> : null}

          <div className="subscription-plan-card__prices">
            <div><span>Monthly</span><strong>{money(plan.monthlyPrice, plan.currencyCode)}</strong></div>
            <div><span>Annual</span><strong>{money(plan.annualPrice, plan.currencyCode)}</strong></div>
          </div>

          <div className="subscription-plan-card__limits">
            <div><UsersRound size={15} /><span>Employees</span><strong>{limit(plan.maximumEmployees)}</strong></div>
            <div><UsersRound size={15} /><span>Users</span><strong>{limit(plan.maximumUsers)}</strong></div>
            <div><Building2 size={15} /><span>Branches</span><strong>{limit(plan.maximumBranches)}</strong></div>
            <div><span className="subscription-plan-card__storage-icon">MB</span><span>Storage</span><strong>{limit(plan.storageLimitMb)} MB</strong></div>
          </div>

          <footer className="subscription-plan-card__footer">
            <span className={`subscription-admin__status ${plan.isActive ? "is-active" : "is-inactive"}`}>
              {plan.isActive ? <Check size={13} /> : <X size={13} />}{plan.isActive ? "Active" : "Inactive"}
            </span>
            <span className="subscription-plan-card__features">{plan.featureCount} features · {plan.trialDays} trial days</span>
          </footer>
        </article>
      ))}
    </div>
  );
}

import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  Database,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useState } from "react";

import { normalizeApiError } from "../../../api/api-error";
import {
  useCompanySubscription,
  useCompanyUsage,
} from "../hooks/useCompanySubscription";
import { SubscriptionDialog } from "./SubscriptionDialog";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { UsageMeter } from "./UsageMeter";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString("en-GB")}`;
  }
}

function formatStorage(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function CompanySubscriptionTab({
  companyId,
  companyName,
  canManage,
}: {
  companyId: string;
  companyName: string;
  canManage: boolean;
}) {
  const subscriptionQuery = useCompanySubscription(companyId);
  const usageQuery = useCompanyUsage(companyId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (subscriptionQuery.isLoading || usageQuery.isLoading) {
    return (
      <div className="org-tab-loading">
        <LoaderCircle className="spin" size={24} />
        <span>Loading subscription and usage…</span>
      </div>
    );
  }

  if (
    subscriptionQuery.isError ||
    usageQuery.isError ||
    subscriptionQuery.data === undefined ||
    usageQuery.data === undefined
  ) {
    const error = normalizeApiError(
      subscriptionQuery.error ?? usageQuery.error,
    );

    return (
      <div className="org-tab-error">
        <AlertTriangle size={24} />
        <div>
          <h3>Subscription information could not be loaded</h3>
          <p>{error.message}</p>
          <button
            type="button"
            className="org-secondary-action"
            onClick={() => {
              void subscriptionQuery.refetch();
              void usageQuery.refetch();
            }}
          >
            <RefreshCw className={subscriptionQuery.isFetching || usageQuery.isFetching ? "spin" : ""} size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const subscription = subscriptionQuery.data;
  const usage = usageQuery.data;

  if (!subscription) {
    return (
      <>
        <section className="org-onboarding-state">
          <span className="org-onboarding-state__icon">
            <CreditCard size={28} />
          </span>
          <span className="org-onboarding-state__status">Setup incomplete</span>
          <h3>Assign a subscription to activate this tenant</h3>
          <p>
            A current Trial or Active subscription is required before a Company
            Administrator, employees, users or branches can be created.
          </p>
          {canManage ? (
            <button
              type="button"
              className="org-primary-action"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={16} /> Assign subscription
            </button>
          ) : (
            <div className="org-inline-alert">
              A Platform Administrator must complete this setup.
            </div>
          )}
        </section>

        <SubscriptionDialog
          companyId={companyId}
          companyName={companyName}
          subscription={null}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="org-subscription-layout">
        <section className="org-subscription-summary">
          <div className="org-subscription-summary__heading">
            <div>
              <span className="org-section-kicker">Current subscription</span>
              <h3>{subscription.planName}</h3>
              <p>{subscription.planCode}</p>
            </div>
            <SubscriptionStatusBadge status={subscription.subscriptionStatus} />
          </div>

          <div className="org-subscription-facts">
            <div>
              <span><CalendarClock size={15} /></span>
              <small>Service period</small>
              <strong>
                {formatDate(subscription.subscriptionStartDate)} – {formatDate(subscription.subscriptionEndDate)}
              </strong>
            </div>
            <div>
              <span><CreditCard size={15} /></span>
              <small>{subscription.billingCycle.toLowerCase()} price</small>
              <strong>{formatMoney(subscription.agreedPrice, subscription.currencyCode)}</strong>
            </div>
            <div>
              <span><RefreshCw size={15} /></span>
              <small>Renewal</small>
              <strong>{subscription.autoRenew ? "Automatic" : "Manual"}</strong>
            </div>
            <div>
              <span><CalendarClock size={15} /></span>
              <small>Next billing</small>
              <strong>{formatDate(subscription.nextBillingDate)}</strong>
            </div>
          </div>

          {subscription.subscriptionStatus === "TRIAL" ? (
            <div className="org-trial-callout">
              <CalendarClock size={17} />
              <div>
                <strong>Trial period</strong>
                <span>
                  {formatDate(subscription.trialStartDate)} – {formatDate(subscription.trialEndDate)}
                </span>
              </div>
            </div>
          ) : null}

          {canManage ? (
            <button
              type="button"
              className="org-secondary-action org-subscription-edit"
              onClick={() => setDialogOpen(true)}
            >
              <Pencil size={15} /> Edit subscription
            </button>
          ) : null}
        </section>

        <section className="org-information-card org-information-card--wide">
          <header>
            <Database size={18} />
            <div>
              <h3>Purchased capacity</h3>
              <p>Current active usage against the company's effective allowances.</p>
            </div>
          </header>

          <div className="org-usage-grid">
            <UsageMeter
              icon={<Users size={17} />}
              label="Active employees"
              used={usage.usage.activeEmployees}
              limit={usage.limits.employees}
              helper="Employee records consuming plan seats"
            />
            <UsageMeter
              icon={<Users size={17} />}
              label="Active user accounts"
              used={usage.usage.activeUsers}
              limit={usage.limits.users}
              helper="Login accounts for administrators and employees"
            />
            <UsageMeter
              icon={<Building2 size={17} />}
              label="Active branches"
              used={usage.usage.activeBranches}
              limit={usage.limits.branches}
              helper="Operational branches under this tenant"
            />
            <UsageMeter
              icon={<Database size={17} />}
              label="File storage"
              used={Math.round(usage.usage.fileStorageBytes / (1024 * 1024))}
              limit={usage.limits.storageMb}
              helper={`${formatStorage(usage.usage.fileStorageBytes)} currently stored`}
            />
          </div>
        </section>
      </div>

      <SubscriptionDialog
        companyId={companyId}
        companyName={companyName}
        subscription={subscription}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

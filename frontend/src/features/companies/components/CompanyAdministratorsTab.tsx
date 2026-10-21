import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { normalizeApiError } from "../../../api/api-error";
import {
  useCompanyAdministrators,
  useCompanySubscription,
  useCompanyUsage,
} from "../hooks/useCompanySubscription";
import { ProvisionCompanyAdminDialog } from "./ProvisionCompanyAdminDialog";

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CompanyAdministratorsTab({
  companyId,
  companyName,
  canProvision,
}: {
  companyId: string;
  companyName: string;
  canProvision: boolean;
}) {
  const administratorsQuery = useCompanyAdministrators(companyId);
  const subscriptionQuery = useCompanySubscription(companyId);
  const usageQuery = useCompanyUsage(companyId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (
    administratorsQuery.isLoading ||
    subscriptionQuery.isLoading ||
    usageQuery.isLoading
  ) {
    return (
      <div className="org-tab-loading">
        <LoaderCircle className="spin" size={24} />
        <span>Loading company administrators…</span>
      </div>
    );
  }

  if (
    administratorsQuery.isError ||
    subscriptionQuery.isError ||
    usageQuery.isError ||
    administratorsQuery.data === undefined ||
    subscriptionQuery.data === undefined ||
    usageQuery.data === undefined
  ) {
    const error = normalizeApiError(
      administratorsQuery.error ?? subscriptionQuery.error ?? usageQuery.error,
    );

    return (
      <div className="org-tab-error">
        <AlertTriangle size={24} />
        <div>
          <h3>Administrator accounts could not be loaded</h3>
          <p>{error.message}</p>
          <button
            type="button"
            className="org-secondary-action"
            onClick={() => {
              void administratorsQuery.refetch();
              void subscriptionQuery.refetch();
              void usageQuery.refetch();
            }}
          >
            <RefreshCw className={administratorsQuery.isFetching || subscriptionQuery.isFetching || usageQuery.isFetching ? "spin" : ""} size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const administrators = administratorsQuery.data.administrators;
  const subscription = subscriptionQuery.data;
  const usage = usageQuery.data;
  const subscriptionAllowsProvisioning =
    subscription?.subscriptionStatus === "ACTIVE" ||
    subscription?.subscriptionStatus === "TRIAL";
  const userLimitReached =
    usage.limits.users !== null &&
    usage.usage.activeUsers >= usage.limits.users;
  const canOpenProvisionDialog =
    canProvision && Boolean(subscription) && subscriptionAllowsProvisioning && !userLimitReached;

  let provisionReason: string | null = null;
  if (!subscription) {
    provisionReason = "Assign a subscription before provisioning an administrator.";
  } else if (!subscriptionAllowsProvisioning) {
    provisionReason = "The subscription must be Active or Trial.";
  } else if (userLimitReached) {
    provisionReason = "The purchased user-account limit has been reached.";
  }

  return (
    <>
      <div className="org-admin-workspace">
        <header className="org-admin-toolbar">
          <div>
            <span className="org-admin-toolbar__icon"><ShieldCheck size={21} /></span>
            <div>
              <span className="org-section-kicker">Tenant access</span>
              <h3>Company Administrators</h3>
              <p>
                Customer-owned administrator accounts scoped exclusively to this
                organisation.
              </p>
            </div>
          </div>

          {canProvision ? (
            <button
              type="button"
              className="org-primary-action"
              disabled={!canOpenProvisionDialog}
              title={provisionReason ?? undefined}
              onClick={() => setDialogOpen(true)}
            >
              <UserPlus size={16} /> Provision administrator
            </button>
          ) : null}
        </header>

        {provisionReason && canProvision ? (
          <div className="org-inline-alert org-inline-alert--warning">
            <AlertTriangle size={15} /> {provisionReason}
          </div>
        ) : null}

        <div className="org-admin-capacity">
          <div>
            <Users size={16} />
            <span>Active user accounts</span>
            <strong>
              {usage.usage.activeUsers.toLocaleString("en-GB")}
              {usage.limits.users === null
                ? " / Unlimited"
                : ` / ${usage.limits.users.toLocaleString("en-GB")}`}
            </strong>
          </div>
          <div>
            <ShieldCheck size={16} />
            <span>Company Administrators</span>
            <strong>{administrators.length.toLocaleString("en-GB")}</strong>
          </div>
        </div>

        {administrators.length === 0 ? (
          <section className="org-onboarding-state org-onboarding-state--compact">
            <span className="org-onboarding-state__icon"><UserPlus size={26} /></span>
            <h3>No Company Administrator has been provisioned</h3>
            <p>
              Create the first customer account so the organisation can configure
              its structure and manage employees within the purchased limits.
            </p>
            {canOpenProvisionDialog ? (
              <button
                type="button"
                className="org-primary-action"
                onClick={() => setDialogOpen(true)}
              >
                <UserPlus size={16} /> Create first administrator
              </button>
            ) : null}
          </section>
        ) : (
          <div className="org-admin-list">
            {administrators.map((administrator) => (
              <article className="org-admin-card" key={administrator.userId}>
                <span className="org-admin-avatar">
                  {administrator.username.slice(0, 2).toUpperCase()}
                </span>

                <div className="org-admin-card__identity">
                  <div>
                    <strong>{administrator.username}</strong>
                    <span className="org-admin-role">{administrator.roleName}</span>
                  </div>
                  <small>
                    <Mail size={13} /> {administrator.email || "No email address"}
                  </small>
                </div>

                <div className="org-admin-card__states">
                  <span className={administrator.isActive ? "is-positive" : "is-negative"}>
                    {administrator.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {administrator.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className={administrator.isEmailVerified ? "is-positive" : ""}>
                    <Mail size={13} />
                    {administrator.isEmailVerified ? "Verified" : "Unverified"}
                  </span>
                  {administrator.mustChangePassword ? (
                    <span className="is-warning"><KeyRound size={13} /> Password change required</span>
                  ) : null}
                </div>

                <div className="org-admin-card__activity">
                  <span><Clock3 size={13} /> Last login</span>
                  <strong>{formatDate(administrator.lastLoginAt)}</strong>
                  <small>Provisioned {formatDate(administrator.assignedAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ProvisionCompanyAdminDialog
        companyId={companyId}
        companyName={companyName}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

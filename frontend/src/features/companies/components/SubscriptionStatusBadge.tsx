import type { SubscriptionStatus } from "../types/company-subscription.types";

const statusLabels: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  return (
    <span
      className={`org-subscription-status org-subscription-status--${status.toLowerCase()}`}
    >
      <span />
      {statusLabels[status]}
    </span>
  );
}

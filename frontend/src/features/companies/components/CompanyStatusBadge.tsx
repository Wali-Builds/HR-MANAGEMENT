// edited by wali: Show a dedicated badge for soft-deleted company records.
interface CompanyStatusBadgeProps {
  isActive: boolean;
  isDeleted?: boolean;
}

export function CompanyStatusBadge({
  isActive,
  isDeleted = false,
}: CompanyStatusBadgeProps) {
  const label = isDeleted ? "Deleted" : isActive ? "Active" : "Inactive";

  return (
    <span
      className={`company-status company-status--${isDeleted ? "deleted" : isActive ? "active" : "inactive"}`}
    >
      <span />
      {label}
    </span>
  );
}

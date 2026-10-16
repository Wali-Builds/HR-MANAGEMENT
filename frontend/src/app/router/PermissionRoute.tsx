import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../../app/store/auth.store";
import { usePermissions } from "../../hooks/usePermissions";

interface PermissionRouteProps {
  permissions: string[];
  requireAll?: boolean;
  // edited by wali: Allow the explicitly designated company administrator role.
  allowRoleCodes?: string[];
}

export function PermissionRoute({
  permissions,
  requireAll = false,
  allowRoleCodes = [],
}: PermissionRouteProps) {
  const user = useAuthStore((state) => state.user);
  const {
    hasAnyPermission,
    hasAllPermissions,
  } = usePermissions();

  // edited by wali: Let the tenant's COMPANY_ADMIN role access its subscription page.
  const hasAllowedRole = allowRoleCodes.some((roleCode) =>
    user?.roleCodes.includes(roleCode),
  );

  // added by wali: A custom role such as HR_MAN can receive
  // COMPANY_ADMIN permission without having COMPANY_ADMIN as its role code.
  const hasCompanyAdminPermission =
    user?.permissions?.some(
      (permission) => permission.toUpperCase() === "COMPANY_ADMIN",
    ) ?? false;

  const isAllowed =
    hasAllowedRole ||
    // added by wali: Allow Company Admin-level access through
    // the COMPANY_ADMIN permission, even when the role code is custom.
    hasCompanyAdminPermission ||
    permissions.length === 0 ||
    (requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions));

  return isAllowed ? (
    <Outlet />
  ) : (
    <Navigate to="/unauthorized" replace />
  );
}
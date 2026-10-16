import { useMemo } from "react";

import { useAuthStore } from "../../app/store/auth.store";
import { usePermissions } from "../../hooks/usePermissions";
import { workspaceModules } from "../config/workspace";

export function useVisibleModules() {
  const user = useAuthStore((state) => state.user);
  const { hasAnyPermission, isPlatformAdmin } = usePermissions();

  return useMemo(
    () =>
      workspaceModules.filter((module) => {
        // edited by wali: Hide Leave setup from employees and Platform Admins.
        if (module.companyAdminOnly) {
          return Boolean(
            !isPlatformAdmin &&
              user?.companyId &&
              (user.roleCodes.includes("COMPANY_ADMIN") ||
                user.permissions.some((permission) => permission.toUpperCase() === "COMPANY_ADMIN")),
          );
        }
        // edited by wali: Hide admin-only subscription management from non-admin app switchers.
        if (module.platformAdminOnly) {
          return isPlatformAdmin;
        }

        // edited by wali: Company subscription choices are only for a linked tenant account.
        if (module.companyTenantOnly) {
          return (
            !isPlatformAdmin &&
            Boolean(user?.companyId) &&
            (user?.roleCodes.includes("COMPANY_ADMIN") ||
              !module.permissions ||
              hasAnyPermission(module.permissions))
          );
        }

        // edited by wali: Keep the personal profile shortcut limited to accounts linked to employees.
        if (module.employeeOnly && !user?.employeeId) {
          return false;
        }

        if (!module.available) {
          return true;
        }

        if (module.id === "home") {
          return true;
        }

        if (isPlatformAdmin) {
          return true;
        }

        if (module.employeeOnly && user?.employeeId) {
          return true;
        }

        if (!module.permissions || module.permissions.length === 0) {
          return true;
        }

        return hasAnyPermission(module.permissions);
      }),
    [hasAnyPermission, isPlatformAdmin, user, user?.companyId, user?.employeeId],
  );
}

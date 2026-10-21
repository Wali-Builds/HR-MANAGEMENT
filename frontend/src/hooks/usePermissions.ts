import { useMemo } from "react";

import { useAuthStore } from "../app/store/auth.store";

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const permissionSet = new Set(
      user?.permissions ?? [],
    );

    // edited by wali: Give the Branch Admin marker only its agreed branch-scoped capabilities.
    const branchAdminPermissions = new Set([
      "branch.view",
      "department.view",
      "department.manage",
      "designation.view",
      "designation.manage",
      "position.view",
      "position.manage",
      "employee.view_all",
      "employee.view_self",
      "employee.create",
      "employee.update",
      "leave.period.view",
      "leave.request.view",
      "leave.request.approve",
      "leave.balance.view",
      "leave.balance.initialize",
    ]);
    const isBranchAdmin = Boolean(
      user?.companyId &&
      permissionSet.has("BRANCH_ADMIN"),
    );

    // edited by wali: Restrict workforce structure setup to the linked Company Admin.
    const isCompanyAdminOnlyPermission = (permission: string): boolean =>
      permission.startsWith("employee.") ||
      permission === "roles.manage" ||
      permission === "users.manage" ||
      permission === "branch.view" ||
      permission === "branch.manage" ||
      permission === "department.view" ||
      permission === "department.manage" ||
      permission === "designation.view" ||
      permission === "designation.manage" ||
      permission === "position.view" ||
      permission === "position.manage" ||
      permission.startsWith("payroll.");

    // edited by wali: Give linked Company Administrators workforce and employee access within their tenant.
    // added by wali: A custom role such as HR_MAN can also receive Company Admin
    // access through the COMPANY_ADMIN permission without using the COMPANY_ADMIN role code.
    const isTenantCompanyAdmin = Boolean(
      !user?.isPlatformAdmin &&
      user?.companyId &&
      (
        // edited by wali: Normalize role markers so casing from legacy role records cannot hide Company Admin access.
        user.roleCodes.some(
          (roleCode) => roleCode.trim().toUpperCase() === "COMPANY_ADMIN",
        ) ||
        user.permissions?.some(
          (permission) => permission.trim().toUpperCase() === "COMPANY_ADMIN",
        )
      ),
    );
    const isCompanyAdminPermission = (permission: string): boolean =>
      isTenantCompanyAdmin &&
      (permission.startsWith("employee.") ||
        permission === "roles.manage" ||
        permission === "users.manage" ||
        permission === "branch.view" ||
        permission === "branch.manage" ||
        permission === "department.view" ||
        permission === "department.manage" ||
        permission === "designation.view" ||
        permission === "designation.manage" ||
        permission === "position.view" ||
        permission === "position.manage" ||
        permission === "payroll.view" ||
        permission === "payroll.manage" ||
        permission === "payroll.approve");

    const hasPermission = (permission: string): boolean => {
      // edited by wali: Only linked Branch Admin accounts can open their own employee profile.
      if (
        isBranchAdmin &&
        branchAdminPermissions.has(permission) &&
        (permission !== "employee.view_self" || Boolean(user?.employeeId))
      ) {
        return true;
      }
      // edited by wali: Normal employees can view only their own profile.
      // The EMPLOYEE permission represents normal employee self-service access.
      if (
        permission === "employee.view_self" &&
        !user?.isPlatformAdmin &&
        Boolean(user?.employeeId) &&
        (
          permissionSet.has("employee.view_self") ||
          permissionSet.has("EMPLOYEE")
        )
      ) {
        return true;
      }

      // Platform administrators can access everything.
      if (user?.isPlatformAdmin) {
        return true;
      }

      // Company Admin-only permissions are restricted to
      // Company Administrators within their own tenant.
      if (isCompanyAdminOnlyPermission(permission)) {
        return isTenantCompanyAdmin;
      }

      return Boolean(
        permissionSet.has(permission) ||
        isCompanyAdminPermission(permission),
      );
    };

    const hasAnyPermission = (
      permissions: string[],
    ): boolean =>
      permissions.some((permission) => hasPermission(permission));

    const hasAllPermissions = (
      permissions: string[],
    ): boolean =>
      permissions.every((permission) => hasPermission(permission));

    return {
      permissions: user?.permissions ?? [],
      roleCodes: user?.roleCodes ?? [],
      isPlatformAdmin:
        user?.isPlatformAdmin ?? false,
      isBranchAdmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    };
  }, [user]);
}

import type {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from "express";

import { AppError } from "../errors/app-error.js";

import type {
  AuthContext
} from "../../modules/auth/auth.types.js";

function getAuthContext(
  response: Response
): AuthContext {
  const auth =
    response.locals.auth as
      | AuthContext
      | undefined;

  if (!auth) {
    throw new AppError({
      message: "Authentication is required",
      statusCode: 401,
      code: "AUTHENTICATION_REQUIRED"
    });
  }

  return auth;
}

function normalizePermission(
  permissionCode: string
): string {
  return permissionCode
    .trim()
    .toLowerCase();
}

function normalizeRole(
  roleCode: string
): string {
  return roleCode
    .trim()
    .toUpperCase();
}

// edited by wali: Grant linked Company Administrators employee and organisation permissions within their tenant.
const BRANCH_ADMIN_PERMISSIONS = new Set([
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
  "leave.balance.initialize"
]);

function hasEffectivePermission(
  auth: AuthContext,
  permissionCode: string,
  requestMethod = "GET"
): boolean {
  const normalizedPermission =
    normalizePermission(permissionCode);

  // edited by wali: EMPLOYEE represents normal employee self-service access.
  // It grants only employee.view_self, not employee.view_all/update/delete.
  const hasEmployeeSelfView =
    normalizedPermission === "employee.view_self" &&
    !auth.isPlatformAdmin &&
    auth.employeeId !== null &&
    auth.permissions.some(
      (permission) =>
        normalizePermission(permission) === "employee" ||
        normalizePermission(permission) === "employee.view_self"
    );

  if (hasEmployeeSelfView) {
    return true;
  }

  // edited by wali: Let a linked tenant Company Admin view their own employee profile even when the role grants only company_admin.
  const hasCompanyAdminSelfView =
    normalizedPermission === "employee.view_self" &&
    !auth.isPlatformAdmin &&
    auth.companyId !== null &&
    auth.employeeId !== null &&
    (auth.roleCodes.some(
      (roleCode) => normalizeRole(roleCode) === "COMPANY_ADMIN"
    ) || auth.permissions.some(
      (permission) => normalizePermission(permission) === "company_admin"
    ));

  if (hasCompanyAdminSelfView) {
    return true;
  }

  // edited by wali: Branch Admin grants agreed actions only when a role is assigned to a branch.
  const isBranchAdmin = Boolean(
    !auth.isPlatformAdmin &&
    auth.companyId &&
    auth.branchIds.length > 0 &&
    auth.permissions.some(
      (permission) => normalizePermission(permission) === "branch_admin"
    )
  );

  if (isBranchAdmin) {
    if (requestMethod.toUpperCase() === "DELETE") {
      return false;
    }

    // edited by wali: Branch Admin can view their own profile only when linked to an employee record.
    if (
      BRANCH_ADMIN_PERMISSIONS.has(normalizedPermission) &&
      (normalizedPermission !== "employee.view_self" || auth.employeeId !== null)
    ) {
      return true;
    }
  }

  // edited by wali: Restrict company workforce data and structure to the linked Company Admin.
  // edited by wali: Keep leave-policy permissions tenant-admin-only, like workforce setup.
  const isCompanyAdminOnlyPermission =
    normalizedPermission.startsWith("employee.") ||
    normalizedPermission === "roles.manage" ||
    normalizedPermission === "users.manage" ||
    normalizedPermission === "branch.view" ||
    normalizedPermission === "branch.manage" ||
    normalizedPermission === "department.view" ||
    normalizedPermission === "department.manage" ||
    normalizedPermission === "designation.view" ||
    normalizedPermission === "designation.manage" ||
    normalizedPermission === "position.view" ||
    normalizedPermission === "position.manage" ||
    normalizedPermission.startsWith("payroll.") ||
    // edited by wali: Grant company administrators access to their tenant leave periods.
    normalizedPermission.startsWith("leave.period.") ||
    normalizedPermission.startsWith("leave.policy.") ||
    // edited by wali: Allow tenant Company Admins to review and decide their company's leave requests.
    normalizedPermission === "leave.request.view" ||
    normalizedPermission === "leave.request.approve" ||
    // edited by wali: Keep employee leave-balance setup restricted to the tenant Company Admin.
    normalizedPermission === "leave.balance.view" ||
    normalizedPermission === "leave.balance.manage";

  if (isCompanyAdminOnlyPermission) {
    return Boolean(
      !auth.isPlatformAdmin &&
      auth.companyId &&
      (auth.roleCodes.some(
        (roleCode) => normalizeRole(roleCode) === "COMPANY_ADMIN"
      ) || auth.permissions.some(
        (permission) => normalizePermission(permission) === "company_admin"
      ))
    );
  }

  if (auth.isPlatformAdmin) {
    return true;
  }

  if (
    auth.permissions.some(
      (permission) =>
        normalizePermission(permission) === normalizedPermission
    )
  ) {
    return true;
  }

  const isTenantCompanyAdmin = Boolean(
    auth.companyId &&
    auth.roleCodes.some(
      (roleCode) =>
        normalizeRole(roleCode) === "COMPANY_ADMIN"
    )
  );

  return (
    isTenantCompanyAdmin &&
    (
      normalizedPermission.startsWith("employee.") ||
      normalizedPermission === "roles.manage" ||
      normalizedPermission === "users.manage" ||
      normalizedPermission === "branch.view" ||
      normalizedPermission === "branch.manage" ||
      normalizedPermission === "department.view" ||
      normalizedPermission === "department.manage" ||
      normalizedPermission === "designation.view" ||
      normalizedPermission === "designation.manage" ||
      normalizedPermission === "position.view" ||
      normalizedPermission === "position.manage" ||
      normalizedPermission === "payroll.view" ||
      normalizedPermission === "payroll.manage" ||
      normalizedPermission === "payroll.approve"
    )
  );
}

function rejectAccess(
  next: NextFunction,
  message: string,
  details?: Record<string, unknown>
): void {
  next(
    new AppError({
      message,
      statusCode: 403,
      code: "ACCESS_DENIED",
      details
    })
  );
}

export const requirePlatformAdmin:
RequestHandler = (
  _request: Request,
  response: Response,
  next: NextFunction
): void => {
  try {
    const auth =
      getAuthContext(response);

    if (!auth.isPlatformAdmin) {
      rejectAccess(
        next,
        "Platform Administrator access is required"
      );

      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(
  ...allowedRoleCodes: string[]
): RequestHandler {
  const normalizedAllowedRoles =
    allowedRoleCodes
      .map(normalizeRole)
      .filter(Boolean);

  if (
    normalizedAllowedRoles.length === 0
  ) {
    throw new Error(
      "At least one role code is required"
    );
  }

  return (
    request,
    response,
    next
  ): void => {
    try {
      const auth =
        getAuthContext(response);

      // Platform Administrator receives
      // unrestricted platform access.
      if (auth.isPlatformAdmin) {
        next();
        return;
      }

      const userRoles = new Set(
        auth.roleCodes.map(
          normalizeRole
        )
      );

      const hasAllowedRole =
        normalizedAllowedRoles.some(
          (roleCode) =>
            userRoles.has(roleCode)
        );

      if (!hasAllowedRole) {
        rejectAccess(
          next,
          "Your assigned role does not allow this action",
          {
            requiredRoles:
              normalizedAllowedRoles
          }
        );

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requirePermission(
  requiredPermissionCode: string
): RequestHandler {
  const requiredPermission =
    normalizePermission(
      requiredPermissionCode
    );

  if (!requiredPermission) {
    throw new Error(
      "Permission code is required"
    );
  }

  return (
    request,
    response,
    next
  ): void => {
    try {
      const auth =
        getAuthContext(response);

      if (!hasEffectivePermission(auth, requiredPermission, request.method)) {
        rejectAccess(
          next,
          "You do not have permission to perform this action",
          {
            requiredPermission
          }
        );

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAnyPermission(
  ...permissionCodes: string[]
): RequestHandler {
  const requiredPermissions =
    permissionCodes
      .map(normalizePermission)
      .filter(Boolean);

  if (
    requiredPermissions.length === 0
  ) {
    throw new Error(
      "At least one permission code is required"
    );
  }

  return (
    request,
    response,
    next
  ): void => {
    try {
      const auth =
        getAuthContext(response);

      const hasPermission =
        requiredPermissions.some(
          (permissionCode) =>
            hasEffectivePermission(auth, permissionCode, request.method)
        );

      if (!hasPermission) {
        rejectAccess(
          next,
          "You do not have any of the required permissions",
          {
            requiredAnyPermission:
              requiredPermissions
          }
        );

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAllPermissions(
  ...permissionCodes: string[]
): RequestHandler {
  const requiredPermissions =
    permissionCodes
      .map(normalizePermission)
      .filter(Boolean);

  if (
    requiredPermissions.length === 0
  ) {
    throw new Error(
      "At least one permission code is required"
    );
  }

  return (
    request,
    response,
    next
  ): void => {
    try {
      const auth =
        getAuthContext(response);

      const missingPermissions =
        requiredPermissions.filter(
          (permissionCode) =>
            !hasEffectivePermission(auth, permissionCode, request.method)
        );

      if (
        missingPermissions.length > 0
      ) {
        rejectAccess(
          next,
          "You do not have all required permissions",
          {
            requiredPermissions,
            missingPermissions
          }
        );

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

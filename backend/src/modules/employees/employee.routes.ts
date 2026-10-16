import {
  Router,
  type RequestHandler
} from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  requireAnyPermission,
  requirePermission
} from "../../common/middleware/authorization.middleware.js";

import {
  requireCompletedPasswordChange
} from "../../common/middleware/password-change.middleware.js";

import {
  validateRequest
} from "../../common/middleware/validate.middleware.js";

import {
  asyncHandler
} from "../../common/utils/async-handler.js";

import {
  createEmployeeController,
  deleteEmployeeController,
  getEmployeeController,
  getMyEmployeeProfileController,
  getEmployeeLookupsController,
  listEmployeesController,
  updateEmployeeController
} from "./employee.controller.js";

import {
  createEmployeeRequestSchema,
  deleteEmployeeRequestSchema,
  employeeLookupsRequestSchema,
  getEmployeeRequestSchema,
  listEmployeesRequestSchema,
  updateEmployeeRequestSchema
} from "./employee.schema.js";

export const employeeRouter =
  Router();

// edited by wali: Allow linked Company Administrators to manage employees only in their own tenant.
function requireCompanyAdminOrEmployeePermission(
  ...permissions: string[]
): RequestHandler {
  const permissionGuard = permissions.length === 1
    ? requirePermission(permissions[0]!)
    : requireAnyPermission(...permissions);

  return (request, response, next) => {
    const auth = response.locals.auth as
      | { companyId?: string | null; roleCodes?: string[]; isPlatformAdmin?: boolean }
      | undefined;

    if (
      !auth?.isPlatformAdmin &&
      auth?.companyId &&
      auth.roleCodes?.includes("COMPANY_ADMIN")
    ) {
      next();
      return;
    }

    permissionGuard(request, response, next);
  };
}

employeeRouter.get(
  "/lookups",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission(
    "employee.view_all",
    "employee.create",
    "employee.update"
  ),
  validateRequest(
    employeeLookupsRequestSchema
  ),
  asyncHandler(
    getEmployeeLookupsController
  )
);

employeeRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission(
    "employee.view_all"
  ),
  validateRequest(
    listEmployeesRequestSchema
  ),
  asyncHandler(
    listEmployeesController
  )
);

employeeRouter.get(
  "/me",
  authenticate,
  requireCompletedPasswordChange,
  requirePermission("employee.view_self"),
  asyncHandler(getMyEmployeeProfileController)
);

employeeRouter.get(
  "/:employeeId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission("employee.view_all"),
  validateRequest(
    getEmployeeRequestSchema
  ),
  asyncHandler(
    getEmployeeController
  )
);

employeeRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission(
    "employee.create"
  ),
  validateRequest(
    createEmployeeRequestSchema
  ),
  asyncHandler(
    createEmployeeController
  )
);

employeeRouter.patch(
  "/:employeeId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeRequestSchema
  ),
  asyncHandler(
    updateEmployeeController
  )
);

employeeRouter.delete(
  "/:employeeId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeePermission(
    "employee.delete"
  ),
  validateRequest(
    deleteEmployeeRequestSchema
  ),
  asyncHandler(
    deleteEmployeeController
  )
);

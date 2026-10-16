import {
  Router,
  type RequestHandler
} from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
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
  createDepartmentController,
  deleteDepartmentController,
  getDepartmentController,
  listDepartmentsController,
  updateDepartmentController
} from "./department.controller.js";

import {
  createDepartmentRequestSchema,
  deleteDepartmentRequestSchema,
  getDepartmentRequestSchema,
  listDepartmentsRequestSchema,
  updateDepartmentRequestSchema
} from "./department.schema.js";

export const departmentRouter =
  Router();

// edited by wali: Allow a linked Company Administrator to manage departments within their tenant.
function requireDepartmentPermission(
  permission: "department.view" | "department.manage"
): RequestHandler {
  const permissionGuard = requirePermission(permission);

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

departmentRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireDepartmentPermission(
    "department.view"
  ),
  validateRequest(
    listDepartmentsRequestSchema
  ),
  asyncHandler(
    listDepartmentsController
  )
);

departmentRouter.get(
  "/:departmentId",
  authenticate,
  requireCompletedPasswordChange,
  requireDepartmentPermission(
    "department.view"
  ),
  validateRequest(
    getDepartmentRequestSchema
  ),
  asyncHandler(
    getDepartmentController
  )
);

departmentRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireDepartmentPermission(
    "department.manage"
  ),
  validateRequest(
    createDepartmentRequestSchema
  ),
  asyncHandler(
    createDepartmentController
  )
);

departmentRouter.patch(
  "/:departmentId",
  authenticate,
  requireCompletedPasswordChange,
  requireDepartmentPermission(
    "department.manage"
  ),
  validateRequest(
    updateDepartmentRequestSchema
  ),
  asyncHandler(
    updateDepartmentController
  )
);

departmentRouter.delete(
  "/:departmentId",
  authenticate,
  requireCompletedPasswordChange,
  requireDepartmentPermission(
    "department.manage"
  ),
  validateRequest(
    deleteDepartmentRequestSchema
  ),
  asyncHandler(
    deleteDepartmentController
  )
);

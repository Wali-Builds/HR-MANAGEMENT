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
  createDesignationController,
  deleteDesignationController,
  getDesignationController,
  listDesignationsController,
  updateDesignationController
} from "./designation.controller.js";

import {
  createDesignationRequestSchema,
  deleteDesignationRequestSchema,
  getDesignationRequestSchema,
  listDesignationsRequestSchema,
  updateDesignationRequestSchema
} from "./designation.schema.js";

export const designationRouter =
  Router();

// edited by wali: Let linked Company Administrators manage designations within their company.
function requireCompanyAdminOrDesignationPermission(
  permission: "designation.view" | "designation.manage"
): RequestHandler {
  const permissionGuard = requirePermission(permission);

  return (request, response, next) => {
    const auth = response.locals.auth as
      | { companyId?: string | null; roleCodes?: string[]; isPlatformAdmin?: boolean }
      | undefined;

    if (!auth?.isPlatformAdmin && auth?.companyId && auth.roleCodes?.includes("COMPANY_ADMIN")) {
      next();
      return;
    }

    permissionGuard(request, response, next);
  };
}

designationRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrDesignationPermission(
    "designation.view"
  ),
  validateRequest(
    listDesignationsRequestSchema
  ),
  asyncHandler(
    listDesignationsController
  )
);

designationRouter.get(
  "/:designationId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrDesignationPermission(
    "designation.view"
  ),
  validateRequest(
    getDesignationRequestSchema
  ),
  asyncHandler(
    getDesignationController
  )
);

designationRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrDesignationPermission(
    "designation.manage"
  ),
  validateRequest(
    createDesignationRequestSchema
  ),
  asyncHandler(
    createDesignationController
  )
);

designationRouter.patch(
  "/:designationId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrDesignationPermission(
    "designation.manage"
  ),
  validateRequest(
    updateDesignationRequestSchema
  ),
  asyncHandler(
    updateDesignationController
  )
);

designationRouter.delete(
  "/:designationId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrDesignationPermission(
    "designation.manage"
  ),
  validateRequest(
    deleteDesignationRequestSchema
  ),
  asyncHandler(
    deleteDesignationController
  )
);

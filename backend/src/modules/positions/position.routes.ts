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
  closePositionController,
  createPositionController,
  getPositionController,
  listPositionsController,
  updatePositionController
} from "./position.controller.js";

import {
  closePositionRequestSchema,
  createPositionRequestSchema,
  getPositionRequestSchema,
  listPositionsRequestSchema,
  updatePositionRequestSchema
} from "./position.schema.js";

export const positionRouter =
  Router();

// edited by wali: Let linked Company Administrators manage positions within their company.
function requireCompanyAdminOrPositionPermission(
  permission: "position.view" | "position.manage"
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

positionRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrPositionPermission(
    "position.view"
  ),
  validateRequest(
    listPositionsRequestSchema
  ),
  asyncHandler(
    listPositionsController
  )
);

positionRouter.get(
  "/:positionId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrPositionPermission(
    "position.view"
  ),
  validateRequest(
    getPositionRequestSchema
  ),
  asyncHandler(
    getPositionController
  )
);

positionRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrPositionPermission(
    "position.manage"
  ),
  validateRequest(
    createPositionRequestSchema
  ),
  asyncHandler(
    createPositionController
  )
);

positionRouter.patch(
  "/:positionId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrPositionPermission(
    "position.manage"
  ),
  validateRequest(
    updatePositionRequestSchema
  ),
  asyncHandler(
    updatePositionController
  )
);

positionRouter.delete(
  "/:positionId",
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrPositionPermission(
    "position.manage"
  ),
  validateRequest(
    closePositionRequestSchema
  ),
  asyncHandler(
    closePositionController
  )
);

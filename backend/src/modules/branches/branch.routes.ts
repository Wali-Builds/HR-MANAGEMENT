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
  createBranchController,
  deleteBranchController,
  getBranchController,
  listBranchesController,
  updateBranchController
} from "./branch.controller.js";

import {
  createBranchRequestSchema,
  deleteBranchRequestSchema,
  getBranchRequestSchema,
  listBranchesRequestSchema,
  updateBranchRequestSchema
} from "./branch.schema.js";

export const branchRouter =
  Router();

// edited by wali: Allow a linked Company Administrator to manage branches within their tenant.
function requireBranchPermission(
  permission: "branch.view" | "branch.manage"
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

branchRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireBranchPermission(
    "branch.view"
  ),
  validateRequest(
    listBranchesRequestSchema
  ),
  asyncHandler(
    listBranchesController
  )
);

branchRouter.get(
  "/:branchId",
  authenticate,
  requireCompletedPasswordChange,
  requireBranchPermission(
    "branch.view"
  ),
  validateRequest(
    getBranchRequestSchema
  ),
  asyncHandler(
    getBranchController
  )
);

branchRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requireBranchPermission(
    "branch.manage"
  ),
  validateRequest(
    createBranchRequestSchema
  ),
  asyncHandler(
    createBranchController
  )
);

branchRouter.patch(
  "/:branchId",
  authenticate,
  requireCompletedPasswordChange,
  requireBranchPermission(
    "branch.manage"
  ),
  validateRequest(
    updateBranchRequestSchema
  ),
  asyncHandler(
    updateBranchController
  )
);

branchRouter.delete(
  "/:branchId",
  authenticate,
  requireCompletedPasswordChange,
  requireBranchPermission(
    "branch.manage"
  ),
  validateRequest(
    deleteBranchRequestSchema
  ),
  asyncHandler(
    deleteBranchController
  )
);

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
  adminResetUserPasswordController,
  createUserController,
  deleteUserController,
  getUserController,
  getUserLookupsController,
  listUsersController,
  replaceUserRolesController,
  updateUserController
} from "./user.controller.js";

import {
  adminResetPasswordRequestSchema,
  createUserRequestSchema,
  deleteUserRequestSchema,
  getUserRequestSchema,
  listUsersRequestSchema,
  replaceUserRolesRequestSchema,
  updateUserRequestSchema,
  userLookupsRequestSchema
} from "./user.schema.js";

export const userRouter =
  Router();

// edited by wali: Let linked Company Administrators manage accounts scoped to their company.
function requireCompanyAdminOrUserManage(): RequestHandler {
  const permissionGuard = requirePermission("users.manage");

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

userRouter.use(
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrUserManage()
);

userRouter.get(
  "/lookups",
  validateRequest(
    userLookupsRequestSchema
  ),
  asyncHandler(
    getUserLookupsController
  )
);

userRouter.get(
  "/",
  validateRequest(
    listUsersRequestSchema
  ),
  asyncHandler(
    listUsersController
  )
);

userRouter.post(
  "/",
  validateRequest(
    createUserRequestSchema
  ),
  asyncHandler(
    createUserController
  )
);

userRouter.put(
  "/:userId/roles",
  validateRequest(
    replaceUserRolesRequestSchema
  ),
  asyncHandler(
    replaceUserRolesController
  )
);

userRouter.post(
  "/:userId/reset-password",
  validateRequest(
    adminResetPasswordRequestSchema
  ),
  asyncHandler(
    adminResetUserPasswordController
  )
);

userRouter.get(
  "/:userId",
  validateRequest(
    getUserRequestSchema
  ),
  asyncHandler(
    getUserController
  )
);

userRouter.patch(
  "/:userId",
  validateRequest(
    updateUserRequestSchema
  ),
  asyncHandler(
    updateUserController
  )
);

userRouter.delete(
  "/:userId",
  validateRequest(
    deleteUserRequestSchema
  ),
  asyncHandler(
    deleteUserController
  )
);

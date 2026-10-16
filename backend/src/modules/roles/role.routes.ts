import {
  Router
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
  createRoleController,
  deleteRoleController,
  getRoleController,
  listPermissionsController,
  listRolesController,
  replaceRolePermissionsController,
  updateRoleController
} from "./role.controller.js";

import {
  createRoleRequestSchema,
  deleteRoleRequestSchema,
  getRoleRequestSchema,
  listPermissionsRequestSchema,
  listRolesRequestSchema,
  replaceRolePermissionsRequestSchema,
  updateRoleRequestSchema
} from "./role.schema.js";

export const roleRouter =
  Router();

roleRouter.use(
  authenticate,
  requireCompletedPasswordChange,
  requirePermission(
    "roles.manage"
  )
);

roleRouter.get(
  "/permissions",
  validateRequest(
    listPermissionsRequestSchema
  ),
  asyncHandler(
    listPermissionsController
  )
);

roleRouter.get(
  "/",
  validateRequest(
    listRolesRequestSchema
  ),
  asyncHandler(
    listRolesController
  )
);

roleRouter.post(
  "/",
  validateRequest(
    createRoleRequestSchema
  ),
  asyncHandler(
    createRoleController
  )
);

roleRouter.put(
  "/:roleId/permissions",
  validateRequest(
    replaceRolePermissionsRequestSchema
  ),
  asyncHandler(
    replaceRolePermissionsController
  )
);

roleRouter.get(
  "/:roleId",
  validateRequest(
    getRoleRequestSchema
  ),
  asyncHandler(
    getRoleController
  )
);

roleRouter.patch(
  "/:roleId",
  validateRequest(
    updateRoleRequestSchema
  ),
  asyncHandler(
    updateRoleController
  )
);

roleRouter.delete(
  "/:roleId",
  validateRequest(
    deleteRoleRequestSchema
  ),
  asyncHandler(
    deleteRoleController
  )
);

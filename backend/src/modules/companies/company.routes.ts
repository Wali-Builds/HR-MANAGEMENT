import { Router } from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  requirePermission,
  requirePlatformAdmin
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
  createCompanyController,
  deleteCompanyController,
  getCompanyController,
  listCompaniesController,
  updateCompanyController
} from "./company.controller.js";

import {
  createCompanyRequestSchema,
  deleteCompanyRequestSchema,
  getCompanyRequestSchema,
  listCompaniesRequestSchema,
  updateCompanyRequestSchema
} from "./company.schema.js";

export const companyRouter =
  Router();

companyRouter.get(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requirePermission(
    "company.view"
  ),
  validateRequest(
    listCompaniesRequestSchema
  ),
  asyncHandler(
    listCompaniesController
  )
);

companyRouter.get(
  "/:companyId",
  authenticate,
  requireCompletedPasswordChange,
  requirePermission(
    "company.view"
  ),
  validateRequest(
    getCompanyRequestSchema
  ),
  asyncHandler(
    getCompanyController
  )
);

companyRouter.post(
  "/",
  authenticate,
  requireCompletedPasswordChange,
  requirePlatformAdmin,
  validateRequest(
    createCompanyRequestSchema
  ),
  asyncHandler(
    createCompanyController
  )
);

companyRouter.patch(
  "/:companyId",
  authenticate,
  requireCompletedPasswordChange,
  requirePermission(
    "company.manage"
  ),
  validateRequest(
    updateCompanyRequestSchema
  ),
  asyncHandler(
    updateCompanyController
  )
);

companyRouter.delete(
  "/:companyId",
  authenticate,
  requireCompletedPasswordChange,
  requirePlatformAdmin,
  validateRequest(
    deleteCompanyRequestSchema
  ),
  asyncHandler(
    deleteCompanyController
  )
);
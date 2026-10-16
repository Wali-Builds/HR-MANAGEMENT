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
  getWorkforceReportController
} from "./workforce-report.controller.js";

import {
  getWorkforceReportRequestSchema
} from "./workforce-report.schema.js";

export const workforceReportRouter =
  Router();

// edited by wali: Let linked Company Administrators view their own company's workforce report.
function requireCompanyAdminOrEmployeeView(): RequestHandler {
  const permissionGuard = requirePermission("employee.view_all");

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

workforceReportRouter.use(
  authenticate,
  requireCompletedPasswordChange,
  requireCompanyAdminOrEmployeeView()
);

workforceReportRouter.get(
  "/reports/summary",
  validateRequest(
    getWorkforceReportRequestSchema
  ),
  asyncHandler(
    getWorkforceReportController
  )
);

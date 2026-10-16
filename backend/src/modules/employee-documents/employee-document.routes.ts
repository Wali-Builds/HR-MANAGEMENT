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
  createEmployeeDocumentController,
  deleteEmployeeDocumentController,
  downloadEmployeeDocumentController,
  getEmployeeDocumentController,
  listEmployeeDocumentsController,
  previewEmployeeDocumentController,
  replaceEmployeeDocumentFileController,
  updateEmployeeDocumentController
} from "./employee-document.controller.js";

import {
  createEmployeeDocumentRequestSchema,
  deleteEmployeeDocumentRequestSchema,
  employeeDocumentFileRequestSchema,
  getEmployeeDocumentRequestSchema,
  listEmployeeDocumentsRequestSchema,
  updateEmployeeDocumentRequestSchema
} from "./employee-document.schema.js";

import {
  uploadSingleEmployeeDocument
} from "./employee-document.upload.js";

export const employeeDocumentRouter =
  Router();

// edited by wali: Allow a linked Company Administrator to manage documents for employees in its tenant.
function requireCompanyAdminOrEmployeeUpdate(): RequestHandler {
  const permissionGuard = requirePermission("employee.update");

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

employeeDocumentRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

// edited by wali: Apply employee-directory permissions only to document endpoints so unrelated employee routes, including leave requests, can continue to their own routers.
employeeDocumentRouter.use(
  "/:employeeId/documents",
  requireAnyPermission(
    "employee.view_all",
    "employee.update"
  )
);

employeeDocumentRouter.get(
  "/:employeeId/documents",
  validateRequest(
    listEmployeeDocumentsRequestSchema
  ),
  asyncHandler(
    listEmployeeDocumentsController
  )
);

employeeDocumentRouter.get(
  "/:employeeId/documents/:documentId/preview",
  validateRequest(
    employeeDocumentFileRequestSchema
  ),
  asyncHandler(
    previewEmployeeDocumentController
  )
);

employeeDocumentRouter.get(
  "/:employeeId/documents/:documentId/download",
  validateRequest(
    employeeDocumentFileRequestSchema
  ),
  asyncHandler(
    downloadEmployeeDocumentController
  )
);

employeeDocumentRouter.get(
  "/:employeeId/documents/:documentId",
  validateRequest(
    getEmployeeDocumentRequestSchema
  ),
  asyncHandler(
    getEmployeeDocumentController
  )
);

employeeDocumentRouter.post(
  "/:employeeId/documents",
  requireCompanyAdminOrEmployeeUpdate(),
  uploadSingleEmployeeDocument,
  validateRequest(
    createEmployeeDocumentRequestSchema
  ),
  asyncHandler(
    createEmployeeDocumentController
  )
);

employeeDocumentRouter.patch(
  "/:employeeId/documents/:documentId",
  requireCompanyAdminOrEmployeeUpdate(),
  validateRequest(
    updateEmployeeDocumentRequestSchema
  ),
  asyncHandler(
    updateEmployeeDocumentController
  )
);

employeeDocumentRouter.put(
  "/:employeeId/documents/:documentId/file",
  requireCompanyAdminOrEmployeeUpdate(),
  uploadSingleEmployeeDocument,
  validateRequest(
    employeeDocumentFileRequestSchema
  ),
  asyncHandler(
    replaceEmployeeDocumentFileController
  )
);

employeeDocumentRouter.delete(
  "/:employeeId/documents/:documentId",
  requireCompanyAdminOrEmployeeUpdate(),
  validateRequest(
    deleteEmployeeDocumentRequestSchema
  ),
  asyncHandler(
    deleteEmployeeDocumentController
  )
);

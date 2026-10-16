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
  createEmployeeEducationController,
  createEmployeeExperienceController,
  deleteEmployeeEducationController,
  deleteEmployeeExperienceController,
  listEmployeeEducationsController,
  listEmployeeExperiencesController,
  updateEmployeeEducationController,
  updateEmployeeExperienceController
} from "./employee-career.controller.js";

import {
  createEmployeeEducationRequestSchema,
  createEmployeeExperienceRequestSchema,
  deleteEmployeeEducationRequestSchema,
  deleteEmployeeExperienceRequestSchema,
  listEmployeeEducationsRequestSchema,
  listEmployeeExperiencesRequestSchema,
  updateEmployeeEducationRequestSchema,
  updateEmployeeExperienceRequestSchema
} from "./employee-career.schema.js";

export const employeeCareerRouter =
  Router();

employeeCareerRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * Education routes
 */

employeeCareerRouter.get(
  "/:employeeId/educations",
  validateRequest(
    listEmployeeEducationsRequestSchema
  ),
  asyncHandler(
    listEmployeeEducationsController
  )
);

employeeCareerRouter.post(
  "/:employeeId/educations",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeEducationRequestSchema
  ),
  asyncHandler(
    createEmployeeEducationController
  )
);

employeeCareerRouter.patch(
  "/:employeeId/educations/:educationId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeEducationRequestSchema
  ),
  asyncHandler(
    updateEmployeeEducationController
  )
);

employeeCareerRouter.delete(
  "/:employeeId/educations/:educationId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeEducationRequestSchema
  ),
  asyncHandler(
    deleteEmployeeEducationController
  )
);

/*
 * Experience routes
 */

employeeCareerRouter.get(
  "/:employeeId/experiences",
  validateRequest(
    listEmployeeExperiencesRequestSchema
  ),
  asyncHandler(
    listEmployeeExperiencesController
  )
);

employeeCareerRouter.post(
  "/:employeeId/experiences",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeExperienceRequestSchema
  ),
  asyncHandler(
    createEmployeeExperienceController
  )
);

employeeCareerRouter.patch(
  "/:employeeId/experiences/:experienceId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeExperienceRequestSchema
  ),
  asyncHandler(
    updateEmployeeExperienceController
  )
);

employeeCareerRouter.delete(
  "/:employeeId/experiences/:experienceId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeExperienceRequestSchema
  ),
  asyncHandler(
    deleteEmployeeExperienceController
  )
);
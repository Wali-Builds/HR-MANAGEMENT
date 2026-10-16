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
  createEmployeeCertificationController,
  createEmployeeSkillController,
  deactivateEmployeeCertificationController,
  deleteEmployeeSkillController,
  getEmployeeCompetencyLookupsController,
  listEmployeeCertificationsController,
  listEmployeeSkillsController,
  updateEmployeeCertificationController,
  updateEmployeeSkillController
} from "./employee-competency.controller.js";

import {
  createEmployeeCertificationRequestSchema,
  createEmployeeSkillRequestSchema,
  deleteEmployeeCertificationRequestSchema,
  deleteEmployeeSkillRequestSchema,
  getEmployeeCompetencyLookupsRequestSchema,
  listEmployeeCertificationsRequestSchema,
  listEmployeeSkillsRequestSchema,
  updateEmployeeCertificationRequestSchema,
  updateEmployeeSkillRequestSchema
} from "./employee-competency.schema.js";

export const employeeCompetencyRouter =
  Router();

employeeCompetencyRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * Lookup route
 */

employeeCompetencyRouter.get(
  "/:employeeId/competency-lookups",
  validateRequest(
    getEmployeeCompetencyLookupsRequestSchema
  ),
  asyncHandler(
    getEmployeeCompetencyLookupsController
  )
);

/*
 * Skill routes
 */

employeeCompetencyRouter.get(
  "/:employeeId/skills",
  validateRequest(
    listEmployeeSkillsRequestSchema
  ),
  asyncHandler(
    listEmployeeSkillsController
  )
);

employeeCompetencyRouter.post(
  "/:employeeId/skills",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeSkillRequestSchema
  ),
  asyncHandler(
    createEmployeeSkillController
  )
);

employeeCompetencyRouter.patch(
  "/:employeeId/skills/:employeeSkillId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeSkillRequestSchema
  ),
  asyncHandler(
    updateEmployeeSkillController
  )
);

employeeCompetencyRouter.delete(
  "/:employeeId/skills/:employeeSkillId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeSkillRequestSchema
  ),
  asyncHandler(
    deleteEmployeeSkillController
  )
);

/*
 * Certification routes
 */

employeeCompetencyRouter.get(
  "/:employeeId/certifications",
  validateRequest(
    listEmployeeCertificationsRequestSchema
  ),
  asyncHandler(
    listEmployeeCertificationsController
  )
);

employeeCompetencyRouter.post(
  "/:employeeId/certifications",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeCertificationRequestSchema
  ),
  asyncHandler(
    createEmployeeCertificationController
  )
);

employeeCompetencyRouter.patch(
  "/:employeeId/certifications/:employeeCertificationId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeCertificationRequestSchema
  ),
  asyncHandler(
    updateEmployeeCertificationController
  )
);

employeeCompetencyRouter.delete(
  "/:employeeId/certifications/:employeeCertificationId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeCertificationRequestSchema
  ),
  asyncHandler(
    deactivateEmployeeCertificationController
  )
);
import {
  Router
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
  approveSalaryAssignmentController,
  closeSalaryAssignmentController,
  closeSalaryComponentController,
  createSalaryAssignmentController,
  createSalaryComponentController,
  getCompensationLookupsController,
  getSalaryAssignmentController,
  listSalaryAssignmentsController,
  listSalaryComponentsController,
  updateSalaryAssignmentController,
  updateSalaryComponentController
} from "./employee-compensation.controller.js";

import {
  approveSalaryAssignmentRequestSchema,
  closeEmployeeSalaryComponentRequestSchema,
  closeSalaryAssignmentRequestSchema,
  createEmployeeSalaryComponentRequestSchema,
  createSalaryAssignmentRequestSchema,
  getCompensationLookupsRequestSchema,
  getSalaryAssignmentRequestSchema,
  listEmployeeSalaryComponentsRequestSchema,
  listSalaryAssignmentsRequestSchema,
  updateEmployeeSalaryComponentRequestSchema,
  updateSalaryAssignmentRequestSchema
} from "./employee-compensation.schema.js";

export const employeeCompensationRouter =
  Router();

employeeCompensationRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeCompensationRouter.get(
  "/:employeeId/compensation-lookups",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    getCompensationLookupsRequestSchema
  ),
  asyncHandler(
    getCompensationLookupsController
  )
);

/*
 * Salary assignments
 */

employeeCompensationRouter.get(
  "/:employeeId/salary-assignments",
  validateRequest(
    listSalaryAssignmentsRequestSchema
  ),
  asyncHandler(
    listSalaryAssignmentsController
  )
);

employeeCompensationRouter.get(
  "/:employeeId/salary-assignments/:salaryAssignmentId",
  validateRequest(
    getSalaryAssignmentRequestSchema
  ),
  asyncHandler(
    getSalaryAssignmentController
  )
);

employeeCompensationRouter.post(
  "/:employeeId/salary-assignments",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    createSalaryAssignmentRequestSchema
  ),
  asyncHandler(
    createSalaryAssignmentController
  )
);

employeeCompensationRouter.patch(
  "/:employeeId/salary-assignments/:salaryAssignmentId",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    updateSalaryAssignmentRequestSchema
  ),
  asyncHandler(
    updateSalaryAssignmentController
  )
);

employeeCompensationRouter.post(
  "/:employeeId/salary-assignments/:salaryAssignmentId/close",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    closeSalaryAssignmentRequestSchema
  ),
  asyncHandler(
    closeSalaryAssignmentController
  )
);

employeeCompensationRouter.post(
  "/:employeeId/salary-assignments/:salaryAssignmentId/approve",
  requirePermission(
    "payroll.approve"
  ),
  validateRequest(
    approveSalaryAssignmentRequestSchema
  ),
  asyncHandler(
    approveSalaryAssignmentController
  )
);

/*
 * Employee salary components
 */

employeeCompensationRouter.get(
  "/:employeeId/salary-assignments/:salaryAssignmentId/components",
  validateRequest(
    listEmployeeSalaryComponentsRequestSchema
  ),
  asyncHandler(
    listSalaryComponentsController
  )
);

employeeCompensationRouter.post(
  "/:employeeId/salary-assignments/:salaryAssignmentId/components",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    createEmployeeSalaryComponentRequestSchema
  ),
  asyncHandler(
    createSalaryComponentController
  )
);

employeeCompensationRouter.patch(
  "/:employeeId/salary-assignments/:salaryAssignmentId/components/:employeeSalaryComponentId",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    updateEmployeeSalaryComponentRequestSchema
  ),
  asyncHandler(
    updateSalaryComponentController
  )
);

employeeCompensationRouter.post(
  "/:employeeId/salary-assignments/:salaryAssignmentId/components/:employeeSalaryComponentId/close",
  requireAnyPermission(
    "payroll.manage",
    "employee.update"
  ),
  validateRequest(
    closeEmployeeSalaryComponentRequestSchema
  ),
  asyncHandler(
    closeSalaryComponentController
  )
);
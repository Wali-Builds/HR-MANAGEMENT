import {
  Router
} from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  requireAnyPermission
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
  createAttendancePolicyController,
  createAttendanceStatusController,
  createEmployeeAttendancePolicyAssignmentController,
  deleteAttendancePolicyController,
  deleteEmployeeAttendancePolicyAssignmentController,
  getAttendancePolicyController,
  getAttendanceStatusController,
  getEffectiveEmployeeAttendancePolicyController,
  listAttendancePoliciesController,
  listAttendanceStatusesController,
  listEmployeeAttendancePolicyAssignmentsController,
  updateAttendancePolicyController,
  updateAttendanceStatusController,
  updateEmployeeAttendancePolicyAssignmentController
} from "./attendance-policy.controller.js";

import {
  createAttendancePolicyAssignmentRequestSchema,
  createAttendancePolicyRequestSchema,
  createAttendanceStatusRequestSchema,
  deleteAttendancePolicyAssignmentRequestSchema,
  deleteAttendancePolicyRequestSchema,
  getAttendancePolicyRequestSchema,
  getAttendanceStatusRequestSchema,
  getEffectiveAttendancePolicyRequestSchema,
  listAttendancePoliciesRequestSchema,
  listAttendancePolicyAssignmentsRequestSchema,
  listAttendanceStatusesRequestSchema,
  updateAttendancePolicyAssignmentRequestSchema,
  updateAttendancePolicyRequestSchema,
  updateAttendanceStatusRequestSchema
} from "./attendance-policy.schema.js";

export const attendancePolicyRouter =
  Router();

export const employeeAttendancePolicyRouter =
  Router();

attendancePolicyRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeAttendancePolicyRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Attendance-policy routes
 * =========================================================
 */

attendancePolicyRouter.get(
  "/policies",
  requireAnyPermission(
    "attendance.policy.view",
    "attendance.policy.manage",
    "attendance.policy.assign",
    "attendance.manage"
  ),
  validateRequest(
    listAttendancePoliciesRequestSchema
  ),
  asyncHandler(
    listAttendancePoliciesController
  )
);

attendancePolicyRouter.post(
  "/policies",
  requireAnyPermission(
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    createAttendancePolicyRequestSchema
  ),
  asyncHandler(
    createAttendancePolicyController
  )
);

attendancePolicyRouter.get(
  "/policies/:policyId",
  requireAnyPermission(
    "attendance.policy.view",
    "attendance.policy.manage",
    "attendance.policy.assign",
    "attendance.manage"
  ),
  validateRequest(
    getAttendancePolicyRequestSchema
  ),
  asyncHandler(
    getAttendancePolicyController
  )
);

attendancePolicyRouter.patch(
  "/policies/:policyId",
  requireAnyPermission(
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateAttendancePolicyRequestSchema
  ),
  asyncHandler(
    updateAttendancePolicyController
  )
);

attendancePolicyRouter.delete(
  "/policies/:policyId",
  requireAnyPermission(
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteAttendancePolicyRequestSchema
  ),
  asyncHandler(
    deleteAttendancePolicyController
  )
);

/*
 * =========================================================
 * Global attendance-status routes
 * =========================================================
 */

attendancePolicyRouter.get(
  "/statuses",
  requireAnyPermission(
    "attendance.status.view",
    "attendance.status.manage",
    "attendance.policy.view",
    "attendance.manage"
  ),
  validateRequest(
    listAttendanceStatusesRequestSchema
  ),
  asyncHandler(
    listAttendanceStatusesController
  )
);

attendancePolicyRouter.post(
  "/statuses",
  requireAnyPermission(
    "attendance.status.manage"
  ),
  validateRequest(
    createAttendanceStatusRequestSchema
  ),
  asyncHandler(
    createAttendanceStatusController
  )
);

attendancePolicyRouter.get(
  "/statuses/:statusCode",
  requireAnyPermission(
    "attendance.status.view",
    "attendance.status.manage",
    "attendance.policy.view",
    "attendance.manage"
  ),
  validateRequest(
    getAttendanceStatusRequestSchema
  ),
  asyncHandler(
    getAttendanceStatusController
  )
);

attendancePolicyRouter.patch(
  "/statuses/:statusCode",
  requireAnyPermission(
    "attendance.status.manage"
  ),
  validateRequest(
    updateAttendanceStatusRequestSchema
  ),
  asyncHandler(
    updateAttendanceStatusController
  )
);

/*
 * =========================================================
 * Employee attendance-policy assignment routes
 * =========================================================
 */

employeeAttendancePolicyRouter.get(
  "/:employeeId/effective-attendance-policy",
  validateRequest(
    getEffectiveAttendancePolicyRequestSchema
  ),
  asyncHandler(
    getEffectiveEmployeeAttendancePolicyController
  )
);

employeeAttendancePolicyRouter.get(
  "/:employeeId/attendance-policy-assignments",
  validateRequest(
    listAttendancePolicyAssignmentsRequestSchema
  ),
  asyncHandler(
    listEmployeeAttendancePolicyAssignmentsController
  )
);

employeeAttendancePolicyRouter.post(
  "/:employeeId/attendance-policy-assignments",
  requireAnyPermission(
    "attendance.policy.assign",
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    createAttendancePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    createEmployeeAttendancePolicyAssignmentController
  )
);

employeeAttendancePolicyRouter.patch(
  "/:employeeId/attendance-policy-assignments/:assignmentId",
  requireAnyPermission(
    "attendance.policy.assign",
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateAttendancePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    updateEmployeeAttendancePolicyAssignmentController
  )
);

employeeAttendancePolicyRouter.delete(
  "/:employeeId/attendance-policy-assignments/:assignmentId",
  requireAnyPermission(
    "attendance.policy.assign",
    "attendance.policy.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteAttendancePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    deleteEmployeeAttendancePolicyAssignmentController
  )
);
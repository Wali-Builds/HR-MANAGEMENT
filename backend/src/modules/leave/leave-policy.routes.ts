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
  createEmployeeLeavePolicyAssignmentController,
  createLeavePolicyController,
  createLeavePolicyRuleController,
  createLeaveTypeController,
  deleteEmployeeLeavePolicyAssignmentController,
  deleteLeavePolicyController,
  deleteLeavePolicyRuleController,
  deleteLeaveTypeController,
  getEffectiveEmployeeLeavePolicyController,
  getLeavePolicyController,
  getLeavePolicyRuleController,
  getLeaveTypeController,
  listEmployeeLeavePolicyAssignmentsController,
  listLeavePoliciesController,
  listLeavePolicyRulesController,
  listLeaveTypesController,
  updateEmployeeLeavePolicyAssignmentController,
  updateLeavePolicyController,
  updateLeavePolicyRuleController,
  updateLeaveTypeController
} from "./leave-policy.controller.js";

import {
  createEmployeeLeavePolicyAssignmentRequestSchema,
  createLeavePolicyRequestSchema,
  createLeavePolicyRuleRequestSchema,
  createLeaveTypeRequestSchema,
  deleteEmployeeLeavePolicyAssignmentRequestSchema,
  deleteLeavePolicyRequestSchema,
  deleteLeavePolicyRuleRequestSchema,
  deleteLeaveTypeRequestSchema,
  getEffectiveEmployeeLeavePolicyRequestSchema,
  getLeavePolicyRequestSchema,
  getLeavePolicyRuleRequestSchema,
  getLeaveTypeRequestSchema,
  listEmployeeLeavePolicyAssignmentsRequestSchema,
  listLeavePoliciesRequestSchema,
  listLeavePolicyRulesRequestSchema,
  listLeaveTypesRequestSchema,
  updateEmployeeLeavePolicyAssignmentRequestSchema,
  updateLeavePolicyRequestSchema,
  updateLeavePolicyRuleRequestSchema,
  updateLeaveTypeRequestSchema
} from "./leave-policy.schema.js";

export const leavePolicyRouter =
  Router();

export const employeeLeavePolicyRouter =
  Router();

leavePolicyRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeLeavePolicyRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Leave types
 * =========================================================
 */

leavePolicyRouter.get(
  "/types",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveTypesRequestSchema
  ),
  asyncHandler(
    listLeaveTypesController
  )
);

leavePolicyRouter.post(
  "/types",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeaveTypeRequestSchema
  ),
  asyncHandler(
    createLeaveTypeController
  )
);

leavePolicyRouter.get(
  "/types/:leaveTypeId",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeaveTypeRequestSchema
  ),
  asyncHandler(
    getLeaveTypeController
  )
);

leavePolicyRouter.patch(
  "/types/:leaveTypeId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    updateLeaveTypeRequestSchema
  ),
  asyncHandler(
    updateLeaveTypeController
  )
);

leavePolicyRouter.delete(
  "/types/:leaveTypeId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteLeaveTypeRequestSchema
  ),
  asyncHandler(
    deleteLeaveTypeController
  )
);

/*
 * =========================================================
 * Leave-policy rules
 *
 * Rule routes are registered before the generic policy ID
 * routes for clarity.
 * =========================================================
 */

leavePolicyRouter.get(
  "/policies/:leavePolicyId/rules",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeavePolicyRulesRequestSchema
  ),
  asyncHandler(
    listLeavePolicyRulesController
  )
);

leavePolicyRouter.post(
  "/policies/:leavePolicyId/rules",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeavePolicyRuleRequestSchema
  ),
  asyncHandler(
    createLeavePolicyRuleController
  )
);

leavePolicyRouter.get(
  "/policies/:leavePolicyId/rules/:leavePolicyRuleId",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeavePolicyRuleRequestSchema
  ),
  asyncHandler(
    getLeavePolicyRuleController
  )
);

leavePolicyRouter.patch(
  "/policies/:leavePolicyId/rules/:leavePolicyRuleId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    updateLeavePolicyRuleRequestSchema
  ),
  asyncHandler(
    updateLeavePolicyRuleController
  )
);

leavePolicyRouter.delete(
  "/policies/:leavePolicyId/rules/:leavePolicyRuleId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteLeavePolicyRuleRequestSchema
  ),
  asyncHandler(
    deleteLeavePolicyRuleController
  )
);

/*
 * =========================================================
 * Leave policies
 * =========================================================
 */

leavePolicyRouter.get(
  "/policies",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeavePoliciesRequestSchema
  ),
  asyncHandler(
    listLeavePoliciesController
  )
);

leavePolicyRouter.post(
  "/policies",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeavePolicyRequestSchema
  ),
  asyncHandler(
    createLeavePolicyController
  )
);

leavePolicyRouter.get(
  "/policies/:leavePolicyId",
  requireAnyPermission(
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeavePolicyRequestSchema
  ),
  asyncHandler(
    getLeavePolicyController
  )
);

leavePolicyRouter.patch(
  "/policies/:leavePolicyId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    updateLeavePolicyRequestSchema
  ),
  asyncHandler(
    updateLeavePolicyController
  )
);

leavePolicyRouter.delete(
  "/policies/:leavePolicyId",
  requireAnyPermission(
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteLeavePolicyRequestSchema
  ),
  asyncHandler(
    deleteLeavePolicyController
  )
);

/*
 * =========================================================
 * Employee leave-policy assignments
 * =========================================================
 */

employeeLeavePolicyRouter.get(
  "/:employeeId/effective-leave-policy",
  validateRequest(
    getEffectiveEmployeeLeavePolicyRequestSchema
  ),
  asyncHandler(
    getEffectiveEmployeeLeavePolicyController
  )
);

employeeLeavePolicyRouter.get(
  "/:employeeId/leave-policy-assignments",
  validateRequest(
    listEmployeeLeavePolicyAssignmentsRequestSchema
  ),
  asyncHandler(
    listEmployeeLeavePolicyAssignmentsController
  )
);

employeeLeavePolicyRouter.post(
  "/:employeeId/leave-policy-assignments",
  requireAnyPermission(
    "leave.policy.assign",
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    createEmployeeLeavePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    createEmployeeLeavePolicyAssignmentController
  )
);

employeeLeavePolicyRouter.patch(
  "/:employeeId/leave-policy-assignments/:assignmentId",
  requireAnyPermission(
    "leave.policy.assign",
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    updateEmployeeLeavePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    updateEmployeeLeavePolicyAssignmentController
  )
);

employeeLeavePolicyRouter.delete(
  "/:employeeId/leave-policy-assignments/:assignmentId",
  requireAnyPermission(
    "leave.policy.assign",
    "leave.policy.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteEmployeeLeavePolicyAssignmentRequestSchema
  ),
  asyncHandler(
    deleteEmployeeLeavePolicyAssignmentController
  )
);
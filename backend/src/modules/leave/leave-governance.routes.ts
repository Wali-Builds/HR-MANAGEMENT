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
  createLeaveApprovalDelegationController,
  createLeaveBlackoutPeriodController,
  deactivateLeaveApprovalDelegationController,
  deactivateLeaveBlackoutPeriodController,
  getLeaveApprovalDelegationController,
  getLeaveBlackoutPeriodController,
  listLeaveApprovalDelegationsController,
  listLeaveBlackoutPeriodsController,
  previewApplicableLeaveBlackoutsController,
  updateLeaveApprovalDelegationController,
  updateLeaveBlackoutPeriodController
} from "./leave-governance.controller.js";

import {
  createLeaveApprovalDelegationRequestSchema,
  createLeaveBlackoutPeriodRequestSchema,
  deleteLeaveApprovalDelegationRequestSchema,
  deleteLeaveBlackoutPeriodRequestSchema,
  getLeaveApprovalDelegationRequestSchema,
  getLeaveBlackoutPeriodRequestSchema,
  listLeaveApprovalDelegationsRequestSchema,
  listLeaveBlackoutPeriodsRequestSchema,
  previewApplicableLeaveBlackoutsRequestSchema,
  updateLeaveApprovalDelegationRequestSchema,
  updateLeaveBlackoutPeriodRequestSchema
} from "./leave-governance.schema.js";

export const leaveGovernanceRouter =
  Router();

leaveGovernanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Approval delegations
 * =========================================================
 */

leaveGovernanceRouter.get(
  "/approval-delegations",
  requireAnyPermission(
    "leave.delegation.view",
    "leave.delegation.manage",
    "leave.request.approve",
    "leave.manage"
  ),
  validateRequest(
    listLeaveApprovalDelegationsRequestSchema
  ),
  asyncHandler(
    listLeaveApprovalDelegationsController
  )
);

/*
 * No route-level permission is applied to create/get/update/delete.
 * The service permits:
 *
 * - the delegator themselves; or
 * - users with leave.delegation.manage / leave.manage.
 */

leaveGovernanceRouter.post(
  "/approval-delegations",
  validateRequest(
    createLeaveApprovalDelegationRequestSchema
  ),
  asyncHandler(
    createLeaveApprovalDelegationController
  )
);

leaveGovernanceRouter.get(
  "/approval-delegations/:delegationId",
  validateRequest(
    getLeaveApprovalDelegationRequestSchema
  ),
  asyncHandler(
    getLeaveApprovalDelegationController
  )
);

leaveGovernanceRouter.patch(
  "/approval-delegations/:delegationId",
  validateRequest(
    updateLeaveApprovalDelegationRequestSchema
  ),
  asyncHandler(
    updateLeaveApprovalDelegationController
  )
);

leaveGovernanceRouter.delete(
  "/approval-delegations/:delegationId",
  validateRequest(
    deleteLeaveApprovalDelegationRequestSchema
  ),
  asyncHandler(
    deactivateLeaveApprovalDelegationController
  )
);

/*
 * =========================================================
 * Blackout periods
 *
 * /applicable must be registered before /:blackoutPeriodId.
 * =========================================================
 */

leaveGovernanceRouter.get(
  "/blackout-periods",
  requireAnyPermission(
    "leave.blackout.view",
    "leave.blackout.manage",
    "leave.request.view",
    "leave.request.manage",
    "leave.manage"
  ),
  validateRequest(
    listLeaveBlackoutPeriodsRequestSchema
  ),
  asyncHandler(
    listLeaveBlackoutPeriodsController
  )
);

leaveGovernanceRouter.get(
  "/blackout-periods/applicable",
  validateRequest(
    previewApplicableLeaveBlackoutsRequestSchema
  ),
  asyncHandler(
    previewApplicableLeaveBlackoutsController
  )
);

leaveGovernanceRouter.post(
  "/blackout-periods",
  requireAnyPermission(
    "leave.blackout.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeaveBlackoutPeriodRequestSchema
  ),
  asyncHandler(
    createLeaveBlackoutPeriodController
  )
);

leaveGovernanceRouter.get(
  "/blackout-periods/:blackoutPeriodId",
  requireAnyPermission(
    "leave.blackout.view",
    "leave.blackout.manage",
    "leave.request.view",
    "leave.request.manage",
    "leave.manage"
  ),
  validateRequest(
    getLeaveBlackoutPeriodRequestSchema
  ),
  asyncHandler(
    getLeaveBlackoutPeriodController
  )
);

leaveGovernanceRouter.patch(
  "/blackout-periods/:blackoutPeriodId",
  requireAnyPermission(
    "leave.blackout.manage",
    "leave.manage"
  ),
  validateRequest(
    updateLeaveBlackoutPeriodRequestSchema
  ),
  asyncHandler(
    updateLeaveBlackoutPeriodController
  )
);

leaveGovernanceRouter.delete(
  "/blackout-periods/:blackoutPeriodId",
  requireAnyPermission(
    "leave.blackout.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteLeaveBlackoutPeriodRequestSchema
  ),
  asyncHandler(
    deactivateLeaveBlackoutPeriodController
  )
);
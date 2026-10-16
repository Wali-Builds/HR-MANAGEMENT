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
  approveLeaveEncashmentRequestController,
  cancelLeaveEncashmentRequestController,
  createEmployeeLeaveEncashmentRequestController,
  getLeaveEncashmentRequestController,
  listEmployeeLeaveEncashmentRequestsController,
  listLeaveEncashmentRequestsController,
  processLeaveEncashmentRequestController,
  rejectLeaveEncashmentRequestController
} from "./leave-encashment.controller.js";

import {
  approveLeaveEncashmentRequestRequestSchema,
  cancelLeaveEncashmentRequestRequestSchema,
  createEmployeeLeaveEncashmentRequestRequestSchema,
  getLeaveEncashmentRequestRequestSchema,
  listEmployeeLeaveEncashmentRequestsRequestSchema,
  listLeaveEncashmentRequestsRequestSchema,
  processLeaveEncashmentRequestRequestSchema,
  rejectLeaveEncashmentRequestRequestSchema
} from "./leave-encashment.schema.js";

export const leaveEncashmentRouter =
  Router();

export const employeeLeaveEncashmentRouter =
  Router();

leaveEncashmentRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeLeaveEncashmentRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Company request list
 * =========================================================
 */

leaveEncashmentRouter.get(
  "/encashment-requests",
  requireAnyPermission(
    "leave.encashment.view",
    "leave.encashment.manage",
    "leave.encashment.approve",
    "leave.encashment.process",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveEncashmentRequestsRequestSchema
  ),
  asyncHandler(
    listLeaveEncashmentRequestsController
  )
);

/*
 * =========================================================
 * Approval and processing
 * =========================================================
 */

leaveEncashmentRouter.post(
  "/encashment-requests/:encashmentRequestId/approve",
  requireAnyPermission(
    "leave.encashment.approve",
    "leave.encashment.manage",
    "leave.manage"
  ),
  validateRequest(
    approveLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    approveLeaveEncashmentRequestController
  )
);

leaveEncashmentRouter.post(
  "/encashment-requests/:encashmentRequestId/reject",
  requireAnyPermission(
    "leave.encashment.approve",
    "leave.encashment.manage",
    "leave.manage"
  ),
  validateRequest(
    rejectLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    rejectLeaveEncashmentRequestController
  )
);

leaveEncashmentRouter.post(
  "/encashment-requests/:encashmentRequestId/process",
  requireAnyPermission(
    "leave.encashment.process",
    "leave.encashment.manage",
    "leave.manage"
  ),
  validateRequest(
    processLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    processLeaveEncashmentRequestController
  )
);

/*
 * Owner or manager routes
 *
 * The service permits the request owner or an authorized
 * leave manager, so route-level permission middleware is
 * intentionally omitted here.
 * =========================================================
 */

leaveEncashmentRouter.post(
  "/encashment-requests/:encashmentRequestId/cancel",
  validateRequest(
    cancelLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    cancelLeaveEncashmentRequestController
  )
);

leaveEncashmentRouter.get(
  "/encashment-requests/:encashmentRequestId",
  validateRequest(
    getLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    getLeaveEncashmentRequestController
  )
);

/*
 * =========================================================
 * Employee routes
 * =========================================================
 */

employeeLeaveEncashmentRouter.get(
  "/:employeeId/leave-encashment-requests",
  validateRequest(
    listEmployeeLeaveEncashmentRequestsRequestSchema
  ),
  asyncHandler(
    listEmployeeLeaveEncashmentRequestsController
  )
);

employeeLeaveEncashmentRouter.post(
  "/:employeeId/leave-encashment-requests",
  validateRequest(
    createEmployeeLeaveEncashmentRequestRequestSchema
  ),
  asyncHandler(
    createEmployeeLeaveEncashmentRequestController
  )
);

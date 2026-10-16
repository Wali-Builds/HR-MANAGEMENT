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
  approveOvertimeRequestController,
  cancelOvertimeRequestController,
  createOvertimeRequestController,
  getOvertimeRequestController,
  listEmployeeOvertimeRequestsController,
  listOvertimeRequestsController,
  rejectOvertimeRequestController,
  updateOvertimeRequestController
} from "./attendance-overtime.controller.js";

import {
  approveOvertimeRequestRequestSchema,
  cancelOvertimeRequestRequestSchema,
  createOvertimeRequestRequestSchema,
  getOvertimeRequestRequestSchema,
  listEmployeeOvertimeRequestsRequestSchema,
  listOvertimeRequestsRequestSchema,
  rejectOvertimeRequestRequestSchema,
  updateOvertimeRequestRequestSchema
} from "./attendance-overtime.schema.js";

export const attendanceOvertimeRouter =
  Router();

export const employeeOvertimeRouter =
  Router();

attendanceOvertimeRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeOvertimeRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * General overtime routes
 * =========================================================
 */

attendanceOvertimeRouter.get(
  "/overtime-requests",
  requireAnyPermission(
    "attendance.overtime.view",
    "attendance.overtime.manage",
    "attendance.overtime.approve",
    "attendance.manage"
  ),
  validateRequest(
    listOvertimeRequestsRequestSchema
  ),
  asyncHandler(
    listOvertimeRequestsController
  )
);

attendanceOvertimeRouter.post(
  "/overtime-requests",
  validateRequest(
    createOvertimeRequestRequestSchema
  ),
  asyncHandler(
    createOvertimeRequestController
  )
);

attendanceOvertimeRouter.get(
  "/overtime-requests/:overtimeRequestId",
  validateRequest(
    getOvertimeRequestRequestSchema
  ),
  asyncHandler(
    getOvertimeRequestController
  )
);

attendanceOvertimeRouter.patch(
  "/overtime-requests/:overtimeRequestId",
  validateRequest(
    updateOvertimeRequestRequestSchema
  ),
  asyncHandler(
    updateOvertimeRequestController
  )
);

attendanceOvertimeRouter.post(
  "/overtime-requests/:overtimeRequestId/cancel",
  validateRequest(
    cancelOvertimeRequestRequestSchema
  ),
  asyncHandler(
    cancelOvertimeRequestController
  )
);

attendanceOvertimeRouter.post(
  "/overtime-requests/:overtimeRequestId/approve",
  requireAnyPermission(
    "attendance.overtime.approve",
    "attendance.manage"
  ),
  validateRequest(
    approveOvertimeRequestRequestSchema
  ),
  asyncHandler(
    approveOvertimeRequestController
  )
);

attendanceOvertimeRouter.post(
  "/overtime-requests/:overtimeRequestId/reject",
  requireAnyPermission(
    "attendance.overtime.approve",
    "attendance.manage"
  ),
  validateRequest(
    rejectOvertimeRequestRequestSchema
  ),
  asyncHandler(
    rejectOvertimeRequestController
  )
);

/*
 * =========================================================
 * Employee overtime routes
 * =========================================================
 */

employeeOvertimeRouter.get(
  "/:employeeId/overtime-requests",
  validateRequest(
    listEmployeeOvertimeRequestsRequestSchema
  ),
  asyncHandler(
    listEmployeeOvertimeRequestsController
  )
);
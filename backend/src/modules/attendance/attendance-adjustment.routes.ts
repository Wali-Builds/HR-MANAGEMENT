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
  approveAttendanceAdjustmentRequestController,
  cancelAttendanceAdjustmentRequestController,
  createAttendanceAdjustmentRequestController,
  getAttendanceAdjustmentRequestController,
  listAttendanceAdjustmentApprovalsController,
  listAttendanceAdjustmentRequestsController,
  listEmployeeAttendanceAdjustmentsController,
  rejectAttendanceAdjustmentRequestController,
  updateAttendanceAdjustmentRequestController
} from "./attendance-adjustment.controller.js";

import {
  approveAttendanceAdjustmentRequestSchema,
  cancelAttendanceAdjustmentRequestSchema,
  createAttendanceAdjustmentRequestRequestSchema,
  getAttendanceAdjustmentRequestRequestSchema,
  listAttendanceAdjustmentApprovalsRequestSchema,
  listAttendanceAdjustmentRequestsRequestSchema,
  listEmployeeAttendanceAdjustmentsRequestSchema,
  rejectAttendanceAdjustmentRequestSchema,
  updateAttendanceAdjustmentRequestRequestSchema
} from "./attendance-adjustment.schema.js";

export const attendanceAdjustmentRouter =
  Router();

export const employeeAttendanceAdjustmentRouter =
  Router();

attendanceAdjustmentRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeAttendanceAdjustmentRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * General adjustment routes
 * =========================================================
 */

attendanceAdjustmentRouter.get(
  "/adjustment-requests",
  requireAnyPermission(
    "attendance.adjustment.view",
    "attendance.adjustment.manage",
    "attendance.adjustment.approve",
    "attendance.manage"
  ),
  validateRequest(
    listAttendanceAdjustmentRequestsRequestSchema
  ),
  asyncHandler(
    listAttendanceAdjustmentRequestsController
  )
);

attendanceAdjustmentRouter.post(
  "/adjustment-requests",
  validateRequest(
    createAttendanceAdjustmentRequestRequestSchema
  ),
  asyncHandler(
    createAttendanceAdjustmentRequestController
  )
);

attendanceAdjustmentRouter.get(
  "/adjustment-requests/:adjustmentRequestId",
  validateRequest(
    getAttendanceAdjustmentRequestRequestSchema
  ),
  asyncHandler(
    getAttendanceAdjustmentRequestController
  )
);

attendanceAdjustmentRouter.patch(
  "/adjustment-requests/:adjustmentRequestId",
  validateRequest(
    updateAttendanceAdjustmentRequestRequestSchema
  ),
  asyncHandler(
    updateAttendanceAdjustmentRequestController
  )
);

attendanceAdjustmentRouter.get(
  "/adjustment-requests/:adjustmentRequestId/approvals",
  validateRequest(
    listAttendanceAdjustmentApprovalsRequestSchema
  ),
  asyncHandler(
    listAttendanceAdjustmentApprovalsController
  )
);

attendanceAdjustmentRouter.post(
  "/adjustment-requests/:adjustmentRequestId/cancel",
  validateRequest(
    cancelAttendanceAdjustmentRequestSchema
  ),
  asyncHandler(
    cancelAttendanceAdjustmentRequestController
  )
);

attendanceAdjustmentRouter.post(
  "/adjustment-requests/:adjustmentRequestId/approve",
  requireAnyPermission(
    "attendance.adjustment.approve",
    "attendance.manage"
  ),
  validateRequest(
    approveAttendanceAdjustmentRequestSchema
  ),
  asyncHandler(
    approveAttendanceAdjustmentRequestController
  )
);

attendanceAdjustmentRouter.post(
  "/adjustment-requests/:adjustmentRequestId/reject",
  requireAnyPermission(
    "attendance.adjustment.approve",
    "attendance.manage"
  ),
  validateRequest(
    rejectAttendanceAdjustmentRequestSchema
  ),
  asyncHandler(
    rejectAttendanceAdjustmentRequestController
  )
);

/*
 * =========================================================
 * Employee adjustment routes
 * =========================================================
 */

employeeAttendanceAdjustmentRouter.get(
  "/:employeeId/attendance-adjustments",
  validateRequest(
    listEmployeeAttendanceAdjustmentsRequestSchema
  ),
  asyncHandler(
    listEmployeeAttendanceAdjustmentsController
  )
);
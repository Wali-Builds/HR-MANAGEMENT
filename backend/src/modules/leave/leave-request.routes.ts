import { Router } from "express";

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
  approveLeaveRequestController,
  cancelLeaveRequestController,
  createEmployeeLeaveRequestController,
  createLeaveRequestAttachmentController,
  deleteLeaveRequestAttachmentController,
  getEmployeeLeaveRequestController,
  getLeaveRequestController,
  listEmployeeLeaveRequestsController,
  listLeaveRequestApprovalsController,
  listLeaveRequestAttachmentsController,
  listLeaveRequestDaysController,
  listLeaveRequestsController,
  listPendingLeaveApprovalsController,
  rejectLeaveRequestController,
  submitLeaveRequestController,
  updateLeaveRequestController,
  withdrawLeaveRequestController
} from "./leave-request.controller.js";

import {
  approveLeaveRequestRequestSchema,
  cancelLeaveRequestRequestSchema,
  createEmployeeLeaveRequestRequestSchema,
  createLeaveRequestAttachmentRequestSchema,
  deleteLeaveRequestAttachmentRequestSchema,
  getEmployeeLeaveRequestRequestSchema,
  getLeaveRequestRequestSchema,
  listEmployeeLeaveRequestsRequestSchema,
  listLeaveRequestApprovalsRequestSchema,
  listLeaveRequestAttachmentsRequestSchema,
  listLeaveRequestDaysRequestSchema,
  listLeaveRequestsRequestSchema,
  listPendingLeaveApprovalsRequestSchema,
  rejectLeaveRequestRequestSchema,
  submitLeaveRequestRequestSchema,
  updateLeaveRequestRequestSchema,
  withdrawLeaveRequestRequestSchema
} from "./leave-request.schema.js";

export const leaveRequestRouter =
  Router();

export const employeeLeaveRequestRouter =
  Router();

leaveRequestRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeLeaveRequestRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Company request listing
 * =========================================================
 */

leaveRequestRouter.get(
  "/requests",
  requireAnyPermission(
    "leave.request.view",
    "leave.request.manage",
    "leave.request.approve",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    // edited by wali: Validate the company request list query instead of requiring a request ID parameter.
    listLeaveRequestsRequestSchema
  ),
  asyncHandler(
    listLeaveRequestsController
  )
);

/*
 * =========================================================
 * Current user's approval inbox
 * =========================================================
 */

leaveRequestRouter.get(
  "/approvals/pending",
  validateRequest(
    listPendingLeaveApprovalsRequestSchema
  ),
  asyncHandler(
    listPendingLeaveApprovalsController
  )
);

/*
 * =========================================================
 * Request lifecycle
 *
 * Route-level permission middleware is intentionally omitted
 * here. The service permits the request owner or an authorized
 * leave manager.
 * =========================================================
 */

leaveRequestRouter.post(
  "/requests/:leaveRequestId/submit",
  validateRequest(
    submitLeaveRequestRequestSchema
  ),
  asyncHandler(
    submitLeaveRequestController
  )
);

leaveRequestRouter.post(
  "/requests/:leaveRequestId/cancel",
  validateRequest(
    cancelLeaveRequestRequestSchema
  ),
  asyncHandler(
    cancelLeaveRequestController
  )
);

leaveRequestRouter.post(
  "/requests/:leaveRequestId/withdraw",
  validateRequest(
    withdrawLeaveRequestRequestSchema
  ),
  asyncHandler(
    withdrawLeaveRequestController
  )
);

/*
 * =========================================================
 * Request days
 * =========================================================
 */

leaveRequestRouter.get(
  "/requests/:leaveRequestId/days",
  validateRequest(
    listLeaveRequestDaysRequestSchema
  ),
  asyncHandler(
    listLeaveRequestDaysController
  )
);

/*
 * =========================================================
 * Request attachments
 * =========================================================
 */

leaveRequestRouter.get(
  "/requests/:leaveRequestId/attachments",
  validateRequest(
    listLeaveRequestAttachmentsRequestSchema
  ),
  asyncHandler(
    listLeaveRequestAttachmentsController
  )
);

leaveRequestRouter.post(
  "/requests/:leaveRequestId/attachments",
  validateRequest(
    createLeaveRequestAttachmentRequestSchema
  ),
  asyncHandler(
    createLeaveRequestAttachmentController
  )
);

leaveRequestRouter.delete(
  "/requests/:leaveRequestId/attachments/:attachmentId",
  validateRequest(
    deleteLeaveRequestAttachmentRequestSchema
  ),
  asyncHandler(
    deleteLeaveRequestAttachmentController
  )
);

/*
 * =========================================================
 * Approval workflow
 * =========================================================
 */

leaveRequestRouter.get(
  "/requests/:leaveRequestId/approvals",
  validateRequest(
    getLeaveRequestRequestSchema
  ),
  asyncHandler(
    listLeaveRequestApprovalsController
  )
);

leaveRequestRouter.post(
  "/requests/:leaveRequestId/approvals/:leaveApprovalId/approve",
  validateRequest(
    approveLeaveRequestRequestSchema
  ),
  asyncHandler(
    approveLeaveRequestController
  )
);

leaveRequestRouter.post(
  "/requests/:leaveRequestId/approvals/:leaveApprovalId/reject",
  validateRequest(
    rejectLeaveRequestRequestSchema
  ),
  asyncHandler(
    rejectLeaveRequestController
  )
);

/*
 * =========================================================
 * Generic request routes
 * =========================================================
 */

leaveRequestRouter.get(
  "/requests/:leaveRequestId",
  validateRequest(
    getLeaveRequestRequestSchema
  ),
  asyncHandler(
    getLeaveRequestController
  )
);

leaveRequestRouter.patch(
  "/requests/:leaveRequestId",
  validateRequest(
    updateLeaveRequestRequestSchema
  ),
  asyncHandler(
    updateLeaveRequestController
  )
);

/*
 * =========================================================
 * Employee request routes
 * =========================================================
 */

employeeLeaveRequestRouter.get(
  "/:employeeId/leave-requests",
  validateRequest(
    listEmployeeLeaveRequestsRequestSchema
  ),
  asyncHandler(
    listEmployeeLeaveRequestsController
  )
);

employeeLeaveRequestRouter.post(
  "/:employeeId/leave-requests",
  validateRequest(
    createEmployeeLeaveRequestRequestSchema
  ),
  asyncHandler(
    createEmployeeLeaveRequestController
  )
);

employeeLeaveRequestRouter.get(
  "/:employeeId/leave-requests/:leaveRequestId",
  validateRequest(
    getEmployeeLeaveRequestRequestSchema
  ),
  asyncHandler(
    getEmployeeLeaveRequestController
  )
);

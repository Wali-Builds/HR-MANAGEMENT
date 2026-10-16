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
  cancelLeaveAccrualRunController,
  cancelLeaveCarryForwardRunController,
  createLeaveAccrualRunController,
  createLeaveCarryForwardRunController,
  getLeaveAccrualRunController,
  getLeaveCarryForwardRunController,
  listLeaveAccrualRunDetailsController,
  listLeaveAccrualRunsController,
  listLeaveBalanceExpiriesController,
  listLeaveCarryForwardRunDetailsController,
  listLeaveCarryForwardRunsController,
  previewLeaveAccrualController,
  previewLeaveCarryForwardController,
  processLeaveAccrualRunController,
  processLeaveBalanceExpiriesController,
  processLeaveCarryForwardRunController
} from "./leave-accrual.controller.js";

import {
  cancelLeaveAccrualRunRequestSchema,
  cancelLeaveCarryForwardRunRequestSchema,
  createLeaveAccrualRunRequestSchema,
  createLeaveCarryForwardRunRequestSchema,
  getLeaveAccrualRunRequestSchema,
  getLeaveCarryForwardRunRequestSchema,
  listLeaveAccrualRunDetailsRequestSchema,
  listLeaveAccrualRunsRequestSchema,
  listLeaveBalanceExpiriesRequestSchema,
  listLeaveCarryForwardRunDetailsRequestSchema,
  listLeaveCarryForwardRunsRequestSchema,
  previewLeaveAccrualRequestSchema,
  previewLeaveCarryForwardRequestSchema,
  processLeaveAccrualRunRequestSchema,
  processLeaveBalanceExpiryRequestSchema,
  processLeaveCarryForwardRunRequestSchema
} from "./leave-accrual.schema.js";

export const leaveAccrualRouter =
  Router();

leaveAccrualRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Accrual runs
 * =========================================================
 */

leaveAccrualRouter.get(
  "/accrual-runs",
  requireAnyPermission(
    "leave.accrual.view",
    "leave.accrual.manage",
    "leave.accrual.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveAccrualRunsRequestSchema
  ),
  asyncHandler(
    listLeaveAccrualRunsController
  )
);

leaveAccrualRouter.post(
  "/accrual-runs/preview",
  requireAnyPermission(
    "leave.accrual.view",
    "leave.accrual.manage",
    "leave.accrual.process",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    previewLeaveAccrualRequestSchema
  ),
  asyncHandler(
    previewLeaveAccrualController
  )
);

leaveAccrualRouter.post(
  "/accrual-runs",
  requireAnyPermission(
    "leave.accrual.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeaveAccrualRunRequestSchema
  ),
  asyncHandler(
    createLeaveAccrualRunController
  )
);

leaveAccrualRouter.get(
  "/accrual-runs/:accrualRunId/details",
  requireAnyPermission(
    "leave.accrual.view",
    "leave.accrual.manage",
    "leave.accrual.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveAccrualRunDetailsRequestSchema
  ),
  asyncHandler(
    listLeaveAccrualRunDetailsController
  )
);

leaveAccrualRouter.post(
  "/accrual-runs/:accrualRunId/process",
  requireAnyPermission(
    "leave.accrual.process",
    "leave.manage"
  ),
  validateRequest(
    processLeaveAccrualRunRequestSchema
  ),
  asyncHandler(
    processLeaveAccrualRunController
  )
);

leaveAccrualRouter.post(
  "/accrual-runs/:accrualRunId/cancel",
  requireAnyPermission(
    "leave.accrual.manage",
    "leave.manage"
  ),
  validateRequest(
    cancelLeaveAccrualRunRequestSchema
  ),
  asyncHandler(
    cancelLeaveAccrualRunController
  )
);

leaveAccrualRouter.get(
  "/accrual-runs/:accrualRunId",
  requireAnyPermission(
    "leave.accrual.view",
    "leave.accrual.manage",
    "leave.accrual.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeaveAccrualRunRequestSchema
  ),
  asyncHandler(
    getLeaveAccrualRunController
  )
);

/*
 * =========================================================
 * Carry-forward runs
 * =========================================================
 */

leaveAccrualRouter.get(
  "/carry-forward-runs",
  requireAnyPermission(
    "leave.carry_forward.view",
    "leave.carry_forward.manage",
    "leave.carry_forward.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveCarryForwardRunsRequestSchema
  ),
  asyncHandler(
    listLeaveCarryForwardRunsController
  )
);

leaveAccrualRouter.get(
  "/carry-forward-runs/:carryForwardRunId/details",
  requireAnyPermission(
    "leave.carry_forward.view",
    "leave.carry_forward.manage",
    "leave.carry_forward.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveCarryForwardRunDetailsRequestSchema
  ),
  asyncHandler(
    listLeaveCarryForwardRunDetailsController
  )
);

leaveAccrualRouter.post(
  "/carry-forward-runs/:carryForwardRunId/process",
  requireAnyPermission(
    "leave.carry_forward.process",
    "leave.manage"
  ),
  validateRequest(
    processLeaveCarryForwardRunRequestSchema
  ),
  asyncHandler(
    processLeaveCarryForwardRunController
  )
);

leaveAccrualRouter.post(
  "/carry-forward-runs/:carryForwardRunId/cancel",
  requireAnyPermission(
    "leave.carry_forward.manage",
    "leave.manage"
  ),
  validateRequest(
    cancelLeaveCarryForwardRunRequestSchema
  ),
  asyncHandler(
    cancelLeaveCarryForwardRunController
  )
);

leaveAccrualRouter.get(
  "/carry-forward-runs/:carryForwardRunId",
  requireAnyPermission(
    "leave.carry_forward.view",
    "leave.carry_forward.manage",
    "leave.carry_forward.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeaveCarryForwardRunRequestSchema
  ),
  asyncHandler(
    getLeaveCarryForwardRunController
  )
);

/*
 * =========================================================
 * Period carry-forward actions
 * =========================================================
 */

leaveAccrualRouter.post(
  "/periods/:leavePeriodId/carry-forward/preview",
  requireAnyPermission(
    "leave.carry_forward.view",
    "leave.carry_forward.manage",
    "leave.carry_forward.process",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    previewLeaveCarryForwardRequestSchema
  ),
  asyncHandler(
    previewLeaveCarryForwardController
  )
);

leaveAccrualRouter.post(
  "/periods/:leavePeriodId/carry-forward",
  requireAnyPermission(
    "leave.carry_forward.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeaveCarryForwardRunRequestSchema
  ),
  asyncHandler(
    createLeaveCarryForwardRunController
  )
);

/*
 * =========================================================
 * Balance expiries
 * =========================================================
 */

leaveAccrualRouter.get(
  "/balance-expiries",
  requireAnyPermission(
    "leave.expiry.view",
    "leave.expiry.process",
    "leave.balance.view",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveBalanceExpiriesRequestSchema
  ),
  asyncHandler(
    listLeaveBalanceExpiriesController
  )
);

leaveAccrualRouter.post(
  "/periods/:leavePeriodId/expire-balances",
  requireAnyPermission(
    "leave.expiry.process",
    "leave.manage"
  ),
  validateRequest(
    processLeaveBalanceExpiryRequestSchema
  ),
  asyncHandler(
    processLeaveBalanceExpiriesController
  )
);

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
  bulkRecalculateLeaveBalancesController,
  closeAndOpenNextLeavePeriodController,
  closeLeavePeriodController,
  createEmployeeLeaveBalanceAdjustmentController,
  createLeavePeriodController,
  deleteLeavePeriodController,
  getEmployeeLeaveTypeBalanceController,
  getLeaveBalanceController,
  getLeavePeriodController,
  initializeEmployeeLeaveBalanceController,
  listEmployeeLeaveBalancesController,
  listEmployeeLeaveBalanceTransactionsController,
  listLeaveBalancesController,
  listLeaveBalanceTransactionsController,
  listLeavePeriodsController,
  recalculateLeaveBalanceController,
  reopenLeavePeriodController,
  updateLeavePeriodController
} from "./leave-balance.controller.js";

import {
  bulkRecalculateLeaveBalancesRequestSchema,
  closeAndOpenNextLeavePeriodRequestSchema,
  closeLeavePeriodRequestSchema,
  createLeaveBalanceAdjustmentRequestSchema,
  createLeavePeriodRequestSchema,
  deleteLeavePeriodRequestSchema,
  getEmployeeLeaveTypeBalanceRequestSchema,
  getLeaveBalanceRequestSchema,
  getLeavePeriodRequestSchema,
  initializeEmployeeLeaveBalanceRequestSchema,
  listEmployeeLeaveBalancesRequestSchema,
  listEmployeeLeaveBalanceTransactionsRequestSchema,
  listLeaveBalancesRequestSchema,
  listLeaveBalanceTransactionsRequestSchema,
  listLeavePeriodsRequestSchema,
  recalculateLeaveBalanceRequestSchema,
  reopenLeavePeriodRequestSchema,
  updateLeavePeriodRequestSchema
} from "./leave-balance.schema.js";

export const leaveBalanceRouter =
  Router();

export const employeeLeaveBalanceRouter =
  Router();

leaveBalanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeLeaveBalanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Leave periods
 * =========================================================
 */

leaveBalanceRouter.get(
  "/periods",
  requireAnyPermission(
    "leave.period.view",
    "leave.period.manage",
    "leave.balance.view",
    "leave.balance.manage",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeavePeriodsRequestSchema
  ),
  asyncHandler(
    listLeavePeriodsController
  )
);

leaveBalanceRouter.post(
  "/periods",
  requireAnyPermission(
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeavePeriodRequestSchema
  ),
  asyncHandler(
    createLeavePeriodController
  )
);

leaveBalanceRouter.post(
  "/periods/:leavePeriodId/close-and-open-next",
  requireAnyPermission(
    "leave.period.close",
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    closeAndOpenNextLeavePeriodRequestSchema
  ),
  asyncHandler(
    closeAndOpenNextLeavePeriodController
  )
);

leaveBalanceRouter.post(
  "/periods/:leavePeriodId/close",
  requireAnyPermission(
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    closeLeavePeriodRequestSchema
  ),
  asyncHandler(
    closeLeavePeriodController
  )
);

leaveBalanceRouter.post(
  "/periods/:leavePeriodId/reopen",
  requireAnyPermission(
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    reopenLeavePeriodRequestSchema
  ),
  asyncHandler(
    reopenLeavePeriodController
  )
);

leaveBalanceRouter.get(
  "/periods/:leavePeriodId",
  requireAnyPermission(
    "leave.period.view",
    "leave.period.manage",
    "leave.balance.view",
    "leave.balance.manage",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeavePeriodRequestSchema
  ),
  asyncHandler(
    getLeavePeriodController
  )
);

leaveBalanceRouter.patch(
  "/periods/:leavePeriodId",
  requireAnyPermission(
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    updateLeavePeriodRequestSchema
  ),
  asyncHandler(
    updateLeavePeriodController
  )
);

leaveBalanceRouter.delete(
  "/periods/:leavePeriodId",
  requireAnyPermission(
    "leave.period.manage",
    "leave.manage"
  ),
  validateRequest(
    deleteLeavePeriodRequestSchema
  ),
  asyncHandler(
    deleteLeavePeriodController
  )
);

/*
 * =========================================================
 * Company balances
 *
 * /balances/recalculate must be registered before
 * /balances/:leaveBalanceId.
 * =========================================================
 */

leaveBalanceRouter.get(
  "/balances",
  requireAnyPermission(
    "leave.balance.view",
    "leave.balance.manage",
    "leave.balance.adjust",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveBalancesRequestSchema
  ),
  asyncHandler(
    listLeaveBalancesController
  )
);

leaveBalanceRouter.post(
  "/balances/recalculate",
  requireAnyPermission(
    "leave.balance.manage",
    "leave.manage"
  ),
  validateRequest(
    bulkRecalculateLeaveBalancesRequestSchema
  ),
  asyncHandler(
    bulkRecalculateLeaveBalancesController
  )
);

leaveBalanceRouter.post(
  "/balances/:leaveBalanceId/recalculate",
  requireAnyPermission(
    "leave.balance.manage",
    "leave.manage"
  ),
  validateRequest(
    recalculateLeaveBalanceRequestSchema
  ),
  asyncHandler(
    recalculateLeaveBalanceController
  )
);

leaveBalanceRouter.get(
  "/balances/:leaveBalanceId",
  requireAnyPermission(
    "leave.balance.view",
    "leave.balance.manage",
    "leave.balance.adjust",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    getLeaveBalanceRequestSchema
  ),
  asyncHandler(
    getLeaveBalanceController
  )
);

/*
 * =========================================================
 * Company transaction ledger
 * =========================================================
 */

leaveBalanceRouter.get(
  "/balance-transactions",
  requireAnyPermission(
    "leave.balance.view",
    "leave.balance.manage",
    "leave.balance.adjust",
    "leave.view",
    "leave.manage"
  ),
  validateRequest(
    listLeaveBalanceTransactionsRequestSchema
  ),
  asyncHandler(
    listLeaveBalanceTransactionsController
  )
);

/*
 * =========================================================
 * Employee balances
 * =========================================================
 */

employeeLeaveBalanceRouter.get(
  "/:employeeId/leave-balances",
  validateRequest(
    listEmployeeLeaveBalancesRequestSchema
  ),
  asyncHandler(
    listEmployeeLeaveBalancesController
  )
);

employeeLeaveBalanceRouter.post(
  "/:employeeId/leave-balances/initialize",
  requireAnyPermission(
    "leave.balance.manage",
    "leave.manage"
  ),
  validateRequest(
    initializeEmployeeLeaveBalanceRequestSchema
  ),
  asyncHandler(
    initializeEmployeeLeaveBalanceController
  )
);

employeeLeaveBalanceRouter.get(
  "/:employeeId/leave-balances/:leaveTypeId",
  validateRequest(
    getEmployeeLeaveTypeBalanceRequestSchema
  ),
  asyncHandler(
    getEmployeeLeaveTypeBalanceController
  )
);

employeeLeaveBalanceRouter.post(
  "/:employeeId/leave-balance-adjustments",
  requireAnyPermission(
    "leave.balance.adjust",
    "leave.balance.manage",
    "leave.manage"
  ),
  validateRequest(
    createLeaveBalanceAdjustmentRequestSchema
  ),
  asyncHandler(
    createEmployeeLeaveBalanceAdjustmentController
  )
);

employeeLeaveBalanceRouter.get(
  "/:employeeId/leave-balance-transactions",
  validateRequest(
    listEmployeeLeaveBalanceTransactionsRequestSchema
  ),
  asyncHandler(
    listEmployeeLeaveBalanceTransactionsController
  )
);
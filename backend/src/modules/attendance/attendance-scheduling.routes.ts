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
  createEmployeeShiftAssignmentController,
  createShiftController,
  createWorkScheduleController,
  deleteEmployeeShiftAssignmentController,
  deleteShiftController,
  deleteWorkScheduleController,
  getEffectiveEmployeeShiftController,
  getShiftController,
  getWorkScheduleController,
  listEmployeeShiftAssignmentsController,
  listShiftsController,
  listWorkScheduleDaysController,
  listWorkSchedulesController,
  replaceWorkScheduleDaysController,
  updateEmployeeShiftAssignmentController,
  updateShiftController,
  updateWorkScheduleController
} from "./attendance-scheduling.controller.js";

import {
  createEmployeeShiftAssignmentRequestSchema,
  createShiftRequestSchema,
  createWorkScheduleRequestSchema,
  deleteEmployeeShiftAssignmentRequestSchema,
  deleteShiftRequestSchema,
  deleteWorkScheduleRequestSchema,
  getEffectiveEmployeeShiftRequestSchema,
  getShiftRequestSchema,
  getWorkScheduleRequestSchema,
  listEmployeeShiftAssignmentsRequestSchema,
  listShiftsRequestSchema,
  listWorkScheduleDaysRequestSchema,
  listWorkSchedulesRequestSchema,
  replaceWorkScheduleDaysRequestSchema,
  updateEmployeeShiftAssignmentRequestSchema,
  updateShiftRequestSchema,
  updateWorkScheduleRequestSchema
} from "./attendance-scheduling.schema.js";

export const attendanceSchedulingRouter =
  Router();

export const employeeSchedulingRouter =
  Router();

attendanceSchedulingRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeSchedulingRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Shift routes
 * =========================================================
 */

attendanceSchedulingRouter.get(
  "/shifts",
  requireAnyPermission(
    "attendance.scheduling.view",
    "attendance.scheduling.manage",
    "attendance.scheduling.assign",
    "attendance.manage"
  ),
  validateRequest(
    listShiftsRequestSchema
  ),
  asyncHandler(
    listShiftsController
  )
);

attendanceSchedulingRouter.post(
  "/shifts",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    createShiftRequestSchema
  ),
  asyncHandler(
    createShiftController
  )
);

attendanceSchedulingRouter.get(
  "/shifts/:shiftId",
  requireAnyPermission(
    "attendance.scheduling.view",
    "attendance.scheduling.manage",
    "attendance.scheduling.assign",
    "attendance.manage"
  ),
  validateRequest(
    getShiftRequestSchema
  ),
  asyncHandler(
    getShiftController
  )
);

attendanceSchedulingRouter.patch(
  "/shifts/:shiftId",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateShiftRequestSchema
  ),
  asyncHandler(
    updateShiftController
  )
);

attendanceSchedulingRouter.delete(
  "/shifts/:shiftId",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteShiftRequestSchema
  ),
  asyncHandler(
    deleteShiftController
  )
);

/*
 * =========================================================
 * Work-schedule routes
 * =========================================================
 */

attendanceSchedulingRouter.get(
  "/work-schedules",
  requireAnyPermission(
    "attendance.scheduling.view",
    "attendance.scheduling.manage",
    "attendance.scheduling.assign",
    "attendance.manage"
  ),
  validateRequest(
    listWorkSchedulesRequestSchema
  ),
  asyncHandler(
    listWorkSchedulesController
  )
);

attendanceSchedulingRouter.post(
  "/work-schedules",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    createWorkScheduleRequestSchema
  ),
  asyncHandler(
    createWorkScheduleController
  )
);

attendanceSchedulingRouter.get(
  "/work-schedules/:scheduleId",
  requireAnyPermission(
    "attendance.scheduling.view",
    "attendance.scheduling.manage",
    "attendance.scheduling.assign",
    "attendance.manage"
  ),
  validateRequest(
    getWorkScheduleRequestSchema
  ),
  asyncHandler(
    getWorkScheduleController
  )
);

attendanceSchedulingRouter.patch(
  "/work-schedules/:scheduleId",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateWorkScheduleRequestSchema
  ),
  asyncHandler(
    updateWorkScheduleController
  )
);

attendanceSchedulingRouter.delete(
  "/work-schedules/:scheduleId",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteWorkScheduleRequestSchema
  ),
  asyncHandler(
    deleteWorkScheduleController
  )
);

attendanceSchedulingRouter.get(
  "/work-schedules/:scheduleId/days",
  requireAnyPermission(
    "attendance.scheduling.view",
    "attendance.scheduling.manage",
    "attendance.scheduling.assign",
    "attendance.manage"
  ),
  validateRequest(
    listWorkScheduleDaysRequestSchema
  ),
  asyncHandler(
    listWorkScheduleDaysController
  )
);

attendanceSchedulingRouter.put(
  "/work-schedules/:scheduleId/days",
  requireAnyPermission(
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    replaceWorkScheduleDaysRequestSchema
  ),
  asyncHandler(
    replaceWorkScheduleDaysController
  )
);

/*
 * =========================================================
 * Employee scheduling routes
 * =========================================================
 */

employeeSchedulingRouter.get(
  "/:employeeId/effective-shift",
  validateRequest(
    getEffectiveEmployeeShiftRequestSchema
  ),
  asyncHandler(
    getEffectiveEmployeeShiftController
  )
);

employeeSchedulingRouter.get(
  "/:employeeId/shift-assignments",
  validateRequest(
    listEmployeeShiftAssignmentsRequestSchema
  ),
  asyncHandler(
    listEmployeeShiftAssignmentsController
  )
);

employeeSchedulingRouter.post(
  "/:employeeId/shift-assignments",
  requireAnyPermission(
    "attendance.scheduling.assign",
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    createEmployeeShiftAssignmentRequestSchema
  ),
  asyncHandler(
    createEmployeeShiftAssignmentController
  )
);

employeeSchedulingRouter.patch(
  "/:employeeId/shift-assignments/:shiftAssignmentId",
  requireAnyPermission(
    "attendance.scheduling.assign",
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateEmployeeShiftAssignmentRequestSchema
  ),
  asyncHandler(
    updateEmployeeShiftAssignmentController
  )
);

employeeSchedulingRouter.delete(
  "/:employeeId/shift-assignments/:shiftAssignmentId",
  requireAnyPermission(
    "attendance.scheduling.assign",
    "attendance.scheduling.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteEmployeeShiftAssignmentRequestSchema
  ),
  asyncHandler(
    deleteEmployeeShiftAssignmentController
  )
);
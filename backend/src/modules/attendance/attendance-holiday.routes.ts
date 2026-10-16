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
  createHolidayController,
  deleteHolidayController,
  getEffectiveEmployeeHolidayController,
  getHolidayCalendarSummaryController,
  getHolidayController,
  listEmployeeHolidaysController,
  listHolidaysController,
  updateHolidayController
} from "./attendance-holiday.controller.js";

import {
  createHolidayRequestSchema,
  deleteHolidayRequestSchema,
  getEffectiveEmployeeHolidayRequestSchema,
  getHolidayCalendarSummaryRequestSchema,
  getHolidayRequestSchema,
  listEmployeeHolidaysRequestSchema,
  listHolidaysRequestSchema,
  updateHolidayRequestSchema
} from "./attendance-holiday.schema.js";

export const attendanceHolidayRouter =
  Router();

export const employeeAttendanceHolidayRouter =
  Router();

attendanceHolidayRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeAttendanceHolidayRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Holiday routes
 *
 * calendar-summary must be declared before :holidayId.
 * =========================================================
 */

attendanceHolidayRouter.get(
  "/holidays",
  requireAnyPermission(
    "attendance.holiday.view",
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    listHolidaysRequestSchema
  ),
  asyncHandler(
    listHolidaysController
  )
);

attendanceHolidayRouter.get(
  "/holidays/calendar-summary",
  requireAnyPermission(
    "attendance.holiday.view",
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    getHolidayCalendarSummaryRequestSchema
  ),
  asyncHandler(
    getHolidayCalendarSummaryController
  )
);

attendanceHolidayRouter.post(
  "/holidays",
  requireAnyPermission(
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    createHolidayRequestSchema
  ),
  asyncHandler(
    createHolidayController
  )
);

attendanceHolidayRouter.get(
  "/holidays/:holidayId",
  requireAnyPermission(
    "attendance.holiday.view",
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    getHolidayRequestSchema
  ),
  asyncHandler(
    getHolidayController
  )
);

attendanceHolidayRouter.patch(
  "/holidays/:holidayId",
  requireAnyPermission(
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateHolidayRequestSchema
  ),
  asyncHandler(
    updateHolidayController
  )
);

attendanceHolidayRouter.delete(
  "/holidays/:holidayId",
  requireAnyPermission(
    "attendance.holiday.manage",
    "attendance.manage"
  ),
  validateRequest(
    deleteHolidayRequestSchema
  ),
  asyncHandler(
    deleteHolidayController
  )
);

/*
 * =========================================================
 * Employee holiday routes
 *
 * Service-level authorization permits an employee to view
 * their own holidays.
 * =========================================================
 */

employeeAttendanceHolidayRouter.get(
  "/:employeeId/holidays",
  validateRequest(
    listEmployeeHolidaysRequestSchema
  ),
  asyncHandler(
    listEmployeeHolidaysController
  )
);

employeeAttendanceHolidayRouter.get(
  "/:employeeId/effective-holiday",
  validateRequest(
    getEffectiveEmployeeHolidayRequestSchema
  ),
  asyncHandler(
    getEffectiveEmployeeHolidayController
  )
);
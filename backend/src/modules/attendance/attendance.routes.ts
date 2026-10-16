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
  assignEmployeeAttendancePolicyController,
  checkInAttendanceController,
  checkOutAttendanceController,
  createAttendanceDeviceController,
  createAttendanceRecordController,
  createBiometricLogController,
  endAttendanceBreakController,
  finalizeAttendanceController,
  getAttendanceDeviceController,
  getAttendanceLookupsController,
  getAttendanceRecordController,
  listAttendanceBreaksController,
  listAttendanceDevicesController,
  listAttendanceRecordsController,
  listBiometricLogsController,
  listEmployeeAttendanceController,
  listEmployeeAttendancePoliciesController,
  processBiometricLogsController,
  startAttendanceBreakController,
  updateAttendanceDeviceController,
  updateAttendanceRecordController
} from "./attendance.controller.js";

import {
  assignEmployeeAttendancePolicyRequestSchema,
  attendanceCheckInRequestSchema,
  attendanceCheckOutRequestSchema,
  createAttendanceDeviceRequestSchema,
  createAttendanceRecordRequestSchema,
  createBiometricLogRequestSchema,
  endAttendanceBreakRequestSchema,
  finalizeAttendanceRequestSchema,
  getAttendanceDeviceRequestSchema,
  getAttendanceLookupsRequestSchema,
  getAttendanceRecordRequestSchema,
  listAttendanceBreaksRequestSchema,
  listAttendanceDevicesRequestSchema,
  listAttendanceRecordsRequestSchema,
  listBiometricLogsRequestSchema,
  listEmployeeAttendancePoliciesRequestSchema,
  listEmployeeAttendanceRequestSchema,
  processBiometricLogsRequestSchema,
  startAttendanceBreakRequestSchema,
  updateAttendanceDeviceRequestSchema,
  updateAttendanceRecordRequestSchema
} from "./attendance.schema.js";

export const attendanceRouter =
  Router();

export const employeeAttendanceRouter =
  Router();

attendanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

employeeAttendanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

attendanceRouter.get(
  "/lookups",
  validateRequest(
    getAttendanceLookupsRequestSchema
  ),
  asyncHandler(
    getAttendanceLookupsController
  )
);

/*
 * =========================================================
 * Devices
 * =========================================================
 */

attendanceRouter.get(
  "/devices",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    listAttendanceDevicesRequestSchema
  ),
  asyncHandler(
    listAttendanceDevicesController
  )
);

attendanceRouter.get(
  "/devices/:attendanceDeviceId",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    getAttendanceDeviceRequestSchema
  ),
  asyncHandler(
    getAttendanceDeviceController
  )
);

attendanceRouter.post(
  "/devices",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    createAttendanceDeviceRequestSchema
  ),
  asyncHandler(
    createAttendanceDeviceController
  )
);

attendanceRouter.patch(
  "/devices/:attendanceDeviceId",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    updateAttendanceDeviceRequestSchema
  ),
  asyncHandler(
    updateAttendanceDeviceController
  )
);

/*
 * =========================================================
 * Biometric logs
 * =========================================================
 */

attendanceRouter.get(
  "/biometric-logs",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    listBiometricLogsRequestSchema
  ),
  asyncHandler(
    listBiometricLogsController
  )
);

attendanceRouter.post(
  "/biometric-logs",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    createBiometricLogRequestSchema
  ),
  asyncHandler(
    createBiometricLogController
  )
);

attendanceRouter.post(
  "/biometric-logs/process",
  requireAnyPermission(
    "biometric.manage",
    "attendance.manage"
  ),
  validateRequest(
    processBiometricLogsRequestSchema
  ),
  asyncHandler(
    processBiometricLogsController
  )
);

/*
 * =========================================================
 * Attendance records
 * =========================================================
 */

attendanceRouter.get(
  "/records",
  validateRequest(
    listAttendanceRecordsRequestSchema
  ),
  asyncHandler(
    listAttendanceRecordsController
  )
);

attendanceRouter.get(
  "/records/:attendanceRecordId",
  validateRequest(
    getAttendanceRecordRequestSchema
  ),
  asyncHandler(
    getAttendanceRecordController
  )
);

attendanceRouter.post(
  "/records",
  requireAnyPermission(
    "attendance.manage"
  ),
  validateRequest(
    createAttendanceRecordRequestSchema
  ),
  asyncHandler(
    createAttendanceRecordController
  )
);

attendanceRouter.patch(
  "/records/:attendanceRecordId",
  requireAnyPermission(
    "attendance.manage"
  ),
  validateRequest(
    updateAttendanceRecordRequestSchema
  ),
  asyncHandler(
    updateAttendanceRecordController
  )
);

/*
 * Employee self check-in and check-out are
 * validated inside the service layer.
 */

attendanceRouter.post(
  "/records/:attendanceRecordId/check-in",
  validateRequest(
    attendanceCheckInRequestSchema
  ),
  asyncHandler(
    checkInAttendanceController
  )
);

attendanceRouter.post(
  "/records/:attendanceRecordId/check-out",
  validateRequest(
    attendanceCheckOutRequestSchema
  ),
  asyncHandler(
    checkOutAttendanceController
  )
);

attendanceRouter.post(
  "/records/:attendanceRecordId/finalize",
  requireAnyPermission(
    "attendance.finalize",
    "attendance.manage"
  ),
  validateRequest(
    finalizeAttendanceRequestSchema
  ),
  asyncHandler(
    finalizeAttendanceController
  )
);

/*
 * =========================================================
 * Breaks
 * =========================================================
 */

attendanceRouter.get(
  "/records/:attendanceRecordId/breaks",
  validateRequest(
    listAttendanceBreaksRequestSchema
  ),
  asyncHandler(
    listAttendanceBreaksController
  )
);

attendanceRouter.post(
  "/records/:attendanceRecordId/breaks/start",
  validateRequest(
    startAttendanceBreakRequestSchema
  ),
  asyncHandler(
    startAttendanceBreakController
  )
);

attendanceRouter.post(
  "/records/:attendanceRecordId/breaks/:attendanceBreakId/end",
  validateRequest(
    endAttendanceBreakRequestSchema
  ),
  asyncHandler(
    endAttendanceBreakController
  )
);

/*
 * =========================================================
 * Employee routes
 * =========================================================
 */

employeeAttendanceRouter.get(
  "/:employeeId/attendance",
  validateRequest(
    listEmployeeAttendanceRequestSchema
  ),
  asyncHandler(
    listEmployeeAttendanceController
  )
);

employeeAttendanceRouter.get(
  "/:employeeId/attendance-policy",
  validateRequest(
    listEmployeeAttendancePoliciesRequestSchema
  ),
  asyncHandler(
    listEmployeeAttendancePoliciesController
  )
);

employeeAttendanceRouter.put(
  "/:employeeId/attendance-policy",
  requireAnyPermission(
    "attendance.manage"
  ),
  validateRequest(
    assignEmployeeAttendancePolicyRequestSchema
  ),
  asyncHandler(
    assignEmployeeAttendancePolicyController
  )
);
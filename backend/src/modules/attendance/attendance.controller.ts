import type {
  Request,
  Response
} from "express";

import {
  AppError
} from "../../common/errors/app-error.js";

import {
  sendSuccess
} from "../../common/utils/api-response.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import type {
  AssignEmployeeAttendancePolicyInput,
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceDeviceListQuery,
  AttendanceLookupQuery,
  AttendancePolicyAssignmentListQuery,
  AttendanceRecordListQuery,
  BiometricLogListQuery,
  CreateAttendanceDeviceInput,
  CreateAttendanceRecordInput,
  CreateBiometricLogInput,
  EmployeeAttendanceListQuery,
  EndAttendanceBreakInput,
  FinalizeAttendanceInput,
  ProcessBiometricLogsInput,
  StartAttendanceBreakInput,
  UpdateAttendanceDeviceInput,
  UpdateAttendanceRecordInput
} from "./attendance.schema.js";

import {
  assignEmployeeAttendancePolicy,
  checkInAttendance,
  checkOutAttendance,
  createAttendanceDevice,
  createAttendanceRecord,
  createBiometricLog,
  endAttendanceBreak,
  finalizeAttendance,
  getAttendanceDevice,
  getAttendanceLookups,
  getAttendanceRecord,
  listAttendanceBreaks,
  listAttendanceDevices,
  listAttendanceRecords,
  listBiometricLogs,
  listEmployeeAttendance,
  listEmployeeAttendancePolicies,
  processBiometricLogs,
  startAttendanceBreak,
  updateAttendanceDevice,
  updateAttendanceRecord
} from "./attendance.service.js";

function getAuthContext(
  response: Response
): AuthContext {
  const auth =
    response.locals.auth as
      | AuthContext
      | undefined;

  if (!auth) {
    throw new AppError({
      message:
        "Authentication is required",

      statusCode: 401,

      code:
        "AUTHENTICATION_REQUIRED"
    });
  }

  return auth;
}

function getRequestMetadata(
  request: Request
) {
  return {
    ipAddress:
      request.ip ?? null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

export async function getAttendanceLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendanceLookupQuery;
    };

  const lookups =
    await getAttendanceLookups(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance lookups retrieved successfully",

    data:
      lookups
  });
}

/*
 * =========================================================
 * Employee policy assignments
 * =========================================================
 */

export async function listEmployeeAttendancePoliciesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        AttendancePolicyAssignmentListQuery;
    };

  const policyAssignments =
    await listEmployeeAttendancePolicies(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee attendance policies retrieved successfully",

    data: {
      policyAssignments
    }
  });
}

export async function assignEmployeeAttendancePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        AssignEmployeeAttendancePolicyInput;
    };

  const policyAssignment =
    await assignEmployeeAttendancePolicy(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance policy assigned successfully",

    data: {
      policyAssignment
    }
  });
}

/*
 * =========================================================
 * Devices
 * =========================================================
 */

export async function listAttendanceDevicesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendanceDeviceListQuery;
    };

  const result =
    await listAttendanceDevices(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance devices retrieved successfully",

    data:
      result
  });
}

export async function getAttendanceDeviceController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceDeviceId: string;
      };
    };

  const attendanceDevice =
    await getAttendanceDevice(
      validated.params
        .attendanceDeviceId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance device retrieved successfully",

    data: {
      attendanceDevice
    }
  });
}

export async function createAttendanceDeviceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateAttendanceDeviceInput;
    };

  const attendanceDevice =
    await createAttendanceDevice(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance device created successfully",

    data: {
      attendanceDevice
    }
  });
}

export async function updateAttendanceDeviceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceDeviceId: string;
      };

      body:
        UpdateAttendanceDeviceInput;
    };

  const attendanceDevice =
    await updateAttendanceDevice(
      validated.params
        .attendanceDeviceId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance device updated successfully",

    data: {
      attendanceDevice
    }
  });
}

/*
 * =========================================================
 * Biometric logs
 * =========================================================
 */

export async function createBiometricLogController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateBiometricLogInput;
    };

  const biometricLog =
    await createBiometricLog(
      validated.body,
      getAuthContext(response)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Biometric log created successfully",

    data: {
      biometricLog
    }
  });
}

export async function listBiometricLogsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        BiometricLogListQuery;
    };

  const result =
    await listBiometricLogs(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Biometric logs retrieved successfully",

    data:
      result
  });
}

export async function processBiometricLogsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        ProcessBiometricLogsInput;
    };

  const result =
    await processBiometricLogs(
      validated.body,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Biometric logs processing completed",

    data:
      result
  });
}

/*
 * =========================================================
 * Attendance records
 * =========================================================
 */

export async function listAttendanceRecordsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendanceRecordListQuery;
    };

  const result =
    await listAttendanceRecords(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance records retrieved successfully",

    data:
      result
  });
}

export async function listEmployeeAttendanceController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeAttendanceListQuery;
    };

  const result =
    await listEmployeeAttendance(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee attendance retrieved successfully",

    data:
      result
  });
}

export async function getAttendanceRecordController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };
    };

  const attendanceRecord =
    await getAttendanceRecord(
      validated.params
        .attendanceRecordId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance record retrieved successfully",

    data: {
      attendanceRecord
    }
  });
}

export async function createAttendanceRecordController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateAttendanceRecordInput;
    };

  const attendanceRecord =
    await createAttendanceRecord(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance record created successfully",

    data: {
      attendanceRecord
    }
  });
}

export async function updateAttendanceRecordController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };

      body:
        UpdateAttendanceRecordInput;
    };

  const attendanceRecord =
    await updateAttendanceRecord(
      validated.params
        .attendanceRecordId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance record updated successfully",

    data: {
      attendanceRecord
    }
  });
}

/*
 * =========================================================
 * Check-in and check-out
 * =========================================================
 */

export async function checkInAttendanceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };

      body:
        AttendanceCheckInInput;
    };

  const attendanceRecord =
    await checkInAttendance(
      validated.params
        .attendanceRecordId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance check-in completed successfully",

    data: {
      attendanceRecord
    }
  });
}

export async function checkOutAttendanceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };

      body:
        AttendanceCheckOutInput;
    };

  const attendanceRecord =
    await checkOutAttendance(
      validated.params
        .attendanceRecordId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance check-out completed successfully",

    data: {
      attendanceRecord
    }
  });
}

export async function finalizeAttendanceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };

      body:
        FinalizeAttendanceInput;
    };

  const attendanceRecord =
    await finalizeAttendance(
      validated.params
        .attendanceRecordId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance record finalized successfully",

    data: {
      attendanceRecord
    }
  });
}

/*
 * =========================================================
 * Breaks
 * =========================================================
 */

export async function listAttendanceBreaksController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };
    };

  const attendanceBreaks =
    await listAttendanceBreaks(
      validated.params
        .attendanceRecordId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance breaks retrieved successfully",

    data: {
      attendanceBreaks
    }
  });
}

export async function startAttendanceBreakController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
      };

      body:
        StartAttendanceBreakInput;
    };

  const attendanceBreak =
    await startAttendanceBreak(
      validated.params
        .attendanceRecordId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance break started successfully",

    data: {
      attendanceBreak
    }
  });
}

export async function endAttendanceBreakController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        attendanceRecordId: string;
        attendanceBreakId: string;
      };

      body:
        EndAttendanceBreakInput;
    };

  const attendanceBreak =
    await endAttendanceBreak(
      validated.params
        .attendanceRecordId,

      validated.params
        .attendanceBreakId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance break ended successfully",

    data: {
      attendanceBreak
    }
  });
}
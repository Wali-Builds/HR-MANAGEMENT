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
  AttendancePolicyAssignmentListQuery,
  AttendancePolicyListQuery,
  AttendanceStatusListQuery,
  CreateAttendancePolicyAssignmentInput,
  CreateAttendancePolicyInput,
  CreateAttendanceStatusInput,
  EffectiveAttendancePolicyQuery,
  UpdateAttendancePolicyAssignmentInput,
  UpdateAttendancePolicyInput,
  UpdateAttendanceStatusInput
} from "./attendance-policy.schema.js";

import {
  createAttendancePolicy,
  createAttendanceStatus,
  createEmployeeAttendancePolicyAssignment,
  deleteAttendancePolicy,
  deleteEmployeeAttendancePolicyAssignment,
  getAttendancePolicy,
  getAttendanceStatus,
  getEffectiveEmployeeAttendancePolicy,
  listAttendancePolicies,
  listAttendanceStatuses,
  listEmployeeAttendancePolicyAssignments,
  updateAttendancePolicy,
  updateAttendanceStatus,
  updateEmployeeAttendancePolicyAssignment
} from "./attendance-policy.service.js";

import type {
  RequestMetadata
} from "./attendance.types.js";

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
): RequestMetadata {
  return {
    ipAddress:
      request.ip ??
      null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

/*
 * =========================================================
 * Attendance-policy controllers
 * =========================================================
 */

export async function listAttendancePoliciesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendancePolicyListQuery;
    };

  const result =
    await listAttendancePolicies(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance policies retrieved successfully",

    data:
      result
  });
}

export async function getAttendancePolicyController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        policyId: string;
      };
    };

  const attendancePolicy =
    await getAttendancePolicy(
      validated.params.policyId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance policy retrieved successfully",

    data: {
      attendancePolicy
    }
  });
}

export async function createAttendancePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateAttendancePolicyInput;
    };

  const attendancePolicy =
    await createAttendancePolicy(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance policy created successfully",

    data: {
      attendancePolicy
    }
  });
}

export async function updateAttendancePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        policyId: string;
      };

      body:
        UpdateAttendancePolicyInput;
    };

  const attendancePolicy =
    await updateAttendancePolicy(
      validated.params.policyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance policy updated successfully",

    data: {
      attendancePolicy
    }
  });
}

export async function deleteAttendancePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        policyId: string;
      };
    };

  const attendancePolicy =
    await deleteAttendancePolicy(
      validated.params.policyId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance policy deleted successfully",

    data: {
      attendancePolicy
    }
  });
}

/*
 * =========================================================
 * Attendance-status controllers
 * =========================================================
 */

export async function listAttendanceStatusesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendanceStatusListQuery;
    };

  const result =
    await listAttendanceStatuses(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance statuses retrieved successfully",

    data:
      result
  });
}

export async function getAttendanceStatusController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        statusCode: string;
      };
    };

  const attendanceStatus =
    await getAttendanceStatus(
      validated.params.statusCode,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance status retrieved successfully",

    data: {
      attendanceStatus
    }
  });
}

export async function createAttendanceStatusController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateAttendanceStatusInput;
    };

  const attendanceStatus =
    await createAttendanceStatus(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance status created successfully",

    data: {
      attendanceStatus
    }
  });
}

export async function updateAttendanceStatusController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        statusCode: string;
      };

      body:
        UpdateAttendanceStatusInput;
    };

  const attendanceStatus =
    await updateAttendanceStatus(
      validated.params.statusCode,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance status updated successfully",

    data: {
      attendanceStatus
    }
  });
}

/*
 * =========================================================
 * Employee policy-assignment controllers
 * =========================================================
 */

export async function listEmployeeAttendancePolicyAssignmentsController(
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

  const result =
    await listEmployeeAttendancePolicyAssignments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee attendance-policy assignments retrieved successfully",

    data:
      result
  });
}

export async function createEmployeeAttendancePolicyAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateAttendancePolicyAssignmentInput;
    };

  const policyAssignment =
    await createEmployeeAttendancePolicyAssignment(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee attendance-policy assignment created successfully",

    data: {
      policyAssignment
    }
  });
}

export async function updateEmployeeAttendancePolicyAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        assignmentId: string;
      };

      body:
        UpdateAttendancePolicyAssignmentInput;
    };

  const policyAssignment =
    await updateEmployeeAttendancePolicyAssignment(
      validated.params.employeeId,
      validated.params.assignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee attendance-policy assignment updated successfully",

    data: {
      policyAssignment
    }
  });
}

export async function deleteEmployeeAttendancePolicyAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        assignmentId: string;
      };
    };

  const policyAssignment =
    await deleteEmployeeAttendancePolicyAssignment(
      validated.params.employeeId,
      validated.params.assignmentId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee attendance-policy assignment deleted successfully",

    data: {
      policyAssignment
    }
  });
}

export async function getEffectiveEmployeeAttendancePolicyController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EffectiveAttendancePolicyQuery;
    };

  const result =
    await getEffectiveEmployeeAttendancePolicy(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Effective employee attendance policy retrieved successfully",

    data:
      result
  });
}
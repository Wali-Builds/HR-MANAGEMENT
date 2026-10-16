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
  CreateEmployeeShiftAssignmentInput,
  CreateShiftInput,
  CreateWorkScheduleInput,
  EffectiveEmployeeShiftQuery,
  EmployeeShiftAssignmentListQuery,
  ReplaceWorkScheduleDaysInput,
  ShiftListQuery,
  UpdateEmployeeShiftAssignmentInput,
  UpdateShiftInput,
  UpdateWorkScheduleInput,
  WorkScheduleListQuery
} from "./attendance-scheduling.schema.js";

import {
  createEmployeeShiftAssignment,
  createShift,
  createWorkSchedule,
  deleteEmployeeShiftAssignment,
  deleteShift,
  deleteWorkSchedule,
  getEffectiveEmployeeShift,
  getShift,
  getWorkSchedule,
  listEmployeeShiftAssignments,
  listShifts,
  listWorkScheduleDays,
  listWorkSchedules,
  replaceWorkScheduleDays,
  updateEmployeeShiftAssignment,
  updateShift,
  updateWorkSchedule
} from "./attendance-scheduling.service.js";

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
 * Shift controllers
 * =========================================================
 */

export async function listShiftsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: ShiftListQuery;
    };

  const result =
    await listShifts(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Shifts retrieved successfully",

    data:
      result
  });
}

export async function getShiftController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        shiftId: string;
      };
    };

  const shift =
    await getShift(
      validated.params.shiftId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Shift retrieved successfully",

    data: {
      shift
    }
  });
}

export async function createShiftController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreateShiftInput;
    };

  const shift =
    await createShift(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Shift created successfully",

    data: {
      shift
    }
  });
}

export async function updateShiftController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        shiftId: string;
      };

      body: UpdateShiftInput;
    };

  const shift =
    await updateShift(
      validated.params.shiftId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Shift updated successfully",

    data: {
      shift
    }
  });
}

export async function deleteShiftController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        shiftId: string;
      };
    };

  const shift =
    await deleteShift(
      validated.params.shiftId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Shift deleted successfully",

    data: {
      shift
    }
  });
}

/*
 * =========================================================
 * Work-schedule controllers
 * =========================================================
 */

export async function listWorkSchedulesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: WorkScheduleListQuery;
    };

  const result =
    await listWorkSchedules(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Work schedules retrieved successfully",

    data:
      result
  });
}

export async function getWorkScheduleController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        scheduleId: string;
      };
    };

  const workSchedule =
    await getWorkSchedule(
      validated.params.scheduleId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Work schedule retrieved successfully",

    data: {
      workSchedule
    }
  });
}

export async function createWorkScheduleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateWorkScheduleInput;
    };

  const workSchedule =
    await createWorkSchedule(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Work schedule created successfully",

    data: {
      workSchedule
    }
  });
}

export async function updateWorkScheduleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        scheduleId: string;
      };

      body:
        UpdateWorkScheduleInput;
    };

  const workSchedule =
    await updateWorkSchedule(
      validated.params.scheduleId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Work schedule updated successfully",

    data: {
      workSchedule
    }
  });
}

export async function deleteWorkScheduleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        scheduleId: string;
      };
    };

  const workSchedule =
    await deleteWorkSchedule(
      validated.params.scheduleId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Work schedule deleted successfully",

    data: {
      workSchedule
    }
  });
}

export async function listWorkScheduleDaysController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        scheduleId: string;
      };
    };

  const days =
    await listWorkScheduleDays(
      validated.params.scheduleId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Work-schedule days retrieved successfully",

    data: {
      days
    }
  });
}

export async function replaceWorkScheduleDaysController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        scheduleId: string;
      };

      body:
        ReplaceWorkScheduleDaysInput;
    };

  const result =
    await replaceWorkScheduleDays(
      validated.params.scheduleId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Work-schedule days replaced successfully",

    data:
      result
  });
}

/*
 * =========================================================
 * Employee shift-assignment controllers
 * =========================================================
 */

export async function listEmployeeShiftAssignmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeShiftAssignmentListQuery;
    };

  const result =
    await listEmployeeShiftAssignments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee shift assignments retrieved successfully",

    data:
      result
  });
}

export async function createEmployeeShiftAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeShiftAssignmentInput;
    };

  const shiftAssignment =
    await createEmployeeShiftAssignment(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee shift assignment created successfully",

    data: {
      shiftAssignment
    }
  });
}

export async function updateEmployeeShiftAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        shiftAssignmentId: string;
      };

      body:
        UpdateEmployeeShiftAssignmentInput;
    };

  const shiftAssignment =
    await updateEmployeeShiftAssignment(
      validated.params.employeeId,
      validated.params
        .shiftAssignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee shift assignment updated successfully",

    data: {
      shiftAssignment
    }
  });
}

export async function deleteEmployeeShiftAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        shiftAssignmentId: string;
      };
    };

  const shiftAssignment =
    await deleteEmployeeShiftAssignment(
      validated.params.employeeId,
      validated.params
        .shiftAssignmentId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee shift assignment deleted successfully",

    data: {
      shiftAssignment
    }
  });
}

export async function getEffectiveEmployeeShiftController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EffectiveEmployeeShiftQuery;
    };

  const result =
    await getEffectiveEmployeeShift(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Effective employee shift retrieved successfully",

    data:
      result
  });
}
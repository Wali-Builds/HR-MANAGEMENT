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
  ApproveAttendanceAdjustmentInput,
  AttendanceAdjustmentRequestListQuery,
  CancelAttendanceAdjustmentInput,
  CreateAttendanceAdjustmentRequestInput,
  EmployeeAttendanceAdjustmentListQuery,
  RejectAttendanceAdjustmentInput,
  UpdateAttendanceAdjustmentRequestInput
} from "./attendance-adjustment.schema.js";

import {
  approveAttendanceAdjustmentRequest,
  cancelAttendanceAdjustmentRequest,
  createAttendanceAdjustmentRequest,
  getAttendanceAdjustmentRequest,
  listAttendanceAdjustmentApprovals,
  listAttendanceAdjustmentRequests,
  listEmployeeAttendanceAdjustments,
  rejectAttendanceAdjustmentRequest,
  updateAttendanceAdjustmentRequest
} from "./attendance-adjustment.service.js";

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
      request.ip ??
      null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

export async function listAttendanceAdjustmentRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        AttendanceAdjustmentRequestListQuery;
    };

  const result =
    await listAttendanceAdjustmentRequests(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment requests retrieved successfully",

    data:
      result
  });
}

export async function listEmployeeAttendanceAdjustmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeAttendanceAdjustmentListQuery;
    };

  const result =
    await listEmployeeAttendanceAdjustments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee attendance-adjustment requests retrieved successfully",

    data:
      result
  });
}

export async function getAttendanceAdjustmentRequestController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };
    };

  const adjustmentRequest =
    await getAttendanceAdjustmentRequest(
      validated.params
        .adjustmentRequestId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment request retrieved successfully",

    data: {
      adjustmentRequest
    }
  });
}

export async function createAttendanceAdjustmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateAttendanceAdjustmentRequestInput;
    };

  const adjustmentRequest =
    await createAttendanceAdjustmentRequest(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Attendance-adjustment request created successfully",

    data: {
      adjustmentRequest
    }
  });
}

export async function updateAttendanceAdjustmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };

      body:
        UpdateAttendanceAdjustmentRequestInput;
    };

  const adjustmentRequest =
    await updateAttendanceAdjustmentRequest(
      validated.params
        .adjustmentRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment request updated successfully",

    data: {
      adjustmentRequest
    }
  });
}

export async function listAttendanceAdjustmentApprovalsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };
    };

  const approvals =
    await listAttendanceAdjustmentApprovals(
      validated.params
        .adjustmentRequestId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment approvals retrieved successfully",

    data: {
      approvals
    }
  });
}

export async function cancelAttendanceAdjustmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };

      body:
        CancelAttendanceAdjustmentInput;
    };

  const adjustmentRequest =
    await cancelAttendanceAdjustmentRequest(
      validated.params
        .adjustmentRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment request cancelled successfully",

    data: {
      adjustmentRequest
    }
  });
}

export async function approveAttendanceAdjustmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };

      body:
        ApproveAttendanceAdjustmentInput;
    };

  const result =
    await approveAttendanceAdjustmentRequest(
      validated.params
        .adjustmentRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment request approved successfully",

    data:
      result
  });
}

export async function rejectAttendanceAdjustmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        adjustmentRequestId:
          string;
      };

      body:
        RejectAttendanceAdjustmentInput;
    };

  const result =
    await rejectAttendanceAdjustmentRequest(
      validated.params
        .adjustmentRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Attendance-adjustment request rejected successfully",

    data:
      result
  });
}
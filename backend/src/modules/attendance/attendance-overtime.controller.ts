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
  ApproveOvertimeRequestInput,
  CancelOvertimeRequestInput,
  CreateOvertimeRequestInput,
  EmployeeOvertimeRequestListQuery,
  OvertimeRequestListQuery,
  RejectOvertimeRequestInput,
  UpdateOvertimeRequestInput
} from "./attendance-overtime.schema.js";

import {
  approveOvertimeRequest,
  cancelOvertimeRequest,
  createOvertimeRequest,
  getOvertimeRequest,
  listEmployeeOvertimeRequests,
  listOvertimeRequests,
  rejectOvertimeRequest,
  updateOvertimeRequest
} from "./attendance-overtime.service.js";

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

export async function listOvertimeRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        OvertimeRequestListQuery;
    };

  const result =
    await listOvertimeRequests(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Overtime requests retrieved successfully",

    data:
      result
  });
}

export async function listEmployeeOvertimeRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeOvertimeRequestListQuery;
    };

  const result =
    await listEmployeeOvertimeRequests(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee overtime requests retrieved successfully",

    data:
      result
  });
}

export async function getOvertimeRequestController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        overtimeRequestId:
          string;
      };
    };

  const overtimeRequest =
    await getOvertimeRequest(
      validated.params
        .overtimeRequestId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Overtime request retrieved successfully",

    data: {
      overtimeRequest
    }
  });
}

export async function createOvertimeRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateOvertimeRequestInput;
    };

  const overtimeRequest =
    await createOvertimeRequest(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Overtime request created successfully",

    data: {
      overtimeRequest
    }
  });
}

export async function updateOvertimeRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        overtimeRequestId:
          string;
      };

      body:
        UpdateOvertimeRequestInput;
    };

  const overtimeRequest =
    await updateOvertimeRequest(
      validated.params
        .overtimeRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Overtime request updated successfully",

    data: {
      overtimeRequest
    }
  });
}

export async function cancelOvertimeRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        overtimeRequestId:
          string;
      };

      body:
        CancelOvertimeRequestInput;
    };

  const overtimeRequest =
    await cancelOvertimeRequest(
      validated.params
        .overtimeRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Overtime request cancelled successfully",

    data: {
      overtimeRequest
    }
  });
}

export async function approveOvertimeRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        overtimeRequestId:
          string;
      };

      body:
        ApproveOvertimeRequestInput;
    };

  const result =
    await approveOvertimeRequest(
      validated.params
        .overtimeRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Overtime request approved successfully",

    data:
      result
  });
}

export async function rejectOvertimeRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        overtimeRequestId:
          string;
      };

      body:
        RejectOvertimeRequestInput;
    };

  const result =
    await rejectOvertimeRequest(
      validated.params
        .overtimeRequestId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Overtime request rejected successfully",

    data:
      result
  });
}
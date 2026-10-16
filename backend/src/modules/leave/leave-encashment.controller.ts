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
  RequestMetadata
} from "../attendance/attendance.types.js";

import type {
  ApproveLeaveEncashmentRequestInput,
  CancelLeaveEncashmentRequestInput,
  CreateLeaveEncashmentRequestInput,
  EmployeeLeaveEncashmentRequestListQuery,
  LeaveEncashmentRequestListQuery,
  ProcessLeaveEncashmentRequestInput,
  RejectLeaveEncashmentRequestInput
} from "./leave-encashment.schema.js";

import {
  approveLeaveEncashmentRequest,
  cancelLeaveEncashmentRequest,
  createEmployeeLeaveEncashmentRequest,
  getLeaveEncashmentRequest,
  listEmployeeLeaveEncashmentRequests,
  listLeaveEncashmentRequests,
  processLeaveEncashmentRequest,
  rejectLeaveEncashmentRequest
} from "./leave-encashment.service.js";

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
      ) ??
      null
  };
}

export async function listLeaveEncashmentRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveEncashmentRequestListQuery;
    };

  const result =
    await listLeaveEncashmentRequests(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment requests retrieved successfully",

      data:
        result
    }
  );
}

export async function getLeaveEncashmentRequestController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        encashmentRequestId: string;
      };
    };

  const encashmentRequest =
    await getLeaveEncashmentRequest(
      validated.params.encashmentRequestId,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request retrieved successfully",

      data: {
        encashmentRequest
      }
    }
  );
}

export async function listEmployeeLeaveEncashmentRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeLeaveEncashmentRequestListQuery;
    };

  const result =
    await listEmployeeLeaveEncashmentRequests(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Employee leave encashment requests retrieved successfully",

      data:
        result
    }
  );
}

export async function createEmployeeLeaveEncashmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateLeaveEncashmentRequestInput;
    };

  const encashmentRequest =
    await createEmployeeLeaveEncashmentRequest(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(
    201
  );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request created successfully",

      data: {
        encashmentRequest
      }
    }
  );
}

export async function approveLeaveEncashmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        encashmentRequestId: string;
      };

      body:
        ApproveLeaveEncashmentRequestInput;
    };

  const result =
    await approveLeaveEncashmentRequest(
      validated.params.encashmentRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request approved and balance deducted successfully",

      data:
        result
    }
  );
}

export async function rejectLeaveEncashmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        encashmentRequestId: string;
      };

      body:
        RejectLeaveEncashmentRequestInput;
    };

  const encashmentRequest =
    await rejectLeaveEncashmentRequest(
      validated.params.encashmentRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request rejected successfully",

      data: {
        encashmentRequest
      }
    }
  );
}

export async function cancelLeaveEncashmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        encashmentRequestId: string;
      };

      body:
        CancelLeaveEncashmentRequestInput;
    };

  const encashmentRequest =
    await cancelLeaveEncashmentRequest(
      validated.params.encashmentRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request cancelled successfully",

      data: {
        encashmentRequest
      }
    }
  );
}

export async function processLeaveEncashmentRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        encashmentRequestId: string;
      };

      body:
        ProcessLeaveEncashmentRequestInput;
    };

  const encashmentRequest =
    await processLeaveEncashmentRequest(
      validated.params.encashmentRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave encashment request marked as payroll processed successfully",

      data: {
        encashmentRequest
      }
    }
  );
}

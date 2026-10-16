import type {
  Request,
  Response
} from "express";

import { AppError } from "../../common/errors/app-error.js";
import { sendSuccess } from "../../common/utils/api-response.js";

import type { AuthContext } from "../auth/auth.types.js";
import type { RequestMetadata } from "../attendance/attendance.types.js";

import type {
  ApproveLeaveRequestInput,
  CancelLeaveRequestInput,
  CreateLeaveRequestAttachmentInput,
  CreateLeaveRequestInput,
  EmployeeLeaveRequestListQuery,
  LeaveRequestListQuery,
  PendingLeaveApprovalListQuery,
  RejectLeaveRequestInput,
  SubmitLeaveRequestInput,
  UpdateLeaveRequestInput,
  WithdrawLeaveRequestInput
} from "./leave-request.schema.js";

import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createEmployeeLeaveRequest,
  createLeaveRequestAttachment,
  deleteLeaveRequestAttachment,
  getEmployeeLeaveRequest,
  getLeaveRequest,
  listEmployeeLeaveRequests,
  listLeaveRequestApprovals,
  listLeaveRequestAttachments,
  listLeaveRequestDays,
  listLeaveRequests,
  listPendingLeaveApprovals,
  rejectLeaveRequest,
  submitLeaveRequest,
  updateLeaveRequest,
  withdrawLeaveRequest
} from "./leave-request.service.js";

function getAuthContext(
  response: Response
): AuthContext {
  const auth =
    response.locals.auth as
      | AuthContext
      | undefined;

  if (!auth) {
    throw new AppError({
      message: "Authentication is required",
      statusCode: 401,
      code: "AUTHENTICATION_REQUIRED"
    });
  }

  return auth;
}

function getRequestMetadata(
  request: Request
): RequestMetadata {
  return {
    ipAddress: request.ip ?? null,
    userAgent:
      request.get("user-agent") ?? null
  };
}

/*
 * =========================================================
 * Company request controllers
 * =========================================================
 */

export async function listLeaveRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: LeaveRequestListQuery;
    };

  const result =
    await listLeaveRequests(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave requests retrieved successfully",
    data: result
  });
}

export async function getLeaveRequestController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      query: {
        includeDetails: boolean;
      };
    };

  const leaveRequest =
    await getLeaveRequest(
      validated.params.leaveRequestId,
      validated.query.includeDetails,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave request retrieved successfully",

    data: {
      leaveRequest
    }
  });
}

export async function updateLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      body: UpdateLeaveRequestInput;
    };

  const leaveRequest =
    await updateLeaveRequest(
      validated.params.leaveRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave request updated successfully",

    data: {
      leaveRequest
    }
  });
}

export async function submitLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      body: SubmitLeaveRequestInput;
    };

  const result =
    await submitLeaveRequest(
      validated.params.leaveRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      result.request.requestStatus === "APPROVED"
        ? "Leave request submitted and automatically approved"
        : "Leave request submitted successfully",

    data: result
  });
}

export async function cancelLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      body: CancelLeaveRequestInput;
    };

  const result =
    await cancelLeaveRequest(
      validated.params.leaveRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave request cancelled successfully",
    data: result
  });
}

export async function withdrawLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      body: WithdrawLeaveRequestInput;
    };

  const result =
    await withdrawLeaveRequest(
      validated.params.leaveRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave request withdrawn successfully",
    data: result
  });
}

/*
 * =========================================================
 * Employee request controllers
 * =========================================================
 */

export async function listEmployeeLeaveRequestsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeLeaveRequestListQuery;
    };

  const result =
    await listEmployeeLeaveRequests(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave requests retrieved successfully",
    data: result
  });
}

export async function createEmployeeLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body: CreateLeaveRequestInput;
    };

  const leaveRequest =
    await createEmployeeLeaveRequest(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave request created successfully",

    data: {
      leaveRequest
    }
  });
}

export async function getEmployeeLeaveRequestController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        leaveRequestId: string;
      };

      query: {
        includeDetails: boolean;
      };
    };

  const leaveRequest =
    await getEmployeeLeaveRequest(
      validated.params.employeeId,
      validated.params.leaveRequestId,
      validated.query.includeDetails,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave request retrieved successfully",

    data: {
      leaveRequest
    }
  });
}

/*
 * =========================================================
 * Request-day controllers
 * =========================================================
 */

export async function listLeaveRequestDaysController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };
    };

  const result =
    await listLeaveRequestDays(
      validated.params.leaveRequestId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-request days retrieved successfully",
    data: result
  });
}

/*
 * =========================================================
 * Attachment controllers
 * =========================================================
 */

export async function listLeaveRequestAttachmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };
    };

  const result =
    await listLeaveRequestAttachments(
      validated.params.leaveRequestId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-request attachments retrieved successfully",
    data: result
  });
}

export async function createLeaveRequestAttachmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };

      body:
        CreateLeaveRequestAttachmentInput;
    };

  const attachment =
    await createLeaveRequestAttachment(
      validated.params.leaveRequestId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave-request attachment created successfully",

    data: {
      attachment
    }
  });
}

export async function deleteLeaveRequestAttachmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
        attachmentId: string;
      };
    };

  const attachment =
    await deleteLeaveRequestAttachment(
      validated.params.leaveRequestId,
      validated.params.attachmentId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave-request attachment deleted successfully",

    data: {
      attachment
    }
  });
}

/*
 * =========================================================
 * Approval controllers
 * =========================================================
 */

export async function listPendingLeaveApprovalsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        PendingLeaveApprovalListQuery;
    };

  const result =
    await listPendingLeaveApprovals(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Pending leave approvals retrieved successfully",
    data: result
  });
}

export async function listLeaveRequestApprovalsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
      };
    };

  const result =
    await listLeaveRequestApprovals(
      validated.params.leaveRequestId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-request approvals retrieved successfully",
    data: result
  });
}

export async function approveLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
        leaveApprovalId: string;
      };

      body:
        ApproveLeaveRequestInput;
    };

  const result =
    await approveLeaveRequest(
      validated.params.leaveRequestId,
      validated.params.leaveApprovalId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      result.finalized
        ? "Leave request finally approved"
        : "Leave approval level approved successfully",

    data: result
  });
}

export async function rejectLeaveRequestController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveRequestId: string;
        leaveApprovalId: string;
      };

      body:
        RejectLeaveRequestInput;
    };

  const result =
    await rejectLeaveRequest(
      validated.params.leaveRequestId,
      validated.params.leaveApprovalId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave request rejected successfully",
    data: result
  });
}
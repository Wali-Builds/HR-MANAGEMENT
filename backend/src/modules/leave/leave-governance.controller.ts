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
  ApplicableLeaveBlackoutQuery,
  CreateLeaveApprovalDelegationInput,
  CreateLeaveBlackoutPeriodInput,
  LeaveApprovalDelegationListQuery,
  LeaveBlackoutPeriodListQuery,
  UpdateLeaveApprovalDelegationInput,
  UpdateLeaveBlackoutPeriodInput
} from "./leave-governance.schema.js";

import {
  createLeaveApprovalDelegation,
  createLeaveBlackoutPeriod,
  deactivateLeaveApprovalDelegation,
  deactivateLeaveBlackoutPeriod,
  getLeaveApprovalDelegation,
  getLeaveBlackoutPeriod,
  listLeaveApprovalDelegations,
  listLeaveBlackoutPeriods,
  previewApplicableLeaveBlackouts,
  updateLeaveApprovalDelegation,
  updateLeaveBlackoutPeriod
} from "./leave-governance.service.js";

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

/*
 * =========================================================
 * Approval delegation controllers
 * =========================================================
 */

export async function listLeaveApprovalDelegationsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveApprovalDelegationListQuery;
    };

  const result =
    await listLeaveApprovalDelegations(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave approval delegations retrieved successfully",

    data:
      result
  });
}

export async function getLeaveApprovalDelegationController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        delegationId: string;
      };
    };

  const delegation =
    await getLeaveApprovalDelegation(
      validated.params.delegationId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave approval delegation retrieved successfully",

    data: {
      delegation
    }
  });
}

export async function createLeaveApprovalDelegationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeaveApprovalDelegationInput;
    };

  const delegation =
    await createLeaveApprovalDelegation(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave approval delegation created successfully",

    data: {
      delegation
    }
  });
}

export async function updateLeaveApprovalDelegationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        delegationId: string;
      };

      body:
        UpdateLeaveApprovalDelegationInput;
    };

  const delegation =
    await updateLeaveApprovalDelegation(
      validated.params.delegationId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave approval delegation updated successfully",

    data: {
      delegation
    }
  });
}

export async function deactivateLeaveApprovalDelegationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        delegationId: string;
      };
    };

  const delegation =
    await deactivateLeaveApprovalDelegation(
      validated.params.delegationId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave approval delegation deactivated successfully",

    data: {
      delegation
    }
  });
}

/*
 * =========================================================
 * Blackout-period controllers
 * =========================================================
 */

export async function listLeaveBlackoutPeriodsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveBlackoutPeriodListQuery;
    };

  const result =
    await listLeaveBlackoutPeriods(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave blackout periods retrieved successfully",

    data:
      result
  });
}

export async function previewApplicableLeaveBlackoutsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        ApplicableLeaveBlackoutQuery;
    };

  const result =
    await previewApplicableLeaveBlackouts(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Applicable leave blackout periods retrieved successfully",

    data:
      result
  });
}

export async function getLeaveBlackoutPeriodController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        blackoutPeriodId: string;
      };
    };

  const blackoutPeriod =
    await getLeaveBlackoutPeriod(
      validated.params.blackoutPeriodId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave blackout period retrieved successfully",

    data: {
      blackoutPeriod
    }
  });
}

export async function createLeaveBlackoutPeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeaveBlackoutPeriodInput;
    };

  const blackoutPeriod =
    await createLeaveBlackoutPeriod(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave blackout period created successfully",

    data: {
      blackoutPeriod
    }
  });
}

export async function updateLeaveBlackoutPeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        blackoutPeriodId: string;
      };

      body:
        UpdateLeaveBlackoutPeriodInput;
    };

  const blackoutPeriod =
    await updateLeaveBlackoutPeriod(
      validated.params.blackoutPeriodId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave blackout period updated successfully",

    data: {
      blackoutPeriod
    }
  });
}

export async function deactivateLeaveBlackoutPeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        blackoutPeriodId: string;
      };
    };

  const blackoutPeriod =
    await deactivateLeaveBlackoutPeriod(
      validated.params.blackoutPeriodId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave blackout period deactivated successfully",

    data: {
      blackoutPeriod
    }
  });
}
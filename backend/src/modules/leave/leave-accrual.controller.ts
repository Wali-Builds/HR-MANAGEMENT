import type {
  Request,
  Response
} from "express";

import { AppError } from "../../common/errors/app-error.js";
import { sendSuccess } from "../../common/utils/api-response.js";

import type { AuthContext } from "../auth/auth.types.js";

import type {
  RequestMetadata
} from "../attendance/attendance.types.js";

import type {
  CancelLeaveAccrualRunInput,
  CancelLeaveCarryForwardRunInput,
  CreateLeaveAccrualRunInput,
  CreateLeaveCarryForwardRunInput,
  LeaveAccrualPreviewInput,
  LeaveAccrualRunDetailListQuery,
  LeaveAccrualRunListQuery,
  LeaveBalanceExpiryListQuery,
  LeaveCarryForwardPreviewInput,
  LeaveCarryForwardRunDetailListQuery,
  LeaveCarryForwardRunListQuery,
  ProcessLeaveAccrualRunInput,
  ProcessLeaveBalanceExpiryInput,
  ProcessLeaveCarryForwardRunInput
} from "./leave-accrual.schema.js";

import {
  cancelLeaveAccrualRun,
  cancelLeaveCarryForwardRun,
  createLeaveAccrualRun,
  createLeaveCarryForwardRun,
  getLeaveAccrualRun,
  getLeaveCarryForwardRun,
  listLeaveAccrualRunDetails,
  listLeaveAccrualRuns,
  listLeaveBalanceExpiries,
  listLeaveCarryForwardRunDetails,
  listLeaveCarryForwardRuns,
  previewLeaveAccrual,
  previewLeaveCarryForward,
  processLeaveAccrualRun,
  processLeaveBalanceExpiries,
  processLeaveCarryForwardRun
} from "./leave-accrual.service.js";

function getAuthContext(
  response:
    Response
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
  request:
    Request
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
 * Accrual-run controllers
 * =========================================================
 */

export async function listLeaveAccrualRunsController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveAccrualRunListQuery;
    };

  const result =
    await listLeaveAccrualRuns(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual runs retrieved successfully",
      data:
        result
    }
  );
}

export async function getLeaveAccrualRunController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        accrualRunId: string;
      };
    };

  const accrualRun =
    await getLeaveAccrualRun(
      validated.params.accrualRunId,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual run retrieved successfully",

      data: {
        accrualRun
      }
    }
  );
}

export async function listLeaveAccrualRunDetailsController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        accrualRunId: string;
      };

      query:
        LeaveAccrualRunDetailListQuery;
    };

  const result =
    await listLeaveAccrualRunDetails(
      validated.params.accrualRunId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual run details retrieved successfully",
      data:
        result
    }
  );
}

export async function previewLeaveAccrualController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        LeaveAccrualPreviewInput;
    };

  const preview =
    await previewLeaveAccrual(
      validated.body,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual preview generated successfully",

      data: {
        preview
      }
    }
  );
}

export async function createLeaveAccrualRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeaveAccrualRunInput;
    };

  const accrualRun =
    await createLeaveAccrualRun(
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
        "Leave accrual run created successfully",

      data: {
        accrualRun
      }
    }
  );
}

export async function processLeaveAccrualRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        accrualRunId: string;
      };

      body:
        ProcessLeaveAccrualRunInput;
    };

  const result =
    await processLeaveAccrualRun(
      validated.params.accrualRunId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual run processed successfully",
      data:
        result
    }
  );
}

export async function cancelLeaveAccrualRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        accrualRunId: string;
      };

      body:
        CancelLeaveAccrualRunInput;
    };

  const accrualRun =
    await cancelLeaveAccrualRun(
      validated.params.accrualRunId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave accrual run cancelled successfully",

      data: {
        accrualRun
      }
    }
  );
}

/*
 * =========================================================
 * Carry-forward controllers
 * =========================================================
 */

export async function listLeaveCarryForwardRunsController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveCarryForwardRunListQuery;
    };

  const result =
    await listLeaveCarryForwardRuns(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward runs retrieved successfully",
      data:
        result
    }
  );
}

export async function getLeaveCarryForwardRunController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        carryForwardRunId: string;
      };
    };

  const carryForwardRun =
    await getLeaveCarryForwardRun(
      validated.params.carryForwardRunId,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward run retrieved successfully",

      data: {
        carryForwardRun
      }
    }
  );
}

export async function listLeaveCarryForwardRunDetailsController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        carryForwardRunId: string;
      };

      query:
        LeaveCarryForwardRunDetailListQuery;
    };

  const result =
    await listLeaveCarryForwardRunDetails(
      validated.params.carryForwardRunId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward run details retrieved successfully",
      data:
        result
    }
  );
}

export async function previewLeaveCarryForwardController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };

      body:
        LeaveCarryForwardPreviewInput;
    };

  const preview =
    await previewLeaveCarryForward(
      validated.params.leavePeriodId,
      validated.body,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward preview generated successfully",

      data: {
        preview
      }
    }
  );
}

export async function createLeaveCarryForwardRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };

      body:
        CreateLeaveCarryForwardRunInput;
    };

  const carryForwardRun =
    await createLeaveCarryForwardRun(
      validated.params.leavePeriodId,
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
        "Leave carry-forward run created successfully",

      data: {
        carryForwardRun
      }
    }
  );
}

export async function processLeaveCarryForwardRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        carryForwardRunId: string;
      };

      body:
        ProcessLeaveCarryForwardRunInput;
    };

  const result =
    await processLeaveCarryForwardRun(
      validated.params.carryForwardRunId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward run processed successfully",
      data:
        result
    }
  );
}

export async function cancelLeaveCarryForwardRunController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        carryForwardRunId: string;
      };

      body:
        CancelLeaveCarryForwardRunInput;
    };

  const carryForwardRun =
    await cancelLeaveCarryForwardRun(
      validated.params.carryForwardRunId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave carry-forward run cancelled successfully",

      data: {
        carryForwardRun
      }
    }
  );
}

/*
 * =========================================================
 * Expiry controllers
 * =========================================================
 */

export async function listLeaveBalanceExpiriesController(
  _request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveBalanceExpiryListQuery;
    };

  const result =
    await listLeaveBalanceExpiries(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(
    response,
    {
      message:
        "Leave balance expiries retrieved successfully",
      data:
        result
    }
  );
}

export async function processLeaveBalanceExpiriesController(
  request:
    Request,
  response:
    Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };

      body:
        ProcessLeaveBalanceExpiryInput;
    };

  const result =
    await processLeaveBalanceExpiries(
      validated.params.leavePeriodId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(
    response,
    {
      message:
        validated.body.dryRun
          ? "Leave balance expiry preview generated successfully"
          : "Leave balance expiries processed successfully",

      data:
        result
    }
  );
}

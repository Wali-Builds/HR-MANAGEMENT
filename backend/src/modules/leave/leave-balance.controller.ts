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
  BulkRecalculateLeaveBalancesInput,
  CloseAndOpenNextLeavePeriodInput,
  CreateLeaveBalanceAdjustmentInput,
  CreateLeavePeriodInput,
  EmployeeLeaveBalanceListQuery,
  EmployeeLeaveBalanceTransactionListQuery,
  EmployeeLeaveTypeBalanceQuery,
  InitializeEmployeeLeaveBalanceInput,
  LeaveBalanceListQuery,
  LeaveBalanceTransactionListQuery,
  LeavePeriodListQuery,
  RecalculateLeaveBalanceInput,
  UpdateLeavePeriodInput
} from "./leave-balance.schema.js";

import {
  bulkRecalculateLeaveBalances,
  closeAndOpenNextLeavePeriod,
  closeLeavePeriod,
  createEmployeeLeaveBalanceAdjustment,
  createLeavePeriod,
  deleteLeavePeriod,
  getEmployeeLeaveTypeBalance,
  getLeaveBalance,
  getLeavePeriod,
  initializeEmployeeLeaveBalance,
  listEmployeeLeaveBalances,
  listEmployeeLeaveBalanceTransactions,
  listLeaveBalances,
  listLeaveBalanceTransactions,
  listLeavePeriods,
  recalculateLeaveBalance,
  reopenLeavePeriod,
  updateLeavePeriod
} from "./leave-balance.service.js";

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
 * Leave-period controllers
 * =========================================================
 */

export async function listLeavePeriodsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeavePeriodListQuery;
    };

  const result =
    await listLeavePeriods(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave periods retrieved successfully",

    data:
      result
  });
}

export async function getLeavePeriodController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };
    };

  const leavePeriod =
    await getLeavePeriod(
      validated.params.leavePeriodId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave period retrieved successfully",

    data: {
      leavePeriod
    }
  });
}

export async function createLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeavePeriodInput;
    };

  const leavePeriod =
    await createLeavePeriod(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave period created successfully",

    data: {
      leavePeriod
    }
  });
}

export async function updateLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };

      body:
        UpdateLeavePeriodInput;
    };

  const leavePeriod =
    await updateLeavePeriod(
      validated.params.leavePeriodId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave period updated successfully",

    data: {
      leavePeriod
    }
  });
}


export async function closeAndOpenNextLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };

      body:
        CloseAndOpenNextLeavePeriodInput;
    };

  const result =
    await closeAndOpenNextLeavePeriod(
      validated.params.leavePeriodId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave period closed and next period confirmed open successfully",

    data:
      result
  });
}

export async function closeLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };
    };

  const leavePeriod =
    await closeLeavePeriod(
      validated.params.leavePeriodId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave period closed successfully",

    data: {
      leavePeriod
    }
  });
}

export async function reopenLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };
    };

  const leavePeriod =
    await reopenLeavePeriod(
      validated.params.leavePeriodId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave period reopened successfully",

    data: {
      leavePeriod
    }
  });
}

export async function deleteLeavePeriodController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePeriodId: string;
      };
    };

  const leavePeriod =
    await deleteLeavePeriod(
      validated.params.leavePeriodId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave period deleted successfully",

    data: {
      leavePeriod
    }
  });
}

/*
 * =========================================================
 * Leave-balance controllers
 * =========================================================
 */

export async function listLeaveBalancesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveBalanceListQuery;
    };

  const result =
    await listLeaveBalances(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave balances retrieved successfully",

    data:
      result
  });
}

export async function getLeaveBalanceController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveBalanceId: string;
      };
    };

  const balance =
    await getLeaveBalance(
      validated.params.leaveBalanceId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave balance retrieved successfully",

    data: {
      balance
    }
  });
}

export async function listEmployeeLeaveBalancesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeLeaveBalanceListQuery;
    };

  const result =
    await listEmployeeLeaveBalances(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave balances retrieved successfully",

    data:
      result
  });
}

export async function getEmployeeLeaveTypeBalanceController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        leaveTypeId: string;
      };

      query:
        EmployeeLeaveTypeBalanceQuery;
    };

  const balance =
    await getEmployeeLeaveTypeBalance(
      validated.params.employeeId,
      validated.params.leaveTypeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave balance retrieved successfully",

    data: {
      balance
    }
  });
}

export async function initializeEmployeeLeaveBalanceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        InitializeEmployeeLeaveBalanceInput;
    };

  const balance =
    await initializeEmployeeLeaveBalance(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee leave balance initialized successfully",

    data: {
      balance
    }
  });
}

export async function createEmployeeLeaveBalanceAdjustmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateLeaveBalanceAdjustmentInput;
    };

  const result =
    await createEmployeeLeaveBalanceAdjustment(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave balance adjusted successfully",

    data:
      result
  });
}

/*
 * =========================================================
 * Transaction controllers
 * =========================================================
 */

export async function listLeaveBalanceTransactionsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveBalanceTransactionListQuery;
    };

  const result =
    await listLeaveBalanceTransactions(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-balance transactions retrieved successfully",

    data:
      result
  });
}

export async function listEmployeeLeaveBalanceTransactionsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeLeaveBalanceTransactionListQuery;
    };

  const result =
    await listEmployeeLeaveBalanceTransactions(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave-balance transactions retrieved successfully",

    data:
      result
  });
}

/*
 * =========================================================
 * Recalculation controllers
 * =========================================================
 */

export async function recalculateLeaveBalanceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveBalanceId: string;
      };

      body:
        RecalculateLeaveBalanceInput;
    };

  const result =
    await recalculateLeaveBalance(
      validated.params.leaveBalanceId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      validated.body.repair
        ? "Leave balance recalculated successfully"
        : "Leave balance validated successfully",

    data:
      result
  });
}

export async function bulkRecalculateLeaveBalancesController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        BulkRecalculateLeaveBalancesInput;
    };

  const result =
    await bulkRecalculateLeaveBalances(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      validated.body.repair
        ? "Leave balances recalculated successfully"
        : "Leave balances validated successfully",

    data:
      result
  });
}
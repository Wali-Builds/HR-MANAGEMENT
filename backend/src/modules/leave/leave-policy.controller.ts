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
  CreateEmployeeLeavePolicyAssignmentInput,
  CreateLeavePolicyInput,
  CreateLeavePolicyRuleInput,
  CreateLeaveTypeInput,
  EffectiveEmployeeLeavePolicyQuery,
  EmployeeLeavePolicyAssignmentListQuery,
  LeavePolicyListQuery,
  LeavePolicyRuleListQuery,
  LeaveTypeListQuery,
  UpdateEmployeeLeavePolicyAssignmentInput,
  UpdateLeavePolicyInput,
  UpdateLeavePolicyRuleInput,
  UpdateLeaveTypeInput
} from "./leave-policy.schema.js";

import {
  createEmployeeLeavePolicyAssignment,
  createLeavePolicy,
  createLeavePolicyRule,
  createLeaveType,
  deleteEmployeeLeavePolicyAssignment,
  deleteLeavePolicy,
  deleteLeavePolicyRule,
  deleteLeaveType,
  getEffectiveEmployeeLeavePolicy,
  getLeavePolicy,
  getLeavePolicyRule,
  getLeaveType,
  listEmployeeLeavePolicyAssignments,
  listLeavePolicies,
  listLeavePolicyRules,
  listLeaveTypes,
  updateEmployeeLeavePolicyAssignment,
  updateLeavePolicy,
  updateLeavePolicyRule,
  updateLeaveType
} from "./leave-policy.service.js";

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
 * Leave-type controllers
 * =========================================================
 */

export async function listLeaveTypesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeaveTypeListQuery;
    };

  const result =
    await listLeaveTypes(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave types retrieved successfully",

    data:
      result
  });
}

export async function getLeaveTypeController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveTypeId: string;
      };
    };

  const leaveType =
    await getLeaveType(
      validated.params.leaveTypeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave type retrieved successfully",

    data: {
      leaveType
    }
  });
}

export async function createLeaveTypeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeaveTypeInput;
    };

  const leaveType =
    await createLeaveType(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave type created successfully",

    data: {
      leaveType
    }
  });
}

export async function updateLeaveTypeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveTypeId: string;
      };

      body:
        UpdateLeaveTypeInput;
    };

  const leaveType =
    await updateLeaveType(
      validated.params.leaveTypeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave type updated successfully",

    data: {
      leaveType
    }
  });
}

export async function deleteLeaveTypeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leaveTypeId: string;
      };
    };

  const leaveType =
    await deleteLeaveType(
      validated.params.leaveTypeId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave type deleted successfully",

    data: {
      leaveType
    }
  });
}

/*
 * =========================================================
 * Leave-policy controllers
 * =========================================================
 */

export async function listLeavePoliciesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        LeavePolicyListQuery;
    };

  const result =
    await listLeavePolicies(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave policies retrieved successfully",

    data:
      result
  });
}

export async function getLeavePolicyController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
      };
    };

  const leavePolicy =
    await getLeavePolicy(
      validated.params.leavePolicyId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave policy retrieved successfully",

    data: {
      leavePolicy
    }
  });
}

export async function createLeavePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateLeavePolicyInput;
    };

  const leavePolicy =
    await createLeavePolicy(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave policy created successfully",

    data: {
      leavePolicy
    }
  });
}

export async function updateLeavePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
      };

      body:
        UpdateLeavePolicyInput;
    };

  const leavePolicy =
    await updateLeavePolicy(
      validated.params.leavePolicyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave policy updated successfully",

    data: {
      leavePolicy
    }
  });
}

export async function deleteLeavePolicyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
      };
    };

  const leavePolicy =
    await deleteLeavePolicy(
      validated.params.leavePolicyId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave policy deleted successfully",

    data: {
      leavePolicy
    }
  });
}

/*
 * =========================================================
 * Leave-policy-rule controllers
 * =========================================================
 */

export async function listLeavePolicyRulesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
      };

      query:
        LeavePolicyRuleListQuery;
    };

  const result =
    await listLeavePolicyRules(
      validated.params.leavePolicyId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-policy rules retrieved successfully",

    data:
      result
  });
}

export async function getLeavePolicyRuleController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
        leavePolicyRuleId: string;
      };
    };

  const rule =
    await getLeavePolicyRule(
      validated.params.leavePolicyId,
      validated.params.leavePolicyRuleId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Leave-policy rule retrieved successfully",

    data: {
      rule
    }
  });
}

export async function createLeavePolicyRuleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
      };

      body:
        CreateLeavePolicyRuleInput;
    };

  const rule =
    await createLeavePolicyRule(
      validated.params.leavePolicyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Leave-policy rule created successfully",

    data: {
      rule
    }
  });
}

export async function updateLeavePolicyRuleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
        leavePolicyRuleId: string;
      };

      body:
        UpdateLeavePolicyRuleInput;
    };

  const rule =
    await updateLeavePolicyRule(
      validated.params.leavePolicyId,
      validated.params.leavePolicyRuleId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave-policy rule updated successfully",

    data: {
      rule
    }
  });
}

export async function deleteLeavePolicyRuleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        leavePolicyId: string;
        leavePolicyRuleId: string;
      };
    };

  const rule =
    await deleteLeavePolicyRule(
      validated.params.leavePolicyId,
      validated.params.leavePolicyRuleId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Leave-policy rule deleted successfully",

    data: {
      rule
    }
  });
}

/*
 * =========================================================
 * Employee assignment controllers
 * =========================================================
 */

export async function listEmployeeLeavePolicyAssignmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeLeavePolicyAssignmentListQuery;
    };

  const result =
    await listEmployeeLeavePolicyAssignments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee leave-policy assignments retrieved successfully",

    data:
      result
  });
}

export async function createEmployeeLeavePolicyAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeLeavePolicyAssignmentInput;
    };

  const assignment =
    await createEmployeeLeavePolicyAssignment(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee leave-policy assignment created successfully",

    data: {
      assignment
    }
  });
}

export async function updateEmployeeLeavePolicyAssignmentController(
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
        UpdateEmployeeLeavePolicyAssignmentInput;
    };

  const assignment =
    await updateEmployeeLeavePolicyAssignment(
      validated.params.employeeId,
      validated.params.assignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee leave-policy assignment updated successfully",

    data: {
      assignment
    }
  });
}

export async function deleteEmployeeLeavePolicyAssignmentController(
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

  const assignment =
    await deleteEmployeeLeavePolicyAssignment(
      validated.params.employeeId,
      validated.params.assignmentId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee leave-policy assignment deleted successfully",

    data: {
      assignment
    }
  });
}

export async function getEffectiveEmployeeLeavePolicyController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EffectiveEmployeeLeavePolicyQuery;
    };

  const result =
    await getEffectiveEmployeeLeavePolicy(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Effective employee leave policy retrieved successfully",

    data:
      result
  });
}
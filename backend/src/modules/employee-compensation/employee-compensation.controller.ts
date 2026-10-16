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
  CloseEmployeeSalaryComponentInput,
  CloseSalaryAssignmentInput,
  CompensationLookupQuery,
  CreateEmployeeSalaryComponentInput,
  CreateSalaryAssignmentInput,
  EmployeeSalaryComponentListQuery,
  SalaryAssignmentListQuery,
  UpdateEmployeeSalaryComponentInput,
  UpdateSalaryAssignmentInput
} from "./employee-compensation.schema.js";

import {
  approveSalaryAssignment,
  closeSalaryAssignment,
  closeSalaryComponent,
  createSalaryAssignment,
  createSalaryComponent,
  getCompensationLookups,
  getSalaryAssignment,
  listSalaryAssignments,
  listSalaryComponents,
  updateSalaryAssignment,
  updateSalaryComponent
} from "./employee-compensation.service.js";

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
      request.ip ?? null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

export async function getCompensationLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        CompensationLookupQuery;
    };

  const lookups =
    await getCompensationLookups(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee compensation lookups retrieved successfully",

    data:
      lookups
  });
}

export async function listSalaryAssignmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        SalaryAssignmentListQuery;
    };

  const salaryAssignments =
    await listSalaryAssignments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee salary assignments retrieved successfully",

    data: {
      salaryAssignments
    }
  });
}

export async function getSalaryAssignmentController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };
    };

  const salaryAssignment =
    await getSalaryAssignment(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee salary assignment retrieved successfully",

    data: {
      salaryAssignment
    }
  });
}

export async function createSalaryAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateSalaryAssignmentInput;
    };

  const salaryAssignment =
    await createSalaryAssignment(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee salary assignment created successfully",

    data: {
      salaryAssignment
    }
  });
}

export async function updateSalaryAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };

      body:
        UpdateSalaryAssignmentInput;
    };

  const salaryAssignment =
    await updateSalaryAssignment(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee salary assignment updated successfully",

    data: {
      salaryAssignment
    }
  });
}

export async function closeSalaryAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };

      body:
        CloseSalaryAssignmentInput;
    };

  const salaryAssignment =
    await closeSalaryAssignment(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee salary assignment closed successfully",

    data: {
      salaryAssignment
    }
  });
}

export async function approveSalaryAssignmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };
    };

  const salaryAssignment =
    await approveSalaryAssignment(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee salary assignment approved successfully",

    data: {
      salaryAssignment
    }
  });
}

export async function listSalaryComponentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };

      query:
        EmployeeSalaryComponentListQuery;
    };

  const salaryComponents =
    await listSalaryComponents(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee salary components retrieved successfully",

    data: {
      salaryComponents
    }
  });
}

export async function createSalaryComponentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
      };

      body:
        CreateEmployeeSalaryComponentInput;
    };

  const salaryComponent =
    await createSalaryComponent(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee salary component created successfully",

    data: {
      salaryComponent
    }
  });
}

export async function updateSalaryComponentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
        employeeSalaryComponentId:
          string;
      };

      body:
        UpdateEmployeeSalaryComponentInput;
    };

  const salaryComponent =
    await updateSalaryComponent(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.params.employeeSalaryComponentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee salary component updated successfully",

    data: {
      salaryComponent
    }
  });
}

export async function closeSalaryComponentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        salaryAssignmentId: string;
        employeeSalaryComponentId:
          string;
      };

      body:
        CloseEmployeeSalaryComponentInput;
    };

  const salaryComponent =
    await closeSalaryComponent(
      validated.params.employeeId,
      validated.params.salaryAssignmentId,
      validated.params.employeeSalaryComponentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee salary component closed successfully",

    data: {
      salaryComponent
    }
  });
}
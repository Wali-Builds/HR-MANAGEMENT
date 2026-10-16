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
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput
} from "./employee.schema.js";

import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getMyEmployeeProfile,
  getEmployeeLookupData,
  listEmployees,
  updateEmployee
} from "./employee.service.js";

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

export async function getEmployeeLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const lookups =
    await getEmployeeLookupData();

  sendSuccess(response, {
    message:
      "Employee lookups retrieved successfully",

    data: lookups
  });
}

export async function listEmployeesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        EmployeeListQuery;
    };

  const result =
    await listEmployees(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employees retrieved successfully",

    data:
      result
  });
}

export async function getEmployeeController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const employee =
    await getEmployee(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee retrieved successfully",

    data: {
      employee
    }
  });
}

// edited by wali: Return the authenticated employee's expanded self-service profile.
export async function getMyEmployeeProfileController(
  _request: Request,
  response: Response
): Promise<void> {
  const profile = await getMyEmployeeProfile(
    getAuthContext(response)
  );

  sendSuccess(response, {
    message: "Employee profile retrieved successfully",
    data: { profile }
  });
}

export async function createEmployeeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateEmployeeInput;
    };

  const employee =
    await createEmployee(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee created successfully",

    data: {
      employee
    }
  });
}

export async function updateEmployeeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        UpdateEmployeeInput;
    };

  const employee =
    await updateEmployee(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee updated successfully",

    data: {
      employee
    }
  });
}

export async function deleteEmployeeController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  await deleteEmployee(
    validated.params.employeeId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee deleted successfully",

    data: null
  });
}

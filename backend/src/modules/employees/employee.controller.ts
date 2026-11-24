import type {
  Request,
  Response
} from "express";
import { readFile } from "node:fs/promises";

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
  getNextEmployeeCode,
  getEmployeeProfilePhoto,
  listEmployees,
  updateEmployee,
  uploadEmployeeProfilePhoto
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

export async function getNextEmployeeCodeController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated = response.locals.validated as {
    query: { companyId?: string };
  };
  const employeeCode = await getNextEmployeeCode(
    validated.query.companyId,
    getAuthContext(response)
  );
  sendSuccess(response, {
    message: "Next employee ID retrieved successfully",
    data: { employeeCode }
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

export async function getEmployeeProfilePhotoController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated = response.locals.validated as { params: { employeeId: string } };
  const photo = await getEmployeeProfilePhoto(validated.params.employeeId, getAuthContext(response));
  response.setHeader("Cache-Control", "private, no-cache");
  response.type(photo.mimeType).send(await readFile(photo.absolutePath));
}

export async function getMyEmployeeProfilePhotoController(
  _request: Request,
  response: Response
): Promise<void> {
  const auth = getAuthContext(response);
  if (!auth.employeeId) {
    throw new AppError({
      message: "This account is not linked to an employee profile",
      statusCode: 403,
      code: "EMPLOYEE_PROFILE_NOT_LINKED"
    });
  }
  const photo = await getEmployeeProfilePhoto(auth.employeeId, auth);
  response.setHeader("Cache-Control", "private, no-cache");
  response.type(photo.mimeType).send(await readFile(photo.absolutePath));
}

export async function uploadEmployeeProfilePhotoController(
  request: Request,
  response: Response
): Promise<void> {
  const validated = response.locals.validated as { params: { employeeId: string } };
  const profilePhotoPath = await uploadEmployeeProfilePhoto(
    validated.params.employeeId,
    request.file,
    getAuthContext(response)
  );
  sendSuccess(response, {
    message: "Employee photo uploaded successfully",
    data: { profilePhotoPath }
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

  const result =
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
      employee: result.employee,
      accessAccount: result.accessAccount,
      accessAccountError: result.accessAccountError
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

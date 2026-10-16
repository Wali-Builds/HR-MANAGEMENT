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
  CreateDepartmentInput,
  DepartmentListQuery,
  UpdateDepartmentInput
} from "./department.schema.js";

import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  updateDepartment
} from "./department.service.js";

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

export async function listDepartmentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        DepartmentListQuery;
    };

  const result =
    await listDepartments(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Departments retrieved successfully",

    data:
      result
  });
}

export async function getDepartmentController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        departmentId: string;
      };
    };

  const department =
    await getDepartment(
      validated.params
        .departmentId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Department retrieved successfully",

    data: {
      department
    }
  });
}

export async function createDepartmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateDepartmentInput;
    };

  const department =
    await createDepartment(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Department created successfully",

    data: {
      department
    }
  });
}

export async function updateDepartmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        departmentId: string;
      };

      body:
        UpdateDepartmentInput;
    };

  const department =
    await updateDepartment(
      validated.params
        .departmentId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Department updated successfully",

    data: {
      department
    }
  });
}

export async function deleteDepartmentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        departmentId: string;
      };
    };

  await deleteDepartment(
    validated.params
      .departmentId,

    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Department deleted successfully",

    data: null
  });
}
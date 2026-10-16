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
  CreateDesignationInput,
  DesignationListQuery,
  UpdateDesignationInput
} from "./designation.schema.js";

import {
  createDesignation,
  deleteDesignation,
  getDesignation,
  listDesignations,
  updateDesignation
} from "./designation.service.js";

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

export async function listDesignationsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        DesignationListQuery;
    };

  const result =
    await listDesignations(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Designations retrieved successfully",

    data:
      result
  });
}

export async function getDesignationController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        designationId: string;
      };
    };

  const designation =
    await getDesignation(
      validated.params
        .designationId,

      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Designation retrieved successfully",

    data: {
      designation
    }
  });
}

export async function createDesignationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateDesignationInput;
    };

  const designation =
    await createDesignation(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Designation created successfully",

    data: {
      designation
    }
  });
}

export async function updateDesignationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        designationId: string;
      };

      body:
        UpdateDesignationInput;
    };

  const designation =
    await updateDesignation(
      validated.params
        .designationId,

      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Designation updated successfully",

    data: {
      designation
    }
  });
}

export async function deleteDesignationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        designationId: string;
      };
    };

  await deleteDesignation(
    validated.params
      .designationId,

    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Designation deleted successfully",

    data: null
  });
}
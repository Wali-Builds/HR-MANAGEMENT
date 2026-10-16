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
  CreatePositionInput,
  PositionListQuery,
  UpdatePositionInput
} from "./position.schema.js";

import {
  closePosition,
  createPosition,
  getPosition,
  listPositions,
  updatePosition
} from "./position.service.js";

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

export async function listPositionsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: PositionListQuery;
    };

  const result =
    await listPositions(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Positions retrieved successfully",

    data: result
  });
}

export async function getPositionController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        positionId: string;
      };
    };

  const position =
    await getPosition(
      validated.params.positionId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Position retrieved successfully",

    data: {
      position
    }
  });
}

export async function createPositionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreatePositionInput;
    };

  const position =
    await createPosition(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Position created successfully",

    data: {
      position
    }
  });
}

export async function updatePositionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        positionId: string;
      };

      body:
        UpdatePositionInput;
    };

  const position =
    await updatePosition(
      validated.params.positionId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Position updated successfully",

    data: {
      position
    }
  });
}

export async function closePositionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        positionId: string;
      };
    };

  await closePosition(
    validated.params.positionId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Position closed successfully",

    data: null
  });
}
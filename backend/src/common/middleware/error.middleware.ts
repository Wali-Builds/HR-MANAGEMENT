import type {
  ErrorRequestHandler,
  RequestHandler
} from "express";

import { ZodError } from "zod";

import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (
  request,
  response
) => {
  const requestId = response.locals.requestId;

  const payload: Record<string, unknown> = {
    success: false,
    message: "API endpoint not found",
    error: {
      code: "ROUTE_NOT_FOUND",
      path: request.originalUrl
    }
  };

  if (typeof requestId === "string") {
    payload.requestId = requestId;
  }

  response.status(404).json(payload);
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next
) => {
  const requestId = response.locals.requestId;

  if (error instanceof AppError) {
    const payload: Record<string, unknown> = {
      success: false,
      message: error.message,
      error: {
        code: error.code
      }
    };

    if (error.details !== undefined) {
      payload.details = error.details;
    }

    if (typeof requestId === "string") {
      payload.requestId = requestId;
    }

    response
      .status(error.statusCode)
      .json(payload);

    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      success: false,
      message: "Request validation failed",
      error: {
        code: "VALIDATION_ERROR"
      },
      details: error.issues,
      requestId
    });

    return;
  }

  const databaseError = error as {
    code?: unknown;
    errno?: unknown;
    sqlState?: unknown;
    sqlMessage?: unknown;
  };

  console.error("\n========== ACTUAL BACKEND ERROR ==========");
  console.error("Request ID:", requestId);
  console.error("Method:", request.method);
  console.error("Path:", request.originalUrl);
  console.error("Error object:", error);

  if (error instanceof Error) {
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Stack:", error.stack);
  }

  console.error("Database code:", databaseError.code);
  console.error("Database errno:", databaseError.errno);
  console.error("Database state:", databaseError.sqlState);
  console.error("Database message:", databaseError.sqlMessage);
  console.error("==========================================\n");

  const payload: Record<string, unknown> = {
    success: false,
    message: "An unexpected server error occurred",
    error: {
      code: "INTERNAL_SERVER_ERROR"
    },
    requestId
  };

  // Development mein actual message debugging ke liye show hogi.
  // Production mein automatically hide rahegi.
  if (env.NODE_ENV === "development") {
    payload.debug = {
      name:
        error instanceof Error
          ? error.name
          : "UnknownError",

      message:
        error instanceof Error
          ? error.message
          : String(error),

      databaseCode:
        databaseError.code ?? null,

      databaseMessage:
        databaseError.sqlMessage ?? null
    };
  }

  response.status(500).json(payload);
};
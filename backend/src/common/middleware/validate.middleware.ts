import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../errors/app-error.js";

export function validateRequest(
  schema: ZodType
): RequestHandler {
  return (request, response, next) => {
    const validationResult = schema.safeParse({
      body:
        request.body ?? {},

      query:
        request.query ?? {},

      params:
        request.params ?? {}
    });

    if (!validationResult.success) {
      const validationErrors =
        validationResult.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code
        }));

      next(
        new AppError({
          message: "Request validation failed",
          statusCode: 422,
          code: "VALIDATION_ERROR",
          details: validationErrors
        })
      );

      return;
    }

    response.locals.validated =
      validationResult.data;

    next();
  };
}
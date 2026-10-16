import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

import {
  verifyAccessToken
} from "../security/access-token.js";

import {
  asyncHandler
} from "../utils/async-handler.js";

import {
  getAuthenticatedContext
} from "../../modules/auth/auth.repository.js";

export const authenticate: RequestHandler =
  asyncHandler(
    async (
      request,
      response,
      next
    ) => {
      const authorizationHeader =
        request.header("Authorization");

      if (
        !authorizationHeader ||
        !authorizationHeader.startsWith(
          "Bearer "
        )
      ) {
        throw new AppError({
          message:
            "Authentication token is required",
          statusCode: 401,
          code:
            "ACCESS_TOKEN_REQUIRED"
        });
      }

      const accessToken =
        authorizationHeader
          .slice(7)
          .trim();

      if (!accessToken) {
        throw new AppError({
          message:
            "Authentication token is required",
          statusCode: 401,
          code:
            "ACCESS_TOKEN_REQUIRED"
        });
      }

      let tokenPayload;

      try {
        tokenPayload =
          verifyAccessToken(accessToken);
      } catch {
        throw new AppError({
          message:
            "Access token is invalid or expired",
          statusCode: 401,
          code:
            "ACCESS_TOKEN_INVALID"
        });
      }

      const authContext =
        await getAuthenticatedContext(
          tokenPayload.sub,
          tokenPayload.sid
        );

      if (!authContext) {
        throw new AppError({
          message:
            "Authentication session is invalid or expired",
          statusCode: 401,
          code:
            "SESSION_INVALID"
        });
      }

      response.locals.auth =
        authContext;

      // Controller ko request forward karna zaroori hai.
      next();
    }
  );
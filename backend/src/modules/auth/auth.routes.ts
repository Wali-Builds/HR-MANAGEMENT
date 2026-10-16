import { Router } from "express";

import {
  rateLimit
} from "express-rate-limit";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  validateRequest
} from "../../common/middleware/validate.middleware.js";

import {
  asyncHandler
} from "../../common/utils/async-handler.js";
import {
  requirePermission
} from "../../common/middleware/authorization.middleware.js";

import {
  requireCompletedPasswordChange
} from "../../common/middleware/password-change.middleware.js";

import {
  authorizationTestController,
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  resetPasswordController
} from "./auth.controller.js";

import {
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema
} from "./auth.schema.js";

export const authRouter =
  Router();

const loginRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 10,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (
      _request,
      response
    ) => {
      response.status(429).json({
        success: false,

        message:
          "Too many login attempts. Please try again later.",

        error: {
          code:
            "LOGIN_RATE_LIMIT_EXCEEDED"
        },

        requestId:
          response.locals.requestId
      });
    }
  });

const refreshRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 30,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (
      _request,
      response
    ) => {
      response.status(429).json({
        success: false,

        message:
          "Too many token refresh requests. Please try again later.",

        error: {
          code:
            "REFRESH_RATE_LIMIT_EXCEEDED"
        },

        requestId:
          response.locals.requestId
      });
    }
  });
  const changePasswordRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 10,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (
      _request,
      response
    ) => {
      response.status(429).json({
        success: false,

        message:
          "Too many password change attempts. Please try again later.",

        error: {
          code:
            "PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED"
        },

        requestId:
          response.locals.requestId
      });
    }
  });
  const forgotPasswordRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (
      _request,
      response
    ) => {
      response.status(429).json({
        success: false,

        message:
          "Too many password-reset requests. Please try again later.",

        error: {
          code:
            "PASSWORD_RESET_RATE_LIMIT_EXCEEDED"
        },

        requestId:
          response.locals.requestId
      });
    }
  });

authRouter.post(
  "/login",
  loginRateLimiter,
  validateRequest(
    loginRequestSchema
  ),
  asyncHandler(
    loginController
  )
);

authRouter.post(
  "/refresh",
  refreshRateLimiter,
  asyncHandler(
    refreshController
  )
);

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(
    logoutController
  )
);

authRouter.post(
  "/logout-all",
  authenticate,
  asyncHandler(
    logoutAllController
  )
);
authRouter.post(
  "/change-password",
  authenticate,
  changePasswordRateLimiter,
  validateRequest(
    changePasswordRequestSchema
  ),
  asyncHandler(
    changePasswordController
  )
);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateRequest(
    forgotPasswordRequestSchema
  ),
  asyncHandler(
    forgotPasswordController
  )
);
authRouter.post(
  "/reset-password",
  forgotPasswordRateLimiter,
  validateRequest(
    resetPasswordRequestSchema
  ),
  asyncHandler(
    resetPasswordController
  )
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(
    meController
  )
);
authRouter.get(
  "/authorization-test",
  authenticate,
  requireCompletedPasswordChange,
  requirePermission(
    "users.manage"
  ),
  asyncHandler(
    authorizationTestController
  )
);
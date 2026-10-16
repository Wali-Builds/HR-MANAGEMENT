import type {
  Request,
  Response
} from "express";

import { AppError } from "../../common/errors/app-error.js";

import {
  sendSuccess
} from "../../common/utils/api-response.js";

import { env } from "../../config/env.js";

import {
  changeUserPassword,
  getCurrentUser,
  loginUser,
  logoutCurrentUser,
  logoutUserFromAllDevices,
  refreshUserSession,
  requestPasswordReset,
  resetUserPassword
} from "./auth.service.js";

import type {
  AuthContext,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RequestMetadata,
  ResetPasswordInput
} from "./auth.types.js";

export const REFRESH_COOKIE_NAME =
  "hr_refresh_token";

const refreshCookieOptions = {
  httpOnly: true,

  secure:
    env.NODE_ENV === "production",

  sameSite:
    "lax" as const,

  path:
    "/api/v1/auth"
};

function getRequestMetadata(
  request: Request
): RequestMetadata {
  return {
    ipAddress:
      request.ip ?? null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

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

function getRefreshTokenFromCookie(
  request: Request
): string {
  const cookies =
    request.cookies as
      | Record<string, unknown>
      | undefined;

  const refreshToken =
    cookies?.[REFRESH_COOKIE_NAME];

  return typeof refreshToken === "string"
    ? refreshToken
    : "";
}

function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
  expiresAt: Date
): void {
  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    {
      ...refreshCookieOptions,
      expires: expiresAt
    }
  );
}

function clearRefreshTokenCookie(
  response: Response
): void {
  response.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieOptions
  );
}

export async function loginController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: LoginInput;
    };

  const result =
    await loginUser(
      validated.body,
      getRequestMetadata(request)
    );

  setRefreshTokenCookie(
    response,
    result.refreshToken,
    result.refreshTokenExpiresAt
  );

  sendSuccess(response, {
    message:
      "Login successful",

    data: {
      accessToken:
        result.accessToken,

      tokenType:
        "Bearer",

      expiresIn:
        result.accessTokenExpiresIn,

      user:
        result.user
    }
  });
}

export async function refreshController(
  request: Request,
  response: Response
): Promise<void> {
  const currentRefreshToken =
    getRefreshTokenFromCookie(
      request
    );

  const result =
    await refreshUserSession(
      currentRefreshToken,
      getRequestMetadata(request)
    );

  setRefreshTokenCookie(
    response,
    result.refreshToken,
    result.refreshTokenExpiresAt
  );

  sendSuccess(response, {
    message:
      "Access token refreshed successfully",

    data: {
      accessToken:
        result.accessToken,

      tokenType:
        "Bearer",

      expiresIn:
        result.accessTokenExpiresIn,

      user:
        result.user
    }
  });
}

export async function logoutController(
  request: Request,
  response: Response
): Promise<void> {
  const auth =
    getAuthContext(response);

  await logoutCurrentUser(
    auth.userId,
    auth.sessionId,
    auth.companyId,
    getRequestMetadata(request)
  );

  clearRefreshTokenCookie(
    response
  );

  sendSuccess(response, {
    message:
      "Logout successful",

    data: null
  });
}

export async function logoutAllController(
  request: Request,
  response: Response
): Promise<void> {
  const auth =
    getAuthContext(response);

  const revokedSessionCount =
    await logoutUserFromAllDevices(
      auth.userId,
      auth.companyId,
      getRequestMetadata(request)
    );

  clearRefreshTokenCookie(
    response
  );

  sendSuccess(response, {
    message:
      "Logged out from all devices successfully",

    data: {
      revokedSessionCount
    }
  });
}

export async function meController(
  _request: Request,
  response: Response
): Promise<void> {
  const auth =
    getAuthContext(response);

  const currentUser =
    await getCurrentUser(
      auth.userId,
      auth.sessionId
    );

  sendSuccess(response, {
    message:
      "Current user retrieved successfully",

    data: {
      user:
        currentUser
    }
  });
}
export async function changePasswordController(
  request: Request,
  response: Response
): Promise<void> {
  const auth =
    getAuthContext(response);

  const validated =
    response.locals.validated as {
      body: ChangePasswordInput;
    };

  const result =
    await changeUserPassword(
      auth.userId,
      validated.body,
      getRequestMetadata(request)
    );

  clearRefreshTokenCookie(
    response
  );

  sendSuccess(response, {
    message:
      "Password changed successfully. Please sign in again.",

    data: {
      requiresLogin: true,

      revokedSessionCount:
        result.revokedSessionCount
    }
  });
}
export async function forgotPasswordController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: ForgotPasswordInput;
    };

  const result =
    await requestPasswordReset(
      validated.body,
      getRequestMetadata(request)
    );

  const data:
  Record<string, unknown> = {
    requestAccepted: true
  };

  if (
    env.NODE_ENV === "development" &&
    result.developmentToken &&
    result.developmentResetUrl
  ) {
    data.developmentResetToken =
      result.developmentToken;

    data.developmentResetUrl =
      result.developmentResetUrl;
  }

  sendSuccess(response, {
    message:
      "If an active account exists for this email, password-reset instructions have been generated.",

    data
  });
}

export async function resetPasswordController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: ResetPasswordInput;
    };

  const result =
    await resetUserPassword(
      validated.body,
      getRequestMetadata(request)
    );

  clearRefreshTokenCookie(response);

  sendSuccess(response, {
    message:
      "Password reset successfully. Please sign in using your new password.",

    data: {
      requiresLogin: true,
      revokedSessionCount:
        result.revokedSessionCount
    }
  });
}
export async function authorizationTestController(
  _request: Request,
  response: Response
): Promise<void> {
  const auth =
    getAuthContext(response);

  sendSuccess(response, {
    message:
      "Authorization middleware is working correctly",

    data: {
      accessGranted: true,
      testedPermission:
        "users.manage",

      user: {
        userId:
          auth.userId,

        username:
          auth.username,

        isPlatformAdmin:
          auth.isPlatformAdmin,

        roleCodes:
          auth.roleCodes
      }
    }
  });
}
import { AppError } from "../../common/errors/app-error.js";

import {
  createAccessToken
} from "../../common/security/access-token.js";

import {
  hashPassword,
  verifyPassword
} from "../../common/security/password.js";
import {
  findPasswordUserById,
  updatePasswordAndRevokeSessions
} from "./auth-password.repository.js";

import {
  generateRefreshToken,
  hashRefreshToken
} from "../../common/security/session-token.js";

import { env } from "../../config/env.js";

import {
  createSuccessfulSession,
  findUserByIdentifier,
  getAuthenticatedContext,
  hasAssignmentToInactiveRole,
  loadAuthorization,
  recordFailedLogin
} from "./auth.repository.js";

import type {
  AuthContext,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginServiceResult,
  RequestMetadata,
  ResetPasswordInput
} from "./auth.types.js";
import {
  revokeAllUserSessions,
  revokeCurrentSession,
  rotateRefreshSession
} from "./auth-session.repository.js";
import {
  generatePasswordResetToken,
  hashPasswordResetToken
} from "../../common/security/password-reset-token.js";
import {
  completePasswordReset,
  createPasswordResetRequest,
  findPasswordResetUserByEmail,
  findValidPasswordResetToken
} from "./auth-reset.repository.js";


function parseDatabaseDate(
  value: Date | string | null
): Date | null {
  if (value === null) {
    return null;
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate;
}

function databaseBoolean(
  value: number | boolean
): boolean {
  return value === true || Number(value) === 1;
}

export async function loginUser(
  input: LoginInput,
  metadata: RequestMetadata
): Promise<LoginServiceResult> {
  const identifier =
    input.identifier.trim();

  const user =
    await findUserByIdentifier(
      identifier
    );

  if (!user) {
    throw new AppError({
      message:
        "Invalid username/email or password",
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    });
  }

  if (!databaseBoolean(user.is_active)) {
    throw new AppError({
      message:
        "This user account is inactive",
      statusCode: 403,
      code: "ACCOUNT_INACTIVE"
    });
  }

  const lockedUntil =
    parseDatabaseDate(
      user.locked_until
    );

  if (
    lockedUntil &&
    lockedUntil.getTime() >
      Date.now()
  ) {
    throw new AppError({
      message:
        "Account is temporarily locked due to multiple failed login attempts",
      statusCode: 423,
      code: "ACCOUNT_LOCKED",
      details: {
        lockedUntil:
          lockedUntil.toISOString()
      }
    });
  }

  const passwordIsValid =
    await verifyPassword(
      user.password_hash,
      input.password
    );

  if (!passwordIsValid) {
    const nextAttemptCount =
      Number(
        user.failed_login_attempts
      ) + 1;

    const shouldLock =
      nextAttemptCount >=
      env.LOGIN_MAX_ATTEMPTS;

    const nextLockedUntil =
      shouldLock
        ? new Date(
            Date.now() +
              env.LOGIN_LOCK_MINUTES *
                60 *
                1000
          )
        : null;

    await recordFailedLogin(
      user,
      nextAttemptCount,
      nextLockedUntil,
      metadata
    );

    throw new AppError({
      message:
        "Invalid username/email or password",
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    });
  }

  const isPlatformAdmin =
    databaseBoolean(
      user.is_platform_admin
    );

  const authorization =
    await loadAuthorization(
      user.user_id,
      isPlatformAdmin
    );

  // edited by wali: Block sign-in for users still assigned to a deactivated role and return the requested message.
  if (
    !isPlatformAdmin &&
    await hasAssignmentToInactiveRole(user.user_id)
  ) {
    throw new AppError({
      message: "Your role is not active now.",
      statusCode: 403,
      code: "ASSIGNED_ROLE_INACTIVE"
    });
  }

  // edited by wali: Prevent users whose role assignments are all inactive from starting a new session.
  if (!isPlatformAdmin && authorization.roleCodes.length === 0) {
    throw new AppError({
      message: "Your account has no active role and cannot sign in",
      statusCode: 403,
      code: "NO_ACTIVE_ROLE"
    });
  }

  const refreshToken =
    generateRefreshToken();

  const sessionId =
    await createSuccessfulSession(
      user,
      refreshToken.tokenHash,
      refreshToken.expiresAt,
      metadata,
      input.deviceName ?? null
    );

  const accessToken =
    createAccessToken({
      userId:
        String(user.user_id),

      sessionId,

      companyId:
        user.company_id === null
          ? null
          : String(user.company_id),

      employeeId:
        user.employee_id === null
          ? null
          : String(user.employee_id),

      isPlatformAdmin,

      roleCodes:
        authorization.roleCodes
    });

  const context: AuthContext = {
    userId:
      String(user.user_id),

    sessionId,

    companyId:
      user.company_id === null
        ? null
        : String(user.company_id),

    employeeId:
      user.employee_id === null
        ? null
        : String(user.employee_id),

    username:
      user.username,

    email:
      user.email,

    isPlatformAdmin,

    isEmailVerified:
      databaseBoolean(
        user.is_email_verified
      ),

    mustChangePassword:
      databaseBoolean(
        user.must_change_password
      ),

    roleCodes:
      authorization.roleCodes,

    permissions:
      authorization.permissions,

    branchIds:
      authorization.branchIds
  };

  return {
    accessToken,

    accessTokenExpiresIn:
      env.JWT_ACCESS_EXPIRES_SECONDS,

    refreshToken:
      refreshToken.plainToken,

    refreshTokenExpiresAt:
      refreshToken.expiresAt,

    user:
      context
  };
}

export async function getCurrentUser(
  userId: string,
  sessionId: string
): Promise<AuthContext> {
  const context =
    await getAuthenticatedContext(
      userId,
      sessionId
    );

  if (!context) {
    throw new AppError({
      message:
        "Authentication session is invalid or expired",
      statusCode: 401,
      code: "SESSION_INVALID"
    });
  }

  return context;
}
export async function refreshUserSession(
  plainRefreshToken: string,
  metadata: RequestMetadata
): Promise<LoginServiceResult> {
  if (!plainRefreshToken) {
    throw new AppError({
      message:
        "Refresh token is required",
      statusCode: 401,
      code: "REFRESH_TOKEN_REQUIRED"
    });
  }

  const currentTokenHash =
    hashRefreshToken(
      plainRefreshToken
    );

  const newRefreshToken =
    generateRefreshToken();

  const session =
    await rotateRefreshSession(
      currentTokenHash,
      newRefreshToken.tokenHash,
      newRefreshToken.expiresAt,
      metadata
    );

  if (!session) {
    throw new AppError({
      message:
        "Refresh token is invalid, expired or revoked",
      statusCode: 401,
      code: "REFRESH_TOKEN_INVALID"
    });
  }

  const isPlatformAdmin =
    databaseBoolean(
      session.is_platform_admin
    );

  const authorization =
    await loadAuthorization(
      session.user_id,
      isPlatformAdmin
    );

  const sessionId =
    String(session.session_id);

  const userId =
    String(session.user_id);

  const companyId =
    session.company_id === null
      ? null
      : String(session.company_id);

  const employeeId =
    session.employee_id === null
      ? null
      : String(session.employee_id);

  const accessToken =
    createAccessToken({
      userId,
      sessionId,
      companyId,
      employeeId,
      isPlatformAdmin,
      roleCodes:
        authorization.roleCodes
    });

  const context: AuthContext = {
    userId,
    sessionId,
    companyId,
    employeeId,

    username:
      session.username,

    email:
      session.email,

    isPlatformAdmin,

    isEmailVerified:
      databaseBoolean(
        session.is_email_verified
      ),

    mustChangePassword:
      databaseBoolean(
        session.must_change_password
      ),

    roleCodes:
      authorization.roleCodes,

    permissions:
      authorization.permissions,

    branchIds:
      authorization.branchIds
  };

  return {
    accessToken,

    accessTokenExpiresIn:
      env.JWT_ACCESS_EXPIRES_SECONDS,

    refreshToken:
      newRefreshToken.plainToken,

    refreshTokenExpiresAt:
      newRefreshToken.expiresAt,

    user:
      context
  };
}

export async function logoutCurrentUser(
  userId: string,
  sessionId: string,
  companyId: string | null,
  metadata: RequestMetadata
): Promise<void> {
  await revokeCurrentSession(
    userId,
    sessionId,
    companyId,
    metadata
  );
}

export async function logoutUserFromAllDevices(
  userId: string,
  companyId: string | null,
  metadata: RequestMetadata
): Promise<number> {
  return revokeAllUserSessions(
    userId,
    companyId,
    metadata
  );
}
export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
  metadata: RequestMetadata
): Promise<{
  revokedSessionCount: number;
}> {
  const user =
    await findPasswordUserById(
      userId
    );

  if (
    !user ||
    !databaseBoolean(
      user.is_active
    )
  ) {
    throw new AppError({
      message:
        "User account is inactive or unavailable",
      statusCode: 401,
      code: "USER_ACCOUNT_INVALID"
    });
  }

  const currentPasswordIsValid =
    await verifyPassword(
      user.password_hash,
      input.currentPassword
    );

  if (!currentPasswordIsValid) {
    throw new AppError({
      message:
        "Current password is incorrect",
      statusCode: 401,
      code:
        "CURRENT_PASSWORD_INVALID"
    });
  }

  if (
    input.currentPassword ===
    input.newPassword
  ) {
    throw new AppError({
      message:
        "New password must be different from the current password",
      statusCode: 422,
      code:
        "PASSWORD_REUSE_NOT_ALLOWED"
    });
  }

  const newPasswordHash =
    await hashPassword(
      input.newPassword
    );

  const revokedSessionCount =
    await updatePasswordAndRevokeSessions(
      userId,

      user.company_id === null
        ? null
        : String(user.company_id),

      newPasswordHash,
      metadata
    );

  return {
    revokedSessionCount
  };
}
export async function requestPasswordReset(
  input: ForgotPasswordInput,
  metadata: RequestMetadata
): Promise<{
  developmentToken: string | null;
  developmentResetUrl: string | null;
}> {
  const email =
    input.email
      .trim()
      .toLowerCase();

  const user =
    await findPasswordResetUserByEmail(
      email
    );

  if (!user) {
    return {
      developmentToken: null,
      developmentResetUrl: null
    };
  }

  const resetToken =
    generatePasswordResetToken();

  await createPasswordResetRequest(
    user,
    resetToken.tokenHash,
    resetToken.expiresAt,
    metadata
  );

  const resetUrl = new URL(
    env.FRONTEND_RESET_PASSWORD_URL
  );

  resetUrl.searchParams.set(
    "token",
    resetToken.plainToken
  );

  return {
    developmentToken:
      env.NODE_ENV === "development"
        ? resetToken.plainToken
        : null,

    developmentResetUrl:
      env.NODE_ENV === "development"
        ? resetUrl.toString()
        : null
  };
}

export async function resetUserPassword(
  input: ResetPasswordInput,
  metadata: RequestMetadata
): Promise<{
  revokedSessionCount: number;
}> {
  const tokenHash =
    hashPasswordResetToken(
      input.token
    );

  const user =
    await findValidPasswordResetToken(
      tokenHash
    );

  if (!user) {
    throw new AppError({
      message:
        "Password-reset token is invalid or expired",
      statusCode: 400,
      code:
        "PASSWORD_RESET_TOKEN_INVALID"
    });
  }

  const passwordWasAlreadyUsed =
    await verifyPassword(
      user.password_hash,
      input.newPassword
    );

  if (passwordWasAlreadyUsed) {
    throw new AppError({
      message:
        "New password must be different from the current password",
      statusCode: 422,
      code:
        "PASSWORD_REUSE_NOT_ALLOWED"
    });
  }

  const newPasswordHash =
    await hashPassword(
      input.newPassword
    );

  const result =
    await completePasswordReset(
      tokenHash,
      newPasswordHash,
      metadata
    );

  if (!result) {
    throw new AppError({
      message:
        "Password-reset token is invalid or expired",
      statusCode: 400,
      code:
        "PASSWORD_RESET_TOKEN_INVALID"
    });
  }

  return {
    revokedSessionCount:
      result.revokedSessionCount
  };
}

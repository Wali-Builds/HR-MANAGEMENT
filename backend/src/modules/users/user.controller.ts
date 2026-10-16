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
  AdminResetPasswordInput,
  CreateUserInput,
  ReplaceUserRolesInput,
  UpdateUserInput,
  UserListQuery,
  UserLookupQuery
} from "./user.schema.js";

import {
  adminResetUserPassword,
  createUser,
  deleteUser,
  getUser,
  getUserLookupData,
  listUsers,
  replaceUserRoles,
  updateUser
} from "./user.service.js";

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

export async function getUserLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: UserLookupQuery;
    };

  const lookups =
    await getUserLookupData(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "User-account lookups retrieved successfully",

    data:
      lookups
  });
}

export async function listUsersController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: UserListQuery;
    };

  const result =
    await listUsers(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "User accounts retrieved successfully",

    data:
      result
  });
}

export async function getUserController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        userId: string;
      };
    };

  const user =
    await getUser(
      validated.params.userId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "User account retrieved successfully",

    data: {
      user
    }
  });
}

export async function createUserController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreateUserInput;
    };

  const user =
    await createUser(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "User account created successfully",

    data: {
      user
    }
  });
}

export async function updateUserController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        userId: string;
      };

      body:
        UpdateUserInput;
    };

  const user =
    await updateUser(
      validated.params.userId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "User account updated successfully",

    data: {
      user
    }
  });
}

export async function replaceUserRolesController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        userId: string;
      };

      body:
        ReplaceUserRolesInput;
    };

  const user =
    await replaceUserRoles(
      validated.params.userId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "User roles updated successfully. Existing sessions were revoked.",

    data: {
      user
    }
  });
}

export async function adminResetUserPasswordController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        userId: string;
      };

      body:
        AdminResetPasswordInput;
    };

  const result =
    await adminResetUserPassword(
      validated.params.userId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "User password reset successfully",

    data: {
      requiresLogin:
        validated.body
          .revokeAllSessions,

      mustChangePassword:
        validated.body
          .mustChangePassword,

      revokedSessionCount:
        result.revokedSessionCount
    }
  });
}

export async function deleteUserController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        userId: string;
      };
    };

  await deleteUser(
    validated.params.userId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "User account deleted successfully",

    data: null
  });
}
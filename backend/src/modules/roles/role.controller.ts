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
  CreateRoleInput,
  PermissionListQuery,
  ReplaceRolePermissionsInput,
  RoleListQuery,
  UpdateRoleInput
} from "./role.schema.js";

import {
  createRole,
  deleteRole,
  getRole,
  listPermissions,
  listRoles,
  replaceRolePermissions,
  updateRole
} from "./role.service.js";

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

export async function listPermissionsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        PermissionListQuery;
    };

  const result =
    await listPermissions(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Permissions retrieved successfully",

    data:
      result
  });
}

export async function listRolesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        RoleListQuery;
    };

  const result =
    await listRoles(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Roles retrieved successfully",

    data:
      result
  });
}

export async function getRoleController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        roleId: string;
      };
    };

  const role =
    await getRole(
      validated.params.roleId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Role retrieved successfully",

    data: {
      role
    }
  });
}

export async function createRoleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateRoleInput;
    };

  const role =
    await createRole(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Role created successfully",

    data: {
      role
    }
  });
}

export async function updateRoleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        roleId: string;
      };

      body:
        UpdateRoleInput;
    };

  const role =
    await updateRole(
      validated.params.roleId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Role updated successfully",

    data: {
      role
    }
  });
}

export async function replaceRolePermissionsController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        roleId: string;
      };

      body:
        ReplaceRolePermissionsInput;
    };

  const result =
    await replaceRolePermissions(
      validated.params.roleId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Role permissions updated successfully. Affected user sessions were revoked.",

    data: {
      role:
        result.role,

      revokedSessionCount:
        result.revokedSessionCount
    }
  });
}

export async function deleteRoleController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        roleId: string;
      };
    };

  await deleteRole(
      validated.params.roleId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message: "Role deleted successfully",
    data: { deleted: true }
  });
}

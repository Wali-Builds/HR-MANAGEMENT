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
  BranchListQuery,
  CreateBranchInput,
  UpdateBranchInput
} from "./branch.schema.js";

import {
  createBranch,
  deleteBranch,
  getBranch,
  listBranches,
  updateBranch
} from "./branch.service.js";

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

export async function listBranchesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: BranchListQuery;
    };

  const result =
    await listBranches(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Branches retrieved successfully",

    data:
      result
  });
}

export async function getBranchController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        branchId: string;
      };
    };

  const branch =
    await getBranch(
      validated.params.branchId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Branch retrieved successfully",

    data: {
      branch
    }
  });
}

export async function createBranchController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreateBranchInput;
    };

  const branch =
    await createBranch(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Branch created successfully",

    data: {
      branch
    }
  });
}

export async function updateBranchController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        branchId: string;
      };

      body:
        UpdateBranchInput;
    };

  const branch =
    await updateBranch(
      validated.params.branchId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Branch updated successfully",

    data: {
      branch
    }
  });
}

export async function deleteBranchController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        branchId: string;
      };
    };

  await deleteBranch(
    validated.params.branchId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Branch deleted successfully",

    data: null
  });
}
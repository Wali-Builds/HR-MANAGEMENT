import type {
  Request,
  Response
} from "express";

import { AppError } from "../../common/errors/app-error.js";

import {
  sendSuccess
} from "../../common/utils/api-response.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import type {
  CompanyListQuery,
  CreateCompanyInput,
  UpdateCompanyInput
} from "./company.schema.js";

import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  updateCompany
} from "./company.service.js";

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

export async function listCompaniesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: CompanyListQuery;
    };

  const result =
    await listCompanies(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Companies retrieved successfully",
    data: result
  });
}

export async function getCompanyController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        companyId: string;
      };
    };

  const company =
    await getCompany(
      validated.params.companyId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Company retrieved successfully",

    data: {
      company
    }
  });
}

export async function createCompanyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreateCompanyInput;
    };

  const company =
    await createCompany(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Company created successfully",

    data: {
      company
    }
  });
}

export async function updateCompanyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        companyId: string;
      };

      body:
        UpdateCompanyInput;
    };

  const company =
    await updateCompany(
      validated.params.companyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Company updated successfully",

    data: {
      company
    }
  });
}

export async function deleteCompanyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        companyId: string;
      };
    };

  await deleteCompany(
    validated.params.companyId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Company deleted successfully",

    data: null
  });
}
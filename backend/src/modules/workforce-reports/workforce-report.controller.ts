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
  WorkforceReportQuery
} from "./workforce-report.schema.js";

import {
  getWorkforceReport
} from "./workforce-report.service.js";

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

export async function getWorkforceReportController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        WorkforceReportQuery;
    };

  const report =
    await getWorkforceReport(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Workforce report retrieved successfully",

    data: {
      report
    }
  });
}

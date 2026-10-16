import type {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from "express";

import { AppError } from "../errors/app-error.js";

import type {
  AuthContext
} from "../../modules/auth/auth.types.js";

export const requireCompletedPasswordChange:
RequestHandler = (
  _request: Request,
  response: Response,
  next: NextFunction
): void => {
  try {
    const auth =
      response.locals.auth as
        | AuthContext
        | undefined;

    if (!auth) {
      next(
        new AppError({
          message:
            "Authentication is required",
          statusCode: 401,
          code:
            "AUTHENTICATION_REQUIRED"
        })
      );

      return;
    }

    if (auth.mustChangePassword) {
      next(
        new AppError({
          message:
            "You must change your password before accessing this resource",
          statusCode: 403,
          code:
            "PASSWORD_CHANGE_REQUIRED"
        })
      );

      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
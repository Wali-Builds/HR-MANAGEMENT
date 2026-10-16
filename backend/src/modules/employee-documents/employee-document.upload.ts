import type {
  RequestHandler
} from "express";

import multer from "multer";

import {
  AppError
} from "../../common/errors/app-error.js";

import {
  env
} from "../../config/env.js";

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        env.EMPLOYEE_DOCUMENT_MAX_FILE_SIZE_BYTES,

      files: 1,
      fields: 20
    }
  });

export const uploadSingleEmployeeDocument:
RequestHandler = (
  request,
  response,
  next
) => {
  upload.single(
    "file"
  )(
    request,
    response,
    (error: unknown) => {
      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {
          next(
            new AppError({
              message:
                `Employee document cannot exceed ${env.EMPLOYEE_DOCUMENT_MAX_FILE_SIZE_BYTES} bytes`,

              statusCode: 413,

              code:
                "EMPLOYEE_DOCUMENT_FILE_TOO_LARGE"
            })
          );

          return;
        }

        next(
          new AppError({
            message:
              "The employee-document upload could not be processed",

            statusCode: 422,

            code:
              "EMPLOYEE_DOCUMENT_UPLOAD_INVALID",

            details: {
              multerCode:
                error.code
            }
          })
        );

        return;
      }

      if (error) {
        next(error);
        return;
      }

      next();
    }
  );
};

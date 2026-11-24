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

function createSingleEmployeeFileUpload(
  maximumSizeBytes: number,
  fileTypeLabel: string,
  tooLargeErrorCode: string,
  invalidUploadErrorCode: string
): RequestHandler {
  const upload =
    multer({
      storage:
        multer.memoryStorage(),

      limits: {
        fileSize:
          maximumSizeBytes,

        files: 1,
        fields: 20
      }
    });

  return (request, response, next) => {
    upload.single("file")(
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
            const maximumSizeMb = Number(
              (
                maximumSizeBytes /
                (1024 * 1024)
              ).toFixed(2)
            );

            next(
              new AppError({
                message:
                  `${fileTypeLabel} cannot exceed ${maximumSizeMb} MB`,

                statusCode: 413,

                code:
                  tooLargeErrorCode
              })
            );

            return;
          }

          next(
            new AppError({
              message:
                `The ${fileTypeLabel.toLowerCase()} upload could not be processed`,

              statusCode: 422,

              code:
                invalidUploadErrorCode,

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
}

export const uploadSingleEmployeeDocument =
  createSingleEmployeeFileUpload(
    env.EMPLOYEE_DOCUMENT_MAX_FILE_SIZE_BYTES,
    "Employee document",
    "EMPLOYEE_DOCUMENT_FILE_TOO_LARGE",
    "EMPLOYEE_DOCUMENT_UPLOAD_INVALID"
  );

export const uploadSingleEmployeeProfilePhoto =
  createSingleEmployeeFileUpload(
    env.EMPLOYEE_PROFILE_PHOTO_MAX_FILE_SIZE_BYTES,
    "Employee photo",
    "EMPLOYEE_PHOTO_TOO_LARGE",
    "EMPLOYEE_PHOTO_UPLOAD_INVALID"
  );

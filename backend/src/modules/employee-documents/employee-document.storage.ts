import {
  createHash,
  randomUUID
} from "node:crypto";

import {
  mkdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import {
  fileTypeFromBuffer
} from "file-type";

import {
  AppError
} from "../../common/errors/app-error.js";

import {
  env
} from "../../config/env.js";

import type {
  StoredEmployeeDocumentFile
} from "./employee-document.types.js";

const allowedMimeTypes =
  new Set<string>([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ]);

const storageRoot =
  path.resolve(
    env.EMPLOYEE_DOCUMENT_STORAGE_DIR
  );

function assertSafeIdentifier(
  value: string,
  fieldName: string
): void {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new AppError({
      message:
        `${fieldName} is invalid`,

      statusCode: 400,

      code:
        "INVALID_STORAGE_IDENTIFIER"
    });
  }
}

function safeOriginalFilename(
  value: string
): string {
  const filename =
    path
      .basename(value)
      .replace(
        /[\u0000-\u001F\u007F]/g,
        ""
      )
      .trim();

  return filename || "document";
}

function assertInsideStorageRoot(
  absolutePath: string
): void {
  const rootWithSeparator =
    `${storageRoot}${path.sep}`;

  if (
    absolutePath !== storageRoot &&
    !absolutePath.startsWith(
      rootWithSeparator
    )
  ) {
    throw new AppError({
      message:
        "Document storage path is invalid",

      statusCode: 500,

      code:
        "DOCUMENT_STORAGE_PATH_INVALID"
    });
  }
}

export function resolveEmployeeDocumentPath(
  storagePath: string
): string {
  const absolutePath =
    path.resolve(
      storageRoot,
      storagePath
    );

  assertInsideStorageRoot(
    absolutePath
  );

  return absolutePath;
}

export async function storeEmployeeDocumentFile(
  companyId: string,
  employeeId: string,
  file: Express.Multer.File
): Promise<StoredEmployeeDocumentFile> {
  assertSafeIdentifier(
    companyId,
    "Company ID"
  );

  assertSafeIdentifier(
    employeeId,
    "Employee ID"
  );

  if (
    !file.buffer ||
    file.buffer.length === 0
  ) {
    throw new AppError({
      message:
        "The uploaded file is empty",

      statusCode: 422,

      code:
        "EMPLOYEE_DOCUMENT_FILE_EMPTY"
    });
  }

  const detectedType =
    await fileTypeFromBuffer(
      file.buffer
    );

  if (
    !detectedType ||
    !allowedMimeTypes.has(
      detectedType.mime
    )
  ) {
    throw new AppError({
      message:
        "This file type is not allowed. Upload PDF, JPEG, PNG, WebP, DOCX, XLSX or PPTX files.",

      statusCode: 415,

      code:
        "EMPLOYEE_DOCUMENT_FILE_TYPE_NOT_ALLOWED"
    });
  }

  const now =
    new Date();

  const year =
    String(
      now.getUTCFullYear()
    );

  const month =
    String(
      now.getUTCMonth() + 1
    ).padStart(2, "0");

  const storedFilename =
    `${randomUUID()}.${detectedType.ext}`;

  const storagePath =
    path.posix.join(
      "companies",
      companyId,
      "employees",
      employeeId,
      "documents",
      year,
      month,
      storedFilename
    );

  const absolutePath =
    resolveEmployeeDocumentPath(
      storagePath
    );

  await mkdir(
    path.dirname(
      absolutePath
    ),
    {
      recursive: true
    }
  );

  await writeFile(
    absolutePath,
    file.buffer,
    {
      flag: "wx"
    }
  );

  return {
    originalFilename:
      safeOriginalFilename(
        file.originalname
      ),

    storedFilename,

    storagePath,

    mimeType:
      detectedType.mime,

    fileSizeBytes:
      String(
        file.buffer.length
      ),

    checksumSha256:
      createHash(
        "sha256"
      )
        .update(
          file.buffer
        )
        .digest(
          "hex"
        )
  };
}

export async function employeeDocumentFileExists(
  storagePath: string
): Promise<boolean> {
  try {
    const fileStats =
      await stat(
        resolveEmployeeDocumentPath(
          storagePath
        )
      );

    return fileStats.isFile();
  } catch {
    return false;
  }
}

export async function removeEmployeeDocumentFile(
  storagePath: string
): Promise<void> {
  const absolutePath =
    resolveEmployeeDocumentPath(
      storagePath
    );

  await rm(
    absolutePath,
    {
      force: true
    }
  );
}

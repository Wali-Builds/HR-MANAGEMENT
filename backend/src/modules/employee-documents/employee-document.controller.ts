import {
  createReadStream
} from "node:fs";

import {
  pipeline
} from "node:stream/promises";

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
  CreateEmployeeDocumentInput,
  EmployeeDocumentListQuery,
  UpdateEmployeeDocumentInput
} from "./employee-document.schema.js";

import {
  createEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeDocument,
  getEmployeeDocumentContent,
  listEmployeeDocuments,
  replaceEmployeeDocumentFile,
  updateEmployeeDocument
} from "./employee-document.service.js";

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

function contentDisposition(
  disposition:
    | "inline"
    | "attachment",
  filename: string
): string {
  const safeFallback =
    filename
      .replace(
        /["\\\r\n]/g,
        "_"
      )
      .slice(
        0,
        180
      ) ||
    "document";

  return (
    `${disposition}; ` +
    `filename="${safeFallback}"; ` +
    `filename*=UTF-8''${encodeURIComponent(filename)}`
  );
}

async function streamEmployeeDocument(
  employeeId: string,
  documentId: string,
  disposition:
    | "inline"
    | "attachment",
  response: Response
): Promise<void> {
  const content =
    await getEmployeeDocumentContent(
      employeeId,
      documentId,
      getAuthContext(response)
    );

  response.setHeader(
    "Content-Type",
    content.mimeType
  );

  response.setHeader(
    "Content-Disposition",
    contentDisposition(
      disposition,
      content.originalFilename
    )
  );

  response.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  response.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  if (content.fileSizeBytes) {
    response.setHeader(
      "Content-Length",
      content.fileSizeBytes
    );
  }

  await pipeline(
    createReadStream(
      content.absolutePath
    ),
    response
  );
}

export async function listEmployeeDocumentsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeDocumentListQuery;
    };

  const documents =
    await listEmployeeDocuments(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee documents retrieved successfully",

    data: {
      documents
    }
  });
}

export async function getEmployeeDocumentController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };
    };

  const document =
    await getEmployeeDocument(
      validated.params.employeeId,
      validated.params.documentId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee document retrieved successfully",

    data: {
      document
    }
  });
}

export async function previewEmployeeDocumentController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };
    };

  await streamEmployeeDocument(
    validated.params.employeeId,
    validated.params.documentId,
    "inline",
    response
  );
}

export async function downloadEmployeeDocumentController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };
    };

  await streamEmployeeDocument(
    validated.params.employeeId,
    validated.params.documentId,
    "attachment",
    response
  );
}

export async function createEmployeeDocumentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeDocumentInput;
    };

  const document =
    await createEmployeeDocument(
      validated.params.employeeId,
      validated.body,
      request.file,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee document uploaded successfully",

    data: {
      document
    }
  });
}

export async function updateEmployeeDocumentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };

      body:
        UpdateEmployeeDocumentInput;
    };

  const document =
    await updateEmployeeDocument(
      validated.params.employeeId,
      validated.params.documentId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee document updated successfully",

    data: {
      document
    }
  });
}

export async function replaceEmployeeDocumentFileController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };
    };

  const document =
    await replaceEmployeeDocumentFile(
      validated.params.employeeId,
      validated.params.documentId,
      request.file,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee document file replaced successfully",

    data: {
      document
    }
  });
}

export async function deleteEmployeeDocumentController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        documentId: string;
      };
    };

  await deleteEmployeeDocument(
    validated.params.employeeId,
    validated.params.documentId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee document deleted successfully",

    data: null
  });
}

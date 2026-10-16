import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createEmployeeDocumentRecord,
  deleteEmployeeDocumentRecord,
  findEmployeeDocumentOwnerById,
  findEmployeeDocumentRecord,
  listEmployeeDocumentRecords,
  updateEmployeeDocumentRecord
} from "./employee-document.repository.js";

import {
  employeeDocumentFileExists,
  removeEmployeeDocumentFile,
  resolveEmployeeDocumentPath,
  storeEmployeeDocumentFile
} from "./employee-document.storage.js";

import type {
  CreateEmployeeDocumentInput,
  EmployeeDocumentListQuery,
  UpdateEmployeeDocumentInput
} from "./employee-document.schema.js";

import type {
  CreateEmployeeDocumentRecord,
  EmployeeDocumentActor,
  EmployeeDocumentContent,
  EmployeeDocumentDatabaseRow,
  EmployeeDocumentOwnerDatabaseRow,
  EmployeeDocumentResponse,
  RequestMetadata,
  UpdateEmployeeDocumentRecord
} from "./employee-document.types.js";

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function nullableId(
  value:
    | string
    | number
    | bigint
    | null
): string | null {
  return value === null
    ? null
    : String(value);
}

function fileSizeToString(
  value:
    | string
    | number
    | bigint
    | null
): string | null {
  return value === null
    ? null
    : String(value);
}

function dateOnly(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    return value.slice(0, 10);
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date
    .toISOString()
    .slice(0, 10);
}

function dateTimeIso(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
}

function requiredDateTimeIso(
  value: Date | string
): string {
  return dateTimeIso(value) as string;
}

function getCurrentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getAuthPermissions(
  auth: AuthContext
): string[] {
  const authWithPermissions =
    auth as AuthContext & {
      permissions?: string[];
    };

  return Array.isArray(
    authWithPermissions.permissions
  )
    ? authWithPermissions.permissions
    : [];
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  // edited by wali: Include the linked Company Administrator in employee-document permission checks.
  const isTenantCompanyAdmin = Boolean(
    auth.companyId &&
    auth.roleCodes.includes("COMPANY_ADMIN")
  );

  if (auth.isPlatformAdmin) {
    return true;
  }

  return (
    getAuthPermissions(auth).includes(permissionCode) ||
    (isTenantCompanyAdmin && permissionCode.startsWith("employee."))
  );
}

function createActor(
  auth: AuthContext
): EmployeeDocumentActor {
  return {
    userId:
      auth.userId,

    employeeId:
      auth.employeeId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin,

    permissions:
      getAuthPermissions(auth)
  };
}

function mapEmployeeDocument(
  document: EmployeeDocumentDatabaseRow
): EmployeeDocumentResponse {
  const expiryDate =
    dateOnly(
      document.expiry_date
    );

  return {
    documentId:
      String(document.document_id),

    employeeId:
      String(document.employee_id),

    documentCategory:
      document.document_category,

    documentTitle:
      document.document_title,

    originalFilename:
      document.original_filename,

    storedFilename:
      document.stored_filename,

    storagePath:
      document.storage_path,

    mimeType:
      document.mime_type,

    fileSizeBytes:
      fileSizeToString(
        document.file_size_bytes
      ),

    checksumSha256:
      document.checksum_sha256,

    documentNumber:
      document.document_number,

    issueDate:
      dateOnly(
        document.issue_date
      ),

    expiryDate,

    isExpired:
      expiryDate !== null &&
      expiryDate <
        getCurrentDateOnly(),

    isConfidential:
      databaseBoolean(
        document.is_confidential
      ),

    uploadedByUserId:
      nullableId(
        document.uploaded_by_user_id
      ),

    uploaderUsername:
      document.uploader_username,

    uploaderFullName:
      document.uploader_full_name,

    createdAt:
      requiredDateTimeIso(
        document.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        document.updated_at
      )
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeDocumentOwnerDatabaseRow> {
  const employee =
    await findEmployeeDocumentOwnerById(
      employeeId
    );

  if (!employee) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  return employee;
}

function assertSameCompany(
  auth: AuthContext,
  employee: EmployeeDocumentOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    String(employee.company_id) !==
      auth.companyId
  ) {
    throw new AppError({
      message:
        "You cannot access an employee belonging to another company",

      statusCode: 403,

      code:
        "EMPLOYEE_ACCESS_DENIED"
    });
  }
}

function assertViewAccess(
  auth: AuthContext,
  employee: EmployeeDocumentOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  const isOwnProfile =
    auth.employeeId !== null &&
    String(employee.employee_id) ===
      auth.employeeId;

  if (isOwnProfile) {
    return;
  }

  if (
    hasPermission(
      auth,
      "employee.view_all"
    ) ||
    hasPermission(
      auth,
      "employee.update"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view this employee's documents",

    statusCode: 403,

    code:
      "EMPLOYEE_DOCUMENT_VIEW_DENIED"
  });
}

function assertManageAccess(
  auth: AuthContext,
  employee: EmployeeDocumentOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  if (
    hasPermission(
      auth,
      "employee.update"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage employee documents",

    statusCode: 403,

    code:
      "EMPLOYEE_DOCUMENT_UPDATE_DENIED"
  });
}

function assertDocumentDates(
  issueDate: string | null,
  expiryDate: string | null
): void {
  if (
    issueDate !== null &&
    expiryDate !== null &&
    expiryDate < issueDate
  ) {
    throw new AppError({
      message:
        "Document expiry date cannot be before the issue date",

      statusCode: 422,

      code:
        "INVALID_DOCUMENT_DATE_RANGE"
    });
  }
}

function requireUploadedFile(
  file:
    | Express.Multer.File
    | undefined
): Express.Multer.File {
  if (!file) {
    throw new AppError({
      message:
        "Select a document file to upload",

      statusCode: 422,

      code:
        "EMPLOYEE_DOCUMENT_FILE_REQUIRED"
    });
  }

  return file;
}

function translateRepositoryError(
  error: unknown
): never {
  if (
    error instanceof Error &&
    error.message ===
      "EMPLOYEE_NOT_FOUND"
  ) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "NO_DOCUMENT_UPDATE_FIELDS"
  ) {
    throw new AppError({
      message:
        "At least one document field is required",

      statusCode: 422,

      code:
        "DOCUMENT_UPDATE_FIELDS_REQUIRED"
    });
  }

  throw error;
}

export async function listEmployeeDocuments(
  employeeId: string,
  query: EmployeeDocumentListQuery,
  auth: AuthContext
): Promise<EmployeeDocumentResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeDocumentRecords(
      employeeId,
      {
        category:
          query.category,

        search:
          query.search,

        expiryStatus:
          query.expiryStatus,

        confidentialOnly:
          query.confidentialOnly
      }
    );

  return records.map(
    mapEmployeeDocument
  );
}

export async function getEmployeeDocument(
  employeeId: string,
  documentId: string,
  auth: AuthContext
): Promise<EmployeeDocumentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const document =
    await findEmployeeDocumentRecord(
      employeeId,
      documentId
    );

  if (!document) {
    throw new AppError({
      message:
        "Employee document was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_DOCUMENT_NOT_FOUND"
    });
  }

  return mapEmployeeDocument(
    document
  );
}

export async function getEmployeeDocumentContent(
  employeeId: string,
  documentId: string,
  auth: AuthContext
): Promise<EmployeeDocumentContent> {
  const document =
    await getEmployeeDocument(
      employeeId,
      documentId,
      auth
    );

  const exists =
    await employeeDocumentFileExists(
      document.storagePath
    );

  if (!exists) {
    throw new AppError({
      message:
        "The stored employee-document file could not be found",

      statusCode: 404,

      code:
        "EMPLOYEE_DOCUMENT_FILE_NOT_FOUND"
    });
  }

  return {
    absolutePath:
      resolveEmployeeDocumentPath(
        document.storagePath
      ),

    originalFilename:
      document.originalFilename,

    mimeType:
      document.mimeType ??
      "application/octet-stream",

    fileSizeBytes:
      document.fileSizeBytes
  };
}

export async function createEmployeeDocument(
  employeeId: string,
  input: CreateEmployeeDocumentInput,
  file:
    | Express.Multer.File
    | undefined,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeDocumentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  assertDocumentDates(
    input.issueDate ?? null,
    input.expiryDate ?? null
  );

  const storedFile =
    await storeEmployeeDocumentFile(
      String(
        employee.company_id
      ),
      employeeId,
      requireUploadedFile(file)
    );

  const record:
  CreateEmployeeDocumentRecord = {
    employeeId,

    documentCategory:
      input.documentCategory,

    documentTitle:
      input.documentTitle ?? null,

    originalFilename:
      storedFile.originalFilename,

    storedFilename:
      storedFile.storedFilename,

    storagePath:
      storedFile.storagePath,

    mimeType:
      storedFile.mimeType,

    fileSizeBytes:
      storedFile.fileSizeBytes,

    checksumSha256:
      storedFile.checksumSha256,

    documentNumber:
      input.documentNumber ?? null,

    issueDate:
      input.issueDate ?? null,

    expiryDate:
      input.expiryDate ?? null,

    isConfidential:
      input.isConfidential,

    uploadedByUserId:
      auth.userId
  };

  try {
    const createdDocument =
      await createEmployeeDocumentRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEmployeeDocument(
      createdDocument
    );
  } catch (error) {
    await removeEmployeeDocumentFile(
      storedFile.storagePath
    ).catch(
      () => undefined
    );

    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeDocument(
  employeeId: string,
  documentId: string,
  input: UpdateEmployeeDocumentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeDocumentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existingDocument =
    await findEmployeeDocumentRecord(
      employeeId,
      documentId
    );

  if (!existingDocument) {
    throw new AppError({
      message:
        "Employee document was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_DOCUMENT_NOT_FOUND"
    });
  }

  const resultingIssueDate =
    input.issueDate !== undefined
      ? input.issueDate
      : dateOnly(
          existingDocument.issue_date
        );

  const resultingExpiryDate =
    input.expiryDate !== undefined
      ? input.expiryDate
      : dateOnly(
          existingDocument.expiry_date
        );

  assertDocumentDates(
    resultingIssueDate,
    resultingExpiryDate
  );

  const record:
  UpdateEmployeeDocumentRecord = {
    ...(input.documentCategory !==
    undefined
      ? {
          documentCategory:
            input.documentCategory
        }
      : {}),

    ...(input.documentTitle !==
    undefined
      ? {
          documentTitle:
            input.documentTitle
        }
      : {}),

    ...(input.documentNumber !==
    undefined
      ? {
          documentNumber:
            input.documentNumber
        }
      : {}),

    ...(input.issueDate !== undefined
      ? {
          issueDate:
            input.issueDate
        }
      : {}),

    ...(input.expiryDate !== undefined
      ? {
          expiryDate:
            input.expiryDate
        }
      : {}),

    ...(input.isConfidential !==
    undefined
      ? {
          isConfidential:
            input.isConfidential
        }
      : {})
  };

  try {
    const updatedDocument =
      await updateEmployeeDocumentRecord(
        employeeId,
        documentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updatedDocument) {
      throw new AppError({
        message:
          "Employee document was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_DOCUMENT_NOT_FOUND"
      });
    }

    return mapEmployeeDocument(
      updatedDocument
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function replaceEmployeeDocumentFile(
  employeeId: string,
  documentId: string,
  file:
    | Express.Multer.File
    | undefined,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeDocumentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existingDocument =
    await findEmployeeDocumentRecord(
      employeeId,
      documentId
    );

  if (!existingDocument) {
    throw new AppError({
      message:
        "Employee document was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_DOCUMENT_NOT_FOUND"
    });
  }

  const storedFile =
    await storeEmployeeDocumentFile(
      String(
        employee.company_id
      ),
      employeeId,
      requireUploadedFile(file)
    );

  try {
    const updatedDocument =
      await updateEmployeeDocumentRecord(
        employeeId,
        documentId,
        {
          originalFilename:
            storedFile.originalFilename,

          storedFilename:
            storedFile.storedFilename,

          storagePath:
            storedFile.storagePath,

          mimeType:
            storedFile.mimeType,

          fileSizeBytes:
            storedFile.fileSizeBytes,

          checksumSha256:
            storedFile.checksumSha256
        },
        createActor(auth),
        metadata
      );

    if (!updatedDocument) {
      throw new AppError({
        message:
          "Employee document was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_DOCUMENT_NOT_FOUND"
      });
    }

    await removeEmployeeDocumentFile(
      existingDocument.storage_path
    ).catch(
      () => undefined
    );

    return mapEmployeeDocument(
      updatedDocument
    );
  } catch (error) {
    await removeEmployeeDocumentFile(
      storedFile.storagePath
    ).catch(
      () => undefined
    );

    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeDocument(
  employeeId: string,
  documentId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existingDocument =
    await findEmployeeDocumentRecord(
      employeeId,
      documentId
    );

  if (!existingDocument) {
    throw new AppError({
      message:
        "Employee document was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_DOCUMENT_NOT_FOUND"
    });
  }

  try {
    const deleted =
      await deleteEmployeeDocumentRecord(
        employeeId,
        documentId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Employee document was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_DOCUMENT_NOT_FOUND"
      });
    }

    await removeEmployeeDocumentFile(
      existingDocument.storage_path
    ).catch(
      () => undefined
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

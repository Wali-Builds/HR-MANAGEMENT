import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateEmployeeDocumentRecord,
  EmployeeDocumentActor,
  EmployeeDocumentDatabaseRow,
  EmployeeDocumentOwnerDatabaseRow,
  RequestMetadata,
  UpdateEmployeeDocumentRecord
} from "./employee-document.types.js";

interface LockedEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
}

interface EmployeeDocumentListFilters {
  category?:
    | string
    | undefined;

  search?:
    | string
    | undefined;

  expiryStatus:
    | "ALL"
    | "VALID"
    | "EXPIRED"
    | "NO_EXPIRY";

  confidentialOnly: boolean;
}

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? String(currentValue)
        : currentValue
  );
}

async function lockEmployeeRecord(
  connection: PoolConnection,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: EmployeeDocumentActor;
    actionName: string;
    recordId: string;

    oldValues?:
      | unknown
      | undefined;

    newValues?:
      | unknown
      | undefined;

    requestMethod: string;
    requestPath: string;
    metadata: RequestMetadata;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO activity_logs (
          company_id,
          user_id,
          module_name,
          action_name,
          table_name,
          record_id,
          old_values,
          new_values,
          request_method,
          request_path,
          ip_address,
          user_agent
      )
      VALUES (
          ?,
          ?,
          'employee',
          ?,
          'employee_documents',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
      )
    `,
    [
      input.companyId,
      input.actor.userId,
      input.actionName,
      input.recordId,

      input.oldValues === undefined
        ? null
        : safeJson(input.oldValues),

      input.newValues === undefined
        ? null
        : safeJson(input.newValues),

      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

const employeeDocumentSelect = `
  SELECT
      d.document_id,
      d.employee_id,
      d.document_category,
      d.document_title,
      d.original_filename,
      d.stored_filename,
      d.storage_path,
      d.mime_type,
      d.file_size_bytes,
      d.checksum_sha256,
      d.document_number,
      d.issue_date,
      d.expiry_date,
      d.is_confidential,
      d.uploaded_by_user_id,

      u.username
          AS uploader_username,

      COALESCE(
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              uploader_employee.first_name,
              uploader_employee.middle_name,
              uploader_employee.last_name
            )
          ),
          ''
        ),
        u.username
      ) AS uploader_full_name,

      d.deleted_at,
      d.created_at,
      d.updated_at
  FROM employee_documents d

  LEFT JOIN users u
      ON u.user_id =
         d.uploaded_by_user_id

  LEFT JOIN employees uploader_employee
      ON uploader_employee.employee_id =
         u.employee_id
`;

async function selectEmployeeDocumentUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  documentId: string,
  lockRecord: boolean
): Promise<EmployeeDocumentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeDocumentSelect}
        WHERE d.document_id = ?
          AND d.employee_id = ?
          AND d.deleted_at IS NULL
        LIMIT 1
        ${lockRecord ? "FOR UPDATE" : ""}
      `,
      [
        documentId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeDocumentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export async function findEmployeeDocumentOwnerById(
  employeeId: string
): Promise<EmployeeDocumentOwnerDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            employee_id,
            company_id,
            employee_code,
            first_name,
            middle_name,
            last_name,
            is_active,
            deleted_at
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeDocumentOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * List and get
 * =========================================================
 */

export async function listEmployeeDocumentRecords(
  employeeId: string,
  filters: EmployeeDocumentListFilters
): Promise<EmployeeDocumentDatabaseRow[]> {
  const conditions: string[] = [
    "d.employee_id = ?",
    "d.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    employeeId
  ];

  if (filters.category) {
    conditions.push(
      "d.document_category = ?"
    );

    parameters.push(
      filters.category
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        d.document_title LIKE ?
        OR d.original_filename LIKE ?
        OR d.stored_filename LIKE ?
        OR d.document_number LIKE ?
        OR d.document_category LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (
    filters.expiryStatus ===
    "VALID"
  ) {
    conditions.push(`
      d.expiry_date IS NOT NULL
      AND d.expiry_date >= CURRENT_DATE
    `);
  }

  if (
    filters.expiryStatus ===
    "EXPIRED"
  ) {
    conditions.push(`
      d.expiry_date IS NOT NULL
      AND d.expiry_date < CURRENT_DATE
    `);
  }

  if (
    filters.expiryStatus ===
    "NO_EXPIRY"
  ) {
    conditions.push(
      "d.expiry_date IS NULL"
    );
  }

  if (filters.confidentialOnly) {
    conditions.push(
      "d.is_confidential = 1"
    );
  }

  const rows =
    await databasePool.query(
      `
        ${employeeDocumentSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            d.expiry_date IS NULL ASC,
            d.expiry_date ASC,
            d.document_category ASC,
            d.created_at DESC,
            d.document_id DESC
      `,
      parameters
    );

  return rows as
    EmployeeDocumentDatabaseRow[];
}

export async function findEmployeeDocumentRecord(
  employeeId: string,
  documentId: string
): Promise<EmployeeDocumentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeDocumentSelect}
        WHERE d.document_id = ?
          AND d.employee_id = ?
          AND d.deleted_at IS NULL
        LIMIT 1
      `,
      [
        documentId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeDocumentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Create
 * =========================================================
 */

export async function createEmployeeDocumentRecord(
  input: CreateEmployeeDocumentRecord,
  actor: EmployeeDocumentActor,
  metadata: RequestMetadata
): Promise<EmployeeDocumentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_documents (
              employee_id,
              document_category,
              document_title,
              original_filename,
              stored_filename,
              storage_path,
              mime_type,
              file_size_bytes,
              checksum_sha256,
              document_number,
              issue_date,
              expiry_date,
              is_confidential,
              uploaded_by_user_id
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.employeeId,
          input.documentCategory,
          input.documentTitle,
          input.originalFilename,
          input.storedFilename,
          input.storagePath,
          input.mimeType,
          input.fileSizeBytes,
          input.checksumSha256,
          input.documentNumber,
          input.issueDate,
          input.expiryDate,
          input.isConfidential ? 1 : 0,
          input.uploadedByUserId
        ]
      );

    const documentId =
      String(
        insertResult.insertId
      );

    const createdDocument =
      await selectEmployeeDocumentUsingConnection(
        connection,
        input.employeeId,
        documentId,
        false
      );

    if (!createdDocument) {
      throw new Error(
        "CREATED_EMPLOYEE_DOCUMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_document_created",

        recordId:
          documentId,

        newValues:
          createdDocument,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/documents`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return createdDocument;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Update
 * =========================================================
 */

export async function updateEmployeeDocumentRecord(
  employeeId: string,
  documentId: string,
  input: UpdateEmployeeDocumentRecord,
  actor: EmployeeDocumentActor,
  metadata: RequestMetadata
): Promise<EmployeeDocumentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existingDocument =
      await selectEmployeeDocumentUsingConnection(
        connection,
        employeeId,
        documentId,
        true
      );

    if (!existingDocument) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (
      input.documentCategory !==
      undefined
    ) {
      addUpdate(
        "document_category",
        input.documentCategory
      );
    }

    if (
      input.documentTitle !==
      undefined
    ) {
      addUpdate(
        "document_title",
        input.documentTitle
      );
    }

    if (
      input.originalFilename !==
      undefined
    ) {
      addUpdate(
        "original_filename",
        input.originalFilename
      );
    }

    if (
      input.storedFilename !==
      undefined
    ) {
      addUpdate(
        "stored_filename",
        input.storedFilename
      );
    }

    if (
      input.storagePath !==
      undefined
    ) {
      addUpdate(
        "storage_path",
        input.storagePath
      );
    }

    if (
      input.mimeType !== undefined
    ) {
      addUpdate(
        "mime_type",
        input.mimeType
      );
    }

    if (
      input.fileSizeBytes !==
      undefined
    ) {
      addUpdate(
        "file_size_bytes",
        input.fileSizeBytes
      );
    }

    if (
      input.checksumSha256 !==
      undefined
    ) {
      addUpdate(
        "checksum_sha256",
        input.checksumSha256
      );
    }

    if (
      input.documentNumber !==
      undefined
    ) {
      addUpdate(
        "document_number",
        input.documentNumber
      );
    }

    if (
      input.issueDate !== undefined
    ) {
      addUpdate(
        "issue_date",
        input.issueDate
      );
    }

    if (
      input.expiryDate !== undefined
    ) {
      addUpdate(
        "expiry_date",
        input.expiryDate
      );
    }

    if (
      input.isConfidential !==
      undefined
    ) {
      addUpdate(
        "is_confidential",
        input.isConfidential ? 1 : 0
      );
    }

    if (assignments.length === 0) {
      throw new Error(
        "NO_DOCUMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      documentId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_documents
        SET ${assignments.join(", ")}
        WHERE document_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      parameters
    );

    const updatedDocument =
      await selectEmployeeDocumentUsingConnection(
        connection,
        employeeId,
        documentId,
        false
      );

    if (!updatedDocument) {
      throw new Error(
        "UPDATED_EMPLOYEE_DOCUMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_document_updated",

        recordId:
          documentId,

        oldValues:
          existingDocument,

        newValues:
          updatedDocument,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/documents/${documentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updatedDocument;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Soft delete
 * =========================================================
 */

export async function deleteEmployeeDocumentRecord(
  employeeId: string,
  documentId: string,
  actor: EmployeeDocumentActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existingDocument =
      await selectEmployeeDocumentUsingConnection(
        connection,
        employeeId,
        documentId,
        true
      );

    if (!existingDocument) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE employee_documents
        SET deleted_at =
            CURRENT_TIMESTAMP
        WHERE document_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      [
        documentId,
        employeeId
      ]
    );

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_document_deleted",

        recordId:
          documentId,

        oldValues:
          existingDocument,

        newValues: {
          documentId,
          employeeId,
          deleted: true
        },

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/documents/${documentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return true;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
export type DatabaseId =
  | string
  | number
  | bigint;

export interface EmployeeDocumentOwnerDatabaseRow {
  employee_id: DatabaseId;
  company_id: DatabaseId;

  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;
}

export interface EmployeeDocumentDatabaseRow {
  document_id: DatabaseId;
  employee_id: DatabaseId;

  document_category: string;
  document_title: string | null;

  original_filename: string;
  stored_filename: string;
  storage_path: string;

  mime_type: string | null;

  file_size_bytes:
    | string
    | number
    | bigint
    | null;

  checksum_sha256: string | null;

  document_number: string | null;

  issue_date:
    | Date
    | string
    | null;

  expiry_date:
    | Date
    | string
    | null;

  is_confidential:
    | number
    | boolean;

  uploaded_by_user_id:
    DatabaseId | null;

  uploader_username:
    string | null;

  uploader_full_name:
    string | null;

  deleted_at:
    Date | string | null;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeDocumentResponse {
  documentId: string;
  employeeId: string;

  documentCategory: string;
  documentTitle: string | null;

  originalFilename: string;
  storedFilename: string;
  storagePath: string;

  mimeType: string | null;
  fileSizeBytes: string | null;

  checksumSha256: string | null;

  documentNumber: string | null;

  issueDate: string | null;
  expiryDate: string | null;

  isExpired: boolean;
  isConfidential: boolean;

  uploadedByUserId: string | null;
  uploaderUsername: string | null;
  uploaderFullName: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface StoredEmployeeDocumentFile {
  originalFilename: string;
  storedFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: string;
  checksumSha256: string;
}

export interface EmployeeDocumentContent {
  absolutePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: string | null;
}

export interface CreateEmployeeDocumentRecord {
  employeeId: string;

  documentCategory: string;
  documentTitle: string | null;

  originalFilename: string;
  storedFilename: string;
  storagePath: string;

  mimeType: string | null;
  fileSizeBytes: string | null;

  checksumSha256: string | null;

  documentNumber: string | null;

  issueDate: string | null;
  expiryDate: string | null;

  isConfidential: boolean;

  uploadedByUserId: string;
}

export interface UpdateEmployeeDocumentRecord {
  documentCategory?:
    | string
    | undefined;

  documentTitle?:
    | string
    | null
    | undefined;

  originalFilename?:
    | string
    | undefined;

  storedFilename?:
    | string
    | undefined;

  storagePath?:
    | string
    | undefined;

  mimeType?:
    | string
    | null
    | undefined;

  fileSizeBytes?:
    | string
    | null
    | undefined;

  checksumSha256?:
    | string
    | null
    | undefined;

  documentNumber?:
    | string
    | null
    | undefined;

  issueDate?:
    | string
    | null
    | undefined;

  expiryDate?:
    | string
    | null
    | undefined;

  isConfidential?:
    | boolean
    | undefined;
}

export interface EmployeeDocumentActor {
  userId: string;
  employeeId: string | null;
  companyId: string | null;
  isPlatformAdmin: boolean;
  permissions: string[];
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

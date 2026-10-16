export type EmployeeDocumentExpiryStatus =
  | "ALL"
  | "VALID"
  | "EXPIRED"
  | "NO_EXPIRY";

export interface EmployeeDocument {
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

export interface EmployeeDocumentListParams {
  search?: string;
  category?: string;
  expiryStatus: EmployeeDocumentExpiryStatus;
  confidentialOnly: boolean;
}

export interface EmployeeDocumentMetadataInput {
  documentCategory: string;
  documentTitle: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isConfidential: boolean;
}

export interface UploadEmployeeDocumentInput
  extends EmployeeDocumentMetadataInput {
  file: File;
}

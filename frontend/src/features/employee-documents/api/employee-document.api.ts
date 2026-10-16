import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  EmployeeDocument,
  EmployeeDocumentListParams,
  EmployeeDocumentMetadataInput,
  UploadEmployeeDocumentInput,
} from "../types/employee-document.types";

interface EmployeeDocumentListData {
  documents: EmployeeDocument[];
}

function appendMetadata(
  formData: FormData,
  input: EmployeeDocumentMetadataInput,
): void {
  formData.append("documentCategory", input.documentCategory);
  formData.append("documentTitle", input.documentTitle ?? "");
  formData.append("documentNumber", input.documentNumber ?? "");
  formData.append("issueDate", input.issueDate ?? "");
  formData.append("expiryDate", input.expiryDate ?? "");
  formData.append("isConfidential", String(input.isConfidential));
}

export async function listEmployeeDocumentsRequest(
  employeeId: string,
  params: EmployeeDocumentListParams,
): Promise<EmployeeDocument[]> {
  const response = await apiClient.get<
    ApiSuccessResponse<EmployeeDocumentListData>
  >(`/employees/${employeeId}/documents`, { params });

  return response.data.data.documents;
}

export async function uploadEmployeeDocumentRequest(
  employeeId: string,
  input: UploadEmployeeDocumentInput,
): Promise<EmployeeDocument> {
  const formData = new FormData();
  formData.append("file", input.file);
  appendMetadata(formData, input);

  const response = await apiClient.post<
    ApiSuccessResponse<{ document: EmployeeDocument }>
  >(`/employees/${employeeId}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data.document;
}

export async function updateEmployeeDocumentRequest(
  employeeId: string,
  documentId: string,
  input: EmployeeDocumentMetadataInput,
): Promise<EmployeeDocument> {
  const response = await apiClient.patch<
    ApiSuccessResponse<{ document: EmployeeDocument }>
  >(`/employees/${employeeId}/documents/${documentId}`, input);

  return response.data.data.document;
}

export async function replaceEmployeeDocumentFileRequest(
  employeeId: string,
  documentId: string,
  file: File,
): Promise<EmployeeDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.put<
    ApiSuccessResponse<{ document: EmployeeDocument }>
  >(`/employees/${employeeId}/documents/${documentId}/file`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data.document;
}

export async function deleteEmployeeDocumentRequest(
  employeeId: string,
  documentId: string,
): Promise<void> {
  await apiClient.delete(
    `/employees/${employeeId}/documents/${documentId}`,
  );
}

export async function getEmployeeDocumentBlobRequest(
  employeeId: string,
  documentId: string,
  disposition: "preview" | "download",
): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/employees/${employeeId}/documents/${documentId}/${disposition}`,
    {
      responseType: "blob",
    },
  );

  return response.data;
}

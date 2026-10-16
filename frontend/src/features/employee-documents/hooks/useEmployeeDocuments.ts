import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  deleteEmployeeDocumentRequest,
  listEmployeeDocumentsRequest,
  replaceEmployeeDocumentFileRequest,
  updateEmployeeDocumentRequest,
  uploadEmployeeDocumentRequest,
} from "../api/employee-document.api";
import type {
  EmployeeDocumentListParams,
  EmployeeDocumentMetadataInput,
  UploadEmployeeDocumentInput,
} from "../types/employee-document.types";

export const employeeDocumentQueryKeys = {
  all: ["employee-documents"] as const,
  list: (
    employeeId: string,
    params: EmployeeDocumentListParams,
  ) => [...employeeDocumentQueryKeys.all, employeeId, params] as const,
  employee: (employeeId: string) =>
    [...employeeDocumentQueryKeys.all, employeeId] as const,
};

export function useEmployeeDocuments(
  employeeId: string | null,
  params: EmployeeDocumentListParams,
) {
  return useQuery({
    queryKey: employeeDocumentQueryKeys.list(
      employeeId ?? "",
      params,
    ),
    queryFn: () =>
      listEmployeeDocumentsRequest(employeeId ?? "", params),
    enabled: Boolean(employeeId),
  });
}

export function useUploadEmployeeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      input,
    }: {
      employeeId: string;
      input: UploadEmployeeDocumentInput;
    }) => uploadEmployeeDocumentRequest(employeeId, input),
    onSuccess: async (_document, variables) => {
      await queryClient.invalidateQueries({
        queryKey: employeeDocumentQueryKeys.employee(
          variables.employeeId,
        ),
      });
    },
  });
}

export function useUpdateEmployeeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      documentId,
      input,
    }: {
      employeeId: string;
      documentId: string;
      input: EmployeeDocumentMetadataInput;
    }) =>
      updateEmployeeDocumentRequest(
        employeeId,
        documentId,
        input,
      ),
    onSuccess: async (_document, variables) => {
      await queryClient.invalidateQueries({
        queryKey: employeeDocumentQueryKeys.employee(
          variables.employeeId,
        ),
      });
    },
  });
}

export function useReplaceEmployeeDocumentFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      documentId,
      file,
    }: {
      employeeId: string;
      documentId: string;
      file: File;
    }) =>
      replaceEmployeeDocumentFileRequest(
        employeeId,
        documentId,
        file,
      ),
    onSuccess: async (_document, variables) => {
      await queryClient.invalidateQueries({
        queryKey: employeeDocumentQueryKeys.employee(
          variables.employeeId,
        ),
      });
    },
  });
}

export function useDeleteEmployeeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      documentId,
    }: {
      employeeId: string;
      documentId: string;
    }) => deleteEmployeeDocumentRequest(employeeId, documentId),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: employeeDocumentQueryKeys.employee(
          variables.employeeId,
        ),
      });
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileSearch,
  FileText,
  FileUp,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCompanies } from "../../companies/hooks/useCompanies";
import { listEmployeesRequest } from "../../employees/api/employee.api";
import { EmployeeAvatar } from "../../employees/components/EmployeeAvatar";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { useEmployee } from "../../employees/hooks/useEmployees";
import type { Employee } from "../../employees/types/employee.types";
import { getEmployeeDocumentBlobRequest } from "../api/employee-document.api";
import {
  EmployeeDocumentDeleteDialog,
  EmployeeDocumentEditDialog,
  EmployeeDocumentReplaceDialog,
  EmployeeDocumentUploadDialog,
} from "../components/EmployeeDocumentDialogs";
import { EmployeeDocumentTable } from "../components/EmployeeDocumentTable";
import { OrganisationDialogMotionProvider, useRequiredOrganisationDialogMotion } from "../../organisation/components/OrganisationDialogMotion";
import {
  useDeleteEmployeeDocument,
  useEmployeeDocuments,
  useReplaceEmployeeDocumentFile,
  useUpdateEmployeeDocument,
  useUploadEmployeeDocument,
} from "../hooks/useEmployeeDocuments";
import type {
  EmployeeDocument,
  EmployeeDocumentExpiryStatus,
  EmployeeDocumentMetadataInput,
  UploadEmployeeDocumentInput,
} from "../types/employee-document.types";

const COMMON_CATEGORIES = [
  "",
  "IDENTITY",
  "CONTRACT",
  "EDUCATION",
  "EXPERIENCE",
  "CERTIFICATE",
  "POLICY",
  "MEDICAL",
  "PAYROLL",
  "OTHER",
];

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function EmployeeDocumentsPageContent() {
  const dialogMotion = useRequiredOrganisationDialogMotion();
  const user = useAuthStore((state) => state.user);
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const canViewAll = hasPermission("employee.view_all");
  const canManage = hasPermission("employee.update");
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCompanyId, setSelectedCompanyId] = useState(
    searchParams.get("companyId") ?? user?.companyId ?? "",
  );
  const [employeeSearch, setEmployeeSearch] = useState("");
  const deferredEmployeeSearch = useDeferredValue(employeeSearch.trim());
  const [documentSearch, setDocumentSearch] = useState("");
  const deferredDocumentSearch = useDeferredValue(documentSearch.trim());
  const [category, setCategory] = useState("");
  const [expiryStatus, setExpiryStatus] = useState<EmployeeDocumentExpiryStatus>("ALL");
  const [confidentialOnly, setConfidentialOnly] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<EmployeeDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<EmployeeDocument | null>(null);
  const [fileActionId, setFileActionId] = useState<string | null>(null);

  const ownEmployeeId = user?.employeeId ?? null;
  const requestedEmployeeId = searchParams.get("employeeId");
  const selectedEmployeeId = canViewAll
    ? requestedEmployeeId
    : ownEmployeeId;
  const scopeCompanyId = isPlatformAdmin
    ? selectedCompanyId || undefined
    : user?.companyId ?? undefined;
  // edited by wali: Load the platform company directory only for Platform Admins.
  const companiesQuery = useCompanies({
    page: 1,
    limit: 100,
    sortBy: "display_name",
    sortOrder: "ASC",
    isActive: true,
  }, isPlatformAdmin);

  const employeeListQuery = useQuery({
    queryKey: [
      "employee-document-employee-selector",
      scopeCompanyId ?? "none",
      deferredEmployeeSearch,
    ],
    queryFn: () =>
      listEmployeesRequest({
        page: 1,
        limit: 100,
        sortBy: "first_name",
        sortOrder: "ASC",
        ...(scopeCompanyId ? { companyId: scopeCompanyId } : {}),
        ...(deferredEmployeeSearch
          ? { search: deferredEmployeeSearch }
          : {}),
      }),
    enabled:
      canViewAll &&
      (!isPlatformAdmin || Boolean(scopeCompanyId)),
    staleTime: 60_000,
  });

  const employees = employeeListQuery.data?.employees ?? [];
  const selectedEmployeeQuery = useEmployee(selectedEmployeeId);
  const selectedEmployee = selectedEmployeeQuery.data;

  useEffect(() => {
    if (
      canViewAll &&
      !requestedEmployeeId &&
      employees.length > 0
    ) {
      const next = new URLSearchParams(searchParams);
      next.set("employeeId", employees[0]!.employeeId);
      if (selectedCompanyId) next.set("companyId", selectedCompanyId);
      setSearchParams(next, { replace: true });
    }
  }, [
    canViewAll,
    employees,
    requestedEmployeeId,
    searchParams,
    selectedCompanyId,
    setSearchParams,
  ]);

  const documentParams = useMemo(
    () => ({
      expiryStatus,
      confidentialOnly,
      ...(deferredDocumentSearch
        ? { search: deferredDocumentSearch }
        : {}),
      ...(category ? { category } : {}),
    }),
    [
      category,
      confidentialOnly,
      deferredDocumentSearch,
      expiryStatus,
    ],
  );

  const documentsQuery = useEmployeeDocuments(
    selectedEmployeeId,
    documentParams,
  );
  const uploadMutation = useUploadEmployeeDocument();
  const updateMutation = useUpdateEmployeeDocument();
  const replaceMutation = useReplaceEmployeeDocumentFile();
  const deleteMutation = useDeleteEmployeeDocument();
  const documents = documentsQuery.data ?? [];

  // edited by wali: Route document form closes through the shared 360 ms transition.
  function closeUpload() { dialogMotion.close(() => setUploadOpen(false)); }
  function closeEdit() { dialogMotion.close(() => setEditingDocument(null)); }
  function closeReplace() { dialogMotion.close(() => setReplacingDocument(null)); }
  function closeDelete() { dialogMotion.close(() => setDeletingDocument(null)); }

  const categories = Array.from(
    new Set([
      ...COMMON_CATEGORIES,
      ...documents.map((document) => document.documentCategory),
    ]),
  );

  function selectEmployee(employee: Employee): void {
    const next = new URLSearchParams(searchParams);
    next.set("employeeId", employee.employeeId);
    if (selectedCompanyId) next.set("companyId", selectedCompanyId);
    setSearchParams(next);
  }

  async function upload(inputs: UploadEmployeeDocumentInput[]): Promise<number> {
    if (!selectedEmployeeId) return 0;
    let uploadedCount = 0;
    try {
      for (const input of inputs) {
        await uploadMutation.mutateAsync({
          employeeId: selectedEmployeeId,
          input,
        });
        uploadedCount += 1;
      }
      toast.success(`${uploadedCount} employee document${uploadedCount === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      const message = normalizeApiError(error).message;
      toast.error(uploadedCount > 0
        ? `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded; remaining upload failed: ${message}`
        : message);
    }
    return uploadedCount;
  }

  async function update(input: EmployeeDocumentMetadataInput) {
    if (!selectedEmployeeId || !editingDocument) return;
    try {
      await updateMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        documentId: editingDocument.documentId,
        input,
      });
      toast.success("Document details updated");
      closeEdit();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function replace(file: File) {
    if (!selectedEmployeeId || !replacingDocument) return;
    try {
      await replaceMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        documentId: replacingDocument.documentId,
        file,
      });
      toast.success("Stored document file replaced");
      closeReplace();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function remove() {
    if (!selectedEmployeeId || !deletingDocument) return;
    try {
      await deleteMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        documentId: deletingDocument.documentId,
      });
      toast.success("Employee document deleted");
      closeDelete();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function preview(document: EmployeeDocument) {
    if (!selectedEmployeeId) return;
    const previewWindow = window.open("", "_blank");
    setFileActionId(document.documentId);
    try {
      const blob = await getEmployeeDocumentBlobRequest(
        selectedEmployeeId,
        document.documentId,
        "preview",
      );
      const url = URL.createObjectURL(blob);
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      toast.error(normalizeApiError(error).message);
    } finally {
      setFileActionId(null);
    }
  }

  async function download(document: EmployeeDocument) {
    if (!selectedEmployeeId) return;
    setFileActionId(document.documentId);
    try {
      const blob = await getEmployeeDocumentBlobRequest(
        selectedEmployeeId,
        document.documentId,
        "download",
      );
      saveBlob(blob, document.originalFilename);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setFileActionId(null);
    }
  }

  const platformCompanyRequired =
    isPlatformAdmin && !selectedCompanyId;

  return (
    <section className="doc-workspace doc-workspace--leave-ui">
      <header className="doc-control-panel">
        <div className="doc-control-panel__primary">
          <div className="doc-control-panel__identity">
            <span className="doc-module-icon"><FileText size={18} /></span>
            <div>
              <small>Workforce records</small>
              <h1>Employee documents</h1>
            </div>
          </div>
          <div className="doc-control-panel__actions">
            <button
              type="button"
              className="doc-icon-button"
              onClick={() => void documentsQuery.refetch()}
              title="Refresh documents"
              disabled={!selectedEmployeeId}
            >
              <RefreshCw className={documentsQuery.isFetching ? "spin" : ""} size={16} />
            </button>
            {canManage ? (
              <button
                type="button"
                className="doc-primary-button"
                disabled={!selectedEmployeeId}
                onClick={(event) => { dialogMotion.capture(event); setUploadOpen(true); }}
              >
                <FileUp size={16} /> Upload document
              </button>
            ) : null}
          </div>
        </div>

        <div className="doc-control-panel__secondary">
          {isPlatformAdmin ? (
            <label className="doc-compact-field">
              <Building2 size={15} />
              <EmployeeMenuSelect
                className="doc-compact-select"
                value={selectedCompanyId}
                placeholder="Select company"
                options={(companiesQuery.data?.companies ?? []).map((company) => ({ value: company.companyId, label: company.displayName }))}
                onChange={(companyId) => {
                  setSelectedCompanyId(companyId);
                  const next = new URLSearchParams();
                  if (companyId) next.set("companyId", companyId);
                  setSearchParams(next);
                }}
              />
            </label>
          ) : null}

          <label className="doc-search-field">
            <Search size={15} />
            <input
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="Search title, filename, number or category"
            />
          </label>

          <EmployeeMenuSelect className="doc-filter-select" value={category} placeholder="All categories" options={categories.filter(Boolean).map((item) => ({ value: item, label: item }))} onChange={setCategory} disabled={!selectedEmployeeId} />

          <EmployeeMenuSelect className="doc-filter-select" value={expiryStatus} placeholder="All expiry states" options={[{ value: "ALL", label: "All expiry states" }, { value: "VALID", label: "Valid with expiry" }, { value: "EXPIRED", label: "Expired" }, { value: "NO_EXPIRY", label: "No expiry" }]} onChange={(value) => setExpiryStatus(value as EmployeeDocumentExpiryStatus)} disabled={!selectedEmployeeId} allowClear={false} />

          <label className="doc-confidential-filter">
            <input
              type="checkbox"
              checked={confidentialOnly}
              onChange={(event) => setConfidentialOnly(event.target.checked)}
              disabled={!selectedEmployeeId}
            />
            <LockKeyhole size={13} /> Confidential only
          </label>
        </div>
      </header>

      <div className={`doc-workspace__body ${canViewAll ? "has-employee-rail" : ""}`}>
        {canViewAll ? (
          <aside className="doc-employee-rail">
            <div className="doc-employee-rail__header">
              <div>
                <strong>Employees</strong>
                <span>Select whose documents to manage</span>
              </div>
              <UsersRound size={17} />
            </div>
            <label className="doc-employee-search">
              <Search size={14} />
              <input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search employees"
                disabled={platformCompanyRequired}
              />
            </label>

            <div className="doc-employee-list">
              {platformCompanyRequired ? (
                <div className="doc-rail-state">
                  <Building2 size={21} />
                  <strong>Select a company</strong>
                  <span>Choose an organisation before selecting an employee.</span>
                </div>
              ) : employeeListQuery.isLoading ? (
                <div className="doc-rail-state"><LoaderCircle className="spin" size={20} /><span>Loading employees…</span></div>
              ) : employeeListQuery.isError ? (
                <div className="doc-rail-state"><UserRound size={20} /><span>{normalizeApiError(employeeListQuery.error).message}</span></div>
              ) : employees.length === 0 ? (
                <div className="doc-rail-state"><UserRound size={20} /><strong>No employees found</strong></div>
              ) : (
                employees.map((employee) => (
                  <button
                    type="button"
                    className={employee.employeeId === selectedEmployeeId ? "is-active" : ""}
                    key={employee.employeeId}
                    onClick={() => selectEmployee(employee)}
                  >
                    <EmployeeAvatar employee={employee} size="sm" />
                    <span>
                      <strong>{employee.fullName}</strong>
                      <small>{employee.employeeCode} · {employee.assignment.departmentName ?? "No department"}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        ) : null}

        <main className="doc-record-area">
          {selectedEmployeeId && selectedEmployee ? (
            <header className="doc-selected-employee">
              <EmployeeAvatar employee={selectedEmployee} size="md" />
              <div>
                <small>{selectedEmployee.employeeCode}</small>
                <strong>{selectedEmployee.fullName}</strong>
                <span>
                  {selectedEmployee.assignment.positionTitle ?? selectedEmployee.assignment.designationName ?? "Role not assigned"}
                  {" · "}
                  {selectedEmployee.assignment.departmentName ?? "No department"}
                </span>
              </div>
              <div className="doc-selected-employee__metrics">
                <span><b>{documents.length}</b> visible documents</span>
                <span><b>{documents.filter((item) => item.isExpired).length}</b> expired</span>
                <span><b>{documents.filter((item) => item.isConfidential).length}</b> confidential</span>
              </div>
            </header>
          ) : null}

          {!selectedEmployeeId ? (
            <div className="doc-state-panel">
              <span><FileSearch size={29} /></span>
              <h2>Select an employee</h2>
              <p>Choose an employee to view, upload and maintain their document records.</p>
            </div>
          ) : selectedEmployeeQuery.isLoading || documentsQuery.isLoading ? (
            <div className="doc-state-panel">
              <span><LoaderCircle className="spin" size={27} /></span>
              <h2>Loading employee documents</h2>
            </div>
          ) : selectedEmployeeQuery.isError ? (
            <div className="doc-state-panel doc-state-panel--error">
              <span><UserRound size={27} /></span>
              <h2>Employee could not be loaded</h2>
              <p>{normalizeApiError(selectedEmployeeQuery.error).message}</p>
            </div>
          ) : documentsQuery.isError ? (
            <div className="doc-state-panel doc-state-panel--error">
              <span><FileSearch size={27} /></span>
              <h2>Documents could not be loaded</h2>
              <p>{normalizeApiError(documentsQuery.error).message}</p>
              <button type="button" className="doc-secondary-button" onClick={() => void documentsQuery.refetch()}>
                <RefreshCw size={15} /> Try again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="doc-state-panel">
              <span><FileText size={29} /></span>
              <h2>No matching documents</h2>
              <p>
                {deferredDocumentSearch || category || expiryStatus !== "ALL" || confidentialOnly
                  ? "Change the filters to see other records."
                  : "Upload the first document for this employee."}
              </p>
              {canManage && !deferredDocumentSearch && !category && expiryStatus === "ALL" && !confidentialOnly ? (
                <button type="button" className="doc-primary-button" onClick={(event) => { dialogMotion.capture(event); setUploadOpen(true); }}>
                  <FileUp size={16} /> Upload first document
                </button>
              ) : null}
            </div>
          ) : (
            <EmployeeDocumentTable
              documents={documents}
              canManage={canManage}
              onPreview={(document) => void preview(document)}
              onDownload={(document) => void download(document)}
              onEdit={(document, event) => { dialogMotion.capture(event); setEditingDocument(document); }}
              onReplace={(document, event) => { dialogMotion.capture(event); setReplacingDocument(document); }}
              onDelete={(document, event) => { dialogMotion.capture(event); setDeletingDocument(document); }}
            />
          )}

          {fileActionId ? (
            <div className="doc-file-action-indicator">
              <LoaderCircle className="spin" size={15} /> Preparing file…
            </div>
          ) : null}
        </main>
      </div>

      {uploadOpen && selectedEmployee ? (
        <EmployeeDocumentUploadDialog
          employeeName={selectedEmployee.fullName}
          isPending={uploadMutation.isPending}
          onClose={closeUpload}
          onSubmit={upload}
        />
      ) : null}

      {editingDocument ? (
        <EmployeeDocumentEditDialog
          document={editingDocument}
          isPending={updateMutation.isPending}
          onClose={closeEdit}
          onSubmit={update}
        />
      ) : null}

      {replacingDocument ? (
        <EmployeeDocumentReplaceDialog
          document={replacingDocument}
          isPending={replaceMutation.isPending}
          onClose={closeReplace}
          onSubmit={replace}
        />
      ) : null}

      {deletingDocument ? (
        <EmployeeDocumentDeleteDialog
          document={deletingDocument}
          isPending={deleteMutation.isPending}
          onClose={closeDelete}
          onConfirm={remove}
        />
      ) : null}
    </section>
  );
}

// edited by wali: Provide shared trigger-origin motion to employee document forms.
export function EmployeeDocumentsPage() {
  return <OrganisationDialogMotionProvider><EmployeeDocumentsPageContent /></OrganisationDialogMotionProvider>;
}

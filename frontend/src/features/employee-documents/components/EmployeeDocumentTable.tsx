import {
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { EmployeeDocument } from "../types/employee-document.types";
import type { MouseEvent } from "react";

interface EmployeeDocumentTableProps {
  documents: EmployeeDocument[];
  canManage: boolean;
  onPreview: (document: EmployeeDocument) => void;
  onDownload: (document: EmployeeDocument) => void;
  // edited by wali: Pass action clicks upward so forms can animate from the trigger.
  onEdit: (document: EmployeeDocument, event: MouseEvent<HTMLButtonElement>) => void;
  onReplace: (document: EmployeeDocument, event: MouseEvent<HTMLButtonElement>) => void;
  onDelete: (document: EmployeeDocument, event: MouseEvent<HTMLButtonElement>) => void;
}

function formatCategory(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBytes(value: string | null): string {
  if (!value) return "—";
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return value;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function DocumentIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) return <FileImage size={18} />;
  if (mimeType?.includes("spreadsheet")) return <FileSpreadsheet size={18} />;
  if (mimeType?.includes("presentation")) return <FileType2 size={18} />;
  if (mimeType?.includes("wordprocessing")) return <FileText size={18} />;
  if (mimeType === "application/pdf") return <FileArchive size={18} />;
  return <FileText size={18} />;
}

export function EmployeeDocumentTable({
  documents,
  canManage,
  onPreview,
  onDownload,
  onEdit,
  onReplace,
  onDelete,
}: EmployeeDocumentTableProps) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Category</th>
            <th>Reference</th>
            <th>Issue / expiry</th>
            <th>Size</th>
            <th>Uploaded by</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.documentId}>
              <td>
                <div className="doc-file-cell">
                  <span className="doc-file-icon">
                    <DocumentIcon mimeType={document.mimeType} />
                  </span>
                  <div>
                    <strong>{document.documentTitle ?? document.originalFilename}</strong>
                    <small>{document.originalFilename}</small>
                  </div>
                  {document.isConfidential ? (
                    <span className="doc-confidential-badge" title="Confidential">
                      <LockKeyhole size={11} />
                    </span>
                  ) : null}
                </div>
              </td>
              <td>
                <span className="doc-category-badge">
                  {formatCategory(document.documentCategory)}
                </span>
              </td>
              <td>{document.documentNumber ?? "—"}</td>
              <td>
                <div className="doc-date-cell">
                  <span>{document.issueDate ?? "No issue date"}</span>
                  <strong className={document.isExpired ? "is-expired" : ""}>
                    {document.expiryDate
                      ? `${document.isExpired ? "Expired" : "Expires"} ${document.expiryDate}`
                      : "No expiry"}
                  </strong>
                </div>
              </td>
              <td>{formatBytes(document.fileSizeBytes)}</td>
              <td>
                <div className="doc-uploader-cell">
                  <strong>{document.uploaderFullName ?? document.uploaderUsername ?? "System"}</strong>
                  <small>{new Date(document.createdAt).toLocaleDateString("en-GB")}</small>
                </div>
              </td>
              <td>
                <div className="doc-row-actions">
                  <button type="button" title="Preview" onClick={() => onPreview(document)}>
                    <Eye size={15} />
                  </button>
                  <button type="button" title="Download" onClick={() => onDownload(document)}>
                    <Download size={15} />
                  </button>
                  {canManage ? (
                    <>
                      <button type="button" title="Edit details" onClick={(event) => onEdit(document, event)}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" title="Replace file" onClick={(event) => onReplace(document, event)}>
                        <RefreshCw size={15} />
                      </button>
                      <button type="button" className="is-danger" title="Delete" onClick={(event) => onDelete(document, event)}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

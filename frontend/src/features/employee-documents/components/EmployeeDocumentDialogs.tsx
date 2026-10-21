import {
  FileUp,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import type {
  EmployeeDocument,
  EmployeeDocumentMetadataInput,
  UploadEmployeeDocumentInput,
} from "../types/employee-document.types";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { useOrganisationDialogAnimation } from "../../organisation/components/OrganisationDialogMotion";

const CATEGORY_OPTIONS = [
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

interface MetadataValues {
  documentCategory: string;
  documentTitle: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  isConfidential: boolean;
}

const emptyMetadata: MetadataValues = {
  documentCategory: "IDENTITY",
  documentTitle: "",
  documentNumber: "",
  issueDate: "",
  expiryDate: "",
  isConfidential: true,
};

function toMetadataInput(
  values: MetadataValues,
): EmployeeDocumentMetadataInput {
  return {
    documentCategory: values.documentCategory,
    documentTitle: values.documentTitle.trim() || null,
    documentNumber: values.documentNumber.trim() || null,
    issueDate: values.issueDate || null,
    expiryDate: values.expiryDate || null,
    isConfidential: values.isConfidential,
  };
}

function validateDates(values: MetadataValues): string | null {
  if (
    values.issueDate &&
    values.expiryDate &&
    values.expiryDate < values.issueDate
  ) {
    return "Expiry date cannot be before the issue date.";
  }

  return null;
}

interface DialogFrameProps {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}

function DialogFrame({
  title,
  eyebrow,
  icon,
  children,
  onClose,
}: DialogFrameProps) {
  // edited by wali: Animate document dialogs from their initiating button.
  const animation = useOrganisationDialogAnimation(true);
  return (
    <div className="doc-dialog-layer" role="presentation">
      <button
        type="button"
        className={`doc-dialog-backdrop ${animation.backdropMotionClassName}`}
        onClick={animation.closing ? undefined : onClose}
        aria-label="Close dialog"
      />
      <section ref={animation.dialogRef} className={`doc-dialog ${animation.dialogMotionClassName}`} role="dialog" aria-modal="true">
        <header className="doc-dialog__header">
          <div className="doc-dialog__title">
            <span>{icon}</span>
            <div>
              <small>{eyebrow}</small>
              <h2>{title}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

interface MetadataFieldsProps {
  values: MetadataValues;
  onChange: (values: MetadataValues) => void;
}

function MetadataFields({ values, onChange }: MetadataFieldsProps) {
  return (
    <div className="doc-dialog__fields">
      <label className="doc-field">
        <span>Category <b>*</b></span>
        <EmployeeMenuSelect
          value={values.documentCategory}
          placeholder="Select category"
          options={CATEGORY_OPTIONS.map((category) => ({ value: category, label: category }))}
          onChange={(documentCategory) => onChange({ ...values, documentCategory })}
          allowClear={false}
        />
      </label>

      <label className="doc-field">
        <span>Document title</span>
        <input
          value={values.documentTitle}
          onChange={(event) =>
            onChange({
              ...values,
              documentTitle: event.target.value,
            })
          }
          placeholder="e.g. National identity card"
        />
      </label>

      <label className="doc-field">
        <span>Document number</span>
        <input
          value={values.documentNumber}
          onChange={(event) =>
            onChange({
              ...values,
              documentNumber: event.target.value,
            })
          }
          placeholder="Reference or certificate number"
        />
      </label>

      <label className="doc-field">
        <span>Issue date</span>
        <input
          type="date"
          value={values.issueDate}
          onChange={(event) =>
            onChange({
              ...values,
              issueDate: event.target.value,
            })
          }
        />
      </label>

      <label className="doc-field">
        <span>Expiry date</span>
        <input
          type="date"
          value={values.expiryDate}
          onChange={(event) =>
            onChange({
              ...values,
              expiryDate: event.target.value,
            })
          }
        />
      </label>

      <label className="doc-confidential-toggle">
        <input
          type="checkbox"
          checked={values.isConfidential}
          onChange={(event) =>
            onChange({
              ...values,
              isConfidential: event.target.checked,
            })
          }
        />
        <span>
          <strong>Confidential document</strong>
          <small>Restrict this file to authorised employee and HR access.</small>
        </span>
      </label>
    </div>
  );
}

interface DocumentFileDropProps {
  files: File[];
  title: string;
  description: string;
  icon: ReactNode;
  maxFiles?: number;
  disabled?: boolean;
  onFilesChange: (files: File[]) => void;
  onLimitExceeded?: () => void;
}

function DocumentFileDrop({
  files,
  title,
  description,
  icon,
  maxFiles = 1,
  disabled = false,
  onFilesChange,
  onLimitExceeded,
}: DocumentFileDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incomingFiles: File[]) {
    const remainingSlots = Math.max(0, maxFiles - files.length);
    const additions = incomingFiles.slice(0, remainingSlots);
    if (additions.length > 0) {
      onFilesChange([...files, ...additions]);
    }
    if (incomingFiles.length > remainingSlots) {
      onLimitExceeded?.();
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      addFiles(Array.from(event.dataTransfer.files));
    }
  }

  return (
    <div className="doc-file-picker">
      <label
        className={`doc-file-drop${isDragging ? " is-dragging" : ""}${disabled || files.length >= maxFiles ? " is-disabled" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {icon}
        <strong>{isDragging ? "Drop your file here" : title}</strong>
        <small>{description}</small>
        <small>{files.length >= maxFiles ? `Maximum of ${maxFiles} file${maxFiles === 1 ? "" : "s"} selected.` : "Drag and drop a file here, or click to browse."}</small>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx"
          multiple={maxFiles > 1}
          disabled={disabled || files.length >= maxFiles}
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="doc-selected-files" aria-label="Selected files">
          {files.map((selectedFile, index) => (
            <li key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}-${index}`}>
              <span><strong>{selectedFile.name}</strong><small>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</small></span>
              <button
                type="button"
                aria-label={`Remove ${selectedFile.name}`}
                title={`Remove ${selectedFile.name}`}
                disabled={disabled}
                onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface UploadDialogProps {
  employeeName: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (inputs: UploadEmployeeDocumentInput[]) => Promise<number>;
}

export function EmployeeDocumentUploadDialog({
  employeeName,
  isPending,
  onClose,
  onSubmit,
}: UploadDialogProps) {
  const [values, setValues] = useState<MetadataValues>(emptyMetadata);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dateError = validateDates(values);
    if (dateError) {
      setError(dateError);
      return;
    }

    if (files.length === 0) {
      setError("Add at least one file to upload.");
      return;
    }

    setError(null);
    const uploadedCount = await onSubmit(files.map((file) => ({
      ...toMetadataInput(values),
      file,
    })));
    if (uploadedCount > 0 && uploadedCount < files.length) {
      setFiles((currentFiles) => currentFiles.slice(uploadedCount));
      setError("Some files were not uploaded. Retry the remaining files or remove them.");
    } else if (uploadedCount === files.length) {
      setFiles([]);
      setError(null);
    }
  }

  return (
    <DialogFrame
      title="Upload employee document"
      eyebrow={employeeName}
      icon={<FileUp size={19} />}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="doc-dialog__body">
          <DocumentFileDrop
            files={files}
            maxFiles={2}
            disabled={isPending}
            title="Add up to 2 documents"
            description="PDF, image or Microsoft Office files. Maximum size follows the server policy."
            icon={<FileUp size={24} />}
            onFilesChange={(nextFiles) => { setFiles(nextFiles); setError(null); }}
            onLimitExceeded={() => setError("You can add up to 2 documents at a time.")}
          />
          <MetadataFields values={values} onChange={setValues} />
          {error ? <p className="doc-form-error">{error}</p> : null}
        </div>
        <footer className="doc-dialog__footer">
          <button type="button" className="doc-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="doc-primary-button" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <FileUp size={16} />}
            Upload documents
          </button>
        </footer>
      </form>
    </DialogFrame>
  );
}

interface EditDialogProps {
  document: EmployeeDocument;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: EmployeeDocumentMetadataInput) => Promise<void>;
}

export function EmployeeDocumentEditDialog({
  document,
  isPending,
  onClose,
  onSubmit,
}: EditDialogProps) {
  const [values, setValues] = useState<MetadataValues>({
    documentCategory: document.documentCategory,
    documentTitle: document.documentTitle ?? "",
    documentNumber: document.documentNumber ?? "",
    issueDate: document.issueDate ?? "",
    expiryDate: document.expiryDate ?? "",
    isConfidential: document.isConfidential,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues({
      documentCategory: document.documentCategory,
      documentTitle: document.documentTitle ?? "",
      documentNumber: document.documentNumber ?? "",
      issueDate: document.issueDate ?? "",
      expiryDate: document.expiryDate ?? "",
      isConfidential: document.isConfidential,
    });
  }, [document]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDates(values);
    if (dateError) {
      setError(dateError);
      return;
    }

    setError(null);
    await onSubmit(toMetadataInput(values));
  }

  return (
    <DialogFrame
      title="Edit document details"
      eyebrow={document.originalFilename}
      icon={<Pencil size={18} />}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="doc-dialog__body">
          <MetadataFields values={values} onChange={setValues} />
          {error ? <p className="doc-form-error">{error}</p> : null}
        </div>
        <footer className="doc-dialog__footer">
          <button type="button" className="doc-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="doc-primary-button" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <Pencil size={16} />}
            Save changes
          </button>
        </footer>
      </form>
    </DialogFrame>
  );
}

interface ReplaceDialogProps {
  document: EmployeeDocument;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
}

export function EmployeeDocumentReplaceDialog({
  document,
  isPending,
  onClose,
  onSubmit,
}: ReplaceDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files[0]) {
      setError("Select a replacement file.");
      return;
    }

    setError(null);
    await onSubmit(files[0]);
  }

  return (
    <DialogFrame
      title="Replace stored file"
      eyebrow={document.originalFilename}
      icon={<RefreshCw size={18} />}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="doc-dialog__body">
          <DocumentFileDrop
            files={files}
            disabled={isPending}
            title="Choose the replacement file"
            description="The existing metadata remains unchanged."
            icon={<RefreshCw size={24} />}
            onFilesChange={setFiles}
          />
          {error ? <p className="doc-form-error">{error}</p> : null}
        </div>
        <footer className="doc-dialog__footer">
          <button type="button" className="doc-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="doc-primary-button" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
            Replace file
          </button>
        </footer>
      </form>
    </DialogFrame>
  );
}

interface DeleteDialogProps {
  document: EmployeeDocument;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function EmployeeDocumentDeleteDialog({
  document,
  isPending,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <DialogFrame
      title="Delete employee document"
      eyebrow={document.originalFilename}
      icon={<Trash2 size={18} />}
      onClose={onClose}
    >
      <div className="doc-dialog__body">
        <div className="doc-delete-warning">
          <Trash2 size={23} />
          <div>
            <strong>This document will be removed</strong>
            <p>
              The employee document record and its stored file will no longer be available.
            </p>
          </div>
        </div>
      </div>
      <footer className="doc-dialog__footer">
        <button type="button" className="doc-secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="doc-danger-button"
          disabled={isPending}
          onClick={() => void onConfirm()}
        >
          {isPending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
          Delete document
        </button>
      </footer>
    </DialogFrame>
  );
}

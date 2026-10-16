import {
  FileUp,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import type {
  EmployeeDocument,
  EmployeeDocumentMetadataInput,
  UploadEmployeeDocumentInput,
} from "../types/employee-document.types";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";

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
  return (
    <div className="doc-dialog-layer" role="presentation">
      <button
        type="button"
        className="doc-dialog-backdrop"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <section className="doc-dialog" role="dialog" aria-modal="true">
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

interface UploadDialogProps {
  employeeName: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: UploadEmployeeDocumentInput) => Promise<void>;
}

export function EmployeeDocumentUploadDialog({
  employeeName,
  isPending,
  onClose,
  onSubmit,
}: UploadDialogProps) {
  const [values, setValues] = useState<MetadataValues>(emptyMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dateError = validateDates(values);
    if (dateError) {
      setError(dateError);
      return;
    }

    if (!file) {
      setError("Select a file to upload.");
      return;
    }

    setError(null);
    await onSubmit({
      ...toMetadataInput(values),
      file,
    });
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
          <label className="doc-file-drop">
            <FileUp size={24} />
            <strong>{file?.name ?? "Choose a document file"}</strong>
            <small>
              PDF, image or Microsoft Office file. Maximum size follows the server policy.
            </small>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <MetadataFields values={values} onChange={setValues} />
          {error ? <p className="doc-form-error">{error}</p> : null}
        </div>
        <footer className="doc-dialog__footer">
          <button type="button" className="doc-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="doc-primary-button" disabled={isPending}>
            {isPending ? <LoaderCircle className="spin" size={16} /> : <FileUp size={16} />}
            Upload document
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a replacement file.");
      return;
    }

    setError(null);
    await onSubmit(file);
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
          <label className="doc-file-drop">
            <RefreshCw size={24} />
            <strong>{file?.name ?? "Choose the replacement file"}</strong>
            <small>The existing metadata remains unchanged.</small>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
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

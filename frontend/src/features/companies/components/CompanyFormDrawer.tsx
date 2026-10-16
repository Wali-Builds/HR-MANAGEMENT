import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Check,
  Globe2,
  Hash,
  LoaderCircle,
  MapPin,
  Settings2,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import {
  useCreateCompany,
  useUpdateCompany,
} from "../hooks/useCompanies";
import {
  companyFormSchema,
  type CompanyFormValues,
} from "../schemas/company.schema";
import type {
  Company,
  CompanyMutationInput,
} from "../types/company.types";

interface CompanyFormDrawerProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
  onSaved: (company: Company) => void;
}

const defaultValues: CompanyFormValues = {
  companyCode: "",
  legalName: "",
  displayName: "",
  registrationNumber: "",
  taxNumber: "",
  industry: "",
  officialEmail: "",
  officialPhone: "",
  websiteUrl: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
  countryCode: "PK",
  timezone: "Asia/Karachi",
  currencyCode: "PKR",
  dateFormat: "DD-MM-YYYY",
  logoPath: "",
  employeeCodePrefix: "",
  employeeCodeLength: 5,
  isActive: true,
};

function companyToFormValues(company: Company): CompanyFormValues {
  return {
    companyCode: company.companyCode,
    legalName: company.legalName,
    displayName: company.displayName,
    registrationNumber: company.registrationNumber ?? "",
    taxNumber: company.taxNumber ?? "",
    industry: company.industry ?? "",
    officialEmail: company.officialEmail ?? "",
    officialPhone: company.officialPhone ?? "",
    websiteUrl: company.websiteUrl ?? "",
    addressLine1: company.addressLine1 ?? "",
    addressLine2: company.addressLine2 ?? "",
    city: company.city ?? "",
    district: company.district ?? "",
    province: company.province ?? "",
    postalCode: company.postalCode ?? "",
    countryCode: company.countryCode,
    timezone: company.timezone,
    currencyCode: company.currencyCode,
    dateFormat: company.dateFormat,
    logoPath: company.logoPath ?? "",
    employeeCodePrefix: company.employeeCodePrefix ?? "",
    employeeCodeLength: company.employeeCodeLength,
    isActive: company.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toMutationInput(values: CompanyFormValues): CompanyMutationInput {
  return {
    companyCode: values.companyCode.trim().toUpperCase(),
    legalName: values.legalName.trim(),
    displayName: values.displayName.trim(),
    registrationNumber: nullable(values.registrationNumber),
    taxNumber: nullable(values.taxNumber),
    industry: nullable(values.industry),
    officialEmail: nullable(values.officialEmail)?.toLowerCase() ?? null,
    officialPhone: nullable(values.officialPhone),
    websiteUrl: nullable(values.websiteUrl),
    addressLine1: nullable(values.addressLine1),
    addressLine2: nullable(values.addressLine2),
    city: nullable(values.city),
    district: nullable(values.district),
    province: nullable(values.province),
    postalCode: nullable(values.postalCode),
    countryCode: values.countryCode.trim().toUpperCase(),
    timezone: values.timezone.trim(),
    currencyCode: values.currencyCode.trim().toUpperCase(),
    dateFormat: values.dateFormat.trim(),
    logoPath: nullable(values.logoPath),
    employeeCodePrefix: nullable(values.employeeCodePrefix)?.toUpperCase() ?? null,
    employeeCodeLength: Number(values.employeeCodeLength),
    isActive: values.isActive,
  };
}

export function CompanyFormDrawer({
  open,
  company,
  onClose,
  onSaved,
}: CompanyFormDrawerProps) {
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const isEditing = Boolean(company);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(company ? companyToFormValues(company) : defaultValues);
  }, [company, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onClose, open]);

  if (!open) {
    return null;
  }

  function closeDrawer() {
    if (isSaving) {
      return;
    }

    if (isDirty && !window.confirm("Discard unsaved company changes?")) {
      return;
    }

    onClose();
  }

  async function submit(values: CompanyFormValues) {
    const input = toMutationInput(values);

    try {
      const savedCompany = company
        ? await updateMutation.mutateAsync({
            companyId: company.companyId,
            input,
          })
        : await createMutation.mutateAsync(input);

      toast.success(company ? "Company updated successfully" : "Company created successfully");
      onSaved(savedCompany);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" type="button" onClick={closeDrawer} aria-label="Close company form" />
      <aside className="company-drawer company-drawer--form" role="dialog" aria-modal="true" aria-label={isEditing ? "Edit company" : "Create company"}>
        <header className="company-drawer__topbar company-drawer__topbar--form">
          <div>
            <span className="eyebrow">{isEditing ? "Update organisation" : "New organisation"}</span>
            <strong>{isEditing ? "Edit company" : "Create company"}</strong>
          </div>
          <button type="button" className="company-icon-action" onClick={closeDrawer} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <form className="company-form" onSubmit={handleSubmit(submit)} noValidate>
          <section className="company-form__intro">
            <div className="company-form__intro-icon"><Building2 size={24} /></div>
            <div>
              <h2>{isEditing ? company?.displayName : "Set up a company workspace"}</h2>
              <p>Company information powers employee codes, regional settings and organisation-wide records.</p>
            </div>
          </section>

          <section className="company-form-section">
            <header><Building2 size={18} /><div><h3>Identity</h3><p>Legal and public-facing company information.</p></div></header>
            <div className="company-form-grid">
              <label className="field">
                <span className="field__label">Company code *</span>
                <input className={errors.companyCode ? "input input--error" : "input"} placeholder="SPATIO" {...register("companyCode")} />
                {errors.companyCode ? <span className="field__error">{errors.companyCode.message}</span> : <span className="field__hint">Unique short code used across the system.</span>}
              </label>
              <label className="field">
                <span className="field__label">Industry</span>
                <input className="input" placeholder="Technology, consulting, manufacturing…" {...register("industry")} />
              </label>
              <label className="field company-form-grid__wide">
                <span className="field__label">Legal name *</span>
                <input className={errors.legalName ? "input input--error" : "input"} placeholder="The registered legal name" {...register("legalName")} />
                {errors.legalName ? <span className="field__error">{errors.legalName.message}</span> : null}
              </label>
              <label className="field company-form-grid__wide">
                <span className="field__label">Display name *</span>
                <input className={errors.displayName ? "input input--error" : "input"} placeholder="Name shown in the application" {...register("displayName")} />
                {errors.displayName ? <span className="field__error">{errors.displayName.message}</span> : null}
              </label>
              <label className="field">
                <span className="field__label">Registration number</span>
                <input className="input" {...register("registrationNumber")} />
              </label>
              <label className="field">
                <span className="field__label">Tax number</span>
                <input className="input" {...register("taxNumber")} />
              </label>
              <label className="field company-form-grid__wide">
                <span className="field__label">Logo URL or stored path</span>
                <input className="input" placeholder="https://… or /uploads/company-logo.png" {...register("logoPath")} />
                <span className="field__hint">File uploading can be added when the backend exposes a media endpoint.</span>
              </label>
            </div>
          </section>

          <section className="company-form-section">
            <header><Globe2 size={18} /><div><h3>Contact</h3><p>Official contact channels for the organisation.</p></div></header>
            <div className="company-form-grid">
              <label className="field">
                <span className="field__label">Official email</span>
                <input type="email" className={errors.officialEmail ? "input input--error" : "input"} placeholder="hello@company.com" {...register("officialEmail")} />
                {errors.officialEmail ? <span className="field__error">{errors.officialEmail.message}</span> : null}
              </label>
              <label className="field">
                <span className="field__label">Official phone</span>
                <input className="input" placeholder="+92 …" {...register("officialPhone")} />
              </label>
              <label className="field company-form-grid__wide">
                <span className="field__label">Website</span>
                <input className={errors.websiteUrl ? "input input--error" : "input"} placeholder="https://company.com" {...register("websiteUrl")} />
                {errors.websiteUrl ? <span className="field__error">{errors.websiteUrl.message}</span> : null}
              </label>
            </div>
          </section>

          <section className="company-form-section">
            <header><MapPin size={18} /><div><h3>Address</h3><p>Primary registered or operational location.</p></div></header>
            <div className="company-form-grid">
              <label className="field company-form-grid__wide"><span className="field__label">Address line 1</span><input className="input" {...register("addressLine1")} /></label>
              <label className="field company-form-grid__wide"><span className="field__label">Address line 2</span><input className="input" {...register("addressLine2")} /></label>
              <label className="field"><span className="field__label">City</span><input className="input" {...register("city")} /></label>
              <label className="field"><span className="field__label">District</span><input className="input" {...register("district")} /></label>
              <label className="field"><span className="field__label">Province</span><input className="input" {...register("province")} /></label>
              <label className="field"><span className="field__label">Postal code</span><input className="input" {...register("postalCode")} /></label>
              <label className="field"><span className="field__label">Country code *</span><input className={errors.countryCode ? "input input--error" : "input"} maxLength={2} {...register("countryCode")} />{errors.countryCode ? <span className="field__error">{errors.countryCode.message}</span> : null}</label>
            </div>
          </section>

          <section className="company-form-section">
            <header><Settings2 size={18} /><div><h3>Regional and HR settings</h3><p>Defaults used throughout company records.</p></div></header>
            <div className="company-form-grid">
              <label className="field"><span className="field__label">Timezone *</span><input className={errors.timezone ? "input input--error" : "input"} {...register("timezone")} />{errors.timezone ? <span className="field__error">{errors.timezone.message}</span> : null}</label>
              <label className="field"><span className="field__label">Currency code *</span><input className={errors.currencyCode ? "input input--error" : "input"} maxLength={3} {...register("currencyCode")} />{errors.currencyCode ? <span className="field__error">{errors.currencyCode.message}</span> : null}</label>
              <label className="field"><span className="field__label">Date format *</span><input className={errors.dateFormat ? "input input--error" : "input"} {...register("dateFormat")} />{errors.dateFormat ? <span className="field__error">{errors.dateFormat.message}</span> : null}</label>
              <label className="field"><span className="field__label">Employee code prefix</span><input className="input" placeholder="EMP" {...register("employeeCodePrefix")} /></label>
              <label className="field"><span className="field__label">Employee code length *</span><input type="number" className={errors.employeeCodeLength ? "input input--error" : "input"} min={1} max={20} {...register("employeeCodeLength", { valueAsNumber: true })} />{errors.employeeCodeLength ? <span className="field__error">{errors.employeeCodeLength.message}</span> : null}</label>
            </div>
          </section>

          <section className="company-form-section company-form-section--status">
            <div className="company-status-toggle">
              <div className="company-status-toggle__icon"><Check size={18} /></div>
              <div><strong>Active company</strong><span>Inactive companies remain in records but cannot operate normally.</span></div>
              <label className="switch"><input type="checkbox" {...register("isActive")} /><span /></label>
            </div>
          </section>

          <footer className="company-form__footer">
            <div className="company-form__footer-note"><Hash size={15} /><span>Required fields are marked with an asterisk.</span></div>
            <div>
              <button type="button" className="button button--secondary" onClick={closeDrawer} disabled={isSaving}>Cancel</button>
              <button type="submit" className="button button--primary" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
                {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create company"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}

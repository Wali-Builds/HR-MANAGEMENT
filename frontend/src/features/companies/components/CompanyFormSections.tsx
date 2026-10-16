import {
  Building2,
  Contact,
  Globe2,
  Hash,
  MapPin,
  Settings2,
} from "lucide-react";
import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";

import type { CompanyFormValues } from "../schemas/company.schema";

interface CompanyFormSectionsProps {
  register: UseFormRegister<CompanyFormValues>;
  errors: FieldErrors<CompanyFormValues>;
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <span className="org-field-error">{message}</span> : null;
}

export function CompanyFormSections({
  register,
  errors,
}: CompanyFormSectionsProps) {
  return (
    <div className="org-form-sections">
      <section className="org-form-section">
        <header>
          <span><Building2 size={18} /></span>
          <div>
            <h2>Company identity</h2>
            <p>Core legal and public-facing organisation information.</p>
          </div>
        </header>

        <div className="org-form-grid">
          <label className="org-field">
            <span>Company code *</span>
            <input
              className={errors.companyCode ? "is-invalid" : ""}
              placeholder="SPATIO"
              {...register("companyCode")}
            />
            <small>Unique code used throughout the HR system.</small>
            <FieldError message={errors.companyCode?.message} />
          </label>

          <label className="org-field">
            <span>Industry</span>
            <input placeholder="Consulting, technology, manufacturing…" {...register("industry")} />
            <FieldError message={errors.industry?.message} />
          </label>

          <label className="org-field org-field--wide">
            <span>Legal name *</span>
            <input
              className={errors.legalName ? "is-invalid" : ""}
              placeholder="Registered legal company name"
              {...register("legalName")}
            />
            <FieldError message={errors.legalName?.message} />
          </label>

          <label className="org-field org-field--wide">
            <span>Display name *</span>
            <input
              className={errors.displayName ? "is-invalid" : ""}
              placeholder="Name employees will see in the application"
              {...register("displayName")}
            />
            <FieldError message={errors.displayName?.message} />
          </label>

          <label className="org-field">
            <span>Registration number</span>
            <input placeholder="Registration or incorporation number" {...register("registrationNumber")} />
            <FieldError message={errors.registrationNumber?.message} />
          </label>

          <label className="org-field">
            <span>Tax number</span>
            <input placeholder="NTN, VAT or tax identifier" {...register("taxNumber")} />
            <FieldError message={errors.taxNumber?.message} />
          </label>
        </div>
      </section>

      <section className="org-form-section">
        <header>
          <span><Contact size={18} /></span>
          <div>
            <h2>Contact details</h2>
            <p>Official communication channels and online presence.</p>
          </div>
        </header>

        <div className="org-form-grid">
          <label className="org-field">
            <span>Official email</span>
            <input type="email" placeholder="people@company.com" {...register("officialEmail")} />
            <FieldError message={errors.officialEmail?.message} />
          </label>

          <label className="org-field">
            <span>Official phone</span>
            <input placeholder="+92 42 00000000" {...register("officialPhone")} />
            <FieldError message={errors.officialPhone?.message} />
          </label>

          <label className="org-field org-field--wide">
            <span>Website</span>
            <input placeholder="https://company.com" {...register("websiteUrl")} />
            <FieldError message={errors.websiteUrl?.message} />
          </label>

          <label className="org-field org-field--wide">
            <span>Logo path or URL</span>
            <input placeholder="/uploads/company-logo.png" {...register("logoPath")} />
            <small>Upload support can be connected when the file-management module is added.</small>
            <FieldError message={errors.logoPath?.message} />
          </label>
        </div>
      </section>

      <section className="org-form-section">
        <header>
          <span><MapPin size={18} /></span>
          <div>
            <h2>Registered address</h2>
            <p>Primary office and regional location information.</p>
          </div>
        </header>

        <div className="org-form-grid">
          <label className="org-field org-field--wide">
            <span>Address line 1</span>
            <input placeholder="Building, street or business centre" {...register("addressLine1")} />
            <FieldError message={errors.addressLine1?.message} />
          </label>

          <label className="org-field org-field--wide">
            <span>Address line 2</span>
            <input placeholder="Area, floor or additional address information" {...register("addressLine2")} />
            <FieldError message={errors.addressLine2?.message} />
          </label>

          <label className="org-field">
            <span>City</span>
            <input placeholder="Lahore" {...register("city")} />
            <FieldError message={errors.city?.message} />
          </label>

          <label className="org-field">
            <span>District</span>
            <input placeholder="Lahore" {...register("district")} />
            <FieldError message={errors.district?.message} />
          </label>

          <label className="org-field">
            <span>Province / state</span>
            <input placeholder="Punjab" {...register("province")} />
            <FieldError message={errors.province?.message} />
          </label>

          <label className="org-field">
            <span>Postal code</span>
            <input placeholder="54000" {...register("postalCode")} />
            <FieldError message={errors.postalCode?.message} />
          </label>

          <label className="org-field">
            <span>Country code *</span>
            <input maxLength={2} placeholder="PK" {...register("countryCode")} />
            <FieldError message={errors.countryCode?.message} />
          </label>
        </div>
      </section>

      <section className="org-form-section">
        <header>
          <span><Globe2 size={18} /></span>
          <div>
            <h2>Regional settings</h2>
            <p>Defaults used for dates, time zones and financial display.</p>
          </div>
        </header>

        <div className="org-form-grid org-form-grid--three">
          <label className="org-field">
            <span>Timezone *</span>
            <input placeholder="Asia/Karachi" {...register("timezone")} />
            <FieldError message={errors.timezone?.message} />
          </label>

          <label className="org-field">
            <span>Currency code *</span>
            <input maxLength={3} placeholder="PKR" {...register("currencyCode")} />
            <FieldError message={errors.currencyCode?.message} />
          </label>

          <label className="org-field">
            <span>Date format *</span>
            <select {...register("dateFormat")}>
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
            <FieldError message={errors.dateFormat?.message} />
          </label>
        </div>
      </section>

      <section className="org-form-section">
        <header>
          <span><Hash size={18} /></span>
          <div>
            <h2>Employee numbering</h2>
            <p>Company defaults for generating consistent employee codes.</p>
          </div>
        </header>

        <div className="org-form-grid">
          <label className="org-field">
            <span>Employee code prefix</span>
            <input placeholder="EMP" {...register("employeeCodePrefix")} />
            <FieldError message={errors.employeeCodePrefix?.message} />
          </label>

          <label className="org-field">
            <span>Employee code length *</span>
            <input
              type="number"
              min={1}
              max={20}
              {...register("employeeCodeLength", { valueAsNumber: true })}
            />
            <small>Example: EMP + 00001 when the length is 5.</small>
            <FieldError message={errors.employeeCodeLength?.message} />
          </label>
        </div>
      </section>

      <section className="org-form-section org-form-section--status">
        <header>
          <span><Settings2 size={18} /></span>
          <div>
            <h2>Workspace status</h2>
            <p>Inactive companies remain stored but cannot be used normally.</p>
          </div>
        </header>

        <label className="org-status-switch">
          <input type="checkbox" {...register("isActive")} />
          <span className="org-status-switch__track"><span /></span>
          <span>
            <strong>Company is active</strong>
            <small>Users and HR operations can access this organisation.</small>
          </span>
        </label>
      </section>
    </div>
  );
}

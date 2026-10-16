import {
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Settings2,
  X,
} from "lucide-react";

import { normalizeApiError } from "../../../api/api-error";
import { useCompany } from "../hooks/useCompanies";
import type { Company } from "../types/company.types";
import { CompanyAvatar } from "./CompanyAvatar";
import { CompanyStatusBadge } from "./CompanyStatusBadge";

interface CompanyDetailsDrawerProps {
  companyId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (company: Company) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="company-detail-row">
      <div className="company-detail-row__icon"><Icon size={17} /></div>
      <div>
        <span>{label}</span>
        <strong>{value || "Not provided"}</strong>
      </div>
    </div>
  );
}

export function CompanyDetailsDrawer({
  companyId,
  canEdit,
  onClose,
  onEdit,
}: CompanyDetailsDrawerProps) {
  const companyQuery = useCompany(companyId);
  const company = companyQuery.data;

  if (!companyId) {
    return null;
  }

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="Close company details" />
      <aside className="company-drawer company-drawer--details" role="dialog" aria-modal="true" aria-label="Company details">
        <header className="company-drawer__topbar">
          <div>
            <span className="eyebrow">Company profile</span>
            <strong>Organisation details</strong>
          </div>
          <button type="button" className="company-icon-action" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {companyQuery.isLoading ? (
          <div className="company-drawer__loading">
            <div className="company-skeleton company-skeleton--avatar" />
            <div className="company-skeleton" />
            <div className="company-skeleton company-skeleton--short" />
          </div>
        ) : companyQuery.isError ? (
          <div className="company-drawer__state">
            <Building2 size={26} />
            <h3>Unable to load company</h3>
            <p>{normalizeApiError(companyQuery.error).message}</p>
            <button type="button" className="button button--secondary" onClick={() => void companyQuery.refetch()}>
              Try again
            </button>
          </div>
        ) : company ? (
          <>
            <div className="company-profile-hero">
              <CompanyAvatar name={company.displayName} logoPath={company.logoPath} size="large" />
              <div>
                <div className="company-profile-hero__status">
                  <span>{company.companyCode}</span>
                  <CompanyStatusBadge isActive={company.isActive} />
                </div>
                <h2>{company.displayName}</h2>
                <p>{company.legalName}</p>
              </div>
            </div>

            {canEdit ? (
              <button type="button" className="button button--primary company-drawer__edit" onClick={() => onEdit(company)}>
                <Pencil size={17} /> Edit company
              </button>
            ) : null}

            <div className="company-profile-section">
              <header><span>General information</span></header>
              <div className="company-detail-grid">
                <DetailRow icon={Building2} label="Industry" value={company.industry} />
                <DetailRow icon={Hash} label="Registration number" value={company.registrationNumber} />
                <DetailRow icon={FileText} label="Tax number" value={company.taxNumber} />
                <DetailRow icon={CalendarDays} label="Created" value={formatDate(company.createdAt)} />
              </div>
            </div>

            <div className="company-profile-section">
              <header><span>Contact and location</span></header>
              <div className="company-detail-grid">
                <DetailRow icon={Mail} label="Official email" value={company.officialEmail} />
                <DetailRow icon={Phone} label="Official phone" value={company.officialPhone} />
                <DetailRow icon={MapPin} label="City / district" value={[company.city, company.district].filter(Boolean).join(", ")} />
                <DetailRow icon={MapPin} label="Province / country" value={[company.province, company.countryCode].filter(Boolean).join(", ")} />
              </div>
              {(company.addressLine1 || company.addressLine2 || company.postalCode) ? (
                <div className="company-address-block">
                  <MapPin size={17} />
                  <span>{[company.addressLine1, company.addressLine2, company.postalCode].filter(Boolean).join(", ")}</span>
                </div>
              ) : null}
              {company.websiteUrl ? (
                <a className="company-website-link" href={company.websiteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Visit company website
                </a>
              ) : null}
            </div>

            <div className="company-profile-section">
              <header><span>Regional settings</span></header>
              <div className="company-detail-grid">
                <DetailRow icon={Clock3} label="Timezone" value={company.timezone} />
                <DetailRow icon={Settings2} label="Currency" value={company.currencyCode} />
                <DetailRow icon={CalendarDays} label="Date format" value={company.dateFormat} />
                <DetailRow icon={Hash} label="Employee code" value={`${company.employeeCodePrefix || "No prefix"} · ${company.employeeCodeLength} digits`} />
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

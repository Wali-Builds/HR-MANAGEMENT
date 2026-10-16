import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Hash,
  Layers3,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { CompanyAdministratorsTab } from "../components/CompanyAdministratorsTab";
import { CompanyAvatar } from "../components/CompanyAvatar";
import { CompanyFeaturesTab } from "../components/CompanyFeaturesTab";
import { CompanySubscriptionTab } from "../components/CompanySubscriptionTab";
import { DeleteCompanyDialog } from "../components/DeleteCompanyDialog";
import { CompanyStatusBadge } from "../components/CompanyStatusBadge";
import { useCompany } from "../hooks/useCompanies";
import type { Company } from "../types/company.types";

const tabs = [
  "Overview",
  "Subscription & usage",
  "Modules",
  "Administrators",
  "Contact & address",
  "Configuration",
  "Activity",
] as const;

type CompanyTab = (typeof tabs)[number];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: ReactNode;
}) {
  return (
    <div className="org-detail-item">
      <span className="org-detail-item__icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value || "Not configured"}</strong>
      </div>
    </div>
  );
}

function addressLine(company: Company): string {
  return [
    company.addressLine1,
    company.addressLine2,
    company.city,
    company.district,
    company.province,
    company.postalCode,
    company.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function CompanyRecordPage() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<CompanyTab>("Overview");
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const companyQuery = useCompany(companyId ?? null);
  const canEdit = isPlatformAdmin || hasPermission("company.manage");
  const canDelete = isPlatformAdmin;

  if (companyQuery.isLoading) {
    return (
      <div className="org-full-page-state">
        <LoaderCircle className="spin" size={27} />
        <p>Opening company record…</p>
      </div>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    const error = companyQuery.isError
      ? normalizeApiError(companyQuery.error)
      : { message: "Company was not found" };

    return (
      <div className="org-full-page-state">
        <Building2 size={30} />
        <h1>Company could not be opened</h1>
        <p>{error.message}</p>
        <button
          type="button"
          className="org-secondary-action"
          onClick={() => navigate("/companies")}
        >
          <ArrowLeft size={16} /> Return to companies
        </button>
      </div>
    );
  }

  const company = companyQuery.data;

  return (
    <section className="org-record-page">
      <header className="org-record-toolbar">
        <div className="org-record-toolbar__left">
          <button
            type="button"
            className="org-back-button"
            onClick={() => navigate("/companies")}
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <span>Companies / {company.displayName}</span>
            <h1>Company workspace</h1>
          </div>
        </div>

        <div className="org-record-toolbar__actions">
          {canDelete ? (
            <button
              type="button"
              className="org-danger-action"
              onClick={() => setDeleteCompany(company)}
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="org-primary-action"
              onClick={() => navigate(`/companies/${company.companyId}/edit`)}
            >
              <Pencil size={16} /> Edit company
            </button>
          ) : null}
        </div>
      </header>

      <div className="org-record-sheet">
        <header className="org-record-hero">
          <div className="org-record-hero__profile">
            <CompanyAvatar
              name={company.displayName}
              logoPath={company.logoPath}
              size="large"
            />
            <div>
              <div className="org-record-hero__status">
                <CompanyStatusBadge isActive={company.isActive} />
                <span>{company.companyCode}</span>
              </div>
              <h2>{company.displayName}</h2>
              <p>{company.legalName}</p>
              <div className="org-record-hero__contact">
                <span>
                  <MapPin size={14} />
                  {[company.city, company.countryCode].filter(Boolean).join(", ") ||
                    "Location not configured"}
                </span>
                <span>
                  <Mail size={14} /> {company.officialEmail || "Email not configured"}
                </span>
                <span>
                  <Phone size={14} /> {company.officialPhone || "Phone not configured"}
                </span>
              </div>
            </div>
          </div>

          <div className="org-smart-buttons">
            <button type="button" onClick={() => setActiveTab("Subscription & usage")}>
              <span><WalletCards size={17} /></span>
              <strong>Plan & usage</strong>
              <small>Subscription</small>
            </button>
            <button type="button" onClick={() => setActiveTab("Modules")}>
              <span><Layers3 size={17} /></span>
              <strong>Entitlements</strong>
              <small>Modules</small>
            </button>
            <button type="button" onClick={() => setActiveTab("Administrators")}>
              <span><UserRoundCog size={17} /></span>
              <strong>Tenant access</strong>
              <small>Administrators</small>
            </button>
            <div>
              <span><ShieldCheck size={17} /></span>
              <strong>{company.isActive ? "Enabled" : "Disabled"}</strong>
              <small>Workspace</small>
            </div>
          </div>
        </header>

        <nav className="org-record-tabs" aria-label="Company profile sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={activeTab === tab ? "is-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="org-record-content">
          {activeTab === "Overview" ? (
            <div className="org-record-grid">
              <section className="org-information-card">
                <header>
                  <Building2 size={18} />
                  <div>
                    <h3>Organisation details</h3>
                    <p>Legal and operational identity.</p>
                  </div>
                </header>
                <div className="org-detail-grid">
                  <DetailItem label="Legal name" value={company.legalName} icon={<Building2 size={16} />} />
                  <DetailItem label="Company code" value={company.companyCode} icon={<Hash size={16} />} />
                  <DetailItem label="Industry" value={company.industry} icon={<Settings2 size={16} />} />
                  <DetailItem label="Registration number" value={company.registrationNumber} icon={<CheckCircle2 size={16} />} />
                  <DetailItem label="Tax number" value={company.taxNumber} icon={<ShieldCheck size={16} />} />
                  <DetailItem label="Country" value={company.countryCode} icon={<Globe2 size={16} />} />
                </div>
              </section>

              <section className="org-information-card">
                <header>
                  <Settings2 size={18} />
                  <div>
                    <h3>Operating defaults</h3>
                    <p>Regional and employee-number settings.</p>
                  </div>
                </header>
                <div className="org-detail-grid">
                  <DetailItem label="Timezone" value={company.timezone} icon={<Globe2 size={16} />} />
                  <DetailItem label="Currency" value={company.currencyCode} icon={<Globe2 size={16} />} />
                  <DetailItem label="Date format" value={company.dateFormat} icon={<CalendarClock size={16} />} />
                  <DetailItem label="Employee prefix" value={company.employeeCodePrefix} icon={<Hash size={16} />} />
                  <DetailItem label="Employee code length" value={String(company.employeeCodeLength)} icon={<Hash size={16} />} />
                  <DetailItem label="Record status" value={company.isActive ? "Active" : "Inactive"} icon={<ShieldCheck size={16} />} />
                </div>
              </section>

              <section className="org-setup-progress org-information-card--wide">
                <header>
                  <ShieldCheck size={18} />
                  <div>
                    <h3>Commercial tenant setup</h3>
                    <p>Complete these steps before the customer starts using HR modules.</p>
                  </div>
                </header>
                <div className="org-setup-progress__steps">
                  <button type="button" onClick={() => setActiveTab("Subscription & usage")}>
                    <span>1</span>
                    <div><strong>Assign subscription</strong><small>Select plan, limits and billing dates.</small></div>
                  </button>
                  <button type="button" onClick={() => setActiveTab("Modules")}>
                    <span>2</span>
                    <div><strong>Review modules</strong><small>Confirm the tenant's effective feature access.</small></div>
                  </button>
                  <button type="button" onClick={() => setActiveTab("Administrators")}>
                    <span>3</span>
                    <div><strong>Provision administrator</strong><small>Create the customer's first Company Admin account.</small></div>
                  </button>
                </div>
              </section>
              
            </div>
          ) : null}

          {activeTab === "Subscription & usage" ? (
            <CompanySubscriptionTab
              companyId={company.companyId}
              companyName={company.displayName}
              canManage={isPlatformAdmin}
            />
          ) : null}

          {activeTab === "Modules" ? (
            <CompanyFeaturesTab companyId={company.companyId} />
          ) : null}

          {activeTab === "Administrators" ? (
            <CompanyAdministratorsTab
              companyId={company.companyId}
              companyName={company.displayName}
              canProvision={isPlatformAdmin}
            />
          ) : null}

          {activeTab === "Contact & address" ? (
            <div className="org-record-grid">
              <section className="org-information-card">
                <header>
                  <Mail size={18} />
                  <div><h3>Official contact</h3><p>Primary communication channels.</p></div>
                </header>
                <div className="org-detail-grid">
                  <DetailItem label="Email" value={company.officialEmail} icon={<Mail size={16} />} />
                  <DetailItem label="Phone" value={company.officialPhone} icon={<Phone size={16} />} />
                  <DetailItem label="Website" value={company.websiteUrl} icon={<Globe2 size={16} />} />
                </div>
                {company.websiteUrl ? (
                  <a className="org-external-link" href={company.websiteUrl} target="_blank" rel="noreferrer">
                    Open company website <ExternalLink size={15} />
                  </a>
                ) : null}
              </section>

              <section className="org-information-card">
                <header>
                  <MapPin size={18} />
                  <div><h3>Registered address</h3><p>Primary organisation location.</p></div>
                </header>
                <div className="org-address-card">
                  <MapPin size={20} />
                  <p>{addressLine(company) || "No registered address has been configured."}</p>
                </div>
                <div className="org-detail-grid">
                  <DetailItem label="City" value={company.city} icon={<MapPin size={16} />} />
                  <DetailItem label="District" value={company.district} icon={<MapPin size={16} />} />
                  <DetailItem label="Province / state" value={company.province} icon={<MapPin size={16} />} />
                  <DetailItem label="Postal code" value={company.postalCode} icon={<Hash size={16} />} />
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "Configuration" ? (
            <section className="org-information-card org-information-card--wide">
              <header>
                <Settings2 size={18} />
                <div><h3>Company configuration</h3><p>System defaults inherited by company-scoped modules.</p></div>
              </header>
              <div className="org-configuration-list">
                <div><span>Country and timezone</span><strong>{company.countryCode} · {company.timezone}</strong></div>
                <div><span>Financial display</span><strong>{company.currencyCode}</strong></div>
                <div><span>Date presentation</span><strong>{company.dateFormat}</strong></div>
                <div><span>Employee-number format</span><strong>{company.employeeCodePrefix || "No prefix"} + {company.employeeCodeLength} digits</strong></div>
                <div><span>Logo source</span><strong>{company.logoPath || "No logo configured"}</strong></div>
                <div><span>Workspace access</span><strong>{company.isActive ? "Enabled" : "Disabled"}</strong></div>
              </div>
            </section>
          ) : null}

          {activeTab === "Activity" ? (
            <section className="org-information-card org-information-card--wide">
              <header>
                <Activity size={18} />
                <div><h3>Record activity</h3><p>Basic timestamps from the company record.</p></div>
              </header>
              <div className="org-activity-timeline">
                <div><span><Activity size={15} /></span><div><strong>Company record updated</strong><p>{formatDate(company.updatedAt)}</p></div></div>
                <div><span><Building2 size={15} /></span><div><strong>Company record created</strong><p>{formatDate(company.createdAt)}</p></div></div>
              </div>
              <p className="org-feature-note">A full activity feed will connect to the shared audit and messaging modules later.</p>
            </section>
          ) : null}
        </div>
      </div>

      <DeleteCompanyDialog
        company={deleteCompany}
        onClose={() => setDeleteCompany(null)}
        onDeleted={() => navigate("/companies", { replace: true })}
      />
    </section>
  );
}

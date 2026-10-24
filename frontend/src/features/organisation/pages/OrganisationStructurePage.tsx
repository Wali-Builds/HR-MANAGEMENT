import {
  Building2,
  CheckCircle2,
  Network,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCompanies, useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { BranchesPanel } from "../../branches/components/BranchesPanel";
import { DepartmentsPanel } from "../components/DepartmentsPanel";
import { DesignationsPanel } from "../../designations/components/DesignationsPanel";
import { OrganisationTabs } from "../components/OrganisationTabs";
import { PositionsPanel } from "../../positions/components/PositionsPanel";
import { useOrganisationCounts } from "../hooks/useOrganisation";
import type {
  OrganisationCounts,
  OrganisationSection,
} from "../types/organisation.types";

interface Props {
  section: OrganisationSection;
}

const emptyCounts: OrganisationCounts = {
  branches: 0,
  departments: 0,
  designations: 0,
  positions: 0,
};

const viewPermissions: Record<OrganisationSection, string> = {
  branches: "branch.view",
  departments: "department.view",
  designations: "designation.view",
  positions: "position.view",
};

const managePermissions: Record<OrganisationSection, string> = {
  branches: "branch.manage",
  departments: "department.manage",
  designations: "designation.manage",
  positions: "position.manage",
};

export function OrganisationStructurePage({ section }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    user?.companyId ?? "",
  );
  // edited by wali: Remember the preferred list or card layout across structure sections.
  const [view, setView] = useState<"list" | "cards">(() =>
    window.localStorage.getItem("organisation-structure-view") === "cards" ? "cards" : "list",
  );
  const changeView = (nextView: "list" | "cards") => {
    window.localStorage.setItem("organisation-structure-view", nextView);
    setView(nextView);
  };

  // edited by wali: Only Platform Admins need the company directory to select a tenant.
  const companiesQuery = useCompanies({
    page: 1,
    limit: 100,
    sortBy: "display_name",
    sortOrder: "ASC",
    isActive: true,
  }, isPlatformAdmin);

  const companyId = isPlatformAdmin
    ? selectedCompanyId || undefined
    : user?.companyId ?? undefined;
  // edited by wali: Load the scoped company's name for the organisation header.
  const currentCompanyIdentityQuery = useCurrentCompanyIdentity(
    !isPlatformAdmin ? companyId ?? null : null,
  );

  const countsQuery = useOrganisationCounts(
    companyId,
    !isPlatformAdmin || Boolean(companyId),
    {
      branches: hasPermission("branch.view"),
      departments: hasPermission("department.view"),
      designations: hasPermission("designation.view"),
      positions: hasPermission("position.view"),
    },
  );
  const counts = countsQuery.data ?? emptyCounts;

  useEffect(() => {
    if (!hasPermission(viewPermissions[section])) {
      const fallback = (Object.keys(viewPermissions) as OrganisationSection[])
        .find((candidate) => hasPermission(viewPermissions[candidate]));
      navigate(
        fallback
          ? `/employees/organisation/${fallback}`
          : "/unauthorized",
        { replace: true },
      );
    }
  }, [hasPermission, navigate, section]);

  const selectedCompany = useMemo(
    () =>
      isPlatformAdmin
        ? companiesQuery.data?.companies.find(
            (company) => company.companyId === companyId,
          )
        : undefined,
    [companiesQuery.data?.companies, companyId, isPlatformAdmin],
  );

  const canManage = hasPermission(managePermissions[section]);

  return (
    <section className="wf-org-page">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity">
          <span className="wf-org-hero__identity-icon"><Settings2 size={19} /></span>
          <div className="wf-org-hero__copy">
            <span className="wf-org-hero__eyebrow">Workforce configuration</span>
            <h1>Organisation structure</h1>
            <p>
              Build the operational hierarchy used by employee assignments,
              approvals, attendance, leave, payroll and reporting.
            </p>
          </div>
        </div>

        <div className="wf-org-hero__scope">
          <div className="wf-org-hero__scope-icon"><Building2 size={20} /></div>
          <div>
            <span>Working company</span>
            {isPlatformAdmin ? (
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
              >
                <option value="">Select a company</option>
                {(companiesQuery.data?.companies ?? []).map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{selectedCompany?.displayName ?? currentCompanyIdentityQuery.data?.displayName ?? (currentCompanyIdentityQuery.isLoading ? "Loading company…" : "Your company")}</strong>
            )}
          </div>
        </div>
      </header>

      <div className="wf-org-health-strip">
        <div><span><Building2 size={16} /></span><strong>{counts.branches}</strong><small>Company Footprints</small></div>
        <div><span><Network size={16} /></span><strong>{counts.departments}</strong><small>Departments</small></div>
        <div><span><CheckCircle2 size={16} /></span><strong>{counts.designations}</strong><small>Designations</small></div>
        <div><span><UsersRound size={16} /></span><strong>{counts.positions}</strong><small>Positions</small></div>
      </div>

      {isPlatformAdmin && !companyId ? (
        <div className="wf-org-company-required">
          <Building2 size={25} />
          <div>
            <h2>Select a company to continue</h2>
            <p>Organisation records are tenant-specific. Choose the company whose workforce structure you want to configure.</p>
          </div>
        </div>
      ) : (
        <div className="wf-org-workspace">
          <OrganisationTabs counts={counts} />
          <main className={`wf-org-workspace__content${view === "cards" ? " wf-org-workspace__content--cards" : ""}`}>
            {section === "branches" ? <BranchesPanel companyId={companyId} canManage={canManage} view={view} onViewChange={changeView} /> : null}
            {section === "departments" ? <DepartmentsPanel companyId={companyId} canManage={canManage} view={view} onViewChange={changeView} /> : null}
            {section === "designations" ? <DesignationsPanel companyId={companyId} canManage={canManage} view={view} onViewChange={changeView} /> : null}
            {section === "positions" ? <PositionsPanel companyId={companyId} canManage={canManage} view={view} onViewChange={changeView} /> : null}
          </main>
        </div>
      )}
    </section>
  );
}


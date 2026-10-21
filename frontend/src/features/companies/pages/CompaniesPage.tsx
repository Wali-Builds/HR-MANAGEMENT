import {
  Building2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { CompanyFilterRail } from "../components/CompanyFilterRail";
import { CompanyKanbanCard } from "../components/CompanyKanbanCard";
import { CompanyListView } from "../components/CompanyListView";
import {
  CompanyWorkspaceToolbar,
  type CompanyStatusFilter,
  type CompanyWorkspaceView,
} from "../components/CompanyWorkspaceToolbar";
import { CompanyDeactivationDialog } from "../components/CompanyDeactivationDialog";
import { DeleteCompanyDialog } from "../components/DeleteCompanyDialog";
import { useCompanies } from "../hooks/useCompanies";
import type {
  Company,
  CompanySortField,
  SortOrder,
} from "../types/company.types";

const PAGE_SIZE = 20;

function readStoredView(): CompanyWorkspaceView {
  return window.localStorage.getItem("companies-workspace-view") === "list"
    ? "list"
    : "kanban";
}

export function CompaniesPage() {
  const navigate = useNavigate();
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const canCreate = isPlatformAdmin;
  const canEdit = isPlatformAdmin || hasPermission("company.manage");
  const canDelete = isPlatformAdmin;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<CompanyStatusFilter>("all");
  const [sortBy, setSortBy] = useState<CompanySortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [view, setView] = useState<CompanyWorkspaceView>(readStoredView);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [companyToDeactivate, setCompanyToDeactivate] = useState<Company | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status === "deleted"
        ? { isDeleted: true }
        : status !== "all"
          ? { isActive: status === "active" }
          : {}),
    }),
    [deferredSearch, page, sortBy, sortOrder, status],
  );

  const companiesQuery = useCompanies(listParams);

  // edited by wali: Keep quick-view totals independent of the selected status and page.
  const countBaseParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      sortBy: "created_at" as const,
      sortOrder: "DESC" as const,
      ...(deferredSearch ? { search: deferredSearch } : {}),
    }),
    [deferredSearch],
  );
  const allCompaniesCountQuery = useCompanies(countBaseParams);
  const activeCompaniesCountQuery = useCompanies({
    ...countBaseParams,
    isActive: true,
  });
  const inactiveCompaniesCountQuery = useCompanies({
    ...countBaseParams,
    isActive: false,
  });
  // edited by wali: Keep the admin-only deleted count independent of the current tab.
  const deletedCompaniesCountQuery = useCompanies(
    { ...countBaseParams, isDeleted: true },
    isPlatformAdmin,
  );
  const statusCounts = {
    all: allCompaniesCountQuery.data?.pagination.total,
    active: activeCompaniesCountQuery.data?.pagination.total,
    inactive: inactiveCompaniesCountQuery.data?.pagination.total,
    deleted: isPlatformAdmin
      ? deletedCompaniesCountQuery.data?.pagination.total
      : undefined,
  };

  const companies = companiesQuery.data?.companies ?? [];
  const pagination = companiesQuery.data?.pagination;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, sortBy, sortOrder, status]);

  useEffect(() => {
    window.localStorage.setItem("companies-workspace-view", view);
  }, [view]);

  function openCompany(company: Company) {
    navigate(`/companies/${company.companyId}`);
  }

  function editCompany(company: Company) {
    navigate(`/companies/${company.companyId}/edit`);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  const error = companiesQuery.isError
    ? normalizeApiError(companiesQuery.error)
    : null;

  return (
    <section className="org-workspace">
      <CompanyWorkspaceToolbar
        search={search}
        status={status}
        sortBy={sortBy}
        sortOrder={sortOrder}
        view={view}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        total={pagination?.total}
        canCreate={canCreate}
        canViewDeleted={isPlatformAdmin}
        isRefreshing={companiesQuery.isFetching}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onViewChange={setView}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() =>
          setPage((current) => Math.min(pagination?.totalPages ?? 1, current + 1))
        }
        onCreate={() => navigate("/companies/new")}
        onRefresh={() => void companiesQuery.refetch()}
        onClear={clearFilters}
      />

      <div className="org-workspace__body">
        <CompanyFilterRail
          companies={companies}
          counts={statusCounts}
          canViewDeleted={isPlatformAdmin}
          status={status}
          onStatusChange={setStatus}
          onSearchLocation={setSearch}
        />

        <main className="org-record-area">
          <div className="org-record-area__context">
            <div>
              <strong>
                {pagination
                  ? `${pagination.total} compan${pagination.total === 1 ? "y" : "ies"}`
                  : "Company directory"}
              </strong>
              <span>
                {status === "all"
                  ? "All accessible organisation records"
                  : `${status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Deleted"} organisations`}
              </span>
            </div>
            {companiesQuery.isFetching && !companiesQuery.isLoading ? (
              <span><RefreshCw className="spin" size={13} /> Updating</span>
            ) : null}
          </div>

          {companiesQuery.isLoading ? (
            <div className={view === "kanban" ? "org-kanban-grid" : "org-list-loading"}>
              {Array.from({ length: view === "kanban" ? 8 : 7 }).map((_, index) => (
                <div
                  className={view === "kanban" ? "org-kanban-card org-skeleton-card" : "org-skeleton-row"}
                  key={index}
                >
                  <span className="org-skeleton org-skeleton--avatar" />
                  <span className="org-skeleton" />
                  <span className="org-skeleton org-skeleton--short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="org-state-panel">
              <span className="org-state-panel__icon org-state-panel__icon--error">
                <Building2 size={26} />
              </span>
              <h2>Companies could not be loaded</h2>
              <p>{error.message}</p>
              <button
                type="button"
                className="org-secondary-action"
                onClick={() => void companiesQuery.refetch()}
              >
                <RefreshCw className={companiesQuery.isFetching ? "spin" : ""} size={16} /> Try again
              </button>
            </div>
          ) : companies.length === 0 ? (
            <div className="org-state-panel">
              <span className="org-state-panel__icon">
                <Building2 size={27} />
              </span>
              <h2>{deferredSearch || status !== "all" ? "No matching companies" : "No companies yet"}</h2>
              <p>
                {deferredSearch || status !== "all"
                  ? "Try another search or clear the current filters."
                  : "Create an organisation to begin configuring its people operations workspace."}
              </p>
              {deferredSearch || status !== "all" ? (
                <button type="button" className="org-secondary-action" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : canCreate ? (
                <button type="button" className="org-primary-action" onClick={() => navigate("/companies/new")}>
                  Create first company
                </button>
              ) : null}
            </div>
          ) : view === "kanban" ? (
            <div className="org-kanban-grid">
              {companies.map((company) => (
                <CompanyKanbanCard
                  key={company.companyId}
                  company={company}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onOpen={openCompany}
                  onEdit={editCompany}
                  onDeactivate={setCompanyToDeactivate}
                  onDelete={setCompanyToDelete}
                />
              ))}
            </div>
          ) : (
            <CompanyListView
              companies={companies}
              canEdit={canEdit}
              canDelete={canDelete}
              onOpen={openCompany}
              onEdit={editCompany}
              onDeactivate={setCompanyToDeactivate}
              onDelete={setCompanyToDelete}
            />
          )}

          {companiesQuery.isFetching && companiesQuery.isLoading ? (
            <div className="org-loading-overlay" aria-hidden="true">
              <LoaderCircle className="spin" size={22} />
            </div>
          ) : null}
        </main>
      </div>

      <CompanyDeactivationDialog
        company={companyToDeactivate}
        onClose={() => setCompanyToDeactivate(null)}
        onDeactivated={() => setCompanyToDeactivate(null)}
      />
      <DeleteCompanyDialog
        company={companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        onDeleted={() => setCompanyToDelete(null)}
      />
    </section>
  );
}

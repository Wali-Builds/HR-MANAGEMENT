import { LoaderCircle, RefreshCw, UserRoundX, UsersRound } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCompanies } from "../../companies/hooks/useCompanies";
import { ArchiveEmployeeDialog } from "../components/ArchiveEmployeeDialog";
import {
  EmployeeFiltersPanel,
  type EmployeeActivityFilter,
} from "../components/EmployeeFiltersPanel";
import { EmployeeKanbanCard } from "../components/EmployeeKanbanCard";
import { EmployeeListView } from "../components/EmployeeListView";
import {
  EmployeeWorkspaceToolbar,
  type EmployeeWorkspaceView,
} from "../components/EmployeeWorkspaceToolbar";
import {
  useEmployeeLookups,
  useEmployeeReferenceData,
  useEmployees,
} from "../hooks/useEmployees";
import type {
  Employee,
  EmployeeSortField,
  SortOrder,
} from "../types/employee.types";

const PAGE_SIZE = 20;

function readStoredView(): EmployeeWorkspaceView {
  return window.localStorage.getItem("employees-workspace-view") === "list"
    ? "list"
    : "kanban";
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasPermission, isPlatformAdmin, isBranchAdmin } = usePermissions();
  const canCreate = hasPermission("employee.create");
  const canEdit = hasPermission("employee.update");
  const canArchive = hasPermission("employee.delete");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [view, setView] = useState<EmployeeWorkspaceView>(readStoredView);
  const [sortBy, setSortBy] = useState<EmployeeSortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [activity, setActivity] = useState<EmployeeActivityFilter>("active");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState("");
  const [employeeStatusId, setEmployeeStatusId] = useState("");
  const [gender, setGender] = useState("");
  const [joiningDateFrom, setJoiningDateFrom] = useState("");
  const [joiningDateTo, setJoiningDateTo] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.companyId ?? "");
  const [employeeToArchive, setEmployeeToArchive] = useState<Employee | null>(null);
  // edited by wali: Load the platform company directory only for Platform Admins.
  const companiesQuery = useCompanies({
    page: 1,
    limit: 100,
    sortBy: "display_name",
    sortOrder: "ASC",
    isActive: true,
  }, isPlatformAdmin);
  const companies = isPlatformAdmin ? companiesQuery.data?.companies ?? [] : [];
  const scopeCompanyId = isPlatformAdmin ? selectedCompanyId || undefined : user?.companyId ?? undefined;
  const referencesEnabled = !isPlatformAdmin || Boolean(scopeCompanyId);
  const lookupsQuery = useEmployeeLookups();
  const references = useEmployeeReferenceData(scopeCompanyId, referencesEnabled);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      ...(scopeCompanyId ? { companyId: scopeCompanyId } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(activity !== "all" ? { isActive: activity === "active" } : {}),
      ...(branchId ? { branchId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(employmentTypeId ? { employmentTypeId } : {}),
      ...(employeeStatusId ? { employeeStatusId } : {}),
      ...(gender ? { gender } : {}),
      ...(joiningDateFrom ? { joiningDateFrom } : {}),
      ...(joiningDateTo ? { joiningDateTo } : {}),
    }),
    [
      activity,
      branchId,
      deferredSearch,
      departmentId,
      employeeStatusId,
      employmentTypeId,
      gender,
      joiningDateFrom,
      joiningDateTo,
      page,
      scopeCompanyId,
      sortBy,
      sortOrder,
    ],
  );

  const employeesQuery = useEmployees(listParams);
  const employees = employeesQuery.data?.employees ?? [];
  const pagination = employeesQuery.data?.pagination;
  // edited by wali: Keep the Branch Admin department filter within the branches returned for their session.
  const visibleDepartments = isBranchAdmin
    ? references.departments.filter((department) =>
        Boolean(
          department.branchId &&
            references.branches.some(
              (branch) => branch.branchId === department.branchId,
            ),
        ),
      )
    : references.departments;

  const activeFilterCount = [
    activity !== "active",
    Boolean(branchId),
    Boolean(departmentId),
    Boolean(employmentTypeId),
    Boolean(employeeStatusId),
    Boolean(gender),
    Boolean(joiningDateFrom),
    Boolean(joiningDateTo),
  ].filter(Boolean).length;

  useEffect(() => {
    setPage(1);
  }, [
    activity,
    branchId,
    deferredSearch,
    departmentId,
    employeeStatusId,
    employmentTypeId,
    gender,
    joiningDateFrom,
    joiningDateTo,
    scopeCompanyId,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    window.localStorage.setItem("employees-workspace-view", view);
  }, [view]);

  function clearFilters() {
    setActivity("active");
    setBranchId("");
    setDepartmentId("");
    setEmploymentTypeId("");
    setEmployeeStatusId("");
    setGender("");
    setJoiningDateFrom("");
    setJoiningDateTo("");
    setPage(1);
  }

  const error = employeesQuery.isError
    ? normalizeApiError(employeesQuery.error)
    : null;

  return (
    <section className="emp-workspace emp-workspace--access-ui">
      <EmployeeWorkspaceToolbar
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
        view={view}
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        total={pagination?.total}
        canCreate={canCreate}
        isRefreshing={employeesQuery.isFetching}
        filtersOpen={filtersOpen}
        activeFilterCount={activeFilterCount}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        showCompanySelector={isPlatformAdmin}
        onSearchChange={setSearch}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onViewChange={setView}
        onCompanyChange={(value) => {
          setSelectedCompanyId(value);
          setBranchId("");
          setDepartmentId("");
        }}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(pagination?.totalPages ?? 1, current + 1))}
        onCreate={() => navigate(scopeCompanyId ? `/employees/new?companyId=${scopeCompanyId}` : "/employees/new")}
        onRefresh={() => void employeesQuery.refetch()}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onClear={clearFilters}
      />

      <div className={`emp-workspace__body ${filtersOpen ? "has-filters" : ""}`}>
        <EmployeeFiltersPanel
          open={filtersOpen}
          activity={activity}
          showBranchFilter={!isBranchAdmin}
          branchId={branchId}
          departmentId={departmentId}
          employmentTypeId={employmentTypeId}
          employeeStatusId={employeeStatusId}
          gender={gender}
          joiningDateFrom={joiningDateFrom}
          joiningDateTo={joiningDateTo}
          branches={references.branches}
          departments={visibleDepartments}
          lookups={lookupsQuery.data}
          onActivityChange={setActivity}
          onBranchChange={setBranchId}
          onDepartmentChange={setDepartmentId}
          onEmploymentTypeChange={setEmploymentTypeId}
          onEmployeeStatusChange={setEmployeeStatusId}
          onGenderChange={setGender}
          onJoiningDateFromChange={setJoiningDateFrom}
          onJoiningDateToChange={setJoiningDateTo}
        />

        <main className="emp-record-area">
          <div className="emp-record-area__context">
            <div>
              <strong>{pagination ? `${pagination.total} employee${pagination.total === 1 ? "" : "s"}` : "Employee directory"}</strong>
              <span>{activity === "all" ? "All accessible employee records" : `${activity === "active" ? "Active" : "Inactive"} employee records`}</span>
            </div>
            {employeesQuery.isFetching && !employeesQuery.isLoading ? <span><RefreshCw className="spin" size={13} /> Updating</span> : null}
          </div>

          {employeesQuery.isLoading ? (
            <div className={view === "kanban" ? "emp-kanban-grid" : "emp-list-loading"}>
              {Array.from({ length: view === "kanban" ? 8 : 7 }).map((_, index) => (
                <div className={view === "kanban" ? "emp-kanban-card emp-skeleton-card" : "emp-skeleton-row"} key={index}>
                  <span className="emp-skeleton emp-skeleton--avatar" />
                  <span className="emp-skeleton" />
                  <span className="emp-skeleton emp-skeleton--short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="emp-state-panel">
              <span className="emp-state-panel__icon emp-state-panel__icon--error"><UserRoundX size={27} /></span>
              <h2>Employees could not be loaded</h2>
              <p>{error.message}</p>
              <button type="button" className="emp-secondary-action" onClick={() => void employeesQuery.refetch()}><RefreshCw className={employeesQuery.isFetching ? "spin" : ""} size={16} /> Try again</button>
            </div>
          ) : employees.length === 0 ? (
            <div className="emp-state-panel">
              <span className="emp-state-panel__icon"><UsersRound size={28} /></span>
              <h2>{deferredSearch || activeFilterCount > 0 ? "No matching employees" : "No employee records yet"}</h2>
              <p>{deferredSearch || activeFilterCount > 0 ? "Try another search or clear the current filters." : "Create the first employee record to begin building the organisation directory."}</p>
              {deferredSearch || activeFilterCount > 0 ? (
                <button type="button" className="emp-secondary-action" onClick={() => { setSearch(""); clearFilters(); }}>Clear filters</button>
              ) : canCreate ? (
                <button type="button" className="emp-primary-action" onClick={() => navigate("/employees/new")}>Create first employee</button>
              ) : null}
            </div>
          ) : view === "kanban" ? (
            <div className="emp-kanban-grid">
              {employees.map((employee) => (
                <EmployeeKanbanCard
                  key={employee.employeeId}
                  employee={employee}
                  canEdit={canEdit}
                  canArchive={canArchive}
                  onOpen={(item) => navigate(`/employees/${item.employeeId}`)}
                  onEdit={(item) => navigate(`/employees/${item.employeeId}/edit`)}
                  onArchive={setEmployeeToArchive}
                />
              ))}
            </div>
          ) : (
            <EmployeeListView
              employees={employees}
              canEdit={canEdit}
              canArchive={canArchive}
              onOpen={(item) => navigate(`/employees/${item.employeeId}`)}
              onEdit={(item) => navigate(`/employees/${item.employeeId}/edit`)}
              onArchive={setEmployeeToArchive}
            />
          )}

          {employeesQuery.isFetching && employeesQuery.isLoading ? (
            <div className="emp-loading-overlay"><LoaderCircle className="spin" size={22} /></div>
          ) : null}
        </main>
      </div>

      <ArchiveEmployeeDialog employee={employeeToArchive} onClose={() => setEmployeeToArchive(null)} />
    </section>
  );
}

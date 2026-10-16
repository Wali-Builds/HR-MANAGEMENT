import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type { Company } from "../../companies/types/company.types";
import type { EmployeeSortField, SortOrder } from "../types/employee.types";
import { EmployeeMenuSelect } from "./EmployeeMenuSelect";

export type EmployeeWorkspaceView = "kanban" | "list";

interface Props {
  search: string;
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
  view: EmployeeWorkspaceView;
  page: number;
  totalPages: number;
  total?: number;
  canCreate: boolean;
  isRefreshing: boolean;
  filtersOpen: boolean;
  activeFilterCount: number;
  companies: Company[];
  selectedCompanyId: string;
  showCompanySelector: boolean;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: EmployeeSortField) => void;
  onSortOrderChange: (value: SortOrder) => void;
  onViewChange: (value: EmployeeWorkspaceView) => void;
  onCompanyChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onClear: () => void;
}

export function EmployeeWorkspaceToolbar(props: Props) {
  return (
    <header className="emp-control-panel">
      <div className="emp-control-panel__primary">
        <div className="emp-control-panel__identity">
          {props.canCreate ? (
            <button type="button" className="emp-primary-action" onClick={props.onCreate}>
              <Plus size={16} /> New employee
            </button>
          ) : null}
          <div>
            <span>People operations</span>
            <h1>Employee directory</h1>
          </div>
        </div>

        <div className="emp-control-panel__meta">
          <span className="emp-record-counter">
            {typeof props.total === "number" ? `${props.total} records` : "Employees"}
          </span>
          <button
            type="button"
            className="emp-icon-button"
            onClick={props.onRefresh}
            aria-label="Refresh employees"
          >
            <RefreshCw className={props.isRefreshing ? "spin" : ""} size={15} />
          </button>
          <div className="emp-pager">
            <button type="button" onClick={props.onPreviousPage} disabled={props.page <= 1}>
              <ChevronLeft size={15} />
            </button>
            <span>{props.page} / {Math.max(1, props.totalPages)}</span>
            <button type="button" onClick={props.onNextPage} disabled={props.page >= props.totalPages}>
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="emp-view-switcher">
            <button
              type="button"
              className={props.view === "kanban" ? "is-active" : ""}
              onClick={() => props.onViewChange("kanban")}
              aria-label="Kanban view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={props.view === "list" ? "is-active" : ""}
              onClick={() => props.onViewChange("list")}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="emp-control-panel__secondary">
        <div className="emp-search-box">
          <Search size={15} />
          <input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="Search name, code, email, CNIC or phone"
          />
          {props.search ? (
            <button type="button" onClick={() => props.onSearchChange("")}>
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="emp-toolbar-controls">
          {props.showCompanySelector ? (
            <EmployeeMenuSelect
              value={props.selectedCompanyId}
              placeholder="All companies"
              ariaLabel="Company scope"
              options={props.companies.map((company) => ({ value: company.companyId, label: company.displayName }))}
              onChange={props.onCompanyChange}
            />
          ) : null}

          <EmployeeMenuSelect
            value={props.sortBy}
            placeholder="Sort employees"
            ariaLabel="Sort employees"
            options={[
              { value: "updated_at", label: "Recently updated" },
              { value: "created_at", label: "Recently created" },
              { value: "employee_code", label: "Employee code" },
              { value: "first_name", label: "Employee name" },
              { value: "joining_date", label: "Joining date" },
            ]}
            onChange={(value) => props.onSortByChange(value as EmployeeSortField)}
          />

          <button
            type="button"
            className="emp-sort-button"
            onClick={() => props.onSortOrderChange(props.sortOrder === "ASC" ? "DESC" : "ASC")}
          >
            {props.sortOrder === "ASC" ? "Ascending" : "Descending"}
          </button>

          <button
            type="button"
            className={`emp-filter-button ${props.filtersOpen ? "is-active" : ""}`}
            onClick={props.onToggleFilters}
          >
            <SlidersHorizontal size={15} /> Filters
            {props.activeFilterCount > 0 ? <span>{props.activeFilterCount}</span> : null}
          </button>

          {props.activeFilterCount > 0 ? (
            <button type="button" className="emp-clear-button" onClick={props.onClear}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

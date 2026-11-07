import {
  Building2,
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

import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import type { CompanySortField, SortOrder } from "../types/company.types";

export type CompanyWorkspaceView = "kanban" | "list";
export type CompanyStatusFilter = "all" | "active" | "inactive" | "deleted";

interface Props {
  search: string;
  sortBy: CompanySortField;
  sortOrder: SortOrder;
  view: CompanyWorkspaceView;
  page: number;
  totalPages: number;
  total?: number;
  canCreate: boolean;
  isRefreshing: boolean;
  filtersOpen: boolean;
  activeFilterCount: number;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: CompanySortField) => void;
  onSortOrderChange: (value: SortOrder) => void;
  onViewChange: (value: CompanyWorkspaceView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onClear: () => void;
}

export function CompanyWorkspaceToolbar(props: Props) {
  return (
    <header className="emp-control-panel">
      <div className="emp-control-panel__primary">
        <div className="emp-control-panel__identity">
          <span className="emp-control-panel__icon"><Building2 size={20} /></span>
          <div>
            <span>Platform administration</span>
            <h1>Company directory</h1>
            <p>Find, review and manage company records.</p>
          </div>
        </div>

        <div className="emp-control-panel__meta">
          {props.canCreate ? (
            <button type="button" className="emp-primary-action" onClick={props.onCreate}>
              <Plus size={16} /> New company
            </button>
          ) : null}
          <span className="emp-record-counter">
            {typeof props.total === "number" ? `${props.total} records` : "Companies"}
          </span>
          <button type="button" className="emp-icon-button" onClick={props.onRefresh} aria-label="Refresh companies">
            <RefreshCw className={props.isRefreshing ? "spin" : ""} size={15} />
          </button>
          <div className="emp-pager" aria-label="Company pages">
            <button type="button" onClick={props.onPreviousPage} disabled={props.page <= 1} aria-label="Previous page">
              <ChevronLeft size={15} />
            </button>
            <span>{props.page} / {Math.max(1, props.totalPages)}</span>
            <button type="button" onClick={props.onNextPage} disabled={props.page >= props.totalPages} aria-label="Next page">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="emp-view-switcher" aria-label="Company view">
            <button type="button" className={props.view === "kanban" ? "is-active" : ""} onClick={() => props.onViewChange("kanban")} aria-label="Kanban view">
              <LayoutGrid size={15} />
            </button>
            <button type="button" className={props.view === "list" ? "is-active" : ""} onClick={() => props.onViewChange("list")} aria-label="List view">
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="emp-control-panel__secondary">
        <div className="emp-search-box">
          <Search size={15} />
          <input value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="Search company name, code, email, phone or city" />
          {props.search ? (
            <button type="button" onClick={() => props.onSearchChange("")} aria-label="Clear search"><X size={14} /></button>
          ) : null}
        </div>

        <div className="emp-toolbar-controls">
          <EmployeeMenuSelect
            value={props.sortBy}
            placeholder="Sort companies"
            ariaLabel="Sort companies"
            options={[
              { value: "updated_at", label: "Recently updated" },
              { value: "created_at", label: "Recently created" },
              { value: "display_name", label: "Company name" },
              { value: "legal_name", label: "Legal name" },
              { value: "company_code", label: "Company code" },
            ]}
            onChange={(value) => props.onSortByChange(value as CompanySortField)}
          />
          <button type="button" className="emp-sort-button" onClick={() => props.onSortOrderChange(props.sortOrder === "ASC" ? "DESC" : "ASC")}>
            {props.sortOrder === "ASC" ? "Ascending" : "Descending"}
          </button>
          <button type="button" className={`emp-filter-button ${props.filtersOpen ? "is-active" : ""}`} onClick={props.onToggleFilters}>
            <SlidersHorizontal size={15} /> Filters
            {props.activeFilterCount > 0 ? <span>{props.activeFilterCount}</span> : null}
          </button>
          {props.activeFilterCount > 0 ? (
            <button type="button" className="emp-clear-button" onClick={props.onClear}>Clear</button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

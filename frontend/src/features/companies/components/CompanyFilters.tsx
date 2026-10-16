import {
  ArrowDownAZ,
  Filter,
  Grid2X2,
  List,
  Search,
  X,
} from "lucide-react";

import type {
  CompanySortField,
  SortOrder,
} from "../types/company.types";

export type CompanyViewMode = "kanban" | "list";
export type CompanyStatusFilter = "all" | "active" | "inactive";

interface CompanyFiltersProps {
  search: string;
  status: CompanyStatusFilter;
  sortBy: CompanySortField;
  sortOrder: SortOrder;
  viewMode: CompanyViewMode;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CompanyStatusFilter) => void;
  onSortByChange: (value: CompanySortField) => void;
  onSortOrderChange: (value: SortOrder) => void;
  onViewModeChange: (value: CompanyViewMode) => void;
  onClear: () => void;
}

export function CompanyFilters({
  search,
  status,
  sortBy,
  sortOrder,
  viewMode,
  onSearchChange,
  onStatusChange,
  onSortByChange,
  onSortOrderChange,
  onViewModeChange,
  onClear,
}: CompanyFiltersProps) {
  const filtersApplied = search.trim() !== "" || status !== "all";

  return (
    <div className="company-toolbar">
      <label className="company-search">
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search companies, code, city or contact…"
          aria-label="Search companies"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
      </label>

      <div className="company-toolbar__controls">
        <label className="company-select-control">
          <Filter size={16} />
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as CompanyStatusFilter)
            }
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="company-select-control">
          <ArrowDownAZ size={16} />
          <select
            value={sortBy}
            onChange={(event) =>
              onSortByChange(event.target.value as CompanySortField)
            }
            aria-label="Sort companies"
          >
            <option value="created_at">Date created</option>
            <option value="updated_at">Recently updated</option>
            <option value="display_name">Display name</option>
            <option value="legal_name">Legal name</option>
            <option value="company_code">Company code</option>
          </select>
        </label>

        <button
          type="button"
          className="company-sort-direction"
          onClick={() => onSortOrderChange(sortOrder === "ASC" ? "DESC" : "ASC")}
          title={sortOrder === "ASC" ? "Ascending" : "Descending"}
          aria-label="Toggle sort direction"
        >
          {sortOrder === "ASC" ? "A–Z" : "Z–A"}
        </button>

        {filtersApplied ? (
          <button
            type="button"
            className="company-clear-filter"
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}

        <div className="company-view-switch" aria-label="Company view">
          <button
            type="button"
            className={viewMode === "kanban" ? "is-active" : ""}
            onClick={() => onViewModeChange("kanban")}
            title="Card view"
          >
            <Grid2X2 size={17} />
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "is-active" : ""}
            onClick={() => onViewModeChange("list")}
            title="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

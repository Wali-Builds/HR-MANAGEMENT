import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

interface Props {
  title: string;
  description: string;
  search: string;
  total: number;
  page: number;
  totalPages: number;
  activeFilter: "all" | "active" | "inactive";
  canCreate: boolean;
  isFetching: boolean;
  createLabel: string;
  onSearchChange: (value: string) => void;
  onActiveFilterChange: (value: "all" | "active" | "inactive") => void;
  onCreate: () => void;
  onRefresh: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function OrganisationResourceToolbar({
  title,
  description,
  search,
  total,
  page,
  totalPages,
  activeFilter,
  canCreate,
  isFetching,
  createLabel,
  onSearchChange,
  onActiveFilterChange,
  onCreate,
  onRefresh,
  onPreviousPage,
  onNextPage,
}: Props) {
  return (
    <header className="wf-org-resource-toolbar">
      <div className="wf-org-resource-toolbar__heading">
        <div>
          <span>Organisation master data</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {canCreate ? (
          <button type="button" className="wf-org-button wf-org-button--primary" onClick={onCreate}>
            <Plus size={16} /> {createLabel}
          </button>
        ) : null}
      </div>

      <div className="wf-org-resource-toolbar__tools">
        <label className="wf-org-search">
          <Search size={16} />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
        </label>

        <div className="wf-org-filter-group">
          <span><Filter size={14} /> Status</span>
          {(["all", "active", "inactive"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={activeFilter === value ? "is-active" : ""}
              onClick={() => onActiveFilterChange(value)}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>

        <div className="wf-org-resource-toolbar__pager">
          <span>{total} records</span>
          <button type="button" onClick={onRefresh} title="Refresh" aria-label="Refresh">
            <RefreshCw className={isFetching ? "spin" : ""} size={15} />
          </button>
          <button type="button" onClick={onPreviousPage} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
          <small>{page} / {Math.max(totalPages, 1)}</small>
          <button type="button" onClick={onNextPage} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={16} /></button>
        </div>
      </div>
    </header>
  );
}

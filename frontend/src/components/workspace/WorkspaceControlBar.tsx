import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";

export type WorkspaceView = "kanban" | "list";

interface WorkspaceControlBarProps {
  title: string;
  subtitle?: string;
  total?: number;
  page?: number;
  totalPages?: number;
  searchValue?: string;
  searchPlaceholder?: string;
  view?: WorkspaceView;
  onSearchChange?: (value: string) => void;
  onViewChange?: (view: WorkspaceView) => void;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onCreate?: () => void;
  createLabel?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function WorkspaceControlBar({
  title,
  subtitle,
  total,
  page = 1,
  totalPages = 1,
  searchValue = "",
  searchPlaceholder = "Search records",
  view = "kanban",
  onSearchChange,
  onViewChange,
  onPreviousPage,
  onNextPage,
  onCreate,
  createLabel = "New",
  actions,
  filters,
}: WorkspaceControlBarProps) {
  return (
    <section className="ws-controlbar">
      <div className="ws-controlbar__title-row">
        <div className="ws-controlbar__title">
          {onCreate ? (
            <button type="button" className="ws-controlbar__create" onClick={onCreate}>
              <Plus size={17} />
              {createLabel}
            </button>
          ) : null}
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        <div className="ws-controlbar__actions">{actions}</div>
      </div>

      <div className="ws-controlbar__tools">
        <label className="ws-controlbar__search">
          <Search size={17} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        <div className="ws-controlbar__filter-tools">
          <button type="button">
            <Filter size={16} />
            Filters
          </button>
          <button type="button">
            <SlidersHorizontal size={16} />
            Group
          </button>
          {filters}
        </div>

        <div className="ws-controlbar__right-tools">
          <span className="ws-controlbar__count">
            {typeof total === "number" ? `${total} records` : "Records"}
          </span>
          <div className="ws-controlbar__pager">
            <span>{page} / {Math.max(totalPages, 1)}</span>
            <button type="button" onClick={onPreviousPage} disabled={page <= 1}>
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={onNextPage} disabled={page >= totalPages}>
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="ws-controlbar__views">
            <button
              type="button"
              className={view === "kanban" ? "is-active" : ""}
              onClick={() => onViewChange?.("kanban")}
              aria-label="Kanban view"
            >
              <LayoutGrid size={17} />
            </button>
            <button
              type="button"
              className={view === "list" ? "is-active" : ""}
              onClick={() => onViewChange?.("list")}
              aria-label="List view"
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";

import type {
  CompanySortField,
  SortOrder,
} from "../types/company.types";

export type CompanyWorkspaceView = "kanban" | "list";
export type CompanyStatusFilter = "all" | "active" | "inactive" | "deleted";

interface FilterDropdownOption<Value extends string> {
  value: Value;
  label: string;
}

// edited by wali: Include Deleted in status choices, gated by platform-admin access below.
const companyStatusOptions: FilterDropdownOption<CompanyStatusFilter>[] = [
  { value: "all", label: "All companies" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deleted", label: "Deleted" },
];

const companySortOptions: FilterDropdownOption<CompanySortField>[] = [
  { value: "display_name", label: "Display name" },
  { value: "legal_name", label: "Legal name" },
  { value: "company_code", label: "Company code" },
  { value: "created_at", label: "Date created" },
  { value: "updated_at", label: "Recently updated" },
];

interface CompanyWorkspaceToolbarProps {
  search: string;
  status: CompanyStatusFilter;
  sortBy: CompanySortField;
  sortOrder: SortOrder;
  view: CompanyWorkspaceView;
  page: number;
  totalPages: number;
  total: number | undefined;
  canCreate: boolean;
  canViewDeleted: boolean;
  isRefreshing: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CompanyStatusFilter) => void;
  onSortByChange: (value: CompanySortField) => void;
  onSortOrderChange: (value: SortOrder) => void;
  onViewChange: (value: CompanyWorkspaceView) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onClear: () => void;
}

export function CompanyWorkspaceToolbar({
  search,
  status,
  sortBy,
  sortOrder,
  view,
  page,
  totalPages,
  total,
  canCreate,
  canViewDeleted,
  isRefreshing,
  onSearchChange,
  onStatusChange,
  onSortByChange,
  onSortOrderChange,
  onViewChange,
  onPreviousPage,
  onNextPage,
  onCreate,
  onRefresh,
  onClear,
}: CompanyWorkspaceToolbarProps) {
  const filtersApplied = search.trim() !== "" || status !== "all";

  return (
    <header className="org-control-panel">
      <div className="org-control-panel__primary">
        <div className="org-control-panel__identity">
          {canCreate ? (
            <button
              type="button"
              className="org-primary-action"
              onClick={onCreate}
            >
              <Plus size={17} />
              New company
            </button>
          ) : null}

          <div>
            <span className="org-control-panel__section">Organisation setup</span>
            <h1>Companies</h1>
          </div>
        </div>

        <div className="org-control-panel__meta">
          <button
            type="button"
            className="org-icon-button"
            onClick={onRefresh}
            title="Refresh companies"
            aria-label="Refresh companies"
          >
            <RefreshCw className={isRefreshing ? "spin" : ""} size={17} />
          </button>

          <span className="org-record-counter">
            {typeof total === "number" ? `${total} records` : "Loading records"}
          </span>

          <div className="org-pager" aria-label="Company pages">
            <span>{page} / {Math.max(totalPages, 1)}</span>
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="org-control-panel__secondary">
        <label className="org-search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, code, email, phone or city"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          ) : null}
        </label>

        <div className="org-filter-row">
          <FilterDropdown
            label="Status"
            icon={Filter}
            value={status}
            options={canViewDeleted
              ? companyStatusOptions
              : companyStatusOptions.filter((option) => option.value !== "deleted")}
            onChange={onStatusChange}
          />

          <FilterDropdown
            label="Sort"
            icon={SlidersHorizontal}
            value={sortBy}
            options={companySortOptions}
            onChange={onSortByChange}
          />

          <button
            type="button"
            className="org-sort-direction"
            onClick={() => onSortOrderChange(sortOrder === "ASC" ? "DESC" : "ASC")}
            title="Change sort direction"
          >
            {sortOrder === "ASC" ? "Ascending" : "Descending"}
          </button>

          {filtersApplied ? (
            <button type="button" className="org-clear-filters" onClick={onClear}>
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="org-view-switch" aria-label="Company view">
          <button
            type="button"
            className={view === "kanban" ? "is-active" : ""}
            onClick={() => onViewChange("kanban")}
            aria-label="Kanban view"
            title="Kanban view"
          >
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            className={view === "list" ? "is-active" : ""}
            onClick={() => onViewChange("list")}
            aria-label="List view"
            title="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}


// edited by wali: Use themed, keyboard-accessible menus instead of browser-native dropdown popups.
interface FilterDropdownProps<Value extends string> {
  label: string;
  icon: LucideIcon;
  value: Value;
  options: FilterDropdownOption<Value>[];
  onChange: (value: Value) => void;
}

function FilterDropdown<Value extends string>({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: FilterDropdownProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[role='menuitemradio']")
      ?.focus();

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function openWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function navigateOptions(event: ReactKeyboardEvent<HTMLDivElement>) {
    const optionButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']") ?? [],
    );
    if (optionButtons.length === 0) {
      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = optionButtons.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? optionButtons.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % optionButtons.length
          : (currentIndex - 1 + optionButtons.length) % optionButtons.length;
    optionButtons[nextIndex]?.focus();
  }

  return (
    <div className="org-filter-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="org-filter-dropdown__trigger"
        aria-label={`${label}: ${selectedOption?.label ?? value}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={openWithKeyboard}
      >
        <Icon size={15} aria-hidden="true" />
        <span className="org-filter-dropdown__label">{label}</span>
        <span className="org-filter-dropdown__value">
          {selectedOption?.label ?? value}
        </span>
        <ChevronDown
          className={isOpen ? "org-filter-dropdown__chevron is-open" : "org-filter-dropdown__chevron"}
          size={14}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className="org-filter-dropdown__menu"
          role="menu"
          aria-label={`${label} options`}
          ref={menuRef}
          onKeyDown={navigateOptions}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className={
                  isSelected
                    ? "org-filter-dropdown__option is-selected"
                    : "org-filter-dropdown__option"
                }
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={15} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

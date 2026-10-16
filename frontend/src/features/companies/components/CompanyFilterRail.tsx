import {
  Building2,
  CheckCircle2,
  CircleOff,
  Globe2,
  MapPin,
  Trash2,
} from "lucide-react";

import type { Company } from "../types/company.types";
import type { CompanyStatusFilter } from "./CompanyWorkspaceToolbar";

// edited by wali: Quick-view totals come from independent status count queries.
interface CompanyFilterRailProps {
  companies: Company[];
  counts: {
    all: number | undefined;
    active: number | undefined;
    inactive: number | undefined;
    deleted: number | undefined;
  };
  canViewDeleted: boolean;
  status: CompanyStatusFilter;
  onStatusChange: (value: CompanyStatusFilter) => void;
  onSearchLocation: (value: string) => void;
}

interface LocationCount {
  name: string;
  count: number;
}

function getLocationCounts(companies: Company[]): LocationCount[] {
  const counts = new Map<string, number>();

  for (const company of companies) {
    const location = company.city?.trim();
    if (!location) {
      continue;
    }

    counts.set(location, (counts.get(location) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 6);
}

export function CompanyFilterRail({
  companies,
  counts,
  canViewDeleted,
  status,
  onStatusChange,
  onSearchLocation,
}: CompanyFilterRailProps) {
  const locations = getLocationCounts(companies);

  return (
    <aside className="org-filter-rail" aria-label="Company quick filters">
      <section>
        <span className="org-filter-rail__label">Quick views</span>
        <button
          type="button"
          className={status === "all" ? "is-active" : ""}
          onClick={() => onStatusChange("all")}
        >
          <Building2 size={16} />
          <span>All companies</span>
          <small>{counts.all ?? "—"}</small>
        </button>
        <button
          type="button"
          className={status === "active" ? "is-active" : ""}
          onClick={() => onStatusChange("active")}
        >
          <CheckCircle2 size={16} />
          <span>Active</span>
          <small>{counts.active ?? "—"}</small>
        </button>
        <button
          type="button"
          className={status === "inactive" ? "is-active" : ""}
          onClick={() => onStatusChange("inactive")}
        >
          <CircleOff size={16} />
          <span>Inactive</span>
          <small>{counts.inactive ?? "—"}</small>
        </button>
        {canViewDeleted ? (
          <button
            type="button"
            className={status === "deleted" ? "is-active" : ""}
            onClick={() => onStatusChange("deleted")}
          >
            <Trash2 size={16} />
            <span>Deleted</span>
            <small>{counts.deleted ?? "?"}</small>
          </button>
        ) : null}
      </section>

      <section>
        <span className="org-filter-rail__label">Locations on this page</span>
        {locations.length > 0 ? (
          locations.map((location) => (
            <button
              type="button"
              key={location.name}
              onClick={() => onSearchLocation(location.name)}
            >
              <MapPin size={15} />
              <span>{location.name}</span>
              <small>{location.count}</small>
            </button>
          ))
        ) : (
          <p className="org-filter-rail__empty">No city data available.</p>
        )}
      </section>

      <div className="org-filter-rail__note">
        <Globe2 size={16} />
        <p>Platform administrators can work across every organisation.</p>
      </div>
    </aside>
  );
}

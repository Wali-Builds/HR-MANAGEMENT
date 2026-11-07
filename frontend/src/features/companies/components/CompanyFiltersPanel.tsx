import { Building2, CheckCircle2, CircleOff, Filter, MapPin, Trash2, UsersRound } from "lucide-react";

import type { Company } from "../types/company.types";
import type { CompanyStatusFilter } from "./CompanyWorkspaceToolbar";

interface Props {
  open: boolean;
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

function getLocations(companies: Company[]) {
  const counts = new Map<string, number>();
  for (const company of companies) {
    const city = company.city?.trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
}

export function CompanyFiltersPanel(props: Props) {
  if (!props.open) return null;
  const locations = getLocations(props.companies);

  return (
    <aside className="emp-filter-panel" aria-label="Company filters">
      <div className="emp-filter-panel__heading">
        <span><Filter size={15} /></span>
        <div>
          <strong>Refine directory</strong>
          <small>Filter current company records</small>
        </div>
      </div>

      <div className="emp-filter-section">
        <label>Company status</label>
        <div className="emp-filter-segments company-filter-segments">
          <button type="button" className={props.status === "all" ? "is-active" : ""} onClick={() => props.onStatusChange("all")}>
            <Building2 size={14} /> All <small>{props.counts.all ?? "—"}</small>
          </button>
          <button type="button" className={props.status === "active" ? "is-active" : ""} onClick={() => props.onStatusChange("active")}>
            <CheckCircle2 size={14} /> Active <small>{props.counts.active ?? "—"}</small>
          </button>
          <button type="button" className={props.status === "inactive" ? "is-active" : ""} onClick={() => props.onStatusChange("inactive")}>
            <CircleOff size={14} /> Inactive <small>{props.counts.inactive ?? "—"}</small>
          </button>
        </div>
        {props.canViewDeleted ? (
          <button type="button" className="company-deleted-filter" aria-pressed={props.status === "deleted"} onClick={() => props.onStatusChange(props.status === "deleted" ? "all" : "deleted")}>
            <Trash2 size={14} /> Deleted companies <strong>{props.counts.deleted ?? "—"}</strong>
          </button>
        ) : null}
      </div>

      <div className="emp-filter-section company-location-filters">
        <label>Locations on this page</label>
        {locations.length ? locations.map((location) => (
          <button type="button" key={location.name} onClick={() => props.onSearchLocation(location.name)}>
            <MapPin size={14} /><span>{location.name}</span><small>{location.count}</small>
          </button>
        )) : (
          <p>No city data available.</p>
        )}
      </div>

      <div className="company-filter-note">
        <UsersRound size={15} /> Platform administrators can work across every organisation.
      </div>
    </aside>
  );
}

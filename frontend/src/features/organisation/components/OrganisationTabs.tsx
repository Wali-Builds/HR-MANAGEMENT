import {
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  Network,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { usePermissions } from "../../../hooks/usePermissions";
import type {
  OrganisationCounts,
  OrganisationSection,
} from "../types/organisation.types";

interface Props {
  counts: OrganisationCounts;
}

const items: Array<{
  section: OrganisationSection;
  label: string;
  description: string;
  permission: string;
  icon: typeof Network;
}> = [
  {
    section: "branches",
    label: "Branches",
    description: "Physical and operational locations",
    permission: "branch.view",
    icon: Building2,
  },
  {
    section: "departments",
    label: "Departments",
    description: "Teams, functions and reporting units",
    permission: "department.view",
    icon: Network,
  },
  // edited by wali: Show Branches as a dedicated section inside Organisation Structure.
  {
    section: "designations",
    label: "Designations",
    description: "Grades and job classifications",
    permission: "designation.view",
    icon: BadgeCheck,
  },
  {
    section: "positions",
    label: "Positions",
    description: "Approved workforce seats and vacancies",
    permission: "position.view",
    icon: BriefcaseBusiness,
  },
];

export function OrganisationTabs({ counts }: Props) {
  const { hasPermission } = usePermissions();

  return (
    <nav className="wf-org-tabs" aria-label="Organisation structure">
      {items
        .filter((item) => hasPermission(item.permission))
        .map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.section}
              to={`/employees/organisation/${item.section}`}
              className={({ isActive }) =>
                `wf-org-tab${isActive ? " is-active" : ""}`
              }
            >
              <span className="wf-org-tab__icon"><Icon size={18} /></span>
              <span className="wf-org-tab__copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span className="wf-org-tab__count">{counts[item.section]}</span>
            </NavLink>
          );
        })}
    </nav>
  );
}

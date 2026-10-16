import {
  Building2,
  CalendarCheck2,
  ChevronLeft,
  LayoutDashboard,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuthStore } from "../../app/store/auth.store";
import { useUiStore } from "../../app/store/ui.store";
import { usePermissions } from "../../hooks/usePermissions";

interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permissions?: string[];
  employeeOnly?: boolean;
}

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Companies",
    to: "/companies",
    icon: Building2,
    permissions: ["company.view"],
  },
  {
    label: "Employees",
    to: "/employees",
    icon: Users,
    permissions: ["employee.view_all"],
  },
  {
    label: "Attendance",
    to: "/attendance",
    icon: CalendarCheck2,
    permissions: [
      "attendance.view",
      "attendance.manage",
      "attendance.records.view",
    ],
  },
  {
    label: "Roles",
    to: "/roles",
    icon: ShieldCheck,
    permissions: ["roles.manage"],
  },
];

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    setMobileSidebarOpen,
  } = useUiStore();
  const { hasAnyPermission } = usePermissions();

  const visibleNavigation = navigation.filter((item) => {
    if (!item.permissions) {
      return true;
    }

    if (item.employeeOnly && user?.employeeId) {
      return true;
    }

    // edited by wali: Use the Company Admin workforce boundary in primary navigation visibility.
    return hasAnyPermission(item.permissions);
  });

  const className = [
    "sidebar",
    sidebarCollapsed ? "sidebar--collapsed" : "",
    mobileSidebarOpen ? "sidebar--mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {mobileSidebarOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <aside className={className}>
        <div className="sidebar__brand">
          <div className="sidebar__mark">HR</div>
          <div className="sidebar__brand-copy">
            <strong>HR Management</strong>
            <span>People operations</span>
          </div>
          <button
            className="sidebar__mobile-close"
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          <span className="sidebar__section-label">Workspace</span>
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "sidebar-link sidebar-link--active"
                    : "sidebar-link"
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__profile">
            <div className="avatar">
              {user?.username.slice(0, 2).toUpperCase() ?? "HR"}
            </div>
            <div>
              <strong>{user?.username}</strong>
              <span>{user?.roleCodes[0]?.replaceAll("_", " ") ?? "User"}</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar__collapse"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}

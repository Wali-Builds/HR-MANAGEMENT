import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../app/store/auth.store";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getModuleNavigation,
  getWorkspaceModule,
} from "../config/workspace";
import { useVisibleModules } from "../hooks/useVisibleModules";

interface ModuleNavigationProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function ModuleNavigation({
  mobileOpen,
  onCloseMobile,
}: ModuleNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const modules = useVisibleModules();
  const {
    hasAllPermissions,
    hasAnyPermission,
  } = usePermissions();
  const activeModule = getWorkspaceModule(location.pathname);
  const navigation = getModuleNavigation(activeModule.id).filter((item) =>
    (!item.companyAdminOnly || Boolean(user && !user.isPlatformAdmin && user.companyId && (user.roleCodes.includes("COMPANY_ADMIN") || user.permissions.some((permission) => permission.toUpperCase() === "COMPANY_ADMIN")))) &&
    (!item.employeeOnly || Boolean(user?.employeeId)) &&
    (!item.permissions || item.permissions.length === 0 ||
      (item.requireAllPermissions
        ? hasAllPermissions(item.permissions)
        : hasAnyPermission(item.permissions))),
  );
  const ActiveIcon = activeModule.icon;

  const activeNavigationItem = navigation
    .filter(
      (item) =>
        item.to &&
        (location.pathname === item.to ||
          location.pathname.startsWith(`${item.to}/`)),
    )
    .sort(
      (left, right) =>
        (right.to?.length ?? 0) - (left.to?.length ?? 0),
    )[0];

  if (activeModule.id === "home") {
    return (
      <MobileAppNavigation
        open={mobileOpen}
        onClose={onCloseMobile}
        modules={modules}
        onNavigate={(to) => navigate(to)}
      />
    );
  }

  return (
    <>
      <nav className="ws-modulebar" aria-label={`${activeModule.label} navigation`}>
        {/* edited by wali: Return directly to the logged-in user's Workspace home. */}
        <button
          type="button"
          className="ws-modulebar__back"
          aria-label="Return to Workspace home"
          title="Return to Workspace home"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
        </button>
        <div className="ws-modulebar__identity">
          <span
            className={`ws-app-icon ws-app-icon--small ws-app-icon--${activeModule.tone}`}
          >
            <ActiveIcon size={16} />
          </span>
          <strong>{activeModule.label}</strong>
        </div>

        <div className="ws-modulebar__links">
          {navigation.map((item) => {
            const active = activeNavigationItem?.label === item.label;

            return (
              <button
                type="button"
                key={item.label}
                className={[
                  "ws-modulebar__link",
                  active ? "ws-modulebar__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={item.disabled}
                title={item.disabled ? "This section will be added next" : undefined}
                onClick={() => item.to && navigate(item.to)}
              >
                {item.label}
                {item.disabled ? <span className="ws-nav-soon">Soon</span> : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="ws-modulebar__all-apps"
          onClick={() => navigate("/dashboard")}
        >
          All apps
          <ChevronRight size={15} />
        </button>
      </nav>

      <MobileAppNavigation
        open={mobileOpen}
        onClose={onCloseMobile}
        modules={modules}
        onNavigate={(to) => navigate(to)}
      />
    </>
  );
}

interface MobileAppNavigationProps {
  open: boolean;
  onClose: () => void;
  modules: ReturnType<typeof useVisibleModules>;
  onNavigate: (to: string) => void;
}

function MobileAppNavigation({
  open,
  onClose,
  modules,
  onNavigate,
}: MobileAppNavigationProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="ws-mobile-nav-layer">
      <button
        type="button"
        className="ws-mobile-nav-backdrop"
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside className="ws-mobile-nav">
        <header>
          <div>
            <span className="ws-kicker">Workspace</span>
            <strong>Applications</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close navigation">
            <X size={19} />
          </button>
        </header>

        <div className="ws-mobile-nav__list">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                type="button"
                key={module.id}
                disabled={!module.available}
                onClick={() => {
                  onNavigate(module.to);
                  onClose();
                }}
              >
                <span className={`ws-app-icon ws-app-icon--${module.tone}`}>
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{module.label}</strong>
                  <small>{module.available ? module.description : "Planned"}</small>
                </span>
                {module.available ? <ChevronRight size={16} /> : <span className="ws-planned-badge">Soon</span>}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

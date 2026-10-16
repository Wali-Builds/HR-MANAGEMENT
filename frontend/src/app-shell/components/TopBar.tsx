import {
  Bell,
  Building2,
  Command,
  Grid3X3,
  HelpCircle,
  Menu,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../app/store/auth.store";
import { getWorkspaceModule } from "../config/workspace";
import { AppSwitcher } from "./AppSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import { QuickCreateMenu } from "./QuickCreateMenu";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  onOpenMobileNavigation: () => void;
}

export function TopBar({ onOpenMobileNavigation }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeModule = getWorkspaceModule(location.pathname);
  const ActiveIcon = activeModule.icon;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="ws-topbar">
        <div className="ws-topbar__left">
          <button
            type="button"
            className="ws-mobile-menu"
            onClick={onOpenMobileNavigation}
            aria-label="Open module navigation"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            className="ws-brand"
            onClick={() => navigate("/dashboard")}
            aria-label="Open workspace home"
          >
            <span className="ws-brand__mark">
              <span />
              <span />
              <span />
            </span>
            <span className="ws-brand__copy">
              <strong>HR Workspace</strong>
              <small>People operations</small>
            </span>
          </button>

          <span className="ws-topbar__divider" />

          <button
            type="button"
            className="ws-app-trigger"
            onClick={() => setAppSwitcherOpen(true)}
            aria-label="Open applications"
          >
            <Grid3X3 size={18} />
            <span>Apps</span>
          </button>

          <div className="ws-active-module">
            <span className={`ws-active-module__icon ws-app-icon--${activeModule.tone}`}>
              <ActiveIcon size={16} />
            </span>
            <span>{activeModule.shortLabel}</span>
          </div>
        </div>

        <div className="ws-topbar__center">
          <button
            type="button"
            className="ws-search-trigger"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={17} />
            <span>Search workspace</span>
            <kbd><Command size={12} /> K</kbd>
          </button>
        </div>

        <div className="ws-topbar__right">
          <QuickCreateMenu />

          <button
            type="button"
            className="ws-icon-button"
            aria-label="Help centre"
            title="Help centre"
          >
            <HelpCircle size={18} />
          </button>

          <button
            type="button"
            className="ws-icon-button ws-notification-button"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="ws-notification-dot" />
          </button>

          <div className="ws-company-context">
            <Building2 size={16} />
            <span>
              {user?.companyId
                ? `Company #${user.companyId}`
                : "All organisations"}
            </span>
          </div>

          <UserMenu />
        </div>
      </header>

      <AppSwitcher
        open={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
      />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

import {
  Bell,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../api/api-error";
import { useAuthStore } from "../../app/store/auth.store";
import { useUiStore } from "../../app/store/ui.store";
import { logoutRequest } from "../../features/auth/api/auth.api";

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/companies": "Companies",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/roles": "Roles & permissions",
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setMobileSidebarOpen = useUiStore(
    (state) => state.setMobileSidebarOpen,
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = pageNames[location.pathname] ?? "HR Management";

  async function logout() {
    setLoggingOut(true);

    try {
      await logoutRequest();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      clearSession();
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="icon-button topbar__menu"
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>
        <div>
          <span className="topbar__context">Workspace</span>
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar__right">
        <button className="topbar__search" type="button">
          <Search size={18} />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-dot" />
        </button>
        <div className="topbar__user">
          <div className="avatar avatar--small">
            {user?.username.slice(0, 2).toUpperCase() ?? "HR"}
          </div>
          <div>
            <strong>{user?.username}</strong>
            <span>{user?.email ?? user?.roleCodes[0]?.replaceAll("_", " ")}</span>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}

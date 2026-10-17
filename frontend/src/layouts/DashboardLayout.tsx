import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { ModuleNavigation } from "../app-shell/components/ModuleNavigation";
import { TopBar } from "../app-shell/components/TopBar";

export function DashboardLayout() {
  const location = useLocation();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const launcherPage = location.pathname === "/dashboard";

  useEffect(() => {
    if (
      location.pathname.startsWith("/employees/organisation/") ||
      location.pathname === "/employees" ||
      location.pathname === "/employees/documents" ||
      location.pathname === "/employees/access" ||
      location.pathname === "/projects" ||
      location.pathname === "/roles"
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  return (
    <div className="ws-shell">
      <TopBar onOpenMobileNavigation={() => setMobileNavigationOpen(true)} />
      <ModuleNavigation
        mobileOpen={mobileNavigationOpen}
        onCloseMobile={() => setMobileNavigationOpen(false)}
      />
      <main
        className={[
          "ws-main",
          launcherPage ? "ws-main--launcher" : "ws-main--module",
          location.pathname === "/employees/access"
            ? "ws-main--module--flush-top"
            : "",
          location.pathname === "/roles" ? "ws-main--module--wide" : "",
        ].join(" ")}
      >
        <Outlet />
      </main>
    </div>
  );
}

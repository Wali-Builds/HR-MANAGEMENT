import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { ModuleNavigation } from "../app-shell/components/ModuleNavigation";
import { TopBar } from "../app-shell/components/TopBar";

export function DashboardLayout() {
  const location = useLocation();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const launcherPage = location.pathname === "/dashboard";

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
        ].join(" ")}
      >
        <Outlet />
      </main>
    </div>
  );
}

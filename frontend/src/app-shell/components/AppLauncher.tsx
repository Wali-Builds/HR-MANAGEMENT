import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Command,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../app/store/auth.store";
import { useVisibleModules } from "../hooks/useVisibleModules";

export function AppLauncher() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const modules = useVisibleModules();

  const availableModules = modules.filter(
    (module) => module.available && module.id !== "home",
  );
  const plannedModules = modules.filter((module) => !module.available);
  const employeeModule = availableModules.find((module) => module.id === "employees");

  const roleLabel = user?.isPlatformAdmin
    ? "Platform administrator"
    : user?.roleCodes[0]?.replaceAll("_", " ") ?? "Workspace member";

  return (
    <section className="ws-launcher">
      <div className="ws-launcher__hero">
        <div className="ws-launcher__hero-copy">
          <span className="ws-kicker">People operations workspace</span>
          <h1>Welcome back, {user?.username}.</h1>
          <p>
            Open an application to continue your work. Each workspace keeps
            related records, actions and reports together without unnecessary
            navigation.
          </p>

          <div className="ws-launcher__hero-actions">
            <button
              type="button"
              className="ws-primary-action"
              onClick={() => {
                const firstModule = availableModules[0];
                if (firstModule) {
                  navigate(firstModule.to);
                }
              }}
            >
              Continue working
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="ws-secondary-action"
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                  }),
                );
              }}
            >
              <Command size={16} />
              Search workspace
            </button>
          </div>
        </div>

        <div className="ws-launcher__status-board">
          <div className="ws-launcher__status-head">
            <span className="ws-status-pulse" />
            <span>Workspace ready</span>
          </div>
          <div className="ws-launcher__status-grid">
            <div>
              <ShieldCheck size={19} />
              <span>Access level</span>
              <strong>{roleLabel}</strong>
            </div>
            <div>
              <Building2 size={19} />
              <span>Organisation scope</span>
              <strong>
                {user?.companyId ? `Company #${user.companyId}` : "Global"}
              </strong>
            </div>
            <div>
              <CheckCircle2 size={19} />
              <span>Available apps</span>
              <strong>{availableModules.length}</strong>
            </div>
            <div>
              <Clock3 size={19} />
              <span>Session</span>
              <strong>Active</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="ws-launcher__body">
        <section className="ws-launcher__apps">
          <header className="ws-section-heading">
            <div>
              <span className="ws-kicker">Applications</span>
              <h2>Your workspaces</h2>
              <p>Purpose-built tools for the HR lifecycle.</p>
            </div>
            <span className="ws-section-count">
              {availableModules.length} available
            </span>
          </header>

          <div className="ws-launcher__app-grid">
            {availableModules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  type="button"
                  className="ws-launch-card"
                  key={module.id}
                  onClick={() => navigate(module.to)}
                >
                  <span
                    className={`ws-launch-card__icon ws-app-icon--${module.tone}`}
                  >
                    <Icon size={27} />
                  </span>
                  <span className="ws-launch-card__copy">
                    <strong>{module.label}</strong>
                    <small>{module.description}</small>
                  </span>
                  <span className="ws-launch-card__open">
                    Open <ArrowRight size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="ws-launcher__side">
          <section className="ws-quick-panel">
            <header>
              <span className="ws-kicker">Quick start</span>
              <h2>Common actions</h2>
            </header>
            <div className="ws-quick-panel__actions">
              {user?.isPlatformAdmin ? (
                <button type="button" onClick={() => navigate("/companies?create=1")}>
                  <span><Plus size={17} /></span>
                  <div>
                    <strong>Create a company</strong>
                    <small>Set up a new organisation</small>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ) : null}
              {employeeModule ? (
                <button type="button" onClick={() => navigate(employeeModule.to)}>
                  <span><Sparkles size={17} /></span>
                  <div>
                    <strong>Open employee directory</strong>
                    <small>Find and manage people</small>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ) : null}
              {!user?.isPlatformAdmin && !employeeModule ? (
                <div className="ws-quick-panel__empty">
                  Quick actions will appear as more modules become available to your role.
                </div>
              ) : null}
            </div>
          </section>

          <section className="ws-roadmap-panel">
            <header>
              <span className="ws-kicker">Product roadmap</span>
              <h2>Coming next</h2>
            </header>
            <div className="ws-roadmap-panel__list">
              {plannedModules.slice(0, 4).map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.id}>
                    <span className={`ws-app-icon ws-app-icon--small ws-app-icon--${module.tone}`}>
                      <Icon size={15} />
                    </span>
                    <span>
                      <strong>{module.label}</strong>
                      <small>{module.description}</small>
                    </span>
                    <span className="ws-planned-badge">Planned</span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

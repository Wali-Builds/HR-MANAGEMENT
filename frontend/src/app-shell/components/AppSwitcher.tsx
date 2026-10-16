import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useVisibleModules } from "../hooks/useVisibleModules";

interface AppSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export function AppSwitcher({ open, onClose }: AppSwitcherProps) {
  const navigate = useNavigate();
  const modules = useVisibleModules();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const sections = [
    "Core workspace",
    "People operations",
    "Growth & insights",
  ] as const;

  return (
    <div className="ws-popover-layer" role="presentation">
      <button
        type="button"
        className="ws-popover-backdrop"
        aria-label="Close app switcher"
        onClick={onClose}
      />

      <section
        className="ws-app-switcher"
        role="dialog"
        aria-modal="true"
        aria-label="Application switcher"
      >
        <header className="ws-app-switcher__header">
          <div>
            <span className="ws-kicker">Applications</span>
            <h2>Move between workspaces</h2>
          </div>
          <button
            type="button"
            className="ws-icon-button ws-icon-button--light"
            onClick={onClose}
            aria-label="Close app switcher"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ws-app-switcher__body">
          {sections.map((section) => {
            const sectionModules = modules.filter(
              (module) => module.section === section,
            );

            if (sectionModules.length === 0) {
              return null;
            }

            return (
              <div className="ws-app-switcher__section" key={section}>
                <h3>{section}</h3>
                <div className="ws-app-switcher__grid">
                  {sectionModules.map((module) => {
                    const Icon = module.icon;

                    return (
                      <button
                        type="button"
                        key={module.id}
                        className="ws-app-switcher__item"
                        disabled={!module.available}
                        onClick={() => {
                          navigate(module.to);
                          onClose();
                        }}
                      >
                        <span
                          className={`ws-app-icon ws-app-icon--${module.tone}`}
                        >
                          <Icon size={20} />
                        </span>
                        <span className="ws-app-switcher__item-copy">
                          <strong>{module.label}</strong>
                          <small>
                            {module.available ? module.description : "Planned"}
                          </small>
                        </span>
                        {module.available ? (
                          <ArrowUpRight size={15} />
                        ) : (
                          <span className="ws-planned-badge">Soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

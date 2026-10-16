import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useVisibleModules } from "../hooks/useVisibleModules";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const modules = useVisibleModules();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return modules
      .filter((module) => module.available)
      .filter((module) => {
        if (!normalizedQuery) {
          return true;
        }

        return [module.label, module.shortLabel, module.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [modules, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 40);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Enter" && matches[0]) {
        navigate(matches[0].to);
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [matches, navigate, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="ws-command-layer" role="presentation">
      <button
        type="button"
        className="ws-command-backdrop"
        aria-label="Close search"
        onClick={onClose}
      />

      <section
        className="ws-command"
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
      >
        <div className="ws-command__input-row">
          <Search size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applications and destinations"
            aria-label="Search applications and destinations"
          />
          <button
            type="button"
            className="ws-command__close"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={17} />
          </button>
        </div>

        <div className="ws-command__results">
          <span className="ws-command__label">
            {query ? "Matching destinations" : "Quick navigation"}
          </span>

          {matches.length > 0 ? (
            matches.map((module, index) => {
              const Icon = module.icon;

              return (
                <button
                  type="button"
                  key={module.id}
                  className="ws-command__result"
                  onClick={() => {
                    navigate(module.to);
                    onClose();
                  }}
                >
                  <span
                    className={`ws-app-icon ws-app-icon--${module.tone}`}
                  >
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{module.label}</strong>
                    <small>{module.description}</small>
                  </span>
                  {index === 0 ? <kbd>Enter</kbd> : <ArrowRight size={16} />}
                </button>
              );
            })
          ) : (
            <div className="ws-command__empty">
              No workspace matches “{query}”.
            </div>
          )}
        </div>

        <footer className="ws-command__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> browse</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </footer>
      </section>
    </div>
  );
}

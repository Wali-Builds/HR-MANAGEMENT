import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { usePermissions } from "../../hooks/usePermissions";
import { quickCreateItems } from "../config/workspace";

export function QuickCreateMenu() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

  const visibleItems = useMemo(
    () =>
      quickCreateItems.filter((item) => {
        // edited by wali: Platform Admin quick-create is limited to platform-level actions such as creating companies.
        if (isPlatformAdmin) {
          return item.platformAdminOnly;
        }

        if (item.platformAdminOnly) {
          return false;
        }

        return hasPermission(item.permission);
      }),
    [hasPermission, isPlatformAdmin],
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="ws-quick-create" ref={menuRef}>
      <button
        type="button"
        className="ws-quick-create__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus size={17} />
        <span>Create</span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="ws-quick-create__menu" role="menu">
          <span className="ws-menu-label">Quick create</span>
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  navigate(item.to);
                  setOpen(false);
                }}
              >
                <span className="ws-quick-create__icon">
                  <Icon size={17} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

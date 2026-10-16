import {
  ChevronDown,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../api/api-error";
import { useAuthStore } from "../../app/store/auth.store";
import { logoutRequest } from "../../features/auth/api/auth.api";

export function UserMenu() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const initials = user?.username.slice(0, 2).toUpperCase() ?? "HR";
  const roleLabel = user?.isPlatformAdmin
    ? "Platform administrator"
    : user?.roleCodes[0]?.replaceAll("_", " ") ?? "User";

  return (
    <div className="ws-user-menu" ref={menuRef}>
      <button
        type="button"
        className="ws-user-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="ws-avatar">{initials}</span>
        <span className="ws-user-trigger__copy">
          <strong>{user?.username}</strong>
          <small>{roleLabel}</small>
        </span>
        <ChevronDown size={15} />
      </button>

      {open ? (
        <div className="ws-user-dropdown" role="menu">
          <div className="ws-user-dropdown__identity">
            <span className="ws-avatar ws-avatar--large">{initials}</span>
            <div>
              <strong>{user?.username}</strong>
              <span>{user?.email ?? roleLabel}</span>
            </div>
          </div>

          <div className="ws-user-dropdown__meta">
            <span><ShieldCheck size={15} />{roleLabel}</span>
            <span>
              {user?.companyId
                ? `Company #${user.companyId}`
                : "Global workspace"}
            </span>
          </div>

          <div className="ws-user-dropdown__actions">
            <button type="button" disabled>
              <UserRound size={17} />
              My profile
              <small>Soon</small>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/change-password");
                setOpen(false);
              }}
            >
              <KeyRound size={17} />
              Change password
            </button>
          </div>

          <button
            type="button"
            className="ws-user-dropdown__logout"
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <LogOut size={17} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

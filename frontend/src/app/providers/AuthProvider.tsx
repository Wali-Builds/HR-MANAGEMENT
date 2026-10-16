import {
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";

import { useAuthStore } from "../store/auth.store";
import { refreshSessionRequest } from "../../features/auth/api/auth.api";

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const initialized = useRef(false);
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore(
    (state) => state.setSession,
  );
  const clearSession = useAuthStore(
    (state) => state.clearSession,
  );

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    void refreshSessionRequest()
      .then((session) => {
        setSession(session.accessToken, session.user);
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession, setSession]);

  if (status === "bootstrapping") {
    return (
      <div className="app-loader" role="status">
        <div className="app-loader__mark">HR</div>
        <div className="app-loader__bar" />
        <p>Preparing your workspace…</p>
      </div>
    );
  }

  return children;
}

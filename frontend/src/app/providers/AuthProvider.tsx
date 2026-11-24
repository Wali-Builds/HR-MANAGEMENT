import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { useAuthStore } from "../store/auth.store";
import { refreshSessionRequest } from "../../features/auth/api/auth.api";

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const initialized = useRef(false);
  const [refreshLimited, setRefreshLimited] = useState(false);
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

    async function restoreSession() {
      while (true) {
        try {
          const session = await refreshSessionRequest();
          setSession(session.accessToken, session.user);
          return;
        } catch (error) {
          const response = (error as {
            response?: {
              status?: number;
              data?: {
                error?: { code?: string };
                retryAfterSeconds?: number;
              };
              headers?: Record<string, unknown>;
            };
          }).response;

          if (
            response?.status === 429 &&
            response.data?.error?.code === "REFRESH_RATE_LIMIT_EXCEEDED"
          ) {
            const headerSeconds = Number(response.headers?.["retry-after"]);
            const retryAfterSeconds = Number.isFinite(headerSeconds) && headerSeconds > 0
              ? headerSeconds
              : response.data.retryAfterSeconds ?? 60;

            setRefreshLimited(true);
            await new Promise((resolve) => window.setTimeout(resolve, retryAfterSeconds * 1000));
            setRefreshLimited(false);
            continue;
          }

          clearSession();
          return;
        }
      }
    }

    void restoreSession();
  }, [clearSession, setSession]);

  if (status === "bootstrapping") {
    return (
      <div className="app-loader" role="status">
        <div className="app-loader__mark">HR</div>
        <div className="app-loader__bar" />
        <p>{refreshLimited ? "Session refresh is temporarily limited. Retrying automatically…" : "Preparing your workspace…"}</p>
      </div>
    );
  }

  return children;
}

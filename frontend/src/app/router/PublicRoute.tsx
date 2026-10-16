import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../store/auth.store";

export function PublicRoute() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (
    status === "authenticated" &&
    user
  ) {
    return (
      <Navigate
        to={
          user.mustChangePassword
            ? "/change-password"
            : "/dashboard"
        }
        replace
      />
    );
  }

  return <Outlet />;
}

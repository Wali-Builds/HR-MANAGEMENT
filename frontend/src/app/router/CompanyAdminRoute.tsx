import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../app/store/auth.store";

// edited by wali: Keep Leave policy setup limited to linked Company Admin accounts.
export function CompanyAdminRoute() {
  const user = useAuthStore((state) => state.user);
  const isCompanyAdmin = Boolean(
    user &&
      !user.isPlatformAdmin &&
      user.companyId &&
      (user.roleCodes.includes("COMPANY_ADMIN") ||
        user.permissions.some((permission) => permission.toUpperCase() === "COMPANY_ADMIN")),
  );

  return isCompanyAdmin ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}

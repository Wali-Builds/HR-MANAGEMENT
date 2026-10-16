import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { MyLeavePage } from "./MyLeavePage";

// edited by wali: Open Company Admins on Requests and keep employee users on their own requests.
export function LeaveHomePage() {
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const isCompanyAdmin = Boolean(
    user && !user.isPlatformAdmin && user.companyId &&
      (user.roleCodes.includes("COMPANY_ADMIN") ||
        user.permissions.some((permission) => permission.toUpperCase() === "COMPANY_ADMIN")),
  );

  if (isCompanyAdmin) return <Navigate to="/leave/requests" replace />;
  if (user?.employeeId && hasPermission("employee.view_self")) return <MyLeavePage />;
  return <Navigate to="/unauthorized" replace />;
}

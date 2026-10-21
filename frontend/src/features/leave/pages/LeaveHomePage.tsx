import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { MyLeavePage } from "./MyLeavePage";

// edited by wali: Keep self-service available to linked administrators alongside admin leave tools.
export function LeaveHomePage() {
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const isCompanyAdmin = Boolean(
    user && !user.isPlatformAdmin && user.companyId &&
      (user.roleCodes.includes("COMPANY_ADMIN") ||
        user.permissions.some((permission) => permission.toUpperCase() === "COMPANY_ADMIN")),
  );

  // edited by wali: Linked Company and Branch Admins can submit and review their own leave requests.
  if (user?.employeeId && hasPermission("employee.view_self")) return <MyLeavePage />;
  if (isCompanyAdmin || hasPermission("leave.request.view")) return <Navigate to="/leave/requests" replace />;
  return <Navigate to="/unauthorized" replace />;
}

import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionRoute } from "./app/router/PermissionRoute";
import { PlatformAdminRoute } from "./app/router/PlatformAdminRoute";
import { CompanyAdminRoute } from "./app/router/CompanyAdminRoute";
import { ProtectedRoute } from "./app/router/ProtectedRoute";
import { PublicRoute } from "./app/router/PublicRoute";
import { ChangePasswordPage } from "./features/auth/pages/ChangePasswordPage";
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";
import { UnauthorizedPage } from "./features/auth/pages/UnauthorizedPage";
import {
  CompaniesPage,
  CompanyFormPage,
  CompanyRecordPage,
} from "./features/companies";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { SubscriptionPlansPage } from "./features/subscriptions";
import { CompanySubscriptionPage } from "./features/subscriptions/pages/CompanySubscriptionPage";
import { EmployeeDocumentsPage } from "./features/employee-documents";
import {
  EmployeeFormPage,
  EmployeeRecordPage,
  MyEmployeeProfilePage,
  EmployeesPage,
} from "./features/employees";
import { OrganisationStructurePage } from "./features/organisation";
import { BranchesPage } from "./features/branches";
import { DesignationsPage } from "./features/designations/pages/DesignationsPage";
import { PositionsPage } from "./features/positions/pages/PositionsPage";
import { ProjectsPage } from "./features/projects/pages/ProjectsPage";
import { WorkforceAccessPage } from "./features/workforce-access";
import { WorkforceConfigurationPage } from "./features/workforce-configuration";
import { WorkforceReportsPage } from "./features/workforce-reports";
import { LeaveHomePage } from "./features/leave/pages/LeaveHomePage";
import { LeaveSetupPage } from "./features/leave/pages/LeaveSetupPage";
// edited by wali: Add the company-wide leave request review workspace.
import { LeaveRequestsPage } from "./features/leave/pages/LeaveRequestsPage";
// edited by wali: Add the company-wide employee leave balance overview.
import { LeaveBalancesPage } from "./features/leave/pages/LeaveBalancesPage";
import { RolesPage } from "./features/roles";
import { ModulePlaceholderPage } from "./features/shared/pages/ModulePlaceholderPage";
import { NotFoundPage } from "./features/shared/pages/NotFoundPage";
import { AuthLayout } from "./layouts/AuthLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { useRefreshClickAnimation } from "./hooks/useRefreshClickAnimation";


export default function App() {
  useRefreshClickAnimation();

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* edited by wali: Guard the global subscription-plan catalog as a platform-admin route. */}
          <Route element={<PlatformAdminRoute />}>
            <Route path="/subscriptions/plans" element={<SubscriptionPlansPage />} />
          </Route>

          {/* edited by wali: Allow company users to view and subscribe to available plans. */}
          <Route element={<PermissionRoute permissions={["subscription.company.view", "subscription.company.manage", "company.view", "company.manage"]} allowRoleCodes={["COMPANY_ADMIN"]} />}>
            <Route path="/my-subscription" element={<CompanySubscriptionPage />} />
          </Route>

          <Route element={<PermissionRoute permissions={["company.view"]} />}>
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/new" element={<CompanyFormPage mode="create" />} />
            <Route path="/companies/:companyId" element={<CompanyRecordPage />} />
            <Route path="/companies/:companyId/edit" element={<CompanyFormPage mode="edit" />} />
          </Route>

          {/* Static Workforce routes must remain before /employees/:employeeId. */}
          <Route element={<PermissionRoute permissions={["employee.view_all"]} />}>
            <Route path="/employees" element={<EmployeesPage />} />
          </Route>

          <Route element={<PermissionRoute permissions={["employee.create"]} />}>
            <Route path="/employees/new" element={<EmployeeFormPage mode="create" />} />
          </Route>

          <Route path="/employees/organisation" element={<Navigate to="/employees/organisation/branches" replace />} />

          {/* edited by wali: Expose only the authenticated employee's restricted self profile. */}
          <Route element={<PermissionRoute permissions={["employee.view_self"]} />}>
            <Route path="/my-profile" element={<MyEmployeeProfilePage />} />
          </Route>

          {/* edited by wali: Route branch management through its dedicated feature page. */}
          <Route element={<PermissionRoute permissions={["branch.view"]} />}>
            <Route path="/employees/organisation/branches" element={<BranchesPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={["department.view"]} />}>
            <Route path="/employees/organisation/departments" element={<OrganisationStructurePage section="departments" />} />
          </Route>
          <Route element={<PermissionRoute permissions={["designation.view"]} />}>
            <Route path="/employees/organisation/designations" element={<DesignationsPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={["position.view"]} />}>
            <Route path="/employees/organisation/positions" element={<PositionsPage />} />
          </Route>
          <Route element={<CompanyAdminRoute />}>
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>

          {/* edited by wali: Keep employee document access with company workforce administrators for now. */}
          <Route element={<PermissionRoute permissions={["employee.view_all", "employee.update"]} />}>
            <Route path="/employees/documents" element={<EmployeeDocumentsPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={["users.manage"]} />}>
            <Route path="/employees/access" element={<WorkforceAccessPage />} />
          </Route>
          {/* edited by wali: Restrict full employee records to workforce administrators. */}
          <Route element={<PermissionRoute permissions={["employee.view_all"]} />}>
            <Route path="/employees/reports" element={<WorkforceReportsPage />} />
          </Route>
          {/* edited by wali: Keep workforce configuration within the company workforce permission boundary. */}
          <Route element={<PermissionRoute permissions={["employee.view_all"]} />}>
            <Route path="/employees/configuration" element={<WorkforceConfigurationPage />} />
          </Route>

          {/* Dynamic employee routes stay last. */}
          <Route element={<PermissionRoute permissions={["employee.view_all"]} />}>
            <Route path="/employees/:employeeId" element={<EmployeeRecordPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={["employee.update"]} />}>
            <Route path="/employees/:employeeId/edit" element={<EmployeeFormPage mode="edit" />} />
          </Route>

          <Route
            path="/attendance"
            element={
              <ModulePlaceholderPage
                title="Attendance"
                description="Daily attendance, schedules and workforce time records."
              />
            }
          />

          {/* edited by wali: Let Platform Admins and tenant Company Admins manage their scoped roles. */}
          <Route element={<PermissionRoute permissions={["roles.manage"]} allowRoleCodes={["COMPANY_ADMIN"]} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>

          {/* edited by wali: Route leave review to authorized Company and Branch Admins; keep configuration tenant-admin-only. */}
          <Route path="/leave" element={<LeaveHomePage />} />
          <Route element={<PermissionRoute permissions={["leave.request.view"]} allowRoleCodes={["COMPANY_ADMIN"]} />}>
            {/* edited by wali: Keep request review beside Leave configuration in the module navigation. */}
            <Route path="/leave/requests" element={<LeaveRequestsPage />} />
          </Route>
          <Route element={<PermissionRoute permissions={["leave.balance.view"]} allowRoleCodes={["COMPANY_ADMIN"]} />}>
            {/* edited by wali: Allow Company Admins and permissioned Branch Admins into their scoped balances. */}
            <Route path="/leave/balances" element={<LeaveBalancesPage />} />
          </Route>
          <Route element={<CompanyAdminRoute />}>
            <Route path="/leave/configuration" element={<LeaveSetupPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}



import type { LucideIcon } from "lucide-react";

export type WorkspaceModuleId =
  | "home"
  | "companies"
  // edited by wali: Include the platform-admin subscription catalog workspace.
  | "subscriptions"
  // edited by wali: Include the tenant's self-service subscription workspace.
  | "my-subscription"
  // edited by wali: Include the tenant administrator's department workspace.
  | "departments"
  // edited by wali: Include the tenant administrator's branch workspace.
  | "branches"
  | "designations"
  | "positions"
  | "projects"
  | "employees"
  // edited by wali: Add the Company Admin leave setup workspace.
  | "leave"
  // edited by wali: Add the limited employee self-service profile workspace.
  | "my-profile"
  | "attendance"
  | "roles"
  | "payroll"
  | "recruitment"
  | "performance"
  | "learning"
  | "reports"
  | "settings";

export type WorkspaceModuleTone =
  | "teal"
  | "blue"
  | "violet"
  | "amber"
  | "coral"
  | "green"
  | "indigo"
  | "slate";

export interface WorkspaceModule {
  id: WorkspaceModuleId;
  label: string;
  shortLabel: string;
  description: string;
  to: string;
  icon: LucideIcon;
  tone: WorkspaceModuleTone;
  permissions?: string[];
  employeeOnly?: boolean;
  platformAdminOnly?: boolean;
  // edited by wali: Mark subscription actions that belong to a company tenant.
  companyTenantOnly?: boolean;
  // edited by wali: Mark modules that require a linked Company Admin account.
  companyAdminOnly?: boolean;
  available: boolean;
  section: "Core workspace" | "People operations" | "Growth & insights";
}

export interface ModuleNavigationItem {
  label: string;
  to?: string;
  disabled?: boolean;
  permissions?: string[];
  requireAllPermissions?: boolean;
  // edited by wali: Scope setup navigation to the tenant administrator.
  companyAdminOnly?: boolean;
  // edited by wali: Mark self-service links for users attached to an employee record.
  employeeOnly?: boolean;
}

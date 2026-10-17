import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CreditCard,
  GraduationCap,
  LayoutGrid,
  Network,
  Umbrella,
  Settings2,
  ShieldCheck,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";

import type {
  ModuleNavigationItem,
  WorkspaceModule,
  WorkspaceModuleId,
} from "../types";

export const workspaceModules: WorkspaceModule[] = [
  {
    id: "home",
    label: "Workspace",
    shortLabel: "Home",
    description: "Your apps, shortcuts and recent work in one place.",
    to: "/dashboard",
    icon: LayoutGrid,
    tone: "slate",
    available: true,
    section: "Core workspace",
  },
  {
    id: "companies",
    label: "Companies",
    shortLabel: "Companies",
    description: "Organisations, legal profiles and company settings.",
    to: "/companies",
    icon: Building2,
    tone: "teal",
    permissions: ["company.view"],
    available: true,
    section: "Core workspace",
  },
  // edited by wali: Add a protected workspace app for subscription-plan administration.
  {
    id: "subscriptions",
    label: "Subscriptions",
    shortLabel: "Subscriptions",
    description: "Manage subscription plans, pricing, capacity and included features.",
    to: "/subscriptions/plans",
    icon: CreditCard,
    tone: "teal",
    platformAdminOnly: true,
    available: true,
    section: "Core workspace",
  },
  // edited by wali: Expose active plan selection to company users with subscription access.
  // {
  //   id: "my-subscription",
  //   label: "My Subscription",
  //   shortLabel: "Plans",
  //   description: "View your current plan and subscribe to available HR plans.",
  //   to: "/my-subscription",
  //   icon: CreditCard,
  //   tone: "teal",
  //   permissions: ["subscription.company.view", "subscription.company.manage", "company.view", "company.manage"],
  //   // edited by wali: Keep self-service subscription separate from platform plan management.
  //   companyTenantOnly: true,
  //   available: true,
  //   section: "Core workspace",
  // },
  // edited by wali: Give linked company administrators a direct entry to branch setup.
  {
    id: "branches",
    label: "Company Footprints",
    shortLabel: "Branches",
    description: "Create and manage your company branches.",
    to: "/employees/organisation/branches",
    icon: Building2,
    tone: "teal",
    permissions: ["branch.view"],
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  // edited by wali: Give linked company administrators a direct entry to department setup.
  {
    id: "departments",
    label: "Departments",
    shortLabel: "Departments",
    description: "Create and manage your company departments.",
    to: "/employees/organisation/departments",
    icon: Network,
    tone: "blue",
    permissions: ["department.view"],
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  // +designations and positions are now in their own Workforce workspace, not the Leave workspace.
  {
    id: "designations",
    label: "Designations",
    shortLabel: "Designations",
    description: "Create and manage company designations.",
    to: "/employees/organisation/designations",
    icon: ShieldCheck,
    tone: "indigo",
    permissions: ["designation.view"],
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  
  // edited by wali: Give Company Admins a dedicated Positions page.
  {
    id: "positions",
    label: "Positions",
    shortLabel: "Positions",
    description: "Create and manage company positions.",
    to: "/employees/organisation/positions",
    icon: BriefcaseBusiness,
    tone: "blue",
    permissions: ["position.view"],
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  {
    id: "projects",
    label: "Projects",
    shortLabel: "Projects",
    description: "Manage company projects and project based assignments.",
    to: "/projects",
    icon: Target,
    tone: "violet",
    companyAdminOnly: true,
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  {
    id: "employees",
    label: "Workforce",
    shortLabel: "Workforce",
    description: "Employees, organisation structure, access and workforce operations.",
    to: "/employees",
    icon: UsersRound,
    tone: "blue",
    permissions: ["employee.view_all", "employee.update"],
    // edited by wali: Show company workforce tools only to tenant users, not Platform Admins.
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  // edited by wali: Give Company Admins a dedicated entry for configuring leave policies.
  {
    id: "my-profile",
    label: "My Profile",
    shortLabel: "Profile",
    description: "View your basic employee and company information.",
    to: "/my-profile",
    icon: UsersRound,
    tone: "indigo",
    permissions: ["employee.view_self"],
    employeeOnly: true,
    available: true,
    section: "Core workspace",
  },
  {
    id: "leave",
    label: "Leave",
    shortLabel: "Leave",
    description: "Create leave types, policies and employee entitlements.",
    to: "/leave",
    icon: Umbrella,
    tone: "violet",
    // edited by wali: Show Leave to tenant users; route guards separate employee and admin pages.
    companyTenantOnly: true,
    available: true,
    section: "People operations",
  },
  // edited by wali: Give linked employees a direct entry to their limited self profile.
  {
    id: "attendance",
    label: "Attendance",
    shortLabel: "Attendance",
    description: "Time records, schedules, shifts and attendance review.",
    to: "/attendance",
    icon: CalendarCheck2,
    tone: "green",
    permissions: [
      "attendance.view",
      "attendance.manage",
      "attendance.records.view",
    ],
    available: false,
    section: "People operations",
  },
  // edited by wali: Show access control to Company Admins with scoped role management.
  {
    id: "roles",
    label: "Access Control",
    shortLabel: "Access",
    description: "Roles, permissions and secure access governance.",
    to: "/roles",
    icon: ShieldCheck,
    tone: "indigo",
    permissions: ["roles.manage"],
    companyTenantOnly: true,
    available: true,
    section: "Core workspace",
  },
  {
    id: "payroll",
    label: "Payroll",
    shortLabel: "Payroll",
    description: "Payroll periods, salary processing and payslips.",
    to: "/payroll",
    icon: WalletCards,
    tone: "amber",
    available: false,
    section: "People operations",
  },
  {
    id: "recruitment",
    label: "Recruitment",
    shortLabel: "Hiring",
    description: "Vacancies, candidates, interviews and offers.",
    to: "/recruitment",
    icon: BriefcaseBusiness,
    tone: "coral",
    available: false,
    section: "Growth & insights",
  },
  {
    id: "performance",
    label: "Performance",
    shortLabel: "Performance",
    description: "Goals, reviews, feedback and development plans.",
    to: "/performance",
    icon: Target,
    tone: "blue",
    available: false,
    section: "Growth & insights",
  },
  {
    id: "learning",
    label: "Learning",
    shortLabel: "Learning",
    description: "Courses, training sessions and certifications.",
    to: "/learning",
    icon: GraduationCap,
    tone: "green",
    available: false,
    section: "Growth & insights",
  },
  {
    id: "reports",
    label: "People Analytics",
    shortLabel: "Analytics",
    description: "Workforce insights, trends and exportable reports.",
    to: "/reports",
    icon: BarChart3,
    tone: "violet",
    available: false,
    section: "Growth & insights",
  },
  {
    id: "settings",
    label: "Configuration",
    shortLabel: "Settings",
    description: "Organisation-wide rules and system preferences.",
    to: "/settings",
    icon: Settings2,
    tone: "slate",
    available: false,
    section: "Core workspace",
  },
];

const moduleNavigation: Partial<
  Record<WorkspaceModuleId, ModuleNavigationItem[]>
> = {
  companies: [
    { label: "Organisations", to: "/companies" },
    // edited by wali: Link the Companies workspace to the standalone Branches page.
    { label: "Branches", to: "/employees/organisation/branches", permissions: ["branch.view"] },
    { label: "Departments", to: "/companies/departments" },

  ],
  // edited by wali: Link the subscriptions workspace directly to plan management.
  subscriptions: [
    { label: "Plans", to: "/subscriptions/plans" },
  ],
  // edited by wali: Link company administrators to their current plan and active catalog.
  "my-subscription": [
    { label: "Current and available plans", to: "/my-subscription" },
  ],
  // edited by wali: Route tenant administrators to their department workspace.
  departments: [
    { label: "Departments", to: "/employees/organisation/departments" },
  ],
  // edited by wali: Route tenant administrators to their branch workspace.
  branches: [
    { label: "Company Footprints", to: "/employees/organisation/branches" },
  ],
  designations: [
    { label: "Designations", to: "/employees/organisation/designations" },
  ],
  positions: [
    { label: "Positions", to: "/employees/organisation/positions" },
  ],
  projects: [
    { label: "Projects", to: "/projects", companyAdminOnly: true },
  ],
  employees: [
    {
      label: "Employees",
      to: "/employees",
      permissions: ["employee.view_all"],
    },
    // edited by wali: Give Company Admins direct Workforce tabs for designation and position setup.
    // {
    //   label: "Designations",
    //   to: "/employees/organisation/designations",
    //   permissions: ["designation.view"],
    // },
    // {
    //   label: "Positions",
    //   to: "/employees/organisation/positions",
    //   permissions: ["position.view"],
    // },
    // {
    //   label: "Organisation",
    //   to: "/employees/organisation/branches",
    //   permissions: [
    //     "branch.view",
    //     "department.view",
    //     "designation.view",
    //     "position.view",
    //   ],
    // },
    {
      label: "Documents",
      to: "/employees/documents",
      permissions: [
        "employee.view_all",
        "employee.view_self",
        "employee.update",
      ],
    },
    {
      label: "Access",
      to: "/employees/access",
      permissions: ["users.manage"],
    },
    // {
    //   label: "Reports",
    //   to: "/employees/reports",
    //   permissions: ["employee.view_all"],
    // },
    {
      label: "Configuration",
      to: "/employees/configuration",
      permissions: ["company.manage"],
    },
  ],
  // edited by wali: Keep the initial Leave navigation focused on Company Admin setup.
  leave: [
    { label: "My requests", to: "/leave", employeeOnly: true },
    // edited by wali: Give Company Admins a dedicated inbox for employee leave requests.
    { label: "Requests", to: "/leave/requests", companyAdminOnly: true },
    // edited by wali: Add a company-wide leave balance view for Company Admins.
    { label: "Balances", to: "/leave/balances", companyAdminOnly: true },
    { label: "Configuration", to: "/leave/configuration", companyAdminOnly: true },
  ],
  attendance: [
    { label: "Overview", to: "/attendance" },
    { label: "Time records", disabled: true },
    { label: "Shifts", disabled: true },
    { label: "Approvals", disabled: true },
    { label: "Configuration", disabled: true },
  ],

  roles: [
    { label: "Roles & permissions", to: "/roles" },
    // { label: "User access", disabled: true },
    // { label: "Audit", disabled: true },
  ],
};

export function getWorkspaceModule(pathname: string): WorkspaceModule {
  const matchedModule = workspaceModules.find((module) => {
    if (module.id === "home") {
      return pathname === "/" || pathname === "/dashboard";
    }

    return pathname === module.to || pathname.startsWith(`${module.to}/`);
  });

  return matchedModule ?? workspaceModules[0]!;
}

export function getModuleNavigation(
  moduleId: WorkspaceModuleId,
): ModuleNavigationItem[] {
  return moduleNavigation[moduleId] ?? [];
}

export const quickCreateItems = [
  {
    label: "New company",
    description: "Create an organisation profile",
    to: "/companies/new",
    icon: Building2,
    permission: "company.manage",
    platformAdminOnly: true,
  },
  {
    // edited by wali: Add subscription plan creation to Platform Admin quick-create actions.
    label: "New subscription",
    description: "Create a subscription plan",
    to: "/subscriptions/plans?create=1",
    icon: CreditCard,
    permission: "subscription.plan.manage",
    platformAdminOnly: true,
  },
  {
    // edited by wali: Let Company Admins launch department creation from the global Create menu.
    label: "New department",
    description: "Create a department in your company",
    to: "/employees/organisation/departments?create=1",
    icon: Network,
    permission: "department.manage",
    platformAdminOnly: false,
  },
  {
    // edited by wali: Let Company Admins launch branch creation from the global Create menu.
    label: "New branch",
    description: "Create a branch in your company",
    to: "/employees/organisation/branches?create=1",
    icon: Building2,
    permission: "branch.manage",
    platformAdminOnly: false,
  },
  {
    label: "New employee",
    description: "Start an employee record",
    to: "/employees/new",
    icon: UsersRound,
    permission: "employee.create",
    platformAdminOnly: false,
  },
];


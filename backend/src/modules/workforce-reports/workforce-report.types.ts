export type DatabaseId = string | number | bigint;

export interface WorkforceCompanyDatabaseRow {
  company_id: DatabaseId;
  company_code: string;
  display_name: string;
  is_active: number | boolean;
}

export interface WorkforceOverviewDatabaseRow {
  total_employees: string | number | bigint;
  active_employees: string | number | bigint;
  inactive_employees: string | number | bigint;
  new_hires_this_month: string | number | bigint;
  employees_without_accounts: string | number | bigint;
  expiring_contracts: string | number | bigint;
}

export interface WorkforceCapacityDatabaseRow {
  plan_code: string;
  plan_name: string;
  subscription_status: string;
  effective_employee_limit: number | null;
}

export interface WorkforceDistributionDatabaseRow {
  item_key: string;
  item_label: string;
  employee_count: string | number | bigint;
}

export interface WorkforceTrendDatabaseRow {
  period_key: string;
  period_label: string;
  employee_count: string | number | bigint;
}

export interface WorkforceEmployeeSummaryDatabaseRow {
  employee_id: DatabaseId;
  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  joining_date: Date | string;
  contract_end_date: Date | string | null;
  branch_name: string | null;
  department_name: string | null;
  designation_name: string | null;
}

export interface WorkforceDistributionItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface WorkforceTrendItem {
  period: string;
  label: string;
  count: number;
}

export interface WorkforceEmployeeSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  joiningDate: string;
  contractEndDate: string | null;
  branchName: string | null;
  departmentName: string | null;
  designationName: string | null;
}

export interface WorkforceReportResponse {
  company: {
    companyId: string;
    companyCode: string;
    companyName: string;
  };
  overview: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newHiresThisMonth: number;
    employeesWithoutAccounts: number;
    expiringContracts: number;
  };
  capacity: {
    planCode: string | null;
    planName: string | null;
    subscriptionStatus: string | null;
    employeeLimit: number | null;
    remainingEmployees: number | null;
    usagePercentage: number | null;
  };
  distributions: {
    branches: WorkforceDistributionItem[];
    departments: WorkforceDistributionItem[];
    designations: WorkforceDistributionItem[];
    employmentTypes: WorkforceDistributionItem[];
    employeeStatuses: WorkforceDistributionItem[];
    genders: WorkforceDistributionItem[];
  };
  joiningTrend: WorkforceTrendItem[];
  recentHires: WorkforceEmployeeSummary[];
  expiringContracts: WorkforceEmployeeSummary[];
  parameters: {
    months: number;
    upcomingDays: number;
  };
}

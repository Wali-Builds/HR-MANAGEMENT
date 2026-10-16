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

export interface WorkforceReport {
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

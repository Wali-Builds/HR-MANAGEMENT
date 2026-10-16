import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findWorkforceReportCompany,
  getBranchDistributionRecords,
  getDepartmentDistributionRecords,
  getDesignationDistributionRecords,
  getEmployeeStatusDistributionRecords,
  getEmploymentTypeDistributionRecords,
  getExpiringContractRecords,
  getGenderDistributionRecords,
  getJoiningTrendRecords,
  getRecentHireRecords,
  getWorkforceCapacityRecord,
  getWorkforceOverviewRecord
} from "./workforce-report.repository.js";

import type {
  WorkforceDistributionDatabaseRow,
  WorkforceDistributionItem,
  WorkforceEmployeeSummary,
  WorkforceEmployeeSummaryDatabaseRow,
  WorkforceReportResponse,
  WorkforceTrendDatabaseRow,
  WorkforceTrendItem
} from "./workforce-report.types.js";

import type {
  WorkforceReportQuery
} from "./workforce-report.schema.js";

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function countValue(
  value:
    | string
    | number
    | bigint
    | null
    | undefined
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  return Number(
    String(value)
  );
}

function dateOnly(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      10
    );
  }

  return (
    value instanceof Date
      ? value
      : new Date(value)
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

function fullName(
  row: WorkforceEmployeeSummaryDatabaseRow
): string {
  return [
    row.first_name,
    row.middle_name,
    row.last_name
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim() !== ""
    )
    .join(" ");
}

function addDays(
  date: Date,
  days: number
): Date {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
    days
  );

  return result;
}

function firstDayMonthsAgo(
  months: number
): Date {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() -
        (months - 1),
      1
    )
  );
}

function toDateOnly(
  date: Date
): string {
  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function resolveCompanyId(
  query: WorkforceReportQuery,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!query.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator views workforce reports",

        statusCode: 422,

        code:
          "COMPANY_ID_REQUIRED"
      });
    }

    return query.companyId;
  }

  if (!auth.companyId) {
    throw new AppError({
      message:
        "No company is assigned to this account",

      statusCode: 403,

      code:
        "COMPANY_SCOPE_REQUIRED"
    });
  }

  if (
    query.companyId &&
    query.companyId !==
      auth.companyId
  ) {
    throw new AppError({
      message:
        "You cannot view workforce reports for another company",

      statusCode: 403,

      code:
        "WORKFORCE_REPORT_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

function mapDistribution(
  rows: WorkforceDistributionDatabaseRow[],
  total: number
): WorkforceDistributionItem[] {
  return rows.map(
    (
      row
    ) => {
      const count =
        countValue(
          row.employee_count
        );

      return {
        key:
          row.item_key,

        label:
          row.item_label,

        count,

        percentage:
          total <= 0
            ? 0
            : Number(
                (
                  (
                    count /
                    total
                  ) *
                  100
                ).toFixed(1)
              )
      };
    }
  );
}

function mapTrend(
  rows: WorkforceTrendDatabaseRow[]
): WorkforceTrendItem[] {
  return rows.map(
    (
      row
    ) => ({
      period:
        row.period_key,

      label:
        row.period_label,

      count:
        countValue(
          row.employee_count
        )
    })
  );
}

function mapEmployeeSummary(
  row: WorkforceEmployeeSummaryDatabaseRow
): WorkforceEmployeeSummary {
  return {
    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      fullName(row),

    joiningDate:
      dateOnly(
        row.joining_date
      ) as string,

    contractEndDate:
      dateOnly(
        row.contract_end_date
      ),

    branchName:
      row.branch_name,

    departmentName:
      row.department_name,

    designationName:
      row.designation_name
  };
}

export async function getWorkforceReport(
  query: WorkforceReportQuery,
  auth: AuthContext
): Promise<WorkforceReportResponse> {
  const companyId =
    resolveCompanyId(
      query,
      auth
    );

  const company =
    await findWorkforceReportCompany(
      companyId
    );

  if (
    !company ||
    !databaseBoolean(
      company.is_active
    )
  ) {
    throw new AppError({
      message:
        "Company was not found or is inactive",

      statusCode: 404,

      code:
        "COMPANY_NOT_FOUND"
    });
  }

  const contractExpiryEndDate =
    toDateOnly(
      addDays(
        new Date(),
        query.upcomingDays
      )
    );

  const trendStartDate =
    toDateOnly(
      firstDayMonthsAgo(
        query.months
      )
    );

  const [
    overview,
    capacity,
    branches,
    departments,
    designations,
    employmentTypes,
    employeeStatuses,
    genders,
    joiningTrend,
    recentHires,
    expiringContracts
  ] =
    await Promise.all([
      getWorkforceOverviewRecord(
        companyId,
        contractExpiryEndDate
      ),

      getWorkforceCapacityRecord(
        companyId
      ),

      getBranchDistributionRecords(
        companyId
      ),

      getDepartmentDistributionRecords(
        companyId
      ),

      getDesignationDistributionRecords(
        companyId
      ),

      getEmploymentTypeDistributionRecords(
        companyId
      ),

      getEmployeeStatusDistributionRecords(
        companyId
      ),

      getGenderDistributionRecords(
        companyId
      ),

      getJoiningTrendRecords(
        companyId,
        trendStartDate
      ),

      getRecentHireRecords(
        companyId
      ),

      getExpiringContractRecords(
        companyId,
        contractExpiryEndDate
      )
    ]);

  const totalEmployees =
    countValue(
      overview.total_employees
    );

  const activeEmployees =
    countValue(
      overview.active_employees
    );

  const employeeLimit =
    capacity?.effective_employee_limit ===
    null ||
    capacity?.effective_employee_limit ===
    undefined
      ? null
      : countValue(
          capacity.effective_employee_limit
        );

  const remainingEmployees =
    employeeLimit === null
      ? null
      : Math.max(
          employeeLimit -
          activeEmployees,
          0
        );

  const usagePercentage =
    employeeLimit === null ||
    employeeLimit <= 0
      ? null
      : Number(
          (
            (
              activeEmployees /
              employeeLimit
            ) *
            100
          ).toFixed(1)
        );

  return {
    company: {
      companyId:
        String(
          company.company_id
        ),

      companyCode:
        company.company_code,

      companyName:
        company.display_name
    },

    overview: {
      totalEmployees,

      activeEmployees,

      inactiveEmployees:
        countValue(
          overview.inactive_employees
        ),

      newHiresThisMonth:
        countValue(
          overview.new_hires_this_month
        ),

      employeesWithoutAccounts:
        countValue(
          overview.employees_without_accounts
        ),

      expiringContracts:
        countValue(
          overview.expiring_contracts
        )
    },

    capacity: {
      planCode:
        capacity?.plan_code ??
        null,

      planName:
        capacity?.plan_name ??
        null,

      subscriptionStatus:
        capacity
          ?.subscription_status ??
        null,

      employeeLimit,

      remainingEmployees,

      usagePercentage
    },

    distributions: {
      branches:
        mapDistribution(
          branches,
          activeEmployees
        ),

      departments:
        mapDistribution(
          departments,
          activeEmployees
        ),

      designations:
        mapDistribution(
          designations,
          activeEmployees
        ),

      employmentTypes:
        mapDistribution(
          employmentTypes,
          activeEmployees
        ),

      employeeStatuses:
        mapDistribution(
          employeeStatuses,
          totalEmployees
        ),

      genders:
        mapDistribution(
          genders,
          activeEmployees
        )
    },

    joiningTrend:
      mapTrend(
        joiningTrend
      ),

    recentHires:
      recentHires.map(
        mapEmployeeSummary
      ),

    expiringContracts:
      expiringContracts.map(
        mapEmployeeSummary
      ),

    parameters: {
      months:
        query.months,

      upcomingDays:
        query.upcomingDays
    }
  };
}

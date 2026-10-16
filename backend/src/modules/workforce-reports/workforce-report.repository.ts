import { databasePool } from "../../database/pool.js";

import type {
  WorkforceCapacityDatabaseRow,
  WorkforceCompanyDatabaseRow,
  WorkforceDistributionDatabaseRow,
  WorkforceEmployeeSummaryDatabaseRow,
  WorkforceOverviewDatabaseRow,
  WorkforceTrendDatabaseRow
} from "./workforce-report.types.js";

export async function findWorkforceReportCompany(
  companyId: string
): Promise<WorkforceCompanyDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      SELECT company_id, company_code, display_name, is_active
      FROM companies
      WHERE company_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [companyId]
  );

  return (
    rows[0] as WorkforceCompanyDatabaseRow | undefined
  ) ?? null;
}

export async function getWorkforceOverviewRecord(
  companyId: string,
  contractExpiryEndDate: string
): Promise<WorkforceOverviewDatabaseRow> {
  const rows = await databasePool.query(
    `
      SELECT
          COUNT(*) AS total_employees,
          SUM(CASE WHEN e.is_active = 1 THEN 1 ELSE 0 END)
              AS active_employees,
          SUM(CASE WHEN e.is_active = 0 THEN 1 ELSE 0 END)
              AS inactive_employees,
          SUM(
            CASE
              WHEN e.joining_date >=
                   DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                THEN 1
              ELSE 0
            END
          ) AS new_hires_this_month,
          SUM(
            CASE
              WHEN NOT EXISTS (
                SELECT 1
                FROM users u
                WHERE u.employee_id = e.employee_id
                  AND u.deleted_at IS NULL
              )
                THEN 1
              ELSE 0
            END
          ) AS employees_without_accounts,
          SUM(
            CASE
              WHEN e.contract_end_date
                   BETWEEN CURRENT_DATE AND ?
                THEN 1
              ELSE 0
            END
          ) AS expiring_contracts
      FROM employees e
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
    `,
    [contractExpiryEndDate, companyId]
  );

  return (
    rows[0] as WorkforceOverviewDatabaseRow | undefined
  ) ?? {
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    new_hires_this_month: 0,
    employees_without_accounts: 0,
    expiring_contracts: 0
  };
}

export async function getWorkforceCapacityRecord(
  companyId: string
): Promise<WorkforceCapacityDatabaseRow | null> {
  const rows = await databasePool.query(
    `
      SELECT
          plan_code,
          plan_name,
          subscription_status,
          effective_employee_limit
      FROM company_current_subscription_details
      WHERE company_id = ?
      LIMIT 1
    `,
    [companyId]
  );

  return (
    rows[0] as WorkforceCapacityDatabaseRow | undefined
  ) ?? null;
}

async function getDistribution(
  sql: string,
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  const rows = await databasePool.query(sql, [companyId]);
  return rows as WorkforceDistributionDatabaseRow[];
}

export function getBranchDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          COALESCE(CAST(b.branch_id AS CHAR), 'UNASSIGNED')
              AS item_key,
          COALESCE(b.branch_name, 'Unassigned')
              AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      LEFT JOIN employee_assignments ea
          ON ea.employee_id = e.employee_id
         AND ea.is_current = 1
      LEFT JOIN branches b
          ON b.branch_id = ea.branch_id
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.is_active = 1
      GROUP BY item_key, item_label
      ORDER BY employee_count DESC, item_label ASC
    `,
    companyId
  );
}

export function getDepartmentDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          COALESCE(CAST(d.department_id AS CHAR), 'UNASSIGNED')
              AS item_key,
          COALESCE(d.department_name, 'Unassigned')
              AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      LEFT JOIN employee_assignments ea
          ON ea.employee_id = e.employee_id
         AND ea.is_current = 1
      LEFT JOIN departments d
          ON d.department_id = ea.department_id
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.is_active = 1
      GROUP BY item_key, item_label
      ORDER BY employee_count DESC, item_label ASC
    `,
    companyId
  );
}

export function getDesignationDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          COALESCE(CAST(dg.designation_id AS CHAR), 'UNASSIGNED')
              AS item_key,
          COALESCE(dg.designation_name, 'Unassigned')
              AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      LEFT JOIN employee_assignments ea
          ON ea.employee_id = e.employee_id
         AND ea.is_current = 1
      LEFT JOIN designations dg
          ON dg.designation_id = ea.designation_id
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.is_active = 1
      GROUP BY item_key, item_label
      ORDER BY employee_count DESC, item_label ASC
    `,
    companyId
  );
}

export function getEmploymentTypeDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          CAST(et.employment_type_id AS CHAR) AS item_key,
          et.type_name AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      INNER JOIN employment_types et
          ON et.employment_type_id = e.employment_type_id
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.is_active = 1
      GROUP BY et.employment_type_id, et.type_name
      ORDER BY employee_count DESC, et.type_name ASC
    `,
    companyId
  );
}

export function getEmployeeStatusDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          CAST(es.employee_status_id AS CHAR) AS item_key,
          es.status_name AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      INNER JOIN employee_statuses es
          ON es.employee_status_id = e.employee_status_id
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
      GROUP BY es.employee_status_id, es.status_name
      ORDER BY employee_count DESC, es.status_name ASC
    `,
    companyId
  );
}

export function getGenderDistributionRecords(
  companyId: string
): Promise<WorkforceDistributionDatabaseRow[]> {
  return getDistribution(
    `
      SELECT
          UPPER(
            COALESCE(NULLIF(TRIM(e.gender), ''), 'NOT_SPECIFIED')
          ) AS item_key,
          COALESCE(NULLIF(TRIM(e.gender), ''), 'Not specified')
              AS item_label,
          COUNT(*) AS employee_count
      FROM employees e
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.is_active = 1
      GROUP BY item_key, item_label
      ORDER BY employee_count DESC, item_label ASC
    `,
    companyId
  );
}

export async function getJoiningTrendRecords(
  companyId: string,
  trendStartDate: string
): Promise<WorkforceTrendDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      SELECT
          DATE_FORMAT(e.joining_date, '%Y-%m') AS period_key,
          DATE_FORMAT(e.joining_date, '%b %Y') AS period_label,
          COUNT(*) AS employee_count
      FROM employees e
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.joining_date >= ?
      GROUP BY period_key, period_label
      ORDER BY period_key ASC
    `,
    [companyId, trendStartDate]
  );

  return rows as WorkforceTrendDatabaseRow[];
}

const workforceEmployeeSummarySelect = `
  SELECT
      e.employee_id,
      e.employee_code,
      e.first_name,
      e.middle_name,
      e.last_name,
      e.joining_date,
      e.contract_end_date,
      b.branch_name,
      d.department_name,
      dg.designation_name
  FROM employees e
  LEFT JOIN employee_assignments ea
      ON ea.employee_id = e.employee_id
     AND ea.is_current = 1
  LEFT JOIN branches b
      ON b.branch_id = ea.branch_id
  LEFT JOIN departments d
      ON d.department_id = ea.department_id
  LEFT JOIN designations dg
      ON dg.designation_id = ea.designation_id
`;

export async function getRecentHireRecords(
  companyId: string
): Promise<WorkforceEmployeeSummaryDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      ${workforceEmployeeSummarySelect}
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
      ORDER BY e.joining_date DESC, e.employee_id DESC
      LIMIT 8
    `,
    [companyId]
  );

  return rows as WorkforceEmployeeSummaryDatabaseRow[];
}

export async function getExpiringContractRecords(
  companyId: string,
  contractExpiryEndDate: string
): Promise<WorkforceEmployeeSummaryDatabaseRow[]> {
  const rows = await databasePool.query(
    `
      ${workforceEmployeeSummarySelect}
      WHERE e.company_id = ?
        AND e.deleted_at IS NULL
        AND e.contract_end_date
            BETWEEN CURRENT_DATE AND ?
      ORDER BY e.contract_end_date ASC, e.employee_id ASC
      LIMIT 12
    `,
    [companyId, contractExpiryEndDate]
  );

  return rows as WorkforceEmployeeSummaryDatabaseRow[];
}

import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CompensationBankAccountDatabaseRow,
  CreateEmployeeSalaryComponentRecord,
  CreateSalaryAssignmentRecord,
  EmployeeCompensationActor,
  EmployeeCompensationOwnerDatabaseRow,
  EmployeeSalaryAssignmentDatabaseRow,
  EmployeeSalaryComponentDatabaseRow,
  PayComponentDatabaseRow,
  PayGradeDatabaseRow,
  RequestMetadata,
  SalaryStructureComponentDatabaseRow,
  SalaryStructureDatabaseRow,
  UpdateEmployeeSalaryComponentRecord,
  UpdateSalaryAssignmentRecord
} from "./employee-compensation.types.js";

/*
 * =========================================================
 * Internal types
 * =========================================================
 */

interface LockedEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
}

interface LockedSalaryAssignmentRow {
  salary_assignment_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;

  employee_id:
    | string
    | number
    | bigint;

  salary_structure_id:
    | string
    | number
    | bigint;

  pay_grade_id:
    | string
    | number
    | bigint
    | null;

  bank_account_id:
    | string
    | number
    | bigint
    | null;

  basic_salary:
    | string
    | number;

  reference_gross_salary:
    | string
    | number
    | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  assignment_status: string;

  is_current:
    | number
    | boolean;

  approved_by_user_id:
    | string
    | number
    | bigint
    | null;

  approved_at:
    | Date
    | string
    | null;
}

interface LockedEmployeeSalaryComponentRow {
  employee_salary_component_id:
    | string
    | number
    | bigint;

  salary_assignment_id:
    | string
    | number
    | bigint;

  pay_component_id:
    | string
    | number
    | bigint;

  base_component_id:
    | string
    | number
    | bigint
    | null;

  calculation_type: string;

  fixed_amount:
    | string
    | number
    | null;

  percentage_value:
    | string
    | number
    | null;

  formula_expression:
    string | null;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_active:
    | number
    | boolean;
}

interface AssignmentPeriodRow {
  salary_assignment_id:
    | string
    | number
    | bigint;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_current:
    | number
    | boolean;
}

interface SalaryComponentPeriodRow {
  employee_salary_component_id:
    | string
    | number
    | bigint;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_active:
    | number
    | boolean;
}

interface CompensationLookupFilters {
  search?: string | undefined;
  includeInactive: boolean;
}

interface SalaryStructureLookupFilters
  extends CompensationLookupFilters {
  salaryStructureId?:
    | string
    | undefined;
}

interface SalaryAssignmentListFilters {
  status:
    | "ALL"
    | "CURRENT"
    | "HISTORICAL";

  assignmentStatus?:
    | string
    | undefined;

  salaryStructureId?:
    | string
    | undefined;

  payGradeId?:
    | string
    | undefined;
}

interface EmployeeSalaryComponentListFilters {
  includeInactive: boolean;

  payComponentId?:
    | string
    | undefined;

  calculationType?:
    | "FIXED"
    | "PERCENTAGE"
    | "FORMULA"
    | undefined;
}

/*
 * =========================================================
 * Shared helpers
 * =========================================================
 */

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) => {
      if (
        typeof currentValue ===
        "bigint"
      ) {
        return String(currentValue);
      }

      if (
        Buffer.isBuffer(
          currentValue
        )
      ) {
        return "[REDACTED_BINARY]";
      }

      return currentValue;
    }
  );
}

function databaseBoolean(
  value:
    | number
    | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function databaseDateOnly(
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
    return value.slice(0, 10);
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date
    .toISOString()
    .slice(0, 10);
}

async function lockEmployeeRecord(
  connection: PoolConnection,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function lockSalaryAssignmentRecord(
  connection: PoolConnection,
  employeeId: string,
  salaryAssignmentId: string
): Promise<LockedSalaryAssignmentRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            salary_assignment_id,
            company_id,
            employee_id,
            salary_structure_id,
            pay_grade_id,
            bank_account_id,
            basic_salary,
            reference_gross_salary,
            effective_from,
            effective_to,
            assignment_status,
            is_current,
            approved_by_user_id,
            approved_at
        FROM employee_salary_assignments
        WHERE salary_assignment_id = ?
          AND employee_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        salaryAssignmentId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | LockedSalaryAssignmentRow
      | undefined
  ) ?? null;
}

async function lockEmployeeSalaryComponentRecord(
  connection: PoolConnection,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string
): Promise<LockedEmployeeSalaryComponentRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_salary_component_id,
            salary_assignment_id,
            pay_component_id,
            base_component_id,
            calculation_type,
            fixed_amount,
            percentage_value,
            formula_expression,
            effective_from,
            effective_to,
            is_active
        FROM employee_salary_components
        WHERE employee_salary_component_id = ?
          AND salary_assignment_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [
        employeeSalaryComponentId,
        salaryAssignmentId
      ]
    );

  return (
    rows[0] as
      | LockedEmployeeSalaryComponentRow
      | undefined
  ) ?? null;
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: EmployeeCompensationActor;

    actionName: string;
    tableName: string;
    recordId: string;

    oldValues?:
      | unknown
      | undefined;

    newValues?:
      | unknown
      | undefined;

    requestMethod: string;
    requestPath: string;

    metadata: RequestMetadata;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO activity_logs (
          company_id,
          user_id,
          module_name,
          action_name,
          table_name,
          record_id,
          old_values,
          new_values,
          request_method,
          request_path,
          ip_address,
          user_agent
      )
      VALUES (
          ?,
          ?,
          'employee_compensation',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
      )
    `,
    [
      input.companyId,
      input.actor.userId,
      input.actionName,
      input.tableName,
      input.recordId,

      input.oldValues === undefined
        ? null
        : safeJson(
            input.oldValues
          ),

      input.newValues === undefined
        ? null
        : safeJson(
            input.newValues
          ),

      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

/*
 * Salary amounts are deliberately excluded from
 * general-purpose activity log JSON.
 */

function salaryAssignmentLogSummary(
  assignment:
    | EmployeeSalaryAssignmentDatabaseRow
    | LockedSalaryAssignmentRow,
  salaryValuesChanged: boolean
) {
  return {
    salaryAssignmentId:
      String(
        assignment.salary_assignment_id
      ),

    employeeId:
      String(
        assignment.employee_id
      ),

    salaryStructureId:
      String(
        assignment.salary_structure_id
      ),

    payGradeId:
      assignment.pay_grade_id === null
        ? null
        : String(
            assignment.pay_grade_id
          ),

    bankAccountId:
      assignment.bank_account_id === null
        ? null
        : String(
            assignment.bank_account_id
          ),

    effectiveFrom:
      databaseDateOnly(
        assignment.effective_from
      ),

    effectiveTo:
      databaseDateOnly(
        assignment.effective_to
      ),

    assignmentStatus:
      assignment.assignment_status,

    isCurrent:
      databaseBoolean(
        assignment.is_current
      ),

    approved:
      assignment.approved_at !== null,

    salaryValuesChanged
  };
}

function salaryComponentLogSummary(
  component:
    | EmployeeSalaryComponentDatabaseRow
    | LockedEmployeeSalaryComponentRow,
  calculationValuesChanged: boolean
) {
  return {
    employeeSalaryComponentId:
      String(
        component
          .employee_salary_component_id
      ),

    salaryAssignmentId:
      String(
        component.salary_assignment_id
      ),

    payComponentId:
      String(
        component.pay_component_id
      ),

    baseComponentId:
      component.base_component_id ===
      null
        ? null
        : String(
            component.base_component_id
          ),

    calculationType:
      component.calculation_type,

    effectiveFrom:
      databaseDateOnly(
        component.effective_from
      ),

    effectiveTo:
      databaseDateOnly(
        component.effective_to
      ),

    isActive:
      databaseBoolean(
        component.is_active
      ),

    calculationValuesChanged
  };
}

/*
 * =========================================================
 * Reusable SELECT statements
 * =========================================================
 */

const salaryStructureSelect = `
  SELECT
      ss.salary_structure_id,
      ss.company_id,
      ss.pay_grade_id,

      pg.grade_code
          AS pay_grade_code,

      pg.grade_name
          AS pay_grade_name,

      ss.structure_code,
      ss.structure_name,
      ss.description,
      ss.payroll_frequency,
      ss.currency_code,
      ss.effective_from,
      ss.effective_to,
      ss.is_default,
      ss.is_active,
      ss.deleted_at,

      (
        SELECT COUNT(*)
        FROM salary_structure_components ssc_count
        WHERE ssc_count.salary_structure_id =
              ss.salary_structure_id
          AND ssc_count.is_active = 1
      ) AS component_count,

      ss.created_at,
      ss.updated_at
  FROM salary_structures ss
  LEFT JOIN pay_grades pg
      ON pg.pay_grade_id =
         ss.pay_grade_id
`;

const salaryStructureComponentSelect = `
  SELECT
      ssc.structure_component_id,
      ssc.salary_structure_id,
      ssc.pay_component_id,

      pc.component_code,
      pc.component_name,
      pc.component_type,

      ssc.base_component_id,

      base_pc.component_code
          AS base_component_code,

      base_pc.component_name
          AS base_component_name,

      ssc.calculation_type,
      ssc.fixed_amount,
      ssc.percentage_value,
      ssc.formula_expression,
      ssc.minimum_amount,
      ssc.maximum_amount,
      ssc.is_mandatory,
      ssc.is_active,
      ssc.sort_order,
      ssc.created_at,
      ssc.updated_at
  FROM salary_structure_components ssc
  INNER JOIN salary_structures ss
      ON ss.salary_structure_id =
         ssc.salary_structure_id
  INNER JOIN pay_components pc
      ON pc.pay_component_id =
         ssc.pay_component_id
  LEFT JOIN pay_components base_pc
      ON base_pc.pay_component_id =
         ssc.base_component_id
`;

const salaryAssignmentSelect = `
  SELECT
      esa.salary_assignment_id,
      esa.company_id,
      esa.employee_id,
      esa.salary_structure_id,

      ss.structure_code,
      ss.structure_name,

      ss.pay_grade_id
          AS structure_pay_grade_id,

      ss.payroll_frequency
          AS structure_payroll_frequency,

      ss.currency_code
          AS structure_currency_code,

      ss.effective_from
          AS structure_effective_from,

      ss.effective_to
          AS structure_effective_to,

      ss.is_active
          AS structure_is_active,

      ss.deleted_at
          AS structure_deleted_at,

      esa.pay_grade_id,

      pg.grade_code,
      pg.grade_name,

      pg.minimum_salary
          AS grade_minimum_salary,

      pg.midpoint_salary
          AS grade_midpoint_salary,

      pg.maximum_salary
          AS grade_maximum_salary,

      pg.currency_code
          AS grade_currency_code,

      esa.bank_account_id,

      ba.bank_name,

      ba.account_title
          AS bank_account_title,

      ba.account_number_last4
          AS bank_account_last4,

      ba.currency_code
          AS bank_account_currency_code,

      ba.is_active
          AS bank_account_is_active,

      ba.deleted_at
          AS bank_account_deleted_at,

      esa.payroll_frequency,
      esa.payment_method,
      esa.currency_code,
      esa.basic_salary,
      esa.reference_gross_salary,
      esa.effective_from,
      esa.effective_to,
      esa.assignment_status,
      esa.is_current,
      esa.approved_by_user_id,

      approver.username
          AS approver_username,

      approver.full_name
          AS approver_full_name,

      esa.approved_at,
      esa.remarks,

      (
        SELECT COUNT(*)
        FROM employee_salary_components esc_count
        WHERE esc_count.salary_assignment_id =
              esa.salary_assignment_id
      ) AS component_count,

      esa.created_at,
      esa.updated_at
  FROM employee_salary_assignments esa
  INNER JOIN salary_structures ss
      ON ss.salary_structure_id =
         esa.salary_structure_id
  LEFT JOIN pay_grades pg
      ON pg.pay_grade_id =
         esa.pay_grade_id
  LEFT JOIN employee_bank_accounts ba
      ON ba.bank_account_id =
         esa.bank_account_id
  LEFT JOIN users approver
      ON approver.user_id =
         esa.approved_by_user_id
`;

const employeeSalaryComponentSelect = `
  SELECT
      esc.employee_salary_component_id,
      esc.salary_assignment_id,

      esa.employee_id,
      esa.company_id,

      esc.pay_component_id,

      pc.component_code,
      pc.component_name,
      pc.component_type,

      pc.is_taxable
          AS component_is_taxable,

      pc.is_pensionable
          AS component_is_pensionable,

      pc.affects_gross_salary
          AS component_affects_gross_salary,

      pc.affects_net_salary
          AS component_affects_net_salary,

      pc.include_in_payslip
          AS component_include_in_payslip,

      esc.base_component_id,

      base_pc.component_code
          AS base_component_code,

      base_pc.component_name
          AS base_component_name,

      esc.calculation_type,
      esc.fixed_amount,
      esc.percentage_value,
      esc.formula_expression,
      esc.effective_from,
      esc.effective_to,
      esc.is_active,
      esc.created_at,
      esc.updated_at
  FROM employee_salary_components esc
  INNER JOIN employee_salary_assignments esa
      ON esa.salary_assignment_id =
         esc.salary_assignment_id
  INNER JOIN pay_components pc
      ON pc.pay_component_id =
         esc.pay_component_id
  LEFT JOIN pay_components base_pc
      ON base_pc.pay_component_id =
         esc.base_component_id
`;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export async function findEmployeeCompensationOwnerById(
  employeeId: string
): Promise<EmployeeCompensationOwnerDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            employee_id,
            company_id,
            employee_code,
            first_name,
            middle_name,
            last_name,
            is_active,
            deleted_at
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeCompensationOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Compensation lookups
 * =========================================================
 */

export async function listCompensationPayComponentRecords(
  companyId: string,
  filters: CompensationLookupFilters
): Promise<PayComponentDatabaseRow[]> {
  const conditions: string[] = [
    "company_id = ?",
    "deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        component_code LIKE ?
        OR component_name LIKE ?
        OR component_type LIKE ?
        OR calculation_type LIKE ?
        OR description LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            pay_component_id,
            company_id,
            component_code,
            component_name,
            description,
            component_type,
            calculation_type,
            default_amount,
            default_percentage,
            is_taxable,
            is_pensionable,
            is_proratable,
            affects_gross_salary,
            affects_net_salary,
            is_recurring,
            include_in_payslip,
            expense_account_code,
            liability_account_code,
            sort_order,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM pay_components
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            sort_order ASC,
            component_name ASC,
            pay_component_id ASC
      `,
      parameters
    );

  return rows as
    PayComponentDatabaseRow[];
}

export async function listCompensationPayGradeRecords(
  companyId: string,
  filters: CompensationLookupFilters
): Promise<PayGradeDatabaseRow[]> {
  const conditions: string[] = [
    "company_id = ?",
    "deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        grade_code LIKE ?
        OR grade_name LIKE ?
        OR description LIKE ?
        OR currency_code LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            pay_grade_id,
            company_id,
            grade_code,
            grade_name,
            description,
            minimum_salary,
            midpoint_salary,
            maximum_salary,
            currency_code,
            grade_level,
            sort_order,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM pay_grades
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            grade_level IS NULL ASC,
            grade_level ASC,
            sort_order ASC,
            grade_name ASC
      `,
      parameters
    );

  return rows as
    PayGradeDatabaseRow[];
}

export async function listCompensationSalaryStructureRecords(
  companyId: string,
  filters: CompensationLookupFilters
): Promise<SalaryStructureDatabaseRow[]> {
  const conditions: string[] = [
    "ss.company_id = ?",
    "ss.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "ss.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        ss.structure_code LIKE ?
        OR ss.structure_name LIKE ?
        OR ss.description LIKE ?
        OR ss.payroll_frequency LIKE ?
        OR ss.currency_code LIKE ?
        OR pg.grade_code LIKE ?
        OR pg.grade_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        ${salaryStructureSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            ss.is_default DESC,
            ss.effective_from DESC,
            ss.structure_name ASC
      `,
      parameters
    );

  return rows as
    SalaryStructureDatabaseRow[];
}

export async function listCompensationSalaryStructureComponentRecords(
  companyId: string,
  filters: SalaryStructureLookupFilters
): Promise<SalaryStructureComponentDatabaseRow[]> {
  const conditions: string[] = [
    "ss.company_id = ?",
    "ss.deleted_at IS NULL",
    "pc.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (filters.salaryStructureId) {
    conditions.push(
      "ssc.salary_structure_id = ?"
    );

    parameters.push(
      filters.salaryStructureId
    );
  }

  if (!filters.includeInactive) {
    conditions.push(
      "ssc.is_active = 1"
    );
  }

  if (filters.search) {
    const searchValue =
      `%${filters.search}%`;

    conditions.push(`
      (
        pc.component_code LIKE ?
        OR pc.component_name LIKE ?
        OR pc.component_type LIKE ?
        OR ssc.calculation_type LIKE ?
        OR base_pc.component_code LIKE ?
        OR base_pc.component_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        ${salaryStructureComponentSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            ssc.salary_structure_id ASC,
            ssc.sort_order ASC,
            pc.component_name ASC
      `,
      parameters
    );

  return rows as
    SalaryStructureComponentDatabaseRow[];
}

export async function listCompensationBankAccountRecords(
  companyId: string,
  employeeId: string,
  includeInactive: boolean
): Promise<CompensationBankAccountDatabaseRow[]> {
  const conditions: string[] = [
    "company_id = ?",
    "employee_id = ?",
    "deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId,
    employeeId
  ];

  if (!includeInactive) {
    conditions.push(
      "is_active = 1"
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            bank_account_id,
            company_id,
            employee_id,
            bank_name,
            branch_name,
            account_title,
            account_number_last4,
            iban_last4,
            currency_code,
            payment_priority,
            is_primary,
            is_verified,
            is_active
        FROM employee_bank_accounts
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            is_primary DESC,
            is_active DESC,
            payment_priority ASC,
            bank_account_id ASC
      `,
      parameters
    );

  return rows as
    CompensationBankAccountDatabaseRow[];
}

/*
 * =========================================================
 * Individual lookup records
 * =========================================================
 */

export async function findCompensationSalaryStructureById(
  companyId: string,
  salaryStructureId: string
): Promise<SalaryStructureDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${salaryStructureSelect}
        WHERE ss.salary_structure_id = ?
          AND ss.company_id = ?
          AND ss.deleted_at IS NULL
        LIMIT 1
      `,
      [
        salaryStructureId,
        companyId
      ]
    );

  return (
    rows[0] as
      | SalaryStructureDatabaseRow
      | undefined
  ) ?? null;
}

export async function findCompensationPayGradeById(
  companyId: string,
  payGradeId: string
): Promise<PayGradeDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            pay_grade_id,
            company_id,
            grade_code,
            grade_name,
            description,
            minimum_salary,
            midpoint_salary,
            maximum_salary,
            currency_code,
            grade_level,
            sort_order,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM pay_grades
        WHERE pay_grade_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        payGradeId,
        companyId
      ]
    );

  return (
    rows[0] as
      | PayGradeDatabaseRow
      | undefined
  ) ?? null;
}

export async function findCompensationPayComponentById(
  companyId: string,
  payComponentId: string
): Promise<PayComponentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            pay_component_id,
            company_id,
            component_code,
            component_name,
            description,
            component_type,
            calculation_type,
            default_amount,
            default_percentage,
            is_taxable,
            is_pensionable,
            is_proratable,
            affects_gross_salary,
            affects_net_salary,
            is_recurring,
            include_in_payslip,
            expense_account_code,
            liability_account_code,
            sort_order,
            is_active,
            deleted_at,
            created_at,
            updated_at
        FROM pay_components
        WHERE pay_component_id = ?
          AND company_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        payComponentId,
        companyId
      ]
    );

  return (
    rows[0] as
      | PayComponentDatabaseRow
      | undefined
  ) ?? null;
}

export async function findCompensationBankAccountById(
  companyId: string,
  employeeId: string,
  bankAccountId: string
): Promise<CompensationBankAccountDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            bank_account_id,
            company_id,
            employee_id,
            bank_name,
            branch_name,
            account_title,
            account_number_last4,
            iban_last4,
            currency_code,
            payment_priority,
            is_primary,
            is_verified,
            is_active
        FROM employee_bank_accounts
        WHERE bank_account_id = ?
          AND company_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        bankAccountId,
        companyId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | CompensationBankAccountDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Salary assignment list/get
 * =========================================================
 */

export async function listEmployeeSalaryAssignmentRecords(
  employeeId: string,
  filters: SalaryAssignmentListFilters
): Promise<EmployeeSalaryAssignmentDatabaseRow[]> {
  const conditions: string[] = [
    "esa.employee_id = ?"
  ];

  const parameters: unknown[] = [
    employeeId
  ];

  if (filters.status === "CURRENT") {
    conditions.push(
      "esa.is_current = 1"
    );
  }

  if (
    filters.status ===
    "HISTORICAL"
  ) {
    conditions.push(
      "esa.is_current = 0"
    );
  }

  if (filters.assignmentStatus) {
    conditions.push(
      "esa.assignment_status = ?"
    );

    parameters.push(
      filters.assignmentStatus
    );
  }

  if (filters.salaryStructureId) {
    conditions.push(
      "esa.salary_structure_id = ?"
    );

    parameters.push(
      filters.salaryStructureId
    );
  }

  if (filters.payGradeId) {
    conditions.push(
      "esa.pay_grade_id = ?"
    );

    parameters.push(
      filters.payGradeId
    );
  }

  const rows =
    await databasePool.query(
      `
        ${salaryAssignmentSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            esa.is_current DESC,
            esa.effective_from DESC,
            esa.salary_assignment_id DESC
      `,
      parameters
    );

  return rows as
    EmployeeSalaryAssignmentDatabaseRow[];
}

export async function findEmployeeSalaryAssignmentRecord(
  employeeId: string,
  salaryAssignmentId: string
): Promise<EmployeeSalaryAssignmentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${salaryAssignmentSelect}
        WHERE esa.salary_assignment_id = ?
          AND esa.employee_id = ?
        LIMIT 1
      `,
      [
        salaryAssignmentId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeSalaryAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

async function selectEmployeeSalaryAssignmentUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  salaryAssignmentId: string
): Promise<EmployeeSalaryAssignmentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${salaryAssignmentSelect}
        WHERE esa.salary_assignment_id = ?
          AND esa.employee_id = ?
        LIMIT 1
      `,
      [
        salaryAssignmentId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeSalaryAssignmentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Salary assignment period helpers
 * =========================================================
 */

async function closeOtherCurrentSalaryAssignments(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  excludeSalaryAssignmentId?: string
): Promise<void> {
  let selectSql = `
    SELECT
        salary_assignment_id,
        effective_from,
        effective_to,
        is_current
    FROM employee_salary_assignments
    WHERE employee_id = ?
      AND is_current = 1
  `;

  const selectParameters: unknown[] = [
    employeeId
  ];

  if (excludeSalaryAssignmentId) {
    selectSql += `
      AND salary_assignment_id <> ?
    `;

    selectParameters.push(
      excludeSalaryAssignmentId
    );
  }

  selectSql += `
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      selectSql,
      selectParameters
    ) as AssignmentPeriodRow[];

  if (rows.length === 0) {
    return;
  }

  for (const row of rows) {
    const existingStart =
      databaseDateOnly(
        row.effective_from
      );

    if (
      existingStart === null ||
      existingStart >= effectiveFrom
    ) {
      throw new Error(
        "SALARY_ASSIGNMENT_CURRENT_DATE_CONFLICT"
      );
    }
  }

  const assignmentIds =
    rows.map((row) =>
      String(
        row.salary_assignment_id
      )
    );

  const placeholders =
    assignmentIds
      .map(() => "?")
      .join(", ");

  await connection.query(
    `
      UPDATE employee_salary_assignments
      SET
          effective_to =
              DATE_SUB(?, INTERVAL 1 DAY),

          is_current = 0,

          assignment_status =
              CASE
                WHEN assignment_status = 'ACTIVE'
                THEN 'CLOSED'
                ELSE assignment_status
              END
      WHERE employee_id = ?
        AND salary_assignment_id IN (
          ${placeholders}
        )
    `,
    [
      effectiveFrom,
      employeeId,
      ...assignmentIds
    ]
  );

  await connection.query(
    `
      UPDATE employee_salary_components
      SET
          effective_to =
              CASE
                WHEN effective_to IS NULL
                  OR effective_to >
                     DATE_SUB(
                       ?,
                       INTERVAL 1 DAY
                     )
                THEN DATE_SUB(
                       ?,
                       INTERVAL 1 DAY
                     )
                ELSE effective_to
              END,

          is_active = 0
      WHERE salary_assignment_id IN (
        ${placeholders}
      )
        AND is_active = 1
    `,
    [
      effectiveFrom,
      effectiveFrom,
      ...assignmentIds
    ]
  );
}

async function salaryAssignmentOverlapExists(
  connection: PoolConnection,
  employeeId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  excludeSalaryAssignmentId?: string
): Promise<boolean> {
  let sql = `
    SELECT salary_assignment_id
    FROM employee_salary_assignments
    WHERE employee_id = ?
      AND effective_from <=
          COALESCE(
            ?,
            '9999-12-31'
          )
      AND COALESCE(
            effective_to,
            '9999-12-31'
          ) >= ?
  `;

  const parameters: unknown[] = [
    employeeId,
    effectiveTo,
    effectiveFrom
  ];

  if (excludeSalaryAssignmentId) {
    sql += `
      AND salary_assignment_id <> ?
    `;

    parameters.push(
      excludeSalaryAssignmentId
    );
  }

  sql += `
    LIMIT 1
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Salary assignment create
 * =========================================================
 */

export async function createEmployeeSalaryAssignmentRecord(
  input: CreateSalaryAssignmentRecord,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(employee.company_id) !==
      input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    if (input.isCurrent) {
      await closeOtherCurrentSalaryAssignments(
        connection,
        input.employeeId,
        input.effectiveFrom
      );
    }

    const overlap =
      await salaryAssignmentOverlapExists(
        connection,
        input.employeeId,
        input.effectiveFrom,
        input.effectiveTo
      );

    if (overlap) {
      throw new Error(
        "SALARY_ASSIGNMENT_PERIOD_OVERLAP"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_salary_assignments (
              company_id,
              employee_id,
              salary_structure_id,
              pay_grade_id,
              bank_account_id,
              payroll_frequency,
              payment_method,
              currency_code,
              basic_salary,
              reference_gross_salary,
              effective_from,
              effective_to,
              assignment_status,
              is_current,
              approved_by_user_id,
              approved_at,
              remarks
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              NULL,
              NULL,
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.salaryStructureId,
          input.payGradeId,
          input.bankAccountId,
          input.payrollFrequency,
          input.paymentMethod,
          input.currencyCode,
          input.basicSalary,
          input.referenceGrossSalary,
          input.effectiveFrom,
          input.effectiveTo,
          input.assignmentStatus,
          input.isCurrent ? 1 : 0,
          input.remarks
        ]
      );

    const salaryAssignmentId =
      String(
        insertResult.insertId
      );

    /*
     * Copy active salary-structure components
     * into employee-specific components.
     */

    await connection.query(
      `
        INSERT INTO employee_salary_components (
            salary_assignment_id,
            pay_component_id,
            base_component_id,
            calculation_type,
            fixed_amount,
            percentage_value,
            formula_expression,
            effective_from,
            effective_to,
            is_active
        )
        SELECT
            ?,
            ssc.pay_component_id,
            ssc.base_component_id,
            ssc.calculation_type,
            ssc.fixed_amount,
            ssc.percentage_value,
            ssc.formula_expression,
            ?,
            ?,
            CASE
              WHEN ? IS NULL
              THEN 1
              ELSE 0
            END
        FROM salary_structure_components ssc
        WHERE ssc.salary_structure_id = ?
          AND ssc.is_active = 1
      `,
      [
        salaryAssignmentId,
        input.effectiveFrom,
        input.effectiveTo,
        input.effectiveTo,
        input.salaryStructureId
      ]
    );

    const created =
      await selectEmployeeSalaryAssignmentUsingConnection(
        connection,
        input.employeeId,
        salaryAssignmentId
      );

    if (!created) {
      throw new Error(
        "CREATED_SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_salary_assignment_created",

        tableName:
          "employee_salary_assignments",

        recordId:
          salaryAssignmentId,

        newValues:
          salaryAssignmentLogSummary(
            created,
            true
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/salary-assignments`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Salary assignment update
 * =========================================================
 */

export async function updateEmployeeSalaryAssignmentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  input: UpdateSalaryAssignmentRecord,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(
        existing.effective_from
      );

    if (!resultingEffectiveFrom) {
      throw new Error(
        "INVALID_SALARY_ASSIGNMENT_EFFECTIVE_FROM"
      );
    }

    let resultingEffectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
        : databaseDateOnly(
            existing.effective_to
          );

    const resultingIsCurrent =
      input.isCurrent !== undefined
        ? input.isCurrent
        : databaseBoolean(
            existing.is_current
          );

    if (
      input.isCurrent === true &&
      input.effectiveTo === undefined
    ) {
      resultingEffectiveTo = null;
    }

    if (resultingIsCurrent) {
      await closeOtherCurrentSalaryAssignments(
        connection,
        employeeId,
        resultingEffectiveFrom,
        salaryAssignmentId
      );
    }

    const overlap =
      await salaryAssignmentOverlapExists(
        connection,
        employeeId,
        resultingEffectiveFrom,
        resultingEffectiveTo,
        salaryAssignmentId
      );

    if (overlap) {
      throw new Error(
        "SALARY_ASSIGNMENT_PERIOD_OVERLAP"
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (
      input.salaryStructureId !==
      undefined
    ) {
      addUpdate(
        "salary_structure_id",
        input.salaryStructureId
      );
    }

    if (
      input.payGradeId !== undefined
    ) {
      addUpdate(
        "pay_grade_id",
        input.payGradeId
      );
    }

    if (
      input.bankAccountId !==
      undefined
    ) {
      addUpdate(
        "bank_account_id",
        input.bankAccountId
      );
    }

    if (
      input.payrollFrequency !==
      undefined
    ) {
      addUpdate(
        "payroll_frequency",
        input.payrollFrequency
      );
    }

    if (
      input.paymentMethod !==
      undefined
    ) {
      addUpdate(
        "payment_method",
        input.paymentMethod
      );
    }

    if (
      input.currencyCode !==
      undefined
    ) {
      addUpdate(
        "currency_code",
        input.currencyCode
      );
    }

    if (
      input.basicSalary !== undefined
    ) {
      addUpdate(
        "basic_salary",
        input.basicSalary
      );
    }

    if (
      input.referenceGrossSalary !==
      undefined
    ) {
      addUpdate(
        "reference_gross_salary",
        input.referenceGrossSalary
      );
    }

    if (
      input.effectiveFrom !==
      undefined
    ) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (
      input.effectiveTo !== undefined ||
      input.isCurrent === true
    ) {
      addUpdate(
        "effective_to",
        resultingEffectiveTo
      );
    }

    if (
      input.assignmentStatus !==
      undefined
    ) {
      addUpdate(
        "assignment_status",
        input.assignmentStatus
      );
    }

    if (
      input.isCurrent !== undefined
    ) {
      addUpdate(
        "is_current",
        input.isCurrent ? 1 : 0
      );
    }

    if (
      input.remarks !== undefined
    ) {
      addUpdate(
        "remarks",
        input.remarks
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_SALARY_ASSIGNMENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      salaryAssignmentId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_salary_assignments
        SET ${assignments.join(", ")}
        WHERE salary_assignment_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    const updated =
      await selectEmployeeSalaryAssignmentUsingConnection(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    const salaryValuesChanged =
      input.basicSalary !== undefined ||
      input.referenceGrossSalary !==
        undefined;

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_assignment_updated",

        tableName:
          "employee_salary_assignments",

        recordId:
          salaryAssignmentId,

        oldValues:
          salaryAssignmentLogSummary(
            existing,
            salaryValuesChanged
          ),

        newValues:
          salaryAssignmentLogSummary(
            updated,
            salaryValuesChanged
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${salaryAssignmentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Close salary assignment
 * =========================================================
 */

export async function closeEmployeeSalaryAssignmentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  effectiveTo: string,
  assignmentStatus: string,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const effectiveFrom =
      databaseDateOnly(
        existing.effective_from
      );

    if (
      !effectiveFrom ||
      effectiveTo < effectiveFrom
    ) {
      throw new Error(
        "INVALID_SALARY_ASSIGNMENT_CLOSE_DATE"
      );
    }

    await connection.query(
      `
        UPDATE employee_salary_assignments
        SET
            effective_to = ?,
            assignment_status = ?,
            is_current = 0
        WHERE salary_assignment_id = ?
          AND employee_id = ?
      `,
      [
        effectiveTo,
        assignmentStatus,
        salaryAssignmentId,
        employeeId
      ]
    );

    await connection.query(
      `
        UPDATE employee_salary_components
        SET
            effective_to =
              CASE
                WHEN effective_to IS NULL
                  OR effective_to > ?
                THEN ?
                ELSE effective_to
              END,

            is_active = 0
        WHERE salary_assignment_id = ?
          AND is_active = 1
      `,
      [
        effectiveTo,
        effectiveTo,
        salaryAssignmentId
      ]
    );

    const updated =
      await selectEmployeeSalaryAssignmentUsingConnection(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!updated) {
      throw new Error(
        "CLOSED_SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_assignment_closed",

        tableName:
          "employee_salary_assignments",

        recordId:
          salaryAssignmentId,

        oldValues:
          salaryAssignmentLogSummary(
            existing,
            false
          ),

        newValues:
          salaryAssignmentLogSummary(
            updated,
            false
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${salaryAssignmentId}/close`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Approve salary assignment
 * =========================================================
 */

export async function approveEmployeeSalaryAssignmentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  approvedByUserId: string,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    await connection.query(
      `
        UPDATE employee_salary_assignments
        SET
            approved_by_user_id = ?,
            approved_at =
                CURRENT_TIMESTAMP
        WHERE salary_assignment_id = ?
          AND employee_id = ?
      `,
      [
        approvedByUserId,
        salaryAssignmentId,
        employeeId
      ]
    );

    const approved =
      await selectEmployeeSalaryAssignmentUsingConnection(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!approved) {
      throw new Error(
        "APPROVED_SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_assignment_approved",

        tableName:
          "employee_salary_assignments",

        recordId:
          salaryAssignmentId,

        oldValues:
          salaryAssignmentLogSummary(
            existing,
            false
          ),

        newValues:
          salaryAssignmentLogSummary(
            approved,
            false
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${salaryAssignmentId}/approve`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return approved;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Employee salary component list/get
 * =========================================================
 */

export async function listEmployeeSalaryComponentRecords(
  employeeId: string,
  salaryAssignmentId: string,
  filters: EmployeeSalaryComponentListFilters
): Promise<EmployeeSalaryComponentDatabaseRow[]> {
  const conditions: string[] = [
    "esa.employee_id = ?",
    "esc.salary_assignment_id = ?"
  ];

  const parameters: unknown[] = [
    employeeId,
    salaryAssignmentId
  ];

  if (!filters.includeInactive) {
    conditions.push(
      "esc.is_active = 1"
    );
  }

  if (filters.payComponentId) {
    conditions.push(
      "esc.pay_component_id = ?"
    );

    parameters.push(
      filters.payComponentId
    );
  }

  if (filters.calculationType) {
    conditions.push(
      "esc.calculation_type = ?"
    );

    parameters.push(
      filters.calculationType
    );
  }

  const rows =
    await databasePool.query(
      `
        ${employeeSalaryComponentSelect}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            esc.is_active DESC,
            esc.effective_from DESC,
            pc.component_name ASC
      `,
      parameters
    );

  return rows as
    EmployeeSalaryComponentDatabaseRow[];
}

export async function findEmployeeSalaryComponentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string
): Promise<EmployeeSalaryComponentDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeSalaryComponentSelect}
        WHERE esa.employee_id = ?
          AND esc.salary_assignment_id = ?
          AND esc.employee_salary_component_id = ?
        LIMIT 1
      `,
      [
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId
      ]
    );

  return (
    rows[0] as
      | EmployeeSalaryComponentDatabaseRow
      | undefined
  ) ?? null;
}

async function selectEmployeeSalaryComponentUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string
): Promise<EmployeeSalaryComponentDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeSalaryComponentSelect}
        WHERE esa.employee_id = ?
          AND esc.salary_assignment_id = ?
          AND esc.employee_salary_component_id = ?
        LIMIT 1
      `,
      [
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId
      ]
    );

  return (
    rows[0] as
      | EmployeeSalaryComponentDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Salary component period helpers
 * =========================================================
 */

async function closeOtherActiveSalaryComponents(
  connection: PoolConnection,
  salaryAssignmentId: string,
  payComponentId: string,
  effectiveFrom: string,
  excludeEmployeeSalaryComponentId?: string
): Promise<void> {
  let selectSql = `
    SELECT
        employee_salary_component_id,
        effective_from,
        effective_to,
        is_active
    FROM employee_salary_components
    WHERE salary_assignment_id = ?
      AND pay_component_id = ?
      AND is_active = 1
  `;

  const parameters: unknown[] = [
    salaryAssignmentId,
    payComponentId
  ];

  if (
    excludeEmployeeSalaryComponentId
  ) {
    selectSql += `
      AND employee_salary_component_id <> ?
    `;

    parameters.push(
      excludeEmployeeSalaryComponentId
    );
  }

  selectSql += `
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      selectSql,
      parameters
    ) as SalaryComponentPeriodRow[];

  for (const row of rows) {
    const existingStart =
      databaseDateOnly(
        row.effective_from
      );

    if (
      existingStart === null ||
      existingStart >= effectiveFrom
    ) {
      throw new Error(
        "SALARY_COMPONENT_ACTIVE_DATE_CONFLICT"
      );
    }
  }

  let updateSql = `
    UPDATE employee_salary_components
    SET
        effective_to =
            DATE_SUB(?, INTERVAL 1 DAY),

        is_active = 0
    WHERE salary_assignment_id = ?
      AND pay_component_id = ?
      AND is_active = 1
  `;

  const updateParameters: unknown[] = [
    effectiveFrom,
    salaryAssignmentId,
    payComponentId
  ];

  if (
    excludeEmployeeSalaryComponentId
  ) {
    updateSql += `
      AND employee_salary_component_id <> ?
    `;

    updateParameters.push(
      excludeEmployeeSalaryComponentId
    );
  }

  await connection.query(
    updateSql,
    updateParameters
  );
}

async function salaryComponentOverlapExists(
  connection: PoolConnection,
  salaryAssignmentId: string,
  payComponentId: string,
  effectiveFrom: string,
  effectiveTo: string | null,
  excludeEmployeeSalaryComponentId?: string
): Promise<boolean> {
  let sql = `
    SELECT employee_salary_component_id
    FROM employee_salary_components
    WHERE salary_assignment_id = ?
      AND pay_component_id = ?
      AND effective_from <=
          COALESCE(
            ?,
            '9999-12-31'
          )
      AND COALESCE(
            effective_to,
            '9999-12-31'
          ) >= ?
  `;

  const parameters: unknown[] = [
    salaryAssignmentId,
    payComponentId,
    effectiveTo,
    effectiveFrom
  ];

  if (
    excludeEmployeeSalaryComponentId
  ) {
    sql += `
      AND employee_salary_component_id <> ?
    `;

    parameters.push(
      excludeEmployeeSalaryComponentId
    );
  }

  sql += `
    LIMIT 1
    FOR UPDATE
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Create employee salary component
 * =========================================================
 */

export async function createEmployeeSalaryComponentRecord(
  employeeId: string,
  input: CreateEmployeeSalaryComponentRecord,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const assignment =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        input.salaryAssignmentId
      );

    if (!assignment) {
      throw new Error(
        "SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    if (
      input.isActive &&
      input.effectiveTo === null
    ) {
      await closeOtherActiveSalaryComponents(
        connection,
        input.salaryAssignmentId,
        input.payComponentId,
        input.effectiveFrom
      );
    }

    const overlap =
      await salaryComponentOverlapExists(
        connection,
        input.salaryAssignmentId,
        input.payComponentId,
        input.effectiveFrom,
        input.effectiveTo
      );

    if (overlap) {
      throw new Error(
        "SALARY_COMPONENT_PERIOD_OVERLAP"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_salary_components (
              salary_assignment_id,
              pay_component_id,
              base_component_id,
              calculation_type,
              fixed_amount,
              percentage_value,
              formula_expression,
              effective_from,
              effective_to,
              is_active
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.salaryAssignmentId,
          input.payComponentId,
          input.baseComponentId,
          input.calculationType,
          input.fixedAmount,
          input.percentageValue,
          input.formulaExpression,
          input.effectiveFrom,
          input.effectiveTo,
          input.isActive ? 1 : 0
        ]
      );

    const employeeSalaryComponentId =
      String(
        insertResult.insertId
      );

    const created =
      await selectEmployeeSalaryComponentUsingConnection(
        connection,
        employeeId,
        input.salaryAssignmentId,
        employeeSalaryComponentId
      );

    if (!created) {
      throw new Error(
        "CREATED_SALARY_COMPONENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_component_created",

        tableName:
          "employee_salary_components",

        recordId:
          employeeSalaryComponentId,

        newValues:
          salaryComponentLogSummary(
            created,
            true
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${input.salaryAssignmentId}/components`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Update employee salary component
 * =========================================================
 */

export async function updateEmployeeSalaryComponentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string,
  input: UpdateEmployeeSalaryComponentRecord,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const assignment =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!assignment) {
      throw new Error(
        "SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    const existing =
      await lockEmployeeSalaryComponentRecord(
        connection,
        salaryAssignmentId,
        employeeSalaryComponentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingPayComponentId =
      input.payComponentId ??
      String(
        existing.pay_component_id
      );

    const resultingEffectiveFrom =
      input.effectiveFrom ??
      databaseDateOnly(
        existing.effective_from
      );

    if (!resultingEffectiveFrom) {
      throw new Error(
        "INVALID_SALARY_COMPONENT_EFFECTIVE_FROM"
      );
    }

    let resultingEffectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
        : databaseDateOnly(
            existing.effective_to
          );

    const resultingIsActive =
      input.isActive !== undefined
        ? input.isActive
        : databaseBoolean(
            existing.is_active
          );

    if (
      input.isActive === true &&
      input.effectiveTo === undefined
    ) {
      resultingEffectiveTo = null;
    }

    if (
      resultingIsActive &&
      resultingEffectiveTo === null
    ) {
      await closeOtherActiveSalaryComponents(
        connection,
        salaryAssignmentId,
        resultingPayComponentId,
        resultingEffectiveFrom,
        employeeSalaryComponentId
      );
    }

    const overlap =
      await salaryComponentOverlapExists(
        connection,
        salaryAssignmentId,
        resultingPayComponentId,
        resultingEffectiveFrom,
        resultingEffectiveTo,
        employeeSalaryComponentId
      );

    if (overlap) {
      throw new Error(
        "SALARY_COMPONENT_PERIOD_OVERLAP"
      );
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (
      input.payComponentId !==
      undefined
    ) {
      addUpdate(
        "pay_component_id",
        input.payComponentId
      );
    }

    if (
      input.baseComponentId !==
      undefined
    ) {
      addUpdate(
        "base_component_id",
        input.baseComponentId
      );
    }

    if (
      input.calculationType !==
      undefined
    ) {
      addUpdate(
        "calculation_type",
        input.calculationType
      );
    }

    if (
      input.fixedAmount !== undefined
    ) {
      addUpdate(
        "fixed_amount",
        input.fixedAmount
      );
    }

    if (
      input.percentageValue !==
      undefined
    ) {
      addUpdate(
        "percentage_value",
        input.percentageValue
      );
    }

    if (
      input.formulaExpression !==
      undefined
    ) {
      addUpdate(
        "formula_expression",
        input.formulaExpression
      );
    }

    if (
      input.effectiveFrom !==
      undefined
    ) {
      addUpdate(
        "effective_from",
        input.effectiveFrom
      );
    }

    if (
      input.effectiveTo !== undefined ||
      input.isActive === true
    ) {
      addUpdate(
        "effective_to",
        resultingEffectiveTo
      );
    }

    if (
      input.isActive !== undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    if (
      assignments.length === 0
    ) {
      throw new Error(
        "NO_SALARY_COMPONENT_UPDATE_FIELDS"
      );
    }

    parameters.push(
      employeeSalaryComponentId,
      salaryAssignmentId
    );

    await connection.query(
      `
        UPDATE employee_salary_components
        SET ${assignments.join(", ")}
        WHERE employee_salary_component_id = ?
          AND salary_assignment_id = ?
      `,
      parameters
    );

    const updated =
      await selectEmployeeSalaryComponentUsingConnection(
        connection,
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId
      );

    if (!updated) {
      throw new Error(
        "UPDATED_SALARY_COMPONENT_NOT_FOUND"
      );
    }

    const calculationValuesChanged =
      input.fixedAmount !== undefined ||
      input.percentageValue !==
        undefined ||
      input.formulaExpression !==
        undefined ||
      input.calculationType !==
        undefined;

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_component_updated",

        tableName:
          "employee_salary_components",

        recordId:
          employeeSalaryComponentId,

        oldValues:
          salaryComponentLogSummary(
            existing,
            calculationValuesChanged
          ),

        newValues:
          salaryComponentLogSummary(
            updated,
            calculationValuesChanged
          ),

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${salaryAssignmentId}/components/${employeeSalaryComponentId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Close employee salary component
 * =========================================================
 */

export async function closeEmployeeSalaryComponentRecord(
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string,
  effectiveTo: string,
  actor: EmployeeCompensationActor,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const assignment =
      await lockSalaryAssignmentRecord(
        connection,
        employeeId,
        salaryAssignmentId
      );

    if (!assignment) {
      throw new Error(
        "SALARY_ASSIGNMENT_NOT_FOUND"
      );
    }

    const existing =
      await lockEmployeeSalaryComponentRecord(
        connection,
        salaryAssignmentId,
        employeeSalaryComponentId
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const effectiveFrom =
      databaseDateOnly(
        existing.effective_from
      );

    if (
      !effectiveFrom ||
      effectiveTo < effectiveFrom
    ) {
      throw new Error(
        "INVALID_SALARY_COMPONENT_CLOSE_DATE"
      );
    }

    await connection.query(
      `
        UPDATE employee_salary_components
        SET
            effective_to = ?,
            is_active = 0
        WHERE employee_salary_component_id = ?
          AND salary_assignment_id = ?
      `,
      [
        effectiveTo,
        employeeSalaryComponentId,
        salaryAssignmentId
      ]
    );

    const updated =
      await selectEmployeeSalaryComponentUsingConnection(
        connection,
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId
      );

    if (!updated) {
      throw new Error(
        "CLOSED_SALARY_COMPONENT_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_salary_component_closed",

        tableName:
          "employee_salary_components",

        recordId:
          employeeSalaryComponentId,

        oldValues:
          salaryComponentLogSummary(
            existing,
            false
          ),

        newValues:
          salaryComponentLogSummary(
            updated,
            false
          ),

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${employeeId}/salary-assignments/${salaryAssignmentId}/components/${employeeSalaryComponentId}/close`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
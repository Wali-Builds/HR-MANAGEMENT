import {
  AppError
} from "../../common/errors/app-error.js";

import {
  maskSensitiveValue
} from "../../common/security/sensitive-field-crypto.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  approveEmployeeSalaryAssignmentRecord,
  closeEmployeeSalaryAssignmentRecord,
  closeEmployeeSalaryComponentRecord,
  createEmployeeSalaryAssignmentRecord,
  createEmployeeSalaryComponentRecord,
  findCompensationBankAccountById,
  findCompensationPayComponentById,
  findCompensationPayGradeById,
  findCompensationSalaryStructureById,
  findEmployeeCompensationOwnerById,
  findEmployeeSalaryAssignmentRecord,
  findEmployeeSalaryComponentRecord,
  listCompensationBankAccountRecords,
  listCompensationPayComponentRecords,
  listCompensationPayGradeRecords,
  listCompensationSalaryStructureComponentRecords,
  listCompensationSalaryStructureRecords,
  listEmployeeSalaryAssignmentRecords,
  listEmployeeSalaryComponentRecords,
  updateEmployeeSalaryAssignmentRecord,
  updateEmployeeSalaryComponentRecord
} from "./employee-compensation.repository.js";

import type {
  CloseEmployeeSalaryComponentInput,
  CloseSalaryAssignmentInput,
  CompensationLookupQuery,
  CreateEmployeeSalaryComponentInput,
  CreateSalaryAssignmentInput,
  EmployeeSalaryComponentListQuery,
  SalaryAssignmentListQuery,
  UpdateEmployeeSalaryComponentInput,
  UpdateSalaryAssignmentInput
} from "./employee-compensation.schema.js";

import type {
  CompensationBankAccountDatabaseRow,
  CompensationBankAccountResponse,
  CreateEmployeeSalaryComponentRecord,
  CreateSalaryAssignmentRecord,
  EmployeeCompensationActor,
  EmployeeCompensationOwnerDatabaseRow,
  EmployeeSalaryAssignmentDatabaseRow,
  EmployeeSalaryAssignmentResponse,
  EmployeeSalaryComponentDatabaseRow,
  EmployeeSalaryComponentResponse,
  PayComponentDatabaseRow,
  PayComponentResponse,
  PayGradeDatabaseRow,
  PayGradeResponse,
  RequestMetadata,
  SalaryStructureComponentDatabaseRow,
  SalaryStructureComponentResponse,
  SalaryStructureDatabaseRow,
  SalaryStructureResponse,
  UpdateEmployeeSalaryComponentRecord,
  UpdateSalaryAssignmentRecord
} from "./employee-compensation.types.js";

/*
 * =========================================================
 * Basic conversion helpers
 * =========================================================
 */

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function nullableId(
  value:
    | string
    | number
    | bigint
    | null
): string | null {
  return value === null
    ? null
    : String(value);
}

function nullableNumber(
  value:
    | string
    | number
    | null
): number | null {
  return value === null
    ? null
    : Number(value);
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
    return value.slice(0, 10);
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  return parsedDate
    .toISOString()
    .slice(0, 10);
}

function requiredDateOnly(
  value: Date | string
): string {
  const result =
    dateOnly(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATE"
    );
  }

  return result;
}

function dateTimeIso(
  value:
    | Date
    | string
    | null
): string | null {
  if (value === null) {
    return null;
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  return parsedDate.toISOString();
}

function requiredDateTimeIso(
  value: Date | string
): string {
  const result =
    dateTimeIso(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATETIME"
    );
  }

  return result;
}

/*
 * =========================================================
 * Authentication and permissions
 * =========================================================
 */

function getAuthPermissions(
  auth: AuthContext
): string[] {
  const authWithPermissions =
    auth as AuthContext & {
      permissions?: string[];
    };

  return Array.isArray(
    authWithPermissions.permissions
  )
    ? authWithPermissions.permissions
    : [];
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  // edited by wali: Allow linked Company Administrators to manage and review employee compensation in their company.
  const isTenantCompanyAdmin = Boolean(
    auth.companyId && auth.roleCodes.includes("COMPANY_ADMIN")
  );

  if (auth.isPlatformAdmin) {
    return true;
  }

  return getAuthPermissions(
    auth
  ).includes(
    permissionCode
  ) || (
    isTenantCompanyAdmin &&
    (permissionCode.startsWith("employee.") ||
      permissionCode === "payroll.view" ||
      permissionCode === "payroll.manage" ||
      permissionCode === "payroll.approve")
  );
}

function createActor(
  auth: AuthContext
): EmployeeCompensationActor {
  return {
    userId:
      auth.userId,

    employeeId:
      auth.employeeId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin,

    permissions:
      getAuthPermissions(auth)
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeCompensationOwnerDatabaseRow> {
  const employee =
    await findEmployeeCompensationOwnerById(
      employeeId
    );

  if (!employee) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  return employee;
}

function assertSameCompany(
  auth: AuthContext,
  employee: EmployeeCompensationOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    String(employee.company_id) !==
      auth.companyId
  ) {
    throw new AppError({
      message:
        "You cannot access an employee belonging to another company",

      statusCode: 403,

      code:
        "EMPLOYEE_ACCESS_DENIED"
    });
  }
}

function assertViewAccess(
  auth: AuthContext,
  employee: EmployeeCompensationOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  const isOwnProfile =
    auth.employeeId !== null &&
    String(employee.employee_id) ===
      auth.employeeId;

  if (isOwnProfile) {
    return;
  }

  if (
    hasPermission(
      auth,
      "payroll.view"
    ) ||
    hasPermission(
      auth,
      "payroll.manage"
    ) ||
    hasPermission(
      auth,
      "payroll.approve"
    ) ||
    hasPermission(
      auth,
      "employee.update"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view employee compensation",

    statusCode: 403,

    code:
      "EMPLOYEE_COMPENSATION_VIEW_DENIED"
  });
}

function assertManageAccess(
  auth: AuthContext,
  employee: EmployeeCompensationOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  if (
    hasPermission(
      auth,
      "payroll.manage"
    ) ||
    hasPermission(
      auth,
      "employee.update"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage employee compensation",

    statusCode: 403,

    code:
      "EMPLOYEE_COMPENSATION_MANAGE_DENIED"
  });
}

function assertApprovalAccess(
  auth: AuthContext,
  employee: EmployeeCompensationOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  if (
    hasPermission(
      auth,
      "payroll.approve"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to approve employee compensation",

    statusCode: 403,

    code:
      "EMPLOYEE_COMPENSATION_APPROVAL_DENIED"
  });
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapPayComponent(
  row: PayComponentDatabaseRow
): PayComponentResponse {
  return {
    payComponentId:
      String(row.pay_component_id),

    companyId:
      String(row.company_id),

    componentCode:
      row.component_code,

    componentName:
      row.component_name,

    description:
      row.description,

    componentType:
      row.component_type,

    calculationType:
      row.calculation_type,

    defaultAmount:
      nullableNumber(
        row.default_amount
      ),

    defaultPercentage:
      nullableNumber(
        row.default_percentage
      ),

    isTaxable:
      databaseBoolean(
        row.is_taxable
      ),

    isPensionable:
      databaseBoolean(
        row.is_pensionable
      ),

    isProratable:
      databaseBoolean(
        row.is_proratable
      ),

    affectsGrossSalary:
      databaseBoolean(
        row.affects_gross_salary
      ),

    affectsNetSalary:
      databaseBoolean(
        row.affects_net_salary
      ),

    isRecurring:
      databaseBoolean(
        row.is_recurring
      ),

    includeInPayslip:
      databaseBoolean(
        row.include_in_payslip
      ),

    expenseAccountCode:
      row.expense_account_code,

    liabilityAccountCode:
      row.liability_account_code,

    sortOrder:
      Number(row.sort_order),

    isActive:
      databaseBoolean(
        row.is_active
      )
  };
}

function mapPayGrade(
  row: PayGradeDatabaseRow
): PayGradeResponse {
  return {
    payGradeId:
      String(row.pay_grade_id),

    companyId:
      String(row.company_id),

    gradeCode:
      row.grade_code,

    gradeName:
      row.grade_name,

    description:
      row.description,

    minimumSalary:
      nullableNumber(
        row.minimum_salary
      ),

    midpointSalary:
      nullableNumber(
        row.midpoint_salary
      ),

    maximumSalary:
      nullableNumber(
        row.maximum_salary
      ),

    currencyCode:
      row.currency_code,

    gradeLevel:
      row.grade_level === null
        ? null
        : Number(row.grade_level),

    sortOrder:
      Number(row.sort_order),

    isActive:
      databaseBoolean(
        row.is_active
      )
  };
}

function mapSalaryStructure(
  row: SalaryStructureDatabaseRow
): SalaryStructureResponse {
  return {
    salaryStructureId:
      String(
        row.salary_structure_id
      ),

    companyId:
      String(row.company_id),

    payGradeId:
      nullableId(
        row.pay_grade_id
      ),

    payGradeCode:
      row.pay_grade_code,

    payGradeName:
      row.pay_grade_name,

    structureCode:
      row.structure_code,

    structureName:
      row.structure_name,

    description:
      row.description,

    payrollFrequency:
      row.payroll_frequency,

    currencyCode:
      row.currency_code,

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    isDefault:
      databaseBoolean(
        row.is_default
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    componentCount:
      Number(row.component_count)
  };
}

function mapSalaryStructureComponent(
  row: SalaryStructureComponentDatabaseRow
): SalaryStructureComponentResponse {
  return {
    structureComponentId:
      String(
        row.structure_component_id
      ),

    salaryStructureId:
      String(
        row.salary_structure_id
      ),

    payComponentId:
      String(
        row.pay_component_id
      ),

    componentCode:
      row.component_code,

    componentName:
      row.component_name,

    componentType:
      row.component_type,

    baseComponentId:
      nullableId(
        row.base_component_id
      ),

    baseComponentCode:
      row.base_component_code,

    baseComponentName:
      row.base_component_name,

    calculationType:
      row.calculation_type,

    fixedAmount:
      nullableNumber(
        row.fixed_amount
      ),

    percentageValue:
      nullableNumber(
        row.percentage_value
      ),

    formulaExpression:
      row.formula_expression,

    minimumAmount:
      nullableNumber(
        row.minimum_amount
      ),

    maximumAmount:
      nullableNumber(
        row.maximum_amount
      ),

    isMandatory:
      databaseBoolean(
        row.is_mandatory
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    sortOrder:
      Number(row.sort_order)
  };
}

function mapBankAccount(
  row: CompensationBankAccountDatabaseRow
): CompensationBankAccountResponse {
  return {
    bankAccountId:
      String(row.bank_account_id),

    employeeId:
      String(row.employee_id),

    bankName:
      row.bank_name,

    branchName:
      row.branch_name,

    accountTitle:
      row.account_title,

    accountNumberLast4:
      row.account_number_last4,

    accountNumberMasked:
      maskSensitiveValue(
        row.account_number_last4
      ),

    ibanLast4:
      row.iban_last4,

    ibanMasked:
      maskSensitiveValue(
        row.iban_last4
      ),

    currencyCode:
      row.currency_code,

    paymentPriority:
      Number(
        row.payment_priority
      ),

    isPrimary:
      databaseBoolean(
        row.is_primary
      ),

    isVerified:
      databaseBoolean(
        row.is_verified
      ),

    isActive:
      databaseBoolean(
        row.is_active
      )
  };
}

function mapSalaryAssignment(
  row: EmployeeSalaryAssignmentDatabaseRow
): EmployeeSalaryAssignmentResponse {
  return {
    salaryAssignmentId:
      String(
        row.salary_assignment_id
      ),

    companyId:
      String(row.company_id),

    employeeId:
      String(row.employee_id),

    salaryStructureId:
      String(
        row.salary_structure_id
      ),

    structureCode:
      row.structure_code,

    structureName:
      row.structure_name,

    payGradeId:
      nullableId(
        row.pay_grade_id
      ),

    gradeCode:
      row.grade_code,

    gradeName:
      row.grade_name,

    bankAccountId:
      nullableId(
        row.bank_account_id
      ),

    bankName:
      row.bank_name,

    bankAccountTitle:
      row.bank_account_title,

    bankAccountLast4:
      row.bank_account_last4,

    bankAccountMasked:
      maskSensitiveValue(
        row.bank_account_last4
      ),

    payrollFrequency:
      row.payroll_frequency,

    paymentMethod:
      row.payment_method,

    currencyCode:
      row.currency_code,

    basicSalary:
      Number(row.basic_salary),

    referenceGrossSalary:
      nullableNumber(
        row.reference_gross_salary
      ),

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    assignmentStatus:
      row.assignment_status,

    isCurrent:
      databaseBoolean(
        row.is_current
      ),

    approvedByUserId:
      nullableId(
        row.approved_by_user_id
      ),

    approverUsername:
      row.approver_username,

    approverFullName:
      row.approver_full_name,

    approvedAt:
      dateTimeIso(
        row.approved_at
      ),

    remarks:
      row.remarks,

    componentCount:
      Number(row.component_count),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapSalaryComponent(
  row: EmployeeSalaryComponentDatabaseRow
): EmployeeSalaryComponentResponse {
  return {
    employeeSalaryComponentId:
      String(
        row.employee_salary_component_id
      ),

    salaryAssignmentId:
      String(
        row.salary_assignment_id
      ),

    employeeId:
      String(row.employee_id),

    companyId:
      String(row.company_id),

    payComponentId:
      String(
        row.pay_component_id
      ),

    componentCode:
      row.component_code,

    componentName:
      row.component_name,

    componentType:
      row.component_type,

    isTaxable:
      databaseBoolean(
        row.component_is_taxable
      ),

    isPensionable:
      databaseBoolean(
        row.component_is_pensionable
      ),

    affectsGrossSalary:
      databaseBoolean(
        row.component_affects_gross_salary
      ),

    affectsNetSalary:
      databaseBoolean(
        row.component_affects_net_salary
      ),

    includeInPayslip:
      databaseBoolean(
        row.component_include_in_payslip
      ),

    baseComponentId:
      nullableId(
        row.base_component_id
      ),

    baseComponentCode:
      row.base_component_code,

    baseComponentName:
      row.base_component_name,

    calculationType:
      row.calculation_type,

    fixedAmount:
      nullableNumber(
        row.fixed_amount
      ),

    percentageValue:
      nullableNumber(
        row.percentage_value
      ),

    formulaExpression:
      row.formula_expression,

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

/*
 * =========================================================
 * Assignment validation
 * =========================================================
 */

function isClosedStatus(
  status: string
): boolean {
  return [
    "CLOSED",
    "INACTIVE",
    "CANCELLED",
    "REJECTED"
  ].includes(
    status.toUpperCase()
  );
}

function assertAssignmentState(
  input: {
    effectiveFrom: string;
    effectiveTo: string | null;
    assignmentStatus: string;
    isCurrent: boolean;
    basicSalary: number;
    referenceGrossSalary: number | null;
  }
): void {
  if (
    input.effectiveTo !== null &&
    input.effectiveTo <
      input.effectiveFrom
  ) {
    throw new AppError({
      message:
        "Effective-to date cannot be before effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_ASSIGNMENT_DATE_RANGE"
    });
  }

  if (
    input.isCurrent &&
    input.effectiveTo !== null
  ) {
    throw new AppError({
      message:
        "A current salary assignment cannot have an effective-to date",

      statusCode: 422,

      code:
        "CURRENT_SALARY_ASSIGNMENT_END_DATE_NOT_ALLOWED"
    });
  }

  if (
    input.isCurrent &&
    isClosedStatus(
      input.assignmentStatus
    )
  ) {
    throw new AppError({
      message:
        "A closed salary assignment cannot be marked as current",

      statusCode: 422,

      code:
        "CLOSED_CURRENT_SALARY_ASSIGNMENT"
    });
  }

  if (
    input.referenceGrossSalary !==
      null &&
    input.referenceGrossSalary <
      input.basicSalary
  ) {
    throw new AppError({
      message:
        "Reference gross salary cannot be lower than basic salary",

      statusCode: 422,

      code:
        "INVALID_REFERENCE_GROSS_SALARY"
    });
  }
}

function assertStructurePeriod(
  structure:
    SalaryStructureDatabaseRow,

  effectiveFrom: string,
  effectiveTo: string | null
): void {
  if (
    !databaseBoolean(
      structure.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected salary structure is inactive",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_INACTIVE"
    });
  }

  const structureFrom =
    requiredDateOnly(
      structure.effective_from
    );

  const structureTo =
    dateOnly(
      structure.effective_to
    );

  if (
    effectiveFrom <
    structureFrom
  ) {
    throw new AppError({
      message:
        "Salary assignment cannot start before the salary structure becomes effective",

      statusCode: 422,

      code:
        "SALARY_ASSIGNMENT_BEFORE_STRUCTURE"
    });
  }

  if (
    structureTo !== null &&
    effectiveFrom >
      structureTo
  ) {
    throw new AppError({
      message:
        "Salary assignment starts after the salary structure has expired",

      statusCode: 422,

      code:
        "SALARY_ASSIGNMENT_AFTER_STRUCTURE"
    });
  }

  if (
    structureTo !== null &&
    effectiveTo !== null &&
    effectiveTo >
      structureTo
  ) {
    throw new AppError({
      message:
        "Salary assignment cannot end after the salary structure expires",

      statusCode: 422,

      code:
        "SALARY_ASSIGNMENT_EXCEEDS_STRUCTURE_PERIOD"
    });
  }
}

function assertGradeSalaryRange(
  grade: PayGradeDatabaseRow,
  basicSalary: number,
  currencyCode: string
): void {
  if (
    !databaseBoolean(
      grade.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected pay grade is inactive",

      statusCode: 422,

      code:
        "PAY_GRADE_INACTIVE"
    });
  }

  if (
    grade.currency_code !==
    currencyCode
  ) {
    throw new AppError({
      message:
        "Pay-grade currency does not match salary-assignment currency",

      statusCode: 422,

      code:
        "PAY_GRADE_CURRENCY_MISMATCH"
    });
  }

  const minimumSalary =
    nullableNumber(
      grade.minimum_salary
    );

  const maximumSalary =
    nullableNumber(
      grade.maximum_salary
    );

  if (
    minimumSalary !== null &&
    basicSalary <
      minimumSalary
  ) {
    throw new AppError({
      message:
        "Basic salary is below the selected pay-grade minimum",

      statusCode: 422,

      code:
        "BASIC_SALARY_BELOW_GRADE_MINIMUM"
    });
  }

  if (
    maximumSalary !== null &&
    basicSalary >
      maximumSalary
  ) {
    throw new AppError({
      message:
        "Basic salary exceeds the selected pay-grade maximum",

      statusCode: 422,

      code:
        "BASIC_SALARY_ABOVE_GRADE_MAXIMUM"
    });
  }
}

async function resolvePayGrade(
  companyId: string,
  structure:
    SalaryStructureDatabaseRow,

  requestedPayGradeId:
    string | null,

  currencyCode: string,
  basicSalary: number
): Promise<{
  payGradeId: string | null;
  payGrade: PayGradeDatabaseRow | null;
}> {
  const structurePayGradeId =
    nullableId(
      structure.pay_grade_id
    );

  if (
    structurePayGradeId !== null &&
    requestedPayGradeId !== null &&
    structurePayGradeId !==
      requestedPayGradeId
  ) {
    throw new AppError({
      message:
        "Selected pay grade does not match the salary structure's pay grade",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_GRADE_MISMATCH"
    });
  }

  const payGradeId =
    structurePayGradeId ??
    requestedPayGradeId;

  if (!payGradeId) {
    return {
      payGradeId: null,
      payGrade: null
    };
  }

  const payGrade =
    await findCompensationPayGradeById(
      companyId,
      payGradeId
    );

  if (!payGrade) {
    throw new AppError({
      message:
        "Pay grade was not found for the employee's company",

      statusCode: 404,

      code:
        "PAY_GRADE_NOT_FOUND"
    });
  }

  assertGradeSalaryRange(
    payGrade,
    basicSalary,
    currencyCode
  );

  return {
    payGradeId,
    payGrade
  };
}

async function resolveBankAccount(
  companyId: string,
  employeeId: string,
  bankAccountId: string | null,
  paymentMethod: string,
  currencyCode: string
): Promise<CompensationBankAccountDatabaseRow | null> {
  if (
    paymentMethod ===
      "BANK_TRANSFER" &&
    bankAccountId === null
  ) {
    throw new AppError({
      message:
        "A bank account is required for bank-transfer salary payments",

      statusCode: 422,

      code:
        "BANK_ACCOUNT_REQUIRED_FOR_TRANSFER"
    });
  }

  if (bankAccountId === null) {
    return null;
  }

  const bankAccount =
    await findCompensationBankAccountById(
      companyId,
      employeeId,
      bankAccountId
    );

  if (!bankAccount) {
    throw new AppError({
      message:
        "The selected bank account was not found for this employee",

      statusCode: 404,

      code:
        "COMPENSATION_BANK_ACCOUNT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      bankAccount.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected bank account is inactive",

      statusCode: 422,

      code:
        "COMPENSATION_BANK_ACCOUNT_INACTIVE"
    });
  }

  if (
    bankAccount.currency_code !==
    currencyCode
  ) {
    throw new AppError({
      message:
        "Bank-account currency does not match salary currency",

      statusCode: 422,

      code:
        "BANK_ACCOUNT_CURRENCY_MISMATCH"
    });
  }

  return bankAccount;
}

function assertAssignmentMutable(
  assignment:
    EmployeeSalaryAssignmentDatabaseRow
): void {
  if (
    assignment.approved_at !== null
  ) {
    throw new AppError({
      message:
        "An approved salary assignment cannot be edited. Close it and create a new assignment instead.",

      statusCode: 409,

      code:
        "APPROVED_SALARY_ASSIGNMENT_IMMUTABLE"
    });
  }

  if (
    isClosedStatus(
      assignment.assignment_status
    )
  ) {
    throw new AppError({
      message:
        "A closed salary assignment cannot be edited",

      statusCode: 409,

      code:
        "CLOSED_SALARY_ASSIGNMENT_IMMUTABLE"
    });
  }
}

async function getSalaryAssignmentOrThrow(
  employeeId: string,
  salaryAssignmentId: string
): Promise<EmployeeSalaryAssignmentDatabaseRow> {
  const assignment =
    await findEmployeeSalaryAssignmentRecord(
      employeeId,
      salaryAssignmentId
    );

  if (!assignment) {
    throw new AppError({
      message:
        "Employee salary assignment was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SALARY_ASSIGNMENT_NOT_FOUND"
    });
  }

  return assignment;
}

/*
 * =========================================================
 * Component validation
 * =========================================================
 */

function assertComponentConfiguration(
  input: {
    payComponentId: string;
    baseComponentId: string | null;
    calculationType: string;
    fixedAmount: number | null;
    percentageValue: number | null;
    formulaExpression: string | null;
  }
): void {
  if (
    input.baseComponentId !== null &&
    input.baseComponentId ===
      input.payComponentId
  ) {
    throw new AppError({
      message:
        "A salary component cannot use itself as its base component",

      statusCode: 422,

      code:
        "SALARY_COMPONENT_SELF_REFERENCE"
    });
  }

  if (
    input.calculationType ===
    "FIXED"
  ) {
    if (input.fixedAmount === null) {
      throw new AppError({
        message:
          "Fixed amount is required for a FIXED component",

        statusCode: 422,

        code:
          "FIXED_AMOUNT_REQUIRED"
      });
    }

    if (
      input.percentageValue !== null ||
      input.formulaExpression !== null
    ) {
      throw new AppError({
        message:
          "Percentage and formula values are not allowed for a FIXED component",

        statusCode: 422,

        code:
          "INVALID_FIXED_COMPONENT_CONFIGURATION"
      });
    }

    return;
  }

  if (
    input.calculationType ===
    "PERCENTAGE"
  ) {
    if (
      input.percentageValue === null
    ) {
      throw new AppError({
        message:
          "Percentage value is required for a PERCENTAGE component",

        statusCode: 422,

        code:
          "PERCENTAGE_VALUE_REQUIRED"
      });
    }

    if (
      input.baseComponentId === null
    ) {
      throw new AppError({
        message:
          "Base component is required for a PERCENTAGE component",

        statusCode: 422,

        code:
          "BASE_COMPONENT_REQUIRED"
      });
    }

    if (
      input.fixedAmount !== null ||
      input.formulaExpression !== null
    ) {
      throw new AppError({
        message:
          "Fixed and formula values are not allowed for a PERCENTAGE component",

        statusCode: 422,

        code:
          "INVALID_PERCENTAGE_COMPONENT_CONFIGURATION"
      });
    }

    return;
  }

  if (
    input.calculationType ===
    "FORMULA"
  ) {
    if (
      !input.formulaExpression ||
      input.formulaExpression.trim() ===
        ""
    ) {
      throw new AppError({
        message:
          "Formula expression is required for a FORMULA component",

        statusCode: 422,

        code:
          "FORMULA_EXPRESSION_REQUIRED"
      });
    }

    if (
      input.fixedAmount !== null ||
      input.percentageValue !== null
    ) {
      throw new AppError({
        message:
          "Fixed and percentage values are not allowed for a FORMULA component",

        statusCode: 422,

        code:
          "INVALID_FORMULA_COMPONENT_CONFIGURATION"
      });
    }

    return;
  }

  throw new AppError({
    message:
      "Unsupported salary-component calculation type",

    statusCode: 422,

    code:
      "UNSUPPORTED_COMPONENT_CALCULATION_TYPE"
  });
}

function assertComponentPeriod(
  assignment:
    EmployeeSalaryAssignmentDatabaseRow,

  effectiveFrom: string,
  effectiveTo: string | null,
  isActive: boolean
): void {
  const assignmentFrom =
    requiredDateOnly(
      assignment.effective_from
    );

  const assignmentTo =
    dateOnly(
      assignment.effective_to
    );

  if (
    effectiveTo !== null &&
    effectiveTo <
      effectiveFrom
  ) {
    throw new AppError({
      message:
        "Component effective-to date cannot be before effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_COMPONENT_DATE_RANGE"
    });
  }

  if (
    effectiveFrom <
      assignmentFrom
  ) {
    throw new AppError({
      message:
        "Salary component cannot start before its salary assignment",

      statusCode: 422,

      code:
        "COMPONENT_BEFORE_SALARY_ASSIGNMENT"
    });
  }

  if (
    assignmentTo !== null &&
    (
      effectiveFrom >
        assignmentTo ||
      (
        effectiveTo !== null &&
        effectiveTo >
          assignmentTo
      )
    )
  ) {
    throw new AppError({
      message:
        "Salary component period cannot exceed its salary-assignment period",

      statusCode: 422,

      code:
        "COMPONENT_EXCEEDS_SALARY_ASSIGNMENT"
    });
  }

  if (
    isActive &&
    effectiveTo !== null
  ) {
    throw new AppError({
      message:
        "An active salary component cannot have an effective-to date",

      statusCode: 422,

      code:
        "ACTIVE_COMPONENT_END_DATE_NOT_ALLOWED"
    });
  }
}

async function validateComponentReferences(
  companyId: string,
  employeeId: string,
  salaryAssignmentId: string,
  payComponentId: string,
  baseComponentId: string | null
): Promise<void> {
  const payComponent =
    await findCompensationPayComponentById(
      companyId,
      payComponentId
    );

  if (!payComponent) {
    throw new AppError({
      message:
        "Pay component was not found for the employee's company",

      statusCode: 404,

      code:
        "PAY_COMPONENT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      payComponent.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected pay component is inactive",

      statusCode: 422,

      code:
        "PAY_COMPONENT_INACTIVE"
    });
  }

  if (baseComponentId === null) {
    return;
  }

  const baseComponent =
    await findCompensationPayComponentById(
      companyId,
      baseComponentId
    );

  if (!baseComponent) {
    throw new AppError({
      message:
        "Base pay component was not found for the employee's company",

      statusCode: 404,

      code:
        "BASE_PAY_COMPONENT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      baseComponent.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected base component is inactive",

      statusCode: 422,

      code:
        "BASE_PAY_COMPONENT_INACTIVE"
    });
  }

  const assignmentComponents =
    await listEmployeeSalaryComponentRecords(
      employeeId,
      salaryAssignmentId,
      {
        includeInactive: true
      }
    );

  const baseExistsInAssignment =
    assignmentComponents.some(
      (component) =>
        String(
          component.pay_component_id
        ) === baseComponentId
    );

  if (!baseExistsInAssignment) {
    throw new AppError({
      message:
        "Base component is not included in this employee's salary assignment",

      statusCode: 422,

      code:
        "BASE_COMPONENT_NOT_IN_ASSIGNMENT"
    });
  }
}

function translateRepositoryError(
  error: unknown
): never {
  if (
    error instanceof Error &&
    error.message ===
      "EMPLOYEE_NOT_FOUND"
  ) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "EMPLOYEE_COMPANY_MISMATCH"
  ) {
    throw new AppError({
      message:
        "Employee and salary assignment company do not match",

      statusCode: 409,

      code:
        "EMPLOYEE_COMPANY_MISMATCH"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "SALARY_ASSIGNMENT_CURRENT_DATE_CONFLICT"
  ) {
    throw new AppError({
      message:
        "The new current salary assignment must start after the existing current assignment",

      statusCode: 409,

      code:
        "SALARY_ASSIGNMENT_CURRENT_DATE_CONFLICT"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "SALARY_ASSIGNMENT_PERIOD_OVERLAP"
  ) {
    throw new AppError({
      message:
        "Salary-assignment period overlaps another assignment for this employee",

      statusCode: 409,

      code:
        "SALARY_ASSIGNMENT_PERIOD_OVERLAP"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "INVALID_SALARY_ASSIGNMENT_CLOSE_DATE"
  ) {
    throw new AppError({
      message:
        "Salary-assignment close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_ASSIGNMENT_CLOSE_DATE"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "SALARY_ASSIGNMENT_NOT_FOUND"
  ) {
    throw new AppError({
      message:
        "Employee salary assignment was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SALARY_ASSIGNMENT_NOT_FOUND"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "SALARY_COMPONENT_ACTIVE_DATE_CONFLICT"
  ) {
    throw new AppError({
      message:
        "The new active salary component must start after the existing active component",

      statusCode: 409,

      code:
        "SALARY_COMPONENT_ACTIVE_DATE_CONFLICT"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "SALARY_COMPONENT_PERIOD_OVERLAP"
  ) {
    throw new AppError({
      message:
        "Salary-component period overlaps another record for the same component",

      statusCode: 409,

      code:
        "SALARY_COMPONENT_PERIOD_OVERLAP"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "INVALID_SALARY_COMPONENT_CLOSE_DATE"
  ) {
    throw new AppError({
      message:
        "Salary-component close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_COMPONENT_CLOSE_DATE"
    });
  }

  const databaseError =
    error as {
      code?: string;
      errno?: number;
    };

  if (
    databaseError.code ===
      "ER_DUP_ENTRY" ||
    databaseError.errno === 1062
  ) {
    throw new AppError({
      message:
        "A compensation record already exists with the same effective date",

      statusCode: 409,

      code:
        "COMPENSATION_RECORD_EXISTS"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

export async function getCompensationLookups(
  employeeId: string,
  query: CompensationLookupQuery,
  auth: AuthContext
): Promise<{
  payComponents: PayComponentResponse[];
  payGrades: PayGradeResponse[];
  salaryStructures: SalaryStructureResponse[];
  salaryStructureComponents:
    SalaryStructureComponentResponse[];
  bankAccounts:
    CompensationBankAccountResponse[];
}> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const companyId =
    String(employee.company_id);

  const [
    payComponents,
    payGrades,
    salaryStructures,
    bankAccounts
  ] = await Promise.all([
    listCompensationPayComponentRecords(
      companyId,
      {
        search:
          query.search,

        includeInactive:
          query.includeInactive
      }
    ),

    listCompensationPayGradeRecords(
      companyId,
      {
        search:
          query.search,

        includeInactive:
          query.includeInactive
      }
    ),

    listCompensationSalaryStructureRecords(
      companyId,
      {
        search:
          query.search,

        includeInactive:
          query.includeInactive
      }
    ),

    listCompensationBankAccountRecords(
      companyId,
      employeeId,
      query.includeInactive
    )
  ]);

  const salaryStructureComponents =
    query.salaryStructureId
      ? await listCompensationSalaryStructureComponentRecords(
          companyId,
          {
            search:
              query.search,

            includeInactive:
              query.includeInactive,

            salaryStructureId:
              query.salaryStructureId
          }
        )
      : [];

  return {
    payComponents:
      payComponents.map(
        mapPayComponent
      ),

    payGrades:
      payGrades.map(
        mapPayGrade
      ),

    salaryStructures:
      salaryStructures.map(
        mapSalaryStructure
      ),

    salaryStructureComponents:
      salaryStructureComponents.map(
        mapSalaryStructureComponent
      ),

    bankAccounts:
      bankAccounts.map(
        mapBankAccount
      )
  };
}

/*
 * =========================================================
 * Salary assignments
 * =========================================================
 */

export async function listSalaryAssignments(
  employeeId: string,
  query: SalaryAssignmentListQuery,
  auth: AuthContext
): Promise<EmployeeSalaryAssignmentResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeSalaryAssignmentRecords(
      employeeId,
      {
        status:
          query.status,

        assignmentStatus:
          query.assignmentStatus,

        salaryStructureId:
          query.salaryStructureId,

        payGradeId:
          query.payGradeId
      }
    );

  return records.map(
    mapSalaryAssignment
  );
}

export async function getSalaryAssignment(
  employeeId: string,
  salaryAssignmentId: string,
  auth: AuthContext
): Promise<EmployeeSalaryAssignmentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const assignment =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  return mapSalaryAssignment(
    assignment
  );
}

export async function createSalaryAssignment(
  employeeId: string,
  input: CreateSalaryAssignmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const companyId =
    String(employee.company_id);

  const structure =
    await findCompensationSalaryStructureById(
      companyId,
      input.salaryStructureId
    );

  if (!structure) {
    throw new AppError({
      message:
        "Salary structure was not found for the employee's company",

      statusCode: 404,

      code:
        "SALARY_STRUCTURE_NOT_FOUND"
    });
  }

  const payrollFrequency =
    input.payrollFrequency ??
    structure.payroll_frequency;

  const currencyCode =
    input.currencyCode ??
    structure.currency_code;

  if (
    payrollFrequency !==
      structure.payroll_frequency
  ) {
    throw new AppError({
      message:
        "Payroll frequency must match the selected salary structure",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_FREQUENCY_MISMATCH"
    });
  }

  if (
    currencyCode !==
      structure.currency_code
  ) {
    throw new AppError({
      message:
        "Currency must match the selected salary structure",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_CURRENCY_MISMATCH"
    });
  }

  const effectiveTo =
    input.effectiveTo ?? null;

  assertAssignmentState({
    effectiveFrom:
      input.effectiveFrom,

    effectiveTo,

    assignmentStatus:
      input.assignmentStatus,

    isCurrent:
      input.isCurrent,

    basicSalary:
      input.basicSalary,

    referenceGrossSalary:
      input.referenceGrossSalary ??
      null
  });

  assertStructurePeriod(
    structure,
    input.effectiveFrom,
    effectiveTo
  );

  const {
    payGradeId
  } = await resolvePayGrade(
    companyId,
    structure,
    input.payGradeId ?? null,
    currencyCode,
    input.basicSalary
  );

  await resolveBankAccount(
    companyId,
    employeeId,
    input.bankAccountId ?? null,
    input.paymentMethod,
    currencyCode
  );

  const record:
  CreateSalaryAssignmentRecord = {
    companyId,
    employeeId,

    salaryStructureId:
      input.salaryStructureId,

    payGradeId,

    bankAccountId:
      input.bankAccountId ?? null,

    payrollFrequency,
    paymentMethod:
      input.paymentMethod,

    currencyCode,

    basicSalary:
      input.basicSalary,

    referenceGrossSalary:
      input.referenceGrossSalary ??
      null,

    effectiveFrom:
      input.effectiveFrom,

    effectiveTo,

    assignmentStatus:
      input.assignmentStatus,

    isCurrent:
      input.isCurrent,

    remarks:
      input.remarks ?? null
  };

  try {
    const created =
      await createEmployeeSalaryAssignmentRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapSalaryAssignment(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateSalaryAssignment(
  employeeId: string,
  salaryAssignmentId: string,
  input: UpdateSalaryAssignmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  assertAssignmentMutable(
    existing
  );

  if (
    input.salaryStructureId !==
      undefined &&
    input.salaryStructureId !==
      String(
        existing.salary_structure_id
      )
  ) {
    throw new AppError({
      message:
        "Salary structure cannot be changed on an existing assignment. Create a new assignment instead.",

      statusCode: 409,

      code:
        "SALARY_STRUCTURE_CHANGE_NOT_ALLOWED"
    });
  }

  if (
    input.isCurrent === false &&
    databaseBoolean(
      existing.is_current
    ) &&
    input.effectiveTo === undefined
  ) {
    throw new AppError({
      message:
        "Use the close endpoint when ending a current salary assignment",

      statusCode: 422,

      code:
        "SALARY_ASSIGNMENT_CLOSE_ENDPOINT_REQUIRED"
    });
  }

  const companyId =
    String(employee.company_id);

  const structure =
    await findCompensationSalaryStructureById(
      companyId,
      String(
        existing.salary_structure_id
      )
    );

  if (!structure) {
    throw new AppError({
      message:
        "Salary structure was not found",

      statusCode: 404,

      code:
        "SALARY_STRUCTURE_NOT_FOUND"
    });
  }

  const payrollFrequency =
    input.payrollFrequency ??
    existing.payroll_frequency;

  const paymentMethod =
    input.paymentMethod ??
    existing.payment_method;

  const currencyCode =
    input.currencyCode ??
    existing.currency_code;

  const basicSalary =
    input.basicSalary ??
    Number(
      existing.basic_salary
    );

  const referenceGrossSalary =
    input.referenceGrossSalary !==
      undefined
      ? input.referenceGrossSalary
      : nullableNumber(
          existing.reference_gross_salary
        );

  const effectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  let effectiveTo =
    input.effectiveTo !== undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  const isCurrent =
    input.isCurrent !== undefined
      ? input.isCurrent
      : databaseBoolean(
          existing.is_current
        );

  if (
    input.isCurrent === true &&
    input.effectiveTo === undefined
  ) {
    effectiveTo = null;
  }

  const assignmentStatus =
    input.assignmentStatus ??
    existing.assignment_status;

  if (
    payrollFrequency !==
      structure.payroll_frequency
  ) {
    throw new AppError({
      message:
        "Payroll frequency must match the salary structure",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_FREQUENCY_MISMATCH"
    });
  }

  if (
    currencyCode !==
      structure.currency_code
  ) {
    throw new AppError({
      message:
        "Currency must match the salary structure",

      statusCode: 422,

      code:
        "SALARY_STRUCTURE_CURRENCY_MISMATCH"
    });
  }

  assertAssignmentState({
    effectiveFrom,
    effectiveTo,
    assignmentStatus,
    isCurrent,
    basicSalary,
    referenceGrossSalary
  });

  assertStructurePeriod(
    structure,
    effectiveFrom,
    effectiveTo
  );

  const requestedPayGradeId =
    input.payGradeId !== undefined
      ? input.payGradeId
      : nullableId(
          existing.pay_grade_id
        );

  await resolvePayGrade(
    companyId,
    structure,
    requestedPayGradeId,
    currencyCode,
    basicSalary
  );

  const bankAccountId =
    input.bankAccountId !== undefined
      ? input.bankAccountId
      : nullableId(
          existing.bank_account_id
        );

  await resolveBankAccount(
    companyId,
    employeeId,
    bankAccountId,
    paymentMethod,
    currencyCode
  );

  const record:
  UpdateSalaryAssignmentRecord = {
    ...(input.payGradeId !== undefined
      ? {
          payGradeId:
            input.payGradeId
        }
      : {}),

    ...(input.bankAccountId !== undefined
      ? {
          bankAccountId:
            input.bankAccountId
        }
      : {}),

    ...(input.payrollFrequency !==
    undefined
      ? {
          payrollFrequency:
            input.payrollFrequency
        }
      : {}),

    ...(input.paymentMethod !==
    undefined
      ? {
          paymentMethod:
            input.paymentMethod
        }
      : {}),

    ...(input.currencyCode !== undefined
      ? {
          currencyCode:
            input.currencyCode
        }
      : {}),

    ...(input.basicSalary !== undefined
      ? {
          basicSalary:
            input.basicSalary
        }
      : {}),

    ...(input.referenceGrossSalary !==
    undefined
      ? {
          referenceGrossSalary:
            input.referenceGrossSalary
        }
      : {}),

    ...(input.effectiveFrom !== undefined
      ? {
          effectiveFrom:
            input.effectiveFrom
        }
      : {}),

    ...(input.effectiveTo !== undefined
      ? {
          effectiveTo:
            input.effectiveTo
        }
      : input.isCurrent === true
        ? {
            effectiveTo: null
          }
        : {}),

    ...(input.assignmentStatus !==
    undefined
      ? {
          assignmentStatus:
            input.assignmentStatus
        }
      : {}),

    ...(input.isCurrent !== undefined
      ? {
          isCurrent:
            input.isCurrent
        }
      : {}),

    ...(input.remarks !== undefined
      ? {
          remarks:
            input.remarks
        }
      : {})
  };

  try {
    const updated =
      await updateEmployeeSalaryAssignmentRecord(
        employeeId,
        salaryAssignmentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee salary assignment was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SALARY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapSalaryAssignment(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function closeSalaryAssignment(
  employeeId: string,
  salaryAssignmentId: string,
  input: CloseSalaryAssignmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  if (
    isClosedStatus(
      existing.assignment_status
    ) ||
    !databaseBoolean(
      existing.is_current
    )
  ) {
    throw new AppError({
      message:
        "Salary assignment is already closed or historical",

      statusCode: 409,

      code:
        "SALARY_ASSIGNMENT_ALREADY_CLOSED"
    });
  }

  if (
    input.effectiveTo <
    requiredDateOnly(
      existing.effective_from
    )
  ) {
    throw new AppError({
      message:
        "Salary-assignment close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_ASSIGNMENT_CLOSE_DATE"
    });
  }

  try {
    const closed =
      await closeEmployeeSalaryAssignmentRecord(
        employeeId,
        salaryAssignmentId,
        input.effectiveTo,
        input.assignmentStatus,
        createActor(auth),
        metadata
      );

    if (!closed) {
      throw new AppError({
        message:
          "Employee salary assignment was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SALARY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapSalaryAssignment(
      closed
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function approveSalaryAssignment(
  employeeId: string,
  salaryAssignmentId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryAssignmentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertApprovalAccess(
    auth,
    employee
  );

  const existing =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  if (
    existing.approved_at !== null
  ) {
    throw new AppError({
      message:
        "Salary assignment is already approved",

      statusCode: 409,

      code:
        "SALARY_ASSIGNMENT_ALREADY_APPROVED"
    });
  }

  if (
    isClosedStatus(
      existing.assignment_status
    )
  ) {
    throw new AppError({
      message:
        "A closed salary assignment cannot be approved",

      statusCode: 409,

      code:
        "CLOSED_SALARY_ASSIGNMENT_APPROVAL_DENIED"
    });
  }

  if (
    existing.payment_method ===
      "BANK_TRANSFER"
  ) {
    const bankAccountId =
      nullableId(
        existing.bank_account_id
      );

    if (!bankAccountId) {
      throw new AppError({
        message:
          "A bank account is required before approving a bank-transfer salary assignment",

        statusCode: 422,

        code:
          "BANK_ACCOUNT_REQUIRED_FOR_APPROVAL"
      });
    }

    const bankAccount =
      await findCompensationBankAccountById(
        String(employee.company_id),
        employeeId,
        bankAccountId
      );

    if (
      !bankAccount ||
      !databaseBoolean(
        bankAccount.is_active
      )
    ) {
      throw new AppError({
        message:
          "The selected bank account is unavailable or inactive",

        statusCode: 422,

        code:
          "BANK_ACCOUNT_UNAVAILABLE_FOR_APPROVAL"
      });
    }

    if (
      !databaseBoolean(
        bankAccount.is_verified
      )
    ) {
      throw new AppError({
        message:
          "Bank account must be verified before salary assignment approval",

        statusCode: 422,

        code:
          "BANK_ACCOUNT_VERIFICATION_REQUIRED"
      });
    }
  }

  try {
    const approved =
      await approveEmployeeSalaryAssignmentRecord(
        employeeId,
        salaryAssignmentId,
        auth.userId,
        createActor(auth),
        metadata
      );

    if (!approved) {
      throw new AppError({
        message:
          "Employee salary assignment was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SALARY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapSalaryAssignment(
      approved
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Employee salary components
 * =========================================================
 */

export async function listSalaryComponents(
  employeeId: string,
  salaryAssignmentId: string,
  query: EmployeeSalaryComponentListQuery,
  auth: AuthContext
): Promise<EmployeeSalaryComponentResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  await getSalaryAssignmentOrThrow(
    employeeId,
    salaryAssignmentId
  );

  const records =
    await listEmployeeSalaryComponentRecords(
      employeeId,
      salaryAssignmentId,
      {
        includeInactive:
          query.includeInactive,

        payComponentId:
          query.payComponentId,

        calculationType:
          query.calculationType
      }
    );

  return records.map(
    mapSalaryComponent
  );
}

export async function createSalaryComponent(
  employeeId: string,
  salaryAssignmentId: string,
  input: CreateEmployeeSalaryComponentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const assignment =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  assertAssignmentMutable(
    assignment
  );

  assertComponentConfiguration({
    payComponentId:
      input.payComponentId,

    baseComponentId:
      input.baseComponentId ?? null,

    calculationType:
      input.calculationType,

    fixedAmount:
      input.fixedAmount ?? null,

    percentageValue:
      input.percentageValue ?? null,

    formulaExpression:
      input.formulaExpression ?? null
  });

  assertComponentPeriod(
    assignment,
    input.effectiveFrom,
    input.effectiveTo ?? null,
    input.isActive
  );

  await validateComponentReferences(
    String(employee.company_id),
    employeeId,
    salaryAssignmentId,
    input.payComponentId,
    input.baseComponentId ?? null
  );

  const record:
  CreateEmployeeSalaryComponentRecord = {
    salaryAssignmentId,

    payComponentId:
      input.payComponentId,

    baseComponentId:
      input.baseComponentId ?? null,

    calculationType:
      input.calculationType,

    fixedAmount:
      input.fixedAmount ?? null,

    percentageValue:
      input.percentageValue ?? null,

    formulaExpression:
      input.formulaExpression ?? null,

    effectiveFrom:
      input.effectiveFrom,

    effectiveTo:
      input.effectiveTo ?? null,

    isActive:
      input.isActive
  };

  try {
    const created =
      await createEmployeeSalaryComponentRecord(
        employeeId,
        record,
        createActor(auth),
        metadata
      );

    return mapSalaryComponent(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateSalaryComponent(
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string,
  input: UpdateEmployeeSalaryComponentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const assignment =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  assertAssignmentMutable(
    assignment
  );

  const existing =
    await findEmployeeSalaryComponentRecord(
      employeeId,
      salaryAssignmentId,
      employeeSalaryComponentId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee salary component was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SALARY_COMPONENT_NOT_FOUND"
    });
  }

  if (
    input.isActive === false &&
    databaseBoolean(
      existing.is_active
    ) &&
    input.effectiveTo === undefined
  ) {
    throw new AppError({
      message:
        "Use the close endpoint when ending an active salary component",

      statusCode: 422,

      code:
        "SALARY_COMPONENT_CLOSE_ENDPOINT_REQUIRED"
    });
  }

  const calculationType =
    input.calculationType ??
    existing.calculation_type;

  const payComponentId =
    input.payComponentId ??
    String(
      existing.pay_component_id
    );

  let baseComponentId =
    input.baseComponentId !== undefined
      ? input.baseComponentId
      : nullableId(
          existing.base_component_id
        );

  let fixedAmount =
    input.fixedAmount !== undefined
      ? input.fixedAmount
      : nullableNumber(
          existing.fixed_amount
        );

  let percentageValue =
    input.percentageValue !== undefined
      ? input.percentageValue
      : nullableNumber(
          existing.percentage_value
        );

  let formulaExpression =
    input.formulaExpression !== undefined
      ? input.formulaExpression
      : existing.formula_expression;

  if (
    input.calculationType ===
    "FIXED"
  ) {
    percentageValue = null;
    formulaExpression = null;
    baseComponentId = null;
  }

  if (
    input.calculationType ===
    "PERCENTAGE"
  ) {
    fixedAmount = null;
    formulaExpression = null;
  }

  if (
    input.calculationType ===
    "FORMULA"
  ) {
    fixedAmount = null;
    percentageValue = null;
  }

  const effectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  let effectiveTo =
    input.effectiveTo !== undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  const isActive =
    input.isActive !== undefined
      ? input.isActive
      : databaseBoolean(
          existing.is_active
        );

  if (
    input.isActive === true &&
    input.effectiveTo === undefined
  ) {
    effectiveTo = null;
  }

  assertComponentConfiguration({
    payComponentId,
    baseComponentId,
    calculationType,
    fixedAmount,
    percentageValue,
    formulaExpression
  });

  assertComponentPeriod(
    assignment,
    effectiveFrom,
    effectiveTo,
    isActive
  );

  await validateComponentReferences(
    String(employee.company_id),
    employeeId,
    salaryAssignmentId,
    payComponentId,
    baseComponentId
  );

  const record:
  UpdateEmployeeSalaryComponentRecord = {
    ...(input.payComponentId !== undefined
      ? {
          payComponentId:
            input.payComponentId
        }
      : {}),

    ...(
      input.baseComponentId !== undefined ||
      input.calculationType === "FIXED"
        ? {
            baseComponentId
          }
        : {}
    ),

    ...(input.calculationType !== undefined
      ? {
          calculationType:
            input.calculationType
        }
      : {}),

    ...(
      input.fixedAmount !== undefined ||
      input.calculationType !== undefined
        ? {
            fixedAmount
          }
        : {}
    ),

    ...(
      input.percentageValue !== undefined ||
      input.calculationType !== undefined
        ? {
            percentageValue
          }
        : {}
    ),

    ...(
      input.formulaExpression !== undefined ||
      input.calculationType !== undefined
        ? {
            formulaExpression
          }
        : {}
    ),

    ...(input.effectiveFrom !== undefined
      ? {
          effectiveFrom:
            input.effectiveFrom
        }
      : {}),

    ...(input.effectiveTo !== undefined
      ? {
          effectiveTo:
            input.effectiveTo
        }
      : input.isActive === true
        ? {
            effectiveTo: null
          }
        : {}),

    ...(input.isActive !== undefined
      ? {
          isActive:
            input.isActive
        }
      : {})
  };

  try {
    const updated =
      await updateEmployeeSalaryComponentRecord(
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee salary component was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SALARY_COMPONENT_NOT_FOUND"
      });
    }

    return mapSalaryComponent(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function closeSalaryComponent(
  employeeId: string,
  salaryAssignmentId: string,
  employeeSalaryComponentId: string,
  input: CloseEmployeeSalaryComponentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSalaryComponentResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const assignment =
    await getSalaryAssignmentOrThrow(
      employeeId,
      salaryAssignmentId
    );

  assertAssignmentMutable(
    assignment
  );

  const existing =
    await findEmployeeSalaryComponentRecord(
      employeeId,
      salaryAssignmentId,
      employeeSalaryComponentId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee salary component was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SALARY_COMPONENT_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      existing.is_active
    )
  ) {
    throw new AppError({
      message:
        "Salary component is already closed or inactive",

      statusCode: 409,

      code:
        "SALARY_COMPONENT_ALREADY_CLOSED"
    });
  }

  if (
    input.effectiveTo <
    requiredDateOnly(
      existing.effective_from
    )
  ) {
    throw new AppError({
      message:
        "Salary-component close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_SALARY_COMPONENT_CLOSE_DATE"
    });
  }

  const assignmentTo =
    dateOnly(
      assignment.effective_to
    );

  if (
    assignmentTo !== null &&
    input.effectiveTo >
      assignmentTo
  ) {
    throw new AppError({
      message:
        "Salary component cannot close after its salary assignment",

      statusCode: 422,

      code:
        "COMPONENT_CLOSE_DATE_EXCEEDS_ASSIGNMENT"
    });
  }

  try {
    const closed =
      await closeEmployeeSalaryComponentRecord(
        employeeId,
        salaryAssignmentId,
        employeeSalaryComponentId,
        input.effectiveTo,
        createActor(auth),
        metadata
      );

    if (!closed) {
      throw new AppError({
        message:
          "Employee salary component was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SALARY_COMPONENT_NOT_FOUND"
      });
    }

    return mapSalaryComponent(
      closed
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export interface EmployeeCompensationOwnerDatabaseRow {
  employee_id: DatabaseId;
  company_id: DatabaseId;

  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;
}

/*
 * =========================================================
 * Pay components
 * =========================================================
 */

export interface PayComponentDatabaseRow {
  pay_component_id: DatabaseId;
  company_id: DatabaseId;

  component_code: string;
  component_name: string;
  description: string | null;

  component_type: string;
  calculation_type: string;

  default_amount:
    | string
    | number
    | null;

  default_percentage:
    | string
    | number
    | null;

  is_taxable: number | boolean;
  is_pensionable: number | boolean;
  is_proratable: number | boolean;

  affects_gross_salary:
    | number
    | boolean;

  affects_net_salary:
    | number
    | boolean;

  is_recurring: number | boolean;

  include_in_payslip:
    | number
    | boolean;

  expense_account_code:
    string | null;

  liability_account_code:
    string | null;

  sort_order:
    | string
    | number;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface PayComponentResponse {
  payComponentId: string;
  companyId: string;

  componentCode: string;
  componentName: string;
  description: string | null;

  componentType: string;
  calculationType: string;

  defaultAmount: number | null;
  defaultPercentage: number | null;

  isTaxable: boolean;
  isPensionable: boolean;
  isProratable: boolean;

  affectsGrossSalary: boolean;
  affectsNetSalary: boolean;

  isRecurring: boolean;
  includeInPayslip: boolean;

  expenseAccountCode: string | null;
  liabilityAccountCode: string | null;

  sortOrder: number;
  isActive: boolean;
}

/*
 * =========================================================
 * Pay grades
 * =========================================================
 */

export interface PayGradeDatabaseRow {
  pay_grade_id: DatabaseId;
  company_id: DatabaseId;

  grade_code: string;
  grade_name: string;
  description: string | null;

  minimum_salary:
    | string
    | number
    | null;

  midpoint_salary:
    | string
    | number
    | null;

  maximum_salary:
    | string
    | number
    | null;

  currency_code: string;

  grade_level:
    | string
    | number
    | null;

  sort_order:
    | string
    | number;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface PayGradeResponse {
  payGradeId: string;
  companyId: string;

  gradeCode: string;
  gradeName: string;
  description: string | null;

  minimumSalary: number | null;
  midpointSalary: number | null;
  maximumSalary: number | null;

  currencyCode: string;
  gradeLevel: number | null;
  sortOrder: number;

  isActive: boolean;
}

/*
 * =========================================================
 * Salary structures
 * =========================================================
 */

export interface SalaryStructureDatabaseRow {
  salary_structure_id: DatabaseId;
  company_id: DatabaseId;

  pay_grade_id:
    DatabaseId | null;

  pay_grade_code:
    string | null;

  pay_grade_name:
    string | null;

  structure_code: string;
  structure_name: string;
  description: string | null;

  payroll_frequency: string;
  currency_code: string;

  effective_from:
    | Date
    | string;

  effective_to:
    | Date
    | string
    | null;

  is_default:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  deleted_at:
    | Date
    | string
    | null;

  component_count:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface SalaryStructureResponse {
  salaryStructureId: string;
  companyId: string;

  payGradeId: string | null;
  payGradeCode: string | null;
  payGradeName: string | null;

  structureCode: string;
  structureName: string;
  description: string | null;

  payrollFrequency: string;
  currencyCode: string;

  effectiveFrom: string;
  effectiveTo: string | null;

  isDefault: boolean;
  isActive: boolean;

  componentCount: number;
}

/*
 * =========================================================
 * Salary structure components
 * =========================================================
 */

export interface SalaryStructureComponentDatabaseRow {
  structure_component_id:
    DatabaseId;

  salary_structure_id:
    DatabaseId;

  pay_component_id:
    DatabaseId;

  component_code: string;
  component_name: string;
  component_type: string;

  base_component_id:
    DatabaseId | null;

  base_component_code:
    string | null;

  base_component_name:
    string | null;

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

  minimum_amount:
    | string
    | number
    | null;

  maximum_amount:
    | string
    | number
    | null;

  is_mandatory:
    | number
    | boolean;

  is_active:
    | number
    | boolean;

  sort_order:
    | string
    | number;

  created_at:
    | Date
    | string;

  updated_at:
    | Date
    | string;
}

export interface SalaryStructureComponentResponse {
  structureComponentId: string;
  salaryStructureId: string;

  payComponentId: string;
  componentCode: string;
  componentName: string;
  componentType: string;

  baseComponentId: string | null;
  baseComponentCode: string | null;
  baseComponentName: string | null;

  calculationType: string;

  fixedAmount: number | null;
  percentageValue: number | null;
  formulaExpression: string | null;

  minimumAmount: number | null;
  maximumAmount: number | null;

  isMandatory: boolean;
  isActive: boolean;
  sortOrder: number;
}

/*
 * =========================================================
 * Bank-account lookup
 * =========================================================
 */

export interface CompensationBankAccountDatabaseRow {
  bank_account_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;

  bank_name: string;
  branch_name: string | null;
  account_title: string;

  account_number_last4:
    string | null;

  iban_last4:
    string | null;

  currency_code: string;

  payment_priority:
    | string
    | number;

  is_primary:
    | number
    | boolean;

  is_verified:
    | number
    | boolean;

  is_active:
    | number
    | boolean;
}

export interface CompensationBankAccountResponse {
  bankAccountId: string;
  employeeId: string;

  bankName: string;
  branchName: string | null;
  accountTitle: string;

  accountNumberLast4: string | null;
  accountNumberMasked: string | null;

  ibanLast4: string | null;
  ibanMasked: string | null;

  currencyCode: string;
  paymentPriority: number;

  isPrimary: boolean;
  isVerified: boolean;
  isActive: boolean;
}

/*
 * =========================================================
 * Salary assignments
 * =========================================================
 */

export interface EmployeeSalaryAssignmentDatabaseRow {
  salary_assignment_id:
    DatabaseId;

  company_id:
    DatabaseId;

  employee_id:
    DatabaseId;

  salary_structure_id:
    DatabaseId;

  structure_code: string;
  structure_name: string;

  structure_pay_grade_id:
    DatabaseId | null;

  structure_payroll_frequency:
    string;

  structure_currency_code:
    string;

  structure_effective_from:
    Date | string;

  structure_effective_to:
    Date | string | null;

  structure_is_active:
    number | boolean;

  structure_deleted_at:
    Date | string | null;

  pay_grade_id:
    DatabaseId | null;

  grade_code:
    string | null;

  grade_name:
    string | null;

  grade_minimum_salary:
    | string
    | number
    | null;

  grade_midpoint_salary:
    | string
    | number
    | null;

  grade_maximum_salary:
    | string
    | number
    | null;

  grade_currency_code:
    string | null;

  bank_account_id:
    DatabaseId | null;

  bank_name:
    string | null;

  bank_account_title:
    string | null;

  bank_account_last4:
    string | null;

  bank_account_currency_code:
    string | null;

  bank_account_is_active:
    | number
    | boolean
    | null;

  bank_account_deleted_at:
    Date | string | null;

  payroll_frequency: string;
  payment_method: string;
  currency_code: string;

  basic_salary:
    | string
    | number;

  reference_gross_salary:
    | string
    | number
    | null;

  effective_from:
    Date | string;

  effective_to:
    Date | string | null;

  assignment_status: string;

  is_current:
    | number
    | boolean;

  approved_by_user_id:
    DatabaseId | null;

  approver_username:
    string | null;

  approver_full_name:
    string | null;

  approved_at:
    Date | string | null;

  remarks:
    string | null;

  component_count:
    | string
    | number;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeSalaryAssignmentResponse {
  salaryAssignmentId: string;
  companyId: string;
  employeeId: string;

  salaryStructureId: string;
  structureCode: string;
  structureName: string;

  payGradeId: string | null;
  gradeCode: string | null;
  gradeName: string | null;

  bankAccountId: string | null;
  bankName: string | null;
  bankAccountTitle: string | null;
  bankAccountLast4: string | null;
  bankAccountMasked: string | null;

  payrollFrequency: string;
  paymentMethod: string;
  currencyCode: string;

  basicSalary: number;
  referenceGrossSalary: number | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  assignmentStatus: string;
  isCurrent: boolean;

  approvedByUserId: string | null;
  approverUsername: string | null;
  approverFullName: string | null;
  approvedAt: string | null;

  remarks: string | null;

  componentCount: number;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Employee salary components
 * =========================================================
 */

export interface EmployeeSalaryComponentDatabaseRow {
  employee_salary_component_id:
    DatabaseId;

  salary_assignment_id:
    DatabaseId;

  employee_id:
    DatabaseId;

  company_id:
    DatabaseId;

  pay_component_id:
    DatabaseId;

  component_code: string;
  component_name: string;
  component_type: string;

  component_is_taxable:
    number | boolean;

  component_is_pensionable:
    number | boolean;

  component_affects_gross_salary:
    number | boolean;

  component_affects_net_salary:
    number | boolean;

  component_include_in_payslip:
    number | boolean;

  base_component_id:
    DatabaseId | null;

  base_component_code:
    string | null;

  base_component_name:
    string | null;

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
    Date | string;

  effective_to:
    Date | string | null;

  is_active:
    number | boolean;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeSalaryComponentResponse {
  employeeSalaryComponentId: string;
  salaryAssignmentId: string;

  employeeId: string;
  companyId: string;

  payComponentId: string;
  componentCode: string;
  componentName: string;
  componentType: string;

  isTaxable: boolean;
  isPensionable: boolean;
  affectsGrossSalary: boolean;
  affectsNetSalary: boolean;
  includeInPayslip: boolean;

  baseComponentId: string | null;
  baseComponentCode: string | null;
  baseComponentName: string | null;

  calculationType: string;

  fixedAmount: number | null;
  percentageValue: number | null;
  formulaExpression: string | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Repository create/update records
 * =========================================================
 */

export interface CreateSalaryAssignmentRecord {
  companyId: string;
  employeeId: string;

  salaryStructureId: string;
  payGradeId: string | null;
  bankAccountId: string | null;

  payrollFrequency: string;
  paymentMethod: string;
  currencyCode: string;

  basicSalary: number;
  referenceGrossSalary: number | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  assignmentStatus: string;
  isCurrent: boolean;

  remarks: string | null;
}

export interface UpdateSalaryAssignmentRecord {
  salaryStructureId?:
    | string
    | undefined;

  payGradeId?:
    | string
    | null
    | undefined;

  bankAccountId?:
    | string
    | null
    | undefined;

  payrollFrequency?:
    | string
    | undefined;

  paymentMethod?:
    | string
    | undefined;

  currencyCode?:
    | string
    | undefined;

  basicSalary?:
    | number
    | undefined;

  referenceGrossSalary?:
    | number
    | null
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;

  assignmentStatus?:
    | string
    | undefined;

  isCurrent?:
    | boolean
    | undefined;

  remarks?:
    | string
    | null
    | undefined;
}

export interface CreateEmployeeSalaryComponentRecord {
  salaryAssignmentId: string;
  payComponentId: string;

  baseComponentId: string | null;

  calculationType: string;

  fixedAmount: number | null;
  percentageValue: number | null;
  formulaExpression: string | null;

  effectiveFrom: string;
  effectiveTo: string | null;

  isActive: boolean;
}

export interface UpdateEmployeeSalaryComponentRecord {
  payComponentId?:
    | string
    | undefined;

  baseComponentId?:
    | string
    | null
    | undefined;

  calculationType?:
    | string
    | undefined;

  fixedAmount?:
    | number
    | null
    | undefined;

  percentageValue?:
    | number
    | null
    | undefined;

  formulaExpression?:
    | string
    | null
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Shared
 * =========================================================
 */

export interface EmployeeCompensationActor {
  userId: string;
  employeeId: string | null;
  companyId: string | null;
  isPlatformAdmin: boolean;
  permissions: string[];
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
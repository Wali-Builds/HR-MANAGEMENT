export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export interface EmployeeFinanceOwnerDatabaseRow {
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
 * Tax rule lookup
 * =========================================================
 */

export interface TaxRuleDatabaseRow {
  tax_rule_id: DatabaseId;
  company_id: DatabaseId;

  tax_rule_code: string;
  tax_rule_name: string;

  country_code: string;
  region_code: string | null;

  tax_year_start: Date | string;
  tax_year_end: Date | string;

  calculation_method: string;

  annual_exemption_amount:
    | string
    | number;

  fixed_rebate_amount:
    | string
    | number;

  description: string | null;

  is_active:
    | number
    | boolean;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface TaxRuleResponse {
  taxRuleId: string;
  companyId: string;

  taxRuleCode: string;
  taxRuleName: string;

  countryCode: string;
  regionCode: string | null;

  taxYearStart: string;
  taxYearEnd: string;

  calculationMethod: string;

  annualExemptionAmount: number;
  fixedRebateAmount: number;

  description: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

/*
 * =========================================================
 * Employee bank accounts
 * =========================================================
 */

export interface EmployeeBankAccountDatabaseRow {
  bank_account_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;

  bank_name: string;
  bank_code: string | null;

  branch_name: string | null;
  branch_code: string | null;

  account_title: string;

  account_number_last4:
    string | null;

  iban_last4:
    string | null;

  account_type: string;
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

  verified_by_user_id:
    DatabaseId | null;

  verifier_username:
    string | null;

  verifier_full_name:
    string | null;

  verified_at:
    Date | string | null;

  deleted_at:
    Date | string | null;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeBankAccountResponse {
  bankAccountId: string;
  companyId: string;
  employeeId: string;

  bankName: string;
  bankCode: string | null;

  branchName: string | null;
  branchCode: string | null;

  accountTitle: string;

  accountNumberLast4: string | null;
  accountNumberMasked: string | null;

  ibanLast4: string | null;
  ibanMasked: string | null;

  accountType: string;
  currencyCode: string;

  paymentPriority: number;

  isPrimary: boolean;
  isVerified: boolean;
  isActive: boolean;

  verifiedByUserId: string | null;
  verifierUsername: string | null;
  verifierFullName: string | null;
  verifiedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeBankAccountRecord {
  companyId: string;
  employeeId: string;

  bankName: string;
  bankCode: string | null;

  branchName: string | null;
  branchCode: string | null;

  accountTitle: string;

  accountNumberEncrypted: Buffer;
  accountNumberLast4: string;

  ibanEncrypted: Buffer | null;
  ibanLast4: string | null;

  accountType: string;
  currencyCode: string;

  paymentPriority: number;

  isPrimary: boolean;
  isActive: boolean;
}

export interface UpdateEmployeeBankAccountRecord {
  bankName?:
    | string
    | undefined;

  bankCode?:
    | string
    | null
    | undefined;

  branchName?:
    | string
    | null
    | undefined;

  branchCode?:
    | string
    | null
    | undefined;

  accountTitle?:
    | string
    | undefined;

  accountNumberEncrypted?:
    | Buffer
    | undefined;

  accountNumberLast4?:
    | string
    | undefined;

  ibanEncrypted?:
    | Buffer
    | null
    | undefined;

  ibanLast4?:
    | string
    | null
    | undefined;

  accountType?:
    | string
    | undefined;

  currencyCode?:
    | string
    | undefined;

  paymentPriority?:
    | number
    | undefined;

  isPrimary?:
    | boolean
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Employee tax profiles
 * =========================================================
 */

export interface EmployeeTaxProfileDatabaseRow {
  employee_tax_profile_id:
    DatabaseId;

  company_id:
    DatabaseId;

  employee_id:
    DatabaseId;

  tax_rule_id:
    DatabaseId;

  tax_rule_code: string;
  tax_rule_name: string;

  country_code: string;
  region_code: string | null;

  tax_year_start:
    Date | string;

  tax_year_end:
    Date | string;

  calculation_method: string;

  rule_annual_exemption_amount:
    | string
    | number;

  rule_fixed_rebate_amount:
    | string
    | number;

  tax_identifier:
    string | null;

  taxpayer_status:
    string;

  annual_tax_credit:
    | string
    | number;

  annual_tax_exemption:
    | string
    | number;

  additional_tax_amount:
    | string
    | number;

  effective_from:
    Date | string;

  effective_to:
    Date | string | null;

  is_current:
    | number
    | boolean;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeTaxProfileResponse {
  employeeTaxProfileId: string;

  companyId: string;
  employeeId: string;
  taxRuleId: string;

  taxRuleCode: string;
  taxRuleName: string;

  countryCode: string;
  regionCode: string | null;

  taxYearStart: string;
  taxYearEnd: string;

  calculationMethod: string;

  ruleAnnualExemptionAmount: number;
  ruleFixedRebateAmount: number;

  taxIdentifier: string | null;
  taxpayerStatus: string;

  annualTaxCredit: number;
  annualTaxExemption: number;
  additionalTaxAmount: number;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeTaxProfileRecord {
  companyId: string;
  employeeId: string;
  taxRuleId: string;

  taxIdentifier: string | null;
  taxpayerStatus: string;

  annualTaxCredit: number;
  annualTaxExemption: number;
  additionalTaxAmount: number;

  effectiveFrom: string;
  effectiveTo: string | null;

  isCurrent: boolean;
}

export interface UpdateEmployeeTaxProfileRecord {
  taxRuleId?:
    | string
    | undefined;

  taxIdentifier?:
    | string
    | null
    | undefined;

  taxpayerStatus?:
    | string
    | undefined;

  annualTaxCredit?:
    | number
    | undefined;

  annualTaxExemption?:
    | number
    | undefined;

  additionalTaxAmount?:
    | number
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  effectiveTo?:
    | string
    | null
    | undefined;

  isCurrent?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Shared
 * =========================================================
 */

export interface EmployeeFinanceActor {
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
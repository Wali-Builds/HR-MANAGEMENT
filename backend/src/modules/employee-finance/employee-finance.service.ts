import {
  AppError
} from "../../common/errors/app-error.js";

import {
  encryptSensitiveField,
  getSensitiveValueLastFour,
  maskSensitiveValue
} from "../../common/security/sensitive-field-crypto.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  closeEmployeeTaxProfileRecord,
  createEmployeeBankAccountRecord,
  createEmployeeTaxProfileRecord,
  deleteEmployeeBankAccountRecord,
  findActiveTaxRuleById,
  findEmployeeBankAccountRecord,
  findEmployeeFinanceOwnerById,
  findEmployeeTaxProfileRecord,
  listEmployeeBankAccountRecords,
  listEmployeeTaxProfileRecords,
  listTaxRuleRecords,
  updateEmployeeBankAccountRecord,
  updateEmployeeTaxProfileRecord
} from "./employee-finance.repository.js";

import type {
  CloseEmployeeTaxProfileInput,
  CreateEmployeeBankAccountInput,
  CreateEmployeeTaxProfileInput,
  EmployeeBankAccountListQuery,
  EmployeeFinanceLookupQuery,
  EmployeeTaxProfileListQuery,
  UpdateEmployeeBankAccountInput,
  UpdateEmployeeTaxProfileInput
} from "./employee-finance.schema.js";

import type {
  CreateEmployeeBankAccountRecord,
  CreateEmployeeTaxProfileRecord,
  EmployeeBankAccountDatabaseRow,
  EmployeeBankAccountResponse,
  EmployeeFinanceActor,
  EmployeeFinanceOwnerDatabaseRow,
  EmployeeTaxProfileDatabaseRow,
  EmployeeTaxProfileResponse,
  RequestMetadata,
  TaxRuleDatabaseRow,
  TaxRuleResponse,
  UpdateEmployeeBankAccountRecord,
  UpdateEmployeeTaxProfileRecord
} from "./employee-finance.types.js";

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

function numberValue(
  value:
    | string
    | number
): number {
  return Number(value);
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
    /^\d{4}-\d{2}-\d{2}/.test(value)
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

function requiredDateOnly(
  value: Date | string
): string {
  return dateOnly(value) as string;
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

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
}

function requiredDateTimeIso(
  value: Date | string
): string {
  return dateTimeIso(value) as string;
}

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
  // edited by wali: Allow linked Company Administrators to manage employee finance records in their company.
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
  ) || (isTenantCompanyAdmin && permissionCode.startsWith("employee."));
}

function createActor(
  auth: AuthContext
): EmployeeFinanceActor {
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

function mapTaxRule(
  rule: TaxRuleDatabaseRow
): TaxRuleResponse {
  return {
    taxRuleId:
      String(rule.tax_rule_id),

    companyId:
      String(rule.company_id),

    taxRuleCode:
      rule.tax_rule_code,

    taxRuleName:
      rule.tax_rule_name,

    countryCode:
      rule.country_code,

    regionCode:
      rule.region_code,

    taxYearStart:
      requiredDateOnly(
        rule.tax_year_start
      ),

    taxYearEnd:
      requiredDateOnly(
        rule.tax_year_end
      ),

    calculationMethod:
      rule.calculation_method,

    annualExemptionAmount:
      numberValue(
        rule.annual_exemption_amount
      ),

    fixedRebateAmount:
      numberValue(
        rule.fixed_rebate_amount
      ),

    description:
      rule.description,

    isActive:
      databaseBoolean(
        rule.is_active
      ),

    createdAt:
      requiredDateTimeIso(
        rule.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        rule.updated_at
      )
  };
}

function mapBankAccount(
  account: EmployeeBankAccountDatabaseRow
): EmployeeBankAccountResponse {
  return {
    bankAccountId:
      String(account.bank_account_id),

    companyId:
      String(account.company_id),

    employeeId:
      String(account.employee_id),

    bankName:
      account.bank_name,

    bankCode:
      account.bank_code,

    branchName:
      account.branch_name,

    branchCode:
      account.branch_code,

    accountTitle:
      account.account_title,

    accountNumberLast4:
      account.account_number_last4,

    accountNumberMasked:
      maskSensitiveValue(
        account.account_number_last4
      ),

    ibanLast4:
      account.iban_last4,

    ibanMasked:
      maskSensitiveValue(
        account.iban_last4
      ),

    accountType:
      account.account_type,

    currencyCode:
      account.currency_code,

    paymentPriority:
      Number(
        account.payment_priority
      ),

    isPrimary:
      databaseBoolean(
        account.is_primary
      ),

    isVerified:
      databaseBoolean(
        account.is_verified
      ),

    isActive:
      databaseBoolean(
        account.is_active
      ),

    verifiedByUserId:
      nullableId(
        account.verified_by_user_id
      ),

    verifierUsername:
      account.verifier_username,

    verifierFullName:
      account.verifier_full_name,

    verifiedAt:
      dateTimeIso(
        account.verified_at
      ),

    createdAt:
      requiredDateTimeIso(
        account.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        account.updated_at
      )
  };
}

function mapTaxProfile(
  profile: EmployeeTaxProfileDatabaseRow
): EmployeeTaxProfileResponse {
  return {
    employeeTaxProfileId:
      String(
        profile.employee_tax_profile_id
      ),

    companyId:
      String(profile.company_id),

    employeeId:
      String(profile.employee_id),

    taxRuleId:
      String(profile.tax_rule_id),

    taxRuleCode:
      profile.tax_rule_code,

    taxRuleName:
      profile.tax_rule_name,

    countryCode:
      profile.country_code,

    regionCode:
      profile.region_code,

    taxYearStart:
      requiredDateOnly(
        profile.tax_year_start
      ),

    taxYearEnd:
      requiredDateOnly(
        profile.tax_year_end
      ),

    calculationMethod:
      profile.calculation_method,

    ruleAnnualExemptionAmount:
      numberValue(
        profile
          .rule_annual_exemption_amount
      ),

    ruleFixedRebateAmount:
      numberValue(
        profile
          .rule_fixed_rebate_amount
      ),

    taxIdentifier:
      profile.tax_identifier,

    taxpayerStatus:
      profile.taxpayer_status,

    annualTaxCredit:
      numberValue(
        profile.annual_tax_credit
      ),

    annualTaxExemption:
      numberValue(
        profile.annual_tax_exemption
      ),

    additionalTaxAmount:
      numberValue(
        profile.additional_tax_amount
      ),

    effectiveFrom:
      requiredDateOnly(
        profile.effective_from
      ),

    effectiveTo:
      dateOnly(
        profile.effective_to
      ),

    isCurrent:
      databaseBoolean(
        profile.is_current
      ),

    createdAt:
      requiredDateTimeIso(
        profile.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        profile.updated_at
      )
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeFinanceOwnerDatabaseRow> {
  const employee =
    await findEmployeeFinanceOwnerById(
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
  employee: EmployeeFinanceOwnerDatabaseRow
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
  employee: EmployeeFinanceOwnerDatabaseRow
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
      "employee.view_all"
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
      "You do not have permission to view this employee's finance records",

    statusCode: 403,

    code:
      "EMPLOYEE_FINANCE_VIEW_DENIED"
  });
}

function assertManageAccess(
  auth: AuthContext,
  employee: EmployeeFinanceOwnerDatabaseRow
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
      "employee.update"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage employee finance records",

    statusCode: 403,

    code:
      "EMPLOYEE_FINANCE_UPDATE_DENIED"
  });
}

function assertBankAccountState(
  state: {
    isPrimary: boolean;
    isActive: boolean;
  }
): void {
  if (
    state.isPrimary &&
    !state.isActive
  ) {
    throw new AppError({
      message:
        "An inactive bank account cannot be primary",

      statusCode: 422,

      code:
        "INACTIVE_PRIMARY_BANK_ACCOUNT"
    });
  }
}

function assertTaxProfileState(
  state: {
    effectiveFrom: string;
    effectiveTo: string | null;
    isCurrent: boolean;
  }
): void {
  if (
    state.effectiveTo !== null &&
    state.effectiveTo <
      state.effectiveFrom
  ) {
    throw new AppError({
      message:
        "Effective-to date cannot be before effective-from date",

      statusCode: 422,

      code:
        "INVALID_TAX_PROFILE_DATE_RANGE"
    });
  }

  if (
    state.isCurrent &&
    state.effectiveTo !== null
  ) {
    throw new AppError({
      message:
        "A current tax profile cannot have an effective-to date",

      statusCode: 422,

      code:
        "CURRENT_TAX_PROFILE_END_DATE_NOT_ALLOWED"
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
        "Employee and finance record company do not match",

      statusCode: 409,

      code:
        "EMPLOYEE_COMPANY_MISMATCH"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "TAX_PROFILE_PERIOD_OVERLAP"
  ) {
    throw new AppError({
      message:
        "The tax-profile period overlaps another profile for this employee",

      statusCode: 409,

      code:
        "TAX_PROFILE_PERIOD_OVERLAP"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "TAX_PROFILE_CURRENT_DATE_CONFLICT"
  ) {
    throw new AppError({
      message:
        "The new current tax profile must start after the existing current profile",

      statusCode: 409,

      code:
        "TAX_PROFILE_CURRENT_DATE_CONFLICT"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "INVALID_TAX_PROFILE_CLOSE_DATE"
  ) {
    throw new AppError({
      message:
        "Tax-profile close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_TAX_PROFILE_CLOSE_DATE"
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
        "A tax profile already exists for this employee with the same effective-from date",

      statusCode: 409,

      code:
        "EMPLOYEE_TAX_PROFILE_EXISTS"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

export async function getEmployeeFinanceLookups(
  employeeId: string,
  query: EmployeeFinanceLookupQuery,
  auth: AuthContext
): Promise<{
  taxRules: TaxRuleResponse[];
}> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listTaxRuleRecords(
      String(employee.company_id),
      query.search,
      query.includeInactiveTaxRules
    );

  return {
    taxRules:
      records.map(mapTaxRule)
  };
}

/*
 * =========================================================
 * Bank accounts
 * =========================================================
 */

export async function listEmployeeBankAccounts(
  employeeId: string,
  query: EmployeeBankAccountListQuery,
  auth: AuthContext
): Promise<EmployeeBankAccountResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeBankAccountRecords(
      employeeId,
      {
        search:
          query.search,

        includeInactive:
          query.includeInactive,

        primaryOnly:
          query.primaryOnly,

        verifiedOnly:
          query.verifiedOnly
      }
    );

  return records.map(
    mapBankAccount
  );
}

export async function getEmployeeBankAccount(
  employeeId: string,
  bankAccountId: string,
  auth: AuthContext
): Promise<EmployeeBankAccountResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const account =
    await findEmployeeBankAccountRecord(
      employeeId,
      bankAccountId
    );

  if (!account) {
    throw new AppError({
      message:
        "Employee bank account was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_BANK_ACCOUNT_NOT_FOUND"
    });
  }

  return mapBankAccount(account);
}

export async function createEmployeeBankAccount(
  employeeId: string,
  input: CreateEmployeeBankAccountInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeBankAccountResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  assertBankAccountState({
    isPrimary:
      input.isPrimary,

    isActive:
      input.isActive
  });

  const accountNumberEncrypted =
    encryptSensitiveField(
      input.accountNumber,
      "BANK_ACCOUNT_NUMBER"
    );

  const ibanEncrypted =
    input.iban
      ? encryptSensitiveField(
          input.iban,
          "IBAN"
        )
      : null;

  const record:
  CreateEmployeeBankAccountRecord = {
    companyId:
      String(employee.company_id),

    employeeId,

    bankName:
      input.bankName,

    bankCode:
      input.bankCode ?? null,

    branchName:
      input.branchName ?? null,

    branchCode:
      input.branchCode ?? null,

    accountTitle:
      input.accountTitle,

    accountNumberEncrypted,

    accountNumberLast4:
      getSensitiveValueLastFour(
        input.accountNumber
      ),

    ibanEncrypted,

    ibanLast4:
      input.iban
        ? getSensitiveValueLastFour(
            input.iban
          )
        : null,

    accountType:
      input.accountType,

    currencyCode:
      input.currencyCode,

    paymentPriority:
      input.paymentPriority,

    isPrimary:
      input.isPrimary,

    isActive:
      input.isActive
  };

  try {
    const created =
      await createEmployeeBankAccountRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapBankAccount(created);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeBankAccount(
  employeeId: string,
  bankAccountId: string,
  input: UpdateEmployeeBankAccountInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeBankAccountResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeBankAccountRecord(
      employeeId,
      bankAccountId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee bank account was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_BANK_ACCOUNT_NOT_FOUND"
    });
  }

  const resultingIsActive =
    input.isActive !== undefined
      ? input.isActive
      : databaseBoolean(
          existing.is_active
        );

  const resultingIsPrimary =
    input.isPrimary !== undefined
      ? input.isPrimary
      : databaseBoolean(
          existing.is_primary
        );

  assertBankAccountState({
    isPrimary:
      resultingIsPrimary,

    isActive:
      resultingIsActive
  });

  const record:
  UpdateEmployeeBankAccountRecord = {
    ...(input.bankName !== undefined
      ? {
          bankName:
            input.bankName
        }
      : {}),

    ...(input.bankCode !== undefined
      ? {
          bankCode:
            input.bankCode
        }
      : {}),

    ...(input.branchName !== undefined
      ? {
          branchName:
            input.branchName
        }
      : {}),

    ...(input.branchCode !== undefined
      ? {
          branchCode:
            input.branchCode
        }
      : {}),

    ...(input.accountTitle !== undefined
      ? {
          accountTitle:
            input.accountTitle
        }
      : {}),

    ...(input.accountNumber !== undefined
      ? {
          accountNumberEncrypted:
            encryptSensitiveField(
              input.accountNumber,
              "BANK_ACCOUNT_NUMBER"
            ),

          accountNumberLast4:
            getSensitiveValueLastFour(
              input.accountNumber
            )
        }
      : {}),

    ...(input.iban !== undefined
      ? input.iban === null
        ? {
            ibanEncrypted: null,
            ibanLast4: null
          }
        : {
            ibanEncrypted:
              encryptSensitiveField(
                input.iban,
                "IBAN"
              ),

            ibanLast4:
              getSensitiveValueLastFour(
                input.iban
              )
          }
      : {}),

    ...(input.accountType !== undefined
      ? {
          accountType:
            input.accountType
        }
      : {}),

    ...(input.currencyCode !== undefined
      ? {
          currencyCode:
            input.currencyCode
        }
      : {}),

    ...(input.paymentPriority !==
    undefined
      ? {
          paymentPriority:
            input.paymentPriority
        }
      : {}),

    ...(input.isPrimary !== undefined
      ? {
          isPrimary:
            input.isPrimary
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
      await updateEmployeeBankAccountRecord(
        employeeId,
        bankAccountId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee bank account was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_BANK_ACCOUNT_NOT_FOUND"
      });
    }

    return mapBankAccount(updated);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeBankAccount(
  employeeId: string,
  bankAccountId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  try {
    const deleted =
      await deleteEmployeeBankAccountRecord(
        employeeId,
        bankAccountId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Employee bank account was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_BANK_ACCOUNT_NOT_FOUND"
      });
    }
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Tax profiles
 * =========================================================
 */

export async function listEmployeeTaxProfiles(
  employeeId: string,
  query: EmployeeTaxProfileListQuery,
  auth: AuthContext
): Promise<EmployeeTaxProfileResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeTaxProfileRecords(
      employeeId,
      {
        status:
          query.status,

        taxRuleId:
          query.taxRuleId
      }
    );

  return records.map(
    mapTaxProfile
  );
}

export async function getEmployeeTaxProfile(
  employeeId: string,
  taxProfileId: string,
  auth: AuthContext
): Promise<EmployeeTaxProfileResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const profile =
    await findEmployeeTaxProfileRecord(
      employeeId,
      taxProfileId
    );

  if (!profile) {
    throw new AppError({
      message:
        "Employee tax profile was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_TAX_PROFILE_NOT_FOUND"
    });
  }

  return mapTaxProfile(profile);
}

export async function createEmployeeTaxProfile(
  employeeId: string,
  input: CreateEmployeeTaxProfileInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileResponse> {
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

  const taxRule =
    await findActiveTaxRuleById(
      companyId,
      input.taxRuleId
    );

  if (!taxRule) {
    throw new AppError({
      message:
        "An active tax rule belonging to the employee's company was not found",

      statusCode: 404,

      code:
        "TAX_RULE_NOT_FOUND"
    });
  }

  assertTaxProfileState({
    effectiveFrom:
      input.effectiveFrom,

    effectiveTo:
      input.effectiveTo ?? null,

    isCurrent:
      input.isCurrent
  });

  const record:
  CreateEmployeeTaxProfileRecord = {
    companyId,
    employeeId,

    taxRuleId:
      input.taxRuleId,

    taxIdentifier:
      input.taxIdentifier ?? null,

    taxpayerStatus:
      input.taxpayerStatus,

    annualTaxCredit:
      input.annualTaxCredit,

    annualTaxExemption:
      input.annualTaxExemption,

    additionalTaxAmount:
      input.additionalTaxAmount,

    effectiveFrom:
      input.effectiveFrom,

    effectiveTo:
      input.effectiveTo ?? null,

    isCurrent:
      input.isCurrent
  };

  try {
    const created =
      await createEmployeeTaxProfileRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapTaxProfile(created);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeTaxProfile(
  employeeId: string,
  taxProfileId: string,
  input: UpdateEmployeeTaxProfileInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeTaxProfileRecord(
      employeeId,
      taxProfileId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee tax profile was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_TAX_PROFILE_NOT_FOUND"
    });
  }

  if (input.taxRuleId !== undefined) {
    const taxRule =
      await findActiveTaxRuleById(
        String(employee.company_id),
        input.taxRuleId
      );

    if (!taxRule) {
      throw new AppError({
        message:
          "An active tax rule belonging to the employee's company was not found",

        statusCode: 404,

        code:
          "TAX_RULE_NOT_FOUND"
      });
    }
  }

  const resultingEffectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  const resultingIsCurrent =
    input.isCurrent !== undefined
      ? input.isCurrent
      : databaseBoolean(
          existing.is_current
        );

  let resultingEffectiveTo =
    input.effectiveTo !== undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  if (
    input.isCurrent === true &&
    input.effectiveTo === undefined
  ) {
    resultingEffectiveTo = null;
  }

  assertTaxProfileState({
    effectiveFrom:
      resultingEffectiveFrom,

    effectiveTo:
      resultingEffectiveTo,

    isCurrent:
      resultingIsCurrent
  });

  const record:
  UpdateEmployeeTaxProfileRecord = {
    ...(input.taxRuleId !== undefined
      ? {
          taxRuleId:
            input.taxRuleId
        }
      : {}),

    ...(input.taxIdentifier !== undefined
      ? {
          taxIdentifier:
            input.taxIdentifier
        }
      : {}),

    ...(input.taxpayerStatus !== undefined
      ? {
          taxpayerStatus:
            input.taxpayerStatus
        }
      : {}),

    ...(input.annualTaxCredit !==
    undefined
      ? {
          annualTaxCredit:
            input.annualTaxCredit
        }
      : {}),

    ...(input.annualTaxExemption !==
    undefined
      ? {
          annualTaxExemption:
            input.annualTaxExemption
        }
      : {}),

    ...(input.additionalTaxAmount !==
    undefined
      ? {
          additionalTaxAmount:
            input.additionalTaxAmount
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

    ...(input.isCurrent !== undefined
      ? {
          isCurrent:
            input.isCurrent
        }
      : {})
  };

  try {
    const updated =
      await updateEmployeeTaxProfileRecord(
        employeeId,
        taxProfileId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee tax profile was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_TAX_PROFILE_NOT_FOUND"
      });
    }

    return mapTaxProfile(updated);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function closeEmployeeTaxProfile(
  employeeId: string,
  taxProfileId: string,
  input: CloseEmployeeTaxProfileInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeTaxProfileResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeTaxProfileRecord(
      employeeId,
      taxProfileId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee tax profile was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_TAX_PROFILE_NOT_FOUND"
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
        "Tax-profile close date cannot be before its effective-from date",

      statusCode: 422,

      code:
        "INVALID_TAX_PROFILE_CLOSE_DATE"
    });
  }

  try {
    const closed =
      await closeEmployeeTaxProfileRecord(
        employeeId,
        taxProfileId,
        input.effectiveTo,
        createActor(auth),
        metadata
      );

    if (!closed) {
      throw new AppError({
        message:
          "Employee tax profile was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_TAX_PROFILE_NOT_FOUND"
      });
    }

    return mapTaxProfile(closed);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

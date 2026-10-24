import { AppError } from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createCompanyRecord,
  findCompanyIdentityById,
  findCompanyById,
  findCompanyIdByCode,
  listCompanyRecords,
  softDeleteCompanyRecord,
  updateCompanyRecord
} from "./company.repository.js";

import type {
  CompanyListQuery,
  CreateCompanyInput,
  UpdateCompanyInput
} from "./company.schema.js";

import type {
  CompanyActor,
  CompanyDatabaseRow,
  CompanyResponse,
  RequestMetadata
} from "./company.types.js";

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function dateToIsoString(
  value: Date | string
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
}

function mapCompany(
  company: CompanyDatabaseRow
): CompanyResponse {
  return {
    companyId:
      String(company.company_id),

    companyCode:
      company.company_code,

    legalName:
      company.legal_name,

    displayName:
      company.display_name,

    registrationNumber:
      company.registration_number,

    taxNumber:
      company.tax_number,

    industry:
      company.industry,

    officialEmail:
      company.official_email,

    officialPhone:
      company.official_phone,

    websiteUrl:
      company.website_url,

    addressLine1:
      company.address_line_1,

    addressLine2:
      company.address_line_2,

    city:
      company.city,

    district:
      company.district,

    province:
      company.province,

    postalCode:
      company.postal_code,

    countryCode:
      company.country_code,

    timezone:
      company.timezone,

    currencyCode:
      company.currency_code,

    dateFormat:
      company.date_format,

    logoPath:
      company.logo_path,

    employeeCodePrefix:
      company.employee_code_prefix,

    employeeCodeLength:
      Number(
        company.employee_code_length
      ),

    isActive:
      databaseBoolean(
        company.is_active
      ),

    // edited by wali: Expose the soft-delete timestamp for the deleted-company view.
    deletedAt: company.deleted_at === null
      ? null
      : dateToIsoString(company.deleted_at),

    createdAt:
      dateToIsoString(
        company.created_at
      ),

    updatedAt:
      dateToIsoString(
        company.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): CompanyActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function assertCompanyAccess(
  auth: AuthContext,
  companyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    auth.companyId !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company",
      statusCode: 403,
      code:
        "COMPANY_ACCESS_DENIED"
    });
  }
}

export async function getOwnCompanyIdentity(
  auth: AuthContext
): Promise<{ companyId: string; displayName: string }> {
  if (!auth.companyId) {
    throw new AppError({
      message: "No company is assigned to this account",
      statusCode: 403,
      code: "COMPANY_SCOPE_REQUIRED"
    });
  }

  const company = await findCompanyIdentityById(auth.companyId);
  if (!company) {
    throw new AppError({
      message: "Company was not found",
      statusCode: 404,
      code: "COMPANY_NOT_FOUND"
    });
  }

  return {
    companyId: String(company.company_id),
    displayName: company.display_name
  };
}

export async function listCompanies(
  query: CompanyListQuery,
  auth: AuthContext
): Promise<{
  companies: CompanyResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  // edited by wali: Deleted company records are visible only to platform administrators.
  if (query.isDeleted === true && !auth.isPlatformAdmin) {
    throw new AppError({
      message: "Only a Platform Administrator can view deleted companies",
      statusCode: 403,
      code: "PLATFORM_ADMIN_REQUIRED"
    });
  }

  if (
    !auth.isPlatformAdmin &&
    !auth.companyId
  ) {
    throw new AppError({
      message:
        "No company is assigned to this account",
      statusCode: 403,
      code:
        "COMPANY_SCOPE_REQUIRED"
    });
  }

const result = await listCompanyRecords({
  page: query.page,
  limit: query.limit,
  sortBy: query.sortBy,
  sortOrder: query.sortOrder,

  scopeCompanyId: auth.isPlatformAdmin
    ? null
    : auth.companyId,

  ...(query.search !== undefined
    ? {
        search: query.search
      }
    : {}),

  ...(query.isActive !== undefined
    ? {
        isActive: query.isActive
      }
    : {}),

  ...(query.isDeleted !== undefined
    ? {
        isDeleted: query.isDeleted
      }
    : {})
});
  return {
    companies:
      result.companies.map(
        mapCompany
      ),

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total:
        result.total,

      totalPages:
        Math.ceil(
          result.total /
            query.limit
        )
    }
  };
}

export async function getCompany(
  companyId: string,
  auth: AuthContext
): Promise<CompanyResponse> {
  assertCompanyAccess(
    auth,
    companyId
  );

  const company =
    await findCompanyById(
      companyId
    );

  if (!company) {
    throw new AppError({
      message:
        "Company was not found",
      statusCode: 404,
      code:
        "COMPANY_NOT_FOUND"
    });
  }

  return mapCompany(company);
}

export async function createCompany(
  input: CreateCompanyInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CompanyResponse> {
  if (!auth.isPlatformAdmin) {
    throw new AppError({
      message:
        "Only a Platform Administrator can create a company",
      statusCode: 403,
      code:
        "PLATFORM_ADMIN_REQUIRED"
    });
  }

  const duplicateCompanyId =
    await findCompanyIdByCode(
      input.companyCode
    );

  if (duplicateCompanyId) {
    throw new AppError({
      message:
        "This company code is already in use",
      statusCode: 409,
      code:
        "COMPANY_CODE_EXISTS"
    });
  }

  const company =
    await createCompanyRecord(
      input,
      createActor(auth),
      metadata
    );

  return mapCompany(company);
}

export async function updateCompany(
  companyId: string,
  input: UpdateCompanyInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<CompanyResponse> {
  assertCompanyAccess(
    auth,
    companyId
  );

  if (
    input.companyCode !== undefined
  ) {
    const duplicateCompanyId =
      await findCompanyIdByCode(
        input.companyCode,
        companyId
      );

    if (duplicateCompanyId) {
      throw new AppError({
        message:
          "This company code is already in use",
        statusCode: 409,
        code:
          "COMPANY_CODE_EXISTS"
      });
    }
  }

  const company =
    await updateCompanyRecord(
      companyId,
      input,
      createActor(auth),
      metadata
    );

  if (!company) {
    throw new AppError({
      message:
        "Company was not found",
      statusCode: 404,
      code:
        "COMPANY_NOT_FOUND"
    });
  }

  return mapCompany(company);
}

export async function deleteCompany(
  companyId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  if (!auth.isPlatformAdmin) {
    throw new AppError({
      message:
        "Only a Platform Administrator can delete a company",
      statusCode: 403,
      code:
        "PLATFORM_ADMIN_REQUIRED"
    });
  }

  const deleted =
    await softDeleteCompanyRecord(
      companyId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Company was not found",
      statusCode: 404,
      code:
        "COMPANY_NOT_FOUND"
    });
  }
}

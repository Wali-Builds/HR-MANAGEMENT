import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createBranchRecord,
  findActiveCompanyById,
  findBranchById,
  findBranchCodeConflict,
  findExistingHeadOfficeBranch,
  listBranchRecords,
  softDeleteBranchRecord,
  updateBranchRecord
} from "./branch.repository.js";

import type {
  BranchListQuery,
  CreateBranchInput,
  UpdateBranchInput
} from "./branch.schema.js";

import type {
  BranchActor,
  BranchDatabaseRow,
  BranchListOptions,
  BranchResponse,
  RequestMetadata
} from "./branch.types.js";

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

function nullableNumber(
  value: string | number | null
): number | null {
  if (value === null) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function mapBranch(
  branch: BranchDatabaseRow
): BranchResponse {
  return {
    branchId:
      String(branch.branch_id),

    companyId:
      String(branch.company_id),

    branchCode:
      branch.branch_code,

    branchName:
      branch.branch_name,

    branchType:
      branch.branch_type,

    officialEmail:
      branch.official_email,

    officialPhone:
      branch.official_phone,

    addressLine1:
      branch.address_line_1,

    addressLine2:
      branch.address_line_2,

    city:
      branch.city,

    district:
      branch.district,

    province:
      branch.province,

    postalCode:
      branch.postal_code,

    countryCode:
      branch.country_code,

    timezone:
      branch.timezone,

    latitude:
      nullableNumber(
        branch.latitude
      ),

    longitude:
      nullableNumber(
        branch.longitude
      ),

    isHeadOffice:
      databaseBoolean(
        branch.is_head_office
      ),

    isActive:
      databaseBoolean(
        branch.is_active
      ),

    createdAt:
      dateToIsoString(
        branch.created_at
      ),

    updatedAt:
      dateToIsoString(
        branch.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): BranchActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function assertBranchAccess(
  auth: AuthContext,
  branchCompanyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    auth.companyId !==
      branchCompanyId
  ) {
    throw new AppError({
      message:
        "You cannot access a branch belonging to another company",
      statusCode: 403,
      code:
        "BRANCH_ACCESS_DENIED"
    });
  }
}

function resolveCreateCompanyId(
  input: CreateBranchInput,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator creates a branch",
        statusCode: 422,
        code:
          "COMPANY_ID_REQUIRED"
      });
    }

    return input.companyId;
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
    input.companyId &&
    input.companyId !==
      auth.companyId
  ) {
    throw new AppError({
      message:
        "You cannot create a branch for another company",
      statusCode: 403,
      code:
        "BRANCH_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

function isDuplicateEntryError(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code === "ER_DUP_ENTRY"
  );
}

export async function listBranches(
  query: BranchListQuery,
  auth: AuthContext
): Promise<{
  branches: BranchResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  let companyId: string | null;

  if (auth.isPlatformAdmin) {
    companyId =
      query.companyId ?? null;
  } else {
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
          "You cannot list branches belonging to another company",
        statusCode: 403,
        code:
          "BRANCH_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  const options: BranchListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    companyId,

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.search !== undefined
      ? {
          search:
            query.search
        }
      : {}),

    ...(query.branchType !== undefined
      ? {
          branchType:
            query.branchType
        }
      : {}),

    ...(query.city !== undefined
      ? {
          city:
            query.city
        }
      : {}),

    ...(query.isActive !== undefined
      ? {
          isActive:
            query.isActive
        }
      : {}),

    ...(query.isHeadOffice !== undefined
      ? {
          isHeadOffice:
            query.isHeadOffice
        }
      : {})
  };

  const result =
    await listBranchRecords(
      options
    );

  return {
    branches:
      result.branches.map(
        mapBranch
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

export async function getBranch(
  branchId: string,
  auth: AuthContext
): Promise<BranchResponse> {
  const branch =
    await findBranchById(
      branchId
    );

  if (!branch) {
    throw new AppError({
      message:
        "Branch was not found",
      statusCode: 404,
      code:
        "BRANCH_NOT_FOUND"
    });
  }

  assertBranchAccess(
    auth,
    String(branch.company_id)
  );

  return mapBranch(branch);
}

export async function createBranch(
  input: CreateBranchInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<BranchResponse> {
  const companyId =
    resolveCreateCompanyId(
      input,
      auth
    );

  const companyExists =
    await findActiveCompanyById(
      companyId
    );

  if (!companyExists) {
    throw new AppError({
      message:
        "The selected company was not found or is inactive",
      statusCode: 404,
      code:
        "COMPANY_NOT_FOUND"
    });
  }

  // edited by wali: A new head office cannot silently replace an existing branch's designation.
  if (
    input.isHeadOffice &&
    await findExistingHeadOfficeBranch(companyId)
  ) {
    throw new AppError({
      message:
        "A head office already exists. Edit that branch, clear its Head Office checkbox, and change its Branch type before assigning Head Office to another branch.",
      statusCode: 409,
      code:
        "HEAD_OFFICE_ALREADY_EXISTS"
    });
  }

  const conflict =
    await findBranchCodeConflict(
      companyId,
      input.branchCode
    );

  if (conflict) {
    throw new AppError({
      message:
        "This branch code is already in use within the selected company",
      statusCode: 409,
      code:
        "BRANCH_CODE_EXISTS"
    });
  }

  try {
    const branch =
      await createBranchRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    return mapBranch(branch);
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This branch code is already in use within the selected company",
        statusCode: 409,
        code:
          "BRANCH_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function updateBranch(
  branchId: string,
  input: UpdateBranchInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<BranchResponse> {
  const existingBranch =
    await findBranchById(
      branchId
    );

  if (!existingBranch) {
    throw new AppError({
      message:
        "Branch was not found",
      statusCode: 404,
      code:
        "BRANCH_NOT_FOUND"
    });
  }

  const companyId =
    String(
      existingBranch.company_id
    );

  assertBranchAccess(
    auth,
    companyId
  );

  // edited by wali: Require the old head office to be cleared and retitled before transferring it.
  if (
    input.isHeadOffice === true &&
    await findExistingHeadOfficeBranch(companyId, branchId)
  ) {
    throw new AppError({
      message:
        "A head office already exists. Edit that branch, clear its Head Office checkbox, and change its Branch type before assigning Head Office to another branch.",
      statusCode: 409,
      code:
        "HEAD_OFFICE_ALREADY_EXISTS"
    });
  }

  if (
    input.branchCode !== undefined
  ) {
    const conflict =
      await findBranchCodeConflict(
        companyId,
        input.branchCode,
        branchId
      );

    if (conflict) {
      throw new AppError({
        message:
          "This branch code is already in use within the company",
        statusCode: 409,
        code:
          "BRANCH_CODE_EXISTS"
      });
    }
  }

  try {
    const branch =
      await updateBranchRecord(
        branchId,
        companyId,
        input,
        createActor(auth),
        metadata
      );

    if (!branch) {
      throw new AppError({
        message:
          "Branch was not found",
        statusCode: 404,
        code:
          "BRANCH_NOT_FOUND"
      });
    }

    return mapBranch(branch);
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This branch code is already in use within the company",
        statusCode: 409,
        code:
          "BRANCH_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function deleteBranch(
  branchId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const branch =
    await findBranchById(
      branchId
    );

  if (!branch) {
    throw new AppError({
      message:
        "Branch was not found",
      statusCode: 404,
      code:
        "BRANCH_NOT_FOUND"
    });
  }

  assertBranchAccess(
    auth,
    String(branch.company_id)
  );

  const deleted =
    await softDeleteBranchRecord(
      branchId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Branch was not found",
      statusCode: 404,
      code:
        "BRANCH_NOT_FOUND"
    });
  }
}

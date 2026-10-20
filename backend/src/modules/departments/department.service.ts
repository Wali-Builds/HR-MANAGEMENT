import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createDepartmentRecord,
  findActiveBranchForCompany,
  findActiveCompanyById,
  findDepartmentById,
  findDepartmentCodeConflict,
  findDepartmentReferenceById,
  listDepartmentRecords,
  softDeleteDepartmentRecord,
  updateDepartmentRecord,
  wouldCreateDepartmentCycle
} from "./department.repository.js";

import type {
  CreateDepartmentInput,
  DepartmentListQuery,
  UpdateDepartmentInput
} from "./department.schema.js";

import type {
  DepartmentActor,
  DepartmentDatabaseRow,
  DepartmentListOptions,
  DepartmentResponse,
  RequestMetadata
} from "./department.types.js";

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

function mapDepartment(
  department: DepartmentDatabaseRow
): DepartmentResponse {
  return {
    departmentId:
      String(
        department.department_id
      ),

    companyId:
      String(
        department.company_id
      ),

    branchId:
      nullableId(
        department.branch_id
      ),

    branchName:
      department.branch_name,

    parentDepartmentId:
      nullableId(
        department
          .parent_department_id
      ),

    parentDepartmentName:
      department
        .parent_department_name,

    departmentCode:
      department.department_code,

    departmentName:
      department.department_name,

    description:
      department.description,

    costCenterCode:
      department.cost_center_code,

    isActive:
      databaseBoolean(
        department.is_active
      ),

    createdAt:
      dateToIsoString(
        department.created_at
      ),

    updatedAt:
      dateToIsoString(
        department.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): DepartmentActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function assertDepartmentCompanyAccess(
  auth: AuthContext,
  departmentCompanyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    auth.companyId !==
      departmentCompanyId
  ) {
    throw new AppError({
      message:
        "You cannot access a department belonging to another company",
      statusCode: 403,
      code:
        "DEPARTMENT_ACCESS_DENIED"
    });
  }
}

function resolveCreateCompanyId(
  input: CreateDepartmentInput,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator creates a department",
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
        "You cannot create a department for another company",
      statusCode: 403,
      code:
        "DEPARTMENT_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

async function validateBranch(
  branchId: string | null,
  companyId: string
): Promise<void> {
  if (branchId === null) {
    return;
  }

  const branchExists =
    await findActiveBranchForCompany(
      branchId,
      companyId
    );

  if (!branchExists) {
    throw new AppError({
      message:
        "The selected branch was not found, is inactive, or belongs to another company",
      statusCode: 422,
      code:
        "INVALID_DEPARTMENT_BRANCH"
    });
  }
}

async function validateParentDepartment(
  parentDepartmentId: string | null,
  companyId: string,
  currentDepartmentId?: string
): Promise<void> {
  if (parentDepartmentId === null) {
    return;
  }

  if (
    currentDepartmentId &&
    parentDepartmentId ===
      currentDepartmentId
  ) {
    throw new AppError({
      message:
        "A department cannot be its own parent",
      statusCode: 422,
      code:
        "DEPARTMENT_SELF_PARENT"
    });
  }

  const parentDepartment =
    await findDepartmentReferenceById(
      parentDepartmentId
    );

  if (!parentDepartment) {
    throw new AppError({
      message:
        "Parent department was not found",
      statusCode: 422,
      code:
        "PARENT_DEPARTMENT_NOT_FOUND"
    });
  }

  if (
    String(
      parentDepartment.company_id
    ) !== companyId
  ) {
    throw new AppError({
      message:
        "Parent department must belong to the same company",
      statusCode: 422,
      code:
        "PARENT_DEPARTMENT_COMPANY_MISMATCH"
    });
  }

  if (
    !databaseBoolean(
      parentDepartment.is_active
    )
  ) {
    throw new AppError({
      message:
        "An inactive department cannot be selected as parent",
      statusCode: 422,
      code:
        "PARENT_DEPARTMENT_INACTIVE"
    });
  }

  if (currentDepartmentId) {
    const createsCycle =
      await wouldCreateDepartmentCycle(
        currentDepartmentId,
        parentDepartmentId
      );

    if (createsCycle) {
      throw new AppError({
        message:
          "This parent selection would create a circular department hierarchy",
        statusCode: 422,
        code:
          "DEPARTMENT_HIERARCHY_CYCLE"
      });
    }
  }
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

export async function listDepartments(
  query: DepartmentListQuery,
  auth: AuthContext
): Promise<{
  departments: DepartmentResponse[];

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
          "You cannot list departments belonging to another company",
        statusCode: 403,
        code:
          "DEPARTMENT_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  if (
    query.branchId &&
    companyId
  ) {
    await validateBranch(
      query.branchId,
      companyId
    );
  }

  const options:
  DepartmentListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    companyId,

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.branchId !== undefined
      ? {
          branchId:
            query.branchId
        }
      : {}),

    ...(query.parentDepartmentId !==
    undefined
      ? {
          parentDepartmentId:
            query.parentDepartmentId
        }
      : {}),

    ...(query.rootOnly !== undefined
      ? {
          rootOnly:
            query.rootOnly
        }
      : {}),

    ...(query.search !== undefined
      ? {
          search:
            query.search
        }
      : {}),

    ...(query.isActive !== undefined
      ? {
          isActive:
            query.isActive
        }
      : {})
  };

  const result =
    await listDepartmentRecords(
      options
    );

  return {
    departments:
      result.departments.map(
        mapDepartment
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

export async function getDepartment(
  departmentId: string,
  auth: AuthContext
): Promise<DepartmentResponse> {
  const department =
    await findDepartmentById(
      departmentId
    );

  if (!department) {
    throw new AppError({
      message:
        "Department was not found",
      statusCode: 404,
      code:
        "DEPARTMENT_NOT_FOUND"
    });
  }

  assertDepartmentCompanyAccess(
    auth,
    String(
      department.company_id
    )
  );

  return mapDepartment(department);
}

export async function createDepartment(
  input: CreateDepartmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<DepartmentResponse> {
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

  await validateBranch(
    input.branchId ?? null,
    companyId
  );

  await validateParentDepartment(
    input.parentDepartmentId ??
      null,

    companyId
  );

  const conflict =
    await findDepartmentCodeConflict(
      companyId,
      input.branchId ?? null,
      input.departmentCode
    );

  if (conflict) {
    throw new AppError({
      message:
        "This department code is already in use within the branch",
      statusCode: 409,
      code:
        "DEPARTMENT_CODE_EXISTS"
    });
  }

  try {
    const department =
      await createDepartmentRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    return mapDepartment(
      department
    );
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This department code is already in use within the branch",
        statusCode: 409,
        code:
          "DEPARTMENT_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<DepartmentResponse> {
  const existingDepartment =
    await findDepartmentById(
      departmentId
    );

  if (!existingDepartment) {
    throw new AppError({
      message:
        "Department was not found",
      statusCode: 404,
      code:
        "DEPARTMENT_NOT_FOUND"
    });
  }

  const companyId =
    String(
      existingDepartment.company_id
    );

  assertDepartmentCompanyAccess(
    auth,
    companyId
  );

  const resultingBranchId =
    input.branchId !== undefined
      ? input.branchId
      : nullableId(
          existingDepartment.branch_id
        );

  const resultingParentId =
    input.parentDepartmentId !==
      undefined
      ? input.parentDepartmentId
      : nullableId(
          existingDepartment
            .parent_department_id
        );

  await validateBranch(
    resultingBranchId,
    companyId
  );

  await validateParentDepartment(
    resultingParentId,
    companyId,
    departmentId
  );

  const resultingDepartmentCode =
    input.departmentCode ??
    existingDepartment.department_code;
  // edited by wali: Check the final code and branch together, including branch-only moves.
  const conflict =
    await findDepartmentCodeConflict(
      companyId,
      resultingBranchId,
      resultingDepartmentCode,
      departmentId
    );

  if (conflict) {
    throw new AppError({
      message:
        "This department code is already in use within the branch",
      statusCode: 409,
      code:
        "DEPARTMENT_CODE_EXISTS"
    });
  }

  try {
    const department =
      await updateDepartmentRecord(
        departmentId,
        input,
        createActor(auth),
        metadata
      );

    if (!department) {
      throw new AppError({
        message:
          "Department was not found",
        statusCode: 404,
        code:
          "DEPARTMENT_NOT_FOUND"
      });
    }

    return mapDepartment(
      department
    );
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This department code is already in use within the branch",
        statusCode: 409,
        code:
          "DEPARTMENT_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function deleteDepartment(
  departmentId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const department =
    await findDepartmentById(
      departmentId
    );

  if (!department) {
    throw new AppError({
      message:
        "Department was not found",
      statusCode: 404,
      code:
        "DEPARTMENT_NOT_FOUND"
    });
  }

  assertDepartmentCompanyAccess(
    auth,
    String(
      department.company_id
    )
  );

  const deleted =
    await softDeleteDepartmentRecord(
      departmentId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Department was not found",
      statusCode: 404,
      code:
        "DEPARTMENT_NOT_FOUND"
    });
  }
}

import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  closePositionRecord,
  countCurrentPositionAssignments,
  createPositionRecord,
  findActiveBranchForCompany,
  findActiveCompanyById,
  findActiveDepartmentForCompany,
  findActiveDesignationForCompany,
  findPositionById,
  findPositionCodeConflict,
  findPositionReferenceById,
  listPositionRecords,
  updatePositionRecord,
  wouldCreatePositionCycle
} from "./position.repository.js";

import type {
  CreatePositionInput,
  PositionListQuery,
  UpdatePositionInput
} from "./position.schema.js";

import type {
  PositionActor,
  PositionDatabaseRow,
  PositionListOptions,
  PositionResponse,
  RequestMetadata
} from "./position.types.js";

function databaseIdToString(
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
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function dateToIsoDate(
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
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date
    .toISOString()
    .slice(0, 10);
}

function dateTimeToIso(
  value: Date | string
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
}

function mapPosition(
  position: PositionDatabaseRow
): PositionResponse {
  const approvedHeadcount =
    Number(
      position.approved_headcount
    );

  const filledHeadcount =
    Number(
      position.filled_headcount
    );

  return {
    positionId:
      String(position.position_id),

    companyId:
      String(position.company_id),

    branchId:
      databaseIdToString(
        position.branch_id
      ),

    branchName:
      position.branch_name,

    departmentId:
      databaseIdToString(
        position.department_id
      ),

    departmentName:
      position.department_name,

    designationId:
      databaseIdToString(
        position.designation_id
      ),

    designationName:
      position.designation_name,

    reportsToPositionId:
      databaseIdToString(
        position
          .reports_to_position_id
      ),

    parentPositionTitle:
      position.parent_position_title,

    positionCode:
      position.position_code,

    positionTitle:
      position.position_title,

    positionType:
      position.position_type,

    approvedHeadcount,

    filledHeadcount,

    availableHeadcount:
      Math.max(
        approvedHeadcount -
          filledHeadcount,
        0
      ),

    minimumSalary:
      nullableNumber(
        position.minimum_salary
      ),

    maximumSalary:
      nullableNumber(
        position.maximum_salary
      ),

    currencyCode:
      position.currency_code,

    positionStatus:
      position.position_status,

    effectiveFrom:
      dateToIsoDate(
        position.effective_from
      ),

    effectiveTo:
      dateToIsoDate(
        position.effective_to
      ),

    createdAt:
      dateTimeToIso(
        position.created_at
      ),

    updatedAt:
      dateTimeToIso(
        position.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): PositionActor {
  return {
    userId: auth.userId,
    companyId: auth.companyId,
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
        "You cannot access a position belonging to another company",

      statusCode: 403,

      code:
        "POSITION_ACCESS_DENIED"
    });
  }
}

function resolveCompanyId(
  input: CreatePositionInput,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator creates a position",

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
        "You cannot create a position for another company",

      statusCode: 403,

      code:
        "POSITION_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

async function validateReferences(
  companyId: string,

  references: {
    branchId: string | null;
    departmentId: string | null;
    designationId: string | null;
    reportsToPositionId:
      string | null;
  },

  currentPositionId?: string
): Promise<void> {
  if (references.branchId) {
    const validBranch =
      await findActiveBranchForCompany(
        references.branchId,
        companyId
      );

    if (!validBranch) {
      throw new AppError({
        message:
          "The selected branch is inactive, unavailable, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_POSITION_BRANCH"
      });
    }
  }

  if (references.departmentId) {
    const department =
      await findActiveDepartmentForCompany(
        references.departmentId,
        companyId
      );

    if (!department) {
      throw new AppError({
        message:
          "The selected department is inactive, unavailable, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_POSITION_DEPARTMENT"
      });
    }

    if (
      references.branchId &&
      department.branchId &&
      department.branchId !==
        references.branchId
    ) {
      throw new AppError({
        message:
          "The selected department belongs to a different branch",

        statusCode: 422,

        code:
          "POSITION_DEPARTMENT_BRANCH_MISMATCH"
      });
    }
  }

  if (references.designationId) {
    const validDesignation =
      await findActiveDesignationForCompany(
        references.designationId,
        companyId
      );

    if (!validDesignation) {
      throw new AppError({
        message:
          "The selected designation is inactive, unavailable, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_POSITION_DESIGNATION"
      });
    }

    // edited by wali: The designation must belong to the position's selected department.
    if (
      !references.departmentId ||
      validDesignation.departmentId !==
        references.departmentId
    ) {
      throw new AppError({
        message:
          "The selected designation belongs to a different department",
        statusCode: 422,
        code:
          "POSITION_DESIGNATION_DEPARTMENT_MISMATCH"
      });
    }
  }

  if (references.reportsToPositionId) {
    if (
      currentPositionId &&
      references.reportsToPositionId ===
        currentPositionId
    ) {
      throw new AppError({
        message:
          "A position cannot report to itself",

        statusCode: 422,

        code:
          "POSITION_SELF_PARENT"
      });
    }

    const parentPosition =
      await findPositionReferenceById(
        references.reportsToPositionId
      );

    if (!parentPosition) {
      throw new AppError({
        message:
          "The reporting position was not found",

        statusCode: 422,

        code:
          "PARENT_POSITION_NOT_FOUND"
      });
    }

    if (
      String(
        parentPosition.company_id
      ) !== companyId
    ) {
      throw new AppError({
        message:
          "The reporting position must belong to the same company",

        statusCode: 422,

        code:
          "PARENT_POSITION_COMPANY_MISMATCH"
      });
    }

    if (
      parentPosition.position_status ===
      "CLOSED"
    ) {
      throw new AppError({
        message:
          "A closed position cannot be selected as the reporting position",

        statusCode: 422,

        code:
          "PARENT_POSITION_CLOSED"
      });
    }

    if (currentPositionId) {
      const cycle =
        await wouldCreatePositionCycle(
          currentPositionId,
          references
            .reportsToPositionId
        );

      if (cycle) {
        throw new AppError({
          message:
            "This reporting position would create a circular position hierarchy",

          statusCode: 422,

          code:
            "POSITION_HIERARCHY_CYCLE"
        });
      }
    }
  }
}

function validateSalaryRange(
  minimumSalary: number | null,
  maximumSalary: number | null
): void {
  if (
    minimumSalary !== null &&
    maximumSalary !== null &&
    minimumSalary >
      maximumSalary
  ) {
    throw new AppError({
      message:
        "Maximum salary must be greater than or equal to minimum salary",

      statusCode: 422,

      code:
        "INVALID_POSITION_SALARY_RANGE"
    });
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

export async function listPositions(
  query: PositionListQuery,
  auth: AuthContext
): Promise<{
  positions: PositionResponse[];

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
          "You cannot list positions belonging to another company",

        statusCode: 403,

        code:
          "POSITION_ACCESS_DENIED"
      });
    }

    companyId = auth.companyId;
  }

  const options:
  PositionListOptions = {
    page: query.page,
    limit: query.limit,
    companyId,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,

    ...(query.branchId !== undefined
      ? {
          branchId: query.branchId
        }
      : {}),

    ...(query.departmentId !==
    undefined
      ? {
          departmentId:
            query.departmentId
        }
      : {}),

    ...(query.designationId !==
    undefined
      ? {
          designationId:
            query.designationId
        }
      : {}),

    ...(query.reportsToPositionId !==
    undefined
      ? {
          reportsToPositionId:
            query.reportsToPositionId
        }
      : {}),

    ...(query.search !== undefined
      ? {
          search: query.search
        }
      : {}),

    ...(query.positionType !==
    undefined
      ? {
          positionType:
            query.positionType
        }
      : {}),

    ...(query.positionStatus !==
    undefined
      ? {
          positionStatus:
            query.positionStatus
        }
      : {}),

    ...(query.hasVacancy !== undefined
      ? {
          hasVacancy:
            query.hasVacancy
        }
      : {})
  };

  const result =
    await listPositionRecords(
      options
    );

  return {
    positions:
      result.positions.map(
        mapPosition
      ),

    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,

      totalPages:
        Math.ceil(
          result.total /
            query.limit
        )
    }
  };
}

export async function getPosition(
  positionId: string,
  auth: AuthContext
): Promise<PositionResponse> {
  const position =
    await findPositionById(
      positionId
    );

  if (!position) {
    throw new AppError({
      message:
        "Position was not found",

      statusCode: 404,

      code:
        "POSITION_NOT_FOUND"
    });
  }

  assertCompanyAccess(
    auth,
    String(position.company_id)
  );

  return mapPosition(position);
}

export async function createPosition(
  input: CreatePositionInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<PositionResponse> {
  const companyId =
    resolveCompanyId(
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

  await validateReferences(
    companyId,
    {
      branchId:
        input.branchId ?? null,

      departmentId:
        input.departmentId ?? null,

      designationId:
        input.designationId ?? null,

      reportsToPositionId:
        input.reportsToPositionId ??
        null
    }
  );

  validateSalaryRange(
    input.minimumSalary ?? null,
    input.maximumSalary ?? null
  );

  // edited by wali: Position codes may repeat across departments, but not within one department.
  const conflict =
    await findPositionCodeConflict(
      companyId,
      input.departmentId,
      input.positionCode
    );

  if (conflict) {
    throw new AppError({
      message:
        "This position code is already in use within the department",

      statusCode: 409,

      code:
        "POSITION_CODE_EXISTS"
    });
  }

  try {
    const position =
      await createPositionRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    return mapPosition(position);
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This position code is already in use within the department",

        statusCode: 409,

        code:
          "POSITION_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function updatePosition(
  positionId: string,
  input: UpdatePositionInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<PositionResponse> {
  const existing =
    await findPositionById(
      positionId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Position was not found",

      statusCode: 404,

      code:
        "POSITION_NOT_FOUND"
    });
  }

  const companyId =
    String(existing.company_id);

  assertCompanyAccess(
    auth,
    companyId
  );

  const resultingBranchId =
    input.branchId !== undefined
      ? input.branchId
      : databaseIdToString(
          existing.branch_id
        );

  const resultingDepartmentId =
    input.departmentId !== undefined
      ? input.departmentId
      : databaseIdToString(
          existing.department_id
        );

  const resultingDesignationId =
    input.designationId !== undefined
      ? input.designationId
      : databaseIdToString(
          existing.designation_id
        );

  const resultingParentPositionId =
    input.reportsToPositionId !==
      undefined
      ? input.reportsToPositionId
      : databaseIdToString(
          existing
            .reports_to_position_id
        );

  await validateReferences(
    companyId,
    {
      branchId:
        resultingBranchId,

      departmentId:
        resultingDepartmentId,

      designationId:
        resultingDesignationId,

      reportsToPositionId:
        resultingParentPositionId
    },
    positionId
  );

  const minimumSalary =
    input.minimumSalary !== undefined
      ? input.minimumSalary
      : nullableNumber(
          existing.minimum_salary
        );

  const maximumSalary =
    input.maximumSalary !== undefined
      ? input.maximumSalary
      : nullableNumber(
          existing.maximum_salary
        );

  validateSalaryRange(
    minimumSalary,
    maximumSalary
  );

  const currentAssignments =
    await countCurrentPositionAssignments(
      positionId
    );

  if (
    input.approvedHeadcount !==
      undefined &&
    input.approvedHeadcount <
      currentAssignments
  ) {
    throw new AppError({
      message:
        "Approved headcount cannot be less than the number of current position assignments",

      statusCode: 422,

      code:
        "APPROVED_HEADCOUNT_TOO_LOW",

      details: {
        currentAssignments
      }
    });
  }

  if (
    (
      input.positionStatus ===
        "CLOSED" ||
      input.positionStatus ===
        "INACTIVE"
    ) &&
    currentAssignments > 0
  ) {
    throw new AppError({
      message:
        "A position with current employee assignments cannot be closed or made inactive",

      statusCode: 409,

      code:
        "POSITION_HAS_CURRENT_ASSIGNMENTS",

      details: {
        currentAssignments
      }
    });
  }

  if (
    input.positionCode !==
      undefined
  ) {
    const conflict =
      await findPositionCodeConflict(
        companyId,
        resultingDepartmentId,
        input.positionCode,
        positionId
      );

    if (conflict) {
      throw new AppError({
        message:
          "This position code is already in use within the department",

        statusCode: 409,

        code:
          "POSITION_CODE_EXISTS"
      });
    }
  }

  try {
    const position =
      await updatePositionRecord(
        positionId,
        input,
        createActor(auth),
        metadata
      );

    if (!position) {
      throw new AppError({
        message:
          "Position was not found",

        statusCode: 404,

        code:
          "POSITION_NOT_FOUND"
      });
    }

    return mapPosition(position);
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This position code is already in use within the department",

        statusCode: 409,

        code:
          "POSITION_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function closePosition(
  positionId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const position =
    await findPositionById(
      positionId
    );

  if (!position) {
    throw new AppError({
      message:
        "Position was not found",

      statusCode: 404,

      code:
        "POSITION_NOT_FOUND"
    });
  }

  assertCompanyAccess(
    auth,
    String(position.company_id)
  );

  const currentAssignments =
    await countCurrentPositionAssignments(
      positionId
    );

  if (currentAssignments > 0) {
    throw new AppError({
      message:
        "This position has current employee assignments and cannot be closed",

      statusCode: 409,

      code:
        "POSITION_HAS_CURRENT_ASSIGNMENTS",

      details: {
        currentAssignments
      }
    });
  }

  try {
    const closed =
      await closePositionRecord(
        positionId,
        createActor(auth),
        metadata
      );

    if (!closed) {
      throw new AppError({
        message:
          "Position was not found",

        statusCode: 404,

        code:
          "POSITION_NOT_FOUND"
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "POSITION_HAS_CURRENT_ASSIGNMENTS"
    ) {
      throw new AppError({
        message:
          "This position has current employee assignments and cannot be closed",

        statusCode: 409,

        code:
          "POSITION_HAS_CURRENT_ASSIGNMENTS"
      });
    }

    throw error;
  }
}

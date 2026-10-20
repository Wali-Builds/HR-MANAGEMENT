import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createDesignationRecord,
  findActiveCompanyById,
  findActiveDepartmentForCompany,
  findDesignationById,
  findDesignationCodeConflict,
  areDesignationAssignmentsInDepartment,
  listDesignationRecords,
  softDeleteDesignationRecord,
  updateDesignationRecord
} from "./designation.repository.js";

import type {
  CreateDesignationInput,
  DesignationListQuery,
  UpdateDesignationInput
} from "./designation.schema.js";

import type {
  DesignationActor,
  DesignationDatabaseRow,
  DesignationListOptions,
  DesignationResponse,
  RequestMetadata
} from "./designation.types.js";

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
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

  const parsedValue =
    Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
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

function mapDesignation(
  designation:
    DesignationDatabaseRow
): DesignationResponse {
  return {
    designationId:
      String(
        designation.designation_id
      ),

    companyId:
      String(
        designation.company_id
      ),

    departmentId:
      designation.department_id === null
        ? null
        : String(designation.department_id),

    designationCode:
      designation.designation_code,

    designationName:
      designation.designation_name,

    grade:
      designation.grade,

    jobLevel:
      nullableNumber(
        designation.job_level
      ),

    description:
      designation.description,

    minimumSalary:
      nullableNumber(
        designation.minimum_salary
      ),

    maximumSalary:
      nullableNumber(
        designation.maximum_salary
      ),

    isManagerial:
      databaseBoolean(
        designation.is_managerial
      ),

    isActive:
      databaseBoolean(
        designation.is_active
      ),

    createdAt:
      dateToIsoString(
        designation.created_at
      ),

    updatedAt:
      dateToIsoString(
        designation.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): DesignationActor {
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
  designationCompanyId: string
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    !auth.companyId ||
    auth.companyId !==
      designationCompanyId
  ) {
    throw new AppError({
      message:
        "You cannot access a designation belonging to another company",
      statusCode: 403,
      code:
        "DESIGNATION_ACCESS_DENIED"
    });
  }
}

function resolveCreateCompanyId(
  input: CreateDesignationInput,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator creates a designation",
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
        "You cannot create a designation for another company",
      statusCode: 403,
      code:
        "DESIGNATION_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

function validateSalaryRange(
  minimumSalary: number | null,
  maximumSalary: number | null
): void {
  if (
    minimumSalary !== null &&
    maximumSalary !== null &&
    minimumSalary > maximumSalary
  ) {
    throw new AppError({
      message:
        "Maximum salary must be greater than or equal to minimum salary",
      statusCode: 422,
      code:
        "INVALID_DESIGNATION_SALARY_RANGE"
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

export async function listDesignations(
  query: DesignationListQuery,
  auth: AuthContext
): Promise<{
  designations:
    DesignationResponse[];

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
          "You cannot list designations belonging to another company",
        statusCode: 403,
        code:
          "DESIGNATION_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  const options:
  DesignationListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    companyId,

    ...(query.departmentId !== undefined
      ? { departmentId: query.departmentId }
      : {}),

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.search !== undefined
      ? {
          search: query.search
        }
      : {}),

    ...(query.grade !== undefined
      ? {
          grade: query.grade
        }
      : {}),

    ...(query.jobLevel !== undefined
      ? {
          jobLevel:
            query.jobLevel
        }
      : {}),

    ...(query.isManagerial !==
    undefined
      ? {
          isManagerial:
            query.isManagerial
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
    await listDesignationRecords(
      options
    );

  return {
    designations:
      result.designations.map(
        mapDesignation
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

export async function getDesignation(
  designationId: string,
  auth: AuthContext
): Promise<DesignationResponse> {
  const designation =
    await findDesignationById(
      designationId
    );

  if (!designation) {
    throw new AppError({
      message:
        "Designation was not found",
      statusCode: 404,
      code:
        "DESIGNATION_NOT_FOUND"
    });
  }

  assertCompanyAccess(
    auth,
    String(
      designation.company_id
    )
  );

  return mapDesignation(
    designation
  );
}

export async function createDesignation(
  input: CreateDesignationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<DesignationResponse> {
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

  // edited by wali: Every new designation must belong to an active department in this company.
  const departmentExists =
    await findActiveDepartmentForCompany(
      input.departmentId,
      companyId
    );

  if (!departmentExists) {
    throw new AppError({
      message:
        "Select an active department belonging to this company",
      statusCode: 422,
      code:
        "INVALID_DESIGNATION_DEPARTMENT"
    });
  }

  validateSalaryRange(
    input.minimumSalary ?? null,
    input.maximumSalary ?? null
  );

  const conflict =
    await findDesignationCodeConflict(
      companyId,
      input.departmentId,
      input.designationCode
    );

  if (conflict) {
    throw new AppError({
      message:
        "This designation code is already in use within the department",
      statusCode: 409,
      code:
        "DESIGNATION_CODE_EXISTS"
    });
  }

  try {
    const designation =
      await createDesignationRecord(
        companyId,
        input,
        createActor(auth),
        metadata
      );

    return mapDesignation(
      designation
    );
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This designation code is already in use within the department",
        statusCode: 409,
        code:
          "DESIGNATION_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function updateDesignation(
  designationId: string,
  input: UpdateDesignationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<DesignationResponse> {
  const existingDesignation =
    await findDesignationById(
      designationId
    );

  if (!existingDesignation) {
    throw new AppError({
      message:
        "Designation was not found",
      statusCode: 404,
      code:
        "DESIGNATION_NOT_FOUND"
    });
  }

  const companyId =
    String(
      existingDesignation.company_id
    );

  assertCompanyAccess(
    auth,
    companyId
  );

  if (input.departmentId !== undefined) {
    // edited by wali: Prevent changing scope while linked records still use another department.
    const departmentExists =
      await findActiveDepartmentForCompany(
        input.departmentId,
        companyId
      );

    if (!departmentExists) {
      throw new AppError({
        message:
          "Select an active department belonging to this company",
        statusCode: 422,
        code:
          "INVALID_DESIGNATION_DEPARTMENT"
      });
    }

    if (
      input.departmentId !==
        String(existingDesignation.department_id ?? "") &&
      !(await areDesignationAssignmentsInDepartment(
        designationId,
        input.departmentId
      ))
    ) {
      throw new AppError({
        message:
          "The designation has linked positions or employee assignments in another department. Move those records first.",
        statusCode: 409,
        code:
          "DESIGNATION_DEPARTMENT_ASSIGNMENT_MISMATCH"
      });
    }
  }

  const resultingMinimumSalary =
    input.minimumSalary !==
      undefined
      ? input.minimumSalary
      : nullableNumber(
          existingDesignation
            .minimum_salary
        );

  const resultingMaximumSalary =
    input.maximumSalary !==
      undefined
      ? input.maximumSalary
      : nullableNumber(
          existingDesignation
            .maximum_salary
        );

  validateSalaryRange(
    resultingMinimumSalary,
    resultingMaximumSalary
  );

  if (
    input.designationCode !==
      undefined
  ) {
    const resultingDepartmentId =
      input.departmentId ??
      String(existingDesignation.department_id ?? "");
    const conflict =
      await findDesignationCodeConflict(
        companyId,
        resultingDepartmentId,
        input.designationCode,
        designationId
      );

    if (conflict) {
      throw new AppError({
        message:
          "This designation code is already in use within the department",
        statusCode: 409,
        code:
          "DESIGNATION_CODE_EXISTS"
      });
    }
  }

  try {
    const designation =
      await updateDesignationRecord(
        designationId,
        input,
        createActor(auth),
        metadata
      );

    if (!designation) {
      throw new AppError({
        message:
          "Designation was not found",
        statusCode: 404,
        code:
          "DESIGNATION_NOT_FOUND"
      });
    }

    return mapDesignation(
      designation
    );
  } catch (error) {
    if (
      isDuplicateEntryError(error)
    ) {
      throw new AppError({
        message:
          "This designation code is already in use within the department",
        statusCode: 409,
        code:
          "DESIGNATION_CODE_EXISTS"
      });
    }

    throw error;
  }
}

export async function deleteDesignation(
  designationId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const designation =
    await findDesignationById(
      designationId
    );

  if (!designation) {
    throw new AppError({
      message:
        "Designation was not found",
      statusCode: 404,
      code:
        "DESIGNATION_NOT_FOUND"
    });
  }

  assertCompanyAccess(
    auth,
    String(
      designation.company_id
    )
  );

  const deleted =
    await softDeleteDesignationRecord(
      designationId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Designation was not found",
      statusCode: 404,
      code:
        "DESIGNATION_NOT_FOUND"
    });
  }
}

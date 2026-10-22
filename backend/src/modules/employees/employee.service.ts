import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createEmployeeRecord,
  findActiveBranchForCompany,
  findActiveCompanySettings,
  findActiveDepartmentForCompany,
  findDesignationForCompany,
  findActiveEmployeeStatus,
  findActiveEmploymentType,
  findActiveManagerForCompany,
  findEmployeeById,
  findEmployeeSelfProfile,
  findEmployeeConflicts,
  findPositionReference,
  getEmployeeLookups,
  listEmployeeRecords,
  softDeleteEmployeeRecord,
  updateEmployeeRecord
} from "./employee.repository.js";
import { findActiveProjectForAssignment } from "../projects/project.repository.js";

import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  UpdateEmployeeInput
} from "./employee.schema.js";

import type {
  EmployeeActor,
  EmployeeAssignmentMutation,
  EmployeeCreateRecord,
  EmployeeDatabaseRow,
  EmployeeListOptions,
  EmployeeResponse,
  EmployeeSelfProfileResponse,
  RequestMetadata
} from "./employee.types.js";

/**
 * The explicit undefined values are required because the project uses:
 *
 * exactOptionalPropertyTypes: true
 */
type AssignmentInputFields = {
  branchId?:
    | string
    | null
    | undefined;

  departmentId?:
    | string
    | null
    | undefined;

  projectId?:
    | string
    | null
    | undefined;

  designationId?:
    | string
    | null
    | undefined;

  reportingManagerId?:
    | string
    | null
    | undefined;

  positionId?:
    | string
    | null
    | undefined;

  assignmentType?:
    | string
    | undefined;

  effectiveFrom?:
    | string
    | undefined;

  workLocation?:
    | string
    | null
    | undefined;

  employmentPercentage?:
    | number
    | undefined;

  transferReason?:
    | string
    | null
    | undefined;
};

interface EmployeeDateRange {
  joiningDate: string;

  probationEndDate:
    | string
    | null;

  confirmationDate:
    | string
    | null;

  contractStartDate:
    | string
    | null;

  contractEndDate:
    | string
    | null;

  resignationDate:
    | string
    | null;

  lastWorkingDate:
    | string
    | null;
}

interface EmployeeConflictFlags {
  employeeCodeExists: boolean;
  cnicNumberExists: boolean;
  officialEmailExists: boolean;
}

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
  if (value === null) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : null;
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

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function requiredDateOnly(
  value: Date | string
): string {
  const convertedValue =
    dateOnly(value);

  if (!convertedValue) {
    throw new Error(
      "Required date value is missing"
    );
  }

  return convertedValue;
}

function dateTimeIso(
  value: Date | string
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
}

function fullName(
  employee: EmployeeDatabaseRow
): string {
  return [
    employee.first_name,
    employee.middle_name,
    employee.last_name
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim() !== ""
    )
    .join(" ");
}

function mapEmployee(
  employee: EmployeeDatabaseRow
): EmployeeResponse {
  return {
    employeeId:
      String(
        employee.employee_id
      ),

    companyId:
      String(
        employee.company_id
      ),

    employeeCode:
      employee.employee_code,

    firstName:
      employee.first_name,

    middleName:
      employee.middle_name,

    lastName:
      employee.last_name,

    preferredName:
      employee.preferred_name,

    fullName:
      fullName(employee),

    fatherName:
      employee.father_name,

    spouseName:
      employee.spouse_name,

    gender:
      employee.gender,

    dateOfBirth:
      dateOnly(
        employee.date_of_birth
      ),

    maritalStatus:
      employee.marital_status,

    bloodGroup:
      employee.blood_group,

    nationality:
      employee.nationality,

    cnicNumber:
      employee.cnic_number,

    passportNumber:
      employee.passport_number,

    personalEmail:
      employee.personal_email,

    officialEmail:
      employee.official_email,

    mobileNumber:
      employee.mobile_number,

    alternateNumber:
      employee.alternate_number,

    employmentTypeId:
      String(
        employee.employment_type_id
      ),

    employmentTypeCode:
      employee.employment_type_code,

    employmentTypeName:
      employee.employment_type_name,

    employeeStatusId:
      String(
        employee.employee_status_id
      ),

    employeeStatusCode:
      employee.employee_status_code,

    employeeStatusName:
      employee.employee_status_name,

    isActiveEmployment:
      databaseBoolean(
        employee.is_active_employment
      ),

    joiningDate:
      requiredDateOnly(
        employee.joining_date
      ),

    probationEndDate:
      dateOnly(
        employee.probation_end_date
      ),

    confirmationDate:
      dateOnly(
        employee.confirmation_date
      ),

    contractStartDate:
      dateOnly(
        employee.contract_start_date
      ),

    contractEndDate:
      dateOnly(
        employee.contract_end_date
      ),

    resignationDate:
      dateOnly(
        employee.resignation_date
      ),

    lastWorkingDate:
      dateOnly(
        employee.last_working_date
      ),

    profilePhotoPath:
      employee.profile_photo_path,

    biometricIdentifier:
      employee.biometric_identifier,

    remarks:
      employee.remarks,

    isActive:
      databaseBoolean(
        employee.is_active
      ),

    assignment: {
      assignmentId:
        nullableId(
          employee.assignment_id
        ),

      branchId:
        nullableId(
          employee.branch_id
        ),

      branchName:
        employee.branch_name,

      departmentId:
        nullableId(
          employee.department_id
        ),

      departmentName:
        employee.department_name,

      projectId:
        nullableId(employee.project_id),

      projectCode:
        employee.project_code,

      projectName:
        employee.project_name,

      designationId:
        nullableId(
          employee.designation_id
        ),

      designationName:
        employee.designation_name,

      reportingManagerId:
        nullableId(
          employee.reporting_manager_id
        ),

      reportingManagerCode:
        employee.reporting_manager_code,

      reportingManagerName:
        employee.reporting_manager_name,

      positionAssignmentId:
        nullableId(
          employee.position_assignment_id
        ),

      positionId:
        nullableId(
          employee.position_id
        ),

      positionCode:
        employee.position_code,

      positionTitle:
        employee.position_title,

      assignmentType:
        employee.assignment_type,

      effectiveFrom:
        dateOnly(
          employee
            .assignment_effective_from
        ),

      effectiveTo:
        dateOnly(
          employee
            .assignment_effective_to
        ),

      workLocation:
        employee.work_location,

      employmentPercentage:
        nullableNumber(
          employee.employment_percentage
        ),

      transferReason:
        employee.transfer_reason
    },

    createdAt:
      dateTimeIso(
        employee.created_at
      ),

    updatedAt:
      dateTimeIso(
        employee.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): EmployeeActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function hasPermission(
  auth: AuthContext,
  permissionCode: string
): boolean {
  // edited by wali: Treat the linked Company Administrator as the employee manager for its own company.
  const isTenantCompanyAdmin = Boolean(
    auth.companyId &&
    auth.roleCodes.includes("COMPANY_ADMIN")
  );

  return (
    auth.isPlatformAdmin ||
    auth.permissions.includes(
      permissionCode
    ) ||
    (isTenantCompanyAdmin &&
      permissionCode.startsWith("employee."))
  );
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
        "You cannot access an employee belonging to another company",

      statusCode: 403,

      code:
        "EMPLOYEE_ACCESS_DENIED"
    });
  }
}

// edited by wali: Validate employee records and assignments against Branch Admin scopes.
function assignedBranchIds(auth: AuthContext): string[] {
  return auth.permissions.some(
    (permission) => permission.trim().toUpperCase() === "BRANCH_ADMIN"
  )
    ? auth.branchIds
    : [];
}

function assertEmployeeBranchAccess(
  auth: AuthContext,
  branchId: string | null
): void {
  const branchIds = assignedBranchIds(auth);
  if (branchIds.length > 0 && (!branchId || !branchIds.includes(branchId))) {
    throw new AppError({
      message: "This employee is outside your assigned branch access",
      statusCode: 403,
      code: "EMPLOYEE_BRANCH_ACCESS_DENIED"
    });
  }
}

function resolveCompanyId(
  input: CreateEmployeeInput,
  auth: AuthContext
): string {
  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required when a Platform Administrator creates an employee",

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
        "You cannot create an employee for another company",

      statusCode: 403,

      code:
        "EMPLOYEE_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

async function validateEmploymentLookups(
  employmentTypeId: string,
  employeeStatusId: string
): Promise<void> {
  const [
    validEmploymentType,
    validEmployeeStatus
  ] = await Promise.all([
    findActiveEmploymentType(
      employmentTypeId
    ),

    findActiveEmployeeStatus(
      employeeStatusId
    )
  ]);

  if (!validEmploymentType) {
    throw new AppError({
      message:
        "The selected employment type is invalid or inactive",

      statusCode: 422,

      code:
        "INVALID_EMPLOYMENT_TYPE"
    });
  }

  if (!validEmployeeStatus) {
    throw new AppError({
      message:
        "The selected employee status is invalid or inactive",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_STATUS"
    });
  }
}

async function resolveAssignment(
  companyId: string,
  input: AssignmentInputFields,
  defaults: EmployeeAssignmentMutation,
  employeeId?: string
): Promise<EmployeeAssignmentMutation> {
  let branchId =
    input.branchId !== undefined
      ? input.branchId
      : defaults.branchId;

  let departmentId =
    input.departmentId !== undefined
      ? input.departmentId
      : defaults.departmentId;

  const projectId = input.projectId !== undefined
    ? input.projectId
    : defaults.projectId;

  let designationId =
    input.designationId !== undefined
      ? input.designationId
      : defaults.designationId;

  const reportingManagerId =
    input.reportingManagerId !==
      undefined
      ? input.reportingManagerId
      : defaults.reportingManagerId;

  const positionId =
    input.positionId !== undefined
      ? input.positionId
      : defaults.positionId;

  const assignmentType =
    input.assignmentType !== undefined
      ? input.assignmentType
      : defaults.assignmentType;

  const effectiveFrom =
    input.effectiveFrom !== undefined
      ? input.effectiveFrom
      : defaults.effectiveFrom;

  const workLocation =
    input.workLocation !== undefined
      ? input.workLocation
      : defaults.workLocation;

  const employmentPercentage =
    input.employmentPercentage !==
      undefined
      ? input.employmentPercentage
      : defaults.employmentPercentage;

  const transferReason =
    input.transferReason !== undefined
      ? input.transferReason
      : defaults.transferReason;

  if (
    reportingManagerId &&
    employeeId &&
    reportingManagerId === employeeId
  ) {
    throw new AppError({
      message:
        "An employee cannot report to themselves",

      statusCode: 422,

      code:
        "EMPLOYEE_SELF_MANAGER"
    });
  }

  if (positionId) {
    const position =
      await findPositionReference(
        positionId
      );

    if (!position) {
      throw new AppError({
        message:
          "The selected position was not found",

        statusCode: 422,

        code:
          "POSITION_NOT_FOUND"
      });
    }

    if (
      position.companyId !== companyId
    ) {
      throw new AppError({
        message:
          "The selected position belongs to another company",

        statusCode: 422,

        code:
          "EMPLOYEE_POSITION_COMPANY_MISMATCH"
      });
    }

    if (
      position.positionStatus !==
      "ACTIVE"
    ) {
      throw new AppError({
        message:
          "Only an active position can be assigned",

        statusCode: 422,

        code:
          "POSITION_NOT_ASSIGNABLE"
      });
    }

    if (
      position.effectiveFrom &&
      effectiveFrom <
        position.effectiveFrom
    ) {
      throw new AppError({
        message:
          "Employee assignment cannot begin before the position becomes effective",

        statusCode: 422,

        code:
          "POSITION_NOT_EFFECTIVE"
      });
    }

    if (
      position.effectiveTo &&
      effectiveFrom >
        position.effectiveTo
    ) {
      throw new AppError({
        message:
          "Employee assignment cannot begin after the position expires",

        statusCode: 422,

        code:
          "POSITION_NOT_EFFECTIVE"
      });
    }

    if (
      branchId &&
      position.branchId &&
      branchId !==
        position.branchId
    ) {
      throw new AppError({
        message:
          "Employee branch does not match the selected position",

        statusCode: 422,

        code:
          "EMPLOYEE_POSITION_BRANCH_MISMATCH"
      });
    }

    if (
      departmentId &&
      position.departmentId &&
      departmentId !==
        position.departmentId
    ) {
      throw new AppError({
        message:
          "Employee department does not match the selected position",

        statusCode: 422,

        code:
          "EMPLOYEE_POSITION_DEPARTMENT_MISMATCH"
      });
    }

    if (
      designationId &&
      position.designationId &&
      designationId !==
        position.designationId
    ) {
      throw new AppError({
        message:
          "Employee designation does not match the selected position",

        statusCode: 422,

        code:
          "EMPLOYEE_POSITION_DESIGNATION_MISMATCH"
      });
    }

    branchId =
      branchId ??
      position.branchId;

    departmentId =
      departmentId ??
      position.departmentId;

    designationId =
      designationId ??
      position.designationId;
  }

  if (branchId) {
    const validBranch =
      await findActiveBranchForCompany(
        branchId,
        companyId
      );

    if (!validBranch) {
      throw new AppError({
        message:
          "The selected branch is invalid, inactive, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_EMPLOYEE_BRANCH"
      });
    }
  }

  if (departmentId) {
    const department =
      await findActiveDepartmentForCompany(
        departmentId,
        companyId
      );

    if (!department) {
      throw new AppError({
        message:
          "The selected department is invalid, inactive, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_EMPLOYEE_DEPARTMENT"
      });
    }

    if (
      branchId &&
      department.branchId &&
      department.branchId !== branchId
    ) {
      throw new AppError({
        message:
          "The selected department belongs to a different branch",

        statusCode: 422,

        code:
          "EMPLOYEE_DEPARTMENT_BRANCH_MISMATCH"
      });
    }

    if (
      !branchId &&
      department.branchId
    ) {
      branchId =
        department.branchId;
    }
  }

  if (projectId) {
    const assignable = await findActiveProjectForAssignment(projectId, companyId, departmentId);
    if (!assignable) {
      throw new AppError({ message: "Selected project must be active and belong to the employee's company and department", statusCode: 422, code: "INVALID_EMPLOYEE_PROJECT" });
    }
  }

  if (designationId) {
    const validDesignation =
      await findDesignationForCompany(
        designationId,
        companyId
      );

    if (!validDesignation) {
      throw new AppError({
        message:
          "The selected designation does not belong to this company",

        statusCode: 422,

        code:
          "INVALID_EMPLOYEE_DESIGNATION"
      });
    }

    // edited by wali: Employee assignments must use a designation owned by that same department.
    if (
      !departmentId ||
      validDesignation.departmentId !== departmentId
    ) {
      throw new AppError({
        message:
          "The selected designation must belong to the employee's department",
        statusCode: 422,
        code:
          "EMPLOYEE_DESIGNATION_DEPARTMENT_MISMATCH"
      });
    }
  }

  if (reportingManagerId) {
    const validManager =
      await findActiveManagerForCompany(
        reportingManagerId,
        companyId,
        branchId,
        departmentId
      );

    if (!validManager) {
      throw new AppError({
        message:
          "The reporting manager must be active, have a managerial designation, and belong to the selected branch and department",

        statusCode: 422,

        code:
          "INVALID_REPORTING_MANAGER"
      });
    }
  }

  return {
    branchId,
    departmentId,
    projectId,
    designationId,
    reportingManagerId,
    positionId,
    assignmentType,
    effectiveFrom,
    workLocation,
    employmentPercentage,
    transferReason
  };
}

function validateEmployeeDateRange(
  values: EmployeeDateRange
): void {
  if (
    values.probationEndDate &&
    values.probationEndDate <
      values.joiningDate
  ) {
    throw new AppError({
      message:
        "Probation end date cannot be before joining date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }

  if (
    values.confirmationDate &&
    values.confirmationDate <
      values.joiningDate
  ) {
    throw new AppError({
      message:
        "Confirmation date cannot be before joining date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }

  if (
    values.contractStartDate &&
    values.contractEndDate &&
    values.contractEndDate <
      values.contractStartDate
  ) {
    throw new AppError({
      message:
        "Contract end date cannot be before contract start date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }

  if (
    values.resignationDate &&
    values.resignationDate <
      values.joiningDate
  ) {
    throw new AppError({
      message:
        "Resignation date cannot be before joining date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }

  if (
    values.lastWorkingDate &&
    values.lastWorkingDate <
      values.joiningDate
  ) {
    throw new AppError({
      message:
        "Last working date cannot be before joining date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }

  if (
    values.resignationDate &&
    values.lastWorkingDate &&
    values.lastWorkingDate <
      values.resignationDate
  ) {
    throw new AppError({
      message:
        "Last working date cannot be before resignation date",

      statusCode: 422,

      code:
        "INVALID_EMPLOYEE_DATE_RANGE"
    });
  }
}

function throwConflictError(
  conflicts: EmployeeConflictFlags
): void {
  if (conflicts.employeeCodeExists) {
    throw new AppError({
      message:
        "This employee code is already in use",

      statusCode: 409,

      code:
        "EMPLOYEE_CODE_EXISTS"
    });
  }

  if (conflicts.cnicNumberExists) {
    throw new AppError({
      message:
        "This CNIC number is already assigned to another employee",

      statusCode: 409,

      code:
        "EMPLOYEE_CNIC_EXISTS"
    });
  }

  if (
    conflicts.officialEmailExists
  ) {
    throw new AppError({
      message:
        "This official email is already assigned to another employee",

      statusCode: 409,

      code:
        "EMPLOYEE_OFFICIAL_EMAIL_EXISTS"
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

function translateRepositoryError(
  error: unknown
): never {
  if (
    error instanceof Error &&
    error.message ===
      "POSITION_CAPACITY_EXCEEDED"
  ) {
    throw new AppError({
      message:
        "The selected position has no available headcount",

      statusCode: 409,

      code:
        "POSITION_CAPACITY_EXCEEDED"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "POSITION_NOT_ASSIGNABLE"
  ) {
    throw new AppError({
      message:
        "The selected position is not active or assignable",

      statusCode: 422,

      code:
        "POSITION_NOT_ASSIGNABLE"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "POSITION_NOT_EFFECTIVE"
  ) {
    throw new AppError({
      message:
        "The selected position cannot be assigned on the requested effective date",

      statusCode: 422,

      code:
        "POSITION_NOT_EFFECTIVE"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "COMPANY_NOT_FOUND"
  ) {
    throw new AppError({
      message:
        "The selected company was not found or is inactive",

      statusCode: 404,

      code:
        "COMPANY_NOT_FOUND"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "EMPLOYEE_CODE_TOO_LONG"
  ) {
    throw new AppError({
      message:
        "The generated employee code exceeds the supported length",

      statusCode: 422,

      code:
        "EMPLOYEE_CODE_TOO_LONG"
    });
  }

  if (isDuplicateEntryError(error)) {
    throw new AppError({
      message:
        "Employee code, CNIC or official email is already in use",

      statusCode: 409,

      code:
        "EMPLOYEE_UNIQUE_VALUE_EXISTS"
    });
  }

  throw error;
}

export async function getEmployeeLookupData() {
  return getEmployeeLookups();
}

export async function listEmployees(
  query: EmployeeListQuery,
  auth: AuthContext
): Promise<{
  employees: EmployeeResponse[];

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
          "You cannot list employees belonging to another company",

        statusCode: 403,

        code:
          "EMPLOYEE_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  const options:
  EmployeeListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    companyId,

    ...(assignedBranchIds(auth).length > 0
      ? { branchIds: assignedBranchIds(auth) }
      : {}),

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

    ...(query.reportingManagerId !==
    undefined
      ? {
          reportingManagerId:
            query.reportingManagerId
        }
      : {}),

    ...(query.positionId !==
    undefined
      ? {
          positionId:
            query.positionId
        }
      : {}),

    ...(query.employmentTypeId !==
    undefined
      ? {
          employmentTypeId:
            query.employmentTypeId
        }
      : {}),

    ...(query.employeeStatusId !==
    undefined
      ? {
          employeeStatusId:
            query.employeeStatusId
        }
      : {}),

    ...(query.search !== undefined
      ? {
          search:
            query.search
        }
      : {}),

    ...(query.gender !== undefined
      ? {
          gender:
            query.gender
        }
      : {}),

    ...(query.isActive !== undefined
      ? {
          isActive:
            query.isActive
        }
      : {}),

    ...(query.joiningDateFrom !==
    undefined
      ? {
          joiningDateFrom:
            query.joiningDateFrom
        }
      : {}),

    ...(query.joiningDateTo !==
    undefined
      ? {
          joiningDateTo:
            query.joiningDateTo
        }
      : {})
  };

  const result =
    await listEmployeeRecords(
      options
    );

  return {
    employees:
      result.employees.map(
        mapEmployee
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

export async function getEmployee(
  employeeId: string,
  auth: AuthContext
): Promise<EmployeeResponse> {
  const employee =
    await findEmployeeById(
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

  assertCompanyAccess(
    auth,
    String(employee.company_id)
  );

  assertEmployeeBranchAccess(
    auth,
    nullableId(employee.branch_id)
  );

  // edited by wali: Keep this endpoint for workforce admins; employees use the restricted /me endpoint.
  if (!hasPermission(auth, "employee.view_all")) {
    throw new AppError({
      message:
        "Full employee records require workforce access",

      statusCode: 403,

      code:
        "EMPLOYEE_ACCESS_DENIED"
    });
  }

  return mapEmployee(employee);
}

// edited by wali: Resolve an employee profile from the authenticated identity, never a client-supplied employee ID.
export async function getMyEmployeeProfile(
  auth: AuthContext
): Promise<EmployeeSelfProfileResponse> {
  if (!auth.employeeId || !auth.companyId) {
    throw new AppError({
      message: "This account is not linked to an employee profile",
      statusCode: 403,
      code: "EMPLOYEE_PROFILE_NOT_LINKED"
    });
  }

  const profile = await findEmployeeSelfProfile(
    auth.employeeId,
    auth.companyId
  );

  if (!profile) {
    throw new AppError({
      message: "Your employee profile could not be found",
      statusCode: 404,
      code: "EMPLOYEE_PROFILE_NOT_FOUND"
    });
  }

  return profile;
}

export async function createEmployee(
  input: CreateEmployeeInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeResponse> {
  const companyId =
    resolveCompanyId(
      input,
      auth
    );

  const companySettings =
    await findActiveCompanySettings(
      companyId
    );

  if (!companySettings) {
    throw new AppError({
      message:
        "The selected company was not found or is inactive",

      statusCode: 404,

      code:
        "COMPANY_NOT_FOUND"
    });
  }

  await validateEmploymentLookups(
    input.employmentTypeId,
    input.employeeStatusId
  );

  const employeeCode =
    input.employeeCode ?? null;

  if (employeeCode) {
    const conflicts =
      await findEmployeeConflicts(
        companyId,
        {
          employeeCode,

          cnicNumber:
            input.cnicNumber ?? null,

          officialEmail:
            input.officialEmail ?? null
        }
      );

    throwConflictError(
      conflicts
    );
  } else if (
    input.cnicNumber ||
    input.officialEmail
  ) {
    const temporaryCode =
      `__AUTO__${Date.now()}`;

    const conflicts =
      await findEmployeeConflicts(
        companyId,
        {
          employeeCode:
            temporaryCode,

          cnicNumber:
            input.cnicNumber ?? null,

          officialEmail:
            input.officialEmail ?? null
        }
      );

    if (
      conflicts.cnicNumberExists ||
      conflicts.officialEmailExists
    ) {
      throwConflictError(
        conflicts
      );
    }
  }

  const assignment =
    await resolveAssignment(
      companyId,
      input.assignment,
      {
        branchId: null,
        departmentId: null,
        projectId: null,
        designationId: null,
        reportingManagerId: null,
        positionId: null,
        assignmentType:
          "PRIMARY",
        effectiveFrom:
          input.joiningDate,
        workLocation: null,
        employmentPercentage: 100,
        transferReason: null
      }
    );

  assertEmployeeBranchAccess(
    auth,
    assignment.branchId
  );

  if (
    assignment.effectiveFrom <
    input.joiningDate
  ) {
    throw new AppError({
      message:
        "Assignment effective date cannot be before joining date",

      statusCode: 422,

      code:
        "INVALID_ASSIGNMENT_EFFECTIVE_DATE"
    });
  }

  const record:
  EmployeeCreateRecord = {
    companyId,
    employeeCode,

    firstName:
      input.firstName,

    middleName:
      input.middleName ?? null,

    lastName:
      input.lastName ?? null,

    preferredName:
      input.preferredName ?? null,

    fatherName:
      input.fatherName ?? null,

    spouseName:
      input.spouseName ?? null,

    gender:
      input.gender ?? null,

    dateOfBirth:
      input.dateOfBirth ?? null,

    maritalStatus:
      input.maritalStatus ?? null,

    bloodGroup:
      input.bloodGroup ?? null,

    nationality:
      input.nationality,

    cnicNumber:
      input.cnicNumber ?? null,

    passportNumber:
      input.passportNumber ?? null,

    personalEmail:
      input.personalEmail ?? null,

    officialEmail:
      input.officialEmail ?? null,

    mobileNumber:
      input.mobileNumber ?? null,

    alternateNumber:
      input.alternateNumber ?? null,

    employmentTypeId:
      input.employmentTypeId,

    employeeStatusId:
      input.employeeStatusId,

    joiningDate:
      input.joiningDate,

    probationEndDate:
      input.probationEndDate ?? null,

    confirmationDate:
      input.confirmationDate ?? null,

    contractStartDate:
      input.contractStartDate ?? null,

    contractEndDate:
      input.contractEndDate ?? null,

    resignationDate:
      input.resignationDate ?? null,

    lastWorkingDate:
      input.lastWorkingDate ?? null,

    profilePhotoPath:
      input.profilePhotoPath ?? null,

    biometricIdentifier:
      input.biometricIdentifier ?? null,

    remarks:
      input.remarks ?? null,

    isActive:
      input.isActive,

    assignment
  };

  try {
    const employee =
      await createEmployeeRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEmployee(
      employee
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeResponse> {
  const existing =
    await findEmployeeById(
      employeeId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }

  const companyId =
    String(
      existing.company_id
    );

  assertCompanyAccess(
    auth,
    companyId
  );

  assertEmployeeBranchAccess(
    auth,
    nullableId(existing.branch_id)
  );

  const resultingEmploymentTypeId =
    input.employmentTypeId ??
    String(
      existing.employment_type_id
    );

  const resultingEmployeeStatusId =
    input.employeeStatusId ??
    String(
      existing.employee_status_id
    );

  await validateEmploymentLookups(
    resultingEmploymentTypeId,
    resultingEmployeeStatusId
  );

  const resultingEmployeeCode =
    input.employeeCode ??
    existing.employee_code;

  const resultingCnic =
    input.cnicNumber !== undefined
      ? input.cnicNumber
      : existing.cnic_number;

  const resultingOfficialEmail =
    input.officialEmail !== undefined
      ? input.officialEmail
      : existing.official_email;

  const conflicts =
    await findEmployeeConflicts(
      companyId,
      {
        employeeCode:
          resultingEmployeeCode,

        cnicNumber:
          resultingCnic,

        officialEmail:
          resultingOfficialEmail
      },
      employeeId
    );

  throwConflictError(
    conflicts
  );

  const resultingDates:
  EmployeeDateRange = {
    joiningDate:
      input.joiningDate ??
      requiredDateOnly(
        existing.joining_date
      ),

    probationEndDate:
      input.probationEndDate !==
        undefined
        ? input.probationEndDate
        : dateOnly(
            existing.probation_end_date
          ),

    confirmationDate:
      input.confirmationDate !==
        undefined
        ? input.confirmationDate
        : dateOnly(
            existing.confirmation_date
          ),

    contractStartDate:
      input.contractStartDate !==
        undefined
        ? input.contractStartDate
        : dateOnly(
            existing.contract_start_date
          ),

    contractEndDate:
      input.contractEndDate !==
        undefined
        ? input.contractEndDate
        : dateOnly(
            existing.contract_end_date
          ),

    resignationDate:
      input.resignationDate !==
        undefined
        ? input.resignationDate
        : dateOnly(
            existing.resignation_date
          ),

    lastWorkingDate:
      input.lastWorkingDate !==
        undefined
        ? input.lastWorkingDate
        : dateOnly(
            existing.last_working_date
          )
  };

  validateEmployeeDateRange(
    resultingDates
  );

  let assignment:
    EmployeeAssignmentMutation | null =
      null;

  if (input.assignment) {
    const currentEffectiveFrom =
      dateOnly(
        existing
          .assignment_effective_from
      );

    assignment =
      await resolveAssignment(
        companyId,
        input.assignment,
        {
          branchId:
            nullableId(
              existing.branch_id
            ),

          departmentId:
            nullableId(
              existing.department_id
            ),

          projectId:
            nullableId(existing.project_id),

          designationId:
            nullableId(
              existing.designation_id
            ),

          reportingManagerId:
            nullableId(
              existing.reporting_manager_id
            ),

          positionId:
            nullableId(
              existing.position_id
            ),

          assignmentType:
            existing.assignment_type ??
            "PRIMARY",

          effectiveFrom:
            currentEffectiveFrom ??
            resultingDates.joiningDate,

          workLocation:
            existing.work_location,

          employmentPercentage:
            nullableNumber(
              existing.employment_percentage
            ) ?? 100,

          transferReason:
            existing.transfer_reason
        },
        employeeId
      );

    assertEmployeeBranchAccess(
      auth,
      assignment.branchId
    );

    if (
      assignment.effectiveFrom <
      resultingDates.joiningDate
    ) {
      throw new AppError({
        message:
          "Assignment effective date cannot be before joining date",

        statusCode: 422,

        code:
          "INVALID_ASSIGNMENT_EFFECTIVE_DATE"
      });
    }

    if (
      currentEffectiveFrom &&
      assignment.effectiveFrom <=
        currentEffectiveFrom
    ) {
      throw new AppError({
        message:
          "New assignment effective date must be after the current assignment effective date",

        statusCode: 422,

        code:
          "ASSIGNMENT_EFFECTIVE_DATE_NOT_AFTER_CURRENT"
      });
    }
  }

  try {
    const employee =
      await updateEmployeeRecord(
        employeeId,
        companyId,
        input,
        assignment,
        createActor(auth),
        metadata
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

    return mapEmployee(
      employee
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployee(
  employeeId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const employee =
    await findEmployeeById(
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

  assertCompanyAccess(
    auth,
    String(
      employee.company_id
    )
  );

  if (
    auth.employeeId === employeeId
  ) {
    throw new AppError({
      message:
        "You cannot delete your own employee record",

      statusCode: 409,

      code:
        "SELF_EMPLOYEE_DELETE_NOT_ALLOWED"
    });
  }

  const deleted =
    await softDeleteEmployeeRecord(
      employeeId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Employee was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_NOT_FOUND"
    });
  }
}

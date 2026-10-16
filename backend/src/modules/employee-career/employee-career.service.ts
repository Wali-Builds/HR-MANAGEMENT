import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createEmployeeEducationRecord,
  createEmployeeExperienceRecord,
  deleteEmployeeEducationRecord,
  deleteEmployeeExperienceRecord,
  findEmployeeCareerOwnerById,
  findEmployeeEducationRecord,
  findEmployeeExperienceRecord,
  listEmployeeEducationRecords,
  listEmployeeExperienceRecords,
  updateEmployeeEducationRecord,
  updateEmployeeExperienceRecord
} from "./employee-career.repository.js";

import type {
  CreateEmployeeEducationInput,
  CreateEmployeeExperienceInput,
  UpdateEmployeeEducationInput,
  UpdateEmployeeExperienceInput
} from "./employee-career.schema.js";

import type {
  CreateEmployeeEducationRecord,
  CreateEmployeeExperienceRecord,
  EmployeeCareerActor,
  EmployeeCareerOwnerDatabaseRow,
  EmployeeEducationDatabaseRow,
  EmployeeEducationResponse,
  EmployeeExperienceDatabaseRow,
  EmployeeExperienceResponse,
  RequestMetadata,
  UpdateEmployeeEducationRecord,
  UpdateEmployeeExperienceRecord
} from "./employee-career.types.js";

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

function numberOrNull(
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

function requiredDateTime(
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
  // edited by wali: Allow linked Company Administrators to manage their company's employee career records.
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
): EmployeeCareerActor {
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

function mapEducation(
  education: EmployeeEducationDatabaseRow
): EmployeeEducationResponse {
  return {
    educationId:
      String(education.education_id),

    employeeId:
      String(education.employee_id),

    qualificationLevel:
      education.qualification_level,

    degreeTitle:
      education.degree_title,

    fieldOfStudy:
      education.field_of_study,

    institutionName:
      education.institution_name,

    boardUniversity:
      education.board_university,

    city:
      education.city,

    countryCode:
      education.country_code,

    startDate:
      dateOnly(
        education.start_date
      ),

    completionDate:
      dateOnly(
        education.completion_date
      ),

    isCurrentlyStudying:
      databaseBoolean(
        education.is_currently_studying
      ),

    resultType:
      education.result_type,

    resultValue:
      education.result_value,

    marksPercentage:
      numberOrNull(
        education.marks_percentage
      ),

    cgpa:
      numberOrNull(
        education.cgpa
      ),

    totalCgpa:
      numberOrNull(
        education.total_cgpa
      ),

    isHighestQualification:
      databaseBoolean(
        education.is_highest_qualification
      ),

    certificateDocumentPath:
      education.certificate_document_path,

    isVerified:
      databaseBoolean(
        education.is_verified
      ),

    verifiedByUserId:
      nullableId(
        education.verified_by_user_id
      ),

    verifiedAt:
      dateTimeIso(
        education.verified_at
      ),

    remarks:
      education.remarks,

    createdAt:
      requiredDateTime(
        education.created_at
      ),

    updatedAt:
      requiredDateTime(
        education.updated_at
      )
  };
}

function mapExperience(
  experience: EmployeeExperienceDatabaseRow
): EmployeeExperienceResponse {
  return {
    experienceId:
      String(experience.experience_id),

    employeeId:
      String(experience.employee_id),

    employerName:
      experience.employer_name,

    jobTitle:
      experience.job_title,

    department:
      experience.department,

    employmentType:
      experience.employment_type,

    location:
      experience.location,

    countryCode:
      experience.country_code,

    startDate:
      requiredDateOnly(
        experience.start_date
      ),

    endDate:
      dateOnly(
        experience.end_date
      ),

    isCurrent:
      databaseBoolean(
        experience.is_current
      ),

    responsibilities:
      experience.responsibilities,

    lastDrawnSalary:
      numberOrNull(
        experience.last_drawn_salary
      ),

    currencyCode:
      experience.currency_code,

    reasonForLeaving:
      experience.reason_for_leaving,

    referenceName:
      experience.reference_name,

    referencePhone:
      experience.reference_phone,

    referenceEmail:
      experience.reference_email,

    experienceLetterPath:
      experience.experience_letter_path,

    isVerified:
      databaseBoolean(
        experience.is_verified
      ),

    verifiedByUserId:
      nullableId(
        experience.verified_by_user_id
      ),

    verifiedAt:
      dateTimeIso(
        experience.verified_at
      ),

    remarks:
      experience.remarks,

    createdAt:
      requiredDateTime(
        experience.created_at
      ),

    updatedAt:
      requiredDateTime(
        experience.updated_at
      )
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeCareerOwnerDatabaseRow> {
  const employee =
    await findEmployeeCareerOwnerById(
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
  employee: EmployeeCareerOwnerDatabaseRow
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
  employee: EmployeeCareerOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  const isOwnProfile =
    auth.employeeId != null &&
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
      "You do not have permission to view this employee's career records",

    statusCode: 403,

    code:
      "EMPLOYEE_VIEW_ACCESS_DENIED"
  });
}

function assertManageAccess(
  auth: AuthContext,
  employee: EmployeeCareerOwnerDatabaseRow
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
      "You do not have permission to manage employee career records",

    statusCode: 403,

    code:
      "EMPLOYEE_UPDATE_ACCESS_DENIED"
  });
}

function assertEducationState(
  state: {
    startDate: string | null;
    completionDate: string | null;
    isCurrentlyStudying: boolean;
    cgpa: number | null;
    totalCgpa: number | null;
  }
): void {
  if (
    state.startDate &&
    state.completionDate &&
    state.completionDate <
      state.startDate
  ) {
    throw new AppError({
      message:
        "Completion date cannot be before start date",

      statusCode: 422,

      code:
        "INVALID_EDUCATION_DATE_RANGE"
    });
  }

  if (
    state.isCurrentlyStudying &&
    state.completionDate !== null
  ) {
    throw new AppError({
      message:
        "A currently studying qualification cannot have a completion date",

      statusCode: 422,

      code:
        "CURRENT_EDUCATION_COMPLETION_DATE_NOT_ALLOWED"
    });
  }

  const hasCgpa =
    state.cgpa !== null;

  const hasTotalCgpa =
    state.totalCgpa !== null;

  if (hasCgpa !== hasTotalCgpa) {
    throw new AppError({
      message:
        "CGPA and total CGPA must be provided together",

      statusCode: 422,

      code:
        "INCOMPLETE_CGPA_VALUES"
    });
  }

  if (
    state.cgpa !== null &&
    state.totalCgpa !== null &&
    state.cgpa >
      state.totalCgpa
  ) {
    throw new AppError({
      message:
        "CGPA cannot exceed total CGPA",

      statusCode: 422,

      code:
        "INVALID_CGPA_VALUES"
    });
  }
}

function assertExperienceState(
  state: {
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
  }
): void {
  if (
    state.endDate &&
    state.endDate <
      state.startDate
  ) {
    throw new AppError({
      message:
        "Experience end date cannot be before start date",

      statusCode: 422,

      code:
        "INVALID_EXPERIENCE_DATE_RANGE"
    });
  }

  if (
    state.isCurrent &&
    state.endDate !== null
  ) {
    throw new AppError({
      message:
        "A current experience cannot have an end date",

      statusCode: 422,

      code:
        "CURRENT_EXPERIENCE_END_DATE_NOT_ALLOWED"
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
      "DUPLICATE_EMPLOYEE_EDUCATION"
  ) {
    throw new AppError({
      message:
        "The same education record already exists for this employee",

      statusCode: 409,

      code:
        "EMPLOYEE_EDUCATION_EXISTS"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "DUPLICATE_EMPLOYEE_EXPERIENCE"
  ) {
    throw new AppError({
      message:
        "The same experience record already exists for this employee",

      statusCode: 409,

      code:
        "EMPLOYEE_EXPERIENCE_EXISTS"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Education service
 * =========================================================
 */

export async function listEmployeeEducations(
  employeeId: string,
  auth: AuthContext
): Promise<EmployeeEducationResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeEducationRecords(
      employeeId
    );

  return records.map(
    mapEducation
  );
}

export async function createEmployeeEducation(
  employeeId: string,
  input: CreateEmployeeEducationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeEducationResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  assertEducationState({
    startDate:
      input.startDate ?? null,

    completionDate:
      input.completionDate ?? null,

    isCurrentlyStudying:
      input.isCurrentlyStudying,

    cgpa:
      input.cgpa ?? null,

    totalCgpa:
      input.totalCgpa ?? null
  });

  const record:
  CreateEmployeeEducationRecord = {
    employeeId,

    qualificationLevel:
      input.qualificationLevel,

    degreeTitle:
      input.degreeTitle,

    fieldOfStudy:
      input.fieldOfStudy ?? null,

    institutionName:
      input.institutionName,

    boardUniversity:
      input.boardUniversity ?? null,

    city:
      input.city ?? null,

    countryCode:
      input.countryCode,

    startDate:
      input.startDate ?? null,

    completionDate:
      input.completionDate ?? null,

    isCurrentlyStudying:
      input.isCurrentlyStudying,

    resultType:
      input.resultType ?? null,

    resultValue:
      input.resultValue ?? null,

    marksPercentage:
      input.marksPercentage ?? null,

    cgpa:
      input.cgpa ?? null,

    totalCgpa:
      input.totalCgpa ?? null,

    isHighestQualification:
      input.isHighestQualification,

    certificateDocumentPath:
      input.certificateDocumentPath ??
      null,

    remarks:
      input.remarks ?? null
  };

  try {
    const education =
      await createEmployeeEducationRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEducation(
      education
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeEducation(
  employeeId: string,
  educationId: string,
  input: UpdateEmployeeEducationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeEducationResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeEducationRecord(
      employeeId,
      educationId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee education record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_EDUCATION_NOT_FOUND"
    });
  }

  assertEducationState({
    startDate:
      input.startDate !== undefined
        ? input.startDate
        : dateOnly(
            existing.start_date
          ),

    completionDate:
      input.completionDate !== undefined
        ? input.completionDate
        : dateOnly(
            existing.completion_date
          ),

    isCurrentlyStudying:
      input.isCurrentlyStudying ??
      databaseBoolean(
        existing.is_currently_studying
      ),

    cgpa:
      input.cgpa !== undefined
        ? input.cgpa
        : numberOrNull(
            existing.cgpa
          ),

    totalCgpa:
      input.totalCgpa !== undefined
        ? input.totalCgpa
        : numberOrNull(
            existing.total_cgpa
          )
  });

  const record:
  UpdateEmployeeEducationRecord = {
    ...(input.qualificationLevel !==
    undefined
      ? {
          qualificationLevel:
            input.qualificationLevel
        }
      : {}),

    ...(input.degreeTitle !== undefined
      ? {
          degreeTitle:
            input.degreeTitle
        }
      : {}),

    ...(input.fieldOfStudy !== undefined
      ? {
          fieldOfStudy:
            input.fieldOfStudy
        }
      : {}),

    ...(input.institutionName !==
    undefined
      ? {
          institutionName:
            input.institutionName
        }
      : {}),

    ...(input.boardUniversity !==
    undefined
      ? {
          boardUniversity:
            input.boardUniversity
        }
      : {}),

    ...(input.city !== undefined
      ? {
          city:
            input.city
        }
      : {}),

    ...(input.countryCode !== undefined
      ? {
          countryCode:
            input.countryCode
        }
      : {}),

    ...(input.startDate !== undefined
      ? {
          startDate:
            input.startDate
        }
      : {}),

    ...(input.completionDate !==
    undefined
      ? {
          completionDate:
            input.completionDate
        }
      : {}),

    ...(input.isCurrentlyStudying !==
    undefined
      ? {
          isCurrentlyStudying:
            input.isCurrentlyStudying
        }
      : {}),

    ...(input.resultType !== undefined
      ? {
          resultType:
            input.resultType
        }
      : {}),

    ...(input.resultValue !== undefined
      ? {
          resultValue:
            input.resultValue
        }
      : {}),

    ...(input.marksPercentage !==
    undefined
      ? {
          marksPercentage:
            input.marksPercentage
        }
      : {}),

    ...(input.cgpa !== undefined
      ? {
          cgpa:
            input.cgpa
        }
      : {}),

    ...(input.totalCgpa !== undefined
      ? {
          totalCgpa:
            input.totalCgpa
        }
      : {}),

    ...(input.isHighestQualification !==
    undefined
      ? {
          isHighestQualification:
            input.isHighestQualification
        }
      : {}),

    ...(input.certificateDocumentPath !==
    undefined
      ? {
          certificateDocumentPath:
            input.certificateDocumentPath
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
    const education =
      await updateEmployeeEducationRecord(
        employeeId,
        educationId,
        record,
        createActor(auth),
        metadata
      );

    if (!education) {
      throw new AppError({
        message:
          "Employee education record was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_EDUCATION_NOT_FOUND"
      });
    }

    return mapEducation(
      education
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeEducation(
  employeeId: string,
  educationId: string,
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

  const deleted =
    await deleteEmployeeEducationRecord(
      employeeId,
      educationId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Employee education record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_EDUCATION_NOT_FOUND"
    });
  }
}

/*
 * =========================================================
 * Experience service
 * =========================================================
 */

export async function listEmployeeExperiences(
  employeeId: string,
  auth: AuthContext
): Promise<EmployeeExperienceResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeExperienceRecords(
      employeeId
    );

  return records.map(
    mapExperience
  );
}

export async function createEmployeeExperience(
  employeeId: string,
  input: CreateEmployeeExperienceInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeExperienceResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  assertExperienceState({
    startDate:
      input.startDate,

    endDate:
      input.endDate ?? null,

    isCurrent:
      input.isCurrent
  });

  const record:
  CreateEmployeeExperienceRecord = {
    employeeId,

    employerName:
      input.employerName,

    jobTitle:
      input.jobTitle,

    department:
      input.department ?? null,

    employmentType:
      input.employmentType ?? null,

    location:
      input.location ?? null,

    countryCode:
      input.countryCode,

    startDate:
      input.startDate,

    endDate:
      input.endDate ?? null,

    isCurrent:
      input.isCurrent,

    responsibilities:
      input.responsibilities ?? null,

    lastDrawnSalary:
      input.lastDrawnSalary ?? null,

    currencyCode:
      input.currencyCode,

    reasonForLeaving:
      input.reasonForLeaving ?? null,

    referenceName:
      input.referenceName ?? null,

    referencePhone:
      input.referencePhone ?? null,

    referenceEmail:
      input.referenceEmail ?? null,

    experienceLetterPath:
      input.experienceLetterPath ??
      null,

    remarks:
      input.remarks ?? null
  };

  try {
    const experience =
      await createEmployeeExperienceRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapExperience(
      experience
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeExperience(
  employeeId: string,
  experienceId: string,
  input: UpdateEmployeeExperienceInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeExperienceResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeExperienceRecord(
      employeeId,
      experienceId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee experience record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_EXPERIENCE_NOT_FOUND"
    });
  }

  const resultingStartDate =
    input.startDate ??
    requiredDateOnly(
      existing.start_date
    );

  const resultingEndDate =
    input.endDate !== undefined
      ? input.endDate
      : dateOnly(
          existing.end_date
        );

  const resultingIsCurrent =
    input.isCurrent ??
    databaseBoolean(
      existing.is_current
    );

  assertExperienceState({
    startDate:
      resultingStartDate,

    endDate:
      resultingEndDate,

    isCurrent:
      resultingIsCurrent
  });

  const record:
  UpdateEmployeeExperienceRecord = {
    ...(input.employerName !== undefined
      ? {
          employerName:
            input.employerName
        }
      : {}),

    ...(input.jobTitle !== undefined
      ? {
          jobTitle:
            input.jobTitle
        }
      : {}),

    ...(input.department !== undefined
      ? {
          department:
            input.department
        }
      : {}),

    ...(input.employmentType !==
    undefined
      ? {
          employmentType:
            input.employmentType
        }
      : {}),

    ...(input.location !== undefined
      ? {
          location:
            input.location
        }
      : {}),

    ...(input.countryCode !== undefined
      ? {
          countryCode:
            input.countryCode
        }
      : {}),

    ...(input.startDate !== undefined
      ? {
          startDate:
            input.startDate
        }
      : {}),

    ...(input.endDate !== undefined
      ? {
          endDate:
            input.endDate
        }
      : {}),

    ...(input.isCurrent !== undefined
      ? {
          isCurrent:
            input.isCurrent
        }
      : {}),

    ...(input.responsibilities !==
    undefined
      ? {
          responsibilities:
            input.responsibilities
        }
      : {}),

    ...(input.lastDrawnSalary !==
    undefined
      ? {
          lastDrawnSalary:
            input.lastDrawnSalary
        }
      : {}),

    ...(input.currencyCode !== undefined
      ? {
          currencyCode:
            input.currencyCode
        }
      : {}),

    ...(input.reasonForLeaving !==
    undefined
      ? {
          reasonForLeaving:
            input.reasonForLeaving
        }
      : {}),

    ...(input.referenceName !== undefined
      ? {
          referenceName:
            input.referenceName
        }
      : {}),

    ...(input.referencePhone !==
    undefined
      ? {
          referencePhone:
            input.referencePhone
        }
      : {}),

    ...(input.referenceEmail !== undefined
      ? {
          referenceEmail:
            input.referenceEmail
        }
      : {}),

    ...(input.experienceLetterPath !==
    undefined
      ? {
          experienceLetterPath:
            input.experienceLetterPath
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
    const experience =
      await updateEmployeeExperienceRecord(
        employeeId,
        experienceId,
        record,
        createActor(auth),
        metadata
      );

    if (!experience) {
      throw new AppError({
        message:
          "Employee experience record was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_EXPERIENCE_NOT_FOUND"
      });
    }

    return mapExperience(
      experience
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeExperience(
  employeeId: string,
  experienceId: string,
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

  const deleted =
    await deleteEmployeeExperienceRecord(
      employeeId,
      experienceId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Employee experience record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_EXPERIENCE_NOT_FOUND"
    });
  }
}

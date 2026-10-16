import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createEmployeeCertificationRecord,
  createEmployeeSkillRecord,
  deactivateEmployeeCertificationRecord,
  deleteEmployeeSkillRecord,
  findActiveCertificationDefinitionById,
  findActiveSkillDefinitionById,
  findEmployeeCertificationRecord,
  findEmployeeCompetencyOwnerById,
  findEmployeeSkillRecord,
  listCertificationLookupRecords,
  listEmployeeCertificationRecords,
  listEmployeeSkillRecords,
  listSkillLookupRecords,
  updateEmployeeCertificationRecord,
  updateEmployeeSkillRecord
} from "./employee-competency.repository.js";

import type {
  CreateEmployeeCertificationInput,
  CreateEmployeeSkillInput,
  EmployeeCertificationListQuery,
  EmployeeCompetencyLookupQuery,
  UpdateEmployeeCertificationInput,
  UpdateEmployeeSkillInput
} from "./employee-competency.schema.js";

import type {
  CertificationLookupDatabaseRow,
  CertificationLookupResponse,
  CreateEmployeeCertificationRecord,
  CreateEmployeeSkillRecord,
  EmployeeCertificationDatabaseRow,
  EmployeeCertificationResponse,
  EmployeeCompetencyActor,
  EmployeeCompetencyOwnerDatabaseRow,
  EmployeeSkillDatabaseRow,
  EmployeeSkillResponse,
  RequestMetadata,
  SkillLookupDatabaseRow,
  SkillLookupResponse,
  UpdateEmployeeCertificationRecord,
  UpdateEmployeeSkillRecord
} from "./employee-competency.types.js";

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

function requiredDateTimeIso(
  value: Date | string
): string {
  return dateTimeIso(value) as string;
}

function toDatabaseDateTime(
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }

  const date =
    new Date(value);

  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  const hours =
    String(
      date.getUTCHours()
    ).padStart(2, "0");

  const minutes =
    String(
      date.getUTCMinutes()
    ).padStart(2, "0");

  const seconds =
    String(
      date.getUTCSeconds()
    ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
  // edited by wali: Allow linked Company Administrators to manage employee competencies in their company.
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
): EmployeeCompetencyActor {
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

function mapSkillLookup(
  skill: SkillLookupDatabaseRow
): SkillLookupResponse {
  return {
    skillId:
      String(skill.skill_id),

    companyId:
      String(skill.company_id),

    skillCategoryId:
      nullableId(
        skill.skill_category_id
      ),

    categoryCode:
      skill.category_code,

    categoryName:
      skill.category_name,

    skillCode:
      skill.skill_code,

    skillName:
      skill.skill_name,

    description:
      skill.description,

    skillType:
      skill.skill_type,

    proficiencyScaleMaximum:
      Number(
        skill.proficiency_scale_maximum
      ),

    measurementMethod:
      skill.measurement_method,

    isCertificationRequired:
      databaseBoolean(
        skill.is_certification_required
      ),

    isActive:
      databaseBoolean(
        skill.is_active
      )
  };
}

function mapCertificationLookup(
  certification: CertificationLookupDatabaseRow
): CertificationLookupResponse {
  return {
    certificationId:
      String(
        certification.certification_id
      ),

    companyId:
      String(
        certification.company_id
      ),

    certificationCode:
      certification.certification_code,

    certificationName:
      certification.certification_name,

    issuingOrganization:
      certification.issuing_organization,

    certificationCategory:
      certification.certification_category,

    description:
      certification.description,

    defaultValidityMonths:
      numberOrNull(
        certification.default_validity_months
      ),

    renewalRequired:
      databaseBoolean(
        certification.renewal_required
      ),

    relatedSkillId:
      nullableId(
        certification.related_skill_id
      ),

    relatedSkillCode:
      certification.related_skill_code,

    relatedSkillName:
      certification.related_skill_name,

    isMandatory:
      databaseBoolean(
        certification.is_mandatory
      ),

    isActive:
      databaseBoolean(
        certification.is_active
      )
  };
}

function mapEmployeeSkill(
  skill: EmployeeSkillDatabaseRow
): EmployeeSkillResponse {
  return {
    employeeSkillId:
      String(
        skill.employee_skill_id
      ),

    companyId:
      String(skill.company_id),

    employeeId:
      String(skill.employee_id),

    skillId:
      String(skill.skill_id),

    skillCode:
      skill.skill_code,

    skillName:
      skill.skill_name,

    skillType:
      skill.skill_type,

    skillCategoryId:
      nullableId(
        skill.skill_category_id
      ),

    categoryCode:
      skill.category_code,

    categoryName:
      skill.category_name,

    proficiencyScaleMaximum:
      Number(
        skill.proficiency_scale_maximum
      ),

    measurementMethod:
      skill.measurement_method,

    isCertificationRequired:
      databaseBoolean(
        skill.is_certification_required
      ),

    proficiencyLevel:
      Number(
        skill.proficiency_level
      ),

    targetProficiencyLevel:
      numberOrNull(
        skill.target_proficiency_level
      ),

    yearsOfExperience:
      numberOrNull(
        skill.years_of_experience
      ),

    sourceType:
      skill.source_type,

    isPrimarySkill:
      databaseBoolean(
        skill.is_primary_skill
      ),

    isVerified:
      databaseBoolean(
        skill.is_verified
      ),

    verifiedByUserId:
      nullableId(
        skill.verified_by_user_id
      ),

    verifiedAt:
      dateTimeIso(
        skill.verified_at
      ),

    lastAssessedAt:
      dateTimeIso(
        skill.last_assessed_at
      ),

    nextAssessmentDate:
      dateOnly(
        skill.next_assessment_date
      ),

    evidenceStoragePath:
      skill.evidence_storage_path,

    remarks:
      skill.remarks,

    createdAt:
      requiredDateTimeIso(
        skill.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        skill.updated_at
      )
  };
}

function mapEmployeeCertification(
  certification: EmployeeCertificationDatabaseRow
): EmployeeCertificationResponse {
  return {
    employeeCertificationId:
      String(
        certification.employee_certification_id
      ),

    companyId:
      String(
        certification.company_id
      ),

    employeeId:
      String(
        certification.employee_id
      ),

    certificationId:
      String(
        certification.certification_id
      ),

    certificationCode:
      certification.certification_code,

    certificationName:
      certification.certification_name,

    definitionIssuingOrganization:
      certification
        .definition_issuing_organization,

    certificationCategory:
      certification.certification_category,

    defaultValidityMonths:
      numberOrNull(
        certification.default_validity_months
      ),

    renewalRequired:
      databaseBoolean(
        certification.renewal_required
      ),

    relatedSkillId:
      nullableId(
        certification.related_skill_id
      ),

    relatedSkillCode:
      certification.related_skill_code,

    relatedSkillName:
      certification.related_skill_name,

    isMandatory:
      databaseBoolean(
        certification.is_mandatory
      ),

    trainingEnrollmentId:
      nullableId(
        certification.training_enrollment_id
      ),

    certificateNumber:
      certification.certificate_number,

    issueDate:
      requiredDateOnly(
        certification.issue_date
      ),

    expiryDate:
      dateOnly(
        certification.expiry_date
      ),

    issuingOrganization:
      certification.issuing_organization,

    verificationStatus:
      certification.verification_status,

    verifiedByUserId:
      nullableId(
        certification.verified_by_user_id
      ),

    verifiedAt:
      dateTimeIso(
        certification.verified_at
      ),

    certificateStoragePath:
      certification.certificate_storage_path,

    checksumSha256:
      certification.checksum_sha256,

    renewalStatus:
      certification.renewal_status,

    renewalReminderSentAt:
      dateTimeIso(
        certification
          .renewal_reminder_sent_at
      ),

    isActive:
      databaseBoolean(
        certification.is_active
      ),

    createdAt:
      requiredDateTimeIso(
        certification.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        certification.updated_at
      )
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeCompetencyOwnerDatabaseRow> {
  const employee =
    await findEmployeeCompetencyOwnerById(
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
  employee: EmployeeCompetencyOwnerDatabaseRow
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
  employee: EmployeeCompetencyOwnerDatabaseRow
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
      "You do not have permission to view this employee's competency records",

    statusCode: 403,

    code:
      "EMPLOYEE_VIEW_ACCESS_DENIED"
  });
}

function assertManageAccess(
  auth: AuthContext,
  employee: EmployeeCompetencyOwnerDatabaseRow
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
      "You do not have permission to manage employee competency records",

    statusCode: 403,

    code:
      "EMPLOYEE_UPDATE_ACCESS_DENIED"
  });
}

function assertSkillState(
  input: {
    proficiencyLevel: number;
    targetProficiencyLevel: number | null;
    maximumLevel: number;
    lastAssessedAt: string | null;
    nextAssessmentDate: string | null;
  }
): void {
  if (
    input.proficiencyLevel >
    input.maximumLevel
  ) {
    throw new AppError({
      message:
        `Proficiency level cannot exceed ${input.maximumLevel}`,

      statusCode: 422,

      code:
        "PROFICIENCY_EXCEEDS_SKILL_SCALE"
    });
  }

  if (
    input.targetProficiencyLevel !==
      null &&
    input.targetProficiencyLevel >
      input.maximumLevel
  ) {
    throw new AppError({
      message:
        `Target proficiency level cannot exceed ${input.maximumLevel}`,

      statusCode: 422,

      code:
        "TARGET_PROFICIENCY_EXCEEDS_SKILL_SCALE"
    });
  }

  if (
    input.targetProficiencyLevel !==
      null &&
    input.targetProficiencyLevel <
      input.proficiencyLevel
  ) {
    throw new AppError({
      message:
        "Target proficiency cannot be lower than current proficiency",

      statusCode: 422,

      code:
        "INVALID_TARGET_PROFICIENCY"
    });
  }

  if (
    input.lastAssessedAt !== null &&
    input.nextAssessmentDate !== null
  ) {
    const lastAssessmentDate =
      new Date(
        input.lastAssessedAt
      )
        .toISOString()
        .slice(0, 10);

    if (
      input.nextAssessmentDate <
      lastAssessmentDate
    ) {
      throw new AppError({
        message:
          "Next assessment date cannot be before the last assessment date",

        statusCode: 422,

        code:
          "INVALID_SKILL_ASSESSMENT_DATE"
      });
    }
  }
}

function assertCertificationDates(
  issueDate: string,
  expiryDate: string | null
): void {
  if (
    expiryDate !== null &&
    expiryDate < issueDate
  ) {
    throw new AppError({
      message:
        "Certification expiry date cannot be before its issue date",

      statusCode: 422,

      code:
        "INVALID_CERTIFICATION_DATE_RANGE"
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
        "The employee company does not match the supplied company",

      statusCode: 409,

      code:
        "EMPLOYEE_COMPANY_MISMATCH"
    });
  }

  if (
    error instanceof Error &&
    error.message ===
      "DUPLICATE_EMPLOYEE_SKILL"
  ) {
    throw new AppError({
      message:
        "This skill is already assigned to the employee",

      statusCode: 409,

      code:
        "EMPLOYEE_SKILL_EXISTS"
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
        "The requested employee competency record already exists",

      statusCode: 409,

      code:
        "EMPLOYEE_COMPETENCY_EXISTS"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Lookups
 * =========================================================
 */

export async function getEmployeeCompetencyLookups(
  employeeId: string,
  query: EmployeeCompetencyLookupQuery,
  auth: AuthContext
): Promise<{
  skills: SkillLookupResponse[];
  certifications: CertificationLookupResponse[];
}> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const companyId =
    String(employee.company_id);

  const [
    skillRecords,
    certificationRecords
  ] = await Promise.all([
    listSkillLookupRecords(
      companyId,
      query.search,
      query.includeInactive
    ),

    listCertificationLookupRecords(
      companyId,
      query.search,
      query.includeInactive
    )
  ]);

  return {
    skills:
      skillRecords.map(
        mapSkillLookup
      ),

    certifications:
      certificationRecords.map(
        mapCertificationLookup
      )
  };
}

/*
 * =========================================================
 * Employee skills
 * =========================================================
 */

export async function listEmployeeSkills(
  employeeId: string,
  auth: AuthContext
): Promise<EmployeeSkillResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeSkillRecords(
      employeeId
    );

  return records.map(
    mapEmployeeSkill
  );
}

export async function createEmployeeSkill(
  employeeId: string,
  input: CreateEmployeeSkillInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSkillResponse> {
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

  const skillDefinition =
    await findActiveSkillDefinitionById(
      companyId,
      input.skillId
    );

  if (!skillDefinition) {
    throw new AppError({
      message:
        "An active skill belonging to the employee's company was not found",

      statusCode: 404,

      code:
        "SKILL_NOT_FOUND"
    });
  }

  assertSkillState({
    proficiencyLevel:
      input.proficiencyLevel,

    targetProficiencyLevel:
      input.targetProficiencyLevel ??
      null,

    maximumLevel:
      Number(
        skillDefinition
          .proficiency_scale_maximum
      ),

    lastAssessedAt:
      input.lastAssessedAt ??
      null,

    nextAssessmentDate:
      input.nextAssessmentDate ??
      null
  });

  const record:
  CreateEmployeeSkillRecord = {
    companyId,
    employeeId,

    skillId:
      input.skillId,

    proficiencyLevel:
      input.proficiencyLevel,

    targetProficiencyLevel:
      input.targetProficiencyLevel ??
      null,

    yearsOfExperience:
      input.yearsOfExperience ??
      null,

    sourceType:
      input.sourceType,

    isPrimarySkill:
      input.isPrimarySkill,

    lastAssessedAt:
      toDatabaseDateTime(
        input.lastAssessedAt ??
        null
      ),

    nextAssessmentDate:
      input.nextAssessmentDate ??
      null,

    evidenceStoragePath:
      input.evidenceStoragePath ??
      null,

    remarks:
      input.remarks ?? null
  };

  try {
    const created =
      await createEmployeeSkillRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEmployeeSkill(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeSkill(
  employeeId: string,
  employeeSkillId: string,
  input: UpdateEmployeeSkillInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeSkillResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeSkillRecord(
      employeeId,
      employeeSkillId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee skill record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SKILL_NOT_FOUND"
    });
  }

  const resultingProficiency =
    input.proficiencyLevel ??
    Number(
      existing.proficiency_level
    );

  const resultingTarget =
    input.targetProficiencyLevel !==
      undefined
      ? input.targetProficiencyLevel
      : numberOrNull(
          existing
            .target_proficiency_level
        );

  const resultingLastAssessedAt =
    input.lastAssessedAt !== undefined
      ? input.lastAssessedAt
      : dateTimeIso(
          existing.last_assessed_at
        );

  const resultingNextAssessment =
    input.nextAssessmentDate !==
      undefined
      ? input.nextAssessmentDate
      : dateOnly(
          existing.next_assessment_date
        );

  assertSkillState({
    proficiencyLevel:
      resultingProficiency,

    targetProficiencyLevel:
      resultingTarget,

    maximumLevel:
      Number(
        existing
          .proficiency_scale_maximum
      ),

    lastAssessedAt:
      resultingLastAssessedAt,

    nextAssessmentDate:
      resultingNextAssessment
  });

  const record:
  UpdateEmployeeSkillRecord = {
    ...(input.proficiencyLevel !==
    undefined
      ? {
          proficiencyLevel:
            input.proficiencyLevel
        }
      : {}),

    ...(input.targetProficiencyLevel !==
    undefined
      ? {
          targetProficiencyLevel:
            input.targetProficiencyLevel
        }
      : {}),

    ...(input.yearsOfExperience !==
    undefined
      ? {
          yearsOfExperience:
            input.yearsOfExperience
        }
      : {}),

    ...(input.sourceType !== undefined
      ? {
          sourceType:
            input.sourceType
        }
      : {}),

    ...(input.isPrimarySkill !==
    undefined
      ? {
          isPrimarySkill:
            input.isPrimarySkill
        }
      : {}),

    ...(input.lastAssessedAt !==
    undefined
      ? {
          lastAssessedAt:
            toDatabaseDateTime(
              input.lastAssessedAt
            )
        }
      : {}),

    ...(input.nextAssessmentDate !==
    undefined
      ? {
          nextAssessmentDate:
            input.nextAssessmentDate
        }
      : {}),

    ...(input.evidenceStoragePath !==
    undefined
      ? {
          evidenceStoragePath:
            input.evidenceStoragePath
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
    const updated =
      await updateEmployeeSkillRecord(
        employeeId,
        employeeSkillId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee skill record was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_SKILL_NOT_FOUND"
      });
    }

    return mapEmployeeSkill(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeSkill(
  employeeId: string,
  employeeSkillId: string,
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
    await deleteEmployeeSkillRecord(
      employeeId,
      employeeSkillId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Employee skill record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_SKILL_NOT_FOUND"
    });
  }
}

/*
 * =========================================================
 * Employee certifications
 * =========================================================
 */

export async function listEmployeeCertifications(
  employeeId: string,
  query: EmployeeCertificationListQuery,
  auth: AuthContext
): Promise<EmployeeCertificationResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertViewAccess(
    auth,
    employee
  );

  const records =
    await listEmployeeCertificationRecords(
      employeeId,
      query.includeInactive
    );

  return records.map(
    mapEmployeeCertification
  );
}

export async function createEmployeeCertification(
  employeeId: string,
  input: CreateEmployeeCertificationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeCertificationResponse> {
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

  const certificationDefinition =
    await findActiveCertificationDefinitionById(
      companyId,
      input.certificationId
    );

  if (!certificationDefinition) {
    throw new AppError({
      message:
        "An active certification belonging to the employee's company was not found",

      statusCode: 404,

      code:
        "CERTIFICATION_NOT_FOUND"
    });
  }

  assertCertificationDates(
    input.issueDate,
    input.expiryDate ?? null
  );

  const record:
  CreateEmployeeCertificationRecord = {
    companyId,
    employeeId,

    certificationId:
      input.certificationId,

    trainingEnrollmentId:
      input.trainingEnrollmentId ??
      null,

    certificateNumber:
      input.certificateNumber ??
      null,

    issueDate:
      input.issueDate,

    expiryDate:
      input.expiryDate ?? null,

    issuingOrganization:
      input.issuingOrganization ??
      certificationDefinition
        .issuing_organization,

    certificateStoragePath:
      input.certificateStoragePath ??
      null,

    checksumSha256:
      input.checksumSha256 ??
      null,

    renewalStatus:
      input.renewalStatus ??
      null,

    isActive:
      input.isActive
  };

  try {
    const created =
      await createEmployeeCertificationRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEmployeeCertification(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeCertification(
  employeeId: string,
  employeeCertificationId: string,
  input: UpdateEmployeeCertificationInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeCertificationResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertManageAccess(
    auth,
    employee
  );

  const existing =
    await findEmployeeCertificationRecord(
      employeeId,
      employeeCertificationId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee certification record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_CERTIFICATION_NOT_FOUND"
    });
  }

  const resultingIssueDate =
    input.issueDate ??
    requiredDateOnly(
      existing.issue_date
    );

  const resultingExpiryDate =
    input.expiryDate !== undefined
      ? input.expiryDate
      : dateOnly(
          existing.expiry_date
        );

  assertCertificationDates(
    resultingIssueDate,
    resultingExpiryDate
  );

  const record:
  UpdateEmployeeCertificationRecord = {
    ...(input.trainingEnrollmentId !==
    undefined
      ? {
          trainingEnrollmentId:
            input.trainingEnrollmentId
        }
      : {}),

    ...(input.certificateNumber !==
    undefined
      ? {
          certificateNumber:
            input.certificateNumber
        }
      : {}),

    ...(input.issueDate !== undefined
      ? {
          issueDate:
            input.issueDate
        }
      : {}),

    ...(input.expiryDate !== undefined
      ? {
          expiryDate:
            input.expiryDate
        }
      : {}),

    ...(input.issuingOrganization !==
    undefined
      ? {
          issuingOrganization:
            input.issuingOrganization
        }
      : {}),

    ...(input.certificateStoragePath !==
    undefined
      ? {
          certificateStoragePath:
            input.certificateStoragePath
        }
      : {}),

    ...(input.checksumSha256 !==
    undefined
      ? {
          checksumSha256:
            input.checksumSha256
        }
      : {}),

    ...(input.renewalStatus !==
    undefined
      ? {
          renewalStatus:
            input.renewalStatus
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
      await updateEmployeeCertificationRecord(
        employeeId,
        employeeCertificationId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee certification record was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_CERTIFICATION_NOT_FOUND"
      });
    }

    return mapEmployeeCertification(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deactivateEmployeeCertification(
  employeeId: string,
  employeeCertificationId: string,
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

  const deactivated =
    await deactivateEmployeeCertificationRecord(
      employeeId,
      employeeCertificationId,
      createActor(auth),
      metadata
    );

  if (!deactivated) {
    throw new AppError({
      message:
        "Employee certification record was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_CERTIFICATION_NOT_FOUND"
    });
  }
}

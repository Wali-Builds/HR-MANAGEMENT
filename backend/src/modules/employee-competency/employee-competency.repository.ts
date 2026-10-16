import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CertificationLookupDatabaseRow,
  CreateEmployeeCertificationRecord,
  CreateEmployeeSkillRecord,
  EmployeeCertificationDatabaseRow,
  EmployeeCompetencyActor,
  EmployeeCompetencyOwnerDatabaseRow,
  EmployeeSkillDatabaseRow,
  RequestMetadata,
  SkillLookupDatabaseRow,
  UpdateEmployeeCertificationRecord,
  UpdateEmployeeSkillRecord
} from "./employee-competency.types.js";

interface LockedEmployeeRow {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
}

function safeJson(
  value: unknown
): string {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint"
        ? String(currentValue)
        : currentValue
  );
}

async function lockEmployeeRecord(
  connection: PoolConnection,
  employeeId: string
): Promise<LockedEmployeeRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            employee_id,
            company_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | LockedEmployeeRow
      | undefined
  ) ?? null;
}

async function insertActivityLog(
  connection: PoolConnection,
  input: {
    companyId: string;
    actor: EmployeeCompetencyActor;
    actionName: string;
    tableName: string;
    recordId: string;
    oldValues?: unknown;
    newValues?: unknown;
    requestMethod: string;
    requestPath: string;
    metadata: RequestMetadata;
  }
): Promise<void> {
  await connection.query(
    `
      INSERT INTO activity_logs (
          company_id,
          user_id,
          module_name,
          action_name,
          table_name,
          record_id,
          old_values,
          new_values,
          request_method,
          request_path,
          ip_address,
          user_agent
      )
      VALUES (
          ?,
          ?,
          'employee',
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
      )
    `,
    [
      input.companyId,
      input.actor.userId,
      input.actionName,
      input.tableName,
      input.recordId,

      input.oldValues === undefined
        ? null
        : safeJson(input.oldValues),

      input.newValues === undefined
        ? null
        : safeJson(input.newValues),

      input.requestMethod,
      input.requestPath,
      input.metadata.ipAddress,
      input.metadata.userAgent
    ]
  );
}

/*
 * =========================================================
 * Reusable SELECT statements
 * =========================================================
 */

const employeeSkillSelect = `
  SELECT
      es.employee_skill_id,
      es.company_id,
      es.employee_id,
      es.skill_id,

      s.skill_code,
      s.skill_name,
      s.skill_type,

      s.skill_category_id,
      sc.category_code,
      sc.category_name,

      s.proficiency_scale_maximum,
      s.measurement_method,
      s.is_certification_required,

      es.proficiency_level,
      es.target_proficiency_level,
      es.years_of_experience,
      es.source_type,
      es.is_primary_skill,
      es.is_verified,
      es.verified_by_user_id,
      es.verified_at,
      es.last_assessed_at,
      es.next_assessment_date,
      es.evidence_storage_path,
      es.remarks,
      es.created_at,
      es.updated_at
  FROM employee_skills es
  INNER JOIN skills s
      ON s.skill_id = es.skill_id
  LEFT JOIN skill_categories sc
      ON sc.skill_category_id =
         s.skill_category_id
`;

const employeeCertificationSelect = `
  SELECT
      ec.employee_certification_id,
      ec.company_id,
      ec.employee_id,
      ec.certification_id,

      c.certification_code,
      c.certification_name,

      c.issuing_organization
          AS definition_issuing_organization,

      c.certification_category,
      c.default_validity_months,
      c.renewal_required,
      c.related_skill_id,

      s.skill_code
          AS related_skill_code,

      s.skill_name
          AS related_skill_name,

      c.is_mandatory,

      ec.training_enrollment_id,
      ec.certificate_number,
      ec.issue_date,
      ec.expiry_date,
      ec.issuing_organization,
      ec.verification_status,
      ec.verified_by_user_id,
      ec.verified_at,
      ec.certificate_storage_path,
      ec.checksum_sha256,
      ec.renewal_status,
      ec.renewal_reminder_sent_at,
      ec.is_active,
      ec.created_at,
      ec.updated_at
  FROM employee_certifications ec
  INNER JOIN certifications c
      ON c.certification_id =
         ec.certification_id
  LEFT JOIN skills s
      ON s.skill_id =
         c.related_skill_id
`;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export async function findEmployeeCompetencyOwnerById(
  employeeId: string
): Promise<EmployeeCompetencyOwnerDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            employee_id,
            company_id,
            employee_code,
            first_name,
            middle_name,
            last_name,
            is_active,
            deleted_at
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [employeeId]
    );

  return (
    rows[0] as
      | EmployeeCompetencyOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Lookup repository
 * =========================================================
 */

export async function listSkillLookupRecords(
  companyId: string,
  search: string | undefined,
  includeInactive: boolean
): Promise<SkillLookupDatabaseRow[]> {
  const conditions: string[] = [
    "s.company_id = ?",
    "s.deleted_at IS NULL"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!includeInactive) {
    conditions.push(
      "s.is_active = 1"
    );
  }

  if (search) {
    const searchValue =
      `%${search}%`;

    conditions.push(`
      (
        s.skill_code LIKE ?
        OR s.skill_name LIKE ?
        OR s.description LIKE ?
        OR sc.category_code LIKE ?
        OR sc.category_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            s.skill_id,
            s.company_id,
            s.skill_category_id,
            sc.category_code,
            sc.category_name,
            s.skill_code,
            s.skill_name,
            s.description,
            s.skill_type,
            s.proficiency_scale_maximum,
            s.measurement_method,
            s.is_certification_required,
            s.is_active
        FROM skills s
        LEFT JOIN skill_categories sc
            ON sc.skill_category_id =
               s.skill_category_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            sc.sort_order ASC,
            sc.category_name ASC,
            s.skill_name ASC
      `,
      parameters
    );

  return rows as
    SkillLookupDatabaseRow[];
}

export async function listCertificationLookupRecords(
  companyId: string,
  search: string | undefined,
  includeInactive: boolean
): Promise<CertificationLookupDatabaseRow[]> {
  const conditions: string[] = [
    "c.company_id = ?"
  ];

  const parameters: unknown[] = [
    companyId
  ];

  if (!includeInactive) {
    conditions.push(
      "c.is_active = 1"
    );
  }

  if (search) {
    const searchValue =
      `%${search}%`;

    conditions.push(`
      (
        c.certification_code LIKE ?
        OR c.certification_name LIKE ?
        OR c.issuing_organization LIKE ?
        OR c.certification_category LIKE ?
        OR s.skill_code LIKE ?
        OR s.skill_name LIKE ?
      )
    `);

    parameters.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const rows =
    await databasePool.query(
      `
        SELECT
            c.certification_id,
            c.company_id,
            c.certification_code,
            c.certification_name,
            c.issuing_organization,
            c.certification_category,
            c.description,
            c.default_validity_months,
            c.renewal_required,
            c.related_skill_id,
            s.skill_code
                AS related_skill_code,
            s.skill_name
                AS related_skill_name,
            c.is_mandatory,
            c.is_active
        FROM certifications c
        LEFT JOIN skills s
            ON s.skill_id =
               c.related_skill_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY
            c.certification_category ASC,
            c.certification_name ASC
      `,
      parameters
    );

  return rows as
    CertificationLookupDatabaseRow[];
}

export async function findActiveSkillDefinitionById(
  companyId: string,
  skillId: string
): Promise<SkillLookupDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            s.skill_id,
            s.company_id,
            s.skill_category_id,
            sc.category_code,
            sc.category_name,
            s.skill_code,
            s.skill_name,
            s.description,
            s.skill_type,
            s.proficiency_scale_maximum,
            s.measurement_method,
            s.is_certification_required,
            s.is_active
        FROM skills s
        LEFT JOIN skill_categories sc
            ON sc.skill_category_id =
               s.skill_category_id
        WHERE s.skill_id = ?
          AND s.company_id = ?
          AND s.is_active = 1
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [
        skillId,
        companyId
      ]
    );

  return (
    rows[0] as
      | SkillLookupDatabaseRow
      | undefined
  ) ?? null;
}

export async function findActiveCertificationDefinitionById(
  companyId: string,
  certificationId: string
): Promise<CertificationLookupDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            c.certification_id,
            c.company_id,
            c.certification_code,
            c.certification_name,
            c.issuing_organization,
            c.certification_category,
            c.description,
            c.default_validity_months,
            c.renewal_required,
            c.related_skill_id,
            s.skill_code
                AS related_skill_code,
            s.skill_name
                AS related_skill_name,
            c.is_mandatory,
            c.is_active
        FROM certifications c
        LEFT JOIN skills s
            ON s.skill_id =
               c.related_skill_id
        WHERE c.certification_id = ?
          AND c.company_id = ?
          AND c.is_active = 1
        LIMIT 1
      `,
      [
        certificationId,
        companyId
      ]
    );

  return (
    rows[0] as
      | CertificationLookupDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Employee skill repository
 * =========================================================
 */

async function selectEmployeeSkillUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  employeeSkillId: string,
  lockRecord: boolean
): Promise<EmployeeSkillDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeSkillSelect}
        WHERE es.employee_skill_id = ?
          AND es.employee_id = ?
        LIMIT 1
        ${lockRecord ? "FOR UPDATE" : ""}
      `,
      [
        employeeSkillId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeSkillDatabaseRow
      | undefined
  ) ?? null;
}

export async function listEmployeeSkillRecords(
  employeeId: string
): Promise<EmployeeSkillDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        ${employeeSkillSelect}
        WHERE es.employee_id = ?
        ORDER BY
            es.is_primary_skill DESC,
            es.is_verified DESC,
            sc.category_name ASC,
            s.skill_name ASC
      `,
      [employeeId]
    );

  return rows as
    EmployeeSkillDatabaseRow[];
}

export async function findEmployeeSkillRecord(
  employeeId: string,
  employeeSkillId: string
): Promise<EmployeeSkillDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeSkillSelect}
        WHERE es.employee_skill_id = ?
          AND es.employee_id = ?
        LIMIT 1
      `,
      [
        employeeSkillId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeSkillDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmployeeSkillRecord(
  input: CreateEmployeeSkillRecord,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<EmployeeSkillDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(employee.company_id) !==
      input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    const duplicateRows =
      await connection.query(
        `
          SELECT employee_skill_id
          FROM employee_skills
          WHERE employee_id = ?
            AND skill_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.employeeId,
          input.skillId
        ]
      );

    if (duplicateRows.length > 0) {
      throw new Error(
        "DUPLICATE_EMPLOYEE_SKILL"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_skills (
              company_id,
              employee_id,
              skill_id,
              proficiency_level,
              target_proficiency_level,
              years_of_experience,
              source_type,
              is_primary_skill,
              is_verified,
              verified_by_user_id,
              verified_at,
              last_assessed_at,
              next_assessment_date,
              evidence_storage_path,
              remarks
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              0,
              NULL,
              NULL,
              ?,
              ?,
              ?,
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.skillId,
          input.proficiencyLevel,
          input.targetProficiencyLevel,
          input.yearsOfExperience,
          input.sourceType,
          input.isPrimarySkill ? 1 : 0,
          input.lastAssessedAt,
          input.nextAssessmentDate,
          input.evidenceStoragePath,
          input.remarks
        ]
      );

    const employeeSkillId =
      String(
        insertResult.insertId
      );

    const createdSkill =
      await selectEmployeeSkillUsingConnection(
        connection,
        input.employeeId,
        employeeSkillId,
        false
      );

    if (!createdSkill) {
      throw new Error(
        "CREATED_EMPLOYEE_SKILL_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_skill_created",

        tableName:
          "employee_skills",

        recordId:
          employeeSkillId,

        newValues:
          createdSkill,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/skills`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return createdSkill;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeSkillRecord(
  employeeId: string,
  employeeSkillId: string,
  input: UpdateEmployeeSkillRecord,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<EmployeeSkillDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeSkillUsingConnection(
        connection,
        employeeId,
        employeeSkillId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (
      input.proficiencyLevel !==
      undefined
    ) {
      addUpdate(
        "proficiency_level",
        input.proficiencyLevel
      );
    }

    if (
      input.targetProficiencyLevel !==
      undefined
    ) {
      addUpdate(
        "target_proficiency_level",
        input.targetProficiencyLevel
      );
    }

    if (
      input.yearsOfExperience !==
      undefined
    ) {
      addUpdate(
        "years_of_experience",
        input.yearsOfExperience
      );
    }

    if (
      input.sourceType !== undefined
    ) {
      addUpdate(
        "source_type",
        input.sourceType
      );
    }

    if (
      input.isPrimarySkill !==
      undefined
    ) {
      addUpdate(
        "is_primary_skill",
        input.isPrimarySkill ? 1 : 0
      );
    }

    if (
      input.lastAssessedAt !== undefined
    ) {
      addUpdate(
        "last_assessed_at",
        input.lastAssessedAt
      );
    }

    if (
      input.nextAssessmentDate !==
      undefined
    ) {
      addUpdate(
        "next_assessment_date",
        input.nextAssessmentDate
      );
    }

    if (
      input.evidenceStoragePath !==
      undefined
    ) {
      addUpdate(
        "evidence_storage_path",
        input.evidenceStoragePath
      );
    }

    if (
      input.remarks !== undefined
    ) {
      addUpdate(
        "remarks",
        input.remarks
      );
    }

    parameters.push(
      employeeSkillId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_skills
        SET ${assignments.join(", ")}
        WHERE employee_skill_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    const updated =
      await selectEmployeeSkillUsingConnection(
        connection,
        employeeId,
        employeeSkillId,
        false
      );

    if (!updated) {
      throw new Error(
        "UPDATED_EMPLOYEE_SKILL_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_skill_updated",

        tableName:
          "employee_skills",

        recordId:
          employeeSkillId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/skills/${employeeSkillId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployeeSkillRecord(
  employeeId: string,
  employeeSkillId: string,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeSkillUsingConnection(
        connection,
        employeeId,
        employeeSkillId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        DELETE FROM employee_skills
        WHERE employee_skill_id = ?
          AND employee_id = ?
      `,
      [
        employeeSkillId,
        employeeId
      ]
    );

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_skill_deleted",

        tableName:
          "employee_skills",

        recordId:
          employeeSkillId,

        oldValues:
          existing,

        newValues: {
          employeeSkillId,
          employeeId,
          deleted: true
        },

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/skills/${employeeSkillId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return true;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

/*
 * =========================================================
 * Employee certification repository
 * =========================================================
 */

async function selectEmployeeCertificationUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  employeeCertificationId: string,
  lockRecord: boolean
): Promise<EmployeeCertificationDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        ${employeeCertificationSelect}
        WHERE ec.employee_certification_id = ?
          AND ec.employee_id = ?
        LIMIT 1
        ${lockRecord ? "FOR UPDATE" : ""}
      `,
      [
        employeeCertificationId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeCertificationDatabaseRow
      | undefined
  ) ?? null;
}

export async function listEmployeeCertificationRecords(
  employeeId: string,
  includeInactive: boolean
): Promise<EmployeeCertificationDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        ${employeeCertificationSelect}
        WHERE ec.employee_id = ?
        ${
          includeInactive
            ? ""
            : "AND ec.is_active = 1"
        }
        ORDER BY
            ec.is_active DESC,
            ec.expiry_date IS NULL DESC,
            ec.expiry_date DESC,
            ec.issue_date DESC,
            ec.employee_certification_id DESC
      `,
      [employeeId]
    );

  return rows as
    EmployeeCertificationDatabaseRow[];
}

export async function findEmployeeCertificationRecord(
  employeeId: string,
  employeeCertificationId: string
): Promise<EmployeeCertificationDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        ${employeeCertificationSelect}
        WHERE ec.employee_certification_id = ?
          AND ec.employee_id = ?
        LIMIT 1
      `,
      [
        employeeCertificationId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeCertificationDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmployeeCertificationRecord(
  input: CreateEmployeeCertificationRecord,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<EmployeeCertificationDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (
      String(employee.company_id) !==
      input.companyId
    ) {
      throw new Error(
        "EMPLOYEE_COMPANY_MISMATCH"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_certifications (
              company_id,
              employee_id,
              certification_id,
              training_enrollment_id,
              certificate_number,
              issue_date,
              expiry_date,
              issuing_organization,
              verification_status,
              verified_by_user_id,
              verified_at,
              certificate_storage_path,
              checksum_sha256,
              renewal_status,
              renewal_reminder_sent_at,
              is_active
          )
          VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              'PENDING',
              NULL,
              NULL,
              ?,
              ?,
              ?,
              NULL,
              ?
          )
        `,
        [
          input.companyId,
          input.employeeId,
          input.certificationId,
          input.trainingEnrollmentId,
          input.certificateNumber,
          input.issueDate,
          input.expiryDate,
          input.issuingOrganization,
          input.certificateStoragePath,
          input.checksumSha256,
          input.renewalStatus,
          input.isActive ? 1 : 0
        ]
      );

    const employeeCertificationId =
      String(
        insertResult.insertId
      );

    const created =
      await selectEmployeeCertificationUsingConnection(
        connection,
        input.employeeId,
        employeeCertificationId,
        false
      );

    if (!created) {
      throw new Error(
        "CREATED_EMPLOYEE_CERTIFICATION_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          input.companyId,

        actor,

        actionName:
          "employee_certification_created",

        tableName:
          "employee_certifications",

        recordId:
          employeeCertificationId,

        newValues:
          created,

        requestMethod:
          "POST",

        requestPath:
          `/api/v1/employees/${input.employeeId}/certifications`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return created;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeCertificationRecord(
  employeeId: string,
  employeeCertificationId: string,
  input: UpdateEmployeeCertificationRecord,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<EmployeeCertificationDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeCertificationUsingConnection(
        connection,
        employeeId,
        employeeCertificationId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const assignments: string[] = [];
    const parameters: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      parameters.push(value);
    };

    if (
      input.trainingEnrollmentId !==
      undefined
    ) {
      addUpdate(
        "training_enrollment_id",
        input.trainingEnrollmentId
      );
    }

    if (
      input.certificateNumber !==
      undefined
    ) {
      addUpdate(
        "certificate_number",
        input.certificateNumber
      );
    }

    if (
      input.issueDate !== undefined
    ) {
      addUpdate(
        "issue_date",
        input.issueDate
      );
    }

    if (
      input.expiryDate !== undefined
    ) {
      addUpdate(
        "expiry_date",
        input.expiryDate
      );
    }

    if (
      input.issuingOrganization !==
      undefined
    ) {
      addUpdate(
        "issuing_organization",
        input.issuingOrganization
      );
    }

    if (
      input.certificateStoragePath !==
      undefined
    ) {
      addUpdate(
        "certificate_storage_path",
        input.certificateStoragePath
      );
    }

    if (
      input.checksumSha256 !==
      undefined
    ) {
      addUpdate(
        "checksum_sha256",
        input.checksumSha256
      );
    }

    if (
      input.renewalStatus !==
      undefined
    ) {
      addUpdate(
        "renewal_status",
        input.renewalStatus
      );
    }

    if (
      input.isActive !== undefined
    ) {
      addUpdate(
        "is_active",
        input.isActive ? 1 : 0
      );
    }

    parameters.push(
      employeeCertificationId,
      employeeId
    );

    await connection.query(
      `
        UPDATE employee_certifications
        SET ${assignments.join(", ")}
        WHERE employee_certification_id = ?
          AND employee_id = ?
      `,
      parameters
    );

    const updated =
      await selectEmployeeCertificationUsingConnection(
        connection,
        employeeId,
        employeeCertificationId,
        false
      );

    if (!updated) {
      throw new Error(
        "UPDATED_EMPLOYEE_CERTIFICATION_NOT_FOUND"
      );
    }

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_certification_updated",

        tableName:
          "employee_certifications",

        recordId:
          employeeCertificationId,

        oldValues:
          existing,

        newValues:
          updated,

        requestMethod:
          "PATCH",

        requestPath:
          `/api/v1/employees/${employeeId}/certifications/${employeeCertificationId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return updated;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deactivateEmployeeCertificationRecord(
  employeeId: string,
  employeeCertificationId: string,
  actor: EmployeeCompetencyActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employee =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employee) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      await selectEmployeeCertificationUsingConnection(
        connection,
        employeeId,
        employeeCertificationId,
        true
      );

    if (!existing) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE employee_certifications
        SET is_active = 0
        WHERE employee_certification_id = ?
          AND employee_id = ?
      `,
      [
        employeeCertificationId,
        employeeId
      ]
    );

    const updated =
      await selectEmployeeCertificationUsingConnection(
        connection,
        employeeId,
        employeeCertificationId,
        false
      );

    await insertActivityLog(
      connection,
      {
        companyId:
          String(employee.company_id),

        actor,

        actionName:
          "employee_certification_deactivated",

        tableName:
          "employee_certifications",

        recordId:
          employeeCertificationId,

        oldValues:
          existing,

        newValues:
          updated ?? {
            employeeCertificationId,
            employeeId,
            isActive: false
          },

        requestMethod:
          "DELETE",

        requestPath:
          `/api/v1/employees/${employeeId}/certifications/${employeeCertificationId}`,

        metadata
      }
    );

    await connection.commit();
    transactionStarted = false;

    return true;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}
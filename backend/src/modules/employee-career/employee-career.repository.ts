import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateEmployeeEducationRecord,
  CreateEmployeeExperienceRecord,
  EmployeeCareerActor,
  EmployeeCareerOwnerDatabaseRow,
  EmployeeEducationDatabaseRow,
  EmployeeExperienceDatabaseRow,
  RequestMetadata,
  UpdateEmployeeEducationRecord,
  UpdateEmployeeExperienceRecord
} from "./employee-career.types.js";

type LockedEmployeeRow = {
  employee_id:
    | string
    | number
    | bigint;

  company_id:
    | string
    | number
    | bigint;
};

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

function databaseDateOnly(
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

/*
 * =========================================================
 * Education helpers
 * =========================================================
 */

async function selectEducationUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  educationId: string
): Promise<EmployeeEducationDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            education_id,
            employee_id,
            qualification_level,
            degree_title,
            field_of_study,
            institution_name,
            board_university,
            city,
            country_code,
            start_date,
            completion_date,
            is_currently_studying,
            result_type,
            result_value,
            marks_percentage,
            cgpa,
            total_cgpa,
            is_highest_qualification,
            certificate_document_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_educations
        WHERE education_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        educationId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeEducationDatabaseRow
      | undefined
  ) ?? null;
}

async function clearHighestQualification(
  connection: PoolConnection,
  employeeId: string,
  excludeEducationId?: string
): Promise<void> {
  let sql = `
    UPDATE employee_educations
    SET is_highest_qualification = 0
    WHERE employee_id = ?
      AND deleted_at IS NULL
      AND is_highest_qualification = 1
  `;

  const values: unknown[] = [
    employeeId
  ];

  if (excludeEducationId) {
    sql += `
      AND education_id <> ?
    `;

    values.push(
      excludeEducationId
    );
  }

  await connection.query(
    sql,
    values
  );
}

async function educationDuplicateExists(
  connection: PoolConnection,
  values: {
    employeeId: string;
    qualificationLevel: string;
    degreeTitle: string;
    institutionName: string;
    startDate: string | null;
    completionDate: string | null;
  },
  excludeEducationId?: string
): Promise<boolean> {
  let sql = `
    SELECT education_id
    FROM employee_educations
    WHERE employee_id = ?
      AND qualification_level = ?
      AND degree_title = ?
      AND institution_name = ?
      AND start_date <=> ?
      AND completion_date <=> ?
      AND deleted_at IS NULL
  `;

  const parameters: unknown[] = [
    values.employeeId,
    values.qualificationLevel,
    values.degreeTitle,
    values.institutionName,
    values.startDate,
    values.completionDate
  ];

  if (excludeEducationId) {
    sql += `
      AND education_id <> ?
    `;

    parameters.push(
      excludeEducationId
    );
  }

  sql += `
    LIMIT 1
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Experience helpers
 * =========================================================
 */

async function selectExperienceUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  experienceId: string
): Promise<EmployeeExperienceDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            experience_id,
            employee_id,
            employer_name,
            job_title,
            department,
            employment_type,
            location,
            country_code,
            start_date,
            end_date,
            is_current,
            responsibilities,
            last_drawn_salary,
            currency_code,
            reason_for_leaving,
            reference_name,
            reference_phone,
            reference_email,
            experience_letter_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_experiences
        WHERE experience_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [
        experienceId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeExperienceDatabaseRow
      | undefined
  ) ?? null;
}

async function experienceDuplicateExists(
  connection: PoolConnection,
  values: {
    employeeId: string;
    employerName: string;
    jobTitle: string;
    startDate: string;
    endDate: string | null;
  },
  excludeExperienceId?: string
): Promise<boolean> {
  let sql = `
    SELECT experience_id
    FROM employee_experiences
    WHERE employee_id = ?
      AND employer_name = ?
      AND job_title = ?
      AND start_date = ?
      AND end_date <=> ?
      AND deleted_at IS NULL
  `;

  const parameters: unknown[] = [
    values.employeeId,
    values.employerName,
    values.jobTitle,
    values.startDate,
    values.endDate
  ];

  if (excludeExperienceId) {
    sql += `
      AND experience_id <> ?
    `;

    parameters.push(
      excludeExperienceId
    );
  }

  sql += `
    LIMIT 1
  `;

  const rows =
    await connection.query(
      sql,
      parameters
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export async function findEmployeeCareerOwnerById(
  employeeId: string
): Promise<EmployeeCareerOwnerDatabaseRow | null> {
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
      | EmployeeCareerOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Education repository
 * =========================================================
 */

export async function listEmployeeEducationRecords(
  employeeId: string
): Promise<EmployeeEducationDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
            education_id,
            employee_id,
            qualification_level,
            degree_title,
            field_of_study,
            institution_name,
            board_university,
            city,
            country_code,
            start_date,
            completion_date,
            is_currently_studying,
            result_type,
            result_value,
            marks_percentage,
            cgpa,
            total_cgpa,
            is_highest_qualification,
            certificate_document_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_educations
        WHERE employee_id = ?
          AND deleted_at IS NULL
        ORDER BY
          is_highest_qualification DESC,
          is_currently_studying DESC,
          completion_date DESC,
          start_date DESC,
          education_id DESC
      `,
      [employeeId]
    );

  return rows as
    EmployeeEducationDatabaseRow[];
}

export async function findEmployeeEducationRecord(
  employeeId: string,
  educationId: string
): Promise<EmployeeEducationDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            education_id,
            employee_id,
            qualification_level,
            degree_title,
            field_of_study,
            institution_name,
            board_university,
            city,
            country_code,
            start_date,
            completion_date,
            is_currently_studying,
            result_type,
            result_value,
            marks_percentage,
            cgpa,
            total_cgpa,
            is_highest_qualification,
            certificate_document_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_educations
        WHERE education_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        educationId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeEducationDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmployeeEducationRecord(
  input: CreateEmployeeEducationRecord,
  actor: EmployeeCareerActor,
  metadata: RequestMetadata
): Promise<EmployeeEducationDatabaseRow> {
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

    const duplicate =
      await educationDuplicateExists(
        connection,
        {
          employeeId:
            input.employeeId,

          qualificationLevel:
            input.qualificationLevel,

          degreeTitle:
            input.degreeTitle,

          institutionName:
            input.institutionName,

          startDate:
            input.startDate,

          completionDate:
            input.completionDate
        }
      );

    if (duplicate) {
      throw new Error(
        "DUPLICATE_EMPLOYEE_EDUCATION"
      );
    }

    if (
      input.isHighestQualification
    ) {
      await clearHighestQualification(
        connection,
        input.employeeId
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_educations (
              employee_id,
              qualification_level,
              degree_title,
              field_of_study,
              institution_name,
              board_university,
              city,
              country_code,
              start_date,
              completion_date,
              is_currently_studying,
              result_type,
              result_value,
              marks_percentage,
              cgpa,
              total_cgpa,
              is_highest_qualification,
              certificate_document_path,
              is_verified,
              verified_by_user_id,
              verified_at,
              remarks
          )
          VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              0, NULL, NULL, ?
          )
        `,
        [
          input.employeeId,
          input.qualificationLevel,
          input.degreeTitle,
          input.fieldOfStudy,
          input.institutionName,
          input.boardUniversity,
          input.city,
          input.countryCode,
          input.startDate,
          input.completionDate,
          input.isCurrentlyStudying
            ? 1
            : 0,
          input.resultType,
          input.resultValue,
          input.marksPercentage,
          input.cgpa,
          input.totalCgpa,
          input.isHighestQualification
            ? 1
            : 0,
          input.certificateDocumentPath,
          input.remarks
        ]
      );

    const educationId =
      String(
        insertResult.insertId
      );

    const education =
      await selectEducationUsingConnection(
        connection,
        input.employeeId,
        educationId
      );

    if (!education) {
      throw new Error(
        "CREATED_EDUCATION_NOT_FOUND"
      );
    }

    await connection.query(
      `
        INSERT INTO activity_logs (
            company_id,
            user_id,
            module_name,
            action_name,
            table_name,
            record_id,
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
            'employee_education_created',
            'employee_educations',
            ?,
            ?,
            'POST',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        educationId,
        safeJson(education),

        `/api/v1/employees/${input.employeeId}/educations`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return education;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeEducationRecord(
  employeeId: string,
  educationId: string,
  input: UpdateEmployeeEducationRecord,
  actor: EmployeeCareerActor,
  metadata: RequestMetadata
): Promise<EmployeeEducationDatabaseRow | null> {
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

    const currentEducation =
      await selectEducationUsingConnection(
        connection,
        employeeId,
        educationId
      );

    if (!currentEducation) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingQualificationLevel =
      input.qualificationLevel ??
      currentEducation.qualification_level;

    const resultingDegreeTitle =
      input.degreeTitle ??
      currentEducation.degree_title;

    const resultingInstitutionName =
      input.institutionName ??
      currentEducation.institution_name;

    const resultingStartDate =
      input.startDate !== undefined
        ? input.startDate
        : databaseDateOnly(
            currentEducation.start_date
          );

    const resultingCompletionDate =
      input.completionDate !== undefined
        ? input.completionDate
        : databaseDateOnly(
            currentEducation.completion_date
          );

    const duplicate =
      await educationDuplicateExists(
        connection,
        {
          employeeId,

          qualificationLevel:
            resultingQualificationLevel,

          degreeTitle:
            resultingDegreeTitle,

          institutionName:
            resultingInstitutionName,

          startDate:
            resultingStartDate,

          completionDate:
            resultingCompletionDate
        },
        educationId
      );

    if (duplicate) {
      throw new Error(
        "DUPLICATE_EMPLOYEE_EDUCATION"
      );
    }

    if (
      input.isHighestQualification ===
        true
    ) {
      await clearHighestQualification(
        connection,
        employeeId,
        educationId
      );
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      values.push(value);
    };

    if (
      input.qualificationLevel !==
      undefined
    ) {
      addUpdate(
        "qualification_level",
        input.qualificationLevel
      );
    }

    if (
      input.degreeTitle !== undefined
    ) {
      addUpdate(
        "degree_title",
        input.degreeTitle
      );
    }

    if (
      input.fieldOfStudy !== undefined
    ) {
      addUpdate(
        "field_of_study",
        input.fieldOfStudy
      );
    }

    if (
      input.institutionName !==
      undefined
    ) {
      addUpdate(
        "institution_name",
        input.institutionName
      );
    }

    if (
      input.boardUniversity !==
      undefined
    ) {
      addUpdate(
        "board_university",
        input.boardUniversity
      );
    }

    if (input.city !== undefined) {
      addUpdate(
        "city",
        input.city
      );
    }

    if (
      input.countryCode !== undefined
    ) {
      addUpdate(
        "country_code",
        input.countryCode
      );
    }

    if (
      input.startDate !== undefined
    ) {
      addUpdate(
        "start_date",
        input.startDate
      );
    }

    if (
      input.completionDate !==
      undefined
    ) {
      addUpdate(
        "completion_date",
        input.completionDate
      );
    }

    if (
      input.isCurrentlyStudying !==
      undefined
    ) {
      addUpdate(
        "is_currently_studying",
        input.isCurrentlyStudying
          ? 1
          : 0
      );
    }

    if (
      input.resultType !== undefined
    ) {
      addUpdate(
        "result_type",
        input.resultType
      );
    }

    if (
      input.resultValue !== undefined
    ) {
      addUpdate(
        "result_value",
        input.resultValue
      );
    }

    if (
      input.marksPercentage !==
      undefined
    ) {
      addUpdate(
        "marks_percentage",
        input.marksPercentage
      );
    }

    if (input.cgpa !== undefined) {
      addUpdate(
        "cgpa",
        input.cgpa
      );
    }

    if (
      input.totalCgpa !== undefined
    ) {
      addUpdate(
        "total_cgpa",
        input.totalCgpa
      );
    }

    if (
      input.isHighestQualification !==
      undefined
    ) {
      addUpdate(
        "is_highest_qualification",
        input.isHighestQualification
          ? 1
          : 0
      );
    }

    if (
      input.certificateDocumentPath !==
      undefined
    ) {
      addUpdate(
        "certificate_document_path",
        input.certificateDocumentPath
      );
    }

    if (input.remarks !== undefined) {
      addUpdate(
        "remarks",
        input.remarks
      );
    }

    if (assignments.length > 0) {
      values.push(
        educationId,
        employeeId
      );

      await connection.query(
        `
          UPDATE employee_educations
          SET ${assignments.join(", ")}
          WHERE education_id = ?
            AND employee_id = ?
            AND deleted_at IS NULL
        `,
        values
      );
    }

    const updatedEducation =
      await selectEducationUsingConnection(
        connection,
        employeeId,
        educationId
      );

    if (!updatedEducation) {
      throw new Error(
        "UPDATED_EDUCATION_NOT_FOUND"
      );
    }

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
            'employee_education_updated',
            'employee_educations',
            ?,
            ?,
            ?,
            'PATCH',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        educationId,
        safeJson(currentEducation),
        safeJson(updatedEducation),

        `/api/v1/employees/${employeeId}/educations/${educationId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedEducation;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployeeEducationRecord(
  employeeId: string,
  educationId: string,
  actor: EmployeeCareerActor,
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

    const education =
      await selectEducationUsingConnection(
        connection,
        employeeId,
        educationId
      );

    if (!education) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE employee_educations
        SET
            is_highest_qualification = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE education_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      [
        educationId,
        employeeId
      ]
    );

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
            'employee_education_deleted',
            'employee_educations',
            ?,
            ?,
            ?,
            'DELETE',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        educationId,
        safeJson(education),

        safeJson({
          educationId,
          employeeId,
          deleted: true
        }),

        `/api/v1/employees/${employeeId}/educations/${educationId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
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
 * Experience repository
 * =========================================================
 */

export async function listEmployeeExperienceRecords(
  employeeId: string
): Promise<EmployeeExperienceDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
            experience_id,
            employee_id,
            employer_name,
            job_title,
            department,
            employment_type,
            location,
            country_code,
            start_date,
            end_date,
            is_current,
            responsibilities,
            last_drawn_salary,
            currency_code,
            reason_for_leaving,
            reference_name,
            reference_phone,
            reference_email,
            experience_letter_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_experiences
        WHERE employee_id = ?
          AND deleted_at IS NULL
        ORDER BY
          is_current DESC,
          start_date DESC,
          end_date DESC,
          experience_id DESC
      `,
      [employeeId]
    );

  return rows as
    EmployeeExperienceDatabaseRow[];
}

export async function findEmployeeExperienceRecord(
  employeeId: string,
  experienceId: string
): Promise<EmployeeExperienceDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            experience_id,
            employee_id,
            employer_name,
            job_title,
            department,
            employment_type,
            location,
            country_code,
            start_date,
            end_date,
            is_current,
            responsibilities,
            last_drawn_salary,
            currency_code,
            reason_for_leaving,
            reference_name,
            reference_phone,
            reference_email,
            experience_letter_path,
            is_verified,
            verified_by_user_id,
            verified_at,
            remarks,
            deleted_at,
            created_at,
            updated_at
        FROM employee_experiences
        WHERE experience_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        experienceId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeExperienceDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmployeeExperienceRecord(
  input: CreateEmployeeExperienceRecord,
  actor: EmployeeCareerActor,
  metadata: RequestMetadata
): Promise<EmployeeExperienceDatabaseRow> {
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

    const duplicate =
      await experienceDuplicateExists(
        connection,
        {
          employeeId:
            input.employeeId,

          employerName:
            input.employerName,

          jobTitle:
            input.jobTitle,

          startDate:
            input.startDate,

          endDate:
            input.endDate
        }
      );

    if (duplicate) {
      throw new Error(
        "DUPLICATE_EMPLOYEE_EXPERIENCE"
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_experiences (
              employee_id,
              employer_name,
              job_title,
              department,
              employment_type,
              location,
              country_code,
              start_date,
              end_date,
              is_current,
              responsibilities,
              last_drawn_salary,
              currency_code,
              reason_for_leaving,
              reference_name,
              reference_phone,
              reference_email,
              experience_letter_path,
              is_verified,
              verified_by_user_id,
              verified_at,
              remarks
          )
          VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              0, NULL, NULL, ?
          )
        `,
        [
          input.employeeId,
          input.employerName,
          input.jobTitle,
          input.department,
          input.employmentType,
          input.location,
          input.countryCode,
          input.startDate,
          input.endDate,
          input.isCurrent ? 1 : 0,
          input.responsibilities,
          input.lastDrawnSalary,
          input.currencyCode,
          input.reasonForLeaving,
          input.referenceName,
          input.referencePhone,
          input.referenceEmail,
          input.experienceLetterPath,
          input.remarks
        ]
      );

    const experienceId =
      String(
        insertResult.insertId
      );

    const experience =
      await selectExperienceUsingConnection(
        connection,
        input.employeeId,
        experienceId
      );

    if (!experience) {
      throw new Error(
        "CREATED_EXPERIENCE_NOT_FOUND"
      );
    }

    await connection.query(
      `
        INSERT INTO activity_logs (
            company_id,
            user_id,
            module_name,
            action_name,
            table_name,
            record_id,
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
            'employee_experience_created',
            'employee_experiences',
            ?,
            ?,
            'POST',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        experienceId,
        safeJson(experience),

        `/api/v1/employees/${input.employeeId}/experiences`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return experience;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeExperienceRecord(
  employeeId: string,
  experienceId: string,
  input: UpdateEmployeeExperienceRecord,
  actor: EmployeeCareerActor,
  metadata: RequestMetadata
): Promise<EmployeeExperienceDatabaseRow | null> {
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

    const currentExperience =
      await selectExperienceUsingConnection(
        connection,
        employeeId,
        experienceId
      );

    if (!currentExperience) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    const resultingEmployerName =
      input.employerName ??
      currentExperience.employer_name;

    const resultingJobTitle =
      input.jobTitle ??
      currentExperience.job_title;

    const resultingStartDate =
      input.startDate ??
      databaseDateOnly(
        currentExperience.start_date
      ) as string;

    const resultingEndDate =
      input.endDate !== undefined
        ? input.endDate
        : databaseDateOnly(
            currentExperience.end_date
          );

    const duplicate =
      await experienceDuplicateExists(
        connection,
        {
          employeeId,

          employerName:
            resultingEmployerName,

          jobTitle:
            resultingJobTitle,

          startDate:
            resultingStartDate,

          endDate:
            resultingEndDate
        },
        experienceId
      );

    if (duplicate) {
      throw new Error(
        "DUPLICATE_EMPLOYEE_EXPERIENCE"
      );
    }

    const assignments: string[] = [];
    const values: unknown[] = [];

    const addUpdate = (
      columnName: string,
      value: unknown
    ): void => {
      assignments.push(
        `${columnName} = ?`
      );

      values.push(value);
    };

    if (
      input.employerName !== undefined
    ) {
      addUpdate(
        "employer_name",
        input.employerName
      );
    }

    if (
      input.jobTitle !== undefined
    ) {
      addUpdate(
        "job_title",
        input.jobTitle
      );
    }

    if (
      input.department !== undefined
    ) {
      addUpdate(
        "department",
        input.department
      );
    }

    if (
      input.employmentType !==
      undefined
    ) {
      addUpdate(
        "employment_type",
        input.employmentType
      );
    }

    if (
      input.location !== undefined
    ) {
      addUpdate(
        "location",
        input.location
      );
    }

    if (
      input.countryCode !== undefined
    ) {
      addUpdate(
        "country_code",
        input.countryCode
      );
    }

    if (
      input.startDate !== undefined
    ) {
      addUpdate(
        "start_date",
        input.startDate
      );
    }

    if (
      input.endDate !== undefined
    ) {
      addUpdate(
        "end_date",
        input.endDate
      );
    }

    if (
      input.isCurrent !== undefined
    ) {
      addUpdate(
        "is_current",
        input.isCurrent ? 1 : 0
      );
    }

    if (
      input.responsibilities !==
      undefined
    ) {
      addUpdate(
        "responsibilities",
        input.responsibilities
      );
    }

    if (
      input.lastDrawnSalary !==
      undefined
    ) {
      addUpdate(
        "last_drawn_salary",
        input.lastDrawnSalary
      );
    }

    if (
      input.currencyCode !==
      undefined
    ) {
      addUpdate(
        "currency_code",
        input.currencyCode
      );
    }

    if (
      input.reasonForLeaving !==
      undefined
    ) {
      addUpdate(
        "reason_for_leaving",
        input.reasonForLeaving
      );
    }

    if (
      input.referenceName !==
      undefined
    ) {
      addUpdate(
        "reference_name",
        input.referenceName
      );
    }

    if (
      input.referencePhone !==
      undefined
    ) {
      addUpdate(
        "reference_phone",
        input.referencePhone
      );
    }

    if (
      input.referenceEmail !==
      undefined
    ) {
      addUpdate(
        "reference_email",
        input.referenceEmail
      );
    }

    if (
      input.experienceLetterPath !==
      undefined
    ) {
      addUpdate(
        "experience_letter_path",
        input.experienceLetterPath
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

    if (assignments.length > 0) {
      values.push(
        experienceId,
        employeeId
      );

      await connection.query(
        `
          UPDATE employee_experiences
          SET ${assignments.join(", ")}
          WHERE experience_id = ?
            AND employee_id = ?
            AND deleted_at IS NULL
        `,
        values
      );
    }

    const updatedExperience =
      await selectExperienceUsingConnection(
        connection,
        employeeId,
        experienceId
      );

    if (!updatedExperience) {
      throw new Error(
        "UPDATED_EXPERIENCE_NOT_FOUND"
      );
    }

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
            'employee_experience_updated',
            'employee_experiences',
            ?,
            ?,
            ?,
            'PATCH',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        experienceId,
        safeJson(currentExperience),
        safeJson(updatedExperience),

        `/api/v1/employees/${employeeId}/experiences/${experienceId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedExperience;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployeeExperienceRecord(
  employeeId: string,
  experienceId: string,
  actor: EmployeeCareerActor,
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

    const experience =
      await selectExperienceUsingConnection(
        connection,
        employeeId,
        experienceId
      );

    if (!experience) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        UPDATE employee_experiences
        SET
            is_current = 0,
            deleted_at =
                CURRENT_TIMESTAMP
        WHERE experience_id = ?
          AND employee_id = ?
          AND deleted_at IS NULL
      `,
      [
        experienceId,
        employeeId
      ]
    );

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
            'employee_experience_deleted',
            'employee_experiences',
            ?,
            ?,
            ?,
            'DELETE',
            ?,
            ?,
            ?
        )
      `,
      [
        String(employee.company_id),
        actor.userId,
        experienceId,
        safeJson(experience),

        safeJson({
          experienceId,
          employeeId,
          deleted: true
        }),

        `/api/v1/employees/${employeeId}/experiences/${experienceId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
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
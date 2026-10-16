import type {
  PoolConnection
} from "mariadb";

import {
  databasePool
} from "../../database/pool.js";

import type {
  CreateEmergencyContactRecord,
  CreateEmployeeAddressRecord,
  EmergencyContactDatabaseRow,
  EmployeeAddressDatabaseRow,
  EmployeeOwnerDatabaseRow,
  EmployeeDetailActor,
  RequestMetadata,
  UpdateEmergencyContactRecord,
  UpdateEmployeeAddressRecord
} from "./employee-detail.types.js";

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
): Promise<boolean> {
  const rows =
    await connection.query(
      `
        SELECT employee_id
        FROM employees
        WHERE employee_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [employeeId]
    );

  return rows.length > 0;
}

/*
 * =========================================================
 * Employee address helpers
 * =========================================================
 */

async function selectAddressUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  addressId: string
): Promise<EmployeeAddressDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            address_id,
            employee_id,
            address_type,
            address_line_1,
            address_line_2,
            city,
            district,
            province,
            postal_code,
            country_code,
            is_primary,
            created_at,
            updated_at
        FROM employee_addresses
        WHERE address_id = ?
          AND employee_id = ?
        LIMIT 1
      `,
      [
        addressId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeAddressDatabaseRow
      | undefined
  ) ?? null;
}

async function clearPrimaryAddresses(
  connection: PoolConnection,
  employeeId: string,
  excludeAddressId?: string
): Promise<void> {
  let sql = `
    UPDATE employee_addresses
    SET is_primary = 0
    WHERE employee_id = ?
      AND is_primary = 1
  `;

  const values: unknown[] = [
    employeeId
  ];

  if (excludeAddressId) {
    sql += `
      AND address_id <> ?
    `;

    values.push(
      excludeAddressId
    );
  }

  await connection.query(
    sql,
    values
  );
}

async function ensurePrimaryAddress(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  const primaryRows =
    await connection.query(
      `
        SELECT address_id
        FROM employee_addresses
        WHERE employee_id = ?
          AND is_primary = 1
        LIMIT 1
      `,
      [employeeId]
    );

  if (primaryRows.length > 0) {
    return;
  }

  const oldestRows =
    await connection.query(
      `
        SELECT address_id
        FROM employee_addresses
        WHERE employee_id = ?
        ORDER BY
          created_at ASC,
          address_id ASC
        LIMIT 1
      `,
      [employeeId]
    );

  const oldestAddress =
    oldestRows[0] as
      | {
          address_id:
            string | number | bigint;
        }
      | undefined;

  if (!oldestAddress) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_addresses
      SET is_primary = 1
      WHERE address_id = ?
    `,
    [
      oldestAddress.address_id
    ]
  );
}

/*
 * =========================================================
 * Emergency contact helpers
 * =========================================================
 */

async function selectEmergencyContactUsingConnection(
  connection: PoolConnection,
  employeeId: string,
  contactId: string
): Promise<EmergencyContactDatabaseRow | null> {
  const rows =
    await connection.query(
      `
        SELECT
            contact_id,
            employee_id,
            contact_name,
            relationship,
            primary_phone,
            alternate_phone,
            email,
            address,
            is_primary,
            created_at,
            updated_at
        FROM employee_emergency_contacts
        WHERE contact_id = ?
          AND employee_id = ?
        LIMIT 1
      `,
      [
        contactId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmergencyContactDatabaseRow
      | undefined
  ) ?? null;
}

async function clearPrimaryEmergencyContacts(
  connection: PoolConnection,
  employeeId: string,
  excludeContactId?: string
): Promise<void> {
  let sql = `
    UPDATE employee_emergency_contacts
    SET is_primary = 0
    WHERE employee_id = ?
      AND is_primary = 1
  `;

  const values: unknown[] = [
    employeeId
  ];

  if (excludeContactId) {
    sql += `
      AND contact_id <> ?
    `;

    values.push(
      excludeContactId
    );
  }

  await connection.query(
    sql,
    values
  );
}

async function ensurePrimaryEmergencyContact(
  connection: PoolConnection,
  employeeId: string
): Promise<void> {
  const primaryRows =
    await connection.query(
      `
        SELECT contact_id
        FROM employee_emergency_contacts
        WHERE employee_id = ?
          AND is_primary = 1
        LIMIT 1
      `,
      [employeeId]
    );

  if (primaryRows.length > 0) {
    return;
  }

  const oldestRows =
    await connection.query(
      `
        SELECT contact_id
        FROM employee_emergency_contacts
        WHERE employee_id = ?
        ORDER BY
          created_at ASC,
          contact_id ASC
        LIMIT 1
      `,
      [employeeId]
    );

  const oldestContact =
    oldestRows[0] as
      | {
          contact_id:
            string | number | bigint;
        }
      | undefined;

  if (!oldestContact) {
    return;
  }

  await connection.query(
    `
      UPDATE employee_emergency_contacts
      SET is_primary = 1
      WHERE contact_id = ?
    `,
    [
      oldestContact.contact_id
    ]
  );
}

/*
 * =========================================================
 * Employee access record
 * =========================================================
 */

export async function findEmployeeOwnerById(
  employeeId: string
): Promise<EmployeeOwnerDatabaseRow | null> {
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
      | EmployeeOwnerDatabaseRow
      | undefined
  ) ?? null;
}

/*
 * =========================================================
 * Employee address repository functions
 * =========================================================
 */

export async function listEmployeeAddressRecords(
  employeeId: string
): Promise<EmployeeAddressDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
            address_id,
            employee_id,
            address_type,
            address_line_1,
            address_line_2,
            city,
            district,
            province,
            postal_code,
            country_code,
            is_primary,
            created_at,
            updated_at
        FROM employee_addresses
        WHERE employee_id = ?
        ORDER BY
          is_primary DESC,
          created_at ASC,
          address_id ASC
      `,
      [employeeId]
    );

  return rows as
    EmployeeAddressDatabaseRow[];
}

export async function findEmployeeAddressRecord(
  employeeId: string,
  addressId: string
): Promise<EmployeeAddressDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            address_id,
            employee_id,
            address_type,
            address_line_1,
            address_line_2,
            city,
            district,
            province,
            postal_code,
            country_code,
            is_primary,
            created_at,
            updated_at
        FROM employee_addresses
        WHERE address_id = ?
          AND employee_id = ?
        LIMIT 1
      `,
      [
        addressId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmployeeAddressDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmployeeAddressRecord(
  input: CreateEmployeeAddressRecord,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<EmployeeAddressDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (input.isPrimary) {
      await clearPrimaryAddresses(
        connection,
        input.employeeId
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_addresses (
              employee_id,
              address_type,
              address_line_1,
              address_line_2,
              city,
              district,
              province,
              postal_code,
              country_code,
              is_primary
          )
          VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?
          )
        `,
        [
          input.employeeId,
          input.addressType,
          input.addressLine1,
          input.addressLine2,
          input.city,
          input.district,
          input.province,
          input.postalCode,
          input.countryCode,
          input.isPrimary ? 1 : 0
        ]
      );

    const addressId =
      String(
        insertResult.insertId
      );

    await ensurePrimaryAddress(
      connection,
      input.employeeId
    );

    const address =
      await selectAddressUsingConnection(
        connection,
        input.employeeId,
        addressId
      );

    if (!address) {
      throw new Error(
        "CREATED_ADDRESS_NOT_FOUND"
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
            'employee_address_created',
            'employee_addresses',
            ?,
            ?,
            'POST',
            ?,
            ?,
            ?
        )
      `,
      [
        actor.companyId,
        actor.userId,
        addressId,
        safeJson(address),

        `/api/v1/employees/${input.employeeId}/addresses`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return address;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmployeeAddressRecord(
  employeeId: string,
  addressId: string,
  input: UpdateEmployeeAddressRecord,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<EmployeeAddressDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const currentAddress =
      await selectAddressUsingConnection(
        connection,
        employeeId,
        addressId
      );

    if (!currentAddress) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (input.isPrimary === true) {
      await clearPrimaryAddresses(
        connection,
        employeeId,
        addressId
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

    if (input.addressType !== undefined) {
      addUpdate(
        "address_type",
        input.addressType
      );
    }

    if (input.addressLine1 !== undefined) {
      addUpdate(
        "address_line_1",
        input.addressLine1
      );
    }

    if (input.addressLine2 !== undefined) {
      addUpdate(
        "address_line_2",
        input.addressLine2
      );
    }

    if (input.city !== undefined) {
      addUpdate(
        "city",
        input.city
      );
    }

    if (input.district !== undefined) {
      addUpdate(
        "district",
        input.district
      );
    }

    if (input.province !== undefined) {
      addUpdate(
        "province",
        input.province
      );
    }

    if (input.postalCode !== undefined) {
      addUpdate(
        "postal_code",
        input.postalCode
      );
    }

    if (input.countryCode !== undefined) {
      addUpdate(
        "country_code",
        input.countryCode
      );
    }

    if (input.isPrimary !== undefined) {
      addUpdate(
        "is_primary",
        input.isPrimary ? 1 : 0
      );
    }

    if (assignments.length > 0) {
      values.push(
        addressId,
        employeeId
      );

      await connection.query(
        `
          UPDATE employee_addresses
          SET ${assignments.join(", ")}
          WHERE address_id = ?
            AND employee_id = ?
        `,
        values
      );
    }

    await ensurePrimaryAddress(
      connection,
      employeeId
    );

    const updatedAddress =
      await selectAddressUsingConnection(
        connection,
        employeeId,
        addressId
      );

    if (!updatedAddress) {
      throw new Error(
        "UPDATED_ADDRESS_NOT_FOUND"
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
            'employee_address_updated',
            'employee_addresses',
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
        actor.companyId,
        actor.userId,
        addressId,
        safeJson(currentAddress),
        safeJson(updatedAddress),

        `/api/v1/employees/${employeeId}/addresses/${addressId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedAddress;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmployeeAddressRecord(
  employeeId: string,
  addressId: string,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const address =
      await selectAddressUsingConnection(
        connection,
        employeeId,
        addressId
      );

    if (!address) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        DELETE FROM employee_addresses
        WHERE address_id = ?
          AND employee_id = ?
      `,
      [
        addressId,
        employeeId
      ]
    );

    await ensurePrimaryAddress(
      connection,
      employeeId
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
            'employee_address_deleted',
            'employee_addresses',
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
        actor.companyId,
        actor.userId,
        addressId,
        safeJson(address),

        safeJson({
          addressId,
          employeeId,
          deleted: true
        }),

        `/api/v1/employees/${employeeId}/addresses/${addressId}`,
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
 * Emergency contact repository functions
 * =========================================================
 */

export async function listEmergencyContactRecords(
  employeeId: string
): Promise<EmergencyContactDatabaseRow[]> {
  const rows =
    await databasePool.query(
      `
        SELECT
            contact_id,
            employee_id,
            contact_name,
            relationship,
            primary_phone,
            alternate_phone,
            email,
            address,
            is_primary,
            created_at,
            updated_at
        FROM employee_emergency_contacts
        WHERE employee_id = ?
        ORDER BY
          is_primary DESC,
          created_at ASC,
          contact_id ASC
      `,
      [employeeId]
    );

  return rows as
    EmergencyContactDatabaseRow[];
}

export async function findEmergencyContactRecord(
  employeeId: string,
  contactId: string
): Promise<EmergencyContactDatabaseRow | null> {
  const rows =
    await databasePool.query(
      `
        SELECT
            contact_id,
            employee_id,
            contact_name,
            relationship,
            primary_phone,
            alternate_phone,
            email,
            address,
            is_primary,
            created_at,
            updated_at
        FROM employee_emergency_contacts
        WHERE contact_id = ?
          AND employee_id = ?
        LIMIT 1
      `,
      [
        contactId,
        employeeId
      ]
    );

  return (
    rows[0] as
      | EmergencyContactDatabaseRow
      | undefined
  ) ?? null;
}

export async function createEmergencyContactRecord(
  input: CreateEmergencyContactRecord,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<EmergencyContactDatabaseRow> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        input.employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    if (input.isPrimary) {
      await clearPrimaryEmergencyContacts(
        connection,
        input.employeeId
      );
    }

    const insertResult =
      await connection.query(
        `
          INSERT INTO employee_emergency_contacts (
              employee_id,
              contact_name,
              relationship,
              primary_phone,
              alternate_phone,
              email,
              address,
              is_primary
          )
          VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?
          )
        `,
        [
          input.employeeId,
          input.contactName,
          input.relationship,
          input.primaryPhone,
          input.alternatePhone,
          input.email,
          input.address,
          input.isPrimary ? 1 : 0
        ]
      );

    const contactId =
      String(
        insertResult.insertId
      );

    await ensurePrimaryEmergencyContact(
      connection,
      input.employeeId
    );

    const contact =
      await selectEmergencyContactUsingConnection(
        connection,
        input.employeeId,
        contactId
      );

    if (!contact) {
      throw new Error(
        "CREATED_EMERGENCY_CONTACT_NOT_FOUND"
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
            'emergency_contact_created',
            'employee_emergency_contacts',
            ?,
            ?,
            'POST',
            ?,
            ?,
            ?
        )
      `,
      [
        actor.companyId,
        actor.userId,
        contactId,
        safeJson(contact),

        `/api/v1/employees/${input.employeeId}/emergency-contacts`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return contact;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEmergencyContactRecord(
  employeeId: string,
  contactId: string,
  input: UpdateEmergencyContactRecord,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<EmergencyContactDatabaseRow | null> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const currentContact =
      await selectEmergencyContactUsingConnection(
        connection,
        employeeId,
        contactId
      );

    if (!currentContact) {
      await connection.rollback();
      transactionStarted = false;

      return null;
    }

    if (input.isPrimary === true) {
      await clearPrimaryEmergencyContacts(
        connection,
        employeeId,
        contactId
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

    if (input.contactName !== undefined) {
      addUpdate(
        "contact_name",
        input.contactName
      );
    }

    if (input.relationship !== undefined) {
      addUpdate(
        "relationship",
        input.relationship
      );
    }

    if (input.primaryPhone !== undefined) {
      addUpdate(
        "primary_phone",
        input.primaryPhone
      );
    }

    if (input.alternatePhone !== undefined) {
      addUpdate(
        "alternate_phone",
        input.alternatePhone
      );
    }

    if (input.email !== undefined) {
      addUpdate(
        "email",
        input.email
      );
    }

    if (input.address !== undefined) {
      addUpdate(
        "address",
        input.address
      );
    }

    if (input.isPrimary !== undefined) {
      addUpdate(
        "is_primary",
        input.isPrimary ? 1 : 0
      );
    }

    if (assignments.length > 0) {
      values.push(
        contactId,
        employeeId
      );

      await connection.query(
        `
          UPDATE employee_emergency_contacts
          SET ${assignments.join(", ")}
          WHERE contact_id = ?
            AND employee_id = ?
        `,
        values
      );
    }

    await ensurePrimaryEmergencyContact(
      connection,
      employeeId
    );

    const updatedContact =
      await selectEmergencyContactUsingConnection(
        connection,
        employeeId,
        contactId
      );

    if (!updatedContact) {
      throw new Error(
        "UPDATED_EMERGENCY_CONTACT_NOT_FOUND"
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
            'emergency_contact_updated',
            'employee_emergency_contacts',
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
        actor.companyId,
        actor.userId,
        contactId,
        safeJson(currentContact),
        safeJson(updatedContact),

        `/api/v1/employees/${employeeId}/emergency-contacts/${contactId}`,
        metadata.ipAddress,
        metadata.userAgent
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedContact;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEmergencyContactRecord(
  employeeId: string,
  contactId: string,
  actor: EmployeeDetailActor,
  metadata: RequestMetadata
): Promise<boolean> {
  const connection =
    await databasePool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const employeeExists =
      await lockEmployeeRecord(
        connection,
        employeeId
      );

    if (!employeeExists) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const contact =
      await selectEmergencyContactUsingConnection(
        connection,
        employeeId,
        contactId
      );

    if (!contact) {
      await connection.rollback();
      transactionStarted = false;

      return false;
    }

    await connection.query(
      `
        DELETE FROM employee_emergency_contacts
        WHERE contact_id = ?
          AND employee_id = ?
      `,
      [
        contactId,
        employeeId
      ]
    );

    await ensurePrimaryEmergencyContact(
      connection,
      employeeId
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
            'emergency_contact_deleted',
            'employee_emergency_contacts',
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
        actor.companyId,
        actor.userId,
        contactId,
        safeJson(contact),

        safeJson({
          contactId,
          employeeId,
          deleted: true
        }),

        `/api/v1/employees/${employeeId}/emergency-contacts/${contactId}`,
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
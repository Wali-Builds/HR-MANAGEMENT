import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createEmergencyContactRecord,
  createEmployeeAddressRecord,
  deleteEmergencyContactRecord,
  deleteEmployeeAddressRecord,
  findEmployeeAddressRecord,
  findEmployeeOwnerById,
  findEmergencyContactRecord,
  listEmergencyContactRecords,
  listEmployeeAddressRecords,
  updateEmergencyContactRecord,
  updateEmployeeAddressRecord
} from "./employee-detail.repository.js";

import type {
  CreateEmergencyContactInput,
  CreateEmployeeAddressInput,
  UpdateEmergencyContactInput,
  UpdateEmployeeAddressInput
} from "./employee-detail.schema.js";

import type {
  CreateEmergencyContactRecord,
  CreateEmployeeAddressRecord,
  EmergencyContactDatabaseRow,
  EmergencyContactResponse,
  EmployeeAddressDatabaseRow,
  EmployeeAddressResponse,
  EmployeeDetailActor,
  EmployeeOwnerDatabaseRow,
  RequestMetadata,
  UpdateEmergencyContactRecord,
  UpdateEmployeeAddressRecord
} from "./employee-detail.types.js";

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
}

function requiredDateTime(
  value: Date | string
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toISOString();
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
  // edited by wali: Allow linked Company Administrators to manage employee details in their company.
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
): EmployeeDetailActor {
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

function mapAddress(
  address: EmployeeAddressDatabaseRow
): EmployeeAddressResponse {
  return {
    addressId:
      String(address.address_id),

    employeeId:
      String(address.employee_id),

    addressType:
      address.address_type,

    addressLine1:
      address.address_line_1,

    addressLine2:
      address.address_line_2,

    city:
      address.city,

    district:
      address.district,

    province:
      address.province,

    postalCode:
      address.postal_code,

    countryCode:
      address.country_code,

    isPrimary:
      databaseBoolean(
        address.is_primary
      ),

    createdAt:
      requiredDateTime(
        address.created_at
      ),

    updatedAt:
      requiredDateTime(
        address.updated_at
      )
  };
}

function mapEmergencyContact(
  contact: EmergencyContactDatabaseRow
): EmergencyContactResponse {
  return {
    contactId:
      String(contact.contact_id),

    employeeId:
      String(contact.employee_id),

    contactName:
      contact.contact_name,

    relationship:
      contact.relationship,

    primaryPhone:
      contact.primary_phone,

    alternatePhone:
      contact.alternate_phone,

    email:
      contact.email,

    address:
      contact.address,

    isPrimary:
      databaseBoolean(
        contact.is_primary
      ),

    createdAt:
      requiredDateTime(
        contact.created_at
      ),

    updatedAt:
      requiredDateTime(
        contact.updated_at
      )
  };
}

async function getEmployeeOrThrow(
  employeeId: string
): Promise<EmployeeOwnerDatabaseRow> {
  const employee =
    await findEmployeeOwnerById(
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
  employee: EmployeeOwnerDatabaseRow
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

function assertEmployeeViewAccess(
  auth: AuthContext,
  employee: EmployeeOwnerDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  assertSameCompany(
    auth,
    employee
  );

  const isOwnEmployeeProfile =
    auth.employeeId !== null &&
    auth.employeeId !== undefined &&
    String(employee.employee_id) ===
      auth.employeeId;

  if (isOwnEmployeeProfile) {
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
      "You do not have permission to view this employee's details",

    statusCode: 403,

    code:
      "EMPLOYEE_VIEW_ACCESS_DENIED"
  });
}

function assertEmployeeManageAccess(
  auth: AuthContext,
  employee: EmployeeOwnerDatabaseRow
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
      "You do not have permission to manage employee details",

    statusCode: 403,

    code:
      "EMPLOYEE_UPDATE_ACCESS_DENIED"
  });
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

  throw error;
}

/*
 * =========================================================
 * Employee addresses
 * =========================================================
 */

export async function listEmployeeAddresses(
  employeeId: string,
  auth: AuthContext
): Promise<EmployeeAddressResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeViewAccess(
    auth,
    employee
  );

  const addresses =
    await listEmployeeAddressRecords(
      employeeId
    );

  return addresses.map(
    mapAddress
  );
}

export async function createEmployeeAddress(
  employeeId: string,
  input: CreateEmployeeAddressInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeAddressResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const record:
  CreateEmployeeAddressRecord = {
    employeeId,

    addressType:
      input.addressType,

    addressLine1:
      input.addressLine1,

    addressLine2:
      input.addressLine2 ??
      null,

    city:
      input.city ?? null,

    district:
      input.district ?? null,

    province:
      input.province ?? null,

    postalCode:
      input.postalCode ??
      null,

    countryCode:
      input.countryCode,

    isPrimary:
      input.isPrimary
  };

  try {
    const address =
      await createEmployeeAddressRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapAddress(
      address
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeAddress(
  employeeId: string,
  addressId: string,
  input: UpdateEmployeeAddressInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmployeeAddressResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const existingAddress =
    await findEmployeeAddressRecord(
      employeeId,
      addressId
    );

  if (!existingAddress) {
    throw new AppError({
      message:
        "Employee address was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_ADDRESS_NOT_FOUND"
    });
  }

  const record:
  UpdateEmployeeAddressRecord = {
    ...(input.addressType !== undefined
      ? {
          addressType:
            input.addressType
        }
      : {}),

    ...(input.addressLine1 !== undefined
      ? {
          addressLine1:
            input.addressLine1
        }
      : {}),

    ...(input.addressLine2 !== undefined
      ? {
          addressLine2:
            input.addressLine2
        }
      : {}),

    ...(input.city !== undefined
      ? {
          city:
            input.city
        }
      : {}),

    ...(input.district !== undefined
      ? {
          district:
            input.district
        }
      : {}),

    ...(input.province !== undefined
      ? {
          province:
            input.province
        }
      : {}),

    ...(input.postalCode !== undefined
      ? {
          postalCode:
            input.postalCode
        }
      : {}),

    ...(input.countryCode !== undefined
      ? {
          countryCode:
            input.countryCode
        }
      : {}),

    ...(input.isPrimary !== undefined
      ? {
          isPrimary:
            input.isPrimary
        }
      : {})
  };

  try {
    const address =
      await updateEmployeeAddressRecord(
        employeeId,
        addressId,
        record,
        createActor(auth),
        metadata
      );

    if (!address) {
      throw new AppError({
        message:
          "Employee address was not found",

        statusCode: 404,

        code:
          "EMPLOYEE_ADDRESS_NOT_FOUND"
      });
    }

    return mapAddress(
      address
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeAddress(
  employeeId: string,
  addressId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const deleted =
    await deleteEmployeeAddressRecord(
      employeeId,
      addressId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Employee address was not found",

      statusCode: 404,

      code:
        "EMPLOYEE_ADDRESS_NOT_FOUND"
    });
  }
}

/*
 * =========================================================
 * Emergency contacts
 * =========================================================
 */

export async function listEmergencyContacts(
  employeeId: string,
  auth: AuthContext
): Promise<EmergencyContactResponse[]> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeViewAccess(
    auth,
    employee
  );

  const contacts =
    await listEmergencyContactRecords(
      employeeId
    );

  return contacts.map(
    mapEmergencyContact
  );
}

export async function createEmergencyContact(
  employeeId: string,
  input: CreateEmergencyContactInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmergencyContactResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const record:
  CreateEmergencyContactRecord = {
    employeeId,

    contactName:
      input.contactName,

    relationship:
      input.relationship,

    primaryPhone:
      input.primaryPhone,

    alternatePhone:
      input.alternatePhone ??
      null,

    email:
      input.email ?? null,

    address:
      input.address ?? null,

    isPrimary:
      input.isPrimary
  };

  try {
    const contact =
      await createEmergencyContactRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapEmergencyContact(
      contact
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmergencyContact(
  employeeId: string,
  contactId: string,
  input: UpdateEmergencyContactInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<EmergencyContactResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const existingContact =
    await findEmergencyContactRecord(
      employeeId,
      contactId
    );

  if (!existingContact) {
    throw new AppError({
      message:
        "Emergency contact was not found",

      statusCode: 404,

      code:
        "EMERGENCY_CONTACT_NOT_FOUND"
    });
  }

  const record:
  UpdateEmergencyContactRecord = {
    ...(input.contactName !== undefined
      ? {
          contactName:
            input.contactName
        }
      : {}),

    ...(input.relationship !== undefined
      ? {
          relationship:
            input.relationship
        }
      : {}),

    ...(input.primaryPhone !== undefined
      ? {
          primaryPhone:
            input.primaryPhone
        }
      : {}),

    ...(input.alternatePhone !== undefined
      ? {
          alternatePhone:
            input.alternatePhone
        }
      : {}),

    ...(input.email !== undefined
      ? {
          email:
            input.email
        }
      : {}),

    ...(input.address !== undefined
      ? {
          address:
            input.address
        }
      : {}),

    ...(input.isPrimary !== undefined
      ? {
          isPrimary:
            input.isPrimary
        }
      : {})
  };

  try {
    const contact =
      await updateEmergencyContactRecord(
        employeeId,
        contactId,
        record,
        createActor(auth),
        metadata
      );

    if (!contact) {
      throw new AppError({
        message:
          "Emergency contact was not found",

        statusCode: 404,

        code:
          "EMERGENCY_CONTACT_NOT_FOUND"
      });
    }

    return mapEmergencyContact(
      contact
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmergencyContact(
  employeeId: string,
  contactId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeManageAccess(
    auth,
    employee
  );

  const deleted =
    await deleteEmergencyContactRecord(
      employeeId,
      contactId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "Emergency contact was not found",

      statusCode: 404,

      code:
        "EMERGENCY_CONTACT_NOT_FOUND"
    });
  }
}

import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  createRoleRecord,
  deleteRoleRecord,
  findPermissionRowsByCodes,
  findPermissionsForRoles,
  findRoleById,
  findRoleCodeConflict,
  findRolePermissionsByRoleId,
  listPermissionRecords,
  listRoleRecords,
  replaceRolePermissionsRecord,
  updateRoleRecord
} from "./role.repository.js";

import type {
  CreateRoleInput,
  PermissionListQuery,
  ReplaceRolePermissionsInput,
  RoleListQuery,
  UpdateRoleInput
} from "./role.schema.js";

import type {
  CreateRoleRecord,
  PermissionDatabaseRow,
  PermissionListOptions,
  PermissionResponse,
  RequestMetadata,
  RoleActor,
  RoleDatabaseRow,
  RoleListOptions,
  RolePermissionDatabaseRow,
  RoleResponse,
  UpdateRoleRecord
} from "./role.types.js";

// edited by wali: Tenant administrators can assign these built-in access markers.
const TENANT_GRANTABLE_PERMISSION_CODES: string[] = [
  "EMPLOYEE",
  "COMPANY_ADMIN",
  "BRANCH_ADMIN"
];

function databaseBoolean(
  value: number | boolean
): boolean {
  return (
    value === true ||
    Number(value) === 1
  );
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

function mapPermission(
  permission:
    PermissionDatabaseRow |
    RolePermissionDatabaseRow
): PermissionResponse {
  return {
    permissionId:
      String(
        permission.permission_id
      ),

    permissionCode:
      permission.permission_code,

    moduleName:
      permission.module_name,

    actionName:
      permission.action_name,

    description:
      permission.description,

    createdAt:
      dateTimeIso(
        permission.created_at
      )
  };
}

function mapRole(
  role: RoleDatabaseRow,
  permissions:
    RolePermissionDatabaseRow[]
): RoleResponse {
  return {
    roleId:
      String(role.role_id),

    companyId:
      role.company_id === null
        ? null
        : String(role.company_id),

    roleCode:
      role.role_code,

    roleName:
      role.role_name,

    description:
      role.description,

    isSystemRole:
      databaseBoolean(
        role.is_system_role
      ),

    isActive:
      databaseBoolean(
        role.is_active
      ),

    permissionCount:
      Number(
        role.permission_count
      ),

    permissions:
      permissions.map(
        mapPermission
      ),

    createdAt:
      dateTimeIso(
        role.created_at
      ),

    updatedAt:
      dateTimeIso(
        role.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): RoleActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function requirePlatformAdministrator(
  auth: AuthContext
): void {
  if (!auth.isPlatformAdmin) {
    throw new AppError({
      message:
        "Only a Platform Administrator can manage global roles and permissions",

      statusCode: 403,

      code:
        "PLATFORM_ADMIN_REQUIRED"
    });
  }
}

// edited by wali: Allow tenant administrators to read only their own role catalog.
function requireRoleManagementAccess(
  auth: AuthContext
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  const isCompanyAdministrator =
    Boolean(auth.companyId) &&
    auth.roleCodes.some(
      (roleCode) => roleCode.trim().toUpperCase() === "COMPANY_ADMIN"
    );

  if (!isCompanyAdministrator) {
    throw new AppError({
      message: "Only Platform Administrators and Company Administrators can view roles",
      statusCode: 403,
      code: "ROLE_MANAGEMENT_ACCESS_REQUIRED"
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
    "PERMISSION_ASSIGNMENT_COUNT_MISMATCH"
  ) {
    throw new AppError({
      message:
        "One or more selected permissions are invalid",

      statusCode: 422,

      code:
        "INVALID_ROLE_PERMISSION"
    });
  }

  if (isDuplicateEntryError(error)) {
    throw new AppError({
      message:
        "This role code already exists",

      statusCode: 409,

      code:
        "ROLE_CODE_EXISTS"
    });
  }

  throw error;
}

async function validatePermissionCodes(
  permissionCodes: string[],
  allowedPermissionCodes?: readonly string[]
): Promise<void> {
  if (allowedPermissionCodes) {
    const disallowedPermissionCodes = permissionCodes.filter(
      (permissionCode) => !allowedPermissionCodes.includes(permissionCode)
    );

    if (disallowedPermissionCodes.length > 0) {
      throw new AppError({
        message: "Company Administrators may only grant built-in tenant role permissions",
        statusCode: 403,
        code: "ROLE_PERMISSION_NOT_ALLOWED",
        details: { disallowedPermissionCodes }
      });
    }
  }
  const permissionRows =
    await findPermissionRowsByCodes(
      permissionCodes
    );

  const availableCodes =
    new Set<string>(
      permissionRows.map(
        (permission) =>
          permission.permission_code
      )
    );

  const missingPermissionCodes =
    permissionCodes.filter(
      (permissionCode) =>
        !availableCodes.has(
          permissionCode
        )
    );

  if (
    missingPermissionCodes.length > 0
  ) {
    throw new AppError({
      message:
        "One or more selected permissions do not exist",

      statusCode: 422,

      code:
        "INVALID_ROLE_PERMISSION",

      details: {
        missingPermissionCodes
      }
    });
  }

}

export async function listPermissions(
  query: PermissionListQuery,
  auth: AuthContext
): Promise<{
  permissions:
  PermissionResponse[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  requireRoleManagementAccess(auth);

  const options:
    PermissionListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.search !== undefined
      ? {
        search:
          query.search
      }
      : {}),

    ...(query.moduleName !== undefined
      ? {
        moduleName:
          query.moduleName
      }
      : {}),

    ...(query.actionName !== undefined
      ? {
        actionName:
          query.actionName
      }
      : {})
  };

  if (!auth.isPlatformAdmin) {
    // edited by wali: Expose Branch Admin alongside the existing tenant role permissions.
    options.allowedPermissionCodes = TENANT_GRANTABLE_PERMISSION_CODES;
  }

  const result =
    await listPermissionRecords(
      options
    );

  return {
    permissions:
      result.permissions.map(
        mapPermission
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

export async function listRoles(
  query: RoleListQuery,
  auth: AuthContext
): Promise<{
  roles: RoleResponse[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  requireRoleManagementAccess(auth);

  const options:
    RoleListOptions = {
    companyId: auth.isPlatformAdmin ? null : auth.companyId,

    page:
      query.page,

    limit:
      query.limit,

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.search !== undefined
      ? {
        search:
          query.search
      }
      : {}),

    ...(query.permissionCode !==
      undefined
      ? {
        permissionCode:
          query.permissionCode
      }
      : {}),

    ...(query.moduleName !== undefined
      ? {
        moduleName:
          query.moduleName
      }
      : {}),

    ...(query.isSystemRole !==
      undefined
      ? {
        isSystemRole:
          query.isSystemRole
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
    await listRoleRecords(
      options
    );

  const roleIds =
    result.roles.map(
      (role) =>
        String(role.role_id)
    );

  const permissions =
    await findPermissionsForRoles(
      roleIds
    );

  const permissionsByRole =
    new Map<
      string,
      RolePermissionDatabaseRow[]
    >();

  for (
    const permission of
    permissions
  ) {
    const roleId =
      String(
        permission.role_id
      );

    const existingPermissions =
      permissionsByRole.get(
        roleId
      ) ?? [];

    existingPermissions.push(
      permission
    );

    permissionsByRole.set(
      roleId,
      existingPermissions
    );
  }

  return {
    roles:
      result.roles.map(
        (role) =>
          mapRole(
            role,
            permissionsByRole.get(
              String(role.role_id)
            ) ?? []
          )
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

export async function getRole(
  roleId: string,
  auth: AuthContext
): Promise<RoleResponse> {
  requireRoleManagementAccess(auth);

  const role =
    await findRoleById(
      roleId,
      auth.isPlatformAdmin ? null : auth.companyId
    );

  if (!role) {
    throw new AppError({
      message:
        "Role was not found",

      statusCode: 404,

      code:
        "ROLE_NOT_FOUND"
    });
  }

  const permissions =
    await findRolePermissionsByRoleId(
      roleId
    );

  return mapRole(
    role,
    permissions
  );
}

export async function createRole(
  input: CreateRoleInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<RoleResponse> {
  requireRoleManagementAccess(auth);

  const roleCompanyId =
    auth.isPlatformAdmin ? null : auth.companyId;

  if (
    !auth.isPlatformAdmin &&
    ["COMPANY_ADMIN", "PLATFORM_ADMIN"].includes(input.roleCode)
  ) {
    throw new AppError({
      message: "This role code is reserved for platform-managed access",
      statusCode: 409,
      code: "ROLE_CODE_RESERVED"
    });
  }

  const conflict =
    await findRoleCodeConflict(
      input.roleCode,
      roleCompanyId
    );

  if (conflict) {
    throw new AppError({
      message:
        "This role code already exists",

      statusCode: 409,

      code:
        "ROLE_CODE_EXISTS"
    });
  }

  await validatePermissionCodes(
    input.permissionCodes,
    auth.isPlatformAdmin ? undefined : TENANT_GRANTABLE_PERMISSION_CODES
  );

  const record:
    CreateRoleRecord = {
    companyId: roleCompanyId,

    roleCode:
      input.roleCode,

    roleName:
      input.roleName,

    description:
      input.description ?? null,

    isActive:
      input.isActive,

    permissionCodes:
      input.permissionCodes
  };

  try {
    const role =
      await createRoleRecord(
        record,
        createActor(auth),
        metadata
      );

    const permissions =
      await findRolePermissionsByRoleId(
        String(role.role_id)
      );

    return mapRole(
      role,
      permissions
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateRole(
  roleId: string,
  input: UpdateRoleInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<RoleResponse> {
  requireRoleManagementAccess(auth);

  const existing =
    await findRoleById(
      roleId,
      auth.isPlatformAdmin ? null : auth.companyId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Role was not found",

      statusCode: 404,

      code:
        "ROLE_NOT_FOUND"
    });
  }

  if (
    existing.role_code ===
    "PLATFORM_ADMIN"
  ) {
    throw new AppError({
      message:
        "The PLATFORM_ADMIN role is fully protected and cannot be modified",

      statusCode: 409,

      code:
        "PLATFORM_ADMIN_ROLE_PROTECTED"
    });
  }

  const isSystemRole =
    databaseBoolean(
      existing.is_system_role
    );

  if (
    isSystemRole &&
    (
      input.roleCode !== undefined ||
      input.roleName !== undefined ||
      input.isActive !== undefined
    )
  ) {
    throw new AppError({
      message:
        "System role code, name and active status cannot be modified",

      statusCode: 409,

      code:
        "SYSTEM_ROLE_PROTECTED"
    });
  }

  if (
    !auth.isPlatformAdmin &&
    input.roleCode !== undefined &&
    ["COMPANY_ADMIN", "PLATFORM_ADMIN"].includes(input.roleCode)
  ) {
    throw new AppError({
      message: "This role code is reserved for platform-managed access",
      statusCode: 409,
      code: "ROLE_CODE_RESERVED"
    });
  }

  if (
    input.roleCode !== undefined
  ) {
    const conflict =
      await findRoleCodeConflict(
        input.roleCode,
        auth.isPlatformAdmin ? null : auth.companyId,
        roleId
      );

    if (conflict) {
      throw new AppError({
        message:
          "This role code already exists",

        statusCode: 409,

        code:
          "ROLE_CODE_EXISTS"
      });
    }
  }

  const record:
    UpdateRoleRecord = {
    ...(input.roleCode !== undefined
      ? {
        roleCode:
          input.roleCode
      }
      : {}),

    ...(input.roleName !== undefined
      ? {
        roleName:
          input.roleName
      }
      : {}),

    ...(input.description !== undefined
      ? {
        description:
          input.description
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
    const role =
      await updateRoleRecord(
        roleId,
        record,
        createActor(auth),
        metadata
      );

    if (!role) {
      throw new AppError({
        message:
          "Role was not found",

        statusCode: 404,

        code:
          "ROLE_NOT_FOUND"
      });
    }

    const permissions =
      await findRolePermissionsByRoleId(
        roleId
      );

    return mapRole(
      role,
      permissions
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function replaceRolePermissions(
  roleId: string,
  input:
    ReplaceRolePermissionsInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<{
  role: RoleResponse;
  revokedSessionCount: number;
}> {
  requireRoleManagementAccess(auth);

  const existing =
    await findRoleById(
      roleId,
      auth.isPlatformAdmin ? null : auth.companyId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Role was not found",

      statusCode: 404,

      code:
        "ROLE_NOT_FOUND"
    });
  }

  if (
    existing.role_code ===
    "PLATFORM_ADMIN"
  ) {
    throw new AppError({
      message:
        "The PLATFORM_ADMIN role permissions are protected and cannot be replaced",

      statusCode: 409,

      code:
        "PLATFORM_ADMIN_ROLE_PROTECTED"
    });
  }
  console.log("DEBUG permissionCodes:", input.permissionCodes);
  console.log(
    "DEBUG allowedPermissionCodes:",
    auth.isPlatformAdmin ? undefined : TENANT_GRANTABLE_PERMISSION_CODES
  );
  await validatePermissionCodes(
    input.permissionCodes,
    auth.isPlatformAdmin ? undefined : TENANT_GRANTABLE_PERMISSION_CODES
  );

  try {
    const result =
      await replaceRolePermissionsRecord(
        roleId,
        input.permissionCodes,
        createActor(auth),
        metadata
      );

    if (!result.replaced) {
      throw new AppError({
        message:
          "Role was not found",

        statusCode: 404,

        code:
          "ROLE_NOT_FOUND"
      });
    }

    const updatedRole =
      await findRoleById(
        roleId,
        auth.isPlatformAdmin ? null : auth.companyId
      );

    if (!updatedRole) {
      throw new AppError({
        message:
          "Role was not found",

        statusCode: 404,

        code:
          "ROLE_NOT_FOUND"
      });
    }

    const permissions =
      await findRolePermissionsByRoleId(
        roleId
      );

    return {
      role:
        mapRole(
          updatedRole,
          permissions
        ),

      revokedSessionCount:
        result.revokedSessionCount
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteRole(
  roleId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<{
  deleted: true;
}> {
  requireRoleManagementAccess(auth);

  const role =
    await findRoleById(
      roleId,
      auth.isPlatformAdmin ? null : auth.companyId
    );

  if (!role) {
    throw new AppError({
      message:
        "Role was not found",

      statusCode: 404,

      code:
        "ROLE_NOT_FOUND"
    });
  }

  if (
    role.role_code ===
    "PLATFORM_ADMIN"
  ) {
    throw new AppError({
      message:
        "The PLATFORM_ADMIN role cannot be deleted",

      statusCode: 409,

      code:
        "PLATFORM_ADMIN_ROLE_PROTECTED"
    });
  }

  if (
    databaseBoolean(
      role.is_system_role
    )
  ) {
    throw new AppError({
      message:
        "System roles cannot be deleted",

      statusCode: 409,

      code:
        "SYSTEM_ROLE_PROTECTED"
    });
  }

  const result =
    await deleteRoleRecord(
      roleId,
      createActor(auth),
      metadata
    );

  if (result.assigned) {
    throw new AppError({
      message:
        "This role cannot be deleted because it is assigned to a user. Remove its assignments first.",
      statusCode: 409,
      code:
        "ROLE_ASSIGNED"
    });
  }

  if (!result.deleted) {
    throw new AppError({
      message:
        "Role was not found",

      statusCode: 404,

      code:
        "ROLE_NOT_FOUND"
    });
  }

  return { deleted: true };
}

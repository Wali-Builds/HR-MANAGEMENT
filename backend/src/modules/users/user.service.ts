import {
  AppError
} from "../../common/errors/app-error.js";

import {
  hashPassword
} from "../../common/security/password.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  adminResetUserPasswordRecord,
  countActivePlatformAdmins,
  createUserRecord,
  findActiveBranchScope,
  findActiveCompany,
  findActiveDepartmentScope,
  findActiveRolesByCodes,
  findEmployeeForUserAccount,
  findRolesForUsers,
  findUserByEmployeeId,
  findUserById,
  findUserConflicts,
  findUserRolesByUserId,
  getUserLookupRecords,
  listUserRecords,
  replaceUserRolesRecord,
  softDeleteUserRecord,
  updateUserAccountRecord
} from "./user.repository.js";

import type {
  AdminResetPasswordInput,
  CreateUserInput,
  ReplaceUserRolesInput,
  UpdateUserInput,
  UserListQuery,
  UserLookupQuery,
  UserRoleInput
} from "./user.schema.js";

import type {
  CreateUserRecord,
  RequestMetadata,
  UpdateUserRecord,
  UserActor,
  UserDatabaseRow,
  UserListOptions,
  UserResponse,
  UserRoleAssignmentInput,
  UserRoleDatabaseRow,
  UserRoleResponse
} from "./user.types.js";

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

function nullableDateTime(
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
  return nullableDateTime(
    value
  ) as string;
}

function employeeName(
  user: UserDatabaseRow
): string | null {
  const name = [
    user.employee_first_name,
    user.employee_middle_name,
    user.employee_last_name
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim() !== ""
    )
    .join(" ");

  return name || null;
}

function mapRole(
  role: UserRoleDatabaseRow
): UserRoleResponse {
  return {
    userRoleId:
      String(role.user_role_id),

    roleId:
      String(role.role_id),

    roleCode:
      role.role_code,

    roleName:
      role.role_name,

    companyId:
      nullableId(
        role.company_id
      ),

    companyCode:
      role.company_code,

    companyName:
      role.company_name,

    branchId:
      nullableId(
        role.branch_id
      ),

    branchCode:
      role.branch_code,

    branchName:
      role.branch_name,

    departmentId:
      nullableId(
        role.department_id
      ),

    departmentCode:
      role.department_code,

    departmentName:
      role.department_name,

    assignedAt:
      requiredDateTime(
        role.assigned_at
      ),

    expiresAt:
      nullableDateTime(
        role.expires_at
      ),

    // edited by wali: A role grant is active only when both the assignment and the role are active.
    isActive:
      databaseBoolean(role.is_active) &&
      databaseBoolean(role.role_is_active)
  };
}

function mapUser(
  user: UserDatabaseRow,
  roles: UserRoleDatabaseRow[]
): UserResponse {
  return {
    userId:
      String(user.user_id),

    companyId:
      nullableId(
        user.company_id
      ),

    companyCode:
      user.company_code,

    companyName:
      user.company_name,

    employeeId:
      nullableId(
        user.employee_id
      ),

    employeeCode:
      user.employee_code,

    employeeName:
      employeeName(user),

    employeeOfficialEmail:
      user.employee_official_email,

    // edited by wali: Use the employee's current organization assignment as a role-scope default.
    employeeBranchId:
      user.employee_branch_id === null ? null : String(user.employee_branch_id),

    // edited by wali: Surface archived employee status so Access Control can block reactivation.
    isEmployeeArchived:
      user.employee_id !== null &&
      user.employee_deleted_at !== null,

    username:
      user.username,

    email:
      user.email,

    isPlatformAdmin:
      databaseBoolean(
        user.is_platform_admin
      ),

    isActive:
      databaseBoolean(
        user.is_active
      ),

    isEmailVerified:
      databaseBoolean(
        user.is_email_verified
      ),

    mustChangePassword:
      databaseBoolean(
        user.must_change_password
      ),

    failedLoginAttempts:
      Number(
        user.failed_login_attempts
      ),

    lockedUntil:
      nullableDateTime(
        user.locked_until
      ),

    lastLoginAt:
      nullableDateTime(
        user.last_login_at
      ),

    passwordChangedAt:
      nullableDateTime(
        user.password_changed_at
      ),

    roles:
      roles.map(mapRole),

    createdAt:
      requiredDateTime(
        user.created_at
      ),

    updatedAt:
      requiredDateTime(
        user.updated_at
      )
  };
}

function createActor(
  auth: AuthContext
): UserActor {
  return {
    userId:
      auth.userId,

    companyId:
      auth.companyId,

    employeeId:
      auth.employeeId,

    isPlatformAdmin:
      auth.isPlatformAdmin
  };
}

function assertTargetAccess(
  auth: AuthContext,
  target: UserDatabaseRow
): void {
  if (auth.isPlatformAdmin) {
    return;
  }

  if (
    databaseBoolean(
      target.is_platform_admin
    )
  ) {
    throw new AppError({
      message:
        "You cannot manage a Platform Administrator account",

      statusCode: 403,

      code:
        "USER_ACCESS_DENIED"
    });
  }

  if (
    !auth.companyId ||
    String(target.company_id) !==
      auth.companyId
  ) {
    throw new AppError({
      message:
        "You cannot manage a user belonging to another company",

      statusCode: 403,

      code:
        "USER_ACCESS_DENIED"
    });
  }
}

function throwUserConflict(
  conflict: {
    usernameExists: boolean;
    emailExists: boolean;
  }
): void {
  if (conflict.usernameExists) {
    throw new AppError({
      message:
        "This username is already in use",

      statusCode: 409,

      code:
        "USERNAME_EXISTS"
    });
  }

  if (conflict.emailExists) {
    throw new AppError({
      message:
        "This email address is already in use",

      statusCode: 409,

      code:
        "USER_EMAIL_EXISTS"
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
      "ROLE_NOT_FOUND"
  ) {
    throw new AppError({
      message:
        "One or more selected roles are invalid or inactive",

      statusCode: 422,

      code:
        "INVALID_USER_ROLE"
    });
  }

  // edited by wali: Return a clear conflict if an archived employee login is reactivated.
  if (
    error instanceof Error &&
    error.message ===
      "ARCHIVED_EMPLOYEE_CANNOT_BE_ACTIVATED"
  ) {
    throw new AppError({
      message:
        "An archived employee's account cannot be activated",
      statusCode: 409,
      code:
        "ARCHIVED_EMPLOYEE_CANNOT_BE_ACTIVATED"
    });
  }

  if (isDuplicateEntryError(error)) {
    throw new AppError({
      message:
        "Username, email, employee account or role scope is already in use",

      statusCode: 409,

      code:
        "USER_UNIQUE_VALUE_EXISTS"
    });
  }

  throw error;
}

function resolveAccountCompanyId(
  input: CreateUserInput,
  auth: AuthContext
): string | null {
  if (input.isPlatformAdmin) {
    if (!auth.isPlatformAdmin) {
      throw new AppError({
        message:
          "Only a Platform Administrator can create another Platform Administrator",

        statusCode: 403,

        code:
          "PLATFORM_ADMIN_REQUIRED"
      });
    }

    return null;
  }

  if (auth.isPlatformAdmin) {
    if (!input.companyId) {
      throw new AppError({
        message:
          "Company ID is required for a company user account",

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
        "You cannot create a user for another company",

      statusCode: 403,

      code:
        "USER_ACCESS_DENIED"
    });
  }

  return auth.companyId;
}

async function normalizeRoleAssignments(
  roles: UserRoleInput[],
  accountCompanyId: string | null,
  isPlatformAdminAccount: boolean,
  actor: AuthContext
): Promise<UserRoleAssignmentInput[]> {
  const uniqueRoleCodes =
    Array.from(
      new Set(
        roles.map(
          (role) =>
            role.roleCode
        )
      )
    );

  // edited by wali: Resolve requested role codes in the target account's company scope.
  const activeRoles =
    await findActiveRolesByCodes(
      uniqueRoleCodes,
      accountCompanyId,
      isPlatformAdminAccount
    );

  const activeRoleByCode =
    new Map(
      activeRoles.map((role) => [
        role.roleCode,
        role
      ])
    );

  const missingRoleCodes =
    uniqueRoleCodes.filter(
      (roleCode) =>
        !activeRoleByCode.has(
          roleCode
        )
    );

  if (
    missingRoleCodes.length > 0
  ) {
    throw new AppError({
      message:
        "One or more selected roles are invalid or inactive",

      statusCode: 422,

      code:
        "INVALID_USER_ROLE",

      details: {
        missingRoleCodes
      }
    });
  }

  if (isPlatformAdminAccount) {
    if (!actor.isPlatformAdmin) {
      throw new AppError({
        message:
          "Only a Platform Administrator can assign the PLATFORM_ADMIN role",

        statusCode: 403,

        code:
          "PLATFORM_ADMIN_REQUIRED"
      });
    }

    if (
      roles.length !== 1 ||
      roles[0]?.roleCode !==
        "PLATFORM_ADMIN"
    ) {
      throw new AppError({
        message:
          "A Platform Administrator account must only have the PLATFORM_ADMIN role",

        statusCode: 422,

        code:
          "INVALID_PLATFORM_ADMIN_ROLES"
      });
    }

    return [
      {
        roleId:
          activeRoleByCode.get("PLATFORM_ADMIN")!.roleId,
        roleCode:
          "PLATFORM_ADMIN",

        companyId: null,
        branchId: null,
        departmentId: null,

        expiresAt:
          roles[0].expiresAt ??
          null,

        isActive:
          roles[0].isActive
      }
    ];
  }

  if (!accountCompanyId) {
    throw new AppError({
      message:
        "Company scope is required for this user account",

      statusCode: 422,

      code:
        "COMPANY_SCOPE_REQUIRED"
    });
  }

  const normalizedRoles:
    UserRoleAssignmentInput[] = [];

  for (const role of roles) {
    // edited by wali: Only the Platform Admin may assign the reserved Company Admin login role.
    if (
      role.roleCode === "COMPANY_ADMIN" &&
      !actor.isPlatformAdmin
    ) {
      throw new AppError({
        message: "Only a Platform Administrator can assign the COMPANY_ADMIN role",
        statusCode: 403,
        code: "COMPANY_ADMIN_ROLE_NOT_ALLOWED"
      });
    }

    if (
      role.roleCode ===
      "PLATFORM_ADMIN"
    ) {
      throw new AppError({
        message:
          "PLATFORM_ADMIN role cannot be assigned to a company user",

        statusCode: 403,

        code:
          "PLATFORM_ADMIN_ROLE_NOT_ALLOWED"
      });
    }

   const roleCompanyId: string =
  role.companyId ??
  accountCompanyId;

    if (
      roleCompanyId !==
      accountCompanyId
    ) {
      throw new AppError({
        message:
          "Role company scope must match the user account company",

        statusCode: 422,

        code:
          "ROLE_COMPANY_SCOPE_MISMATCH"
      });
    }

    const branchId =
      role.branchId ?? null;

    const departmentId =
      role.departmentId ?? null;

    if (branchId) {
      const branch =
        await findActiveBranchScope(
          branchId
        );

      if (
        !branch ||
        branch.companyId !==
          accountCompanyId
      ) {
        throw new AppError({
          message:
            "The selected branch scope is invalid, inactive, or belongs to another company",

          statusCode: 422,

          code:
            "INVALID_ROLE_BRANCH_SCOPE"
        });
      }
    }

    if (departmentId) {
      const department =
        await findActiveDepartmentScope(
          departmentId
        );

      if (
        !department ||
        department.companyId !==
          accountCompanyId
      ) {
        throw new AppError({
          message:
            "The selected department scope is invalid, inactive, or belongs to another company",

          statusCode: 422,

          code:
            "INVALID_ROLE_DEPARTMENT_SCOPE"
        });
      }

      if (
        branchId &&
        department.branchId &&
        department.branchId !==
          branchId
      ) {
        throw new AppError({
          message:
            "Department scope belongs to a different branch",

          statusCode: 422,

          code:
            "ROLE_DEPARTMENT_BRANCH_MISMATCH"
        });
      }
    }

    normalizedRoles.push({
      roleId:
        activeRoleByCode.get(role.roleCode)!.roleId,
      roleCode:
        role.roleCode,

      companyId:
        accountCompanyId,

      branchId,
      departmentId,

      expiresAt:
        role.expiresAt ?? null,

      isActive:
        role.isActive
    });
  }

  return normalizedRoles;
}

export async function getUserLookupData(
  query: UserLookupQuery,
  auth: AuthContext
) {
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
          "You cannot access lookup data for another company",

        statusCode: 403,

        code:
          "USER_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  return getUserLookupRecords(
    companyId,
    query
      .includeEmployeesWithoutAccounts,
    auth.isPlatformAdmin
  );
}

export async function listUsers(
  query: UserListQuery,
  auth: AuthContext
): Promise<{
  users: UserResponse[];

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
          "You cannot list users belonging to another company",

        statusCode: 403,

        code:
          "USER_ACCESS_DENIED"
      });
    }

    companyId =
      auth.companyId;
  }

  const options:
  UserListOptions = {
    page:
      query.page,

    limit:
      query.limit,

    companyId,

    sortBy:
      query.sortBy,

    sortOrder:
      query.sortOrder,

    ...(query.employeeId !==
    undefined
      ? {
          employeeId:
            query.employeeId
        }
      : {}),

    ...(query.roleCode !== undefined
      ? {
          roleCode:
            query.roleCode
        }
      : {}),

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

    ...(query.search !== undefined
      ? {
          search:
            query.search
        }
      : {}),

    ...(query.isPlatformAdmin !==
    undefined
      ? {
          isPlatformAdmin:
            query.isPlatformAdmin
        }
      : {}),

    ...(query.isActive !== undefined
      ? {
          isActive:
            query.isActive
        }
      : {}),

    ...(query.isEmailVerified !==
    undefined
      ? {
          isEmailVerified:
            query.isEmailVerified
        }
      : {}),

    ...(query.mustChangePassword !==
    undefined
      ? {
          mustChangePassword:
            query.mustChangePassword
        }
      : {}),

    ...(query.isLocked !== undefined
      ? {
          isLocked:
            query.isLocked
        }
      : {})
  };

  const result =
    await listUserRecords(
      options
    );

  const userIds =
    result.users.map(
      (user) =>
        String(user.user_id)
    );

  const roles =
    await findRolesForUsers(
      userIds
    );

  const rolesByUser =
    new Map<
      string,
      UserRoleDatabaseRow[]
    >();

  for (const role of roles) {
    const userId =
      String(role.user_id);

    const existingRoles =
      rolesByUser.get(userId) ??
      [];

    existingRoles.push(role);

    rolesByUser.set(
      userId,
      existingRoles
    );
  }

  return {
    users:
      result.users.map(
        (user) =>
          mapUser(
            user,
            rolesByUser.get(
              String(user.user_id)
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

export async function getUser(
  userId: string,
  auth: AuthContext
): Promise<UserResponse> {
  const user =
    await findUserById(
      userId
    );

  if (!user) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  assertTargetAccess(
    auth,
    user
  );

  const roles =
    await findUserRolesByUserId(
      userId
    );

  return mapUser(
    user,
    roles
  );
}

export async function createUser(
  input: CreateUserInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<UserResponse> {
  const companyId =
    resolveAccountCompanyId(
      input,
      auth
    );

  if (
    companyId &&
    !await findActiveCompany(
      companyId
    )
  ) {
    throw new AppError({
      message:
        "The selected company was not found or is inactive",

      statusCode: 404,

      code:
        "COMPANY_NOT_FOUND"
    });
  }

  const conflict =
    await findUserConflicts({
      username:
        input.username,

      email:
        input.email ?? null
    });

  throwUserConflict(conflict);

  let employeeId:
    string | null =
      input.employeeId ?? null;

  let accountEmail =
    input.email ?? null;

  if (employeeId) {
    if (!companyId) {
      throw new AppError({
        message:
          "An employee-linked account requires a company",

        statusCode: 422,

        code:
          "EMPLOYEE_COMPANY_REQUIRED"
      });
    }

    const employee =
      await findEmployeeForUserAccount(
        employeeId,
        companyId
      );

    if (!employee) {
      throw new AppError({
        message:
          "The selected employee is invalid, inactive, or belongs to another company",

        statusCode: 422,

        code:
          "INVALID_USER_EMPLOYEE"
      });
    }

    const existingUserId =
      await findUserByEmployeeId(
        employeeId
      );

    if (existingUserId) {
      throw new AppError({
        message:
          "A user account already exists for this employee",

        statusCode: 409,

        code:
          "EMPLOYEE_USER_ACCOUNT_EXISTS"
      });
    }

    accountEmail =
      accountEmail ??
      employee.officialEmail;
  }

  const normalizedRoles =
    await normalizeRoleAssignments(
      input.roles,
      companyId,
      input.isPlatformAdmin,
      auth
    );

  const passwordHash =
    await hashPassword(
      input.temporaryPassword
    );

  const record:
  CreateUserRecord = {
    companyId,
    employeeId,

    username:
      input.username,

    email:
      accountEmail,

    passwordHash,

    isPlatformAdmin:
      input.isPlatformAdmin,

    isActive:
      input.isActive,

    isEmailVerified:
      input.isEmailVerified,

    mustChangePassword:
      input.mustChangePassword,

    roles:
      normalizedRoles
  };

  try {
    const user =
      await createUserRecord(
        record,
        createActor(auth),
        metadata
      );

    const roles =
      await findUserRolesByUserId(
        String(user.user_id)
      );

    return mapUser(
      user,
      roles
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<UserResponse> {
  const existing =
    await findUserById(
      userId
    );

  if (!existing) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  assertTargetAccess(
    auth,
    existing
  );

  const accountCompanyId =
    nullableId(
      existing.company_id
    );

  if (
    userId === auth.userId &&
    input.isActive === false
  ) {
    throw new AppError({
      message:
        "You cannot deactivate your own account",

      statusCode: 409,

      code:
        "SELF_USER_DEACTIVATION_NOT_ALLOWED"
    });
  }

  if (
    databaseBoolean(
      existing.is_platform_admin
    ) &&
    input.isActive === false
  ) {
    const platformAdminCount =
      await countActivePlatformAdmins();

    if (platformAdminCount <= 1) {
      throw new AppError({
        message:
          "The last active Platform Administrator cannot be deactivated",

        statusCode: 409,

        code:
          "LAST_PLATFORM_ADMIN_REQUIRED"
      });
    }
  }

  const resultingUsername =
    input.username ??
    existing.username;

  const resultingEmail =
    input.email !== undefined
      ? input.email
      : existing.email;

  const conflict =
    await findUserConflicts(
      {
        username:
          resultingUsername,

        email:
          resultingEmail
      },
      userId
    );

  throwUserConflict(conflict);

  const record:
  UpdateUserRecord = {
    ...(input.username !== undefined
      ? {
          username:
            input.username
        }
      : {}),

    ...(input.email !== undefined
      ? {
          email:
            input.email
        }
      : {}),

    ...(input.isActive !== undefined
      ? {
          isActive:
            input.isActive
        }
      : {}),

    ...(input.isEmailVerified !==
    undefined
      ? {
          isEmailVerified:
            input.isEmailVerified
        }
      : {}),

    ...(input.mustChangePassword !==
    undefined
      ? {
          mustChangePassword:
            input.mustChangePassword
        }
      : {}),

    ...(input.clearAccountLock === true
      ? {
          clearAccountLock: true
        }
      : {})
  };

  try {
    const user =
      await updateUserAccountRecord(
        userId,
        accountCompanyId,
        record,
        createActor(auth),
        metadata
      );

    if (!user) {
      throw new AppError({
        message:
          "User account was not found",

        statusCode: 404,

        code:
          "USER_NOT_FOUND"
      });
    }

    const roles =
      await findUserRolesByUserId(
        userId
      );

    return mapUser(
      user,
      roles
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function replaceUserRoles(
  userId: string,
  input: ReplaceUserRolesInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<UserResponse> {
  const user =
    await findUserById(
      userId
    );

  if (!user) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  assertTargetAccess(
    auth,
    user
  );

  if (userId === auth.userId) {
    throw new AppError({
      message:
        "You cannot replace your own role assignments",

      statusCode: 409,

      code:
        "SELF_ROLE_REPLACEMENT_NOT_ALLOWED"
    });
  }

  const accountCompanyId =
    nullableId(
      user.company_id
    );

  const isPlatformAdminAccount =
    databaseBoolean(
      user.is_platform_admin
    );

  const normalizedRoles =
    await normalizeRoleAssignments(
      input.roles,
      accountCompanyId,
      isPlatformAdminAccount,
      auth
    );

  try {
    const replaced =
      await replaceUserRolesRecord(
        userId,
        normalizedRoles,
        createActor(auth),
        metadata
      );

    if (!replaced) {
      throw new AppError({
        message:
          "User account was not found",

        statusCode: 404,

        code:
          "USER_NOT_FOUND"
      });
    }

    const updatedUser =
      await findUserById(
        userId
      );

    if (!updatedUser) {
      throw new AppError({
        message:
          "User account was not found",

        statusCode: 404,

        code:
          "USER_NOT_FOUND"
      });
    }

    const roles =
      await findUserRolesByUserId(
        userId
      );

    return mapUser(
      updatedUser,
      roles
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function adminResetUserPassword(
  userId: string,
  input: AdminResetPasswordInput,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<{
  revokedSessionCount: number;
}> {
  const user =
    await findUserById(
      userId
    );

  if (!user) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  assertTargetAccess(
    auth,
    user
  );

  const passwordHash =
    await hashPassword(
      input.newPassword
    );

  const result =
    await adminResetUserPasswordRecord(
      userId,
      passwordHash,
      input.mustChangePassword,
      input.revokeAllSessions,
      createActor(auth),
      metadata
    );

  if (!result.updated) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  return {
    revokedSessionCount:
      result.revokedSessionCount
  };
}

export async function deleteUser(
  userId: string,
  auth: AuthContext,
  metadata: RequestMetadata
): Promise<void> {
  const user =
    await findUserById(
      userId
    );

  if (!user) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }

  assertTargetAccess(
    auth,
    user
  );

  if (userId === auth.userId) {
    throw new AppError({
      message:
        "You cannot delete your own account",

      statusCode: 409,

      code:
        "SELF_USER_DELETE_NOT_ALLOWED"
    });
  }

  if (
    databaseBoolean(
      user.is_platform_admin
    )
  ) {
    const platformAdminCount =
      await countActivePlatformAdmins();

    if (platformAdminCount <= 1) {
      throw new AppError({
        message:
          "The last active Platform Administrator cannot be deleted",

        statusCode: 409,

        code:
          "LAST_PLATFORM_ADMIN_REQUIRED"
      });
    }
  }

  const deleted =
    await softDeleteUserRecord(
      userId,
      createActor(auth),
      metadata
    );

  if (!deleted) {
    throw new AppError({
      message:
        "User account was not found",

      statusCode: 404,

      code:
        "USER_NOT_FOUND"
    });
  }
}

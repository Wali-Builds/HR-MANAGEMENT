import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById
} from "../attendance/attendance.repository.js";

import type {
  AttendanceActor,
  AttendanceEmployeeDatabaseRow,
  RequestMetadata
} from "../attendance/attendance.types.js";

import {
  createLeaveApprovalDelegationRecord,
  createLeaveBlackoutPeriodRecord,
  deactivateLeaveApprovalDelegationRecord,
  deactivateLeaveBlackoutPeriodRecord,
  findApplicableLeaveBlackoutPeriodRecords,
  findLeaveApprovalDelegationRecordById,
  findLeaveBlackoutPeriodRecordById,
  listLeaveApprovalDelegationRecords,
  listLeaveBlackoutPeriodRecords,
  updateLeaveApprovalDelegationRecord,
  updateLeaveBlackoutPeriodRecord
} from "./leave-governance.repository.js";

import type {
  ApplicableLeaveBlackoutQuery,
  CreateLeaveApprovalDelegationInput,
  CreateLeaveBlackoutPeriodInput,
  LeaveApprovalDelegationListQuery,
  LeaveBlackoutPeriodListQuery,
  UpdateLeaveApprovalDelegationInput,
  UpdateLeaveBlackoutPeriodInput
} from "./leave-governance.schema.js";

import type {
  ApplicableLeaveBlackoutResponse,
  CreateLeaveApprovalDelegationRecord,
  CreateLeaveBlackoutPeriodRecord,
  LeaveApprovalDelegationDatabaseRow,
  LeaveApprovalDelegationResponse,
  LeaveBlackoutPeriodDatabaseRow,
  LeaveBlackoutPeriodResponse,
  LeaveGovernancePaginationResponse,
  UpdateLeaveApprovalDelegationRecord,
  UpdateLeaveBlackoutPeriodRecord
} from "./leave-governance.types.js";

/*
 * =========================================================
 * Conversion helpers
 * =========================================================
 */

function databaseBoolean(
  value:
    | number
    | boolean
    | null
    | undefined
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
    | undefined
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

function numericValue(
  value:
    | string
    | number
    | bigint
    | null
    | undefined
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  return Number(value);
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
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(0, 10);
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}

function requiredDateOnly(
  value:
    | Date
    | string
): string {
  const result =
    dateOnly(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATE"
    );
  }

  return result;
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

  let parsed: Date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    parsed =
      new Date(
        `${value
          .slice(0, 19)
          .replace(" ", "T")}Z`
      );
  } else {
    parsed =
      new Date(value);
  }

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

function requiredDateTimeIso(
  value:
    | Date
    | string
): string {
  const result =
    dateTimeIso(value);

  if (!result) {
    throw new Error(
      "INVALID_DATABASE_DATETIME"
    );
  }

  return result;
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): LeaveGovernancePaginationResponse {
  return {
    page,
    pageSize,
    totalRecords,

    totalPages:
      totalRecords === 0
        ? 0
        : Math.ceil(
            totalRecords /
              pageSize
          )
  };
}

/*
 * =========================================================
 * Authentication and authorization
 * =========================================================
 */

function getPermissions(
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
  return (
    auth.isPlatformAdmin ||
    getPermissions(auth).includes(
      permissionCode
    )
  );
}

function requireCompanyId(
  auth: AuthContext
): string {
  if (!auth.companyId) {
    throw new AppError({
      message:
        "A company context is required",

      statusCode: 400,

      code:
        "COMPANY_CONTEXT_REQUIRED"
    });
  }

  return String(
    auth.companyId
  );
}

function createActor(
  auth: AuthContext
): AttendanceActor {
  return {
    userId:
      auth.userId,

    employeeId:
      auth.employeeId ??
      null,

    companyId:
      auth.companyId ??
      null,

    isPlatformAdmin:
      auth.isPlatformAdmin,

    permissions:
      getPermissions(auth)
  };
}

function isOwnEmployee(
  auth: AuthContext,
  employeeId: string
): boolean {
  return (
    auth.employeeId !== null &&
    auth.employeeId !== undefined &&
    String(
      auth.employeeId
    ) === employeeId
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
    String(
      auth.companyId
    ) !== companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's leave-governance records",

      statusCode: 403,

      code:
        "LEAVE_GOVERNANCE_COMPANY_ACCESS_DENIED"
    });
  }
}

function hasDelegationViewAccess(
  auth: AuthContext
): boolean {
  return (
    hasPermission(
      auth,
      "leave.delegation.view"
    ) ||
    hasPermission(
      auth,
      "leave.delegation.manage"
    ) ||
    hasPermission(
      auth,
      "leave.request.approve"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  );
}

function hasDelegationManageAccess(
  auth: AuthContext
): boolean {
  return (
    hasPermission(
      auth,
      "leave.delegation.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  );
}

function assertDelegationViewAccess(
  auth: AuthContext
): void {
  if (
    hasDelegationViewAccess(
      auth
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view leave approval delegations",

    statusCode: 403,

    code:
      "LEAVE_DELEGATION_VIEW_DENIED"
  });
}

function assertDelegationCreateAccess(
  auth: AuthContext,
  delegatorUserId: string
): void {
  if (
    String(
      auth.userId
    ) === delegatorUserId ||
    hasDelegationManageAccess(
      auth
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You cannot create an approval delegation for another user",

    statusCode: 403,

    code:
      "LEAVE_DELEGATION_CREATE_DENIED"
  });
}

function assertDelegationRecordAccess(
  auth: AuthContext,
  record:
    LeaveApprovalDelegationDatabaseRow
): void {
  const userId =
    String(
      auth.userId
    );

  if (
    userId ===
      String(
        record.delegator_user_id
      ) ||
    userId ===
      String(
        record.delegate_user_id
      ) ||
    hasDelegationViewAccess(
      auth
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You cannot access this leave approval delegation",

    statusCode: 403,

    code:
      "LEAVE_DELEGATION_ACCESS_DENIED"
  });
}

function assertDelegationRecordManageAccess(
  auth: AuthContext,
  record:
    LeaveApprovalDelegationDatabaseRow
): void {
  if (
    String(
      auth.userId
    ) ===
      String(
        record.delegator_user_id
      ) ||
    hasDelegationManageAccess(
      auth
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You cannot modify this leave approval delegation",

    statusCode: 403,

    code:
      "LEAVE_DELEGATION_MANAGE_DENIED"
  });
}

function assertBlackoutViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.blackout.view"
    ) ||
    hasPermission(
      auth,
      "leave.blackout.manage"
    ) ||
    hasPermission(
      auth,
      "leave.request.view"
    ) ||
    hasPermission(
      auth,
      "leave.request.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view leave blackout periods",

    statusCode: 403,

    code:
      "LEAVE_BLACKOUT_VIEW_DENIED"
  });
}

function assertBlackoutManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.blackout.manage"
    ) ||
    hasPermission(
      auth,
      "leave.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage leave blackout periods",

    statusCode: 403,

    code:
      "LEAVE_BLACKOUT_MANAGE_DENIED"
  });
}

function assertBlackoutPreviewAccess(
  auth: AuthContext,
  employeeId: string
): void {
  if (
    isOwnEmployee(
      auth,
      employeeId
    )
  ) {
    return;
  }

  assertBlackoutViewAccess(
    auth
  );
}

/*
 * =========================================================
 * Employee helpers
 * =========================================================
 */

async function getEmployeeOrThrow(
  employeeId: string
): Promise<
  AttendanceEmployeeDatabaseRow
> {
  const employee =
    await findAttendanceEmployeeById(
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

function assertEmployeeCompany(
  auth: AuthContext,
  employee:
    AttendanceEmployeeDatabaseRow
): void {
  assertCompanyAccess(
    auth,
    String(
      employee.company_id
    )
  );
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapLeaveApprovalDelegation(
  row:
    LeaveApprovalDelegationDatabaseRow
): LeaveApprovalDelegationResponse {
  return {
    delegationId:
      String(
        row.delegation_id
      ),

    companyId:
      String(
        row.company_id
      ),

    delegatorUserId:
      String(
        row.delegator_user_id
      ),

    delegatorUsername:
      row.delegator_username,

    delegatorEmployeeId:
      nullableId(
        row.delegator_employee_id
      ),

    delegatorEmployeeCode:
      row.delegator_employee_code,

    delegatorEmployeeName:
      row.delegator_employee_name,

    delegateUserId:
      String(
        row.delegate_user_id
      ),

    delegateUsername:
      row.delegate_username,

    delegateEmployeeId:
      nullableId(
        row.delegate_employee_id
      ),

    delegateEmployeeCode:
      row.delegate_employee_code,

    delegateEmployeeName:
      row.delegate_employee_name,

    effectiveFrom:
      requiredDateTimeIso(
        row.effective_from
      ),

    effectiveTo:
      requiredDateTimeIso(
        row.effective_to
      ),

    reason:
      row.reason,

    isActive:
      databaseBoolean(
        row.is_active
      ),

    isEffective:
      databaseBoolean(
        row.is_effective
      ),

    createdByUserId:
      nullableId(
        row.created_by_user_id
      ),

    createdByUsername:
      row.created_by_username,

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

function mapLeaveBlackoutPeriod(
  row:
    LeaveBlackoutPeriodDatabaseRow
): LeaveBlackoutPeriodResponse {
  return {
    blackoutPeriodId:
      String(
        row.blackout_period_id
      ),

    companyId:
      String(
        row.company_id
      ),

    branchId:
      nullableId(
        row.branch_id
      ),

    branchCode:
      row.branch_code,

    branchName:
      row.branch_name,

    departmentId:
      nullableId(
        row.department_id
      ),

    departmentCode:
      row.department_code,

    departmentName:
      row.department_name,

    leaveTypeId:
      nullableId(
        row.leave_type_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    blackoutName:
      row.blackout_name,

    description:
      row.description,

    startDate:
      requiredDateOnly(
        row.start_date
      ),

    endDate:
      requiredDateOnly(
        row.end_date
      ),

    restrictionType:
      row.restriction_type,

    exceptionRequiresApproval:
      databaseBoolean(
        row.exception_requires_approval
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    affectedRequestCount:
      numericValue(
        row.affected_request_count
      ),

    createdAt:
      requiredDateTimeIso(
        row.created_at
      ),

    updatedAt:
      requiredDateTimeIso(
        row.updated_at
      )
  };
}

/*
 * =========================================================
 * Repository error translation
 * =========================================================
 */

function translateRepositoryError(
  error: unknown
): never {
  if (
    error instanceof AppError
  ) {
    throw error;
  }

  const code =
    error instanceof Error
      ? error.message
      : "";

  const mappings:
    Record<
      string,
      {
        message: string;
        statusCode: number;
      }
    > = {
      LEAVE_DELEGATOR_USER_NOT_FOUND: {
        message:
          "The delegator user was not found, is inactive, or belongs to another company",

        statusCode: 404
      },

      LEAVE_DELEGATE_USER_NOT_FOUND: {
        message:
          "The delegate user was not found, is inactive, or belongs to another company",

        statusCode: 404
      },

      LEAVE_DELEGATION_TO_SELF: {
        message:
          "A user cannot delegate leave approvals to themselves",

        statusCode: 422
      },

      INVALID_LEAVE_DELEGATION_DATES: {
        message:
          "The delegation end datetime must be after its start datetime",

        statusCode: 422
      },

      LEAVE_DELEGATION_DATE_OVERLAP: {
        message:
          "The delegator already has an active delegation overlapping this period",

        statusCode: 409
      },

      LEAVE_DELEGATION_DIRECT_CYCLE: {
        message:
          "This delegation would create a direct delegation cycle",

        statusCode: 409
      },

      NO_LEAVE_DELEGATION_UPDATE_FIELDS: {
        message:
          "At least one delegation field is required",

        statusCode: 422
      },

      CREATED_LEAVE_DELEGATION_NOT_FOUND: {
        message:
          "The delegation was created but could not be retrieved",

        statusCode: 500
      },

      UPDATED_LEAVE_DELEGATION_NOT_FOUND: {
        message:
          "The delegation was updated but could not be retrieved",

        statusCode: 500
      },

      DEACTIVATED_LEAVE_DELEGATION_NOT_FOUND: {
        message:
          "The delegation was deactivated but could not be retrieved",

        statusCode: 500
      },

      LEAVE_BLACKOUT_BRANCH_NOT_FOUND: {
        message:
          "The selected branch was not found in the company",

        statusCode: 404
      },

      LEAVE_BLACKOUT_BRANCH_INACTIVE: {
        message:
          "The selected branch is inactive",

        statusCode: 409
      },

      LEAVE_BLACKOUT_DEPARTMENT_NOT_FOUND: {
        message:
          "The selected department was not found in the company",

        statusCode: 404
      },

      LEAVE_BLACKOUT_DEPARTMENT_INACTIVE: {
        message:
          "The selected department is inactive",

        statusCode: 409
      },

      LEAVE_BLACKOUT_LEAVE_TYPE_NOT_FOUND: {
        message:
          "The selected leave type was not found in the company",

        statusCode: 404
      },

      LEAVE_BLACKOUT_LEAVE_TYPE_INACTIVE: {
        message:
          "The selected leave type is inactive",

        statusCode: 409
      },

      LEAVE_BLACKOUT_EMPLOYEE_NOT_FOUND: {
        message:
          "The employee was not found or is inactive",

        statusCode: 404
      },

      INVALID_LEAVE_BLACKOUT_DATES: {
        message:
          "The blackout-period end date cannot be before its start date",

        statusCode: 422
      },

      DUPLICATE_LEAVE_BLACKOUT_PERIOD: {
        message:
          "An active blackout period with the same scope, name, restriction, and overlapping dates already exists",

        statusCode: 409
      },

      NO_LEAVE_BLACKOUT_UPDATE_FIELDS: {
        message:
          "At least one blackout-period field is required",

        statusCode: 422
      },

      CREATED_LEAVE_BLACKOUT_NOT_FOUND: {
        message:
          "The blackout period was created but could not be retrieved",

        statusCode: 500
      },

      UPDATED_LEAVE_BLACKOUT_NOT_FOUND: {
        message:
          "The blackout period was updated but could not be retrieved",

        statusCode: 500
      },

      DEACTIVATED_LEAVE_BLACKOUT_NOT_FOUND: {
        message:
          "The blackout period was deactivated but could not be retrieved",

        statusCode: 500
      }
    };

  const mapping =
    mappings[code];

  if (mapping) {
    throw new AppError({
      message:
        mapping.message,

      statusCode:
        mapping.statusCode,

      code
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
    databaseError.errno ===
      1062
  ) {
    throw new AppError({
      message:
        "A duplicate leave-governance record already exists",

      statusCode: 409,

      code:
        "LEAVE_GOVERNANCE_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno ===
      1452
  ) {
    throw new AppError({
      message:
        "A referenced company, user, employee, branch, department, or leave type was not found",

      statusCode: 409,

      code:
        "LEAVE_GOVERNANCE_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Approval delegations
 * =========================================================
 */

export async function listLeaveApprovalDelegations(
  query:
    LeaveApprovalDelegationListQuery,
  auth: AuthContext
) {
  assertDelegationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveApprovalDelegationRecords(
      companyId,
      {
        ...(query.delegatorUserId !==
        undefined
          ? {
              delegatorUserId:
                query.delegatorUserId
            }
          : {}),

        ...(query.delegateUserId !==
        undefined
          ? {
              delegateUserId:
                query.delegateUserId
            }
          : {}),

        ...(query.isActive !==
        undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        ...(query.effectiveOn !==
        undefined
          ? {
              effectiveOn:
                query.effectiveOn
            }
          : {}),

        includeExpired:
          query.includeExpired,

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    delegations:
      result.records.map(
        mapLeaveApprovalDelegation
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveApprovalDelegation(
  delegationId: string,
  auth: AuthContext
) {
  const companyId =
    requireCompanyId(auth);

  const delegation =
    await findLeaveApprovalDelegationRecordById(
      companyId,
      delegationId
    );

  if (!delegation) {
    throw new AppError({
      message:
        "Leave approval delegation was not found",

      statusCode: 404,

      code:
        "LEAVE_DELEGATION_NOT_FOUND"
    });
  }

  assertDelegationRecordAccess(
    auth,
    delegation
  );

  return mapLeaveApprovalDelegation(
    delegation
  );
}

export async function createLeaveApprovalDelegation(
  input:
    CreateLeaveApprovalDelegationInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertDelegationCreateAccess(
    auth,
    input.delegatorUserId
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateLeaveApprovalDelegationRecord = {
      companyId,

      delegatorUserId:
        input.delegatorUserId,

      delegateUserId:
        input.delegateUserId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo:
        input.effectiveTo,

      reason:
        input.reason ??
        null,

      isActive:
        input.isActive,

      createdByUserId:
        String(
          auth.userId
        )
    };

  try {
    const created =
      await createLeaveApprovalDelegationRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveApprovalDelegation(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeaveApprovalDelegation(
  delegationId: string,
  input:
    UpdateLeaveApprovalDelegationInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveApprovalDelegationRecordById(
      companyId,
      delegationId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave approval delegation was not found",

      statusCode: 404,

      code:
        "LEAVE_DELEGATION_NOT_FOUND"
    });
  }

  assertDelegationRecordManageAccess(
    auth,
    existing
  );

  if (
    input.delegatorUserId !==
      undefined &&
    input.delegatorUserId !==
      String(
        existing.delegator_user_id
      ) &&
    !hasDelegationManageAccess(
      auth
    )
  ) {
    throw new AppError({
      message:
        "Only a leave administrator can change the delegation owner",

      statusCode: 403,

      code:
        "LEAVE_DELEGATION_OWNER_CHANGE_DENIED"
    });
  }

  const record:
    UpdateLeaveApprovalDelegationRecord = {
      ...(input.delegatorUserId !==
      undefined
        ? {
            delegatorUserId:
              input.delegatorUserId
          }
        : {}),

      ...(input.delegateUserId !==
      undefined
        ? {
            delegateUserId:
              input.delegateUserId
          }
        : {}),

      ...(input.effectiveFrom !==
      undefined
        ? {
            effectiveFrom:
              input.effectiveFrom
          }
        : {}),

      ...(input.effectiveTo !==
      undefined
        ? {
            effectiveTo:
              input.effectiveTo
          }
        : {}),

      ...(input.reason !==
      undefined
        ? {
            reason:
              input.reason
          }
        : {}),

      ...(input.isActive !==
      undefined
        ? {
            isActive:
              input.isActive
          }
        : {})
    };

  try {
    const updated =
      await updateLeaveApprovalDelegationRecord(
        companyId,
        delegationId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave approval delegation was not found",

        statusCode: 404,

        code:
          "LEAVE_DELEGATION_NOT_FOUND"
      });
    }

    return mapLeaveApprovalDelegation(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deactivateLeaveApprovalDelegation(
  delegationId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeaveApprovalDelegationRecordById(
      companyId,
      delegationId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave approval delegation was not found",

      statusCode: 404,

      code:
        "LEAVE_DELEGATION_NOT_FOUND"
    });
  }

  assertDelegationRecordManageAccess(
    auth,
    existing
  );

  try {
    const deactivated =
      await deactivateLeaveApprovalDelegationRecord(
        companyId,
        delegationId,
        createActor(auth),
        metadata
      );

    if (!deactivated) {
      throw new AppError({
        message:
          "Leave approval delegation was not found",

        statusCode: 404,

        code:
          "LEAVE_DELEGATION_NOT_FOUND"
      });
    }

    return mapLeaveApprovalDelegation(
      deactivated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Blackout periods
 * =========================================================
 */

export async function listLeaveBlackoutPeriods(
  query:
    LeaveBlackoutPeriodListQuery,
  auth: AuthContext
) {
  assertBlackoutViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveBlackoutPeriodRecords(
      companyId,
      {
        ...(query.branchId !==
        undefined
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

        ...(query.leaveTypeId !==
        undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.restrictionType !==
        undefined
          ? {
              restrictionType:
                query.restrictionType
            }
          : {}),

        ...(query.isActive !==
        undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        ...(query.overlappingDateFrom !==
        undefined
          ? {
              overlappingDateFrom:
                query.overlappingDateFrom
            }
          : {}),

        ...(query.overlappingDateTo !==
        undefined
          ? {
              overlappingDateTo:
                query.overlappingDateTo
            }
          : {}),

        ...(query.search !==
        undefined
          ? {
              search:
                query.search
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    blackoutPeriods:
      result.records.map(
        mapLeaveBlackoutPeriod
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveBlackoutPeriod(
  blackoutPeriodId: string,
  auth: AuthContext
) {
  assertBlackoutViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const blackoutPeriod =
    await findLeaveBlackoutPeriodRecordById(
      companyId,
      blackoutPeriodId
    );

  if (!blackoutPeriod) {
    throw new AppError({
      message:
        "Leave blackout period was not found",

      statusCode: 404,

      code:
        "LEAVE_BLACKOUT_NOT_FOUND"
    });
  }

  return mapLeaveBlackoutPeriod(
    blackoutPeriod
  );
}

export async function createLeaveBlackoutPeriod(
  input:
    CreateLeaveBlackoutPeriodInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertBlackoutManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateLeaveBlackoutPeriodRecord = {
      companyId,

      branchId:
        input.branchId ??
        null,

      departmentId:
        input.departmentId ??
        null,

      leaveTypeId:
        input.leaveTypeId ??
        null,

      blackoutName:
        input.blackoutName,

      description:
        input.description ??
        null,

      startDate:
        input.startDate,

      endDate:
        input.endDate,

      restrictionType:
        input.restrictionType,

      exceptionRequiresApproval:
        input.exceptionRequiresApproval,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createLeaveBlackoutPeriodRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveBlackoutPeriod(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeaveBlackoutPeriod(
  blackoutPeriodId: string,
  input:
    UpdateLeaveBlackoutPeriodInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertBlackoutManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    UpdateLeaveBlackoutPeriodRecord = {
      ...(input.branchId !==
      undefined
        ? {
            branchId:
              input.branchId
          }
        : {}),

      ...(input.departmentId !==
      undefined
        ? {
            departmentId:
              input.departmentId
          }
        : {}),

      ...(input.leaveTypeId !==
      undefined
        ? {
            leaveTypeId:
              input.leaveTypeId
          }
        : {}),

      ...(input.blackoutName !==
      undefined
        ? {
            blackoutName:
              input.blackoutName
          }
        : {}),

      ...(input.description !==
      undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.startDate !==
      undefined
        ? {
            startDate:
              input.startDate
          }
        : {}),

      ...(input.endDate !==
      undefined
        ? {
            endDate:
              input.endDate
          }
        : {}),

      ...(input.restrictionType !==
      undefined
        ? {
            restrictionType:
              input.restrictionType
          }
        : {}),

      ...(input.exceptionRequiresApproval !==
      undefined
        ? {
            exceptionRequiresApproval:
              input.exceptionRequiresApproval
          }
        : {}),

      ...(input.isActive !==
      undefined
        ? {
            isActive:
              input.isActive
          }
        : {})
    };

  try {
    const updated =
      await updateLeaveBlackoutPeriodRecord(
        companyId,
        blackoutPeriodId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave blackout period was not found",

        statusCode: 404,

        code:
          "LEAVE_BLACKOUT_NOT_FOUND"
      });
    }

    return mapLeaveBlackoutPeriod(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deactivateLeaveBlackoutPeriod(
  blackoutPeriodId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertBlackoutManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const deactivated =
      await deactivateLeaveBlackoutPeriodRecord(
        companyId,
        blackoutPeriodId,
        createActor(auth),
        metadata
      );

    if (!deactivated) {
      throw new AppError({
        message:
          "Leave blackout period was not found",

        statusCode: 404,

        code:
          "LEAVE_BLACKOUT_NOT_FOUND"
      });
    }

    return mapLeaveBlackoutPeriod(
      deactivated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Applicable blackout preview
 * =========================================================
 */

export async function previewApplicableLeaveBlackouts(
  query:
    ApplicableLeaveBlackoutQuery,
  auth: AuthContext
): Promise<
  ApplicableLeaveBlackoutResponse
> {
  const employee =
    await getEmployeeOrThrow(
      query.employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertBlackoutPreviewAccess(
    auth,
    query.employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  try {
    const matches =
      await findApplicableLeaveBlackoutPeriodRecords(
        companyId,
        query.employeeId,
        query.leaveTypeId,
        query.startDate,
        query.endDate
      );

    const mappedMatches =
      matches.map(
        mapLeaveBlackoutPeriod
      );

    return {
      employeeId:
        query.employeeId,

      leaveTypeId:
        query.leaveTypeId,

      requestedStartDate:
        query.startDate,

      requestedEndDate:
        query.endDate,

      hasBlockingBlackout:
        mappedMatches.some(
          (
            match
          ) =>
            match.restrictionType ===
            "BLOCK"
        ),

      hasWarningBlackout:
        mappedMatches.some(
          (
            match
          ) =>
            match.restrictionType ===
            "WARNING"
        ),

      matches:
        mappedMatches
    };
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}
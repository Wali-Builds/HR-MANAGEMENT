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
  createEmployeeLeavePolicyAssignmentRecord,
  createLeavePolicyRecord,
  createLeavePolicyRuleRecord,
  createLeaveTypeRecord,
  deleteEmployeeLeavePolicyAssignmentRecord,
  deleteLeavePolicyRuleRecord,
  findDefaultLeavePolicyRecord,
  findCompanyTimezone,
  findEffectiveEmployeeLeavePolicyAssignmentRecord,
  findEmployeeLeavePolicyAssignmentRecordById,
  findLeavePolicyRecordById,
  findLeavePolicyRuleRecordById,
  findLeaveTypeRecordById,
  listEffectiveLeavePolicyRuleRecords,
  listEmployeeLeavePolicyAssignmentRecords,
  listLeavePolicyRecords,
  listLeavePolicyRuleRecords,
  listLeaveTypeRecords,
  softDeleteLeavePolicyRecord,
  softDeleteLeaveTypeRecord,
  updateEmployeeLeavePolicyAssignmentRecord,
  updateLeavePolicyRecord,
  updateLeavePolicyRuleRecord,
  updateLeaveTypeRecord
} from "./leave-policy.repository.js";

import type {
  CreateEmployeeLeavePolicyAssignmentInput,
  CreateLeavePolicyInput,
  CreateLeavePolicyRuleInput,
  CreateLeaveTypeInput,
  EffectiveEmployeeLeavePolicyQuery,
  EmployeeLeavePolicyAssignmentListQuery,
  LeavePolicyListQuery,
  LeavePolicyRuleListQuery,
  LeaveTypeListQuery,
  UpdateEmployeeLeavePolicyAssignmentInput,
  UpdateLeavePolicyInput,
  UpdateLeavePolicyRuleInput,
  UpdateLeaveTypeInput
} from "./leave-policy.schema.js";

import type {
  CreateEmployeeLeavePolicyAssignmentRecord,
  CreateLeavePolicyRecord,
  CreateLeavePolicyRuleRecord,
  CreateLeaveTypeRecord,
  EffectiveEmployeeLeavePolicyResponse,
  EmployeeLeavePolicyAssignmentDatabaseRow,
  EmployeeLeavePolicyAssignmentResponse,
  LeavePaginationResponse,
  LeavePolicyDatabaseRow,
  LeavePolicyResponse,
  LeavePolicyRuleDatabaseRow,
  LeavePolicyRuleResponse,
  LeaveTypeDatabaseRow,
  LeaveTypeResponse,
  UpdateEmployeeLeavePolicyAssignmentRecord,
  UpdateLeavePolicyRecord,
  UpdateLeavePolicyRuleRecord,
  UpdateLeaveTypeRecord
} from "./leave-policy.types.js";

/*
 * =========================================================
 * Conversion helpers
 * =========================================================
 */

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

function nullableNumber(
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
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.slice(0, 10);
  }

  // edited by wali: Keep MariaDB DATE calendar fields intact instead of shifting them through UTC.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate
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

  let parsedDate: Date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(
      value
    )
  ) {
    parsedDate =
      new Date(
        `${value
          .slice(0, 19)
          .replace(" ", "T")}Z`
      );
  } else {
    parsedDate =
      new Date(value);
  }

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return parsedDate.toISOString();
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

// edited by wali: Calculate a business date in the company's timezone for policy effectiveness.
function currentDateOnly(timezone: string | null): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): LeavePaginationResponse {
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
 * Authentication helpers
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
  // edited by wali: Let linked Company Admin role or permission accounts manage tenant leave-policy configuration without employee-wide access.
  const isTenantCompanyAdmin = Boolean(
    auth.companyId &&
    (auth.roleCodes.some(
      (roleCode) => roleCode.trim().toUpperCase() === "COMPANY_ADMIN"
    ) || getPermissions(auth).some(
      (permission) => permission.trim().toUpperCase() === "COMPANY_ADMIN"
    ))
  );
  const isLeavePolicyPermission = [
    "leave.policy.view",
    "leave.policy.manage",
    "leave.policy.assign"
  ].includes(permissionCode);

  return (
    auth.isPlatformAdmin ||
    getPermissions(auth).includes(permissionCode) ||
    (isTenantCompanyAdmin && isLeavePolicyPermission)
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
        "You cannot access another company's leave configuration",

      statusCode: 403,

      code:
        "LEAVE_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertLeaveConfigurationViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.policy.view"
    ) ||
    hasPermission(
      auth,
      "leave.policy.manage"
    ) ||
    hasPermission(
      auth,
      "leave.policy.assign"
    ) ||
    hasPermission(
      auth,
      "leave.view"
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
      "You do not have permission to view leave configuration",

    statusCode: 403,

    code:
      "LEAVE_CONFIGURATION_VIEW_DENIED"
  });
}

function assertLeaveConfigurationManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.policy.manage"
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
      "You do not have permission to manage leave configuration",

    statusCode: 403,

    code:
      "LEAVE_CONFIGURATION_MANAGE_DENIED"
  });
}

function assertLeavePolicyAssignmentViewAccess(
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

  if (
    hasPermission(
      auth,
      "leave.policy.view"
    ) ||
    hasPermission(
      auth,
      "leave.policy.assign"
    ) ||
    hasPermission(
      auth,
      "leave.policy.manage"
    ) ||
    hasPermission(
      auth,
      "leave.view"
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
      "You do not have permission to view this employee's leave-policy assignments",

    statusCode: 403,

    code:
      "LEAVE_POLICY_ASSIGNMENT_VIEW_DENIED"
  });
}

function assertLeavePolicyAssignmentManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "leave.policy.assign"
    ) ||
    hasPermission(
      auth,
      "leave.policy.manage"
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
      "You do not have permission to manage employee leave-policy assignments",

    statusCode: 403,

    code:
      "LEAVE_POLICY_ASSIGNMENT_MANAGE_DENIED"
  });
}

/*
 * =========================================================
 * Employee helpers
 * =========================================================
 */

async function getEmployeeOrThrow(
  employeeId: string
): Promise<AttendanceEmployeeDatabaseRow> {
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

function assertEmployeeActive(
  employee:
    AttendanceEmployeeDatabaseRow
): void {
  if (
    !databaseBoolean(
      employee.is_active
    )
  ) {
    throw new AppError({
      message:
        "Employee is inactive",

      statusCode: 409,

      code:
        "EMPLOYEE_INACTIVE"
    });
  }
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapLeaveType(
  row:
    LeaveTypeDatabaseRow
): LeaveTypeResponse {
  return {
    leaveTypeId:
      String(
        row.leave_type_id
      ),

    companyId:
      String(
        row.company_id
      ),

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    description:
      row.description,

    unitType:
      row.unit_type,

    isPaid:
      databaseBoolean(
        row.is_paid
      ),

    requiresApproval:
      databaseBoolean(
        row.requires_approval
      ),

    requiresAttachment:
      databaseBoolean(
        row.requires_attachment
      ),

    displayColor:
      row.display_color,

    sortOrder:
      Number(
        row.sort_order
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    policyRuleCount:
      Number(
        row.policy_rule_count
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

function mapLeavePolicy(
  row:
    LeavePolicyDatabaseRow
): LeavePolicyResponse {
  return {
    leavePolicyId:
      String(
        row.leave_policy_id
      ),

    companyId:
      String(
        row.company_id
      ),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    description:
      row.description,

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    isDefault:
      databaseBoolean(
        row.is_default
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    ruleCount:
      Number(
        row.rule_count
      ),

    assignmentCount:
      Number(
        row.assignment_count
      ),

    currentAssignmentCount:
      Number(
        row.current_assignment_count
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

function mapLeavePolicyRule(
  row:
    LeavePolicyRuleDatabaseRow
): LeavePolicyRuleResponse {
  return {
    leavePolicyRuleId:
      String(
        row.leave_policy_rule_id
      ),

    leavePolicyId:
      String(
        row.leave_policy_id
      ),

    leaveTypeId:
      String(
        row.leave_type_id
      ),

    companyId:
      String(
        row.company_id
      ),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    leaveTypeCode:
      row.leave_type_code,

    leaveTypeName:
      row.leave_type_name,

    unitType:
      row.unit_type,

    leaveTypeIsPaid:
      databaseBoolean(
        row.leave_type_is_paid
      ),

    annualEntitlementUnits:
      Number(
        row.annual_entitlement_units
      ),

    accrualMethod:
      row.accrual_method,

    accrualUnitsPerPeriod:
      Number(
        row.accrual_units_per_period
      ),

    accrualStartAfterDays:
      Number(
        row.accrual_start_after_days
      ),

    prorateEntitlement:
      databaseBoolean(
        row.prorate_entitlement
      ),

    allowDuringProbation:
      databaseBoolean(
        row.allow_during_probation
      ),

    eligibleGender:
      row.eligible_gender,

    minimumRequestUnits:
      Number(
        row.minimum_request_units
      ),

    maximumRequestUnits:
      nullableNumber(
        row.maximum_request_units
      ),

    minimumNoticeDays:
      Number(
        row.minimum_notice_days
      ),

    maximumAdvanceDays:
      nullableNumber(
        row.maximum_advance_days
      ),

    maximumBackdateDays:
      Number(
        row.maximum_backdate_days
      ),

    allowHalfDay:
      databaseBoolean(
        row.allow_half_day
      ),

    allowHourlyLeave:
      databaseBoolean(
        row.allow_hourly_leave
      ),

    includeWeekends:
      databaseBoolean(
        row.include_weekends
      ),

    includeHolidays:
      databaseBoolean(
        row.include_holidays
      ),

    sandwichRuleEnabled:
      databaseBoolean(
        row.sandwich_rule_enabled
      ),

    carryForwardEnabled:
      databaseBoolean(
        row.carry_forward_enabled
      ),

    maximumCarryForwardUnits:
      nullableNumber(
        row.maximum_carry_forward_units
      ),

    carryForwardExpiryMonths:
      nullableNumber(
        row.carry_forward_expiry_months
      ),

    maximumBalanceUnits:
      nullableNumber(
        row.maximum_balance_units
      ),

    allowNegativeBalance:
      databaseBoolean(
        row.allow_negative_balance
      ),

    negativeBalanceLimit:
      Number(
        row.negative_balance_limit
      ),

    attachmentRequiredAfterUnits:
      nullableNumber(
        row.attachment_required_after_units
      ),

    encashmentAllowed:
      databaseBoolean(
        row.encashment_allowed
      ),

    maximumEncashmentUnits:
      nullableNumber(
        row.maximum_encashment_units
      ),

    approvalLevelsRequired:
      Number(
        row.approval_levels_required
      ),

    isActive:
      databaseBoolean(
        row.is_active
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

function mapEmployeeLeavePolicyAssignment(
  row:
    EmployeeLeavePolicyAssignmentDatabaseRow
): EmployeeLeavePolicyAssignmentResponse {
  return {
    assignmentId:
      String(
        row.assignment_id
      ),

    companyId:
      String(
        row.company_id
      ),

    employeeId:
      String(
        row.employee_id
      ),

    employeeCode:
      row.employee_code,

    employeeName:
      row.employee_name,

    leavePolicyId:
      String(
        row.leave_policy_id
      ),

    policyCode:
      row.policy_code,

    policyName:
      row.policy_name,

    policyIsDefault:
      databaseBoolean(
        row.policy_is_default
      ),

    policyIsActive:
      databaseBoolean(
        row.policy_is_active
      ),

    effectiveFrom:
      requiredDateOnly(
        row.effective_from
      ),

    effectiveTo:
      dateOnly(
        row.effective_to
      ),

    isCurrent:
      databaseBoolean(
        row.is_current
      ),

    assignedByUserId:
      nullableId(
        row.assigned_by_user_id
      ),

    remarks:
      row.remarks,

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
 * Validation helpers
 * =========================================================
 */

function validateDateRange(
  effectiveFrom: string,
  effectiveTo: string | null,
  errorCode: string
): void {
  if (
    effectiveTo !== null &&
    effectiveTo <
      effectiveFrom
  ) {
    throw new AppError({
      message:
        "Effective-to cannot be before effective-from",

      statusCode: 422,

      code:
        errorCode
    });
  }
}

interface LeaveRuleConfiguration {
  minimumRequestUnits: number;
  maximumRequestUnits:
    | number
    | null;

  carryForwardEnabled: boolean;
  maximumCarryForwardUnits:
    | number
    | null;

  carryForwardExpiryMonths:
    | number
    | null;

  maximumBalanceUnits:
    | number
    | null;

  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;

  encashmentAllowed: boolean;
  maximumEncashmentUnits:
    | number
    | null;

  attachmentRequiredAfterUnits:
    | number
    | null;
}

function validateLeaveRuleConfiguration(
  input:
    LeaveRuleConfiguration
): void {
  if (
    input.maximumRequestUnits !==
      null &&
    input.maximumRequestUnits <
      input.minimumRequestUnits
  ) {
    throw new AppError({
      message:
        "Maximum request units cannot be less than minimum request units",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_REQUEST_LIMITS"
    });
  }

  if (
    !input.carryForwardEnabled &&
    (
      input.maximumCarryForwardUnits !==
        null ||
      input.carryForwardExpiryMonths !==
        null
    )
  ) {
    throw new AppError({
      message:
        "Carry-forward limits must be null when carry forward is disabled",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_CARRY_FORWARD_CONFIGURATION"
    });
  }

  if (
    input.maximumCarryForwardUnits !==
      null &&
    input.maximumBalanceUnits !==
      null &&
    input.maximumCarryForwardUnits >
      input.maximumBalanceUnits
  ) {
    throw new AppError({
      message:
        "Maximum carry-forward units cannot exceed maximum balance units",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_CARRY_FORWARD_LIMIT"
    });
  }

  if (
    !input.allowNegativeBalance &&
    input.negativeBalanceLimit !== 0
  ) {
    throw new AppError({
      message:
        "Negative balance limit must be zero when negative balance is disabled",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_NEGATIVE_BALANCE"
    });
  }

  if (
    !input.encashmentAllowed &&
    input.maximumEncashmentUnits !==
      null
  ) {
    throw new AppError({
      message:
        "Maximum encashment units must be null when encashment is disabled",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_ENCASHMENT_CONFIGURATION"
    });
  }

  if (
    input.maximumEncashmentUnits !==
      null &&
    input.maximumBalanceUnits !==
      null &&
    input.maximumEncashmentUnits >
      input.maximumBalanceUnits
  ) {
    throw new AppError({
      message:
        "Maximum encashment units cannot exceed maximum balance units",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_ENCASHMENT_LIMIT"
    });
  }

  if (
    input.attachmentRequiredAfterUnits !==
      null &&
    input.maximumRequestUnits !==
      null &&
    input.attachmentRequiredAfterUnits >
      input.maximumRequestUnits
  ) {
    throw new AppError({
      message:
        "Attachment threshold cannot exceed maximum request units",

      statusCode: 422,

      code:
        "INVALID_LEAVE_RULE_ATTACHMENT_THRESHOLD"
    });
  }
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

  const errors:
    Record<
      string,
      {
        message: string;
        statusCode: number;
      }
    > = {
      LEAVE_TYPE_NOT_FOUND: {
        message:
          "Leave type was not found",
        statusCode: 404
      },

      LEAVE_POLICY_NOT_FOUND: {
        message:
          "Leave policy was not found",
        statusCode: 404
      },

      LEAVE_POLICY_RULE_NOT_FOUND: {
        message:
          "Leave-policy rule was not found",
        statusCode: 404
      },

      LEAVE_POLICY_ASSIGNMENT_NOT_FOUND: {
        message:
          "Employee leave-policy assignment was not found",
        statusCode: 404
      },

      EMPLOYEE_NOT_FOUND: {
        message:
          "Employee was not found",
        statusCode: 404
      },

      EMPLOYEE_INACTIVE: {
        message:
          "Employee is inactive",
        statusCode: 409
      },

      LEAVE_POLICY_INACTIVE: {
        message:
          "The selected leave policy is inactive",
        statusCode: 409
      },

      DUPLICATE_LEAVE_POLICY_RULE: {
        message:
          "This leave type already has a rule in the selected leave policy",
        statusCode: 409
      },

      LEAVE_POLICY_HAS_CURRENT_ASSIGNMENTS: {
        message:
          "The leave policy cannot be deleted while it has current employee assignments",
        statusCode: 409
      },

      LEAVE_POLICY_ASSIGNMENT_DATE_OVERLAP: {
        message:
          "The leave-policy assignment overlaps another assignment for this employee",
        statusCode: 409
      },

      ASSIGNMENT_BEFORE_LEAVE_POLICY_START: {
        message:
          "The assignment cannot start before the leave policy becomes effective",
        statusCode: 422
      },

      ASSIGNMENT_AFTER_LEAVE_POLICY_END: {
        message:
          "The assignment cannot continue beyond the leave policy end date",
        statusCode: 422
      },

      INACTIVE_DEFAULT_LEAVE_POLICY: {
        message:
          "An inactive leave policy cannot be the default policy",
        statusCode: 422
      },

      INVALID_LEAVE_POLICY_DATE: {
        message:
          "The leave-policy effective date is invalid",
        statusCode: 422
      },

      INVALID_LEAVE_POLICY_ASSIGNMENT_DATE: {
        message:
          "The leave-policy assignment date is invalid",
        statusCode: 422
      },

      INVALID_LEAVE_POLICY_ASSIGNMENT_DATES: {
        message:
          "Effective-to cannot be before effective-from",
        statusCode: 422
      },

      NO_LEAVE_TYPE_UPDATE_FIELDS: {
        message:
          "At least one leave-type field is required",
        statusCode: 422
      },

      NO_LEAVE_POLICY_UPDATE_FIELDS: {
        message:
          "At least one leave-policy field is required",
        statusCode: 422
      },

      NO_LEAVE_POLICY_RULE_UPDATE_FIELDS: {
        message:
          "At least one leave-policy-rule field is required",
        statusCode: 422
      },

      NO_LEAVE_POLICY_ASSIGNMENT_UPDATE_FIELDS: {
        message:
          "At least one leave-policy-assignment field is required",
        statusCode: 422
      },

      CREATED_LEAVE_TYPE_NOT_FOUND: {
        message:
          "The leave type was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_LEAVE_TYPE_NOT_FOUND: {
        message:
          "The leave type was updated but could not be retrieved",
        statusCode: 500
      },

      DELETED_LEAVE_TYPE_NOT_FOUND: {
        message:
          "The leave type was deleted but could not be retrieved",
        statusCode: 500
      },

      CREATED_LEAVE_POLICY_NOT_FOUND: {
        message:
          "The leave policy was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_LEAVE_POLICY_NOT_FOUND: {
        message:
          "The leave policy was updated but could not be retrieved",
        statusCode: 500
      },

      DELETED_LEAVE_POLICY_NOT_FOUND: {
        message:
          "The leave policy was deleted but could not be retrieved",
        statusCode: 500
      },

      CREATED_LEAVE_POLICY_RULE_NOT_FOUND: {
        message:
          "The leave-policy rule was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_LEAVE_POLICY_RULE_NOT_FOUND: {
        message:
          "The leave-policy rule was updated but could not be retrieved",
        statusCode: 500
      },

      CREATED_LEAVE_POLICY_ASSIGNMENT_NOT_FOUND: {
        message:
          "The assignment was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_LEAVE_POLICY_ASSIGNMENT_NOT_FOUND: {
        message:
          "The assignment was updated but could not be retrieved",
        statusCode: 500
      }
    };

  const mapped =
    errors[code];

  if (mapped) {
    throw new AppError({
      message:
        mapped.message,

      statusCode:
        mapped.statusCode,

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
    databaseError.errno === 1062
  ) {
    throw new AppError({
      message:
        "A leave record with the same unique values already exists",

      statusCode: 409,

      code:
        "LEAVE_CONFIGURATION_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced leave, employee, or user record was not found",

      statusCode: 409,

      code:
        "LEAVE_CONFIGURATION_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Leave types
 * =========================================================
 */

export async function listLeaveTypes(
  query:
    LeaveTypeListQuery,
  auth:
    AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeaveTypeRecords(
      companyId,
      {
        ...(query.unitType !== undefined
          ? {
              unitType:
                query.unitType
            }
          : {}),

        ...(query.isPaid !== undefined
          ? {
              isPaid:
                query.isPaid
            }
          : {}),

        ...(query.requiresApproval !==
        undefined
          ? {
              requiresApproval:
                query.requiresApproval
            }
          : {}),

        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        includeInactive:
          query.includeInactive,

        ...(query.search !== undefined
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
    leaveTypes:
      result.records.map(
        mapLeaveType
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeaveType(
  leaveTypeId: string,
  auth: AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const leaveType =
    await findLeaveTypeRecordById(
      companyId,
      leaveTypeId
    );

  if (!leaveType) {
    throw new AppError({
      message:
        "Leave type was not found",

      statusCode: 404,

      code:
        "LEAVE_TYPE_NOT_FOUND"
    });
  }

  return mapLeaveType(
    leaveType
  );
}

export async function createLeaveType(
  input:
    CreateLeaveTypeInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateLeaveTypeRecord = {
      companyId,

      leaveTypeCode:
        input.leaveTypeCode,

      leaveTypeName:
        input.leaveTypeName,

      description:
        input.description ??
        null,

      unitType:
        input.unitType,

      isPaid:
        input.isPaid,

      requiresApproval:
        input.requiresApproval,

      requiresAttachment:
        input.requiresAttachment,

      displayColor:
        input.displayColor ??
        null,

      sortOrder:
        input.sortOrder,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createLeaveTypeRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeaveType(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeaveType(
  leaveTypeId: string,
  input:
    UpdateLeaveTypeInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const record:
    UpdateLeaveTypeRecord = {
      ...(input.leaveTypeCode !== undefined
        ? {
            leaveTypeCode:
              input.leaveTypeCode
          }
        : {}),

      ...(input.leaveTypeName !== undefined
        ? {
            leaveTypeName:
              input.leaveTypeName
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.unitType !== undefined
        ? {
            unitType:
              input.unitType
          }
        : {}),

      ...(input.isPaid !== undefined
        ? {
            isPaid:
              input.isPaid
          }
        : {}),

      ...(input.requiresApproval !==
      undefined
        ? {
            requiresApproval:
              input.requiresApproval
          }
        : {}),

      ...(input.requiresAttachment !==
      undefined
        ? {
            requiresAttachment:
              input.requiresAttachment
          }
        : {}),

      ...(input.displayColor !== undefined
        ? {
            displayColor:
              input.displayColor
          }
        : {}),

      ...(input.sortOrder !== undefined
        ? {
            sortOrder:
              input.sortOrder
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
      await updateLeaveTypeRecord(
        companyId,
        leaveTypeId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave type was not found",

        statusCode: 404,

        code:
          "LEAVE_TYPE_NOT_FOUND"
      });
    }

    return mapLeaveType(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteLeaveType(
  leaveTypeId: string,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await softDeleteLeaveTypeRecord(
        companyId,
        leaveTypeId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Leave type was not found",

        statusCode: 404,

        code:
          "LEAVE_TYPE_NOT_FOUND"
      });
    }

    return mapLeaveType(
      deleted
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Leave policies
 * =========================================================
 */

export async function listLeavePolicies(
  query:
    LeavePolicyListQuery,
  auth:
    AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const result =
    await listLeavePolicyRecords(
      companyId,
      {
        ...(query.effectiveOn !== undefined
          ? {
              effectiveOn:
                query.effectiveOn
            }
          : {}),

        ...(query.isDefault !== undefined
          ? {
              isDefault:
                query.isDefault
            }
          : {}),

        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        includeInactive:
          query.includeInactive,

        ...(query.search !== undefined
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

  const leavePolicies =
    await Promise.all(
      result.records.map(
        async (
          row
        ) => {
          const policy =
            mapLeavePolicy(row);

          if (
            !query.includeRules
          ) {
            return policy;
          }

          const rules =
            await listEffectiveLeavePolicyRuleRecords(
              companyId,
              policy.leavePolicyId,
              query.includeInactive
            );

          return {
            ...policy,

            rules:
              rules.map(
                mapLeavePolicyRule
              )
          };
        }
      )
    );

  return {
    leavePolicies,

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeavePolicy(
  leavePolicyId: string,
  auth:
    AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const policy =
    await findLeavePolicyRecordById(
      companyId,
      leavePolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  return mapLeavePolicy(
    policy
  );
}

export async function createLeavePolicy(
  input:
    CreateLeavePolicyInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const effectiveTo =
    input.effectiveTo ??
    null;

  validateDateRange(
    input.effectiveFrom,
    effectiveTo,
    "INVALID_LEAVE_POLICY_DATES"
  );

  if (
    input.isDefault &&
    !input.isActive
  ) {
    throw new AppError({
      message:
        "An inactive leave policy cannot be the default policy",

      statusCode: 422,

      code:
        "INACTIVE_DEFAULT_LEAVE_POLICY"
    });
  }

  const record:
    CreateLeavePolicyRecord = {
      companyId,

      policyCode:
        input.policyCode,

      policyName:
        input.policyName,

      description:
        input.description ??
        null,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo,

      isDefault:
        input.isDefault,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createLeavePolicyRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapLeavePolicy(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeavePolicy(
  leavePolicyId: string,
  input:
    UpdateLeavePolicyInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeavePolicyRecordById(
      companyId,
      leavePolicyId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  const finalEffectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  const finalEffectiveTo =
    input.effectiveTo !==
    undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  const finalIsDefault =
    input.isDefault ??
    databaseBoolean(
      existing.is_default
    );

  const finalIsActive =
    input.isActive ??
    databaseBoolean(
      existing.is_active
    );

  validateDateRange(
    finalEffectiveFrom,
    finalEffectiveTo,
    "INVALID_LEAVE_POLICY_DATES"
  );

  if (
    finalIsDefault &&
    !finalIsActive
  ) {
    throw new AppError({
      message:
        "An inactive leave policy cannot be the default policy",

      statusCode: 422,

      code:
        "INACTIVE_DEFAULT_LEAVE_POLICY"
    });
  }

  const record:
    UpdateLeavePolicyRecord = {
      ...(input.policyCode !== undefined
        ? {
            policyCode:
              input.policyCode
          }
        : {}),

      ...(input.policyName !== undefined
        ? {
            policyName:
              input.policyName
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.effectiveFrom !== undefined
        ? {
            effectiveFrom:
              input.effectiveFrom
          }
        : {}),

      ...(input.effectiveTo !== undefined
        ? {
            effectiveTo:
              input.effectiveTo
          }
        : {}),

      ...(input.isDefault !== undefined
        ? {
            isDefault:
              input.isDefault
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
      await updateLeavePolicyRecord(
        companyId,
        leavePolicyId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave policy was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_NOT_FOUND"
      });
    }

    return mapLeavePolicy(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteLeavePolicy(
  leavePolicyId: string,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await softDeleteLeavePolicyRecord(
        companyId,
        leavePolicyId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Leave policy was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_NOT_FOUND"
      });
    }

    return mapLeavePolicy(
      deleted
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Leave-policy rules
 * =========================================================
 */

export async function listLeavePolicyRules(
  leavePolicyId: string,
  query:
    LeavePolicyRuleListQuery,
  auth:
    AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const policy =
    await findLeavePolicyRecordById(
      companyId,
      leavePolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  const result =
    await listLeavePolicyRuleRecords(
      companyId,
      leavePolicyId,
      {
        ...(query.leaveTypeId !== undefined
          ? {
              leaveTypeId:
                query.leaveTypeId
            }
          : {}),

        ...(query.accrualMethod !== undefined
          ? {
              accrualMethod:
                query.accrualMethod
            }
          : {}),

        ...(query.eligibleGender !== undefined
          ? {
              eligibleGender:
                query.eligibleGender
            }
          : {}),

        ...(query.isActive !== undefined
          ? {
              isActive:
                query.isActive
            }
          : {}),

        includeInactive:
          query.includeInactive,

        ...(query.search !== undefined
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
    leavePolicy:
      mapLeavePolicy(
        policy
      ),

    rules:
      result.records.map(
        mapLeavePolicyRule
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getLeavePolicyRule(
  leavePolicyId: string,
  leavePolicyRuleId: string,
  auth:
    AuthContext
) {
  assertLeaveConfigurationViewAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const rule =
    await findLeavePolicyRuleRecordById(
      companyId,
      leavePolicyId,
      leavePolicyRuleId
    );

  if (!rule) {
    throw new AppError({
      message:
        "Leave-policy rule was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_RULE_NOT_FOUND"
    });
  }

  return mapLeavePolicyRule(
    rule
  );
}

export async function createLeavePolicyRule(
  leavePolicyId: string,
  input:
    CreateLeavePolicyRuleInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const policy =
    await findLeavePolicyRecordById(
      companyId,
      leavePolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  const leaveType =
    await findLeaveTypeRecordById(
      companyId,
      input.leaveTypeId
    );

  if (!leaveType) {
    throw new AppError({
      message:
        "Leave type was not found",

      statusCode: 404,

      code:
        "LEAVE_TYPE_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      leaveType.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected leave type is inactive",

      statusCode: 409,

      code:
        "LEAVE_TYPE_INACTIVE"
    });
  }

  const maximumRequestUnits =
    input.maximumRequestUnits ??
    null;

  const maximumCarryForwardUnits =
    input.maximumCarryForwardUnits ??
    null;

  const carryForwardExpiryMonths =
    input.carryForwardExpiryMonths ??
    null;

  const maximumBalanceUnits =
    input.maximumBalanceUnits ??
    null;

  const attachmentRequiredAfterUnits =
    input.attachmentRequiredAfterUnits ??
    null;

  const maximumEncashmentUnits =
    input.maximumEncashmentUnits ??
    null;

  validateLeaveRuleConfiguration({
    minimumRequestUnits:
      input.minimumRequestUnits,

    maximumRequestUnits,

    carryForwardEnabled:
      input.carryForwardEnabled,

    maximumCarryForwardUnits,

    carryForwardExpiryMonths,

    maximumBalanceUnits,

    allowNegativeBalance:
      input.allowNegativeBalance,

    negativeBalanceLimit:
      input.negativeBalanceLimit,

    encashmentAllowed:
      input.encashmentAllowed,

    maximumEncashmentUnits,

    attachmentRequiredAfterUnits
  });

  const record:
    CreateLeavePolicyRuleRecord = {
      leavePolicyId,

      leaveTypeId:
        input.leaveTypeId,

      annualEntitlementUnits:
        input.annualEntitlementUnits,

      accrualMethod:
        input.accrualMethod,

      accrualUnitsPerPeriod:
        input.accrualUnitsPerPeriod,

      accrualStartAfterDays:
        input.accrualStartAfterDays,

      prorateEntitlement:
        input.prorateEntitlement,

      allowDuringProbation:
        input.allowDuringProbation,

      eligibleGender:
        input.eligibleGender,

      minimumRequestUnits:
        input.minimumRequestUnits,

      maximumRequestUnits,

      minimumNoticeDays:
        input.minimumNoticeDays,

      maximumAdvanceDays:
        input.maximumAdvanceDays ??
        null,

      maximumBackdateDays:
        input.maximumBackdateDays,

      allowHalfDay:
        input.allowHalfDay,

      allowHourlyLeave:
        input.allowHourlyLeave,

      includeWeekends:
        input.includeWeekends,

      includeHolidays:
        input.includeHolidays,

      sandwichRuleEnabled:
        input.sandwichRuleEnabled,

      carryForwardEnabled:
        input.carryForwardEnabled,

      maximumCarryForwardUnits,

      carryForwardExpiryMonths,

      maximumBalanceUnits,

      allowNegativeBalance:
        input.allowNegativeBalance,

      negativeBalanceLimit:
        input.negativeBalanceLimit,

      attachmentRequiredAfterUnits,

      encashmentAllowed:
        input.encashmentAllowed,

      maximumEncashmentUnits,

      approvalLevelsRequired:
        input.approvalLevelsRequired,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createLeavePolicyRuleRecord(
        companyId,
        record,
        createActor(auth),
        metadata
      );

    return mapLeavePolicyRule(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateLeavePolicyRule(
  leavePolicyId: string,
  leavePolicyRuleId: string,
  input:
    UpdateLeavePolicyRuleInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  const existing =
    await findLeavePolicyRuleRecordById(
      companyId,
      leavePolicyId,
      leavePolicyRuleId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Leave-policy rule was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_RULE_NOT_FOUND"
    });
  }

  const finalLeaveTypeId =
    input.leaveTypeId ??
    String(
      existing.leave_type_id
    );

  const leaveType =
    await findLeaveTypeRecordById(
      companyId,
      finalLeaveTypeId
    );

  if (!leaveType) {
    throw new AppError({
      message:
        "Leave type was not found",

      statusCode: 404,

      code:
        "LEAVE_TYPE_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      leaveType.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected leave type is inactive",

      statusCode: 409,

      code:
        "LEAVE_TYPE_INACTIVE"
    });
  }

  const finalConfiguration:
    LeaveRuleConfiguration = {
      minimumRequestUnits:
        input.minimumRequestUnits ??
        Number(
          existing.minimum_request_units
        ),

      maximumRequestUnits:
        input.maximumRequestUnits !==
        undefined
          ? input.maximumRequestUnits
          : nullableNumber(
              existing.maximum_request_units
            ),

      carryForwardEnabled:
        input.carryForwardEnabled ??
        databaseBoolean(
          existing.carry_forward_enabled
        ),

      maximumCarryForwardUnits:
        input.maximumCarryForwardUnits !==
        undefined
          ? input.maximumCarryForwardUnits
          : nullableNumber(
              existing
                .maximum_carry_forward_units
            ),

      carryForwardExpiryMonths:
        input.carryForwardExpiryMonths !==
        undefined
          ? input.carryForwardExpiryMonths
          : nullableNumber(
              existing
                .carry_forward_expiry_months
            ),

      maximumBalanceUnits:
        input.maximumBalanceUnits !==
        undefined
          ? input.maximumBalanceUnits
          : nullableNumber(
              existing.maximum_balance_units
            ),

      allowNegativeBalance:
        input.allowNegativeBalance ??
        databaseBoolean(
          existing.allow_negative_balance
        ),

      negativeBalanceLimit:
        input.negativeBalanceLimit ??
        Number(
          existing.negative_balance_limit
        ),

      encashmentAllowed:
        input.encashmentAllowed ??
        databaseBoolean(
          existing.encashment_allowed
        ),

      maximumEncashmentUnits:
        input.maximumEncashmentUnits !==
        undefined
          ? input.maximumEncashmentUnits
          : nullableNumber(
              existing
                .maximum_encashment_units
            ),

      attachmentRequiredAfterUnits:
        input
          .attachmentRequiredAfterUnits !==
        undefined
          ? input
              .attachmentRequiredAfterUnits
          : nullableNumber(
              existing
                .attachment_required_after_units
            )
    };

  validateLeaveRuleConfiguration(
    finalConfiguration
  );

  const record:
    UpdateLeavePolicyRuleRecord = {
      ...(input.leaveTypeId !== undefined
        ? {
            leaveTypeId:
              input.leaveTypeId
          }
        : {}),

      ...(input.annualEntitlementUnits !==
      undefined
        ? {
            annualEntitlementUnits:
              input.annualEntitlementUnits
          }
        : {}),

      ...(input.accrualMethod !== undefined
        ? {
            accrualMethod:
              input.accrualMethod
          }
        : {}),

      ...(input.accrualUnitsPerPeriod !==
      undefined
        ? {
            accrualUnitsPerPeriod:
              input.accrualUnitsPerPeriod
          }
        : {}),

      ...(input.accrualStartAfterDays !==
      undefined
        ? {
            accrualStartAfterDays:
              input.accrualStartAfterDays
          }
        : {}),

      ...(input.prorateEntitlement !==
      undefined
        ? {
            prorateEntitlement:
              input.prorateEntitlement
          }
        : {}),

      ...(input.allowDuringProbation !==
      undefined
        ? {
            allowDuringProbation:
              input.allowDuringProbation
          }
        : {}),

      ...(input.eligibleGender !== undefined
        ? {
            eligibleGender:
              input.eligibleGender
          }
        : {}),

      ...(input.minimumRequestUnits !==
      undefined
        ? {
            minimumRequestUnits:
              input.minimumRequestUnits
          }
        : {}),

      ...(input.maximumRequestUnits !==
      undefined
        ? {
            maximumRequestUnits:
              input.maximumRequestUnits
          }
        : {}),

      ...(input.minimumNoticeDays !==
      undefined
        ? {
            minimumNoticeDays:
              input.minimumNoticeDays
          }
        : {}),

      ...(input.maximumAdvanceDays !==
      undefined
        ? {
            maximumAdvanceDays:
              input.maximumAdvanceDays
          }
        : {}),

      ...(input.maximumBackdateDays !==
      undefined
        ? {
            maximumBackdateDays:
              input.maximumBackdateDays
          }
        : {}),

      ...(input.allowHalfDay !== undefined
        ? {
            allowHalfDay:
              input.allowHalfDay
          }
        : {}),

      ...(input.allowHourlyLeave !==
      undefined
        ? {
            allowHourlyLeave:
              input.allowHourlyLeave
          }
        : {}),

      ...(input.includeWeekends !==
      undefined
        ? {
            includeWeekends:
              input.includeWeekends
          }
        : {}),

      ...(input.includeHolidays !==
      undefined
        ? {
            includeHolidays:
              input.includeHolidays
          }
        : {}),

      ...(input.sandwichRuleEnabled !==
      undefined
        ? {
            sandwichRuleEnabled:
              input.sandwichRuleEnabled
          }
        : {}),

      ...(input.carryForwardEnabled !==
      undefined
        ? {
            carryForwardEnabled:
              input.carryForwardEnabled
          }
        : {}),

      ...(input.maximumCarryForwardUnits !==
      undefined
        ? {
            maximumCarryForwardUnits:
              input.maximumCarryForwardUnits
          }
        : {}),

      ...(input.carryForwardExpiryMonths !==
      undefined
        ? {
            carryForwardExpiryMonths:
              input.carryForwardExpiryMonths
          }
        : {}),

      ...(input.maximumBalanceUnits !==
      undefined
        ? {
            maximumBalanceUnits:
              input.maximumBalanceUnits
          }
        : {}),

      ...(input.allowNegativeBalance !==
      undefined
        ? {
            allowNegativeBalance:
              input.allowNegativeBalance
          }
        : {}),

      ...(input.negativeBalanceLimit !==
      undefined
        ? {
            negativeBalanceLimit:
              input.negativeBalanceLimit
          }
        : {}),

      ...(input
        .attachmentRequiredAfterUnits !==
      undefined
        ? {
            attachmentRequiredAfterUnits:
              input
                .attachmentRequiredAfterUnits
          }
        : {}),

      ...(input.encashmentAllowed !==
      undefined
        ? {
            encashmentAllowed:
              input.encashmentAllowed
          }
        : {}),

      ...(input.maximumEncashmentUnits !==
      undefined
        ? {
            maximumEncashmentUnits:
              input.maximumEncashmentUnits
          }
        : {}),

      ...(input.approvalLevelsRequired !==
      undefined
        ? {
            approvalLevelsRequired:
              input.approvalLevelsRequired
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
      await updateLeavePolicyRuleRecord(
        companyId,
        leavePolicyId,
        leavePolicyRuleId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Leave-policy rule was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_RULE_NOT_FOUND"
      });
    }

    return mapLeavePolicyRule(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteLeavePolicyRule(
  leavePolicyId: string,
  leavePolicyRuleId: string,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeaveConfigurationManageAccess(
    auth
  );

  const companyId =
    requireCompanyId(auth);

  try {
    const deleted =
      await deleteLeavePolicyRuleRecord(
        companyId,
        leavePolicyId,
        leavePolicyRuleId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Leave-policy rule was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_RULE_NOT_FOUND"
      });
    }

    return mapLeavePolicyRule(
      deleted
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Employee policy assignments
 * =========================================================
 */

export async function listEmployeeLeavePolicyAssignments(
  employeeId: string,
  query:
    EmployeeLeavePolicyAssignmentListQuery,
  auth:
    AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertLeavePolicyAssignmentViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listEmployeeLeavePolicyAssignmentRecords(
      companyId,
      employeeId,
      {
        ...(query.leavePolicyId !==
        undefined
          ? {
              leavePolicyId:
                query.leavePolicyId
            }
          : {}),

        ...(query.isCurrent !== undefined
          ? {
              isCurrent:
                query.isCurrent
            }
          : {}),

        ...(query.dateFrom !== undefined
          ? {
              dateFrom:
                query.dateFrom
            }
          : {}),

        ...(query.dateTo !== undefined
          ? {
              dateTo:
                query.dateTo
            }
          : {}),

        page:
          query.page,

        pageSize:
          query.pageSize
      }
    );

  return {
    assignments:
      result.records.map(
        mapEmployeeLeavePolicyAssignment
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function createEmployeeLeavePolicyAssignment(
  employeeId: string,
  input:
    CreateEmployeeLeavePolicyAssignmentInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeavePolicyAssignmentManageAccess(
    auth
  );

  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeActive(
    employee
  );

  const companyId =
    String(
      employee.company_id
    );

  const policy =
    await findLeavePolicyRecordById(
      companyId,
      input.leavePolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected leave policy is inactive",

      statusCode: 409,

      code:
        "LEAVE_POLICY_INACTIVE"
    });
  }

  const effectiveTo =
    input.effectiveTo ??
    null;

  validateDateRange(
    input.effectiveFrom,
    effectiveTo,
    "INVALID_LEAVE_POLICY_ASSIGNMENT_DATES"
  );

  const record:
    CreateEmployeeLeavePolicyAssignmentRecord = {
      employeeId,

      leavePolicyId:
        input.leavePolicyId,

      effectiveFrom:
        input.effectiveFrom,

      effectiveTo,

      isCurrent:
        input.isCurrent,

      assignedByUserId:
        String(
          auth.userId
        ),

      remarks:
        input.remarks ??
        null
    };

  try {
    const created =
      await createEmployeeLeavePolicyAssignmentRecord(
        companyId,
        record,
        createActor(auth),
        metadata
      );

    return mapEmployeeLeavePolicyAssignment(
      created
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateEmployeeLeavePolicyAssignment(
  employeeId: string,
  assignmentId: string,
  input:
    UpdateEmployeeLeavePolicyAssignmentInput,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeavePolicyAssignmentManageAccess(
    auth
  );

  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  const companyId =
    String(
      employee.company_id
    );

  const existing =
    await findEmployeeLeavePolicyAssignmentRecordById(
      companyId,
      employeeId,
      assignmentId
    );

  if (!existing) {
    throw new AppError({
      message:
        "Employee leave-policy assignment was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
    });
  }

  const finalPolicyId =
    input.leavePolicyId ??
    String(
      existing.leave_policy_id
    );

  const finalEffectiveFrom =
    input.effectiveFrom ??
    requiredDateOnly(
      existing.effective_from
    );

  const finalEffectiveTo =
    input.effectiveTo !==
    undefined
      ? input.effectiveTo
      : dateOnly(
          existing.effective_to
        );

  validateDateRange(
    finalEffectiveFrom,
    finalEffectiveTo,
    "INVALID_LEAVE_POLICY_ASSIGNMENT_DATES"
  );

  const policy =
    await findLeavePolicyRecordById(
      companyId,
      finalPolicyId
    );

  if (!policy) {
    throw new AppError({
      message:
        "Leave policy was not found",

      statusCode: 404,

      code:
        "LEAVE_POLICY_NOT_FOUND"
    });
  }

  if (
    !databaseBoolean(
      policy.is_active
    )
  ) {
    throw new AppError({
      message:
        "The selected leave policy is inactive",

      statusCode: 409,

      code:
        "LEAVE_POLICY_INACTIVE"
    });
  }

  const record:
    UpdateEmployeeLeavePolicyAssignmentRecord = {
      ...(input.leavePolicyId !==
      undefined
        ? {
            leavePolicyId:
              input.leavePolicyId
          }
        : {}),

      ...(input.effectiveFrom !==
      undefined
        ? {
            effectiveFrom:
              input.effectiveFrom
          }
        : {}),

      ...(input.effectiveTo !== undefined
        ? {
            effectiveTo:
              input.effectiveTo
          }
        : {}),

      ...(input.isCurrent !== undefined
        ? {
            isCurrent:
              input.isCurrent
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
      await updateEmployeeLeavePolicyAssignmentRecord(
        companyId,
        employeeId,
        assignmentId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Employee leave-policy assignment was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapEmployeeLeavePolicyAssignment(
      updated
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteEmployeeLeavePolicyAssignment(
  employeeId: string,
  assignmentId: string,
  auth:
    AuthContext,
  metadata:
    RequestMetadata
) {
  assertLeavePolicyAssignmentManageAccess(
    auth
  );

  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  const companyId =
    String(
      employee.company_id
    );

  try {
    const deleted =
      await deleteEmployeeLeavePolicyAssignmentRecord(
        companyId,
        employeeId,
        assignmentId,
        createActor(auth),
        metadata
      );

    if (!deleted) {
      throw new AppError({
        message:
          "Employee leave-policy assignment was not found",

        statusCode: 404,

        code:
          "LEAVE_POLICY_ASSIGNMENT_NOT_FOUND"
      });
    }

    return mapEmployeeLeavePolicyAssignment(
      deleted
    );
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

/*
 * =========================================================
 * Effective employee leave policy
 * =========================================================
 */

export async function getEffectiveEmployeeLeavePolicy(
  employeeId: string,
  query:
    EffectiveEmployeeLeavePolicyQuery,
  auth:
    AuthContext
): Promise<EffectiveEmployeeLeavePolicyResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertLeavePolicyAssignmentViewAccess(
    auth,
    employeeId
  );

  const companyId =
    String(
      employee.company_id
    );

  // edited by wali: Match the policy effective date to the employee's company timezone.
  const companyTimezone = await findCompanyTimezone(companyId);
  const asOfDate =
    query.asOfDate ??
    currentDateOnly(companyTimezone);

  const assignment =
    await findEffectiveEmployeeLeavePolicyAssignmentRecord(
      companyId,
      employeeId,
      asOfDate
    );

  if (assignment) {
    const policy =
      await findLeavePolicyRecordById(
        companyId,
        String(
          assignment.leave_policy_id
        )
      );

    const rules =
      policy
        ? await listEffectiveLeavePolicyRuleRecords(
            companyId,
            String(
              policy.leave_policy_id
            ),
            query.includeInactiveRules
          )
        : [];

    return {
      employeeId,
      companyId,
      asOfDate,

      source:
        "EMPLOYEE_ASSIGNMENT",

      assignment:
        mapEmployeeLeavePolicyAssignment(
          assignment
        ),

      policy:
        policy
          ? mapLeavePolicy(
              policy
            )
          : null,

      rules:
        rules.map(
          mapLeavePolicyRule
        )
    };
  }

  const defaultPolicy =
    await findDefaultLeavePolicyRecord(
      companyId,
      asOfDate
    );

  if (defaultPolicy) {
    const rules =
      await listEffectiveLeavePolicyRuleRecords(
        companyId,
        String(
          defaultPolicy.leave_policy_id
        ),
        query.includeInactiveRules
      );

    return {
      employeeId,
      companyId,
      asOfDate,

      source:
        "COMPANY_DEFAULT",

      assignment:
        null,

      policy:
        mapLeavePolicy(
          defaultPolicy
        ),

      rules:
        rules.map(
          mapLeavePolicyRule
        )
    };
  }

  return {
    employeeId,
    companyId,
    asOfDate,

    source:
      "NONE",

    assignment:
      null,

    policy:
      null,

    rules:
      []
  };
}

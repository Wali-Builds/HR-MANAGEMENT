import {
  AppError
} from "../../common/errors/app-error.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import {
  findAttendanceEmployeeById
} from "./attendance.repository.js";

import {
  createHolidayRecord,
  deactivateHolidayRecord,
  findEffectiveEmployeeHolidayRecords,
  findHolidayRecordById,
  listEmployeeHolidayRecords,
  listHolidayCalendarRecords,
  listHolidayRecords,
  updateHolidayRecord
} from "./attendance-holiday.repository.js";

import type {
  CreateHolidayInput,
  EffectiveEmployeeHolidayQuery,
  EmployeeHolidayListQuery,
  HolidayCalendarSummaryQuery,
  HolidayListQuery,
  UpdateHolidayInput
} from "./attendance-holiday.schema.js";

import type {
  CreateHolidayRecord,
  EffectiveEmployeeHolidayResponse,
  EmployeeHolidayResponse,
  HolidayCalendarDayResponse,
  HolidayCalendarSummaryResponse,
  HolidayDatabaseRow,
  HolidayPaginationResponse,
  HolidayResponse,
  UpdateHolidayRecord
} from "./attendance-holiday.types.js";

import type {
  AttendanceActor,
  AttendanceEmployeeDatabaseRow,
  RequestMetadata
} from "./attendance.types.js";

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
  value: Date | string
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
  value: Date | string
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

function currentDateOnly(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function pagination(
  page: number,
  pageSize: number,
  totalRecords: number
): HolidayPaginationResponse {
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
 * Authentication and permissions
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

  return auth.companyId;
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
    String(auth.employeeId) ===
      employeeId
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
    String(auth.companyId) !==
      companyId
  ) {
    throw new AppError({
      message:
        "You cannot access another company's holidays",

      statusCode: 403,

      code:
        "HOLIDAY_COMPANY_ACCESS_DENIED"
    });
  }
}

function assertHolidayViewAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.holiday.view"
    ) ||
    hasPermission(
      auth,
      "attendance.holiday.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to view holidays",

    statusCode: 403,

    code:
      "HOLIDAY_VIEW_DENIED"
  });
}

function assertHolidayManageAccess(
  auth: AuthContext
): void {
  if (
    hasPermission(
      auth,
      "attendance.holiday.manage"
    ) ||
    hasPermission(
      auth,
      "attendance.manage"
    )
  ) {
    return;
  }

  throw new AppError({
    message:
      "You do not have permission to manage holidays",

    statusCode: 403,

    code:
      "HOLIDAY_MANAGE_DENIED"
  });
}

function assertEmployeeHolidayViewAccess(
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

  assertHolidayViewAccess(auth);
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

function employeeIdentity(
  employee:
    AttendanceEmployeeDatabaseRow
): {
  employeeCode: string;
  employeeName: string;
  branchId: string | null;
} {
  const row =
    employee as AttendanceEmployeeDatabaseRow & {
      employee_code?: string | null;
      first_name?: string | null;
      middle_name?: string | null;
      last_name?: string | null;

      branch_id?:
        | string
        | number
        | bigint
        | null;
    };

  const employeeName = [
    row.first_name,
    row.middle_name,
    row.last_name
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim() !== ""
    )
    .join(" ");

  return {
    employeeCode:
      row.employee_code ??
      String(
        employee.employee_id
      ),

    employeeName:
      employeeName ||
      row.employee_code ||
      String(
        employee.employee_id
      ),

    branchId:
      nullableId(
        row.branch_id
      )
  };
}

/*
 * =========================================================
 * Response mapping
 * =========================================================
 */

function mapHoliday(
  row: HolidayDatabaseRow
): HolidayResponse {
  return {
    holidayId:
      String(row.holiday_id),

    companyId:
      String(row.company_id),

    branchId:
      nullableId(row.branch_id),

    branchCode:
      row.branch_code,

    branchName:
      row.branch_name,

    scope:
      row.branch_id === null
        ? "COMPANY"
        : "BRANCH",

    holidayName:
      row.holiday_name,

    holidayDate:
      requiredDateOnly(
        row.holiday_date
      ),

    holidayType:
      row.holiday_type,

    description:
      row.description,

    isOptional:
      databaseBoolean(
        row.is_optional
      ),

    isPaid:
      databaseBoolean(
        row.is_paid
      ),

    isActive:
      databaseBoolean(
        row.is_active
      ),

    leaveRequestDayCount:
      Number(
        row.leave_request_day_count
      ),

    attendanceRecordCount:
      Number(
        row.attendance_record_count
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
      HOLIDAY_BRANCH_NOT_FOUND: {
        message:
          "The selected branch was not found in this company",
        statusCode: 404
      },

      DUPLICATE_HOLIDAY: {
        message:
          "A holiday with the same name, date, and scope already exists",
        statusCode: 409
      },

      INVALID_HOLIDAY_DATE: {
        message:
          "The holiday date is invalid",
        statusCode: 422
      },

      NO_HOLIDAY_UPDATE_FIELDS: {
        message:
          "At least one holiday field is required",
        statusCode: 422
      },

      CREATED_HOLIDAY_NOT_FOUND: {
        message:
          "The holiday was created but could not be retrieved",
        statusCode: 500
      },

      UPDATED_HOLIDAY_NOT_FOUND: {
        message:
          "The holiday was updated but could not be retrieved",
        statusCode: 500
      },

      DEACTIVATED_HOLIDAY_NOT_FOUND: {
        message:
          "The holiday was deactivated but could not be retrieved",
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
        "A duplicate holiday record already exists",

      statusCode: 409,

      code:
        "HOLIDAY_DUPLICATE"
    });
  }

  if (
    databaseError.code ===
      "ER_NO_REFERENCED_ROW_2" ||
    databaseError.errno === 1452
  ) {
    throw new AppError({
      message:
        "A referenced company or branch was not found",

      statusCode: 409,

      code:
        "HOLIDAY_REFERENCE_NOT_FOUND"
    });
  }

  throw error;
}

/*
 * =========================================================
 * Holiday CRUD
 * =========================================================
 */

export async function listHolidays(
  query: HolidayListQuery,
  auth: AuthContext
) {
  assertHolidayViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const result =
    await listHolidayRecords(
      companyId,
      {
        ...(query.branchId !== undefined
          ? {
              branchId:
                query.branchId
            }
          : {}),

        ...(query.holidayType !== undefined
          ? {
              holidayType:
                query.holidayType
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

        ...(query.isOptional !== undefined
          ? {
              isOptional:
                query.isOptional
            }
          : {}),

        ...(query.isPaid !== undefined
          ? {
              isPaid:
                query.isPaid
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

        includeCompanyWide:
          query.includeCompanyWide,

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
    holidays:
      result.records.map(
        mapHoliday
      ),

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getHoliday(
  holidayId: string,
  auth: AuthContext
) {
  assertHolidayViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const holiday =
    await findHolidayRecordById(
      companyId,
      holidayId
    );

  if (!holiday) {
    throw new AppError({
      message:
        "Holiday was not found",

      statusCode: 404,

      code:
        "HOLIDAY_NOT_FOUND"
    });
  }

  return mapHoliday(holiday);
}

export async function createHoliday(
  input: CreateHolidayInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertHolidayManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const record:
    CreateHolidayRecord = {
      companyId,

      branchId:
        input.branchId ??
        null,

      holidayName:
        input.holidayName,

      holidayDate:
        input.holidayDate,

      holidayType:
        input.holidayType,

      description:
        input.description ??
        null,

      isOptional:
        input.isOptional,

      isPaid:
        input.isPaid,

      isActive:
        input.isActive
    };

  try {
    const created =
      await createHolidayRecord(
        record,
        createActor(auth),
        metadata
      );

    return mapHoliday(created);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function updateHoliday(
  holidayId: string,
  input: UpdateHolidayInput,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertHolidayManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const record:
    UpdateHolidayRecord = {
      ...(input.branchId !== undefined
        ? {
            branchId:
              input.branchId
          }
        : {}),

      ...(input.holidayName !== undefined
        ? {
            holidayName:
              input.holidayName
          }
        : {}),

      ...(input.holidayDate !== undefined
        ? {
            holidayDate:
              input.holidayDate
          }
        : {}),

      ...(input.holidayType !== undefined
        ? {
            holidayType:
              input.holidayType
          }
        : {}),

      ...(input.description !== undefined
        ? {
            description:
              input.description
          }
        : {}),

      ...(input.isOptional !== undefined
        ? {
            isOptional:
              input.isOptional
          }
        : {}),

      ...(input.isPaid !== undefined
        ? {
            isPaid:
              input.isPaid
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
      await updateHolidayRecord(
        companyId,
        holidayId,
        record,
        createActor(auth),
        metadata
      );

    if (!updated) {
      throw new AppError({
        message:
          "Holiday was not found",

        statusCode: 404,

        code:
          "HOLIDAY_NOT_FOUND"
      });
    }

    return mapHoliday(updated);
  } catch (error) {
    return translateRepositoryError(
      error
    );
  }
}

export async function deleteHoliday(
  holidayId: string,
  auth: AuthContext,
  metadata: RequestMetadata
) {
  assertHolidayManageAccess(auth);

  const companyId =
    requireCompanyId(auth);

  try {
    const deactivated =
      await deactivateHolidayRecord(
        companyId,
        holidayId,
        createActor(auth),
        metadata
      );

    if (!deactivated) {
      throw new AppError({
        message:
          "Holiday was not found",

        statusCode: 404,

        code:
          "HOLIDAY_NOT_FOUND"
      });
    }

    return mapHoliday(
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
 * Employee holidays
 * =========================================================
 */

export async function listEmployeeHolidays(
  employeeId: string,
  query: EmployeeHolidayListQuery,
  auth: AuthContext
) {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeHolidayViewAccess(
    auth,
    employeeId
  );

  const identity =
    employeeIdentity(employee);

  const companyId =
    String(
      employee.company_id
    );

  const result =
    await listEmployeeHolidayRecords(
      companyId,
      identity.branchId,
      {
        ...(query.holidayType !== undefined
          ? {
              holidayType:
                query.holidayType
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

        includeOptional:
          query.includeOptional,

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

  const holidays:
    EmployeeHolidayResponse[] =
      result.records.map(
        (
          holiday
        ) => ({
          employeeId,

          companyId,

          employeeCode:
            identity.employeeCode,

          employeeName:
            identity.employeeName,

          employeeBranchId:
            identity.branchId,

          holiday:
            mapHoliday(holiday)
        })
      );

  return {
    employeeId,
    companyId,

    employeeCode:
      identity.employeeCode,

    employeeName:
      identity.employeeName,

    employeeBranchId:
      identity.branchId,

    holidays,

    pagination:
      pagination(
        query.page,
        query.pageSize,
        result.totalRecords
      )
  };
}

export async function getEffectiveEmployeeHoliday(
  employeeId: string,
  query:
    EffectiveEmployeeHolidayQuery,
  auth: AuthContext
): Promise<EffectiveEmployeeHolidayResponse> {
  const employee =
    await getEmployeeOrThrow(
      employeeId
    );

  assertEmployeeCompany(
    auth,
    employee
  );

  assertEmployeeHolidayViewAccess(
    auth,
    employeeId
  );

  const identity =
    employeeIdentity(employee);

  const companyId =
    String(
      employee.company_id
    );

  const holidayDate =
    query.holidayDate ??
    currentDateOnly();

  const records =
    await findEffectiveEmployeeHolidayRecords(
      companyId,
      identity.branchId,
      holidayDate,
      {
        includeOptional:
          query.includeOptional,

        includeInactive:
          query.includeInactive
      }
    );

  const holidays =
    records.map(
      mapHoliday
    );

  return {
    employeeId,
    companyId,

    employeeBranchId:
      identity.branchId,

    holidayDate,

    isHoliday:
      holidays.length > 0,

    holidays,

    primaryHoliday:
      holidays[0] ??
      null
  };
}

/*
 * =========================================================
 * Holiday calendar summary
 * =========================================================
 */

function enumerateDates(
  dateFrom: string,
  dateTo: string
): string[] {
  const dates: string[] = [];

  const currentDate =
    new Date(
      `${dateFrom}T00:00:00.000Z`
    );

  const endingDate =
    new Date(
      `${dateTo}T00:00:00.000Z`
    );

  while (
    currentDate.getTime() <=
    endingDate.getTime()
  ) {
    dates.push(
      currentDate
        .toISOString()
        .slice(0, 10)
    );

    currentDate.setUTCDate(
      currentDate.getUTCDate() +
        1
    );
  }

  return dates;
}

export async function getHolidayCalendarSummary(
  query:
    HolidayCalendarSummaryQuery,
  auth: AuthContext
): Promise<HolidayCalendarSummaryResponse> {
  assertHolidayViewAccess(auth);

  const companyId =
    requireCompanyId(auth);

  const records =
    await listHolidayCalendarRecords(
      companyId,
      query.branchId ??
        null,
      {
        dateFrom:
          query.dateFrom,

        dateTo:
          query.dateTo,

        includeOptional:
          query.includeOptional,

        includeInactive:
          query.includeInactive
      }
    );

  const groupedHolidays =
    new Map<
      string,
      HolidayResponse[]
    >();

  for (const record of records) {
    const holiday =
      mapHoliday(record);

    const existing =
      groupedHolidays.get(
        holiday.holidayDate
      ) ?? [];

    existing.push(holiday);

    groupedHolidays.set(
      holiday.holidayDate,
      existing
    );
  }

  const calendarDates =
    enumerateDates(
      query.dateFrom,
      query.dateTo
    );

  const days:
    HolidayCalendarDayResponse[] =
      calendarDates.map(
        (
          holidayDate
        ) => {
          const holidays =
            groupedHolidays.get(
              holidayDate
            ) ?? [];

          const isHoliday =
            holidays.length > 0;

          const isOptional =
            isHoliday &&
            holidays.every(
              (
                holiday
              ) =>
                holiday.isOptional
            );

          const isPaid =
            holidays.some(
              (
                holiday
              ) =>
                holiday.isPaid
            );

          return {
            holidayDate,
            isHoliday,
            isOptional,
            isPaid,

            holidayCount:
              holidays.length,

            holidays
          };
        }
      );

  const holidayDays =
    days.filter(
      (
        day
      ) => day.isHoliday
    );

  return {
    dateFrom:
      query.dateFrom,

    dateTo:
      query.dateTo,

    totalCalendarDays:
      days.length,

    totalHolidayDates:
      holidayDays.length,

    paidHolidayDates:
      holidayDays.filter(
        (
          day
        ) => day.isPaid
      ).length,

    unpaidHolidayDates:
      holidayDays.filter(
        (
          day
        ) => !day.isPaid
      ).length,

    optionalHolidayDates:
      holidayDays.filter(
        (
          day
        ) => day.isOptional
      ).length,

    days
  };
}
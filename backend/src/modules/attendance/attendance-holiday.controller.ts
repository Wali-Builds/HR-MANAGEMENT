import type {
  Request,
  Response
} from "express";

import {
  AppError
} from "../../common/errors/app-error.js";

import {
  sendSuccess
} from "../../common/utils/api-response.js";

import type {
  AuthContext
} from "../auth/auth.types.js";

import type {
  CreateHolidayInput,
  EffectiveEmployeeHolidayQuery,
  EmployeeHolidayListQuery,
  HolidayCalendarSummaryQuery,
  HolidayListQuery,
  UpdateHolidayInput
} from "./attendance-holiday.schema.js";

import {
  createHoliday,
  deleteHoliday,
  getEffectiveEmployeeHoliday,
  getHoliday,
  getHolidayCalendarSummary,
  listEmployeeHolidays,
  listHolidays,
  updateHoliday
} from "./attendance-holiday.service.js";

import type {
  RequestMetadata
} from "./attendance.types.js";

function getAuthContext(
  response: Response
): AuthContext {
  const auth =
    response.locals.auth as
      | AuthContext
      | undefined;

  if (!auth) {
    throw new AppError({
      message:
        "Authentication is required",

      statusCode: 401,

      code:
        "AUTHENTICATION_REQUIRED"
    });
  }

  return auth;
}

function getRequestMetadata(
  request: Request
): RequestMetadata {
  return {
    ipAddress:
      request.ip ??
      null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

/*
 * =========================================================
 * Holiday controllers
 * =========================================================
 */

export async function listHolidaysController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        HolidayListQuery;
    };

  const result =
    await listHolidays(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Holidays retrieved successfully",

    data:
      result
  });
}

export async function getHolidayCalendarSummaryController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query:
        HolidayCalendarSummaryQuery;
    };

  const result =
    await getHolidayCalendarSummary(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Holiday calendar summary retrieved successfully",

    data:
      result
  });
}

export async function getHolidayController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        holidayId: string;
      };
    };

  const holiday =
    await getHoliday(
      validated.params.holidayId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Holiday retrieved successfully",

    data: {
      holiday
    }
  });
}

export async function createHolidayController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body:
        CreateHolidayInput;
    };

  const holiday =
    await createHoliday(
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Holiday created successfully",

    data: {
      holiday
    }
  });
}

export async function updateHolidayController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        holidayId: string;
      };

      body:
        UpdateHolidayInput;
    };

  const holiday =
    await updateHoliday(
      validated.params.holidayId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Holiday updated successfully",

    data: {
      holiday
    }
  });
}

export async function deleteHolidayController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        holidayId: string;
      };
    };

  const holiday =
    await deleteHoliday(
      validated.params.holidayId,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Holiday deactivated successfully",

    data: {
      holiday
    }
  });
}

/*
 * =========================================================
 * Employee holiday controllers
 * =========================================================
 */

export async function listEmployeeHolidaysController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeHolidayListQuery;
    };

  const result =
    await listEmployeeHolidays(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee holidays retrieved successfully",

    data:
      result
  });
}

export async function getEffectiveEmployeeHolidayController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EffectiveEmployeeHolidayQuery;
    };

  const result =
    await getEffectiveEmployeeHoliday(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Effective employee holiday retrieved successfully",

    data:
      result
  });
}
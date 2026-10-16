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
  CloseEmployeeTaxProfileInput,
  CreateEmployeeBankAccountInput,
  CreateEmployeeTaxProfileInput,
  EmployeeBankAccountListQuery,
  EmployeeFinanceLookupQuery,
  EmployeeTaxProfileListQuery,
  UpdateEmployeeBankAccountInput,
  UpdateEmployeeTaxProfileInput
} from "./employee-finance.schema.js";

import {
  closeEmployeeTaxProfile,
  createEmployeeBankAccount,
  createEmployeeTaxProfile,
  deleteEmployeeBankAccount,
  getEmployeeBankAccount,
  getEmployeeFinanceLookups,
  getEmployeeTaxProfile,
  listEmployeeBankAccounts,
  listEmployeeTaxProfiles,
  updateEmployeeBankAccount,
  updateEmployeeTaxProfile
} from "./employee-finance.service.js";

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
) {
  return {
    ipAddress:
      request.ip ?? null,

    userAgent:
      request.get(
        "user-agent"
      ) ?? null
  };
}

export async function getEmployeeFinanceLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeFinanceLookupQuery;
    };

  const lookups =
    await getEmployeeFinanceLookups(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee finance lookups retrieved successfully",

    data:
      lookups
  });
}

/*
 * Bank accounts
 */

export async function listEmployeeBankAccountsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeBankAccountListQuery;
    };

  const bankAccounts =
    await listEmployeeBankAccounts(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee bank accounts retrieved successfully",

    data: {
      bankAccounts
    }
  });
}

export async function getEmployeeBankAccountController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        bankAccountId: string;
      };
    };

  const bankAccount =
    await getEmployeeBankAccount(
      validated.params.employeeId,
      validated.params.bankAccountId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee bank account retrieved successfully",

    data: {
      bankAccount
    }
  });
}

export async function createEmployeeBankAccountController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeBankAccountInput;
    };

  const bankAccount =
    await createEmployeeBankAccount(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee bank account created successfully",

    data: {
      bankAccount
    }
  });
}

export async function updateEmployeeBankAccountController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        bankAccountId: string;
      };

      body:
        UpdateEmployeeBankAccountInput;
    };

  const bankAccount =
    await updateEmployeeBankAccount(
      validated.params.employeeId,
      validated.params.bankAccountId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee bank account updated successfully",

    data: {
      bankAccount
    }
  });
}

export async function deleteEmployeeBankAccountController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        bankAccountId: string;
      };
    };

  await deleteEmployeeBankAccount(
    validated.params.employeeId,
    validated.params.bankAccountId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee bank account deleted successfully",

    data: null
  });
}

/*
 * Tax profiles
 */

export async function listEmployeeTaxProfilesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeTaxProfileListQuery;
    };

  const taxProfiles =
    await listEmployeeTaxProfiles(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee tax profiles retrieved successfully",

    data: {
      taxProfiles
    }
  });
}

export async function getEmployeeTaxProfileController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        taxProfileId: string;
      };
    };

  const taxProfile =
    await getEmployeeTaxProfile(
      validated.params.employeeId,
      validated.params.taxProfileId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee tax profile retrieved successfully",

    data: {
      taxProfile
    }
  });
}

export async function createEmployeeTaxProfileController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeTaxProfileInput;
    };

  const taxProfile =
    await createEmployeeTaxProfile(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee tax profile created successfully",

    data: {
      taxProfile
    }
  });
}

export async function updateEmployeeTaxProfileController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        taxProfileId: string;
      };

      body:
        UpdateEmployeeTaxProfileInput;
    };

  const taxProfile =
    await updateEmployeeTaxProfile(
      validated.params.employeeId,
      validated.params.taxProfileId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee tax profile updated successfully",

    data: {
      taxProfile
    }
  });
}

export async function closeEmployeeTaxProfileController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        taxProfileId: string;
      };

      body:
        CloseEmployeeTaxProfileInput;
    };

  const taxProfile =
    await closeEmployeeTaxProfile(
      validated.params.employeeId,
      validated.params.taxProfileId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee tax profile closed successfully",

    data: {
      taxProfile
    }
  });
}
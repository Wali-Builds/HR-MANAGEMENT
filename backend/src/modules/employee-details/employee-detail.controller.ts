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
  CreateEmergencyContactInput,
  CreateEmployeeAddressInput,
  UpdateEmergencyContactInput,
  UpdateEmployeeAddressInput
} from "./employee-detail.schema.js";

import {
  createEmergencyContact,
  createEmployeeAddress,
  deleteEmergencyContact,
  deleteEmployeeAddress,
  listEmergencyContacts,
  listEmployeeAddresses,
  updateEmergencyContact,
  updateEmployeeAddress
} from "./employee-detail.service.js";

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

/*
 * =========================================================
 * Employee address controllers
 * =========================================================
 */

export async function listEmployeeAddressesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const addresses =
    await listEmployeeAddresses(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee addresses retrieved successfully",

    data: {
      addresses
    }
  });
}

export async function createEmployeeAddressController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeAddressInput;
    };

  const address =
    await createEmployeeAddress(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee address created successfully",

    data: {
      address
    }
  });
}

export async function updateEmployeeAddressController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        addressId: string;
      };

      body:
        UpdateEmployeeAddressInput;
    };

  const address =
    await updateEmployeeAddress(
      validated.params.employeeId,
      validated.params.addressId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee address updated successfully",

    data: {
      address
    }
  });
}

export async function deleteEmployeeAddressController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        addressId: string;
      };
    };

  await deleteEmployeeAddress(
    validated.params.employeeId,
    validated.params.addressId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee address deleted successfully",

    data: null
  });
}

/*
 * =========================================================
 * Emergency-contact controllers
 * =========================================================
 */

export async function listEmergencyContactsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const contacts =
    await listEmergencyContacts(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Emergency contacts retrieved successfully",

    data: {
      contacts
    }
  });
}

export async function createEmergencyContactController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmergencyContactInput;
    };

  const contact =
    await createEmergencyContact(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Emergency contact created successfully",

    data: {
      contact
    }
  });
}

export async function updateEmergencyContactController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        contactId: string;
      };

      body:
        UpdateEmergencyContactInput;
    };

  const contact =
    await updateEmergencyContact(
      validated.params.employeeId,
      validated.params.contactId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Emergency contact updated successfully",

    data: {
      contact
    }
  });
}

export async function deleteEmergencyContactController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        contactId: string;
      };
    };

  await deleteEmergencyContact(
    validated.params.employeeId,
    validated.params.contactId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Emergency contact deleted successfully",

    data: null
  });
}
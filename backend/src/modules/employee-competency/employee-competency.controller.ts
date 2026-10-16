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
  CreateEmployeeCertificationInput,
  CreateEmployeeSkillInput,
  EmployeeCertificationListQuery,
  EmployeeCompetencyLookupQuery,
  UpdateEmployeeCertificationInput,
  UpdateEmployeeSkillInput
} from "./employee-competency.schema.js";

import {
  createEmployeeCertification,
  createEmployeeSkill,
  deactivateEmployeeCertification,
  deleteEmployeeSkill,
  getEmployeeCompetencyLookups,
  listEmployeeCertifications,
  listEmployeeSkills,
  updateEmployeeCertification,
  updateEmployeeSkill
} from "./employee-competency.service.js";

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
 * Lookups
 * =========================================================
 */

export async function getEmployeeCompetencyLookupsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeCompetencyLookupQuery;
    };

  const lookups =
    await getEmployeeCompetencyLookups(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee competency lookups retrieved successfully",

    data:
      lookups
  });
}

/*
 * =========================================================
 * Skills
 * =========================================================
 */

export async function listEmployeeSkillsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const skills =
    await listEmployeeSkills(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee skills retrieved successfully",

    data: {
      skills
    }
  });
}

export async function createEmployeeSkillController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeSkillInput;
    };

  const employeeSkill =
    await createEmployeeSkill(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee skill created successfully",

    data: {
      employeeSkill
    }
  });
}

export async function updateEmployeeSkillController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        employeeSkillId: string;
      };

      body:
        UpdateEmployeeSkillInput;
    };

  const employeeSkill =
    await updateEmployeeSkill(
      validated.params.employeeId,
      validated.params.employeeSkillId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee skill updated successfully",

    data: {
      employeeSkill
    }
  });
}

export async function deleteEmployeeSkillController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        employeeSkillId: string;
      };
    };

  await deleteEmployeeSkill(
    validated.params.employeeId,
    validated.params.employeeSkillId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee skill deleted successfully",

    data: null
  });
}

/*
 * =========================================================
 * Certifications
 * =========================================================
 */

export async function listEmployeeCertificationsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      query:
        EmployeeCertificationListQuery;
    };

  const certifications =
    await listEmployeeCertifications(
      validated.params.employeeId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee certifications retrieved successfully",

    data: {
      certifications
    }
  });
}

export async function createEmployeeCertificationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeCertificationInput;
    };

  const employeeCertification =
    await createEmployeeCertification(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee certification created successfully",

    data: {
      employeeCertification
    }
  });
}

export async function updateEmployeeCertificationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        employeeCertificationId: string;
      };

      body:
        UpdateEmployeeCertificationInput;
    };

  const employeeCertification =
    await updateEmployeeCertification(
      validated.params.employeeId,
      validated.params
        .employeeCertificationId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee certification updated successfully",

    data: {
      employeeCertification
    }
  });
}

export async function deactivateEmployeeCertificationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        employeeCertificationId: string;
      };
    };

  await deactivateEmployeeCertification(
    validated.params.employeeId,
    validated.params
      .employeeCertificationId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee certification deactivated successfully",

    data: null
  });
}
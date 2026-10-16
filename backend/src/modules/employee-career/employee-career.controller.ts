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
  CreateEmployeeEducationInput,
  CreateEmployeeExperienceInput,
  UpdateEmployeeEducationInput,
  UpdateEmployeeExperienceInput
} from "./employee-career.schema.js";

import {
  createEmployeeEducation,
  createEmployeeExperience,
  deleteEmployeeEducation,
  deleteEmployeeExperience,
  listEmployeeEducations,
  listEmployeeExperiences,
  updateEmployeeEducation,
  updateEmployeeExperience
} from "./employee-career.service.js";

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
 * Education
 */

export async function listEmployeeEducationsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const educations =
    await listEmployeeEducations(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee education records retrieved successfully",

    data: {
      educations
    }
  });
}

export async function createEmployeeEducationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeEducationInput;
    };

  const education =
    await createEmployeeEducation(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee education record created successfully",

    data: {
      education
    }
  });
}

export async function updateEmployeeEducationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        educationId: string;
      };

      body:
        UpdateEmployeeEducationInput;
    };

  const education =
    await updateEmployeeEducation(
      validated.params.employeeId,
      validated.params.educationId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee education record updated successfully",

    data: {
      education
    }
  });
}

export async function deleteEmployeeEducationController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        educationId: string;
      };
    };

  await deleteEmployeeEducation(
    validated.params.employeeId,
    validated.params.educationId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee education record deleted successfully",

    data: null
  });
}

/*
 * Experience
 */

export async function listEmployeeExperiencesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };
    };

  const experiences =
    await listEmployeeExperiences(
      validated.params.employeeId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Employee experience records retrieved successfully",

    data: {
      experiences
    }
  });
}

export async function createEmployeeExperienceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
      };

      body:
        CreateEmployeeExperienceInput;
    };

  const experience =
    await createEmployeeExperience(
      validated.params.employeeId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Employee experience record created successfully",

    data: {
      experience
    }
  });
}

export async function updateEmployeeExperienceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        experienceId: string;
      };

      body:
        UpdateEmployeeExperienceInput;
    };

  const experience =
    await updateEmployeeExperience(
      validated.params.employeeId,
      validated.params.experienceId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Employee experience record updated successfully",

    data: {
      experience
    }
  });
}

export async function deleteEmployeeExperienceController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: {
        employeeId: string;
        experienceId: string;
      };
    };

  await deleteEmployeeExperience(
    validated.params.employeeId,
    validated.params.experienceId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Employee experience record deleted successfully",

    data: null
  });
}
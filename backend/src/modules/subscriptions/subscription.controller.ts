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
  CreateCompanySubscriptionInput,
  CreateSubscriptionPlanInput,
  ListCompanyAdministratorsQuery,
  ListSubscriptionPlansQuery,
  ProvisionCompanyAdministratorInput,
  ReplacePlanFeaturesInput,
  SelfServiceSubscribeInput,
  UpdateCompanySubscriptionInput,
  UpdateSubscriptionPlanInput
} from "./subscription.schema.js";

import {
  createCompanySubscription,
  createSubscriptionPlan,
  cancelSelfServiceCompanySubscription,
  getCompanyFeatures,
  getCompanySubscription,
  getCompanyUsage,
  getSubscriptionPlan,
  listCompanyAdministrators,
  listFeatureFlags,
  listSubscriptionPlans,
  selfServiceSubscribeCompany,
  provisionCompanyAdministrator,
  replaceSubscriptionPlanFeatures,
  updateCompanySubscription,
  updateSubscriptionPlan
} from "./subscription.service.js";

function getAuthContext(
  response: Response
): AuthContext {
  const auth = response.locals.auth as
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
    ipAddress: request.ip ?? null,
    userAgent:
      request.get("user-agent") ?? null
  };
}

export async function listSubscriptionPlansController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      query: ListSubscriptionPlansQuery;
    };

  const result =
    await listSubscriptionPlans(
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Subscription plans retrieved successfully",
    data: result
  });
}

export async function getSubscriptionPlanController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { planId: string };
    };

  const result =
    await getSubscriptionPlan(
      validated.params.planId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Subscription plan retrieved successfully",
    data: result
  });
}

export async function createSubscriptionPlanController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      body: CreateSubscriptionPlanInput;
    };

  const plan = await createSubscriptionPlan(
    validated.body,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  response.status(201);

  sendSuccess(response, {
    message:
      "Subscription plan created successfully",
    data: { plan }
  });
}

export async function updateSubscriptionPlanController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { planId: string };
      body: UpdateSubscriptionPlanInput;
    };

  const plan = await updateSubscriptionPlan(
    validated.params.planId,
    validated.body,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message:
      "Subscription plan updated successfully",
    data: { plan }
  });
}

export async function listFeatureFlagsController(
  _request: Request,
  response: Response
): Promise<void> {
  const features = await listFeatureFlags(
    getAuthContext(response)
  );

  sendSuccess(response, {
    message:
      "Feature flags retrieved successfully",
    data: { features }
  });
}

export async function replacePlanFeaturesController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { planId: string };
      body: ReplacePlanFeaturesInput;
    };

  const features =
    await replaceSubscriptionPlanFeatures(
      validated.params.planId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Subscription-plan features updated successfully",
    data: { features }
  });
}

export async function getCompanySubscriptionController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
    };

  const subscription =
    await getCompanySubscription(
      validated.params.companyId,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Company subscription retrieved successfully",
    data: { subscription }
  });
}

export async function createCompanySubscriptionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
      body: CreateCompanySubscriptionInput;
    };

  const subscription =
    await createCompanySubscription(
      validated.params.companyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Company subscription created successfully",
    data: { subscription }
  });
}

// edited by wali: Accept a company admin's limited self-service plan selection.
export async function selfServiceSubscribeCompanyController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
      body: SelfServiceSubscribeInput;
    };

  const subscription = await selfServiceSubscribeCompany(
    validated.params.companyId,
    validated.body,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  response.status(201);

  sendSuccess(response, {
    message: "Company subscribed to the selected plan",
    data: { subscription }
  });
}

// edited by wali: Handle cancellation from the company's own subscription page.
export async function cancelSelfServiceCompanySubscriptionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated = response.locals.validated as {
    params: { companyId: string };
  };

  const subscription = await cancelSelfServiceCompanySubscription(
    validated.params.companyId,
    getAuthContext(response),
    getRequestMetadata(request)
  );

  sendSuccess(response, {
    message: "Company subscription cancelled",
    data: { subscription }
  });
}

export async function updateCompanySubscriptionController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
      body: UpdateCompanySubscriptionInput;
    };

  const subscription =
    await updateCompanySubscription(
      validated.params.companyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  sendSuccess(response, {
    message:
      "Company subscription updated successfully",
    data: { subscription }
  });
}

export async function getCompanyUsageController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
    };

  const usage = await getCompanyUsage(
    validated.params.companyId,
    getAuthContext(response)
  );

  sendSuccess(response, {
    message:
      "Company usage retrieved successfully",
    data: { usage }
  });
}

export async function getCompanyFeaturesController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
    };

  const features = await getCompanyFeatures(
    validated.params.companyId,
    getAuthContext(response)
  );

  sendSuccess(response, {
    message:
      "Company features retrieved successfully",
    data: { features }
  });
}

export async function listCompanyAdministratorsController(
  _request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
      query: ListCompanyAdministratorsQuery;
    };

  const result =
    await listCompanyAdministrators(
      validated.params.companyId,
      validated.query,
      getAuthContext(response)
    );

  sendSuccess(response, {
    message:
      "Company administrators retrieved successfully",
    data: result
  });
}

export async function provisionCompanyAdministratorController(
  request: Request,
  response: Response
): Promise<void> {
  const validated =
    response.locals.validated as {
      params: { companyId: string };
      body:
        ProvisionCompanyAdministratorInput;
    };

  const administrator =
    await provisionCompanyAdministrator(
      validated.params.companyId,
      validated.body,
      getAuthContext(response),
      getRequestMetadata(request)
    );

  response.status(201);

  sendSuccess(response, {
    message:
      "Company Administrator provisioned successfully",
    data: { administrator }
  });
}

import {
  Router,
  type RequestHandler
} from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  requireAnyPermission,
  requirePlatformAdmin
} from "../../common/middleware/authorization.middleware.js";

import {
  requireCompletedPasswordChange
} from "../../common/middleware/password-change.middleware.js";

import {
  validateRequest
} from "../../common/middleware/validate.middleware.js";

import {
  asyncHandler
} from "../../common/utils/async-handler.js";

import {
  createCompanySubscriptionController,
  cancelSelfServiceCompanySubscriptionController,
  createSubscriptionPlanController,
  getCompanyFeaturesController,
  getCompanySubscriptionController,
  getCompanyUsageController,
  getSubscriptionPlanController,
  listCompanyAdministratorsController,
  listFeatureFlagsController,
  listSubscriptionPlansController,
  provisionCompanyAdministratorController,
  replacePlanFeaturesController,
  selfServiceSubscribeCompanyController,
  updateCompanySubscriptionController,
  updateSubscriptionPlanController
} from "./subscription.controller.js";

import {
  createCompanySubscriptionRequestSchema,
  createSubscriptionPlanRequestSchema,
  getCompanyFeaturesRequestSchema,
  getCompanySubscriptionRequestSchema,
  getCompanyUsageRequestSchema,
  getSubscriptionPlanRequestSchema,
  listCompanyAdministratorsRequestSchema,
  listFeatureFlagsRequestSchema,
  listSubscriptionPlansRequestSchema,
  provisionCompanyAdministratorRequestSchema,
  replacePlanFeaturesRequestSchema,
  selfServiceSubscribeRequestSchema,
  updateCompanySubscriptionRequestSchema,
  updateSubscriptionPlanRequestSchema
} from "./subscription.schema.js";

export const subscriptionRouter = Router();
export const companySubscriptionRouter = Router();

// edited by wali: Recognize the tenant administrator role for company subscription self-service.
function requireCompanyAdminOrPermission(
  ...permissions: string[]
): RequestHandler {
  const permissionGuard = requireAnyPermission(...permissions);

  return (request, response, next) => {
    const auth = response.locals.auth as
      | { companyId?: string | null; roleCodes?: string[] }
      | undefined;

    if (
      auth?.companyId &&
      auth.roleCodes?.includes("COMPANY_ADMIN")
    ) {
      next();
      return;
    }

    permissionGuard(request, response, next);
  };
}

subscriptionRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

companySubscriptionRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

subscriptionRouter.get(
  "/plans",
  requireCompanyAdminOrPermission(
    "subscription.plan.view",
    "subscription.plan.manage",
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    listSubscriptionPlansRequestSchema
  ),
  asyncHandler(
    listSubscriptionPlansController
  )
);

subscriptionRouter.get(
  "/plans/:planId",
  requireAnyPermission(
    "subscription.plan.view",
    "subscription.plan.manage",
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    getSubscriptionPlanRequestSchema
  ),
  asyncHandler(
    getSubscriptionPlanController
  )
);

subscriptionRouter.post(
  "/plans",
  requirePlatformAdmin,
  validateRequest(
    createSubscriptionPlanRequestSchema
  ),
  asyncHandler(
    createSubscriptionPlanController
  )
);

subscriptionRouter.patch(
  "/plans/:planId",
  requirePlatformAdmin,
  validateRequest(
    updateSubscriptionPlanRequestSchema
  ),
  asyncHandler(
    updateSubscriptionPlanController
  )
);

subscriptionRouter.get(
  "/features",
  requireAnyPermission(
    "subscription.plan.view",
    "subscription.plan.manage",
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    listFeatureFlagsRequestSchema
  ),
  asyncHandler(
    listFeatureFlagsController
  )
);

subscriptionRouter.put(
  "/plans/:planId/features",
  requirePlatformAdmin,
  validateRequest(
    replacePlanFeaturesRequestSchema
  ),
  asyncHandler(
    replacePlanFeaturesController
  )
);

// edited by wali: Keep the self-service endpoint company-scoped and permission-checked.
companySubscriptionRouter.post(
  "/:companyId/subscribe",
  requireCompanyAdminOrPermission(
    "subscription.company.manage",
    "company.manage"
  ),
  validateRequest(
    selfServiceSubscribeRequestSchema
  ),
  asyncHandler(
    selfServiceSubscribeCompanyController
  )
);

// edited by wali: Let authorized company admins cancel their own current subscription.
companySubscriptionRouter.post(
  "/:companyId/cancel-subscription",
  requireCompanyAdminOrPermission(
    "subscription.company.manage",
    "company.manage"
  ),
  validateRequest(getCompanySubscriptionRequestSchema),
  asyncHandler(cancelSelfServiceCompanySubscriptionController)
);

companySubscriptionRouter.get(
  "/:companyId/subscription",
  requireCompanyAdminOrPermission(
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    getCompanySubscriptionRequestSchema
  ),
  asyncHandler(
    getCompanySubscriptionController
  )
);

companySubscriptionRouter.post(
  "/:companyId/subscription",
  requirePlatformAdmin,
  validateRequest(
    createCompanySubscriptionRequestSchema
  ),
  asyncHandler(
    createCompanySubscriptionController
  )
);

companySubscriptionRouter.patch(
  "/:companyId/subscription",
  requirePlatformAdmin,
  validateRequest(
    updateCompanySubscriptionRequestSchema
  ),
  asyncHandler(
    updateCompanySubscriptionController
  )
);

companySubscriptionRouter.get(
  "/:companyId/usage",
  requireAnyPermission(
    "subscription.usage.view",
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    getCompanyUsageRequestSchema
  ),
  asyncHandler(
    getCompanyUsageController
  )
);

companySubscriptionRouter.get(
  "/:companyId/features",
  requireAnyPermission(
    "subscription.company.view",
    "subscription.company.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    getCompanyFeaturesRequestSchema
  ),
  asyncHandler(
    getCompanyFeaturesController
  )
);

companySubscriptionRouter.get(
  "/:companyId/administrators",
  requireAnyPermission(
    "company.admin.view",
    "company.admin.provision",
    "users.view",
    "users.manage",
    "company.view",
    "company.manage"
  ),
  validateRequest(
    listCompanyAdministratorsRequestSchema
  ),
  asyncHandler(
    listCompanyAdministratorsController
  )
);

companySubscriptionRouter.post(
  "/:companyId/provision-admin",
  requirePlatformAdmin,
  validateRequest(
    provisionCompanyAdministratorRequestSchema
  ),
  asyncHandler(
    provisionCompanyAdministratorController
  )
);

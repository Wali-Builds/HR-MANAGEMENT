import { z } from "zod";

function blankStringToNull(
  value: unknown
): unknown {
  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  return value;
}

const emptyObjectSchema = z
  .object({})
  .passthrough()
  .default({});

const positiveIdSchema = z
  .string()
  .trim()
  .regex(
    /^\d+$/,
    "ID must be a positive integer"
  );

const nullableText = (
  maximumLength: number
) =>
  z.preprocess(
    blankStringToNull,
    z
      .string()
      .trim()
      .max(maximumLength)
      .nullable()
  );

const nullableLimit = z
  .number()
  .int()
  .min(1)
  .max(2_000_000)
  .nullable();

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)
  .transform(value =>
    value.toUpperCase()
  );

const dateOnlySchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format"
  );

const nullableDateOnlySchema = z.preprocess(
  blankStringToNull,
  dateOnlySchema.nullable()
);

export const subscriptionStatusSchema = z.enum([
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED"
]);

export const billingCycleSchema = z.enum([
  "MONTHLY",
  "ANNUAL",
  "CUSTOM"
]);

export const subscriptionPlanFieldsSchema = z
  .object({
    planCode: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Plan code may contain letters, numbers, underscores and hyphens"
      )
      .transform(value =>
        value.toUpperCase()
      ),

    planName: z
      .string()
      .trim()
      .min(2)
      .max(100),

    description:
      nullableText(2000).optional(),

    maximumEmployees:
      nullableLimit.optional(),

    maximumBranches:
      nullableLimit.optional(),

    maximumUsers:
      nullableLimit.optional(),

    storageLimitMb:
      nullableLimit.optional(),

    monthlyPrice: z
      .number()
      .min(0)
      .max(999_999_999_999.99)
      .default(0),

    annualPrice: z
      .number()
      .min(0)
      .max(999_999_999_999.99)
      .default(0),

    currencyCode:
      currencyCodeSchema.default("PKR"),

    trialDays: z
      .number()
      .int()
      .min(0)
      .max(3650)
      .default(0),

    isActive: z
      .boolean()
      .default(true)
  })
  .strict();

export const createSubscriptionPlanBodySchema =
  subscriptionPlanFieldsSchema;

export const updateSubscriptionPlanBodySchema =
  subscriptionPlanFieldsSchema
    .partial()
    .superRefine((data, context) => {
      if (Object.keys(data).length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "At least one subscription-plan field is required"
        });
      }
    });

export const listSubscriptionPlansQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    isActive: z
      .preprocess(
        value => {
          if (
            value === true ||
            value === "true" ||
            value === "1"
          ) {
            return true;
          }

          if (
            value === false ||
            value === "false" ||
            value === "0"
          ) {
            return false;
          }

          return value;
        },
        z.boolean()
      )
      .optional(),

    sortBy: z
      .enum([
        "plan_code",
        "plan_name",
        "monthly_price",
        "annual_price",
        "created_at",
        "updated_at"
      ])
      .default("created_at"),

    sortOrder: z
      .enum(["asc", "desc", "ASC", "DESC"])
      .transform(value =>
        value.toUpperCase() as
          | "ASC"
          | "DESC"
      )
      .default("DESC")
  })
  .strict();

const planFeatureItemSchema = z
  .object({
    featureCode: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .transform(value =>
        value.toUpperCase()
      ),

    isEnabled: z
      .boolean()
      .default(true),

    configuration: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional()
  })
  .strict();

export const replacePlanFeaturesBodySchema = z
  .object({
    features: z
      .array(planFeatureItemSchema)
      .max(500)
  })
  .strict()
  .superRefine((data, context) => {
    const codes = data.features.map(
      feature => feature.featureCode
    );

    if (new Set(codes).size !== codes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["features"],
        message:
          "Feature codes must be unique"
      });
    }
  });

export const companySubscriptionFieldsSchema = z
  .object({
    planId: positiveIdSchema,

    subscriptionStatus:
      subscriptionStatusSchema.default("TRIAL"),

    billingCycle:
      billingCycleSchema.default("MONTHLY"),

    trialStartDate:
      nullableDateOnlySchema.optional(),

    trialEndDate:
      nullableDateOnlySchema.optional(),

    subscriptionStartDate:
      dateOnlySchema,

    subscriptionEndDate:
      nullableDateOnlySchema.optional(),

    nextBillingDate:
      nullableDateOnlySchema.optional(),

    agreedPrice: z
      .number()
      .min(0)
      .max(999_999_999_999.99)
      .default(0),

    currencyCode:
      currencyCodeSchema.default("PKR"),

    autoRenew: z
      .boolean()
      .default(false),

    employeeLimitOverride:
      nullableLimit.optional(),

    branchLimitOverride:
      nullableLimit.optional(),

    userLimitOverride:
      nullableLimit.optional(),

    storageLimitMbOverride:
      nullableLimit.optional(),

    remarks:
      nullableText(5000).optional()
  })
  .strict();

// edited by wali: Company self-service can select only catalog billing cycles.
export const selfServiceSubscribeBodySchema = z
  .object({
    planId: positiveIdSchema,
    billingCycle: z.enum(["MONTHLY", "ANNUAL"])
  })
  .strict();

type SubscriptionDateValues = {
  trialStartDate?: string | null | undefined;
  trialEndDate?: string | null | undefined;
  subscriptionStartDate?: string | undefined;
  subscriptionEndDate?: string | null | undefined;
};

function validateSubscriptionDates(
  data: SubscriptionDateValues,
  context: z.RefinementCtx
): void {
  if (
    data.trialStartDate &&
    data.trialEndDate &&
    data.trialEndDate < data.trialStartDate
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["trialEndDate"],
      message:
        "Trial end date cannot be before the trial start date"
    });
  }

  if (
    data.subscriptionStartDate &&
    data.subscriptionEndDate &&
    data.subscriptionEndDate <
      data.subscriptionStartDate
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subscriptionEndDate"],
      message:
        "Subscription end date cannot be before the subscription start date"
    });
  }
}

export const createCompanySubscriptionBodySchema =
  companySubscriptionFieldsSchema
    .superRefine(
      validateSubscriptionDates
    );

export const updateCompanySubscriptionBodySchema =
  companySubscriptionFieldsSchema
    .partial()
    .superRefine((data, context) => {
      if (Object.keys(data).length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "At least one subscription field is required"
        });
      }

      validateSubscriptionDates(
        data,
        context
      );
    });

export const provisionCompanyAdministratorBodySchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        "Username may contain letters, numbers, dots, underscores and hyphens"
      ),

    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform(value =>
        value.toLowerCase()
      ),

    temporaryPassword: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),

    isEmailVerified: z
      .boolean()
      .default(true)
  })
  .strict();

export const listCompanyAdministratorsQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    search: z
      .string()
      .trim()
      .max(200)
      .optional(),

    isActive: z
      .preprocess(
        value => {
          if (
            value === true ||
            value === "true" ||
            value === "1"
          ) {
            return true;
          }

          if (
            value === false ||
            value === "false" ||
            value === "0"
          ) {
            return false;
          }

          return value;
        },
        z.boolean()
      )
      .optional()
  })
  .strict();

const planIdParamsSchema = z.object({
  planId: positiveIdSchema
});

const companyIdParamsSchema = z.object({
  companyId: positiveIdSchema
});

// edited by wali: Validate the self-service payload inside the standard request envelope.
export const selfServiceSubscribeRequestSchema = z.object({
  body: selfServiceSubscribeBodySchema,
  params: companyIdParamsSchema,
  query: emptyObjectSchema
});

export const listSubscriptionPlansRequestSchema =
  z.object({
    body: emptyObjectSchema,
    params: emptyObjectSchema,
    query: listSubscriptionPlansQuerySchema
  });

export const getSubscriptionPlanRequestSchema =
  z.object({
    body: emptyObjectSchema,
    params: planIdParamsSchema,
    query: emptyObjectSchema
  });

export const createSubscriptionPlanRequestSchema =
  z.object({
    body: createSubscriptionPlanBodySchema,
    params: emptyObjectSchema,
    query: emptyObjectSchema
  });

export const updateSubscriptionPlanRequestSchema =
  z.object({
    body: updateSubscriptionPlanBodySchema,
    params: planIdParamsSchema,
    query: emptyObjectSchema
  });

export const replacePlanFeaturesRequestSchema =
  z.object({
    body: replacePlanFeaturesBodySchema,
    params: planIdParamsSchema,
    query: emptyObjectSchema
  });

export const listFeatureFlagsRequestSchema =
  z.object({
    body: emptyObjectSchema,
    params: emptyObjectSchema,
    query: emptyObjectSchema
  });

export const getCompanySubscriptionRequestSchema =
  z.object({
    body: emptyObjectSchema,
    params: companyIdParamsSchema,
    query: emptyObjectSchema
  });

export const createCompanySubscriptionRequestSchema =
  z.object({
    body: createCompanySubscriptionBodySchema,
    params: companyIdParamsSchema,
    query: emptyObjectSchema
  });

export const updateCompanySubscriptionRequestSchema =
  z.object({
    body: updateCompanySubscriptionBodySchema,
    params: companyIdParamsSchema,
    query: emptyObjectSchema
  });

export const getCompanyUsageRequestSchema =
  getCompanySubscriptionRequestSchema;

export const getCompanyFeaturesRequestSchema =
  getCompanySubscriptionRequestSchema;

export const listCompanyAdministratorsRequestSchema =
  z.object({
    body: emptyObjectSchema,
    params: companyIdParamsSchema,
    query:
      listCompanyAdministratorsQuerySchema
  });

export const provisionCompanyAdministratorRequestSchema =
  z.object({
    body:
      provisionCompanyAdministratorBodySchema,
    params: companyIdParamsSchema,
    query: emptyObjectSchema
  });

export type CreateSubscriptionPlanInput =
  z.infer<
    typeof createSubscriptionPlanBodySchema
  >;

export type UpdateSubscriptionPlanInput =
  z.infer<
    typeof updateSubscriptionPlanBodySchema
  >;

export type ListSubscriptionPlansQuery =
  z.infer<
    typeof listSubscriptionPlansQuerySchema
  >;

export type ReplacePlanFeaturesInput =
  z.infer<
    typeof replacePlanFeaturesBodySchema
  >;

export type CreateCompanySubscriptionInput =
  z.infer<
    typeof createCompanySubscriptionBodySchema
  >;

// edited by wali: Keep self-service input limited to plan and billing cycle.
export type SelfServiceSubscribeInput =
  z.infer<
    typeof selfServiceSubscribeBodySchema
  >;

export type UpdateCompanySubscriptionInput =
  z.infer<
    typeof updateCompanySubscriptionBodySchema
  >;

export type ProvisionCompanyAdministratorInput =
  z.infer<
    typeof provisionCompanyAdministratorBodySchema
  >;

export type ListCompanyAdministratorsQuery =
  z.infer<
    typeof listCompanyAdministratorsQuerySchema
  >;

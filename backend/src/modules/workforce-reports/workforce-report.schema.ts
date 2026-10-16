import { z } from "zod";

const databaseIdSchema = z
  .string()
  .trim()
  .regex(
    /^[1-9]\d*$/,
    "Company ID must be a positive integer"
  );

export const workforceReportQuerySchema = z
  .object({
    companyId: databaseIdSchema.optional(),
    months: z.coerce.number().int().min(3).max(24).default(12),
    upcomingDays: z.coerce.number().int().min(1).max(365).default(30)
  })
  .strict();

const emptyRequestObjectSchema = z
  .object({})
  .passthrough()
  .default({});

export const getWorkforceReportRequestSchema = z.object({
  body: emptyRequestObjectSchema,
  params: emptyRequestObjectSchema,
  query: workforceReportQuerySchema
});

export type WorkforceReportQuery =
  z.infer<typeof workforceReportQuerySchema>;

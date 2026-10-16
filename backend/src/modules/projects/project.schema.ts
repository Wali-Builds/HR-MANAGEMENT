import { z } from "zod";

const id = z.string().trim().regex(/^[1-9]\d*$/, "ID must be a positive integer");
const nullableId = z.preprocess((value) => value === "" ? null : value, id.nullable());
const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable()
);
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format");
const statuses = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

const projectFieldsSchema = z.object({
  companyId: id.optional(),
  branchId: nullableId.optional(),
  departmentId: nullableId.optional(),
  projectCode: z.string().trim().min(1).max(60).transform((value) => value.toUpperCase()),
  projectName: z.string().trim().min(1).max(250),
  clientName: nullableText(250).optional(),
  description: nullableText(65535).optional(),
  projectManagerEmployeeId: nullableId.optional(),
  startDate: isoDate,
  endDate: z.preprocess((value) => value === "" ? null : value, isoDate.nullable()).optional(),
  budgetAmount: z.number().finite().min(0).nullable().optional(),
  currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("PKR"),
  isBillable: z.boolean().default(false),
  projectStatus: z.enum(statuses).default("PLANNED")
}).strict();

export const createProjectBodySchema = projectFieldsSchema.superRefine((data, context) => {
  if (data.endDate && data.endDate < data.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date" });
  }
});

export const updateProjectBodySchema = projectFieldsSchema.partial().omit({ companyId: true }).strict().superRefine((data, context) => {
  if (Object.keys(data).length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "At least one project field is required" });
  }
});

const projectIdParams = z.object({ projectId: id });
const baseRequest = { body: z.object({}).passthrough(), params: z.object({}).passthrough(), query: z.object({}).passthrough() };
export const listProjectsRequestSchema = z.object({ ...baseRequest, query: z.object({
  departmentId: id.optional(),
  branchId: id.optional(),
  projectStatus: z.enum(statuses).optional(),
  search: z.string().trim().max(200).optional(),
  activeOnly: z.enum(["true", "false", "1", "0"]).optional()
}) });
export const getProjectRequestSchema = z.object({ ...baseRequest, params: projectIdParams });
export const createProjectRequestSchema = z.object({ ...baseRequest, body: createProjectBodySchema });
export const updateProjectRequestSchema = z.object({ ...baseRequest, params: projectIdParams, body: updateProjectBodySchema });

export type CreateProjectInput = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectBodySchema>;
export type ProjectListQuery = z.infer<typeof listProjectsRequestSchema>["query"];

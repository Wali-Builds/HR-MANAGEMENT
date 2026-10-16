import { z } from "zod";
import { PROJECT_STATUSES } from "../types/project.types";

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export const projectFormSchema = z.object({
  branchId: z.string(),
  departmentId: z.string(),
  projectManagerEmployeeId: z.string(),
  projectCode: z.string().trim().min(1, "Enter a project code.").max(60, "Project code cannot exceed 60 characters."),
  projectName: z.string().trim().min(1, "Enter a project name.").max(250, "Project name cannot exceed 250 characters."),
  clientName: z.string().max(250, "Client name cannot exceed 250 characters."),
  description: z.string().max(65535, "Description is too long."),
  startDate: z.string().refine(isIsoDate, "Choose a valid start date."),
  endDate: z.string().refine((value) => value === "" || isIsoDate(value), "Choose a valid end date."),
  budgetAmount: z.string().refine((value) => {
    if (value.trim() === "") return true;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0;
  }, "Enter a valid non-negative budget."),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/, "Enter a three-letter currency code."),
  isBillable: z.boolean(),
  projectStatus: z.enum(PROJECT_STATUSES),
}).superRefine((form, context) => {
  if (form.endDate && isIsoDate(form.startDate) && isIsoDate(form.endDate) && form.endDate < form.startDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date cannot be before start date." });
  }
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

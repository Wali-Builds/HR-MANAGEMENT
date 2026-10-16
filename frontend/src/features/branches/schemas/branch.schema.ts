// edited by wali: Validate required branch fields in the Branches feature.
import { z } from "zod";

export const branchFormSchema = z.object({
  branchCode: z.string().trim().min(2, "Enter a branch code."),
  branchName: z.string().trim().min(2, "Enter a branch name."),
});

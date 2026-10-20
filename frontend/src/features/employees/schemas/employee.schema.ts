import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  );

const optionalDate = z.string().trim();

export const employeeFormSchema = z
  .object({
    companyId: z.string().trim(),
    employeeCode: z
      .string()
      .trim()
      .max(50)
      .refine(
        (value) => value === "" || /^[A-Za-z0-9_-]+$/.test(value),
        "Use letters, numbers, underscores or hyphens only",
      ),
    firstName: z.string().trim().min(1, "First name is required").max(100),
    middleName: z.string().trim().max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    preferredName: z.string().trim().max(100),
    fatherName: z.string().trim().max(150),
    spouseName: z.string().trim().max(150),
    gender: z.string().trim().min(1, "Gender is required").max(30),
    dateOfBirth: optionalDate.min(1, "Date of birth is required"),
    maritalStatus: z.string().trim().min(1, "Marital status is required").max(30),
    bloodGroup: z.string().trim().min(1, "Blood group is required").max(10),
    nationality: z.string().trim().min(2).max(80),
    cnicNumber: z.string().trim().min(1, "CNIC number is required").max(20),
    passportNumber: z.string().trim().max(50),
    personalEmail: optionalEmail,
    officialEmail: optionalEmail,
    mobileNumber: z.string().trim().max(50),
    alternateNumber: z.string().trim().max(50),
    employmentTypeId: z.string().trim().min(1, "Employment type is required"),
    employeeStatusId: z.string().trim().min(1, "Employee status is required"),
    joiningDate: z.string().trim().min(1, "Joining date is required"),
    probationEndDate: optionalDate,
    confirmationDate: optionalDate,
    contractStartDate: optionalDate,
    contractEndDate: optionalDate,
    resignationDate: optionalDate,
    lastWorkingDate: optionalDate,
    profilePhotoPath: z.string().trim().max(500),
    biometricIdentifier: z.string().trim().max(100),
    remarks: z.string().trim().max(65535),
    isActive: z.boolean(),
    branchId: z.string().trim(),
    departmentId: z.string().trim(),
    projectId: z.string().trim(),
    designationId: z.string().trim(),
    reportingManagerId: z.string().trim(),
    positionId: z.string().trim(),
    assignmentType: z.string().trim().min(2).max(30),
    assignmentEffectiveFrom: z
      .string()
      .trim()
      .min(1, "Assignment effective date is required"),
    workLocation: z.string().trim().max(255),
    employmentPercentage: z
      .union([z.number(), z.string(), z.nan()])
      .transform((value) =>
        (typeof value === "number" && Number.isNaN(value)) || (typeof value === "string" && value.trim() === "")
          ? undefined
          : Number(value),
      )
      .pipe(
        z.number()
          .finite()
          .min(0.01, "Employment percentage must be greater than zero")
          .max(100, "Employment percentage cannot exceed 100")
          .optional(),
      ),
    transferReason: z.string().trim().max(500),
  })
  .superRefine((data, context) => {
    const today = new Date().toISOString().slice(0, 10);

    if (data.dateOfBirth && data.dateOfBirth > today) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Date of birth cannot be in the future",
      });
    }

    const checks: Array<[string, string, keyof typeof data, string]> = [
      [data.joiningDate, data.probationEndDate, "probationEndDate", "Probation end date cannot be before joining date"],
      [data.joiningDate, data.confirmationDate, "confirmationDate", "Confirmation date cannot be before joining date"],
      [data.contractStartDate, data.contractEndDate, "contractEndDate", "Contract end date cannot be before contract start date"],
      [data.joiningDate, data.resignationDate, "resignationDate", "Resignation date cannot be before joining date"],
      [data.joiningDate, data.lastWorkingDate, "lastWorkingDate", "Last working date cannot be before joining date"],
      [data.resignationDate, data.lastWorkingDate, "lastWorkingDate", "Last working date cannot be before resignation date"],
    ];

    for (const [from, to, path, message] of checks) {
      if (from && to && to < from) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message,
        });
      }
    }
  });

// edited by wali: Require a complete organization assignment when hiring a new employee.
export const employeeHiringFormSchema = employeeFormSchema.superRefine((data, context) => {
  // edited by wali: Require every contact channel when creating a new employee.
  const requiredContacts = [
    ["officialEmail", data.officialEmail, "Official email"],
    ["personalEmail", data.personalEmail, "Personal email"],
    ["mobileNumber", data.mobileNumber, "Mobile number"],
    ["alternateNumber", data.alternateNumber, "Emergency number"],
  ] as const;

  for (const [field, value, label] of requiredContacts) {
    if (!value.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${label} is required when creating an employee`,
      });
    }
  }

  const requiredAssignments = [
    ["branchId", data.branchId, "Branch"],
    ["departmentId", data.departmentId, "Department"],
    ["designationId", data.designationId, "Designation"],
    ["positionId", data.positionId, "Position"],
  ] as const;

  for (const [field, value, label] of requiredAssignments) {
    if (!value.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${label} is required for employee hiring`,
      });
    }
  }
});
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
// edited by wali: Keep raw form input types distinct from the schema's parsed submission values.
export type EmployeeFormInputValues = z.input<typeof employeeFormSchema>;

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
    maritalStatus: z.string().trim().max(30),
    bloodGroup: z.string().trim().max(10),
    nationality: z.string().trim().min(2, "Nationality is required").max(80),
    cnicNumber: z.string().trim().min(1, "CNIC number is required").max(20),
    passportNumber: z.string().trim().max(50),
    personalEmail: optionalEmail,
    officialEmail: optionalEmail,
    mobileNumber: z.string().trim().max(50),
    alternateNumber: z.string().trim().max(50),
    bankName: z.string().trim().max(150),
    bankBranchName: z.string().trim().max(150),
    bankAccountTitle: z.string().trim().max(150),
    bankAccountNumber: z.string().trim().max(200),
    bankIban: z.string().trim().max(50),
    employmentTypeId: z.string().trim().min(1, "Employment type is required"),
    employeeStatusId: z.string().trim().min(1, "Employee status is required"),
    joiningDate: optionalDate,
    probationEndDate: optionalDate,
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
    workLocation: z.string().trim().max(255),
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

export const employeeEditFormSchema = employeeFormSchema.superRefine((data, context) => {
  if (!data.joiningDate.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["joiningDate"], message: "Joining date is required" });
  }
  if (!data.positionId.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["positionId"],
      message: "Position is required",
    });
  }
});

// Profile edits don't change employee assignment; the separate Assignment page keeps its position requirement.
export const employeeProfileEditFormSchema = employeeFormSchema;

// New employees can be saved first and assigned from the Assignments tab later.
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

  const bankFields = [data.bankName, data.bankBranchName, data.bankAccountTitle, data.bankAccountNumber, data.bankIban];
  const addingBankDetails = bankFields.some((value) => value.trim().length > 0);
  if (addingBankDetails) {
    const requiredBankFields = [
      ["bankName", data.bankName, "Bank name"],
      ["bankAccountTitle", data.bankAccountTitle, "Account title"],
      ["bankAccountNumber", data.bankAccountNumber, "Account number"],
    ] as const;
    for (const [field, value, label] of requiredBankFields) {
      if (!value.trim()) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${label} is required when adding bank details` });
      }
    }
    if (data.bankAccountNumber.trim() && !/^[A-Za-z0-9./_\-\s]{4,200}$/.test(data.bankAccountNumber.trim())) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Enter a valid account number" });
    }
    const normalizedIban = data.bankIban.toUpperCase().replace(/[\s-]/g, "");
    if (normalizedIban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalizedIban)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankIban"], message: "Enter a valid IBAN" });
    }
  }

});
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
// edited by wali: Keep raw form input types distinct from the schema's parsed submission values.
export type EmployeeFormInputValues = z.input<typeof employeeFormSchema>;

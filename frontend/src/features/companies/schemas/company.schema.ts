import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .max(150, "Email cannot exceed 150 characters")
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  );

const optionalUrl = z
  .string()
  .trim()
  .max(255, "Website cannot exceed 255 characters")
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Enter a complete URL, for example https://example.com",
  );

export const companyFormSchema = z.object({
  companyCode: z
    .string()
    .trim()
    .min(2, "Company code must contain at least 2 characters")
    .max(50, "Company code cannot exceed 50 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Use letters, numbers, underscores or hyphens only",
    ),
  legalName: z
    .string()
    .trim()
    .min(2, "Legal name is required")
    .max(200, "Legal name cannot exceed 200 characters"),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name is required")
    .max(200, "Display name cannot exceed 200 characters"),
  registrationNumber: z.string().trim().max(100),
  taxNumber: z.string().trim().max(100),
  industry: z.string().trim().max(100),
  officialEmail: optionalEmail,
  officialPhone: z.string().trim().max(50),
  websiteUrl: optionalUrl,
  addressLine1: z.string().trim().max(255),
  addressLine2: z.string().trim().max(255),
  city: z.string().trim().max(100),
  district: z.string().trim().max(100),
  province: z.string().trim().max(100),
  postalCode: z.string().trim().max(30),
  countryCode: z
    .string()
    .trim()
    .length(2, "Country code must contain exactly 2 letters")
    .regex(/^[A-Za-z]{2}$/, "Country code must contain letters only"),
  timezone: z.string().trim().min(1, "Timezone is required").max(60),
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency code must contain exactly 3 letters")
    .regex(/^[A-Za-z]{3}$/, "Currency code must contain letters only"),
  dateFormat: z.string().trim().min(1, "Date format is required").max(30),
  logoPath: z.string().trim().max(500),
  employeeCodePrefix: z.string().trim().max(20),
  employeeCodeLength: z
    .number()
    .int("Employee code length must be a whole number")
    .min(1, "Minimum length is 1")
    .max(20, "Maximum length is 20"),
  isActive: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

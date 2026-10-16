import type { Company, CompanyMutationInput } from "../types/company.types";
import type { CompanyFormValues } from "../schemas/company.schema";

export const companyDefaultValues: CompanyFormValues = {
  companyCode: "",
  legalName: "",
  displayName: "",
  registrationNumber: "",
  taxNumber: "",
  industry: "",
  officialEmail: "",
  officialPhone: "",
  websiteUrl: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
  countryCode: "PK",
  timezone: "Asia/Karachi",
  currencyCode: "PKR",
  dateFormat: "DD-MM-YYYY",
  logoPath: "",
  employeeCodePrefix: "",
  employeeCodeLength: 5,
  isActive: true,
};

export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    companyCode: company.companyCode,
    legalName: company.legalName,
    displayName: company.displayName,
    registrationNumber: company.registrationNumber ?? "",
    taxNumber: company.taxNumber ?? "",
    industry: company.industry ?? "",
    officialEmail: company.officialEmail ?? "",
    officialPhone: company.officialPhone ?? "",
    websiteUrl: company.websiteUrl ?? "",
    addressLine1: company.addressLine1 ?? "",
    addressLine2: company.addressLine2 ?? "",
    city: company.city ?? "",
    district: company.district ?? "",
    province: company.province ?? "",
    postalCode: company.postalCode ?? "",
    countryCode: company.countryCode,
    timezone: company.timezone,
    currencyCode: company.currencyCode,
    dateFormat: company.dateFormat,
    logoPath: company.logoPath ?? "",
    employeeCodePrefix: company.employeeCodePrefix ?? "",
    employeeCodeLength: company.employeeCodeLength,
    isActive: company.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toCompanyMutationInput(
  values: CompanyFormValues,
): CompanyMutationInput {
  return {
    companyCode: values.companyCode.trim().toUpperCase(),
    legalName: values.legalName.trim(),
    displayName: values.displayName.trim(),
    registrationNumber: nullable(values.registrationNumber),
    taxNumber: nullable(values.taxNumber),
    industry: nullable(values.industry),
    officialEmail: nullable(values.officialEmail)?.toLowerCase() ?? null,
    officialPhone: nullable(values.officialPhone),
    websiteUrl: nullable(values.websiteUrl),
    addressLine1: nullable(values.addressLine1),
    addressLine2: nullable(values.addressLine2),
    city: nullable(values.city),
    district: nullable(values.district),
    province: nullable(values.province),
    postalCode: nullable(values.postalCode),
    countryCode: values.countryCode.trim().toUpperCase(),
    timezone: values.timezone.trim(),
    currencyCode: values.currencyCode.trim().toUpperCase(),
    dateFormat: values.dateFormat.trim(),
    logoPath: nullable(values.logoPath),
    employeeCodePrefix: nullable(values.employeeCodePrefix)?.toUpperCase() ?? null,
    employeeCodeLength: Number(values.employeeCodeLength),
    isActive: values.isActive,
  };
}

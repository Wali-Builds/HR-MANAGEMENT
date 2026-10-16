export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Employee owner/access record
 * =========================================================
 */

export interface EmployeeOwnerDatabaseRow {
  employee_id: DatabaseId;
  company_id: DatabaseId;

  employee_code: string;

  first_name: string;
  middle_name: string | null;
  last_name: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;
}

/*
 * =========================================================
 * Employee addresses
 * =========================================================
 */

export interface EmployeeAddressDatabaseRow {
  address_id: DatabaseId;
  employee_id: DatabaseId;

  address_type: string;
  address_line_1: string;
  address_line_2: string | null;

  city: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string;

  is_primary: number | boolean;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeAddressResponse {
  addressId: string;
  employeeId: string;

  addressType: string;
  addressLine1: string;
  addressLine2: string | null;

  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;

  isPrimary: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeAddressRecord {
  employeeId: string;

  addressType: string;
  addressLine1: string;
  addressLine2: string | null;

  city: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;

  isPrimary: boolean;
}

export interface UpdateEmployeeAddressRecord {
  addressType?: string | undefined;
  addressLine1?: string | undefined;

  addressLine2?:
    | string
    | null
    | undefined;

  city?:
    | string
    | null
    | undefined;

  district?:
    | string
    | null
    | undefined;

  province?:
    | string
    | null
    | undefined;

  postalCode?:
    | string
    | null
    | undefined;

  countryCode?:
    | string
    | undefined;

  isPrimary?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Emergency contacts
 * =========================================================
 */

export interface EmergencyContactDatabaseRow {
  contact_id: DatabaseId;
  employee_id: DatabaseId;

  contact_name: string;
  relationship: string;

  primary_phone: string;
  alternate_phone: string | null;

  email: string | null;
  address: string | null;

  is_primary: number | boolean;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmergencyContactResponse {
  contactId: string;
  employeeId: string;

  contactName: string;
  relationship: string;

  primaryPhone: string;
  alternatePhone: string | null;

  email: string | null;
  address: string | null;

  isPrimary: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmergencyContactRecord {
  employeeId: string;

  contactName: string;
  relationship: string;

  primaryPhone: string;
  alternatePhone: string | null;

  email: string | null;
  address: string | null;

  isPrimary: boolean;
}

export interface UpdateEmergencyContactRecord {
  contactName?:
    | string
    | undefined;

  relationship?:
    | string
    | undefined;

  primaryPhone?:
    | string
    | undefined;

  alternatePhone?:
    | string
    | null
    | undefined;

  email?:
    | string
    | null
    | undefined;

  address?:
    | string
    | null
    | undefined;

  isPrimary?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Authentication and audit types
 * =========================================================
 */

export interface EmployeeDetailActor {
  userId: string;

  employeeId:
    | string
    | null;

  companyId:
    | string
    | null;

  isPlatformAdmin: boolean;

  permissions: string[];
}

export interface RequestMetadata {
  ipAddress:
    | string
    | null;

  userAgent:
    | string
    | null;
}
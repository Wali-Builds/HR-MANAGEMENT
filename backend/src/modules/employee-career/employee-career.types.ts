export type DatabaseId =
  | string
  | number
  | bigint;

export interface EmployeeCareerOwnerDatabaseRow {
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
 * Employee education
 * =========================================================
 */

export interface EmployeeEducationDatabaseRow {
  education_id: DatabaseId;
  employee_id: DatabaseId;

  qualification_level: string;
  degree_title: string;
  field_of_study: string | null;

  institution_name: string;
  board_university: string | null;

  city: string | null;
  country_code: string;

  start_date: Date | string | null;
  completion_date: Date | string | null;
  is_currently_studying: number | boolean;

  result_type: string | null;
  result_value: string | null;

  marks_percentage:
    | string
    | number
    | null;

  cgpa:
    | string
    | number
    | null;

  total_cgpa:
    | string
    | number
    | null;

  is_highest_qualification:
    number | boolean;

  certificate_document_path:
    string | null;

  is_verified: number | boolean;

  verified_by_user_id:
    DatabaseId | null;

  verified_at:
    Date | string | null;

  remarks: string | null;
  deleted_at: Date | string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeEducationResponse {
  educationId: string;
  employeeId: string;

  qualificationLevel: string;
  degreeTitle: string;
  fieldOfStudy: string | null;

  institutionName: string;
  boardUniversity: string | null;

  city: string | null;
  countryCode: string;

  startDate: string | null;
  completionDate: string | null;
  isCurrentlyStudying: boolean;

  resultType: string | null;
  resultValue: string | null;

  marksPercentage: number | null;
  cgpa: number | null;
  totalCgpa: number | null;

  isHighestQualification: boolean;

  certificateDocumentPath:
    string | null;

  isVerified: boolean;
  verifiedByUserId: string | null;
  verifiedAt: string | null;

  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeEducationRecord {
  employeeId: string;

  qualificationLevel: string;
  degreeTitle: string;
  fieldOfStudy: string | null;

  institutionName: string;
  boardUniversity: string | null;

  city: string | null;
  countryCode: string;

  startDate: string | null;
  completionDate: string | null;
  isCurrentlyStudying: boolean;

  resultType: string | null;
  resultValue: string | null;

  marksPercentage: number | null;
  cgpa: number | null;
  totalCgpa: number | null;

  isHighestQualification: boolean;

  certificateDocumentPath:
    string | null;

  remarks: string | null;
}

export interface UpdateEmployeeEducationRecord {
  qualificationLevel?:
    | string
    | undefined;

  degreeTitle?:
    | string
    | undefined;

  fieldOfStudy?:
    | string
    | null
    | undefined;

  institutionName?:
    | string
    | undefined;

  boardUniversity?:
    | string
    | null
    | undefined;

  city?:
    | string
    | null
    | undefined;

  countryCode?:
    | string
    | undefined;

  startDate?:
    | string
    | null
    | undefined;

  completionDate?:
    | string
    | null
    | undefined;

  isCurrentlyStudying?:
    | boolean
    | undefined;

  resultType?:
    | string
    | null
    | undefined;

  resultValue?:
    | string
    | null
    | undefined;

  marksPercentage?:
    | number
    | null
    | undefined;

  cgpa?:
    | number
    | null
    | undefined;

  totalCgpa?:
    | number
    | null
    | undefined;

  isHighestQualification?:
    | boolean
    | undefined;

  certificateDocumentPath?:
    | string
    | null
    | undefined;

  remarks?:
    | string
    | null
    | undefined;
}

/*
 * =========================================================
 * Employee experience
 * =========================================================
 */

export interface EmployeeExperienceDatabaseRow {
  experience_id: DatabaseId;
  employee_id: DatabaseId;

  employer_name: string;
  job_title: string;

  department: string | null;
  employment_type: string | null;

  location: string | null;
  country_code: string;

  start_date: Date | string;
  end_date: Date | string | null;

  is_current: number | boolean;

  responsibilities: string | null;

  last_drawn_salary:
    | string
    | number
    | null;

  currency_code: string;

  reason_for_leaving: string | null;

  reference_name: string | null;
  reference_phone: string | null;
  reference_email: string | null;

  experience_letter_path:
    string | null;

  is_verified: number | boolean;

  verified_by_user_id:
    DatabaseId | null;

  verified_at:
    Date | string | null;

  remarks: string | null;
  deleted_at: Date | string | null;

  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmployeeExperienceResponse {
  experienceId: string;
  employeeId: string;

  employerName: string;
  jobTitle: string;

  department: string | null;
  employmentType: string | null;

  location: string | null;
  countryCode: string;

  startDate: string;
  endDate: string | null;

  isCurrent: boolean;

  responsibilities: string | null;

  lastDrawnSalary: number | null;
  currencyCode: string;

  reasonForLeaving: string | null;

  referenceName: string | null;
  referencePhone: string | null;
  referenceEmail: string | null;

  experienceLetterPath:
    string | null;

  isVerified: boolean;
  verifiedByUserId: string | null;
  verifiedAt: string | null;

  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeExperienceRecord {
  employeeId: string;

  employerName: string;
  jobTitle: string;

  department: string | null;
  employmentType: string | null;

  location: string | null;
  countryCode: string;

  startDate: string;
  endDate: string | null;

  isCurrent: boolean;

  responsibilities: string | null;

  lastDrawnSalary: number | null;
  currencyCode: string;

  reasonForLeaving: string | null;

  referenceName: string | null;
  referencePhone: string | null;
  referenceEmail: string | null;

  experienceLetterPath:
    string | null;

  remarks: string | null;
}

export interface UpdateEmployeeExperienceRecord {
  employerName?:
    | string
    | undefined;

  jobTitle?:
    | string
    | undefined;

  department?:
    | string
    | null
    | undefined;

  employmentType?:
    | string
    | null
    | undefined;

  location?:
    | string
    | null
    | undefined;

  countryCode?:
    | string
    | undefined;

  startDate?:
    | string
    | undefined;

  endDate?:
    | string
    | null
    | undefined;

  isCurrent?:
    | boolean
    | undefined;

  responsibilities?:
    | string
    | null
    | undefined;

  lastDrawnSalary?:
    | number
    | null
    | undefined;

  currencyCode?:
    | string
    | undefined;

  reasonForLeaving?:
    | string
    | null
    | undefined;

  referenceName?:
    | string
    | null
    | undefined;

  referencePhone?:
    | string
    | null
    | undefined;

  referenceEmail?:
    | string
    | null
    | undefined;

  experienceLetterPath?:
    | string
    | null
    | undefined;

  remarks?:
    | string
    | null
    | undefined;
}

/*
 * =========================================================
 * Shared
 * =========================================================
 */

export interface EmployeeCareerActor {
  userId: string;
  employeeId: string | null;
  companyId: string | null;
  isPlatformAdmin: boolean;
  permissions: string[];
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
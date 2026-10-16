export type DatabaseId =
  | string
  | number
  | bigint;

/*
 * =========================================================
 * Employee owner
 * =========================================================
 */

export interface EmployeeCompetencyOwnerDatabaseRow {
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
 * Skill definitions and lookups
 * =========================================================
 */

export interface SkillLookupDatabaseRow {
  skill_id: DatabaseId;
  company_id: DatabaseId;

  skill_category_id: DatabaseId | null;
  category_code: string | null;
  category_name: string | null;

  skill_code: string;
  skill_name: string;
  description: string | null;

  skill_type: string;

  proficiency_scale_maximum:
    | string
    | number;

  measurement_method: string;

  is_certification_required:
    | number
    | boolean;

  is_active:
    | number
    | boolean;
}

export interface CertificationLookupDatabaseRow {
  certification_id: DatabaseId;
  company_id: DatabaseId;

  certification_code: string;
  certification_name: string;

  issuing_organization: string | null;
  certification_category: string | null;
  description: string | null;

  default_validity_months:
    | string
    | number
    | null;

  renewal_required:
    | number
    | boolean;

  related_skill_id:
    DatabaseId | null;

  related_skill_code:
    string | null;

  related_skill_name:
    string | null;

  is_mandatory:
    | number
    | boolean;

  is_active:
    | number
    | boolean;
}

export interface SkillLookupResponse {
  skillId: string;
  companyId: string;

  skillCategoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;

  skillCode: string;
  skillName: string;
  description: string | null;

  skillType: string;
  proficiencyScaleMaximum: number;
  measurementMethod: string;

  isCertificationRequired: boolean;
  isActive: boolean;
}

export interface CertificationLookupResponse {
  certificationId: string;
  companyId: string;

  certificationCode: string;
  certificationName: string;

  issuingOrganization: string | null;
  certificationCategory: string | null;
  description: string | null;

  defaultValidityMonths: number | null;
  renewalRequired: boolean;

  relatedSkillId: string | null;
  relatedSkillCode: string | null;
  relatedSkillName: string | null;

  isMandatory: boolean;
  isActive: boolean;
}

/*
 * =========================================================
 * Employee skills
 * =========================================================
 */

export interface EmployeeSkillDatabaseRow {
  employee_skill_id: DatabaseId;
  company_id: DatabaseId;
  employee_id: DatabaseId;
  skill_id: DatabaseId;

  skill_code: string;
  skill_name: string;
  skill_type: string;

  skill_category_id:
    DatabaseId | null;

  category_code:
    string | null;

  category_name:
    string | null;

  proficiency_scale_maximum:
    | string
    | number;

  measurement_method: string;

  is_certification_required:
    | number
    | boolean;

  proficiency_level:
    | string
    | number;

  target_proficiency_level:
    | string
    | number
    | null;

  years_of_experience:
    | string
    | number
    | null;

  source_type: string;

  is_primary_skill:
    | number
    | boolean;

  is_verified:
    | number
    | boolean;

  verified_by_user_id:
    DatabaseId | null;

  verified_at:
    Date | string | null;

  last_assessed_at:
    Date | string | null;

  next_assessment_date:
    Date | string | null;

  evidence_storage_path:
    string | null;

  remarks:
    string | null;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeSkillResponse {
  employeeSkillId: string;
  companyId: string;
  employeeId: string;
  skillId: string;

  skillCode: string;
  skillName: string;
  skillType: string;

  skillCategoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;

  proficiencyScaleMaximum: number;
  measurementMethod: string;
  isCertificationRequired: boolean;

  proficiencyLevel: number;
  targetProficiencyLevel: number | null;
  yearsOfExperience: number | null;

  sourceType: string;
  isPrimarySkill: boolean;

  isVerified: boolean;
  verifiedByUserId: string | null;
  verifiedAt: string | null;

  lastAssessedAt: string | null;
  nextAssessmentDate: string | null;

  evidenceStoragePath: string | null;
  remarks: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeSkillRecord {
  companyId: string;
  employeeId: string;
  skillId: string;

  proficiencyLevel: number;
  targetProficiencyLevel: number | null;
  yearsOfExperience: number | null;

  sourceType: string;
  isPrimarySkill: boolean;

  lastAssessedAt: string | null;
  nextAssessmentDate: string | null;

  evidenceStoragePath: string | null;
  remarks: string | null;
}

export interface UpdateEmployeeSkillRecord {
  proficiencyLevel?:
    | number
    | undefined;

  targetProficiencyLevel?:
    | number
    | null
    | undefined;

  yearsOfExperience?:
    | number
    | null
    | undefined;

  sourceType?:
    | string
    | undefined;

  isPrimarySkill?:
    | boolean
    | undefined;

  lastAssessedAt?:
    | string
    | null
    | undefined;

  nextAssessmentDate?:
    | string
    | null
    | undefined;

  evidenceStoragePath?:
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
 * Employee certifications
 * =========================================================
 */

export interface EmployeeCertificationDatabaseRow {
  employee_certification_id:
    DatabaseId;

  company_id:
    DatabaseId;

  employee_id:
    DatabaseId;

  certification_id:
    DatabaseId;

  certification_code: string;
  certification_name: string;

  definition_issuing_organization:
    string | null;

  certification_category:
    string | null;

  default_validity_months:
    | string
    | number
    | null;

  renewal_required:
    | number
    | boolean;

  related_skill_id:
    DatabaseId | null;

  related_skill_code:
    string | null;

  related_skill_name:
    string | null;

  is_mandatory:
    | number
    | boolean;

  training_enrollment_id:
    DatabaseId | null;

  certificate_number:
    string | null;

  issue_date:
    Date | string;

  expiry_date:
    Date | string | null;

  issuing_organization:
    string | null;

  verification_status:
    string;

  verified_by_user_id:
    DatabaseId | null;

  verified_at:
    Date | string | null;

  certificate_storage_path:
    string | null;

  checksum_sha256:
    string | null;

  renewal_status:
    string | null;

  renewal_reminder_sent_at:
    Date | string | null;

  is_active:
    number | boolean;

  created_at:
    Date | string;

  updated_at:
    Date | string;
}

export interface EmployeeCertificationResponse {
  employeeCertificationId: string;
  companyId: string;
  employeeId: string;
  certificationId: string;

  certificationCode: string;
  certificationName: string;

  definitionIssuingOrganization:
    string | null;

  certificationCategory:
    string | null;

  defaultValidityMonths:
    number | null;

  renewalRequired:
    boolean;

  relatedSkillId:
    string | null;

  relatedSkillCode:
    string | null;

  relatedSkillName:
    string | null;

  isMandatory:
    boolean;

  trainingEnrollmentId:
    string | null;

  certificateNumber:
    string | null;

  issueDate: string;
  expiryDate: string | null;

  issuingOrganization:
    string | null;

  verificationStatus:
    string;

  verifiedByUserId:
    string | null;

  verifiedAt:
    string | null;

  certificateStoragePath:
    string | null;

  checksumSha256:
    string | null;

  renewalStatus:
    string | null;

  renewalReminderSentAt:
    string | null;

  isActive:
    boolean;

  createdAt:
    string;

  updatedAt:
    string;
}

export interface CreateEmployeeCertificationRecord {
  companyId: string;
  employeeId: string;
  certificationId: string;

  trainingEnrollmentId:
    string | null;

  certificateNumber:
    string | null;

  issueDate: string;
  expiryDate: string | null;

  issuingOrganization:
    string | null;

  certificateStoragePath:
    string | null;

  checksumSha256:
    string | null;

  renewalStatus:
    string | null;

  isActive: boolean;
}

export interface UpdateEmployeeCertificationRecord {
  trainingEnrollmentId?:
    | string
    | null
    | undefined;

  certificateNumber?:
    | string
    | null
    | undefined;

  issueDate?:
    | string
    | undefined;

  expiryDate?:
    | string
    | null
    | undefined;

  issuingOrganization?:
    | string
    | null
    | undefined;

  certificateStoragePath?:
    | string
    | null
    | undefined;

  checksumSha256?:
    | string
    | null
    | undefined;

  renewalStatus?:
    | string
    | null
    | undefined;

  isActive?:
    | boolean
    | undefined;
}

/*
 * =========================================================
 * Shared
 * =========================================================
 */

export interface EmployeeCompetencyActor {
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
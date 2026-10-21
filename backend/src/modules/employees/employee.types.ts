export type DatabaseId =
  | string
  | number
  | bigint;

export interface EmployeeDatabaseRow {
  employee_id: DatabaseId;
  company_id: DatabaseId;

  employee_code: string;

  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;

  father_name: string | null;
  spouse_name: string | null;

  gender: string | null;
  date_of_birth: Date | string | null;
  marital_status: string | null;
  blood_group: string | null;
  nationality: string;

  cnic_number: string | null;
  passport_number: string | null;

  personal_email: string | null;
  official_email: string | null;
  mobile_number: string | null;
  alternate_number: string | null;

  employment_type_id: DatabaseId;
  employee_status_id: DatabaseId;

  joining_date: Date | string;
  probation_end_date: Date | string | null;
  confirmation_date: Date | string | null;
  contract_start_date: Date | string | null;
  contract_end_date: Date | string | null;
  resignation_date: Date | string | null;
  last_working_date: Date | string | null;

  profile_photo_path: string | null;
  biometric_identifier: string | null;
  remarks: string | null;

  is_active: number | boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  employment_type_code: string;
  employment_type_name: string;

  employee_status_code: string;
  employee_status_name: string;
  is_active_employment:
    number | boolean;

  assignment_id: DatabaseId | null;

  branch_id: DatabaseId | null;
  branch_name: string | null;

  department_id: DatabaseId | null;
  department_name: string | null;
  project_id: DatabaseId | null;
  project_code: string | null;
  project_name: string | null;

  designation_id: DatabaseId | null;
  designation_name: string | null;

  reporting_manager_id:
    DatabaseId | null;

  reporting_manager_code:
    string | null;

  reporting_manager_name:
    string | null;

  assignment_type: string | null;
  assignment_effective_from:
    Date | string | null;

  assignment_effective_to:
    Date | string | null;

  work_location: string | null;

  employment_percentage:
    string | number | null;

  transfer_reason: string | null;

  position_assignment_id:
    DatabaseId | null;

  position_id: DatabaseId | null;
  position_code: string | null;
  position_title: string | null;
}

export interface EmployeeAssignmentResponse {
  assignmentId: string | null;

  branchId: string | null;
  branchName: string | null;

  departmentId: string | null;
  departmentName: string | null;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;

  designationId: string | null;
  designationName: string | null;

  reportingManagerId: string | null;
  reportingManagerCode: string | null;
  reportingManagerName: string | null;

  positionAssignmentId: string | null;

  positionId: string | null;
  positionCode: string | null;
  positionTitle: string | null;

  assignmentType: string | null;

  effectiveFrom: string | null;
  effectiveTo: string | null;

  workLocation: string | null;

  employmentPercentage:
    number | null;

  transferReason: string | null;
}

export interface EmployeeResponse {
  employeeId: string;
  companyId: string;

  employeeCode: string;

  firstName: string;
  middleName: string | null;
  lastName: string | null;
  preferredName: string | null;

  fullName: string;

  fatherName: string | null;
  spouseName: string | null;

  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  nationality: string;

  cnicNumber: string | null;
  passportNumber: string | null;

  personalEmail: string | null;
  officialEmail: string | null;
  mobileNumber: string | null;
  alternateNumber: string | null;

  employmentTypeId: string;
  employmentTypeCode: string;
  employmentTypeName: string;

  employeeStatusId: string;
  employeeStatusCode: string;
  employeeStatusName: string;
  isActiveEmployment: boolean;

  joiningDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;

  contractStartDate: string | null;
  contractEndDate: string | null;

  resignationDate: string | null;
  lastWorkingDate: string | null;

  profilePhotoPath: string | null;
  biometricIdentifier: string | null;
  remarks: string | null;

  isActive: boolean;

  assignment:
    EmployeeAssignmentResponse;

  createdAt: string;
  updatedAt: string;
}

// edited by wali: Expose the employee's own useful profile and assignment details without private identifiers.
export interface EmployeeSelfProfileResponse {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  dateOfBirth: Date | string | null;
  maritalStatus: string | null;
  nationality: string;
  officialEmail: string | null;
  personalEmail: string | null;
  mobileNumber: string | null;
  alternateNumber: string | null;
  companyId: string;
  companyCode: string;
  companyName: string;
  branchName: string | null;
  departmentName: string | null;
  designationName: string | null;
  positionTitle: string | null;
  reportingManagerName: string | null;
  assignmentType: string | null;
  assignmentEffectiveFrom: Date | string | null;
  workLocation: string | null;
  employmentPercentage: number | string | null;
  employmentTypeName: string;
  employeeStatusName: string;
  isActiveEmployment: boolean;
  joiningDate: Date | string;
  probationEndDate: Date | string | null;
  confirmationDate: Date | string | null;
  contractStartDate: Date | string | null;
  contractEndDate: Date | string | null;
  resignationDate: Date | string | null;
  lastWorkingDate: Date | string | null;
}

export interface EmployeeListOptions {
  page: number;
  limit: number;

  companyId: string | null;

  branchId?: string;
  // edited by wali: Limit employee lists to branches assigned to the Branch Admin.
  branchIds?: string[];
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string;
  positionId?: string;

  employmentTypeId?: string;
  employeeStatusId?: string;

  search?: string;
  gender?: string;

  isActive?: boolean;

  joiningDateFrom?: string;
  joiningDateTo?: string;

  sortBy:
    | "employee_code"
    | "first_name"
    | "joining_date"
    | "created_at"
    | "updated_at";

  sortOrder: "ASC" | "DESC";
}

export interface EmployeeListResult {
  employees: EmployeeDatabaseRow[];
  total: number;
}

export interface EmployeeActor {
  userId: string;
  companyId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface EmployeeAssignmentMutation {
  branchId: string | null;
  departmentId: string | null;
  projectId: string | null;
  designationId: string | null;

  reportingManagerId: string | null;
  positionId: string | null;

  assignmentType: string;
  effectiveFrom: string;

  workLocation: string | null;

  employmentPercentage: number;

  transferReason: string | null;
}

export interface EmployeeCreateRecord {
  companyId: string;
  employeeCode: string | null;

  firstName: string;
  middleName: string | null;
  lastName: string | null;
  preferredName: string | null;

  fatherName: string | null;
  spouseName: string | null;

  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  nationality: string;

  cnicNumber: string | null;
  passportNumber: string | null;

  personalEmail: string | null;
  officialEmail: string | null;
  mobileNumber: string | null;
  alternateNumber: string | null;

  employmentTypeId: string;
  employeeStatusId: string;

  joiningDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;

  contractStartDate: string | null;
  contractEndDate: string | null;

  resignationDate: string | null;
  lastWorkingDate: string | null;

  profilePhotoPath: string | null;
  biometricIdentifier: string | null;
  remarks: string | null;

  isActive: boolean;

  assignment:
    EmployeeAssignmentMutation;
}

export interface EmploymentTypeLookup {
  employmentTypeId: string;
  typeCode: string;
  typeName: string;
}

export interface EmployeeStatusLookup {
  employeeStatusId: string;
  statusCode: string;
  statusName: string;
  isActiveEmployment: boolean;
}

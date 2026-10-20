export interface EmployeeAssignment {
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
  employmentPercentage: number | null;
  transferReason: string | null;
}

export interface Employee {
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
  assignment: EmployeeAssignment;
  createdAt: string;
  updatedAt: string;
}

// edited by wali: Match the employee's own safe profile, contact, employment, and assignment details.
export interface EmployeeSelfProfile {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
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
  assignmentEffectiveFrom: string | null;
  workLocation: string | null;
  employmentPercentage: number | null;
  employmentTypeName: string;
  employeeStatusName: string;
  isActiveEmployment: boolean;
  joiningDate: string;
  probationEndDate: string | null;
  confirmationDate: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  resignationDate: string | null;
  lastWorkingDate: string | null;
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

export interface EmployeeLookups {
  employmentTypes: EmploymentTypeLookup[];
  employeeStatuses: EmployeeStatusLookup[];
}

export interface BranchReference {
  branchId: string;
  companyId: string;
  branchCode: string;
  branchName: string;
  city: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
}

export interface DepartmentReference {
  departmentId: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
}

export interface DesignationReference {
  designationId: string;
  companyId: string;
  // edited by wali: Used to filter assignment choices by the selected department.
  departmentId: string | null;
  designationCode: string;
  designationName: string;
  grade: string | null;
  jobLevel: number | null;
  isManagerial: boolean;
  isActive: boolean;
}

export interface PositionReference {
  positionId: string;
  companyId: string;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  positionCode: string;
  positionTitle: string;
  positionType: string;
  availableHeadcount: number;
  positionStatus: string;
}

export type EmployeeSortField =
  | "employee_code"
  | "first_name"
  | "joining_date"
  | "created_at"
  | "updated_at";

export type SortOrder = "ASC" | "DESC";

export interface EmployeeListParams {
  page: number;
  limit: number;
  companyId?: string;
  branchId?: string;
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
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListResult {
  employees: Employee[];
  pagination: Pagination;
}

export interface EmployeeAssignmentInput {
  branchId: string | null;
  departmentId: string | null;
  projectId: string | null;
  designationId: string | null;
  reportingManagerId: string | null;
  positionId: string | null;
  assignmentType: string;
  effectiveFrom: string;
  workLocation: string | null;
  employmentPercentage?: number;
  transferReason: string | null;
}

export interface EmployeeMutationInput {
  companyId?: string;
  employeeCode?: string;
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
  assignment?: EmployeeAssignmentInput;
}

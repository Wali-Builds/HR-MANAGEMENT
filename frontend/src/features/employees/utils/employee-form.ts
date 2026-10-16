import type { Employee, EmployeeMutationInput } from "../types/employee.types";
import type { EmployeeFormValues } from "../schemas/employee.schema";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const employeeDefaultValues: EmployeeFormValues = {
  companyId: "",
  employeeCode: "",
  firstName: "",
  middleName: "",
  lastName: "",
  preferredName: "",
  fatherName: "",
  spouseName: "",
  gender: "",
  dateOfBirth: "",
  maritalStatus: "",
  bloodGroup: "",
  nationality: "Pakistan",
  cnicNumber: "",
  passportNumber: "",
  personalEmail: "",
  officialEmail: "",
  mobileNumber: "",
  alternateNumber: "",
  employmentTypeId: "",
  employeeStatusId: "",
  joiningDate: today(),
  probationEndDate: "",
  confirmationDate: "",
  contractStartDate: "",
  contractEndDate: "",
  resignationDate: "",
  lastWorkingDate: "",
  profilePhotoPath: "",
  biometricIdentifier: "",
  remarks: "",
  isActive: true,
  branchId: "",
  departmentId: "",
  projectId: "",
  designationId: "",
  reportingManagerId: "",
  positionId: "",
  assignmentType: "PRIMARY",
  assignmentEffectiveFrom: today(),
  workLocation: "",
  employmentPercentage: 100,
  transferReason: "",
};

export function employeeToFormValues(employee: Employee): EmployeeFormValues {
  return {
    companyId: employee.companyId,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    middleName: employee.middleName ?? "",
    lastName: employee.lastName ?? "",
    preferredName: employee.preferredName ?? "",
    fatherName: employee.fatherName ?? "",
    spouseName: employee.spouseName ?? "",
    gender: employee.gender ?? "",
    dateOfBirth: employee.dateOfBirth ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    bloodGroup: employee.bloodGroup ?? "",
    nationality: employee.nationality,
    cnicNumber: employee.cnicNumber ?? "",
    passportNumber: employee.passportNumber ?? "",
    personalEmail: employee.personalEmail ?? "",
    officialEmail: employee.officialEmail ?? "",
    mobileNumber: employee.mobileNumber ?? "",
    alternateNumber: employee.alternateNumber ?? "",
    employmentTypeId: employee.employmentTypeId,
    employeeStatusId: employee.employeeStatusId,
    joiningDate: employee.joiningDate,
    probationEndDate: employee.probationEndDate ?? "",
    confirmationDate: employee.confirmationDate ?? "",
    contractStartDate: employee.contractStartDate ?? "",
    contractEndDate: employee.contractEndDate ?? "",
    resignationDate: employee.resignationDate ?? "",
    lastWorkingDate: employee.lastWorkingDate ?? "",
    profilePhotoPath: employee.profilePhotoPath ?? "",
    biometricIdentifier: employee.biometricIdentifier ?? "",
    remarks: employee.remarks ?? "",
    isActive: employee.isActive,
    branchId: employee.assignment.branchId ?? "",
    departmentId: employee.assignment.departmentId ?? "",
    projectId: employee.assignment.projectId ?? "",
    designationId: employee.assignment.designationId ?? "",
    reportingManagerId: employee.assignment.reportingManagerId ?? "",
    positionId: employee.assignment.positionId ?? "",
    assignmentType: employee.assignment.assignmentType ?? "PRIMARY",
    assignmentEffectiveFrom: employee.assignment.effectiveFrom ?? today(),
    workLocation: employee.assignment.workLocation ?? "",
    employmentPercentage: employee.assignment.employmentPercentage ?? 100,
    transferReason: employee.assignment.transferReason ?? "",
  };
}

function assignmentChanged(values: EmployeeFormValues, employee: Employee): boolean {
  return (
    (values.branchId || null) !== employee.assignment.branchId ||
    (values.departmentId || null) !== employee.assignment.departmentId ||
    (values.projectId || null) !== employee.assignment.projectId ||
    (values.designationId || null) !== employee.assignment.designationId ||
    (values.reportingManagerId || null) !== employee.assignment.reportingManagerId ||
    (values.positionId || null) !== employee.assignment.positionId ||
    values.assignmentType !== (employee.assignment.assignmentType ?? "PRIMARY") ||
    nullable(values.workLocation) !== employee.assignment.workLocation ||
      (values.employmentPercentage ?? 100) !== (employee.assignment.employmentPercentage ?? 100) ||
    nullable(values.transferReason) !== employee.assignment.transferReason
  );
}

export function toEmployeeMutationInput(
  values: EmployeeFormValues,
  existingEmployee?: Employee,
): EmployeeMutationInput {
  const input: EmployeeMutationInput = {
    // edited by wali: The backend accepts companyId on create only; employee edits retain their existing company.
    ...(!existingEmployee && values.companyId ? { companyId: values.companyId } : {}),
    ...(values.employeeCode ? { employeeCode: values.employeeCode } : {}),
    firstName: values.firstName.trim(),
    middleName: nullable(values.middleName),
    lastName: nullable(values.lastName),
    preferredName: nullable(values.preferredName),
    fatherName: nullable(values.fatherName),
    spouseName: nullable(values.spouseName),
    gender: nullable(values.gender),
    dateOfBirth: nullable(values.dateOfBirth),
    maritalStatus: nullable(values.maritalStatus),
    bloodGroup: nullable(values.bloodGroup),
    nationality: values.nationality.trim(),
    cnicNumber: nullable(values.cnicNumber),
    passportNumber: nullable(values.passportNumber),
    personalEmail: nullable(values.personalEmail),
    officialEmail: nullable(values.officialEmail),
    mobileNumber: nullable(values.mobileNumber),
    alternateNumber: nullable(values.alternateNumber),
    employmentTypeId: values.employmentTypeId,
    employeeStatusId: values.employeeStatusId,
    joiningDate: values.joiningDate,
    probationEndDate: nullable(values.probationEndDate),
    confirmationDate: nullable(values.confirmationDate),
    contractStartDate: nullable(values.contractStartDate),
    contractEndDate: nullable(values.contractEndDate),
    resignationDate: nullable(values.resignationDate),
    lastWorkingDate: nullable(values.lastWorkingDate),
    profilePhotoPath: nullable(values.profilePhotoPath),
    biometricIdentifier: nullable(values.biometricIdentifier),
    remarks: nullable(values.remarks),
    isActive: values.isActive,
  };

  if (!existingEmployee || assignmentChanged(values, existingEmployee)) {
    input.assignment = {
      branchId: nullable(values.branchId),
      departmentId: nullable(values.departmentId),
      projectId: nullable(values.projectId),
      designationId: nullable(values.designationId),
      reportingManagerId: nullable(values.reportingManagerId),
      positionId: nullable(values.positionId),
      assignmentType: values.assignmentType,
      effectiveFrom: values.assignmentEffectiveFrom || values.joiningDate,
      workLocation: nullable(values.workLocation),
      ...(values.employmentPercentage !== undefined
        ? { employmentPercentage: values.employmentPercentage }
        : {}),
      transferReason: nullable(values.transferReason),
    };
  }

  return input;
}

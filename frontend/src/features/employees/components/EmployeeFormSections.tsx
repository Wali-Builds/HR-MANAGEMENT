import {
  BriefcaseBusiness,
  CalendarDays,
  Contact,
  Fingerprint,
  MapPin,
  UserRound,
} from "lucide-react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";

import type { Company } from "../../companies/types/company.types";
import type { ProjectReference } from "../api/employee.api";
import { EmployeeMenuSelect, type EmployeeSelectOption } from "./EmployeeMenuSelect";
import type { EmployeeFormInputValues } from "../schemas/employee.schema";
import type {
  BranchReference,
  DepartmentReference,
  DesignationReference,
  Employee,
  EmployeeLookups,
  PositionReference,
} from "../types/employee.types";

interface ReferenceData {
  branches: BranchReference[];
  departments: DepartmentReference[];
  designations: DesignationReference[];
  positions: PositionReference[];
  managers: Employee[];
  projects: ProjectReference[];
  isLoading: boolean;
}

interface Props {
  register: UseFormRegister<EmployeeFormInputValues>;
  watch: UseFormWatch<EmployeeFormInputValues>;
  setValue: UseFormSetValue<EmployeeFormInputValues>;
  isHiring: boolean;
  errors: FieldErrors<EmployeeFormInputValues>;
  lookups?: EmployeeLookups;
  references: ReferenceData;
  companies: Company[];
  isPlatformAdmin: boolean;
  currentEmployeeId?: string;
}

function FieldError({ message }: { message?: string }) {
  return message ? <small className="emp-field-error">{message}</small> : null;
}

const COUNTRIES = `Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cabo Verde|Cambodia|Cameroon|Canada|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo|Costa Rica|Côte d’Ivoire|Croatia|Cuba|Cyprus|Czechia|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe`.split("|");
const COUNTRY_OPTIONS: EmployeeSelectOption[] = COUNTRIES.map((country) => ({ value: country, label: country }));
const SIMPLE_OPTIONS = (values: string[]): EmployeeSelectOption[] => values.map((value) => ({ value, label: value }));

export function EmployeeFormSections(props: Props) {
  const branchId = props.watch("branchId");
  const departmentId = props.watch("departmentId");
  const availableManagers = props.references.managers.filter((item) =>
    (!branchId || item.assignment.branchId === branchId) &&
    (!departmentId || item.assignment.departmentId === departmentId),
  );
  const filteredDepartments = branchId
    ? props.references.departments.filter((item) => !item.branchId || item.branchId === branchId)
    : props.references.departments;
  const designationId = props.watch("designationId");
  // edited by wali: Filter designation and position options by the selected department.
  const filteredPositions = designationId
    ? props.references.positions.filter(
        (position) => position.designationId === designationId,
      )
    : [];
  const nationality = props.watch("nationality");
  const nationalityOptions = nationality && !COUNTRIES.includes(nationality)
    ? [...COUNTRY_OPTIONS, { value: nationality, label: nationality }]
    : COUNTRY_OPTIONS;

  return (
    <div className="emp-form-sections">
      <section className="emp-form-section">
        <header><span><UserRound size={18} /></span><div><h2>Identity</h2><p>Core employee identity and personal profile</p></div></header>
        <div className="emp-form-grid emp-form-grid--3">
          {props.isPlatformAdmin ? (
            <label className="emp-field emp-field--wide">
              <span>Company <b>*</b></span>
              <EmployeeMenuSelect value={props.watch("companyId")} placeholder="Select company" options={props.companies.map((company) => ({ value: company.companyId, label: company.displayName }))} onChange={(value) => props.setValue("companyId", value, { shouldDirty: true, shouldValidate: true })} />
              <FieldError message={props.errors.companyId?.message} />
            </label>
          ) : null}
          <label className="emp-field">
            <span>Employee code</span>
            <input {...props.register("employeeCode")} placeholder="Auto-generated when empty" />
            <FieldError message={props.errors.employeeCode?.message} />
          </label>
          <label className="emp-field"><span>First name <b>*</b></span><input {...props.register("firstName")} /><FieldError message={props.errors.firstName?.message} /></label>
          <label className="emp-field"><span>Middle name</span><input {...props.register("middleName")} /></label>
          <label className="emp-field"><span>Last name <b>*</b></span><input {...props.register("lastName")} /><FieldError message={props.errors.lastName?.message} /></label>
          <label className="emp-field"><span>Preferred name</span><input {...props.register("preferredName")} /></label>
          <label className="emp-field"><span>Gender <b>*</b></span><EmployeeMenuSelect value={props.watch("gender")} placeholder="Select gender" options={SIMPLE_OPTIONS(["Male", "Female", "Other", "Prefer not to say"])} onChange={(value) => props.setValue("gender", value, { shouldDirty: true, shouldValidate: true })} /><FieldError message={props.errors.gender?.message} /></label>
          <label className="emp-field"><span>Date of birth <b>*</b></span><input type="date" {...props.register("dateOfBirth")} /><FieldError message={props.errors.dateOfBirth?.message} /></label>
          <label className="emp-field"><span>Marital status <b>*</b></span><EmployeeMenuSelect value={props.watch("maritalStatus")} placeholder="Select marital status" options={SIMPLE_OPTIONS(["Single", "Married", "Divorced", "Widowed"])} onChange={(value) => props.setValue("maritalStatus", value, { shouldDirty: true, shouldValidate: true })} /><FieldError message={props.errors.maritalStatus?.message} /></label>
          <label className="emp-field"><span>Nationality <b>*</b></span><EmployeeMenuSelect value={nationality} placeholder="Select nationality" options={nationalityOptions} searchable searchPlaceholder="Search nationalities" onChange={(value) => props.setValue("nationality", value, { shouldDirty: true, shouldValidate: true })} /><FieldError message={props.errors.nationality?.message} /></label>
          <label className="emp-field"><span>Blood group <b>*</b></span><EmployeeMenuSelect value={props.watch("bloodGroup")} placeholder="Select blood group" options={SIMPLE_OPTIONS(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])} onChange={(value) => props.setValue("bloodGroup", value, { shouldDirty: true, shouldValidate: true })} /><FieldError message={props.errors.bloodGroup?.message} /></label>
          <label className="emp-field"><span>Father name</span><input {...props.register("fatherName")} /></label>
          <label className="emp-field"><span>Spouse name</span><input {...props.register("spouseName")} /></label>
        </div>
      </section>

      <section className="emp-form-section">
        <header><span><BriefcaseBusiness size={18} /></span><div><h2>Employment & assignment</h2><p>Placement, role, reporting line and employment status</p></div></header>
        <div className="emp-form-grid emp-form-grid--3">
          <label className="emp-field"><span>Employment type <b>*</b></span><EmployeeMenuSelect value={props.watch("employmentTypeId")} placeholder="Select type" options={(props.lookups?.employmentTypes ?? []).map((item) => ({ value: item.employmentTypeId, label: item.typeName }))} onChange={(value) => props.setValue("employmentTypeId", value, { shouldDirty: true, shouldValidate: true })} disabled={props.references.isLoading} /><FieldError message={props.errors.employmentTypeId?.message} /></label>
          <label className="emp-field"><span>Employee status <b>*</b></span><EmployeeMenuSelect value={props.watch("employeeStatusId")} placeholder="Select status" options={(props.lookups?.employeeStatuses ?? []).map((item) => ({ value: item.employeeStatusId, label: item.statusName }))} onChange={(value) => props.setValue("employeeStatusId", value, { shouldDirty: true, shouldValidate: true })} disabled={props.references.isLoading} /><FieldError message={props.errors.employeeStatusId?.message} /></label>
          <label className="emp-field"><span>Joining date <b>*</b></span><input type="date" {...props.register("joiningDate")} /><FieldError message={props.errors.joiningDate?.message} /></label>
          <label className="emp-field"><span>Branch {props.isHiring ? <b>*</b> : null}</span><EmployeeMenuSelect value={branchId} placeholder={props.isHiring ? "Select branch" : "No branch"} options={props.references.branches.map((item) => ({ value: item.branchId, label: item.branchName }))} onChange={(value) => { props.setValue("branchId", value, { shouldDirty: true, shouldValidate: true }); props.setValue("departmentId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("designationId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("reportingManagerId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("projectId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("positionId", "", { shouldDirty: true, shouldValidate: true }); }} disabled={props.references.isLoading} /><FieldError message={props.errors.branchId?.message} /></label>
          <label className="emp-field"><span>Department {props.isHiring ? <b>*</b> : null}</span><EmployeeMenuSelect value={departmentId} placeholder={!branchId ? "Select branch first" : props.isHiring ? "Select department" : "No department"} options={filteredDepartments.map((item) => ({ value: item.departmentId, label: item.departmentName }))} onChange={(value) => { props.setValue("departmentId", value, { shouldDirty: true, shouldValidate: true }); props.setValue("designationId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("reportingManagerId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("projectId", "", { shouldDirty: true, shouldValidate: true }); props.setValue("positionId", "", { shouldDirty: true, shouldValidate: true }); }} disabled={props.references.isLoading || !branchId} /><FieldError message={props.errors.departmentId?.message} /></label>
          <label className="emp-field"><span>Designation {props.isHiring ? <b>*</b> : null}</span><EmployeeMenuSelect value={designationId} placeholder={!departmentId ? "Select department first" : props.isHiring ? "Select designation" : "No designation"} options={props.references.designations.filter((item) => item.departmentId === departmentId).map((item) => ({ value: item.designationId, label: item.designationName }))} onChange={(value) => { props.setValue("designationId", value, { shouldDirty: true, shouldValidate: true }); props.setValue("positionId", "", { shouldDirty: true, shouldValidate: true }); }} disabled={props.references.isLoading || !departmentId} /><FieldError message={props.errors.designationId?.message} /></label>
          {/* edited by wali: Mark Position as required in both hiring and employee edit forms. */}
          <label className="emp-field"><span>Position <b>*</b></span><EmployeeMenuSelect value={props.watch("positionId")} placeholder={!departmentId ? "Select department first" : !designationId ? "Select designation first" : "Select position"} options={filteredPositions.map((item) => ({ value: item.positionId, label: `${item.positionTitle} (${item.positionCode})` }))} onChange={(value) => props.setValue("positionId", value, { shouldDirty: true, shouldValidate: true })} disabled={props.references.isLoading || !departmentId || !designationId} /><FieldError message={props.errors.positionId?.message} /></label>
          <label className="emp-field"><span>Project</span><EmployeeMenuSelect value={props.watch("projectId")} placeholder={!departmentId ? "Select department first" : "No project"} options={props.references.projects.map((item) => ({ value: item.projectId, label: `${item.projectName} (${item.projectCode})` }))} onChange={(value) => props.setValue("projectId", value, { shouldDirty: true, shouldValidate: true })} disabled={!departmentId} /></label>
          <label className="emp-field"><span>Reporting manager</span><EmployeeMenuSelect value={props.watch("reportingManagerId")} placeholder={!departmentId ? "Select department first" : "No manager"} options={availableManagers.filter((item) => item.employeeId !== props.currentEmployeeId).map((item) => ({ value: item.employeeId, label: `${item.fullName} · ${item.employeeCode}` }))} onChange={(value) => props.setValue("reportingManagerId", value, { shouldDirty: true, shouldValidate: true })} disabled={props.references.isLoading || !departmentId} /></label>
          <label className="emp-field"><span>Assignment type <b>*</b></span><EmployeeMenuSelect value={props.watch("assignmentType")} placeholder="Select assignment type" options={SIMPLE_OPTIONS(["PRIMARY", "ACTING", "SECONDMENT", "TEMPORARY"]).map((option) => ({ ...option, label: option.label[0] + option.label.slice(1).toLowerCase() }))} onChange={(value) => props.setValue("assignmentType", value, { shouldDirty: true, shouldValidate: true })} /><FieldError message={props.errors.assignmentType?.message} /></label>
          <label className="emp-field"><span>Assignment effective from <b>*</b></span><input type="date" {...props.register("assignmentEffectiveFrom")} /><FieldError message={props.errors.assignmentEffectiveFrom?.message} /></label>
          <label className="emp-field"><span>Employment percentage</span><input type="number" min="0.01" max="100" step="0.01" {...props.register("employmentPercentage", { valueAsNumber: true })} /><FieldError message={props.errors.employmentPercentage?.message} /></label>
          <label className="emp-field emp-field--wide"><span><MapPin size={13} /> Work location</span><input {...props.register("workLocation")} placeholder="Office, site, city or remote" /></label>
          <label className="emp-field emp-field--wide"><span>Transfer / assignment reason</span><input {...props.register("transferReason")} /></label>
        </div>
      </section>

      <section className="emp-form-section">
        <header><span><Contact size={18} /></span><div><h2>Contact & identification</h2><p>Communication details and official identity references</p></div></header>
        <div className="emp-form-grid emp-form-grid--3">
          {/* edited by wali: Show which contact details are required during new employee creation. */}
          <label className="emp-field"><span>Official email {props.isHiring ? <b>*</b> : null}</span><input type="email" {...props.register("officialEmail")} /><FieldError message={props.errors.officialEmail?.message} /></label>
          <label className="emp-field"><span>Personal email {props.isHiring ? <b>*</b> : null}</span><input type="email" {...props.register("personalEmail")} /><FieldError message={props.errors.personalEmail?.message} /></label>
          <label className="emp-field"><span>Mobile number {props.isHiring ? <b>*</b> : null}</span><input {...props.register("mobileNumber")} /><FieldError message={props.errors.mobileNumber?.message} /></label>
          <label className="emp-field"><span>Emergency number {props.isHiring ? <b>*</b> : null}</span><input {...props.register("alternateNumber")} /><FieldError message={props.errors.alternateNumber?.message} /></label>
          <label className="emp-field"><span>CNIC number <b>*</b></span><input {...props.register("cnicNumber")} /><FieldError message={props.errors.cnicNumber?.message} /></label>
          <label className="emp-field"><span>Passport number</span><input {...props.register("passportNumber")} /></label>
        </div>
      </section>

      <section className="emp-form-section">
        <header><span><CalendarDays size={18} /></span><div><h2>Employment dates</h2><p>Probation, confirmation, contract and separation timeline</p></div></header>
        <div className="emp-form-grid emp-form-grid--3">
          <label className="emp-field"><span>Probation end</span><input type="date" {...props.register("probationEndDate")} /><FieldError message={props.errors.probationEndDate?.message} /></label>
          <label className="emp-field"><span>Confirmation date</span><input type="date" {...props.register("confirmationDate")} /><FieldError message={props.errors.confirmationDate?.message} /></label>
          <label className="emp-field"><span>Contract start</span><input type="date" {...props.register("contractStartDate")} /></label>
          <label className="emp-field"><span>Contract end</span><input type="date" {...props.register("contractEndDate")} /><FieldError message={props.errors.contractEndDate?.message} /></label>
          <label className="emp-field"><span>Resignation date</span><input type="date" {...props.register("resignationDate")} /><FieldError message={props.errors.resignationDate?.message} /></label>
          <label className="emp-field"><span>Last working date</span><input type="date" {...props.register("lastWorkingDate")} /><FieldError message={props.errors.lastWorkingDate?.message} /></label>
        </div>
      </section>

      <section className="emp-form-section">
        <header><span><Fingerprint size={18} /></span><div><h2>System details</h2><p>Profile media, biometric reference and internal notes</p></div></header>
        <div className="emp-form-grid emp-form-grid--2">
          <label className="emp-field"><span>Profile photo path / URL</span><input {...props.register("profilePhotoPath")} placeholder="Stored file path or image URL" /></label>
          <label className="emp-field"><span>Biometric identifier</span><input {...props.register("biometricIdentifier")} /></label>
          <label className="emp-field emp-field--full"><span>Remarks</span><textarea rows={4} {...props.register("remarks")} /></label>
          <label className="emp-toggle-field"><input type="checkbox" {...props.register("isActive")} /><span><strong>Active employee record</strong><small>Active records consume an employee seat under the company subscription.</small></span></label>
        </div>
      </section>
    </div>
  );
}

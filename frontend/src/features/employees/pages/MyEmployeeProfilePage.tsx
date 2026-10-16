// edited by wali: Show expanded self-service employee details in a compact, readable profile.
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, UserRound } from "lucide-react";

import { normalizeApiError } from "../../../api/api-error";
import { getMyEmployeeProfileRequest } from "../api/employee.api";
import type { EmployeeSelfProfile } from "../types/employee.types";
import "../employees-workspace.css";

type ProfileRow = { label: string; value: string };
type ProfileSection = { title: string; rows: ProfileRow[] };

function displayValue(value: string | number | null): string {
  return value === null || value === "" ? "Not provided" : String(value);
}

function displayDate(value: string | null): string {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function buildProfileSections(profile: EmployeeSelfProfile): ProfileSection[] {
  return [
    {
      title: "Personal details",
      rows: [
        { label: "Preferred name", value: displayValue(profile.preferredName) },
        { label: "Gender", value: displayValue(profile.gender) },
        { label: "Date of birth", value: displayDate(profile.dateOfBirth) },
        { label: "Marital status", value: displayValue(profile.maritalStatus) },
        { label: "Nationality", value: displayValue(profile.nationality) },
      ],
    },
    {
      title: "Contact details",
      rows: [
        { label: "Official email", value: displayValue(profile.officialEmail) },
        { label: "Personal email", value: displayValue(profile.personalEmail) },
        { label: "Mobile number", value: displayValue(profile.mobileNumber) },
        { label: "Emergency number", value: displayValue(profile.alternateNumber) },
      ],
    },
    {
      title: "Work and assignment",
      rows: [
        { label: "Company", value: profile.companyName },
        { label: "Company code", value: profile.companyCode },
        { label: "Branch", value: displayValue(profile.branchName) },
        { label: "Department", value: displayValue(profile.departmentName) },
        { label: "Designation", value: displayValue(profile.designationName) },
        { label: "Position", value: displayValue(profile.positionTitle) },
        { label: "Reporting manager", value: displayValue(profile.reportingManagerName) },
        { label: "Employment type", value: profile.employmentTypeName },
        { label: "Assignment type", value: displayValue(profile.assignmentType) },
        { label: "Work location", value: displayValue(profile.workLocation) },
        { label: "Employment percentage", value: profile.employmentPercentage === null ? "Not provided" : `${profile.employmentPercentage}%` },
        { label: "Assignment effective from", value: displayDate(profile.assignmentEffectiveFrom) },
      ],
    },
    {
      title: "Employment dates",
      rows: [
        { label: "Joining date", value: displayDate(profile.joiningDate) },
        { label: "Probation ends", value: displayDate(profile.probationEndDate) },
        { label: "Confirmation date", value: displayDate(profile.confirmationDate) },
        { label: "Contract starts", value: displayDate(profile.contractStartDate) },
        { label: "Contract ends", value: displayDate(profile.contractEndDate) },
        { label: "Resignation date", value: displayDate(profile.resignationDate) },
        { label: "Last working date", value: displayDate(profile.lastWorkingDate) },
      ],
    },
  ];
}

export function MyEmployeeProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["employee-self-profile"],
    queryFn: getMyEmployeeProfileRequest,
  });

  if (profileQuery.isLoading) {
    return <div className="emp-full-page-state"><LoaderCircle className="spin" size={26} /><p>Loading your profile...</p></div>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="employee-self-profile">
        <section className="emp-full-page-state">
          <UserRound size={30} />
          <h1>Profile unavailable</h1>
          <p>{profileQuery.isError ? normalizeApiError(profileQuery.error).message : "Your employee profile could not be found."}</p>
        </section>
      </main>
    );
  }

  const profile = profileQuery.data;
  const sections = buildProfileSections(profile);

  return (
    <main className="employee-self-profile">
      <header className="employee-self-profile__header">
        <div>
          <span className="employee-self-profile__eyebrow">Employee workspace</span>
          <h1>My profile</h1>
        </div>
      </header>

      {/* edited by wali: Keep the identity row small and place the employment status beside the employee name. */}
      <section className="employee-self-profile__identity">
        <div><h2>{profile.fullName}</h2><p>{profile.employeeCode} · {profile.companyName}</p></div>
        <span className={profile.isActiveEmployment ? "employee-self-profile__status is-active" : "employee-self-profile__status"}>
          {profile.employeeStatusName}
        </span>
      </section>

      {/* edited by wali: Use compact text rows rather than large profile information cards. */}
      <div className="employee-self-profile__sections">
        {sections.map((section) => (
          <section className="employee-self-profile__section" key={section.title}>
            <h2>{section.title}</h2>
            <dl>
              {section.rows.map((row) => (
                <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </main>
  );
}

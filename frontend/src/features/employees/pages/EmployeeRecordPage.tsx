import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Contact,
  Edit3,
  FileText,
  Fingerprint,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { ArchiveEmployeeDialog } from "../components/ArchiveEmployeeDialog";
import { EmployeeAvatar } from "../components/EmployeeAvatar";
import { EmployeeStatusBadge } from "../components/EmployeeStatusBadge";
import { useEmployee, useUpdateEmployee } from "../hooks/useEmployees";

export function EmployeeRecordPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const { hasPermission } = usePermissions();
  const employeeQuery = useEmployee(employeeId ?? null);
  const updateMutation = useUpdateEmployee();
  const [tab, setTab] = useState<"overview" | "employment" | "contact" | "system">("overview");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const employee = employeeQuery.data;
  const canEdit = hasPermission("employee.update");
  const canArchive = hasPermission("employee.delete");

  async function toggleActive() {
    if (!employee) return;
    try {
      await updateMutation.mutateAsync({
        employeeId: employee.employeeId,
        input: { isActive: !employee.isActive },
      });
      toast.success(employee.isActive ? "Employee marked inactive" : "Employee reactivated");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  if (employeeQuery.isLoading) {
    return <div className="emp-full-page-state"><LoaderCircle className="spin" size={26} /><p>Loading employee profile…</p></div>;
  }

  if (employeeQuery.isError || !employee) {
    const error = employeeQuery.isError ? normalizeApiError(employeeQuery.error) : null;
    return (
      <div className="emp-full-page-state">
        <UserRoundX size={31} />
        <h1>Employee profile unavailable</h1>
        <p>{error?.message ?? "The employee record could not be found."}</p>
        <button type="button" className="emp-secondary-action" onClick={() => navigate("/employees")}><ArrowLeft size={16} /> Return to directory</button>
      </div>
    );
  }

  const facts = [
    ["Employee code", employee.employeeCode],
    ["Employment type", employee.employmentTypeName],
    ["Employee status", employee.employeeStatusName],
    ["Joining date", employee.joiningDate],
  ];

  return (
    <section className="emp-record-page">
      <header className="emp-record-toolbar">
        <div className="emp-record-toolbar__left">
          <button type="button" className="emp-back-button" onClick={() => navigate("/employees")}><ArrowLeft size={17} /></button>
          <div><span>Employees / {employee.employeeCode}</span><h1>{employee.fullName}</h1></div>
        </div>
        <div className="emp-record-toolbar__actions">
          <button type="button" className="emp-icon-button" onClick={() => void employeeQuery.refetch()} title="Refresh"><RefreshCw size={15} /></button>
          {canEdit ? (
            <button type="button" className="emp-secondary-action" onClick={() => void toggleActive()} disabled={updateMutation.isPending}>
              {employee.isActive ? <UserRoundX size={16} /> : <UserRoundCheck size={16} />}
              {employee.isActive ? "Set inactive" : "Reactivate"}
            </button>
          ) : null}
          {canEdit ? <button type="button" className="emp-primary-action" onClick={() => navigate(`/employees/${employee.employeeId}/edit`)}><Edit3 size={16} /> Edit</button> : null}
          {canArchive ? <button type="button" className="emp-danger-icon" onClick={() => setArchiveOpen(true)} title="Archive"><Archive size={16} /></button> : null}
        </div>
      </header>

      <div className="emp-profile-hero">
        <EmployeeAvatar employee={employee} size="xl" />
        <div className="emp-profile-hero__identity">
          <div><h2>{employee.fullName}</h2><EmployeeStatusBadge employee={employee} /></div>
          <p>{employee.assignment.positionTitle ?? employee.assignment.designationName ?? "Role not assigned"}</p>
          <span>{employee.assignment.departmentName ?? "No department"} · {employee.assignment.branchName ?? "No branch"}</span>
        </div>
        <div className="emp-profile-hero__facts">
          {facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </div>

      <nav className="emp-record-tabs">
        <button type="button" className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button type="button" className={tab === "employment" ? "is-active" : ""} onClick={() => setTab("employment")}>Employment</button>
        <button type="button" className={tab === "contact" ? "is-active" : ""} onClick={() => setTab("contact")}>Contact & identity</button>
        <button type="button" onClick={() => navigate(`/employees/documents?employeeId=${employee.employeeId}`)}><FileText size={13} /> Documents</button>
        <button type="button" className={tab === "system" ? "is-active" : ""} onClick={() => setTab("system")}>System</button>
      </nav>

      <div className="emp-record-content">
        {tab === "overview" ? (
          <>
            <section className="emp-record-card emp-record-card--feature">
              <header><BriefcaseBusiness size={18} /><div><h3>Current assignment</h3><p>Active placement and reporting structure</p></div></header>
              <div className="emp-detail-grid">
                <div><span>Position</span><strong>{employee.assignment.positionTitle ?? "Not assigned"}</strong><small>{employee.assignment.positionCode}</small></div>
                <div><span>Designation</span><strong>{employee.assignment.designationName ?? "Not assigned"}</strong></div>
                <div><span>Department</span><strong>{employee.assignment.departmentName ?? "Not assigned"}</strong></div>
                <div><span>Branch</span><strong>{employee.assignment.branchName ?? "Not assigned"}</strong></div>
                <div><span>Reporting manager</span><strong>{employee.assignment.reportingManagerName ?? "Not assigned"}</strong><small>{employee.assignment.reportingManagerCode}</small></div>
                <div><span>Employment percentage</span><strong>{employee.assignment.employmentPercentage ?? 100}%</strong></div>
              </div>
            </section>
            <section className="emp-record-card">
              <header><Contact size={18} /><div><h3>Quick contact</h3><p>Primary channels and work location</p></div></header>
              <div className="emp-contact-list">
                <span><Mail size={16} /><div><small>Official email</small><strong>{employee.officialEmail ?? "Not provided"}</strong></div></span>
                <span><Phone size={16} /><div><small>Mobile</small><strong>{employee.mobileNumber ?? "Not provided"}</strong></div></span>
                <span><MapPin size={16} /><div><small>Work location</small><strong>{employee.assignment.workLocation ?? "Not provided"}</strong></div></span>
              </div>
            </section>
          </>
        ) : null}

        {tab === "employment" ? (
          <>
            <section className="emp-record-card">
              <header><CalendarDays size={18} /><div><h3>Employment timeline</h3><p>Key dates across the employee lifecycle</p></div></header>
              <div className="emp-detail-grid">
                <div><span>Joining date</span><strong>{employee.joiningDate}</strong></div>
                <div><span>Probation end</span><strong>{employee.probationEndDate ?? "—"}</strong></div>
                <div><span>Confirmation date</span><strong>{employee.confirmationDate ?? "—"}</strong></div>
                <div><span>Contract start</span><strong>{employee.contractStartDate ?? "—"}</strong></div>
                <div><span>Contract end</span><strong>{employee.contractEndDate ?? "—"}</strong></div>
                <div><span>Last working date</span><strong>{employee.lastWorkingDate ?? "—"}</strong></div>
              </div>
            </section>
            <section className="emp-record-card">
              <header><Building2 size={18} /><div><h3>Assignment metadata</h3><p>Movement and assignment controls</p></div></header>
              <div className="emp-detail-grid">
                <div><span>Assignment type</span><strong>{employee.assignment.assignmentType ?? "—"}</strong></div>
                <div><span>Effective from</span><strong>{employee.assignment.effectiveFrom ?? "—"}</strong></div>
                <div><span>Effective to</span><strong>{employee.assignment.effectiveTo ?? "Current"}</strong></div>
                <div className="emp-detail-grid__wide"><span>Transfer reason</span><strong>{employee.assignment.transferReason ?? "No transfer reason recorded"}</strong></div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "contact" ? (
          <>
            <section className="emp-record-card">
              <header><Contact size={18} /><div><h3>Contact details</h3><p>Personal and official communication channels</p></div></header>
              <div className="emp-detail-grid">
                <div><span>Official email</span><strong>{employee.officialEmail ?? "—"}</strong></div>
                <div><span>Personal email</span><strong>{employee.personalEmail ?? "—"}</strong></div>
                <div><span>Mobile number</span><strong>{employee.mobileNumber ?? "—"}</strong></div>
                <div><span>Emergency number</span><strong>{employee.alternateNumber ?? "—"}</strong></div>
              </div>
            </section>
            <section className="emp-record-card">
              <header><Fingerprint size={18} /><div><h3>Personal identity</h3><p>Identity and demographic references</p></div></header>
              <div className="emp-detail-grid">
                <div><span>CNIC</span><strong>{employee.cnicNumber ?? "—"}</strong></div>
                <div><span>Passport</span><strong>{employee.passportNumber ?? "—"}</strong></div>
                <div><span>Date of birth</span><strong>{employee.dateOfBirth ?? "—"}</strong></div>
                <div><span>Gender</span><strong>{employee.gender ?? "—"}</strong></div>
                <div><span>Nationality</span><strong>{employee.nationality}</strong></div>
                <div><span>Blood group</span><strong>{employee.bloodGroup ?? "—"}</strong></div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "system" ? (
          <section className="emp-record-card">
            <header><Fingerprint size={18} /><div><h3>System information</h3><p>Internal integration references and audit timestamps</p></div></header>
            <div className="emp-detail-grid">
              <div><span>Employee ID</span><strong>{employee.employeeId}</strong></div>
              <div><span>Company ID</span><strong>{employee.companyId}</strong></div>
              <div><span>Biometric identifier</span><strong>{employee.biometricIdentifier ?? "—"}</strong></div>
              <div><span>Created</span><strong>{new Date(employee.createdAt).toLocaleString()}</strong></div>
              <div><span>Updated</span><strong>{new Date(employee.updatedAt).toLocaleString()}</strong></div>
              <div className="emp-detail-grid__wide"><span>Remarks</span><strong>{employee.remarks ?? "No remarks"}</strong></div>
            </div>
          </section>
        ) : null}
      </div>

      <ArchiveEmployeeDialog employee={archiveOpen ? employee : null} onClose={() => setArchiveOpen(false)} onArchived={() => navigate("/employees", { replace: true })} />
    </section>
  );
}

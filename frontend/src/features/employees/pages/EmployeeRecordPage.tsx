import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  CalendarDays,
  Contact,
  Edit3,
  FileText,
  Fingerprint,
  History,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { ArchiveEmployeeDialog } from "../components/ArchiveEmployeeDialog";
import { EmployeeAvatar } from "../components/EmployeeAvatar";
import { EmployeeStatusBadge } from "../components/EmployeeStatusBadge";
import { useEmployee, useUpdateEmployee } from "../hooks/useEmployees";
import { EmployeeDocumentsPanel } from "../../employee-documents/pages/EmployeeDocumentsPage";
import { listEmployeeBankAccountsRequest, uploadEmployeeProfilePhotoRequest } from "../api/employee.api";

export function EmployeeRecordPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const employeeQuery = useEmployee(employeeId ?? null);
  const updateMutation = useUpdateEmployee();
  const [tab, setTab] = useState<"overview" | "assignment" | "contact" | "documents" | "system">(() => {
    const requestedTab = searchParams.get("tab");
    return requestedTab === "assignment" || requestedTab === "documents" ? requestedTab : "overview";
  });
  const bankAccountsQuery = useQuery({
    queryKey: ["employees", employeeId, "bank-accounts", "with-account-number"],
    queryFn: () => listEmployeeBankAccountsRequest(employeeId ?? "", true),
    enabled: Boolean(employeeId && tab === "overview"),
    staleTime: 60_000,
  });
  const bankAccount = bankAccountsQuery.data?.find((account) => account.isPrimary && account.isActive)
    ?? bankAccountsQuery.data?.find((account) => account.isActive)
    ?? bankAccountsQuery.data?.[0];
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const employee = employeeQuery.data;
  const assignmentHistory = employee?.assignmentHistory?.length
    ? employee.assignmentHistory
    : employee?.assignment.assignmentId
      ? [employee.assignment]
      : [];
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

  async function uploadPhoto(file: File | undefined) {
    if (!employee || !file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP photo.");
      return;
    }
    setPhotoUploading(true);
    try {
      await uploadEmployeeProfilePhotoRequest(employee.employeeId, file);
      await employeeQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
      toast.success("Employee photo updated.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
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
    ["Employee ID", employee.employeeCode],
    ["Employment type", employee.employmentTypeName],
    [
      "Employee status",
      employee.isActive
        ? employee.employeeStatusName
        : "Inactive",
    ],
    ["Joining date", employee.joiningDate ?? "Not assigned"],
  ];

  return (
    <section className="emp-record-page">
      <header className="emp-record-toolbar">
        <div className="emp-record-toolbar__left">
          <button type="button" className="emp-back-button" onClick={() => navigate(searchParams.get("tab") === "assignment" ? "/employees/assignments" : "/employees")}><ArrowLeft size={17} /></button>
          <div><span>{searchParams.get("tab") === "assignment" ? "Assignments" : "Employees"} / {employee.employeeCode}</span><h1>{employee.fullName}</h1></div>
        </div>
        <div className="emp-record-toolbar__actions">
          <button type="button" className="emp-icon-button" onClick={() => void employeeQuery.refetch()} title="Refresh"><RefreshCw className={employeeQuery.isFetching ? "spin" : ""} size={15} /></button>
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
        <div className="emp-profile-photo-control">
          <EmployeeAvatar employee={employee} size="xl" />
          {canEdit ? <>
            <input ref={photoInputRef} className="emp-profile-photo-control__input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose employee photo" onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
            <button type="button" className="emp-profile-photo-control__button" title={employee.profilePhotoPath ? "Change employee photo" : "Upload employee photo"} aria-label={employee.profilePhotoPath ? "Change employee photo" : "Upload employee photo"} disabled={photoUploading} onClick={() => photoInputRef.current?.click()}>
              {photoUploading ? <LoaderCircle className="spin" size={15} /> : <Camera size={15} />}
            </button>
          </> : null}
        </div>
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
        <button type="button" className={tab === "assignment" ? "is-active" : ""} onClick={() => setTab("assignment")}>Assignment</button>
        <button type="button" className={tab === "contact" ? "is-active" : ""} onClick={() => setTab("contact")}>Contact & identity</button>
        <button type="button" className={tab === "documents" ? "is-active" : ""} onClick={() => setTab("documents")}><FileText size={13} /> Documents</button>
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
            <section className="emp-record-card">
              <header><Landmark size={18} /><div><h3>Bank details</h3><p>Saved payroll account information</p></div></header>
              {bankAccountsQuery.isLoading ? <p>Loading bank details…</p> : bankAccountsQuery.isError ? <p>Bank details could not be loaded.</p> : bankAccount ? (
                <div className="emp-detail-grid">
                  <div><span>Bank</span><strong>{bankAccount.bankName}</strong></div>
                  <div><span>Branch</span><strong>{bankAccount.branchName ?? "Not provided"}</strong></div>
                  <div><span>Bank branch code</span><strong>{bankAccount.branchCode ?? "Not provided"}</strong></div>
                  <div><span>Account title</span><strong>{bankAccount.accountTitle}</strong></div>
                  <div><span>Account number</span><strong>{bankAccount.accountNumber ?? "Not provided"}</strong></div>
                  <div><span>IBAN</span><strong>{bankAccount.ibanMasked ?? "Not provided"}</strong></div>
                  <div><span>Currency</span><strong>{bankAccount.currencyCode}</strong></div>
                </div>
              ) : <p>No bank account has been added.</p>}
            </section>
          </>
        ) : null}

        {tab === "assignment" ? (
          <>
            <section className="emp-record-card emp-record-card--feature">
              <header>
                <BriefcaseBusiness size={18} />
                <div><h3>Current assignment</h3><p>Department, project, role and reporting placement</p></div>
              </header>
              <div className="emp-detail-grid">
                <div><span>Branch</span><strong>{employee.assignment.branchName ?? "Not assigned"}</strong></div>
                <div><span>Department</span><strong>{employee.assignment.departmentName ?? "Not assigned"}</strong></div>
                <div><span>Project</span><strong>{employee.assignment.projectName ?? "Not assigned"}</strong></div>
                <div><span>Designation</span><strong>{employee.assignment.designationName ?? "Not assigned"}</strong></div>
                <div><span>Position</span><strong>{employee.assignment.positionTitle ?? "Not assigned"}</strong></div>
                <div><span>Reporting manager</span><strong>{employee.assignment.reportingManagerName ?? "Not assigned"}</strong></div>
                <div><span>Work location</span><strong>{employee.assignment.workLocation ?? "Not provided"}</strong></div>
                <div><span>Effective from</span><strong>{employee.assignment.effectiveFrom ?? "—"}</strong></div>
              </div>
            </section>
            <section className="emp-record-card">
              <header><CalendarDays size={18} /><div><h3>Employment dates</h3><p>Employment timeline for this employee</p></div></header>
              <div className="emp-detail-grid">
                <div><span>Joining date</span><strong>{employee.joiningDate ?? "Not assigned"}</strong></div>
                <div><span>Probation end</span><strong>{employee.probationEndDate ?? "—"}</strong></div>
                <div><span>Contract start</span><strong>{employee.contractStartDate ?? "—"}</strong></div>
                <div><span>Contract end</span><strong>{employee.contractEndDate ?? "—"}</strong></div>
              </div>
            </section>
            <section className="emp-record-card emp-record-card--feature">
              <header><History size={18} /><div><h3>Assignment history</h3><p>Branch, department, project, and role records over time</p></div></header>
              {assignmentHistory.length === 0 ? (
                <p className="emp-assignment-history__empty">No assignment records are available for this employee.</p>
              ) : (
                <div className="emp-assignment-history">
                  {assignmentHistory.map((record) => {
                    const isCurrent = record.assignmentId === employee.assignment.assignmentId;
                    return (
                      <article className="emp-assignment-history__item" key={record.assignmentId ?? `${record.effectiveFrom}-${record.departmentId}`}>
                        <header>
                          <div>
                            <strong>{record.departmentName ?? "Department not assigned"} · {record.branchName ?? "Branch not assigned"}</strong>
                            <span>{[record.designationName, record.positionTitle].filter(Boolean).join(" · ") || "Role not assigned"}</span>
                          </div>
                          <span className={isCurrent ? "emp-assignment-history__status is-current" : "emp-assignment-history__status"}>{isCurrent ? "Current" : "Previous"}</span>
                        </header>
                        <div className="emp-assignment-history__details">
                          <div><span>Effective period</span><strong>{record.effectiveFrom ?? "—"} to {record.effectiveTo ?? (isCurrent ? "Current" : "Not recorded")}</strong></div>
                          <div><span>Project</span><strong>{record.projectName ?? "No project"}</strong></div>
                          <div><span>Reporting manager</span><strong>{record.reportingManagerName || "No manager"}</strong></div>
                          {record.transferReason ? <div><span>Reason for change</span><strong>{record.transferReason}</strong></div> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
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

        {tab === "documents" ? (
          <div className="emp-record-documents">
            <EmployeeDocumentsPanel employeeId={employee.employeeId} />
          </div>
        ) : null}

        {tab === "system" ? (
          <section className="emp-record-card">
            <header><Fingerprint size={18} /><div><h3>System information</h3><p>Internal integration references and audit timestamps</p></div></header>
            <div className="emp-detail-grid">
              <div><span>Employee ID</span><strong>{employee.employeeCode}</strong></div>
              <div><span>Company</span><strong>{employee.companyName}</strong></div>
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

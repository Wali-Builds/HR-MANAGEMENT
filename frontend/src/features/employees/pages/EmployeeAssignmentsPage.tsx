import { useDeferredValue, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CalendarClock, LoaderCircle, RefreshCw, Search, UserCheck, UserRoundX, UsersRound, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { EmployeeAvatar } from "../components/EmployeeAvatar";
import { EmployeeFormSections } from "../components/EmployeeFormSections";
import { EmployeeMenuSelect } from "../components/EmployeeMenuSelect";
import { listActiveProjectReferencesRequest, listEmployeesRequest } from "../api/employee.api";
import { employeeEditFormSchema, type EmployeeFormInputValues, type EmployeeFormValues } from "../schemas/employee.schema";
import { employeeToFormValues, toEmployeeMutationInput } from "../utils/employee-form";
import { useEmployeeLookups, useEmployeeReferenceData, useEmployees, useUpdateEmployee } from "../hooks/useEmployees";
import type { Employee } from "../types/employee.types";
import "../../workforce-access/workforce-access.css";

const PAGE_SIZE = 20;

function useUnassignedEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["employees", "list", "assignment-unassigned-picker"],
    queryFn: async () => {
      const params = { limit: 100, sortBy: "first_name" as const, sortOrder: "ASC" as const };
      const firstPage = await listEmployeesRequest({ ...params, page: 1 });
      const allEmployees = [...firstPage.employees];
      for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
        const result = await listEmployeesRequest({ ...params, page });
        allEmployees.push(...result.employees);
      }
      return allEmployees.filter((employee) => !(
        employee.assignment.branchId ||
        employee.assignment.departmentId ||
        employee.assignment.designationId ||
        employee.assignment.positionId
      ));
    },
    enabled,
    staleTime: 0,
  });
}

function EmploymentDetailsEditor({ employee, onSaved }: { employee: Employee; onSaved: () => void }) {
  const updateEmployee = useUpdateEmployee();
  const lookupsQuery = useEmployeeLookups();
  const references = useEmployeeReferenceData(employee.companyId);
  const assignmentEffectiveFrom =
    employee.assignment.effectiveFrom
      ? getNextEffectiveDate(employee)
      : employee.joiningDate ?? getTodayLocalDate();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormInputValues, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeEditFormSchema),
    defaultValues: employeeToFormValues(employee),
  });
  const departmentId = watch("departmentId");
  const projectsQuery = useQuery({
    queryKey: ["projects", "active-assignment-options", employee.companyId, departmentId],
    queryFn: () => listActiveProjectReferencesRequest(departmentId),
    enabled: Boolean(departmentId),
    staleTime: 60_000,
  });

  useEffect(() => reset(employeeToFormValues(employee)), [employee, reset]);

  async function saveEmploymentDetails(values: EmployeeFormValues) {
    if (!values.branchId || !values.departmentId || !values.designationId || !values.positionId) {
      toast.error("Select a branch, department, designation, and position before saving the assignment.");
      return;
    }

    try {
      const input = toEmployeeMutationInput(values, employee);
      if (input.assignment) {
        input.assignment.effectiveFrom = assignmentEffectiveFrom;
      }
      await updateEmployee.mutateAsync({
        employeeId: employee.employeeId,
        input,
      });
      toast.success("Employment details and assignment saved to the employee record");
      onSaved();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
    <form className="emp-employment-details-form" onSubmit={handleSubmit(saveEmploymentDetails)} noValidate>
      <EmployeeFormSections
        register={register}
        watch={watch}
        setValue={setValue}
        errors={errors}
        isHiring={false}
        onlyEmploymentSections
        requireAssignment
        lookups={lookupsQuery.data}
        references={{ ...references, projects: projectsQuery.data ?? [] }}
        companies={[]}
        isPlatformAdmin={false}
        nextEmployeeCode={null}
        currentEmployeeId={employee.employeeId}
        currentPosition={{
          positionId: employee.assignment.positionId,
          positionTitle: employee.assignment.positionTitle,
          positionCode: employee.assignment.positionCode,
        }}
      />
      <footer className="emp-employment-details-form__actions">
        <button type="submit" className="emp-primary-action" disabled={updateEmployee.isPending || references.isLoading || lookupsQuery.isLoading}>
          {updateEmployee.isPending ? <LoaderCircle className="spin" size={16} /> : null}
          {updateEmployee.isPending ? "Saving details…" : "Save employment details"}
        </button>
      </footer>
    </form>
  );
}

function getTodayLocalDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getNextEffectiveDate(employee: Employee): string {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentDate = employee.assignment.effectiveFrom ?? employee.joiningDate;
  const dates = [todayString, employee.joiningDate].filter((date): date is string => Boolean(date));
  if (currentDate) {
    const dayAfterCurrent = new Date(`${currentDate}T00:00:00`);
    dayAfterCurrent.setDate(dayAfterCurrent.getDate() + 1);
    dates.push(`${dayAfterCurrent.getFullYear()}-${String(dayAfterCurrent.getMonth() + 1).padStart(2, "0")}-${String(dayAfterCurrent.getDate()).padStart(2, "0")}`);
  }
  dates.sort();
  return dates[dates.length - 1] ?? todayString;
}

export function EmployeeAssignmentEditor({ employee, employees = [employee], onEmployeeChange, hideEmployeeSelect = false, onSaved }: { employee: Employee; employees?: Employee[]; onEmployeeChange?: (employeeId: string) => void; hideEmployeeSelect?: boolean; onSaved?: () => void }) {
  const updateEmployee = useUpdateEmployee();
  const references = useEmployeeReferenceData(employee.companyId);
  const [branchId, setBranchId] = useState(employee.assignment.branchId ?? "");
  const [departmentId, setDepartmentId] = useState(employee.assignment.departmentId ?? "");
  const [projectId, setProjectId] = useState(employee.assignment.projectId ?? "");
  const [designationId, setDesignationId] = useState(employee.assignment.designationId ?? "");
  const [positionId, setPositionId] = useState(employee.assignment.positionId ?? "");
  const [reportingManagerId, setReportingManagerId] = useState(employee.assignment.reportingManagerId ?? "");
  const [workLocation, setWorkLocation] = useState(employee.assignment.workLocation ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(() => getNextEffectiveDate(employee));
  const [transferReason, setTransferReason] = useState("");
  const projectsQuery = useQuery({
    queryKey: ["projects", "active-assignment-options", employee.companyId, departmentId],
    queryFn: () => listActiveProjectReferencesRequest(departmentId),
    enabled: Boolean(departmentId),
    staleTime: 60_000,
  });
  const departments = references.departments.filter((item) => !branchId || !item.branchId || item.branchId === branchId);
  const designations = references.designations.filter((item) => item.departmentId === departmentId);
  const positions = references.positions.filter((item) => item.designationId === designationId);
  const managers = references.managers.filter((item) =>
    item.employeeId !== employee.employeeId &&
    (!branchId || item.assignment.branchId === branchId) &&
    (!departmentId || item.assignment.departmentId === departmentId),
  );

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !departmentId || !designationId || !positionId || !effectiveFrom) {
      toast.error("Select a branch, department, designation, position, and effective date.");
      return;
    }

    try {
      await updateEmployee.mutateAsync({
        employeeId: employee.employeeId,
        input: {
          assignment: {
            branchId,
            departmentId,
            projectId: projectId || null,
            designationId,
            reportingManagerId: reportingManagerId || null,
            positionId,
            assignmentType: employee.assignment.assignmentType ?? "PRIMARY",
            effectiveFrom,
            workLocation: workLocation.trim() || null,
            employmentPercentage: employee.assignment.employmentPercentage ?? 100,
            transferReason: transferReason.trim() || null,
          },
        },
      });
      toast.success("Assignment updated and previous assignment saved to history");
      onSaved?.();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  return (
      <section className="emp-assignment-editor" aria-labelledby="emp-assignment-editor-title">
        <span className="emp-assignment-editor__eyebrow">{employee.employeeCode} · {employee.fullName}</span>
        <h2 id="emp-assignment-editor-title">Update employee assignment</h2>
        <p>Changes are saved as a new dated assignment record. The current record is retained in history.</p>
        <form onSubmit={(event) => void saveAssignment(event)}>
          {!hideEmployeeSelect ? <label className="emp-field emp-assignment-editor__employee"><span>Employee <b>*</b></span><select value={employee.employeeId} onChange={(event) => onEmployeeChange?.(event.target.value)}><option value="">Select employee</option>{employees.map((item) => <option key={item.employeeId} value={item.employeeId}>{item.fullName} · {item.employeeCode}</option>)}</select></label> : null}
          <div className="emp-assignment-editor__grid">
            <label className="emp-field"><span>Branch <b>*</b></span><select value={branchId} onChange={(event) => { setBranchId(event.target.value); setDepartmentId(""); setProjectId(""); setDesignationId(""); setPositionId(""); setReportingManagerId(""); }} disabled={references.isLoading}><option value="">Select branch</option>{references.branches.map((item) => <option key={item.branchId} value={item.branchId}>{item.branchName}</option>)}</select></label>
            <label className="emp-field"><span>Department <b>*</b></span><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setProjectId(""); setDesignationId(""); setPositionId(""); setReportingManagerId(""); }} disabled={references.isLoading || !branchId}><option value="">Select department</option>{departments.map((item) => <option key={item.departmentId} value={item.departmentId}>{item.departmentName}</option>)}</select></label>
            <label className="emp-field"><span>Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={!departmentId || projectsQuery.isLoading}><option value="">No project</option>{(projectsQuery.data ?? []).map((item) => <option key={item.projectId} value={item.projectId}>{item.projectName} ({item.projectCode})</option>)}</select></label>
            <label className="emp-field"><span>Designation <b>*</b></span><select value={designationId} onChange={(event) => { setDesignationId(event.target.value); setPositionId(""); }} disabled={!departmentId || references.isLoading}><option value="">Select designation</option>{designations.map((item) => <option key={item.designationId} value={item.designationId}>{item.designationName}</option>)}</select></label>
            <label className="emp-field"><span>Position <b>*</b></span><select value={positionId} onChange={(event) => setPositionId(event.target.value)} disabled={!designationId || references.isLoading}><option value="">Select position</option>{positions.map((item) => <option key={item.positionId} value={item.positionId}>{item.positionTitle} ({item.positionCode})</option>)}</select></label>
            <label className="emp-field"><span>Reporting manager</span><select value={reportingManagerId} onChange={(event) => setReportingManagerId(event.target.value)} disabled={!departmentId || references.isLoading}><option value="">No manager</option>{managers.map((item) => <option key={item.employeeId} value={item.employeeId}>{item.fullName} · {item.employeeCode}</option>)}</select></label>
            <label className="emp-field"><span>Effective from <b>*</b></span><input type="date" min={getNextEffectiveDate(employee)} value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="emp-field"><span>Work location</span><input value={workLocation} onChange={(event) => setWorkLocation(event.target.value)} /></label>
            <label className="emp-field emp-field--full"><span>Reason for change</span><textarea rows={3} maxLength={500} value={transferReason} onChange={(event) => setTransferReason(event.target.value)} placeholder="Optional note for the assignment record" /></label>
          </div>
          <div className="emp-assignment-editor__actions">
            <button type="submit" className="emp-primary-action" disabled={updateEmployee.isPending || references.isLoading}>
              {updateEmployee.isPending ? <LoaderCircle className="spin" size={15} /> : null}
              {updateEmployee.isPending ? "Saving record…" : "Save assignment"}
            </button>
          </div>
        </form>
      </section>
  );
}

export function EmployeeAssignmentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const canEditEmployees = hasPermission("employee.update");
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [employmentFormPickerOpen, setEmploymentFormPickerOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const references = useEmployeeReferenceData(user?.companyId ?? undefined);
  const employeesQuery = useEmployees({
    page,
    limit: PAGE_SIZE,
    sortBy: "first_name",
    sortOrder: "ASC",
    ...(branchId !== "ALL" ? { branchId } : {}),
    ...(departmentId !== "ALL" ? { departmentId } : {}),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  });
  const employees = employeesQuery.data?.employees ?? [];
  const editingEmployee = employees.find((employee) => employee.employeeId === editingEmployeeId) ?? null;
  const unassignedEmployeesQuery = useUnassignedEmployees(employmentFormPickerOpen);
  const unassignedEmployees = unassignedEmployeesQuery.data ?? [];
  const pagination = employeesQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const assignedCount = employees.filter((employee) => Boolean(employee.assignment.departmentId || employee.assignment.positionId)).length;

  useEffect(() => {
    setPage(1);
  }, [branchId, deferredSearch, departmentId]);

  useEffect(() => {
    if (!unassignedEmployees.some((employee) => employee.employeeId === selectedEmployeeId)) {
      setSelectedEmployeeId(unassignedEmployees[0]?.employeeId ?? "");
    }
  }, [selectedEmployeeId, unassignedEmployees]);

  function openAssignment(employee: Employee) {
    navigate(`/employees/${employee.employeeId}?tab=assignment`);
  }

  const selectedUnassignedEmployee = unassignedEmployees.find((employee) => employee.employeeId === selectedEmployeeId) ?? null;

  return (
    <main className="wf-page wf-access-page wf-assignment-page">
      <section className="wf-page-header wf-access-hero">
        <div className="wf-access-hero__identity">
          <span className="wf-access-hero__title-icon"><BriefcaseBusiness size={19} /></span>
          <div className="wf-access-hero__copy">
            <span className="wf-eyebrow">Workforce administration</span>
            <h1>Employee assignments</h1>
            <p>Select an employee to review or update their department, project, position and assignment history.</p>
          </div>
        </div>
        {canEditEmployees ? (
          <div className="wf-access-hero__actions">
            <button
              type="button"
              className="wf-primary-button wf-access-hero__create-button"
              onClick={() => setEmploymentFormPickerOpen(true)}
              disabled={employeesQuery.isLoading}
            >
              <CalendarClock size={17} /> Employment & dates
            </button>
          </div>
        ) : null}
      </section>

      <section className="wf-stat-grid">
        <article className="wf-stat-card"><UsersRound size={20} /><div><strong>{pagination?.total ?? 0}</strong><span>Employees</span></div></article>
        <article className="wf-stat-card"><UserCheck size={20} /><div><strong>{assignedCount}</strong><span>Assigned on this page</span></div></article>
        <article className="wf-stat-card"><UserRoundX size={20} /><div><strong>{employees.length - assignedCount}</strong><span>Without assignment</span></div></article>
        <article className="wf-stat-card"><BriefcaseBusiness size={20} /><div><strong>{employees.length}</strong><span>Shown on this page</span></div></article>
      </section>

      <section className="wf-panel">
        <header className="wf-toolbar">
          <label className="wf-search">
            <Search size={17} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search employee name or ID" />
          </label>
          <EmployeeMenuSelect className="wf-select" value={branchId} placeholder="Select branch" options={[{ value: "ALL", label: "All branches" }, ...references.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setBranchId(value); setDepartmentId("ALL"); setPage(1); }} allowClear={false} />
          <EmployeeMenuSelect className="wf-select" value={departmentId} placeholder="Select department" options={[{ value: "ALL", label: "All departments" }, ...references.departments.filter((department) => branchId === "ALL" || !department.branchId || department.branchId === branchId).map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={(value) => { setDepartmentId(value); setPage(1); }} allowClear={false} />
          <button type="button" className="wf-secondary-button" onClick={() => void employeesQuery.refetch()}>
            <RefreshCw size={16} className={employeesQuery.isFetching ? "spin" : ""} /> Refresh
          </button>
        </header>

        {employeesQuery.isLoading ? (
          <div className="wf-empty-state"><RefreshCw size={28} className="spin" /><h2>Loading employees</h2></div>
        ) : employeesQuery.isError ? (
          <div className="wf-empty-state wf-empty-state--error"><UserRoundX size={32} /><h2>Employee list could not be loaded</h2><p>{normalizeApiError(employeesQuery.error).message}</p></div>
        ) : employees.length === 0 ? (
          <div className="wf-empty-state"><UsersRound size={32} /><h2>No employees found</h2><p>Try another search.</p></div>
        ) : (
          <div className="wf-table-wrap">
            <table className="wf-table">
              <thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Position</th><th>Branch</th><th>Assignment effective from</th><th className="wf-assignment-actions-header">Actions</th></tr></thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.employeeId}>
                    <td>
                      <button type="button" className="wf-person-cell wf-assignment-person" onClick={() => openAssignment(employee)}>
                        <EmployeeAvatar employee={employee} size="sm" />
                        <span><strong>{employee.fullName}</strong><span>{employee.employeeStatusName}</span></span>
                      </button>
                    </td>
                    <td>{employee.employeeCode}</td>
                    <td>{employee.assignment.departmentName ?? "—"}</td>
                    <td>{employee.assignment.positionTitle ?? "—"}</td>
                    <td>{employee.assignment.branchName ?? "—"}</td>
                    <td>{employee.assignment.effectiveFrom ?? "—"}</td>
                    <td><button type="button" className="wf-secondary-button" onClick={() => canEditEmployees ? setEditingEmployeeId(employee.employeeId) : openAssignment(employee)}>{canEditEmployees ? "Edit assignment" : "View assignment"} <ArrowRight size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="wf-pager">
          <span>Page {page} of {totalPages} · {pagination?.total ?? 0} employees</span>
          <div>
            <button type="button" className="wf-secondary-button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</button>
            <button type="button" className="wf-secondary-button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </footer>
      </section>

      {employmentFormPickerOpen ? (
        <div className="wf-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEmploymentFormPickerOpen(false);
        }}>
          <section className="wf-modal wf-employment-assignment-modal" role="dialog" aria-modal="true" aria-labelledby="wf-employment-picker-title">
            <header className="wf-modal__header">
              <div>
                <span className="wf-eyebrow">Employee assignments</span>
                <h2 id="wf-employment-picker-title">Employment & assignment</h2>
                <p>Complete the assignment and employment dates for an employee who has not been assigned yet.</p>
              </div>
              <button type="button" className="wf-icon-button" onClick={() => setEmploymentFormPickerOpen(false)} aria-label="Close employee selection">
                <X size={17} />
              </button>
            </header>
            <div className="emp-employment-details-picker">
              <label className="emp-field">
                <span>Unassigned employee <b>*</b></span>
                <EmployeeMenuSelect
                  value={selectedEmployeeId}
                  placeholder={unassignedEmployeesQuery.isLoading ? "Loading employees…" : "Select an unassigned employee"}
                  options={unassignedEmployees.map((employee) => ({ value: employee.employeeId, label: `${employee.fullName} · ${employee.employeeCode}` }))}
                  onChange={setSelectedEmployeeId}
                  searchable
                  searchPlaceholder="Search unassigned employees"
                  disabled={unassignedEmployeesQuery.isLoading || unassignedEmployees.length === 0}
                  ariaLabel="Select an unassigned employee"
                />
                <small>Only employees without an assignment are listed.</small>
              </label>
              {unassignedEmployeesQuery.isLoading ? (
                <div className="wf-empty-state"><LoaderCircle size={25} className="spin" /><h2>Loading unassigned employees</h2></div>
              ) : unassignedEmployeesQuery.isError ? (
                <div className="wf-empty-state wf-empty-state--error"><UserRoundX size={28} /><h2>Employees could not be loaded</h2><p>{normalizeApiError(unassignedEmployeesQuery.error).message}</p><button type="button" className="wf-secondary-button" onClick={() => void unassignedEmployeesQuery.refetch()}>Try again</button></div>
              ) : unassignedEmployees.length === 0 ? (
                <div className="wf-empty-state"><UsersRound size={28} /><h2>No unassigned employees</h2><p>No employees without an assignment were found.</p></div>
              ) : selectedUnassignedEmployee ? (
                <EmploymentDetailsEditor
                  key={selectedUnassignedEmployee.employeeId}
                  employee={selectedUnassignedEmployee}
                  onSaved={() => setEmploymentFormPickerOpen(false)}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {editingEmployee ? (
        <div className="wf-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingEmployeeId(null);
        }}>
          <section className="wf-modal wf-assignment-editor-modal" role="dialog" aria-modal="true" aria-labelledby="wf-assignment-editor-modal-title">
            <header className="wf-modal__header">
              <div>
                <span className="wf-eyebrow">Employee assignments</span>
                <h2 id="wf-assignment-editor-modal-title">Employment & assignment</h2>
                <p>{editingEmployee.fullName} · {editingEmployee.employeeCode}. Assignment changes are saved as dated records in the employee’s history.</p>
              </div>
              <button type="button" className="wf-icon-button" onClick={() => setEditingEmployeeId(null)} aria-label="Close assignment form">
                <X size={17} />
              </button>
            </header>
            <div className="wf-assignment-editor-modal__body">
              <EmploymentDetailsEditor
                key={editingEmployee.employeeId}
                employee={editingEmployee}
                onSaved={() => { setEditingEmployeeId(null); void employeesQuery.refetch(); }}
              />
            </div>
          </section>
        </div>
      ) : null}

    </main>
  );
}

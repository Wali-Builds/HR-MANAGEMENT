import { useMemo, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Activity, Building2, Check, Cpu, Edit3, Fingerprint, MapPin, Plus, RefreshCw, Search, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCurrentCompanyIdentity } from "../../companies/hooks/useCompanies";
import { listBranchesRequest } from "../../branches/api/branch.api";
import { listDepartmentsRequest } from "../../departments/api/organisation.api";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";
import { listEmployeesRequest } from "../../employees/api/employee.api";
import { useUpdateEmployee } from "../../employees/hooks/useEmployees";
import type { Employee } from "../../employees/types/employee.types";
import { OrganisationDialog } from "../../organisation/components/OrganisationDialog";
import { OrganisationDialogMotionProvider, useRequiredOrganisationDialogMotion } from "../../organisation/components/OrganisationDialogMotion";
import { OrganisationEmptyState } from "../../organisation/components/OrganisationEmptyState";
import { OrganisationField, TextInput } from "../../organisation/components/OrganisationField";
import { useCreateAttendanceDevice, useAttendanceDevices, useUpdateAttendanceDevice } from "../hooks/useAttendance";
import type { AttendanceDevice, AttendanceDeviceInput } from "../types/attendance.types";
import "../attendance.css";

interface DeviceForm {
  branchId: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  ipAddress: string;
  portNumber: string;
  physicalLocation: string;
}

const emptyDeviceForm: DeviceForm = {
  branchId: "",
  deviceCode: "",
  deviceName: "",
  deviceType: "BIOMETRIC",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  ipAddress: "",
  portNumber: "",
  physicalLocation: "",
};

function AttendanceConfigurationPageContent() {
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const motion = useRequiredOrganisationDialogMotion();
  const companyId = user?.companyId ?? undefined;
  const canViewEmployees = hasPermission("employee.view_all");
  const canUpdateEmployees = hasPermission("employee.update");
  const canManageDevices = hasPermission("biometric.manage") || hasPermission("attendance.manage");
  const companyIdentityQuery = useCurrentCompanyIdentity(companyId ?? null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeBranchId, setEmployeeBranchId] = useState("ALL");
  const [employeeDepartmentId, setEmployeeDepartmentId] = useState("ALL");
  const [employeePage, setEmployeePage] = useState(1);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [mappingEmployee, setMappingEmployee] = useState<Employee | null>(null);
  const [biometricIdentifier, setBiometricIdentifier] = useState("");
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [deviceForm, setDeviceForm] = useState<DeviceForm>(emptyDeviceForm);
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({});

  // added by wali: Keep branch and department filters scoped to employee device mapping only.
  const employeeParams = useMemo(() => ({
    page: employeePage,
    limit: 50,
    sortBy: "first_name" as const,
    sortOrder: "ASC" as const,
    ...(companyId ? { companyId } : {}),
    ...(employeeSearch.trim() ? { search: employeeSearch.trim() } : {}),
    ...(employeeBranchId !== "ALL" ? { branchId: employeeBranchId } : {}),
    ...(employeeDepartmentId !== "ALL" ? { departmentId: employeeDepartmentId } : {}),
  }), [companyId, employeePage, employeeSearch, employeeBranchId, employeeDepartmentId]);
  const employeesQuery = useQuery({
    queryKey: ["attendance", "configuration", "employees", employeeParams],
    queryFn: () => listEmployeesRequest(employeeParams),
    enabled: Boolean(companyId && canViewEmployees),
  });
  // added by wali: Keep the employee totals independent from the current search and table page.
  const employeeSummaryQuery = useQuery({
    queryKey: ["attendance", "configuration", "employee-summary", companyId],
    queryFn: async () => {
      const firstPage = await listEmployeesRequest({ page: 1, limit: 100, sortBy: "first_name", sortOrder: "ASC", ...(companyId ? { companyId } : {}) });
      const allEmployees = [...firstPage.employees];
      for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
        const result = await listEmployeesRequest({ page, limit: 100, sortBy: "first_name", sortOrder: "ASC", ...(companyId ? { companyId } : {}) });
        allEmployees.push(...result.employees);
      }
      return {
        total: firstPage.pagination.total,
        mapped: allEmployees.filter((employee) => Boolean(employee.biometricIdentifier?.trim())).length,
      };
    },
    enabled: Boolean(companyId && canViewEmployees),
  });
  const devicesQuery = useAttendanceDevices(deviceSearch, Boolean(companyId && canManageDevices));
  // added by wali: Use the full device list for company-wide summary counts, even while the table is searched.
  const deviceSummaryQuery = useAttendanceDevices("", Boolean(companyId && canManageDevices));
  const branchQuery = useQuery({
    queryKey: ["attendance", "configuration", "branches", companyId],
    queryFn: () => listBranchesRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "branch_name", isActive: true, ...(companyId ? { companyId } : {}) }),
    enabled: Boolean(companyId && (canViewEmployees || canManageDevices) && hasPermission("branch.view")),
  });
  // added by wali: Restrict the employee mapping department filter to the selected branch.
  const departmentQuery = useQuery({
    queryKey: ["attendance", "configuration", "departments", companyId, employeeBranchId],
    queryFn: () => listDepartmentsRequest({ page: 1, limit: 100, sortOrder: "ASC", sortBy: "department_name", isActive: true, ...(companyId ? { companyId } : {}), ...(employeeBranchId !== "ALL" ? { branchId: employeeBranchId } : {}) }),
    enabled: Boolean(companyId && canViewEmployees && hasPermission("department.view")),
  });
  const updateEmployeeMutation = useUpdateEmployee();
  const createDeviceMutation = useCreateAttendanceDevice();
  const updateDeviceMutation = useUpdateAttendanceDevice();
  const employees = employeesQuery.data?.employees ?? [];
  const devices = devicesQuery.data ?? [];
  const employeePagination = employeesQuery.data?.pagination;

  function openMapping(employee: Employee) {
    setMappingEmployee(employee);
    setBiometricIdentifier(employee.biometricIdentifier ?? "");
  }

  async function saveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mappingEmployee) return;
    try {
      // added by wali: Save the attendance machine identifier in the employee's existing biometric field.
      await updateEmployeeMutation.mutateAsync({
        employeeId: mappingEmployee.employeeId,
        input: { biometricIdentifier: biometricIdentifier.trim() || null },
      });
      toast.success("Employee machine ID saved.");
      setMappingEmployee(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  function closeDeviceDialog() {
    motion.close(() => {
      setDeviceDialogOpen(false);
      setDeviceErrors({});
      setDeviceForm(emptyDeviceForm);
      setEditingDevice(null);
    });
  }

  function openCreateDeviceDialog(event?: MouseEvent<HTMLButtonElement>) {
    if (event) motion.capture(event);
    setEditingDevice(null);
    setDeviceForm(emptyDeviceForm);
    setDeviceErrors({});
    setDeviceDialogOpen(true);
  }

  function openEditDeviceDialog(device: AttendanceDevice, event: MouseEvent<HTMLButtonElement>) {
    motion.capture(event);
    setEditingDevice(device);
    setDeviceForm({
      branchId: device.branchId ?? "",
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      manufacturer: device.manufacturer ?? "",
      modelNumber: device.modelNumber ?? "",
      serialNumber: device.serialNumber ?? "",
      ipAddress: device.ipAddress ?? "",
      portNumber: device.portNumber?.toString() ?? "",
      physicalLocation: device.physicalLocation ?? "",
    });
    setDeviceErrors({});
    setDeviceDialogOpen(true);
  }

  async function saveDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (deviceForm.deviceCode.trim().length < 1) errors.deviceCode = "Enter the device code.";
    if (deviceForm.deviceName.trim().length < 2) errors.deviceName = "Enter a device name.";
    if (deviceForm.deviceType.trim().length < 1) errors.deviceType = "Enter the device type.";
    const port = deviceForm.portNumber.trim() ? Number(deviceForm.portNumber) : null;
    if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) errors.portNumber = "Enter a port between 1 and 65535.";
    setDeviceErrors(errors);
    if (Object.keys(errors).length) return;
    if (!companyId) { toast.error("Your account is not linked to a company."); return; }
    const input: AttendanceDeviceInput = {
      branchId: deviceForm.branchId || null,
      deviceCode: deviceForm.deviceCode.trim().toUpperCase(),
      deviceName: deviceForm.deviceName.trim(),
      deviceType: deviceForm.deviceType.trim().toUpperCase().replace(/[\s-]+/g, "_"),
      manufacturer: deviceForm.manufacturer.trim() || null,
      modelNumber: deviceForm.modelNumber.trim() || null,
      serialNumber: deviceForm.serialNumber.trim() || null,
      ipAddress: deviceForm.ipAddress.trim() || null,
      portNumber: port,
      physicalLocation: deviceForm.physicalLocation.trim() || null,
      isActive: editingDevice?.isActive ?? true,
    };
    try {
      if (editingDevice) {
        await updateDeviceMutation.mutateAsync({ deviceId: editingDevice.deviceId, input });
        toast.success("Attendance device updated.");
      } else {
        await createDeviceMutation.mutateAsync(input);
        toast.success("Attendance device registered.");
      }
      closeDeviceDialog();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  async function toggleDevice(device: AttendanceDevice) {
    try {
      await updateDeviceMutation.mutateAsync({ deviceId: device.deviceId, input: { isActive: !device.isActive } });
      toast.success(device.isActive ? "Device deactivated." : "Device activated.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  const summaryEmployees = employeeSummaryQuery.data;
  const summaryDevices = deviceSummaryQuery.data ?? [];

  return (
    <section className="wf-org-page wf-attendance-page wf-attendance-configuration">
      <header className="wf-org-hero wf-org-hero--center-company">
        <div className="wf-org-hero__identity"><span className="wf-org-hero__identity-icon"><Cpu size={19} /></span><div className="wf-org-hero__copy"><span className="wf-org-hero__eyebrow">Attendance setup</span><h1>Configuration</h1><p>Register attendance devices and map each employee to their machine ID.</p></div></div>
        <div className="wf-org-hero__scope"><div className="wf-org-hero__scope-icon"><Building2 size={20} /></div><div><span>Working company</span><strong>{companyIdentityQuery.data?.displayName ?? (companyIdentityQuery.isLoading ? "Loading company…" : "Your company")}</strong></div></div>
      </header>

      <div className="wf-org-health-strip wf-attendance-health">
        <div><span><UsersRound size={16} /></span><strong>{summaryEmployees?.total ?? "—"}</strong><small>Total employees</small></div>
        <div><span><Fingerprint size={16} /></span><strong>{summaryEmployees?.mapped ?? "—"}</strong><small>Employees mapped</small></div>
        {canManageDevices && <><div><span><Cpu size={16} /></span><strong>{deviceSummaryQuery.isLoading || deviceSummaryQuery.isError ? "—" : summaryDevices.filter((device) => device.isActive).length}</strong><small>Active devices</small></div><div><span><Activity size={16} /></span><strong>{deviceSummaryQuery.isLoading || deviceSummaryQuery.isError ? "—" : summaryDevices.filter((device) => device.syncStatus?.toUpperCase() === "ONLINE").length}</strong><small>Online devices</small></div></>}
      </div>

      <section className="wf-org-resource wf-attendance-resource">
        <header className="wf-org-resource-toolbar">
          <div className="wf-org-resource-toolbar__heading"><div><span>Employee device mapping</span><h2>Employee machine IDs</h2><p>Incoming biometric IDs are matched to this value. Employee code remains a fallback.</p></div></div>
          <div className="wf-org-resource-toolbar__tools">
            <label className="wf-org-search"><Search size={15} /><input value={employeeSearch} onChange={(event) => { setEmployeeSearch(event.target.value); setEmployeePage(1); }} placeholder="Search employees" /></label>
            {canViewEmployees && hasPermission("branch.view") && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={employeeBranchId} placeholder="All branches" ariaLabel="Filter employee mapping by branch" options={[{ value: "ALL", label: "All branches" }, ...(branchQuery.data?.branches ?? []).map((branch) => ({ value: branch.branchId, label: branch.branchName }))]} onChange={(value) => { setEmployeeBranchId(value); setEmployeeDepartmentId("ALL"); setEmployeePage(1); }} allowClear={false} />}
            {canViewEmployees && hasPermission("department.view") && <EmployeeMenuSelect className="wf-org-menu-select wf-attendance-branch-select" value={employeeDepartmentId} placeholder="All departments" ariaLabel="Filter employee mapping by department" options={[{ value: "ALL", label: "All departments" }, ...(departmentQuery.data?.departments ?? []).map((department) => ({ value: department.departmentId, label: department.departmentName }))]} onChange={(value) => { setEmployeeDepartmentId(value); setEmployeePage(1); }} allowClear={false} />}
            <div className="wf-org-resource-toolbar__pager"><span>{employeePagination?.total ?? 0} employees</span><button type="button" title="Refresh employees" aria-label="Refresh employees" onClick={() => void employeesQuery.refetch()}><RefreshCw className={employeesQuery.isFetching ? "spin" : ""} size={15} /></button></div>
          </div>
        </header>
        {employeesQuery.isLoading ? <div className="wf-org-table-skeleton">Loading employees…</div> : employeesQuery.isError ? <OrganisationEmptyState title="Employees could not be loaded" description="Check your connection and try again." error={normalizeApiError(employeesQuery.error).message} canCreate={false} onCreate={() => undefined} onRetry={() => void employeesQuery.refetch()} isRetrying={employeesQuery.isFetching} /> : employees.length === 0 ? <OrganisationEmptyState title={employeeSearch ? "No matching employees" : "No employees found"} description={employeeSearch ? "Try another employee name or code." : "Employees in your company will appear here."} canCreate={false} onCreate={() => undefined} onRetry={() => void employeesQuery.refetch()} isRetrying={employeesQuery.isFetching} /> : (
          <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>Employee</th><th>Organisation</th><th>Employment</th><th>Machine ID</th><th>Mapping</th><th aria-label="Actions" /></tr></thead><tbody>{employees.map((employee) => <tr key={employee.employeeId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><UsersRound size={16} /></span><div><strong>{employee.fullName}</strong><small>{employee.employeeCode}</small></div></div></td><td><div className="wf-org-contact-lines"><span>{employee.assignment.branchName ?? "Company-wide"}</span><span>{employee.assignment.departmentName ?? "No department"}</span></div></td><td><span className={`wf-attendance-review ${employee.isActiveEmployment ? "is-finalized" : ""}`}>{employee.employeeStatusName}</span></td><td><code className="wf-attendance-machine-id">{employee.biometricIdentifier || "Not assigned"}</code></td><td>{employee.biometricIdentifier ? <span className="wf-attendance-mapping-state is-mapped"><Check size={13} /> Mapped</span> : <span className="wf-attendance-mapping-state"><X size={13} /> Needs ID</span>}</td><td><div className="wf-org-row-actions"><button type="button" disabled={!canUpdateEmployees} onClick={() => openMapping(employee)} title={employee.biometricIdentifier ? "Edit machine ID" : "Assign machine ID"}><Edit3 size={15} /></button></div></td></tr>)}</tbody></table></div>
        )}
        {(employeePagination?.totalPages ?? 0) > 1 && <footer className="wf-attendance-pagination"><span>Page {employeePage} of {employeePagination?.totalPages}</span><div><button type="button" disabled={employeePage <= 1} onClick={() => setEmployeePage((current) => Math.max(1, current - 1))}>Previous</button><button type="button" disabled={employeePage >= (employeePagination?.totalPages ?? 1)} onClick={() => setEmployeePage((current) => current + 1)}>Next</button></div></footer>}
      </section>

      {canManageDevices && <section className="wf-org-resource wf-attendance-resource wf-attendance-devices-resource">
        <header className="wf-org-resource-toolbar"><div className="wf-org-resource-toolbar__heading"><div><span>Hardware connections</span><h2>Attendance devices</h2><p>Keep each machine and its site details registered for incoming punches.</p></div><button type="button" className="wf-org-button wf-org-button--primary" onClick={openCreateDeviceDialog}><Plus size={16} /> Add device</button></div><div className="wf-org-resource-toolbar__tools"><label className="wf-org-search"><Search size={15} /><input value={deviceSearch} onChange={(event) => setDeviceSearch(event.target.value)} placeholder="Search devices" /></label><div className="wf-org-resource-toolbar__pager"><span>{devices.length} devices shown</span><button type="button" title="Refresh devices" aria-label="Refresh devices" onClick={() => void devicesQuery.refetch()}><RefreshCw className={devicesQuery.isFetching ? "spin" : ""} size={15} /></button></div></div></header>
        {devicesQuery.isLoading ? <div className="wf-org-table-skeleton">Loading attendance devices…</div> : devicesQuery.isError ? <OrganisationEmptyState title="Attendance devices could not be loaded" description="Check your connection and try again." error={normalizeApiError(devicesQuery.error).message} canCreate onCreate={() => setDeviceDialogOpen(true)} onRetry={() => void devicesQuery.refetch()} isRetrying={devicesQuery.isFetching} /> : devices.length === 0 ? <OrganisationEmptyState title="No attendance devices yet" description="Register a device to associate incoming biometric punches with your company." canCreate onCreate={() => setDeviceDialogOpen(true)} onRetry={() => void devicesQuery.refetch()} isRetrying={devicesQuery.isFetching} /> : (
          <div className="wf-org-table-wrap"><table className="wf-org-table wf-attendance-table"><thead><tr><th>Device</th><th>Branch and location</th><th>Connection</th><th>Last sync</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{devices.map((device) => <tr key={device.deviceId}><td><div className="wf-org-record-title"><span className="wf-org-record-icon"><Cpu size={16} /></span><div><strong>{device.deviceName}</strong><small>{device.deviceCode} · {device.deviceType}</small></div></div></td><td><div className="wf-org-contact-lines"><span>{device.branchName ?? "Company-wide"}</span><span><MapPin size={13} /> {device.physicalLocation ?? "No location set"}</span></div></td><td>{device.ipAddress ? `${device.ipAddress}${device.portNumber ? `:${device.portNumber}` : ""}` : "Push/API connection"}</td><td>{device.lastSyncAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(device.lastSyncAt)) : "No sync received"}</td><td><span className={`wf-attendance-status ${device.isActive ? "is-present" : "is-absent"}`}><span />{device.isActive ? device.syncStatus ?? "Active" : "Inactive"}</span></td><td><div className="wf-org-row-actions"><button type="button" disabled={updateDeviceMutation.isPending || createDeviceMutation.isPending} onClick={(event) => openEditDeviceDialog(device, event)} title="Edit device configuration"><Edit3 size={15} /></button><button type="button" disabled={updateDeviceMutation.isPending} onClick={() => void toggleDevice(device)} title={device.isActive ? "Deactivate device" : "Activate device"}>{device.isActive ? <X size={15} /> : <Check size={15} />}</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>}

      <OrganisationDialog open={Boolean(mappingEmployee)} title="Assign attendance machine ID" subtitle={mappingEmployee ? `Map ${mappingEmployee.fullName} to the identifier sent by the attendance device.` : ""} submitLabel="Save machine ID" busy={updateEmployeeMutation.isPending} onClose={() => setMappingEmployee(null)} onSubmit={saveMapping}>
        <div className="wf-org-form-grid"><OrganisationField label="Employee"><TextInput value={mappingEmployee ? `${mappingEmployee.fullName} · ${mappingEmployee.employeeCode}` : ""} disabled /></OrganisationField><OrganisationField label="Attendance machine ID" hint="This value must match the employee ID sent in the device punch payload."><TextInput autoFocus value={biometricIdentifier} maxLength={100} onChange={(event) => setBiometricIdentifier(event.target.value)} placeholder="Enter the ID stored on the device" /></OrganisationField></div>
      </OrganisationDialog>

      <OrganisationDialog open={deviceDialogOpen} title={editingDevice ? "Edit attendance device" : "Register attendance device"} subtitle={editingDevice ? "Update the machine details used to receive attendance punches." : "Add the machine that sends attendance punch data."} submitLabel={editingDevice ? "Save changes" : "Register device"} busy={createDeviceMutation.isPending || updateDeviceMutation.isPending} onClose={closeDeviceDialog} onSubmit={saveDevice}>
        <div className="wf-org-form-grid">
          <OrganisationField label="Device code" required error={deviceErrors.deviceCode}><TextInput value={deviceForm.deviceCode} maxLength={80} onChange={(event) => setDeviceForm((current) => ({ ...current, deviceCode: event.target.value.toUpperCase() }))} placeholder="e.g. MAIN-ENTRY" /></OrganisationField>
          <OrganisationField label="Device name" required error={deviceErrors.deviceName}><TextInput value={deviceForm.deviceName} maxLength={150} onChange={(event) => setDeviceForm((current) => ({ ...current, deviceName: event.target.value }))} placeholder="e.g. Main entrance biometric" /></OrganisationField>
          <OrganisationField label="Device type" required error={deviceErrors.deviceType}><TextInput value={deviceForm.deviceType} maxLength={50} onChange={(event) => setDeviceForm((current) => ({ ...current, deviceType: event.target.value.toUpperCase() }))} placeholder="BIOMETRIC" /></OrganisationField>
          {branchQuery.data?.branches && branchQuery.data.branches.length > 0 && <OrganisationField label="Branch"><EmployeeMenuSelect className="wf-org-menu-select" value={deviceForm.branchId} placeholder="Company-wide" options={branchQuery.data.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))} onChange={(value) => setDeviceForm((current) => ({ ...current, branchId: value }))} /></OrganisationField>}
          <OrganisationField label="Manufacturer"><TextInput value={deviceForm.manufacturer} maxLength={100} onChange={(event) => setDeviceForm((current) => ({ ...current, manufacturer: event.target.value }))} /></OrganisationField>
          <OrganisationField label="Model"><TextInput value={deviceForm.modelNumber} maxLength={100} onChange={(event) => setDeviceForm((current) => ({ ...current, modelNumber: event.target.value }))} /></OrganisationField>
          <OrganisationField label="Serial number"><TextInput value={deviceForm.serialNumber} maxLength={150} onChange={(event) => setDeviceForm((current) => ({ ...current, serialNumber: event.target.value }))} /></OrganisationField>
          <OrganisationField label="IP address"><TextInput value={deviceForm.ipAddress} maxLength={45} onChange={(event) => setDeviceForm((current) => ({ ...current, ipAddress: event.target.value }))} placeholder="Optional" /></OrganisationField>
          <OrganisationField label="Port" error={deviceErrors.portNumber}><TextInput type="number" min="1" max="65535" value={deviceForm.portNumber} onChange={(event) => setDeviceForm((current) => ({ ...current, portNumber: event.target.value }))} placeholder="Optional" /></OrganisationField>
          <OrganisationField label="Physical location"><TextInput value={deviceForm.physicalLocation} maxLength={255} onChange={(event) => setDeviceForm((current) => ({ ...current, physicalLocation: event.target.value }))} placeholder="e.g. Main entrance" /></OrganisationField>
        </div>
      </OrganisationDialog>
    </section>
  );
}

// added by wali: Use the shared organisation dialog motion for attendance setup forms.
export function AttendanceConfigurationPage() {
  return <OrganisationDialogMotionProvider><AttendanceConfigurationPageContent /></OrganisationDialogMotionProvider>;
}

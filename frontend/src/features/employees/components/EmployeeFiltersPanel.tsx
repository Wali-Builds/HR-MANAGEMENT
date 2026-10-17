import { CalendarDays, Filter, UserRoundCheck, UsersRound } from "lucide-react";

import type {
  BranchReference,
  DepartmentReference,
  EmployeeLookups,
} from "../types/employee.types";
import { EmployeeMenuSelect } from "./EmployeeMenuSelect";

export type EmployeeActivityFilter = "all" | "active" | "inactive";

interface Props {
  open: boolean;
  activity: EmployeeActivityFilter;
  branchId: string;
  departmentId: string;
  employmentTypeId: string;
  employeeStatusId: string;
  gender: string;
  joiningDateFrom: string;
  joiningDateTo: string;
  branches: BranchReference[];
  departments: DepartmentReference[];
  lookups?: EmployeeLookups;
  onActivityChange: (value: EmployeeActivityFilter) => void;
  onBranchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onEmploymentTypeChange: (value: string) => void;
  onEmployeeStatusChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onJoiningDateFromChange: (value: string) => void;
  onJoiningDateToChange: (value: string) => void;
}

export function EmployeeFiltersPanel(props: Props) {
  if (!props.open) {
    return null;
  }

  return (
    <aside className="emp-filter-panel">
      <div className="emp-filter-panel__heading">
        <span><Filter size={15} /></span>
        <div>
          <strong>Refine directory</strong>
          <small>Filter current employee records</small>
        </div>
      </div>

      <div className="emp-filter-section">
        <label>Account status</label>
        <div className="emp-filter-segments">
          <button type="button" className={props.activity === "all" ? "is-active" : ""} onClick={() => props.onActivityChange("all")}>
            <UsersRound size={14} /> All
          </button>
          <button type="button" className={props.activity === "active" ? "is-active" : ""} onClick={() => props.onActivityChange("active")}>
            <UserRoundCheck size={14} /> Active
          </button>
          <button type="button" className={props.activity === "inactive" ? "is-active" : ""} onClick={() => props.onActivityChange("inactive")}>
            Inactive
          </button>
        </div>
      </div>

      <div className="emp-filter-grid">
        <label>
          <span>Branch</span>
          <EmployeeMenuSelect value={props.branchId} placeholder="All branches" options={props.branches.map((branch) => ({ value: branch.branchId, label: branch.branchName }))} onChange={props.onBranchChange} />
        </label>

        <label>
          <span>Department</span>
          <EmployeeMenuSelect value={props.departmentId} placeholder="All departments" options={props.departments.map((department) => ({ value: department.departmentId, label: department.departmentName }))} onChange={props.onDepartmentChange} />
        </label>

        <label>
          <span>Employment type</span>
          <EmployeeMenuSelect value={props.employmentTypeId} placeholder="All types" options={(props.lookups?.employmentTypes ?? []).map((type) => ({ value: type.employmentTypeId, label: type.typeName }))} onChange={props.onEmploymentTypeChange} />
        </label>

        <label>
          <span>Employee status</span>
          <EmployeeMenuSelect value={props.employeeStatusId} placeholder="All statuses" options={(props.lookups?.employeeStatuses ?? []).map((status) => ({ value: status.employeeStatusId, label: status.statusName }))} onChange={props.onEmployeeStatusChange} />
        </label>

        <label>
          <span>Gender</span>
          <EmployeeMenuSelect value={props.gender} placeholder="Any gender" options={["Male", "Female", "Other", "Prefer not to say"].map((value) => ({ value, label: value }))} onChange={props.onGenderChange} />
        </label>
      </div>

      <div className="emp-filter-section emp-filter-section--dates">
        <label><CalendarDays size={14} /> Joining date</label>
        <div>
          <label>
            <span>From</span>
            <input type="date" value={props.joiningDateFrom} onChange={(event) => props.onJoiningDateFromChange(event.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={props.joiningDateTo} onChange={(event) => props.onJoiningDateToChange(event.target.value)} />
          </label>
        </div>
      </div>
    </aside>
  );
}

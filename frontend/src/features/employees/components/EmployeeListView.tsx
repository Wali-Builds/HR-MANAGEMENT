import { ChevronRight, MoreHorizontal, Pencil } from "lucide-react";

import type { Employee } from "../types/employee.types";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";

interface Props {
  employees: Employee[];
  canEdit: boolean;
  canArchive: boolean;
  onOpen: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
}

export function EmployeeListView(props: Props) {
  return (
    <div className="emp-list-view">
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Role</th>
            <th>Department</th>
            <th>Branch</th>
            <th>Employment</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {props.employees.map((employee) => (
            <tr key={employee.employeeId} onClick={() => props.onOpen(employee)}>
              <td>
                <div className="emp-list-person">
                  <EmployeeAvatar employee={employee} size="sm" />
                  <div>
                    <strong>{employee.fullName}</strong>
                    <span>{employee.employeeCode} · {employee.officialEmail ?? employee.mobileNumber ?? "No contact"}</span>
                  </div>
                </div>
              </td>
              <td>{employee.assignment.positionTitle ?? employee.assignment.designationName ?? "—"}</td>
              <td>{employee.assignment.departmentName ?? "—"}</td>
              <td>{employee.assignment.branchName ?? "—"}</td>
              <td>
                <div className="emp-list-employment">
                  <strong>{employee.employmentTypeName}</strong>
                  <span>Joined {employee.joiningDate}</span>
                </div>
              </td>
              <td><EmployeeStatusBadge employee={employee} /></td>
              <td onClick={(event) => event.stopPropagation()}>
                <div className="emp-row-actions">
                  {props.canEdit ? (
                    <button type="button" onClick={() => props.onEdit(employee)} title="Edit employee">
                      <Pencil size={14} />
                    </button>
                  ) : null}
                  {props.canArchive ? (
                    <button type="button" onClick={() => props.onArchive(employee)} title="Archive employee">
                      <MoreHorizontal size={15} />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => props.onOpen(employee)} title="Open employee">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

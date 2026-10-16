import {
  Building2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
} from "lucide-react";
import { useState } from "react";

import type { Employee } from "../types/employee.types";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";

interface Props {
  employee: Employee;
  canEdit: boolean;
  canArchive: boolean;
  onOpen: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
}

export function EmployeeKanbanCard({
  employee,
  canEdit,
  canArchive,
  onOpen,
  onEdit,
  onArchive,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="emp-kanban-card" onClick={() => onOpen(employee)}>
      <div className="emp-kanban-card__top">
        <EmployeeAvatar employee={employee} size="lg" />
        <div className="emp-kanban-card__identity">
          <strong>{employee.fullName}</strong>
          <span>{employee.employeeCode}</span>
        </div>
        {(canEdit || canArchive) ? (
          <div className="emp-card-menu" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setMenuOpen((value) => !value)}>
              <MoreHorizontal size={17} />
            </button>
            {menuOpen ? (
              <div>
                {canEdit ? (
                  <button type="button" onClick={() => onEdit(employee)}><Pencil size={14} /> Edit</button>
                ) : null}
                {canArchive ? (
                  <button type="button" className="is-danger" onClick={() => onArchive(employee)}>Archive record</button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="emp-kanban-card__role">
        <strong>{employee.assignment.positionTitle ?? employee.assignment.designationName ?? "Role not assigned"}</strong>
        <span>{employee.assignment.departmentName ?? "Department not assigned"}</span>
      </div>

      <div className="emp-kanban-card__facts">
        <span><Building2 size={14} /> {employee.assignment.branchName ?? "No branch"}</span>
        <span><MapPin size={14} /> {employee.assignment.workLocation ?? "No work location"}</span>
        {employee.officialEmail ? <span><Mail size={14} /> {employee.officialEmail}</span> : null}
        {employee.mobileNumber ? <span><Phone size={14} /> {employee.mobileNumber}</span> : null}
      </div>

      <footer>
        <EmployeeStatusBadge employee={employee} />
        <span>{employee.employmentTypeName}</span>
      </footer>
    </article>
  );
}

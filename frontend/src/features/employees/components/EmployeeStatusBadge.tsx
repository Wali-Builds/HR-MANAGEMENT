import type { Employee } from "../types/employee.types";

export function EmployeeStatusBadge({ employee }: { employee: Employee }) {
  const tone = employee.isActive
    ? employee.isActiveEmployment
      ? "active"
      : "notice"
    : "inactive";

  return (
    <span className={`emp-status emp-status--${tone}`}>
      <span />
      {employee.isActive ? employee.employeeStatusName : "Inactive"}
    </span>
  );
}

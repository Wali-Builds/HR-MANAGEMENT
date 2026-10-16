import type { Employee } from "../types/employee.types";

interface EmployeeAvatarProps {
  employee: Pick<Employee, "fullName" | "profilePhotoPath">;
  size?: "sm" | "md" | "lg" | "xl";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function EmployeeAvatar({
  employee,
  size = "md",
}: EmployeeAvatarProps) {
  return (
    <span className={`emp-avatar emp-avatar--${size}`}>
      {employee.profilePhotoPath ? (
        <img src={employee.profilePhotoPath} alt="" />
      ) : (
        <span>{initials(employee.fullName) || "E"}</span>
      )}
    </span>
  );
}

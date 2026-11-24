import { useEffect, useState } from "react";
import { getEmployeeProfilePhotoBlobRequest } from "../api/employee.api";
import type { Employee } from "../types/employee.types";

interface EmployeeAvatarProps {
  employee: Pick<Employee, "employeeId" | "fullName" | "profilePhotoPath">;
  size?: "sm" | "md" | "lg" | "xl";
  selfProfile?: boolean;
}

const uploadedPhotoUrls = new Map<string, Promise<string>>();

function getUploadedPhotoUrl(employeeId: string, profilePhotoPath: string, selfProfile: boolean): Promise<string> {
  const cacheKey = `${selfProfile ? "self" : employeeId}:${profilePhotoPath}`;
  const cached = uploadedPhotoUrls.get(cacheKey);
  if (cached) return cached;
  const request = getEmployeeProfilePhotoBlobRequest(employeeId, profilePhotoPath, selfProfile).then((blob) => URL.createObjectURL(blob));
  uploadedPhotoUrls.set(cacheKey, request);
  request.catch(() => uploadedPhotoUrls.delete(cacheKey));
  return request;
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
  selfProfile = false,
}: EmployeeAvatarProps) {
  const isUploadedPhoto = Boolean(employee.profilePhotoPath?.startsWith("uploaded:"));
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUploadedPhotoUrl(null);
    if (isUploadedPhoto) {
      void getUploadedPhotoUrl(employee.employeeId, employee.profilePhotoPath!, selfProfile).then((url) => {
        if (active) setUploadedPhotoUrl(url);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [employee.employeeId, employee.profilePhotoPath, isUploadedPhoto, selfProfile]);

  return (
    <span className={`emp-avatar emp-avatar--${size}`}>
      {employee.profilePhotoPath && (isUploadedPhoto ? uploadedPhotoUrl : employee.profilePhotoPath) ? (
        <img src={isUploadedPhoto ? uploadedPhotoUrl ?? undefined : employee.profilePhotoPath ?? undefined} alt="" />
      ) : (
        <span>{initials(employee.fullName) || "E"}</span>
      )}
    </span>
  );
}

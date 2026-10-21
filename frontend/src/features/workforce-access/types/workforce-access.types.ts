export interface AccessRoleAssignment {
  userRoleId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  companyId: string | null;
  companyCode: string | null;
  companyName: string | null;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  assignedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AccessUser {
  userId: string;
  companyId: string | null;
  companyCode: string | null;
  companyName: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  employeeOfficialEmail: string | null;
  employeeBranchId: string | null;
  isEmployeeArchived: boolean;
  username: string;
  email: string | null;
  isPlatformAdmin: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  roles: AccessRoleAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessListParams {
  page: number;
  limit: number;
  companyId?: string;
  search?: string;
  isActive?: boolean;
  isLocked?: boolean;
  sortBy:
    | "username"
    | "email"
    | "last_login_at"
    | "created_at"
    | "updated_at";
  sortOrder: "ASC" | "DESC";
}

export interface AccessListResult {
  users: AccessUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AccessLookupRole {
  roleId: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  isSystemRole: boolean;
  hasBranchAdminAccess: boolean;
}

export interface AccessLookupEmployee {
  employeeId: string;
  companyId: string;
  employeeCode: string;
  employeeName: string;
  officialEmail: string | null;
  branchId: string | null;
}

export interface AccessLookupCompany {
  companyId: string;
  companyCode: string;
  companyName: string;
}

export interface AccessLookupBranch {
  branchId: string;
  companyId: string;
  branchCode: string;
  branchName: string;
}

export interface AccessLookupDepartment {
  departmentId: string;
  companyId: string;
  branchId: string | null;
  departmentCode: string;
  departmentName: string;
}

export interface AccessLookups {
  roles: AccessLookupRole[];
  employees: AccessLookupEmployee[];
  companies: AccessLookupCompany[];
  branches: AccessLookupBranch[];
  departments: AccessLookupDepartment[];
}

export interface AccessRoleInput {
  roleCode: string;
  companyId: string | null;
  branchId: string | null;
  departmentId: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface CreateAccessUserInput {
  companyId: string;
  employeeId: string;
  username: string;
  email: string | null;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
  isPlatformAdmin: false;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  roles: AccessRoleInput[];
}

export interface UpdateAccessUserInput {
  username?: string;
  email?: string | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  mustChangePassword?: boolean;
  clearAccountLock?: true;
}

export interface ResetAccessPasswordInput {
  newPassword: string;
  confirmPassword: string;
  mustChangePassword: boolean;
  revokeAllSessions: boolean;
}

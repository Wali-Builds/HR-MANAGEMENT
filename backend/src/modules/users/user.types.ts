export type DatabaseId =
  | string
  | number
  | bigint;

export interface UserDatabaseRow {
  user_id: DatabaseId;
  company_id: DatabaseId | null;
  employee_id: DatabaseId | null;

  username: string;
  email: string | null;

  password_hash: string;

  is_platform_admin: number | boolean;
  is_active: number | boolean;
  is_email_verified: number | boolean;
  must_change_password: number | boolean;

  failed_login_attempts: number;
  locked_until: Date | string | null;
  last_login_at: Date | string | null;
  password_changed_at:
    Date | string | null;

  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  company_code: string | null;
  company_name: string | null;

  employee_code: string | null;
  employee_first_name: string | null;
  employee_middle_name: string | null;
  employee_last_name: string | null;
  employee_official_email:
    string | null;
  // edited by wali: Expose current branch so access-role forms can default scope correctly.
  employee_branch_id: DatabaseId | null;
  employee_deleted_at: Date | string | null;
}

export interface UserRoleDatabaseRow {
  user_role_id: DatabaseId;
  user_id: DatabaseId;
  role_id: DatabaseId;

  role_code: string;
  role_name: string;
  // edited by wali: Preserve role status separately from the user-role assignment status.
  role_is_active: number | boolean;

  company_id: DatabaseId | null;
  company_code: string | null;
  company_name: string | null;

  branch_id: DatabaseId | null;
  branch_code: string | null;
  branch_name: string | null;

  department_id: DatabaseId | null;
  department_code: string | null;
  department_name: string | null;

  assigned_at: Date | string;
  expires_at: Date | string | null;
  is_active: number | boolean;
}

export interface UserRoleResponse {
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

export interface UserResponse {
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

  roles: UserRoleResponse[];

  createdAt: string;
  updatedAt: string;
}

export interface UserListOptions {
  page: number;
  limit: number;

  companyId: string | null;

  employeeId?: string;
  roleCode?: string;
  branchId?: string;
  departmentId?: string;

  search?: string;

  isPlatformAdmin?: boolean;
  isActive?: boolean;
  isEmailVerified?: boolean;
  mustChangePassword?: boolean;
  isLocked?: boolean;

  sortBy:
    | "username"
    | "email"
    | "last_login_at"
    | "created_at"
    | "updated_at";

  sortOrder:
    | "ASC"
    | "DESC";
}

export interface UserListResult {
  users: UserDatabaseRow[];
  total: number;
}

export interface UserRoleAssignmentInput {
  // edited by wali: persist the exact scoped role selected during validation.
  roleId: string;
  roleCode: string;

  companyId: string | null;
  branchId: string | null;
  departmentId: string | null;

  expiresAt: string | null;
  isActive: boolean;
}

export interface CreateUserRecord {
  companyId: string | null;
  employeeId: string | null;

  username: string;
  email: string | null;
  passwordHash: string;

  isPlatformAdmin: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;

  roles:
    UserRoleAssignmentInput[];
}

export interface UpdateUserRecord {
  username?: string;
  email?: string | null;

  isActive?: boolean;
  isEmailVerified?: boolean;
  mustChangePassword?: boolean;

  clearAccountLock?: boolean;
}

export interface UserActor {
  userId: string;
  companyId: string | null;
  employeeId: string | null;
  isPlatformAdmin: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UserLookupRole {
  roleId: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  isSystemRole: boolean;
  // edited by wali: Identifies roles that require an assigned branch scope.
  hasBranchAdminAccess: boolean;
}

export interface UserLookupEmployee {
  employeeId: string;
  companyId: string;
  employeeCode: string;
  employeeName: string;
  officialEmail: string | null;
  branchId: string | null;
}

export interface UserLookupCompany {
  companyId: string;
  companyCode: string;
  companyName: string;
}

export interface UserLookupBranch {
  branchId: string;
  companyId: string;
  branchCode: string;
  branchName: string;
}

export interface UserLookupDepartment {
  departmentId: string;
  companyId: string;
  branchId: string | null;
  departmentCode: string;
  departmentName: string;
}

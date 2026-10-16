export type DatabaseId =
  | string
  | number
  | bigint;

export interface LoginInput {
  identifier: string;
  password: string;
  deviceName?: string;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthUserRow {
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
}

export interface AuthorizationData {
  roleCodes: string[];
  permissions: string[];
}

export interface AuthContext {
  userId: string;
  sessionId: string;

  companyId: string | null;
  employeeId: string | null;

  username: string;
  email: string | null;

  isPlatformAdmin: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;

  roleCodes: string[];
  permissions: string[];
}

export interface LoginServiceResult {
  accessToken: string;
  accessTokenExpiresIn: number;

  refreshToken: string;
  refreshTokenExpiresAt: Date;

  user: AuthContext;
}
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
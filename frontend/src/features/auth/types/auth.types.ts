export interface AuthUser {
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

export interface AuthSessionData {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
}

export interface LoginInput {
  identifier: string;
  password: string;
  deviceName?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordResult {
  requestAccepted: boolean;
  developmentResetToken?: string;
  developmentResetUrl?: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordActionResult {
  requiresLogin: boolean;
  revokedSessionCount: number;
}

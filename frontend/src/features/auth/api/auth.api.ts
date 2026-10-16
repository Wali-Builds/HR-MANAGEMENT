import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type {
  AuthSessionData,
  ChangePasswordInput,
  ForgotPasswordInput,
  ForgotPasswordResult,
  LoginInput,
  PasswordActionResult,
  ResetPasswordInput,
} from "../types/auth.types";

export async function loginRequest(
  input: LoginInput,
): Promise<AuthSessionData> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<AuthSessionData>
    >("/auth/login", input);

  return response.data.data;
}

export async function refreshSessionRequest(): Promise<AuthSessionData> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<AuthSessionData>
    >("/auth/refresh");

  return response.data.data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function logoutAllRequest(): Promise<number> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<{
        revokedSessionCount: number;
      }>
    >("/auth/logout-all");

  return response.data.data.revokedSessionCount;
}

export async function changePasswordRequest(
  input: ChangePasswordInput,
): Promise<PasswordActionResult> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<PasswordActionResult>
    >("/auth/change-password", input);

  return response.data.data;
}

export async function forgotPasswordRequest(
  input: ForgotPasswordInput,
): Promise<ForgotPasswordResult> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<ForgotPasswordResult>
    >("/auth/forgot-password", input);

  return response.data.data;
}

export async function resetPasswordRequest(
  input: ResetPasswordInput,
): Promise<PasswordActionResult> {
  const response =
    await apiClient.post<
      ApiSuccessResponse<PasswordActionResult>
    >("/auth/reset-password", input);

  return response.data.data;
}

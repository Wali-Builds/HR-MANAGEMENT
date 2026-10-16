import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "../app/store/auth.store";
import type { AuthSessionData } from "../features/auth/types/auth.types";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../types/api.types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20_000,
  headers: {
    "Content-Type": "application/json",
  },
});

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const response =
    await refreshClient.post<
      ApiSuccessResponse<AuthSessionData>
    >("/auth/refresh");

  const { accessToken, user } = response.data.data;

  useAuthStore
    .getState()
    .setSession(accessToken, user);

  return accessToken;
}

function shouldSkipRefresh(url?: string): boolean {
  if (!url) {
    return false;
  }

  return [
    "/auth/login",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
  ].some((route) => url.includes(route));
}

apiClient.interceptors.request.use((config) => {
  const accessToken =
    useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization =
      `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError<ApiErrorResponse>,
  ) => {
    const originalRequest =
      error.config as
        | RetryableRequestConfig
        | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(
        () => {
          refreshPromise = null;
        },
      );

      const newAccessToken = await refreshPromise;

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  },
);

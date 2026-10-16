import axios from "axios";

import type { ApiErrorResponse } from "../types/api.types";

export interface NormalizedApiError {
  message: string;
  code: string;
  status: number | null;
  details?: Record<string, unknown>;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const response = error.response;
    const payload = response?.data;

    return {
      message:
        payload?.message ??
        error.message ??
        "The request could not be completed.",
      code:
        payload?.error?.code ??
        "REQUEST_FAILED",
      status: response?.status ?? null,
      ...(payload?.error?.details
        ? { details: payload.error.details }
        : {}),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNEXPECTED_ERROR",
      status: null,
    };
  }

  return {
    message: "An unexpected error occurred.",
    code: "UNEXPECTED_ERROR",
    status: null,
  };
}

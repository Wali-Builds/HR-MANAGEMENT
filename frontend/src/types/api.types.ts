export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  requestId?: string;
}

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: ApiErrorDetails;
  };
  requestId?: string;
}

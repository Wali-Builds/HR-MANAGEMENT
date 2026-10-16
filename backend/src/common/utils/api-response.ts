import type { Response } from "express";

export interface SuccessResponseOptions<T> {
  message: string;
  statusCode?: number;
  data?: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  response: Response,
  options: SuccessResponseOptions<T>
): void {
  const payload: Record<string, unknown> = {
    success: true,
    message: options.message
  };

  if (options.data !== undefined) {
    payload.data = options.data;
  }

  if (options.meta !== undefined) {
    payload.meta = options.meta;
  }

  const requestId = response.locals.requestId;

  if (typeof requestId === "string") {
    payload.requestId = requestId;
  }

  response
    .status(options.statusCode ?? 200)
    .json(payload);
}
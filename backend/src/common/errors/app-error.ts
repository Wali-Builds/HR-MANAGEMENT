export interface AppErrorOptions {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_SERVER_ERROR";
    this.details = options.details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace?.(this, AppError);
  }
}
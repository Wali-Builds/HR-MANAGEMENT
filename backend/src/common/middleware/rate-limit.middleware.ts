import { rateLimit } from "express-rate-limit";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 300,

  standardHeaders: true,
  legacyHeaders: false,

  skip: (request) =>
    request.path.startsWith(
      "/api/v1/health"
    ),

  handler: (_request, response) => {
    const payload: Record<string, unknown> = {
      success: false,
      message:
        "Too many requests. Please try again later.",
      error: {
        code: "RATE_LIMIT_EXCEEDED"
      }
    };

    const requestId =
      response.locals.requestId;

    if (typeof requestId === "string") {
      payload.requestId = requestId;
    }

    response.status(429).json(payload);
  }
});
import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

const validRequestIdPattern = /^[A-Za-z0-9._:-]{1,100}$/;

export const requestIdMiddleware: RequestHandler = (
  request,
  response,
  next
) => {
  const incomingRequestId = request
    .header("X-Request-ID")
    ?.trim();

  const requestId =
    incomingRequestId &&
    validRequestIdPattern.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  response.locals.requestId = requestId;

  response.setHeader(
    "X-Request-ID",
    requestId
  );

  request.headers["x-request-id"] = requestId;

  next();
};
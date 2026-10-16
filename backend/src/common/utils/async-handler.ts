import type {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from "express";

export type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(
  handler: AsyncRouteHandler
): RequestHandler {
  return (request, response, next) => {
    void Promise.resolve()
      .then(() => handler(request, response, next))
      .catch(next);
  };
}
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so that any rejected promise is forwarded to
 * Express's next(err) error middleware instead of causing an unhandled rejection.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

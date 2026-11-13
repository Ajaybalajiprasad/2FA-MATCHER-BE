import { Request, Response, NextFunction } from 'express';

type AsyncFunction<T extends Request = Request> = (req: T, res: Response, next: NextFunction) => Promise<unknown>;

// Express 4 does not forward rejected promises to the error handler.
export const asyncHandler =
  <T extends Request = Request>(fn: AsyncFunction<T>) =>
  (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

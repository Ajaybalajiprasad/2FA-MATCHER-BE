import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '../types/errors';
import { createErrorResponse } from '../utils/apiResponse';
import logger from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res
    .status(404)
    .json(createErrorResponse(`Route ${req.method} ${req.originalUrl} not found`, { code: ErrorCode.NOT_FOUND }));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(createErrorResponse(err.message, { code: err.code, details: err.details }));
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json(
      createErrorResponse('Validation failed', {
        code: ErrorCode.VALIDATION_FAILED,
        details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      })
    );
    return;
  }
  logger.error('Unhandled error', err);
  res.status(500).json(createErrorResponse('Something went wrong', { code: ErrorCode.INTERNAL_ERROR }));
};

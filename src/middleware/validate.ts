import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// ZodError is turned into a 400 by errorHandler, so these stay one line each.
export const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  req.body = schema.parse(req.body);
  next();
};

export const validateQuery = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  req.query = schema.parse(req.query);
  next();
};

export const validateParams = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  req.params = schema.parse(req.params);
  next();
};

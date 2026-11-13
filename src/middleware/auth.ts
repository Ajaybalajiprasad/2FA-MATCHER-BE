import { Request, Response, NextFunction } from 'express';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from './errorHandler';

import { verifyToken } from '../utils/auth';

// The only place that knows how a user is identified: a signed Bearer token from sign-up or sign-in.
const resolveTravellerId = (req: Request): string | undefined => {
  const [scheme, token] = req.header('Authorization')?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? verifyToken(token) : undefined;
};

export const requireUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const id = resolveTravellerId(req);
  if (!id) throw new AppError('Sign in or sign up first', 401, ErrorCode.UNAUTHORIZED);

  const traveller = await travellerRepository.findById(id);
  if (!traveller) throw new AppError('Unknown traveller', 401, ErrorCode.UNAUTHORIZED);

  req.user = traveller;
  next();
});

// A missing or invalid token is ignored: the route works anonymously.
export const optionalUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const id = resolveTravellerId(req);
  if (id) req.user = await travellerRepository.findById(id);
  next();
});

import { Request, Response, NextFunction } from 'express';
import { travellerRepository } from '../repositories/TravellerRepository';
import { ErrorCode } from '../types/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from './errorHandler';

// The only place that knows how a user is identified. Swap this for OAuth token verification later.
const resolveTravellerId = (req: Request): string | undefined => req.header('X-User-Id')?.trim() || undefined;

export const requireUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const id = resolveTravellerId(req);
  if (!id) throw new AppError('Sign up or pick a traveller first', 401, ErrorCode.UNAUTHORIZED);

  const traveller = await travellerRepository.findById(id);
  if (!traveller) throw new AppError('Unknown traveller', 401, ErrorCode.UNAUTHORIZED);

  req.user = traveller;
  next();
});

// Unknown or missing X-User-Id is ignored: the route works anonymously.
export const optionalUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const id = resolveTravellerId(req);
  if (id) req.user = await travellerRepository.findById(id);
  next();
});

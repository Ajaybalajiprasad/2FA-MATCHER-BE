import { Request, Response } from 'express';
import { travellerService } from '../services/travellerService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const signUp = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(createSuccessResponse('Signed up', await travellerService.signUp(req.body)));
});

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Signed in', await travellerService.signIn(req.body)));
});

export const listDemoTravellers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(createSuccessResponse('Demo travellers fetched', await travellerService.listDemo()));
});

export const demoSignIn = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Signed in', await travellerService.demoSignIn(req.body.id)));
});

export const listTravellers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(createSuccessResponse('Travellers fetched', await travellerService.list()));
});

export const getTraveller = asyncHandler(async (req: Request, res: Response) => {
  res.set('Cache-Control', 'private, no-store');
  res.json(createSuccessResponse('Traveller fetched', await travellerService.getProfile(req.params.id, req.user?.id)));
});

export const getMe = (req: Request, res: Response) => {
  res.json(createSuccessResponse('Current traveller', req.user));
};

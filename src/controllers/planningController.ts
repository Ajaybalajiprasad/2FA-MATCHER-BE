import { Request, Response } from 'express';
import { planningService } from '../services/planningService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import type { GroupHotelsQuery } from '../validators/planningValidators';

export const searchGroupHotels = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as GroupHotelsQuery;
  res.json(createSuccessResponse('Hotel options fetched', await planningService.searchHotels(req.params.id, req.user!.id, query)));
});

export const saveOption = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(createSuccessResponse('Option saved', await planningService.save(req.params.id, req.user!.id, req.body.roomId)));
});

export const unsaveOption = asyncHandler(async (req: Request, res: Response) => {
  await planningService.unsave(req.params.id, req.user!.id, req.params.roomId);
  res.json(createSuccessResponse('Option removed'));
});

export const listSavedOptions = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Saved options fetched', await planningService.listSaved(req.params.id, req.user!.id)));
});

export const finalizeBooking = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(createSuccessResponse('Group booked', await planningService.book(req.params.id, req.user!.id, req.body.roomId)));
});

export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Booking fetched', await planningService.getBooking(req.params.id, req.user!.id)));
});

import { Request, Response } from 'express';
import { requestService } from '../services/requestService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import type { ListRequestsQuery } from '../validators/requestValidators';

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(201)
    .json(createSuccessResponse('Join request sent', await requestService.create(req.user!, req.params.id, req.body.searchId)));
});

export const listGroupRequests = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListRequestsQuery;
  res.json(createSuccessResponse('Join requests fetched', await requestService.listForGroup(req.user!.id, req.params.id, query)));
});

export const decideRequest = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Join request decided', await requestService.decide(req.user!.id, req.params.requestId, req.body)));
});

export const listMyRequests = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('My join requests fetched', await requestService.listMine(req.user!.id)));
});

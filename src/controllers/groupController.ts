import { Request, Response } from 'express';
import { groupService } from '../services/groupService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(createSuccessResponse('Group created', await groupService.create(req.user!, req.body)));
});

export const getGroup = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Group fetched', await groupService.getById(req.params.id, req.user?.id)));
});

export const listMyGroups = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('My groups fetched', await groupService.listMine(req.user!.id)));
});

import { Request, Response } from 'express';
import { matchService } from '../services/matchService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const searchMatches = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Matches fetched', await matchService.search(req.user!, req.body)));
});

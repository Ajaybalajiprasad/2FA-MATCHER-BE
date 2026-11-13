import { Request, Response } from 'express';
import { metaService } from '../services/metaService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getMeta = asyncHandler(async (_req: Request, res: Response) => {
  res.json(createSuccessResponse('Meta fetched', await metaService.getMeta()));
});

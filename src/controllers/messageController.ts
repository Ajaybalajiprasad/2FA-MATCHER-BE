import { Request, Response } from 'express';
import { messageService } from '../services/messageService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import type { MessagesQuery } from '../validators/messageValidators';

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MessagesQuery;
  res.json(createSuccessResponse('Messages fetched', await messageService.list(req.params.id, req.user!.id, query)));
});

export const postMessage = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(createSuccessResponse('Message posted', await messageService.post(req.params.id, req.user!.id, req.body.body)));
});

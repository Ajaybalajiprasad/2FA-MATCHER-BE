import { Request, Response } from 'express';
import { friendService } from '../services/friendService';
import { createSuccessResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const listFriends = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Friends fetched', await friendService.list(req.user!.id)));
});
export const getRelationship = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    createSuccessResponse(
      'Relationship fetched',
      await friendService.relationship(req.user!.id, req.params.travellerId),
    ),
  );
});
export const requestFriend = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(201)
    .json(
      createSuccessResponse('Friend request sent', await friendService.request(req.user!.id, req.body.travellerId)),
    );
});
export const acceptFriend = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Friend request accepted', await friendService.accept(req.user!.id, req.params.id)));
});
export const dismissFriend = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Friend request dismissed', await friendService.dismiss(req.user!.id, req.params.id)));
});
export const removeFriend = asyncHandler(async (req: Request, res: Response) => {
  res.json(createSuccessResponse('Friend removed', await friendService.remove(req.user!.id, req.params.travellerId)));
});

import { Router } from 'express';
import {
  acceptFriend,
  dismissFriend,
  getRelationship,
  listFriends,
  removeFriend,
  requestFriend,
} from '../controllers/friendController';
import { requireUser } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { friendRequestIdSchema, friendRequestSchema, friendTargetSchema } from '../validators/friendValidators';

const router: Router = Router();
router.use(requireUser);
router.get('/', listFriends);
router.get('/relationship/:travellerId', validateParams(friendTargetSchema), getRelationship);
router.post('/requests', validateBody(friendRequestSchema), requestFriend);
router.post('/requests/:id/accept', validateParams(friendRequestIdSchema), acceptFriend);
router.delete('/requests/:id', validateParams(friendRequestIdSchema), dismissFriend);
router.delete('/:travellerId', validateParams(friendTargetSchema), removeFriend);
export default router;

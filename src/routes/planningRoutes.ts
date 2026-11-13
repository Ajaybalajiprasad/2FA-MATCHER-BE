import { Router } from 'express';
import {
  finalizeBooking,
  getBooking,
  listSavedOptions,
  saveOption,
  searchGroupHotels,
  unsaveOption,
} from '../controllers/planningController';
import { requireUser } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { groupIdParamSchema } from '../validators/groupValidators';
import { groupHotelsQuerySchema, roomIdBodySchema, savedRoomParamSchema } from '../validators/planningValidators';

const router: Router = Router({ mergeParams: true });

router.get('/hotels', requireUser, validateParams(groupIdParamSchema), validateQuery(groupHotelsQuerySchema), searchGroupHotels);
router.get('/saved', requireUser, validateParams(groupIdParamSchema), listSavedOptions);
router.post('/saved', requireUser, validateParams(groupIdParamSchema), validateBody(roomIdBodySchema), saveOption);
router.delete('/saved/:roomId', requireUser, validateParams(savedRoomParamSchema), unsaveOption);
router.get('/booking', requireUser, validateParams(groupIdParamSchema), getBooking);
router.post('/booking', requireUser, validateParams(groupIdParamSchema), validateBody(roomIdBodySchema), finalizeBooking);

export default router;

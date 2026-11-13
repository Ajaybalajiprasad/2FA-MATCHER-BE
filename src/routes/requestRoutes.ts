import { Router } from 'express';
import { createRequest, decideRequest, listGroupRequests, listMyRequests } from '../controllers/requestController';
import { requireUser } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { groupIdParamSchema } from '../validators/groupValidators';
import {
  createRequestSchema,
  decideRequestSchema,
  listRequestsQuerySchema,
  requestIdParamSchema,
} from '../validators/requestValidators';

export const groupRequestRoutes: Router = Router({ mergeParams: true });

groupRequestRoutes.post('/', requireUser, validateParams(groupIdParamSchema), validateBody(createRequestSchema), createRequest);
groupRequestRoutes.get('/', requireUser, validateParams(groupIdParamSchema), validateQuery(listRequestsQuerySchema), listGroupRequests);

const router: Router = Router();

router.get('/mine', requireUser, listMyRequests);
router.patch('/:requestId', requireUser, validateParams(requestIdParamSchema), validateBody(decideRequestSchema), decideRequest);

export default router;

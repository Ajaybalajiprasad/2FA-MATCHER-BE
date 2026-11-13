import { Router } from 'express';
import { listMessages, postMessage } from '../controllers/messageController';
import { requireUser } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { groupIdParamSchema } from '../validators/groupValidators';
import { messageBodySchema, messagesQuerySchema } from '../validators/messageValidators';

const router: Router = Router({ mergeParams: true });

router.get('/', requireUser, validateParams(groupIdParamSchema), validateQuery(messagesQuerySchema), listMessages);
router.post('/', requireUser, validateParams(groupIdParamSchema), validateBody(messageBodySchema), postMessage);

export default router;

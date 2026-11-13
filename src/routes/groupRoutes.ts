import { Router } from 'express';
import { createGroup, getGroup, listMyGroups } from '../controllers/groupController';
import { optionalUser, requireUser } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { createGroupSchema, groupIdParamSchema } from '../validators/groupValidators';

const router: Router = Router();

router.post('/', requireUser, validateBody(createGroupSchema), createGroup);
router.get('/mine', requireUser, listMyGroups);
router.get('/:id', optionalUser, validateParams(groupIdParamSchema), getGroup);

export default router;

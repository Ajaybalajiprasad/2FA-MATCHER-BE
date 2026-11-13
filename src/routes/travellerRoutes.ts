import { Router } from 'express';
import { getTraveller, listTravellers, signUp } from '../controllers/travellerController';
import { validateBody, validateParams } from '../middleware/validate';
import { signUpSchema, travellerIdParamSchema } from '../validators/travellerValidators';
import { optionalUser } from '../middleware/auth';

const router: Router = Router();

router.post('/', validateBody(signUpSchema), signUp);
router.get('/', listTravellers);
router.get('/:id', optionalUser, validateParams(travellerIdParamSchema), getTraveller);

export default router;

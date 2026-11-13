import { Router } from 'express';
import { demoSignIn, getTraveller, listDemoTravellers, listTravellers, signIn, signUp } from '../controllers/travellerController';
import { validateBody, validateParams } from '../middleware/validate';
import { optionalUser } from '../middleware/auth';
import { signInSchema, signUpSchema, travellerIdParamSchema } from '../validators/travellerValidators';

const router: Router = Router();

router.post('/', validateBody(signUpSchema), signUp);
router.post('/sign-in', validateBody(signInSchema), signIn);
router.get('/demo', listDemoTravellers);
router.post('/demo/sign-in', validateBody(travellerIdParamSchema), demoSignIn);
router.get('/', listTravellers);
router.get('/:id', optionalUser, validateParams(travellerIdParamSchema), getTraveller);

export default router;

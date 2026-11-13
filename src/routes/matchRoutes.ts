import { Router } from 'express';
import { searchMatches } from '../controllers/matchController';
import { requireUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { matchSearchSchema } from '../validators/matchValidators';

const router: Router = Router();

router.post('/search', requireUser, validateBody(matchSearchSchema), searchMatches);

export default router;

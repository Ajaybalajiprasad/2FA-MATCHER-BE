import { Router } from 'express';
import { getMe } from '../controllers/travellerController';
import { requireUser } from '../middleware/auth';
import metaRoutes from './metaRoutes';
import travellerRoutes from './travellerRoutes';

const router: Router = Router();

router.use('/meta', metaRoutes);
router.use('/travellers', travellerRoutes);
router.get('/me', requireUser, getMe);

export default router;

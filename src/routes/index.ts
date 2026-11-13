import { Router } from 'express';
import { getMe } from '../controllers/travellerController';
import { requireUser } from '../middleware/auth';
import groupRoutes from './groupRoutes';
import matchRoutes from './matchRoutes';
import messageRoutes from './messageRoutes';
import metaRoutes from './metaRoutes';
import planningRoutes from './planningRoutes';
import requestRoutes, { groupRequestRoutes } from './requestRoutes';
import travellerRoutes from './travellerRoutes';
import friendRoutes from './friendRoutes';

const router: Router = Router();

router.use('/meta', metaRoutes);
router.use('/travellers', travellerRoutes);
router.use('/friends', friendRoutes);
router.use('/groups/:id/requests', groupRequestRoutes);
router.use('/groups/:id/messages', messageRoutes);
router.use('/groups/:id', planningRoutes);
router.use('/groups', groupRoutes);
router.use('/matches', matchRoutes);
router.use('/requests', requestRoutes);
router.get('/me', requireUser, getMe);

export default router;
